-- Consolidate overlapping policies without changing intended access semantics.

-- Accredited residences
 drop policy if exists "Admins can manage residences" on public.accredited_residences;
 drop policy if exists "Authenticated users can view accredited residences" on public.accredited_residences;
 create policy "Users view accredited residences and admins view all"
 on public.accredited_residences for select to authenticated
 using (is_accredited = true or public.is_super_admin((select auth.uid())));
 create policy "Admins insert residences"
 on public.accredited_residences for insert to authenticated
 with check (public.is_super_admin((select auth.uid())));
 create policy "Admins update residences"
 on public.accredited_residences for update to authenticated
 using (public.is_super_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())));
 create policy "Admins delete residences"
 on public.accredited_residences for delete to authenticated
 using (public.is_super_admin((select auth.uid())));

-- Admin access
 drop policy if exists "Super admins can view all access" on public.admin_access;
 drop policy if exists "Super and head admins can manage access" on public.admin_access;
 create policy "Authorised staff view admin access"
 on public.admin_access for select to authenticated
 using (
   public.is_super_admin((select auth.uid()))
   or admin_id = (select auth.uid())
   or (
     public.is_head_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
   )
 );
 create policy "Authorised staff insert admin access"
 on public.admin_access for insert to authenticated
 with check (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_head_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
     and is_head = false
   )
 );
 create policy "Authorised staff update admin access"
 on public.admin_access for update to authenticated
 using (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_head_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
     and is_head = false
   )
 )
 with check (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_head_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
     and is_head = false
   )
 );
 create policy "Authorised staff delete admin access"
 on public.admin_access for delete to authenticated
 using (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_head_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
     and is_head = false
   )
 );

-- Announcements
 drop policy if exists "Anyone can view announcements" on public.announcements;
 drop policy if exists "Enable read access for all users" on public.announcements;
 drop policy if exists "Authenticated admins can manage announcements" on public.announcements;
 create policy "Anyone can view announcements"
 on public.announcements for select to public using (true);
 create policy "Staff insert announcements"
 on public.announcements for insert to authenticated
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff update announcements"
 on public.announcements for update to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff delete announcements"
 on public.announcements for delete to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));

-- Campus police stations
 drop policy if exists "Admins can manage police stations" on public.campus_police_stations;
 drop policy if exists "Anyone can view police stations" on public.campus_police_stations;
 create policy "Anyone can view police stations"
 on public.campus_police_stations for select to public using (true);
 create policy "Admins insert police stations"
 on public.campus_police_stations for insert to authenticated
 with check (public.is_super_admin((select auth.uid())));
 create policy "Admins update police stations"
 on public.campus_police_stations for update to authenticated
 using (public.is_super_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())));
 create policy "Admins delete police stations"
 on public.campus_police_stations for delete to authenticated
 using (public.is_super_admin((select auth.uid())));

-- Carousel images
 drop policy if exists "Authenticated admins can manage carousel images" on public.carousel_images;
 create policy "Staff insert carousel images"
 on public.carousel_images for insert to authenticated
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff update carousel images"
 on public.carousel_images for update to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff delete carousel images"
 on public.carousel_images for delete to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));

-- Case escalations
 drop policy if exists "Super admins can manage escalations" on public.case_escalations;
 drop policy if exists "Security staff can view campus escalations" on public.case_escalations;
 create policy "Authorised staff view escalations"
 on public.case_escalations for select to authenticated
 using (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_campus_admin((select auth.uid()))
     and exists (
       select 1 from public.incidents i
       where i.id = case_escalations.incident_id
         and i.campus = public.get_user_campus((select auth.uid()))
     )
   )
 );
 create policy "Super admins insert escalations"
 on public.case_escalations for insert to authenticated
 with check (public.is_super_admin((select auth.uid())));
 create policy "Super admins update escalations"
 on public.case_escalations for update to authenticated
 using (public.is_super_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())));
 create policy "Super admins delete escalations"
 on public.case_escalations for delete to authenticated
 using (public.is_super_admin((select auth.uid())));

-- Case updates
 drop policy if exists "Authorised staff can view case updates" on public.case_updates;
 drop policy if exists "Reporters can view case updates on their incidents" on public.case_updates;
 create policy "Authorised users view case updates"
 on public.case_updates for select to authenticated
 using (
   public.is_super_admin((select auth.uid()))
   or (
     public.is_campus_admin((select auth.uid()))
     and exists (
       select 1 from public.incidents i
       where i.id = case_updates.incident_id
         and i.campus = public.get_user_campus((select auth.uid()))
     )
   )
   or exists (
     select 1 from public.incidents i
     where i.id = case_updates.incident_id
       and (i.reporter_id = (select auth.uid()) or i.submitted_by = (select auth.uid()))
   )
 );

-- Profiles
 drop policy if exists "Campus admins can view campus students" on public.profiles;
 drop policy if exists "Super admins can view all profiles" on public.profiles;
 drop policy if exists "Users can view own profile" on public.profiles;
 create policy "Users view permitted profiles"
 on public.profiles for select to authenticated
 using (
   id = (select auth.uid())
   or public.is_super_admin((select auth.uid()))
   or (
     public.is_campus_admin((select auth.uid()))
     and campus = public.get_user_campus((select auth.uid()))
     and public.has_role(id, 'student'::public.user_role)
   )
 );

-- Wi-Fi access points
 drop policy if exists "Admins can manage wifi access points" on public.wifi_access_points;
 create policy "Staff insert wifi access points"
 on public.wifi_access_points for insert to authenticated
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff update wifi access points"
 on public.wifi_access_points for update to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())))
 with check (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));
 create policy "Staff delete wifi access points"
 on public.wifi_access_points for delete to authenticated
 using (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())));

-- Normalize auth.uid() evaluation in all remaining public RLS policies.
do $$
declare
  p record;
  new_qual text;
  new_check text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, '( SELECT auth.uid() AS uid)', '__AUTH_UID__');
      new_qual := replace(new_qual, '(select auth.uid())', '__AUTH_UID__');
      new_qual := replace(new_qual, 'auth.uid()', '__AUTH_UID__');
      new_qual := replace(new_qual, '__AUTH_UID__', '(select auth.uid())');
    end if;

    if new_check is not null then
      new_check := replace(new_check, '( SELECT auth.uid() AS uid)', '__AUTH_UID__');
      new_check := replace(new_check, '(select auth.uid())', '__AUTH_UID__');
      new_check := replace(new_check, 'auth.uid()', '__AUTH_UID__');
      new_check := replace(new_check, '__AUTH_UID__', '(select auth.uid())');
    end if;

    if p.cmd in ('SELECT', 'DELETE') and new_qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, new_qual);
    elsif p.cmd = 'INSERT' and new_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, new_check);
    elsif p.cmd in ('UPDATE', 'ALL') then
      if new_qual is not null and new_check is not null then
        execute format('alter policy %I on %I.%I using (%s) with check (%s)', p.policyname, p.schemaname, p.tablename, new_qual, new_check);
      elsif new_qual is not null then
        execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, new_qual);
      elsif new_check is not null then
        execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, new_check);
      end if;
    end if;
  end loop;
end;
$$;