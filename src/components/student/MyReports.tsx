import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, CheckCircle, AlertCircle, User, MapPin, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pending: { color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
  assigned: { color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: <User className="h-3 w-3" />, label: 'Assigned' },
  in_progress: { color: 'bg-purple-500/20 text-purple-600 border-purple-500/30', icon: <AlertCircle className="h-3 w-3" />, label: 'In Progress' },
  resolved: { color: 'bg-green-500/20 text-green-600 border-green-500/30', icon: <CheckCircle className="h-3 w-3" />, label: 'Resolved' },
  closed: { color: 'bg-muted text-muted-foreground border-muted', icon: <CheckCircle className="h-3 w-3" />, label: 'Closed' },
};

export const MyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchMyReports = async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        toast({ title: 'Error', description: 'Failed to load your reports', variant: 'destructive' });
      } else {
        setIncidents(data || []);
      }
      setLoading(false);
    };

    fetchMyReports();

    // Real-time subscription for status updates
    const channel = supabase
      .channel('my-incidents')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `reporter_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Incident;
          setIncidents((prev) =>
            prev.map((inc) => (inc.id === updated.id ? updated : inc))
          );
          toast({
            title: 'Report Updated',
            description: `Your report "${updated.title}" status changed to ${updated.status}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
          <p className="text-muted-foreground">
            You haven't submitted any incident reports. Use the Report tab to submit one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            My Reports ({incidents.length})
          </CardTitle>
        </CardHeader>
      </Card>

      {incidents.map((incident, index) => {
        const status = statusConfig[incident.status] || statusConfig.pending;

        return (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{incident.title}</h3>
                      <Badge variant="outline" className={status.color}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {incident.description}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(incident.created_at)}
                      </div>
                      {incident.location_description && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {incident.location_description}
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {incident.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                {incident.resolution_notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm">
                      <span className="font-medium text-green-600">Resolution: </span>
                      {incident.resolution_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};