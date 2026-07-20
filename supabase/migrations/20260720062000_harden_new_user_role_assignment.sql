create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_campus campus_location;
begin
  user_campus := nullif(new.raw_user_meta_data->>'campus', '')::campus_location;

  insert into public.profiles (id, email, full_name, student_number, campus)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'student_number', ''),
    user_campus
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'student');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates a student profile and student role for public signups. Privileged roles are never accepted from user-editable auth metadata and must be assigned administratively.';
