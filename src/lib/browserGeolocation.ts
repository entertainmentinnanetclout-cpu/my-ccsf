export interface NormalizedGeolocationError {
  code: number | null;
  message: string;
  denied: boolean;
  unavailable: boolean;
  timedOut: boolean;
}

export interface CapturedBrowserPosition {
  position: GeolocationPosition;
  acquisition: 'high_accuracy' | 'network_fallback';
  permission: PermissionState | 'unknown';
}

const LOCATION_GUIDANCE: Record<number, string> = {
  1: 'Location permission is blocked. Open your browser site settings, allow Location for My CCSF, then try again.',
  2: 'Your device could not determine a location. Turn on phone Location services and mobile data or Wi-Fi, then try again.',
  3: 'Location capture timed out. Move to an area with a clearer signal and try again.',
};

function readErrorCode(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('code' in value)) return null;
  const code = Number((value as { code?: unknown }).code);
  return Number.isInteger(code) ? code : null;
}

function readErrorMessage(value: unknown): string | null {
  if (value instanceof Error && value.message) return value.message;
  if (!value || typeof value !== 'object' || !('message' in value)) return null;
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

export function normalizeGeolocationError(value: unknown): NormalizedGeolocationError {
  const code = readErrorCode(value);
  const browserMessage = readErrorMessage(value);
  const guidance = code !== null ? LOCATION_GUIDANCE[code] : undefined;
  return {
    code,
    message: guidance ?? browserMessage ?? 'Location capture failed. Check your browser and device location settings, then try again.',
    denied: code === 1,
    unavailable: code === 2,
    timedOut: code === 3,
  };
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

async function readPermission(): Promise<PermissionState | 'unknown'> {
  if (!navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return 'unknown';
  }
}

export async function captureBrowserPosition(): Promise<CapturedBrowserPosition> {
  if (!navigator.geolocation) throw new Error('Geolocation is not supported by this browser.');
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    throw new Error('Location requires the secure HTTPS version of My CCSF.');
  }

  const permission = await readPermission();
  if (permission === 'denied') {
    const denied = new Error(LOCATION_GUIDANCE[1]) as Error & { code: number };
    denied.code = 1;
    throw denied;
  }

  try {
    const position = await requestPosition({
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
    return { position, acquisition: 'high_accuracy', permission };
  } catch (firstFailure) {
    const normalized = normalizeGeolocationError(firstFailure);
    if (normalized.denied) throw firstFailure;

    try {
      const position = await requestPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      });
      return { position, acquisition: 'network_fallback', permission };
    } catch (fallbackFailure) {
      const fallback = normalizeGeolocationError(fallbackFailure);
      const error = new Error(fallback.message) as Error & { code: number | null };
      error.code = fallback.code;
      throw error;
    }
  }
}
