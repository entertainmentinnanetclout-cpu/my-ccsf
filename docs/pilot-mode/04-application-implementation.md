# Phase 4 — Controlled Pilot Application Implementation

## Status

**IMPLEMENTED — 18 July 2026**

## Delivery scope

Phase 4 implements the browser application for the isolated Phase 3 Pilot backend. The production incident pages, production emergency component, production location hook, production notifications and production analytics remain unchanged.

## Feature-flag boundary

Pilot Mode is fail-closed.

```text
VITE_PILOT_MODE_ENABLED=false
```

The Vite configuration enables the flag automatically only when both conditions are true:

1. `VERCEL_ENV=preview`; and
2. `VERCEL_GIT_COMMIT_REF=feature/controlled-pilot-mode`.

An explicit `VITE_PILOT_MODE_ENABLED` value takes precedence. Production and unrelated preview branches therefore remain disabled.

## Routes delivered

### Student

- `/pilot`
- `/pilot/session/:sessionId`
- `/pilot/report/:reportId`
- `/pilot/resources`

### Campus staff

- `/security/pilot`

### Super admin

- `/admin/pilot`

The existing role-aware navigation menu displays one Controlled Pilot Mode entry when the feature flag is enabled.

## Access controls

`PilotRouteGuard` validates:

- feature flag;
- authentication;
- approved route role;
- student profile completion;
- participant allowlist;
- active or reviewable programme state;
- participant campus eligibility;
- staff campus assignment.

`AuthContext` permits only the explicitly approved Pilot route families for each role. It does not use a generic string-based bypass.

## Student journey delivered

1. Pilot eligibility and programme display.
2. Persistent no-real-dispatch warning.
3. Versioned participant consent.
4. Create or resume a Pilot session.
5. Load configured Pilot scenarios.
6. Standard simulated report submission.
7. Dedicated emergency-button simulation confirmation.
8. Pilot-only location permission and coordinate capture.
9. Pilot-only live tracking under `pilot_location_tracking`.
10. Private Pilot attachment upload.
11. Server-generated Pilot reference display.
12. Simulated status sequence and Realtime timeline.
13. Pilot-only in-app notifications and read state.
14. Private signed attachment access.
15. Printable safety resources with Print / Save as PDF.
16. Feature-result tracking.
17. Usability, confidence and clarity feedback.
18. Session completion and participant withdrawal.

## Campus dashboard delivered

The campus route uses the profile campus and Supabase RLS. It provides:

- Pilot overview KPIs;
- simulated report queue;
- approved report transitions;
- Pilot timeline notes;
- Pilot-only participant notifications;
- participant search and invitation within scope;
- feature-test results;
- feedback results;
- de-identified export;
- report deletion planning;
- campus purge planning for authorised campus heads.

## Super-admin dashboard delivered

The super-admin route provides:

- cross-campus Pilot KPIs;
- programme creation and lifecycle controls;
- eligible-campus configuration;
- scenario creation and feature requirements;
- participant search and invitation;
- all authorised Pilot reports;
- simulated report transitions;
- feature analytics;
- feedback review;
- de-identified and identified export;
- retention calculation;
- programme purge planning;
- Pilot audit log.

## Service isolation

Pilot browser operations are consolidated into:

- `src/services/pilot/pilotCoreService.ts`
- `src/services/pilot/pilotAdminService.ts`
- `src/services/pilot/pilotQueryKeys.ts`

These services reference only:

- `pilot_*` tables;
- the `pilot-report-attachments` bucket;
- public `pilot_*` RPCs;
- existing `profiles` for authorised participant search.

They do not reference production incident tables, the production incident bucket or production dispatch functions.

## Deliberate implementation consolidations

The Phase 2 file register listed many thin service and dashboard files. Phase 4 consolidates them to avoid duplicated components and duplicated queries:

- one core student service instead of separate one-function service files;
- one administrative service for programme, report, export and deletion-plan operations;
- one shared administrative workspace with RLS-controlled campus or super-admin scope;
- one report form configured by scenario type rather than separate duplicate standard and emergency forms;
- one role-aware navigation entry rather than separately modifying three portal navigation systems.

These consolidations do not change the approved data, route, role or safety boundaries.

## Deferred to Phase 5

When a deletion or purge plan contains private Storage paths, Phase 4 displays the exact `storage_cleanup_required` plan. Phase 5 service-role Edge Functions remain responsible for:

1. deleting the private Storage objects;
2. verifying deletion;
3. finalising relational deletion;
4. writing the audit result.

The browser is not granted broad private Storage deletion rights.

## Production preservation

Phase 4 does not refactor `ReportIncident` or `EmergencyReport`. The approved register allowed this deferral where extraction could create production regression risk. Pilot presentation is implemented separately and production behaviour remains intact.