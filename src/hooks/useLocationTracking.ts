import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRACKING_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = 'emergency_tracking';

interface TrackingState {
  incidentId: string;
  startedAt: string;
}

// Reverse geocode using free Nominatim API
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CCSF-Campus-Safety-App'
        }
      }
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

export const useLocationTracking = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);

  // Send location update to the database
  const sendLocationUpdate = useCallback(async (incidentId: string) => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const address = await reverseGeocode(lat, lng);

      // Insert location update
      const { error } = await supabase
        .from('incident_location_updates')
        .insert({
          incident_id: incidentId,
          location_lat: lat,
          location_lng: lng,
          location_address: address
        });

      if (error) {
        console.error('Error sending location update:', error);
      } else {
        console.log('Location update sent:', address);

        // Also update the main incident's location
        await supabase
          .from('incidents')
          .update({
            location_lat: lat,
            location_lng: lng,
            location_description: address,
            updated_at: new Date().toISOString()
          })
          .eq('id', incidentId);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }, []);

  // Check if incident is still active (not resolved/rejected)
  const checkIncidentStatus = useCallback(async (incidentId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('incidents')
      .select('status')
      .eq('id', incidentId)
      .single();

    if (error || !data) return false;
    return data.status !== 'resolved' && data.status !== 'rejected';
  }, []);

  // Start tracking location
  const startTracking = useCallback((incidentId: string) => {
    console.log('Starting location tracking for incident:', incidentId);
    
    // Save to localStorage for persistence across page refreshes
    const trackingState: TrackingState = {
      incidentId,
      startedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackingState));

    setCurrentIncidentId(incidentId);
    setIsTracking(true);

    // Send initial location update
    sendLocationUpdate(incidentId);

    // Start interval
    intervalRef.current = setInterval(async () => {
      const isActive = await checkIncidentStatus(incidentId);
      if (isActive) {
        sendLocationUpdate(incidentId);
      } else {
        console.log('Incident resolved, stopping tracking');
        stopTracking();
      }
    }, TRACKING_INTERVAL);
  }, [sendLocationUpdate, checkIncidentStatus]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    console.log('Stopping location tracking');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    localStorage.removeItem(STORAGE_KEY);
    setIsTracking(false);
    setCurrentIncidentId(null);
  }, []);

  // Resume tracking on mount if there's an active session
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const trackingState: TrackingState = JSON.parse(savedState);
        
        // Check if incident is still active
        checkIncidentStatus(trackingState.incidentId).then(isActive => {
          if (isActive) {
            console.log('Resuming location tracking for incident:', trackingState.incidentId);
            setCurrentIncidentId(trackingState.incidentId);
            setIsTracking(true);

            // Resume sending updates
            sendLocationUpdate(trackingState.incidentId);

            intervalRef.current = setInterval(async () => {
              const stillActive = await checkIncidentStatus(trackingState.incidentId);
              if (stillActive) {
                sendLocationUpdate(trackingState.incidentId);
              } else {
                stopTracking();
              }
            }, TRACKING_INTERVAL);
          } else {
            // Incident is no longer active, clean up
            localStorage.removeItem(STORAGE_KEY);
          }
        });
      } catch (error) {
        console.error('Error parsing tracking state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkIncidentStatus, sendLocationUpdate, stopTracking]);

  return {
    startTracking,
    stopTracking,
    isTracking,
    currentIncidentId
  };
};
