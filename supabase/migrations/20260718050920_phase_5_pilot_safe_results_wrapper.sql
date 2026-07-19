create or replace function public.pilot_safe_results(p_program_id uuid,p_campus public.campus_location default null)
returns jsonb language sql security invoker set search_path=public,pilot_private
as $$ select pilot_private.export_data(p_program_id,p_campus,false) $$;
revoke all on function public.pilot_safe_results(uuid,public.campus_location) from public,anon;
grant execute on function public.pilot_safe_results(uuid,public.campus_location) to authenticated;