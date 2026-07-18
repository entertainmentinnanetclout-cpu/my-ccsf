import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, FileCheck2, Loader2, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { consentToPilot, createPilotSession } from '@/services/pilot/pilotCoreService';
import { CAMPUS_LABELS, PILOT_CONSENT_VERSION, PILOT_ROUTES } from '@/config/pilot';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function PilotLanding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { program, participant, session, refresh, setSession } = usePilotMode();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!program || !participant || !user) return null;

  const hasConsent = ['consented', 'active', 'completed'].includes(participant.status) && Boolean(participant.consented_at);
  const canStart = program.status === 'active' && ['invited', 'consented', 'active'].includes(participant.status);
  const currentSession = session?.status === 'in_progress' ? session : null;

  const start = async () => {
    setLoading(true);
    try {
      if (!hasConsent) {
        if (!consent) throw new Error('Consent must be accepted before starting the Pilot.');
        await consentToPilot(participant.id, PILOT_CONSENT_VERSION);
      }
      const next = currentSession ?? await createPilotSession({ ...participant, status: hasConsent ? participant.status : 'consented' });
      setSession(next);
      await refresh();
      navigate(PILOT_ROUTES.session(next.id));
    } catch (caught) {
      toast({
        title: 'Unable to start Pilot session',
        description: caught instanceof Error ? caught.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <PilotBanner className="mb-6" />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="shadow-large">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl md:text-3xl">{program.name}</CardTitle>
                  <CardDescription className="mt-2 max-w-2xl text-base">
                    {program.description || 'Controlled testing of the CCSF digital safety workflow.'}
                  </CardDescription>
                </div>
                <Badge variant={program.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {program.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info icon={MapPin} label="Campus" value={CAMPUS_LABELS[participant.campus]} />
                <Info icon={Clock3} label="Retention" value={`${program.retention_days} days`} />
                <Info icon={ShieldCheck} label="Participation" value={participant.status.replace(/_/g, ' ')} />
              </div>

              <div className="rounded-xl border bg-muted/30 p-5">
                <h2 className="font-bold">What this Pilot tests</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    'Simulated incident submission',
                    'Emergency-button simulation',
                    'Location permission and accuracy',
                    'Private attachment upload',
                    'Status tracking and notifications',
                    'Usability, confidence and feedback',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!hasConsent && (
                <div className="rounded-xl border border-primary/20 p-5">
                  <h2 className="font-bold">Participant consent</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Consent records the Pilot purpose, temporary data collection, optional location and attachment testing, no-real-dispatch notice, retention period and withdrawal process.
                  </p>
                  <div className="mt-4 flex items-start gap-3">
                    <Checkbox id="pilot-consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} />
                    <Label htmlFor="pilot-consent" className="leading-relaxed">
                      I consent to participate in this controlled simulation. I understand that no real emergency response will be dispatched and that I may withdraw through the Pilot interface.
                    </Label>
                  </div>
                </div>
              )}

              {program.status !== 'active' && !currentSession && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  New sessions are unavailable while the programme is {program.status}. Existing records remain available for review.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={start} disabled={loading || (!currentSession && !canStart) || (!hasConsent && !consent)} className="sm:flex-1">
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : currentSession ? <FileCheck2 className="mr-2 h-5 w-5" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                  {currentSession ? 'Resume Pilot Session' : 'Consent and Start Session'}
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate(PILOT_ROUTES.resources)}>
                  <FileCheck2 className="mr-2 h-5 w-5" /> Safety Resources
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Programme window</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DateLine label="Starts" value={program.starts_at} />
                <DateLine label="Ends" value={program.ends_at} />
                <DateLine label="Invited" value={participant.invited_at} />
                <DateLine label="Consented" value={participant.consented_at} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Trash2 className="h-5 w-5" /> Your data rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>You may withdraw from an active session and request deletion of Pilot records.</p>
                <p>Private files are removed before relational deletion is finalised.</p>
                <p>Production cases and emergency services are not affected by Pilot deletion actions.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}

function DateLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" /> {label}</span>
      <span className="text-right font-medium">{value ? new Date(value).toLocaleDateString() : 'Not specified'}</span>
    </div>
  );
}
