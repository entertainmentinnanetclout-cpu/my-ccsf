# CCSF Finalisation and Release Plan

Last audited: 19 July 2026  
Canonical codebase: `entertainmentinnanetclout-cpu/my-ccsf`  
Production Supabase project: `MY CCSF` (`lfelzsubrlqwcsnetpov`)  
Execution branch: `finalize/ccsf-release-readiness`

## Non-negotiable release rules

1. `main` is the only production source of truth.
2. No stale branch is merged wholesale. Unique changes must be proven, isolated, reviewed, and cherry-picked into the execution branch.
3. Every phase must pass type-check, lint, production build, Pilot isolation verification, and relevant end-to-end checks.
4. Production migrations are forward-only. Already-applied migrations must not be rerun.
5. Pilot Mode must remain fail-closed outside explicitly approved environments.
6. No release may claim canonical CCSF branding until the complete approved asset package is present and verified.

## Audit baseline

- Open pull requests: **0**
- Current `main`: `3d2ddc37402e01fb7b0176b22ec0956367c34f3f`
- Supabase migration drift: **Resolved** — branch action reports all migrations up to date; status `FUNCTIONS_DEPLOYED`, preview `ACTIVE_HEALTHY`
- Failure reason: production migration versions exist remotely but are absent from `supabase/migrations`
- Security adviser: leaked-password protection disabled (warning)
- Performance adviser: informational unused-index notices only; retain until representative Pilot traffic exists
- Canonical branding merge: incomplete; it contains only `.brand-assets/logo.hex.part01`
- Temporary brand-transfer bucket: empty
- Tracked `.env`: removed on the execution branch; `.env.example` remains the safe template

### Branch disposition

| Branch | State against main | Decision |
|---|---:|---|
| `feature/always-on-pilot-workflow` | 0 ahead / 3 behind | Superseded; archive/delete after release |
| `feature/canonical-ccsf-branding` | 0 ahead / 1 behind | Merged but incomplete; archive after asset recovery |
| `feature/ccsf-brand-refresh` | 0 ahead / 2 behind | Empty/superseded; archive/delete |
| `feature/controlled-pilot-mode` | 8 ahead / 20 behind | Do not merge wholesale; confirm commits are duplicated by later Pilot/institutional merges |
| `feature/institutional-portal-refresh` | 7 ahead / 11 behind | Do not merge wholesale; confirm commits are duplicated by the always-on Pilot merge |
| `tut-branding-overhaul-12145946607252857116` | 0 ahead / 205 behind | Historical; archive/delete |
| `tut-redesign-8552725157500776564` | 1 ahead / 211 behind | Historical redesign; do not merge without a file-level design decision |

## Phase 0 — Governance and security baseline

**Status:** Complete — PR checks passed

### Deliverables

- Establish this single finalisation branch from current `main`.
- Stop tracking `.env` and require environment-specific secrets/configuration.
- Replace the generic Lovable README with CCSF operating instructions.
- Record branch disposition and release gates.
- Confirm CI result on this branch.

### Acceptance criteria

- No secret/service-role key is committed.
- `.env` is ignored and `.env.example` is usable.
- CI passes from a clean install.
- No open PR or branch is treated as unreviewed production work.

### Merge gate

Phase 0 PR approved and all required checks green.

## Phase 1 — Migration reconciliation and Supabase health

**Status:** Complete — merged, migrations current, functions deployed, preview healthy

**Depends on:** Phase 0

### Deliverables

- Reconstruct local migration files for every production migration version missing from `supabase/migrations`, using the live migration ledger as the authority.
- Ensure local filenames and remote versions match exactly.
- Verify Edge Function source/config parity for all 11 active functions.
- Re-run branch sync until Supabase reports a healthy migration state.
- Re-run security and performance advisers.
- Decide whether leaked-password protection can be enabled on the active plan; otherwise record formal risk acceptance.

### Acceptance criteria

- Supabase branch status is not `MIGRATIONS_FAILED`.
- Local and remote migration lists reconcile exactly.
- No destructive or duplicate migration is executed.
- All active functions use JWT verification and their repository source matches deployed versions.
- No critical/high security adviser findings.

### Merge gate

Database reconciliation report attached; migration dry run and application QA pass.

## Phase 2 — Canonical CCSF branding

**Depends on:** Phase 0; complete approved asset package

### Deliverables

- Obtain the complete canonical CCSF logo in transparent PNG and SVG/vector form.
- Remove the incomplete hex transfer artifact and temporary transfer mechanism.
- Centralise brand assets and names in one brand module.
- Replace every obsolete TUT-only, interim CCSF, placeholder Lovable, favicon, PWA, metadata, portal-shell, and document reference.
- Preserve TUT references only where they correctly identify the institution/campus context.
- Verify logo proportions, clear space, contrast, responsive scaling, and print/digital usage.

### Acceptance criteria

- Approved owner visually signs off the canonical mark.
- Repository search finds no prohibited legacy branding.
- Browser metadata, PWA icons, login, student, security, admin, Pilot, email/export, and error surfaces use the canonical identity.
- No base64/hex chunk remains as a production asset.

### Merge gate

Brand inventory complete, visual regression review approved, all checks green.

## Phase 3 — Pilot controls and role-safe workflows

**Depends on:** Phases 1–2

### Deliverables

- Make approved deployment enablement explicit; remove hostname-pattern auto-enablement unless formally approved.
- Validate student, campus security/admin, and super-admin route boundaries.
- Verify consent, report lifecycle, realtime updates, evidence upload, notifications, withdrawal, cleanup, export, retention, and audit workflows.
- Confirm every Pilot screen permanently states that no emergency service is dispatched.
- Validate campus isolation and object-level Storage access.

### Acceptance criteria

- Production remains fail-closed by default.
- Cross-campus and cross-role access tests fail safely.
- No external dispatch occurs.
- Every Pilot workflow has a passing happy-path and denial-path test.
- Cleanup leaves no orphaned database or Storage objects.

### Merge gate

Signed Pilot safety checklist, role matrix, and end-to-end evidence.

## Phase 4 — Core CCSF product completion

**Depends on:** Phases 1–3

### Deliverables

- Audit and complete student, security, admin, office, profile, judiciary, incident, chat, notification, carousel, and emergency-contact workflows.
- Remove placeholder content, dead controls, mock-only paths, and silent failures.
- Standardise loading, empty, error, offline, and permission-denied states.
- Complete accessibility and responsive/mobile review.

### Acceptance criteria

- All primary role journeys complete end to end.
- No P0/P1 defects or dead primary controls.
- WCAG-oriented keyboard, focus, label, contrast, and screen-reader checks pass.
- Supported mobile and desktop layouts pass visual verification.

### Merge gate

Role-based regression suite and product-owner UAT signed off.

## Phase 5 — Release hardening and Pilot launch

**Depends on:** Phases 1–4

### Deliverables

- Production environment register and rollback plan.
- Database backup/restore check.
- Monitoring, error logging, analytics, incident-response ownership, and support contacts.
- Pilot participant/campus allowlist, launch window, data-retention schedule, and exit criteria.
- Final release notes and branch cleanup.

### Acceptance criteria

- CI, build, migration, security, visual, accessibility, and UAT gates pass.
- Rollback is documented and rehearsed.
- Pilot owners and escalation contacts are named.
- Deployment is verified at the production URL after release.

### Merge gate

Formal go/no-go approval. Merge by reviewed PR only; tag the release and monitor the launch window.

## Immediate next actions

1. Recover the complete approved logo asset package.
2. Execute the canonical CCSF branding inventory and replacement.
3. Prove whether the three divergent branches contain any unique work worth carrying forward.
4. Continue later phases through controlled, verified PRs.
