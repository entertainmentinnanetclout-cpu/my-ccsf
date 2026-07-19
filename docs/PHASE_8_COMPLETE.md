# CCSF Phase 8 — End-to-End UAT and Release Gate Complete

**Completion date:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — draft and unmerged  
**Release decision:** **READY FOR EXPLICIT APPROVAL**  
**Production publication:** not authorised

Phase 8 completes the implementation and verification scope of the authoritative release plan. It does not merge or publish the release candidate.

## Exact parity result

Official and Controlled Pilot workflows now match at the required institutional and operational level while remaining data-isolated:

- student reporting, evidence, location, cases, notifications and support;
- campus-security queue, assessment, authenticated assignment, response progression, notes, communications and analytics;
- super-admin cross-campus operations, programmes, participants, analytics, governance, exports and audit;
- official and Pilot authentication, light/dark branding, responsive navigation, splash, PWA metadata and cache replacement;
- permanent no-production and no-dispatch boundaries.

Phase 8 corrected the final identified mismatch: campus assignment no longer asks staff to paste a profile UUID. Assignment uses the authenticated staff profile. The Pilot transition function now supports same-campus security self-assignment and acting-super-admin self-assignment without weakening cross-campus restrictions.

## End-to-end UAT

Rollback-only live matrices passed:

- student consent, session creation and report submission;
- generated Pilot reference, initial timeline event and receipt notification;
- initial and live location capture;
- valid private evidence metadata, invalid-path denial and three-file enforcement;
- student ownership, cross-user denial, same-campus access and cross-campus denial;
- `received → assessing → assigned → in_progress → simulation_completed`;
- authenticated campus and super-admin assignment;
- timeline notes, notifications and read receipts;
- campus de-identified export and restricted export denial;
- super-admin de-identified and identified exports with audit records;
- feature analytics, feedback and production-table isolation.

Detailed evidence is recorded in `docs/PHASE_8_UAT_EVIDENCE.md`.

## Supabase verification

Verified live:

- Pilot RLS, ownership and campus access controls;
- legal lifecycle transitions;
- private evidence bucket, canonical paths, 10 MB limit and approved MIME types;
- Realtime publication for sessions, reports, report events and notifications;
- active JWT-protected Pilot Edge Functions;
- governed exports, retention and cleanup controls;
- zero persistent Phase 8 fixture residue after rollback.

Applied and ledger-reconciled migration:

- `20260719213542_phase_8_authenticated_assignment_parity.sql`

The migration changes only isolated Pilot assignment authority. It does not modify production case or dispatch functions.

The final security adviser state contains only the existing project-level warning that leaked-password protection is disabled. No Phase 8 RLS, function, Storage or policy finding was introduced. Performance adviser results are informational unused-index notices and are not release blockers.

## Accessibility, responsive and PWA verification

The final gate covers keyboard semantics, labelled loading and error states, mobile safe areas, complete mobile navigation, responsive structures, reduced-motion behavior, canonical CCSF/TUT light-dark branding, institutional dark mode, navy `en-ZA` PWA metadata, native icons, controlled service-worker updates and role-aware routes.

## Automated and Preview verification

Implementation head `cf6c0b9465529ee6dcfbdc2b552f0913dd102253` passed GitHub Actions run **#587**:

- strict dependency installation;
- Pilot production isolation;
- Phase 3 route activation;
- core product hardening;
- Phase 4 Student and Phase 5 Campus-Security parity;
- Phase 6 Super-Admin parity;
- Phase 7 authentication, PWA and institutional consistency;
- Phase 8 end-to-end release gate;
- transparent canonical CCSF/TUT branding;
- official/Pilot student-home parity;
- TypeScript and ESLint;
- fail-closed production build;
- approved Pilot Preview build.

Vercel Preview deployment `dpl_2eFGJFs8ju1G7NrXaVrbZo1QEqux` reached `READY` for that exact implementation head. The public shell, official `/auth` route and `/pilot/auth` deep link returned the same final institutional SPA build with `en-ZA` metadata, navy theme identity, canonical icons and viewport safe-area support.

No real account passwords were requested or stored. Authenticated student, campus-security and super-admin behaviour was verified through rollback-only live role/RLS matrices, while direct route registration and fail-closed redirect behaviour were enforced by the automated route gates.

## Rollback package

The complete Git, Vercel, PWA, Supabase, branding and emergency-isolation rollback procedure is recorded in `docs/PHASE_8_ROLLBACK_PACKAGE.md`.

## Release control

Phase 8 means the release candidate is technically ready for an explicit decision. It does not authorise merging PR #27, promoting Preview to production, enabling production Pilot Mode, enabling external emergency dispatch or changing the approved colours and logo hierarchy.

Approval to merge, approval to publish and approval to enable production capabilities are separate decisions.
