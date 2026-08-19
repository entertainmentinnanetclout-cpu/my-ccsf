import { useMemo } from 'react';
import { GeographicCampusMap, type GeographicMapMarker } from '@/components/maps/GeographicCampusMap';
import { useAuth } from '@/contexts/AuthContext';
import { useMasterSync } from '@/contexts/MasterSyncContext';
import type { CampusLocation } from '@/types/pilot';
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
  const campusIncidents = useMemo(
    () => incidents.filter((incident) => !campus || incident.campus === campus),
    [incidents, campus],
  );
  const records = useMemo<LiveVisualRecord[]>(() => campusIncidents.map((incident) => ({
    id: incident.id,
    campus: incident.campus,
    status: incident.status,
    category: incident.category,
    title: incident.title,
    createdAt: incident.created_at,
    resolvedAt: incident.resolved_at,
    isCritical: CRITICAL_CATEGORIES.has(incident.category),
  })), [campusIncidents]);
  const mapMarkers = useMemo<GeographicMapMarker[]>(() => campusIncidents.flatMap((incident) => {
    if (typeof incident.location_lat !== 'number' || typeof incident.location_lng !== 'number') return [];
    return [{
      id: incident.id,
      name: incident.title || `Case ${incident.id.slice(0, 8)}`,
      latitude: incident.location_lat,
      longitude: incident.location_lng,
      kind: 'incident' as const,
      detail: incident.location_description || `${incident.category} · ${incident.status}`,
    }];
  }), [campusIncidents]);

  return (
    <div className="space-y-6">
      {campus && (
        <GeographicCampusMap
          campus={campus as CampusLocation}
          markers={mapMarkers}
          title={`${CAMPUS_LABELS[campus] ?? campus} · Live Geographic Operations`}
          description="Verified campus destinations plus GPS coordinates captured with production incident reports. Case addresses without coordinates are not approximated on the map."
          compact
        />
      )}
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
    </div>
  );
}
