import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Bell, CheckCircle2, ChevronRight, FileText, Home, LifeBuoy, Loader2, MapPin, Plus, RefreshCw, ShieldCheck, Siren } from 'lucide-react';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotReportForm } from '@/components/pilot/PilotReportForm';
import { StudentDashboardHome } from '@/components/student/StudentDashboardHome';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { loadOwnPilotReports, loadPilotNotifications, loadPilotScenarios, markPilotNotificationRead, subscribeToPilotNotifications } from '@/services/pilot/pilotCoreService';
import { CAMPUS_LABELS, PILOT_ROUTES, PILOT_STATUS_LABELS } from '@/config/pilot';
import { formatCoordinatePair } from '@/lib/reverseGeocode';
import type { PilotNotification, PilotParticipant, PilotProgram, PilotReport, PilotScenario, PilotSession } from '@/types/pilot';

type View = 'home' | 'mycases' | 'report' | 'map' | 'support';
const TERMINAL_STATUSES = new Set(['simulation_completed', 'cancelled', 'withdrawn', 'expired']);

export function PilotStudentDashboard({ program, participant, session }: { program: PilotProgram; participant: PilotParticipant; session: PilotSession }) {
  const { toast } = useToast();
  const [view, setView] = useState<View>('home');
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [scenarios, setScenarios] = useState<PilotScenario[]>([]);
  const [notifications, setNotifications] = useState<PilotNotification[]>([]);
  const [scenarioId, setScenarioId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [nextReports, nextScenarios, nextNotifications] = await Promise.all([
        loadOwnPilotReports(session.id), loadPilotScenarios(program.id), loadPilotNotifications(),
      ]);
      setReports(nextReports); setScenarios(nextScenarios); setNotifications(nextNotifications);
      setScenarioId((current) => current || nextScenarios[0]?.id || ''); setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The Pilot dashboard could not be loaded.';
      setLoadError(message); toast({ title: 'Pilot dashboard unavailable', description: message, variant: 'destructive' });
    } finally { setLoading(false); setRefreshing(false); }
  }, [program.id, session.id, toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => subscribeToPilotNotifications(participant.user_id, () => void refresh()), [participant.user_id, refresh]);

  const selectedScenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0] ?? null;
  const emergencyScenario = scenarios.find((item) => item.scenario_type === 'emergency_simulation') ?? null;
  const unread = notifications.filter((item) => !item.is_read).length;
  const active = reports.filter((item) => !TERMINAL_STATUSES.has(item.status)).length;
  const locationReports = reports.filter((item) => item.location_lat !== null && item.location_lng !== null);
  const navItems = [
    { view: 'home', icon: Home, label: 'Home' }, { view: 'mycases', icon: FileText, label: 'My Cases' },
    { view: 'report', icon: Plus, label: 'Report' }, { view: 'map', icon: MapPin, label: 'Map' },
    { view: 'support', icon: LifeBuoy, label: 'Support' },
  ];

  const openEmergencySimulation = () => {
    if (!emergencyScenario) { toast({ title: 'Emergency simulation unavailable', description: 'No authorised emergency scenario is active for this Pilot programme.', variant: 'destructive' }); return; }
    setScenarioId(emergencyScenario.id); setView('report');
  };

  const markRead = async (notification: PilotNotification) => {
    if (notification.is_read) return;
    const previous = notifications;
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
    try { await markPilotNotificationRead(notification.id); }
    catch (error) { setNotifications(previous); toast({ title: 'Notification was not updated', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }); }
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-label="Loading student Pilot dashboard"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  if (loadError && !reports.length && !scenarios.length) return <div className="mx-auto max-w-xl px-4 py-12"><Card className="border-destructive/30 text-center shadow-large"><CardContent className="space-y-4 p-8"><AlertCircle className="mx-auto h-12 w-12 text-destructive" /><div><h2 className="text-xl font-bold">Student Pilot unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{loadError}</p></div><Button onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Retry dashboard</Button></CardContent></Card></div>;

  return <div className="min-h-[calc(100vh-12rem)] bg-background" data-testid="ready-pilot-student-dashboard">
    <div className="px-4 pt-5 sm:px-6"><PilotBanner compact /></div>
    <div className="px-4 pt-5 sm:px-6"><Card className="hidden p-2 shadow-elevated md:block"><div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Student Pilot portal sections">{navItems.map(({ view: itemView, icon: Icon, label }) => <Button key={itemView} role="tab" aria-selected={view === itemView} variant={view === itemView ? 'default' : 'ghost'} onClick={() => setView(itemView as View)}><Icon className="mr-2 h-4 w-4" />{label}{itemView === 'support' && unread > 0 && <Badge className="ml-2">{unread}</Badge>}</Button>)}</div></Card></div>
    <main className="mx-auto w-full max-w-7xl space-y-6 py-6 pb-24 md:pb-8">
      {view === 'home' && <div className="space-y-6"><StudentDashboardHome campus={participant.campus} /><div className="space-y-6 px-4 sm:px-6">
        <section className="rounded-2xl bg-gradient-to-br from-[#002F6C] to-[#0055A5] p-6 text-white shadow-large sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F2A900]">Student Pilot portal</p><div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-center"><div><h2 className="text-2xl font-extrabold sm:text-3xl">Your complete safety workflow is ready</h2><p className="mt-2 max-w-3xl text-white/80">Test reporting, readable location capture, case tracking, staff communication and notifications using isolated Pilot records only.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button className="bg-[#F2A900] font-bold text-[#002F6C]" onClick={() => setView('report')}><Plus className="mr-2 h-4 w-4" />Report an Incident</Button><Button variant="destructive" className="font-bold" onClick={openEmergencySimulation}><Siren className="mr-2 h-4 w-4" />Emergency Test</Button></div></div></section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total reports" value={reports.length} /><Metric label="Active cases" value={active} /><Metric label="Unread updates" value={unread} /><Metric label="Campus" value={CAMPUS_LABELS[participant.campus]} /></div>
        <div className="grid gap-4 lg:grid-cols-3"><QuickAction icon={FileText} title="Track your cases" description="Tap any case to open its full details and timeline." onClick={() => setView('mycases')} /><QuickAction icon={MapPin} title="Test location" description="Use readable address capture with supporting coordinates." onClick={() => setView('map')} /><QuickAction icon={LifeBuoy} title="Support centre" description="Read staff updates and open verified workflows." onClick={() => setView('support')} /></div>
        <CaseList reports={reports.slice(0, 5)} title="Recent Pilot Cases" />
      </div></div>}

      {view === 'mycases' && <div className="px-4 sm:px-6"><CaseList reports={reports} title="My Pilot Cases" /></div>}

      {view === 'report' && <div className="space-y-5 px-4 sm:px-6"><Card><CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-bold">Choose a reporting workflow</p><p className="text-sm text-muted-foreground">Reports appear immediately in the authorised campus-security Pilot queue.</p></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><Select value={selectedScenario?.id ?? ''} onValueChange={setScenarioId}><SelectTrigger className="w-full sm:w-[320px]" aria-label="Select Pilot reporting workflow"><SelectValue placeholder="Select workflow" /></SelectTrigger><SelectContent>{scenarios.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select><Button variant="destructive" onClick={openEmergencySimulation}><Siren className="mr-2 h-4 w-4" />Emergency</Button></div></CardContent></Card>{selectedScenario ? <PilotReportForm key={selectedScenario.id} scenario={selectedScenario} participant={participant} session={session} emergency={selectedScenario.scenario_type === 'emergency_simulation'} /> : <EmptyState icon={FileText} title="No reporting workflow available" description="An authorised Pilot scenario must be active before a report can be submitted." />}</div>}

      {view === 'map' && <div className="space-y-5 px-4 sm:px-6"><Card><CardHeader><CardTitle>Location and Tracking</CardTitle><CardDescription>Readable addresses are shown first; coordinates remain secondary technical evidence.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{scenarios.filter((item) => item.requires_location || item.requires_live_tracking).map((item) => <button key={item.id} className="rounded-xl border p-5 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setScenarioId(item.id); setView('report'); }}><MapPin className="h-5 w-5 text-primary" /><p className="mt-3 font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.instructions}</p></button>)}{!scenarios.some((item) => item.requires_location || item.requires_live_tracking) && <p className="col-span-full py-8 text-center text-muted-foreground">No location-enabled scenario is active.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Cases with captured locations</CardTitle><CardDescription>{locationReports.length} Pilot case(s) currently include a location fix.</CardDescription></CardHeader><CardContent className="space-y-3">{locationReports.map((report) => <Link key={report.id} to={PILOT_ROUTES.report(report.id)} className="flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="min-w-0"><p className="font-bold">{report.title}</p><p className="mt-1 text-sm">{report.location_description || 'Readable address unavailable'}</p>{report.location_lat !== null && report.location_lng !== null && <p className="mt-1 text-xs text-muted-foreground">{formatCoordinatePair(report.location_lat, report.location_lng)}</p>}</div><ChevronRight className="h-5 w-5 shrink-0" /></Link>)}{!locationReports.length && <p className="py-8 text-center text-muted-foreground">No Pilot case has captured a location yet.</p>}</CardContent></Card></div>}

      {view === 'support' && <div className="grid gap-5 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]"><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" />Pilot Support Centre</CardTitle><CardDescription>This Pilot does not dispatch external emergency services.</CardDescription></CardHeader><CardContent className="space-y-3"><Button className="w-full justify-start" onClick={() => setView('report')}><Plus className="mr-2 h-4 w-4" />Open report workflow</Button><Button variant="outline" className="w-full justify-start" onClick={() => setView('mycases')}><FileText className="mr-2 h-4 w-4" />Check case status</Button><Button variant="outline" className="w-full justify-start" onClick={() => setView('map')}><MapPin className="mr-2 h-4 w-4" />Test location workflow</Button><Button variant="destructive" className="w-full justify-start" onClick={openEmergencySimulation}><Siren className="mr-2 h-4 w-4" />Open emergency test</Button></CardContent></Card><Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Pilot Notifications</CardTitle><CardDescription>Realtime updates from authorised Pilot staff.</CardDescription></div><Button variant="outline" size="icon" onClick={() => void refresh(true)} disabled={refreshing} aria-label="Refresh Pilot notifications">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button></CardHeader><CardContent className="space-y-3" role="log" aria-live="polite">{notifications.map((item) => <button key={item.id} className={`w-full rounded-xl border p-4 text-left ${item.is_read ? '' : 'border-[#F2A900] bg-[#F2A900]/10'}`} onClick={() => void markRead(item)}><div className="flex justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.message}</p></div>{item.is_read ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Bell className="h-5 w-5 text-[#F2A900]" />}</div></button>)}{!notifications.length && <EmptyState icon={Bell} title="No Pilot updates yet" description="New staff notifications will appear here in realtime." />}</CardContent></Card></div>}
    </main>
    <Button variant="destructive" className="fixed bottom-24 right-4 z-40 rounded-full shadow-large md:bottom-8" onClick={openEmergencySimulation}><Siren className="mr-2 h-5 w-5" />Emergency Test</Button>
    <MobileBottomNav items={navItems} activeView={view} onViewChange={(next) => setView(next as View)} />
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>; }
function QuickAction({ icon: Icon, title, description, onClick }: { icon: typeof FileText; title: string; description: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-xl border bg-card p-5 text-left shadow-sm transition hover:border-primary"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></button>; }
function EmptyState({ icon: Icon, title, description }: { icon: typeof Bell; title: string; description: string }) { return <div className="rounded-xl border border-dashed p-8 text-center"><Icon className="mx-auto h-10 w-10 text-muted-foreground/60" /><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function CaseList({ reports, title }: { reports: PilotReport[]; title: string }) {
  const sorted = useMemo(() => [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [reports]);
  return <Card className="shadow-large"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>Tap a case to open its full details, readable location, evidence and timeline.</CardDescription></CardHeader><CardContent className="space-y-3">{sorted.map((report) => <Link key={report.id} to={PILOT_ROUTES.report(report.id)} className="flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-primary"><div className="min-w-0"><p className="truncate font-bold">{report.title}</p><p className="text-sm text-muted-foreground">{report.reference_number} · {PILOT_STATUS_LABELS[report.status]}</p>{report.location_description && <p className="mt-1 truncate text-sm"><MapPin className="mr-1 inline h-3.5 w-3.5 text-primary" />{report.location_description}</p>}</div><ChevronRight className="h-5 w-5 shrink-0" /></Link>)}{!sorted.length && <p className="py-8 text-center text-muted-foreground">No Pilot reports yet.</p>}</CardContent></Card>;
}
