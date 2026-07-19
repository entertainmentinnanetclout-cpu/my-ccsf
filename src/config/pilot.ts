import type { Database } from '@/integrations/supabase/types';

export const PILOT_ENABLED = import.meta.env.VITE_PILOT_MODE_ENABLED === 'true';

export const PILOT_ROUTES = {
  landing: '/pilot',
  session: (sessionId: string) => `/pilot/session/${sessionId}`,
  report: (reportId: string) => `/pilot/report/${reportId}`,
  resources: '/pilot/resources',
  campus: '/security/pilot',
  admin: '/admin/pilot',
} as const;

export const PILOT_WARNING =
  'Demo Mode: No emergency service has been dispatched. For an actual emergency, contact CPS immediately using institutionally verified contact details.';

export const PILOT_CONSENT_VERSION = 'ccsf-pilot-consent-v1-2026-07';
export const PILOT_LOCATION_STORAGE_KEY = 'pilot_location_tracking';
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
  simulation_completed: 'Simulation Completed',
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

export function isPilotStudentPath(pathname: string): boolean {
  return pathname === '/pilot' || pathname.startsWith('/pilot/');
}

export function isPilotSecurityPath(pathname: string): boolean {
  return pathname === PILOT_ROUTES.campus || pathname.startsWith(`${PILOT_ROUTES.campus}/`);
}

export function isPilotAdminPath(pathname: string): boolean {
  return pathname === PILOT_ROUTES.admin || pathname.startsWith(`${PILOT_ROUTES.admin}/`);
}

export function isApprovedPilotPath(pathname: string): boolean {
  return isPilotStudentPath(pathname) || isPilotSecurityPath(pathname) || isPilotAdminPath(pathname);
}
