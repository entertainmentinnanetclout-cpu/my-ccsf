import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Button } from '@/components/ui/button';
import {
  loadInstitutionalControlRegister,
  loadInstitutionalReleaseDecision,
  loadInstitutionalSignoffRegister,
  type InstitutionalControlRow,
  type InstitutionalReleaseDecision,
  type InstitutionalSignoffRow,
} from '@/services/institutionalGovernanceService';
import { TUT_GOVERNANCE } from '@/config/institutionalGovernance';

export default function InstitutionalSignoffPack() {
  const [signoffs, setSignoffs] = useState<InstitutionalSignoffRow[]>([]);
  const [controls, setControls] = useState<InstitutionalControlRow[]>([]);
  const [decision, setDecision] = useState<InstitutionalReleaseDecision>({ authorised: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadInstitutionalSignoffRegister(),
      loadInstitutionalControlRegister(),
      loadInstitutionalReleaseDecision(),
    ])
      .then(([signoffRows, controlRows, release]) => {
        setSignoffs(signoffRows);
        setControls(controlRows);
        setDecision(release);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to load governance pack.'));
  }, []);

  const mandatory = signoffs.filter((row) => row.mandatory);
  const complete = mandatory.filter((row) => row.status === 'approved' || row.status === 'not_applicable').length;
  const ready = decision.ready_for_formal_production_designation === true;

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-950 print:bg-white print:p-0">
      <style>{`@page{size:A4 portrait;margin:13mm}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.no-print{display:none!important}.page-break{break-before:page}.avoid-break{break-inside:avoid}}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-between">
        <Button asChild variant="outline"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin</Link></Button>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
      </div>

      <main className="mx-auto max-w-[210mm] bg-white p-8 shadow-xl print:p-0 print:shadow-none">
        <header className="border-b-2 border-[#002F6C] pb-5">
          <div className="flex items-start justify-between gap-5">
            <InstitutionBrand size="auth" themeOverride="light" />
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C8102E]">Institutional governance pack</p>
              <h1 className="mt-1 text-2xl font-black text-[#002F6C]">Campus Safety App</h1>
              <p className="text-sm font-semibold text-slate-600">Formal TUT Sign-Off & Production Designation</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-700">
            Student-developed internal safety system for the Campus Community Safety Forum unit under Campus Protection Services, focused on crime prevention, event compliance and related safety workflows.
          </p>
        </header>

        {error && <div className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <section className="mt-6 grid grid-cols-3 gap-3 avoid-break">
          <Summary label="Mandatory gates complete" value={`${complete} / ${mandatory.length}`} />
          <Summary label="Formal designation" value={ready ? 'READY' : 'PENDING'} />
          <Summary label="Technical controls" value={String(controls.length)} />
        </section>

        <section className="mt-7 avoid-break">
          <h2 className="text-lg font-black text-[#002F6C]">Decision principle</h2>
          <p className="mt-2 border-l-4 border-[#F2A900] bg-amber-50 p-4 text-sm leading-6">
            Technical readiness evidence does not create institutional approval. A gate closes only when the responsible TUT authority provides written evidence and that evidence is recorded in the governance register.
          </p>
        </section>

        <section className="mt-7">
          <h2 className="text-lg font-black text-[#002F6C]">Formal sign-off matrix</h2>
          <div className="mt-4 space-y-4">
            {signoffs.map((row) => (
              <article key={row.signoff_key} className="avoid-break rounded-lg border border-slate-300 p-4 text-[11px] leading-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-sm font-black text-[#002F6C]">{row.sequence_no}. {row.title}</h3>
                  <strong>{row.status.replaceAll('_', ' ')}</strong>
                </div>
                <p className="mt-2"><strong>Authority:</strong> {row.authority_role}</p>
                <p className="mt-2"><strong>Decision required:</strong> {row.approval_scope}</p>
                {row.conditional_when && <p className="mt-2"><strong>Applies when:</strong> {row.conditional_when}</p>}
                {row.source_basis && <p className="mt-2"><strong>Governance basis:</strong> {row.source_basis}</p>}
                <p className="mt-2"><strong>Request reference:</strong> {row.request_reference || 'Pending'}</p>
                <p><strong>Decision evidence:</strong> {row.decision_reference || 'Pending'}</p>
                {row.conditions && <p><strong>Conditions:</strong> {row.conditions}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="page-break mt-7">
          <h2 className="text-lg font-black text-[#002F6C]">Technical control index</h2>
          <table className="mt-4 w-full border-collapse text-left text-[10px] leading-4">
            <thead className="bg-[#002F6C] text-white"><tr><th className="p-2">Control</th><th className="p-2">Status</th><th className="p-2">Owner</th><th className="p-2">Evidence</th></tr></thead>
            <tbody>{controls.map((row) => <tr key={row.control_key} className="border-b border-slate-200 align-top"><td className="p-2 font-semibold">{row.control_title}</td><td className="p-2">{row.implementation_status.replaceAll('_', ' ')}</td><td className="p-2">{row.institutional_owner || 'To be confirmed'}</td><td className="p-2">{row.evidence_reference || 'Pending'}</td></tr>)}</tbody>
          </table>
        </section>

        <section className="mt-7 avoid-break">
          <h2 className="text-lg font-black text-[#002F6C]">Official source basis</h2>
          <ul className="mt-3 space-y-2 text-[10px] leading-4">
            <li><strong>TUT PAIA Manual 2025:</strong> {TUT_GOVERNANCE.paiaManual.href}</li>
            <li><strong>TUT Privacy & POPIA:</strong> {TUT_GOVERNANCE.privacyStatement.href}</li>
            <li><strong>TUT Intellectual Property Policy:</strong> {TUT_GOVERNANCE.ipPolicy.href}</li>
            <li><strong>TUT Research Ethics:</strong> {TUT_GOVERNANCE.researchEthics.href}</li>
            <li><strong>TUT Executive Management:</strong> {TUT_GOVERNANCE.executiveManagement.href}</li>
          </ul>
        </section>

        <section className="page-break mt-7">
          <h2 className="text-lg font-black text-[#002F6C]">Final institutional production designation</h2>
          <p className="mt-2 text-sm leading-6">Complete only after the mandatory specialist gates are closed by written TUT decisions.</p>
          {['Decision','Approved scope','Environments covered','Outstanding conditions','Effective date','Review date','Decision authority / committee','Written decision reference','Name / designation','Signature / date'].map((label) => <Blank key={label} label={label} />)}
        </section>
      </main>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3 text-center"><p className="text-[9px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-[#002F6C]">{value}</p></div>;
}

function Blank({ label }: { label: string }) {
  return <div className="avoid-break mt-5"><p className="text-xs font-bold uppercase text-slate-600">{label}</p><div className="mt-2 h-8 border-b border-slate-700" /></div>;
}
