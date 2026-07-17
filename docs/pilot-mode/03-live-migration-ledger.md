# Phase 3 — Live Supabase Migration Ledger

## Project

- Supabase project: `MY CCSF`
- Project reference: `lfelzsubrlqwcsnetpov`
- Applied: 17 July 2026
- GitHub branch: `feature/controlled-pilot-mode`

## Status

**All listed migrations are already applied. Do not rerun them manually.**

The exact forward statement arrays are stored in `supabase_migrations.schema_migrations`. Use:

```text
supabase/manual-migrations/pilot-mode/phase-3/00_extract_applied_phase3.sql
```

to retrieve the authoritative SQL.

## Applied migration order

| Version | Migration |
|---|---|
| `20260717195452` | `phase_3_pilot_enums_and_tables` |
| `20260717195654` | `phase_3_pilot_indexes_and_access_helpers` |
| `20260717195737` | `phase_3_pilot_integrity_triggers` |
| `20260717195901` | `phase_3_pilot_defaults_and_rls` |
| `20260717195931` | `phase_3_pilot_restrict_anon_privileges` |
| `20260717195948` | `phase_3_pilot_authenticated_privileges` |
| `20260717200010` | `phase_3_pilot_rls_programs_participants_sessions` |
| `20260717200033` | `phase_3_pilot_rls_reports_events_storage_metadata` |
| `20260717200049` | `phase_3_pilot_rls_tests_feedback_audit` |
| `20260717200124` | `phase_3_pilot_private_attachment_storage` |
| `20260717200247` | `phase_3_pilot_private_schema` |
| `20260717200310` | `phase_3_pilot_consent_rpc` |
| `20260717200355` | `phase_3_pilot_report_transition_core` |
| `20260717200408` | `phase_3_pilot_report_transition_wrapper` |
| `20260717200424` | `phase_3_pilot_notes_notifications_core` |
| `20260717200439` | `phase_3_pilot_notes_notifications_wrappers` |
| `20260717200502` | `phase_3_pilot_withdrawal_rpc` |
| `20260717200538` | `phase_3_pilot_report_session_deletion_plans` |
| `20260717200644` | `phase_3_pilot_campus_purge_plan` |
| `20260717200736` | `phase_3_pilot_program_plan_core` |
| `20260717200748` | `phase_3_pilot_program_plan_wrapper` |
| `20260717200804` | `phase_3_pilot_retention_plan` |
| `20260717200842` | `phase_3_pilot_export_rpc` |
| `20260717200901` | `phase_3_pilot_realtime_configuration` |
| `20260717201047` | `phase_3_pilot_foreign_key_indexes` |

## Live objects created

### Enums

- `pilot_program_status`
- `pilot_participant_status`
- `pilot_session_status`
- `pilot_report_status`
- `pilot_scenario_type`
- `pilot_event_type`
- `pilot_notification_type`
- `pilot_test_outcome`
- `pilot_location_source`

### Tables

- `pilot_programs`
- `pilot_scenarios`
- `pilot_participants`
- `pilot_sessions`
- `pilot_reports`
- `pilot_report_events`
- `pilot_location_events`
- `pilot_attachments`
- `pilot_notifications`
- `pilot_feature_tests`
- `pilot_feedback`
- `pilot_audit_logs`

### Public invoker RPCs

- `pilot_consent_participation`
- `pilot_transition_report`
- `pilot_add_report_note`
- `pilot_create_notification`
- `pilot_mark_notification_read`
- `pilot_withdraw_session`
- `pilot_delete_report`
- `pilot_delete_session`
- `pilot_purge_campus`
- `pilot_purge_program`
- `pilot_purge_expired`
- `pilot_export_data`

All public Pilot RPCs are `SECURITY INVOKER`. Elevated cores are in the non-exposed `pilot_private` schema.

## Storage and Realtime

Private bucket:

```text
pilot-report-attachments
```

Controls:

- private delivery;
- 10 MB file limit;
- JPEG, PNG, WebP, MP4 and PDF only;
- path: `{program}/{campus}/{user}/{report}/{file}`;
- owner/report validation on upload;
- authorised report access on signed reads;
- no client update or delete policy.

Realtime tables:

- `pilot_sessions`
- `pilot_reports`
- `pilot_report_events`
- `pilot_notifications`

## Deletion implementation boundary

The database creates and authorises deletion plans. When private Storage objects exist, the RPC returns `storage_cleanup_required` with exact object paths.

Phase 5 Edge Functions will:

1. request the authorised plan;
2. remove private Storage objects with service credentials;
3. verify that removal succeeded;
4. finalise the relational deletion;
5. record the operation in `pilot_audit_logs`.

This prevents orphaned private files and prevents browser clients from receiving broad Storage deletion authority.