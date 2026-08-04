export type QuestIconName =
  | 'student'
  | 'fraud'
  | 'verify'
  | 'prevention'
  | 'investigation'
  | 'office'
  | 'services'
  | 'control';

export interface QuestOption {
  id: string;
  label: string;
  correct?: boolean;
}

export interface QuestCheckpoint {
  id: string;
  eyebrow: string;
  title: string;
  character: string;
  question: string;
  lesson: string;
  icon: QuestIconName;
  position: { x: number; y: number };
  runnerPosition: { x: number; y: number };
  options: QuestOption[];
}

export const CPS_AREAS = [
  'Traffic',
  'Crime Prevention',
  'Investigation',
  'Disciplinary',
  'Engineering & Technology',
  'Control',
] as const;

export const QUEST_CHECKPOINTS: QuestCheckpoint[] = [
  {
    id: 'meet-cps',
    eyebrow: 'Checkpoint 1 · Orientation',
    title: 'Meet your safety network',
    character: 'Student Guide',
    question: 'Which list correctly names the service areas within CPS?',
    lesson:
      'CPS brings together Traffic, Crime Prevention, Investigation, Disciplinary, Engineering & Technology, and Control.',
    icon: 'student',
    position: { x: 10, y: 66 },
    runnerPosition: { x: 10, y: 86 },
    options: [
      {
        id: 'all-cps-areas',
        label:
          'Traffic; Crime Prevention; Investigation; Disciplinary; Engineering & Technology; Control',
        correct: true,
      },
      { id: 'academic-list', label: 'Admissions; Library; Finance; Housing; Sports; Control' },
      { id: 'emergency-only', label: 'Control is the only CPS service area' },
    ],
  },
  {
    id: 'protect-access',
    eyebrow: 'Checkpoint 2 · Fraud signal',
    title: 'Protect your account',
    character: 'Unverified Service Seller',
    question:
      'Someone says they can “verify” your student account, but first they need your password, one-time code, and an immediate payment. What should you do?',
    lesson:
      'Passwords and one-time codes protect your identity. Stop, share nothing, verify the service through an official channel, and report the approach if it appears fraudulent.',
    icon: 'fraud',
    position: { x: 21, y: 64 },
    runnerPosition: { x: 21, y: 86 },
    options: [
      {
        id: 'stop-verify-report',
        label: 'Share nothing, verify through an official channel, and report the approach',
        correct: true,
      },
      { id: 'send-code', label: 'Send the one-time code, but change the password afterward' },
      { id: 'pay-small', label: 'Make a small payment first to test whether the service is real' },
    ],
  },
  {
    id: 'test-the-offer',
    eyebrow: 'Checkpoint 3 · Pause and check',
    title: 'Test the offer',
    character: 'Verification Terminal',
    question: 'Which combination is the strongest warning that a student service may be fraudulent?',
    lesson:
      'Pressure, guarantees, requests for secret credentials, and payment to a personal or unverified account are powerful reasons to stop and verify.',
    icon: 'verify',
    position: { x: 39, y: 53 },
    runnerPosition: { x: 39, y: 86 },
    options: [
      {
        id: 'pressure-guarantee-payment',
        label: 'A guaranteed result, urgent pressure, and payment to an unverified personal account',
        correct: true,
      },
      { id: 'official-details', label: 'Clear terms, an official contact path, and time to verify the information' },
      { id: 'written-receipt', label: 'A normal receipt that matches the official service and payment channel' },
    ],
  },
  {
    id: 'crime-prevention',
    eyebrow: 'Checkpoint 4 · Learn before harm',
    title: 'Crime Prevention',
    character: 'Prevention Educator',
    question: 'What is the best description of Crime Prevention within CPS?',
    lesson:
      'Crime Prevention helps students understand risks and use practical habits that can reduce opportunities for harm and fraud.',
    icon: 'prevention',
    position: { x: 48, y: 64 },
    runnerPosition: { x: 48, y: 86 },
    options: [
      { id: 'education-risk-reduction', label: 'Education, awareness, and practical steps that help reduce risk', correct: true },
      { id: 'academic-grades', label: 'Changing grades and academic records' },
      { id: 'private-payments', label: 'Collecting private payments for faster campus services' },
    ],
  },
  {
    id: 'preserve-details',
    eyebrow: 'Checkpoint 5 · Useful evidence',
    title: 'Help an investigation',
    character: 'CPS Investigator',
    question: 'You receive a suspicious service message. Which action best supports a later investigation?',
    lesson:
      'Keep useful details such as messages, screenshots, contact information, dates, and times. Report promptly; do not put yourself at risk by confronting the person.',
    icon: 'investigation',
    position: { x: 64, y: 63 },
    runnerPosition: { x: 64, y: 86 },
    options: [
      { id: 'preserve-and-report', label: 'Preserve messages and screenshots, note dates and details, then report promptly', correct: true },
      { id: 'delete-everything', label: 'Delete every message immediately so nobody can see it' },
      { id: 'confront', label: 'Arrange a private meeting and confront the person yourself' },
    ],
  },
  {
    id: 'find-cps',
    eyebrow: 'Checkpoint 6 · Know the location',
    title: 'Find the CPS office',
    character: 'Office Wayfinder',
    question: 'Where can students find the CPS office?',
    lesson: 'The CPS office is in Building 4, room G-51.',
    icon: 'office',
    position: { x: 68, y: 30 },
    runnerPosition: { x: 68, y: 86 },
    options: [
      { id: 'building-4-g51', label: 'Building 4, G-51', correct: true },
      { id: 'building-4-g63', label: 'Building 4, G-63' },
      { id: 'online-only', label: 'CPS has no physical office' },
    ],
  },
  {
    id: 'route-the-need',
    eyebrow: 'Checkpoint 7 · One connected service',
    title: 'Route the need',
    character: 'CPS Control Officer',
    question: 'Which routing guide correctly matches three CPS service areas?',
    lesson:
      'Traffic addresses traffic-related needs, Engineering & Technology supports safety systems and technology, and Disciplinary handles the disciplinary function.',
    icon: 'services',
    position: { x: 79, y: 64 },
    runnerPosition: { x: 79, y: 86 },
    options: [
      {
        id: 'correct-routing',
        label: 'Traffic → traffic issue; Engineering & Technology → safety system; Disciplinary → disciplinary matter',
        correct: true,
      },
      { id: 'reversed-routing', label: 'Traffic → grades; Engineering & Technology → food service; Disciplinary → Wi-Fi password sales' },
      { id: 'all-investigation', label: 'Every need must go directly to Investigation' },
    ],
  },
  {
    id: 'report-to-control',
    eyebrow: 'Checkpoint 8 · Ready to report',
    title: 'Reach Control',
    character: 'Control Desk',
    question: 'Where should a student go to report to Control?',
    lesson:
      'Control is in Building 4, room G-63. Knowing both locations helps: CPS office—G-51; Control/reporting—G-63.',
    icon: 'control',
    position: { x: 91, y: 53 },
    runnerPosition: { x: 91, y: 86 },
    options: [
      { id: 'control-g63', label: 'Control, Building 4, G-63', correct: true },
      { id: 'office-g51', label: 'CPS office, Building 4, G-51' },
      { id: 'seller', label: 'Report only to the person who offered the service' },
    ],
  },
];

export const QUEST_TOTAL = QUEST_CHECKPOINTS.length;
