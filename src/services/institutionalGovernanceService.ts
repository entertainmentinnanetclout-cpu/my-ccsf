import { supabase } from '@/integrations/supabase/client';
import { INSTITUTIONAL_GOVERNANCE_VERSION } from '@/config/institutionalGovernance';

export type GovernanceConsentFeature =
  | 'incident_report'
  | 'emergency_location'
  | 'safety_mobility'
  | 'campus_radar_exact'
  | 'campus_radar_approximate';

export type GovernanceConsentAction = 'granted' | 'withdrawn' | 'acknowledged';

export type InstitutionalControlStatus =
  | 'implemented'
  | 'implemented_pending_tut_confirmation'
  | 'requires_tut_confirmation'
  | 'planned';

export type AssuranceEvidenceType =
  | 'approval'
  | 'assessment'
  | 'security_test'
  | 'restore_test'
  | 'privacy_review'
  | 'records_review'
  | 'operator_review'
  | 'release_gate'
  | 'training'
  | 'other';

export type AssuranceEvidenceResult =
  | 'pending'
  | 'passed'
  | 'accepted'
  | 'failed'
  | 'conditional'
  | 'not_applicable';

export interface InstitutionalControlRow {
  control_key: string;
  control_domain: string;
  control_title: string;
  implementation_status: InstitutionalControlStatus;
  evidence_reference: string | null;
  institutional_owner: string | null;
  notes: string | null;
  updated_at: string;
}

export interface InstitutionalAssuranceEvidenceRow {
  id: string;
  control_key: string;
  evidence_type: AssuranceEvidenceType;
  title: string;
  result: AssuranceEvidenceResult;
  evidence_reference: string | null;
  institutional_owner: string | null;
  performed_at: string | null;
  expires_at: string | null;
  notes: string | null;
  supersedes_id: string | null;
  created_by: string;
  created_at: string;
}

const PURPOSES: Record<GovernanceConsentFeature, string> = {
  incident_report:
    'Process the submitted incident and any identified reporter information for authorised TUT safety, security and case-management purposes.',
  emergency_location:
    'Use the signed-in profile and current device location to create and maintain an emergency safety case for authorised TUT safety personnel.',
  safety_mobility:
    'Collect consented live location during an active Safety Mobility session for the selected safety-sharing purpose.',
  campus_radar_exact:
    'Share an exact live campus position with opted-in authorised Campus Radar participants for the selected limited period.',
  campus_radar_approximate:
    'Share an approximate campus-area position with opted-in Campus Radar participants for the selected limited period.',
};

export async function recordGovernanceConsent(
  feature: GovernanceConsentFeature,
  action: GovernanceConsentAction,
  context: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.rpc('record_institutional_consent' as never, {
    p_feature: feature,
    p_action: action,
    p_consent_version: `campus-safety-governance-${INSTITUTIONAL_GOVERNANCE_VERSION}`,
    p_purpose: PURPOSES[feature],
    p_context: context,
  } as never);

  if (error) {
    throw new Error(`The institutional consent record could not be created. ${error.message}`);
  }
}

export async function loadInstitutionalControlRegister(): Promise<InstitutionalControlRow[]> {
  const client = supabase as any;
  const { data, error } = await client
    .from('institutional_control_register')
    .select('control_key,control_domain,control_title,implementation_status,evidence_reference,institutional_owner,notes,updated_at')
    .order('control_domain')
    .order('control_key');

  if (error) throw new Error(error.message);
  return (data ?? []) as InstitutionalControlRow[];
}

export async function loadInstitutionalAssuranceEvidence(): Promise<InstitutionalAssuranceEvidenceRow[]> {
  const client = supabase as any;
  const { data, error } = await client
    .from('institutional_assurance_evidence')
    .select('id,control_key,evidence_type,title,result,evidence_reference,institutional_owner,performed_at,expires_at,notes,supersedes_id,created_by,created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as InstitutionalAssuranceEvidenceRow[];
}

export async function upsertInstitutionalControl(input: {
  controlKey: string;
  domain: string;
  title: string;
  status: InstitutionalControlStatus;
  evidenceReference?: string | null;
  institutionalOwner?: string | null;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('upsert_institutional_control' as never, {
    p_control_key: input.controlKey,
    p_control_domain: input.domain,
    p_control_title: input.title,
    p_implementation_status: input.status,
    p_evidence_reference: input.evidenceReference ?? null,
    p_institutional_owner: input.institutionalOwner ?? null,
    p_notes: input.notes ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export async function recordInstitutionalAssuranceEvidence(input: {
  controlKey: string;
  evidenceType: AssuranceEvidenceType;
  title: string;
  result: AssuranceEvidenceResult;
  evidenceReference?: string | null;
  institutionalOwner?: string | null;
  performedAt?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  supersedesId?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('record_institutional_assurance_evidence' as never, {
    p_control_key: input.controlKey,
    p_evidence_type: input.evidenceType,
    p_title: input.title,
    p_result: input.result,
    p_evidence_reference: input.evidenceReference ?? null,
    p_institutional_owner: input.institutionalOwner ?? null,
    p_performed_at: input.performedAt ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_notes: input.notes ?? null,
    p_supersedes_id: input.supersedesId ?? null,
  } as never);
  if (error) throw new Error(error.message);
}
