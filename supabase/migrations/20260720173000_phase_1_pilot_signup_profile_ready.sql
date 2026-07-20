create or replace function private.mark_pilot_signup_profile_ready()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
begin
  if exists (
    select 1
    from auth.users u
    where u.id = new.id
      and coalesce(u.raw_user_meta_data ->> 'pilot_signup', 'false') = 'true'
  ) then
    new.profile_completed := true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_mark_pilot_signup_profile_ready on public.profiles;
create trigger trg_mark_pilot_signup_profile_ready
before insert or update of profile_completed on public.profiles
for each row
execute function private.mark_pilot_signup_profile_ready();

update public.profiles p
set profile_completed = true
where coalesce(p.profile_completed, false) = false
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
      and coalesce(u.raw_user_meta_data ->> 'pilot_signup', 'false') = 'true'
  );
