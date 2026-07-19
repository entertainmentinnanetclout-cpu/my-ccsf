insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chatgpt-brand-transfer', 'chatgpt-brand-transfer', true, 1048576, array['image/png'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "temporary brand transfer insert" on storage.objects;
create policy "temporary brand transfer insert"
on storage.objects for insert to anon
with check (bucket_id = 'chatgpt-brand-transfer' and name = 'ccsf-canonical-logo.png');

drop policy if exists "temporary brand transfer delete" on storage.objects;
create policy "temporary brand transfer delete"
on storage.objects for delete to anon
using (bucket_id = 'chatgpt-brand-transfer' and name = 'ccsf-canonical-logo.png');