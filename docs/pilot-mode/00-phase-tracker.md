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

**Status: COMPLETE**

- [x] Confirm application stack
- [x] Confirm route framework and protected-route structure
- [x] Confirm current role names
- [x] Confirm Supabase client location and environment handling
- [x] Complete route and portal inventory
- [x] Complete generated schema and RPC inventory
- [x] Complete database read/write inventory
- [x] Trace standard incident submission
- [x] Trace emergency alert submission
- [x] Trace live-location writes and resume behaviour
- [x] Trace student case-status workflow
- [x] Trace status, assignment and resolution workflow
- [x] Trace escalation workflow
- [x] Complete notification and push inventory
- [x] Complete Storage bucket inventory
- [x] Complete Realtime channel inventory
- [x] Complete Edge Function inventory
- [x] Inspect campus-admin portal structure
- [x] Inspect super-admin portal structure
- [x] Complete data-deletion inventory
- [x] Inspect repository migrations and representative RLS policies
- [x] Complete security and operational risk register
- [x] Publish final `01-codebase-audit.md`
- [x] Publish `01a-data-interaction-matrix.md`
- [x] Publish `01b-security-risk-register.md`

### Phase 1 conclusion

The production incident system is strongly interconnected through direct writes, Realtime subscriptions, dashboard contexts, status triggers, location tracking, notifications, case updates and escalation records.

**Approved architecture direction:** keep the existing application and Supabase project, but isolate Pilot Mode with separate `pilot_*` tables, a private pilot attachment bucket, separate query keys, separate Realtime channels and server-controlled deletion/retention.

### Phase 1 verification boundary

The repository was fully audited for Pilot Mode dependencies. The live external Supabase configuration was not directly connected, so Phase 2 and Phase 3 must include a manual live policy/schema comparison before SQL execution.

---

## Phase 2 — Architecture and implementation plan

**Status: NEXT**

- [ ] Confirm final pilot-table architecture
- [ ] Confirm Pilot Mode entry routes
- [ ] Define central Pilot Mode context/provider
- [ ] Define production and pilot service separation
- [ ] Define student pilot journey
- [ ] Define campus pilot dashboard
- [ ] Define super-admin pilot dashboard
- [ ] Define pilot analytics
- [ ] Define location simulation architecture
- [ ] Define pilot notification architecture
- [ ] Define deletion and retention model
- [ ] Define manual Supabase verification and setup sequence
- [ ] Define exact file-change register
- [ ] Define rollback strategy

### Phase 2 exit criteria

A written implementation plan must identify exact files to add, exact files to modify, SQL files to generate, roles permitted, campus scope, data retention, deletion flow and production-isolation controls.

---

## Phase 3 — Database and SQL package

**Status: NOT STARTED**

- [ ] Pilot enums
- [ ] Pilot sessions
- [ ] Pilot reports
- [ ] Pilot report events
- [ ] Pilot location events
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
