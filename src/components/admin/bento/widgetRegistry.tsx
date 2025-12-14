import { ComponentType } from 'react';
import {
  Activity,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Map,
  Bell,
  MessageSquare,
  Shield,
  Gauge,
  type LucideIcon,
} from 'lucide-react';

// Widget Components
import { StatsWidget } from './widgets/StatsWidget';
import { ResolutionGaugeWidget } from './widgets/ResolutionGaugeWidget';
import { TrendChartWidget } from './widgets/TrendChartWidget';
import { CategoryChartWidget } from './widgets/CategoryChartWidget';
import { HeatmapWidget } from './widgets/HeatmapWidget';
import { CampusOverviewWidget } from './widgets/CampusOverviewWidget';
import { EmergencyCasesWidget } from './widgets/EmergencyCasesWidget';
import { LiveStatusWidget } from './widgets/LiveStatusWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';

export interface WidgetMeta {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: 'Stats' | 'Charts' | 'Data' | 'Actions';
  defaultSize: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  allowMultiple?: boolean;
}

export interface WidgetProps {
  widgetId: string;
}

// Registry of available widgets
export const AVAILABLE_WIDGETS: WidgetMeta[] = [
  // Stats widgets
  {
    type: 'stats-total',
    name: 'Total Cases',
    description: 'Display total incident count with sparkline',
    icon: Activity,
    category: 'Stats',
    defaultSize: 'sm',
  },
  {
    type: 'stats-pending',
    name: 'Pending Cases',
    description: 'Cases awaiting review',
    icon: Clock,
    category: 'Stats',
    defaultSize: 'sm',
  },
  {
    type: 'stats-assigned',
    name: 'Assigned Cases',
    description: 'Cases currently being handled',
    icon: Users,
    category: 'Stats',
    defaultSize: 'sm',
  },
  {
    type: 'stats-resolved',
    name: 'Resolved Cases',
    description: 'Successfully resolved cases',
    icon: CheckCircle,
    category: 'Stats',
    defaultSize: 'sm',
  },
  {
    type: 'stats-rejected',
    name: 'Rejected Cases',
    description: 'Rejected or invalid cases',
    icon: AlertCircle,
    category: 'Stats',
    defaultSize: 'sm',
  },
  {
    type: 'resolution-gauge',
    name: 'Resolution Rate',
    description: 'Circular gauge showing resolution percentage',
    icon: Gauge,
    category: 'Stats',
    defaultSize: 'sm',
  },
  
  // Chart widgets
  {
    type: 'trend-chart',
    name: '7-Day Trend',
    description: 'Area chart showing incident trends',
    icon: TrendingUp,
    category: 'Charts',
    defaultSize: 'lg',
  },
  {
    type: 'category-chart',
    name: 'Category Distribution',
    description: 'Bar chart of incident categories',
    icon: BarChart3,
    category: 'Charts',
    defaultSize: 'lg',
  },
  {
    type: 'heatmap',
    name: 'Activity Heatmap',
    description: 'Calendar heatmap of incidents',
    icon: Calendar,
    category: 'Charts',
    defaultSize: 'xl',
  },
  
  // Data widgets
  {
    type: 'campus-overview',
    name: 'Campus Overview',
    description: 'Overview of all campuses',
    icon: Map,
    category: 'Data',
    defaultSize: 'full',
  },
  {
    type: 'emergency-cases',
    name: 'Emergency Cases',
    description: 'Critical and emergency incidents',
    icon: Shield,
    category: 'Data',
    defaultSize: 'lg',
  },
  {
    type: 'live-status',
    name: 'Live Status',
    description: 'Real-time monitoring status',
    icon: Activity,
    category: 'Data',
    defaultSize: 'md',
  },
  
  // Action widgets
  {
    type: 'quick-actions',
    name: 'Quick Actions',
    description: 'Common admin actions',
    icon: Bell,
    category: 'Actions',
    defaultSize: 'md',
  },
];

// Map widget types to components
export const WIDGET_COMPONENTS: Record<string, ComponentType<WidgetProps>> = {
  'stats-total': (props) => <StatsWidget {...props} statType="total" />,
  'stats-pending': (props) => <StatsWidget {...props} statType="pending" />,
  'stats-assigned': (props) => <StatsWidget {...props} statType="assigned" />,
  'stats-resolved': (props) => <StatsWidget {...props} statType="resolved" />,
  'stats-rejected': (props) => <StatsWidget {...props} statType="rejected" />,
  'resolution-gauge': ResolutionGaugeWidget,
  'trend-chart': TrendChartWidget,
  'category-chart': CategoryChartWidget,
  'heatmap': HeatmapWidget,
  'campus-overview': CampusOverviewWidget,
  'emergency-cases': EmergencyCasesWidget,
  'live-status': LiveStatusWidget,
  'quick-actions': QuickActionsWidget,
};

// Default layouts for different dashboard types
export const DEFAULT_LAYOUTS: Record<string, string[]> = {
  'admin-overview': [
    'live-status',
    'stats-total',
    'stats-pending',
    'stats-assigned',
    'stats-resolved',
    'resolution-gauge',
    'trend-chart',
    'category-chart',
    'heatmap',
    'quick-actions',
    'emergency-cases',
    'campus-overview',
  ],
};
