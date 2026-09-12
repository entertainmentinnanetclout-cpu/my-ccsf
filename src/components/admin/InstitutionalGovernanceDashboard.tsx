import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
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
  loadInstitutionalAssuranceEvidence,
  loadInstitutionalControlRegister,
  recordInstitutionalAssuranceEvidence,
  upsertInstitutionalControl,
  type AssuranceEvidenceResult,
  type AssuranceEvidenceType,
  type InstitutionalAssuranceEvidenceRow,
  type InstitutionalControlRow,
  type InstitutionalControlStatus,
} from '@/services/institutionalGovernanceService';
import { TUT_GOVERNANCE } from '@/config/institutionalGovernance';

const statusLabel: Record<InstitutionalControlStatus, string> = {
  implemented: 'Implemented',
  implemented_pending_tut_confirmation: 'Implemented · TUT confirmation pending',
  requires_tut_confirmation: 'Requires TUT confirmation',
  planned: 'Planned',
};

const statusClass: Record<InstitutionalControlStatus, string> = {
  implemented: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  implemented_pending_tut_confirmation: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  requires_tut_confirmation: 'border-[#D7193F]/35 bg-[#D7193F]/10 text-[#B91435] dark:text-red-300',
  planned: 'border-border bg-muted text-muted-foreground',
};

const evidenceResultClass: Record<AssuranceEvidenceResult, string> = {
  pending: 'border-border bg-muted text-muted-foreground',
  passed: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  accepted: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
  conditional: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  not_applicable: 'border-border bg-muted text-muted-foreground',
};

const emptyControl = {
  controlKey: '',
  domain: '',
  title: '',
  status: 'requires_tut_confirmation' as InstitutionalControlStatus,
  evidenceReference: '',
  institutionalOwner: '',
  notes: '',
};

const emptyEvidence = {
  controlKey: '',
  evidenceType: 'approval' as AssuranceEvidenceType,
  title: '',
  result: 'pending' as AssuranceEvidenceResult,
  evidenceReference: '',
  institutionalOwner: '',
  performedAt: '',
  expiresAt: '',
  notes: '',
};

export function InstitutionalGovernanceDashboard() {
  const { toast } = useToast();
  const [rows, setRows] = useState<InstitutionalControlRow[]>([]);
  const [evidence, setEvidence] = useState<InstitutionalAssuranceEvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlOpen, setControlOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [controlForm, setControlForm] = useState(emptyControl);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidence);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [controls, assurance] = await Promise.all([
        loadInstitutionalControlRegister(),
        loadInstitutionalAssuranceEvidence(),
      ]);
      setRows(controls);
      setEvidence(assurance);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the institutional control register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => ({
    implemented: rows.filter((row) => row.implementation_status === 'implemented').length,
    pending: rows.filter((row) => row.implementation_status === 'implemented_pending_tut_confirmation').length,
    confirmation: rows.filter((row) => row.implementation_status === 'requires_tut_confirmation').length,
  }), [rows]);

  const evidenceByControl = useMemo(() => {
    const map = new Map<string, InstitutionalAssuranceEvidenceRow[]>();
    for (const item of evidence) {
      const current = map.get(item.control_key) ?? [];
      current.push(item);
      map.set(item.control_key, current);
    }
    return map;
  }, [evidence]);

  const openControlEditor = (row?: InstitutionalControlRow) => {
    setControlForm(row ? {
      controlKey: row.control_key,
      domain: row.control_domain,
      title: row.control_title,
      status: row.implementation_status,
      evidenceReference: row.evidence_reference ?? '',
      institutionalOwner: row.institutional_owner ?? '',
      notes: row.notes ?? '',
    } : emptyControl);
    setControlOpen(true);
  };

  const openEvidenceEditor = (controlKey?: string) => {
    setEvidenceForm({ ...emptyEvidence, controlKey: controlKey ?? rows[0]?.control_key ?? '' });
    setEvidenceOpen(true);
  };

  const saveControl = async () => {
    if (!controlForm.controlKey.trim() || !controlForm.domain.trim() || !controlForm.title.trim()) {
      toast({ title: 'Complete the protocol fields', description: 'Control key, domain and title are required.', variant: 'destructive' });
      return;
    }
    setWorking(true);
    try {
      await upsertInstitutionalControl(controlForm);
      toast({ title: 'Institutional control recorded', description: 'The update was written through the audited governance RPC.' });
      setControlOpen(false);
      await load();
    } catch (caught) {
      toast({ title: 'Control update failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  const saveEvidence = async () => {
    if (!evidenceForm.controlKey || !evidenceForm.title.trim()) {
      toast({ title: 'Complete the evidence fields', description: 'Choose a control and give the evidence a title.', variant: 'destructive' });
      return;
    }
    setWorking(true);
    try {
      await recordInstitutionalAssuranceEvidence({
        ...evidenceForm,
        performedAt: evidenceForm.performedAt ? new Date(evidenceForm.performedAt).toISOString() : null,
        expiresAt: evidenceForm.expiresAt ? new Date(evidenceForm.expiresAt).toISOString() : null,
      });
      toast({ title: 'Assurance evidence recorded', description: 'The record is append-only and audit-linked.' });
      setEvidenceOpen(false);
      await load();
    } catch (caught) {
      toast({ title: 'Evidence record failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="institutional-governance-dashboard">
      <Card className="overflow-hidden border-[#F2A900]/50 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] via-[#07366D] to-[#190D2B] text-white">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">Institutional readiness control register</p>
              <CardTitle className="mt-2 text-2xl">Governance, privacy, security and TUT approval state</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/75">
                This register distinguishes controls already enforced by the Campus Safety App from controls that require formal TUT ICT, Privacy, Records Management, Legal or Information Security confirmation.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => openControlEditor()}>
                <Plus className="mr-2 h-4 w-4" />Add protocol
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => openEvidenceEditor()}>
                <FileCheck2 className="mr-2 h-4 w-4" />Record evidence
              </Button>
              <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <Metric icon={CheckCircle2} label="Implemented" value={counts.implemented} />
          <Metric icon={Clock3} label="Implemented / confirmation pending" value={counts.pending} />
          <Metric icon={AlertTriangle} label="Institutional confirmation required" value={counts.confirmation} />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/35 bg-destructive/5">
          <CardContent className="p-5 text-sm text-destructive">
            <strong>Control register unavailable.</strong> {error} The governance release must not be represented as complete until the database migration is applied and this register loads successfully.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => {
          const controlEvidence = evidenceByControl.get(row.control_key) ?? [];
          return (
            <Card key={row.control_key} className="shadow-soft">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{row.control_domain}</p>
                    <CardTitle className="mt-1 text-lg">{row.control_title}</CardTitle>
                  </div>
                  <Badge variant="outline" className={statusClass[row.implementation_status]}>
                    {statusLabel[row.implementation_status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6">
                {row.notes && <p className="text-muted-foreground">{row.notes}</p>}
                <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                  <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Institutional owner</p><p className="mt-1 font-semibold">{row.institutional_owner || 'To be confirmed'}</p></div>
                  <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Evidence reference</p><p className="mt-1 break-words font-mono text-xs">{row.evidence_reference || 'Pending'}</p></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{controlEvidence.length} assurance record{controlEvidence.length === 1 ? '' : 's'}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openControlEditor(row)}>Update control</Button>
                    <Button size="sm" onClick={() => openEvidenceEditor(row.control_key)}>Add evidence</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest assurance evidence</CardTitle>
          <CardDescription>Approvals, restore tests, privacy reviews, security assessments and other evidence are append-only; a later record can supersede an earlier one without erasing history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {evidence.length === 0 && <p className="rounded-xl border p-4 text-sm text-muted-foreground">No assurance evidence has been recorded yet. This is expected until the governance migration is applied and institutional reviews begin.</p>}
          {evidence.slice(0, 12).map((item) => (
            <div key={item.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-extrabold">{item.title}</p>
                  <Badge variant="outline" className={evidenceResultClass[item.result]}>{item.result.replaceAll('_', ' ')}</Badge>
                  <Badge variant="secondary">{item.evidence_type.replaceAll('_', ' ')}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{rows.find((row) => row.control_key === item.control_key)?.control_title ?? item.control_key}</p>
                {item.evidence_reference && <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.evidence_reference}</p>}
              </div>
              <div className="text-xs text-muted-foreground md:text-right">
                <p>{item.institutional_owner || 'Owner not specified'}</p>
                <p className="mt-1">{item.performed_at ? new Date(item.performed_at).toLocaleString('en-ZA') : new Date(item.created_at).toLocaleString('en-ZA')}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Official governance sources</CardTitle>
          <CardDescription>Use official TUT and Information Regulator sources for statutory or institutional decisions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <SourceButton href={TUT_GOVERNANCE.paiaManual.href} label="TUT PAIA Manual 2025" />
          <SourceButton href={TUT_GOVERNANCE.privacyStatement.href} label="TUT Privacy & POPIA" />
          <SourceButton href={TUT_GOVERNANCE.regulatorForms.href} label="Information Regulator forms" />
        </CardContent>
      </Card>

      <Card className="border-[#D7193F]/30">
        <CardContent className="flex gap-3 p-5 text-sm leading-6">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D7193F]" />
          <div>
            <p className="font-extrabold">No automatic institutional approval claim</p>
            <p className="mt-1 text-muted-foreground">
              A green application build or passing database test demonstrates technical evidence only. Production designation, cloud/operator approval, records retention, RPO/RTO, Cyber Security Plan alignment and other internal controls remain subject to the named TUT owners.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={controlOpen} onOpenChange={setControlOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add or update an institutional protocol</DialogTitle>
            <DialogDescription>Use this when TUT supplies an additional ICT, privacy, records, security or operational requirement. Changes are written through an audited administrator RPC.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Control key"><Input value={controlForm.controlKey} onChange={(event) => setControlForm((current) => ({ ...current, controlKey: event.target.value }))} placeholder="e.g. tut-data-classification" /></Field>
            <Field label="Domain"><Input value={controlForm.domain} onChange={(event) => setControlForm((current) => ({ ...current, domain: event.target.value }))} placeholder="ICT / Privacy / Records" /></Field>
            <div className="sm:col-span-2"><Field label="Control title"><Input value={controlForm.title} onChange={(event) => setControlForm((current) => ({ ...current, title: event.target.value }))} /></Field></div>
            <Field label="Implementation status">
              <Select value={controlForm.status} onValueChange={(value) => setControlForm((current) => ({ ...current, status: value as InstitutionalControlStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Institutional owner"><Input value={controlForm.institutionalOwner} onChange={(event) => setControlForm((current) => ({ ...current, institutionalOwner: event.target.value }))} placeholder="TUT ICT / Privacy / Records" /></Field>
            <div className="sm:col-span-2"><Field label="Evidence reference"><Input value={controlForm.evidenceReference} onChange={(event) => setControlForm((current) => ({ ...current, evidenceReference: event.target.value }))} placeholder="Document section, ticket, PR, assessment or approval reference" /></Field></div>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={4} value={controlForm.notes} onChange={(event) => setControlForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setControlOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={() => void saveControl()} disabled={working}>{working ? 'Saving…' : 'Save audited control'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record institutional assurance evidence</DialogTitle>
            <DialogDescription>Record a test, approval, assessment or review. The evidence record is append-only and does not by itself change the control status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Control">
                <Select value={evidenceForm.controlKey} onValueChange={(value) => setEvidenceForm((current) => ({ ...current, controlKey: value }))}>
                  <SelectTrigger><SelectValue placeholder="Choose control" /></SelectTrigger>
                  <SelectContent>{rows.map((row) => <SelectItem key={row.control_key} value={row.control_key}>{row.control_domain} · {row.control_title}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Evidence type">
              <Select value={evidenceForm.evidenceType} onValueChange={(value) => setEvidenceForm((current) => ({ ...current, evidenceType: value as AssuranceEvidenceType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['approval','assessment','security_test','restore_test','privacy_review','records_review','operator_review','release_gate','training','other'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Result">
              <Select value={evidenceForm.result} onValueChange={(value) => setEvidenceForm((current) => ({ ...current, result: value as AssuranceEvidenceResult }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['pending','passed','accepted','failed','conditional','not_applicable'].map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2"><Field label="Evidence title"><Input value={evidenceForm.title} onChange={(event) => setEvidenceForm((current) => ({ ...current, title: event.target.value }))} /></Field></div>
            <div className="sm:col-span-2"><Field label="Reference / location"><Input value={evidenceForm.evidenceReference} onChange={(event) => setEvidenceForm((current) => ({ ...current, evidenceReference: event.target.value }))} placeholder="Ticket, document, test report, approval reference or repository evidence" /></Field></div>
            <Field label="Institutional owner / reviewer"><Input value={evidenceForm.institutionalOwner} onChange={(event) => setEvidenceForm((current) => ({ ...current, institutionalOwner: event.target.value }))} /></Field>
            <Field label="Performed at"><Input type="datetime-local" value={evidenceForm.performedAt} onChange={(event) => setEvidenceForm((current) => ({ ...current, performedAt: event.target.value }))} /></Field>
            <Field label="Expires / review due"><Input type="datetime-local" value={evidenceForm.expiresAt} onChange={(event) => setEvidenceForm((current) => ({ ...current, expiresAt: event.target.value }))} /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><Textarea rows={4} value={evidenceForm.notes} onChange={(event) => setEvidenceForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={() => void saveEvidence()} disabled={working}>{working ? 'Saving…' : 'Record append-only evidence'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: number }) {
  return <div className="rounded-2xl border bg-muted/25 p-4"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function SourceButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-between py-3">
      <a href={href} target="_blank" rel="noreferrer"><span>{label}</span><ExternalLink className="ml-3 h-4 w-4" /></a>
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
