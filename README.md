# CCSF — Campus Community Safety Forum

CCSF is a role-based campus safety platform for students, campus security teams, administrators, and authorised office/judiciary workflows. The application includes incident reporting and tracking, campus-scoped case management, private evidence/media handling, notifications, emergency contacts, and a controlled Pilot environment.

## Technology

- React 18, TypeScript, Vite
- Tailwind CSS and shadcn/ui
- Supabase Auth, Postgres, Row Level Security, Storage, Realtime, and Edge Functions
- GitHub Actions for verification

## Local setup

Requirements: Node.js 20 and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Populate `.env` with the correct Supabase publishable browser key. Never place a Supabase secret or service-role key in a client environment variable or commit it to Git.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm run test:pilot-isolation
```

Run the complete Pilot gate with:

```bash
npm run qa:pilot
```

## Pilot safety boundary

Pilot Mode is a controlled simulation environment. It does not dispatch an external emergency service. It must remain disabled unless the deployment is explicitly approved:

```text
VITE_PILOT_MODE_ENABLED=false
```

Pilot routes:

- Student: `/pilot`
- Campus security/admin: `/security/pilot`
- Super admin: `/admin/pilot`

## Supabase

Production project: `MY CCSF`  
Project reference: `lfelzsubrlqwcsnetpov`

Production migrations are forward-only. Consult the live ledgers under `docs/pilot-mode/` before applying any schema change. Never rerun a migration that is already recorded in production.

All exposed tables require appropriate RLS. Public client code may use only publishable/anon credentials. Elevated operations belong in reviewed database functions or JWT-protected Edge Functions with explicit caller and scope validation.

## Delivery governance

The authoritative remaining-work sequence, dependencies, acceptance criteria, branch disposition, and merge gates are in [docs/CCSF_FINALISATION_PLAN.md](docs/CCSF_FINALISATION_PLAN.md).

No stale branch should be merged wholesale. Isolate and review any proven unique changes before carrying them into the current execution branch.
