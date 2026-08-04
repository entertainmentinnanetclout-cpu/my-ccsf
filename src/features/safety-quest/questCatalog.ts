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
  'ccsf-cps',
  'admin-services',
  'wellbeing',
  'fraud-awareness',
  'reporting-evidence',
  'personal-safety',
  'cps-routing',
  'campus-navigation',
] as const;

export type QuestTopic = (typeof QUEST_TOPICS)[number];

export const QUEST_TOPIC_LABELS: Record<QuestTopic, string> = {
  'ccsf-cps': 'CCSF & CPS',
  'admin-services': 'Student admin',
  wellbeing: 'Mental health support',
  'fraud-awareness': 'Fraud awareness',
  'reporting-evidence': 'Reporting & evidence',
  'personal-safety': 'Personal safety',
  'cps-routing': 'CPS service routing',
  'campus-navigation': 'Campus navigation',
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

export const CPS_AREAS = [
  'Traffic',
  'Crime Prevention',
  'Investigation',
  'Disciplinary',
  'Engineering & Technology',
  'Control',
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
 * Data-first question bank. Keep content separate from presentation so a future
 * Developer Dashboard can replace or manage this source without rewriting the game.
 */
export const QUEST_QUESTION_BANK: QuestQuestion[] = [
  {
    id: 'ccsf-purpose',
    topic: 'ccsf-cps',
    eyebrow: 'Know the safety network',
    title: 'What CCSF actually does',
    character: 'CCSF Safety Ambassador',
    question: 'Which statement best describes the role of CCSF at TUT?',
    lesson: 'CCSF focuses on campus crime prevention, student safety awareness and safer behaviour while working with CPS. It does not replace CPS operational response or student administration.',
    icon: 'prevention',
    correctOptionId: 'prevention-awareness',
    options: [
      { id: 'prevention-awareness', label: 'Promote crime prevention and safety awareness, and connect students to the correct safety channels' },
      { id: 'replace-cps', label: 'Replace CPS and personally respond to every reported incident' },
      { id: 'academic-admin', label: 'Process registrations, academic records and proof-of-registration requests' },
    ],
  },
  {
    id: 'ccsf-vs-cps',
    topic: 'ccsf-cps',
    eyebrow: 'Know the difference',
    title: 'CCSF or CPS?',
    character: 'Campus Safety Guide',
    question: 'A student asks how CCSF and CPS differ. Which answer is the most accurate?',
    lesson: 'CCSF is prevention- and awareness-focused. CPS is the institutional protection service responsible for operational safety functions, reporting and response pathways.',
    icon: 'student',
    correctOptionId: 'ccsf-prevention-cps-operations',
    options: [
      { id: 'same-office', label: 'They are the same unit with different names' },
      { id: 'ccsf-prevention-cps-operations', label: 'CCSF focuses on prevention and awareness; CPS handles institutional protection and operational safety functions' },
      { id: 'ccsf-admin', label: 'CCSF handles academic administration while CPS handles counselling' },
    ],
  },
  {
    id: 'cps-areas',
    topic: 'ccsf-cps',
    eyebrow: 'Know the structure',
    title: 'Inside CPS',
    character: 'CPS Orientation Officer',
    question: 'Which list contains the CPS service areas taught in the CCSF Safety Quest?',
    lesson: 'The CPS service areas covered here are Traffic, Crime Prevention, Investigation, Disciplinary, Engineering & Technology, and Control.',
    icon: 'services',
    correctOptionId: 'six-cps-areas',
    options: [
      { id: 'student-admin-set', label: 'Admissions, Student Counselling, Library, Residence, Finance and Records' },
      { id: 'six-cps-areas', label: 'Traffic, Crime Prevention, Investigation, Disciplinary, Engineering & Technology, and Control' },
      { id: 'control-only', label: 'Control only; all other safety functions are external' },
    ],
  },

  {
    id: 'admin-building-21',
    topic: 'admin-services',
    eyebrow: 'Find the right office',
    title: 'Student administration',
    character: 'TUT Student Services Guide',
    question: 'You need help with registration, proof of registration or an academic record. Where should you go?',
    lesson: 'For these student administration needs at Pretoria West, go to Building 21.',
    icon: 'office',
    correctOptionId: 'building-21',
    options: [
      { id: 'control-g63', label: 'Control, Building 4, G-63' },
      { id: 'building-21', label: 'Building 21' },
      { id: 'cps-g51', label: 'CPS office, Building 4, G-51' },
    ],
  },
  {
    id: 'admin-service-set',
    topic: 'admin-services',
    eyebrow: 'Route admin correctly',
    title: 'What belongs at Building 21?',
    character: 'Student Administration Guide',
    question: 'Which group of requests is correctly routed to Building 21?',
    lesson: 'Building 21 is the student administration route for registration assistance, proof of registration, academic records and related admin support.',
    icon: 'office',
    correctOptionId: 'registration-records',
    options: [
      { id: 'registration-records', label: 'Registration assistance, proof of registration and academic records' },
      { id: 'mental-health', label: 'Counselling for anxiety, stress and emotional wellbeing' },
      { id: 'safety-report', label: 'Reporting an immediate campus safety incident to Control' },
    ],
  },
  {
    id: 'admin-not-safety',
    topic: 'admin-services',
    eyebrow: 'Do not mix services',
    title: 'Admin vs safety',
    character: 'Campus Wayfinder',
    question: 'A student has an academic-record query and also wants to report a suspicious person. What is the best routing?',
    lesson: 'Use Building 21 for the academic-record query and the appropriate CPS/Control reporting path for the safety concern. Do not treat one office as a catch-all.',
    icon: 'verify',
    correctOptionId: 'split-routing',
    options: [
      { id: 'building21-both', label: 'Take both matters only to Building 21' },
      { id: 'split-routing', label: 'Use Building 21 for the record query and CPS/Control for the safety report' },
      { id: 'social-media', label: 'Ask an unofficial social-media contact to solve both matters' },
    ],
  },

  {
    id: 'wellbeing-counselling',
    topic: 'wellbeing',
    eyebrow: 'Know where support lives',
    title: 'Mental health support',
    character: 'Student Wellbeing Guide',
    question: 'A student needs support for stress, anxiety, emotional pressure or another mental-health concern. Which department is the correct support route?',
    lesson: 'Student Counselling is the appropriate TUT support department for mental-health and emotional-wellbeing assistance.',
    icon: 'student',
    correctOptionId: 'student-counselling',
    options: [
      { id: 'building21-admin', label: 'Building 21 student administration' },
      { id: 'student-counselling', label: 'Student Counselling' },
      { id: 'traffic', label: 'CPS Traffic' },
    ],
  },
  {
    id: 'wellbeing-friend',
    topic: 'wellbeing',
    eyebrow: 'Support a fellow student',
    title: 'When a friend is struggling',
    character: 'Peer Support Guide',
    question: 'A friend tells you they are overwhelmed and want professional support. What is the best next step?',
    lesson: 'Take the concern seriously, be supportive and encourage the student to use Student Counselling rather than relying on unverified advice or ignoring the problem.',
    icon: 'student',
    correctOptionId: 'support-counselling',
    options: [
      { id: 'ignore', label: 'Tell them to ignore it until exams are over' },
      { id: 'unverified-help', label: 'Send them to an unverified person advertising paid counselling in a chat group' },
      { id: 'support-counselling', label: 'Support them and direct them to Student Counselling for professional assistance' },
    ],
  },
  {
    id: 'wellbeing-routing',
    topic: 'wellbeing',
    eyebrow: 'Separate support needs',
    title: 'Three needs, three routes',
    character: 'Student Support Navigator',
    question: 'Which routing combination is correct?',
    lesson: 'Mental-health support goes to Student Counselling, student admin documents go to Building 21, and campus safety reports use CPS/Control channels.',
    icon: 'services',
    correctOptionId: 'three-way-route',
    options: [
      { id: 'three-way-route', label: 'Mental health → Student Counselling; academic record → Building 21; safety report → CPS/Control' },
      { id: 'all-building21', label: 'Mental health, academic records and safety reports → Building 21' },
      { id: 'all-control', label: 'Mental health, academic records and registration → Control' },
    ],
  },

  {
    id: 'fraud-credentials',
    topic: 'fraud-awareness',
    eyebrow: 'Protect your identity',
    title: 'Password and OTP trap',
    character: 'Unverified Service Seller',
    question: 'Someone claims they can fix your student account if you send your password, one-time code and payment. What should you do?',
    lesson: 'Never share passwords or one-time codes. Stop the interaction, verify the service through an official channel and report suspicious conduct with evidence.',
    icon: 'fraud',
    correctOptionId: 'stop-verify-report',
    options: [
      { id: 'small-payment', label: 'Pay a small amount first to test whether the person is legitimate' },
      { id: 'stop-verify-report', label: 'Share nothing, verify through an official channel and report the suspicious approach' },
      { id: 'otp-only', label: 'Share only the one-time code because it expires quickly' },
    ],
  },
  {
    id: 'fraud-marks-records',
    topic: 'fraud-awareness',
    eyebrow: 'Spot fake admin services',
    title: 'Marks and records scam',
    character: 'Fraud Awareness Guide',
    question: 'A person offers to change marks or produce an academic record for a private payment. Which response is safest?',
    lesson: 'Do not buy unofficial academic services. Preserve the messages or screenshots, use official TUT administration channels and report suspected fraudulent activity.',
    icon: 'fraud',
    correctOptionId: 'preserve-official-report',
    options: [
      { id: 'negotiate', label: 'Negotiate the price before deciding' },
      { id: 'preserve-official-report', label: 'Preserve evidence, use official TUT channels and report the suspected fraud' },
      { id: 'send-student-card', label: 'Send your student card first so they can prove they have access' },
    ],
  },
  {
    id: 'fraud-pressure',
    topic: 'fraud-awareness',
    eyebrow: 'Read the warning signs',
    title: 'Urgency is a signal',
    character: 'Verification Terminal',
    question: 'Which combination should make you stop and verify a student service before doing anything else?',
    lesson: 'Guaranteed results, urgent pressure, secret credentials and payment to an unverified personal account are strong fraud warning signs.',
    icon: 'verify',
    correctOptionId: 'pressure-private-payment',
    options: [
      { id: 'official-process', label: 'An official office, clear process and verifiable institutional contact details' },
      { id: 'pressure-private-payment', label: 'Guaranteed result, urgent payment to a personal account and a request for secret credentials' },
      { id: 'normal-queue', label: 'A normal service queue with no demand for passwords or private payment' },
    ],
  },

  {
    id: 'evidence-preserve',
    topic: 'reporting-evidence',
    eyebrow: 'Make evidence useful',
    title: 'Preserve the trail',
    character: 'CPS Investigator',
    question: 'You receive suspicious messages about a paid campus service. What evidence is most useful to preserve?',
    lesson: 'Keep screenshots or messages, contact details, dates, times and relevant transaction information. Report promptly and avoid confronting the person yourself.',
    icon: 'investigation',
    correctOptionId: 'screenshots-details',
    options: [
      { id: 'screenshots-details', label: 'Messages or screenshots, contact details, dates, times and relevant payment information' },
      { id: 'delete-all', label: 'Delete everything immediately so the sender cannot trace you' },
      { id: 'confront-alone', label: 'Arrange a private meeting so you can confront the person before reporting' },
    ],
  },
  {
    id: 'report-control-location',
    topic: 'reporting-evidence',
    eyebrow: 'Know the reporting point',
    title: 'Reach Control',
    character: 'Control Desk Guide',
    question: 'Where should a student go when they need the Control reporting point taught in this Safety Quest?',
    lesson: 'Control is in Building 4, room G-63.',
    icon: 'control',
    correctOptionId: 'control-g63',
    options: [
      { id: 'building21', label: 'Building 21' },
      { id: 'cps-g51', label: 'Building 4, G-51' },
      { id: 'control-g63', label: 'Building 4, G-63' },
    ],
  },
  {
    id: 'report-office-vs-control',
    topic: 'reporting-evidence',
    eyebrow: 'Know both safety locations',
    title: 'Office or Control?',
    character: 'CPS Wayfinder',
    question: 'Which location pair is correct?',
    lesson: 'The CPS office is Building 4, G-51. Control/reporting is Building 4, G-63.',
    icon: 'office',
    correctOptionId: 'g51-g63',
    options: [
      { id: 'reversed', label: 'CPS office → G-63; Control → G-51' },
      { id: 'g51-g63', label: 'CPS office → G-51; Control/reporting → G-63' },
      { id: 'both-building21', label: 'CPS office and Control → Building 21' },
    ],
  },

  {
    id: 'personal-followed',
    topic: 'personal-safety',
    eyebrow: 'Think before confronting',
    title: 'If you feel followed',
    character: 'Safety Awareness Guide',
    question: 'You believe someone is following you on campus. Which action is the safest first move?',
    lesson: 'Move toward a populated, well-lit or staffed area, stay alert and seek official or trusted help. Avoid isolating yourself or confronting the person alone.',
    icon: 'prevention',
    correctOptionId: 'move-to-safe-area',
    options: [
      { id: 'confront', label: 'Turn into an isolated area and confront the person directly' },
      { id: 'move-to-safe-area', label: 'Move toward a populated or staffed area and seek official or trusted help' },
      { id: 'ignore-phone', label: 'Put on headphones, look down at your phone and continue as normal' },
    ],
  },
  {
    id: 'personal-night-route',
    topic: 'personal-safety',
    eyebrow: 'Reduce opportunity for harm',
    title: 'Safer movement after dark',
    character: 'Crime Prevention Educator',
    question: 'Which travel habit best reduces risk when moving around campus after dark?',
    lesson: 'Prefer well-lit, active routes, stay aware of your surroundings and where practical move with others or keep a trusted person informed.',
    icon: 'prevention',
    correctOptionId: 'lit-aware',
    options: [
      { id: 'isolated-shortcut', label: 'Take the quietest shortcut because it is faster' },
      { id: 'lit-aware', label: 'Use well-lit active routes, stay aware and use a buddy or trusted check-in where practical' },
      { id: 'headphones', label: 'Use noise-cancelling headphones so distractions are blocked out' },
    ],
  },
  {
    id: 'personal-belongings',
    topic: 'personal-safety',
    eyebrow: 'Protect what attracts theft',
    title: 'Device and bag awareness',
    character: 'CCSF Awareness Volunteer',
    question: 'Which habit is strongest for reducing opportunistic theft risk on campus?',
    lesson: 'Keep valuable devices controlled, close bags properly and stay aware in busy areas rather than leaving items exposed or unattended.',
    icon: 'student',
    correctOptionId: 'secure-aware',
    options: [
      { id: 'leave-charging', label: 'Leave a phone unattended while it charges because cameras are nearby' },
      { id: 'open-bag', label: 'Keep your bag open so you can reach items more quickly' },
      { id: 'secure-aware', label: 'Keep valuables controlled, bags secured and stay aware in crowded areas' },
    ],
  },

  {
    id: 'cps-route-three',
    topic: 'cps-routing',
    eyebrow: 'Route the function',
    title: 'Match the CPS area',
    character: 'CPS Control Officer',
    question: 'Which CPS routing combination is correct?',
    lesson: 'Traffic handles traffic-related matters, Engineering & Technology supports safety systems and technology, and Disciplinary handles the disciplinary function.',
    icon: 'services',
    correctOptionId: 'correct-routing',
    options: [
      { id: 'correct-routing', label: 'Traffic → traffic issue; Engineering & Technology → safety system; Disciplinary → disciplinary matter' },
      { id: 'wrong-routing', label: 'Traffic → academic record; Engineering & Technology → counselling; Disciplinary → registration' },
      { id: 'investigation-all', label: 'Every issue must be sent directly to Investigation' },
    ],
  },
  {
    id: 'cps-prevention-investigation',
    topic: 'cps-routing',
    eyebrow: 'Prevention or investigation?',
    title: 'Before harm vs after an incident',
    character: 'CPS Orientation Guide',
    question: 'Which statement best distinguishes Crime Prevention from Investigation?',
    lesson: 'Crime Prevention focuses on awareness and reducing opportunities for harm. Investigation focuses on examining incidents and evidence after a matter has occurred or been reported.',
    icon: 'investigation',
    correctOptionId: 'prevention-vs-investigation',
    options: [
      { id: 'same-function', label: 'They are identical functions with different names' },
      { id: 'prevention-vs-investigation', label: 'Crime Prevention reduces risk before harm; Investigation examines incidents and evidence after a matter is reported' },
      { id: 'academic-functions', label: 'Crime Prevention changes marks; Investigation issues proof of registration' },
    ],
  },
  {
    id: 'cps-control-role',
    topic: 'cps-routing',
    eyebrow: 'Understand Control',
    title: 'Why Control matters',
    character: 'Control Desk Officer',
    question: 'In the Safety Quest, what is the best reason for learning the Control route?',
    lesson: 'Students should know a clear institutional reporting point instead of depending on unofficial contacts or trying to handle safety matters alone.',
    icon: 'control',
    correctOptionId: 'official-reporting-point',
    options: [
      { id: 'official-reporting-point', label: 'So students know an official reporting route for campus safety concerns' },
      { id: 'academic-records', label: 'So students can obtain academic records more quickly' },
      { id: 'private-sales', label: 'So private service sellers can be verified informally' },
    ],
  },

  {
    id: 'navigation-cps-office',
    topic: 'campus-navigation',
    eyebrow: 'Know the physical route',
    title: 'Find the CPS office',
    character: 'Campus Wayfinder',
    question: 'Where is the CPS office location taught in this Safety Quest?',
    lesson: 'The CPS office is in Building 4, room G-51.',
    icon: 'office',
    correctOptionId: 'cps-office-g51',
    options: [
      { id: 'building21', label: 'Building 21' },
      { id: 'cps-office-g51', label: 'Building 4, G-51' },
      { id: 'control-g63', label: 'Building 4, G-63' },
    ],
  },
  {
    id: 'navigation-three-needs',
    topic: 'campus-navigation',
    eyebrow: 'Navigate by need',
    title: 'Choose the correct destination',
    character: 'TUT Navigation Guide',
    question: 'Which routing set is correct for Pretoria West?',
    lesson: 'Building 21 handles the listed student administration needs, Student Counselling supports mental wellbeing, and Control is the safety reporting route taught here.',
    icon: 'verify',
    correctOptionId: 'admin-counselling-control',
    options: [
      { id: 'admin-counselling-control', label: 'Proof of registration → Building 21; mental-health support → Student Counselling; safety report → Control' },
      { id: 'all-g51', label: 'Proof of registration, counselling and safety reports → CPS office G-51' },
      { id: 'all-building21', label: 'Proof of registration, counselling and safety reports → Building 21' },
    ],
  },
  {
    id: 'navigation-official-route',
    topic: 'campus-navigation',
    eyebrow: 'Verify before you trust',
    title: 'Official route beats shortcuts',
    character: 'Student Services Navigator',
    question: 'You are unsure where to get an academic record and someone in a chat group offers a paid shortcut. What is the best response?',
    lesson: 'Use the official student administration route at Building 21 and verify services through institutional channels instead of paying an unofficial contact.',
    icon: 'fraud',
    correctOptionId: 'building21-official',
    options: [
      { id: 'paid-shortcut', label: 'Use the paid shortcut if the person has testimonials' },
      { id: 'building21-official', label: 'Use Building 21 and verify through official TUT channels' },
      { id: 'share-login', label: 'Share your login so the person can check the record first' },
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
  const random = createRandom(hashString(`ccsf-safety-quest:${seedKey}`));
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
