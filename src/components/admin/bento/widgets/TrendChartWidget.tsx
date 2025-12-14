import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface TrendChartWidgetProps {
  widgetId: string;
}

export const TrendChartWidget = ({ widgetId }: TrendChartWidgetProps) => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, getIncidentsByCampus } = useMasterSync();

  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return last7Days.map((date) => {
      const dayIncidents = incidents.filter(
        (inc) => format(new Date(inc.created_at), 'yyyy-MM-dd') === date
      );
      return {
        date: format(new Date(date), 'EEE'),
        incidents: dayIncidents.length,
        resolved: dayIncidents.filter((i) => i.status === 'resolved').length,
      };
    });
  }, [incidents]);

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        7-Day Trend
      </h4>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="areaGradientTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              fontSize={10}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              fontSize={10}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)',
              }}
            />
            <Area
              type="monotone"
              dataKey="incidents"
              stroke="hsl(var(--primary))"
              fill="url(#areaGradientTrend)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="resolved"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--success))', r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
