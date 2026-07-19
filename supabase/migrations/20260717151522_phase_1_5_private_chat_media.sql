update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']::text[]
where id = 'chat-media';

drop policy if exists "Anyone can view chat media" on storage.objects;
drop policy if exists "Staff can upload chat media" on storage.objects;
drop policy if exists "Staff can delete own chat media" on storage.objects;
drop policy if exists "Staff can upload private chat media" on storage.objects;
drop policy if exists "Staff can view private chat media" on storage.objects;
drop policy if exists "Staff can delete private chat media" on storage.objects;

create policy "Staff can upload private chat media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())))
);

create policy "Staff can view private chat media"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-media'
  and (public.is_super_admin((select auth.uid())) or public.is_campus_admin((select auth.uid())))
);

create policy "Staff can delete private chat media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_super_admin((select auth.uid()))
  )
);