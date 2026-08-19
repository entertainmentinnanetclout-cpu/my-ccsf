import { PilotCampusGeographicMap } from '@/components/pilot/PilotCampusGeographicMap';
import { PilotCampusSecurityDashboard } from '@/components/pilot/PilotCampusSecurityDashboard';
import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { CampusLocation } from '@/types/pilot';

export default function CampusPilotPage() {
  const { userProfile } = useAuth();
  const campus = (userProfile?.campus ?? null) as CampusLocation | null;

  if (!campus) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Card className="border-destructive/30 text-center">
          <CardContent className="p-8">
            <h1 className="text-xl font-bold">Campus assignment required</h1>
            <p className="mt-2 text-sm text-muted-foreground">A campus-security profile must have a verified campus before the campus-scoped Pilot workspace can open.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 pb-24 sm:px-6 lg:px-8" data-testid="ready-pilot-campus">
      <PilotCampusGeographicMap campus={campus} />
      <PilotCampusSecurityDashboard campus={campus} />
      <PilotCsvExportPanel campus={campus} />
    </div>
  );
}
