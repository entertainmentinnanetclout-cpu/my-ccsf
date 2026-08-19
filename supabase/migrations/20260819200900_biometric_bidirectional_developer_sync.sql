-- Keep account biometric credentials and Developer step-up credentials in sync.
-- pg_trigger_depth() prevents the two directional triggers from recursively
-- updating the same credential row.

create or replace function public.sync_developer_biometric_login_credential()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_enabled boolean := false;
  v_owner boolean := false;
begin
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    v_user_id := old.developer_id;
    delete from public.account_biometric_credentials
    where user_id = old.developer_id
      and credential_id = old.credential_id;
  else
    v_user_id := new.developer_id;
    insert into public.account_biometric_credentials (
      user_id, credential_id, public_key_base64url, counter, device_type,
      backed_up, transports, rp_id, friendly_name, enabled,
      created_at, last_used_at, updated_at
    ) values (
      new.developer_id, new.credential_id, new.public_key_base64url, new.counter,
      new.device_type, new.backed_up, new.transports, new.rp_id,
      coalesce(new.friendly_name, 'Developer biometric device'), new.enabled,
      new.created_at, new.last_used_at, now()
    )
    on conflict (credential_id) do update
    set public_key_base64url = excluded.public_key_base64url,
        counter = excluded.counter,
        device_type = excluded.device_type,
        backed_up = excluded.backed_up,
        transports = excluded.transports,
        rp_id = excluded.rp_id,
        friendly_name = excluded.friendly_name,
        enabled = excluded.enabled,
        last_used_at = excluded.last_used_at,
        updated_at = now()
    where public.account_biometric_credentials.user_id = excluded.user_id;
  end if;

  select exists (
    select 1 from public.account_biometric_credentials
    where user_id = v_user_id and enabled = true
  ) into v_enabled;

  insert into public.account_biometric_preferences (user_id, login_enabled, updated_at)
  values (v_user_id, v_enabled, now())
  on conflict (user_id) do update
  set login_enabled = excluded.login_enabled,
      updated_at = now();

  select coalesce(is_owner, false)
  into v_owner
  from public.developer_access
  where user_id = v_user_id;

  if v_owner then
    update public.runtime_controls
    set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('developer_biometric_required', v_enabled),
        updated_by = v_user_id,
        updated_at = now()
    where key = 'system';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.sync_developer_biometric_login_credential() from public, anon, authenticated;
grant execute on function public.sync_developer_biometric_login_credential() to service_role;

create or replace function public.sync_account_biometric_developer_credential()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_is_developer boolean := false;
  v_owner boolean := false;
  v_enabled boolean := false;
  v_webauthn_user_id text;
begin
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;

  select true, coalesce(is_owner, false)
  into v_is_developer, v_owner
  from public.developer_access
  where user_id = v_user_id;

  if not coalesce(v_is_developer, false) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    delete from public.developer_biometric_credentials
    where developer_id = old.user_id
      and credential_id = old.credential_id;
  else
    v_webauthn_user_id := rtrim(
      translate(encode(convert_to(new.user_id::text, 'UTF8'), 'base64'), '+/', '-_'),
      '='
    );

    insert into public.developer_biometric_credentials (
      developer_id, credential_id, public_key_base64url, webauthn_user_id,
      counter, device_type, backed_up, transports, rp_id, friendly_name,
      enabled, created_at, last_used_at, updated_at
    ) values (
      new.user_id, new.credential_id, new.public_key_base64url, v_webauthn_user_id,
      new.counter, new.device_type, new.backed_up, new.transports, new.rp_id,
      coalesce(new.friendly_name, 'Developer biometric device'), new.enabled,
      new.created_at, new.last_used_at, now()
    )
    on conflict (credential_id) do update
    set public_key_base64url = excluded.public_key_base64url,
        webauthn_user_id = excluded.webauthn_user_id,
        counter = excluded.counter,
        device_type = excluded.device_type,
        backed_up = excluded.backed_up,
        transports = excluded.transports,
        rp_id = excluded.rp_id,
        friendly_name = excluded.friendly_name,
        enabled = excluded.enabled,
        last_used_at = excluded.last_used_at,
        updated_at = now()
    where public.developer_biometric_credentials.developer_id = excluded.developer_id;
  end if;

  select exists (
    select 1
    from public.developer_biometric_credentials
    where developer_id = v_user_id and enabled = true
  ) into v_enabled;

  if v_owner then
    update public.runtime_controls
    set config = coalesce(config, '{}'::jsonb) || jsonb_build_object('developer_biometric_required', v_enabled),
        updated_by = v_user_id,
        updated_at = now()
    where key = 'system';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.sync_account_biometric_developer_credential() from public, anon, authenticated;
grant execute on function public.sync_account_biometric_developer_credential() to service_role;

drop trigger if exists sync_account_biometric_developer_credential_trigger
  on public.account_biometric_credentials;
create trigger sync_account_biometric_developer_credential_trigger
after insert or update or delete on public.account_biometric_credentials
for each row execute function public.sync_account_biometric_developer_credential();
