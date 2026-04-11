import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Timer, RefreshCw, Shield, Target, Zap, Brain, Eye, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInHours, subDays, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from './AnimatedCounter';

const COLORS = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6', '#ec4899', '#14b8a6', 'hsl(var(--accent))'];

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

export const CampusAnalytics = () => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, isLoading, refreshIncidents, lastSyncTime } = useMasterSync();

  const campusName = userProfile?.campus 
    ? campusDisplayNames[userProfile.campus] || userProfile.campus 
    : 'Campus';

  // Filter incidents for this campus only
  const incidents = useMemo(() => {
    if (!userProfile?.campus) return [];
    return allIncidents.filter(i => i.campus === userProfile.campus);
  }, [allIncidents, userProfile?.campus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);

    const thisWeekIncidents = incidents.filter(i => 
      isWithinInterval(new Date(i.created_at), { start: thisWeekStart, end: thisWeekEnd })
    );
    const lastWeekIncidents = incidents.filter(i => 
      isWithinInterval(new Date(i.created_at), { start: lastWeekStart, end: lastWeekEnd })
    );

    return {
      total: incidents.length,
      pending: incidents.filter(i => i.status === 'pending').length,
      assigned: incidents.filter(i => i.status === 'assigned').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      rejected: incidents.filter(i => i.status === 'rejected').length,
      emergencies: incidents.filter(i => EMERGENCY_CATEGORIES.includes(i.category)).length,
      thisWeek: thisWeekIncidents.length,
      lastWeek: lastWeekIncidents.length,
      weeklyTrend: thisWeekIncidents.length - lastWeekIncidents.length,
    };
  }, [incidents]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const resolvedIncidents = incidents.filter(i => i.resolved_at);
    const avgResponseTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((acc, i) => acc + differenceInHours(new Date(i.resolved_at!), new Date(i.created_at)), 0) / resolvedIncidents.length
      : 0;
    
    const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
    
    // Calculate response time breakdown
    const fastResponses = resolvedIncidents.filter(i => differenceInHours(new Date(i.resolved_at!), new Date(i.created_at)) < 24).length;
    const mediumResponses = resolvedIncidents.filter(i => {
      const hours = differenceInHours(new Date(i.resolved_at!), new Date(i.created_at));
      return hours >= 24 && hours < 72;
    }).length;
    const slowResponses = resolvedIncidents.filter(i => differenceInHours(new Date(i.resolved_at!), new Date(i.created_at)) >= 72).length;

    return { 
      avgResponseTime, 
      resolutionRate, 
      fastResponses, 
      mediumResponses, 
      slowResponses,
      resolvedCount: resolvedIncidents.length
    };
  }, [incidents, stats]);

  // Category breakdown for charts
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ 
        name: name.length > 12 ? name.slice(0, 12) + '...' : name, 
        fullName: name,
        value,
        isEmergency: EMERGENCY_CATEGORIES.includes(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [incidents]);

  // Daily trend (last 14 days)
  const dailyTrend = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      const dayIncidents = incidents.filter(inc => 
        format(new Date(inc.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        date: format(date, 'MMM dd'),
        total: dayIncidents.length,
        resolved: dayIncidents.filter(inc => inc.status === 'resolved').length,
        emergency: dayIncidents.filter(inc => EMERGENCY_CATEGORIES.includes(inc.category)).length,
      };
    });
  }, [incidents]);

  // Status distribution
  const statusData = useMemo(() => [
    { name: 'Resolved', value: stats.resolved, color: 'hsl(var(--success))' },
    { name: 'Assigned', value: stats.assigned, color: 'hsl(var(--primary))' },
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--warning))' },
    { name: 'Rejected', value: stats.rejected, color: 'hsl(var(--destructive))' }
  ].filter(s => s.value > 0), [stats]);

  // Response time distribution
  const responseTimeData = useMemo(() => [
    { name: '<24h', value: performanceMetrics.fastResponses, color: 'hsl(var(--success))' },
    { name: '24-72h', value: performanceMetrics.mediumResponses, color: 'hsl(var(--warning))' },
    { name: '>72h', value: performanceMetrics.slowResponses, color: 'hsl(var(--destructive))' },
  ].filter(s => s.value > 0), [performanceMetrics]);

  // Hourly heatmap
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    incidents.forEach(i => {
      const hour = new Date(i.created_at).getHours();
      hours[hour].count++;
    });
    return hours.map(h => ({ 
      hour: `${h.hour.toString().padStart(2, '0')}:00`, 
      incidents: h.count,
      fill: h.count > 5 ? 'hsl(var(--destructive))' : h.count > 2 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'
    }));
  }, [incidents]);

  // Day of week pattern
  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = Array(7).fill(0);
    incidents.forEach(i => {
      const day = new Date(i.created_at).getDay();
      counts[day]++;
    });
    return days.map((day, i) => ({ day, incidents: counts[i] }));
  }, [incidents]);

  // Safety radar data
  const radarData = useMemo(() => {
    const maxIncidents = Math.max(stats.total, 1);
    return [
      { metric: 'Resolution', value: performanceMetrics.resolutionRate, fullMark: 100 },
      { metric: 'Response Speed', value: Math.max(0, 100 - (performanceMetrics.avgResponseTime / 72 * 100)), fullMark: 100 },
      { metric: 'Case Load', value: Math.max(0, 100 - (stats.pending / Math.max(stats.total, 1) * 100)), fullMark: 100 },
      { metric: 'Safety Score', value: Math.max(0, 100 - (stats.emergencies / maxIncidents * 100)), fullMark: 100 },
      { metric: 'Weekly Trend', value: stats.weeklyTrend <= 0 ? 80 : Math.max(20, 80 - stats.weeklyTrend * 10), fullMark: 100 },
    ];
  }, [stats, performanceMetrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            {campusName} Analytics
          </h2>
          <p className="text-muted-foreground text-sm">Deep insights into your campus safety performance</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSyncTime && (
            <Badge variant="outline" className="text-xs">
              Updated: {format(lastSyncTime, 'HH:mm:ss')}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={refreshIncidents}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Cases</p>
                  <p className="text-2xl font-bold"><AnimatedCounter to={stats.total} /></p>
                  <p className="text-xs text-muted-foreground">{stats.thisWeek} this week</p>
                </div>
                <Activity className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-warning uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-warning"><AnimatedCounter to={stats.pending} /></p>
                  <p className="text-xs text-muted-foreground">Needs review</p>
                </div>
                <Clock className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-success uppercase tracking-wide">Resolution</p>
                  <p className="text-2xl font-bold text-success">{performanceMetrics.resolutionRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">{stats.resolved} resolved</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-destructive uppercase tracking-wide">Emergencies</p>
                  <p className="text-2xl font-bold text-destructive"><AnimatedCounter to={stats.emergencies} /></p>
                  <p className="text-xs text-muted-foreground">High priority</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg Response</p>
                  <p className="text-2xl font-bold">{performanceMetrics.avgResponseTime.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Time to resolve</p>
                </div>
                <Timer className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={stats.weeklyTrend > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-success/30 bg-success/5'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly Trend</p>
                  <p className={`text-2xl font-bold ${stats.weeklyTrend > 0 ? 'text-destructive' : 'text-success'}`}>
                    {stats.weeklyTrend > 0 ? '+' : ''}{stats.weeklyTrend}
                  </p>
                  <p className="text-xs text-muted-foreground">vs last week</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${stats.weeklyTrend > 0 ? 'text-destructive/50' : 'text-success/50'}`} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 14-Day Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              14-Day Incident Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="colorTotal2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#colorTotal2)" name="Total Cases" />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))', r: 3 }} name="Resolved" />
                  <Line type="monotone" dataKey="emergency" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))', r: 3 }} name="Emergencies" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status + Response Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Performance Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value, _, props) => [value, props.payload.fullName]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isEmergency ? 'hsl(var(--destructive))' : COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Pattern */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hourly Incident Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" interval={3} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="incidents" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Pattern</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Breakdown */}
      {responseTimeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Response Time Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {responseTimeData.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-medium">{item.value} cases ({performanceMetrics.resolvedCount > 0 ? ((item.value / performanceMetrics.resolvedCount) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <Progress value={performanceMetrics.resolvedCount > 0 ? (item.value / performanceMetrics.resolvedCount) * 100 : 0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};