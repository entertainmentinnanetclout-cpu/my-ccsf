import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, profileCompleted } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Redirect based on authentication and role
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Redirect based on role
    if (userRole === 'admin') {
      navigate('/admin', { replace: true });
    } else if (userRole === 'security') {
      navigate('/security', { replace: true });
    } else if (userRole === 'student') {
      // Check if profile is complete
      if (!profileCompleted) {
        navigate('/profile-completion', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Default to auth if no role
      navigate('/auth', { replace: true });
    }
  }, [user, userRole, loading, navigate, profileCompleted]);

  // Show loading while determining redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
