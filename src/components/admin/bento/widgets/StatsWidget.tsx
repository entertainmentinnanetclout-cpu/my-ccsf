import { useMemo, useCallback } from 'react';
import { Activity, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { GlassStatCard } from '../../metrics';
import { format, subDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type IncidentStatus = Database['public']['Enums']['incident_status'];

interface StatsWidgetProps {
  widgetId: string;
  statType: 'total' | 'pending' | 'assigned' | 'resolved' | 'rejected';
}

const STAT_CONFIG = {
  total: {
    title: 'Total Cases',
    icon: Activity,
    color: 'primary' as const,
    subtitle: undefined,
    showLive: true,
  },
  pending: {
    title: 'Pending',
    icon: Clock,
    color: 'warning' as const,
    subtitle: 'Needs review',
    showLive: false,
  },
  assigned: {
    title: 'Assigned',
    icon: Users,
    color: 'info' as const,
    subtitle: 'In progress',
    showLive: false,
  },
  resolved: {
    title: 'Resolved',
    icon: CheckCircle,
    color: 'success' as const,
    subtitle: 'Completed',
    showLive: false,
  },
  rejected: {
    title: 'Rejected',
    icon: AlertCircle,
    color: 'danger' as const,
    subtitle: undefined,
    showLive: false,
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
    if (statType === 'total') return incidents.length;
    return incidents.filter((i) => i.status === statType).length;
  }, [incidents, statType]);

  const getSparklineData = useCallback(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const filtered = incidents.filter((inc) => {
        const incDate = format(new Date(inc.created_at), 'yyyy-MM-dd');
        if (statType === 'total') {
          return incDate === date;
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
