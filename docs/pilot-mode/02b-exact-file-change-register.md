# Phase 2B — Exact File Change Register

## Status

**APPROVED IMPLEMENTATION REGISTER**

This register defines the expected repository changes for Phases 3–5. Files may be adjusted only when implementation proves a documented technical necessity. Any deviation must be recorded in the phase tracker.

---

## 1. Existing files to modify

### `src/App.tsx`

Changes:

- import Pilot Mode route guards and pages;
- mount `PilotModeProvider` inside `AuthProvider`;
- add `/pilot`, `/pilot/session/:sessionId`, `/pilot/report/:reportId`, `/pilot/resources`;
- add `/security/pilot`;
- add `/admin/pilot`;
- preserve all existing production routes.

### `src/contexts/AuthContext.tsx`

Changes:

- allow approved Pilot routes in role redirect logic;
- preserve profile-completion enforcement;
- reject role-incompatible Pilot routes;
- do not change role priority.

### `src/pages/Dashboard.tsx`

Changes:

- optionally expose a controlled Pilot entry card/link when the flag and participation record permit it;
- do not add Pilot data to production dashboard counts;
- do not mount pilot services in production report views.

### `src/pages/Security.tsx`

Changes:

- add a Pilot navigation item or route-aware pilot view;
- render campus pilot dashboard only for `/security/pilot`;
- preserve existing production RealTimeIncidents and production views;
- do not combine pilot counts with production incident counts.

### `src/pages/Admin.tsx`

Changes:

- add a Pilot navigation item or route-aware pilot view;
- render super-admin pilot dashboard only for `/admin/pilot`;
- preserve all production admin views;
- do not combine pilot analytics with production analytics.

### `src/components/student/ReportIncident.tsx`

Planned refactor:

- retain production submission behaviour;
- extract presentation-only form sections where safe;
- use a production adapter/controller;
- no production table or bucket change as part of Pilot Mode.

### `src/components/student/EmergencyReport.tsx`

Changes:

- no pilot behaviour added to the production emergency function;
- optional extraction of reusable visual primitives only;
- production emergency submission and tracking remain isolated.

### `src/integrations/supabase/types.ts`

Changes:

- regenerate after Phase 3 migrations;
- include all pilot enums, tables, relationships and RPC signatures;
- never hand-edit after final type generation.

### `.env.example`

Add:

```env
VITE_PILOT_MODE_ENABLED=false
```

Optional future pilot configuration keys must be browser-safe only.

### `.github/workflows/ci.yml`

Changes:

- add `VITE_PILOT_MODE_ENABLED=true` for feature-branch build verification if needed;
- add type-check/lint steps only after existing project errors are assessed;
- keep workflow read-only.

---

## 2. New frontend foundation files

### `src/contexts/PilotModeContext.tsx`

Responsibilities:

- resolve feature flag and approved route;
- load active programme/participant/session context;
- expose `mode`, `enabled`, `program`, `participant`, `session`;
- fail closed when configuration is missing.

### `src/components/pilot/PilotRouteGuard.tsx`

Responsibilities:

- authentication;
- role check;
- profile completion;
- active programme;
- participant allowlist;
- campus eligibility;
- disabled/not-authorised states.

### `src/types/pilot.ts`

Responsibilities:

- frontend domain types;
- view models;
- form payloads;
- filters;
- analytics response types;
- no duplicate database enum strings where generated types are available.

### `src/config/pilot.ts`

Responsibilities:

- feature flag parsing;
- safe default retention display;
- route constants;
- status labels;
- persistent demo-warning text;
- approved file limits.

### `src/lib/pilotReference.ts`

Responsibilities:

- display formatting only;
- authoritative reference generation remains server-side.

### `src/lib/pilotDeviceInfo.ts`

Responsibilities:

- collect minimal browser/device metadata;
- no fingerprinting;
- no raw IP collection.

---

## 3. Shared incident-form files

### `src/components/shared/incident/IncidentFormShell.tsx`

Responsibilities:

- visual structure;
- field rendering;
- consent and signature presentation where applicable;
- no Supabase import;
- no Storage import;
- no mode detection.

### `src/components/shared/incident/incidentFormSchema.ts`

Responsibilities:

- Zod validation;
- common category/title/description/location rules;
- attachment validation helpers;
- production and pilot adapters may add stricter rules.

### `src/components/shared/incident/LocationCaptureField.tsx`

Responsibilities:

- permission and coordinate presentation;
- accepts injected capture callbacks;
- no direct database write.

### `src/services/production/productionReportAdapter.ts`

Responsibilities:

- contain existing production insert and attachment behaviour after refactor;
- preserve `incidents` and `incident-media` semantics;
- never import Pilot Mode services.

If extracting production behaviour creates unacceptable regression risk, this adapter may be deferred and the existing production component may remain intact. Pilot components must still remain separate.

---

## 4. New pilot service files

### `src/services/pilot/pilotProgramService.ts`

- active programme lookup;
- eligibility and programme display data.

### `src/services/pilot/pilotParticipantService.ts`

- participant lookup;
- consent;
- decline/withdrawal request.

### `src/services/pilot/pilotSessionService.ts`

- create/resume/complete/abandon session;
- session device metadata;
- expiry handling.

### `src/services/pilot/pilotReportService.ts`

- create report through pilot Edge Function;
- load own/campus/all reports according to caller;
- no direct status mutation.

### `src/services/pilot/pilotAttachmentService.ts`

- private upload path;
- file validation;
- metadata creation;
- signed URLs;
- cleanup on failure.

### `src/services/pilot/pilotLocationService.ts`

- pilot-only initial location and tracking writes;
- no production tracking hook reuse.

### `src/services/pilot/pilotNotificationService.ts`

- load and mark read;
- pilot Realtime subscription;
- no production notification insert.

### `src/services/pilot/pilotFeedbackService.ts`

- create/update participant feedback.

### `src/services/pilot/pilotAnalyticsService.ts`

- campus and super-admin metrics;
- de-identified export requests.

### `src/services/pilot/pilotAdminService.ts`

- programmes;
- scenarios;
- participants;
- status transitions;
- deletion/purge/export requests.

### `src/services/pilot/pilotQueryKeys.ts`

- single source for pilot React Query keys.

---

## 5. Student Pilot Mode pages and components

### Pages

- `src/pages/pilot/PilotLanding.tsx`
- `src/pages/pilot/PilotSession.tsx`
- `src/pages/pilot/PilotReportTracking.tsx`
- `src/pages/pilot/PilotResources.tsx`

### Components

- `src/components/pilot/PilotBanner.tsx`
- `src/components/pilot/PilotEligibilityState.tsx`
- `src/components/pilot/PilotConsent.tsx`
- `src/components/pilot/PilotScenarioList.tsx`
- `src/components/pilot/PilotScenarioCard.tsx`
- `src/components/pilot/PilotReportIncident.tsx`
- `src/components/pilot/PilotEmergencySimulation.tsx`
- `src/components/pilot/PilotReportTimeline.tsx`
- `src/components/pilot/PilotNotifications.tsx`
- `src/components/pilot/PilotFeedbackForm.tsx`
- `src/components/pilot/PilotCompletion.tsx`
- `src/components/pilot/PilotResourceDownload.tsx`

### Hooks

- `src/hooks/pilot/usePilotProgram.ts`
- `src/hooks/pilot/usePilotParticipant.ts`
- `src/hooks/pilot/usePilotSession.ts`
- `src/hooks/pilot/usePilotReports.ts`
- `src/hooks/pilot/usePilotLocationTracking.ts`
- `src/hooks/pilot/usePilotNotifications.ts`
- `src/hooks/pilot/usePilotFeatureTracking.ts`

Browser tracking key:

```text
pilot_location_tracking
```

---

## 6. Campus-admin Pilot Mode files

### Page

- `src/pages/pilot/CampusPilotPage.tsx`

### Components

- `src/components/pilot/admin/CampusPilotDashboard.tsx`
- `src/components/pilot/admin/PilotReportQueue.tsx`
- `src/components/pilot/admin/PilotReportDetail.tsx`
- `src/components/pilot/admin/PilotParticipantList.tsx`
- `src/components/pilot/admin/PilotFeatureResults.tsx`
- `src/components/pilot/admin/PilotFeedbackResults.tsx`
- `src/components/pilot/admin/PilotCampusExport.tsx`
- `src/components/pilot/admin/PilotCampusDataManager.tsx`

All campus components require campus-scoped services and RLS.

---

## 7. Super-admin Pilot Mode files

### Page

- `src/pages/pilot/SuperAdminPilotPage.tsx`

### Components

- `src/components/pilot/super/PilotProgrammeManager.tsx`
- `src/components/pilot/super/PilotScenarioManager.tsx`
- `src/components/pilot/super/PilotParticipantManager.tsx`
- `src/components/pilot/super/PilotAllReports.tsx`
- `src/components/pilot/super/PilotCampusComparison.tsx`
- `src/components/pilot/super/PilotAnalytics.tsx`
- `src/components/pilot/super/PilotExportManager.tsx`
- `src/components/pilot/super/PilotRetentionManager.tsx`
- `src/components/pilot/super/PilotAuditLog.tsx`

---

## 8. Phase 3 migration files

Approved location:

```text
supabase/migrations/
```

Required named migrations, in dependency order:

1. `*_pilot_create_enums.sql`
2. `*_pilot_create_program_tables.sql`
3. `*_pilot_create_session_report_tables.sql`
4. `*_pilot_create_event_location_attachment_tables.sql`
5. `*_pilot_create_notification_feedback_analytics_tables.sql`
6. `*_pilot_create_indexes_constraints.sql`
7. `*_pilot_enable_rls.sql`
8. `*_pilot_create_student_policies.sql`
9. `*_pilot_create_campus_policies.sql`
10. `*_pilot_create_super_admin_policies.sql`
11. `*_pilot_create_private_helpers.sql`
12. `*_pilot_create_status_transition_functions.sql`
13. `*_pilot_create_deletion_retention_functions.sql`
14. `*_pilot_create_export_functions.sql`
15. `*_pilot_create_storage_bucket_policies.sql`
16. `*_pilot_enable_realtime.sql`
17. `*_pilot_seed_initial_program_config.sql` — only after user approves programme details.

No production table may be altered unless a documented compatibility requirement is approved separately.

### Rollback

- `supabase/manual-migrations/pilot-mode/rollback_pilot_mode.sql`
- `supabase/manual-migrations/pilot-mode/README.md`

The rollback file must not be executed automatically.

---

## 9. Phase 5 Edge Function files

- `supabase/functions/pilot-create-session/index.ts`
- `supabase/functions/pilot-submit-report/index.ts`
- `supabase/functions/pilot-transition-status/index.ts`
- `supabase/functions/pilot-create-notification/index.ts`
- `supabase/functions/pilot-delete-report/index.ts`
- `supabase/functions/pilot-delete-session/index.ts`
- `supabase/functions/pilot-purge-data/index.ts`
- `supabase/functions/pilot-export-results/index.ts`

Shared function modules may be added under:

```text
supabase/functions/_shared/pilot/
```

Expected shared modules:

- `auth.ts`
- `cors.ts`
- `roles.ts`
- `campus.ts`
- `responses.ts`
- `validation.ts`
- `audit.ts`

No service-role secret may be exposed to browser code.

---

## 10. Test files

### Unit/component tests

Expected location:

```text
src/**/*.test.ts
src/**/*.test.tsx
```

Priority tests:

- feature flag and route guard;
- role redirect allowlist;
- pilot query-key isolation;
- allowed report transitions;
- file validation;
- location tracking storage-key isolation;
- warning visibility;
- status labels;
- export redaction.

### End-to-end tests

Expected location:

```text
e2e/pilot/
```

Priority journeys:

- authorised student completes pilot;
- unauthorised student denied;
- security user sees own campus only;
- super admin sees all campuses;
- emergency simulation creates no production incident;
- pilot upload uses private pilot bucket;
- pilot notifications do not invoke production push;
- deletion cascades and removes Storage object;
- disabled feature flag blocks routes.

Test framework selection will be documented before Phase 6 if none exists.

---

## 11. Documentation additions in later phases

- `03-database-implementation.md`
- `03a-sql-execution-order.md`
- `03b-rollback-guide.md`
- `PHASE-3-COMPLETE.md`
- `04-frontend-implementation.md`
- `PHASE-4-COMPLETE.md`
- `05-edge-functions.md`
- `PHASE-5-COMPLETE.md`
- `06-qa-security-report.md`
- `06a-preview-test-script.md`
- `PHASE-6-COMPLETE.md`
- `07-final-delivery-register.md`
- `PHASE-7-COMPLETE.md`

---

## 12. Forbidden changes

Phases 3–5 must not:

- merge the feature branch into `main`;
- change existing branding or colour tokens;
- replace production incident tables;
- add an `is_pilot` column to `incidents`;
- store pilot files in `incident-media`;
- call production push notification functions;
- reuse `emergency_tracking` local storage;
- expose service-role keys;
- make pilot buckets public;
- silently enable Pilot Mode in production.
