export type QuestIconName =
  | 'student'
  | 'fraud'
  | 'verify'
  | 'prevention'
  | 'investigation'
  | 'office'
  | 'services'
  | 'control';

export const QUEST_TOPICS = [
  'control-room',
  'traffic-services',
  'investigation',
  'fire-emergency',
  'events-crime-prevention',
  'building-locations',
  'service-routing',
  'reporting-routes',
] as const;

export type QuestTopic = (typeof QUEST_TOPICS)[number];

export const QUEST_TOPIC_LABELS: Record<QuestTopic, string> = {
  'control-room': 'Control Room',
  'traffic-services': 'Traffic Services',
  investigation: 'Investigation',
  'fire-emergency': 'Fire & Emergency Services',
  'events-crime-prevention': 'Events Compliance & Crime Prevention',
  'building-locations': 'Building locations',
  'service-routing': 'CPS service routing',
  'reporting-routes': 'Reporting routes',
};

export interface QuestOption {
  id: string;
  label: string;
}

export interface QuestQuestion {
  id: string;
  topic: QuestTopic;
  eyebrow: string;
  title: string;
  character: string;
  question: string;
  lesson: string;
  icon: QuestIconName;
  correctOptionId: string;
  options: QuestOption[];
}

export interface QuestCheckpoint extends QuestQuestion {
  missionIndex: number;
  position: { x: number; y: number };
  runnerPosition: { x: number; y: number };
}

export const CPS_SERVICES = [
  'Control Room',
  'Traffic Services',
  'Investigation',
  'Fire and Emergency Services',
  'Events Compliance & Crime Prevention (CCSF)',
] as const;

export const QUEST_TOTAL = 8;

const QUEST_POSITIONS = [
  { position: { x: 10, y: 66 }, runnerPosition: { x: 10, y: 86 } },
  { position: { x: 21, y: 64 }, runnerPosition: { x: 21, y: 86 } },
  { position: { x: 39, y: 53 }, runnerPosition: { x: 39, y: 86 } },
  { position: { x: 48, y: 64 }, runnerPosition: { x: 48, y: 86 } },
  { position: { x: 64, y: 63 }, runnerPosition: { x: 64, y: 86 } },
  { position: { x: 68, y: 30 }, runnerPosition: { x: 68, y: 86 } },
  { position: { x: 79, y: 64 }, runnerPosition: { x: 79, y: 86 } },
  { position: { x: 91, y: 53 }, runnerPosition: { x: 91, y: 86 } },
] as const;

/**
 * Approved source contract for this quiz:
 * - Control Room: incidents are reported physically and through the Campus Safety App.
 * - Traffic Services: traffic-related cases and enquiries are reported and investigated.
 * - Investigation: incidents are investigated after they are received by the Control Room.
 * - Fire and Emergency Services: fire incidents are addressed, investigated and resolved.
 * - Events Compliance & Crime Prevention (CCSF): events are assessed for compliance and crime-prevention activities are planned, organised and implemented.
 * - Verified locations used in the quiz: Dinokeng Building (Build-21) for student administration; CPS Office, Building 4 G-51; Control Room, Building 4 G-63.
 */
export const QUEST_QUESTION_BANK: QuestQuestion[] = [
  {
    id: 'control-purpose',
    topic: 'control-room',
    eyebrow: 'Know incident intake',
    title: 'Start at Control',
    character: 'CPS Control Room',
    question: 'What is the main function of the Control Room in the Campus Safety App workflow?',
    lesson: 'The Control Room is where incidents are reported physically and through the Campus Safety App.',
    icon: 'control',
    correctOptionId: 'incident-intake',
    options: [
      { id: 'incident-intake', label: 'Receive incident reports physically\nReceive incident reports through the Campus Safety App' },
      { id: 'traffic-only', label: 'Handle only traffic enquiries\nInvestigate only vehicle-related matters' },
      { id: 'event-only', label: 'Assess event compliance\nPlan crime-prevention activities' },
    ],
  },
  {
    id: 'control-physical-app',
    topic: 'control-room',
    eyebrow: 'Use the correct channel',
    title: 'Two reporting routes',
    character: 'Campus Safety Guide',
    question: 'Which statement correctly describes how an incident can reach the Control Room?',
    lesson: 'A student can report an incident physically at the Control Room or through the Campus Safety App.',
    icon: 'control',
    correctOptionId: 'physical-app',
    options: [
      { id: 'physical-app', label: 'Physical report → Control Room\nApp report → Campus Safety App' },
      { id: 'traffic-investigation', label: 'Physical report → Traffic Services\nApp report → Investigation' },
      { id: 'fire-events', label: 'Physical report → Fire Services\nApp report → Events Compliance' },
    ],
  },
  {
    id: 'control-location',
    topic: 'control-room',
    eyebrow: 'Know the physical point',
    title: 'Find the Control Room',
    character: 'Campus Wayfinder',
    question: 'Where is the Control Room location used by this quiz?',
    lesson: 'The Control Room is at Building 4, G-63.',
    icon: 'office',
    correctOptionId: 'g63',
    options: [
      { id: 'dinokeng', label: 'Dinokeng Building (Build-21)' },
      { id: 'g51', label: 'Building 4, G-51' },
      { id: 'g63', label: 'Building 4, G-63' },
    ],
  },

  {
    id: 'traffic-purpose',
    topic: 'traffic-services',
    eyebrow: 'Route traffic matters',
    title: 'Traffic Services',
    character: 'CPS Traffic Services',
    question: 'Which matters belong with Traffic Services?',
    lesson: 'Traffic Services handles traffic-related cases and enquiries, including their investigation.',
    icon: 'services',
    correctOptionId: 'traffic-cases',
    options: [
      { id: 'traffic-cases', label: 'Traffic-related cases\nTraffic-related enquiries\nTraffic investigations' },
      { id: 'fire-cases', label: 'Fire incidents\nFire investigations\nFire resolution' },
      { id: 'event-cases', label: 'Event compliance\nCrime-prevention planning\nCrime-prevention implementation' },
    ],
  },
  {
    id: 'traffic-enquiry',
    topic: 'traffic-services',
    eyebrow: 'Match the service',
    title: 'Traffic enquiry route',
    character: 'CPS Service Navigator',
    question: 'A student has a traffic-related case or enquiry. Which service should handle it?',
    lesson: 'Traffic-related cases and enquiries are reported to Traffic Services and investigated there.',
    icon: 'services',
    correctOptionId: 'traffic',
    options: [
      { id: 'control', label: 'Control Room' },
      { id: 'traffic', label: 'Traffic Services' },
      { id: 'events', label: 'Events Compliance & Crime Prevention (CCSF)' },
    ],
  },
  {
    id: 'traffic-vs-fire',
    topic: 'traffic-services',
    eyebrow: 'Do not mix functions',
    title: 'Traffic or fire?',
    character: 'Campus Safety Quiz',
    question: 'Which routing pair is correct?',
    lesson: 'Traffic Services handles traffic-related cases and enquiries. Fire and Emergency Services handles fire incidents.',
    icon: 'verify',
    correctOptionId: 'correct-pair',
    options: [
      { id: 'correct-pair', label: 'Traffic matter → Traffic Services\nFire incident → Fire and Emergency Services' },
      { id: 'swapped', label: 'Traffic matter → Fire and Emergency Services\nFire incident → Traffic Services' },
      { id: 'events-both', label: 'Traffic matter → Events Compliance\nFire incident → Events Compliance' },
    ],
  },

  {
    id: 'investigation-after-control',
    topic: 'investigation',
    eyebrow: 'Know the sequence',
    title: 'After Control receives it',
    character: 'CPS Investigation',
    question: 'When does Investigation become involved in an incident?',
    lesson: 'Investigation handles incidents after they have been received by the Control Room.',
    icon: 'investigation',
    correctOptionId: 'after-control',
    options: [
      { id: 'after-control', label: 'Incident received by Control Room\nThen routed for Investigation' },
      { id: 'before-control', label: 'Investigation starts first\nThen reports the matter to Control Room' },
      { id: 'traffic-all', label: 'Every incident starts at Traffic Services\nThen moves to Investigation' },
    ],
  },
  {
    id: 'investigation-role',
    topic: 'investigation',
    eyebrow: 'Match the function',
    title: 'Investigation function',
    character: 'CPS Investigator',
    question: 'Which description best matches Investigation?',
    lesson: 'Investigation is where incidents are investigated after being received by the Control Room.',
    icon: 'investigation',
    correctOptionId: 'investigate-received',
    options: [
      { id: 'investigate-received', label: 'Investigate incidents\nAfter Control Room receives them' },
      { id: 'event-compliance', label: 'Assess events for compliance\nPlan crime-prevention activities' },
      { id: 'fire-resolution', label: 'Address fire incidents\nResolve fire incidents' },
    ],
  },
  {
    id: 'investigation-sequence',
    topic: 'investigation',
    eyebrow: 'Follow the route',
    title: 'Incident sequence',
    character: 'Campus Safety App Guide',
    question: 'Which sequence matches the approved CPS incident flow taught here?',
    lesson: 'An incident is reported to the Control Room physically or on the Campus Safety App, then Investigation can investigate the incident.',
    icon: 'control',
    correctOptionId: 'report-then-investigate',
    options: [
      { id: 'report-then-investigate', label: 'Report incident → Control Room\nControl Room receives matter → Investigation' },
      { id: 'investigate-then-report', label: 'Investigation opens case → Traffic Services\nTraffic Services reports it → Control Room' },
      { id: 'event-first', label: 'Events Compliance receives incident\nThen Fire Services investigates every matter' },
    ],
  },

  {
    id: 'fire-purpose',
    topic: 'fire-emergency',
    eyebrow: 'Know the fire service',
    title: 'Fire and Emergency Services',
    character: 'Fire and Emergency Services',
    question: 'What does Fire and Emergency Services do with fire incidents?',
    lesson: 'Fire and Emergency Services addresses, investigates and resolves fire incidents.',
    icon: 'services',
    correctOptionId: 'air',
    options: [
      { id: 'air', label: 'Address fire incidents\nInvestigate fire incidents\nResolve fire incidents' },
      { id: 'traffic', label: 'Receive traffic enquiries\nInvestigate traffic cases' },
      { id: 'events', label: 'Assess event compliance\nImplement crime-prevention activities' },
    ],
  },
  {
    id: 'fire-routing',
    topic: 'fire-emergency',
    eyebrow: 'Route the incident',
    title: 'A fire incident occurs',
    character: 'Campus Safety Guide',
    question: 'Which CPS service is responsible for addressing, investigating and resolving a fire incident?',
    lesson: 'Fire incidents are handled by Fire and Emergency Services.',
    icon: 'services',
    correctOptionId: 'fire',
    options: [
      { id: 'traffic', label: 'Traffic Services' },
      { id: 'fire', label: 'Fire and Emergency Services' },
      { id: 'events', label: 'Events Compliance & Crime Prevention (CCSF)' },
    ],
  },
  {
    id: 'fire-vs-investigation',
    topic: 'fire-emergency',
    eyebrow: 'Choose the specialist service',
    title: 'Specialist fire route',
    character: 'CPS Service Navigator',
    question: 'Which routing set correctly separates a normal incident investigation from a fire incident?',
    lesson: 'Investigation examines incidents after Control Room intake. Fire and Emergency Services handles fire incidents through addressing, investigation and resolution.',
    icon: 'verify',
    correctOptionId: 'specialist',
    options: [
      { id: 'specialist', label: 'General incident after Control → Investigation\nFire incident → Fire and Emergency Services' },
      { id: 'swap', label: 'General incident after Control → Fire and Emergency Services\nFire incident → Traffic Services' },
      { id: 'events-all', label: 'General incident → Events Compliance\nFire incident → Events Compliance' },
    ],
  },

  {
    id: 'events-compliance',
    topic: 'events-crime-prevention',
    eyebrow: 'Assess events safely',
    title: 'Event compliance',
    character: 'CCSF Crime Prevention',
    question: 'Which service assesses events for compliance?',
    lesson: 'Events Compliance & Crime Prevention (CCSF) assesses events for compliance.',
    icon: 'prevention',
    correctOptionId: 'events',
    options: [
      { id: 'events', label: 'Events Compliance & Crime Prevention (CCSF)' },
      { id: 'traffic', label: 'Traffic Services' },
      { id: 'investigation', label: 'Investigation' },
    ],
  },
  {
    id: 'crime-prevention-cycle',
    topic: 'events-crime-prevention',
    eyebrow: 'Know the prevention cycle',
    title: 'Plan to implementation',
    character: 'CCSF Crime Prevention',
    question: 'Which sequence describes the crime-prevention work of Events Compliance & Crime Prevention (CCSF)?',
    lesson: 'Crime-prevention activities are planned, organised and implemented by Events Compliance & Crime Prevention (CCSF).',
    icon: 'prevention',
    correctOptionId: 'plan-organise-implement',
    options: [
      { id: 'plan-organise-implement', label: 'Plan crime-prevention activities\nOrganise crime-prevention activities\nImplement crime-prevention activities' },
      { id: 'receive-investigate', label: 'Receive incident reports\nInvestigate every incident' },
      { id: 'fire-cycle', label: 'Address fire incidents\nInvestigate fire incidents\nResolve fire incidents' },
    ],
  },
  {
    id: 'events-two-functions',
    topic: 'events-crime-prevention',
    eyebrow: 'Know both responsibilities',
    title: 'Compliance and prevention',
    character: 'CCSF Safety Guide',
    question: 'Which answer contains both functions assigned to Events Compliance & Crime Prevention (CCSF)?',
    lesson: 'The service assesses events for compliance and plans, organises and implements crime-prevention activities.',
    icon: 'prevention',
    correctOptionId: 'both',
    options: [
      { id: 'both', label: 'Assess events for compliance\nPlan, organise and implement crime-prevention activities' },
      { id: 'traffic-fire', label: 'Investigate traffic enquiries\nResolve fire incidents' },
      { id: 'control-investigation', label: 'Receive all incidents\nInvestigate all incidents after intake' },
    ],
  },

  {
    id: 'building-dinokeng',
    topic: 'building-locations',
    eyebrow: 'Know the renamed building',
    title: 'Build-21 has a name',
    character: 'Pretoria Campus Wayfinder',
    question: 'What is Building 21 now called?',
    lesson: 'Building 21 is now called the Dinokeng Building (Build-21).',
    icon: 'office',
    correctOptionId: 'dinokeng',
    options: [
      { id: 'dinokeng', label: 'Dinokeng Building (Build-21)' },
      { id: 'control', label: 'Control Room, Building 4 G-63' },
      { id: 'cps', label: 'CPS Office, Building 4 G-51' },
    ],
  },
  {
    id: 'building-control',
    topic: 'building-locations',
    eyebrow: 'Find incident intake',
    title: 'Control Room location',
    character: 'Pretoria Campus Wayfinder',
    question: 'Where is the CPS Control Room?',
    lesson: 'The CPS Control Room is at Building 4, G-63.',
    icon: 'office',
    correctOptionId: 'g63',
    options: [
      { id: 'g51', label: 'Building 4, G-51' },
      { id: 'g63', label: 'Building 4, G-63' },
      { id: 'dinokeng', label: 'Dinokeng Building (Build-21)' },
    ],
  },
  {
    id: 'building-cps-office',
    topic: 'building-locations',
    eyebrow: 'Find CPS',
    title: 'CPS office location',
    character: 'Pretoria Campus Wayfinder',
    question: 'Where is the CPS Office location used by the Campus Safety App?',
    lesson: 'The CPS Office is at Building 4, G-51.',
    icon: 'office',
    correctOptionId: 'g51',
    options: [
      { id: 'dinokeng', label: 'Dinokeng Building (Build-21)' },
      { id: 'g63', label: 'Building 4, G-63' },
      { id: 'g51', label: 'Building 4, G-51' },
    ],
  },

  {
    id: 'route-five-services',
    topic: 'service-routing',
    eyebrow: 'Match the CPS service',
    title: 'Five service routes',
    character: 'CPS Service Navigator',
    question: 'Which multi-route answer correctly matches the CPS services?',
    lesson: 'Use the service that matches the matter: Control Room for incident intake, Traffic Services for traffic matters, Investigation after Control intake, Fire and Emergency Services for fire incidents, and Events Compliance & Crime Prevention for event compliance and prevention activities.',
    icon: 'services',
    correctOptionId: 'correct-all',
    options: [
      { id: 'correct-all', label: 'Incident report → Control Room\nTraffic case/enquiry → Traffic Services\nIncident after Control intake → Investigation\nFire incident → Fire and Emergency Services\nEvent compliance/crime prevention → Events Compliance & Crime Prevention (CCSF)' },
      { id: 'wrong-one', label: 'Incident report → Traffic Services\nTraffic case/enquiry → Fire and Emergency Services\nIncident investigation → Events Compliance\nFire incident → Control Room\nEvent compliance → Investigation' },
      { id: 'wrong-two', label: 'Incident report → Investigation first\nTraffic case/enquiry → Control Room only\nFire incident → Traffic Services\nEvent compliance → Fire Services\nCrime prevention → Investigation' },
    ],
  },
  {
    id: 'route-control-investigation',
    topic: 'service-routing',
    eyebrow: 'Follow the hand-off',
    title: 'Control to Investigation',
    character: 'Campus Safety App',
    question: 'Which two-step route is correct for an incident that needs investigation?',
    lesson: 'The incident is received by the Control Room, then Investigation investigates it.',
    icon: 'investigation',
    correctOptionId: 'control-investigation',
    options: [
      { id: 'control-investigation', label: 'Step 1 → Control Room receives incident\nStep 2 → Investigation investigates incident' },
      { id: 'investigation-control', label: 'Step 1 → Investigation receives incident\nStep 2 → Control Room investigates incident' },
      { id: 'traffic-fire', label: 'Step 1 → Traffic Services receives incident\nStep 2 → Fire Services investigates incident' },
    ],
  },
  {
    id: 'route-specialists',
    topic: 'service-routing',
    eyebrow: 'Use the specialist service',
    title: 'Traffic, fire and events',
    character: 'CPS Orientation',
    question: 'Which specialist routing set is correct?',
    lesson: 'Traffic Services handles traffic matters, Fire and Emergency Services handles fire incidents, and Events Compliance & Crime Prevention handles event compliance and prevention activities.',
    icon: 'services',
    correctOptionId: 'specialists',
    options: [
      { id: 'specialists', label: 'Traffic matter → Traffic Services\nFire incident → Fire and Emergency Services\nEvent compliance → Events Compliance & Crime Prevention (CCSF)' },
      { id: 'swapped', label: 'Traffic matter → Fire and Emergency Services\nFire incident → Events Compliance\nEvent compliance → Traffic Services' },
      { id: 'investigation-all', label: 'Traffic matter → Investigation\nFire incident → Investigation\nEvent compliance → Investigation' },
    ],
  },

  {
    id: 'reporting-academic-safety',
    topic: 'reporting-routes',
    eyebrow: 'Separate admin from safety',
    title: 'Academic or safety route?',
    character: 'Pretoria Campus Navigator',
    question: 'Which reporting route correctly separates student administration from safety incidents?',
    lesson: 'Student administration uses the Dinokeng Building (Build-21). Safety incidents are reported to the CPS Control Room at Building 4 G-63 or through the Campus Safety App.',
    icon: 'verify',
    correctOptionId: 'split-route',
    options: [
      { id: 'split-route', label: 'Academic/student administration → Dinokeng Building (Build-21)\nCrime and safety incidents → CPS Control Room, Building 4 G-63 / Campus Safety App' },
      { id: 'all-dinokeng', label: 'Academic/student administration → Dinokeng Building (Build-21)\nCrime and safety incidents → Dinokeng Building (Build-21)' },
      { id: 'all-control', label: 'Academic/student administration → CPS Control Room, Building 4 G-63\nCrime and safety incidents → CPS Control Room, Building 4 G-63' },
    ],
  },
  {
    id: 'reporting-physical-digital',
    topic: 'reporting-routes',
    eyebrow: 'Know both incident routes',
    title: 'Physical and digital reporting',
    character: 'Campus Safety App Guide',
    question: 'Which answer correctly shows both approved incident-reporting routes?',
    lesson: 'Incidents can be reported physically at the Control Room or digitally through the Campus Safety App.',
    icon: 'control',
    correctOptionId: 'both-routes',
    options: [
      { id: 'both-routes', label: 'Physical reporting → Control Room, Building 4 G-63\nDigital reporting → Campus Safety App' },
      { id: 'wrong-routes', label: 'Physical reporting → Dinokeng Building (Build-21)\nDigital reporting → Traffic Services' },
      { id: 'fire-routes', label: 'Physical reporting → Fire and Emergency Services\nDigital reporting → Events Compliance' },
    ],
  },
  {
    id: 'reporting-full-route',
    topic: 'reporting-routes',
    eyebrow: 'Build the full route',
    title: 'From need to service',
    character: 'Campus Safety App Navigator',
    question: 'Which complete routing answer is correct?',
    lesson: 'Academic administration goes to Dinokeng Building (Build-21). Incident reporting goes to Control Room or the Campus Safety App. Traffic matters go to Traffic Services. Fire incidents go to Fire and Emergency Services. Events and crime-prevention planning go to Events Compliance & Crime Prevention (CCSF).',
    icon: 'verify',
    correctOptionId: 'full-route',
    options: [
      { id: 'full-route', label: 'Academic/admin → Dinokeng Building (Build-21)\nCrime/safety incident → Control Room / Campus Safety App\nTraffic matter → Traffic Services\nFire incident → Fire and Emergency Services\nEvent compliance/crime prevention → Events Compliance & Crime Prevention (CCSF)' },
      { id: 'all-control', label: 'Academic/admin → Control Room\nTraffic matter → Control Room\nFire incident → Control Room\nEvent compliance → Control Room' },
      { id: 'all-dinokeng', label: 'Academic/admin → Dinokeng Building (Build-21)\nCrime/safety incident → Dinokeng Building (Build-21)\nTraffic matter → Dinokeng Building (Build-21)\nFire incident → Dinokeng Building (Build-21)' },
    ],
  },
];

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number) {
  let state = seed || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function ensureAnswerPositionsVary(plan: QuestCheckpoint[]) {
  const positions = plan.map((question) => question.options.findIndex((option) => option.id === question.correctOptionId));
  if (new Set(positions).size > 1 || plan.length < 2) return plan;

  const next = plan.map((question) => ({ ...question, options: [...question.options] }));
  next[1].options = [...next[1].options.slice(1), next[1].options[0]];
  return next;
}

export function createQuestPlan(seedKey: string): QuestCheckpoint[] {
  const random = createRandom(hashString(`campus-safety-quiz:${seedKey}`));
  const topics = shuffled(QUEST_TOPICS, random);
  const plan = topics.map((topic, missionIndex) => {
    const pool = QUEST_QUESTION_BANK.filter((question) => question.topic === topic);
    const selected = pool[Math.floor(random() * pool.length)];
    const placement = QUEST_POSITIONS[missionIndex];
    return {
      ...selected,
      missionIndex,
      eyebrow: `Mission ${missionIndex + 1} · ${selected.eyebrow}`,
      options: shuffled(selected.options, random),
      position: placement.position,
      runnerPosition: placement.runnerPosition,
    };
  });

  return ensureAnswerPositionsVary(plan);
}
