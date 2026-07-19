create or replace function public.pilot_staff_message(p_report_id uuid,p_kind public.pilot_notification_type,p_title text,p_content text)
returns public.pilot_notifications
language sql
security invoker
set search_path=public,pilot_private
as $$ select pilot_private.create_notification(p_report_id,p_kind,p_title,p_content) $$;
revoke all on function public.pilot_staff_message(uuid,public.pilot_notification_type,text,text) from public,anon;
grant execute on function public.pilot_staff_message(uuid,public.pilot_notification_type,text,text) to authenticated;