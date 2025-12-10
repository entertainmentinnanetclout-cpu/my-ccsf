import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  XCircle,
  Building2
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type CampusLocation = Database['public']['Enums']['campus_location'];
type Incident = Database['public']['Tables']['incidents']['Row'];

interface CampusMetrics {
  total: number;
  pending: number;
  assigned: number;
  resolved: number;
  rejected: number;
  emergencies: number;
}

const campusData: { id: CampusLocation; name: string; image?: string }[] = [
  { id: 'pretoria_west_main', name: 'Pretoria West' },
  { id: 'arcadia', name: 'Arcadia' },
  { id: 'arts', name: 'Arts Campus' },
  { id: 'giyani', name: 'Giyani' },
  { id: 'mbombela', name: 'Mbombela' },
  { id: 'polokwane', name: 'Polokwane' },
  { id: 'garankuwa', name: 'Ga-Rankuwa' },
  { id: 'soshanguve_south', name: 'Soshanguve South' },
  { id: 'soshanguve_north', name: 'Soshanguve North' },
  { id: 'emalahleni', name: 'Emalahleni' },
];

const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg ${color}`}>
    <Icon className="h-5 w-5" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  </div>
);

export const CampusOverview = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState<CampusLocation | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setIncidents(data);
      }
      setLoading(false);
    };

    fetchIncidents();
  }, []);

  const getCampusMetrics = (campusId: CampusLocation): CampusMetrics => {
    const campusIncidents = incidents.filter(i => i.campus === campusId);
    return {
      total: campusIncidents.length,
      pending: campusIncidents.filter(i => i.status === 'pending').length,
      assigned: campusIncidents.filter(i => i.status === 'assigned').length,
      resolved: campusIncidents.filter(i => i.status === 'resolved').length,
      rejected: campusIncidents.filter(i => i.status === 'rejected').length,
      emergencies: campusIncidents.filter(i => i.title.includes('EMERGENCY')).length,
    };
  };

  const selectedMetrics = selectedCampus ? getCampusMetrics(selectedCampus) : null;
  const selectedCampusData = campusData.find(c => c.id === selectedCampus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Campus Overview</h2>
        <Badge variant="outline" className="text-xs">
          {incidents.length} total incidents
        </Badge>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {campusData.map((campus, index) => {
            const metrics = getCampusMetrics(campus.id);
            const hasEmergencies = metrics.emergencies > 0;
            const hasPending = metrics.pending > 0;

            return (
              <motion.button
                key={campus.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCampus(campus.id)}
                className={`relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  hasEmergencies 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : hasPending 
                      ? 'border-amber-500/30 bg-amber-500/5' 
                      : 'border-border bg-card'
                }`}
              >
                {/* Campus Image Placeholder */}
                <div className="h-20 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary/40" />
                </div>

                {/* Campus Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {campus.name}
                  </h3>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center p-1 rounded bg-muted/50">
                      <p className="font-bold text-foreground">{metrics.total}</p>
                      <p className="text-muted-foreground text-[10px]">Total</p>
                    </div>
                    <div className="text-center p-1 rounded bg-green-500/10">
                      <p className="font-bold text-green-600">{metrics.resolved}</p>
                      <p className="text-muted-foreground text-[10px]">Resolved</p>
                    </div>
                    <div className="text-center p-1 rounded bg-amber-500/10">
                      <p className="font-bold text-amber-600">{metrics.pending}</p>
                      <p className="text-muted-foreground text-[10px]">Pending</p>
                    </div>
                  </div>

                  {/* Emergency Badge */}
                  {hasEmergencies && (
                    <div className="flex items-center gap-1 text-destructive text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{metrics.emergencies} emergency</span>
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
                  hasEmergencies 
                    ? 'bg-destructive animate-pulse' 
                    : hasPending 
                      ? 'bg-amber-500' 
                      : metrics.total > 0 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                }`} />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Detailed Metrics Dialog */}
      <Dialog open={!!selectedCampus} onOpenChange={() => setSelectedCampus(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedCampusData?.name} Campus
            </DialogTitle>
          </DialogHeader>

          {selectedMetrics && (
            <div className="space-y-4">
              {/* Campus Image Placeholder */}
              <div className="h-32 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border">
                <div className="text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Campus entrance image</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={FileText} 
                  label="Total Cases" 
                  value={selectedMetrics.total} 
                  color="bg-muted/50"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  label="Emergencies" 
                  value={selectedMetrics.emergencies} 
                  color="bg-destructive/10 text-destructive"
                />
                <MetricCard 
                  icon={Clock} 
                  label="Pending" 
                  value={selectedMetrics.pending} 
                  color="bg-amber-500/10 text-amber-600"
                />
                <MetricCard 
                  icon={TrendingUp} 
                  label="Assigned" 
                  value={selectedMetrics.assigned} 
                  color="bg-blue-500/10 text-blue-600"
                />
                <MetricCard 
                  icon={CheckCircle} 
                  label="Resolved" 
                  value={selectedMetrics.resolved} 
                  color="bg-green-500/10 text-green-600"
                />
                <MetricCard 
                  icon={XCircle} 
                  label="Rejected" 
                  value={selectedMetrics.rejected} 
                  color="bg-red-500/10 text-red-600"
                />
              </div>

              {/* Quick Actions could go here */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Click to view detailed campus incidents
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
