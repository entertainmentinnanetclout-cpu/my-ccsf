import { CampusOverview } from '../../CampusOverview';

interface CampusOverviewWidgetProps {
  widgetId: string;
}

export const CampusOverviewWidget = ({ widgetId }: CampusOverviewWidgetProps) => {
  return (
    <div className="h-full overflow-auto">
      <CampusOverview />
    </div>
  );
};
