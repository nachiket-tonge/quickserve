# QuickServe — Manual Testing & QA Walkthrough

This is a step-by-step script for testing QuickServe end-to-end: the Admin Portal, then the
mobile app as a Customer, then the mobile app as an Agent. Follow the parts **in order** —
later steps depend on data created in earlier ones (e.g. you need a Service and an Agent to
exist before you can assign a request).

Tick each box as you go. If something doesn't behave as described, note it under
[Reporting an Issue](#reporting-an-issue) at the bottom.

---

## 0. What You'll Need

| Item | Where to get it |
|---|---|
| Admin Portal URL | `https://quickserve-green-chi.vercel.app/` |
| Admin login credentials | Provided separately (see submission email) |
| QuickServe Android APK | Download link provided separately (see submission email) |
| An Android device or emulator | To install the APK |

> The mobile app is a **single APK** used by both customers and agents — which dashboard opens
> depends entirely on the role of the account you log in with.

---

## Part A — Admin Portal

### A1. Login

- [ ] Open `https://quickserve-green-chi.vercel.app/`
- [ ] Log in with the admin credentials provided
- [ ] Confirm you land on the **Dashboard**, not a login error
- [ ] *(Optional negative test)* Try logging in with a customer or agent account instead — this
      should be rejected with a message that the portal is restricted to administrators

### A2. Dashboard

- [ ] Confirm the dashboard shows live counts: Total Requests, and a breakdown by status
      (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), plus Agent and Customer totals
- [ ] These numbers should be **real**, not placeholders — they'll be 0 for requests the first
      time you test, and change as you go through the later steps

### A3. Create a Service

- [ ] Go to **Services**
- [ ] Confirm the seeded services (AC, Plumbing, Electrical, Cleaning) are listed and active
- [ ] Create a new service (e.g. "Pest Control") — provide a name and description
- [ ] Confirm it appears in the list, marked active
- [ ] Deactivate it, confirm it disappears from what a customer would see, then reactivate it

### A4. Create an Agent

- [ ] Go to **Agents**
- [ ] Click **Create Agent**
- [ ] Fill in name, email, password, and select at least one service specialization
      (e.g. "Plumbing")
- [ ] Submit, and confirm the new agent appears in the Agents list with the correct
      specialization shown
- [ ] Keep this agent's email/password — you'll use it in **Part C**

### A5. Customers List (comes alive after Part B)

- [ ] Come back to **Customers** after completing Part B — the customer account you register
      on the mobile app should appear here, searchable by name/phone/ID

### A6. Requests, Assignment & Audit (comes alive after Part B)

- [ ] Once a customer has created a request (Part B), find it under **Requests**
- [ ] Open it, confirm the details match what was submitted (service, description, address,
      priority)
- [ ] Assign the agent created in A4 — confirm the agent-selection list only shows agents
      qualified for that request's service
- [ ] Confirm the request's status changes to `ASSIGNED`
- [ ] Go to **Audit Logs** — confirm a new entry appears reflecting the assignment

---

## Part B — Mobile App: Customer Flow

### B1. Install

- [ ] Download the APK from the provided link and install it on your device/emulator
      (you may need to allow "install from unknown sources")

### B2. Register & Login

- [ ] Open the app → **Register**
- [ ] Create a new customer account (name, phone, email, password)
- [ ] Confirm you land on the **Customer Home** screen after registering/logging in
- [ ] Log out, then log back in with the same credentials — confirm session works correctly

### B3. Browse Services

- [ ] Go to **Services** — confirm only active services are listed

### B4. Create a Request

- [ ] Go to **Create Request**
- [ ] Select a service (pick the one your test agent from A4 is qualified for, e.g.
      "Plumbing"), enter a description, address, preferred date/time, and priority
- [ ] Submit — confirm you get a request number in the format `REQ-YYYY-NNNNNN`

### B5. Track the Request

- [ ] Go to **My Requests** — confirm the new request appears with status `NEW`
- [ ] Open **Request Details** — confirm it shows the status timeline
- [ ] Leave this request as-is for now — you'll assign it from the Admin Portal (A6) and then
      watch it move through the rest of its lifecycle from the Agent side (Part C)

### B6. Profile

- [ ] Go to **Profile** — confirm your name/phone are editable, and email/role are read-only
- [ ] Edit your name or phone, save, and confirm the change persists after reopening the screen

---

## Part C — Mobile App: Agent Flow

> Do this after Part A6 (the admin has assigned your test agent to the request created in B4).

### C1. Login as the Agent

- [ ] Log out of the customer account
- [ ] Log in with the agent credentials created in A4
- [ ] Confirm you land on the **Agent Dashboard** — this is the same app, different account, so
      the app should route you differently based on role

### C2. Push Notification

- [ ] When the admin assigned the request to this agent in A6, you should have received a push
      notification on this device (e.g. "New Service Request — Request REQ-... has been
      assigned to you")

### C3. View Assigned Requests

- [ ] Go to **Assigned Requests** — confirm the request from B4 appears here
- [ ] Open its details

### C4. Work the Request

- [ ] Tap **Start Work** — confirm status moves to `IN_PROGRESS`
- [ ] Add an internal **note** on the request (a short comment)
- [ ] Tap **Complete** — confirm status moves to `COMPLETED`

### C5. Confirm From the Customer Side

- [ ] Log out of the agent account, log back in as the customer from Part B
- [ ] Open the same request in **My Requests** — confirm the status now shows `COMPLETED` and
      the timeline reflects each transition (`NEW → ASSIGNED → IN_PROGRESS → COMPLETED`)

---

## Part D — Security Spot-Checks (Optional but Recommended)

These confirm authorization is enforced by the database, not just hidden in the UI:

- [ ] **Customer isolation:** register a second customer account, create a request with it, and
      confirm the first customer's "My Requests" never shows the second customer's request
- [ ] **Agent isolation:** confirm an agent only ever sees requests assigned to them, never
      another agent's assigned work
- [ ] **Admin-only routes:** confirm a customer or agent login cannot reach the Admin Portal at
      all (see A1's negative test)
- [ ] **Invalid status jump:** there is no UI path to skip a status (e.g. `NEW` straight to
      `COMPLETED`) — this is enforced by the database and shouldn't be reachable from either app

---

## Known Behavior to Expect (Not Bugs)

- **Password reset emails** are currently limited by the environment's email/rate-limit
  configuration — the reset flow is implemented, but delivery may not go through in this test
  environment.
- **Request notes** (added in C4) are visible to the agent only — they will not appear on the
  customer app or the admin dashboard. This is by design.
- Deleting a service is not possible by design — only activate/deactivate — so services created
  during testing will remain in the list (deactivated is fine to leave them in).

---

## Reporting an Issue

If any step above doesn't behave as described, note:
1. Which step (e.g. "A4")
2. What you expected vs. what happened
3. Screenshot if possible

and send it back along with the rest of the submission feedback.
