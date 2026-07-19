# CCSF Phase 8 — Rollback and Release-Control Package

**Prepared:** 19 July 2026  
**Release-candidate branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — must remain draft and unmerged until explicit approval  
**Production publication:** not authorised

## Release boundary

Phase 8 completes verification of the release candidate. It does not itself authorise a merge, production promotion, Pilot activation on production, or external emergency dispatch.

The following actions require separate explicit approval:

1. merge PR #27 into `main`;
2. promote a verified deployment to the production domain;
3. enable Controlled Pilot Mode in a production environment, if required;
4. enable any external emergency-service integration or dispatch workflow.

External emergency dispatch remains outside this release candidate.

## Git rollback points

- Approved `main` baseline: `c4c13b9ddb7ce4ad1b1556e1d1f8b4a59dd5a7ff`.
- Phase 7 release-candidate head before Phase 8: `da4a6386f16c097a237f4ebc676f18953b91db11`.
- Phase 8 is implemented only on `feature/ccsf-phases-3-8-release-candidate`.

Before merge, rollback is performed by reverting Phase 8 commits on the release-candidate branch or resetting the branch to the Phase 7 head. Do not rewrite `main`.

After an approved merge, rollback must use a normal revert pull request. Do not force-push or delete production history.

## Vercel rollback

- Do not promote the Phase 8 Preview deployment automatically.
- The release-candidate branch alias remains a protected Preview environment.
- If a Preview regression is found, restore or redeploy the last verified Phase 7 commit `da4a6386f16c097a237f4ebc676f18953b91db11`.
- If a production deployment is later approved and must be reversed, use Vercel deployment rollback or promote the immediately preceding verified production deployment.
- Confirm the production environment retains `VITE_PILOT_MODE_ENABLED=false` unless a separate production Pilot approval is issued.

## PWA rollback

The current service worker uses controlled cache replacement and an explicit update-ready prompt.

For any PWA rollback:

1. publish a new cache version; never restore a previously used cache namespace;
2. retain stale-cache deletion during activation;
3. retain network-first navigation and the offline application shell;
4. retain explicit `SKIP_WAITING` user activation rather than forced refresh behavior;
5. verify the manifest, standard icon, maskable icon, favicon and Apple touch icon after rollback.

Do not restore the legacy red PWA identity, remote splash media, fabricated splash statistics or automatic startup audio.

## Supabase rollback

Phase 8 introduces one isolated Pilot migration:

- `20260719211500_phase_8_authenticated_assignment_parity.sql`

It changes only `pilot_private.transition_report` so:

- campus-security staff can accept a same-campus Pilot report using their authenticated profile;
- a super-admin can accept Pilot triage ownership only using their own authenticated admin profile;
- campus and cross-role restrictions remain enforced;
- production incident and dispatch functions remain untouched.

Database rollback, if required, must be delivered as a new forward migration restoring the prior function definition. Never delete or edit an already-applied migration.

Phase 8 UAT fixtures were created inside database transactions and rolled back. The post-test residue check confirmed zero Pilot sessions, reports, evidence metadata, location events, notifications, report events, feature tests, feedback or audit records from the fixtures.

If unexpected Pilot records appear later:

1. identify the exact Pilot programme, session and report IDs;
2. remove private Storage objects first through the controlled Pilot cleanup workflow;
3. use the governed report, session, campus or programme cleanup functions;
4. retain audit evidence and the stated cleanup reason;
5. never delete production `incidents`, `notifications`, `case_updates` or production evidence as part of a Pilot rollback.

## Branding rollback boundary

No colour redesign is authorised. A rollback must preserve:

- the supplied transparent CCSF logo as the canonical CCSF identity;
- separate TUT light-mode and dark-mode logos;
- the approved CCSF-first/TUT-partnership hierarchy;
- institutional navy and gold usage;
- the existing app icons and transparent asset requirements.

## Emergency and production isolation

At every rollback stage:

- Pilot routes remain isolated from production incident tables;
- Pilot notifications remain in `pilot_notifications`;
- Pilot evidence remains in the private `pilot-report-attachments` bucket;
- no CPS, SAPS, ambulance, security personnel or external emergency service is contacted;
- no real emergency dispatch is implied by a successful Pilot workflow.

## Approval record

Final release status after Phase 8 is **READY FOR EXPLICIT APPROVAL** only when all automated checks, Preview smoke checks, live rollback matrices and adviser reviews are green.

Approval must name the authorised action. Approval to merge is not automatically approval to publish, enable production Pilot Mode or enable dispatch.
