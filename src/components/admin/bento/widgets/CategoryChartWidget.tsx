import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CategoryChartWidgetProps {
  widgetId: string;
}

export const CategoryChartWidget = ({ widgetId }: CategoryChartWidgetProps) => {
  const { userProfile } = useAuth();
  const { incidents: allIncidents, getIncidentsByCampus } = useMasterSync();

  const incidents = useMemo(() => {
    if (userProfile?.campus) {
      return getIncidentsByCampus(userProfile.campus);
    }
    return allIncidents;
  }, [allIncidents, userProfile?.campus, getIncidentsByCampus]);

  const categoryData = useMemo(() => {
    const categories = incidents.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories)
      .map(([name, value]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '...' : name,
        fullName: name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [incidents]);

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Top Categories
      </h4>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData} layout="vertical">
            <defs>
              <linearGradient id="barGradientCat" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              dataKey="name"
              type="category"
              fontSize={9}
              width={80}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 8px 32px -8px rgba(0,0,0,0.2)',
              }}
              formatter={(value, name, props) => [value, props.payload.fullName]}
            />
            <Bar
              dataKey="value"
              fill="url(#barGradientCat)"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
