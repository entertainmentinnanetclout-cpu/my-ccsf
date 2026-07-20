import { PILOT_ROUTES, normalizeRequestedPilotPath } from '@/config/pilotRoutes';

const PILOT_INTENT_KEY = 'ccsf_pilot_intent';
const PILOT_DESTINATION_KEY = 'ccsf_pilot_destination';

function getStorage(): Storage[] {
  if (typeof window === 'undefined') return [];
  return [window.sessionStorage, window.localStorage];
}

export function markPilotIntent(destination: string = PILOT_ROUTES.landing): string {
  const normalized = normalizeRequestedPilotPath(destination) ?? PILOT_ROUTES.landing;
  for (const storage of getStorage()) {
    storage.setItem(PILOT_INTENT_KEY, 'true');
    storage.setItem(PILOT_DESTINATION_KEY, normalized);
  }
  return normalized;
}

export function hasPilotIntent(): boolean {
  return getStorage().some((storage) => storage.getItem(PILOT_INTENT_KEY) === 'true');
}

export function readPilotDestination(fallback: string = PILOT_ROUTES.landing): string {
  for (const storage of getStorage()) {
    const value = storage.getItem(PILOT_DESTINATION_KEY);
    const normalized = normalizeRequestedPilotPath(value);
    if (normalized) return normalized;
  }
  return fallback;
}

export function clearPilotIntent(): void {
  for (const storage of getStorage()) {
    storage.removeItem(PILOT_INTENT_KEY);
    storage.removeItem(PILOT_DESTINATION_KEY);
  }
}
