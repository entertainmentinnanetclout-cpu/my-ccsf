export const TUT_GOVERNANCE = {
  paiaManual: {
    label: 'TUT PAIA Manual 2025',
    href: 'https://www.tut.ac.za/media/tshwane-interim/site-content/documents/TUT_PAIA-Manual-2025.pdf',
    compiled: '2024-08-01',
    issued: '2025-04-08',
  },
  privacyStatement: {
    label: 'TUT Privacy Policy & POPIA',
    href: 'https://www.tut.ac.za/privacy-policy--popia/',
    updated: '2024-01-04',
  },
  regulatorForms: {
    label: 'Information Regulator PAIA forms',
    href: 'https://inforegulator.org.za/paia-forms/',
  },
  informationOfficerEmail: 'paia@tut.ac.za',
  privacyEmail: 'popia@tut.ac.za',
  cybersecurityEmail: 'tut_security_matters@tut.ac.za',
  generalEmail: 'general@tut.ac.za',
} as const;

export type GovernanceProcessingArea = {
  id: string;
  title: string;
  purpose: string;
  data: string[];
  access: string;
  retention: string;
};

export const APP_PROCESSING_AREAS: GovernanceProcessingArea[] = [
  {
    id: 'identity-profile',
    title: 'Identity and campus profile',
    purpose: 'Authenticate the user, establish campus scope and support accountable safety workflows.',
    data: ['Name and student/staff profile identifiers', 'Campus and role', 'Contact details used by authorised workflows'],
    access: 'The signed-in user and authorised institutional roles according to role and campus scope.',
    retention: 'Subject to the TUT Records Management Policy and the approved account/record lifecycle.',
  },
  {
    id: 'case-records',
    title: 'Incident and case records',
    purpose: 'Receive, route, assess, investigate, update and close safety or security cases.',
    data: ['Incident statement and category', 'Case status and timeline', 'Assigned staff actions', 'Authorised escalation records'],
    access: 'The reporting student for their own case and authorised CPS/CCSF or approved institutional roles.',
    retention: 'Final retention period must be confirmed against TUT records-management requirements and any preservation duty.',
  },
  {
    id: 'evidence',
    title: 'Digital evidence',
    purpose: 'Support assessment and investigation of a reported incident.',
    data: ['Photos', 'Video', 'PDF documents', 'File metadata and evidence-access audit records'],
    access: 'Need-to-know authorised roles only. Evidence storage is private by design and access is logged where implemented.',
    retention: 'Evidence must follow the approved case-retention and legal-preservation rules. User-side deletion must not bypass preservation duties.',
  },
  {
    id: 'location',
    title: 'Location and Safety Mobility',
    purpose: 'Support consent-based safety sessions, Campus Radar, incident location and emergency case continuity.',
    data: ['Optional incident coordinates', 'Safety-session location updates', 'Radar visibility preference', 'Accuracy and expiry information'],
    access: 'Controlled by the feature purpose, the user-selected visibility level and authorised safety roles.',
    retention: 'Location should expire or stop according to the active feature and approved retention rule. Tracking must be stoppable by the user where consent is the basis.',
  },
  {
    id: 'technical',
    title: 'Security and technical records',
    purpose: 'Protect the platform, investigate misuse, operate releases and demonstrate security controls.',
    data: ['Authentication and security events', 'Audit records', 'System logs', 'Release and monitoring evidence'],
    access: 'Restricted technical, security and governance roles according to approved responsibility.',
    retention: 'Subject to TUT ICT, cybersecurity, incident-response and records-management requirements.',
  },
];

export const DATA_SUBJECT_RIGHTS = [
  {
    title: 'Access',
    description: 'Request access to personal information or records through the applicable TUT POPIA or PAIA route.',
  },
  {
    title: 'Correction or update',
    description: 'Request correction or updating of inaccurate personal information held by TUT.',
  },
  {
    title: 'Complaint',
    description: 'Raise a privacy complaint with TUT and, where applicable, the Information Regulator.',
  },
  {
    title: 'Withdraw consent',
    description: 'Withdraw consent where consent is the processing basis. Withdrawal does not automatically erase records that TUT must lawfully retain.',
  },
] as const;

export const APPROVED_DISCLOSURE_CATEGORIES = [
  'South African Police Service where a security incident or lawful escalation requires disclosure.',
  'Municipal Traffic Department(s) for authorised traffic and fine-related workflows.',
  'Other recipients only where a lawful basis, approved purpose and institutional authority exist.',
] as const;

export const CURRENT_TECHNICAL_PROVIDERS = [
  {
    name: 'Supabase',
    role: 'Current application database, authentication, object-storage and server-function platform.',
    status: 'Technical provider in the current implementation; institutional production approval, region, operator terms and transborder assessment remain subject to TUT review.',
  },
  {
    name: 'Vercel',
    role: 'Current web application delivery and preview/deployment platform.',
    status: 'Technical provider in the current implementation; institutional production approval, service terms and hosting requirements remain subject to TUT review.',
  },
] as const;

export const INSTITUTIONAL_GOVERNANCE_VERSION = '2026-09-12';
