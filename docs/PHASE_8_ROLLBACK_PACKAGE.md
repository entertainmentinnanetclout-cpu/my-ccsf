# CCSF Phase 8 — Rollback and Release-Control Package

**Prepared:** 19 July 2026  
**Branch:** `feature/ccsf-phases-3-8-release-candidate`  
**Pull request:** #27 — draft and unmerged  
**Production publication:** not authorised

## Approval boundary

Phase 8 verification does not authorise a merge, production promotion, production Pilot activation or external emergency dispatch. Each action requires separate explicit approval.

Final release status is **READY FOR EXPLICIT APPROVAL**. Approval to merge is not automatically approval to publish, enable production Pilot Mode or enable dispatch.

## Git rollback

- `main` baseline: `c4c13b9ddb7ce4ad1b1556e1d1f8b4a59dd5a7ff`.
- Phase 7 release-candidate head before Phase 8: `da4a6386f16c097a237f4ebc676f18953b91db11`.
- Before merge, revert Phase 8 commits or restore the Phase 7 head on the release-candidate branch.
- After an approved merge, use a normal revert pull request. Do not rewrite `main` history.

## Vercel rollback

- Keep the Phase 8 deployment in protected Preview until approval.
- Restore or redeploy the Phase 7 head if Preview regression is found.
- If an approved production deployment is later reversed, use Vercel rollback or promote the preceding verified production deployment.
- Production must retain `VITE_PILOT_MODE_ENABLED=false` unless production Pilot activation is separately approved.

## PWA rollback

A PWA rollback must use a new cache version and retain stale-cache removal, network-first navigation, the offline application shell and explicit `SKIP_WAITING` activation. Verify the manifest, app icons, maskable icon, favicon and Apple touch icon.

Do not restore legacy red metadata, remote splash media, fabricated splash statistics or automatic startup audio.

## Supabase rollback

Phase 8 applies the isolated Pilot migration:

- `20260719213542_phase_8_authenticated_assignment_parity.sql`

It changes only `pilot_private.transition_report` to support authenticated same-campus security ownership and acting-super-admin self-ownership. Campus and role restrictions remain enforced. Production case and dispatch functions are unchanged.

Never delete or edit an already-applied migration. A database rollback must be a new forward migration restoring the prior function definition.

Phase 8 fixtures were transaction-bound and rolled back. Residue checks confirmed no UAT sessions, reports, evidence metadata, location events, notifications, report events, feature tests, feedback or audit records.

For unexpected Pilot records, identify the exact records, remove private Storage objects first, then use governed Pilot cleanup functions with an audit reason. Do not include production `incidents`, `notifications`, `case_updates` or production evidence in Pilot cleanup.

## Branding boundary

No colour redesign is authorised. Preserve the supplied transparent CCSF logo, separate TUT light/dark logos, the CCSF-first/TUT-partnership hierarchy, institutional navy/gold usage and approved app icons.

## Operational isolation

Pilot routes, records, notifications and evidence remain isolated. No CPS, SAPS, ambulance, security personnel or external emergency service is contacted by Controlled Pilot workflows.
