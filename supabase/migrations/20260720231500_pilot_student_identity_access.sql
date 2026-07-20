create or replace function public.pilot_get_student_identities(p_user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  campus public.campus_location,
  student_number text,
  course text,
  year_of_study integer,
  residence public.residence_name,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text
)
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p.id,
    p.full_name,
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number,
    p.campus,
    p.student_number,
    p.course,
    p.year_of_study,
    p.residence,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.emergency_contact_relationship
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(coalesce(p_user_ids, array[]::uuid[]))
    and (
      p.id = auth.uid()
      or private.pilot_is_super_admin(auth.uid())
      or (
        private.pilot_is_security(auth.uid())
        and p.campus = private.pilot_user_campus(auth.uid())
        and exists (
          select 1
          from public.pilot_participants pp
          where pp.user_id = p.id
            and pp.campus = private.pilot_user_campus(auth.uid())
        )
      )
    )
  order by coalesce(nullif(trim(p.full_name), ''), p.student_number, p.email);
$$;

revoke all on function public.pilot_get_student_identities(uuid[]) from public;
grant execute on function public.pilot_get_student_identities(uuid[]) to authenticated;

comment on function public.pilot_get_student_identities(uuid[]) is
  'Returns student profile details only to the student, a super admin, or campus security assigned to the same campus and authorised Pilot participants.';
