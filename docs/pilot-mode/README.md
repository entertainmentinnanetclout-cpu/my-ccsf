# Controlled Pilot Mode Documentation

## Completed foundations

1. `00-phase-tracker.md` — permanent phase and completion tracker.
2. `01-codebase-audit.md` — full repository architecture audit.
3. `01a-data-interaction-matrix.md` — frontend-to-database interaction map.
4. `01b-security-risk-register.md` — identified production and Pilot Mode risks.
5. `PHASE-1-COMPLETE.md` — Phase 1 completion record.
6. `01c-production-sync-remediation.md` — production synchronisation and hardening record.
7. `01d-live-migration-ledger.md` — authoritative live Supabase remediation ledger.
8. `PHASE-1-5-COMPLETE.md` — Phase 1.5 completion record.
9. `02-PHASE-2-READY.md` — Phase 2 entry and isolation gate.
10. `02-architecture-and-implementation-plan.md` — approved Pilot Mode architecture.
11. `02a-data-security-and-retention-contract.md` — tables, enums, RLS, Storage, deletion and retention contract.
12. `02b-exact-file-change-register.md` — exact Phase 3–5 repository change register.
13. `PHASE-2-COMPLETE.md` — Phase 2 completion and Phase 3 entry gate.

## Current status

- Phase 0: complete
- Phase 1: complete
- Phase 1.5: complete
- Phase 2: complete
- Phase 3: next

## Release control

All implementation remains on `feature/controlled-pilot-mode` and will be tested through Vercel Preview. The branch will be merged into `main` only after all phases, final QA and user approval.

Pilot Mode must remain isolated from production incident operations.