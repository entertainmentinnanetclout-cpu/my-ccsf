import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PILOT_CAMPUS_VALUES,
  PILOT_ENABLED,
  PILOT_POST_PROFILE_REDIRECT_KEY,
  resolvePilotDestination,
} from '@/config/pilot';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PilotAuthInstitutionalView } from '@/components/pilot/PilotAuthInstitutionalView';
import { InstitutionalAccessError, InstitutionalLoadingState } from '@/components/auth/InstitutionalAccessState';
import { invokePublicPilotFunction } from '@/services/pilot/pilotEdgeService';
import type { CampusLocation } from '@/types/pilot';

const PILOT_ACCESS_REQUIREMENT = 'Students may self-register for the active Pilot programme. Staff access remains administratively controlled.';

type PilotAuthView = 'login' | 'signup' | 'forgot-password';
type PilotRequestedLocation = string | {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
};

const emailSchema = z.string().trim().email('Enter a valid email address.').max(255);
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});
const recoverySchema = z.object({ email: emailSchema });
const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must contain at least 8 characters.').max(100),
  confirmPassword: z.string(),
  fullName: z.string().trim().min(2, 'Enter your full name.').max(100),
  studentNumber: z.string().trim().max(20, 'Student number is too long.'),
  campus: z.string().refine((value) => PILOT_CAMPUS_VALUES.includes(value as CampusLocation), 'Select your campus.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [campus, setCampus] = useState<CampusLocation | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const switchView = (next: PilotAuthView) => {
    setView(next);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const validate = (): boolean => {
    try {
      if (view === 'login') loginSchema.parse({ email, password });
      else if (view === 'signup') signupSchema.parse({ email, password, confirmPassword, fullName, studentNumber, campus });
      else recoverySchema.parse({ email });
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast({ title: 'Recovery email sent', description: 'Use the official CCSF recovery page to set your new password, then return to Pilot Mode.' });
        switchView('login');
        return;
      }

      if (view === 'signup') {
        await invokePublicPilotFunction<{ created: boolean }>('pilot-student-signup', {
          email: normalizedEmail,
          password,
          full_name: fullName.trim(),
          student_number: studentNumber.trim(),
          campus,
        });

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;

        toast({
          title: 'Pilot account created',
          description: 'You are signed in immediately. No email confirmation is required for Pilot registration.',
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Create a Pilot student account if you have not registered before.');
        }
        throw error;
      }

      toast({ title: 'Pilot sign-in successful', description: 'Your Pilot access and institutional role are being verified.' });
    } catch (error) {
      toast({
        title: view === 'login' ? 'Pilot sign-in failed' : view === 'signup' ? 'Pilot registration failed' : 'Recovery request failed',
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
        confirmPassword={confirmPassword}
        fullName={fullName}
        studentNumber={studentNumber}
        campus={campus}
        errors={errors}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onFullNameChange={setFullName}
        onStudentNumberChange={setStudentNumber}
        onCampusChange={setCampus}
        onSubmit={handleSubmit}
        onViewChange={switchView}
        onOfficialPortal={() => navigate('/auth')}
      />
    </div>
  );
}
