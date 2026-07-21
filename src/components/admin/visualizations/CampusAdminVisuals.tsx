import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import { LiveOperationsVisuals, type LiveVisualRecord } from './LiveOperationsVisuals';

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

interface CampusAdminVisualsProps {
  onOpenIncidents?: () => void;
  onOpenAnalytics?: () => void;
}

export function CampusAdminVisuals({ onOpenIncidents, onOpenAnalytics }: CampusAdminVisualsProps) {
  const { userProfile } = useAuth();
  const { incidents, isLoading, refreshIncidents } = useMasterSync();
  const campus = userProfile?.campus ?? undefined;
  const records = useMemo<LiveVisualRecord[]>(() => incidents
    .filter((incident) => !campus || incident.campus === campus)
    .map((incident) => ({
      id: incident.id,
      campus: incident.campus,
      status: incident.status,
      category: incident.category,
      title: incident.title,
      createdAt: incident.created_at,
      resolvedAt: incident.resolved_at,
      isCritical: CRITICAL_CATEGORIES.has(incident.category),
    })), [incidents, campus]);

  return (
    <LiveOperationsVisuals
      records={records}
      title={`${campus ? CAMPUS_LABELS[campus] ?? campus : 'Campus'} Live Safety Intelligence`}
      description="Campus-scoped visual command layer with live filtering, time concentration, response-flow analysis and direct access to the operational queue."
      locationLabels={CAMPUS_LABELS}
      defaultCampus={campus}
      lockCampus
      onRefresh={refreshIncidents}
      refreshing={isLoading}
      onOpenQueue={onOpenIncidents}
      onOpenAnalytics={onOpenAnalytics}
    />
  );
}
