import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth temporarily disabled - allow all access
  // if (!user) {
  //   return <Navigate to="/auth" replace />;
  // }

  // if (adminOnly) {
  //   if (userRole !== 'admin' && userRole !== 'security') {
  //     return <Navigate to="/dashboard" replace />;
  //   }
  //   if (userRole === 'security' && !window.location.pathname.startsWith('/security')) {
  //     return <Navigate to="/security" replace />;
  //   }
  //   if (userRole === 'admin' && window.location.pathname.startsWith('/security')) {
  //     return <Navigate to="/admin" replace />;
  //   }
  // }

  return <>{children}</>;
};
