import { PilotSuperAdminDashboard } from '@/components/pilot/PilotSuperAdminDashboard';

export default function SuperAdminPilotPage() {
  return (
    <div className="w-full px-4 py-6 pb-24 sm:px-6 lg:px-8" data-testid="ready-pilot-admin">
      <PilotSuperAdminDashboard />
    </div>
  );
}
