import { supabase } from '@/integrations/supabase/client';
import { INSTITUTIONAL_GOVERNANCE_VERSION } from '@/config/institutionalGovernance';

export type GovernanceConsentFeature =
  | 'incident_report'
  | 'emergency_location'
  | 'safety_mobility'
  | 'campus_radar_exact'
  | 'campus_radar_approximate';

export type GovernanceConsentAction = 'granted' | 'withdrawn' | 'acknowledged';

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

export async function loadInstitutionalControlRegister(): Promise<Array<{
  control_key: string;
  control_domain: string;
  control_title: string;
  implementation_status: string;
  evidence_reference: string | null;
  institutional_owner: string | null;
  notes: string | null;
  updated_at: string;
}>> {
  const client = supabase as any;
  const { data, error } = await client
    .from('institutional_control_register')
    .select('control_key,control_domain,control_title,implementation_status,evidence_reference,institutional_owner,notes,updated_at')
    .order('control_domain')
    .order('control_key');

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    control_key: string;
    control_domain: string;
    control_title: string;
    implementation_status: string;
    evidence_reference: string | null;
    institutional_owner: string | null;
    notes: string | null;
    updated_at: string;
  }>;
}
