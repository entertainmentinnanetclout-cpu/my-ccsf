import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

// Use actual database role names
type UserRole = 'student' | 'admin' | 'security' | null;

interface UserProfile {
  id: string;
  full_name: string | null;
  campus: string | null;
  email: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      // Fetch all roles from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      // Prioritize roles: admin > security > student
      let dbRole: UserRole = null;
      if (roleData && roleData.length > 0) {
        const roles = roleData.map(r => r.role);
        if (roles.includes('admin')) {
          dbRole = 'admin';
        } else if (roles.includes('security')) {
          dbRole = 'security';
        } else if (roles.includes('student')) {
          dbRole = 'student';
        }
      }
      setUserRole(dbRole);

      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, campus, email')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setUserProfile(profileData);
      }

      return dbRole;
    } catch (error) {
      console.error('Error fetching user role/profile:', error);
      return null;
    }
  }, []);

  const redirectBasedOnRole = useCallback((role: UserRole) => {
    const currentPath = location.pathname;

    // Redirect to correct portal based on role
    if (role === 'admin') {
      if (!currentPath.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      }
    } else if (role === 'security') {
      if (!currentPath.startsWith('/security') && !currentPath.startsWith('/admin')) {
        navigate('/security', { replace: true });
      }
    } else if (role === 'student') {
      if (!currentPath.startsWith('/dashboard')) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to prevent potential deadlock
          setTimeout(() => {
            fetchUserRoleAndProfile(session.user.id).then((role) => {
              setLoading(false);
              if (role && event === 'SIGNED_IN') {
                redirectBasedOnRole(role);
              }
            });
          }, 0);
        } else {
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoleAndProfile(session.user.id).then(() => {
          setLoading(false);
        });
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

  // Helper booleans for convenience
  const isSuperAdmin = userRole === 'admin';
  const isCampusAdmin = userRole === 'security';
  const isStudent = userRole === 'student';

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
      isStudent
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
