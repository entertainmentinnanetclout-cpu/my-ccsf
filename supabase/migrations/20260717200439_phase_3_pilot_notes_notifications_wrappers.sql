create or replace function public.pilot_add_report_note(p_report_id uuid, p_notes text)
returns public.pilot_report_events language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.add_report_note(p_report_id,p_notes) $$;
create or replace function public.pilot_create_notification(p_report_id uuid, p_type public.pilot_notification_type, p_title text, p_message text)
returns public.pilot_notifications language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.create_notification(p_report_id,p_type,p_title,p_message) $$;
create or replace function public.pilot_mark_notification_read(p_notification_id uuid)
returns public.pilot_notifications language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.mark_notification_read(p_notification_id) $$;
revoke all on function pilot_private.add_report_note(uuid,text), pilot_private.create_notification(uuid,public.pilot_notification_type,text,text), pilot_private.mark_notification_read(uuid) from public, anon;
grant execute on function pilot_private.add_report_note(uuid,text), pilot_private.create_notification(uuid,public.pilot_notification_type,text,text), pilot_private.mark_notification_read(uuid) to authenticated, service_role;
revoke all on function public.pilot_add_report_note(uuid,text), public.pilot_create_notification(uuid,public.pilot_notification_type,text,text), public.pilot_mark_notification_read(uuid) from public, anon;
grant execute on function public.pilot_add_report_note(uuid,text), public.pilot_create_notification(uuid,public.pilot_notification_type,text,text), public.pilot_mark_notification_read(uuid) to authenticated;