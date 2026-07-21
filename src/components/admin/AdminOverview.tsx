import { useMemo } from 'react';
import { BentoGrid } from './bento';
import { LiveOperationsVisuals, type LiveVisualRecord } from './visualizations/LiveOperationsVisuals';
import { useMasterSync } from '@/contexts/MasterSyncContext';

const CAMPUS_LABELS: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main Campus)',
  arcadia: 'Arcadia',
  arts: 'Arts',
  giyani: 'Giyani',
  mbombela: 'Mbombela',
  polokwane: 'Polokwane',
  garankuwa: 'Ga-Rankuwa',
  soshanguve_south: 'Soshanguve South',
  soshanguve_north: 'Soshanguve North',
  emalahleni: 'eMalahleni',
};

const CRITICAL_CATEGORIES = new Set([
  'Rape',
  'Sexual assault',
  'Gbv',
  'Murder',
  'Attempted murder',
  'Armed robbery',
  'Assault GBH',
  'Public violence',
]);

interface AdminOverviewProps {
  onOpenIncidents?: () => void;
  onOpenAnalytics?: () => void;
}

export const AdminOverview = ({ onOpenIncidents, onOpenAnalytics }: AdminOverviewProps) => {
  const { incidents, isLoading, refreshIncidents } = useMasterSync();
  const records = useMemo<LiveVisualRecord[]>(() => incidents.map((incident) => ({
    id: incident.id,
    campus: incident.campus,
    status: incident.status,
    category: incident.category,
    title: incident.title,
    createdAt: incident.created_at,
    resolvedAt: incident.resolved_at,
    isCritical: CRITICAL_CATEGORIES.has(incident.category),
  })), [incidents]);

  return (
    <div className="space-y-8">
      <LiveOperationsVisuals
        records={records}
        title="Institution-wide Safety Intelligence"
        description="Maptive-inspired campus grouping, response-flow analysis and live drill-down across every authorised CCSF campus. Visual selections immediately refine the operational picture."
        locationLabels={CAMPUS_LABELS}
        onRefresh={refreshIncidents}
        refreshing={isLoading}
        onOpenQueue={onOpenIncidents}
        onOpenAnalytics={onOpenAnalytics}
      />
      <BentoGrid dashboardId="admin-overview" />
    </div>
  );
};
