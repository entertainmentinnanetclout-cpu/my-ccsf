-- Phase 5 exact applied-SQL extractor
-- Read-only. Do not replay the returned SQL against the live project.

select
  version,
  name,
  created_by,
  idempotency_key,
  array_to_string(statements, E'\n\n') as forward_sql,
  array_to_string(rollback, E'\n\n') as stored_rollback_sql
from supabase_migrations.schema_migrations
where name like 'phase_5_%'
order by version;

select string_agg(
  format(
    E'-- %s_%s\n%s',
    version,
    name,
    array_to_string(statements, E'\n\n')
  ),
  E'\n\n-- ------------------------------------------------------------\n\n'
  order by version
) as phase_5_forward_sql
from supabase_migrations.schema_migrations
where name like 'phase_5_%';