import { GeographicCampusMap } from '@/components/maps/GeographicCampusMap';
import type { CampusLocation } from '@/types/pilot';

export const CampusMap = ({ campus = 'pretoria_west_main' }: { campus?: CampusLocation }) => (
  <GeographicCampusMap campus={campus} />
);
