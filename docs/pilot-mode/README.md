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
9. `02-architecture-and-implementation-plan.md` — approved Pilot Mode architecture.
10. `02a-data-security-and-retention-contract.md` — tables, enums, RLS, Storage, deletion and retention contract.
11. `02b-exact-file-change-register.md` — exact Phase 3–5 repository change register.
12. `PHASE-2-COMPLETE.md` — Phase 2 completion record.
13. `02-PHASE-2-READY.md` — Phase 3 implementation-readiness gate retained under its original repository filename.
14. `03-live-migration-ledger.md` — authoritative Phase 3 migration order and live object register.
15. `03-backend-verification.md` — RLS, Storage, Realtime, grants, RPC and isolation verification.
16. `PHASE-3-COMPLETE.md` — Phase 3 completion and Phase 4 entry gate.
17. `04-application-implementation.md` — routes, services, student journey, dashboards and deployment controls.
18. `PHASE-4-COMPLETE.md` — Phase 4 completion and Phase 5 entry gate.
19. `05-edge-functions-and-service-finalization.md` — Edge delivery, Storage finalisation and transport-consolidation record.
20. `PHASE-5-COMPLETE.md` — Phase 5 completion and Phase 6 entry gate.
21. `06-qa-and-security-validation.md` — Phase 6 QA and authorization evidence.
22. `06a-final-verification-record.md` — final technical verification snapshot.
23. `PHASE-6-COMPLETE.md` — Phase 6 completion record.
24. `07-final-delivery-and-approval.md` — final release decision.
25. `07a-final-changed-file-register.md` — exact pull-request file inventory.
26. `07b-deployment-and-environment-register.md` — deployment and environment controls.
27. `07c-rollback-and-known-limitations.md` — rollback and limitation register.
28. `PHASE-7-COMPLETE.md` — final delivery completion record.

## SQL packages

Phase 3:

```text
supabase/manual-migrations/pilot-mode/phase-3/
```

Phase 5:

```text
supabase/manual-migrations/pilot-mode/phase-5/
```

The packages contain exact applied-SQL extraction, repeatable read-only verification and controlled operational guidance.

## Application and service packages

Phase 4 implements the Preview-only Pilot application, student workflow, dashboards, tracking, private attachments, resources, feedback and exports.

Phase 5 implements JWT-verified Pilot operations, service-only Storage finalisation, audited destructive workflows and documented secure transport consolidation.

## Current status

- Phase 0: complete
- Phase 1: complete
- Phase 1.5: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete
- Phase 5: complete with documented transport consolidation
- Phase 6: complete
- Phase 7: complete; merge and production enablement deferred

## Release control

All implementation remains on `feature/controlled-pilot-mode`. Phase 6 QA and Phase 7 delivery are complete. A separate explicit instruction is still required to merge into `main` or enable Pilot Mode in production.

Pilot Mode must remain isolated from production incident operations.