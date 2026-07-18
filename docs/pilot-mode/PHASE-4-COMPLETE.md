# Phase 4 Complete — Controlled Pilot Application

## Completion status

**COMPLETE — 18 July 2026**

## Completion result

The Controlled Pilot Mode browser application is implemented on `feature/controlled-pilot-mode` and deployed through Vercel Preview. It uses the isolated Phase 3 backend and does not replace or modify production incident workflows.

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

## Feature-flag control

Pilot Mode fails closed by default.

It is enabled automatically only when:

- Vercel environment is `preview`; and
- Git branch is exactly `feature/controlled-pilot-mode`.

An explicit `VITE_PILOT_MODE_ENABLED` value may override this for an approved deployment. Production and unrelated preview branches remain disabled.

## Student journey delivered

- allowlist and programme eligibility check;
- profile and campus validation;
- persistent no-real-dispatch warning;
- versioned consent;
- create and resume Pilot sessions;
- controlled scenario execution;
- standard report simulation;
- dedicated emergency-button simulation;
- explicit emergency-simulation confirmation;
- Pilot-only location capture;
- Pilot-only live tracking under `pilot_location_tracking`;
- private attachment upload;
- server-generated Pilot references;
- simulated status timeline;
- Pilot-only Realtime updates;
- Pilot-only in-app notifications;
- private signed attachment links;
- printable safety resources and Print / Save as PDF;
- feature-test result capture;
- feedback and session completion;
- participant withdrawal.

## Campus dashboard delivered

- campus-scoped overview KPIs;
- simulated report queue;
- approved report transitions;
- Pilot timeline notes;
- Pilot-only notifications;
- scoped participant cohort review;
- feature results;
- feedback results;
- de-identified JSON and CSV exports;
- report deletion planning;
- campus purge planning subject to campus-head or super-admin authority.

All campus operations remain protected by Phase 3 RLS. Programme configuration and participant insertion remain super-admin-authorised operations.

## Super-admin dashboard delivered

- cross-campus Pilot metrics;
- programme creation and lifecycle controls;
- eligible-campus configuration;
- scenario configuration;
- participant invitation;
- all authorised Pilot reports;
- report transitions, notes and notifications;
- feature analytics;
- feedback review;
- de-identified and identified JSON export;
- de-identified CSV export;
- retention planning;
- programme purge planning;
- Pilot audit log.

## Production isolation

Pilot application services reference only:

- `pilot_*` tables;
- public `pilot_*` RPCs;
- `pilot-report-attachments`;
- existing `profiles` for authorised participant lookup.

Repository searches found no Pilot service reference to production `incidents` or `send-push-notification`.

The following production components were deliberately not refactored:

- `ReportIncident`;
- `EmergencyReport`;
- production `useLocationTracking`.

This avoids regression risk and preserves the approved production behaviour.

## Build and preview verification

- GitHub dependency installation: passed.
- Vite production build: passed.
- Vercel Preview deployment for commit `9a3b6d38196a0f20153c88857897b2706f7e06dc`: `READY`.
- Vercel build completed successfully.
- Remaining build output contains only existing Browserslist, mixed-import and large-chunk warnings.

## Phase 5 boundary

Phase 4 exposes deletion and purge plans. It does not grant broad browser Storage deletion rights.

Phase 5 remains responsible for JWT-verified service functions that:

1. remove private Pilot Storage objects;
2. verify Storage cleanup;
3. finalise relational deletion;
4. record the audited result;
5. perform server-controlled submission, transition, notification and export workflows where required.

## Evidence

- `04-application-implementation.md`
- `src/config/pilot.ts`
- `src/contexts/PilotModeContext.tsx`
- `src/components/pilot/PilotRouteGuard.tsx`
- `src/services/pilot/pilotCoreService.ts`
- `src/services/pilot/pilotAdminService.ts`
- `src/hooks/pilot/usePilotLocationTracking.ts`
- `src/pages/pilot/`
- `src/components/pilot/`
- GitHub Actions run `29630113577`
- Vercel deployment `dpl_4a8pmsyHJAHMAJyesXPtCj5f1zim`

## Merge control

Phase 4 completion does not authorise a merge to `main`. Pull Request #5 remains draft until Phases 5–7, complete QA, Vercel Preview user testing and final user approval are complete.