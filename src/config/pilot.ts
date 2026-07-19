import type { Database } from '@/integrations/supabase/types';

export {
  PILOT_ROUTES,
  isApprovedPilotPath,
  isPilotAdminPath,
  isPilotPathAllowedForRole,
  isPilotSecurityPath,
  isPilotStudentPath,
  normalizeRequestedPilotPath,
  pilotDefaultDestination,
  resolvePilotDestination,
  type PilotRole,
} from './pilotRoutes';

const runtimeHostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
const isLocalPilotRuntime = runtimeHostname === 'localhost' || runtimeHostname === '127.0.0.1';

/**
 * Pilot Mode is enabled only by the build-time deployment gate or local development.
 * Production and every unapproved Preview remain fail-closed unless explicitly authorised.
 */
export const PILOT_ENABLED =
  import.meta.env.VITE_PILOT_MODE_ENABLED === 'true' || isLocalPilotRuntime;

export const PILOT_WARNING =
  'Demo Mode: No emergency service has been dispatched. Pilot Test Environment: reports, status changes, notifications, location and evidence workflows are live inside Pilot Mode. No external emergency service or production dispatch workflow is contacted.';

export const PILOT_CONSENT_VERSION = 'ccsf-pilot-consent-v2-2026-07';
export const PILOT_LOCATION_STORAGE_KEY = 'pilot_location_tracking';
export const PILOT_POST_PROFILE_REDIRECT_KEY = 'ccsf_pilot_post_profile_redirect';
export const PILOT_ATTACHMENT_BUCKET = 'pilot-report-attachments';
export const PILOT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const PILOT_MAX_ATTACHMENTS = 3;
export const PILOT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
] as const;

export type PilotReportStatus = Database['public']['Enums']['pilot_report_status'];
export type PilotSessionStatus = Database['public']['Enums']['pilot_session_status'];
export type PilotParticipantStatus = Database['public']['Enums']['pilot_participant_status'];

export const PILOT_STATUS_LABELS: Record<PilotReportStatus, string> = {
  received: 'Received',
  assessing: 'Assessing',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  simulation_completed: 'Resolved / Completed',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

export const PILOT_STATUS_SEQUENCE: PilotReportStatus[] = [
  'received',
  'assessing',
  'assigned',
  'in_progress',
  'simulation_completed',
];

export const CAMPUS_LABELS: Record<Database['public']['Enums']['campus_location'], string> = {
  pretoria_west_main: 'Pretoria West (Main Campus)',
  arcadia: 'Arcadia',
  arts: 'Arts',
  giyani: 'Giyani',
  mbombela: 'Mbombela',
  polokwane: 'Polokwane',
  garankuwa: 'Ga-Rankuwa',
  soshanguve_south: 'Soshanguve South',
  soshanguve_north: 'Soshanguve North',
  emalahleni: 'Emalahleni',
};

export const PILOT_CAMPUS_VALUES = Object.keys(CAMPUS_LABELS) as Database['public']['Enums']['campus_location'][];
