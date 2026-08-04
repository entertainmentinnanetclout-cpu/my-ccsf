import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Archive,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  FileText,
  GraduationCap,
  HeartHandshake,
  History,
  LayoutDashboard,
  Loader2,
  Mail,
  MapPin,
  MessageSquarePlus,
  Pause,
  Phone,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotConfigurationPanel } from '@/components/pilot/PilotConfigurationPanel';
import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';
import { CommunityAdminDashboard } from '@/components/community/CommunityAdminDashboard';
import { LiveOperationsVisuals, type LiveVisualRecord } from '@/components/admin/visualizations/LiveOperationsVisuals';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  addPilotReportNote,
  calculatePilotMetrics,
  createPilotNotification,
  downloadPilotJson,
  invitePilotParticipant,
  loadPilotAdminData,
  requestPilotExport,
  requestPilotProgramPurge,
  requestPilotRetentionPlan,
  searchPilotStudentProfiles,
  transitionPilotReport,
  updatePilotParticipant,
  updatePilotProgram,
} from '@/services/pilot/pilotAdminService';
import {
  getPilotStudentName,
  loadPilotStudentIdentities,
  type PilotStudentIdentity,
} from '@/services/pilot/pilotProfileService';
import { CAMPUS_LABELS, PILOT_CAMPUS_VALUES, PILOT_ROUTES, PILOT_STATUS_LABELS } from '@/config/pilot';
import type {
  CampusLocation,
  PilotAdminData,
  PilotDeletionPlan,
  PilotParticipant,
  PilotProgram,
  PilotReport,
  PilotReportStatus,
} from '@/types/pilot';
import type { PilotStudentProfile } from '@/services/pilot/pilotAdminService';

type AdminView = 'overview' | 'operations' | 'campuses' | 'programmes' | 'participants' | 'analytics' | 'community' | 'governance' | 'audit';
type ActionMode = 'note' | 'notify' | null;

const EMPTY_DATA: PilotAdminData = {
  programs: [], scenarios: [], participants: [], sessions: [], reports: [], events: [],
  featureTests: [], feedback: [], notifications: [], auditLogs: [],
};

const FINAL_STATUSES = new Set<PilotReportStatus>(['simulation_completed', 'cancelled', 'withdrawn', 'expired']);
const STATUS_OPTIONS: PilotReportStatus[] = ['received', 'assessing', 'assigned', 'in_progress', 'simulation_completed', 'cancelled', 'withdrawn', 'expired'];

export function PilotSuperAdminDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [data, setData] = useState<PilotAdminData>(EMPTY_DATA);
  const [studentIdentities, setStudentIdentities] = useState<PilotStudentIdentity[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PilotReportStatus>('all');
  const [campusFilter, setCampusFilter] = useState<'all' | CampusLocation>('all');
  const [actionReport, setActionReport] = useState<PilotReport | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [actionValue, setActionValue] = useState('');
  const [actionTitle, setActionTitle] = useState('Pilot programme update');
  const [savingAction, setSavingAction] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [profiles, setProfiles] = useState<PilotStudentProfile[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [governanceMode, setGovernanceMode] = useState<'retention' | 'purge' | null>(null);
  const [governanceConfirmation, setGovernanceConfirmation] = useState('');
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [governanceResult, setGovernanceResult] = useState<PilotDeletionPlan | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  const programId = selectedProgramId === 'all' ? null : selectedProgramId;

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const next = await loadPilotAdminData({ programId });
      const identities = await loadPilotStudentIdentities(next.participants.map((item) => item.user_id));
      setData(next);
      setStudentIdentities(identities);
      setLoadError(null);
      if (selectedProgramId === 'all' && next.programs.length === 1) setSelectedProgramId(next.programs[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The Pilot super-admin console could not be loaded.';
      setLoadError(message);
      toast({ title: 'Pilot administration unavailable', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [programId, selectedProgramId, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    let timer: number | null = null;
    const scheduleRefresh = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 300);
    };

    let channel = supabase.channel('pilot-super-admin-parity');
    (['pilot_programs', 'pilot_scenarios', 'pilot_participants', 'pilot_sessions', 'pilot_reports', 'pilot_report_events', 'pilot_notifications', 'pilot_feedback', 'pilot_feature_tests', 'pilot_audit_logs', 'profiles'] as const)
      .forEach((table) => { channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh); });
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        toast({ title: 'Realtime administration interrupted', description: 'The console will continue using periodic refresh.', variant: 'destructive' });
      }
    });
    const fallback = window.setInterval(scheduleRefresh, 15000);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [refresh, toast]);

  const identityByUserId = useMemo(
    () => new Map(studentIdentities.map((identity) => [identity.id, identity])),
    [studentIdentities],
  );

  const selectedProgram = useMemo<PilotProgram | null>(
    () => data.programs.find((program) => program.id === selectedProgramId) ?? data.programs[0] ?? null,
    [data.programs, selectedProgramId],
  );
  const metrics = useMemo(() => calculatePilotMetrics(data), [data]);
  const visualRecords = useMemo<LiveVisualRecord[]>(() => data.reports.map((report) => ({
    id: report.id,
    campus: report.campus,
    status: report.status,
    category: report.category,
    title: report.title,
    createdAt: report.submitted_at,
    isCritical: report.simulated_severity === 'high' || report.simulated_severity === 'critical',
  })), [data.reports]);
  const activeReports = useMemo(() => data.reports.filter((report) => !FINAL_STATUSES.has(report.status)), [data.reports]);
  const unassignedReports = useMemo(() => data.reports.filter((report) => ['received', 'assessing'].includes(report.status)), [data.reports]);
  const filteredReports = useMemo(() => data.reports.filter((report) => {
    const query = search.trim().toLowerCase();
    const identity = identityByUserId.get(report.submitted_by);
    const studentText = [
      getPilotStudentName(identity, report.submitted_by),
      identity?.student_number,
      identity?.email,
      identity?.phone_number,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !query
      || report.reference_number.toLowerCase().includes(query)
      || report.title.toLowerCase().includes(query)
      || report.category.toLowerCase().includes(query)
      || (report.location_description ?? '').toLowerCase().includes(query)
      || studentText.includes(query);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesCampus = campusFilter === 'all' || report.campus === campusFilter;
    return matchesSearch && matchesStatus && matchesCampus;
  }), [data.reports, identityByUserId, search, statusFilter, campusFilter]);
  const campusSummaries = useMemo(() => PILOT_CAMPUS_VALUES.map((campus) => {
    const reports = data.reports.filter((report) => report.campus === campus);
    const participants = data.participants.filter((participant) => participant.campus === campus);
    const sessions = data.sessions.filter((session) => session.campus === campus);
    const completed = reports.filter((report) => report.status === 'simulation_completed').length;
    const active = reports.filter((report) => !FINAL_STATUSES.has(report.status)).length;
    const lastActivity = reports.map((report) => report.updated_at).sort().at(-1) ?? null;
    return {
      campus,
      reports: reports.length,
      participants: participants.length,
      sessions: sessions.length,
      completed,
      active,
      completionRate: reports.length ? Number(((completed / reports.length) * 100).toFixed(1)) : 0,
      lastActivity,
    };
  }), [data]);
  const auditLogs = useMemo(() => data.auditLogs.filter((log) => {
    const query = auditSearch.trim().toLowerCase();
    return !query || log.action.toLowerCase().includes(query) || log.entity_type.toLowerCase().includes(query) || log.actor_role.toLowerCase().includes(query) || (log.actor_campus ?? '').toLowerCase().includes(query);
  }), [data.auditLogs, auditSearch]);
  const featureSummary = useMemo(() => data.featureTests.reduce<Record<string, { passed: number; failed: number; denied: number; total: number }>>((summary, test) => {
    const entry = summary[test.feature_key] ?? { passed: 0, failed: 0, denied: 0, total: 0 };
    entry.total += 1;
    if (test.outcome === 'passed') entry.passed += 1;
    if (test.outcome === 'failed') entry.failed += 1;
    if (test.outcome === 'denied') entry.denied += 1;
    summary[test.feature_key] = entry;
    return summary;
  }, {}), [data.featureTests]);

  const navItems = [
    { view: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { view: 'operations', icon: AlertCircle, label: 'Operations' },
    { view: 'campuses', icon: Building2, label: 'Campuses' },
    { view: 'programmes', icon: Settings2, label: 'Programmes' },
    { view: 'participants', icon: Users, label: 'Students' },
    { view: 'analytics', icon: BarChart3, label: 'Analytics' },
    { view: 'community', icon: HeartHandshake, label: 'Community' },
    { view: 'governance', icon: Database, label: 'Governance' },
    { view: 'audit', icon: History, label: 'Audit' },
  ];

  const beginAction = (report: PilotReport, mode: Exclude<ActionMode, null>) => {
    setActionReport(report);
    setActionMode(mode);
    setActionValue('');
    setActionTitle(mode === 'notify' ? 'Pilot programme update' : '');
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
      if (actionMode === 'note') {
        await addPilotReportNote(actionReport.id, actionValue.trim());
        toast({ title: 'Pilot timeline note added' });
      } else {
        await createPilotNotification({
          reportId: actionReport.id,
          type: 'programme_message',
          title: actionTitle.trim() || 'Pilot programme update',
          message: actionValue.trim(),
        });
        toast({ title: 'Pilot notification sent' });
      }
      setActionReport(null);
      setActionMode(null);
      setActionValue('');
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
      if (!userProfile?.id) return;
      try {
        await transitionPilotReport(report.id, 'assigned', 'Super-admin accepted Pilot triage ownership.', userProfile.id);
        await refresh();
        toast({ title: 'Pilot report assigned for triage' });
      } catch (error) {
        toast({ title: 'Assignment failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
      }
      return;
    }
    const next = nextStatus[report.status];
    if (!next) return;
    try {
      await transitionPilotReport(report.id, next, `Super-admin Pilot workflow moved to ${PILOT_STATUS_LABELS[next]}.`);
      await refresh();
      toast({ title: `Pilot report moved to ${PILOT_STATUS_LABELS[next]}` });
    } catch (error) {
      toast({ title: 'Status change failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const searchProfiles = async () => {
    if (!participantSearch.trim()) return;
    setSearchingProfiles(true);
    try {
      setProfiles(await searchPilotStudentProfiles(participantSearch.trim()));
    } catch (error) {
      toast({ title: 'Student search failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSearchingProfiles(false);
    }
  };

  const inviteProfile = async (profile: PilotStudentProfile) => {
    if (!selectedProgram || !profile.campus) return;
    try {
      await invitePilotParticipant({ program_id: selectedProgram.id, user_id: profile.id, campus: profile.campus });
      await refresh();
      toast({ title: 'Pilot student invited' });
    } catch (error) {
      toast({ title: 'Invitation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const setParticipantStatus = async (participant: PilotParticipant, status: PilotParticipant['status']) => {
    try {
      await updatePilotParticipant(participant.id, { status });
      await refresh();
      toast({ title: `Student marked ${status}` });
    } catch (error) {
      toast({ title: 'Student update failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const setProgramStatus = async (status: PilotProgram['status']) => {
    if (!selectedProgram) return;
    try {
      await updatePilotProgram(selectedProgram.id, {
        status,
        starts_at: status === 'active' && !selectedProgram.starts_at ? new Date().toISOString() : selectedProgram.starts_at,
        ends_at: status === 'completed' ? new Date().toISOString() : selectedProgram.ends_at,
        archived_at: status === 'archived' ? new Date().toISOString() : selectedProgram.archived_at,
      });
      await refresh();
      toast({ title: `Programme marked ${status}` });
    } catch (error) {
      toast({ title: 'Programme update failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const exportJson = async (identified: boolean) => {
    if (!selectedProgram) return;
    try {
      const payload = await requestPilotExport(selectedProgram.id, null, identified);
      downloadPilotJson(`pilot-${selectedProgram.id}-${identified ? 'identified' : 'deidentified'}.json`, payload);
      toast({ title: `${identified ? 'Identified' : 'De-identified'} Pilot export downloaded` });
    } catch (error) {
      toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const openGovernance = (mode: 'retention' | 'purge') => {
    setGovernanceMode(mode);
    setGovernanceConfirmation('');
    setGovernanceResult(null);
  };

  const runGovernanceAction = async () => {
    if (!governanceMode) return;
    if (governanceMode === 'retention' && governanceConfirmation !== 'CLEAN EXPIRED') return;
    if (governanceMode === 'purge' && (!selectedProgram || governanceConfirmation !== selectedProgram.name)) return;
    setGovernanceLoading(true);
    try {
      const result = governanceMode === 'retention'
        ? await requestPilotRetentionPlan()
        : await requestPilotProgramPurge(selectedProgram!.id, 'Authorised super-admin programme cleanup');
      setGovernanceResult(result);
      await refresh();
      toast({ title: governanceMode === 'retention' ? 'Expired Pilot data processed' : 'Pilot programme data processed' });
    } catch (error) {
      toast({ title: 'Governance action failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setGovernanceLoading(false);
    }
  };

  if (loading && !data.programs.length) {
    return <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-label="Loading Pilot super-admin console"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  if (loadError && !data.programs.length) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="border-destructive/30 text-center">
          <CardContent className="space-y-4 p-8">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <div><h2 className="text-xl font-bold">Pilot administration unavailable</h2><p className="mt-2 text-sm text-muted-foreground">{loadError}</p></div>
            <Button onClick={() => void refresh(true)}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Retry console</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-12rem)] space-y-6" data-testid="ready-pilot-super-admin-parity" data-super-admin-student-case-migration="complete">
      <PilotBanner />

      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardContent className="flex flex-col justify-between gap-4 bg-gradient-to-r from-primary to-primary/85 p-5 text-primary-foreground lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F2A900]">Cross-campus Pilot governance</p>
            <h1 className="mt-1 text-2xl font-extrabold">CCSF Super-Admin Pilot Console</h1>
            <p className="mt-1 text-sm text-primary-foreground/80">Institution-wide simulated operations, analytics, programme governance and audit. No production case or emergency dispatch is used.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-full bg-background text-foreground sm:w-[280px]" aria-label="Filter Pilot programme"><SelectValue placeholder="Select programme" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All authorised programmes</SelectItem>{data.programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden p-3 shadow-large md:block">
        <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Pilot super-admin sections">
          {navItems.map(({ view, icon: Icon, label }) => (
            <Button key={view} role="tab" aria-selected={activeView === view} variant={activeView === view ? 'default' : 'ghost'} onClick={() => setActiveView(view as AdminView)}>
              <Icon className="mr-2 h-4 w-4" />{label}
            </Button>
          ))}
        </div>
      </Card>

      {activeView === 'overview' && (
        <div className="space-y-6">
          <LiveOperationsVisuals
            records={visualRecords}
            title="Pilot Institution Visual Intelligence"
            description="Cross-campus simulated case patterns, response flow, heat concentration and direct operational drill-down. Every action remains isolated inside Pilot Mode."
            locationLabels={{ ...CAMPUS_LABELS }}
            statusOrder={['received', 'assessing', 'assigned', 'in_progress', 'simulation_completed']}
            statusLabels={{ ...PILOT_STATUS_LABELS }}
            resolvedStatuses={['simulation_completed', 'cancelled', 'withdrawn', 'expired']}
            onRefresh={() => refresh(true)}
            refreshing={refreshing}
            onOpenQueue={() => setActiveView('operations')}
            onOpenAnalytics={() => setActiveView('analytics')}
            onOpenRecord={(recordId) => navigate(PILOT_ROUTES.report(recordId))}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Settings2} label="Pilot programmes" value={data.programs.length} />
            <Metric icon={Users} label="Students" value={data.participants.length} />
            <Metric icon={AlertCircle} label="Active simulated cases" value={activeReports.length} />
            <Metric icon={CheckCircle2} label="Completion rate" value={`${metrics.completionRate}%`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-destructive" />Institution-wide Pilot Queue</CardTitle><CardDescription>Tap any incident card to open the full student profile, readable location, evidence and case timeline.</CardDescription></CardHeader>
              <CardContent className="space-y-3">{activeReports.slice(0, 8).map((report) => <ReportRow key={report.id} report={report} identity={identityByUserId.get(report.submitted_by)} onOpen={() => navigate(PILOT_ROUTES.report(report.id))} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!activeReports.length && <EmptyState title="No active Pilot cases" description="Student simulations will appear here in realtime." />}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Governance pulse</CardTitle><CardDescription>Release-candidate operational indicators.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <PulseRow label="Awaiting triage" value={unassignedReports.length} />
                <PulseRow label="Active sessions" value={metrics.activeSessions} />
                <PulseRow label="Completed sessions" value={metrics.completedSessions} />
                <PulseRow label="Unread notifications" value={data.notifications.filter((item) => !item.is_read).length} />
                <PulseRow label="Audit events" value={data.auditLogs.length} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeView === 'operations' && (
        <Card>
          <CardHeader><CardTitle>Cross-Campus Pilot Operations</CardTitle><CardDescription>Tap a case for full details. Global triage and lifecycle controls affect only isolated Pilot records.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px]">
              <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search case, student, email, phone or location" className="pl-9" aria-label="Search Pilot reports" /></div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}><SelectTrigger aria-label="Filter Pilot status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUS_OPTIONS.map((status) => <SelectItem key={status} value={status}>{PILOT_STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select>
              <Select value={campusFilter} onValueChange={(value) => setCampusFilter(value as typeof campusFilter)}><SelectTrigger aria-label="Filter Pilot campus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All campuses</SelectItem>{PILOT_CAMPUS_VALUES.map((campus) => <SelectItem key={campus} value={campus}>{CAMPUS_LABELS[campus]}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-3">{filteredReports.map((report) => <ReportRow key={report.id} report={report} identity={identityByUserId.get(report.submitted_by)} onOpen={() => navigate(PILOT_ROUTES.report(report.id))} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!filteredReports.length && <EmptyState title="No reports match the filters" description="Change the programme, campus, status or search query." />}</div>
          </CardContent>
        </Card>
      )}

      {activeView === 'campuses' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campusSummaries.map((summary) => (
            <Card key={summary.campus} className="shadow-soft">
              <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg">{CAMPUS_LABELS[summary.campus]}</CardTitle><CardDescription>{summary.lastActivity ? `Last Pilot activity ${formatDate(summary.lastActivity)}` : 'No Pilot report activity yet'}</CardDescription></div><Badge variant={summary.active ? 'default' : 'secondary'}>{summary.active} active</Badge></div></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <CampusStat label="Students" value={summary.participants} />
                <CampusStat label="Sessions" value={summary.sessions} />
                <CampusStat label="Reports" value={summary.reports} />
                <CampusStat label="Completion" value={`${summary.completionRate}%`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeView === 'programmes' && (
        <div className="space-y-6">
          {selectedProgram && (
            <Card>
              <CardHeader><div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start"><div><CardTitle>{selectedProgram.name}</CardTitle><CardDescription>{selectedProgram.description || 'Controlled CCSF Pilot programme.'}</CardDescription></div><Badge className="capitalize" variant={selectedProgram.status === 'active' ? 'default' : 'secondary'}>{selectedProgram.status}</Badge></div></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><CampusStat label="Retention" value={`${selectedProgram.retention_days} days`} /><CampusStat label="Eligible campuses" value={selectedProgram.eligible_campuses.length} /><CampusStat label="Scenarios" value={data.scenarios.length} /><CampusStat label="Students" value={data.participants.length} /></div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button size="sm" onClick={() => void setProgramStatus('active')}><Play className="mr-2 h-4 w-4" />Activate</Button>
                  <Button size="sm" variant="outline" onClick={() => void setProgramStatus('paused')}><Pause className="mr-2 h-4 w-4" />Pause</Button>
                  <Button size="sm" variant="outline" onClick={() => void setProgramStatus('completed')}><CheckCircle2 className="mr-2 h-4 w-4" />Complete</Button>
                  <Button size="sm" variant="outline" onClick={() => void setProgramStatus('archived')}><Archive className="mr-2 h-4 w-4" />Archive</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <PilotConfigurationPanel programs={data.programs} selectedProgram={selectedProgram} onRefresh={refresh} />
          <Card><CardHeader><CardTitle>Scenario Register</CardTitle><CardDescription>Only scenarios for the selected programme are shown.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{data.scenarios.map((scenario) => <div key={scenario.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{scenario.title}</p><p className="mt-1 text-sm text-muted-foreground">{scenario.instructions}</p></div><Badge variant={scenario.is_active ? 'default' : 'secondary'}>{scenario.is_active ? 'Active' : 'Hidden'}</Badge></div><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{scenario.scenario_type.replace(/_/g, ' ')}</p></div>)}{!data.scenarios.length && <EmptyState title="No scenarios in scope" description="Select a programme or add its first controlled scenario." />}</CardContent></Card>
        </div>
      )}

      {activeView === 'participants' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Invite Student</CardTitle><CardDescription>{selectedProgram ? `Add a student to ${selectedProgram.name}.` : 'Select one programme before inviting students.'}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2"><Input value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void searchProfiles(); }} placeholder="Name, email or student number" aria-label="Search student profiles" /><Button onClick={() => void searchProfiles()} disabled={searchingProfiles || !participantSearch.trim()} aria-label="Search students">{searchingProfiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button></div>
              <div className="space-y-2">{profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="truncate font-semibold">{profile.full_name || profile.email}</p><p className="truncate text-xs text-muted-foreground">{profile.student_number || profile.id} · {profile.campus ? CAMPUS_LABELS[profile.campus] : 'Campus missing'}</p></div><Button size="sm" onClick={() => void inviteProfile(profile)} disabled={!selectedProgram || !profile.campus}>Invite</Button></div>)}{participantSearch && !searchingProfiles && !profiles.length && <EmptyState title="No students found" description="Try another name, email address or student number." />}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Pilot Student Register</CardTitle><CardDescription>Registered names, student details, programme status, campus allocation and controlled removal.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {data.participants.map((student) => {
                const identity = identityByUserId.get(student.user_id);
                return (
                  <div key={student.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="font-semibold">{getPilotStudentName(identity, student.user_id)}</p>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <p className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />{identity?.student_number || 'Student number not supplied'}</p>
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{identity?.email || 'Email not supplied'}</p>
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{identity?.phone_number || 'Phone not supplied'}</p>
                        <p>{identity?.course || 'Course not supplied'}{identity?.year_of_study ? ` · Year ${identity.year_of_study}` : ''}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{CAMPUS_LABELS[student.campus]} · invited {formatDate(student.invited_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{student.status}</Badge>
                      {student.status === 'removed'
                        ? <Button size="sm" variant="outline" onClick={() => void setParticipantStatus(student, 'invited')}>Restore invitation</Button>
                        : <Button size="sm" variant="destructive" onClick={() => void setParticipantStatus(student, 'removed')}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
                    </div>
                  </div>
                );
              })}
              {!data.participants.length && <EmptyState title="No students in scope" description="Select a programme or invite its first student." />}
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Activity} label="Location success" value={`${metrics.locationSuccessRate}%`} />
            <Metric icon={FileText} label="Attachment success" value={`${metrics.attachmentSuccessRate}%`} />
            <Metric icon={Bell} label="Notification read rate" value={`${metrics.notificationReadRate}%`} />
            <Metric icon={BarChart3} label="Average ease rating" value={metrics.averageEaseRating || '—'} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card><CardHeader><CardTitle>Feature Validation Results</CardTitle><CardDescription>Aggregated across the selected programme scope.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{Object.entries(featureSummary).map(([key, result]) => <div key={key} className="rounded-lg border p-4"><p className="font-semibold capitalize">{key.replace(/_/g, ' ')}</p><p className="mt-2 text-sm text-muted-foreground">Passed {result.passed} · Failed {result.failed} · Denied {result.denied} · Total {result.total}</p></div>)}{!Object.keys(featureSummary).length && <EmptyState title="No feature results yet" description="Feature validation events appear after student testing." />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Campus Performance</CardTitle><CardDescription>Completion and activity across all ten CCSF campuses.</CardDescription></CardHeader><CardContent className="space-y-3">{campusSummaries.map((summary) => <div key={summary.campus} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border p-3 text-sm"><span className="font-medium">{CAMPUS_LABELS[summary.campus]}</span><span className="text-muted-foreground">{summary.reports} reports</span><Badge variant="secondary">{summary.completionRate}%</Badge></div>)}</CardContent></Card>
          </div>
        </div>
      )}

      {activeView === 'community' && <CommunityAdminDashboard environment="pilot" />}

      {activeView === 'governance' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" />Controlled Exports</CardTitle><CardDescription>Exports use the audited Pilot export RPC. Identified data remains super-admin only.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Button onClick={() => void exportJson(false)} disabled={!selectedProgram}><Download className="mr-2 h-4 w-4" />De-identified JSON</Button><Button variant="outline" onClick={() => void exportJson(true)} disabled={!selectedProgram}><Download className="mr-2 h-4 w-4" />Identified JSON</Button></div><p className="text-xs text-muted-foreground">Choose one programme before exporting. Campus-security exports remain de-identified in the campus portal.</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Retention Schedule</CardTitle><CardDescription>Expired data is removed through Storage-first, audited cleanup functions.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-2">{data.programs.map((program) => <div key={program.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{program.name}</p><p className="mt-1 text-muted-foreground">{program.retention_days} days · {program.status}</p></div>)}</div><Button variant="outline" onClick={() => openGovernance('retention')}><Database className="mr-2 h-4 w-4" />Run expired-data cleanup</Button></CardContent></Card>
          </div>
          <PilotCsvExportPanel />
          <Card className="border-destructive/30"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" />Programme Data Exit</CardTitle><CardDescription>Programme cleanup is available only after completion or archival and requires exact-name confirmation.</CardDescription></CardHeader><CardContent><Button variant="destructive" onClick={() => openGovernance('purge')} disabled={!selectedProgram || !['completed', 'archived'].includes(selectedProgram.status)}>Prepare programme cleanup</Button></CardContent></Card>
          {governanceResult && <GovernanceResult result={governanceResult} />}
        </div>
      )}

      {activeView === 'audit' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Pilot Audit Register</CardTitle><CardDescription>Cross-campus governance events generated by Pilot tables, RPCs and service functions.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder="Search action, entity, role or campus" className="pl-9" aria-label="Search Pilot audit log" /></div>
            <div className="space-y-3">{auditLogs.map((log) => <div key={log.id} className="rounded-lg border p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="font-semibold capitalize">{log.action.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-muted-foreground">{log.entity_type} · {log.actor_role}{log.actor_campus ? ` · ${CAMPUS_LABELS[log.actor_campus]}` : ''}</p></div><time className="text-xs text-muted-foreground" dateTime={log.created_at}>{formatDate(log.created_at)}</time></div><p className="mt-2 text-xs text-muted-foreground">Affected records: {log.affected_count}</p></div>)}{!auditLogs.length && <EmptyState title="No audit events match" description="Change the search query or programme scope." />}</div>
          </CardContent>
        </Card>
      )}

      <MobileBottomNav items={navItems} activeView={activeView} onViewChange={(view) => setActiveView(view as AdminView)} />

      <Dialog open={Boolean(actionMode && actionReport)} onOpenChange={(open) => { if (!open) closeAction(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionMode === 'notify' ? 'Send Pilot notification' : 'Add Pilot timeline note'}</DialogTitle><DialogDescription>{actionReport ? `${actionReport.reference_number} · ${CAMPUS_LABELS[actionReport.campus]}` : ''}</DialogDescription></DialogHeader>
          <div className="space-y-4">{actionMode === 'notify' && <div className="space-y-2"><Label htmlFor="pilot-admin-notification-title">Title</Label><Input id="pilot-admin-notification-title" value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} maxLength={200} /></div>}<div className="space-y-2"><Label htmlFor="pilot-admin-action-value">{actionMode === 'notify' ? 'Message' : 'Timeline note'}</Label><Textarea id="pilot-admin-action-value" value={actionValue} onChange={(event) => setActionValue(event.target.value)} rows={5} maxLength={2000} /></div></div>
          <DialogFooter><Button variant="outline" onClick={closeAction} disabled={savingAction}>Cancel</Button><Button onClick={() => void submitAction()} disabled={savingAction || !actionValue.trim()}>{savingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Pilot action</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(governanceMode)} onOpenChange={(open) => { if (!open && !governanceLoading) setGovernanceMode(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{governanceMode === 'retention' ? 'Run expired-data cleanup' : 'Clean programme data'}</DialogTitle><DialogDescription>{governanceMode === 'retention' ? 'This runs the authorised Storage-first retention process across expired Pilot sessions.' : `This processes data for ${selectedProgram?.name ?? 'the selected programme'} and cannot be undone.`}</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label htmlFor="pilot-governance-confirmation">Type {governanceMode === 'retention' ? 'CLEAN EXPIRED' : selectedProgram?.name ?? ''} to confirm</Label><Input id="pilot-governance-confirmation" value={governanceConfirmation} onChange={(event) => setGovernanceConfirmation(event.target.value)} autoComplete="off" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setGovernanceMode(null)} disabled={governanceLoading}>Cancel</Button><Button variant="destructive" onClick={() => void runGovernanceAction()} disabled={governanceLoading || (governanceMode === 'retention' ? governanceConfirmation !== 'CLEAN EXPIRED' : governanceConfirmation !== selectedProgram?.name)}>{governanceLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm authorised cleanup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

function PulseRow({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>;
}

function CampusStat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg bg-muted/45 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

function ReportRow({
  report,
  identity,
  onOpen,
  onAdvance,
  onNote,
  onNotify,
}: {
  report: PilotReport;
  identity?: PilotStudentIdentity;
  onOpen: () => void;
  onAdvance: (report: PilotReport) => Promise<void>;
  onNote: () => void;
  onNotify: () => void;
}) {
  const nextLabel: Partial<Record<PilotReportStatus, string>> = {
    received: 'Assess',
    assessing: 'Take ownership',
    assigned: 'Start response',
    in_progress: 'Complete simulation',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open case ${report.reference_number}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-xl border p-4 transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{report.title}</p>
            <Badge variant="secondary">{PILOT_STATUS_LABELS[report.status]}</Badge>
          </div>
          <p className="mt-1 font-semibold text-primary">{getPilotStudentName(identity, report.submitted_by)}</p>
          <p className="text-sm text-muted-foreground">
            {identity?.student_number || 'Student number not supplied'} · {report.reference_number} · {CAMPUS_LABELS[report.campus]} · {report.category}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{report.location_description || 'Readable location unavailable'}</span>
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
            Open full case <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextLabel[report.status] && (
            <Button size="sm" onClick={(event) => { event.stopPropagation(); void onAdvance(report); }}>
              {nextLabel[report.status]}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onNote(); }}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />Note
          </Button>
          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onNotify(); }}>
            <Bell className="mr-2 h-4 w-4" />Notify
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="col-span-full rounded-xl border border-dashed p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function GovernanceResult({ result }: { result: PilotDeletionPlan }) {
  return (
    <Card className="border-emerald-500/30">
      <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Governance action result</CardTitle><CardDescription>Structured result returned by the authorised Pilot cleanup workflow.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><CampusStat label="Status" value={result.status} /><CampusStat label="Operation" value={result.operation} /><CampusStat label="Reports deleted" value={String(result.reports_deleted ?? result.reports ?? 0)} /><CampusStat label="Sessions" value={String(result.sessions ?? result.session_ids?.length ?? 0)} /></CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
