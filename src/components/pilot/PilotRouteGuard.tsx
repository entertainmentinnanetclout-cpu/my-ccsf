import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { PILOT_ENABLED, pilotDefaultDestination, type PilotRole } from '@/config/pilot';
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
  const { user, userRole, userProfile, loading: authLoading, profileCompleted } = useAuth();
  const { loading, error, program, participant } = usePilotMode();
  const requestedPath = `${location.pathname}${location.search}${location.hash}`;

  if (!PILOT_ENABLED) {
    return (
      <GuardState
        icon={LockKeyhole}
        title="Pilot Mode is disabled"
        description="This deployment has not been authorised for Controlled Pilot Mode. Production safety services remain unchanged."
        actionLabel="Return to portal"
        onAction={() => navigate(userRole === 'admin' ? '/admin' : userRole === 'security' ? '/security' : '/dashboard')}
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

  if (!user) return <Navigate to="/pilot/auth" replace state={{ from: requestedPath }} />;
  if (!userRole || !allowedRoles.includes(userRole as PilotRole)) {
    return (
      <GuardState
        icon={ShieldAlert}
        title="Role not authorised"
        description="Your current portal role cannot access this Pilot route."
        actionLabel="Open your Pilot portal"
        onAction={() => navigate(userRole ? pilotDefaultDestination(userRole as PilotRole) : '/pilot/auth')}
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
        actionLabel="Return to portal"
        onAction={() => navigate(userRole === 'admin' ? '/admin' : userRole === 'security' ? '/security' : '/dashboard')}
      />
    );
  }

  if (userRole === 'student') {
    if (!participant || !program) {
      return (
        <GuardState
          icon={LockKeyhole}
          title="No active Pilot invitation"
          description="Your account is not currently allowlisted for an active Controlled Pilot programme. Preview access alone does not grant participation."
          actionLabel="Return to student dashboard"
          onAction={() => navigate('/dashboard')}
        />
      );
    }
    if (!program.eligible_campuses.includes(participant.campus)) {
      return (
        <GuardState
          icon={ShieldAlert}
          title="Campus not eligible"
          description="Your Pilot participation campus is outside the programme’s approved campus scope."
          actionLabel="Return to student dashboard"
          onAction={() => navigate('/dashboard')}
        />
      );
    }
    if (!['active', 'paused', 'completed'].includes(program.status)) {
      return (
        <GuardState
          icon={LockKeyhole}
          title="Pilot programme unavailable"
          description="This programme is not currently open for participant access."
          actionLabel="Return to student dashboard"
          onAction={() => navigate('/dashboard')}
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
