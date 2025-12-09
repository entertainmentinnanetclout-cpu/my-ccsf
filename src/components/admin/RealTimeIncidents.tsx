import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { IncidentDetailsModal } from './IncidentDetailsModal';

type Incident = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

export const RealTimeIncidents = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching incidents:', error);
      } else {
        setIncidents(data || []);
      }
    };

    fetchIncidents();

    const channel = supabase.channel('incidents');
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        setIncidents((prev) => [payload.new as Incident, ...prev].slice(0, 5));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Latest Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent incidents</p>
            ) : (
              incidents.map((incident, index) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedIncidentId(incident.id)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{incident.title}</p>
                        {incident.category === 'emergency' && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Emergency
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(incident.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {selectedIncidentId && (
        <IncidentDetailsModal
          incidentId={selectedIncidentId}
          isOpen={!!selectedIncidentId}
          onClose={() => setSelectedIncidentId(null)}
        />
      )}
    </>
  );
};
