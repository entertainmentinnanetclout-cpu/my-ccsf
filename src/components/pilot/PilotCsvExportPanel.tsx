import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { loadPilotAdminData, requestPilotExport } from '@/services/pilot/pilotAdminService';
import type { CampusLocation, PilotProgram } from '@/types/pilot';

export function PilotCsvExportPanel({
  campus,
}: {
  campus?: CampusLocation | null;
}) {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<PilotProgram[]>([]);
  const [programId, setProgramId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPilotAdminData({ campus: campus ?? null })
      .then((result) => {
        setPrograms(result.programs);
        setProgramId((current) => current || result.programs[0]?.id || '');
      })
      .catch(() => undefined);
  }, [campus]);

  const exportCsv = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const payload = await requestPilotExport(programId, campus ?? null, false);
      const reports = payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray(payload.reports)
        ? payload.reports
        : [];
      const headers = ['participant_key', 'campus', 'category', 'status', 'submitted_at', 'simulation_completed_at', 'attachment_count', 'event_count'];
      const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = reports.map((report) => {
        const item = report && typeof report === 'object' && !Array.isArray(report) ? report : {};
        return headers.map((header) => escape(item[header])).join(',');
      });
      const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pilot-${programId}${campus ? `-${campus}` : ''}-deidentified.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ title: 'De-identified Pilot CSV downloaded' });
    } catch (error) {
      toast({ title: 'CSV export failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Export</CardTitle>
        <CardDescription>Downloads the de-identified report dataset authorised by the Pilot export RPC.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="sm:flex-1"><SelectValue placeholder="Select programme" /></SelectTrigger>
          <SelectContent>{programs.map((program) => <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => void exportCsv()} disabled={!programId || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download CSV
        </Button>
      </CardContent>
    </Card>
  );
}
