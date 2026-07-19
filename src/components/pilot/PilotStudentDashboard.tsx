import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Home,
  Map,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
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

type StudentView = 'home' | 'mycases' | 'report' | 'map' | 'messages';

export function PilotStudentDashboard({
  program,
  participant,
  session,
}: {
  program: PilotProgram;
  participant: PilotParticipant;
  session: PilotSession;
}) {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<StudentView>('home');
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [notifications, setNotifications] = useState<PilotNotification[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextReports, nextScenarios, nextNotifications] = await Promise.all([
        loadOwnPilotReports(session.id),
        loadPilotScenarios(program.id),
        loadPilotNotifications(),
      ]);
      setReports(nextReports);
      setScenarios(nextScenarios);
      setNotifications(nextNotifications);
      setSelectedScenarioId((current) => current || nextScenarios[0]?.id || '');
    } catch (error) {
      toast({
        title: 'Pilot dashboard could not refresh',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [program.id, session.id, toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => subscribeToPilotNotifications(participant.user_id, () => void refresh()), [participant.user_id, refresh]);

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0] ?? null;
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const activeReports = reports.filter((item) => !['simulation_completed', 'cancelled', 'withdrawn', 'expired'].includes(item.status));
  const completedReports = reports.filter((item) => item.status === 'simulation_completed');

  const navItems = [
    { view: 'home', icon: Home, label: 'Home' },
    { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' },
    { view: 'map', icon: Map, label: 'Location' },
    { view: 'messages', icon: MessageCircle, label: 'Messages' },
  ];

  const locationScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.requires_location || scenario.requires_live_tracking),
    [scenarios],
  );

  const markRead = async (notification: PilotNotification) => {
    if (notification.is_read) return;
    try {
      const updated = await markPilotNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      toast({ title: 'Notification update failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] bg-background" data-testid="ready-pilot-student-dashboard">
      <main className="w-full pb-20 md:pb-8">
        <div className="px-4 pt-5 sm:px-6">
          <PilotBanner compact />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-5 sm:px-6"
        >
          <Card className="hidden border-border/60 bg-card/95 p-2 shadow-elevated backdrop-blur-sm md:block">
            <div className="grid grid-cols-5 gap-2">
              {navItems.map(({ view, icon: Icon, label }) => (
                <Button
                  key={view}
                  variant={activeView === view ? 'default' : 'ghost'}
                  onClick={() => setActiveView(view as StudentView)}
                  className={activeView === view ? 'bg-gradient-to-r from-primary to-secondary shadow-lg' : 'hover:bg-primary/10'}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                  {view === 'messages' && unreadCount > 0 && <Badge className="ml-2 bg-[#F2A900] text-[#002F6C]">{unreadCount}</Badge>}
                </Button>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          key={activeView}
          initial={{ opacity: 0, x: 18, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="px-4 py-6 sm:px-6"
        >
          {activeView === 'home' && (
            <div className="mx-auto max-w-7xl space-y-6">
              <section className="overflow-hidden rounded-2xl border border-[#002F6C]/15 bg-gradient-to-br from-[#002F6C] to-[#0055A5] p-6 text-white shadow-large sm:p-8">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">Full workflow Pilot</p>
                    <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Your Pilot safety dashboard is live</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                      Submit reports, attach evidence, capture location, track status and receive staff notifications using the isolated Pilot workflow.
                    </p>
                  </div>
                  <Button size="lg" className="bg-[#F2A900] font-bold text-[#002F6C] hover:bg-[#F2A900]/90" onClick={() => setActiveView('report')}>
                    <Plus className="mr-2 h-5 w-5" /> Report an Incident
                  </Button>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric icon={FileText} label="Total Pilot reports" value={reports.length} />
                <Metric icon={ShieldCheck} label="Active cases" value={activeReports.length} />
                <Metric icon={CheckCircle2} label="Completed cases" value={completedReports.length} />
                <Metric icon={Bell} label="Unread updates" value={unreadCount} />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <Card className="shadow-large">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Pilot cases</CardTitle>
                      <CardDescription>Live records submitted in the isolated Pilot environment.</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label="Refresh dashboard"><RefreshCw className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reports.slice(0, 4).map((report) => <ReportRow key={report.id} report={report} />)}
                    {!reports.length && <EmptyState text={loading ? 'Loading your Pilot cases…' : 'No Pilot reports have been submitted yet.'} />}
                  </CardContent>
                </Card>

                <Card className="shadow-large">
                  <CardHeader><CardTitle>Account scope</CardTitle></CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <InfoLine label="Campus" value={CAMPUS_LABELS[participant.campus]} />
                    <InfoLine label="Programme" value={program.name} />
                    <InfoLine label="Session" value={session.id.slice(0, 8).toUpperCase()} />
                    <InfoLine label="Data retention" value={`${program.retention_days} days`} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === 'mycases' && (
            <div className="mx-auto max-w-6xl">
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle>My Pilot Cases</CardTitle>
                  <CardDescription>Track the same received, assessing, assigned, in-progress and completed workflow used by staff.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reports.map((report) => <ReportRow key={report.id} report={report} />)}
                  {!reports.length && <EmptyState text="No Pilot cases are available yet." />}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'report' && (
            <div className="mx-auto max-w-6xl space-y-5">
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">Choose a reporting workflow</p>
                    <p className="text-sm text-muted-foreground">All submitted records become immediately visible to authorised Pilot staff.</p>
                  </div>
                  <Select value={selectedScenario?.id ?? ''} onValueChange={setSelectedScenarioId}>
                    <SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Select workflow" /></SelectTrigger>
                    <SelectContent>{scenarios.map((scenario) => <SelectItem key={scenario.id} value={scenario.id}>{scenario.title}</SelectItem>)}</SelectContent>
                  </Select>
                </CardContent>
              </Card>
              {selectedScenario ? (
                <PilotReportForm
                  scenario={selectedScenario}
                  participant={participant}
                  session={session}
                  emergency={selectedScenario.scenario_type === 'emergency_simulation'}
                />
              ) : <EmptyState text="No active Pilot reporting workflows are configured." />}
            </div>
          )}

          {activeView === 'map' && (
            <div className="mx-auto max-w-6xl space-y-5">
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Location and Tracking Tests</CardTitle>
                  <CardDescription>Choose a workflow that captures a point location or tests continuous tracking.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {locationScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => { setSelectedScenarioId(scenario.id); setActiveView('report'); }}
                      className="rounded-xl border p-5 text-left transition hover:border-primary/50 hover:bg-primary/5"
                    >
                      <MapPin className="h-5 w-5 text-primary" />
                      <p className="mt-3 font-bold">{scenario.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{scenario.instructions}</p>
                    </button>
                  ))}
                  {!locationScenarios.length && <EmptyState text="No location workflows are configured." />}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'messages' && (
            <div className="mx-auto max-w-6xl">
              <Card className="shadow-large">
                <CardHeader>
                  <CardTitle>Pilot Notifications</CardTitle>
                  <CardDescription>Live case updates and messages from authorised Pilot staff.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void markRead(notification)}
                      className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 ${notification.is_read ? 'bg-background' : 'border-[#F2A900]/70 bg-[#F2A900]/10'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.message}</p>
                        </div>
                        {!notification.is_read && <Badge className="bg-[#F2A900] text-[#002F6C]">New</Badge>}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</p>
                    </button>
                  ))}
                  {!notifications.length && <EmptyState text="No Pilot notifications have been received." />}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </main>

      <MobileBottomNav
        items={navItems}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view as StudentView)}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string | number }) {
  return (
    <Card className="shadow-medium">
      <CardContent className="p-5">
        <Icon className="h-5 w-5 text-primary" />
        <p className="mt-3 text-2xl font-extrabold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ReportRow({ report }: { report: PilotReport }) {
  return (
    <Link to={PILOT_ROUTES.report(report.id)} className="flex items-center justify-between rounded-xl border p-4 transition hover:border-primary/50 hover:bg-muted/30">
      <div className="min-w-0">
        <p className="truncate font-bold">{report.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{report.reference_number} · {PILOT_STATUS_LABELS[report.status]}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0" />
    </Link>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold">{value}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
