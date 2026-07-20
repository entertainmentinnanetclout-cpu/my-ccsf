import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { PILOT_ENABLED, PILOT_ROUTES, pilotDefaultDestination, type PilotRole } from '@/config/pilot';
import { markPilotIntent } from '@/lib/pilotIntent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PilotBanner } from '@/components/pilot/PilotBanner';

export function PilotRouteGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: PilotRole[];
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, userProfile, loading: authLoading, profileCompleted, signOut } = useAuth();
  const { loading, error, program, participant, refresh } = usePilotMode();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  const leavePilotSession = async () => {
    markPilotIntent(PILOT_ROUTES.landing);
    try {
      await signOut();
    } finally {
      navigate(PILOT_ROUTES.auth, { replace: true });
    }
  };

  if (!PILOT_ENABLED) {
    return (
      <GuardState
        icon={LockKeyhole}
        title="Pilot Mode is disabled"
        description="This deployment has not been authorised for Controlled Pilot Mode. Production safety services remain unchanged."
        actionLabel="Return to Pilot sign in"
        onAction={() => navigate(PILOT_ROUTES.auth)}
      />
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Validating Pilot access…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to={PILOT_ROUTES.auth} replace state={{ from: requestedPath }} />;
  if (!userRole || !allowedRoles.includes(userRole as PilotRole)) {
    return (
      <GuardState
        icon={ShieldAlert}
        title="Role not authorised"
        description="Your current portal role cannot access this Pilot route."
        actionLabel="Open your Pilot portal"
        onAction={() => navigate(userRole ? pilotDefaultDestination(userRole as PilotRole) : PILOT_ROUTES.auth)}
      />
    );
  }

  if (userRole === 'student' && !profileCompleted) {
    return <Navigate to="/profile-completion" replace state={{ from: requestedPath }} />;
  }

  if (userRole === 'security' && !userProfile?.campus) {
    return (
      <GuardState
        icon={AlertCircle}
        title="Campus assignment required"
        description="A campus assignment is required before campus-scoped Pilot records can be accessed."
        actionLabel="Open profile"
        onAction={() => navigate('/profile', { state: { from: requestedPath } })}
      />
    );
  }

  if (error) {
    return (
      <GuardState
        icon={AlertCircle}
        title="Pilot access could not be verified"
        description={error}
        actionLabel="Retry Pilot access"
        onAction={() => void refresh()}
      />
    );
  }

  if (userRole === 'student') {
    if (!participant || !program) {
      return (
        <GuardState
          icon={LockKeyhole}
          title="Pilot enrolment is still loading"
          description="Your student account is signed in, but the active Pilot participant record could not be confirmed yet."
          actionLabel="Retry Pilot enrolment"
          onAction={() => void refresh()}
        />
      );
    }
    if (!program.eligible_campuses.includes(participant.campus)) {
      return (
        <GuardState
          icon={ShieldAlert}
          title="Campus not eligible"
          description="Your Pilot participation campus is outside the programme’s approved campus scope."
          actionLabel="Sign out of Pilot"
          onAction={() => void leavePilotSession()}
        />
      );
    }
    if (!['active', 'paused', 'completed'].includes(program.status)) {
      return (
        <GuardState
          icon={LockKeyhole}
          title="Pilot programme unavailable"
          description="This programme is not currently open for participant access."
          actionLabel="Sign out of Pilot"
          onAction={() => void leavePilotSession()}
        />
      );
    }
  }

  return <>{children}</>;
}

function GuardState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof LockKeyhole;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <PilotBanner className="mb-6" />
      <Card className="border-primary/20 shadow-large">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 rounded-full bg-muted p-3">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mx-auto max-w-xl">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={onAction}>{actionLabel}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
