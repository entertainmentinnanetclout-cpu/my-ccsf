import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, FileCheck2, RefreshCw, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadInstitutionalControlRegister } from '@/services/institutionalGovernanceService';
import { TUT_GOVERNANCE } from '@/config/institutionalGovernance';

type ControlRow = Awaited<ReturnType<typeof loadInstitutionalControlRegister>>[number];

const statusLabel: Record<string, string> = {
  implemented: 'Implemented',
  implemented_pending_tut_confirmation: 'Implemented · TUT confirmation pending',
  requires_tut_confirmation: 'Requires TUT confirmation',
  planned: 'Planned',
};

const statusClass: Record<string, string> = {
  implemented: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  implemented_pending_tut_confirmation: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  requires_tut_confirmation: 'border-[#D7193F]/35 bg-[#D7193F]/10 text-[#B91435] dark:text-red-300',
  planned: 'border-border bg-muted text-muted-foreground',
};

export function InstitutionalGovernanceDashboard() {
  const [rows, setRows] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await loadInstitutionalControlRegister());
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

  return (
    <div className="space-y-5" data-testid="institutional-governance-dashboard">
      <Card className="overflow-hidden border-[#F2A900]/50 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] via-[#07366D] to-[#190D2B] text-white">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]">Institutional readiness control register</p>
              <CardTitle className="mt-2 text-2xl">Governance, privacy, security and TUT approval state</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/75">
                This register distinguishes controls already enforced by the Campus Safety App from controls that require formal TUT ICT, Privacy, Records Management, Legal or Information Security confirmation.
              </CardDescription>
            </div>
            <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh evidence
            </Button>
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
        {rows.map((row) => (
          <Card key={row.control_key} className="shadow-soft">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary">{row.control_domain}</p>
                  <CardTitle className="mt-1 text-lg">{row.control_title}</CardTitle>
                </div>
                <Badge variant="outline" className={statusClass[row.implementation_status] ?? statusClass.planned}>
                  {statusLabel[row.implementation_status] ?? row.implementation_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6">
              {row.notes && <p className="text-muted-foreground">{row.notes}</p>}
              <div className="grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
                <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Institutional owner</p><p className="mt-1 font-semibold">{row.institutional_owner || 'To be confirmed'}</p></div>
                <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Evidence reference</p><p className="mt-1 font-mono text-xs">{row.evidence_reference || 'Pending'}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
