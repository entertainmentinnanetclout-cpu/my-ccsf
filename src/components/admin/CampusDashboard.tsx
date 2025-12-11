import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, 
  Shield, Users, Activity, Zap, Target, Award, BarChart3,
  Flame, ThermometerSun, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { format, differenceInHours, subDays, isWithinInterval, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { AnimatedCounter } from './AnimatedCounter';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const EMERGENCY_CATEGORIES = [
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder',
  'Armed robbery', 'Assault GBH', 'Public violence'
];

const campusDisplayNames: Record<string, string> = {
  'pretoria_west_main': 'Pretoria West (Main)',
  'arcadia': 'Arcadia Campus',
  'arts': 'Arts Campus',
  'giyani': 'Giyani Campus',
  'mbombela': 'Mbombela Campus',
  'polokwane': 'Polokwane Campus',
  'garankuwa': 'Ga-Rankuwa Campus',
  'soshanguve_south': 'Soshanguve South',
  'soshanguve_north': 'Soshanguve North',
  'emalahleni': 'eMalahleni Campus',
};

interface InsightCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: string;
  delay?: number;
}

const InsightCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color, delay = 0 }: InsightCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.02, y: -2 }}
  >
    <Card className={`overflow-hidden border-l-4 ${color}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'number' ? <AnimatedCounter to={value} /> : value}
            </p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${color.replace('border-l-', 'from-').replace('/50', '/20')} to-transparent`}>
              <Icon className="h-5 w-5" />
            </div>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : null}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const CampusDashboard = () => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, profiles, isLoading } = useMasterSync();

  const campusName = userProfile?.campus ? campusDisplayNames[userProfile.campus] || userProfile.campus : 'Your Campus';
  
  // Filter incidents for this campus only
  const incidents = useMemo(() => {
    if (!userProfile?.campus) return [];
    return allIncidents.filter(i => i.campus === userProfile.campus);
  }, [allIncidents, userProfile?.campus]);

  // Filter students for this campus
  const campusStudents = useMemo(() => {
    if (!userProfile?.campus) return [];
    return profiles.filter(p => p.campus === userProfile.campus);
  }, [profiles, userProfile?.campus]);

  // Core Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekEnd, 7);
    const thisMonthStart = startOfMonth(now);

    const thisWeekIncidents = incidents.filter(i => 
      isWithinInterval(new Date(i.created_at), { start: thisWeekStart, end: thisWeekEnd })
    );
    const lastWeekIncidents = incidents.filter(i => 
      isWithinInterval(new Date(i.created_at), { start: lastWeekStart, end: lastWeekEnd })
    );
    const thisMonthIncidents = incidents.filter(i => 
      isWithinInterval(new Date(i.created_at), { start: thisMonthStart, end: now })
    );

    const weeklyChange = lastWeekIncidents.length > 0 
      ? ((thisWeekIncidents.length - lastWeekIncidents.length) / lastWeekIncidents.length * 100).toFixed(0)
      : '0';

    return {
      total: incidents.length,
      pending: incidents.filter(i => i.status === 'pending').length,
      assigned: incidents.filter(i => i.status === 'assigned').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      rejected: incidents.filter(i => i.status === 'rejected').length,
      emergencies: incidents.filter(i => EMERGENCY_CATEGORIES.includes(i.category)).length,
      thisWeek: thisWeekIncidents.length,
      lastWeek: lastWeekIncidents.length,
      thisMonth: thisMonthIncidents.length,
      weeklyChange: parseInt(weeklyChange),
      students: campusStudents.length,
    };
  }, [incidents, campusStudents]);

  // Resolution Rate & Avg Response Time
  const performanceMetrics = useMemo(() => {
    const resolvedIncidents = incidents.filter(i => i.resolved_at);
    const avgResponseTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((acc, i) => acc + differenceInHours(new Date(i.resolved_at!), new Date(i.created_at)), 0) / resolvedIncidents.length
      : 0;
    
    const resolutionRate = stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0;
    
    // Safety score: higher is better (resolved% - emergency%, capped at 100)
    const safetyScore = Math.min(100, Math.max(0, resolutionRate - (stats.emergencies / Math.max(1, stats.total) * 50) + 50));

    return { avgResponseTime, resolutionRate, safetyScore };
  }, [incidents, stats]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories)
      .map(([name, value]) => ({ 
        name: name.length > 15 ? name.slice(0, 15) + '...' : name, 
        fullName: name,
        value,
        isEmergency: EMERGENCY_CATEGORIES.includes(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [incidents]);

  // Status distribution
  const statusData = useMemo(() => [
    { name: 'Resolved', value: stats.resolved, color: '#22c55e' },
    { name: 'Assigned', value: stats.assigned, color: '#3b82f6' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
  ].filter(s => s.value > 0), [stats]);

  // Hourly pattern (when do incidents occur most)
  const hourlyPattern = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    incidents.forEach(i => {
      const hour = new Date(i.created_at).getHours();
      hours[hour].count++;
    });
    return hours.map(h => ({ 
      hour: `${h.hour.toString().padStart(2, '0')}:00`, 
      incidents: h.count 
    }));
  }, [incidents]);

  // 7-day trend
  const weeklyTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayIncidents = incidents.filter(inc => 
        format(new Date(inc.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        day: format(date, 'EEE'),
        total: dayIncidents.length,
        resolved: dayIncidents.filter(inc => inc.status === 'resolved').length,
        emergency: dayIncidents.filter(inc => EMERGENCY_CATEGORIES.includes(inc.category)).length,
      };
    });
  }, [incidents]);

  // Recent critical incidents
  const criticalIncidents = useMemo(() => {
    return incidents
      .filter(i => EMERGENCY_CATEGORIES.includes(i.category) || i.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [incidents]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campus Header with Safety Score */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {campusName}
          </h2>
          <p className="text-muted-foreground text-sm">Real-time safety intelligence dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="relative">
              <svg className="h-14 w-14 -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                <circle 
                  cx="28" cy="28" r="24" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="4" 
                  fill="none"
                  strokeDasharray={`${performanceMetrics.safetyScore * 1.51} 151`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">{Math.round(performanceMetrics.safetyScore)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Safety Score</p>
              <p className="font-semibold text-lg">
                {performanceMetrics.safetyScore >= 80 ? 'Excellent' : 
                 performanceMetrics.safetyScore >= 60 ? 'Good' : 
                 performanceMetrics.safetyScore >= 40 ? 'Fair' : 'Needs Attention'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InsightCard
          icon={Activity}
          title="Total Cases"
          value={stats.total}
          subtitle={`${stats.thisMonth} this month`}
          trend={stats.weeklyChange > 0 ? 'up' : stats.weeklyChange < 0 ? 'down' : 'neutral'}
          trendValue={`${Math.abs(stats.weeklyChange)}% vs last week`}
          color="border-l-primary/50"
          delay={0}
        />
        <InsightCard
          icon={Clock}
          title="Pending Review"
          value={stats.pending}
          subtitle="Needs attention"
          color="border-l-amber-500/50"
          delay={0.05}
        />
        <InsightCard
          icon={CheckCircle}
          title="Resolved"
          value={stats.resolved}
          subtitle={`${performanceMetrics.resolutionRate.toFixed(0)}% resolution rate`}
          color="border-l-green-500/50"
          delay={0.1}
        />
        <InsightCard
          icon={AlertTriangle}
          title="Emergencies"
          value={stats.emergencies}
          subtitle="High priority cases"
          color="border-l-red-500/50"
          delay={0.15}
        />
        <InsightCard
          icon={Zap}
          title="Avg Response"
          value={`${performanceMetrics.avgResponseTime.toFixed(1)}h`}
          subtitle="Time to resolution"
          color="border-l-blue-500/50"
          delay={0.2}
        />
        <InsightCard
          icon={Users}
          title="Students"
          value={stats.students}
          subtitle="Registered on campus"
          color="border-l-purple-500/50"
          delay={0.25}
        />
        <InsightCard
          icon={Target}
          title="This Week"
          value={stats.thisWeek}
          subtitle={`${stats.lastWeek} last week`}
          trend={stats.thisWeek > stats.lastWeek ? 'up' : 'down'}
          trendValue={stats.thisWeek > stats.lastWeek ? 'Increased' : 'Decreased'}
          color="border-l-cyan-500/50"
          delay={0.3}
        />
        <InsightCard
          icon={Award}
          title="Assigned"
          value={stats.assigned}
          subtitle="Currently investigating"
          color="border-l-indigo-500/50"
          delay={0.35}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              7-Day Incident Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                  <Area type="monotone" dataKey="resolved" stroke="#22c55e" fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                  <Line type="monotone" dataKey="emergency" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Emergency" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
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
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No incidents yet</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Top Incident Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
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
                      <Cell key={`cell-${index}`} fill={entry.isEmergency ? '#ef4444' : COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Pattern */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ThermometerSun className="h-4 w-4 text-primary" />
              Incident Hotspots by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyPattern}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Incidents Attention */}
      {criticalIncidents.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Priority Cases Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalIncidents.map((incident, idx) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {EMERGENCY_CATEGORIES.includes(incident.category) && (
                        <Badge variant="destructive" className="text-xs">Emergency</Badge>
                      )}
                      <p className="font-medium text-sm truncate">{incident.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{incident.category}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={incident.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                      {incident.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};