import fs from 'node:fs';

const trackerPath = 'docs/pilot-mode/00-phase-tracker.md';
let tracker = fs.readFileSync(trackerPath, 'utf8');

const phase5 = `## Phase 5 — Pilot service layer

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

- \`pilot-create-session\`
- \`pilot-submit-report\`
- \`pilot-transition-status\`
- \`pilot-create-notification\`
- \`pilot-delete-report\`

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

- \`pilot-session-cleanup\`
- \`pilot-cleanup\`
- \`pilot-export-results\`

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

- \`05-edge-functions-and-service-finalization.md\`
- \`PHASE-5-COMPLETE.md\`
- \`supabase/manual-migrations/pilot-mode/phase-5/README.md\`
- \`supabase/manual-migrations/pilot-mode/phase-5/00_extract_applied_phase5.sql\`
- \`supabase/manual-migrations/pilot-mode/phase-5/90_verify_phase5.sql\`
- \`supabase/functions/_shared/pilot/\`
- \`supabase/functions/pilot-*/\`
- \`src/services/pilot/pilotEdgeService.ts\`
- updated Pilot browser services and generated types

### Phase 5 exit result

The complete Pilot operational workflow is protected by JWT-authenticated Edge operations, RLS/RPC authority checks, service-only Storage finalisation and audited database completion without invoking production emergency operations.
`;

tracker = tracker.replace(/## Phase 5[\s\S]*?\n---\n\n## Phase 6/, `${phase5}\n---\n\n## Phase 6`);
tracker = tracker.replace(/(## Phase 6 — QA and security validation\n\n)\*\*Status: NOT STARTED\*\*/, '$1**Status: NEXT**');
if (!tracker.includes('COMPLETE WITH DOCUMENTED TRANSPORT CONSOLIDATION')) throw new Error('Phase 5 tracker replacement failed');
fs.writeFileSync(trackerPath, tracker);

const readmePath = 'docs/pilot-mode/README.md';
let readme = fs.readFileSync(readmePath, 'utf8');
if (!readme.includes('`05-edge-functions-and-service-finalization.md`')) {
  readme = readme.replace(
    '17. `PHASE-4-COMPLETE.md` — Phase 4 completion and Phase 5 entry gate.',
    '17. `PHASE-4-COMPLETE.md` — Phase 4 completion and Phase 5 entry gate.\n18. `05-edge-functions-and-service-finalization.md` — Phase 5 Edge, Storage finalisation and transport-deviation record.\n19. `PHASE-5-COMPLETE.md` — Phase 5 completion and Phase 6 entry gate.',
  );
}
readme = readme.replace('- Phase 5: next', '- Phase 5: complete\n- Phase 6: next');
fs.writeFileSync(readmePath, readme);

console.log('Phase 5 documentation synchronized.');
