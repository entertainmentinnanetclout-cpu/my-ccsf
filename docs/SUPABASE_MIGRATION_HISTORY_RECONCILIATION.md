# Supabase migration-history reconciliation

## Purpose

The existing Campus Safety App Supabase project had a set of migrations applied through connected Supabase tooling. Supabase recorded generated migration timestamps for those executions, while the repository retained the original authored migration timestamps. The database objects were already present and healthy, but the Git integration failed with `Remote migration versions not found in local migrations directory`.

## Resolution

- Compatibility marker files now represent the remote-generated migration versions in `supabase/migrations`.
- The original authored migration versions were recorded in the existing project's `supabase_migrations.schema_migrations` ledger because the corresponding schema/data changes had already been applied under the generated versions.
- The original executable SQL files remain unchanged so a fresh environment can still bootstrap the complete schema.
- No new Supabase project or paid development branch was created.
- No production application data was deleted or reset.

This keeps the Git migration directory and the existing remote migration ledger consistent without replaying already-applied non-idempotent migrations.
