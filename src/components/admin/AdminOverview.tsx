import { Slider } from './Slider';
import { LatestCases } from './LatestCases';
import { EmergencyCases } from './EmergencyCases';
import { AlertsPanel } from './Dashboard/AlertsPanel';
import { TrafficSummary } from './Dashboard/TrafficSummary';
import { CCTVStatus } from './Dashboard/CCTVStatus';

export const AdminOverview = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Stats & Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AlertsPanel />
        <TrafficSummary />
        <CCTVStatus />
      </div>

      <Slider />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LatestCases />
        </div>
        <div>
          <EmergencyCases />
        </div>
      </div>
    </div>
  );
};
