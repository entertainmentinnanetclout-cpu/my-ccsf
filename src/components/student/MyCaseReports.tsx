import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, Clock, CheckCircle, AlertCircle, User, MapPin, Calendar, 
  Eye, Navigation, RefreshCw, ChevronRight, CalendarClock, MessageSquare 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { triggerHaptic } from '@/hooks/useHapticFeedback';

type Incident = Tables<'incidents'>;

interface CaseUpdate {
  id: string;
  incident_id: string;
  admin_id: string;
  update_type: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  created_at: string;
  admin?: {
    full_name: string | null;
  };
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string; bgColor: string }> = {
  pending: { color: 'bg-warning/20 text-warning border-warning/30', bgColor: 'hsl(var(--warning))', icon: <Clock className="h-3 w-3" />, label: 'Pending Review' },
  assigned: { color: 'bg-primary/20 text-primary border-primary/30', bgColor: 'hsl(var(--primary))', icon: <User className="h-3 w-3" />, label: 'Assigned' },
  resolved: { color: 'bg-success/20 text-success border-success/30', bgColor: 'hsl(var(--success))', icon: <CheckCircle className="h-3 w-3" />, label: 'Resolved' },
  rejected: { color: 'bg-destructive/20 text-destructive border-destructive/30', bgColor: 'hsl(var(--destructive))', icon: <AlertCircle className="h-3 w-3" />, label: 'Rejected' },
};

export const MyCaseReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchMyReports();

    // Real-time subscription for status updates
    const channel = supabase
      .channel('my-case-reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as Incident;
          if (record.reporter_id !== user.id && record.submitted_by !== user.id) return;
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Incident;
            setIncidents((prev) =>
              prev.map((inc) => (inc.id === updated.id ? updated : inc))
            );
            toast({
              title: 'Case Updated',
              description: `Your case "${updated.title}" status changed to ${updated.status}`,
            });
          } else {
            fetchMyReports();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchMyReports = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .or(`reporter_id.eq.${user.id},submitted_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({ title: 'Error', description: 'Failed to load your reports', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, toast]);

  const handlePullRefresh = useCallback(async () => {
    triggerHaptic('medium');
    await fetchMyReports();
  }, [fetchMyReports]);

  const fetchCaseUpdates = async (incidentId: string) => {
    setLoadingUpdates(true);
    try {
      const { data, error } = await supabase
        .from('case_updates')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaseUpdates(data || []);
    } catch (error) {
      console.error('Error fetching case updates:', error);
      setCaseUpdates([]);
      toast({ title: 'Case timeline unavailable', description: 'Status updates could not be loaded. Retry by reopening the case.', variant: 'destructive' });
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleViewDetails = (incident: Incident) => {
    triggerHaptic('light');
    setSelectedIncident(incident);
    fetchCaseUpdates(incident.id);
  };

  const handleRefresh = () => {
    triggerHaptic('light');
    setRefreshing(true);
    fetchMyReports();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUpcomingDates = (updates: CaseUpdate[]) => {
    return updates.filter(u => u.scheduled_date && new Date(u.scheduled_date) > new Date());
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

  return (
    <PullToRefresh onRefresh={handlePullRefresh}>
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-primary dark:text-[#F2A900]">My Case Reports</h2>
          <p className="text-sm text-muted-foreground dark:text-white/70">{incidents.length} case(s) submitted</p>
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
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Cases Reported</h3>
            <p className="text-muted-foreground">
              You haven't submitted any incident reports yet. Use the Report tab to submit one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incidents.map((incident, index) => {
            const status = statusConfig[incident.status] || statusConfig.pending;

            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer h-full border-l-4"
                  style={{ borderLeftColor: status.bgColor }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open case ${incident.title}, status ${status.label}`}
                  onClick={() => handleViewDetails(incident)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleViewDetails(incident);
                    }
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{incident.title}</CardTitle>
                      <Badge variant="outline" className={`${status.color} shrink-0`}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
                    
                    <Badge variant="secondary" className="text-xs">
                      {incident.category}
                    </Badge>

                    {incident.location_description && (
                      <div className="flex items-start gap-2 text-xs p-2 bg-muted/50 rounded-md">
                        <MapPin className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        <span className="text-foreground line-clamp-2">{incident.location_description}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                    </div>

                    {incident.resolution_notes && (
                      <div className="p-2 bg-success/10 border border-success/20 rounded-md">
                        <p className="text-xs font-medium text-success">Resolution:</p>
                        <p className="text-xs text-foreground line-clamp-2">{incident.resolution_notes}</p>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <Eye className="h-4 w-4 mr-2" />View Case Details
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Case Details Modal */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="text-xl">{selectedIncident.title}</span>
                  <Badge variant="outline" className={statusConfig[selectedIncident.status]?.color}>
                    {statusConfig[selectedIncident.status]?.icon}
                    <span className="ml-1">{statusConfig[selectedIncident.status]?.label}</span>
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Category */}
                <Badge variant="secondary">{selectedIncident.category}</Badge>

                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2 text-primary dark:text-[#F2A900]">Description / Statement</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedIncident.description}</p>
                </div>

                {/* Location Details */}
                {(selectedIncident.location_description || selectedIncident.location_lat) && (
                  <div>
                    <h4 className="font-semibold mb-2 text-primary dark:text-[#F2A900]">Location details</h4>
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg space-y-2">
                      {selectedIncident.location_description && (
                        <p className="text-foreground">{selectedIncident.location_description}</p>
                      )}
                      {selectedIncident.location_lat && selectedIncident.location_lng && (
                        <a 
                          href={`https://www.google.com/maps?q=${selectedIncident.location_lat},${selectedIncident.location_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Navigation className="h-3 w-3" />
                          Open in Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolution Notes */}
                {selectedIncident.resolution_notes && (
                  <div>
                    <h4 className="font-semibold mb-2 text-success">Official resolution</h4>
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-foreground">{selectedIncident.resolution_notes}</p>
                    </div>
                  </div>
                )}

                {/* Upcoming Scheduled Dates */}
                {getUpcomingDates(caseUpdates).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-warning flex items-center gap-2">
                      <CalendarClock className="h-5 w-5" />
                      Scheduled Appearances
                    </h4>
                    <div className="space-y-2">
                      {getUpcomingDates(caseUpdates).map((update) => (
                        <div 
                          key={update.id}
                          className="p-4 bg-warning/10 border border-warning/20 rounded-lg"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4 text-warning" />
                            <span className="font-medium text-foreground">
                              {format(new Date(update.scheduled_date!), 'PPPp')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{update.title}</p>
                          {update.description && (
                            <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Case Updates / Steps Taken */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary dark:text-[#F2A900]">
                    <MessageSquare className="h-5 w-5" />
                    Case Updates & Steps Taken
                  </h4>
                  
                  {loadingUpdates ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : caseUpdates.length === 0 ? (
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No updates yet. Your case is being reviewed.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {caseUpdates.map((update, idx) => (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative pl-6 pb-3 border-l-2 border-primary/30 last:border-l-0"
                        >
                          <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                          <div className="p-3 bg-card border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{update.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {update.description && (
                              <p className="text-sm text-muted-foreground">{update.description}</p>
                            )}
                            {update.scheduled_date && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                                <CalendarClock className="h-3 w-3" />
                                <span>Scheduled: {format(new Date(update.scheduled_date), 'PPp')}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Reported</p>
                    <p className="font-medium">
                      {format(new Date(selectedIncident.created_at), 'PPpp')}
                    </p>
                  </div>
                  {selectedIncident.resolved_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                      <p className="font-medium">
                        {format(new Date(selectedIncident.resolved_at), 'PPpp')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </>
    </PullToRefresh>
  );
};

export default MyCaseReports;