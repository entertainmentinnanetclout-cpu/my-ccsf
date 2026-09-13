-- Institutional governance privilege lockdown
-- Prevents direct browser writes from bypassing audited governance RPCs.

drop policy if exists institutional_consent_owner_insert on public.institutional_consent_events;

revoke all on table public.institutional_consent_events from anon, authenticated;
grant select on table public.institutional_consent_events to authenticated;

revoke all on table public.institutional_control_register from anon, authenticated;
grant select on table public.institutional_control_register to authenticated;

revoke all on table public.institutional_assurance_evidence from anon, authenticated;
grant select on table public.institutional_assurance_evidence to authenticated;

revoke all on table public.institutional_governance_audit from anon, authenticated;
grant select on table public.institutional_governance_audit to authenticated;

-- Only the audited RPCs are intended for authenticated mutation.
revoke all on function public.record_institutional_consent(text,text,text,text,jsonb) from public, anon;
grant execute on function public.record_institutional_consent(text,text,text,text,jsonb) to authenticated;

revoke all on function public.upsert_institutional_control(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.upsert_institutional_control(text,text,text,text,text,text,text) to authenticated;

revoke all on function public.record_institutional_assurance_evidence(text,text,text,text,text,text,timestamptz,timestamptz,text,uuid) from public, anon;
grant execute on function public.record_institutional_assurance_evidence(text,text,text,text,text,text,timestamptz,timestamptz,text,uuid) to authenticated;
