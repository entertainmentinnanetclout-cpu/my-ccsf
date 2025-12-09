import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { IncidentDetailsModal } from './IncidentDetailsModal';

export const AdminIncidents = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();
    const channel = supabase.channel('admin-incidents').on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, fetchIncidents).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
    setIncidents(data || []);
  };

  return (
    <>
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No incidents reported yet
            </CardContent>
          </Card>
        ) : (
          incidents.map(incident => (
            <Card key={incident.id} onClick={() => setSelectedIncidentId(incident.id)} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{incident.title}</span>
                  <Badge>{incident.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{incident.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
