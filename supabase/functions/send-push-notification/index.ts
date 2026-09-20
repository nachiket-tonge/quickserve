import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificationEvent =
  | "REQUEST_ASSIGNED"
  | "REQUEST_IN_PROGRESS"
  | "REQUEST_COMPLETED";

interface NotificationRequest {
  event: NotificationEvent;
  request_id: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

interface ServiceRequest {
  id: string;
  request_number: string;
  customer_id: string;
  agent_id: string | null;
  status: string;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";

  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function stringToBase64Url(input: string): string {
  return base64UrlEncode(
    new TextEncoder().encode(input),
  );
}

async function createFirebaseAccessToken(
  serviceAccount: FirebaseServiceAccount,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = stringToBase64Url(
    JSON.stringify(header),
  );

  const encodedPayload = stringToBase64Url(
    JSON.stringify(payload),
  );

  const unsignedToken =
    `${encodedHeader}.${encodedPayload}`;

  const privateKey = serviceAccount.private_key
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  const pemBody = privateKey
    .replace(
      "-----BEGIN PRIVATE KEY-----",
      "",
    )
    .replace(
      "-----END PRIVATE KEY-----",
      "",
    )
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(
    atob(pemBody),
    (char) => char.charCodeAt(0),
  );

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const signedJwt =
    `${unsignedToken}.${base64UrlEncode(
      new Uint8Array(signature),
    )}`;

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signedJwt,
      }),
    },
  );

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();

    throw new Error(
      `Failed to obtain Firebase access token: ${errorText}`,
    );
  }

  const tokenData = await tokenResponse.json();

  return tokenData.access_token;
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
): Promise<void> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title,
            body,
          },
          data: {
            source: "quickserve",
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `FCM request failed: ${response.status} ${errorText}`,
    );
  }
}

function getNotificationContent(
  event: NotificationEvent,
  requestNumber: string,
): {
  title: string;
  body: string;
} {
  switch (event) {
    case "REQUEST_ASSIGNED":
      return {
        title: "New Service Request",
        body: `Request ${requestNumber} has been assigned to you.`,
      };

    case "REQUEST_IN_PROGRESS":
      return {
        title: "Request In Progress",
        body: `Your service request ${requestNumber} is now in progress.`,
      };

    case "REQUEST_COMPLETED":
      return {
        title: "Request Completed",
        body: `Your service request ${requestNumber} has been completed.`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    /*
     * ---------------------------------------------------------
     * Environment
     * ---------------------------------------------------------
     */

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const supabaseServiceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const firebaseServiceAccountBase64 =
      Deno.env.get(
        "FIREBASE_SERVICE_ACCOUNT_B64",
      );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey ||
      !firebaseServiceAccountBase64
    ) {
      throw new Error(
        "Required environment variables are missing.",
      );
    }

    /*
     * ---------------------------------------------------------
     * Decode Firebase service account
     * ---------------------------------------------------------
     */

    let serviceAccount: FirebaseServiceAccount;

    try {
      const serviceAccountJson =
        new TextDecoder().decode(
          Uint8Array.from(
            atob(firebaseServiceAccountBase64),
            (char) => char.charCodeAt(0),
          ),
        );

      serviceAccount =
        JSON.parse(serviceAccountJson);
    } catch {
      throw new Error(
        "Failed to decode Firebase service account credentials.",
      );
    }

    /*
     * ---------------------------------------------------------
     * Authenticate caller
     * ---------------------------------------------------------
     */

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          error: "Missing authorization header.",
        },
        401,
      );
    }

    /*
     * User-scoped client.
     *
     * This is used only to verify the caller's
     * authenticated Supabase session.
     */
    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: {
        user,
      },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: "Unauthorized.",
        },
        401,
      );
    }

    /*
     * ---------------------------------------------------------
     * Server-side client
     *
     * Service role is NEVER exposed to Flutter or Next.js.
     * It is used only inside this Edge Function.
     * ---------------------------------------------------------
     */
    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
    );

    /*
     * ---------------------------------------------------------
     * Load caller profile / role
     * ---------------------------------------------------------
     */

    const {
      data: callerProfile,
      error: callerProfileError,
    } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        {
          error: "Unable to determine caller role.",
        },
        403,
      );
    }

    /*
     * ---------------------------------------------------------
     * Parse request
     * ---------------------------------------------------------
     */

    const requestBody =
      (await req.json()) as Partial<NotificationRequest>;

    const event = requestBody.event;
    const requestId = requestBody.request_id;

    const allowedEvents: NotificationEvent[] = [
      "REQUEST_ASSIGNED",
      "REQUEST_IN_PROGRESS",
      "REQUEST_COMPLETED",
    ];

    if (
      !event ||
      !allowedEvents.includes(
        event as NotificationEvent,
      )
    ) {
      return jsonResponse(
        {
          error:
            "Invalid event. Supported events are REQUEST_ASSIGNED, REQUEST_IN_PROGRESS and REQUEST_COMPLETED.",
        },
        400,
      );
    }

    if (!requestId) {
      return jsonResponse(
        {
          error: "request_id is required.",
        },
        400,
      );
    }

    /*
     * ---------------------------------------------------------
     * Load request
     * ---------------------------------------------------------
     */

    const {
      data: request,
      error: requestError,
    } = await adminClient
      .from("service_requests")
      .select(
        `
          id,
          request_number,
          customer_id,
          agent_id,
          status
        `,
      )
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return jsonResponse(
        {
          error: "Service request not found.",
        },
        404,
      );
    }

    const serviceRequest =
      request as ServiceRequest;

    /*
     * ---------------------------------------------------------
     * Determine recipient and validate caller
     * ---------------------------------------------------------
     */

    let recipientUserId: string;

    switch (event as NotificationEvent) {
      case "REQUEST_ASSIGNED":
        /*
         * Only Admin can generate an assignment
         * notification.
         */
        if (callerProfile.role !== "admin") {
          return jsonResponse(
            {
              error:
                "Only administrators can generate assignment notifications.",
            },
            403,
          );
        }

        if (
          serviceRequest.status !== "ASSIGNED" ||
          !serviceRequest.agent_id
        ) {
          return jsonResponse(
            {
              error:
                "Request is not currently assigned to an agent.",
            },
            400,
          );
        }

        recipientUserId =
          serviceRequest.agent_id;

        break;

      case "REQUEST_IN_PROGRESS":
        /*
         * Admin can generate the notification,
         * or the assigned Agent can generate it.
         */
        if (
          callerProfile.role === "agent" &&
          serviceRequest.agent_id !== user.id
        ) {
          return jsonResponse(
            {
              error:
                "You are not assigned to this request.",
            },
            403,
          );
        }

        if (
          callerProfile.role !== "admin" &&
          callerProfile.role !== "agent"
        ) {
          return jsonResponse(
            {
              error:
                "You are not authorized to generate this notification.",
            },
            403,
          );
        }

        if (serviceRequest.status !== "IN_PROGRESS") {
          return jsonResponse(
            {
              error:
                "Request is not currently in progress.",
            },
            400,
          );
        }

        recipientUserId =
          serviceRequest.customer_id;

        break;

      case "REQUEST_COMPLETED":
        /*
         * Admin can generate the notification,
         * or the assigned Agent can generate it.
         */
        if (
          callerProfile.role === "agent" &&
          serviceRequest.agent_id !== user.id
        ) {
          return jsonResponse(
            {
              error:
                "You are not assigned to this request.",
            },
            403,
          );
        }

        if (
          callerProfile.role !== "admin" &&
          callerProfile.role !== "agent"
        ) {
          return jsonResponse(
            {
              error:
                "You are not authorized to generate this notification.",
            },
            403,
          );
        }

        if (serviceRequest.status !== "COMPLETED") {
          return jsonResponse(
            {
              error:
                "Request is not currently completed.",
            },
            400,
          );
        }

        recipientUserId =
          serviceRequest.customer_id;

        break;
    }

    /*
     * ---------------------------------------------------------
     * Load recipient device tokens
     * ---------------------------------------------------------
     */

    const {
      data: devices,
      error: deviceError,
    } = await adminClient
      .from("device_tokens")
      .select("fcm_token")
      .eq("user_id", recipientUserId);

    if (deviceError) {
      throw new Error(
        `Failed to load device tokens: ${deviceError.message}`,
      );
    }

    if (!devices || devices.length === 0) {
      return jsonResponse(
        {
          success: true,
          sent_count: 0,
          message:
            "No registered devices found for the notification recipient.",
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * Create Firebase access token
     * ---------------------------------------------------------
     */

    const accessToken =
      await createFirebaseAccessToken(
        serviceAccount,
      );

    const notification =
      getNotificationContent(
        event as NotificationEvent,
        serviceRequest.request_number,
      );

    /*
     * ---------------------------------------------------------
     * Send notification to all recipient devices
     * ---------------------------------------------------------
     */

    let sentCount = 0;

    for (const device of devices) {
      try {
        await sendFcmNotification(
          accessToken,
          serviceAccount.project_id,
          device.fcm_token,
          notification.title,
          notification.body,
        );

        sentCount++;
      } catch (error) {
        /*
         * One invalid device token should not prevent
         * notifications from reaching other devices.
         */
        console.error(
          "Failed to send notification to device:",
          error,
        );
      }
    }

    return jsonResponse({
      success: true,
      event,
      request_id: requestId,
      recipient_user_id: recipientUserId,
      sent_count: sentCount,
    });
  } catch (error) {
    console.error(
      "Push notification error:",
      error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      500,
    );
  }
});