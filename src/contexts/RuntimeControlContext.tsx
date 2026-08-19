import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  observeRuntime,
  reportRuntimeEvent,
  type RuntimeEventInput,
  type RuntimeObserverResponse,
} from '@/lib/runtimeControl';

type RuntimeControlContextValue = {
  loading: boolean;
  error: string | null;
  access: RuntimeObserverResponse['access'] | null;
  system: RuntimeObserverResponse['system'] | null;
  features: Record<string, boolean>;
  session: RuntimeObserverResponse['session'] | null;
  lastCheckedAt: Date | null;
  refresh: (event?: RuntimeEventInput) => Promise<RuntimeObserverResponse | null>;
  featureEnabled: (key: string) => boolean;
  reportEvent: (event: RuntimeEventInput) => Promise<void>;
};

const RuntimeControlContext = createContext<RuntimeControlContextValue | undefined>(undefined);

export function RuntimeControlProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeObserverResponse | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const activeRequestRef = useRef(0);
  const hasSnapshotRef = useRef(false);
  const routeRef = useRef(location.pathname);

  const refresh = useCallback(async (event?: RuntimeEventInput) => {
    const requestId = ++activeRequestRef.current;
    if (!hasSnapshotRef.current) setLoading(true);

    try {
      const next = await observeRuntime(event);
      if (requestId !== activeRequestRef.current) return null;
      hasSnapshotRef.current = true;
      setSnapshot(next);
      setError(null);
      setLastCheckedAt(new Date());
      return next;
    } catch (runtimeError) {
      if (requestId !== activeRequestRef.current) return null;
      const message = runtimeError instanceof Error ? runtimeError.message : 'Runtime control check failed.';
      setError(message);
      // Fail open at the UI layer. When enforcement is enabled, the database RLS gate
      // remains authoritative for authenticated operational data.
      return null;
    } finally {
      if (requestId === activeRequestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh({
      type: 'runtime_boot',
      severity: 'info',
      metadata: { authenticated: Boolean(session?.access_token) },
    });
  }, [refresh, session?.access_token]);

  useEffect(() => {
    const previousRoute = routeRef.current;
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    routeRef.current = currentRoute;
    void refresh({
      type: 'navigation',
      severity: 'info',
      route: currentRoute,
      metadata: { from: previousRoute, to: currentRoute },
    });
  }, [location.hash, location.pathname, location.search, refresh]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refresh({ type: 'runtime_heartbeat', severity: 'info' });
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportRuntimeEvent({
        type: 'window_error',
        severity: 'error',
        message: event.message,
        stack: event.error instanceof Error ? event.error.stack : undefined,
        metadata: { filename: event.filename, line: event.lineno, column: event.colno },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      void reportRuntimeEvent({
        type: 'unhandled_rejection',
        severity: 'error',
        message: reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection'),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh({ type: 'app_resumed', severity: 'info' });
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  const featureEnabled = useCallback((key: string) => snapshot?.features[key] ?? true, [snapshot?.features]);
  const reportEvent = useCallback((event: RuntimeEventInput) => reportRuntimeEvent(event), []);

  const value = useMemo<RuntimeControlContextValue>(() => ({
    loading,
    error,
    access: snapshot?.access ?? null,
    system: snapshot?.system ?? null,
    features: snapshot?.features ?? {},
    session: snapshot?.session ?? null,
    lastCheckedAt,
    refresh,
    featureEnabled,
    reportEvent,
  }), [error, featureEnabled, lastCheckedAt, loading, refresh, reportEvent, snapshot]);

  return <RuntimeControlContext.Provider value={value}>{children}</RuntimeControlContext.Provider>;
}

export function useRuntimeControl() {
  const context = useContext(RuntimeControlContext);
  if (!context) throw new Error('useRuntimeControl must be used within RuntimeControlProvider');
  return context;
}
