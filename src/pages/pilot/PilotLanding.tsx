import { useState } from 'react';
import { CheckCircle2, FileCheck2, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { consentToPilot, createPilotSession, isPilotSessionActive } from '@/services/pilot/pilotCoreService';
import { CAMPUS_LABELS, PILOT_CONSENT_VERSION } from '@/config/pilot';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotStudentDashboard } from '@/components/pilot/PilotStudentDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function PilotLanding() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { program, participant, session, refresh, setSession } = usePilotMode();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!program || !participant || !user) return null;

  const hasConsent = ['consented', 'active', 'completed'].includes(participant.status) && Boolean(participant.consented_at);
  const currentSession = isPilotSessionActive(session) ? session : null;

  const enterDashboard = async () => {
    setLoading(true);
    try {
      if (!hasConsent) {
        if (!consent) throw new Error('Consent must be accepted before entering the Pilot dashboard.');
        await consentToPilot(participant.id, PILOT_CONSENT_VERSION);
      }
      const next = currentSession ?? await createPilotSession({ ...participant, status: hasConsent ? participant.status : 'consented' });
      setSession(next);
      await refresh();
      toast({ title: 'Pilot dashboard ready', description: 'Your testing session is active and synced.' });
    } catch (caught) {
      toast({ title: 'Unable to enter Pilot dashboard', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (currentSession && hasConsent) {
    return <PilotStudentDashboard program={program} participant={participant} session={currentSession} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <PilotBanner className="mb-6" />
        <Card className="overflow-hidden border-border/60 shadow-large">
          <div className="border-b-4 border-b-[#002F6C] bg-[#F2A900] px-6 py-5 text-[#002F6C]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em]">Always-on full workflow Pilot</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Activate your Pilot student dashboard</h1>
          </div>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardTitle>{program.name}</CardTitle><CardDescription className="mt-2 max-w-3xl text-base">This separate environment mirrors the official report, location, evidence, status, notification and case-tracking flow. Pilot reports are live inside Pilot Mode and remain separate from production cases.</CardDescription></div>
              <Badge className="bg-emerald-600 capitalize">{program.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Info icon={MapPin} label="Campus" value={CAMPUS_LABELS[participant.campus]} />
              <Info icon={FileCheck2} label="Workflow" value="Full report lifecycle" />
              <Info icon={ShieldCheck} label="Dispatch" value="Pilot-only" />
            </div>
            <div className="rounded-xl border bg-muted/30 p-5">
              <h2 className="font-bold">Enabled functionality</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['Standard and emergency reporting tests','GPS location and live tracking tests','Private evidence attachments','Live campus and super-admin report queues','Assignment and case-status progression','Student notifications and case tracking'].map((item) => <div key={item} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></div>)}
              </div>
            </div>
            {!hasConsent && <div className="rounded-xl border border-primary/20 p-5"><h2 className="font-bold">One-time Pilot consent</h2><p className="mt-1 text-sm text-muted-foreground">Pilot records are operational test records. They are visible to authorised Pilot staff but never trigger external emergency dispatch.</p><div className="mt-4 flex items-start gap-3"><Checkbox id="pilot-consent" checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} /><Label htmlFor="pilot-consent" className="leading-relaxed">I consent to use the isolated CCSF Pilot environment and understand that reports remain test records even though the complete internal workflow is active.</Label></div></div>}
            <Button size="lg" onClick={enterDashboard} disabled={loading || (!hasConsent && !consent)} className="w-full bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-base font-bold text-white shadow-lg">{loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}Enter Full Pilot Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="rounded-xl border bg-background p-4"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
