-- CCSF Developer biometric/WebAuthn step-up. Staged disabled until matching frontend is production-ready.

create table if not exists public.developer_biometric_credentials (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key_base64url text not null,
  webauthn_user_id text not null,
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
create index if not exists idx_developer_biometric_credentials_user
  on public.developer_biometric_credentials(developer_id, enabled, created_at desc);
create index if not exists idx_developer_biometric_credentials_rp
  on public.developer_biometric_credentials(developer_id, rp_id, enabled);

create table if not exists public.developer_biometric_challenges (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  ceremony text not null check (ceremony in ('registration','authentication')),
  challenge text not null,
  rp_id text not null,
  origin text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_developer_biometric_challenges_lookup
  on public.developer_biometric_challenges(developer_id, session_id, ceremony, expires_at desc);

create table if not exists public.developer_biometric_assertions (
  session_id uuid primary key,
  developer_id uuid not null references auth.users(id) on delete cascade,
  credential_id uuid references public.developer_biometric_credentials(id) on delete set null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip_address inet,
  user_agent text,
  rp_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_developer_biometric_assertions_expires
  on public.developer_biometric_assertions(expires_at);

alter table public.developer_biometric_credentials enable row level security;
alter table public.developer_biometric_challenges enable row level security;
alter table public.developer_biometric_assertions enable row level security;

revoke all on public.developer_biometric_credentials,
  public.developer_biometric_challenges,
  public.developer_biometric_assertions from public, anon, authenticated;
grant all on public.developer_biometric_credentials,
  public.developer_biometric_challenges,
  public.developer_biometric_assertions to service_role;

update public.runtime_controls
set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'developer_biometric_required', false,
      'developer_biometric_assertion_minutes', 15,
      'developer_biometric_registration_totp_max_age_seconds', 300,
      'developer_biometric_label', 'Face ID / fingerprint / device authenticator'
    ),
    updated_at = now()
where key = 'system';

create or replace function public.developer_biometric_assertion_valid(
  p_developer_id uuid,
  p_session_id uuid,
  p_ip inet default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.developer_biometric_assertions a
    where a.developer_id = p_developer_id
      and a.session_id = p_session_id
      and a.expires_at > now()
      and (p_ip is null or a.ip_address is null or a.ip_address = p_ip)
  );
$$;
revoke all on function public.developer_biometric_assertion_valid(uuid,uuid,inet) from public, anon, authenticated;
grant execute on function public.developer_biometric_assertion_valid(uuid,uuid,inet) to service_role;

create or replace function public.cleanup_expired_developer_biometric_state()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.developer_biometric_challenges where expires_at < now() - interval '10 minutes' or consumed_at is not null;
  delete from public.developer_biometric_assertions where expires_at < now();
end;
$$;
revoke all on function public.cleanup_expired_developer_biometric_state() from public, anon, authenticated;
grant execute on function public.cleanup_expired_developer_biometric_state() to service_role;
