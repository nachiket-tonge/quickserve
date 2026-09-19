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