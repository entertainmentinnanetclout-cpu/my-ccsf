create or replace function pilot_private.add_report_note(p_report_id uuid, p_notes text)
returns public.pilot_report_events
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_report public.pilot_reports%rowtype; v_event public.pilot_report_events%rowtype;
begin
  if v_actor is null or nullif(btrim(p_notes),'') is null then raise exception 'Authentication and note text are required'; end if;
  select * into v_report from public.pilot_reports where id=p_report_id;
  if not found or not private.pilot_can_manage_report(v_actor,p_report_id) then raise exception 'Report not found or access denied'; end if;
  insert into public.pilot_report_events(program_id,report_id,session_id,event_type,actor_id,actor_role,notes)
  values(v_report.program_id,v_report.id,v_report.session_id,'note_added',v_actor,private.pilot_actor_role(v_actor),p_notes)
  returning * into v_event;
  return v_event;
end $$;

create or replace function pilot_private.create_notification(p_report_id uuid, p_type public.pilot_notification_type, p_title text, p_message text)
returns public.pilot_notifications
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_report public.pilot_reports%rowtype; v_row public.pilot_notifications%rowtype;
begin
  if v_actor is null or nullif(btrim(p_title),'') is null or nullif(btrim(p_message),'') is null then raise exception 'Authentication, title and message are required'; end if;
  select * into v_report from public.pilot_reports where id=p_report_id;
  if not found or not private.pilot_can_manage_report(v_actor,p_report_id) then raise exception 'Report not found or access denied'; end if;
  insert into public.pilot_notifications(program_id,session_id,report_id,user_id,notification_type,title,message,created_by)
  values(v_report.program_id,v_report.session_id,v_report.id,v_report.submitted_by,p_type,p_title,p_message,v_actor)
  returning * into v_row;
  insert into public.pilot_report_events(program_id,report_id,session_id,event_type,actor_id,actor_role,notes,metadata)
  values(v_report.program_id,v_report.id,v_report.session_id,'notification_created',v_actor,private.pilot_actor_role(v_actor),'Pilot notification created',jsonb_build_object('notification_id',v_row.id,'notification_type',p_type));
  return v_row;
end $$;

create or replace function pilot_private.mark_notification_read(p_notification_id uuid)
returns public.pilot_notifications
language plpgsql security definer
set search_path=public,private,pilot_private
as $$
declare v_actor uuid:=auth.uid(); v_row public.pilot_notifications%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  update public.pilot_notifications set is_read=true, read_at=coalesce(read_at,now()) where id=p_notification_id and user_id=v_actor returning * into v_row;
  if not found then raise exception 'Notification not found'; end if;
  return v_row;
end $$;