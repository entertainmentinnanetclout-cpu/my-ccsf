drop policy if exists "Staff can upload private chat media" on storage.objects;
drop policy if exists "Staff can view private chat media" on storage.objects;
drop policy if exists "Staff can delete private chat media" on storage.objects;
drop policy if exists "Room members can upload private chat media" on storage.objects;
drop policy if exists "Room members can view private chat media" on storage.objects;
drop policy if exists "Upload owners can delete private chat media" on storage.objects;

create policy "Room members can upload private chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (
    is_super_admin((select auth.uid()))
    or exists (
      select 1
      from public.chat_room_members membership
      where membership.room_id = ((storage.foldername(storage.objects.name))[1])::uuid
        and membership.user_id = (select auth.uid())
    )
  )
);

create policy "Room members can view private chat media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (
    is_super_admin((select auth.uid()))
    or exists (
      select 1
      from public.chat_room_members membership
      where membership.room_id = ((storage.foldername(storage.objects.name))[1])::uuid
        and membership.user_id = (select auth.uid())
    )
  )
);

create policy "Upload owners can delete private chat media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (
    is_super_admin((select auth.uid()))
    or (
      (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1
        from public.chat_room_members membership
        where membership.room_id = ((storage.foldername(storage.objects.name))[1])::uuid
          and membership.user_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "Admins can upload carousel images" on storage.objects;
drop policy if exists "Admins can update carousel images" on storage.objects;
drop policy if exists "Admins can delete carousel images" on storage.objects;
drop policy if exists "Scoped staff upload carousel images" on storage.objects;
drop policy if exists "Scoped staff update carousel images" on storage.objects;
drop policy if exists "Scoped staff delete carousel images" on storage.objects;

create policy "Scoped staff upload carousel images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'carousel-images'
  and (
    is_super_admin((select auth.uid()))
    or (
      is_campus_admin((select auth.uid()))
      and (storage.foldername(name))[1] = get_user_campus((select auth.uid()))::text
    )
  )
);

create policy "Scoped staff update carousel images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'carousel-images'
  and (
    is_super_admin((select auth.uid()))
    or (
      is_campus_admin((select auth.uid()))
      and (storage.foldername(name))[1] = get_user_campus((select auth.uid()))::text
    )
  )
)
with check (
  bucket_id = 'carousel-images'
  and (
    is_super_admin((select auth.uid()))
    or (
      is_campus_admin((select auth.uid()))
      and (storage.foldername(name))[1] = get_user_campus((select auth.uid()))::text
    )
  )
);

create policy "Scoped staff delete carousel images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'carousel-images'
  and (
    is_super_admin((select auth.uid()))
    or (
      is_campus_admin((select auth.uid()))
      and (storage.foldername(name))[1] = get_user_campus((select auth.uid()))::text
    )
  )
);
