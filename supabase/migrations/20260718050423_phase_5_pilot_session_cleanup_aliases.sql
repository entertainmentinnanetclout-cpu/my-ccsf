create or replace function public.pilot_session_cleanup_plan(p_session_id uuid,p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.delete_session_plan(p_session_id,p_reason) $$;
create or replace function public.pilot_complete_session_cleanup(p_session_id uuid,p_reason text,p_actor_id uuid)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.finalize_session_deletion(p_session_id,p_reason,p_actor_id) $$;
revoke all on function public.pilot_session_cleanup_plan(uuid,text) from public,anon;
grant execute on function public.pilot_session_cleanup_plan(uuid,text) to authenticated;
revoke all on function public.pilot_complete_session_cleanup(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.pilot_complete_session_cleanup(uuid,text,uuid) to service_role;