import type { CampusLocation } from '@/types/pilot';

export type CampusGeoPointKind = 'campus' | 'building' | 'library' | 'cafeteria' | 'meeting_point' | 'incident' | 'device';

export interface CampusGeoPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: CampusGeoPointKind;
  detail?: string;
  source: 'TUT published GPS' | 'OpenStreetMap campus footprint' | 'Captured device GPS';
}

export interface CampusGeography {
  campus: CampusLocation;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  defaultZoom: number;
  sourceNote: string;
  points: CampusGeoPoint[];
}

const point = (
  id: string,
  name: string,
  latitude: number,
  longitude: number,
  kind: CampusGeoPointKind,
  detail?: string,
): CampusGeoPoint => ({ id, name, latitude, longitude, kind, detail, source: 'TUT published GPS' });

export const CAMPUS_GEOGRAPHY: Record<CampusLocation, CampusGeography> = {
  pretoria_west_main: {
    campus: 'pretoria_west_main',
    name: 'Pretoria Campus',
    address: 'Staatsartillerie Road, Pretoria West, Pretoria',
    latitude: -25.7315417,
    longitude: 28.1612167,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('pretoria-campus', 'Pretoria Campus', -25.7315417, 28.1612167, 'campus', 'Staatsartillerie Road, Pretoria West'),
      point('pretoria-building-2', 'Building 2', -25.7327000, 28.1632389, 'building'),
      point('pretoria-building-3', 'Building 3', -25.7321778, 28.1636028, 'building'),
      point('pretoria-building-4', 'Building 4', -25.7318833, 28.1628000, 'building'),
      point('pretoria-building-5', 'Building 5 North / open area', -25.7316806, 28.1643917, 'building'),
      point('pretoria-building-6', 'Building 6 courtyard', -25.7327694, 28.1648139, 'building'),
      point('pretoria-building-9', 'Building 9', -25.7331639, 28.1648333, 'building'),
      point('pretoria-building-11', 'Building 11', -25.7337167, 28.1636472, 'building'),
      point('pretoria-building-13', 'Building 13', -25.7311667, 28.1638611, 'building'),
      point('pretoria-building-20', 'Building 20 Library', -25.7313278, 28.1623083, 'library'),
      point('pretoria-building-21', 'Building 21', -25.7315444, 28.1602278, 'building', 'Student Administration / Dinokeng precinct'),
      point('pretoria-fountain', 'Building 21 Fountain', -25.7321417, 28.1618222, 'meeting_point', 'Published TUT hotspot coordinate'),
      point('pretoria-building-30', 'Building 30 courtyard', -25.7319722, 28.1602889, 'building'),
      point('pretoria-building-31', 'Building 31 open area', -25.7324222, 28.1606972, 'building'),
      point('pretoria-building-44', 'Building 44 Cafeteria', -25.7318111, 28.1589889, 'cafeteria'),
    ],
  },
  arcadia: {
    campus: 'arcadia',
    name: 'Arcadia Campus',
    address: '175 Nelson Mandela Drive, Arcadia, Pretoria',
    latitude: -25.7449528,
    longitude: 28.2000528,
    defaultZoom: 18,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('arcadia-campus', 'Arcadia Campus', -25.7449528, 28.2000528, 'campus', '175 Nelson Mandela Drive'),
      point('arcadia-building-1', 'Building 1 Boardroom', -25.7454778, 28.1992083, 'building'),
      point('arcadia-building-2', 'Building 2 Library', -25.7453333, 28.1995056, 'library'),
      point('arcadia-building-4', 'Building 4 Cafeteria', -25.7446000, 28.1992139, 'cafeteria'),
    ],
  },
  arts: {
    campus: 'arts',
    name: 'Arts Campus',
    address: '24 Du Toit Street, Pretoria',
    latitude: -25.7406000,
    longitude: 28.1961083,
    defaultZoom: 18,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('arts-campus', 'Arts Campus', -25.7406000, 28.1961083, 'campus', '24 Du Toit Street / Arts precinct'),
      point('arts-building-5', 'Building 5 Boardroom', -25.7403222, 28.1963278, 'building'),
      point('arts-building-7', 'Building 7 Library', -25.7402667, 28.1971194, 'library'),
    ],
  },
  giyani: {
    campus: 'giyani',
    name: 'Giyani Campus',
    address: 'Stand D5-83, Nsami Road, Giyani, 0826',
    latitude: -23.2969800,
    longitude: 30.7278300,
    defaultZoom: 16,
    sourceNote: 'The campus site is matched to the former Giyani education-campus footprint on OpenStreetMap; TUT identifies the site as Stand D5-83, Nsami Road. Building-level pins are withheld until published GPS points are verified.',
    points: [
      {
        id: 'giyani-campus',
        name: 'Giyani Campus site',
        latitude: -23.2969800,
        longitude: 30.7278300,
        kind: 'campus',
        detail: 'Stand D5-83, Nsami Road, Giyani',
        source: 'OpenStreetMap campus footprint',
      },
    ],
  },
  mbombela: {
    campus: 'mbombela',
    name: 'Mbombela Campus',
    address: 'Madiba Drive, Mbombela, Mpumalanga',
    latitude: -25.4998139,
    longitude: 30.9549722,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('mbombela-campus', 'Mbombela Campus', -25.4998139, 30.9549722, 'campus', 'Madiba Drive'),
      point('mbombela-building-1', 'Building 1', -25.4992167, 30.9557750, 'building'),
      point('mbombela-building-4-library', 'Building 4 Library', -25.4996833, 30.9562500, 'library'),
    ],
  },
  polokwane: {
    campus: 'polokwane',
    name: 'Polokwane Campus',
    address: '109 Market Street, Polokwane',
    latitude: -23.8999300,
    longitude: 29.4486000,
    defaultZoom: 18,
    sourceNote: 'The campus centre uses the current OpenStreetMap TUT university footprint at 109 Market Street. TUT-published legacy hotspot coordinates are retained only where they align with the current site.',
    points: [
      {
        id: 'polokwane-campus',
        name: 'Polokwane Campus',
        latitude: -23.8999300,
        longitude: 29.4486000,
        kind: 'campus',
        detail: '109 Market Street, Polokwane',
        source: 'OpenStreetMap campus footprint',
      },
      point('polokwane-boardroom', 'Published Boardroom / campus hotspot', -23.8999639, 29.4488444, 'building'),
    ],
  },
  garankuwa: {
    campus: 'garankuwa',
    name: 'Ga-Rankuwa Campus',
    address: '2827 Zone 2, Botsi Street, Ga-Rankuwa',
    latitude: -25.6183111,
    longitude: 28.0023083,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('garankuwa-campus', 'Ga-Rankuwa Campus', -25.6183111, 28.0023083, 'campus', '2827 Zone 2, Botsi Street'),
      point('garankuwa-building-2-library', 'Building 2 Library', -25.6156861, 28.0030500, 'library'),
      point('garankuwa-building-27-cafeteria', 'Building 27 Cafeteria', -25.6157167, 28.0016778, 'cafeteria'),
      point('garankuwa-building-29', 'Building 29', -25.6162639, 28.0024083, 'building'),
    ],
  },
  soshanguve_south: {
    campus: 'soshanguve_south',
    name: 'Soshanguve South Campus',
    address: '2 Aubrey Matlala Road, Block K/L, Soshanguve',
    latitude: -25.5408000,
    longitude: 28.0961556,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('sosh-south-campus', 'Soshanguve South Campus', -25.5408000, 28.0961556, 'campus', '2 Aubrey Matlala Road'),
      point('sosh-south-building-5', 'Building 5 Council Chambers', -25.5406250, 28.0960972, 'building'),
      point('sosh-south-library', 'Soshanguve South Library', -25.5401694, 28.0955472, 'library'),
      point('sosh-south-cafeteria', 'Soshanguve South Cafeteria', -25.5410222, 28.0950139, 'cafeteria'),
    ],
  },
  soshanguve_north: {
    campus: 'soshanguve_north',
    name: 'Soshanguve North Campus',
    address: 'Aubrey Matlala Road, Block H, Soshanguve',
    latitude: -25.5203000,
    longitude: 28.1129000,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('sosh-north-campus', 'Soshanguve North Campus', -25.5203000, 28.1129000, 'campus', 'Aubrey Matlala Road, Block H'),
      point('sosh-north-building-17', 'Building 17 Boardroom', -25.5198583, 28.1149194, 'building'),
      point('sosh-north-cafeteria-1', 'Cafeteria 1', -25.5201639, 28.1148000, 'cafeteria'),
      point('sosh-north-cafeteria-2', 'Cafeteria 2', -25.5213139, 28.1132806, 'cafeteria'),
    ],
  },
  emalahleni: {
    campus: 'emalahleni',
    name: 'eMalahleni Campus',
    address: '19 OR Tambo Road, eMalahleni',
    latitude: -25.8776861,
    longitude: 29.2363722,
    defaultZoom: 17,
    sourceNote: 'Campus and destination pins use published TUT GPS coordinates. The underlying street/building layer is OpenStreetMap.',
    points: [
      point('emalahleni-campus', 'eMalahleni Campus', -25.8776861, 29.2363722, 'campus', '19 OR Tambo Road'),
      point('emalahleni-building-7', 'Building 07 Boardroom', -25.8782611, 29.2354694, 'building'),
      point('emalahleni-building-15-16', 'Buildings 15 & 16 open area', -25.8767972, 29.2355333, 'building'),
      point('emalahleni-building-18', 'Building 18', -25.8768083, 29.2346000, 'building'),
      point('emalahleni-library', 'eMalahleni Library', -25.8777278, 29.2357139, 'library'),
    ],
  },
};

export const getCampusGeography = (campus: CampusLocation) => CAMPUS_GEOGRAPHY[campus];
