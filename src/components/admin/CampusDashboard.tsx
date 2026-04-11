import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, CheckCircle, Clock, TrendingUp, 
  Shield, Users, Activity, Zap, Target, Award, BarChart3,
  Flame, ThermometerSun, ArrowUpRight, ArrowDownRight, X, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { format, differenceInHours, subDays, isWithinInterval, startOfWeek, endOfWeek, startOfMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { AnimatedCounter } from './AnimatedCounter';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;

const COLORS = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', '#8b5cf6', '#ec4899'];
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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning',
  assigned: 'bg-primary',
  resolved: 'bg-success',
  rejected: 'bg-destructive'
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
  onClick?: () => void;
  isActive?: boolean;
}

const InsightCard = ({ icon: Icon, title, value, subtitle, trend, trendValue, color, delay = 0, onClick, isActive }: InsightCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.03, y: -4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="cursor-pointer"
  >
    <Card className={`overflow-hidden border-l-4 ${color} transition-all duration-300 ${isActive ? 'ring-2 ring-primary shadow-elevated' : 'hover:shadow-elevated'}`}>
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
                trend === 'up' ? 'text-destructive' : trend === 'down' ? 'text-success' : 'text-muted-foreground'
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

type MetricView = 'total' | 'pending' | 'resolved' | 'emergencies' | 'students' | 'assigned' | null;

export const CampusDashboard = () => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, profiles, isLoading } = useMasterSync();
  const [selectedMetric, setSelectedMetric] = useState<MetricView>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

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
    
    const safetyScore = Math.min(100, Math.max(0, resolutionRate - (stats.emergencies / Math.max(1, stats.total) * 50) + 50));

    return { avgResponseTime, resolutionRate, safetyScore };
  }, [incidents, stats]);

  // Get filtered incidents based on selected metric
  const filteredIncidents = useMemo(() => {
    switch (selectedMetric) {
      case 'total': return incidents;
      case 'pending': return incidents.filter(i => i.status === 'pending');
      case 'assigned': return incidents.filter(i => i.status === 'assigned');
      case 'resolved': return incidents.filter(i => i.status === 'resolved');
      case 'emergencies': return incidents.filter(i => EMERGENCY_CATEGORIES.includes(i.category));
      default: return [];
    }
  }, [incidents, selectedMetric]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const dataSource = selectedMetric ? filteredIncidents : incidents;
    const categories = dataSource.reduce((acc, i) => {
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
  }, [incidents, filteredIncidents, selectedMetric]);

  // Status distribution
  const statusData = useMemo(() => [
    { name: 'Resolved', value: stats.resolved, color: 'hsl(var(--success))' },
    { name: 'Assigned', value: stats.assigned, color: 'hsl(var(--primary))' },
    { name: 'Pending', value: stats.pending, color: 'hsl(var(--warning))' },
    { name: 'Rejected', value: stats.rejected, color: 'hsl(var(--destructive))' },
  ].filter(s => s.value > 0), [stats]);

  // Hourly pattern
  const hourlyPattern = useMemo(() => {
    const dataSource = selectedMetric ? filteredIncidents : incidents;
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    dataSource.forEach(i => {
      const hour = new Date(i.created_at).getHours();
      hours[hour].count++;
    });
    return hours.map(h => ({ 
      hour: `${h.hour.toString().padStart(2, '0')}:00`, 
      incidents: h.count 
    }));
  }, [incidents, filteredIncidents, selectedMetric]);

  // 7-day trend
  const weeklyTrend = useMemo(() => {
    const dataSource = selectedMetric ? filteredIncidents : incidents;
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayIncidents = dataSource.filter(inc => 
        format(new Date(inc.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        day: format(date, 'EEE'),
        total: dayIncidents.length,
        resolved: dayIncidents.filter(inc => inc.status === 'resolved').length,
        emergency: dayIncidents.filter(inc => EMERGENCY_CATEGORIES.includes(inc.category)).length,
      };
    });
  }, [incidents, filteredIncidents, selectedMetric]);

  // Recent critical incidents
  const criticalIncidents = useMemo(() => {
    return incidents
      .filter(i => EMERGENCY_CATEGORIES.includes(i.category) || i.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [incidents]);

  const handleMetricClick = useCallback((metric: MetricView) => {
    setSelectedMetric(prev => prev === metric ? null : metric);
  }, []);

  const getMetricTitle = () => {
    switch (selectedMetric) {
      case 'total': return 'All Cases';
      case 'pending': return 'Pending Cases';
      case 'assigned': return 'Assigned Cases';
      case 'resolved': return 'Resolved Cases';
      case 'emergencies': return 'Emergency Cases';
      case 'students': return 'Campus Students';
      default: return '';
    }
  };

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
          <p className="text-muted-foreground text-sm">Click any metric card to filter and explore data</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.div 
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative">
              <svg className="h-14 w-14 -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" />
                <motion.circle 
                  cx="28" cy="28" r="24" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="4" 
                  fill="none"
                  initial={{ strokeDasharray: "0 151" }}
                  animate={{ strokeDasharray: `${performanceMetrics.safetyScore * 1.51} 151` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
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
          </motion.div>
        </div>
      </motion.div>

      {/* Key Metrics Grid - Interactive */}
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
          onClick={() => handleMetricClick('total')}
          isActive={selectedMetric === 'total'}
        />
        <InsightCard
          icon={Clock}
          title="Pending Review"
          value={stats.pending}
          subtitle="Needs attention"
          color="border-l-warning/50"
          delay={0.05}
          onClick={() => handleMetricClick('pending')}
          isActive={selectedMetric === 'pending'}
        />
        <InsightCard
          icon={CheckCircle}
          title="Resolved"
          value={stats.resolved}
          subtitle={`${performanceMetrics.resolutionRate.toFixed(0)}% resolution rate`}
          color="border-l-success/50"
          delay={0.1}
          onClick={() => handleMetricClick('resolved')}
          isActive={selectedMetric === 'resolved'}
        />
        <InsightCard
          icon={AlertTriangle}
          title="Emergencies"
          value={stats.emergencies}
          subtitle="High priority cases"
          color="border-l-destructive/50"
          delay={0.15}
          onClick={() => handleMetricClick('emergencies')}
          isActive={selectedMetric === 'emergencies'}
        />
        <InsightCard
          icon={Zap}
          title="Avg Response"
          value={`${performanceMetrics.avgResponseTime.toFixed(1)}h`}
          subtitle="Time to resolution"
          color="border-l-primary/50"
          delay={0.2}
        />
        <InsightCard
          icon={Users}
          title="Students"
          value={stats.students}
          subtitle="Registered on campus"
          color="border-l-accent/50"
          delay={0.25}
          onClick={() => handleMetricClick('students')}
          isActive={selectedMetric === 'students'}
        />
        <InsightCard
          icon={Target}
          title="This Week"
          value={stats.thisWeek}
          subtitle={`${stats.lastWeek} last week`}
          trend={stats.thisWeek > stats.lastWeek ? 'up' : 'down'}
          trendValue={stats.thisWeek > stats.lastWeek ? 'Increased' : 'Decreased'}
          color="border-l-primary/50"
          delay={0.3}
        />
        <InsightCard
          icon={Award}
          title="Assigned"
          value={stats.assigned}
          subtitle="Currently investigating"
          color="border-l-primary/50"
          delay={0.35}
          onClick={() => handleMetricClick('assigned')}
          isActive={selectedMetric === 'assigned'}
        />
      </div>

      {/* Interactive Metric Details Panel */}
      <AnimatePresence>
        {selectedMetric && selectedMetric !== 'students' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-primary/20 shadow-elevated overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    {getMetricTitle()}
                    <Badge variant="secondary" className="ml-2">{filteredIncidents.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMetric(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Charts Section */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category Distribution */}
                      <Card className="p-4 glass-card">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          Category Breakdown
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical">
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} />
                              <Tooltip 
                                formatter={(value, _, props) => [value, props.payload.fullName]}
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} 
                              />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isEmergency ? 'hsl(var(--destructive))' : COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>

                      {/* 7-Day Trend */}
                      <Card className="p-4 glass-card">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          7-Day Trend
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyTrend}>
                              <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#colorTrend)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </div>

                    {/* Hourly Pattern */}
                    <Card className="p-4 glass-card">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <ThermometerSun className="h-4 w-4 text-primary" />
                        Hourly Pattern
                      </h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={hourlyPattern}>
                            <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval={3} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                            <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* Cases List */}
                  <Card className="p-4 glass-card">
                    <h4 className="text-sm font-semibold mb-3">Case Details</h4>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2 pr-2">
                        {filteredIncidents.slice(0, 20).map((incident, idx) => (
                          <motion.div
                            key={incident.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            onClick={() => setSelectedIncident(incident)}
                            className="p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 hover:border-primary/50 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{incident.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{incident.category}</p>
                              </div>
                              <Badge variant="outline" className={`${STATUS_COLORS[incident.status]} text-white text-xs shrink-0`}>
                                {incident.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(incident.created_at), 'MMM dd, HH:mm')}
                            </p>
                          </motion.div>
                        ))}
                        {filteredIncidents.length === 0 && (
                          <p className="text-center text-muted-foreground py-8">No cases found</p>
                        )}
                        {filteredIncidents.length > 20 && (
                          <p className="text-center text-xs text-muted-foreground py-2">
                            Showing 20 of {filteredIncidents.length} cases
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students Panel */}
      <AnimatePresence>
        {selectedMetric === 'students' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-purple-500/20 shadow-elevated">
              <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Campus Students
                    <Badge variant="secondary" className="ml-2">{campusStudents.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMetric(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {campusStudents.slice(0, 30).map((student, idx) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="p-3 rounded-lg border bg-card hover:shadow-md transition-all"
                      >
                        <p className="font-medium text-sm truncate">{student.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{student.student_number || 'N/A'}</Badge>
                          {student.course && <Badge variant="secondary" className="text-xs truncate max-w-[100px]">{student.course}</Badge>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {campusStudents.length > 30 && (
                    <p className="text-center text-xs text-muted-foreground py-4">
                      Showing 30 of {campusStudents.length} students
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default View - Charts */}
      {!selectedMetric && (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Trend */}
            <Card className="lg:col-span-2 glass-card">
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
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
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
                      <Area type="monotone" dataKey="resolved" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorResolved)" name="Resolved" />
                      <Line type="monotone" dataKey="emergency" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))' }} name="Emergency" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Donut */}
            <Card className="glass-card">
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
            <Card className="glass-card">
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
                          <Cell key={`cell-${index}`} fill={entry.isEmergency ? 'hsl(var(--destructive))' : COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Pattern */}
            <Card className="glass-card">
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

          {/* Critical Incidents */}
          {criticalIncidents.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5 glass-card">
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
                      onClick={() => setSelectedIncident(incident)}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary/50 transition-colors cursor-pointer"
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
        </>
      )}

      {/* Incident Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Case Details
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedIncident.title}</h3>
                <Badge className={`${STATUS_COLORS[selectedIncident.status]} text-white`}>
                  {selectedIncident.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedIncident.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reported</p>
                  <p className="font-medium">{format(new Date(selectedIncident.created_at), 'PPpp')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Description</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedIncident.description}</p>
              </div>
              {selectedIncident.location_description && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Location</p>
                  <p className="text-sm">{selectedIncident.location_description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};