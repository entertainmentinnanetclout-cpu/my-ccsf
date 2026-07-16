# CCSF / CPS Controlled Pilot Mode — Phase Tracker

## Working branch

`feature/controlled-pilot-mode`

## Tracking issue

GitHub Issue #4: **Controlled Pilot Mode — phased implementation tracker**

## Delivery principle

The Pilot Mode will reuse the existing application structure and user experience while keeping all pilot data, pilot actions, pilot analytics and simulated responses isolated from production operations.

No phase may modify production Supabase data automatically. SQL migrations and Edge Functions must be generated as reviewable files for manual execution and deployment.

---

## Phase 0 — Governance and isolation

**Status: COMPLETE**

- [x] Confirm repository access
- [x] Confirm administrator-level repository permissions
- [x] Create `feature/controlled-pilot-mode`
- [x] Confirm default branch remains `main`
- [x] Create permanent GitHub phase tracker
- [x] Confirm direct production incident writes exist
- [x] Confirm production attachment storage flow exists
- [x] Establish no-direct-main rule

### Phase 0 evidence

- Repository: `entertainmentinnanetclout-cpu/my-ccsf`
- Branch: `feature/controlled-pilot-mode`
- Tracking issue: `#4`
- Existing report component writes to `incidents`
- Existing attachments use `incident-media` and `incident_media`

---

## Phase 1 — Full codebase audit

**Status: IN PROGRESS**

- [x] Confirm application stack
- [x] Confirm route framework and protected-route structure
- [x] Confirm current role names
- [x] Confirm Supabase client location
- [x] Trace standard incident submission
- [x] Trace emergency alert submission
- [x] Trace live-location writes
- [x] Inspect campus-admin portal structure
- [x] Inspect super-admin portal structure
- [ ] Complete route inventory
- [ ] Complete database read/write inventory
- [ ] Complete storage inventory
- [ ] Complete Realtime inventory
- [ ] Complete Edge Function inventory
- [ ] Complete notification flow inventory
- [ ] Complete case-status lifecycle
- [ ] Complete data-deletion inventory
- [ ] Complete security risk register
- [ ] Publish final `01-codebase-audit.md`

### Phase 1 exit criteria

Phase 1 is complete only when every production table, storage bucket, Edge Function, role gate, route, live-location flow and incident workflow used by the app has been documented.

---

## Phase 2 — Architecture and implementation plan

**Status: NOT STARTED**

- [ ] Confirm final pilot-table architecture
- [ ] Confirm Pilot Mode entry routes
- [ ] Define central Pilot Mode context/provider
- [ ] Define production and pilot service separation
- [ ] Define student pilot journey
- [ ] Define campus pilot dashboard
- [ ] Define super-admin pilot dashboard
- [ ] Define pilot analytics
- [ ] Define deletion and retention model
- [ ] Define manual Supabase setup sequence
- [ ] Define rollback strategy

### Phase 2 exit criteria

A written implementation plan must identify exact files to add, files to modify, SQL files to generate, roles permitted, and production-isolation controls.

---

## Phase 3 — Database and SQL package

**Status: NOT STARTED**

- [ ] Pilot enums
- [ ] Pilot sessions
- [ ] Pilot reports
- [ ] Pilot report events
- [ ] Pilot attachments
- [ ] Pilot feedback
- [ ] Pilot notifications
- [ ] Pilot feature tests
- [ ] Pilot audit logs
- [ ] Indexes
- [ ] RLS policies
- [ ] Storage bucket policies
- [ ] Delete-report RPC
- [ ] Delete-session RPC
- [ ] Retention purge RPC
- [ ] Campus/date purge RPC
- [ ] Rollback SQL

### Phase 3 exit criteria

All SQL must exist as manually executable files. No SQL may be run automatically against the external Supabase project.

---

## Phase 4 — Application implementation

**Status: NOT STARTED**

- [ ] Pilot Mode provider
- [ ] Pilot route entry
- [ ] Pilot warning banner
- [ ] Pilot consent screen
- [ ] Pilot session creation
- [ ] Controlled test scenarios
- [ ] Pilot report submission
- [ ] Pilot location testing
- [ ] Pilot attachment testing
- [ ] Pilot status tracking
- [ ] Pilot in-app notifications
- [ ] Safety PDF resources
- [ ] Pilot feedback
- [ ] Campus pilot dashboard
- [ ] Super-admin pilot dashboard
- [ ] Deletion controls
- [ ] CSV export

### Phase 4 exit criteria

Pilot Mode must function without writing to production incident, location, media, notification or escalation tables.

---

## Phase 5 — Pilot-only Edge Functions

**Status: NOT STARTED**

- [ ] Create session
- [ ] Submit report
- [ ] Update simulation status
- [ ] Create pilot notification
- [ ] Delete report
- [ ] Delete session
- [ ] Purge expired data
- [ ] Export pilot results
- [ ] Write deployment guide

### Phase 5 exit criteria

All functions must be pilot-only, undeployed, documented and incapable of invoking real dispatch or production notification integrations.

---

## Phase 6 — QA and security validation

**Status: NOT STARTED**

- [ ] Production isolation tests
- [ ] Student ownership tests
- [ ] Campus-scope tests
- [ ] Super-admin tests
- [ ] Retention and deletion tests
- [ ] Location permission tests
- [ ] Attachment limit tests
- [ ] PDF download tracking tests
- [ ] No-real-dispatch tests
- [ ] Mobile usability tests
- [ ] Lint
- [ ] Type check
- [ ] Build
- [ ] Security review

### Phase 6 exit criteria

The production application must still build and behave as before. Pilot Mode must remain isolated and all destructive operations must be role-checked and auditable.

---

## Phase 7 — Delivery and approval

**Status: NOT STARTED**

- [ ] Final changed-file register
- [ ] SQL execution order
- [ ] Edge Function deployment order
- [ ] Environment-variable register
- [ ] Manual QA checklist
- [ ] Known-limitations register
- [ ] Rollback guide
- [ ] Draft pull request
- [ ] Review corrections
- [ ] Merge approval

---

## Non-negotiable controls

1. Do not commit implementation directly to `main`.
2. Do not execute Supabase SQL automatically.
3. Do not deploy Edge Functions automatically.
4. Do not write Pilot Mode data to production incident tables.
5. Do not trigger live CPS, SAPS, ambulance, SMS, email or push dispatch from Pilot Mode.
6. Do not redesign the existing application.
7. Do not replace current branding, colours, typography or navigation.
8. Keep every phase documented, reviewable and reversible.
9. Record missed deliverables with cause, impact and recovery action.
10. Do not duplicate existing components, tables or services where safe reuse is possible.
