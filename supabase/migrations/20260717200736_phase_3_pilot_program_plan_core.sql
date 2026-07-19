create or replace function pilot_private.program_deletion_plan(p_program_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare
  v_actor uuid:=auth.uid();
  v_paths text[];
  v_participants integer;
  v_sessions integer;
  v_reports integer;
begin
  if v_actor is null or nullif(btrim(p_reason),'') is null then raise exception 'Authentication and reason are required'; end if;
  if not private.pilot_is_super_admin(v_actor) then raise exception 'Super-admin authority required'; end if;
  if not exists(select 1 from public.pilot_programs where id=p_program_id) then raise exception 'Programme not found'; end if;
  select coalesce(array_agg(storage_path order by storage_path),'{}'::text[]) into v_paths from public.pilot_attachments where program_id=p_program_id;
  select count(*) into v_participants from public.pilot_participants where program_id=p_program_id;
  select count(*) into v_sessions from public.pilot_sessions where program_id=p_program_id;
  select count(*) into v_reports from public.pilot_reports where program_id=p_program_id;
  return jsonb_build_object('status',case when cardinality(v_paths)>0 then 'storage_cleanup_required' else 'ready_for_finalisation' end,'operation','program','entity_id',p_program_id,'program_id',p_program_id,'reason',p_reason,'storage_paths',v_paths,'participants',v_participants,'sessions',v_sessions,'reports',v_reports);
end $$;