import fs from 'node:fs';

const trackerPath = 'docs/pilot-mode/00-phase-tracker.md';
const tracker = fs.readFileSync(trackerPath, 'utf8');
const start = tracker.indexOf('## Phase 6 — QA and security validation');
const end = tracker.indexOf('## Phase 7 — Delivery and approval');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Phase 6 or Phase 7 tracker boundary not found.');
}

const phase6 = `## Phase 6 — QA and security validation

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

- \`06-qa-and-security-validation.md\`
- \`PHASE-6-COMPLETE.md\`
- \`scripts/verify-pilot-isolation.mjs\`
- \`supabase/manual-migrations/pilot-mode/phase-6/90_verify_phase6.sql\`
- permanent GitHub Actions QA workflow
- rollback-safe live Supabase authorization suite
- live Supabase structural verification and advisers
- final Vercel Preview verification

### Phase 6 boundary

Automated and transactional technical QA is complete. Authenticated human acceptance across student, campus-officer and super-admin journeys remains the explicit Phase 7 user-approval checkpoint.

---

`;

const next = tracker.slice(0, start) + phase6 + tracker.slice(end);
fs.writeFileSync(trackerPath, next);
console.log('Phase 6 tracker section finalized.');
