import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import {
  isApprovedPilotPath,
  isPilotAdminPath,
  isPilotSecurityPath,
  isPilotStudentPath,
  pilotDefaultDestination,
  type PilotRole,
} from '@/config/pilot';

type UserRole = PilotRole;

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function isPilotProtectedPath(pathname: string): boolean {
  return isPilotStudentPath(pathname) || isPilotSecurityPath(pathname) || isPilotAdminPath(pathname);
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const authPath = isPilotProtectedPath(location.pathname) ? '/pilot/auth' : '/auth';
    return <Navigate to={authPath} state={{ from: requestedPath }} replace />;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  if (userRole && allowedRoles.includes(userRole as UserRole)) {
    return <>{children}</>;
  }

  if (userRole && isApprovedPilotPath(location.pathname)) {
    return <Navigate to={pilotDefaultDestination(userRole as PilotRole)} replace />;
  }

  if (userRole === 'student') {
    return <Navigate to="/dashboard" replace />;
  } else if (userRole === 'security') {
    return <Navigate to="/security" replace />;
  } else if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/auth" replace />;
};
