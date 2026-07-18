# CCSF / CPS Controlled Pilot Mode — Phase Tracker

## Working branch

`feature/controlled-pilot-mode`

## Tracking

- GitHub Issue #4 — Controlled Pilot Mode phased implementation tracker
- Draft Pull Request #5 — branch review checkpoint
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

## Phase 5 — Pilot-only Edge Functions

**Status: NEXT**

- [ ] Create session
- [ ] Submit report
- [ ] Transition simulation status
- [ ] Create pilot notification
- [ ] Delete report
- [ ] Delete session
- [ ] Purge expired data
- [ ] Export pilot results
- [ ] Complete storage-first relational deletion finalisation
- [ ] Deployment guide

### Phase 5 exit criteria

Every function must be JWT-verified, role/campus validated, pilot-only and incapable of invoking production dispatch or notification integrations.

---

## Phase 6 — QA and security validation

**Status: NOT STARTED**

- [ ] Production isolation tests
- [ ] Student ownership tests
- [ ] Campus-scope tests
- [ ] Super-admin tests
- [ ] Retention and deletion tests
- [ ] Location permission and tracking tests
- [ ] Attachment and signed-URL tests
- [ ] PDF download tracking tests
- [ ] No-real-dispatch tests
- [ ] Mobile/browser usability tests
- [ ] Lint and type checks
- [ ] Production build
- [ ] Supabase security/performance advisers
- [ ] Vercel Preview user testing

---

## Phase 7 — Delivery and approval

**Status: NOT STARTED**

- [ ] Final changed-file register
- [ ] SQL and Edge Function deployment register
- [ ] Environment-variable register
- [ ] QA evidence
- [ ] Known limitations
- [ ] Rollback guide
- [ ] Final pull-request review
- [ ] User approval
- [ ] User-controlled merge to `main`
- [ ] Production Pilot Mode enablement decision

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