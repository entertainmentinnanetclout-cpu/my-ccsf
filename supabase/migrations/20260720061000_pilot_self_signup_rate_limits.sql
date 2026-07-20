create table if not exists public.pilot_signup_attempts (
  id bigint generated always as identity primary key,
  fingerprint_hash text not null check (fingerprint_hash ~ '^[0-9a-f]{64}$'),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.pilot_signup_attempts enable row level security;
revoke all on table public.pilot_signup_attempts from anon, authenticated;
grant all on table public.pilot_signup_attempts to service_role;
grant usage, select on sequence public.pilot_signup_attempts_id_seq to service_role;

create index if not exists pilot_signup_attempts_fingerprint_created_idx
  on public.pilot_signup_attempts (fingerprint_hash, created_at desc);
create index if not exists pilot_signup_attempts_email_created_idx
  on public.pilot_signup_attempts (email_hash, created_at desc);

comment on table public.pilot_signup_attempts is
  'Hashed, service-role-only rate-limit ledger for unauthenticated Pilot student registration. No raw email address or IP address is stored.';
