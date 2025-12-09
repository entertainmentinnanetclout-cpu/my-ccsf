import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'campus_admin' | 'super_admin')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If no role restrictions, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has an allowed role
  if (userRole && allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  // Redirect based on user's actual role
  if (userRole === 'student') {
    return <Navigate to="/dashboard" replace />;
  } else if (userRole === 'campus_admin') {
    return <Navigate to="/security" replace />;
  } else if (userRole === 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  // Default fallback
  return <Navigate to="/auth" replace />;
};
