import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { MapPin, Radio, ExternalLink, Clock, Navigation, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationUpdate {
  id: string;
  incident_id: string;
  location_lat: number;
  location_lng: number;
  location_address: string | null;
  accuracy_meters: number | null;
  created_at: string;
}

interface LiveLocationTrackerProps {
  incidentId: string;
  currentLat?: number | null;
  currentLng?: number | null;
  currentAddress?: string | null;
}

const getAccuracyColor = (accuracy: number | null): string => {
  if (!accuracy) return 'text-muted-foreground';
  if (accuracy <= 10) return 'text-green-600 dark:text-green-400';
  if (accuracy <= 50) return 'text-emerald-600 dark:text-emerald-400';
  if (accuracy <= 100) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
};

const getAccuracyLabel = (accuracy: number | null): string => {
  if (!accuracy) return 'Unknown';
  if (accuracy <= 10) return 'Excellent';
  if (accuracy <= 50) return 'Good';
  if (accuracy <= 100) return 'Fair';
  return 'Low';
};

export const LiveLocationTracker = ({ 
  incidentId, 
  currentLat, 
  currentLng, 
  currentAddress 
}: LiveLocationTrackerProps) => {
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [latestLocation, setLatestLocation] = useState<LocationUpdate | null>(null);

  useEffect(() => {
    // Fetch existing location updates
    const fetchUpdates = async () => {
      const { data, error } = await supabase
        .from('incident_location_updates')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLocationUpdates(data as LocationUpdate[]);
        setIsLiveTracking(data.length > 0);
        if (data.length > 0) {
          setLatestLocation(data[0] as LocationUpdate);
        }
      }
    };

    fetchUpdates();

    // Subscribe to real-time location updates
    const channel = supabase
      .channel(`location-updates-${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_location_updates',
          filter: `incident_id=eq.${incidentId}`
        },
        (payload) => {
          const newUpdate = payload.new as LocationUpdate;
          setLatestLocation(newUpdate);
          setLocationUpdates(prev => [newUpdate, ...prev.slice(0, 19)]);
          setIsLiveTracking(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  const displayLat = latestLocation?.location_lat || currentLat;
  const displayLng = latestLocation?.location_lng || currentLng;
  const displayAddress = latestLocation?.location_address || currentAddress;
  const displayAccuracy = latestLocation?.accuracy_meters;

  return (
    <div className="space-y-4">
      {/* Live tracking indicator */}
      {isLiveTracking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-2 bg-destructive/5 dark:bg-destructive/10 border border-destructive/20 dark:border-destructive/30 rounded-lg"
        >
          <Radio className="h-4 w-4 text-destructive animate-pulse" />
          <span className="text-sm font-medium text-destructive dark:text-destructive">
            Live Location Tracking Active
          </span>
          <Badge variant="destructive" className="ml-auto text-xs">
            {locationUpdates.length} updates
          </Badge>
        </motion.div>
      )}

      {/* Current/Latest Location */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            {isLiveTracking ? 'Latest Location' : 'Last Known Location'}
          </h4>
          {latestLocation && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(latestLocation.created_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Accuracy indicator */}
        {displayAccuracy !== undefined && displayAccuracy !== null && (
          <div className="flex items-center gap-2 p-2 bg-background rounded border">
            <Target className={`h-4 w-4 ${getAccuracyColor(displayAccuracy)}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">GPS Accuracy</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getAccuracyColor(displayAccuracy)}`}
                >
                  {getAccuracyLabel(displayAccuracy)}
                </Badge>
              </div>
              <p className={`text-sm font-semibold ${getAccuracyColor(displayAccuracy)}`}>
                ±{displayAccuracy.toFixed(0)} meters
              </p>
            </div>
          </div>
        )}

        {displayAddress ? (
          <div className="p-3 bg-success/5 dark:bg-success/10 border border-success/20 dark:border-success/30 rounded-md">
            <p className="text-sm text-success dark:text-success flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{displayAddress}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No address available</p>
        )}

        {displayLat && displayLng && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${displayLat},${displayLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Maps
            </a>
          </div>
        )}
      </div>

      {/* Location History */}
      {locationUpdates.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Location History</span>
            <span className="text-xs">({locationUpdates.length - 1} previous)</span>
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            <AnimatePresence>
              {locationUpdates.slice(1).map((update, index) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-2 bg-muted/30 rounded border text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                      </span>
                      {update.accuracy_meters && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] px-1 py-0 ${getAccuracyColor(update.accuracy_meters)}`}
                        >
                          ±{update.accuracy_meters.toFixed(0)}m
                        </Badge>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${update.location_lat},${update.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  </div>
                  <p className="text-foreground line-clamp-2">
                    {update.location_address || `${update.location_lat.toFixed(4)}, ${update.location_lng.toFixed(4)}`}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
