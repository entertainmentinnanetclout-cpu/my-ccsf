create or replace function public.pilot_purge_program(p_program_id uuid, p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.program_deletion_plan(p_program_id,p_reason) $$;
revoke all on function pilot_private.program_deletion_plan(uuid,text) from public, anon;
grant execute on function pilot_private.program_deletion_plan(uuid,text) to authenticated, service_role;
revoke all on function public.pilot_purge_program(uuid,text) from public, anon;
grant execute on function public.pilot_purge_program(uuid,text) to authenticated;