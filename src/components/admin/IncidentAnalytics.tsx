import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Timer, RefreshCw, Activity, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInHours } from 'date-fns';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { Button } from '@/components/ui/button';
import { GlassStatCard, CircularGauge, LiveIndicator, HeatmapCalendar, HourlyHeatmap } from './metrics';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const EMERGENCY_CATEGORIES = [
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder',
  'Armed robbery', 'Assault GBH', 'Public violence'
];

const campusDisplayNames: Record<string, string> = {
  pretoria_west_main: 'Pretoria West',
  arcadia: 'Arcadia',
  arts: 'Arts',
  giyani: 'Giyani',
  mbombela: 'Mbombela',
  polokwane: 'Polokwane',
  garankuwa: 'Ga-Rankuwa',
  soshanguve_south: 'Sosh South',
  soshanguve_north: 'Sosh North',
  emalahleni: 'eMalahleni'
};

export const IncidentAnalytics = () => {
  const { incidents, isLoading, refreshIncidents, lastSyncTime } = useMasterSync();

  // Calculate statistics from centralized data
  const stats = useMemo(() => ({
    total: incidents.length,
    pending: incidents.filter(i => i.status === 'pending').length,
    assigned: incidents.filter(i => i.status === 'assigned').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    rejected: incidents.filter(i => i.status === 'rejected').length,
    emergencies: incidents.filter(i => EMERGENCY_CATEGORIES.includes(i.category)).length
  }), [incidents]);

  // Calculate average response time (time to resolve)
  const avgResponseTime = useMemo(() => {
    const resolvedIncidents = incidents.filter(i => i.resolved_at);
    if (resolvedIncidents.length === 0) return 0;
    
    return resolvedIncidents.reduce((acc, i) => {
      const hours = differenceInHours(new Date(i.resolved_at!), new Date(i.created_at));
      return acc + hours;
    }, 0) / resolvedIncidents.length;
  }, [incidents]);

  // Resolution rate
  const resolutionRate = stats.total > 0 
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

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

  // Hourly pattern data
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    incidents.forEach(i => {
      const hour = new Date(i.created_at).getHours();
      hours[hour].count++;
    });
    return hours;
  }, [incidents]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name: name.length > 15 ? name.slice(0, 15) + '...' : name, fullName: name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [incidents]);

  // Campus breakdown
  const campusData = useMemo(() => {
    const campuses = incidents.reduce((acc, i) => {
      const campus = i.campus || 'Unknown';
      acc[campus] = (acc[campus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(campuses)
      .map(([name, value]) => ({ 
        name: campusDisplayNames[name] || name, 
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  // Daily trend data (last 30 days)
  const dailyTrend = useMemo(() => {
    return incidents.reduce((acc, i) => {
      const date = format(new Date(i.created_at), 'MMM dd');
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.total += 1;
        if (EMERGENCY_CATEGORIES.includes(i.category)) existing.emergencies += 1;
      } else {
        acc.push({ 
          date, 
          total: 1, 
          emergencies: EMERGENCY_CATEGORIES.includes(i.category) ? 1 : 0 
        });
      }
      return acc;
    }, [] as { date: string; total: number; emergencies: number }[]);
  }, [incidents]);

  // Status distribution for donut
  const statusData = useMemo(() => [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Assigned', value: stats.assigned, color: '#3b82f6' },
    { name: 'Resolved', value: stats.resolved, color: '#22c55e' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' }
  ].filter(s => s.value > 0), [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Incident Analytics
          </h2>
          <p className="text-muted-foreground text-sm">Real-time insights across all campuses</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator status="online" lastSync={lastSyncTime || undefined} />
          <Button variant="ghost" size="icon" onClick={refreshIncidents}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlassStatCard
          title="Total Cases"
          value={stats.total}
          icon={Activity}
          color="primary"
          delay={0}
          showLiveIndicator
        />
        <GlassStatCard
          title="Pending"
          value={stats.pending}
          subtitle="Needs review"
          icon={Clock}
          color="warning"
          delay={0.05}
        />
        <GlassStatCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle}
          color="success"
          delay={0.1}
        />
        <GlassStatCard
          title="Emergencies"
          value={stats.emergencies}
          subtitle="High priority"
          icon={AlertTriangle}
          color="danger"
          delay={0.15}
        />
        
        {/* Resolution Rate Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full flex items-center justify-center p-4 bg-gradient-to-br from-muted/30 to-muted/10">
            <CircularGauge
              value={resolutionRate}
              size="sm"
              color="gradient"
              label="Resolution"
            />
          </Card>
        </motion.div>

        <GlassStatCard
          title="Avg Response"
          value={`${avgResponseTime.toFixed(1)}h`}
          subtitle="Time to resolve"
          icon={Timer}
          color="info"
          delay={0.25}
        />
      </div>

      {/* Activity Heatmaps Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              12-Week Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <HeatmapCalendar data={heatmapData} weeks={12} colorScheme="default" />
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Hourly Incident Pattern
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <HourlyHeatmap data={hourlyData} colorScheme="danger" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Incident Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#totalGradient)" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="emergencies" stroke="#ef4444" strokeWidth={2} name="Emergencies" dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <defs>
                    <linearGradient id="categoryGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                    }} 
                  />
                  <Bar dataKey="value" fill="url(#categoryGradient)" radius={[0, 6, 6, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EMERGENCY_CATEGORIES.includes(entry.fullName) ? '#ef4444' : COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campus Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Incidents by Campus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campusData}>
                  <defs>
                    <linearGradient id="campusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)'
                    }} 
                  />
                  <Bar dataKey="value" fill="url(#campusGradient)" radius={[6, 6, 0, 0]}>
                    {campusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
