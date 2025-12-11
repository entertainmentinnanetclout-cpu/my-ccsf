import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { IncidentDetailsModal } from './IncidentDetailsModal';
import { useMasterSync } from '@/contexts/MasterSyncContext';

export const RealTimeIncidents = () => {
  const { incidents, isLoading } = useMasterSync();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Get the 5 most recent incidents
  const latestIncidents = useMemo(() => {
    return incidents.slice(0, 5);
  }, [incidents]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Latest Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {latestIncidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent incidents</p>
            ) : (
              latestIncidents.map((incident, index) => (
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
                        {incident.category === 'Rape' || incident.category === 'Murder' || incident.category === 'Armed robbery' ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Emergency
                          </Badge>
                        ) : null}
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
