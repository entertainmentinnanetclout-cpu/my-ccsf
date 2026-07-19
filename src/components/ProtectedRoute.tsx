import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { InstitutionalAccessError, InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';
import {
  isApprovedPilotPath,
  isPilotAdminPath,
  isPilotSecurityPath,
  isPilotStudentPath,
  pilotDefaultDestination,
  type PilotRole,
} from '@/config/pilot';
import { officialDefaultDestination } from '@/config/officialRoutes';

type UserRole = PilotRole;

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function isPilotProtectedPath(pathname: string): boolean {
  return isPilotStudentPath(pathname) || isPilotSecurityPath(pathname) || isPilotAdminPath(pathname);
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading, authError, refreshIdentity, signOut } = useAuth();
  const location = useLocation();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  if (loading) return <InstitutionalLoadingState />;

  if (!user) {
    const authPath = isPilotProtectedPath(location.pathname) ? '/pilot/auth' : '/auth';
    return <Navigate to={authPath} state={{ from: requestedPath }} replace />;
  }

  if (authError || !userRole) {
    return (
      <InstitutionalAccessError
        description={authError ?? 'Your CCSF portal role could not be resolved.'}
        onRetry={() => void refreshIdentity()}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (!allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  if (isApprovedPilotPath(location.pathname)) {
    return <Navigate to={pilotDefaultDestination(userRole)} replace />;
  }

  return <Navigate to={officialDefaultDestination(userRole)} replace />;
};
