-- Phase 2 replaces the incomplete transfer workflow with checked-in canonical assets.
-- Fail closed if the bucket unexpectedly contains data so no uploaded asset is deleted.
do $$
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'chatgpt-brand-transfer'
  ) then
    raise exception 'chatgpt-brand-transfer is not empty; preserve and review its objects before bucket removal';
  end if;

  delete from storage.buckets
  where id = 'chatgpt-brand-transfer';
end
$$;
