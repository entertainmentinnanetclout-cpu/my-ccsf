import { supabase } from '@/integrations/supabase/client';
import type {
  SafetyLocationFix,
  SafetyMobilitySession,
  SafetyRadarStudent,
  SetSafetyPresenceInput,
  StartSafetySessionInput,
} from '@/types/safetyMobility';

const client = supabase as any;

const asError = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error;
  if (error && typeof error === 'object' && 'message' in error) return new Error(String((error as { message: unknown }).message));
  return new Error(fallback);
};

export async function loadActiveSafetySession(): Promise<SafetyMobilitySession | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await client
    .from('safety_mobility_sessions')
    .select('*')
    .eq('user_id', authData.user.id)
    .in('status', ['active', 'paused', 'alerted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw asError(error, 'Unable to load the active safety session.');
  return (data as SafetyMobilitySession | null) ?? null;
}

export async function startSafetySession(input: StartSafetySessionInput): Promise<SafetyMobilitySession> {
  const { data, error } = await client.rpc('safety_start_mobility_session', {
    p_mode: input.mode,
    p_campus: input.campus,
    p_transport_type: input.transportType ?? null,
    p_vehicle_details: input.vehicleDetails ?? null,
    p_destination_label: input.destinationLabel ?? null,
    p_expected_end_at: input.expectedEndAt ?? null,
    p_share_scope: input.shareScope ?? 'trusted_circle',
  });
  if (error) throw asError(error, 'Unable to start Safety Mobility.');
  return data as SafetyMobilitySession;
}

export async function updateSafetyLocation(sessionId: string, location: SafetyLocationFix, batteryPercent?: number | null): Promise<void> {
  const { error } = await client.rpc('safety_update_mobility_location', {
    p_session_id: sessionId,
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_accuracy_meters: location.accuracy,
    p_heading_degrees: location.heading,
    p_speed_mps: location.speed,
    p_battery_percent: batteryPercent ?? null,
    p_readable_location: location.readableLocation,
  });
  if (error) throw asError(error, 'Unable to update the live safety location.');
}

export async function endSafetySession(sessionId: string, status: 'completed' | 'cancelled' = 'completed'): Promise<SafetyMobilitySession> {
  const { data, error } = await client.rpc('safety_end_mobility_session', {
    p_session_id: sessionId,
    p_status: status,
  });
  if (error) throw asError(error, 'Unable to end the Safety Mobility session.');
  return data as SafetyMobilitySession;
}

export async function triggerSafetyAlert(sessionId: string, reason: string): Promise<{ session_id: string; incident_id: string }> {
  const { data, error } = await client.rpc('safety_trigger_mobility_alert', {
    p_session_id: sessionId,
    p_reason: reason,
  });
  if (error) throw asError(error, 'Unable to send the safety alert.');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.incident_id) throw new Error('The alert did not return a case reference.');
  return row as { session_id: string; incident_id: string };
}

export async function setSafetyPresence(input: SetSafetyPresenceInput): Promise<void> {
  const fix = input.location ?? null;
  const { error } = await client.rpc('safety_set_student_presence', {
    p_campus: input.campus,
    p_visibility: input.visibility,
    p_latitude: fix?.latitude ?? null,
    p_longitude: fix?.longitude ?? null,
    p_accuracy_meters: fix?.accuracy ?? null,
    p_zone_label: fix?.readableLocation ?? null,
    p_status_message: input.statusMessage ?? null,
    p_sharing_until: input.sharingUntil ?? null,
    p_confirm_exact: input.confirmExact ?? false,
  });
  if (error) throw asError(error, 'Unable to update Radar visibility.');
}

export async function loadCampusRadar(campus: string): Promise<SafetyRadarStudent[]> {
  const { data, error } = await client.rpc('safety_list_campus_radar', { p_campus: campus });
  if (error) throw asError(error, 'Unable to load the campus safety radar.');
  return (data ?? []) as SafetyRadarStudent[];
}

export function subscribeToSafetySession(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`safety-mobility-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'safety_mobility_sessions', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
