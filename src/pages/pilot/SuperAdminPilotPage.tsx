import { PilotLiveAdminWorkspace } from '@/components/pilot/PilotLiveAdminWorkspace';
import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';

export default function SuperAdminPilotPage() {
  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8" data-testid="ready-pilot-admin">
      <PilotLiveAdminWorkspace scope="admin" />
      <PilotCsvExportPanel />
    </div>
  );
}
