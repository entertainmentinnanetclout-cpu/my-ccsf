import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { PilotRole } from '@/config/pilotRoutes';

type UserRole = PilotRole | null;

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
  authError: string | null;
  signOut: () => Promise<void>;
  refreshIdentity: () => Promise<void>;
  isSuperAdmin: boolean;
  isCampusAdmin: boolean;
  isStudent: boolean;
  profileCompleted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveRole(roles: Array<{ role: PilotRole }>): UserRole {
  const values = roles.map((item) => item.role);
  if (values.includes('admin')) return 'admin';
  if (values.includes('security')) return 'security';
  if (values.includes('student')) return 'student';
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const identityRequestRef = useRef(0);

  const clearIdentity = useCallback(() => {
    setUserRole(null);
    setUserProfile(null);
    setAuthError(null);
  }, []);

  const fetchUserRoleAndProfile = useCallback(async (activeUser: User) => {
    const requestId = ++identityRequestRef.current;
    setLoading(true);

    try {
      const [roleResponse, profileResponse] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', activeUser.id),
        supabase
          .from('profiles')
          .select('id, full_name, campus, email, profile_completed')
          .eq('id', activeUser.id)
          .maybeSingle(),
      ]);

      if (roleResponse.error) throw roleResponse.error;
      if (profileResponse.error) throw profileResponse.error;
      if (requestId !== identityRequestRef.current) return;

      const role = resolveRole((roleResponse.data ?? []) as Array<{ role: PilotRole }>);
      if (!role) {
        setUserRole(null);
        setUserProfile(null);
        setAuthError('This account does not have an authorised CCSF portal role. Contact a CCSF administrator for access.');
        return;
      }

      const profile = profileResponse.data;
      setUserRole(role);
      setUserProfile({
        id: activeUser.id,
        full_name: profile?.full_name ?? null,
        campus: profile?.campus ?? null,
        email: profile?.email ?? activeUser.email ?? '',
        profile_completed: profile?.profile_completed ?? false,
      });
      setAuthError(null);
    } catch (error) {
      if (requestId !== identityRequestRef.current) return;
      console.error('Unable to load CCSF account identity:', error);
      setUserRole(null);
      setUserProfile(null);
      setAuthError('Your CCSF role and profile could not be verified. Check your connection and retry.');
    } finally {
      if (requestId === identityRequestRef.current) setLoading(false);
    }
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      identityRequestRef.current += 1;
      clearIdentity();
      setLoading(false);
      return;
    }

    await fetchUserRoleAndProfile(nextSession.user);
  }, [clearIdentity, fetchUserRoleAndProfile]);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queueMicrotask(() => {
        if (active) void applySession(nextSession);
      });
    });

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        return applySession(data.session);
      })
      .catch((error) => {
        if (!active) return;
        console.error('Unable to restore CCSF session:', error);
        setAuthError('Your saved session could not be restored. Sign in again.');
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshIdentity = useCallback(async () => {
    if (!user) {
      setAuthError('Sign in before retrying account verification.');
      return;
    }
    await fetchUserRoleAndProfile(user);
  }, [fetchUserRoleAndProfile, user]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    identityRequestRef.current += 1;
    setSession(null);
    setUser(null);
    clearIdentity();
    setLoading(false);
    if (error) throw error;
  }, [clearIdentity]);

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
      authError,
      signOut,
      refreshIdentity,
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
