create or replace function private.pilot_validate_participant()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_campuses public.campus_location[]; v_profile_campus public.campus_location;
begin
  select eligible_campuses into v_campuses from public.pilot_programs where id=new.program_id;
  if v_campuses is null or not (new.campus=any(v_campuses)) then raise exception 'Participant campus is outside programme scope'; end if;
  select campus into v_profile_campus from public.profiles where id=new.user_id;
  if v_profile_campus is null or v_profile_campus<>new.campus then raise exception 'Participant campus must match profile campus'; end if;
  if not private.raw_has_role(new.user_id,'student'::public.user_role) then raise exception 'Pilot participant must have student role'; end if;
  return new;
end $$;

create or replace function private.pilot_validate_session()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_participant public.pilot_participants%rowtype; v_program public.pilot_programs%rowtype;
begin
  select * into v_participant from public.pilot_participants where id=new.participant_id;
  if not found then raise exception 'Pilot participant not found'; end if;
  if v_participant.program_id<>new.program_id or v_participant.user_id<>new.user_id or v_participant.campus<>new.campus then raise exception 'Session does not match participant'; end if;
  if v_participant.status not in ('consented','active') then raise exception 'Participant is not authorised to start a session'; end if;
  select * into v_program from public.pilot_programs where id=new.program_id;
  if v_program.status<>'active' or (v_program.starts_at is not null and v_program.starts_at>now()) or (v_program.ends_at is not null and v_program.ends_at<now()) then raise exception 'Pilot programme is not active'; end if;
  if new.expires_at is null then new.expires_at:=now()+interval '24 hours'; end if;
  return new;
end $$;

create or replace function private.pilot_guard_session_update()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor=old.user_id and not private.pilot_is_security(v_actor) and not private.pilot_is_super_admin(v_actor) then
    if new.program_id<>old.program_id or new.participant_id<>old.participant_id or new.user_id<>old.user_id or new.campus<>old.campus or new.started_at<>old.started_at or new.expires_at<>old.expires_at or new.device_type is distinct from old.device_type or new.browser_name is distinct from old.browser_name or new.browser_version is distinct from old.browser_version or new.operating_system is distinct from old.operating_system or new.viewport_width is distinct from old.viewport_width or new.viewport_height is distinct from old.viewport_height or new.network_type is distinct from old.network_type then
      raise exception 'Student may only update session activity and completion state';
    end if;
    if old.status<>'in_progress' and new.status<>old.status then raise exception 'Terminal session cannot transition'; end if;
    if old.status='in_progress' and new.status not in ('in_progress','completed','abandoned','withdrawn') then raise exception 'Invalid student session transition'; end if;
    if new.status='completed' and new.completed_at is null then new.completed_at:=now(); end if;
  end if;
  new.updated_at:=now();
  return new;
end $$;

create or replace function private.pilot_prepare_report()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_session public.pilot_sessions%rowtype; v_participant public.pilot_participants%rowtype;
begin
  select * into v_session from public.pilot_sessions where id=new.session_id;
  if not found or v_session.program_id<>new.program_id or v_session.participant_id<>new.participant_id or v_session.user_id<>new.submitted_by or v_session.campus<>new.campus or v_session.status<>'in_progress' then raise exception 'Report does not match an active pilot session'; end if;
  select * into v_participant from public.pilot_participants where id=new.participant_id;
  if not found or v_participant.user_id<>new.submitted_by or v_participant.status not in ('consented','active') then raise exception 'Report submitter is not an active participant'; end if;
  if new.scenario_id is not null and not exists(select 1 from public.pilot_scenarios s where s.id=new.scenario_id and s.program_id=new.program_id and s.is_active) then raise exception 'Scenario is not active for this programme'; end if;
  if new.reference_number is null or btrim(new.reference_number)='' then new.reference_number:='PIL-'||to_char(clock_timestamp(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)); end if;
  new.submitted_at:=coalesce(new.submitted_at,now());
  return new;
end $$;

create or replace function private.pilot_after_report_insert()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  insert into public.pilot_report_events(program_id,report_id,session_id,event_type,to_status,actor_id,actor_role,notes)
  values(new.program_id,new.id,new.session_id,'report_created',new.status,new.submitted_by,private.pilot_actor_role(new.submitted_by),'Pilot simulation report created');
  insert into public.pilot_notifications(program_id,session_id,report_id,user_id,notification_type,title,message,created_by)
  values(new.program_id,new.session_id,new.id,new.submitted_by,'report_received','Pilot report received','Your simulated report has been received. No emergency service has been dispatched.',new.submitted_by);
  return new;
end $$;

create or replace function private.pilot_validate_location_event()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  if not exists(select 1 from public.pilot_reports r join public.pilot_sessions s on s.id=r.session_id where r.id=new.report_id and r.program_id=new.program_id and r.session_id=new.session_id and r.submitted_by=new.user_id and s.user_id=new.user_id and s.status='in_progress') then raise exception 'Location event does not match an active owned pilot report'; end if;
  return new;
end $$;

create or replace function private.pilot_validate_attachment()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_report public.pilot_reports%rowtype; v_count integer; v_expected_prefix text;
begin
  select * into v_report from public.pilot_reports where id=new.report_id;
  if not found or v_report.program_id<>new.program_id or v_report.session_id<>new.session_id or v_report.submitted_by<>new.uploaded_by then raise exception 'Attachment does not match owned pilot report'; end if;
  select count(*) into v_count from public.pilot_attachments where report_id=new.report_id;
  if tg_op='INSERT' and v_count>=3 then raise exception 'Maximum three attachments per pilot report'; end if;
  v_expected_prefix:=new.program_id::text||'/'||v_report.campus::text||'/'||new.uploaded_by::text||'/'||new.report_id::text||'/';
  if left(new.storage_path,char_length(v_expected_prefix))<>v_expected_prefix then raise exception 'Invalid pilot attachment storage path'; end if;
  return new;
end $$;

create or replace function private.pilot_validate_feature_test()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  if not exists(select 1 from public.pilot_sessions s where s.id=new.session_id and s.program_id=new.program_id and s.user_id=new.user_id) then raise exception 'Feature test does not match session owner'; end if;
  if new.report_id is not null and not exists(select 1 from public.pilot_reports r where r.id=new.report_id and r.session_id=new.session_id and r.submitted_by=new.user_id) then raise exception 'Feature test report does not match session owner'; end if;
  return new;
end $$;

create or replace function private.pilot_validate_feedback()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  if not exists(select 1 from public.pilot_sessions s where s.id=new.session_id and s.program_id=new.program_id and s.user_id=new.user_id) then raise exception 'Feedback does not match session owner'; end if;
  if new.report_id is not null and not exists(select 1 from public.pilot_reports r where r.id=new.report_id and r.session_id=new.session_id and r.submitted_by=new.user_id) then raise exception 'Feedback report does not match session owner'; end if;
  new.updated_at:=now(); return new;
end $$;

create or replace function private.pilot_guard_notification_update()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
  if new.program_id<>old.program_id or new.session_id is distinct from old.session_id or new.report_id is distinct from old.report_id or new.user_id<>old.user_id or new.notification_type<>old.notification_type or new.title<>old.title or new.message<>old.message or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Only notification read state may be changed'; end if;
  if new.is_read and new.read_at is null then new.read_at:=now(); end if;
  if not new.is_read then new.read_at:=null; end if;
  return new;
end $$;

create or replace function private.pilot_touch_updated_at()
returns trigger language plpgsql set search_path=public
as $$ begin new.updated_at:=now(); return new; end $$;

drop trigger if exists pilot_validate_participant_trg on public.pilot_participants;
create trigger pilot_validate_participant_trg before insert or update on public.pilot_participants for each row execute function private.pilot_validate_participant();
drop trigger if exists pilot_validate_session_trg on public.pilot_sessions;
create trigger pilot_validate_session_trg before insert on public.pilot_sessions for each row execute function private.pilot_validate_session();
drop trigger if exists pilot_guard_session_update_trg on public.pilot_sessions;
create trigger pilot_guard_session_update_trg before update on public.pilot_sessions for each row execute function private.pilot_guard_session_update();
drop trigger if exists pilot_prepare_report_trg on public.pilot_reports;
create trigger pilot_prepare_report_trg before insert on public.pilot_reports for each row execute function private.pilot_prepare_report();
drop trigger if exists pilot_after_report_insert_trg on public.pilot_reports;
create trigger pilot_after_report_insert_trg after insert on public.pilot_reports for each row execute function private.pilot_after_report_insert();
drop trigger if exists pilot_validate_location_event_trg on public.pilot_location_events;
create trigger pilot_validate_location_event_trg before insert on public.pilot_location_events for each row execute function private.pilot_validate_location_event();
drop trigger if exists pilot_validate_attachment_trg on public.pilot_attachments;
create trigger pilot_validate_attachment_trg before insert or update on public.pilot_attachments for each row execute function private.pilot_validate_attachment();
drop trigger if exists pilot_validate_feature_test_trg on public.pilot_feature_tests;
create trigger pilot_validate_feature_test_trg before insert or update on public.pilot_feature_tests for each row execute function private.pilot_validate_feature_test();
drop trigger if exists pilot_validate_feedback_trg on public.pilot_feedback;
create trigger pilot_validate_feedback_trg before insert or update on public.pilot_feedback for each row execute function private.pilot_validate_feedback();
drop trigger if exists pilot_guard_notification_update_trg on public.pilot_notifications;
create trigger pilot_guard_notification_update_trg before update on public.pilot_notifications for each row execute function private.pilot_guard_notification_update();

create trigger pilot_programs_touch_updated_at before update on public.pilot_programs for each row execute function private.pilot_touch_updated_at();
create trigger pilot_scenarios_touch_updated_at before update on public.pilot_scenarios for each row execute function private.pilot_touch_updated_at();
create trigger pilot_participants_touch_updated_at before update on public.pilot_participants for each row execute function private.pilot_touch_updated_at();
