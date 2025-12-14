import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import { HeatmapCalendar } from '../../metrics';
import { format } from 'date-fns';

interface HeatmapWidgetProps {
  widgetId: string;
}

export const HeatmapWidget = ({ widgetId }: HeatmapWidgetProps) => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, getIncidentsByCampus } = useMasterSync();

  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  const heatmapData = useMemo(() => {
    const dateMap = new Map<string, number>();
    
    incidents.forEach((inc) => {
      const date = format(new Date(inc.created_at), 'yyyy-MM-dd');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    return Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }, [incidents]);

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        Activity Heatmap
      </h4>
      <div className="flex-1 min-h-0 overflow-auto">
        <HeatmapCalendar
          data={heatmapData}
          weeks={8}
          colorScheme="default"
        />
      </div>
    </div>
  );
};
