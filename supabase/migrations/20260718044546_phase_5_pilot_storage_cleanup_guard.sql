create or replace function pilot_private.assert_storage_paths_cleared(p_paths text[])
returns void
language plpgsql
security definer
set search_path=public,storage,pilot_private
as $$
begin
  if coalesce(cardinality(p_paths),0)=0 then return; end if;
  if exists(
    select 1 from storage.objects
    where bucket_id='pilot-report-attachments' and name=any(p_paths)
  ) then
    raise exception 'Pilot attachment storage cleanup is incomplete';
  end if;
end $$;

revoke all on function pilot_private.assert_storage_paths_cleared(text[]) from public, anon, authenticated;
grant execute on function pilot_private.assert_storage_paths_cleared(text[]) to service_role;