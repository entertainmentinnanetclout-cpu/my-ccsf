create or replace function public.prevent_developer_operational_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.developer_access da
    where da.user_id = new.user_id
  ) then
    raise exception 'Developer accounts cannot be assigned Student, CPS/Security, or Admin portal roles.';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_developer_operational_role() from public, anon, authenticated;

drop trigger if exists prevent_developer_operational_role_trigger on public.user_roles;
create trigger prevent_developer_operational_role_trigger
before insert or update of user_id, role on public.user_roles
for each row execute function public.prevent_developer_operational_role();

create or replace function public.clear_operational_roles_for_developer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.user_roles where user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.clear_operational_roles_for_developer() from public, anon, authenticated;

drop trigger if exists clear_operational_roles_for_developer_trigger on public.developer_access;
create trigger clear_operational_roles_for_developer_trigger
after insert on public.developer_access
for each row execute function public.clear_operational_roles_for_developer();
