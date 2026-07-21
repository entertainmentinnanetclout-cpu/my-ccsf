-- Restrict Phase 3-5 SECURITY DEFINER RPCs to authenticated callers only.

revoke all on function public.pilot_get_student_identities(uuid[]) from public, anon;
revoke all on function public.pilot_get_guide_preferences() from public, anon;
revoke all on function public.pilot_update_guide_preferences(integer,boolean,boolean,boolean,boolean) from public, anon;
revoke all on function public.pilot_submit_review(integer,text,text[],text,uuid,text,jsonb,boolean,uuid) from public, anon;
revoke all on function public.pilot_moderate_review(uuid,public.pilot_review_status,text) from public, anon;

grant execute on function public.pilot_get_student_identities(uuid[]) to authenticated;
grant execute on function public.pilot_get_guide_preferences() to authenticated;
grant execute on function public.pilot_update_guide_preferences(integer,boolean,boolean,boolean,boolean) to authenticated;
grant execute on function public.pilot_submit_review(integer,text,text[],text,uuid,text,jsonb,boolean,uuid) to authenticated;
grant execute on function public.pilot_moderate_review(uuid,public.pilot_review_status,text) to authenticated;
