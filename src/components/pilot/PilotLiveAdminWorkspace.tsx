import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PilotAdminWorkspace } from '@/components/pilot/PilotAdminWorkspace';
import type { CampusLocation } from '@/types/pilot';

const LIVE_TABLES = [
  'pilot_programs',
  'pilot_participants',
  'pilot_sessions',
  'pilot_reports',
  'pilot_report_events',
  'pilot_notifications',
  'pilot_feedback',
  'pilot_feature_tests',
] as const;

export function PilotLiveAdminWorkspace({
  scope,
  campus,
}: {
  scope: 'campus' | 'admin';
  campus?: CampusLocation | null;
}) {
  const [revision, setRevision] = useState(0);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => setRevision((current) => current + 1), 350);
    };

    const channel = LIVE_TABLES.reduce(
      (currentChannel, table) => currentChannel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      ),
      supabase.channel(`pilot-live-${scope}-${campus ?? 'all'}`),
    ).subscribe();

    const fallback = window.setInterval(scheduleRefresh, 15000);

    return () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [scope, campus]);

  return <PilotAdminWorkspace key={revision} scope={scope} campus={campus} />;
}
