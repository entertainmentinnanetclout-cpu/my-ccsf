import { PilotAdminWorkspace } from '@/components/pilot/PilotAdminWorkspace';
import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';
import { useAuth } from '@/contexts/AuthContext';
import type { CampusLocation } from '@/types/pilot';

export default function CampusPilotPage() {
  const { userProfile } = useAuth();
  const campus = (userProfile?.campus ?? null) as CampusLocation | null;

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8" data-testid="ready-pilot-campus">
      <PilotAdminWorkspace scope="campus" campus={campus} />
      <PilotCsvExportPanel campus={campus} />
    </div>
  );
}
