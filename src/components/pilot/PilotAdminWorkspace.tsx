import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, Database, Download, FileText, Loader2, MessageSquarePlus, RefreshCw, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { PilotConfigurationPanel } from '@/components/pilot/PilotConfigurationPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_STATUS_LABELS } from '@/config/pilot';
import {
  addPilotReportNote,
  calculatePilotMetrics,
  createPilotNotification,
  downloadPilotJson,
  invitePilotParticipant,
  loadPilotAdminData,
  requestPilotCampusPurge,
  requestPilotExport,
  requestPilotProgramPurge,
  requestPilotReportDeletion,
  requestPilotRetentionPlan,
  searchPilotStudentProfiles,
  transitionPilotReport,
} from '@/services/pilot/pilotAdminService';
import type { CampusLocation, PilotAdminData, PilotDeletionPlan, PilotProgram, PilotReport, PilotReportStatus } from '@/types/pilot';
import type { PilotStudentProfile } from '@/services/pilot/pilotAdminService';

const emptyData: PilotAdminData = {
  programs: [], scenarios: [], participants: [], sessions: [], reports: [], events: [],
  featureTests: [], feedback: [], notifications: [], auditLogs: [],
};

export function PilotAdminWorkspace({
  scope,
  campus,
}: {
  scope: 'campus' | 'admin';
  campus?: CampusLocation | null;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<PilotAdminData>(emptyData);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PilotDeletionPlan | null>(null);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<PilotStudentProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const programId = selectedProgramId === 'all' ? null : selectedProgramId;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadPilotAdminData({ programId, campus: scope === 'campus' ? campus : null });
      setData(next);
      if (selectedProgramId === 'all' && next.programs.length === 1) setSelectedProgramId(next.programs[0].id);
    } catch (error) {
      toast({ title: 'Pilot dashboard unavailable', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [programId, campus, scope, selectedProgramId, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const selectedProgram = useMemo<PilotProgram | null>(
    () => data.programs.find((item) => item.id === selectedProgramId) ?? data.programs[0] ?? null,
    [data.programs, selectedProgramId],
  );
  const metrics = useMemo(() => calculatePilotMetrics(data), [data]);

  const advanceReport = async (report: PilotReport) => {
    const nextMap: Partial<Record<PilotReportStatus, PilotReportStatus>> = {
      received: 'assessing', assessing: 'assigned', assigned: 'in_progress', in_progress: 'simulation_completed',
    };
    const next = nextMap[report.status];
    if (!next) return;
    const assignedTo = next === 'assigned' ? window.prompt('Enter the campus security officer profile UUID to assign:') : null;
    if (next === 'assigned' && !assignedTo?.trim()) return;
    try {
      await transitionPilotReport(report.id, next, `Pilot status changed to ${PILOT_STATUS_LABELS[next]}`, assignedTo?.trim() || null);
      await refresh();
      toast({ title: `Pilot report moved to ${PILOT_STATUS_LABELS[next]}` });
    } catch (error) {
      toast({ title: 'Status transition failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const addNote = async (report: PilotReport) => {
    const note = window.prompt('Enter a Pilot-only timeline note:');
    if (!note?.trim()) return;
    await addPilotReportNote(report.id, note.trim()).then(refresh).catch((error) => toast({ title: 'Note failed', description: error.message, variant: 'destructive' }));
  };

  const notify = async (report: PilotReport) => {
    const message = window.prompt('Enter the Pilot-only in-app notification message:');
    if (!message?.trim()) return;
    await createPilotNotification({ reportId: report.id, type: 'programme_message', title: 'Pilot programme update', message: message.trim() })
      .then(refresh)
      .catch((error) => toast({ title: 'Notification failed', description: error.message, variant: 'destructive' }));
  };

  const deleteReport = async (report: PilotReport) => {
    const reason = window.prompt('Reason for deleting this Pilot report:');
    if (!reason?.trim()) return;
    try {
      const result = await requestPilotReportDeletion(report.id, reason.trim());
      setPlan(result);
      await refresh();
      toast({ title: result.status === 'deleted' ? 'Pilot report deleted' : 'Storage cleanup plan created' });
    } catch (error) {
      toast({ title: 'Deletion request failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const searchStudents = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      setProfiles(await searchPilotStudentProfiles(search.trim(), scope === 'campus' ? campus : null));
    } catch (error) {
      toast({ title: 'Student search failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const invite = async (profile: PilotStudentProfile) => {
    if (!selectedProgram || !profile.campus) return;
    try {
      await invitePilotParticipant({ program_id: selectedProgram.id, user_id: profile.id, campus: profile.campus });
      await refresh();
      toast({ title: 'Pilot participant invited' });
    } catch (error) {
      toast({ title: 'Invitation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const exportData = async (identified: boolean) => {
    if (!selectedProgram) return;
    try {
      const payload = await requestPilotExport(selectedProgram.id, scope === 'campus' ? campus : null, identified);
      downloadPilotJson(`pilot-${selectedProgram.id}-${scope}.json`, payload);
      toast({ title: 'Pilot export downloaded' });
    } catch (error) {
      toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const requestDataPlan = async (type: 'retention' | 'campus' | 'program') => {
    if (!selectedProgram && type !== 'retention') return;
    try {
      const reason = type === 'retention' ? '' : window.prompt('Reason for this Pilot data operation:') ?? '';
      if (type !== 'retention' && !reason.trim()) return;
      const result = type === 'retention'
        ? await requestPilotRetentionPlan()
        : type === 'campus' && campus
          ? await requestPilotCampusPurge(selectedProgram!.id, campus, reason.trim())
          : await requestPilotProgramPurge(selectedProgram!.id, reason.trim());
      setPlan(result);
    } catch (error) {
      toast({ title: 'Data plan failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  if (loading && !data.programs.length) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PilotBanner />
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div><h1 className="text-2xl font-bold">{scope === 'admin' ? 'Super-Admin Pilot Console' : 'Campus Pilot Dashboard'}</h1><p className="text-sm text-muted-foreground">Pilot metrics remain separate from production incident analytics.</p></div>
        <div className="flex gap-2">
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}><SelectTrigger className="w-[240px]"><SelectValue placeholder="Select programme" /></SelectTrigger><SelectContent><SelectItem value="all">All authorised programmes</SelectItem>{data.programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="icon" onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger><TabsTrigger value="participants">Participants</TabsTrigger><TabsTrigger value="analytics">Feature Results</TabsTrigger><TabsTrigger value="feedback">Feedback</TabsTrigger><TabsTrigger value="export">Export</TabsTrigger><TabsTrigger value="data">Data</TabsTrigger>{scope === 'admin' && <TabsTrigger value="configuration">Configuration</TabsTrigger>}{scope === 'admin' && <TabsTrigger value="audit">Audit</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Users} label="Consented participants" value={metrics.consentedParticipants} /><Metric icon={ShieldCheck} label="Active sessions" value={metrics.activeSessions} /><Metric icon={FileText} label="Simulated reports" value={metrics.totalReports} /><Metric icon={BarChart3} label="Completion rate" value={`${metrics.completionRate}%`} />
            <Metric icon={MapPinIcon} label="Location success" value={`${metrics.locationSuccessRate}%`} /><Metric icon={FileText} label="Attachment success" value={`${metrics.attachmentSuccessRate}%`} /><Metric icon={Bell} label="Notification read rate" value={`${metrics.notificationReadRate}%`} /><Metric icon={BarChart3} label="Average ease rating" value={metrics.averageEaseRating || '—'} />
          </div>
        </TabsContent>

        <TabsContent value="reports"><Card><CardHeader><CardTitle>Pilot Report Queue</CardTitle><CardDescription>Only simulated reports visible under the caller's RLS scope.</CardDescription></CardHeader><CardContent className="space-y-3">{data.reports.map((report) => <div key={report.id} className="rounded-lg border p-4"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-center"><div><p className="font-semibold">{report.title}</p><p className="text-sm text-muted-foreground">{report.reference_number} · {PILOT_STATUS_LABELS[report.status]}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void advanceReport(report)} disabled={!['received','assessing','assigned','in_progress'].includes(report.status)}>Advance</Button><Button size="sm" variant="outline" onClick={() => void addNote(report)}><MessageSquarePlus className="mr-1 h-4 w-4" /> Note</Button><Button size="sm" variant="outline" onClick={() => void notify(report)}><Bell className="mr-1 h-4 w-4" /> Notify</Button><Button size="sm" variant="destructive" onClick={() => void deleteReport(report)}><Trash2 className="h-4 w-4" /></Button></div></div></div>)}{!data.reports.length && <p className="py-8 text-center text-muted-foreground">No Pilot reports in scope.</p>}</CardContent></Card></TabsContent>

        <TabsContent value="participants"><Card><CardHeader><CardTitle>Pilot Participants</CardTitle><CardDescription>Search existing student profiles and add them to the selected programme.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or student number" /><Button onClick={() => void searchStudents()} disabled={searching || !selectedProgram}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}</Button></div>{profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">{profile.full_name || profile.email}</p><p className="text-xs text-muted-foreground">{profile.student_number || profile.id} · {profile.campus ? CAMPUS_LABELS[profile.campus] : 'No campus'}</p></div><Button size="sm" onClick={() => void invite(profile)} disabled={!profile.campus}>Invite</Button></div>)}<div className="border-t pt-4">{data.participants.map((item) => <div key={item.id} className="mb-2 flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm"><span>{item.user_id.slice(0, 8)} · {CAMPUS_LABELS[item.campus]}</span><Badge variant="secondary">{item.status}</Badge></div>)}</div></CardContent></Card></TabsContent>

        <TabsContent value="analytics"><Card><CardHeader><CardTitle>Feature Results</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{Object.entries(groupTests(data)).map(([key, result]) => <div key={key} className="rounded-lg border p-4"><p className="font-semibold capitalize">{key.replace(/_/g, ' ')}</p><p className="mt-1 text-sm text-muted-foreground">Passed {result.passed} · Failed {result.failed} · Denied {result.denied}</p></div>)}</CardContent></Card></TabsContent>

        <TabsContent value="feedback"><Card><CardHeader><CardTitle>Pilot Feedback</CardTitle><CardDescription>Average ease {metrics.averageEaseRating || '—'}, confidence {metrics.averageConfidenceRating || '—'}, clarity {metrics.averageClarityRating || '—'}.</CardDescription></CardHeader><CardContent className="space-y-3">{data.feedback.map((item) => <div key={item.id} className="rounded-lg border p-4"><p className="text-sm">Ease {item.ease_of_use_rating ?? '—'} · Confidence {item.confidence_rating ?? '—'} · Clarity {item.clarity_rating ?? '—'}</p>{item.comments && <p className="mt-2 text-sm text-muted-foreground">{item.comments}</p>}</div>)}</CardContent></Card></TabsContent>

        <TabsContent value="export"><Card><CardHeader><CardTitle>Controlled Export</CardTitle><CardDescription>Campus exports are de-identified. Identified exports require super-admin authority.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button onClick={() => void exportData(false)} disabled={!selectedProgram}><Download className="mr-2 h-4 w-4" /> De-identified JSON</Button>{scope === 'admin' && <Button variant="outline" onClick={() => void exportData(true)} disabled={!selectedProgram}><Download className="mr-2 h-4 w-4" /> Identified JSON</Button>}</CardContent></Card></TabsContent>

        <TabsContent value="data"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Retention and Deletion Planning</CardTitle><CardDescription>Storage-first plans are returned when private files must be removed by Phase 5 service functions.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void requestDataPlan('retention')} disabled={scope !== 'admin'}>Calculate Expired Data</Button>{scope === 'campus' && campus && <Button variant="destructive" onClick={() => void requestDataPlan('campus')} disabled={!selectedProgram}>Campus Purge Plan</Button>}{scope === 'admin' && <Button variant="destructive" onClick={() => void requestDataPlan('program')} disabled={!selectedProgram}>Programme Purge Plan</Button>}</div>{plan && <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-4 text-xs">{JSON.stringify(plan, null, 2)}</pre>}</CardContent></Card></TabsContent>

        {scope === 'admin' && <TabsContent value="configuration"><PilotConfigurationPanel programs={data.programs} selectedProgram={selectedProgram} onRefresh={refresh} /></TabsContent>}
        {scope === 'admin' && <TabsContent value="audit"><Card><CardHeader><CardTitle>Audit Log</CardTitle></CardHeader><CardContent className="space-y-2">{data.auditLogs.map((log) => <div key={log.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold capitalize">{log.action.replace(/_/g, ' ')}</p><p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()} · {log.actor_role}</p></div>)}</CardContent></Card></TabsContent>}
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

const MapPinIcon = ShieldCheck;

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
