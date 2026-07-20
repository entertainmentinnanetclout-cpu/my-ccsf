import { useCallback, useEffect, useRef, useState } from 'react';
import { PILOT_LOCATION_STORAGE_KEY } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { insertPilotLocationEvent, recordPilotFeatureTest } from '@/services/pilot/pilotCoreService';
import type { PilotReport } from '@/types/pilot';

interface PilotCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
}

interface TrackingState {
  reportId: string;
  sessionId: string;
  programId: string;
  startedAt: string;
}

export function usePilotLocationTracking(report?: PilotReport | null) {
  const [coordinates, setCoordinates] = useState<PilotCoordinates | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const trackingRef = useRef(false);
  const startedAt = useRef<number | null>(null);

  const persistPosition = useCallback(async (
    position: GeolocationPosition,
    source: 'initial_fix' | 'live_tracking' | 'manual_pin' | 'resumed_tracking',
  ) => {
    if (!report) throw new Error('A Pilot report is required for location testing.');
    const next: PilotCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy ?? null,
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
    };
    setCoordinates(next);
    await insertPilotLocationEvent({
      program_id: report.program_id,
      session_id: report.session_id,
      report_id: report.id,
      user_id: report.submitted_by,
      latitude: next.latitude,
      longitude: next.longitude,
      accuracy: next.accuracy,
      altitude: next.altitude,
      heading: next.heading,
      speed: next.speed,
      source,
    });
  }, [report]);

  const captureOnce = useCallback(async () => {
    if (!report) throw new Error('Create a simulated report before testing location.');
    setLoading(true);
    setError(null);
    const started = performance.now();
    try {
      const { position, acquisition, permission } = await captureBrowserPosition();
      await persistPosition(position, 'initial_fix');
      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: 'location_initial_fix',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: {
          accuracy: position.coords.accuracy,
          acquisition,
          permission,
        },
      });
      return position;
    } catch (caught) {
      const failure = normalizeGeolocationError(caught);
      setError(failure.message);
      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: 'location_initial_fix',
        outcome: failure.denied ? 'denied' : 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: `${failure.code ?? 'unknown'}:${failure.message}`,
      }).catch(() => undefined);
      throw new Error(failure.message);
    } finally {
      setLoading(false);
    }
  }, [persistPosition, report]);

  const stopTracking = useCallback(async () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    trackingRef.current = false;
    setTracking(false);
    localStorage.removeItem(PILOT_LOCATION_STORAGE_KEY);
    if (report && startedAt.current !== null) {
      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: 'location_live_tracking',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - startedAt.current),
      }).catch(() => undefined);
    }
    startedAt.current = null;
  }, [report]);

  const startTracking = useCallback((resumed = false) => {
    if (!navigator.geolocation || !report || trackingRef.current) return;
    setError(null);
    startedAt.current = performance.now();
    const state: TrackingState = {
      reportId: report.id,
      sessionId: report.session_id,
      programId: report.program_id,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(PILOT_LOCATION_STORAGE_KEY, JSON.stringify(state));
    trackingRef.current = true;
    setTracking(true);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        void persistPosition(position, resumed ? 'resumed_tracking' : 'live_tracking').catch((caught) => {
          const failure = normalizeGeolocationError(caught);
          setError(failure.message);
        });
      },
      (positionError) => {
        const failure = normalizeGeolocationError(positionError);
        setError(failure.message);
        void recordPilotFeatureTest({
          programId: report.program_id,
          sessionId: report.session_id,
          reportId: report.id,
          featureKey: 'location_live_tracking',
          outcome: failure.denied ? 'denied' : 'failed',
          errorCode: `${failure.code ?? 'unknown'}:${failure.message}`,
        }).catch(() => undefined);
      },
      { enableHighAccuracy: false, timeout: 25000, maximumAge: 10000 },
    );
  }, [persistPosition, report]);

  useEffect(() => {
    if (!report) return;
    const stored = localStorage.getItem(PILOT_LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const state = JSON.parse(stored) as TrackingState;
        if (state.reportId === report.id) startTracking(true);
        else localStorage.removeItem(PILOT_LOCATION_STORAGE_KEY);
      } catch {
        localStorage.removeItem(PILOT_LOCATION_STORAGE_KEY);
      }
    }
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      trackingRef.current = false;
    };
  }, [report, startTracking]);

  return { coordinates, tracking, loading, error, captureOnce, startTracking, stopTracking };
}
