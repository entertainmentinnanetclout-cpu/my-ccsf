import { useCallback, useEffect, useRef, useState } from 'react';
import { reverseGeocodeCoordinates, formatCoordinatePair } from '@/lib/reverseGeocode';
import {
  endSafetySession,
  loadActiveSafetySession,
  setSafetyPresence,
  startSafetySession,
  subscribeToSafetySession,
  triggerSafetyAlert,
  updateSafetyLocation,
} from '@/services/safetyMobilityService';
import type { CampusLocation } from '@/types/pilot';
import type {
  SafetyLocationFix,
  SafetyMobilitySession,
  SafetyPresenceVisibility,
  SetSafetyPresenceInput,
  StartSafetySessionInput,
} from '@/types/safetyMobility';

const RADAR_STORAGE_KEY = 'ccsf-safety-radar-consent-v1';
const MIN_SYNC_INTERVAL_MS = 12_000;
const MAX_LOCATION_AGE_MS = 5_000;

interface RadarPreference {
  visibility: SafetyPresenceVisibility;
  sharingUntil: string | null;
  statusMessage: string | null;
  confirmExact: boolean;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

const isGeolocationError = (value: unknown): value is GeolocationPositionError => (
  typeof value === 'object'
  && value !== null
  && 'code' in value
  && 'message' in value
);

const getBatteryPercent = async (): Promise<number | null> => {
  try {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    const battery = await nav.getBattery?.();
    return battery ? Math.round(battery.level * 10000) / 100 : null;
  } catch {
    return null;
  }
};

const positionToFix = async (position: GeolocationPosition, previousAddress?: string | null): Promise<SafetyLocationFix> => {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  let readableLocation = previousAddress ?? null;
  if (!readableLocation) {
    const result = await reverseGeocodeCoordinates(latitude, longitude);
    readableLocation = result.address ?? formatCoordinatePair(latitude, longitude);
  }
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
    speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
    readableLocation,
    capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
  };
};

export function useSafetyMobility({ campus, userId }: { campus: CampusLocation; userId: string | null | undefined }) {
  const [session, setSession] = useState<SafetyMobilitySession | null>(null);
  const [location, setLocation] = useState<SafetyLocationFix | null>(null);
  const [radarPreference, setRadarPreference] = useState<RadarPreference>({
    visibility: 'off', sharingUntil: null, statusMessage: null, confirmExact: false,
  });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastSyncRef = useRef(0);
  const sessionRef = useRef<SafetyMobilitySession | null>(null);
  const preferenceRef = useRef<RadarPreference>(radarPreference);
  const lastAddressRef = useRef<string | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { preferenceRef.current = radarPreference; }, [radarPreference]);

  const refresh = useCallback(async () => {
    try {
      setSession(await loadActiveSafetySession());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load Safety Mobility.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(RADAR_STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as RadarPreference;
        const expired = saved.sharingUntil && new Date(saved.sharingUntil).getTime() <= Date.now();
        if (!expired && saved.visibility !== 'off') setRadarPreference(saved);
        else localStorage.removeItem(RADAR_STORAGE_KEY);
      } catch {
        localStorage.removeItem(RADAR_STORAGE_KEY);
      }
    }
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToSafetySession(userId, () => void refresh());
  }, [refresh, userId]);

  const syncLocation = useCallback(async (fix: SafetyLocationFix) => {
    const activeSession = sessionRef.current;
    const preference = preferenceRef.current;
    const operations: Promise<unknown>[] = [];
    if (activeSession) operations.push(updateSafetyLocation(activeSession.id, fix, await getBatteryPercent()));
    if (preference.visibility !== 'off') {
      operations.push(setSafetyPresence({
        campus,
        visibility: preference.visibility,
        location: fix,
        statusMessage: preference.statusMessage,
        sharingUntil: preference.sharingUntil,
        confirmExact: preference.confirmExact,
      }));
    }
    if (operations.length) await Promise.all(operations);
  }, [campus]);

  const captureNow = useCallback(async () => {
    if (!navigator.geolocation) throw new Error('This device does not support browser location.');
    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 25_000,
          maximumAge: MAX_LOCATION_AGE_MS,
        });
      });
      const fix = await positionToFix(position, null);
      lastAddressRef.current = fix.readableLocation;
      setLocation(fix);
      await syncLocation(fix);
      setError(null);
      return fix;
    } catch (caught) {
      const message = isGeolocationError(caught)
        ? 'Location permission was denied or the device could not obtain a reliable position.'
        : caught instanceof Error ? caught.message : 'Unable to capture location.';
      setError(message);
      throw new Error(message);
    } finally {
      setLocating(false);
    }
  }, [syncLocation]);

  useEffect(() => {
    const shouldWatch = Boolean(session) || radarPreference.visibility !== 'off';
    if (!shouldWatch || !navigator.geolocation) {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
      return undefined;
    }

    void captureNow().catch(() => undefined);
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;
        lastSyncRef.current = now;
        void positionToFix(position, lastAddressRef.current).then(async (fix) => {
          setLocation(fix);
          await syncLocation(fix);
        }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Live location update failed.'));
      },
      () => setError('Live location paused because the device could not provide a position.'),
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: MAX_LOCATION_AGE_MS },
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [captureNow, radarPreference.visibility, session, syncLocation]);

  useEffect(() => {
    const shouldKeepAwake = Boolean(session && session.status !== 'completed' && session.status !== 'cancelled');
    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
      if (!shouldKeepAwake || !wakeLockApi) return;
      try {
        wakeLockRef.current = await wakeLockApi.request('screen');
      } catch {
        wakeLockRef.current = null;
      }
    };
    void requestWakeLock();
    return () => {
      const current = wakeLockRef.current;
      wakeLockRef.current = null;
      if (current) void current.release().catch(() => undefined);
    };
  }, [session]);

  const start = useCallback(async (input: Omit<StartSafetySessionInput, 'campus'>) => {
    setLoading(true);
    try {
      const next = await startSafetySession({ ...input, campus });
      setSession(next);
      sessionRef.current = next;
      await captureNow();
      return next;
    } finally {
      setLoading(false);
    }
  }, [campus, captureNow]);

  const finish = useCallback(async (status: 'completed' | 'cancelled' = 'completed') => {
    const active = sessionRef.current;
    if (!active) return;
    await endSafetySession(active.id, status);
    setSession(null);
    sessionRef.current = null;
  }, []);

  const alert = useCallback(async (reason: string) => {
    const active = sessionRef.current;
    if (!active) throw new Error('Start a Safety Mobility session before sending an alert.');
    await captureNow().catch(() => undefined);
    const result = await triggerSafetyAlert(active.id, reason);
    await refresh();
    return result;
  }, [captureNow, refresh]);

  const setRadar = useCallback(async (input: Omit<SetSafetyPresenceInput, 'campus' | 'location'>) => {
    const next: RadarPreference = {
      visibility: input.visibility,
      sharingUntil: input.sharingUntil ?? null,
      statusMessage: input.statusMessage ?? null,
      confirmExact: input.confirmExact ?? false,
    };
    if (next.visibility === 'off') {
      await setSafetyPresence({ campus, visibility: 'off' });
      localStorage.removeItem(RADAR_STORAGE_KEY);
      setRadarPreference(next);
      return;
    }
    const fix = location ?? await captureNow();
    await setSafetyPresence({ ...input, campus, location: fix });
    localStorage.setItem(RADAR_STORAGE_KEY, JSON.stringify(next));
    setRadarPreference(next);
  }, [campus, captureNow, location]);

  return {
    session,
    location,
    radarPreference,
    loading,
    locating,
    error,
    refresh,
    captureNow,
    start,
    finish,
    alert,
    setRadar,
  };
}
