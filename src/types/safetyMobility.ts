import type { CampusLocation } from '@/types/pilot';

export type SafetyMobilityMode = 'in_transit' | 'night_travel' | 'find_my_phone';
export type SafetyMobilityStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'alerted' | 'expired';
export type SafetyShareScope = 'private' | 'trusted_circle' | 'campus_security';
export type SafetyPresenceVisibility = 'off' | 'campus_approximate' | 'campus_exact';

export interface SafetyMobilitySession {
  id: string;
  user_id: string;
  campus: CampusLocation;
  mode: SafetyMobilityMode;
  status: SafetyMobilityStatus;
  transport_type: string | null;
  vehicle_details: string | null;
  destination_label: string | null;
  expected_end_at: string | null;
  share_scope: SafetyShareScope;
  consent_at: string;
  last_location_at: string | null;
  incident_id: string | null;
  alert_reason: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
}

export interface SafetyLocationFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  readableLocation: string | null;
  capturedAt: string;
}

export interface SafetyRadarStudent {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  campus: CampusLocation;
  visibility: SafetyPresenceVisibility;
  status_message: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  zone_label: string | null;
  last_seen_at: string;
  is_exact: boolean;
}

export interface StartSafetySessionInput {
  mode: SafetyMobilityMode;
  campus: CampusLocation;
  transportType?: string | null;
  vehicleDetails?: string | null;
  destinationLabel?: string | null;
  expectedEndAt?: string | null;
  shareScope?: SafetyShareScope;
}

export interface SetSafetyPresenceInput {
  campus: CampusLocation;
  visibility: SafetyPresenceVisibility;
  location?: SafetyLocationFix | null;
  statusMessage?: string | null;
  sharingUntil?: string | null;
  confirmExact?: boolean;
}
