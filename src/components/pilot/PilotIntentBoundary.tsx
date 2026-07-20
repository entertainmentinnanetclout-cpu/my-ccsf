import { useEffect, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PILOT_ROUTES } from '@/config/pilot';
import { clearPilotIntent, markPilotIntent } from '@/lib/pilotIntent';

type RequestedLocation = string | { pathname?: unknown; search?: unknown; hash?: unknown };

function requestedPath(from: RequestedLocation | undefined): string {
  if (typeof from === 'string') return from;
  if (from && typeof from.pathname === 'string') {
    return `${from.pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}`;
  }
  return PILOT_ROUTES.landing;
}

export function PilotEntryIntentBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const from = (location.state as { from?: RequestedLocation } | null)?.from;

  useEffect(() => {
    markPilotIntent(requestedPath(from));
  }, [from]);

  return <>{children}</>;
}

export function OfficialEntryIntentBoundary({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const returningToPilot = searchParams.get('pilot') === 'true';

  useEffect(() => {
    if (returningToPilot) markPilotIntent(PILOT_ROUTES.landing);
    else clearPilotIntent();
  }, [returningToPilot]);

  return <>{children}</>;
}
