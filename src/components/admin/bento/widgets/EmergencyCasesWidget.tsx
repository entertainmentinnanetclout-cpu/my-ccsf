import { EmergencyCases } from '../../EmergencyCases';

interface EmergencyCasesWidgetProps {
  widgetId: string;
}

export const EmergencyCasesWidget = ({ widgetId }: EmergencyCasesWidgetProps) => {
  return (
    <div className="h-full overflow-auto">
      <EmergencyCases />
    </div>
  );
};
