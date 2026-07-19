create schema if not exists pilot_private;
revoke all on schema pilot_private from public, anon, authenticated;
grant usage on schema pilot_private to authenticated, service_role;