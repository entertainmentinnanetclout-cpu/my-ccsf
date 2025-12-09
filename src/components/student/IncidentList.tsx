import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Clock, MapPin, User, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  location_description: string;
  created_at: string;
  reporter_id: string | null;
}

export const IncidentList = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    fetchIncidents();

    const channel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchIncidents())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning';
      case 'assigned': return 'bg-primary';
      case 'resolved': return 'bg-success';
      case 'rejected': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader>
            <CardContent><div className="h-3 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No incidents reported yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {incidents.map((incident, index) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-medium transition-shadow cursor-pointer h-full" onClick={() => setSelectedIncident(incident)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{incident.title}</CardTitle>
                  <Badge className={getStatusColor(incident.status)}>{incident.status}</Badge>
                </div>
                <CardDescription>{incident.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{incident.description}</p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {incident.location_description && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">{incident.location_description}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{incident.is_anonymous ? 'Anonymous' : 'Reported'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />View Details
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedIncident.title}</span>
                  <Badge className={getStatusColor(selectedIncident.status)}>{selectedIncident.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div><h4 className="font-semibold mb-2">Category</h4><p className="text-muted-foreground">{selectedIncident.category}</p></div>
                <div><h4 className="font-semibold mb-2">Description</h4><p className="text-muted-foreground">{selectedIncident.description}</p></div>
                {selectedIncident.location_description && (
                  <div><h4 className="font-semibold mb-2">Location</h4><p className="text-muted-foreground">{selectedIncident.location_description}</p></div>
                )}
                <div><h4 className="font-semibold mb-2">Reported</h4><p className="text-muted-foreground">{formatDistanceToNow(new Date(selectedIncident.created_at), { addSuffix: true })}</p></div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
