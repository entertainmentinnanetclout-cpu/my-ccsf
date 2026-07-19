import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PILOT_ENABLED, PILOT_ROUTES, PILOT_WARNING } from '@/config/pilot';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import tutLogoLight from '@/assets/tut_light_theme.png';

const PILOT_AUTH_PATH = '/pilot/auth';

type PilotAuthView = 'login' | 'forgot-password';
type PilotRole = 'student' | 'security' | 'admin';

function pilotDestination(role: PilotRole): string {
  if (role === 'admin') return PILOT_ROUTES.admin;
  if (role === 'security') return PILOT_ROUTES.campus;
  return PILOT_ROUTES.landing;
}

export default function PilotAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRole, loading: authLoading, profileCompleted } = useAuth();
  const [view, setView] = useState<PilotAuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !userRole) return;

    if (userRole === 'student' && !profileCompleted) {
      navigate('/profile-completion', {
        replace: true,
        state: { from: PILOT_ROUTES.landing },
      });
      return;
    }

    navigate(pilotDestination(userRole), { replace: true });
  }, [user, userRole, profileCompleted, navigate]);

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
          redirectTo: `${window.location.origin}${PILOT_AUTH_PATH}?reset=true`,
        });
        if (error) throw error;
        toast({ title: 'Recovery email sent', description: 'Use the link in your email, then return to the Pilot login.' });
        setView('login');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Use the credentials for your existing CCSF account.');
        }
        throw error;
      }

      toast({ title: 'Pilot login successful', description: 'Your Pilot access and role are being verified.' });
    } catch (error) {
      toast({
        title: view === 'login' ? 'Pilot login failed' : 'Recovery request failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-9 w-9 animate-spin text-white" />
      </div>
    );
  }

  if (!PILOT_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <Card className="w-full max-w-lg border-white/10 bg-white shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 rounded-full bg-slate-100 p-3"><LockKeyhole className="h-7 w-7 text-slate-800" /></div>
            <CardTitle>Pilot Mode is disabled</CardTitle>
            <CardDescription>This deployment has not been authorised for controlled Pilot testing.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full" onClick={() => navigate('/auth')}>Open official portal login</Button></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(213_100%_27%),_hsl(222_47%_11%)_58%,_hsl(222_47%_7%))] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col justify-between gap-8 p-7 sm:p-10">
            <div>
              <img src={tutLogoLight} alt="TUT" className="mb-7 h-14 w-auto rounded bg-white p-2" />
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                <ShieldCheck className="h-4 w-4" /> Controlled testing environment
              </div>
              <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-5xl">CCSF Controlled Pilot Mode</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">Sign in with an existing CCSF account. Your role will take you directly to the student Pilot, campus dashboard, or super-admin console.</p>
            </div>

            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div><p className="font-semibold">Simulation only</p><p className="mt-1 leading-6">{PILOT_WARNING}</p></div>
              </div>
            </div>
          </section>

          <section className="bg-white p-7 text-slate-950 sm:p-10">
            <Button variant="ghost" className="mb-5 -ml-3" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Official portal</Button>
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle>{view === 'login' ? 'Pilot sign in' : 'Recover your account'}</CardTitle>
                <CardDescription>{view === 'login' ? 'Use the same email and password as the official CCSF application.' : 'Enter the email linked to your CCSF account.'}</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2"><Label htmlFor="pilot-email">Email</Label><Input id="pilot-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></div>
                  {view === 'login' && <div className="space-y-2"><Label htmlFor="pilot-password">Password</Label><Input id="pilot-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>}
                  <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{view === 'login' ? 'Enter Pilot Mode' : 'Send recovery email'}</Button>
                </form>

                <Button variant="link" className="mt-3 w-full" onClick={() => setView((current) => current === 'login' ? 'forgot-password' : 'login')}>{view === 'login' ? 'Forgot your password?' : 'Back to Pilot sign in'}</Button>

                <div className="mt-6 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-600">
                  Student accounts must be invited to an active Pilot programme. Security accounts require a campus assignment. Admin accounts open the super-admin Pilot console.
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}
