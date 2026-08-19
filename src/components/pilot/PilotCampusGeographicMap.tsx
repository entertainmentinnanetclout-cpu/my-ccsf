import { useCallback, useEffect, useMemo, useState } from 'react';
import { GeographicCampusMap, type GeographicMapMarker } from '@/components/maps/GeographicCampusMap';
import { supabase } from '@/integrations/supabase/client';
import type { CampusLocation, PilotReport } from '@/types/pilot';

export function PilotCampusGeographicMap({ campus }: { campus: CampusLocation }) {
  const [reports, setReports] = useState<PilotReport[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('pilot_reports')
      .select('*')
      .eq('campus', campus)
      .is('deleted_at', null)
      .order('submitted_at', { ascending: false })
      .limit(250);

    if (!error && data) setReports(data as PilotReport[]);
  }, [campus]);

  useEffect(() => {
    void load();
    let timer: number | null = null;
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 300);
    };
    const channel = supabase
      .channel(`pilot-campus-map-${campus}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pilot_reports', filter: `campus=eq.${campus}` }, schedule)
      .subscribe();

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [campus, load]);

  const markers = useMemo<GeographicMapMarker[]>(() => reports.flatMap((report) => {
    if (typeof report.location_lat !== 'number' || typeof report.location_lng !== 'number') return [];
    const accuracy = typeof report.location_accuracy === 'number' ? ` · GPS ±${Math.round(report.location_accuracy)} m` : '';
    return [{
      id: report.id,
      name: report.reference_number || report.title,
      latitude: report.location_lat,
      longitude: report.location_lng,
      kind: 'incident' as const,
      detail: `${report.location_description || report.title}${accuracy}`,
    }];
  }), [reports]);

  return (
    <div data-testid="pilot-real-campus-map">
      <GeographicCampusMap
        campus={campus}
        markers={markers}
        title="Pilot Geographic Campus Operations"
        description="Verified campus destinations and campus-scoped Pilot reports that contain captured GPS coordinates. Text-only locations are deliberately not approximated."
        compact
      />
    </div>
  );
}
