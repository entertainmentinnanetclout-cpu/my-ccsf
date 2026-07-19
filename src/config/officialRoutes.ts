import type { PilotRole } from '@/config/pilotRoutes';

export const OFFICIAL_ROUTES = {
  auth: '/auth',
  student: '/dashboard',
  security: '/security',
  admin: '/admin',
  profile: '/profile',
  profileCompletion: '/profile-completion',
  office: '/office',
  judiciary: '/judiciary',
} as const;

type RequestedLocation =
  | string
  | {
      pathname?: unknown;
      search?: unknown;
      hash?: unknown;
    }
  | null
  | undefined;

export function officialDefaultDestination(role: PilotRole): string {
  if (role === 'admin') return OFFICIAL_ROUTES.admin;
  if (role === 'security') return OFFICIAL_ROUTES.security;
  return OFFICIAL_ROUTES.student;
}

export function isOfficialPathAllowedForRole(pathname: string, role: PilotRole): boolean {
  if (role === 'student') {
    return pathname.startsWith(OFFICIAL_ROUTES.student)
      || pathname === OFFICIAL_ROUTES.profile
      || pathname === OFFICIAL_ROUTES.profileCompletion;
  }

  if (role === 'security') {
    return pathname.startsWith(OFFICIAL_ROUTES.security)
      || pathname === OFFICIAL_ROUTES.profile
      || pathname === OFFICIAL_ROUTES.office
      || pathname === OFFICIAL_ROUTES.judiciary;
  }

  return pathname.startsWith(OFFICIAL_ROUTES.admin)
    || pathname.startsWith(OFFICIAL_ROUTES.security)
    || pathname === OFFICIAL_ROUTES.profile
    || pathname === OFFICIAL_ROUTES.office
    || pathname === OFFICIAL_ROUTES.judiciary;
}

export function normalizeRequestedOfficialPath(from: RequestedLocation): string | null {
  const candidate = typeof from === 'string'
    ? from
    : from && typeof from.pathname === 'string'
      ? `${from.pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}`
      : '';

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null;

  try {
    const base = new URL('https://ccsf.invalid');
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base.origin || parsed.pathname === OFFICIAL_ROUTES.auth || parsed.pathname.startsWith('/pilot')) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function resolveOfficialDestination(role: PilotRole, from?: RequestedLocation): string {
  const requestedPath = normalizeRequestedOfficialPath(from);
  if (!requestedPath) return officialDefaultDestination(role);

  const pathname = new URL(requestedPath, 'https://ccsf.invalid').pathname;
  return isOfficialPathAllowedForRole(pathname, role)
    ? requestedPath
    : officialDefaultDestination(role);
}
