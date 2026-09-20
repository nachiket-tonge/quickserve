import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey
);

type CreateAgentBody = {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  serviceIds?: string[];
};

export async function POST(request: NextRequest) {
  try {
    /*
     * ---------------------------------------------------------
     * 1. Get the authenticated user's access token
     * ---------------------------------------------------------
     */
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const accessToken = authorization.substring("Bearer ".length);

    /*
     * ---------------------------------------------------------
     * 2. Verify the authenticated user
     * ---------------------------------------------------------
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired authentication token" },
        { status: 401 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 3. Verify that the caller is an Admin
     * ---------------------------------------------------------
     */
    const { data: adminProfile, error: adminProfileError } =
      await serviceSupabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

    if (
      adminProfileError ||
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Only administrators can create agents" },
        { status: 403 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 4. Read request body
     * ---------------------------------------------------------
     */
    const body = (await request.json()) as CreateAgentBody;

    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim() || null;
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    const serviceIds = Array.isArray(body.serviceIds)
      ? [...new Set(body.serviceIds.filter(Boolean))]
      : [];

    /*
     * ---------------------------------------------------------
     * 5. Validate agent information
     * ---------------------------------------------------------
     */
    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters" },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 6. Validate service selection
     * ---------------------------------------------------------
     */
    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one service" },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 7. Verify that all selected services exist and are active
     * ---------------------------------------------------------
     */
    const { data: services, error: servicesError } =
      await serviceSupabase
        .from("services")
        .select("id")
        .in("id", serviceIds)
        .eq("is_active", true);

    if (servicesError) {
      console.error("Service validation error:", servicesError);

      return NextResponse.json(
        { error: "Unable to validate selected services" },
        { status: 500 }
      );
    }

    if (!services || services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "One or more selected services are invalid or inactive" },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 8. Create Supabase Auth user
     * ---------------------------------------------------------
     */
    const {
      data: createdUser,
      error: createUserError,
    } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "agent",
      },
    });

    if (createUserError || !createdUser.user) {
      console.error("Create Auth user error:", createUserError);

      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Failed to create agent account",
        },
        { status: 400 }
      );
    }

    const agentId = createdUser.user.id;

    /*
     * ---------------------------------------------------------
     * 9. Update profile created by the auth trigger
     * ---------------------------------------------------------
     *
     * The handle_new_user() trigger creates the profile as
     * customer by default.
     *
     * We now convert that profile into an agent.
     */
    const { data: updatedProfile, error: profileError } =
      await serviceSupabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          role: "agent",
        })
        .eq("id", agentId)
        .select("id, full_name, phone, role")
        .single();

    if (profileError || !updatedProfile) {
      console.error("Profile update error:", profileError);

      /*
       * Roll back the Auth user.
       *
       * profiles and agent_services use ON DELETE CASCADE,
       * so deleting the Auth user also removes the profile
       * and its service mappings.
       */
      await serviceSupabase.auth.admin.deleteUser(agentId);

      return NextResponse.json(
        { error: "Failed to create agent profile" },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 10. Create agent-service mappings
     * ---------------------------------------------------------
     */
    const agentServiceRows = serviceIds.map((serviceId) => ({
      agent_id: agentId,
      service_id: serviceId,
    }));

    const { error: agentServicesError } = await serviceSupabase
      .from("agent_services")
      .insert(agentServiceRows);

    if (agentServicesError) {
      console.error(
        "Agent service mapping error:",
        agentServicesError
      );

      /*
       * Roll back the entire agent creation.
       *
       * Because agent_services.agent_id references profiles
       * with ON DELETE CASCADE, deleting the Auth user will
       * cascade through profile → agent_services.
       */
      await serviceSupabase.auth.admin.deleteUser(agentId);

      return NextResponse.json(
        { error: "Failed to assign services to agent" },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------------------------
     * 11. Return created agent
     * ---------------------------------------------------------
     */
    return NextResponse.json(
      {
        message: "Agent created successfully",
        agent: {
          id: updatedProfile.id,
          fullName: updatedProfile.full_name,
          phone: updatedProfile.phone,
          role: updatedProfile.role,
          serviceIds,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create agent API error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}