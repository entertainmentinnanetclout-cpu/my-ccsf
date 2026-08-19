import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Fingerprint, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { InstitutionalAuthFrame } from '@/components/auth/InstitutionalAuthFrame';
import { InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { CAMPUS_LABELS, PILOT_CAMPUS_VALUES } from '@/config/pilot';
import { resolveOfficialDestination } from '@/config/officialRoutes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  biometricPlatformLabel,
  biometricSupported,
  platformAuthenticatorAvailable,
  signInWithBiometric,
} from '@/lib/biometricAuth';
import type { CampusLocation } from '@/types/pilot';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'update-password';
type RequestedLocation = string | { pathname?: unknown; search?: unknown; hash?: unknown };

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const biometricLoginSchema = z.object({
  email: z.string().trim().email('Enter your CCSF account email before using biometric sign-in.'),
});

const signupSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  password: z.string().min(8, 'Password must contain at least 8 characters.').max(100),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100),
  studentNumber: z.string().trim().max(20, 'Student number is too long.'),
  campus: z.string().min(1, 'Select your campus.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

const recoverySchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });
const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must contain at least 8 characters.').max(100),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, userRole, loading: authLoading, profileCompleted } = useAuth();
  const requestedFrom = (location.state as { from?: RequestedLocation } | null)?.from;
  const resetRequested = searchParams.get('reset') === 'true';
  const [view, setView] = useState<AuthView>(resetRequested ? 'update-password' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [campus, setCampus] = useState<CampusLocation | ''>('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resetRequested) setView('update-password');
  }, [resetRequested]);

  useEffect(() => {
    if (!biometricSupported()) {
      setBiometricAvailable(false);
      return;
    }
    void platformAuthenticatorAvailable().then(setBiometricAvailable);
  }, []);

  useEffect(() => {
    if (!user || !userRole || view === 'update-password') return;
    const destination = resolveOfficialDestination(userRole, requestedFrom);
    if (userRole === 'student' && !profileCompleted) {
      navigate('/profile-completion', { replace: true, state: { from: destination } });
      return;
    }
    navigate(destination, { replace: true });
  }, [user, userRole, profileCompleted, requestedFrom, navigate, view]);

  const heading = useMemo(() => {
    if (view === 'signup') return { title: 'Create a student account', description: 'Register for official CCSF student services.' };
    if (view === 'forgot-password') return { title: 'Recover your account', description: 'Receive a secure password-recovery link.' };
    if (view === 'update-password') return { title: 'Set a new password', description: 'Choose a new password for your CCSF account.' };
    return { title: 'Official portal sign in', description: 'Use your authorised CCSF credentials or a biometric login you previously enabled.' };
  }, [view]);

  const switchView = (next: AuthView) => {
    setView(next);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
    if (next !== 'update-password' && resetRequested) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('reset');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const validate = () => {
    try {
      if (view === 'login') loginSchema.parse({ email, password });
      if (view === 'signup') signupSchema.parse({ email, password, confirmPassword, fullName, studentNumber, campus });
      if (view === 'forgot-password') recoverySchema.parse({ email });
      if (view === 'update-password') updatePasswordSchema.parse({ password, confirmPassword });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: Record<string, string> = {};
        for (const issue of error.errors) {
          const field = issue.path[0];
          if (typeof field === 'string' && !nextErrors[field]) nextErrors[field] = issue.message;
        }
        setErrors(nextErrors);
      }
      return false;
    }
  };

  const handleBiometricLogin = async () => {
    try {
      biometricLoginSchema.parse({ email });
      setErrors((current) => ({ ...current, email: '' }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors((current) => ({ ...current, email: error.errors[0]?.message ?? 'Enter your email address.' }));
      }
      return;
    }
    if (!biometricAvailable) {
      toast({ title: 'Biometric sign-in unavailable', description: 'This browser or device does not report a supported user-verifying authenticator. Use your password instead.', variant: 'destructive' });
      return;
    }
    setBiometricLoading(true);
    try {
      await signInWithBiometric(email);
      toast({
        title: 'Biometric identity verified',
        description: 'Your CCSF account is signed in. Privileged accounts will still complete mandatory MFA before portal access.',
      });
    } catch (error) {
      const failure = error as Error & { name?: string };
      toast({
        title: 'Biometric sign-in failed',
        description: failure.name === 'NotAllowedError'
          ? 'Biometric verification was cancelled or timed out. You can try again or use your password.'
          : failure.message || 'Use your password or try biometric sign-in again.',
        variant: 'destructive',
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) throw new Error('Invalid email or password.');
          throw error;
        }
        toast({ title: 'Sign-in successful', description: 'Your CCSF role and portal access are being verified.' });
        return;
      }

      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verified=true`,
            data: {
              full_name: fullName.trim(),
              student_number: studentNumber.trim(),
              campus,
              role: 'student',
            },
          },
        });
        if (error) {
          if (error.message.includes('User already registered')) throw new Error('An account with this email already exists. Sign in instead.');
          throw error;
        }
        toast({
          title: data.session ? 'Account created' : 'Verify your email',
          description: data.session
            ? 'Your student account is being prepared.'
            : 'Open the verification link sent to your email, then return to the official portal.',
        });
        return;
      }

      if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast({ title: 'Recovery email sent', description: 'Use the secure link in your email to set a new password.' });
        switchView('login');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'Your new password is active.' });
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('reset');
      setSearchParams(nextParams, { replace: true });
      if (userRole) navigate(resolveOfficialDestination(userRole, requestedFrom), { replace: true });
      else switchView('login');
    } catch (error) {
      toast({
        title: view === 'login' ? 'Sign-in failed' : view === 'signup' ? 'Account creation failed' : 'Account recovery failed',
        description: error instanceof Error ? error.message : 'The request could not be completed. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <InstitutionalLoadingState label="Restoring your CCSF session…" />;

  return (
    <InstitutionalAuthFrame
      mode="official"
      eyebrow="Official CCSF Portal"
      title="One institutional account for every CCSF portal"
      description="Students, campus-security teams and super-admins use the same secure identity service. Your verified role determines the portal and information available to you."
    >
      <Button variant="ghost" className="mb-6 -ml-3" onClick={() => navigate('/')}>
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Public home
      </Button>

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="px-0 pt-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#002F6C] dark:text-[#F2A900]">Secure institutional access</p>
          <CardTitle className="mt-2 text-2xl sm:text-3xl">{heading.title}</CardTitle>
          <CardDescription className="text-sm leading-6">{heading.description}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {view === 'signup' && (
              <>
                <Field label="Full name" error={errors.fullName}>
                  <Input id="official-full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-12" aria-invalid={Boolean(errors.fullName)} />
                </Field>
                <Field label="Student number" error={errors.studentNumber} optional>
                  <Input id="official-student-number" autoComplete="off" value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} className="h-12" aria-invalid={Boolean(errors.studentNumber)} />
                </Field>
                <Field label="Campus" error={errors.campus}>
                  <Select value={campus} onValueChange={(value) => setCampus(value as CampusLocation)}>
                    <SelectTrigger id="official-campus" className="h-12" aria-invalid={Boolean(errors.campus)}><SelectValue placeholder="Select your campus" /></SelectTrigger>
                    <SelectContent>{PILOT_CAMPUS_VALUES.map((value) => <SelectItem key={value} value={value}><span className="flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />{CAMPUS_LABELS[value]}</span></SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>
            )}

            {view !== 'update-password' && (
              <Field label="Email address" error={errors.email}>
                <Input id="official-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12" aria-invalid={Boolean(errors.email)} />
              </Field>
            )}

            {(view === 'login' || view === 'signup' || view === 'update-password') && (
              <Field label={view === 'update-password' ? 'New password' : 'Password'} error={errors.password}>
                <Input id="official-password" type="password" autoComplete={view === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12" aria-invalid={Boolean(errors.password)} />
              </Field>
            )}

            {(view === 'signup' || view === 'update-password') && (
              <Field label="Confirm password" error={errors.confirmPassword}>
                <Input id="official-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12" aria-invalid={Boolean(errors.confirmPassword)} />
              </Field>
            )}

            <Button type="submit" className="h-12 w-full bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-base font-bold text-white shadow-lg" disabled={loading || biometricLoading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {view === 'login' && 'Sign in with password'}
              {view === 'signup' && 'Create student account'}
              {view === 'forgot-password' && 'Send recovery email'}
              {view === 'update-password' && 'Update password'}
            </Button>
          </form>

          {view === 'login' && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button type="button" variant="outline" className="h-12 w-full border-[#002F6C]/25 font-bold" disabled={!biometricAvailable || loading || biometricLoading} onClick={() => void handleBiometricLogin()}>
                {biometricLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Fingerprint className="mr-2 h-5 w-5 text-[#002F6C]" />}
                Sign in with {biometricPlatformLabel()}
              </Button>
              <div className="rounded-xl border bg-muted/35 p-3 text-xs leading-5 text-muted-foreground">
                <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Biometric sign-in must first be enabled from your account security settings on a supported device. It replaces the password step only. Admin, CPS/Security and Developer accounts still complete mandatory MFA.</span></div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col items-center gap-1 text-sm">
            {view === 'login' && <Button variant="link" onClick={() => switchView('forgot-password')}>Forgot your password?</Button>}
            {view === 'login' && <Button variant="link" onClick={() => switchView('signup')}>Create a student account</Button>}
            {view === 'signup' && <Button variant="link" onClick={() => switchView('login')}>Already registered? Sign in</Button>}
            {view === 'forgot-password' && <Button variant="link" onClick={() => switchView('login')}>Back to sign in</Button>}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/45 p-4 text-xs leading-5 text-muted-foreground">
            Student self-registration creates a student account only. Campus-security and super-admin access must be assigned through authorised CCSF administration.
          </div>
        </CardContent>
      </Card>
    </InstitutionalAuthFrame>
  );
}

function Field({
  label,
  error,
  optional = false,
  children,
}: {
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}{optional ? ' (optional)' : ''}</Label>
      {children}
      {error && <p className="text-sm font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
