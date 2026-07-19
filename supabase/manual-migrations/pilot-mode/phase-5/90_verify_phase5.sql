-- Phase 5 Pilot service verification
-- Read-only. Expected to return one JSON document.

with service_wrappers as (
  select
    p.proname,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') as service_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'pilot_finalize_delete_report',
      'pilot_finalize_delete_session',
      'pilot_finalize_purge_campus',
      'pilot_finalize_purge_program',
      'pilot_finalize_purge_expired',
      'pilot_complete_cleanup'
    )
),
authorized_wrappers as (
  select
    p.proname,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'pilot_execute_program_cleanup',
      'pilot_execute_expired_cleanup',
      'pilot_staff_message'
    )
),
production_references as (
  select count(*) as reference_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'pilot_private')
    and p.proname like 'pilot_%'
    and pg_get_functiondef(p.oid) ~* '(incident_media|incident_location_updates|case_updates|case_escalations|send_push_notification)'
)
select jsonb_build_object(
  'service_only_wrappers', (
    select jsonb_agg(to_jsonb(service_wrappers) order by proname)
    from service_wrappers
  ),
  'authorized_completion_wrappers', (
    select jsonb_agg(to_jsonb(authorized_wrappers) order by proname)
    from authorized_wrappers
  ),
  'storage_guard', (
    select jsonb_build_object(
      'exists', count(*) = 1,
      'authenticated_execute', coalesce(bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')), false),
      'service_execute', coalesce(bool_or(has_function_privilege('service_role', p.oid, 'EXECUTE')), false)
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'pilot_private'
      and p.proname = 'assert_storage_paths_cleared'
  ),
  'bucket', (
    select jsonb_build_object(
      'public', public,
      'file_size_limit', file_size_limit,
      'allowed_mime_types', allowed_mime_types
    )
    from storage.buckets
    where id = 'pilot-report-attachments'
  ),
  'production_function_reference_count', (
    select reference_count from production_references
  ),
  'aggregate_view_security_invoker', (
    select coalesce((c.reloptions @> array['security_invoker=true'])::boolean, false)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'pilot_aggregate_results'
  )
) as phase_5_verification;

-- Critical expected values:
-- service-only wrappers: authenticated_execute=false, service_execute=true
-- storage_guard.authenticated_execute=false
-- storage_guard.service_execute=true
-- bucket.public=false
-- production_function_reference_count=0
-- aggregate_view_security_invoker=true