import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { 
  Users, Clock, CheckCircle, AlertCircle, TrendingUp, 
  BarChart3, ArrowLeft, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { CampusOverview } from './CampusOverview';
import { EmergencyCases } from './EmergencyCases';
import { AnimatedCounter } from './AnimatedCounter';
import { VirtualIncidentList } from '@/components/shared/VirtualIncidentList';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format } from 'date-fns';
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
  pending: 'bg-amber-500',
  assigned: 'bg-blue-500',
  resolved: 'bg-green-500',
  rejected: 'bg-destructive'
};

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  delay = 0,
  onClick,
  isActive
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string; 
  delay?: number;
  onClick?: () => void;
  isActive?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Card 
      className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold"><AnimatedCounter to={value} /></p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const AdminOverview = () => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, isLoading, incidentsPagination, loadMoreIncidents, getIncidentsByCampus } = useMasterSync();
  
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

  // Calculate category data
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [incidents]);

  // Calculate trend data (last 7 days)
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, 'yyyy-MM-dd');
    });

    const trendMap = incidents.reduce((acc, inc) => {
      const date = format(new Date(inc.created_at), 'yyyy-MM-dd');
      if (last7Days.includes(date)) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return last7Days.map(date => ({
      date: format(new Date(date), 'EEE'),
      incidents: trendMap[date] || 0
    }));
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
      {/* Quick Stats Row - Now Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard 
          title="Total Cases" 
          value={stats.total} 
          icon={Users} 
          color="bg-primary" 
          delay={0} 
          onClick={() => handleStatClick('total')}
          isActive={selectedView === 'total'}
        />
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          icon={Clock} 
          color="bg-amber-500" 
          delay={0.1}
          onClick={() => handleStatClick('pending')}
          isActive={selectedView === 'pending'}
        />
        <StatCard 
          title="Assigned" 
          value={stats.assigned} 
          icon={AlertCircle} 
          color="bg-blue-500" 
          delay={0.2}
          onClick={() => handleStatClick('assigned')}
          isActive={selectedView === 'assigned'}
        />
        <StatCard 
          title="Resolved" 
          value={stats.resolved} 
          icon={CheckCircle} 
          color="bg-green-500" 
          delay={0.3}
          onClick={() => handleStatClick('resolved')}
          isActive={selectedView === 'resolved'}
        />
        <StatCard 
          title="Rejected" 
          value={stats.rejected} 
          icon={TrendingUp} 
          color="bg-destructive" 
          delay={0.4}
          onClick={() => handleStatClick('rejected')}
          isActive={selectedView === 'rejected'}
        />
      </div>

      {/* Interactive Metrics Panel - Shows when stat is clicked */}
      {selectedView && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {selectedView === 'total' ? 'All Cases' : `${selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} Cases`}
                  <Badge variant="secondary">{filteredIncidents.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={closeMetricsView}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Distribution - Clickable */}
                    <Card className="p-4">
                      <h4 className="text-sm font-medium mb-3">Category Distribution</h4>
                      <p className="text-xs text-muted-foreground mb-2">Click a bar to filter</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={categoryData}>
                          <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar 
                            dataKey="value" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                            cursor="pointer"
                            onClick={(data) => handleCategoryClick(data.name)}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {/* Trend Chart */}
                    <Card className="p-4">
                      <h4 className="text-sm font-medium mb-3">7-Day Trend</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trendData}>
                          <XAxis dataKey="date" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="incidents" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>

                  {/* Pie Chart */}
                  <Card className="p-4">
                    <h4 className="text-sm font-medium mb-3">Top Categories</h4>
                    <p className="text-xs text-muted-foreground mb-2">Click a slice to filter</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie 
                          data={categoryData} 
                          dataKey="value" 
                          nameKey="name" 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          cursor="pointer"
                          onClick={(_, index) => handleCategoryClick(categoryData[index].name)}
                        >
                          {categoryData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                {/* Incidents List - Clickable to see student data */}
                <div>
                  <Card className="p-4">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Cases List
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">Click a case to see details</p>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {filteredIncidents.map((incident) => (
                          <motion.div
                            key={incident.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div
                              className="p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/50"
                              onClick={() => setSelectedIncident(incident)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{incident.title}</p>
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
