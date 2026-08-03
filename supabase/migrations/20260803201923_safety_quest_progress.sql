create table if not exists public.safety_quest_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  quest_version text not null default '2026.08' check (char_length(quest_version) between 1 and 20),
  current_checkpoint integer not null default 0 check (current_checkpoint between 0 and 8),
  score integer not null default 0 check (score between 0 and 8),
  attempts integer not null default 0 check (attempts >= 0),
  answers jsonb not null default '{}'::jsonb check (
    jsonb_typeof(answers) = 'object'
    and octet_length(answers::text) <= 16000
  ),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint safety_quest_completion_consistent check (
    completed_at is null or current_checkpoint = 8
  )
);

create or replace function private.touch_safety_quest_updated_at()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists safety_quest_touch_updated_at on public.safety_quest_progress;
create trigger safety_quest_touch_updated_at
before update on public.safety_quest_progress
for each row execute function private.touch_safety_quest_updated_at();

alter table public.safety_quest_progress enable row level security;

drop policy if exists safety_quest_owner_select on public.safety_quest_progress;
create policy safety_quest_owner_select
on public.safety_quest_progress for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists safety_quest_owner_insert on public.safety_quest_progress;
create policy safety_quest_owner_insert
on public.safety_quest_progress for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists safety_quest_owner_update on public.safety_quest_progress;
create policy safety_quest_owner_update
on public.safety_quest_progress for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

revoke all on table public.safety_quest_progress from anon;
revoke all on table public.safety_quest_progress from authenticated;
grant select, insert, update on table public.safety_quest_progress to authenticated;

comment on table public.safety_quest_progress is
  'Owner-scoped, cross-device progress for the educational CCSF Safety Quest.';