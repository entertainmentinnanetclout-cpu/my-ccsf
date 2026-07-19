-- Phase 3 exact forward-SQL extractor
--
-- This query is read-only. It returns the exact statement arrays stored by
-- Supabase for the already-applied Phase 3 migrations in execution order.
-- Do not replay the returned SQL against the live project.

select
  version,
  name,
  created_by,
  idempotency_key,
  array_to_string(statements, E'\n\n') as forward_sql,
  array_to_string(rollback, E'\n\n') as stored_rollback_sql
from supabase_migrations.schema_migrations
where name like 'phase_3_%'
order by version;

-- Optional single-document export for review or archival.
select string_agg(
  format(
    E'-- %s_%s\n%s',
    version,
    name,
    array_to_string(statements, E'\n\n')
  ),
  E'\n\n-- ------------------------------------------------------------\n\n'
  order by version
) as phase_3_forward_sql
from supabase_migrations.schema_migrations
where name like 'phase_3_%';