import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, FileText, Home, MapPin, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotReportForm } from '@/components/pilot/PilotReportForm';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  loadOwnPilotReports,
  loadPilotNotifications,
  loadPilotScenarios,
  markPilotNotificationRead,
  subscribeToPilotNotifications,
} from '@/services/pilot/pilotCoreService';
import { CAMPUS_LABELS, PILOT_ROUTES, PILOT_STATUS_LABELS } from '@/config/pilot';
import type { PilotNotification, PilotParticipant, PilotProgram, PilotReport, PilotScenario, PilotSession } from '@/types/pilot';

type View = 'home' | 'mycases' | 'report' | 'map' | 'messages';

export function PilotStudentDashboard({ program, participant, session }: {
  program: PilotProgram;
  participant: PilotParticipant;
  session: PilotSession;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<View>('home');
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [notifications, setNotifications] = useState<PilotNotification[]>([]);
  const [scenarioId, setScenarioId] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [nextReports, nextScenarios, nextNotifications] = await Promise.all([
        loadOwnPilotReports(session.id),
        loadPilotScenarios(program.id),
        loadPilotNotifications(),
      ]);
      setReports(nextReports);
      setScenarios(nextScenarios);
      setNotifications(nextNotifications);
      setScenarioId((current) => current || nextScenarios[0]?.id || '');
    } catch (error) {
      toast({ title: 'Pilot dashboard unavailable', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  }, [program.id, session.id, toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => subscribeToPilotNotifications(participant.user_id, () => void refresh()), [participant.user_id, refresh]);

  const selectedScenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0] ?? null;
  const unread = notifications.filter((item) => !item.is_read).length;
  const active = reports.filter((item) => !['simulation_completed', 'cancelled', 'withdrawn', 'expired'].includes(item.status)).length;
  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'map', icon: MapPin, label: 'Location' },
    { view: 'messages', icon: MessageCircle, label: 'Messages' },
  ];

  return (
    <div className="min-h-[calc(100vh-12rem)] bg-background" data-testid="ready-pilot-student-dashboard">
      <div className="px-4 pt-5 sm:px-6"><PilotBanner compact /></div>
      <div className="px-4 pt-5 sm:px-6">
        <Card className="hidden p-2 shadow-elevated md:block">
          <div className="grid grid-cols-5 gap-2">
            {navItems.map(({ view: itemView, icon: Icon, label }) => (
              <Button key={itemView} variant={view === itemView ? 'default' : 'ghost'} onClick={() => setView(itemView as View)}>
                <Icon className="mr-2 h-4 w-4" />{label}{itemView === 'messages' && unread > 0 && <Badge className="ml-2">{unread}</Badge>}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 pb-20 sm:px-6 md:pb-8">
        {view === 'home' && <>
          <section className="rounded-2xl bg-gradient-to-br from-[#002F6C] to-[#0055A5] p-6 text-white shadow-large sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">Full workflow Pilot</p>
            <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div><h2 className="text-2xl font-extrabold sm:text-3xl">Your Pilot safety dashboard is live</h2><p className="mt-2 text-white/80">Reports, evidence, location, status updates and notifications run end to end inside the isolated Pilot environment.</p></div>
              <Button className="bg-[#F2A900] font-bold text-[#002F6C]" onClick={() => setView('report')}><Plus className="mr-2 h-4 w-4" />Report an Incident</Button>
            </div>
          </section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Total reports" value={reports.length} /><Metric label="Active cases" value={active} /><Metric label="Unread updates" value={unread} /><Metric label="Campus" value={CAMPUS_LABELS[participant.campus]} />
          </div>
          <CaseList reports={reports.slice(0, 5)} title="Recent Pilot Cases" />
        </>}

        {view === 'mycases' && <CaseList reports={reports} title="My Pilot Cases" />}

        {view === 'report' && <div className="space-y-5">
          <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">Choose a reporting workflow</p><p className="text-sm text-muted-foreground">Submitted records appear immediately in staff Pilot dashboards.</p></div><Select value={selectedScenario?.id ?? ''} onValueChange={setScenarioId}><SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Select workflow" /></SelectTrigger><SelectContent>{scenarios.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></CardContent></Card>
          {selectedScenario && <PilotReportForm scenario={selectedScenario} participant={participant} session={session} emergency={selectedScenario.scenario_type === 'emergency_simulation'} />}
        </div>}

        {view === 'map' && <Card><CardHeader><CardTitle>Location and Tracking</CardTitle><CardDescription>Select a location-enabled workflow to test GPS and live tracking.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{scenarios.filter((item) => item.requires_location || item.requires_live_tracking).map((item) => <button key={item.id} className="rounded-xl border p-5 text-left hover:border-primary" onClick={() => { setScenarioId(item.id); setView('report'); }}><MapPin className="h-5 w-5 text-primary" /><p className="mt-3 font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.instructions}</p></button>)}</CardContent></Card>}

        {view === 'messages' && <Card><CardHeader><CardTitle>Pilot Notifications</CardTitle><CardDescription>Live updates from authorised Pilot staff.</CardDescription></CardHeader><CardContent className="space-y-3">{notifications.map((item) => <button key={item.id} className={`w-full rounded-xl border p-4 text-left ${item.is_read ? '' : 'border-[#F2A900] bg-[#F2A900]/10'}`} onClick={async () => { if (!item.is_read) { await markPilotNotificationRead(item.id); await refresh(); } }}><div className="flex justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.message}</p></div>{!item.is_read && <Bell className="h-5 w-5 text-[#F2A900]" />}</div></button>)}</CardContent></Card>}
      </main>

      <MobileBottomNav items={navItems} activeView={view} onViewChange={(next) => setView(next as View)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

function CaseList({ reports, title }: { reports: PilotReport[]; title: string }) {
  return <Card className="shadow-large"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Live Pilot records remain separate from production cases.</CardDescription></CardHeader><CardContent className="space-y-3">{reports.map((report) => <Link key={report.id} to={PILOT_ROUTES.report(report.id)} className="flex items-center justify-between rounded-xl border p-4 hover:border-primary"><div><p className="font-bold">{report.title}</p><p className="text-sm text-muted-foreground">{report.reference_number} · {PILOT_STATUS_LABELS[report.status]}</p></div><ChevronRight className="h-5 w-5" /></Link>)}{!reports.length && <p className="py-8 text-center text-muted-foreground">No Pilot reports yet.</p>}</CardContent></Card>;
}
