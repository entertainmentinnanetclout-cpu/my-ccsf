import { CampusPlanExplorer } from '@/components/student/InstitutionalCampusRadar';
import type { CampusLocation } from '@/types/pilot';

interface CampusMapProps {
  campus?: CampusLocation;
}

export const CampusMap = ({ campus = 'pretoria_west_main' }: CampusMapProps) => (
  <CampusPlanExplorer campus={campus} />
);
