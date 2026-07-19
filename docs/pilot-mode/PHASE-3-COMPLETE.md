# Phase 3 Complete — Controlled Pilot Backend

## Completion status

**COMPLETE — 17 July 2026**

## Completion result

The additive Controlled Pilot Mode backend is implemented in the connected Supabase project. It has an isolated relational model, RLS, private Storage, controlled operational RPCs, Realtime configuration, retention and deletion planning, export controls, audit logging, generated TypeScript definitions, verification evidence and rollback guidance.

No Pilot interface has been enabled in the application yet. Phase 4 remains responsible for the frontend provider, routes, student journey and administrative dashboards.

## Delivered database model

### Enums

Nine Pilot-specific enums define programme, participant, session, report, scenario, event, notification, location and test states.

### Tables

Twelve isolated tables provide:

- programme configuration;
- scenario configuration;
- participant authorisation and consent;
- test sessions;
- simulated reports;
- immutable report events;
- location test events;
- private attachment metadata;
- Pilot-only notifications;
- feature-test outcomes;
- participant feedback;
- audit logs.

## Delivered controls

### Identity and role scope

- Students are restricted to their authorised participation and owned Pilot data.
- Campus security is restricted to its profile campus.
- Campus heads receive additional own-campus purge planning authority.
- Super admins manage programme configuration and cross-campus operations.
- Anonymous users have no Pilot table privileges.

### Production isolation

The Pilot schema has no foreign key or workflow dependency on:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- production `notifications`;
- `case_updates`;
- `case_escalations`.

It does not use the production incident bucket or production push function.

### Safety behaviour

Creation of a simulated Pilot report automatically creates:

1. a Pilot report event; and
2. a Pilot notification explicitly stating that no emergency service was dispatched.

### Storage

The private `pilot-report-attachments` bucket enforces:

- 10 MB maximum object size;
- approved image, video and PDF MIME types;
- programme/campus/user/report path structure;
- uploader ownership validation;
- authorised signed reads;
- no broad browser update or delete permission.

### Operational RPCs

Twelve public `SECURITY INVOKER` wrappers provide controlled consent, report transitions, notes, notifications, withdrawal, deletion planning, purge planning, retention planning and export.

Elevated logic is isolated in the non-exposed `pilot_private` schema.

### Deletion boundary

Report, session, campus, programme and retention operations return exact Storage cleanup plans when private objects exist.

Phase 5 service functions will remove those objects with service credentials and finalise the relational deletion only after successful Storage cleanup. This preserves the storage-first deletion contract without granting destructive browser permissions.

### Realtime

Only the following Pilot tables were added:

- `pilot_sessions`;
- `pilot_reports`;
- `pilot_report_events`;
- `pilot_notifications`.

## Verification result

- 12 Pilot tables found.
- RLS enabled on every Pilot table.
- 27 Pilot table policies found.
- Two Pilot Storage policies found.
- Zero anonymous Pilot table grants.
- Zero public Pilot `SECURITY DEFINER` RPCs.
- Zero foreign keys to production incident operations.
- All Pilot foreign-key coverage warnings resolved.
- Security adviser clear except the accepted paid-plan password warning.
- Performance adviser contains only informational unused-index notices on empty tables.
- Checked-in Supabase types contain all Pilot tables, RPCs, enums and relationships.

## Evidence

- `03-live-migration-ledger.md`
- `03-backend-verification.md`
- `supabase/manual-migrations/pilot-mode/phase-3/README.md`
- `supabase/manual-migrations/pilot-mode/phase-3/00_extract_applied_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/90_verify_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/99_rollback_phase3.sql`
- live Supabase migration history through `20260717201047_phase_3_pilot_foreign_key_indexes`
- synchronized `src/integrations/supabase/types.ts`

## Phase 4 entry gate

Phase 4 is authorised to implement:

- the fail-closed Pilot Mode feature flag;
- Pilot route guards and provider;
- student consent and session journey;
- scenario execution;
- simulated report submission;
- location and attachment testing;
- Pilot report timeline and notifications;
- feedback and resources;
- campus Pilot dashboard;
- super-admin Pilot dashboard;
- analytics, deletion-plan and export interfaces.

## Merge control

No merge to `main` is authorised by Phase 3 completion. The implementation branch and PR remain in draft review until all phases, Vercel Preview testing and final user approval are complete.