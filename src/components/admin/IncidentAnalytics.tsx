import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Timer, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInHours } from 'date-fns';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { Button } from '@/components/ui/button';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

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
    ? ((stats.resolved / stats.total) * 100).toFixed(1)
    : '0';

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
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
      {/* Header with Sync Info */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Incident Analytics</h2>
        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <Badge variant="outline" className="text-xs">
              Last sync: {format(lastSyncTime, 'HH:mm:ss')}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={refreshIncidents}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600">Resolved</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600">Emergencies</p>
                  <p className="text-2xl font-bold text-red-600">{stats.emergencies}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Resolution Rate</p>
                  <p className="text-2xl font-bold">{resolutionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                  <p className="text-2xl font-bold">{avgResponseTime.toFixed(1)}h</p>
                </div>
                <Timer className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Incident Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="emergencies" stroke="#ef4444" strokeWidth={2} name="Emergencies" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
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
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
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
            <CardTitle className="text-lg">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EMERGENCY_CATEGORIES.includes(entry.name) ? '#ef4444' : COLORS[index % COLORS.length]} 
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
            <CardTitle className="text-lg">Incidents by Campus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} height={60} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
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
