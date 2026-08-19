import type { ReactNode } from 'react';
import { Loader2, LockKeyhole, ShieldAlert, Wrench } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

const RECOVERY_AUTH_PATHS = new Set(['/auth', '/pilot/auth']);
const SESSION_BLOCK_REASONS = new Set(['blocked', 'suspended', 'restricted', 'session_revoked', 'access_expired']);
const DEVELOPER_CONTACT = 'Dubea@tut.ac.za';

export function RuntimeControlBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { loading, error, access, system, refresh } = useRuntimeControl();

  if (loading && !access) return <RuntimeLoadingState />;

  // Browser telemetry may fail open, but authenticated data remains protected by
  // server-side RLS/write gates. Authentication pages always remain recoverable.
  if (error && !access) return <>{children}</>;

  if (access && !access.allowed) {
    const isAnonymousRecoveryPath = !user && RECOVERY_AUTH_PATHS.has(location.pathname);
    if (isAnonymousRecoveryPath) return <>{children}</>;

    return (
      <RuntimeDeniedState
        reason={access.reason}
        message={system?.message ?? ''}
        authenticated={Boolean(user)}
        onRetry={() => void refresh({ type: 'access_retry', severity: 'info' })}
        onSignOut={() => void signOut()}
      />
    );
  }

  // Developer identities are intentionally exclusive: they do not participate in
  // Student, CPS/Security, or Admin portal routing. Keep password recovery reachable,
  // otherwise force every authenticated developer session into the control plane.
  const isDeveloperPasswordRecovery = location.pathname === '/auth'
    && new URLSearchParams(location.search).get('reset') === 'true';
  if (
    user
    && access?.allowed
    && access.is_developer
    && location.pathname !== '/developer'
    && !isDeveloperPasswordRecovery
  ) {
    return <Navigate to="/developer" replace />;
  }

  return <>{children}</>;
}

export function FeatureRoute({ feature, children }: { feature: string; children: ReactNode }) {
  const { loading, featureEnabled } = useRuntimeControl();
  if (loading) return <RuntimeLoadingState compact />;
  if (featureEnabled(feature)) return <>{children}</>;

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 py-10">
      <Card className="w-full border-amber-500/30 shadow-large">
        <CardHeader className="items-center text-center">
          <div className="rounded-full bg-amber-500/10 p-3"><Wrench className="h-7 w-7 text-amber-600" aria-hidden="true" /></div>
          <CardTitle>Feature temporarily unavailable</CardTitle>
          <CardDescription>This CCSF feature has been disabled by the developer control plane. Other authorised features remain available.</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function RuntimeLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`flex items-center justify-center bg-background px-4 ${compact ? 'min-h-[50vh]' : 'min-h-screen'}`}>
      <div className="text-center"><InstitutionBrand size="header" /><Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-primary" aria-hidden="true" /><p className="mt-3 text-sm text-muted-foreground">Validating CCSF runtime access…</p></div>
    </main>
  );
}

function RuntimeDeniedState({ reason, message, authenticated, onRetry, onSignOut }: { reason: string; message: string; authenticated: boolean; onRetry: () => void; onSignOut: () => void }) {
  const sessionBlocked = SESSION_BLOCK_REASONS.has(reason);
  const systemPaused = reason === 'system_paused' || reason === 'maintenance';
  const title = sessionBlocked ? 'Session blocked' : systemPaused ? 'CCSF is temporarily unavailable' : 'Access restricted';
  const description = sessionBlocked
    ? `Your session is blocked. Please contact the developer at ${DEVELOPER_CONTACT}.`
    : message || 'This CCSF workspace is temporarily unavailable under the developer control plane.';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden="true" />
      <Card role="alertdialog" aria-modal="true" aria-labelledby="runtime-denied-title" aria-describedby="runtime-denied-description" className="relative z-10 w-full max-w-xl border-destructive/40 shadow-2xl">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-3 rounded-full bg-destructive/10 p-3">{systemPaused ? <LockKeyhole className="h-7 w-7 text-destructive" aria-hidden="true" /> : <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden="true" />}</div>
          <CardTitle id="runtime-denied-title">{title}</CardTitle>
          <CardDescription id="runtime-denied-description" className="max-w-lg text-base">{description}</CardDescription>
          {sessionBlocked && <a className="mt-2 font-semibold text-primary underline" href={`mailto:${DEVELOPER_CONTACT}`}>{DEVELOPER_CONTACT}</a>}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRetry}>Retry access check</Button>
          {authenticated && <Button variant="outline" onClick={onSignOut}>Sign out</Button>}
        </CardContent>
      </Card>
    </main>
  );
}
