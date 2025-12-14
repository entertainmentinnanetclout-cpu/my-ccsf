import { useMemo } from 'react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { CircularGauge } from '../../metrics';
import { Card } from '@/components/ui/card';

interface ResolutionGaugeWidgetProps {
  widgetId: string;
}

export const ResolutionGaugeWidget = ({ widgetId }: ResolutionGaugeWidgetProps) => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, getIncidentsByCampus } = useMasterSync();

  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  const resolutionRate = useMemo(() => {
    const total = incidents.length;
    const resolved = incidents.filter((i) => i.status === 'resolved').length;
    return total > 0 ? Math.round((resolved / total) * 100) : 0;
  }, [incidents]);

  return (
    <div className="h-full flex items-center justify-center">
      <CircularGauge
        value={resolutionRate}
        size="sm"
        color="gradient"
        label="Resolution"
        animated
      />
    </div>
  );
};
