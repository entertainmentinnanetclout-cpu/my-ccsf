alter table public.pilot_sessions
  alter column expires_at set default (now() + interval '7 days');

create or replace function private.pilot_validate_session()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_participant public.pilot_participants%rowtype;
  v_program public.pilot_programs%rowtype;
begin
  select * into v_participant from public.pilot_participants where id=new.participant_id;
  if not found then raise exception 'Pilot participant not found'; end if;
  if v_participant.program_id<>new.program_id or v_participant.user_id<>new.user_id or v_participant.campus<>new.campus then
    raise exception 'Session does not match participant';
  end if;
  if v_participant.status not in ('consented','active') then
    raise exception 'Participant is not authorised to start a session';
  end if;

  select * into v_program from public.pilot_programs where id=new.program_id;
  if v_program.status<>'active'
    or (v_program.starts_at is not null and v_program.starts_at>now())
    or (v_program.ends_at is not null and v_program.ends_at<now()) then
    raise exception 'Pilot programme is not active';
  end if;

  if new.expires_at is null then
    new.expires_at:=now()+interval '7 days';
  end if;
  return new;
end
$$;

update public.pilot_sessions s
set expires_at = greatest(s.expires_at, now() + interval '7 days'),
    updated_at = now()
from public.pilot_participants pp,
     public.pilot_programs pg
where s.participant_id = pp.id
  and s.program_id = pg.id
  and s.status = 'in_progress'
  and pp.status in ('consented','active')
  and pg.status = 'active'
  and (pg.starts_at is null or pg.starts_at <= now())
  and (pg.ends_at is null or pg.ends_at >= now());
