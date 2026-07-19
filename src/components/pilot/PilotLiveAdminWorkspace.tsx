import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PilotAdminWorkspace } from '@/components/pilot/PilotAdminWorkspace';
import type { CampusLocation } from '@/types/pilot';

const LIVE_TABLES = [
  'pilot_programs', 'pilot_participants', 'pilot_sessions', 'pilot_reports',
  'pilot_report_events', 'pilot_notifications', 'pilot_feedback', 'pilot_feature_tests',
] as const;

export function PilotLiveAdminWorkspace({ scope, campus }: {
  scope: 'campus' | 'admin';
  campus?: CampusLocation | null;
}) {
  const [revision, setRevision] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setRevision((value) => value + 1), 350);
    };

    let channel = supabase.channel(`pilot-live-${scope}-${campus ?? 'all'}`);
    LIVE_TABLES.forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    });
    channel.subscribe();
    const fallback = window.setInterval(refresh, 15000);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [scope, campus]);

  return <PilotAdminWorkspace key={revision} scope={scope} campus={campus} />;
}
