import type { CampusLocation } from '@/types/pilot';

export type CampusPoiCategory =
  | 'administration'
  | 'protection'
  | 'control'
  | 'student_support'
  | 'transport'
  | 'meeting_point'
  | 'building';

export type CampusPoiConfidence = 'verified_service' | 'verified_plan' | 'schematic_reference';

export interface CampusSafetyPoi {
  id: string;
  name: string;
  shortName: string;
  category: CampusPoiCategory;
  buildingLabel: string;
  roomLabel?: string;
  description: string;
  services: string[];
  searchTerms: string[];
  confidence: CampusPoiConfidence;
  x?: number;
  y?: number;
}

export interface CampusSafetyPlan {
  campus: CampusLocation;
  name: string;
  shortName: string;
  sourceImage: string;
  viewBox: { width: number; height: number };
  notice: string;
  defaultOriginId: string;
  pois: CampusSafetyPoi[];
}

export const CAMPUS_CATEGORY_LABELS: Record<CampusPoiCategory, string> = {
  administration: 'Student administration',
  protection: 'Campus Protection Services',
  control: 'CPS Control',
  student_support: 'Student support',
  transport: 'Transport',
  meeting_point: 'Meeting point',
  building: 'Campus building',
};

export const CAMPUS_CATEGORY_COLOURS: Record<CampusPoiCategory, { fill: string; stroke: string }> = {
  administration: { fill: '#D7193F', stroke: '#8F102A' },
  protection: { fill: '#002F6C', stroke: '#001A3D' },
  control: { fill: '#F2A900', stroke: '#9C6B00' },
  student_support: { fill: '#7C3AED', stroke: '#4C1D95' },
  transport: { fill: '#0F766E', stroke: '#134E4A' },
  meeting_point: { fill: '#EA580C', stroke: '#9A3412' },
  building: { fill: '#475569', stroke: '#1E293B' },
};

const pretoriaWestPois: CampusSafetyPoi[] = [
  {
    id: 'fountain',
    name: 'Fountain activation point',
    shortName: 'Fountain',
    category: 'meeting_point',
    buildingLabel: 'Fountain precinct',
    description: 'My CCSF activation and student meeting point near the Building 21 precinct.',
    services: ['My CCSF activation', 'Safety Quest activities', 'Student awareness'],
    searchTerms: ['fountain', 'activation', 'quiz', 'meeting point', 'safety quest'],
    confidence: 'schematic_reference',
    x: 452,
    y: 500,
  },
  {
    id: 'building-21',
    name: 'Building 21 Student Administration',
    shortName: 'Building 21',
    category: 'administration',
    buildingLabel: 'Building 21',
    description: 'Primary student-administration destination for registration and official academic administration assistance.',
    services: ['Registration assistance', 'Proof of registration', 'Academic records', 'General student administration'],
    searchTerms: ['building 21', 'registration', 'proof of registration', 'academic record', 'admin', 'student administration'],
    confidence: 'verified_plan',
    x: 439,
    y: 420,
  },
  {
    id: 'cps-office',
    name: 'Campus Protection Services office',
    shortName: 'CPS Office',
    category: 'protection',
    buildingLabel: 'Building 4',
    roomLabel: 'G-51',
    description: 'Campus Protection Services operational office. Use official emergency channels where danger is immediate.',
    services: ['Campus safety assistance', 'Crime reporting support', 'Protection-service guidance'],
    searchTerms: ['cps', 'campus protection', 'security', 'building 4', 'g-51', 'g51'],
    confidence: 'verified_service',
  },
  {
    id: 'cps-control',
    name: 'CPS Control',
    shortName: 'Control',
    category: 'control',
    buildingLabel: 'Building 4',
    roomLabel: 'G-63',
    description: 'CPS Control destination for verified protection-service routing and operational coordination.',
    services: ['Operational safety routing', 'Campus protection coordination', 'Verified control contact point'],
    searchTerms: ['control', 'cps control', 'building 4', 'g-63', 'g63'],
    confidence: 'verified_service',
  },
  {
    id: 'student-counselling',
    name: 'Student Counselling and Student Support',
    shortName: 'Student Counselling',
    category: 'student_support',
    buildingLabel: 'Student Development and Support',
    description: 'Professional student-support route for stress, anxiety, emotional pressure, mental-health concerns and academic or personal barriers.',
    services: ['Student counselling', 'Mental-health support', 'Personal support', 'Academic support referral'],
    searchTerms: ['counselling', 'mental health', 'anxiety', 'stress', 'depression', 'student support', 'student development'],
    confidence: 'verified_service',
  },
  {
    id: 'building-20',
    name: 'Building 20',
    shortName: 'Building 20',
    category: 'building',
    buildingLabel: 'Building 20',
    description: 'Numbered campus building shown on the approved Pretoria campus structure reference.',
    services: ['Campus landmark'],
    searchTerms: ['building 20', '20'],
    confidence: 'verified_plan',
    x: 533,
    y: 370,
  },
  {
    id: 'building-30',
    name: 'Building 30',
    shortName: 'Building 30',
    category: 'building',
    buildingLabel: 'Building 30',
    description: 'Numbered campus building shown on the approved Pretoria campus structure reference.',
    services: ['Campus landmark'],
    searchTerms: ['building 30', '30'],
    confidence: 'verified_plan',
    x: 368,
    y: 461,
  },
  {
    id: 'building-31',
    name: 'Building 31',
    shortName: 'Building 31',
    category: 'building',
    buildingLabel: 'Building 31',
    description: 'Numbered campus building shown on the approved Pretoria campus structure reference.',
    services: ['Campus landmark'],
    searchTerms: ['building 31', '31'],
    confidence: 'verified_plan',
    x: 360,
    y: 563,
  },
  {
    id: 'building-51',
    name: 'Building 51',
    shortName: 'Building 51',
    category: 'building',
    buildingLabel: 'Building 51',
    description: 'Numbered campus building shown on the approved Pretoria campus structure reference.',
    services: ['Campus landmark'],
    searchTerms: ['building 51', '51'],
    confidence: 'verified_plan',
    x: 405,
    y: 783,
  },
  {
    id: 'building-52',
    name: 'Building 52',
    shortName: 'Building 52',
    category: 'building',
    buildingLabel: 'Building 52',
    description: 'Numbered campus facility shown on the approved Pretoria campus structure reference.',
    services: ['Campus landmark'],
    searchTerms: ['building 52', '52'],
    confidence: 'verified_plan',
    x: 226,
    y: 700,
  },
  {
    id: 'visitors-centre',
    name: 'FNB Visitors Centre',
    shortName: 'Visitors Centre',
    category: 'building',
    buildingLabel: 'FNB Visitors Centre',
    description: 'Visitor destination shown on the approved Pretoria campus structure reference.',
    services: ['Visitor assistance', 'Campus landmark'],
    searchTerms: ['visitors centre', 'fnb', 'visitor'],
    confidence: 'verified_plan',
    x: 959,
    y: 660,
  },
  {
    id: 'bus-stop',
    name: 'Campus bus stop',
    shortName: 'Bus Stop',
    category: 'transport',
    buildingLabel: 'Bus stop',
    description: 'Transport point shown on the approved Pretoria campus structure reference.',
    services: ['Campus transport', 'Student pickup point'],
    searchTerms: ['bus stop', 'transport', 'pickup'],
    confidence: 'verified_plan',
    x: 326,
    y: 648,
  },
  {
    id: 'technikonrand-station',
    name: 'Technikonrand Station',
    shortName: 'Station',
    category: 'transport',
    buildingLabel: 'Technikonrand Station',
    description: 'Rail landmark shown on the eastern side of the approved Pretoria campus structure reference.',
    services: ['Rail transport landmark'],
    searchTerms: ['station', 'technikonrand', 'train', 'rail'],
    confidence: 'verified_plan',
    x: 1105,
    y: 555,
  },
];

export const CAMPUS_SAFETY_PLANS: Partial<Record<CampusLocation, CampusSafetyPlan>> = {
  pretoria_west_main: {
    campus: 'pretoria_west_main',
    name: 'TUT Pretoria West Campus',
    shortName: 'Pretoria West',
    sourceImage: '/campus-guides/pretoria-campus-structure-map.svg',
    viewBox: { width: 1200, height: 920 },
    notice: 'The building layer is a verified institutional structure reference. It is not presented as a surveyed GPS parcel map. Live device precision is shown separately with its measured accuracy.',
    defaultOriginId: 'fountain',
    pois: pretoriaWestPois,
  },
};

export const getCampusSafetyPlan = (campus: CampusLocation) => CAMPUS_SAFETY_PLANS[campus] ?? null;

export const searchCampusPois = (plan: CampusSafetyPlan, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return plan.pois;
  return plan.pois.filter((poi) => [
    poi.name,
    poi.shortName,
    poi.buildingLabel,
    poi.roomLabel ?? '',
    poi.description,
    ...poi.services,
    ...poi.searchTerms,
  ].some((value) => value.toLowerCase().includes(normalized)));
};
