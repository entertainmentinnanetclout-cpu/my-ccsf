import { supabase } from '@/integrations/supabase/client';

const DEVICE_ID_KEY = 'ccsf:developer-control:device-id';

export type RuntimeSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RuntimeEventInput {
  type: string;
  severity?: RuntimeSeverity;
  route?: string;
  message?: string;
  stack?: string;
  duration_ms?: number;
  status_code?: number;
  metadata?: Record<string, unknown>;
}

export interface RuntimeObserverResponse {
  ok: boolean;
  access: {
    allowed: boolean;
    reason: string;
    status: string;
    is_developer: boolean;
  };
  system: {
    mode: 'live' | 'maintenance' | 'locked' | string;
    message: string;
    approval_required: boolean;
    access_gate_enabled: boolean;
  };
  features: Record<string, boolean>;
  session: {
    auth_session_id: string | null;
    device_hash: string | null;
  };
}

type NetworkInformation = {
  effectiveType?: string;
  type?: string;
};

function createDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ccsf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return createDeviceId();
  }
}

function parseBrowser() {
  if (typeof navigator === 'undefined') {
    return { browser_name: 'Unknown', browser_version: '', operating_system: 'Unknown', device_type: 'Unknown' };
  }

  const ua = navigator.userAgent;
  let browser_name = 'Unknown';
  let browser_version = '';
  const browserPatterns: Array<[string, RegExp]> = [
    ['Edge', /Edg\/([\d.]+)/],
    ['Chrome', /Chrome\/([\d.]+)/],
    ['Firefox', /Firefox\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, pattern] of browserPatterns) {
    const match = ua.match(pattern);
    if (match) {
      browser_name = name;
      browser_version = match[1] ?? '';
      break;
    }
  }

  let operating_system = 'Unknown';
  if (/Windows NT/i.test(ua)) operating_system = 'Windows';
  else if (/Android/i.test(ua)) operating_system = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) operating_system = 'iOS/iPadOS';
  else if (/Mac OS X/i.test(ua)) operating_system = 'macOS';
  else if (/Linux/i.test(ua)) operating_system = 'Linux';

  let device_type = 'Desktop';
  if (/iPad|Tablet/i.test(ua)) device_type = 'Tablet';
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device_type = 'Mobile';

  return { browser_name, browser_version, operating_system, device_type };
}

function clientMetadata() {
  const parsed = parseBrowser();
  const connection = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { connection?: NetworkInformation }).connection
    : undefined;

  return {
    ...parsed,
    locale: typeof navigator !== 'undefined' ? navigator.language : null,
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
    viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
    viewport_height: typeof window !== 'undefined' ? window.innerHeight : null,
    network_type: connection?.effectiveType ?? connection?.type ?? null,
    route: typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : null,
  };
}

export async function observeRuntime(event?: RuntimeEventInput): Promise<RuntimeObserverResponse> {
  const normalizedEvent = event
    ? {
        ...event,
        severity: event.severity ?? 'info',
        route: event.route ?? (typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : undefined),
      }
    : undefined;

  const { data, error } = await supabase.functions.invoke<RuntimeObserverResponse>('runtime-observer', {
    body: {
      device_id: getDeviceId(),
      client: clientMetadata(),
      event: normalizedEvent,
    },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error('Runtime observer returned an invalid response.');
  return data;
}

export async function reportRuntimeEvent(event: RuntimeEventInput): Promise<void> {
  try {
    await observeRuntime(event);
  } catch (error) {
    // Telemetry must never create a second application failure.
    console.warn('CCSF runtime telemetry unavailable', error);
  }
}
