-- Phase 6 read-only structural verification.
-- Safe to run repeatedly. This file performs no writes.

with checks as (
  select
    'pilot_tables_rls_enabled' as check_name,
    bool_and(c.relrowsecurity) as passed,
    count(*)::text as detail
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname like 'pilot_%'

  union all

  select
    'no_forbidden_production_foreign_keys',
    count(*) = 0,
    count(*)::text
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.constraint_schema = kcu.constraint_schema
  join information_schema.referential_constraints rc
    on rc.constraint_name = tc.constraint_name
   and rc.constraint_schema = tc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.constraint_schema = tc.constraint_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name like 'pilot_%'
    and ccu.table_name in (
      'incidents',
      'incident_media',
      'incident_location_updates',
      'notifications',
      'case_updates',
      'case_escalations'
    )

  union all

  select
    'no_anon_pilot_table_privileges',
    count(*) = 0,
    count(*)::text
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and table_name like 'pilot_%'

  union all

  select
    'no_public_pilot_security_definer',
    count(*) = 0,
    count(*)::text
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname like 'pilot_%'
    and p.prosecdef

  union all

  select
    'no_function_reference_to_production_workflows',
    count(*) = 0,
    count(*)::text
  from pg_proc p
  where p.proname like 'pilot_%'
    and pg_get_functiondef(p.oid) ~* '(public\.)?(incidents|incident_media|incident_location_updates|case_updates|case_escalations|send-push-notification)'

  union all

  select
    'private_pilot_bucket',
    not public and file_size_limit = 10485760,
    jsonb_build_object(
      'public', public,
      'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types
    )::text
  from storage.buckets
  where id = 'pilot-report-attachments'

  union all

  select
    'pilot_storage_policy_count',
    count(*) = 2,
    count(*)::text
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname like 'pilot_%'

  union all

  select
    'pilot_realtime_tables',
    count(*) = 4,
    count(*)::text
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename in (
      'pilot_reports',
      'pilot_report_events',
      'pilot_notifications',
      'pilot_sessions'
    )
)
select *
from checks
order by check_name;
