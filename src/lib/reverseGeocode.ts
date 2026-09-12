export interface ReverseGeocodeResult {
  address: string | null;
  source: 'nominatim' | 'disabled' | 'unavailable';
}

interface NominatimResponse {
  display_name?: unknown;
}

const REVERSE_GEOCODE_TIMEOUT_MS = 8000;
const EXTERNAL_REVERSE_GEOCODING_ENABLED =
  import.meta.env.VITE_EXTERNAL_REVERSE_GEOCODING_ENABLED === 'true';

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  if (!EXTERNAL_REVERSE_GEOCODING_ENABLED) {
    return { address: null, source: 'disabled' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const query = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-ZA,en;q=0.9',
      },
      signal: controller.signal,
    });

    if (!response.ok) return { address: null, source: 'unavailable' };
    const data = await response.json() as NominatimResponse;
    const address = typeof data.display_name === 'string' ? data.display_name.trim() : '';
    return address
      ? { address, source: 'nominatim' }
      : { address: null, source: 'unavailable' };
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Reverse geocoding failed.', error);
    }
    return { address: null, source: 'unavailable' };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatCoordinatePair(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
