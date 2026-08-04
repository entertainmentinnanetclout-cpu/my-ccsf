import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';

const STORAGE_KEY = 'emergency_tracking:v2';
const MAX_ACCURACY_METERS = 250;
const MIN_SEND_INTERVAL_MS = 15000;
const STATUS_INTERVAL_MS = 60000;
const MAX_TRACKING_DURATION_MS = 6 * 60 * 60 * 1000;

interface TrackingState { incidentId: string; startedAt: string }

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useLocationTracking = () => {
  const watchIdRef = useRef<number | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const sendingRef = useRef(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);

  const clearRuntime = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    watchIdRef.current = null;
    statusTimerRef.current = null;
    lastSentRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    clearRuntime();
    localStorage.removeItem(STORAGE_KEY);
    setIsTracking(false);
    setCurrentIncidentId(null);
  }, [clearRuntime]);

  const checkActive = useCallback(async (incidentId: string) => {
    const { data, error } = await supabase.from('incidents').select('status').eq('id', incidentId).maybeSingle();
    return !error && data && data.status !== 'resolved' && data.status !== 'rejected';
  }, []);

  const sendPosition = useCallback(async (incidentId: string, position: GeolocationPosition) => {
    if (sendingRef.current || position.coords.accuracy > MAX_ACCURACY_METERS) return;
    const now = Date.now();
    const previous = lastSentRef.current;
    const moved = previous ? distanceMeters(previous.latitude, previous.longitude, position.coords.latitude, position.coords.longitude) : Infinity;
    if (previous && now - previous.at < MIN_SEND_INTERVAL_MS && moved < 10) return;

    sendingRef.current = true;
    try {
      const resolved = await reverseGeocodeCoordinates(position.coords.latitude, position.coords.longitude);
      const label = resolved.address ?? formatCoordinatePair(position.coords.latitude, position.coords.longitude);
      const { error } = await supabase.rpc('record_emergency_location_update' as never, {
        p_incident_id: incidentId,
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude,
        p_accuracy_meters: position.coords.accuracy ?? null,
        p_location_description: label,
      } as never);
      if (!error) lastSentRef.current = { latitude: position.coords.latitude, longitude: position.coords.longitude, at: now };
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const beginWatch = useCallback((incidentId: string) => {
    clearRuntime();
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(incidentId, position),
      () => undefined,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
    );
    statusTimerRef.current = setInterval(() => {
      void checkActive(incidentId).then((active) => { if (!active) stopTracking(); });
    }, STATUS_INTERVAL_MS);
  }, [checkActive, clearRuntime, sendPosition, stopTracking]);

  const startTracking = useCallback((incidentId: string) => {
    const state: TrackingState = { incidentId, startedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setCurrentIncidentId(incidentId);
    setIsTracking(true);
    beginWatch(incidentId);
  }, [beginWatch]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return () => clearRuntime();
    try {
      const state = JSON.parse(raw) as TrackingState;
      const startedAt = new Date(state.startedAt).getTime();
      if (!state.incidentId || !Number.isFinite(startedAt) || Date.now() - startedAt > MAX_TRACKING_DURATION_MS) {
        stopTracking();
        return () => clearRuntime();
      }
      void checkActive(state.incidentId).then((active) => {
        if (!active) { stopTracking(); return; }
        setCurrentIncidentId(state.incidentId);
        setIsTracking(true);
        beginWatch(state.incidentId);
      });
    } catch {
      stopTracking();
    }
    return () => clearRuntime();
  }, [beginWatch, checkActive, clearRuntime, stopTracking]);

  return { startTracking, stopTracking, isTracking, currentIncidentId };
};
