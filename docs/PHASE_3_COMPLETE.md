# CCSF Phase 3 Completion Record

**Completed:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Draft pull request:** #27  
**Production release state:** blocked until Phase 8

## Outcome

Phase 3 is complete on the shared Phases 3–8 release-candidate branch. The controlled Pilot can activate automatically only when Vercel builds the exact approved Preview branch. Production, `main`, and unrelated Preview branches remain fail-closed unless a separate explicit authorisation flag is supplied.

No Phase 3 commit has been merged into `main`, and no production deployment has been created from this branch.

## Implemented controls

- Removed broad `git-fea-*` hostname-based Pilot activation.
- Restricted automatic activation to Vercel Preview builds whose Git branch is exactly `feature/ccsf-phases-3-8-release-candidate`.
- Retained the explicit `VITE_PILOT_MODE_ENABLED=true` authorisation path for controlled future operations.
- Centralised student, campus-security and super-admin Pilot route rules.
- Preserved direct route pathname, query parameters and hash fragments through authentication.
- Rejected external URLs, protocol-relative URLs, malformed paths, unknown Pilot paths and cross-role destinations.
- Redirected authenticated users to their role-appropriate Pilot workspace.
- Preserved and revalidated a student Pilot destination when profile completion interrupts login.
- Retained permanent no-dispatch warnings on Pilot authentication and authenticated Pilot layouts.
- Added permanent automated regression tests for activation, deep links, role destinations and profile-completion resumption.
- Added CI builds for both fail-closed production configuration and the exact approved Pilot Preview configuration.

## Validation evidence

### Application and build gate

GitHub Actions run **#365** passed:

- dependency installation;
- Pilot production-isolation verification;
- Phase 3 activation and routing verification;
- canonical CCSF/TUT branding verification;
- production/Pilot student-home parity verification;
- TypeScript type-check;
- ESLint;
- fail-closed production build;
- approved Pilot Preview build.

### Live Supabase role and data-boundary matrix

Thirty-one rollback-safe assertions passed across:

- participant consent ownership;
- student session and report ownership;
- cross-student and cross-campus denial paths;
- location capture;
- evidence metadata;
- object-level private Storage access;
- report lifecycle transitions;
- Pilot notifications;
- campus-scoped and identified exports;
- retention and cleanup planning;
- service-only finalisers;
- storage-first cleanup refusal;
- no-orphan relational cleanup after Storage is clear.

All test transactions were rolled back. The final live baseline confirmed:

- zero Pilot reports;
- zero Pilot attachment metadata rows;
- zero objects in `pilot-report-attachments`;
- zero Phase 3 fixture sessions or reports;
- test participants restored to `invited`;
- the approved programme campus scope still contains all ten configured campuses.

## Release hold

PR #27 must remain draft and unmerged. The release-candidate branch will carry Phases 4–8. Production merge and publication require completion of Phase 8 and explicit final approval.
