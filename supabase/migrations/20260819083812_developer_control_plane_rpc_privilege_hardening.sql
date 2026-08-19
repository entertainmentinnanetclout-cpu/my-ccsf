-- Remove direct anonymous access to developer control-plane SECURITY DEFINER functions.
-- Developer data/session mutation RPCs are subsequently moved behind the service-role Edge Function.

revoke all on function public.current_app_access_allowed() from public, anon;
grant execute on function public.current_app_access_allowed() to authenticated, service_role;

revoke all on function public.is_developer(uuid) from public, anon;
grant execute on function public.is_developer(uuid) to authenticated, service_role;

revoke all on function public.is_developer_owner(uuid) from public, anon;
grant execute on function public.is_developer_owner(uuid) to authenticated, service_role;

revoke all on function public.ensure_new_user_access() from public, anon, authenticated;

revoke all on function public.developer_user_overview() from public, anon, authenticated;
grant execute on function public.developer_user_overview() to service_role;

revoke all on function public.developer_session_overview() from public, anon, authenticated;
grant execute on function public.developer_session_overview() to service_role;

revoke all on function public.developer_revoke_session(uuid,text) from public, anon, authenticated;
grant execute on function public.developer_revoke_session(uuid,text) to service_role;

revoke all on function public.developer_revoke_user_sessions(uuid,text) from public, anon, authenticated;
grant execute on function public.developer_revoke_user_sessions(uuid,text) to service_role;
