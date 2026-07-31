import { CheckCircle2, Copy, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubmissionReceipt } from '@/services/evidenceSubmissionService';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] ?? character));
}

export function SubmissionReceiptCard({
  receipt,
  onOpenCase,
}: {
  receipt: SubmissionReceipt;
  onOpenCase?: () => void;
}) {
  const printReceipt = () => {
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=760,height=900');
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${escapeHtml(receipt.reference_number)}</title><style>
      body{font-family:Arial,sans-serif;color:#152238;margin:48px;line-height:1.5}header{border-top:8px solid #F2A900;border-bottom:2px solid #002F6C;padding:20px 0}h1{color:#002F6C;margin:0}.box{border:1px solid #cbd5e1;border-radius:12px;padding:24px;margin-top:24px}.row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e2e8f0;padding:10px 0}.muted{color:#64748b;font-size:13px}.notice{background:#eff6ff;border-left:5px solid #002F6C;padding:14px;margin-top:24px}@media print{body{margin:20mm}.no-print{display:none}}</style></head><body>
      <header><div class="muted">Tshwane University of Technology · Campus Community Safety Forum</div><h1>Report Submission Receipt</h1></header>
      <div class="box"><div class="row"><strong>Reference</strong><span>${escapeHtml(receipt.reference_number)}</span></div><div class="row"><strong>Environment</strong><span>${escapeHtml(receipt.scope === 'pilot' ? 'Controlled Pilot' : 'Official CCSF')}</span></div><div class="row"><strong>Submitted</strong><span>${escapeHtml(new Date(receipt.submitted_at).toLocaleString('en-ZA'))}</span></div><div class="row"><strong>Campus</strong><span>${escapeHtml(receipt.campus ?? 'Not recorded')}</span></div><div class="row"><strong>Evidence files</strong><span>${escapeHtml(receipt.evidence_count)}</span></div></div>
      <div class="notice">Keep this receipt as proof that the report reached the authorised CCSF workflow. It does not replace emergency contact procedures.</div>
      <script>window.addEventListener('load',()=>window.print())</script></body></html>`);
    popup.document.close();
  };

  return (
    <Card className="border-emerald-500/35 shadow-large" data-testid="submission-receipt">
      <CardHeader className="border-b bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-7 w-7 text-emerald-600" />
          <div>
            <CardTitle>Report received</CardTitle>
            <CardDescription>Keep this formal receipt for your records.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Case reference</p>
          <p className="mt-1 break-all text-xl font-black text-primary">{receipt.reference_number}</p>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Submitted:</span> {new Date(receipt.submitted_at).toLocaleString('en-ZA')}</p>
            <p><span className="text-muted-foreground">Evidence:</span> {receipt.evidence_count} file{receipt.evidence_count === 1 ? '' : 's'}</p>
            <p><span className="text-muted-foreground">Environment:</span> {receipt.scope === 'pilot' ? 'Controlled Pilot' : 'Official CCSF'}</p>
            <p><span className="text-muted-foreground">Campus:</span> {receipt.campus ?? 'Not recorded'}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(receipt.reference_number)}><Copy className="mr-2 h-4 w-4" />Copy reference</Button>
          <Button type="button" variant="outline" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
          {onOpenCase && <Button type="button" onClick={onOpenCase}><FileText className="mr-2 h-4 w-4" />Open My Case</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
