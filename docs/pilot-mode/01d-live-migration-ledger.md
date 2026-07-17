# Phase 1.5 — Live Supabase Migration Ledger

## Project

- Supabase project: `MY CCSF`
- Project reference: `lfelzsubrlqwcsnetpov`
- Execution date: 17 July 2026
- GitHub branch: `feature/controlled-pilot-mode`

## Purpose

This ledger records the production synchronisation and hardening migrations applied before Pilot Mode architecture work. These migrations affect the existing production CCSF application only; they do not create Pilot Mode tables or workflows.

## Schema synchronisation

- `20260717055733_create_app_settings_table`
- `20260717055742_secure_app_settings`
- `20260717055805_create_campus_emergency_contacts`
- `20260717055833_index_campus_emergency_contacts`
- `20260717055841_enable_rls_campus_emergency_contacts`
- `20260717055852_policy_read_campus_emergency_contacts`
- `20260717055912_policy_insert_campus_emergency_contacts`
- `20260717055924_policy_update_campus_emergency_contacts`
- `20260717060651_add_emergency_contact_delete_policy`
- `20260717060706_set_update_timestamp_triggers_for_new_tables`

## Incident ownership and workflow protection

- `20260717055936_add_incident_submitter_tracking`
- `20260717060106_create_incident_update_guard_function`
- `20260717060124_attach_incident_update_guard`
- `20260717060134_drop_legacy_incident_update_delete_policies`
- `20260717060147_create_scoped_incident_update_policy`
- `20260717060202_create_super_admin_incident_delete_policy`
- `20260717060216_replace_incident_insert_policy`
- `20260717061428_replace_incident_select_policy_with_submitter_access`
- `20260717145859_phase_1_5_incident_submitter_default`

## Location, evidence, and Storage

- `20260717060000_drop_open_location_insert_policy`
- `20260717060009_create_authorised_location_insert_policy`
- `20260717060020_drop_open_incident_media_insert_policy`
- `20260717060032_create_authorised_incident_media_insert_policy`
- `20260717060229_drop_legacy_incident_storage_policies`
- `20260717060243_create_incident_storage_upload_policy`
- `20260717060255_create_incident_storage_read_policy`
- `20260717060311_create_incident_storage_delete_policy`
- `20260717060324_harden_storage_bucket_limits`
- `20260717060334_remove_public_bucket_listing_policies`
- `20260717060718_restrict_incident_media_delete_to_campus_scope`
- `20260717151522_phase_1_5_private_chat_media`

The earlier temporary `restore_chat_media_public_delivery_without_listing` migration was superseded by the final private chat-media migration after signed-URL support was added to the frontend.

## Case management and role scope

- `20260717060732_scope_case_updates_security_visibility`
- `20260717060752_scope_case_update_creation`
- `20260717061444_drop_legacy_case_update_policy`
- `20260717061456_add_scoped_case_update_policy`
- `20260717152319_phase_1_5_role_helper_and_admin_rpc_hardening`
- `20260717152551_phase_1_5_private_security_helpers`
- `20260717152759_phase_1_5_rls_policy_consolidation`

## Function and privilege hardening

- `20260717060424_secure_trigger_function_execution`
- `20260717060450_restrict_admin_assignment_rpcs`
- `20260717060621_restrict_role_helper_functions_from_anonymous`
- `20260717060638_grant_role_helpers_only_to_authenticated`

Final elevated role helpers are implemented in the non-exposed `private` schema. Public RPC functions are security-invoker wrappers with caller, role, and campus validation.

## Performance foundations

- `20260717060411_add_missing_foreign_key_indexes`
- `20260717152759_phase_1_5_rls_policy_consolidation`

The final consolidation migration removed overlapping permissive policies and converted repeated `auth.uid()` policy evaluation into init-plan-safe expressions.

## Edge Function deployments

| Function | Version | JWT verification | Final behaviour |
|---|---:|---|---|
| `create-campus-admin` | 7 | Enabled | Validates caller, campus, email, role scope, and 12-character password minimum |
| `reset-staff-password` | 4 | Enabled | Super-admin-only password-reset email request |
| `send-push-notification` | 7 | Enabled | Real Web Push when VAPID is configured; truthful 503 when not configured |

## Final adviser state

### Security adviser

Only one warning remains:

- Leaked-password protection disabled — formally accepted because the current Supabase plan does not support the feature.

No exposed `SECURITY DEFINER`, mutable search-path, open write-policy, or broad Storage-listing warnings remain.

### Performance adviser

No RLS init-plan or multiple-permissive-policy warnings remain.

Only informational unused-index notices remain. The indexes are retained because the production dataset has insufficient traffic to establish meaningful usage statistics and the indexes support expected incident, notification, campus, and relationship queries.

## Execution warning

These migrations have already been applied to the live project. Do not rerun them manually against production. Use this ledger and the live Supabase migration history as the authoritative execution record.
