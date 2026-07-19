# Phase 3 — Pilot Backend Verification

## Verification date

17 July 2026

## Live result

| Control | Result |
|---|---:|
| Pilot tables | 12 |
| Pilot enums | 9 |
| Public Pilot RPCs | 12 |
| Public Pilot `SECURITY DEFINER` RPCs | 0 |
| Pilot table RLS enabled | All tables |
| Pilot table policies | 27 |
| Pilot Storage policies | 2 |
| Anonymous Pilot table grants | 0 |
| Production incident foreign keys | 0 |
| Pilot Realtime tables | 4 |
| Private attachment bucket | Confirmed |
| Attachment size limit | 10 MB |
| Approved MIME types | JPEG, PNG, WebP, MP4, PDF |

## Realtime verification

Only these Pilot tables were added to `supabase_realtime`:

- `pilot_notifications`
- `pilot_report_events`
- `pilot_reports`
- `pilot_sessions`

No production incident table was added or removed by Phase 3.

## Foreign-key isolation

Pilot foreign keys target only:

- other `pilot_*` tables;
- `profiles`, for authenticated identity and staff assignment.

They do not target:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- `notifications`;
- `case_updates`;
- `case_escalations`.

## Access verification

- Anonymous users have no Pilot table privileges.
- Students can access only authorised participation and their own sessions, reports, events, locations, attachments, notifications, feature tests and feedback.
- Campus security is limited to its profile campus.
- Campus-head bulk purge is limited to the head's campus.
- Super admins manage programme configuration and cross-campus operations.
- Public RPC wrappers execute with invoker rights.
- Elevated operational cores are isolated in `pilot_private`.
- Trigger and policy helpers remain outside the exposed Data API.

## Storage verification

Bucket:

```text
pilot-report-attachments
```

Verified state:

- `public = false`;
- `file_size_limit = 10485760`;
- upload paths require programme, campus, authenticated user and report identifiers;
- uploads require ownership of the referenced Pilot report;
- reads require Pilot report access;
- client-side update and deletion are unavailable.

## Adviser results

### Security adviser

Only the accepted plan-limited warning remains:

- leaked-password protection disabled.

This remains excluded from the project gate while the Supabase plan does not support it.

### Performance adviser

- No uncovered Pilot foreign-key warnings remain.
- No Pilot RLS initialization-plan warnings were introduced.
- No Pilot multiple-permissive-policy warning was introduced.
- Remaining unused-index notices are informational because all Pilot tables are currently empty.

## Type synchronization

`src/integrations/supabase/types.ts` now includes:

- PostgREST version `13.0.5`;
- all 12 Pilot tables and relationships;
- all 12 public Pilot RPCs;
- all nine Pilot enums and constants.

## Verification script

The read-only repeatable verification query is stored at:

```text
supabase/manual-migrations/pilot-mode/phase-3/90_verify_phase3.sql
```