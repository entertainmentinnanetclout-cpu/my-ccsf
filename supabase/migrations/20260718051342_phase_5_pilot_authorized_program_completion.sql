create or replace function pilot_private.execute_program_cleanup(p_program_id uuid,p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private,storage
as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  if not private.pilot_is_super_admin(v_actor) then raise exception 'Super-admin authority required'; end if;
  if exists(select 1 from storage.objects o join public.pilot_attachments a on a.storage_path=o.name where o.bucket_id='pilot-report-attachments' and a.program_id=p_program_id) then raise exception 'Pilot attachment storage cleanup is incomplete'; end if;
  return pilot_private.finalize_program_purge(p_program_id,p_reason,v_actor);
end $$;
create or replace function public.pilot_execute_program_cleanup(p_program_id uuid,p_reason text)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.execute_program_cleanup(p_program_id,p_reason) $$;
revoke all on function pilot_private.execute_program_cleanup(uuid,text) from public,anon;
grant execute on function pilot_private.execute_program_cleanup(uuid,text) to authenticated,service_role;
revoke all on function public.pilot_execute_program_cleanup(uuid,text) from public,anon;
grant execute on function public.pilot_execute_program_cleanup(uuid,text) to authenticated;