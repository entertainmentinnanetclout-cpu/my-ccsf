import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PilotAdminWorkspace } from '@/components/pilot/PilotAdminWorkspace';
import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';
import { Button } from '@/components/ui/button';

export default function SuperAdminPilotPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground shadow-large">
        <div className="container mx-auto flex flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /><h1 className="text-xl font-bold">CCSF Super-Admin Pilot Console</h1></div>
            <p className="mt-1 text-sm text-primary-foreground/80">Cross-campus programme, analytics, export and retention controls</p>
          </div>
          <Button variant="secondary" asChild><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Production Admin Portal</Link></Button>
        </div>
      </header>
      <main className="container mx-auto space-y-6 px-4 py-6">
        <PilotAdminWorkspace scope="admin" />
        <PilotCsvExportPanel />
      </main>
    </div>
  );
}
