import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Radio, ExternalLink, Clock, Navigation } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationUpdate {
  id: string;
  incident_id: string;
  location_lat: number;
  location_lng: number;
  location_address: string | null;
  created_at: string;
}

interface LiveLocationTrackerProps {
  incidentId: string;
  currentLat?: number | null;
  currentLng?: number | null;
  currentAddress?: string | null;
}

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
        .limit(10);

      if (!error && data) {
        setLocationUpdates(data);
        setIsLiveTracking(data.length > 0);
        if (data.length > 0) {
          setLatestLocation(data[0]);
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
          setLocationUpdates(prev => [newUpdate, ...prev.slice(0, 9)]);
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

  return (
    <div className="space-y-4">
      {/* Live tracking indicator */}
      {isLiveTracking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <Radio className="h-4 w-4 text-red-600 animate-pulse" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
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

        {displayAddress ? (
          <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-300 flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              {displayAddress}
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
          <h4 className="text-sm font-medium text-muted-foreground">Location History</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            <AnimatePresence>
              {locationUpdates.slice(1).map((update, index) => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-2 bg-muted/30 rounded border text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                    </span>
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
                  <p className="text-foreground truncate">
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
