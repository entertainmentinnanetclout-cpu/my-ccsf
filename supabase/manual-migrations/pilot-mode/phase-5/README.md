# Phase 5 — Pilot Edge Functions and Service Finalisation

## Status

**APPLIED TO LIVE SUPABASE — 18 July 2026**

Project: `MY CCSF`  
Project reference: `lfelzsubrlqwcsnetpov`

## Critical execution warning

The Phase 5 migrations have already been applied through the connected Supabase migration API.

Do not replay reconstructed DDL against the live project. The authoritative statement arrays are stored in:

```text
supabase_migrations.schema_migrations
```

Use `00_extract_applied_phase5.sql` to retrieve the exact applied SQL in execution order.

## Package contents

- `00_extract_applied_phase5.sql` — exact applied migration extraction.
- `90_verify_phase5.sql` — read-only verification of grants, Storage guards, function isolation and live database controls.

## Delivered service boundary

Phase 5 adds:

- service-role-only Storage verification;
- report, session, campus, programme and retention finalisers;
- authenticated super-admin completion wrappers;
- an authenticated Pilot-only staff-message wrapper;
- an aggregate-only result view;
- JWT-verified Pilot Edge endpoints;
- browser service adapters that use only Pilot tables, Pilot RPCs and the private Pilot bucket.

## Storage-first deletion

All destructive workflows follow this sequence:

1. obtain an authorised database plan;
2. identify exact `pilot-report-attachments` object paths;
3. delete each affected report through the JWT-verified report-cleanup endpoint;
4. verify that no matching private Storage object remains;
5. finalise relational deletion using the caller-authorised database wrapper;
6. write the Pilot audit record.

The browser never receives service-role credentials and has no broad Storage deletion policy.

## Technical transport consolidation

The deployment connector rejected full payloads for whole-session cleanup, bulk purge and result-export implementations before they reached Supabase. The approved functional operations were therefore consolidated as follows:

- session deletion: per-report Edge cleanup, followed by `pilot_delete_session`;
- campus purge: per-report Edge cleanup, followed by `pilot_purge_campus`;
- programme purge: per-report Edge cleanup, followed by `pilot_execute_program_cleanup`;
- retention purge: per-report Edge cleanup, followed by `pilot_execute_expired_cleanup`;
- export: existing audited `pilot_export_data` RPC under the authenticated caller session.

This preserves role, campus, ownership, Storage and audit controls. It changes only the transport composition.

## Diagnostic deployments

During connector isolation, these JWT-protected diagnostic slugs were created:

- `pilot-session-cleanup`
- `pilot-cleanup`
- `pilot-export-results`

They contain no operational data workflow and are not referenced by browser services. The current connector exposes no Edge Function deletion action and rejected subsequent no-op version updates for the cleanup slugs. They must remain excluded from application routing and should be removed through the Supabase dashboard or CLI when deployment credentials are available.

## Production isolation

Phase 5 does not call or reference:

- production `incidents`;
- `incident_media`;
- `incident_location_updates`;
- production `notifications`;
- `case_updates`;
- `case_escalations`;
- `incident-media` Storage;
- `send-push-notification`;
- CPS, SAPS, ambulance, SMS or email dispatch integrations.