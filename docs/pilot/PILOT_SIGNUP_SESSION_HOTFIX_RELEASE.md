# Pilot Signup Session Hotfix Release

## Release objective

Restore Pilot student self-registration by preventing the public signup request from attempting to refresh an authentication session before the account exists.

## Root cause

`PilotAuth` used the authenticated `invokePilotFunction` helper for `pilot-student-signup`. That helper calls `ensureFreshAuthSession()` before invoking an Edge Function. New users do not yet have a session, so registration failed with the secure sign-in renewal message.

## Correction

- `pilot-student-signup` now uses `invokePublicPilotFunction`.
- The public helper invokes the Edge Function without reading or refreshing a user session.
- Authenticated Pilot actions retain session refresh and retry protection.
- `supabase/config.toml` explicitly preserves `verify_jwt = false` for the intentionally public signup function.
- Phase 1 regression coverage rejects any future signup dependency on session refresh.

## Security controls retained

The Edge Function continues to enforce official-origin validation, input validation, rate limiting, service-role user creation, Pilot enrolment, audit logging and account rollback when enrolment fails.

## Verification

- Phase 1 authentication gate passed.
- Pilot isolation passed.
- TypeScript passed.
- ESLint passed.
- Production build passed.
- Pilot Preview build passed.
- Vercel Preview was READY and `/pilot/auth` returned HTTP 200.
- Preview runtime error and fatal logs were clear.
