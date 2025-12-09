import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Auth temporarily disabled - set loading to false immediately
    setLoading(false);

    // Commented out for temporary no-auth mode
    // const fetchSession = async () => {
    //   const { data: { session } } = await supabase.auth.getSession();
    //   setSession(session);
    //   setUser(session?.user ?? null);
    //   setLoading(false);

    //   if (session?.user) {
    //     const { data: roleData } = await supabase
    //       .from('user_roles')
    //       .select('role')
    //       .eq('user_id', session.user.id)
    //       .order('role', { ascending: true })
    //       .limit(1)
    //       .maybeSingle();
    //     setUserRole(roleData?.role || null);
    //   }
    // };

    // fetchSession();

    // const { data: { subscription } } = supabase.auth.onAuthStateChange(
    //   (_event, session) => {
    //     setSession(session);
    //     setUser(session?.user ?? null);
    //     setLoading(false);

    //     if (session?.user) {
    //       supabase
    //         .from('user_roles')
    //         .select('role')
    //         .eq('user_id', session.user.id)
    //         .order('role', { ascending: true })
    //         .limit(1)
    //         .maybeSingle()
    //         .then(({ data: roleData }) => {
    //           setUserRole(roleData?.role || null);
    //         });
    //     } else {
    //       setUserRole(null);
    //     }
    //   }
    // );

    // return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/auth');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
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
