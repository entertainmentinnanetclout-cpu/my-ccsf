import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  PILOT_POST_PROFILE_REDIRECT_KEY,
  resolvePilotDestination,
} from '@/config/pilot';

export function PilotPostProfileRedirect({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { userRole, profileCompleted, loading } = useAuth();

  useEffect(() => {
    if (loading || !profileCompleted || userRole !== 'student') return;

    const requestedPath = sessionStorage.getItem(PILOT_POST_PROFILE_REDIRECT_KEY);
    if (!requestedPath) return;

    sessionStorage.removeItem(PILOT_POST_PROFILE_REDIRECT_KEY);
    navigate(resolvePilotDestination('student', requestedPath), { replace: true });
  }, [loading, profileCompleted, userRole, navigate]);

  return <>{children}</>;
}
