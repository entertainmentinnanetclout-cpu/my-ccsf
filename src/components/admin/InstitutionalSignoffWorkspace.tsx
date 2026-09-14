import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, Printer, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  loadInstitutionalReleaseDecision,
  loadInstitutionalSignoffEvents,
  loadInstitutionalSignoffRegister,
  recordInstitutionalSignoffEvent,
  type InstitutionalReleaseDecision,
  type InstitutionalSignoffEventRow,
  type InstitutionalSignoffEventType,
  type InstitutionalSignoffRow,
  type InstitutionalSignoffStatus,
} from '@/services/institutionalGovernanceService';

const statusLabel: Record<InstitutionalSignoffStatus, string> = {
  not_requested: 'Not requested',
  requested: 'Requested',
  under_review: 'Under review',
  changes_required: 'Changes required',
  conditionally_approved: 'Conditional approval',
  approved: 'Approved',
  not_applicable: 'Not applicable',
};

const statusClass: Record<InstitutionalSignoffStatus, string> = {
  not_requested: 'border-border bg-muted text-muted-foreground',
  requested: 'border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300',
  under_review: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300',
  changes_required: 'border-[#C8102E]/40 bg-[#C8102E]/10 text-[#A50D27] dark:text-red-300',
  conditionally_approved: 'border-[#F2A900]/50 bg-[#F2A900]/12 text-amber-900 dark:text-amber-300',
  approved: 'border-emerald-600/35 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  not_applicable: 'border-slate-400/40 bg-slate-400/10 text-slate-700 dark:text-slate-300',
};

const eventLabel: Record<InstitutionalSignoffEventType, string> = {
  request_created: 'Request created',
  submission_sent: 'Submission sent',
  review_started: 'Review started',
  changes_requested: 'Changes requested',
  conditional_approval: 'Conditional approval',
  approval: 'Written approval',
  not_applicable: 'Not applicable decision',
  reopened: 'Re-open review',
  evidence_added: 'Add evidence',
  note: 'Add note',
};

const decisionEvents = new Set<InstitutionalSignoffEventType>([
  'conditional_approval',
  'approval',
  'not_applicable',
]);

const emptyForm = {
  signoffKey: '',
  eventType: 'request_created' as InstitutionalSignoffEventType,
  authorityName: '',
  authorityRole: '',
  evidenceReference: '',
  conditions: '',
  notes: '',
};

export function InstitutionalSignoffWorkspace() {
  const { toast } = useToast();
  const [rows, setRows] = useState<InstitutionalSignoffRow[]>([]);
  const [events, setEvents] = useState<InstitutionalSignoffEventRow[]>([]);
  const [decision, setDecision] = useState<InstitutionalReleaseDecision>({ authorised: false });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [signoffs, history, release] = await Promise.all([
        loadInstitutionalSignoffRegister(),
        loadInstitutionalSignoffEvents(),
        loadInstitutionalReleaseDecision(),
      ]);
      setRows(signoffs);
      setEvents(history);
      setDecision(release);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load formal institutional sign-off state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const latestEventBySignoff = useMemo(() => {
    const map = new Map<string, InstitutionalSignoffEventRow>();
    for (const event of events) if (!map.has(event.signoff_key)) map.set(event.signoff_key, event);
    return map;
  }, [events]);

  const mandatoryRows = useMemo(() => rows.filter((row) => row.mandatory), [rows]);
  const approvedCount = mandatoryRows.filter((row) => row.status === 'approved' || row.status === 'not_applicable').length;
  const totalMandatory = mandatoryRows.length;
  const ready = decision.ready_for_formal_production_designation === true;

  const openEvent = (row: InstitutionalSignoffRow, eventType: InstitutionalSignoffEventType = 'request_created') => {
    setForm({
      ...emptyForm,
      signoffKey: row.signoff_key,
      eventType,
      authorityRole: row.authority_role,
      evidenceReference: row.request_reference ?? '',
    });
    setDialogOpen(true);
  };

  const saveEvent = async () => {
    const row = rows.find((item) => item.signoff_key === form.signoffKey);
    if (!row) return;

    if (decisionEvents.has(form.eventType) && (!form.authorityName.trim() || !form.authorityRole.trim() || !form.evidenceReference.trim())) {
      toast({
        title: 'Written decision evidence required',
        description: 'Approval decisions require the authority/committee, authority role and a written evidence reference.',
        variant: 'destructive',
      });
      return;
    }

    if (form.eventType === 'conditional_approval' && !form.conditions.trim()) {
      toast({ title: 'Conditions required', description: 'Record every condition attached to the approval.', variant: 'destructive' });
      return;
    }

    setWorking(true);
    try {
      await recordInstitutionalSignoffEvent({
        signoffKey: form.signoffKey,
        eventType: form.eventType,
        authorityName: form.authorityName.trim() || null,
        authorityRole: form.authorityRole.trim() || null,
        evidenceReference: form.evidenceReference.trim() || null,
        conditions: form.conditions.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast({
        title: 'Formal governance event recorded',
        description: decisionEvents.has(form.eventType)
          ? 'The decision was recorded with its written evidence reference.'
          : 'The sign-off history has been updated without implying approval.',
      });
      setDialogOpen(false);
      await load();
    } catch (caught) {
      toast({ title: 'Sign-off update failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="space-y-5" data-testid="institutional-signoff-workspace">
      <Card className={ready ? 'border-emerald-600/35 shadow-large' : 'border-[#C8102E]/35 shadow-large'}>
        <CardHeader className="bg-gradient-to-r from-[#002F6C] via-[#07366D] to-[#190D2B] text-white">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">Formal TUT governance</p>
              <CardTitle className="mt-2 text-2xl">Institutional sign-off and production designation</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/75">
                Technical readiness is complete. This workspace now records the written TUT decisions required for operational ownership, ICT, privacy, security, records, legal/procurement, resilience, branding and final production designation.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link to="/admin/governance/signoff-pack"><Printer className="mr-2 h-4 w-4" />Open print-ready sign-off pack</Link>
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={ready ? CheckCircle2 : ShieldAlert} label="Formal production designation" value={ready ? 'READY' : 'PENDING'} />
          <Metric icon={FileCheck2} label="Mandatory sign-offs complete" value={`${approvedCount} / ${totalMandatory}`} />
          <Metric icon={Clock3} label="Under review / requested" value={String((decision.under_review ?? 0) + (decision.requested ?? 0))} />
          <Metric icon={AlertTriangle} label="Changes / conditional" value={String((decision.changes_required ?? 0) + (decision.conditional ?? 0))} />
        </CardContent>
      </Card>

      {!ready && (
        <Card className="border-[#F2A900]/60 bg-[#F2A900]/5">
          <CardContent className="flex gap-3 p-5 text-sm leading-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B77900]" />
            <div>
              <p className="font-extrabold">Do not represent the system as formally approved yet.</p>
              <p className="mt-1 text-muted-foreground">
                The application can demonstrate technical controls and evidence, but only written institutional decisions can close these gates. “Approved” cannot be recorded without an authority/committee and evidence reference.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/35 bg-destructive/5">
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => {
          const latest = latestEventBySignoff.get(row.signoff_key);
          return (
            <Card key={row.signoff_key} className="shadow-soft">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-[42rem]">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{row.domain}</p>
                    <CardTitle className="mt-1 text-lg">{row.sequence_no}. {row.title}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.mandatory ? <Badge className="bg-[#002F6C]">Mandatory</Badge> : <Badge variant="secondary">Conditional</Badge>}
                    <Badge variant="outline" className={statusClass[row.status]}>{statusLabel[row.status]}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-6">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Institutional authority</p>
                  <p className="mt-1 font-semibold">{row.authority_role}</p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Decision required</p>
                  <p className="mt-1 text-muted-foreground">{row.approval_scope}</p>
                </div>

                {row.conditional_when && (
                  <div className="rounded-xl border border-[#F2A900]/40 bg-[#F2A900]/5 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#9A6700]">Applies when</p>
                    <p className="mt-1 text-muted-foreground">{row.conditional_when}</p>
                  </div>
                )}

                {row.source_basis && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Governance basis</p>
                    <p className="mt-1 text-muted-foreground">{row.source_basis}</p>
                  </div>
                )}

                {(row.request_reference || row.decision_reference || row.conditions) && (
                  <div className="grid gap-2 rounded-xl border p-3">
                    {row.request_reference && <Info label="Request reference" value={row.request_reference} />}
                    {row.decision_reference && <Info label="Decision evidence" value={row.decision_reference} />}
                    {row.conditions && <Info label="Conditions" value={row.conditions} />}
                  </div>
                )}

                {latest && (
                  <p className="text-xs text-muted-foreground">
                    Latest event: <strong>{eventLabel[latest.event_type]}</strong> · {new Date(latest.created_at).toLocaleString('en-ZA')}
                    {latest.authority_name ? ` · ${latest.authority_name}` : ''}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button size="sm" variant="outline" onClick={() => openEvent(row, row.status === 'not_requested' ? 'request_created' : 'submission_sent')}>
                    {row.status === 'not_requested' ? 'Record request' : 'Add submission/evidence'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEvent(row, 'review_started')}>Record review</Button>
                  <Button size="sm" onClick={() => openEvent(row, 'approval')}>Record written decision</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record formal TUT sign-off activity</DialogTitle>
            <DialogDescription>
              Record only what actually happened. Approval events require written evidence and do not accept technical build results as institutional authority.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Sign-off requirement">
                <Select value={form.signoffKey} onValueChange={(value) => setForm((current) => ({ ...current, signoffKey: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rows.map((row) => <SelectItem key={row.signoff_key} value={row.signoff_key}>{row.sequence_no}. {row.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Event">
              <Select value={form.eventType} onValueChange={(value) => setForm((current) => ({ ...current, eventType: value as InstitutionalSignoffEventType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(eventLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Authority role">
              <Input value={form.authorityRole} onChange={(event) => setForm((current) => ({ ...current, authorityRole: event.target.value }))} />
            </Field>

            <Field label="Authority / committee name">
              <Input value={form.authorityName} onChange={(event) => setForm((current) => ({ ...current, authorityName: event.target.value }))} placeholder="Required for formal decisions" />
            </Field>

            <Field label="Written evidence / request reference">
              <Input value={form.evidenceReference} onChange={(event) => setForm((current) => ({ ...current, evidenceReference: event.target.value }))} placeholder="Memo, email, ticket, minute, signed form, document ID" />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Conditions">
                <Textarea rows={3} value={form.conditions} onChange={(event) => setForm((current) => ({ ...current, conditions: event.target.value }))} placeholder="Mandatory for conditional approval" />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Notes">
                <Textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Outcome, requested changes, next action, due date or context" />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={() => void saveEvent()} disabled={working}>{working ? 'Recording…' : 'Record governance event'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}
