import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type UserRole = 'student' | 'admin' | 'security';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no role restrictions, allow access for any authenticated user
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has an allowed role
  if (userRole && allowedRoles.includes(userRole as UserRole)) {
    return <>{children}</>;
  }

  // Redirect based on user's actual role
  if (userRole === 'student') {
    return <Navigate to="/dashboard" replace />;
  } else if (userRole === 'security') {
    return <Navigate to="/security" replace />;
  } else if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Default fallback - no access
  return <Navigate to="/auth" replace />;
};
