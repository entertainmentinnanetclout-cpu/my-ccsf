-- Phase 3 Pilot Backend Verification
-- Read-only. Expected to return one JSON document with all controls satisfied.

with pilot_tables as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname like 'pilot_%'
),
fk_targets as (
  select distinct src.relname as source_table, tgt.relname as target_table
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_namespace sn on sn.oid = src.relnamespace
  join pg_class tgt on tgt.oid = con.confrelid
  join pg_namespace tn on tn.oid = tgt.relnamespace
  where con.contype = 'f'
    and sn.nspname = 'public'
    and src.relname like 'pilot_%'
),
anon_grants as (
  select count(*) as grant_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name like 'pilot_%'
    and grantee = 'anon'
),
exposed_definers as (
  select count(*) as function_count
  from information_schema.routines
  where routine_schema = 'public'
    and routine_name like 'pilot_%'
    and security_type = 'DEFINER'
)
select jsonb_build_object(
  'pilot_table_count', (select count(*) from pilot_tables),
  'all_rls_enabled', (select bool_and(relrowsecurity) from pilot_tables),
  'pilot_policy_count', (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename like 'pilot_%'
  ),
  'storage_policy_count', (
    select count(*) from pg_policies
    where schemaname = 'storage' and policyname like 'pilot_attachment_%'
  ),
  'anon_table_grants', (select grant_count from anon_grants),
  'public_security_definer_rpcs', (select function_count from exposed_definers),
  'public_rpc_names', (
    select jsonb_agg(routine_name order by routine_name)
    from information_schema.routines
    where routine_schema = 'public' and routine_name like 'pilot_%'
  ),
  'realtime_tables', (
    select jsonb_agg(tablename order by tablename)
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename like 'pilot_%'
  ),
  'bucket', (
    select jsonb_build_object(
      'id', id,
      'public', public,
      'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types
    )
    from storage.buckets
    where id = 'pilot-report-attachments'
  ),
  'foreign_key_targets', (
    select jsonb_agg(
      jsonb_build_object('source', source_table, 'target', target_table)
      order by source_table, target_table
    )
    from fk_targets
  ),
  'production_incident_fk_count', (
    select count(*)
    from fk_targets
    where target_table in (
      'incidents',
      'incident_media',
      'incident_location_updates',
      'notifications',
      'case_updates',
      'case_escalations'
    )
  )
) as phase_3_verification;

-- Expected critical values:
-- pilot_table_count             = 12
-- all_rls_enabled               = true
-- pilot_policy_count            = 27
-- storage_policy_count          = 2
-- anon_table_grants             = 0
-- public_security_definer_rpcs  = 0
-- production_incident_fk_count  = 0
-- realtime_tables               = pilot_notifications, pilot_report_events,
--                                 pilot_reports, pilot_sessions
-- bucket.public                 = false
-- bucket.file_size_limit        = 10485760