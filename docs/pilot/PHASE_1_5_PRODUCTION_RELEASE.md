# Phase 1–5 Pilot Production Release

Release approved and merged on 21 July 2026.

## Merge

- Pull request: #32
- Merge commit: `a9c367e621d9baedfa73013d70864fa82e201b80`
- Production branch: `main`

## Runtime correction

The Pilot administration failure `Cannot read properties of undefined (reading 'rest')` was traced to an unbound `supabase.rpc` invocation in `pilotProfileService`. The service now invokes the RPC through the Supabase client instance, and the Phase 5 release gate scans the source tree for detached Supabase client methods.

## Database

The Phase 3, Phase 4, Phase 5 and RPC-execution-hardening migrations were applied to the authorised `MY CCSF` Supabase project before production deployment.

## Release controls

The consolidated branch passed authentication, reporting, routing, reviews, student experience, production isolation, TypeScript, ESLint, production build and direct-route Preview smoke tests before merge.
