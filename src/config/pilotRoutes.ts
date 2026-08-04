export const PILOT_ROUTES = {
  auth: '/pilot/auth',
  landing: '/pilot',
  session: (sessionId: string) => `/pilot/session/${sessionId}`,
  report: (reportId: string) => `/pilot/report/${reportId}`,
  reviews: '/pilot/reviews',
  resources: '/pilot/resources',
  safetyQuest: '/pilot/safety-quest',
  campus: '/security/pilot',
  campusReviews: '/security/pilot/reviews',
  admin: '/admin/pilot',
  adminReviews: '/admin/pilot/reviews',
  adminContent: '/admin/pilot/content',
} as const;

export type PilotRole = 'student' | 'security' | 'admin';

export function isPilotStudentPath(pathname: string): boolean {
  return pathname === PILOT_ROUTES.landing
    || pathname === PILOT_ROUTES.reviews
    || pathname === PILOT_ROUTES.resources
    || pathname === PILOT_ROUTES.safetyQuest
    || pathname.startsWith('/pilot/session/')
    || pathname.startsWith('/pilot/report/');
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

export function pilotDefaultDestination(role: PilotRole): string {
  if (role === 'admin') return PILOT_ROUTES.admin;
  if (role === 'security') return PILOT_ROUTES.campus;
  return PILOT_ROUTES.landing;
}

export function isPilotPathAllowedForRole(pathname: string, role: PilotRole): boolean {
  if (role === 'student') return isPilotStudentPath(pathname);
  if (role === 'security') return isPilotSecurityPath(pathname);
  return isPilotAdminPath(pathname) || isPilotSecurityPath(pathname);
}

type RequestedLocation =
  | string
  | { pathname?: unknown; search?: unknown; hash?: unknown }
  | null
  | undefined;

export function normalizeRequestedPilotPath(from: RequestedLocation): string | null {
  const candidate = typeof from === 'string'
    ? from
    : from && typeof from.pathname === 'string'
      ? `${from.pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}`
      : '';

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null;

  try {
    const base = new URL('https://ccsf.invalid');
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base.origin || parsed.pathname === PILOT_ROUTES.auth) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolvePilotDestination(role: PilotRole, from?: RequestedLocation): string {
  const requestedPath = normalizeRequestedPilotPath(from);
  if (!requestedPath) return pilotDefaultDestination(role);
  const pathname = new URL(requestedPath, 'https://ccsf.invalid').pathname;
  return isPilotPathAllowedForRole(pathname, role) ? requestedPath : pilotDefaultDestination(role);
}
