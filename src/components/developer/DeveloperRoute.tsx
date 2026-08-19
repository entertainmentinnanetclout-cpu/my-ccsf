import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { InstitutionalAccessError, InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';

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

  return <>{children}</>;
}
