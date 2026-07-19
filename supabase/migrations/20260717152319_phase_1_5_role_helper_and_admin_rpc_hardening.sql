create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
  caller_is_security boolean := false;
  caller_campus public.campus_location;
  target_campus public.campus_location;
begin
  if caller_id is null then
    return false;
  end if;

  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'admin'
  ) into caller_is_admin;

  if _user_id <> caller_id and not caller_is_admin then
    select exists (
      select 1 from public.user_roles
      where user_id = caller_id and role = 'security'
    ) into caller_is_security;

    if not caller_is_security then
      return false;
    end if;

    select campus into caller_campus from public.profiles where id = caller_id;
    select campus into target_campus from public.profiles where id = _user_id;

    if caller_campus is null or target_campus is distinct from caller_campus then
      return false;
    end if;
  end if;

  return exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
end;
$$;

create or replace function public.get_user_campus(_user_id uuid)
returns public.campus_location
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := false;
  caller_is_security boolean := false;
  caller_campus public.campus_location;
  target_campus public.campus_location;
begin
  if caller_id is null then
    return null;
  end if;

  select campus into target_campus from public.profiles where id = _user_id;

  if _user_id = caller_id then
    return target_campus;
  end if;

  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'admin'
  ) into caller_is_admin;

  if caller_is_admin then
    return target_campus;
  end if;

  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'security'
  ) into caller_is_security;
  select campus into caller_campus from public.profiles where id = caller_id;

  if caller_is_security and caller_campus is not null and target_campus = caller_campus then
    return target_campus;
  end if;

  return null;
end;
$$;

create or replace function public.get_user_role(_user_id uuid)
returns public.user_role
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    _user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
    or (
      exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'security'
      )
      and (select campus from public.profiles where id = _user_id)
          = (select campus from public.profiles where id = auth.uid())
    )
  ) then
    return null;
  end if;

  return (
    select role
    from public.user_roles
    where user_id = _user_id
    order by case
      when role = 'admin' then 1
      when role = 'security' then 2
      else 3
    end
    limit 1
  );
end;
$$;

create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'admin'::public.user_role)
$$;

create or replace function public.is_campus_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, 'security'::public.user_role)
$$;

create or replace function public.is_head_admin(_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    _user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
    or (
      exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'security'
      )
      and (select campus from public.profiles where id = _user_id)
          = (select campus from public.profiles where id = auth.uid())
    )
  ) then
    return false;
  end if;

  return exists (
    select 1 from public.admin_access
    where admin_id = _user_id and is_head = true
  );
end;
$$;

create or replace function public.has_campus_access(_user_id uuid, _campus public.campus_location)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    _user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  ) then
    return false;
  end if;

  return exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'admin'
  ) or exists (
    select 1 from public.admin_access
    where admin_id = _user_id and campus = _campus
  );
end;
$$;

create or replace function public.assign_campus_admin(
  p_user_id uuid,
  p_campus public.campus_location,
  p_is_head boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean;
  caller_is_head_for_campus boolean;
begin
  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'admin'
  ) into caller_is_admin;

  select exists (
    select 1 from public.admin_access
    where admin_id = caller_id and campus = p_campus and is_head = true
  ) into caller_is_head_for_campus;

  if not caller_is_admin and not caller_is_head_for_campus then
    raise exception 'Not authorised to assign officers for this campus';
  end if;

  if p_is_head and not caller_is_admin then
    raise exception 'Only super admins can assign campus heads';
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, 'security')
  on conflict do nothing;

  insert into public.admin_access (admin_id, campus, is_head)
  values (p_user_id, p_campus, p_is_head)
  on conflict (admin_id, campus)
  do update set is_head = excluded.is_head;

  update public.profiles
  set campus = p_campus
  where id = p_user_id;
end;
$$;

create or replace function public.remove_campus_admin(
  p_user_id uuid,
  p_campus public.campus_location
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean;
  caller_is_head_for_campus boolean;
  target_is_head boolean;
begin
  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'admin'
  ) into caller_is_admin;

  select exists (
    select 1 from public.admin_access
    where admin_id = caller_id and campus = p_campus and is_head = true
  ) into caller_is_head_for_campus;

  select coalesce(is_head, false)
  into target_is_head
  from public.admin_access
  where admin_id = p_user_id and campus = p_campus;

  if not caller_is_admin and not caller_is_head_for_campus then
    raise exception 'Not authorised to remove officers for this campus';
  end if;

  if target_is_head and not caller_is_admin then
    raise exception 'Only super admins can remove campus heads';
  end if;

  delete from public.admin_access
  where admin_id = p_user_id and campus = p_campus;
end;
$$;

create or replace function public.get_security_officers(
  p_campus public.campus_location default null
)
returns table(id uuid, full_name text, email text, campus public.campus_location)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean;
  caller_campus public.campus_location;
  effective_campus public.campus_location;
begin
  select exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'admin'
  ) into caller_is_admin;

  select p.campus into caller_campus
  from public.profiles p
  where p.id = caller_id;

  if caller_is_admin then
    effective_campus := p_campus;
  elsif exists (
    select 1 from public.user_roles
    where user_id = caller_id and role = 'security'
  ) then
    if p_campus is not null and p_campus is distinct from caller_campus then
      raise exception 'Campus officers may only view officers for their campus';
    end if;
    effective_campus := caller_campus;
  else
    raise exception 'Not authorised to view security officers';
  end if;

  return query
  select p.id, p.full_name, p.email, p.campus
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role = 'security'
    and (effective_campus is null or p.campus = effective_campus);
end;
$$;

revoke execute on function public.ensure_all_staff_room() from public, anon, authenticated;
grant execute on function public.ensure_all_staff_room() to service_role;

revoke execute on function public.has_role(uuid, public.user_role) from public, anon;
revoke execute on function public.get_user_campus(uuid) from public, anon;
revoke execute on function public.get_user_role(uuid) from public, anon;
revoke execute on function public.is_super_admin(uuid) from public, anon;
revoke execute on function public.is_campus_admin(uuid) from public, anon;
revoke execute on function public.is_head_admin(uuid) from public, anon;
revoke execute on function public.has_campus_access(uuid, public.campus_location) from public, anon;
revoke execute on function public.get_security_officers(public.campus_location) from public, anon;
revoke execute on function public.assign_campus_admin(uuid, public.campus_location, boolean) from public, anon;
revoke execute on function public.remove_campus_admin(uuid, public.campus_location) from public, anon;

grant execute on function public.has_role(uuid, public.user_role) to authenticated;
grant execute on function public.get_user_campus(uuid) to authenticated;
grant execute on function public.get_user_role(uuid) to authenticated;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.is_campus_admin(uuid) to authenticated;
grant execute on function public.is_head_admin(uuid) to authenticated;
grant execute on function public.has_campus_access(uuid, public.campus_location) to authenticated;
grant execute on function public.get_security_officers(public.campus_location) to authenticated;
grant execute on function public.assign_campus_admin(uuid, public.campus_location, boolean) to authenticated;
grant execute on function public.remove_campus_admin(uuid, public.campus_location) to authenticated;