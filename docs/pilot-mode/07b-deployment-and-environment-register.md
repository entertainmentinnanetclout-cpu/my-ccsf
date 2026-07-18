# Phase 7 — Deployment and Environment Register

## Supabase project

- Project name: `MY CCSF`
- Project reference: `lfelzsubrlqwcsnetpov`
- Production URL: configured through `VITE_SUPABASE_URL`
- Browser credential: configured through `VITE_SUPABASE_PUBLISHABLE_KEY`

No service-role credential is present in browser code.

## Applied database packages

The live migration history is authoritative. Do not rerun applied migrations manually.

### Phase 1.5

Production synchronisation and security hardening migrations are recorded in:

- `docs/pilot-mode/01d-live-migration-ledger.md`

### Phase 3

The isolated Pilot database package is recorded in:

- `docs/pilot-mode/03-live-migration-ledger.md`
- `supabase/manual-migrations/pilot-mode/phase-3/00_extract_applied_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/90_verify_phase3.sql`
- `supabase/manual-migrations/pilot-mode/phase-3/99_rollback_phase3.sql`

The named live Phase 3 migrations run from `phase_3_pilot_enums_and_tables` through `phase_3_pilot_foreign_key_indexes`.

### Phase 5

The service-finalisation package is recorded in:

- `supabase/manual-migrations/pilot-mode/phase-5/00_extract_applied_phase5.sql`
- `supabase/manual-migrations/pilot-mode/phase-5/90_verify_phase5.sql`

The named live Phase 5 migrations run from `phase_5_pilot_storage_cleanup_guard` through `phase_5_pilot_authorized_expired_completion`.

## Active functional Pilot Edge Functions

All require platform JWT verification:

- `pilot-create-session`
- `pilot-submit-report`
- `pilot-transition-status`
- `pilot-create-notification`
- `pilot-delete-report`

## Diagnostic-only Pilot Edge slugs

These are JWT-protected, are not called by the browser application and contain no operational workflow:

- `pilot-session-cleanup`
- `pilot-cleanup`
- `pilot-export-results`

Remove them later through Supabase CLI or dashboard when convenient.

## Existing production Edge Functions

The following existing functions remain separate from Pilot Mode:

- `send-push-notification`
- `create-campus-admin`
- `reset-staff-password`

Pilot browser and Edge source must not invoke `send-push-notification`.

## Vercel project

- Project: `my-ccsf`
- Project ID: `prj_M1Yz48MQFmM5E9cSGoydCmuPN1pe`
- Team: `team_nirVWjVsRKTYYTpMkLrEkVtF`
- Branch: `feature/controlled-pilot-mode`
- Stable branch alias: `my-ccsf-git-fea-ecfaf1-entertainmentinnanetclout-8125s-projects.vercel.app`

## Environment-variable register

### Required

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_PILOT_MODE_ENABLED=false
```

### Optional

```env
VITE_VAPID_PUBLIC_KEY=
```

## Environment policy

### Preview

The approved controlled branch Preview may use:

```env
VITE_PILOT_MODE_ENABLED=true
```

### Production

Production must remain:

```env
VITE_PILOT_MODE_ENABLED=false
```

until the user separately approves production enablement.

## Secret controls

The following values must never be placed in frontend environment variables or committed files:

- Supabase service-role key;
- VAPID private key;
- database passwords;
- administrative bearer tokens.

## Verification commands

```bash
npm ci
npm run test:pilot-isolation
npm run typecheck
npm run lint
npm run build
```

The permanent GitHub Actions workflow runs the same QA sequence for feature branches and pull requests.