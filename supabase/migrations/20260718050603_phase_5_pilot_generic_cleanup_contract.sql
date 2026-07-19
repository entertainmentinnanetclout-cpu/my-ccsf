create or replace function public.pilot_cleanup_plan(p_kind text,p_entity_id uuid,p_reason text)
returns jsonb
language plpgsql
security invoker
set search_path=public,pilot_private
as $$
begin
  if p_kind='report' then return pilot_private.delete_report_plan(p_entity_id,p_reason); end if;
  if p_kind='session' then return pilot_private.delete_session_plan(p_entity_id,p_reason); end if;
  raise exception 'Unsupported cleanup kind';
end $$;

create or replace function public.pilot_complete_cleanup(p_kind text,p_entity_id uuid,p_reason text,p_actor_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pilot_private
as $$
begin
  if p_kind='report' then return pilot_private.finalize_report_deletion(p_entity_id,p_reason,p_actor_id); end if;
  if p_kind='session' then return pilot_private.finalize_session_deletion(p_entity_id,p_reason,p_actor_id); end if;
  raise exception 'Unsupported cleanup kind';
end $$;

revoke all on function public.pilot_cleanup_plan(text,uuid,text) from public,anon;
grant execute on function public.pilot_cleanup_plan(text,uuid,text) to authenticated;
revoke all on function public.pilot_complete_cleanup(text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.pilot_complete_cleanup(text,uuid,text,uuid) to service_role;