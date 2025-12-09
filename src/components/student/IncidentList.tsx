import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Clock, MapPin, User, Eye, Navigation, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  location_description: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  reporter_id: string | null;
  campus: string | null;
}

export const IncidentList = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    fetchIncidents();

    // Real-time subscription for new incidents
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('Incident change:', payload);
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchIncidents();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500 text-white';
      case 'assigned': return 'bg-blue-500 text-white';
      case 'resolved': return 'bg-green-500 text-white';
      case 'rejected': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCampusName = (campus: string | null) => {
    const campusNames: Record<string, string> = {
      'pretoria_west_main': 'Pretoria West',
      'arcadia': 'Arcadia',
      'arts': 'Arts',
      'giyani': 'Giyani',
      'mbombela': 'Mbombela',
      'emalahleni': 'Emalahleni',
      'polokwane': 'Polokwane',
      'garankuwa': 'Ga-Rankuwa',
      'soshanguve_south': 'Soshanguve South',
      'soshanguve_north': 'Soshanguve North',
    };
    return campus ? campusNames[campus] || campus : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading incidents...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Reported Incidents</h2>
          <p className="text-sm text-muted-foreground">{incidents.length} incident(s) found</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {incidents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No incidents reported yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              When incidents are reported, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident, index) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer h-full border-l-4"
                style={{ 
                  borderLeftColor: incident.status === 'pending' ? '#eab308' : 
                                   incident.status === 'assigned' ? '#3b82f6' : 
                                   incident.status === 'resolved' ? '#22c55e' : '#ef4444'
                }}
                onClick={() => setSelectedIncident(incident)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{incident.title}</CardTitle>
                    <Badge className={`${getStatusColor(incident.status)} shrink-0`}>
                      {incident.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <span className="font-medium">{incident.category}</span>
                    {incident.campus && (
                      <>
                        <span>•</span>
                        <span>{getCampusName(incident.campus)}</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                  
                  {/* Location Display */}
                  {(incident.location_description || incident.location_lat) && (
                    <div className="p-2 bg-muted/50 rounded-md space-y-1">
                      {incident.location_description && (
                        <div className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-foreground line-clamp-2">{incident.location_description}</span>
                        </div>
                      )}
                      {incident.location_lat && incident.location_lng && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Navigation className="h-3 w-3" />
                          <span>GPS: {incident.location_lat.toFixed(4)}, {incident.location_lng.toFixed(4)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>{incident.is_anonymous ? 'Anonymous' : 'Identified'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <Eye className="h-4 w-4 mr-2" />View Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Incident Details Modal */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="text-xl">{selectedIncident.title}</span>
                  <Badge className={getStatusColor(selectedIncident.status)}>
                    {selectedIncident.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Category & Campus */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedIncident.category}</Badge>
                  {selectedIncident.campus && (
                    <Badge variant="secondary">{getCampusName(selectedIncident.campus)}</Badge>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">Description / Statement</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedIncident.description}</p>
                </div>

                {/* Location Details */}
                {(selectedIncident.location_description || selectedIncident.location_lat) && (
                  <div>
                    <h4 className="font-semibold mb-2">📍 Location Details</h4>
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg space-y-2">
                      {selectedIncident.location_description && (
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Full Address:</p>
                          <p className="text-green-800 dark:text-green-300">{selectedIncident.location_description}</p>
                        </div>
                      )}
                      {selectedIncident.location_lat && selectedIncident.location_lng && (
                        <div className="pt-2 border-t border-green-200 dark:border-green-700">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">GPS Coordinates:</p>
                          <p className="text-green-800 dark:text-green-300 font-mono">
                            {selectedIncident.location_lat.toFixed(6)}, {selectedIncident.location_lng.toFixed(6)}
                          </p>
                          <a 
                            href={`https://www.google.com/maps?q=${selectedIncident.location_lat},${selectedIncident.location_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                          >
                            <Navigation className="h-3 w-3" />
                            Open in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Reported</p>
                    <p className="font-medium">
                      {format(new Date(selectedIncident.created_at), 'PPpp')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({formatDistanceToNow(new Date(selectedIncident.created_at), { addSuffix: true })})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reporter</p>
                    <p className="font-medium">
                      {selectedIncident.is_anonymous ? 'Anonymous Report' : 'Identified Reporter'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
