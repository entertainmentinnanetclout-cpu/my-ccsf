import { useMemo, useCallback } from 'react';
import { Activity, Clock, Users, CheckCircle, AlertCircle, Zap, Calendar, UserCheck } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlassStatCard } from '../../metrics';
import { format, subDays, isToday, isThisWeek } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type IncidentStatus = Database['public']['Enums']['incident_status'];

type StatType = 'total' | 'pending' | 'assigned' | 'resolved' | 'rejected' | 'today' | 'week' | 'response-time' | 'active-officers';

interface StatsWidgetProps {
  widgetId: string;
  statType: StatType;
}

const STAT_CONFIG: Record<StatType, {
  title: string;
  icon: typeof Activity;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  showLive: boolean;
}> = {
  total: {
    title: 'Total Cases',
    icon: Activity,
    color: 'primary',
    subtitle: undefined,
    showLive: true,
  },
  pending: {
    title: 'Pending',
    icon: Clock,
    color: 'warning',
    subtitle: 'Needs review',
    showLive: false,
  },
  assigned: {
    title: 'Assigned',
    icon: Users,
    color: 'info',
    subtitle: 'In progress',
    showLive: false,
  },
  resolved: {
    title: 'Resolved',
    icon: CheckCircle,
    color: 'success',
    subtitle: 'Completed',
    showLive: false,
  },
  rejected: {
    title: 'Rejected',
    icon: AlertCircle,
    color: 'danger',
    subtitle: undefined,
    showLive: false,
  },
  today: {
    title: "Today's Cases",
    icon: Zap,
    color: 'primary',
    subtitle: 'Reported today',
    showLive: true,
  },
  week: {
    title: 'This Week',
    icon: Calendar,
    color: 'info',
    subtitle: 'Past 7 days',
    showLive: false,
  },
  'response-time': {
    title: 'Avg Response',
    icon: Clock,
    color: 'success',
    subtitle: 'Minutes',
    showLive: false,
  },
  'active-officers': {
    title: 'Active Officers',
    icon: UserCheck,
    color: 'success',
    subtitle: 'Online now',
    showLive: true,
  },
};

export const StatsWidget = ({ widgetId, statType }: StatsWidgetProps) => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, getIncidentsByCampus } = useMasterSync();

  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  const value = useMemo(() => {
    switch (statType) {
      case 'total':
        return incidents.length;
      case 'today':
        return incidents.filter(i => isToday(new Date(i.created_at))).length;
      case 'week':
        return incidents.filter(i => isThisWeek(new Date(i.created_at))).length;
      case 'response-time':
        // Mock average response time in minutes
        const assigned = incidents.filter(i => i.assigned_to && i.status !== 'pending');
        if (assigned.length === 0) return 0;
        return Math.round(Math.random() * 10 + 5); // Mock: 5-15 min
      case 'active-officers':
        // Mock active officers count
        return Math.floor(Math.random() * 5) + 3; // Mock: 3-8 officers
      default:
        return incidents.filter((i) => i.status === statType).length;
    }
  }, [incidents, statType]);

  const getSparklineData = useCallback(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const filtered = incidents.filter((inc) => {
        const incDate = format(new Date(inc.created_at), 'yyyy-MM-dd');
        if (statType === 'total' || statType === 'today' || statType === 'week') {
          return incDate === date;
        }
        if (statType === 'response-time' || statType === 'active-officers') {
          return false; // No sparkline for these
        }
        return incDate === date && inc.status === statType;
      });
      return filtered.length;
    });
  }, [incidents, statType]);

  const config = STAT_CONFIG[statType];

  return (
    <div className="h-full flex items-center justify-center">
      <GlassStatCard
        title={config.title}
        value={value}
        subtitle={config.subtitle}
        icon={config.icon}
        color={config.color}
        delay={0}
        sparklineData={getSparklineData()}
        showLiveIndicator={config.showLive}
      />
    </div>
  );
};
