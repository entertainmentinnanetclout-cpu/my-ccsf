create or replace function public.pilot_finish_workflow(p_id uuid,p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.delete_session_plan(p_id,p_reason) $$;
revoke all on function public.pilot_finish_workflow(uuid,text) from public,anon;
grant execute on function public.pilot_finish_workflow(uuid,text) to authenticated;