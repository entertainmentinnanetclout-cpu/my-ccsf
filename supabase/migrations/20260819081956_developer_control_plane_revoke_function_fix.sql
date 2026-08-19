create or replace function public.developer_revoke_session(target_session_id uuid, revoke_reason text default 'Revoked by developer')
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
<<fn>>
declare
  v_user_id uuid;
begin
  if not public.is_developer(auth.uid()) then
    raise exception 'Developer access required' using errcode = '42501';
  end if;

  select s.user_id into v_user_id from auth.sessions s where s.id = target_session_id;
  if v_user_id is null then return false; end if;

  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by)
  values (target_session_id,v_user_id,fn.revoke_reason,auth.uid())
  on conflict (session_id) do update
    set reason = excluded.reason, revoked_by = excluded.revoked_by, revoked_at = now();

  update public.device_registry dr
  set revoked_at = now(), revoke_reason = fn.revoke_reason
  where dr.auth_session_id = target_session_id;

  insert into public.developer_audit_logs(developer_id,action,target_type,target_id,details)
  values (auth.uid(),'revoke_session','session',target_session_id::text,jsonb_build_object('reason',fn.revoke_reason,'user_id',v_user_id));

  return true;
end;
$$;

create or replace function public.developer_revoke_user_sessions(target_user_id uuid, revoke_reason text default 'Revoked by developer')
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
<<fn>>
declare
  v_count integer;
begin
  if not public.is_developer(auth.uid()) then
    raise exception 'Developer access required' using errcode = '42501';
  end if;

  insert into public.revoked_auth_sessions(session_id,user_id,reason,revoked_by)
  select s.id,s.user_id,fn.revoke_reason,auth.uid()
  from auth.sessions s
  where s.user_id = target_user_id
  on conflict (session_id) do update
    set reason = excluded.reason, revoked_by = excluded.revoked_by, revoked_at = now();

  get diagnostics v_count = row_count;

  update public.device_registry dr
  set revoked_at = now(), revoke_reason = fn.revoke_reason
  where dr.user_id = target_user_id;

  insert into public.developer_audit_logs(developer_id,action,target_type,target_id,details)
  values (auth.uid(),'revoke_user_sessions','user',target_user_id::text,jsonb_build_object('reason',fn.revoke_reason,'session_count',v_count));

  return v_count;
end;
$$;
