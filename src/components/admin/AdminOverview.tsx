import { Slider } from './Slider';
import { LatestCases } from './LatestCases';
import { EmergencyCases } from './EmergencyCases';

export const AdminOverview = () => {
  return (
    <div className="flex flex-col gap-4">
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
