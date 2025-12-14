import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Clock, CheckCircle, AlertCircle, TrendingUp, 
  BarChart3, ArrowLeft, User, Activity, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { CampusOverview } from './CampusOverview';
import { EmergencyCases } from './EmergencyCases';
import { GlassStatCard, CircularGauge, LiveIndicator, HeatmapCalendar } from './metrics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { format, subDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import type { Tables } from '@/integrations/supabase/types';

type IncidentStatus = Database['public']['Enums']['incident_status'];
type IncidentCategory = Database['public']['Enums']['incident_category'];
type Incident = Tables<'incidents'>;

interface Stats {
  total: number;
  pending: number;
  assigned: number;
  resolved: number;
  rejected: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning',
  assigned: 'bg-blue-500',
  resolved: 'bg-success',
  rejected: 'bg-destructive'
};

export const AdminOverview = () => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, isLoading, incidentsPagination, loadMoreIncidents, getIncidentsByCampus, lastSyncTime } = useMasterSync();
  
  const [selectedView, setSelectedView] = useState<'total' | 'pending' | 'assigned' | 'resolved' | 'rejected' | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filter incidents by campus if user has a campus
  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  // Calculate stats from incidents
  const stats = useMemo<Stats>(() => ({
    total: incidents.length,
    pending: incidents.filter(i => i.status === 'pending').length,
    assigned: incidents.filter(i => i.status === 'assigned').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    rejected: incidents.filter(i => i.status === 'rejected').length,
  }), [incidents]);

  // Calculate resolution rate
  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  // Sparkline data for each stat (last 7 days)
  const getSparklineData = useCallback((statusFilter?: IncidentStatus) => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const filtered = incidents.filter(inc => {
        const incDate = format(new Date(inc.created_at), 'yyyy-MM-dd');
        if (statusFilter) {
          return incDate === date && inc.status === statusFilter;
        }
        return incDate === date;
      });
      return filtered.length;
    });
  }, [incidents]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const data: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();
    
    incidents.forEach(inc => {
      const date = format(new Date(inc.created_at), 'yyyy-MM-dd');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    dateMap.forEach((count, date) => {
      data.push({ date, count });
    });
    
    return data;
  }, [incidents]);

  // Calculate category data
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [incidents]);

  // Calculate trend data (last 7 days) with area chart data
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, 'yyyy-MM-dd');
    });

    return last7Days.map(date => {
      const dayIncidents = incidents.filter(inc => 
        format(new Date(inc.created_at), 'yyyy-MM-dd') === date
      );
      return {
        date: format(new Date(date), 'EEE'),
        incidents: dayIncidents.length,
        resolved: dayIncidents.filter(i => i.status === 'resolved').length,
      };
    });
  }, [incidents]);

  // Filtered incidents based on selected view
  const filteredIncidents = useMemo(() => {
    if (!selectedView) return [];
    if (selectedView === 'total') return incidents;
    return incidents.filter(i => i.status === selectedView);
  }, [incidents, selectedView]);

  const handleStatClick = useCallback((view: 'total' | 'pending' | 'assigned' | 'resolved' | 'rejected') => {
    setSelectedView(view);
    setSelectedIncident(null);
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedView('total');
    setSelectedIncident(null);
  }, []);

  const closeMetricsView = useCallback(() => {
    setSelectedView(null);
    setSelectedIncident(null);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Live Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-4 py-2 rounded-xl bg-muted/30 border border-border/50"
      >
        <div className="flex items-center gap-3">
          <LiveIndicator status="online" lastSync={lastSyncTime || undefined} />
          <span className="text-sm text-muted-foreground">
            Real-time monitoring active
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {incidents.length} total cases
        </Badge>
      </motion.div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlassStatCard
          title="Total Cases"
          value={stats.total}
          icon={Activity}
          color="primary"
          delay={0}
          onClick={() => handleStatClick('total')}
          isActive={selectedView === 'total'}
          sparklineData={getSparklineData()}
          showLiveIndicator
        />
        <GlassStatCard
          title="Pending"
          value={stats.pending}
          subtitle="Needs review"
          icon={Clock}
          color="warning"
          delay={0.05}
          onClick={() => handleStatClick('pending')}
          isActive={selectedView === 'pending'}
          sparklineData={getSparklineData('pending')}
        />
        <GlassStatCard
          title="Assigned"
          value={stats.assigned}
          subtitle="In progress"
          icon={Users}
          color="info"
          delay={0.1}
          onClick={() => handleStatClick('assigned')}
          isActive={selectedView === 'assigned'}
          sparklineData={getSparklineData('assigned')}
        />
        <GlassStatCard
          title="Resolved"
          value={stats.resolved}
          subtitle="Completed"
          icon={CheckCircle}
          color="success"
          delay={0.15}
          onClick={() => handleStatClick('resolved')}
          isActive={selectedView === 'resolved'}
          sparklineData={getSparklineData('resolved')}
        />
        <GlassStatCard
          title="Rejected"
          value={stats.rejected}
          icon={AlertCircle}
          color="danger"
          delay={0.2}
          onClick={() => handleStatClick('rejected')}
          isActive={selectedView === 'rejected'}
          sparklineData={getSparklineData('rejected')}
        />
        
        {/* Circular Gauge for Resolution Rate */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center"
        >
          <Card className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
            <CircularGauge
              value={resolutionRate}
              size="sm"
              color="gradient"
              label="Resolution"
              animated
            />
          </Card>
        </motion.div>
      </div>

      {/* Interactive Metrics Panel - Shows when stat is clicked */}
      <AnimatePresence>
        {selectedView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-elevated border-primary/20 overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    {selectedView === 'total' ? 'All Cases' : `${selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} Cases`}
                    <Badge variant="secondary" className="ml-2">{filteredIncidents.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={closeMetricsView}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Charts Section */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category Distribution with premium styling */}
                      <Card className="p-4 bg-gradient-to-br from-muted/20 to-transparent">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Category Distribution
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={categoryData}>
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                              }} 
                            />
                            <Bar 
                              dataKey="value" 
                              fill="url(#barGradient)" 
                              radius={[6, 6, 0, 0]}
                              cursor="pointer"
                              onClick={(data) => handleCategoryClick(data.fullName)}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>

                      {/* Trend Chart with Area */}
                      <Card className="p-4 bg-gradient-to-br from-muted/20 to-transparent">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          7-Day Trend
                        </h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={trendData}>
                            <defs>
                              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                            <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '12px',
                                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="incidents" 
                              stroke="hsl(var(--primary))" 
                              fill="url(#areaGradient)"
                              strokeWidth={2}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="resolved" 
                              stroke="hsl(var(--success))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--success))', r: 3 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Card>
                    </div>

                    {/* Heatmap Calendar */}
                    <Card className="p-4 bg-gradient-to-br from-muted/20 to-transparent">
                      <h4 className="text-sm font-semibold mb-3">Incident Activity Heatmap</h4>
                      <HeatmapCalendar 
                        data={heatmapData} 
                        weeks={8}
                        colorScheme="default"
                      />
                    </Card>
                  </div>

                  {/* Incidents List - Clickable to see student data */}
                  <div>
                    <Card className="p-4 bg-gradient-to-br from-muted/20 to-transparent">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Cases List
                      </h4>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-2">
                          {filteredIncidents.map((incident, index) => (
                            <motion.div
                              key={incident.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div
                                className="p-3 rounded-xl border cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/50 hover:shadow-soft group"
                                onClick={() => setSelectedIncident(incident)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                      {incident.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{incident.category}</p>
                                  </div>
                                  <Badge variant="outline" className={`${STATUS_COLORS[incident.status]} text-white text-xs`}>
                                    {incident.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                          {filteredIncidents.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No cases found</p>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </div>

                  {/* Case Details Popup Dialog */}
                  <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
                    <DialogContent className="max-w-lg bg-background">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-primary" />
                          Case Details
                        </DialogTitle>
                      </DialogHeader>
                      {selectedIncident && (
                        <div className="space-y-4">
                          {/* Case Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{selectedIncident.title}</h3>
                              <Badge className={`${STATUS_COLORS[selectedIncident.status]} text-white`}>
                                {selectedIncident.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{selectedIncident.category}</p>
                            <p className="text-xs text-muted-foreground">
                              Reported: {format(new Date(selectedIncident.created_at), 'PPpp')}
                            </p>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">{selectedIncident.description}</p>
                          </div>

                          {/* Reporter Details */}
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              Reporter Details
                            </h4>
                            {selectedIncident.is_anonymous ? (
                              <p className="text-sm text-muted-foreground italic">Anonymous Report</p>
                            ) : selectedIncident.reporter_id ? (
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="col-span-2">
                                  <span className="text-muted-foreground block text-xs">Reporter ID</span>
                                  <span className="font-medium text-xs truncate">{selectedIncident.reporter_id}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No reporter data available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campus Overview Section for Super Admin */}
      {!selectedView && (
        <div className="space-y-6">
          <CampusOverview />
          <div className="mt-4">
            <EmergencyCases />
          </div>
        </div>
      )}
    </div>
  );
};
