import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { isPilotAdminPath, isPilotSecurityPath, isPilotStudentPath, PILOT_ROUTES } from '@/config/pilot';

const PILOT_AUTH_PATH = '/pilot/auth';

type UserRole = 'student' | 'admin' | 'security' | null;

interface UserProfile {
  id: string;
  full_name: string | null;
  campus: string | null;
  email: string;
  profile_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isCampusAdmin: boolean;
  isStudent: boolean;
  profileCompleted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function pilotDestination(role: Exclude<UserRole, null>): string {
  if (role === 'admin') return PILOT_ROUTES.admin;
  if (role === 'security') return PILOT_ROUTES.campus;
  return PILOT_ROUTES.landing;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserRoleAndProfile = useCallback(async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      let dbRole: UserRole = null;
      if (roleData && roleData.length > 0) {
        const roles = roleData.map((item) => item.role);
        if (roles.includes('admin')) dbRole = 'admin';
        else if (roles.includes('security')) dbRole = 'security';
        else if (roles.includes('student')) dbRole = 'student';
      }
      setUserRole(dbRole);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, campus, email, profile_completed')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setUserProfile({ ...profileData, profile_completed: profileData.profile_completed ?? false });
      }

      return { role: dbRole, profileCompleted: profileData?.profile_completed ?? false };
    } catch (error) {
      console.error('Error fetching user role/profile:', error);
      return { role: null, profileCompleted: false };
    }
  }, []);

  const redirectBasedOnRole = useCallback((role: UserRole, profileCompletedValue: boolean) => {
    if (!role) return;

    const currentPath = location.pathname;
    const isPilotEntry = currentPath === PILOT_AUTH_PATH
      || isPilotStudentPath(currentPath)
      || isPilotSecurityPath(currentPath)
      || isPilotAdminPath(currentPath);

    if (role === 'student' && !profileCompletedValue) {
      if (currentPath !== '/profile-completion') {
        navigate('/profile-completion', {
          replace: true,
          state: isPilotEntry ? { from: PILOT_ROUTES.landing } : undefined,
        });
      }
      return;
    }

    if (currentPath === PILOT_AUTH_PATH) {
      navigate(pilotDestination(role), { replace: true });
      return;
    }

    if (role === 'admin') {
      const allowed = currentPath.startsWith('/admin') || isPilotSecurityPath(currentPath) || currentPath.startsWith('/profile') || currentPath === '/office' || currentPath === '/judiciary';
      if (!allowed) navigate('/admin', { replace: true });
    } else if (role === 'security') {
      const allowed = currentPath.startsWith('/security') || currentPath.startsWith('/profile') || currentPath === '/office' || currentPath === '/judiciary';
      if (!allowed || isPilotAdminPath(currentPath)) navigate('/security', { replace: true });
    } else if (role === 'student') {
      const allowed = currentPath.startsWith('/dashboard') || currentPath.startsWith('/profile') || isPilotStudentPath(currentPath);
      if (!allowed || isPilotSecurityPath(currentPath) || isPilotAdminPath(currentPath)) navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setTimeout(() => {
          fetchUserRoleAndProfile(nextSession.user.id).then(({ role, profileCompleted }) => {
            setLoading(false);
            if (role && event === 'SIGNED_IN') redirectBasedOnRole(role, profileCompleted);
          });
        }, 0);
      } else {
        setUserRole(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchUserRoleAndProfile(existingSession.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRoleAndProfile, redirectBasedOnRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
    navigate('/auth');
  }, [navigate]);

  const isSuperAdmin = userRole === 'admin';
  const isCampusAdmin = userRole === 'security';
  const isStudent = userRole === 'student';
  const profileCompleted = userProfile?.profile_completed ?? false;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      userProfile,
      loading,
      signOut,
      isSuperAdmin,
      isCampusAdmin,
      isStudent,
      profileCompleted,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
