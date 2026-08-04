-- Prepare any existing community sports-team records for the v2 lifecycle.
-- This migration intentionally runs immediately before 20260804214500.

alter table public.sports_teams
  drop constraint if exists sports_teams_status_check;

update public.sports_teams
set status = case
  when status in ('approved','ready_for_submission','under_review') then 'activated'
  when status = 'waitlisted' then 'waitlisted'
  when status = 'withdrawn' then 'withdrawn'
  else 'recruiting'
end
where status not in ('recruiting','activated','waitlisted','draw_published','withdrawn');

alter table public.sports_teams
  alter column status set default 'recruiting';
