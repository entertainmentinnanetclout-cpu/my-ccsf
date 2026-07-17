# Phase 2 Complete — Controlled Pilot Mode Architecture

## Completion status

**COMPLETE — 17 July 2026**

## Completion result

The Controlled Pilot Mode architecture is now fully defined. Phases 3–7 have an approved route model, mode boundary, database contract, RLS contract, Storage model, dashboard scope, notification model, analytics catalogue, deletion and retention contract, Edge Function list, exact file register and rollback sequence.

No Pilot Mode implementation was merged into `main` during this phase.

## Approved decisions

### Environment and release

- Continue on `feature/controlled-pilot-mode`.
- Use Vercel Preview for implementation and testing.
- Keep production Pilot Mode disabled until explicit approval.
- Add `VITE_PILOT_MODE_ENABLED` as a fail-closed feature flag.
- Require an active pilot programme and participant authorisation in addition to the feature flag.
- Merge only after all phases and user testing are complete.

### Routes

Student:

- `/pilot`
- `/pilot/session/:sessionId`
- `/pilot/report/:reportId`
- `/pilot/resources`

Campus administration:

- `/security/pilot`

Super administration:

- `/admin/pilot`

### Data isolation

Pilot Mode will use separate:

- `pilot_*` tables;
- private `pilot-report-attachments` bucket;
- React Query keys;
- Realtime channels;
- in-app notifications;
- Edge Functions;
- deletion, retention and export functions.

Pilot Mode will not use:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- production `notifications`;
- `case_updates`;
- `case_escalations`;
- `incident-media` Storage;
- `send-push-notification`;
- production emergency dispatch integrations.

### Roles

- Students: own authorised pilot participation, sessions, reports, events, notifications, feedback and withdrawal.
- Campus security: own-campus pilot operations only.
- Campus heads: own-campus bulk purge authority.
- Super admins: programme-wide configuration and control.
- Anonymous users: no pilot access.

### Student safety

Every pilot emergency interaction must display the no-real-dispatch warning.

The production emergency component and production live-location tracker will not be reused in Pilot Mode.

### Retention and deletion

- Default retention: 30 days.
- Configurable range: 7–90 days.
- Private attachments are deleted with their report/session/program.
- Destructive actions require role checks, confirmation, reason and audit evidence.
- Bulk campus purge requires campus-head or super-admin authority.

### Preview and production control

The feature branch remains the implementation branch. Vercel Preview is the testing environment. The final merge to `main` remains a manual user decision after Phase 7.

## Phase 2 evidence

- `02-architecture-and-implementation-plan.md`
- `02a-data-security-and-retention-contract.md`
- `02b-exact-file-change-register.md`
- `00-phase-tracker.md`
- Draft Pull Request #5
- GitHub Issue #4

## Phase 3 entry gate

Phase 3 is authorised to begin.

Phase 3 must:

1. create additive pilot enums and tables;
2. create indexes and constraints;
3. enable and verify RLS;
4. create a private pilot attachment bucket;
5. create private helper and controlled RPC architecture;
6. create deletion, retention and export functions;
7. configure pilot Realtime tables;
8. regenerate checked-in Supabase types;
9. create execution and rollback records;
10. avoid all production incident operations.

## Merge control

No merge to `main` is authorised by Phase 2 completion. The branch remains isolated until the user completes full preview testing after all phases.