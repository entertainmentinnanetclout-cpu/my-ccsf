import type { ReactNode } from 'react';
import { Fingerprint } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { InstitutionalAccessError, InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';
import { DeveloperMfaGate } from '@/components/developer/DeveloperMfaGate';
import { DeveloperBiometricGate } from '@/components/developer/DeveloperBiometricGate';
import { Button } from '@/components/ui/button';

export function DeveloperRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { loading, error, access, refresh } = useRuntimeControl();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  if (authLoading || loading) return <InstitutionalLoadingState />;
  if (!user) return <Navigate to="/auth" replace state={{ from: requestedPath }} />;

  if (error && !access) {
    return (
      <InstitutionalAccessError
        description="Developer access could not be verified because the control plane is unavailable."
        onRetry={() => void refresh({ type: 'developer_access_retry', severity: 'warning' })}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (!access?.is_developer) {
    return (
      <InstitutionalAccessError
        description="This account is not authorised for the CCSF Developer Control Plane."
        onRetry={() => void refresh({ type: 'developer_access_retry', severity: 'warning' })}
        onSignOut={() => void signOut()}
      />
    );
  }

  const securitySettings = location.pathname === '/developer/security-settings';
  const content = securitySettings ? children : <DeveloperBiometricGate>{children}</DeveloperBiometricGate>;

  return (
    <DeveloperMfaGate>
      {content}
      {location.pathname === '/developer' && (
        <Button asChild className="fixed bottom-5 right-5 z-[80] min-h-12 rounded-full px-5 shadow-xl">
          <Link to="/developer/security-settings"><Fingerprint className="mr-2 h-5 w-5" />Login security</Link>
        </Button>
      )}
    </DeveloperMfaGate>
  );
}
