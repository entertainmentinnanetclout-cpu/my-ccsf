import type { Database } from '@/integrations/supabase/types';

const runtimeHostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
const isLocalPilotRuntime = runtimeHostname === 'localhost' || runtimeHostname === '127.0.0.1';
const isApprovedBranchPreview = runtimeHostname.includes('git-fea-') && runtimeHostname.endsWith('.vercel.app');

/**
 * Pilot Mode is always enabled on local development and approved Vercel feature-branch aliases.
 * Production and main-branch deployments remain fail-closed unless explicitly enabled.
 */
export const PILOT_ENABLED =
  import.meta.env.VITE_PILOT_MODE_ENABLED === 'true' || isLocalPilotRuntime || isApprovedBranchPreview;

export const PILOT_ROUTES = {
  landing: '/pilot',
  session: (sessionId: string) => `/pilot/session/${sessionId}`,
  report: (reportId: string) => `/pilot/report/${reportId}`,
  resources: '/pilot/resources',
  campus: '/security/pilot',
  admin: '/admin/pilot',
} as const;

export const PILOT_WARNING =
  'Pilot Test Environment: reports, status changes, notifications, location and evidence workflows are live inside Pilot Mode. No external emergency service or production dispatch workflow is contacted.';

export const PILOT_CONSENT_VERSION = 'ccsf-pilot-consent-v2-2026-07';
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
