create or replace function public.runtime_feature_map(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_result jsonb := '{}'::jsonb;
begin
  for r in select key from public.feature_flags order by key loop
    v_result := v_result || jsonb_build_object(r.key, public.effective_feature_enabled(r.key, p_user_id));
  end loop;
  return v_result;
end;
$$;
revoke all on function public.runtime_feature_map(uuid) from public, anon, authenticated;
grant execute on function public.runtime_feature_map(uuid) to service_role;
