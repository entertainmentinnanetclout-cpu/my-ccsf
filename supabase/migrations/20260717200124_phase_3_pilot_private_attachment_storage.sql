insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'pilot-report-attachments',
  'pilot-report-attachments',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','video/mp4','application/pdf']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists pilot_attachment_objects_insert on storage.objects;
drop policy if exists pilot_attachment_objects_select on storage.objects;
drop policy if exists pilot_attachment_objects_update on storage.objects;
drop policy if exists pilot_attachment_objects_delete on storage.objects;

create policy pilot_attachment_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='pilot-report-attachments'
  and name ~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
  and split_part(name,'/',3)=(select auth.uid())::text
  and exists(
    select 1 from public.pilot_reports pr
    where pr.id::text=split_part(name,'/',4)
      and pr.program_id::text=split_part(name,'/',1)
      and pr.campus::text=split_part(name,'/',2)
      and pr.submitted_by=(select auth.uid())
  )
);

create policy pilot_attachment_objects_select
on storage.objects for select to authenticated
using (
  bucket_id='pilot-report-attachments'
  and name ~ '^[0-9a-f-]{36}/[a-z0-9_]+/[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
  and exists(
    select 1 from public.pilot_reports pr
    where pr.id::text=split_part(name,'/',4)
      and pr.program_id::text=split_part(name,'/',1)
      and pr.campus::text=split_part(name,'/',2)
      and private.pilot_can_access_report((select auth.uid()),pr.id)
  )
);