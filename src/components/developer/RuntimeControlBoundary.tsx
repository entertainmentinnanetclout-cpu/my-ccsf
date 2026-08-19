import type { ReactNode } from 'react';
import { Loader2, LockKeyhole, ShieldAlert, Wrench } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

const RECOVERY_AUTH_PATHS = new Set(['/auth', '/pilot/auth']);

export function RuntimeControlBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { loading, error, access, system, refresh } = useRuntimeControl();

  if (loading && !access) {
    return <RuntimeLoadingState />;
  }

  // Telemetry/control-plane outages fail open in the browser. Authenticated operational
  // data remains protected by the restrictive RLS access gate when enforcement is enabled.
  if (error && !access) return <>{children}</>;

  if (access && !access.allowed) {
    const isDeveloperRecoveryPath = !user
      && access.reason === 'system_paused'
      && RECOVERY_AUTH_PATHS.has(location.pathname);
    if (isDeveloperRecoveryPath) return <>{children}</>;

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
          <div className="rounded-full bg-amber-500/10 p-3">
            <Wrench className="h-7 w-7 text-amber-600" aria-hidden="true" />
          </div>
          <CardTitle>Feature temporarily unavailable</CardTitle>
          <CardDescription>
            This CCSF feature has been disabled by the developer control plane. Other authorised features remain available.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function RuntimeLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`flex items-center justify-center bg-background px-4 ${compact ? 'min-h-[50vh]' : 'min-h-screen'}`}>
      <div className="text-center">
        <InstitutionBrand size="header" />
        <Loader2 className="mx-auto mt-6 h-7 w-7 animate-spin text-primary" aria-hidden="true" />
        <p className="mt-3 text-sm text-muted-foreground">Validating CCSF runtime access…</p>
      </div>
    </main>
  );
}

function RuntimeDeniedState({
  reason,
  message,
  authenticated,
  onRetry,
  onSignOut,
}: {
  reason: string;
  message: string;
  authenticated: boolean;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const systemPaused = reason === 'system_paused';
  const approvalRequired = reason === 'approval_required';
  const sessionRevoked = reason === 'session_revoked';

  const title = systemPaused
    ? 'CCSF is temporarily paused'
    : approvalRequired
      ? 'Developer approval required'
      : sessionRevoked
        ? 'This session has been revoked'
        : 'Access restricted';

  const description = message || (approvalRequired
    ? 'This account is onboarded but has not yet been approved for application access.'
    : sessionRevoked
      ? 'The developer has ended this device session. Sign in again only if your account remains authorised.'
      : 'This account, device, network address, or session is not authorised to use CCSF.');

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl border-destructive/30 shadow-large">
        <CardHeader className="items-center text-center">
          <InstitutionBrand size="header" />
          <div className="mt-3 rounded-full bg-destructive/10 p-3">
            {systemPaused
              ? <LockKeyhole className="h-7 w-7 text-destructive" aria-hidden="true" />
              : <ShieldAlert className="h-7 w-7 text-destructive" aria-hidden="true" />}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="max-w-lg">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRetry}>Retry access check</Button>
          {authenticated && <Button variant="outline" onClick={onSignOut}>Sign out</Button>}
        </CardContent>
      </Card>
    </main>
  );
}
