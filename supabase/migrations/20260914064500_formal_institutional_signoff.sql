-- Formal TUT institutional sign-off workflow
-- Separates application readiness evidence from actual institutional approval.
-- No row in this register should be interpreted as approval without written evidence.

create table if not exists public.institutional_signoff_register (
  signoff_key text primary key,
  sequence_no smallint not null default 100,
  domain text not null,
  title text not null,
  authority_role text not null,
  approval_scope text not null,
  mandatory boolean not null default true,
  conditional_when text,
  mapped_control_keys text[] not null default '{}'::text[],
  source_basis text,
  status text not null default 'not_requested' check (status in (
    'not_requested',
    'requested',
    'under_review',
    'changes_required',
    'conditionally_approved',
    'approved',
    'not_applicable'
  )),
  request_reference text,
  decision_reference text,
  conditions text,
  notes text,
  requested_at timestamptz,
  last_decision_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.institutional_signoff_register is
'Formal institutional review/sign-off register. Technical readiness is not equivalent to TUT approval. Written evidence is required for approval states.';

alter table public.institutional_signoff_register enable row level security;

drop policy if exists institutional_signoff_admin_read on public.institutional_signoff_register;
create policy institutional_signoff_admin_read
on public.institutional_signoff_register
for select to authenticated
using (public.is_super_admin((select auth.uid())));

revoke all on table public.institutional_signoff_register from anon, authenticated;
grant select on table public.institutional_signoff_register to authenticated;

create table if not exists public.institutional_signoff_events (
  id uuid primary key default gen_random_uuid(),
  signoff_key text not null references public.institutional_signoff_register(signoff_key) on delete restrict,
  event_type text not null check (event_type in (
    'request_created',
    'submission_sent',
    'review_started',
    'changes_requested',
    'conditional_approval',
    'approval',
    'not_applicable',
    'reopened',
    'evidence_added',
    'note'
  )),
  authority_name text,
  authority_role text,
  evidence_reference text,
  conditions text,
  notes text,
  recorded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table public.institutional_signoff_events is
'Append-only history of formal TUT review requests, decisions, conditions and evidence references.';

alter table public.institutional_signoff_events enable row level security;

drop policy if exists institutional_signoff_events_admin_read on public.institutional_signoff_events;
create policy institutional_signoff_events_admin_read
on public.institutional_signoff_events
for select to authenticated
using (public.is_super_admin((select auth.uid())));

revoke all on table public.institutional_signoff_events from anon, authenticated;
grant select on table public.institutional_signoff_events to authenticated;

create index if not exists institutional_signoff_register_status_idx
  on public.institutional_signoff_register(status, sequence_no);
create index if not exists institutional_signoff_events_key_created_idx
  on public.institutional_signoff_events(signoff_key, created_at desc);

create or replace function public.record_institutional_signoff_event(
  p_signoff_key text,
  p_event_type text,
  p_authority_name text default null,
  p_authority_role text default null,
  p_evidence_reference text default null,
  p_conditions text default null,
  p_notes text default null
) returns public.institutional_signoff_events
language plpgsql
security definer
set search_path = public, auth
as $signoff$
declare
  v_actor uuid := auth.uid();
  v_row public.institutional_signoff_events;
  v_current public.institutional_signoff_register;
  v_status text;
  v_now timestamptz := now();
begin
  if v_actor is null or not public.is_super_admin(v_actor) then
    raise exception 'Institutional governance administrator access required';
  end if;

  select * into v_current
  from public.institutional_signoff_register
  where signoff_key = p_signoff_key;

  if not found then
    raise exception 'Unknown institutional sign-off requirement';
  end if;

  if p_event_type not in (
    'request_created',
    'submission_sent',
    'review_started',
    'changes_requested',
    'conditional_approval',
    'approval',
    'not_applicable',
    'reopened',
    'evidence_added',
    'note'
  ) then
    raise exception 'Unsupported institutional sign-off event';
  end if;

  if p_event_type in ('conditional_approval','approval','not_applicable') then
    if nullif(btrim(coalesce(p_authority_name, '')), '') is null then
      raise exception 'Decision authority name or committee is required';
    end if;
    if nullif(btrim(coalesce(p_authority_role, '')), '') is null then
      raise exception 'Decision authority role is required';
    end if;
    if nullif(btrim(coalesce(p_evidence_reference, '')), '') is null then
      raise exception 'Written decision evidence reference is required';
    end if;
  end if;

  if p_event_type = 'conditional_approval'
     and nullif(btrim(coalesce(p_conditions, '')), '') is null then
    raise exception 'Conditional approval requires explicit conditions';
  end if;

  v_status := case p_event_type
    when 'request_created' then 'requested'
    when 'submission_sent' then greatest_status(v_current.status, 'requested')
    when 'review_started' then 'under_review'
    when 'changes_requested' then 'changes_required'
    when 'conditional_approval' then 'conditionally_approved'
    when 'approval' then 'approved'
    when 'not_applicable' then 'not_applicable'
    when 'reopened' then 'requested'
    else v_current.status
  end;

  insert into public.institutional_signoff_events(
    signoff_key, event_type, authority_name, authority_role,
    evidence_reference, conditions, notes, recorded_by
  ) values (
    p_signoff_key,
    p_event_type,
    nullif(left(btrim(coalesce(p_authority_name, '')), 240), ''),
    nullif(left(btrim(coalesce(p_authority_role, '')), 240), ''),
    nullif(left(btrim(coalesce(p_evidence_reference, '')), 2000), ''),
    nullif(left(btrim(coalesce(p_conditions, '')), 4000), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 4000), ''),
    v_actor
  )
  returning * into v_row;

  update public.institutional_signoff_register
  set
    status = v_status,
    request_reference = case
      when p_event_type in ('request_created','submission_sent')
        and nullif(btrim(coalesce(p_evidence_reference, '')), '') is not null
        then left(btrim(p_evidence_reference), 2000)
      else request_reference
    end,
    decision_reference = case
      when p_event_type in ('conditional_approval','approval','not_applicable')
        then left(btrim(p_evidence_reference), 2000)
      when p_event_type = 'reopened' then null
      else decision_reference
    end,
    conditions = case
      when p_event_type = 'conditional_approval' then left(btrim(p_conditions), 4000)
      when p_event_type in ('approval','not_applicable','reopened') then null
      else conditions
    end,
    requested_at = case
      when p_event_type = 'request_created' then coalesce(requested_at, v_now)
      else requested_at
    end,
    last_decision_at = case
      when p_event_type in ('conditional_approval','approval','not_applicable','changes_requested')
        then v_now
      when p_event_type = 'reopened' then null
      else last_decision_at
    end,
    updated_by = v_actor,
    updated_at = v_now
  where signoff_key = p_signoff_key;

  return v_row;
end;
$signoff$;

-- helper used only inside the sign-off RPC to keep a submission event from
-- accidentally moving a later status backwards.
create or replace function public.greatest_status(p_current text, p_floor text)
returns text
language sql
immutable
set search_path = public
as $status$
  select case
    when p_current in ('under_review','changes_required','conditionally_approved','approved','not_applicable') then p_current
    else p_floor
  end;
$status$;

revoke all on function public.greatest_status(text,text) from public, anon, authenticated;
revoke all on function public.record_institutional_signoff_event(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.record_institutional_signoff_event(text,text,text,text,text,text,text) to authenticated;

create or replace function public.get_institutional_release_decision()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $release$
  select case
    when auth.uid() is null or not public.is_super_admin(auth.uid()) then
      jsonb_build_object('authorised', false)
    else
      jsonb_build_object(
        'authorised', true,
        'mandatory_total', count(*) filter (where mandatory),
        'approved', count(*) filter (where mandatory and status = 'approved'),
        'not_applicable', count(*) filter (where mandatory and status = 'not_applicable'),
        'conditional', count(*) filter (where mandatory and status = 'conditionally_approved'),
        'changes_required', count(*) filter (where mandatory and status = 'changes_required'),
        'under_review', count(*) filter (where mandatory and status = 'under_review'),
        'requested', count(*) filter (where mandatory and status = 'requested'),
        'not_requested', count(*) filter (where mandatory and status = 'not_requested'),
        'ready_for_formal_production_designation',
          count(*) filter (where mandatory and status not in ('approved','not_applicable')) = 0
      )
  end
  from public.institutional_signoff_register;
$release$;

revoke all on function public.get_institutional_release_decision() from public, anon;
grant execute on function public.get_institutional_release_decision() to authenticated;

insert into public.institutional_signoff_register (
  signoff_key, sequence_no, domain, title, authority_role, approval_scope,
  mandatory, conditional_when, mapped_control_keys, source_basis, status, notes
) values
(
  'so01-cps-operational-ownership', 10, 'Operational Governance',
  'CPS / CCSF operational ownership and service-purpose acceptance',
  'TUT Campus Protection Services operational owner / delegated CPS authority',
  'Confirm that the Campus Safety App is an internal CPS/CCSF crime-prevention and event-compliance service, define accountable operational ownership, escalation routes and approved pilot/production scope.',
  true, null,
  array['purpose-minimisation','role-campus-boundary'],
  'TUT PAIA Manual 2025 s12.1.1 recognises student safety and security as a purpose for processing. CPS is an internal TUT directorate; CCSF operates under CPS for this project.',
  'not_requested',
  'This sign-off establishes the accountable TUT service owner. It does not transfer technical or privacy responsibilities to one person.'
),
(
  'so02-project-ip-classification', 20, 'Project / IP Governance',
  'Student-developed internal project classification, source-code custodianship and IP route',
  'TUT Innovation / Legal Services / ICT with CPS operational owner',
  'Confirm the project classification as a student-developed internal institutional system, ownership/custodianship of source code and documentation, maintenance rights, developer continuity and any assignment/licensing requirements.',
  true, null,
  array['release-change-control'],
  'TUT Intellectual Property Policy states that IP developed by registered students under University supervision or using University-administered resources vests in the University; contractual IP matters are referred to Legal Services and innovation governance.',
  'not_requested',
  'This item must be resolved in writing because the system was developed by an undergraduate student inside the TUT/CPS environment.'
),
(
  'so03-ict-architecture-hosting', 30, 'ICT Governance',
  'ICT architecture, hosting, integration and service-management acceptance',
  'TUT Digital Transformation / ICT delegated architecture and service owner',
  'Review system architecture, identity, hosting, database, integrations, environments, support model, access model, service monitoring and any required TUT infrastructure integration.',
  true, null,
  array['cloud-operator-approval','release-change-control','role-campus-boundary'],
  'TUT PAIA Manual lists ICT policies/procedures, SLAs, access-control lists, system logs and monitoring reports as ICT records and states that TUT uses an IT Governance Framework.',
  'not_requested',
  'Approval must identify whether current Supabase/Vercel hosting can continue, must be changed, or must be integrated into a TUT-managed environment.'
),
(
  'so04-privacy-popia', 40, 'Privacy / POPIA',
  'POPIA processing, data-subject rights, operator and transborder review',
  'TUT Deputy Information Officer / Privacy function',
  'Review lawful purpose, minimisation, consent/other processing bases, data-subject rights, disclosure paths, operator arrangements, transborder flows, location processing, anonymous reporting and evidence handling.',
  true, null,
  array['privacy-rights','purpose-minimisation','consent-audit','external-location-processors','cloud-operator-approval'],
  'TUT Privacy Statement and PAIA Manual ss12.1, 12.4 and 12.5. Public privacy enquiries are routed through popia@tut.ac.za.',
  'not_requested',
  'Written privacy review should identify any required wording or control changes rather than relying on technical self-certification.'
),
(
  'so05-information-security', 50, 'Cybersecurity',
  'Information-security assessment and internal Cyber Security / Data Incident Plan integration',
  'TUT Cybersecurity / Information Security function',
  'Review threat model, privileged MFA, RLS/authorisation, evidence protection, secrets, monitoring, incident escalation, logging, vulnerability management and the required connection to TUT internal cyber and data-incident processes.',
  true, null,
  array['cyber-plan-integration','security-monitoring','privileged-mfa','security-assessment','evidence-protection'],
  'TUT PAIA Manual s12.5 describes the IT Governance Framework, Cyber Security Plan, Data Incident Plan, inventory risk assessment, security controls, monitoring and awareness requirements. TUT publishes tut_security_matters@tut.ac.za for cybersecurity enquiries.',
  'not_requested',
  'Automated tests support this review but do not replace any TUT-required security assessment or penetration test.'
),
(
  'so06-records-retention', 60, 'Records Management',
  'Records-retention, evidence-preservation and disposal schedule',
  'TUT Records Management / Registrar delegated records authority',
  'Confirm retention and preservation periods for incident records, evidence, consent records, audit logs, location records, pilot data, operational communications and governance evidence, including lawful holds and disposal rules.',
  true, null,
  array['retention-periods','evidence-protection','consent-audit'],
  'TUT PAIA Manual identifies ICT, risk, student and research records but the public manual does not prescribe the application-specific retention periods.',
  'not_requested',
  'No destructive retention automation should be enabled until this schedule is confirmed.'
),
(
  'so07-legal-procurement-operators', 70, 'Legal / Procurement / Third Party',
  'Cloud-operator, SLA, procurement and existing vendor-arrangement applicability',
  'TUT Legal Services / Procurement / ICT',
  'Confirm whether current external service providers and software arrangements are permissible, whether an existing TUT system-development/vendor agreement applies, what SLA/DPA/operator terms are required, and whether any procurement or contracting process is triggered.',
  true, null,
  array['cloud-operator-approval'],
  'TUT PAIA Manual lists service agreements, service-provider contracts and SLAs as University records and requires third parties receiving personal information to maintain confidentiality/security and use it only for the approved purpose.',
  'not_requested',
  'This item specifically resolves the claim that TUT may have an existing contracted company for systems development; the app must not assume either exclusivity or exemption without written confirmation.'
),
(
  'so08-backup-dr-bcp', 80, 'Resilience',
  'Backup, restore, disaster-recovery and business-continuity acceptance',
  'TUT ICT / Business Continuity / Risk delegated owner',
  'Confirm backup scope, recovery objectives, restore-test evidence, offline/maintenance behaviour, continuity responsibilities and the institutional RPO/RTO expected for the service.',
  true, null,
  array['backup-dr'],
  'TUT PAIA Manual lists backup/disaster-recovery plans and business-continuity records and identifies confidentiality, integrity and availability as required information-security outcomes.',
  'not_requested',
  'Provider capability is not the same as an approved institutional RPO/RTO.'
),
(
  'so09-corporate-affairs', 90, 'Brand / Publication',
  'Corporate Affairs approval of institutional branding, public claims and publication route',
  'TUT Corporate Affairs & Marketing delegated authority',
  'Approve TUT identity usage, public wording, app-store/web publication claims, onboarding material and the conditions under which the application may be described as official, institutional or production.',
  true, null,
  array[]::text[],
  'TUT PAIA Manual lists Corporate Affairs & Marketing promotional materials as institutional records. Current public executive information identifies Corporate Affairs & Marketing as an executive portfolio.',
  'not_requested',
  'Until approved, the application must avoid language implying institutional approval that has not been granted.'
),
(
  'so10-operational-handover', 100, 'Service Operations',
  'Operational handover, staff training, support and continuity',
  'CPS operational owner with TUT ICT / service-support owner',
  'Approve operating procedures, officer/admin training, support contacts, incident handling, access reviews, onboarding/offboarding, continuity after the student developer leaves, and recurring control reviews.',
  true, null,
  array['security-monitoring','release-change-control'],
  'TUT PAIA Manual identifies cybersecurity awareness, ICT operational records and monitoring as part of institutional information-security measures.',
  'not_requested',
  'The service must not depend permanently on a single student developer for operational continuity.'
),
(
  'so11-final-production-designation', 110, 'Institutional Acceptance',
  'Final institutional production designation / go-live decision',
  'TUT delegated production authority / Digital Transformation with CPS operational owner and required control owners',
  'Issue the final written decision that identifies approved scope, environments, accountable owners, outstanding conditions, review date and authority to represent the system as an institutional production service.',
  true, null,
  array['release-change-control'],
  'Final authority and exact signatory route must be confirmed by TUT; the application does not infer this from technical readiness.',
  'not_requested',
  'This is the last gate. It should only be approved after the mandatory specialist sign-offs are complete.'
),
(
  'so12-research-ethics-applicability', 120, 'Research Ethics',
  'Research-ethics applicability decision',
  'TUT Research Ethics / relevant faculty research ethics route',
  'Determine whether app testing, pilot analytics, surveys, publications or research use constitute human-participant research requiring ethics review and, where applicable, record the ethics approval reference.',
  false,
  'Required when project data or pilot participants are used for research, dissertation/publication, structured study or other human-participant research.',
  array[]::text[],
  'TUT HREC procedures state that research proposals involving human participants, including undergraduate and postgraduate student research, are subject to ethics review.',
  'not_requested',
  'Operational service delivery alone is not automatically labelled research by this register; TUT must determine applicability based on the intended activity.'
)
on conflict (signoff_key) do update set
  sequence_no = excluded.sequence_no,
  domain = excluded.domain,
  title = excluded.title,
  authority_role = excluded.authority_role,
  approval_scope = excluded.approval_scope,
  mandatory = excluded.mandatory,
  conditional_when = excluded.conditional_when,
  mapped_control_keys = excluded.mapped_control_keys,
  source_basis = excluded.source_basis,
  notes = excluded.notes,
  updated_at = now();
