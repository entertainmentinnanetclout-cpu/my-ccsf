alter table public.incidents
  alter column submitted_by set default auth.uid();

create or replace function public.set_incident_submitter()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.submitted_by is null then
    new.submitted_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_incident_submitter_before_insert on public.incidents;
create trigger set_incident_submitter_before_insert
before insert on public.incidents
for each row execute function public.set_incident_submitter();

revoke all on function public.set_incident_submitter() from public, anon, authenticated;
grant execute on function public.set_incident_submitter() to postgres, service_role;