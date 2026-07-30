import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, FileText, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotReportForm } from '@/components/pilot/PilotReportForm';
import { PilotFeedbackForm } from '@/components/pilot/PilotFeedbackForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { loadOwnPilotReports, loadPilotScenarios, loadPilotSession, withdrawPilotSession } from '@/services/pilot/pilotCoreService';
import { PILOT_ROUTES } from '@/config/pilot';
import type { PilotReport, PilotScenario, PilotSession as PilotSessionType } from '@/types/pilot';

const SESSION_TABS = new Set(['scenarios', 'reports', 'complete']);

export default function PilotSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { program, participant, setSession: setContextSession, refresh } = usePilotMode();
  const [session, setSession] = useState<PilotSessionType | null>(null);
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(searchParams.get('scenario'));
  const [loading, setLoading] = useState(true);
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab && SESSION_TABS.has(requestedTab) ? requestedTab : 'scenarios';

  useEffect(() => {
    if (!sessionId || !program) return;
    setLoading(true);
    Promise.all([loadPilotSession(sessionId), loadPilotScenarios(program.id), loadOwnPilotReports(sessionId)])
      .then(([nextSession, nextScenarios, nextReports]) => {
        setSession(nextSession);
        setScenarios(nextScenarios);
        setReports(nextReports);
        setActiveScenario((current) => (
          current && nextScenarios.some((scenario) => scenario.id === current)
            ? current
            : nextScenarios[0]?.id ?? null
        ));
      })
      .catch((error) => toast({ title: 'Unable to load Pilot session', description: error.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [sessionId, program?.id, toast]);

  const completedScenarioIds = useMemo(
    () => new Set(reports.map((report) => report.scenario_id).filter(Boolean)),
    [reports],
  );

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!session || !program || !participant) return null;

  const withdraw = async () => {
    const reason = window.prompt('Provide a reason for withdrawing from this Pilot session:');
    if (!reason?.trim()) return;
    try {
      await withdrawPilotSession(session.id, reason.trim());
      await refresh();
      toast({ title: 'Pilot participation withdrawn' });
      navigate(PILOT_ROUTES.landing);
    } catch (error) {
      toast({ title: 'Withdrawal failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const selectTab = (value: string) => {
    if (!SESSION_TABS.has(value)) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const selectScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'scenarios');
    next.set('scenario', scenarioId);
    setSearchParams(next, { replace: true });
  };

  if (session.status === 'completed') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <PilotBanner className="mb-6" />
        <Card className="shadow-large text-center">
          <CardHeader>
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
            <CardTitle className="text-2xl">Simulation Completed</CardTitle>
            <CardDescription>Your feedback and Pilot results were recorded successfully.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(PILOT_ROUTES.landing)}>Pilot Home</Button>
            <Button variant="outline" onClick={() => navigate(PILOT_ROUTES.resources)}>Safety Resources</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PilotBanner className="mb-6" />
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold"><ShieldCheck className="h-6 w-6 text-primary" /> Controlled Pilot Session</h1>
            <p className="mt-1 text-sm text-muted-foreground">Session {session.id.slice(0, 8)} · {reports.length} simulated report{reports.length === 1 ? '' : 's'}</p>
          </div>
          <Button variant="outline" onClick={withdraw}><LogOut className="mr-2 h-4 w-4" /> Withdraw</Button>
        </div>

        <Tabs value={activeTab} onValueChange={selectTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenarios">Report Incident</TabsTrigger>
            <TabsTrigger value="reports">My Cases</TabsTrigger>
            <TabsTrigger value="complete">Complete</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => selectScenario(scenario.id)}
                  className={`rounded-xl border p-4 text-left transition ${activeScenario === scenario.id ? 'border-primary bg-primary/5 shadow-md' : 'hover:border-primary/50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    {completedScenarioIds.has(scenario.id) && <Badge className="bg-green-600">Submitted</Badge>}
                  </div>
                  <p className="mt-3 font-bold">{scenario.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{scenario.instructions}</p>
                </button>
              ))}
            </div>
            {scenarios.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No active Pilot scenarios are configured.</CardContent></Card>}
            {scenarios.filter((scenario) => scenario.id === activeScenario).map((scenario) => (
              <PilotReportForm key={scenario.id} scenario={scenario} participant={participant} session={session} emergency={scenario.scenario_type === 'emergency_simulation'} />
            ))}
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader><CardTitle>My Pilot Cases</CardTitle><CardDescription>Tap a case to open its full details, readable location and timeline. Production cases are not included.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {reports.map((report) => (
                  <Link key={report.id} to={PILOT_ROUTES.report(report.id)} className="flex items-center justify-between rounded-lg border p-4 transition hover:border-primary/50 hover:bg-muted/30">
                    <div><p className="font-semibold">{report.title}</p><p className="text-sm text-muted-foreground">{report.reference_number} · {report.status.replace(/_/g, ' ')}</p></div>
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ))}
                {!reports.length && <p className="py-8 text-center text-muted-foreground">No simulated reports submitted yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="complete">
            <PilotFeedbackForm
              program={program}
              session={session}
              onCompleted={(updated) => {
                setSession(updated);
                setContextSession(updated);
                void refresh();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
