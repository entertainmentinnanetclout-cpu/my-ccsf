# CCSF / CPS Controlled Pilot Mode — Phase Tracker

## Working branch

`feature/controlled-pilot-mode`

## Tracking

- GitHub Issue #4 — Controlled Pilot Mode phased implementation tracker
- Pull Request #5 — final review checkpoint
- Vercel Preview — branch testing environment

## Delivery principle

The Pilot Mode will reuse the existing application structure and visual language while keeping all pilot data, actions, analytics and simulated responses isolated from production emergency operations.

The branch will not be merged into `main` until all phases are complete, the Vercel Preview has been tested and the user approves the final merge.

---

## Phase 0 — Governance and isolation

**Status: COMPLETE**

- [x] Confirm repository access and permissions
- [x] Create `feature/controlled-pilot-mode`
- [x] Confirm `main` remains the production branch
- [x] Create permanent phase tracking
- [x] Confirm production incident and attachment write paths
- [x] Establish no-direct-main rule

---

## Phase 1 — Full codebase audit

**Status: COMPLETE**

- [x] Application stack and route inventory
- [x] Authentication and role inventory
- [x] Supabase client and generated schema inventory
- [x] Database read/write matrix
- [x] Student report and emergency workflow traces
- [x] Live-location and resume behaviour
- [x] Case status, assignment, resolution and escalation
- [x] Notification, Storage and Realtime inventory
- [x] Edge Function inventory
- [x] Campus-admin and super-admin portal inventory
- [x] Deletion inventory
- [x] Security risk register
- [x] Publish Phase 1 documentation

### Phase 1 architecture finding

The production incident system is strongly interconnected through direct writes, Realtime subscriptions, status triggers, location tracking, notifications, case updates and escalations.

Approved direction: separate `pilot_*` tables, private pilot Storage, separate query keys, separate Realtime channels and controlled deletion/retention.

---

## Phase 1.5 — Production synchronisation and security remediation

**Status: COMPLETE — 17 July 2026**

- [x] Compare live Supabase with frontend and checked-in types
- [x] Add and secure `app_settings`
- [x] Add and secure `campus_emergency_contacts`
- [x] Add authenticated ownership for anonymous reports
- [x] Harden incident, location and evidence permissions
- [x] Make staff chat media private and use signed URLs
- [x] Remove the unverified hard-coded CPS number
- [x] Move Supabase browser configuration to environment variables
- [x] Synchronise TypeScript types
- [x] Raise staff-password validation to twelve characters
- [x] Correct campus-head/super-admin separation
- [x] Move elevated helpers into the private schema
- [x] Enable JWT verification on privileged Edge Functions
- [x] Remove false push-delivery success
- [x] Consolidate RLS policies and clear RLS performance warnings
- [x] Add missing indexes
- [x] Pass production build verification

### Accepted constraints

- Leaked-password protection is deferred because it requires a qualifying paid Supabase plan.
- VAPID secrets are not configured; Web Push returns `not_configured`.
- Official campus CPS numbers await institutional verification.
- Informational unused-index notices remain until representative traffic exists.

---

## Phase 2 — Architecture and implementation plan

**Status: COMPLETE — 17 July 2026**

- [x] Confirm final pilot-table architecture
- [x] Confirm student, campus-admin and super-admin routes
- [x] Define `PilotModeProvider` and fail-closed feature flag
- [x] Define production/pilot service separation
- [x] Define student pilot journey and no-real-dispatch warnings
- [x] Define campus pilot dashboard
- [x] Define super-admin pilot dashboard
- [x] Define analytics event catalogue
- [x] Define pilot-only location and live-tracking architecture
- [x] Define pilot in-app notification architecture
- [x] Define RLS ownership, role and campus contract
- [x] Define private Storage path and signed-URL contract
- [x] Define deletion, withdrawal, purge and retention model
- [x] Define Edge Function architecture
- [x] Define Vercel Preview and production feature-flag control
- [x] Define exact files to add and modify
- [x] Define SQL migration sequence
- [x] Define rollback and emergency shutdown sequence
- [x] Publish Phase 2 documentation

### Phase 2 approved routes

- `/pilot`
- `/pilot/session/:sessionId`
- `/pilot/report/:reportId`
- `/pilot/resources`
- `/security/pilot`
- `/admin/pilot`

### Phase 2 approved data boundary

Pilot Mode must not write to or invoke:

- `incidents`
- `incident_media`
- `incident_location_updates`
- production `notifications`
- `case_updates`
- `case_escalations`
- `incident-media`
- `send-push-notification`
- production dispatch integrations

### Phase 2 evidence

- `02-architecture-and-implementation-plan.md`
- `02a-data-security-and-retention-contract.md`
- `02b-exact-file-change-register.md`
- `PHASE-2-COMPLETE.md`

---

## Phase 3 — Database and SQL package

**Status: COMPLETE — 17 July 2026**

- [x] Pilot enums
- [x] Pilot programmes and scenarios
- [x] Pilot participants and sessions
- [x] Pilot reports and immutable events
- [x] Pilot location events
- [x] Pilot attachments
- [x] Pilot feedback
- [x] Pilot notifications
- [x] Pilot feature tests
- [x] Pilot audit logs
- [x] Constraints and indexes
- [x] Student RLS policies
- [x] Campus RLS policies
- [x] Super-admin RLS policies
- [x] Private security helpers
- [x] Status-transition functions
- [x] Delete-report and delete-session planning functions
- [x] Withdrawal and retention-purge planning functions
- [x] Campus/program purge planning functions
- [x] De-identified and identified export function
- [x] Private Storage bucket and policies
- [x] Pilot Realtime configuration
- [x] Synchronise checked-in types
- [x] SQL execution ledger
- [x] Read-only verification SQL
- [x] Guarded rollback SQL and guide
- [x] Run final Supabase security adviser
- [x] Run final Supabase performance adviser
- [x] Verify zero production incident foreign keys

### Phase 3 verified state

- 12 isolated Pilot tables, all RLS-enabled
- nine Pilot enums
- 27 Pilot table policies
- two private Storage policies
- 12 public `SECURITY INVOKER` Pilot RPCs
- zero anonymous Pilot table grants
- zero public Pilot `SECURITY DEFINER` functions
- zero Pilot foreign keys to production incident operations
- four Pilot-only Realtime tables
- private 10 MB attachment bucket

### Phase 3 evidence

- `03-live-migration-ledger.md`
- `03-backend-verification.md`
- `PHASE-3-COMPLETE.md`
- `supabase/manual-migrations/pilot-mode/phase-3/README.md`
- `supabase/manual-migrations/pilot-mode/phase-3/00_extract_applied_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/90_verify_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/99_rollback_phase3.sql`

### Phase 3 exit result

The additive pilot backend is live, typed, RLS-protected, Storage-isolated and rollback-documented without modifying production incident operations.

---

## Phase 4 — Application implementation

**Status: COMPLETE — 18 July 2026**

- [x] Pilot feature flag and route guards
- [x] Pilot Mode provider
- [x] Pilot warning and consent
- [x] Controlled scenarios
- [x] Pilot report submission
- [x] Emergency simulation
- [x] Pilot location and attachment tests
- [x] Pilot status tracking
- [x] Pilot in-app notifications
- [x] Printable safety resources and Print / Save as PDF
- [x] Feedback and completion
- [x] Campus pilot dashboard
- [x] Super-admin pilot dashboard
- [x] Deletion and retention planning UI
- [x] JSON and CSV de-identified export UI
- [x] Identified super-admin export UI
- [x] Role-aware Pilot navigation
- [x] Preview-only fail-closed feature activation
- [x] Production build verification
- [x] Vercel Preview deployment verification
- [x] Verify no Pilot service reference to production incidents or push dispatch

### Phase 4 verified state

- six explicit Pilot routes
- authenticated role and participant guards
- Preview-only automatic feature enablement for the approved branch
- production and unrelated previews disabled by default
- student consent, session, report, tracking, resources and feedback journeys
- campus-scoped operations under RLS
- super-admin programme and cross-campus controls
- private signed attachment access
- separate `pilot_location_tracking` browser state
- production `ReportIncident`, `EmergencyReport` and `useLocationTracking` preserved
- GitHub Actions build passed
- Vercel Preview deployment `READY`

### Phase 4 evidence

- `04-application-implementation.md`
- `PHASE-4-COMPLETE.md`
- `src/config/pilot.ts`
- `src/contexts/PilotModeContext.tsx`
- `src/components/pilot/`
- `src/services/pilot/`
- `src/hooks/pilot/usePilotLocationTracking.ts`
- `src/pages/pilot/`
- GitHub Actions run `29630113577`
- Vercel deployment `dpl_4a8pmsyHJAHMAJyesXPtCj5f1zim`

### Phase 4 exit result

The Pilot browser application builds and deploys through Vercel Preview while using only the isolated Pilot data, Storage, Realtime and RPC domain.

---

## Phase 5 — Pilot service layer

**Status: COMPLETE WITH DOCUMENTED TRANSPORT CONSOLIDATION — 18 July 2026**

- [x] JWT-verified session creation
- [x] JWT-verified simulated report submission
- [x] JWT-verified status transition gateway
- [x] JWT-verified Pilot-only in-app update gateway
- [x] JWT-verified report cleanup
- [x] Service-role-only Storage verification
- [x] Report and session relational finalisers
- [x] Campus, programme and retention finalisers
- [x] Session deletion through per-report cleanup and authorised completion
- [x] Campus purge through per-report cleanup and authorised completion
- [x] Programme purge through per-report cleanup and super-admin completion
- [x] Retention purge through per-report cleanup and super-admin completion
- [x] Campus-scoped and super-admin export authority
- [x] Browser service integration
- [x] Synchronise Phase 5 TypeScript definitions
- [x] Migration extraction package
- [x] Read-only verification SQL
- [x] Deployment and deviation guide
- [x] Security and performance advisers
- [x] Production build verification
- [x] Verify zero production incident/escalation references

### Phase 5 functional Edge endpoints

- `pilot-create-session`
- `pilot-submit-report`
- `pilot-transition-status`
- `pilot-create-notification`
- `pilot-delete-report`

All functional endpoints above have platform JWT verification enabled.

### Phase 5 transport consolidation

The deployment connector rejected full whole-session cleanup, bulk-purge and result-export payloads before they reached Supabase. Functional coverage was completed by combining:

- the JWT-verified per-report Storage cleanup endpoint;
- authenticated RLS/RPC session and campus completion;
- authenticated super-admin programme and retention completion wrappers;
- the existing audited export RPC.

This is a documented transport deviation, not a reduction in role, campus, ownership, Storage or audit controls.

### Phase 5 diagnostic-only slugs

The following JWT-protected diagnostic deployments contain no operational data workflow and are not referenced by the application:

- `pilot-session-cleanup`
- `pilot-cleanup`
- `pilot-export-results`

The connected tool exposes no Edge Function deletion action. They are recorded for later CLI/dashboard removal.

### Phase 5 verified state

- service-only finalisers are not executable by authenticated clients
- private Storage guard is service-role-only
- private bucket remains private with the approved size and MIME limits
- programme and retention completion wrappers revalidate super-admin authority
- all destructive paths verify private Storage absence before relational finalisation
- browser code contains no service-role secret
- Pilot function production incident/escalation references: zero
- committed Pilot Edge source production references: zero
- security adviser contains only the accepted paid-plan password warning
- performance adviser contains informational unused-index notices only
- GitHub production build passes

### Phase 5 evidence

- `05-edge-functions-and-service-finalization.md`
- `PHASE-5-COMPLETE.md`
- `supabase/manual-migrations/pilot-mode/phase-5/README.md`
- `supabase/manual-migrations/pilot-mode/phase-5/00_extract_applied_phase5.sql`
- `supabase/manual-migrations/pilot-mode/phase-5/90_verify_phase5.sql`
- `supabase/functions/_shared/pilot/`
- `supabase/functions/pilot-*/`
- `src/services/pilot/pilotEdgeService.ts`
- updated Pilot browser services and generated types

### Phase 5 exit result

The complete Pilot operational workflow is protected by JWT-authenticated Edge operations, RLS/RPC authority checks, service-only Storage finalisation and audited database completion without invoking production emergency operations.

---

## Phase 6 — QA and security validation

**Status: COMPLETE — 18 July 2026**

- [x] Production isolation tests
- [x] Student ownership tests
- [x] Campus-scope tests
- [x] Super-admin tests
- [x] Retention and deletion tests
- [x] Location permission and tracking tests
- [x] Attachment and signed-URL tests
- [x] PDF download tracking tests
- [x] No-real-dispatch tests
- [x] Mobile/browser technical readiness tests
- [x] Lint and type checks
- [x] Production build
- [x] Supabase security/performance advisers
- [x] Vercel Preview technical validation

### Phase 6 verified state

- permanent executable Pilot isolation assertions
- 18 rollback-safe authenticated authorization checks passed
- temporary QA records rolled back with zero fixture residue
- student ownership and session isolation enforced
- campus-staff cross-campus access denied
- super-admin cross-campus authority and identified export verified
- authenticated clients denied service-only finalisers
- 12 Pilot tables remain RLS-enabled
- zero anonymous Pilot table grants
- zero Pilot foreign keys or function references to production emergency workflows
- private 10 MB Pilot attachment bucket with strict path policies
- four Pilot-only Realtime tables
- print/PDF and resource-download feature telemetry verified
- TypeScript, ESLint and production build passed
- security adviser contains only the accepted paid-plan password warning
- performance adviser contains informational unused-index notices only
- Vercel Preview deployment READY with HTTP 200 application shell
- no preview runtime errors and no unresolved Vercel review threads

### Phase 6 evidence

- `06-qa-and-security-validation.md`
- `PHASE-6-COMPLETE.md`
- `scripts/verify-pilot-isolation.mjs`
- `supabase/manual-migrations/pilot-mode/phase-6/90_verify_phase6.sql`
- permanent GitHub Actions QA workflow
- rollback-safe live Supabase authorization suite
- live Supabase structural verification and advisers
- final Vercel Preview verification

### Phase 6 boundary

Automated and transactional technical QA is complete. Authenticated human acceptance across student, campus-officer and super-admin journeys remains the explicit Phase 7 user-approval checkpoint.

---

## Phase 7 — Delivery and approval

**Status: COMPLETE — 18 July 2026**

- [x] Final changed-file register
- [x] SQL and Edge Function deployment register
- [x] Environment-variable register
- [x] QA evidence
- [x] Known limitations
- [x] Rollback guide
- [x] Final pull-request review
- [x] User approval of the Phase 7 delivery package
- [x] Record merge decision: deferred pending separate explicit instruction
- [x] Record production enablement decision: disabled pending separate explicit instruction

### Phase 7 evidence

- `07-final-delivery-and-approval.md`
- `07a-final-changed-file-register.md`
- `07b-deployment-and-environment-register.md`
- `07c-rollback-and-known-limitations.md`
- `PHASE-7-COMPLETE.md`
- Phase 6 QA workflow run `29657590740`
- Pull Request #5 final review checkpoint

### Phase 7 exit result

All delivery, verification, deployment, environment, limitation and rollback records are complete. Pull Request #5 is ready for review but remains unmerged. Production Pilot Mode remains disabled.

---

## Non-negotiable controls

1. Do not merge the implementation branch before user approval.
2. Do not write Pilot Mode data to production incident tables.
3. Do not trigger live CPS, SAPS, ambulance, SMS, email or production push from Pilot Mode.
4. Do not redesign existing branding, colours, typography or navigation.
5. Keep every phase documented, reviewable and reversible.
6. Record deviations with cause, impact and recovery action.
7. Reuse safe presentation components without sharing production data services.
8. Apply database changes only through named, traceable migrations.
9. Keep Pilot Mode disabled in production until explicitly approved.
10. Use Vercel Preview for testing before the final merge.