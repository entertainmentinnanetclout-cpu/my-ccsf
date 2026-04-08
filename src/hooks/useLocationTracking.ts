import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TRACKING_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = 'emergency_tracking';
const MAX_ACCURACY_METERS = 100; // Only accept locations with accuracy < 100m
const LOCATION_TIMEOUT = 30000; // 30 second timeout for high accuracy

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

// Get high-accuracy location with retries
const getHighAccuracyLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    let bestPosition: GeolocationPosition | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    const tryGetPosition = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          console.log(`Location attempt ${attempts + 1}: accuracy ${accuracy.toFixed(1)}m`);

          // If accuracy is good enough, use it immediately
          if (accuracy <= MAX_ACCURACY_METERS) {
            resolve(position);
            return;
          }

          // Keep the best position we've seen
          if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          attempts++;
          if (attempts < maxAttempts) {
            // Wait a bit and try again for better accuracy
            setTimeout(tryGetPosition, 2000);
          } else {
            // Use the best position we got
            if (bestPosition) {
              console.log(`Using best available position: ${bestPosition.coords.accuracy.toFixed(1)}m accuracy`);
              resolve(bestPosition);
            } else {
              reject(new Error('Could not get location'));
            }
          }
        },
        (error) => {
          attempts++;
          if (attempts < maxAttempts && bestPosition) {
            setTimeout(tryGetPosition, 1000);
          } else if (bestPosition) {
            resolve(bestPosition);
          } else {
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: LOCATION_TIMEOUT,
          maximumAge: 0 // Don't use cached positions
        }
      );
    };

    tryGetPosition();
  });
};

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const useLocationTracking = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // Send location update to the database
  const sendLocationUpdate = useCallback(async (incidentId: string) => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    try {
      const position = await getHighAccuracyLocation();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Skip if position hasn't changed significantly (more than 5 meters)
      if (lastPositionRef.current) {
        const distance = calculateDistance(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
          lat,
          lng
        );
        if (distance < 5) {
          console.log('Position unchanged, skipping update');
          return;
        }
      }

      lastPositionRef.current = { lat, lng };

      const address = await reverseGeocode(lat, lng);

      console.log(`Sending location update: ${address} (accuracy: ${accuracy.toFixed(1)}m)`);

      // Insert location update with accuracy
      const { error } = await supabase
        .from('incident_location_updates')
        .insert({
          incident_id: incidentId,
          location_lat: lat,
          location_lng: lng,
          location_address: address,
          accuracy_meters: accuracy
        });

      if (error) {
        console.error('Error sending location update:', error);
      } else {
        // Also update the main incident's location
        await supabase
          .from('incidents')
          .update({
            location_lat: lat,
            location_lng: lng,
            location_description: `${address} (±${Math.round(accuracy)}m accuracy)`,
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
    console.log('Starting high-accuracy location tracking for incident:', incidentId);
    
    // Save to localStorage for persistence across page refreshes
    const trackingState: TrackingState = {
      incidentId,
      startedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackingState));

    setCurrentIncidentId(incidentId);
    setIsTracking(true);
    lastPositionRef.current = null;

    // Send initial location update
    sendLocationUpdate(incidentId);

    // Use watchPosition for continuous high-accuracy tracking
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const accuracy = position.coords.accuracy;
          console.log(`Watch position update: ${accuracy.toFixed(1)}m accuracy`);
          
          // Only process if accuracy is acceptable
          if (accuracy <= MAX_ACCURACY_METERS * 2) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Check if moved significantly
            if (lastPositionRef.current) {
              const distance = calculateDistance(
                lastPositionRef.current.lat,
                lastPositionRef.current.lng,
                lat,
                lng
              );
              // Update if moved more than 10 meters
              if (distance >= 10) {
                lastPositionRef.current = { lat, lng };
              }
            } else {
              lastPositionRef.current = { lat, lng };
            }
          }
        },
        (error) => {
          console.error('Watch position error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: LOCATION_TIMEOUT,
          maximumAge: 5000 // Allow slightly cached for watch
        }
      );
    }

    // Start interval for database updates
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

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    localStorage.removeItem(STORAGE_KEY);
    setIsTracking(false);
    setCurrentIncidentId(null);
    lastPositionRef.current = null;
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

            // Start watch position
            if (navigator.geolocation) {
              watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                  const { latitude, longitude } = position.coords;
                  lastPositionRef.current = { lat: latitude, lng: longitude };
                },
                (error) => console.error('Watch error:', error),
                { enableHighAccuracy: true, timeout: LOCATION_TIMEOUT, maximumAge: 5000 }
              );
            }

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
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
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
