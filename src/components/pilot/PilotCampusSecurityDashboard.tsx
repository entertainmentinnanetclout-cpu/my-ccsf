import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  addPilotReportNote,
  calculatePilotMetrics,
  createPilotNotification,
  loadPilotAdminData,
  transitionPilotReport,
} from '@/services/pilot/pilotAdminService';
import { CAMPUS_LABELS, PILOT_STATUS_LABELS } from '@/config/pilot';
import type { CampusLocation, PilotAdminData, PilotReport, PilotReportStatus } from '@/types/pilot';

type CampusView = 'overview' | 'incidents' | 'analytics' | 'students' | 'announcements' | 'communication';
type ActionMode = 'assign' | 'note' | 'notify' | null;

const EMPTY_DATA: PilotAdminData = {
  programs: [], scenarios: [], participants: [], sessions: [], reports: [], events: [],
  featureTests: [], feedback: [], notifications: [], auditLogs: [],
};

const FINAL_STATUSES = new Set<PilotReportStatus>(['simulation_completed', 'cancelled', 'withdrawn', 'expired']);

export function PilotCampusSecurityDashboard({ campus }: { campus: CampusLocation }) {
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<CampusView>('overview');
  const [data, setData] = useState<PilotAdminData>(EMPTY_DATA);
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PilotReportStatus>('all');
  const [actionReport, setActionReport] = useState<PilotReport | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionTitle, setActionTitle] = useState('Pilot case update');
  const [savingAction, setSavingAction] = useState(false);

  const programId = selectedProgramId === 'all' ? null : selectedProgramId;

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const next = await loadPilotAdminData({ programId, campus });
      setData(next);
      setLoadError(null);
      if (selectedProgramId === 'all' && next.programs.length === 1) setSelectedProgramId(next.programs[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Campus Pilot operations could not be loaded.';
      setLoadError(message);
      toast({ title: 'Campus Pilot unavailable', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [programId, campus, selectedProgramId, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let timer: number | null = null;
    const scheduleRefresh = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 300);
    };
    let channel = supabase.channel(`pilot-campus-parity-${campus}`);
    (['pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_participants', 'pilot_sessions', 'pilot_feature_tests'] as const)
      .forEach((table) => { channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh); });
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        toast({ title: 'Realtime updates interrupted', description: 'The dashboard will continue using periodic refresh.', variant: 'destructive' });
      }
    });
    const fallback = window.setInterval(scheduleRefresh, 15000);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [campus, refresh, toast]);

  const metrics = useMemo(() => calculatePilotMetrics(data), [data]);
  const filteredReports = useMemo(() => data.reports.filter((report) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || report.title.toLowerCase().includes(query) || report.reference_number.toLowerCase().includes(query) || report.category.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [data.reports, search, statusFilter]);
  const activeReports = data.reports.filter((report) => !FINAL_STATUSES.has(report.status));
  const unassignedReports = data.reports.filter((report) => ['received', 'assessing'].includes(report.status));
  const navItems = [
    { view: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { view: 'incidents', icon: AlertCircle, label: 'Incidents' },
    { view: 'analytics', icon: BarChart3, label: 'Analytics' },
    { view: 'students', icon: Users, label: 'Students' },
    { view: 'announcements', icon: Megaphone, label: 'Updates' },
    { view: 'communication', icon: MessageSquare, label: 'Comms' },
  ];

  const beginAction = (report: PilotReport, mode: Exclude<ActionMode, null>) => {
    setActionReport(report);
    setActionMode(mode);
    setActionValue('');
    setActionTitle(mode === 'notify' ? 'Pilot case update' : '');
  };

  const closeAction = () => {
    if (savingAction) return;
    setActionReport(null);
    setActionMode(null);
    setActionValue('');
  };

  const submitAction = async () => {
    if (!actionReport || !actionMode || !actionValue.trim()) return;
    setSavingAction(true);
    try {
      if (actionMode === 'assign') {
        await transitionPilotReport(actionReport.id, 'assigned', 'Pilot report assigned to campus security officer.', actionValue.trim());
        toast({ title: 'Pilot report assigned' });
      } else if (actionMode === 'note') {
        await addPilotReportNote(actionReport.id, actionValue.trim());
        toast({ title: 'Pilot timeline note added' });
      } else {
        await createPilotNotification({
          reportId: actionReport.id,
          type: 'programme_message',
          title: actionTitle.trim() || 'Pilot case update',
          message: actionValue.trim(),
        });
        toast({ title: 'Pilot notification sent' });
      }
      closeAction();
      await refresh();
    } catch (error) {
      toast({ title: 'Pilot action failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSavingAction(false);
    }
  };

  const moveReport = async (report: PilotReport) => {
    const nextStatus: Partial<Record<PilotReportStatus, PilotReportStatus>> = {
      received: 'assessing',
      assigned: 'in_progress',
      in_progress: 'simulation_completed',
    };
    if (report.status === 'assessing') {
      beginAction(report, 'assign');
      return;
    }
    const next = nextStatus[report.status];
    if (!next) return;
    try {
      await transitionPilotReport(report.id, next, `Campus Pilot workflow moved to ${PILOT_STATUS_LABELS[next]}.`);
      await refresh();
      toast({ title: `Pilot report moved to ${PILOT_STATUS_LABELS[next]}` });
    } catch (error) {
      toast({ title: 'Status change failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  if (loading && !data.programs.length) {
    return <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-label="Loading campus-security Pilot dashboard"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  if (loadError && !data.programs.length) {
    return <div className="mx-auto max-w-xl py-12"><Card className="border-destructive/30 text-center"><CardContent className="space-y-4 p-8"><AlertCircle className="mx-auto h-12 w-12 text-destructive" /><div><h2 className="text-xl font-bold">Campus Pilot unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{loadError}</p></div><Button onClick={() => void refresh(true)}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Retry operations</Button></CardContent></Card></div>;
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] space-y-6" data-testid="ready-pilot-campus-parity">
      <PilotBanner />

      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardContent className="flex flex-col justify-between gap-4 bg-gradient-to-r from-primary to-primary/85 p-5 text-primary-foreground lg:flex-row lg:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F2A900]">Campus-security Pilot operations</p><h1 className="mt-1 text-2xl font-extrabold">{CAMPUS_LABELS[campus]} Campus Portal</h1><p className="mt-1 text-sm text-primary-foreground/80">Realtime simulated case operations. No production case is read, written or dispatched.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-full bg-background text-foreground sm:w-[260px]" aria-label="Filter campus Pilot programme"><SelectValue placeholder="Select programme" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All authorised programmes</SelectItem>{data.programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden p-3 shadow-large md:block">
        <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Campus-security Pilot sections">
          {navItems.map(({ view, icon: Icon, label }) => <Button key={view} role="tab" aria-selected={activeView === view} variant={activeView === view ? 'default' : 'ghost'} onClick={() => setActiveView(view as CampusView)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}
        </div>
      </Card>

      {activeView === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={AlertCircle} label="Active simulated cases" value={activeReports.length} />
            <Metric icon={UserCheck} label="Awaiting assignment" value={unassignedReports.length} />
            <Metric icon={Users} label="Pilot participants" value={data.participants.length} />
            <Metric icon={CheckCircle2} label="Completion rate" value={`${metrics.completionRate}%`} />
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-destructive" />Realtime Campus Queue</CardTitle><CardDescription>Newest simulated reports visible under campus RLS.</CardDescription></CardHeader>
            <CardContent className="space-y-3">{activeReports.slice(0, 6).map((report) => <ReportRow key={report.id} report={report} onAdvance={moveReport} onAssign={() => beginAction(report, 'assign')} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!activeReports.length && <EmptyState title="No active Pilot cases" description="New student simulations will appear here in realtime." />}</CardContent>
          </Card>
        </div>
      )}

      {activeView === 'incidents' && (
        <Card>
          <CardHeader><CardTitle>Pilot Incident Queue</CardTitle><CardDescription>Assignment and lifecycle controls affect only isolated Pilot records.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference, title or category" className="pl-9" aria-label="Search Pilot reports" /></div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger aria-label="Filter Pilot reports by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(PILOT_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-3">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onAdvance={moveReport} onAssign={() => beginAction(report, 'assign')} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!filteredReports.length && <EmptyState title="No matching Pilot cases" description="Adjust the search or status filter." />}</div>
          </CardContent>
        </Card>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={MapPin} label="Location success" value={`${metrics.locationSuccessRate}%`} /><Metric icon={FileText} label="Evidence success" value={`${metrics.attachmentSuccessRate}%`} /><Metric icon={Bell} label="Notification read rate" value={`${metrics.notificationReadRate}%`} /><Metric icon={BarChart3} label="Average ease" value={metrics.averageEaseRating || '—'} /></div>
          <Card><CardHeader><CardTitle>Feature Test Results</CardTitle><CardDescription>Campus-scoped Pilot telemetry only.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{Object.entries(groupTests(data)).map(([key, result]) => <div key={key} className="rounded-lg border p-4"><p className="font-semibold capitalize">{key.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-muted-foreground">Passed {result.passed} · Failed {result.failed} · Denied {result.denied}</p></div>)}{!data.featureTests.length && <p className="col-span-full py-8 text-center text-muted-foreground">No feature tests recorded for this campus yet.</p>}</CardContent></Card>
        </div>
      )}

      {activeView === 'students' && (
        <Card><CardHeader><CardTitle>Campus Pilot Students ({data.participants.length})</CardTitle><CardDescription>Only participants authorised for {CAMPUS_LABELS[campus]} are visible.</CardDescription></CardHeader><CardContent className="space-y-3">{data.participants.map((participant) => { const sessions = data.sessions.filter((item) => item.participant_id === participant.id); const reports = data.reports.filter((item) => item.participant_id === participant.id); return <div key={participant.id} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-bold">Participant {participant.user_id.slice(0, 8)}</p><p className="text-sm text-muted-foreground">{CAMPUS_LABELS[participant.campus]} · {reports.length} report(s) · {sessions.length} session(s)</p></div><Badge variant="secondary" className="w-fit capitalize">{participant.status}</Badge></div>; })}{!data.participants.length && <EmptyState title="No campus participants" description="Students enrolled in the permanent Pilot programme will appear automatically." />}</CardContent></Card>
      )}

      {activeView === 'announcements' && (
        <Card><CardHeader><CardTitle>Pilot Updates</CardTitle><CardDescription>Case-linked notifications issued by authorised Pilot staff.</CardDescription></CardHeader><CardContent className="space-y-3">{data.notifications.map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('en-ZA')}</p></div><Badge variant={item.is_read ? 'secondary' : 'default'}>{item.is_read ? 'Read' : 'Unread'}</Badge></div></div>)}{!data.notifications.length && <EmptyState title="No Pilot updates sent" description="Use Comms or a case action to send a student update." />}</CardContent></Card>
      )}

      {activeView === 'communication' && (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card><CardHeader><CardTitle>Student Communication</CardTitle><CardDescription>Send an in-app Pilot notification linked to a selected simulated case.</CardDescription></CardHeader><CardContent className="space-y-3">{data.reports.map((report) => <button key={report.id} className="w-full rounded-xl border p-4 text-left transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => beginAction(report, 'notify')}><p className="font-bold">{report.title}</p><p className="text-sm text-muted-foreground">{report.reference_number} · {PILOT_STATUS_LABELS[report.status]}</p></button>)}{!data.reports.length && <EmptyState title="No reports available" description="Communication becomes available after a student submits a Pilot report." />}</CardContent></Card>
          <Card><CardHeader><CardTitle>Recent Timeline Activity</CardTitle><CardDescription>Campus-scoped status, assignment, note and notification events.</CardDescription></CardHeader><CardContent className="space-y-3">{data.events.slice(0, 20).map((event) => <div key={event.id} className="rounded-xl border p-4"><p className="font-bold capitalize">{event.event_type.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-muted-foreground">{event.notes || 'Pilot workflow event recorded.'}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString('en-ZA')}</p></div>)}{!data.events.length && <EmptyState title="No timeline activity" description="Case actions will appear here in realtime." />}</CardContent></Card>
        </div>
      )}

      <MobileBottomNav items={navItems} activeView={activeView} onViewChange={(view) => setActiveView(view as CampusView)} />

      <Dialog open={Boolean(actionMode && actionReport)} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionMode === 'assign' ? 'Assign Pilot Report' : actionMode === 'note' ? 'Add Timeline Note' : 'Send Pilot Notification'}</DialogTitle><DialogDescription>{actionReport?.reference_number} · This action remains inside Pilot Mode.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            {actionMode === 'notify' && <div className="space-y-2"><Label htmlFor="pilot-action-title">Notification title</Label><Input id="pilot-action-title" value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} maxLength={200} /></div>}
            <div className="space-y-2"><Label htmlFor="pilot-action-value">{actionMode === 'assign' ? 'Campus officer profile UUID' : actionMode === 'note' ? 'Timeline note' : 'Message'}</Label>{actionMode === 'assign' ? <Input id="pilot-action-value" value={actionValue} onChange={(event) => setActionValue(event.target.value)} placeholder="00000000-0000-0000-0000-000000000000" /> : <Textarea id="pilot-action-value" value={actionValue} onChange={(event) => setActionValue(event.target.value)} rows={5} maxLength={2000} />}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeAction} disabled={savingAction}>Cancel</Button><Button onClick={() => void submitAction()} disabled={savingAction || !actionValue.trim()}>{savingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Pilot Action</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportRow({ report, onAdvance, onAssign, onNote, onNotify }: { report: PilotReport; onAdvance: (report: PilotReport) => void; onAssign: () => void; onNote: () => void; onNotify: () => void }) {
  const nextLabel = report.status === 'received' ? 'Start Assessment' : report.status === 'assessing' ? 'Assign Officer' : report.status === 'assigned' ? 'Start Response' : report.status === 'in_progress' ? 'Complete Simulation' : null;
  return <div className="rounded-xl border p-4"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{report.title}</p><Badge variant="outline">{PILOT_STATUS_LABELS[report.status]}</Badge>{report.assigned_to && <Badge variant="secondary"><UserCheck className="mr-1 h-3 w-3" />Assigned</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{report.reference_number} · {report.category}</p><p className="mt-2 line-clamp-2 text-sm">{report.description}</p></div><div className="flex flex-wrap gap-2">{nextLabel && <Button size="sm" onClick={() => report.status === 'assessing' ? onAssign() : onAdvance(report)}>{nextLabel}</Button>}<Button size="sm" variant="outline" onClick={onNote}><FileText className="mr-1 h-4 w-4" />Note</Button><Button size="sm" variant="outline" onClick={onNotify}><Bell className="mr-1 h-4 w-4" />Notify</Button></div></div></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof AlertCircle; label: string; value: string | number }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/60" /><p className="mt-3 font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function groupTests(data: PilotAdminData) {
  return data.featureTests.reduce<Record<string, { passed: number; failed: number; denied: number }>>((acc, item) => {
    const entry = acc[item.feature_key] ?? { passed: 0, failed: 0, denied: 0 };
    if (item.outcome === 'passed') entry.passed += 1;
    if (item.outcome === 'failed') entry.failed += 1;
    if (item.outcome === 'denied') entry.denied += 1;
    acc[item.feature_key] = entry;
    return acc;
  }, {});
}
