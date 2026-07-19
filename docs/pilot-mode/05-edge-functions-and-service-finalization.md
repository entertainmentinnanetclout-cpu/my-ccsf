# Phase 5 — Pilot Edge Functions and Service Finalisation

## Status

**COMPLETE WITH DOCUMENTED TRANSPORT CONSOLIDATION — 18 July 2026**

## Objective

Phase 5 moves high-risk Pilot operations behind authenticated server and database boundaries, finalises private Storage deletion controls and prevents browser code from receiving service-role credentials or broad Storage deletion authority.

## Functional Edge endpoints

The following live Supabase Edge Functions are active with platform JWT verification enabled:

| Function | Purpose |
|---|---|
| `pilot-create-session` | validates participant ownership, consent, campus and active programme; creates or resumes a Pilot session |
| `pilot-submit-report` | validates an owned active session and submits only to `pilot_reports` |
| `pilot-transition-status` | authenticated gateway to the database-enforced Pilot status machine |
| `pilot-create-notification` | creates Pilot-only in-app updates through `pilot_staff_message` |
| `pilot-delete-report` | authorised plan, exact private Storage cleanup, database verification, cascade and audit |

Every live endpoint above has `verify_jwt = true`.

## Browser service integration

The Phase 4 browser services now use:

- `pilot-create-session` for session creation;
- `pilot-submit-report` for simulated report submission;
- `pilot-transition-status` for staff status operations;
- `pilot-create-notification` for in-app Pilot updates;
- `pilot-delete-report` for every report that requires private Storage cleanup.

No browser service receives `SUPABASE_SERVICE_ROLE_KEY`.

## Storage-first finalisation

Phase 5 introduced:

- `pilot_private.assert_storage_paths_cleared`;
- report and session finalisers;
- campus, programme and retention finalisers;
- service-role-only public wrappers;
- authenticated super-admin completion wrappers for programme and retention operations.

Service-only finaliser wrappers are not executable by the `authenticated` role.

The finalisation sequence is:

```text
caller-authorised plan
  → exact Pilot report IDs / Storage paths
  → JWT-verified per-report cleanup
  → private bucket deletion
  → database confirms paths are absent
  → relational cascade
  → pilot_audit_logs record
```

## Consolidated workflows

The deployment connector rejected full Edge payloads for whole-session cleanup, bulk purge and export before those payloads reached Supabase. The exact-file register permits documented technical deviations.

Functional coverage is complete through secure composition:

### Session deletion

1. read the caller-visible session reports under RLS;
2. delete every report through `pilot-delete-report`;
3. call `pilot_delete_session` after the session has no remaining reports or private files.

### Campus purge

1. read campus/program report IDs under RLS;
2. delete every report through `pilot-delete-report`;
3. call `pilot_purge_campus`, which revalidates campus-head or super-admin authority.

### Programme purge

1. delete every programme report through `pilot-delete-report`;
2. call `pilot_execute_program_cleanup`;
3. the wrapper revalidates super-admin authority and refuses to continue while matching Storage objects exist.

### Retention purge

1. calculate eligible sessions using `pilot_purge_expired`;
2. delete every affected report through `pilot-delete-report`;
3. call `pilot_execute_expired_cleanup`;
4. eligibility and Storage absence are recalculated before deletion.

### Export

The application uses the existing `pilot_export_data` RPC under the authenticated caller session. That function already:

- limits campus security to its own campus;
- rejects identified export for non-super-admin users;
- records exports in `pilot_audit_logs`.

An aggregate-only `security_invoker` view is also available as `pilot_aggregate_results`.

## Retired compatibility slugs

The unused JWT-protected slugs below remain unreferenced by `src/services/pilot`:

- `pilot-session-cleanup`;
- `pilot-cleanup`;
- `pilot-export-results`.

On 19 July 2026 their diagnostic responders were replaced with explicit `410 Gone` responses. Their exact deployed source is checked in under the matching `supabase/functions/<slug>/index.ts` path and all are configured with `verify_jwt = true`.

Required control:

- do not route application traffic to these retired slugs;
- use the composed report cleanup and audited RPC workflows documented above;
- remove the retired slugs when an Edge Function deletion workflow is available.

## Database migrations

| Version | Migration |
|---|---|
| `20260718044546` | `phase_5_pilot_storage_cleanup_guard` |
| `20260718044606` | `phase_5_pilot_report_session_finalizers` |
| `20260718044639` | `phase_5_pilot_bulk_finalizers` |
| `20260718050127` | `phase_5_pilot_staff_message_wrapper` |
| `20260718050423` | `phase_5_pilot_session_cleanup_aliases` |
| `20260718050527` | `phase_5_pilot_entity_cleanup_aliases` |
| `20260718050603` | `phase_5_pilot_generic_cleanup_contract` |
| `20260718050810` | `phase_5_pilot_finish_workflow_wrapper` |
| `20260718050920` | `phase_5_pilot_safe_results_wrapper` |
| `20260718051044` | `phase_5_pilot_aggregate_export_view` |
| `20260718051342` | `phase_5_pilot_authorized_program_completion` |
| `20260718051513` | `phase_5_pilot_authorized_expired_completion` |

## Verification results

- service-role finalisers: `authenticated = false`, `service_role = true`;
- private Storage guard: `authenticated = false`, `service_role = true`;
- private attachment bucket remains private with a 10 MB limit;
- allowed MIME types remain JPEG, PNG, WebP, MP4 and PDF;
- Phase 5 Pilot database functions contain zero production incident/escalation references;
- committed Pilot Edge source contains no production incident or push-function reference;
- checked-in Supabase types include the Phase 5 wrappers and aggregate view;
- application production build passes.

## Adviser results

### Security

Only the accepted plan-limited warning remains:

- leaked-password protection disabled.

### Performance

Only informational unused-index notices remain. Pilot tables do not yet have representative production traffic.

## Production isolation

Phase 5 does not write to or invoke:

- `incidents`;
- `incident_media`;
- `incident_location_updates`;
- production `notifications`;
- `case_updates`;
- `case_escalations`;
- `incident-media`;
- `send-push-notification`;
- real emergency dispatch integrations.

## Phase 6 entry gate

Phase 6 must perform authenticated multi-role testing of:

- student session creation and submission;
- campus and super-admin transitions;
- Pilot-only in-app updates;
- report cleanup with and without attachments;
- composed session/campus/programme/retention cleanup;
- export redaction and authority;
- production-isolation assertions;
- mobile/browser usability through Vercel Preview.