import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isApprovedPilotPath, PILOT_ENABLED } from '@/config/pilot';
import { ensureActivePilotSession, loadStudentPilotContext } from '@/services/pilot/pilotCoreService';
import { invokePilotFunction } from '@/services/pilot/pilotEdgeService';
import { supabase } from '@/integrations/supabase/client';
import type { PilotParticipant, PilotProgram, PilotSession } from '@/types/pilot';

type AppMode = 'production' | 'pilot';

interface PilotModeContextValue {
  mode: AppMode;
  enabled: boolean;
  isPilotRoute: boolean;
  loading: boolean;
  error: string | null;
  program: PilotProgram | null;
  participant: PilotParticipant | null;
  session: PilotSession | null;
  refresh: () => Promise<void>;
  setSession: React.Dispatch<React.SetStateAction<PilotSession | null>>;
}

const PilotModeContext = createContext<PilotModeContextValue | undefined>(undefined);

export function PilotModeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, userRole } = useAuth();
  const userId = user?.id ?? null;
  const isPilotRoute = isApprovedPilotPath(location.pathname);
  const enabled = PILOT_ENABLED && isPilotRoute;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<PilotProgram | null>(null);
  const [participant, setParticipant] = useState<PilotParticipant | null>(null);
  const [session, setSession] = useState<PilotSession | null>(null);
  const contextReadyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || !userId || !userRole) {
      contextReadyRef.current = false;
      setProgram(null);
      setParticipant(null);
      setSession(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!contextReadyRef.current) setLoading(true);
    setError(null);

    try {
      if (userRole === 'student') {
        await invokePilotFunction('pilot-enrol-student', {});
        const context = await loadStudentPilotContext(userId);
        let nextSession = context.session;

        if (context.participant && ['consented', 'active'].includes(context.participant.status)) {
          nextSession = await ensureActivePilotSession(context.participant, nextSession);
        }

        setProgram(context.program);
        setParticipant(context.participant);
        setSession(nextSession);
      } else {
        const { data, error: programError } = await supabase
          .from('pilot_programs')
          .select('*')
          .in('status', ['active', 'paused', 'completed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (programError) throw programError;
        setProgram((data ?? null) as PilotProgram | null);
        setParticipant(null);
        setSession(null);
      }

      contextReadyRef.current = true;
    } catch (caught) {
      console.error('Pilot context loading failed', caught);
      setError(caught instanceof Error ? caught.message : 'Unable to load Pilot Mode.');

      if (!contextReadyRef.current) {
        setProgram(null);
        setParticipant(null);
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, userId, userRole]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<PilotModeContextValue>(() => ({
    mode: enabled ? 'pilot' : 'production',
    enabled,
    isPilotRoute,
    loading,
    error,
    program,
    participant,
    session,
    refresh,
    setSession,
  }), [enabled, isPilotRoute, loading, error, program, participant, session, refresh]);

  return <PilotModeContext.Provider value={value}>{children}</PilotModeContext.Provider>;
}

export function usePilotMode(): PilotModeContextValue {
  const context = useContext(PilotModeContext);
  if (!context) throw new Error('usePilotMode must be used within PilotModeProvider');
  return context;
}
