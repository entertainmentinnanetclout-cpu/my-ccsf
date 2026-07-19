import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PILOT_ENABLED,
  PILOT_POST_PROFILE_REDIRECT_KEY,
  PILOT_ROUTES,
  resolvePilotDestination,
} from '@/config/pilot';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PilotAuthInstitutionalView } from '@/components/pilot/PilotAuthInstitutionalView';
import { InstitutionalAccessError, InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';

const PILOT_ACCESS_REQUIREMENT = 'Student accounts must be invited to an active Pilot programme.';

type PilotAuthView = 'login' | 'forgot-password';
type PilotRequestedLocation = string | {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
};

export default function PilotAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    user,
    userRole,
    loading: authLoading,
    authError,
    refreshIdentity,
    signOut,
    profileCompleted,
  } = useAuth();
  const [view, setView] = useState<PilotAuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const requestedFrom = (location.state as { from?: PilotRequestedLocation } | null)?.from;

  useEffect(() => {
    if (!user || !userRole) return;

    const destination = resolvePilotDestination(userRole, requestedFrom);
    if (userRole === 'student' && !profileCompleted) {
      sessionStorage.setItem(PILOT_POST_PROFILE_REDIRECT_KEY, destination);
      navigate('/profile-completion', {
        replace: true,
        state: { from: destination },
      });
      return;
    }

    sessionStorage.removeItem(PILOT_POST_PROFILE_REDIRECT_KEY);
    navigate(destination, { replace: true });
  }, [user, userRole, profileCompleted, requestedFrom, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast({ title: 'Email required', description: 'Enter the email linked to your existing CCSF account.', variant: 'destructive' });
      return;
    }

    if (view === 'login' && !password) {
      toast({ title: 'Password required', description: 'Enter your existing account password.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast({ title: 'Recovery email sent', description: 'Use the official CCSF recovery page to set your new password, then return to Pilot Mode.' });
        setView('login');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Use the credentials for your existing CCSF account.');
        }
        throw error;
      }

      toast({ title: 'Pilot sign-in successful', description: 'Your Pilot access and institutional role are being verified.' });
    } catch (error) {
      toast({
        title: view === 'login' ? 'Pilot sign-in failed' : 'Recovery request failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <InstitutionalLoadingState label="Verifying your CCSF Pilot identity…" />;

  if (user && authError) {
    return (
      <InstitutionalAccessError
        description={authError}
        onRetry={() => void refreshIdentity()}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (!PILOT_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center border-t-4 border-t-[#F2A900] bg-background p-4">
        <Card className="w-full max-w-lg border-border shadow-large">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 rounded-full bg-muted p-3"><LockKeyhole className="h-7 w-7 text-[#002F6C]" /></div>
            <CardTitle>Pilot Mode is disabled</CardTitle>
            <CardDescription>This deployment has not been authorised for controlled Pilot testing.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full" onClick={() => navigate('/auth')}>Open official portal sign in</Button></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-access-requirement={PILOT_ACCESS_REQUIREMENT}>
      <PilotAuthInstitutionalView
        view={view}
        email={email}
        password={password}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        onToggleView={() => setView((current) => current === 'login' ? 'forgot-password' : 'login')}
        onOfficialPortal={() => navigate('/auth')}
      />
    </div>
  );
}
