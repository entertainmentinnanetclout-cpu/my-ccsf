# Phase 7 — Rollback and Known Limitations

## Emergency shutdown

The immediate shutdown control is the frontend feature flag:

```env
VITE_PILOT_MODE_ENABLED=false
```

After changing the variable, redeploy Vercel. Pilot routes must fail closed while production routes remain available.

## Application rollback

1. Keep Pull Request #5 unmerged or revert its merge commit if a later merge is rolled back.
2. Set `VITE_PILOT_MODE_ENABLED=false` in every production environment.
3. Redeploy the last approved production commit.
4. Verify production reporting, emergency reporting and location tracking still use their original services.
5. Run `npm run test:pilot-isolation` and `npm run build` on the rollback target.

## Edge Function rollback

The Pilot application uses these functional slugs:

- `pilot-create-session`
- `pilot-submit-report`
- `pilot-transition-status`
- `pilot-create-notification`
- `pilot-delete-report`

For emergency containment, disable the frontend feature flag first. Edge Function rollback or removal can then be performed through Supabase CLI or dashboard using the committed source under `supabase/functions/`.

Do not disable or replace the existing production functions while rolling back Pilot Mode.

## Database rollback

The guarded Phase 3 rollback package is:

```text
supabase/manual-migrations/pilot-mode/phase-3/99_rollback_phase3.sql
```

Before database rollback:

1. Disable Pilot Mode in Vercel.
2. Confirm no active Pilot sessions remain.
3. Export any Pilot results that must be retained.
4. Delete private Pilot attachment objects through the approved storage-first workflow.
5. Run the read-only verification package.
6. Execute rollback only through an authorised maintenance process.

The rollback must not drop or alter production incident, notification, media, location, case-update or escalation objects.

## Data cleanup order

Destructive Pilot cleanup must remain storage-first:

1. remove exact private attachment objects;
2. verify Storage absence;
3. finalise report deletion;
4. finalise session, campus, programme or retention cleanup;
5. confirm the audit record.

## Known limitations

### Supabase plan

Leaked-password protection remains unavailable on the current plan and is an accepted non-blocker.

### Web Push

VAPID secrets are not configured. Browser push is unavailable and must not report false delivery success.

### Emergency contacts

Official campus CPS telephone details remain subject to institutional verification. Unverified numbers must not be displayed.

### Diagnostic Edge slugs

The following diagnostic-only slugs remain deployed because the connected tool does not expose deletion:

- `pilot-session-cleanup`
- `pilot-cleanup`
- `pilot-export-results`

They are JWT-protected, unused by the application and should be removed later through Supabase CLI or dashboard.

### Human acceptance

Automated and transactional QA is complete. The user approved Phase 7 delivery completion, but no claim is made that every role journey was personally executed by the user during this conversation.

### Lint debt

Legacy lint warnings may remain in unrelated production code. The Phase 6 lint command completed successfully under the repository's approved warning baseline.

### Production launch

Production Pilot Mode is deliberately disabled. Merge approval and production enablement require separate user instructions.

## Recovery verification

After any rollback or shutdown:

- `/pilot`, `/security/pilot` and `/admin/pilot` must be unavailable when the flag is false;
- production report and emergency routes must remain operational;
- no Pilot service may reference production emergency tables or dispatch functions;
- the private Pilot bucket must not become public;
- GitHub Actions QA and the Vercel production build must pass.