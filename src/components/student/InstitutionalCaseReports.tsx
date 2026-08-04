import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderOpen,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { formatCoordinatePair } from '@/lib/reverseGeocode';

type Incident = Tables<'incidents'>;

interface CaseUpdate {
  id: string;
  incident_id: string;
  admin_id: string;
  update_type: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  created_at: string;
}

const STATUS_STAGES = ['received', 'assigned', 'in progress', 'resolved'] as const;

const STATUS_CONFIG: Record<string, { label: string; className: string; stage: number; description: string }> = {
  new: { label: 'Received', className: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/35 dark:text-sky-200', stage: 0, description: 'The report is recorded and awaiting assessment.' },
  pending: { label: 'Under assessment', className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200', stage: 0, description: 'The case is being assessed for routing and priority.' },
  assigned: { label: 'Assigned', className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200', stage: 1, description: 'The case has been routed to an authorised official or unit.' },
  in_progress: { label: 'In progress', className: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/35 dark:text-violet-200', stage: 2, description: 'The assigned team is working on the case.' },
  escalated: { label: 'Escalated', className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/35 dark:text-orange-200', stage: 2, description: 'The case was escalated for additional institutional action.' },
  resolved: { label: 'Resolved', className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200', stage: 3, description: 'The case has an official resolution outcome.' },
  rejected: { label: 'Closed without action', className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200', stage: 3, description: 'The case was closed. Review the official notes for the reason.' },
};

const getStatus = (status: string) => STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
const caseReference = (id: string) => `CCSF-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
const formatCampus = (campus: string | null) => campus
  ? campus.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  : 'Campus pending';

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const InstitutionalCaseReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mediaCounts, setMediaCounts] = useState<Record<string, number>>({});
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const fetchMyReports = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .or(`reporter_id.eq.${user.id},submitted_by.eq.${user.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      setIncidents(rows);

      if (rows.length) {
        const { data: media, error: mediaError } = await supabase
          .from('incident_media')
          .select('incident_id')
          .in('incident_id', rows.map((incident) => incident.id));
        if (!mediaError) {
          const counts = (media ?? []).reduce<Record<string, number>>((current, item) => {
            current[item.incident_id] = (current[item.incident_id] ?? 0) + 1;
            return current;
          }, {});
          setMediaCounts(counts);
        }
      } else {
        setMediaCounts({});
      }
    } catch (error) {
      toast({ title: 'Cases unavailable', description: error instanceof Error ? error.message : 'Your cases could not be loaded.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) return;
    void fetchMyReports();
    const channel = supabase
      .channel(`student-case-reports:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        const record = (payload.new ?? payload.old) as Incident;
        if (record.reporter_id !== user.id && record.submitted_by !== user.id) return;
        void fetchMyReports();
        if (payload.eventType === 'UPDATE') {
          toast({ title: 'Case timeline updated', description: `${caseReference(record.id)} now has a new institutional status.` });
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchMyReports, toast, user]);

  const summary = useMemo(() => ({
    total: incidents.length,
    active: incidents.filter((incident) => !['resolved', 'rejected'].includes(incident.status)).length,
    assigned: incidents.filter((incident) => ['assigned', 'in_progress', 'escalated'].includes(incident.status)).length,
    resolved: incidents.filter((incident) => incident.status === 'resolved').length,
  }), [incidents]);

  const fetchCaseUpdates = async (incidentId: string) => {
    setLoadingUpdates(true);
    try {
      const { data, error } = await supabase
        .from('case_updates')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCaseUpdates(data ?? []);
    } catch (error) {
      setCaseUpdates([]);
      toast({ title: 'Timeline unavailable', description: error instanceof Error ? error.message : 'Reopen the case to retry.', variant: 'destructive' });
    } finally {
      setLoadingUpdates(false);
    }
  };

  const openCase = (incident: Incident) => {
    triggerHaptic('light');
    setSelectedIncident(incident);
    void fetchCaseUpdates(incident.id);
  };

  const refresh = async () => {
    triggerHaptic('medium');
    setRefreshing(true);
    await fetchMyReports();
  };

  const copyCoordinates = async (incident: Incident) => {
    if (incident.location_lat == null || incident.location_lng == null) return;
    await navigator.clipboard.writeText(`${incident.location_lat},${incident.location_lng}`);
    toast({ title: 'Coordinates copied', description: 'The measured incident coordinates are ready to paste.' });
  };

  const downloadReceipt = (incident: Incident) => {
    const status = getStatus(incident.status);
    const reference = caseReference(incident.id);
    const evidence = mediaCounts[incident.id] ?? 0;
    const location = incident.location_description || (incident.location_lat != null && incident.location_lng != null
      ? formatCoordinatePair(incident.location_lat, incident.location_lng)
      : 'Not supplied');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${reference}</title><style>body{font-family:Arial,sans-serif;color:#10213a;margin:0;padding:40px;background:#f5f7fb}.receipt{max-width:760px;margin:auto;background:white;border:1px solid #d8e0ea;border-radius:24px;overflow:hidden}.head{background:#002f6c;color:white;padding:28px 32px;border-bottom:8px solid #f2a900}.head h1{margin:0;font-size:28px}.body{padding:32px}.ref{font-size:20px;font-weight:800;color:#d7193f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}.cell{border:1px solid #d8e0ea;border-radius:12px;padding:14px}.label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#66758a;font-weight:700}.value{margin-top:7px;font-weight:700}.statement{white-space:pre-wrap;line-height:1.6;border-left:4px solid #f2a900;padding-left:16px}.foot{font-size:12px;color:#66758a;border-top:1px solid #d8e0ea;padding-top:18px;margin-top:28px}@media print{body{background:white;padding:0}.receipt{border:none}}</style></head><body><div class="receipt"><div class="head"><h1>MY CCSF CASE RECEIPT</h1><p>Campus Community Safety Forum · TUT student safety platform</p></div><div class="body"><div class="ref">${reference}</div><p>This receipt confirms that the case exists in the My CCSF institutional workflow.</p><div class="grid"><div class="cell"><div class="label">Status</div><div class="value">${escapeHtml(status.label)}</div></div><div class="cell"><div class="label">Campus</div><div class="value">${escapeHtml(formatCampus(incident.campus))}</div></div><div class="cell"><div class="label">Submitted</div><div class="value">${escapeHtml(format(new Date(incident.created_at), 'dd MMM yyyy HH:mm'))}</div></div><div class="cell"><div class="label">Evidence files</div><div class="value">${evidence}</div></div><div class="cell"><div class="label">Category</div><div class="value">${escapeHtml(incident.category)}</div></div><div class="cell"><div class="label">Location</div><div class="value">${escapeHtml(location)}</div></div></div><h2>${escapeHtml(incident.title)}</h2><p class="statement">${escapeHtml(incident.description)}</p>${incident.resolution_notes ? `<h3>Official resolution</h3><p class="statement">${escapeHtml(incident.resolution_notes)}</p>` : ''}<p class="foot">Generated from the authenticated student's My CCSF account on ${escapeHtml(format(new Date(), 'dd MMM yyyy HH:mm'))}. This receipt is not a replacement for an official SAPS case number or other statutory record.</p></div></div></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${reference}-receipt.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Receipt generated', description: `${reference} can be opened or printed to PDF.` });
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((item) => <Card key={item}><CardContent className="space-y-3 p-5"><Skeleton className="h-5 w-36" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-20 w-full" /></CardContent></Card>)}</div>;
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="space-y-5" data-testid="institutional-case-reports">
        <section className="overflow-hidden rounded-3xl border border-[#F2A900]/35 bg-gradient-to-br from-[#002F6C] via-[#003D7C] to-[#10172A] p-5 text-white shadow-large sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><Badge className="bg-[#F2A900] text-[#002F6C] hover:bg-[#F2A900]"><FolderOpen className="mr-1 h-3.5 w-3.5" />Institutional case workspace</Badge><h2 className="mt-3 text-2xl font-black sm:text-3xl">My Cases</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">Track status, evidence, scheduled actions and official resolutions through one auditable case view.</p></div>
            <Button variant="outline" className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh cases</Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryMetric label="Total" value={summary.total} icon={FileText} />
            <SummaryMetric label="Active" value={summary.active} icon={Clock3} />
            <SummaryMetric label="Assigned" value={summary.assigned} icon={UserCheck} />
            <SummaryMetric label="Resolved" value={summary.resolved} icon={CheckCircle2} />
          </div>
        </section>

        {!incidents.length ? (
          <Card className="border-dashed shadow-large"><CardContent className="p-9 text-center"><FileCheck2 className="mx-auto h-14 w-14 text-primary/45" /><h3 className="mt-4 text-xl font-black">No cases submitted</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Use the Report tab to create an official My CCSF case and attach screenshots, documents, photographs or supported video evidence.</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {incidents.map((incident, index) => <CaseCard key={incident.id} incident={incident} evidenceCount={mediaCounts[incident.id] ?? 0} index={index} onOpen={() => openCase(incident)} />)}
          </div>
        )}

        <Dialog open={Boolean(selectedIncident)} onOpenChange={(open) => { if (!open) { setSelectedIncident(null); setCaseUpdates([]); } }}>
          <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-4xl overflow-y-auto p-0">
            {selectedIncident && (
              <CaseDetail
                incident={selectedIncident}
                evidenceCount={mediaCounts[selectedIncident.id] ?? 0}
                updates={caseUpdates}
                loadingUpdates={loadingUpdates}
                onCopyCoordinates={() => void copyCoordinates(selectedIncident)}
                onDownload={() => downloadReceipt(selectedIncident)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PullToRefresh>
  );
};

function CaseCard({ incident, evidenceCount, index, onOpen }: { incident: Incident; evidenceCount: number; index: number; onOpen: () => void }) {
  const status = getStatus(incident.status);
  const reference = caseReference(incident.id);
  return (
    <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.25) }}>
      <Card className="group h-full overflow-hidden border-[#002F6C]/15 shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-large">
        <div className="h-1.5 bg-gradient-to-r from-[#D7193F] via-[#F2A900] to-[#0055A5]" />
        <CardHeader className="space-y-4 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-black tracking-[0.12em] text-primary">{reference}</span><Badge variant="outline" className={status.className}>{status.label}</Badge></div>
          <div><CardTitle className="line-clamp-2 text-lg leading-6">{incident.title}</CardTitle><CardDescription className="mt-2 line-clamp-2 leading-5">{incident.description}</CardDescription></div>
          <CaseProgress currentStage={status.stage} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniMetric icon={ShieldCheck} label="Category" value={incident.category} />
            <MiniMetric icon={MapPin} label="Campus" value={formatCampus(incident.campus)} />
            <MiniMetric icon={FileCheck2} label="Evidence" value={`${evidenceCount} file${evidenceCount === 1 ? '' : 's'}`} />
            <MiniMetric icon={Calendar} label="Submitted" value={format(new Date(incident.created_at), 'dd MMM yyyy')} />
          </div>
          {incident.location_description && <div className="flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span className="line-clamp-2">{incident.location_description}</span></div>}
          {incident.resolution_notes && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/25"><p className="font-black text-emerald-700 dark:text-emerald-300">Official resolution</p><p className="mt-1 line-clamp-2 text-muted-foreground">{incident.resolution_notes}</p></div>}
          <Button variant="outline" className="min-h-11 w-full touch-manipulation font-extrabold group-hover:border-primary" onClick={onOpen}><Eye className="mr-2 h-4 w-4" />Open institutional case<ChevronRight className="ml-auto h-4 w-4" /></Button>
        </CardContent>
      </Card>
    </motion.article>
  );
}

function CaseDetail({ incident, evidenceCount, updates, loadingUpdates, onCopyCoordinates, onDownload }: { incident: Incident; evidenceCount: number; updates: CaseUpdate[]; loadingUpdates: boolean; onCopyCoordinates: () => void; onDownload: () => void }) {
  const status = getStatus(incident.status);
  const reference = caseReference(incident.id);
  const upcoming = updates.filter((update) => update.scheduled_date && new Date(update.scheduled_date).getTime() > Date.now());
  return (
    <>
      <DialogHeader className="border-b bg-gradient-to-r from-[#002F6C] to-[#0055A5] p-5 text-white sm:p-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="font-mono text-xs font-black tracking-[0.14em] text-[#F2A900]">{reference}</div><DialogTitle className="mt-2 text-2xl text-white">{incident.title}</DialogTitle><DialogDescription className="mt-2 text-white/70">Submitted {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })} · {formatCampus(incident.campus)}</DialogDescription></div><Badge className="w-fit bg-white text-[#002F6C] hover:bg-white">{status.label}</Badge></div>
      </DialogHeader>
      <div className="space-y-6 p-4 sm:p-7">
        <CaseProgress currentStage={status.stage} large />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><DetailMetric icon={ShieldCheck} label="Category" value={incident.category} /><DetailMetric icon={FileCheck2} label="Evidence" value={`${evidenceCount} verified record${evidenceCount === 1 ? '' : 's'}`} /><DetailMetric icon={Calendar} label="Created" value={format(new Date(incident.created_at), 'dd MMM yyyy HH:mm')} /><DetailMetric icon={RefreshCw} label="Last updated" value={format(new Date(incident.updated_at), 'dd MMM yyyy HH:mm')} /></div>
        <section><h3 className="text-sm font-black uppercase tracking-[0.12em] text-primary">Statement</h3><p className="mt-3 whitespace-pre-wrap rounded-2xl border bg-muted/25 p-4 text-sm leading-7">{incident.description}</p></section>
        {(incident.location_description || (incident.location_lat != null && incident.location_lng != null)) && <section><h3 className="text-sm font-black uppercase tracking-[0.12em] text-primary">Incident location</h3><div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/25">{incident.location_description && <p className="font-bold">{incident.location_description}</p>}{incident.location_lat != null && incident.location_lng != null && <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><code className="rounded-lg bg-background px-3 py-2 text-xs">{formatCoordinatePair(incident.location_lat, incident.location_lng)}</code><Button size="sm" variant="outline" onClick={onCopyCoordinates}><Clipboard className="mr-2 h-4 w-4" />Copy measured coordinates</Button></div>}</div></section>}
        {upcoming.length > 0 && <section><h3 className="text-sm font-black uppercase tracking-[0.12em] text-primary">Upcoming actions</h3><div className="mt-3 space-y-2">{upcoming.map((update) => <div key={update.id} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/25"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-black">{update.title}</p><p className="mt-1 text-sm text-muted-foreground">{update.scheduled_date ? format(new Date(update.scheduled_date), 'dd MMM yyyy HH:mm') : ''}</p></div></div>)}</div></section>}
        <section><h3 className="text-sm font-black uppercase tracking-[0.12em] text-primary">Institutional timeline</h3><div className="mt-4 space-y-0">{loadingUpdates ? <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : updates.length ? updates.map((update, index) => <TimelineItem key={update.id} update={update} last={index === updates.length - 1} />) : <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No additional case updates have been published yet. The original report and current status remain recorded.</div>}</div></section>
        {incident.resolution_notes && <section><h3 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Official resolution</h3><div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 dark:border-emerald-900 dark:bg-emerald-950/25">{incident.resolution_notes}</div></section>}
        <div className="grid gap-3 border-t pt-5 sm:grid-cols-2"><Button variant="outline" className="min-h-11" onClick={onDownload}><Download className="mr-2 h-4 w-4" />Download case receipt</Button><div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground"><Sparkles className="h-4 w-4 text-primary" />Receipt can be opened and printed to PDF.</div></div>
      </div>
    </>
  );
}

function CaseProgress({ currentStage, large = false }: { currentStage: number; large?: boolean }) {
  return <div className="grid grid-cols-4 gap-1" aria-label={`Case progress: ${STATUS_STAGES[Math.min(currentStage, 3)]}`}>
    {STATUS_STAGES.map((stage, index) => <div key={stage} className="min-w-0"><div className={`h-2 rounded-full ${index <= currentStage ? 'bg-gradient-to-r from-[#D7193F] to-[#F2A900]' : 'bg-muted'}`} /><p className={`${large ? 'mt-2 text-[11px] sm:text-xs' : 'mt-1 text-[9px] sm:text-[10px]'} truncate text-center font-extrabold uppercase tracking-wide ${index <= currentStage ? 'text-foreground' : 'text-muted-foreground'}`}>{stage}</p></div>)}
  </div>;
}

function TimelineItem({ update, last }: { update: CaseUpdate; last: boolean }) {
  return <div className="grid grid-cols-[28px_1fr] gap-3"><div className="flex flex-col items-center"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>{!last && <span className="min-h-12 w-px flex-1 bg-border" />}</div><div className="pb-5"><div className="rounded-2xl border bg-muted/20 p-4"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><p className="font-black">{update.title}</p><span className="text-xs text-muted-foreground">{format(new Date(update.created_at), 'dd MMM yyyy HH:mm')}</span></div>{update.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{update.description}</p>}{update.scheduled_date && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300"><CalendarClock className="h-4 w-4" />Scheduled: {format(new Date(update.scheduled_date), 'dd MMM yyyy HH:mm')}</p>}</div></div></div>;
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof FileText }) {
  return <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur sm:p-4"><Icon className="h-5 w-5 text-[#F2A900]" /><p className="mt-2 text-2xl font-black">{value}</p><p className="text-xs font-bold text-white/65">{label}</p></div>;
}

function MiniMetric({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border bg-muted/25 p-2.5"><div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div><p className="mt-1 line-clamp-2 text-xs font-bold">{value}</p></div>;
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/25 p-3"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div><p className="mt-2 text-sm font-black">{value}</p></div>;
}
