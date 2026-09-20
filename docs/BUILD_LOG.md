# QuickServe Build Log

## Day 1 — Foundations

**Date:** 19 September 2026

### Built

- Created the Supabase project and PostgreSQL database.
- Created the following tables:
  - `profiles`
  - `services`
  - `service_requests`
  - `request_status_history`
  - `audit_logs`
- Added indexes for customer, agent, and request status lookups.
- Added automatic request number generation in the format:
  `REQ-YYYY-NNNNNN`
- Enabled Row Level Security (RLS) on all tables.
- Added customer, agent, and admin RLS policies.
- Added trigger-based status history and audit logging.
- Created the GitHub repository with:
  - `/mobile`
  - `/web`
  - `/docs`
- Set up Flutter with Android emulator support.
- Added Flutter packages:
  - `supabase_flutter`
  - `flutter_riverpod`
  - `go_router`
- Connected Flutter to Supabase.
- Created the Flutter routing skeleton.
- Created the Next.js admin application.
- Added `@supabase/supabase-js`.
- Configured `.env.local`.
- Created the admin routes:
  - `/login`
  - `/dashboard`
  - `/requests`
  - `/customers`
  - `/agents`

### Decisions Made & Why

**Supabase instead of Firebase**

Supabase was selected because QuickServe requires relational data such as
customers, services, requests, agents, and request history. PostgreSQL also
provides RLS, foreign keys, constraints, and database triggers.

**Flutter architecture**

A feature-first folder structure was used so authentication, requests,
services, profile, and shared functionality remain separated as the project
grows.

**GoRouter**

GoRouter was selected for declarative navigation and future role-based
routing.

**Riverpod**

Riverpod was added for structured state management as the mobile application
becomes more complex.

### Problems Hit & How They Were Solved

**Android NDK build failure**

The first Flutter Android build failed because the NDK download was
interrupted.

**Solution:** Installed NDK `28.2.13676358` through Android Studio and
successfully rebuilt the application.

**Android emulator not detected**

Flutter initially could not find `emulator-5554` because the emulator was not
running.

**Solution:** Started the Pixel 7 emulator and verified it using
`flutter devices`.

**Supabase URL issue**

The REST endpoint URL containing `/rest/v1/` was initially used for Flutter.

**Solution:** Changed it to the Supabase project base URL.

**Flutter test issue**

The default Flutter test referenced `MyApp` after the application had been
renamed to `QuickServeApp`.

**Solution:** Updated the test to use `QuickServeApp`.

### Security / Architecture Notes

RLS is enabled on all five database tables.

Customer request access is restricted using the authenticated user's ID.

RLS was tested using two customer accounts. Customer One could retrieve their
own request while the other customer's request was not returned.

Status history and audit logs are protected from direct client writes and are
handled through database triggers.

### What I'd Do Differently With More Time

- Perform a complete RLS test for customer, agent, and admin roles.
- Improve the request number generation mechanism for high-concurrency
  scenarios.
- Add more automated database/security tests.

### Day 1 Status

Core Day 1 foundation is complete.

Next focus:

- Supabase authentication
- Flutter login and registration
- Splash/session handling
- Role-based routing
- Password reset
- Services list



## Day 2 — Customer Request Workflow & Profile

**Date:** 20 September 2026

### Built

* Completed the customer-facing service workflow in Flutter.

* Implemented the Services module:

  * Created `ServiceModel`.
  * Created `ServicesRepository`.
  * Connected the services screen to Supabase.
  * Added filtering for active services using `is_active = true`.
  * Added alphabetical ordering by service name.
  * Added loading, error, empty, retry, and refresh states.

* Implemented the Service Request module:

  * Created `ServiceRequestModel`.
  * Created `RequestsRepository`.
  * Created the Create Request screen.
  * Added service selection.
  * Added request description.
  * Added address.
  * Added preferred date.
  * Added preferred time.
  * Added priority selection:

    * `LOW`
    * `MEDIUM`
    * `HIGH`

* Implemented request creation using the authenticated customer's ID.

* Added preferred datetime conversion from local time to UTC before sending it to PostgreSQL.

* Implemented automatic request-number generation through the database.

* Implemented the customer My Requests screen:

  * Displays customer's requests.
  * Shows request number.
  * Shows service.
  * Shows status.
  * Shows description.
  * Shows priority.
  * Shows creation date.
  * Added refresh support.

* Implemented the Request Details screen:

  * Request number.
  * Service.
  * Status.
  * Priority.
  * Description.
  * Address.
  * Preferred date/time.
  * Created date.
  * Updated date.

* Added request-detail routing:

  `/requests/:id`

* Completed the customer Profile module:

  * Full name.
  * Email.
  * Phone.
  * Role.
  * Profile avatar initial.
  * Profile validation.
  * Profile update.
  * Error handling.
  * Retry.
  * Logout.

* Added the profile route:

  `/profile`

* Updated `ProfileService` with:

  * `currentUserEmail`
  * `updateCurrentUserProfile()`

* Customer profile updates are limited to:

  * `full_name`
  * `phone`

* Verified the complete customer workflow successfully.

---

## Important Database Bug Fixed

### Request Number Generation — Duplicate Request Number

While testing request creation, the application initially failed with a duplicate request-number/unique-constraint error.

The request numbers were intended to follow:

```text
REQ-2026-000001
REQ-2026-000002
REQ-2026-000003
```

The original approach generated the next number using the maximum existing number plus one.

The problem was caused by **Row Level Security**.

A customer can only see their own requests because of RLS.

Therefore, when the request-number function executed under the customer's security context, it could not see requests belonging to other customers.

For example:

```text
Database:

REQ-2026-000001 → Customer One
REQ-2026-000002 → Customer Two
```

Customer One could effectively see:

```text
REQ-2026-000001
```

The generator could therefore calculate:

```text
MAX = 000001
NEXT = 000002
```

even though:

```text
REQ-2026-000002
```

already existed.

This resulted in a unique constraint violation.

### Solution

Changed `generate_request_number()` to use:

```text
SECURITY DEFINER
```

with:

```text
SET search_path = public
```

This allows the trusted database function to access the required request data independently of the customer's RLS visibility.

Also added:

```text
pg_advisory_xact_lock()
```

to protect request-number generation from concurrent transactions.

The final flow is:

```text
Customer creates request
        ↓
INSERT service_requests
        ↓
BEFORE INSERT trigger
        ↓
set_request_number()
        ↓
generate_request_number()
        ↓
SECURITY DEFINER
        ↓
Advisory transaction lock
        ↓
Generate next request number
        ↓
REQ-YYYY-NNNNNN
```

---

## Why Advisory Lock Was Added

Using:

```text
MAX + 1
```

can create a race condition.

For example, two customers could create requests simultaneously:

```text
Transaction A:
MAX = 5
NEXT = 6

Transaction B:
MAX = 5
NEXT = 6
```

Both could try to create:

```text
REQ-2026-000006
```

The unique constraint would reject one of them.

The advisory transaction lock ensures that request-number generation happens sequentially.

Conceptually:

```text
Transaction A
    ↓
Acquire lock
    ↓
Generate 000006
    ↓
Complete
    ↓
Release lock
    ↓
Transaction B continues
    ↓
Generate 000007
```

---

## Database Testing

The request-number generation was also tested directly at the database level.

A test insert was performed inside a transaction:

```text
BEGIN
    ↓
INSERT request
    ↓
Trigger executes
    ↓
Request number generated
    ↓
ROLLBACK
```

This confirmed that the database trigger and request-number generator were working independently of the Flutter UI.

After fixing the generator, request creation from Flutter also worked successfully.

---

## Decisions Made & Why

### **Database Generates Request Numbers**

The Flutter client does not generate request numbers.

Instead, PostgreSQL generates them using a trigger and database function.

**Why:**

The database is the central authority for globally unique request numbers.

This prevents different clients from generating conflicting business identifiers.

---

### **SECURITY DEFINER for Request Number Generation**

The request-number function uses `SECURITY DEFINER`.

**Why:**

RLS intentionally hides other customers' requests from a customer.

However, the request-number generator needs to inspect all relevant request numbers to generate the next global number.

Therefore, the trusted database function gets the required elevated execution context instead of giving the customer broader access.

---

### **Advisory Lock for Concurrency**

An advisory transaction lock was added around request-number generation.

**Why:**

It prevents two simultaneous requests from calculating the same next number.

This makes the `MAX + 1` approach safer under concurrent request creation.

---

### **UTC for Preferred Date/Time**

Preferred datetime is converted to UTC before being stored.

**Why:**

Users may operate from different time zones.

Storing the actual instant consistently prevents timezone-related ambiguity.

---

### **Repository Pattern**

Supabase queries were kept inside repositories/services rather than directly inside UI widgets.

Examples:

```text
AuthService
ProfileService
ServicesRepository
RequestsRepository
```

**Why:**

This separates:

```text
UI
↓
Data access
↓
Database
```

and makes the application easier to maintain and extend.

---

### **Profile Role Is Read-Only**

Customers can edit:

```text
Full Name
Phone
```

but cannot edit:

```text
Role
```

**Why:**

Role is a security-sensitive field.

A customer must not be able to change:

```text
customer → agent
```

or:

```text
customer → admin
```

through the normal profile flow.

---

## Security / Architecture Notes

RLS continues to be the main authorization layer.

The customer request flow uses:

```text
Authenticated User
       ↓
auth.uid()
       ↓
RLS
       ↓
Customer-owned data
```

The application also filters requests by the current customer's ID, but this is **not considered the final security boundary**.

The database must enforce the restriction independently.

The customer profile update sends only:

```text
full_name
phone
```

and does not send `role`.

Status history and audit logs remain protected from arbitrary direct client writes.

---

## Flutter Features Completed

The customer flow is now:

```text
Login/Register
      ↓
Customer Home
      ↓
Services
      ↓
Create Request
      ↓
My Requests
      ↓
Request Details
      ↓
Profile
      ↓
Logout
```

Implemented screens/features:

```text
ServicesScreen
CreateRequestScreen
MyRequestsScreen
RequestDetailsScreen
ProfileScreen
```

---

## Testing Completed

Successfully tested:

* Customer authentication.
* Services loading.
* Active-service filtering.
* Service request creation.
* Automatic request-number generation.
* Request-number bug fix.
* My Requests.
* Request Details.
* Profile loading.
* Profile editing.
* Profile persistence.
* Logout.
* Flutter analyzer after cleanup.

The complete customer workflow is currently working.

---

## Problems Hit & How They Were Solved

### **Duplicate Request Number**

**Problem:**
Request creation failed because the generated request number already existed.

**Root cause:**
RLS restricted the rows visible to the request-number generator.

**Solution:**

* `SECURITY DEFINER`
* Controlled `search_path`
* Advisory transaction lock
* Database trigger

---

### **Unused Flutter Imports**

**Problem:**
`flutter analyze` reported unused imports in the request screens.

**Solution:**
Removed the unnecessary imports and re-ran the analyzer.

---

### **Profile Update Security**

**Problem:**
A customer profile needs to be editable, but role must not become editable.

**Solution:**
The Flutter update operation only sends:

```text
full_name
phone
```

while role remains read-only and RLS continues to enforce ownership/security.

---

## Interview Concepts Learned Today

Important concepts from Day 2:

```text
RLS
Security Definer
Advisory Locks
Race Conditions
Concurrency
Database Triggers
Unique Constraints
Repository Pattern
Authentication vs Authorization
UTC / Time Zones
Role-Based Access Control
Database-Level Security
```

### Most Important Interview Story

> "While implementing service-request creation, I encountered a duplicate request-number error. The initial generator used MAX + 1, but because the function was affected by RLS, a customer could not see other customers' requests. This caused the function to generate a number that already existed globally. I solved it by using a SECURITY DEFINER function with a controlled search path and an advisory transaction lock to handle concurrent request creation. I verified the database trigger independently and then confirmed the complete Flutter flow."

---

## What I'd Do Differently With More Time

* Replace the `MAX + 1` request-number strategy with a dedicated PostgreSQL sequence/counter approach if the system needs very high request-generation throughput.
* Add automated database tests for concurrent request creation.
* Perform more comprehensive negative RLS tests.
* Test customer, agent and admin access independently.
* Add automated tests for request status transitions.
* Add more comprehensive Flutter widget/integration tests.

---

## Day 2 Status

**Customer-side application flow is complete.**

Completed:

```text
✓ Authentication
✓ Services
✓ Create Request
✓ Request Number Generation
✓ Request Number Security Fix
✓ My Requests
✓ Request Details
✓ Customer Profile
✓ Logout
✓ Customer RLS flow
```

### Next Focus — Day 3

```text
Agent Module
    ↓
Agent RLS
    ↓
Assigned Requests
    ↓
Agent Dashboard
    ↓
Agent Request Details
    ↓
Status Updates
    ↓
Status History
    ↓
Agent Security Testing
```

After Agent:

```text
Admin Module
    ↓
Next.js Web/Admin
    ↓
Final RLS Testing
    ↓
End-to-End Testing
    ↓
Deployment
```

**Day 2 is therefore the transition from the QuickServe foundation into a functioning customer-facing application.**
