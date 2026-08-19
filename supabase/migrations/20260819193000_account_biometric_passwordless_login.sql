-- CCSF reusable WebAuthn biometric/passwordless login for active profiles.

create table if not exists public.account_biometric_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_biometric_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key_base64url text not null,
  counter bigint not null default 0,
  device_type text,
  backed_up boolean not null default false,
  transports text[] not null default '{}'::text[],
  rp_id text not null,
  friendly_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_account_biometric_credentials_user
  on public.account_biometric_credentials(user_id, rp_id, enabled, created_at desc);

create table if not exists public.account_biometric_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  ceremony text not null check (ceremony in ('registration','authentication')),
  challenge text not null,
  rp_id text not null,
  origin text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_account_biometric_challenges_lookup
  on public.account_biometric_challenges(user_id, ceremony, expires_at desc);

alter table public.account_biometric_preferences enable row level security;
alter table public.account_biometric_credentials enable row level security;
alter table public.account_biometric_challenges enable row level security;

revoke all on public.account_biometric_preferences,
  public.account_biometric_credentials,
  public.account_biometric_challenges from public, anon, authenticated;
grant all on public.account_biometric_preferences,
  public.account_biometric_credentials,
  public.account_biometric_challenges to service_role;

create or replace function public.cleanup_expired_account_biometric_challenges()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.account_biometric_challenges
  where expires_at < now() - interval '10 minutes' or consumed_at is not null;
end;
$$;
revoke all on function public.cleanup_expired_account_biometric_challenges() from public, anon, authenticated;
grant execute on function public.cleanup_expired_account_biometric_challenges() to service_role;
