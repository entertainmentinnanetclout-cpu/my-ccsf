import fs from 'node:fs';

const file = 'src/components/pilot/PilotSuperAdminDashboard.tsx';
let source = fs.readFileSync(file, 'utf8');

const marker = 'data-super-admin-student-case-migration="complete"';
if (source.includes(marker)) {
  console.log('Super-admin student case migration already applied.');
  process.exit(0);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Migration anchor missing: ${label}`);
  }
  source = source.replace(search, replacement);
}

function replaceRegex(pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Migration pattern missing: ${label}`);
  }
  source = source.replace(pattern, replacement);
}

replaceOnce(
  "import { useCallback, useEffect, useMemo, useState } from 'react';\n",
  "import { useCallback, useEffect, useMemo, useState } from 'react';\nimport { useNavigate } from 'react-router-dom';\n",
  'router import',
);

replaceOnce(
  "  CheckCircle2,\n  Database,\n",
  "  CheckCircle2,\n  ChevronRight,\n  Database,\n",
  'chevron icon',
);
replaceOnce(
  "  FileText,\n  History,\n",
  "  FileText,\n  GraduationCap,\n  History,\n",
  'graduation icon',
);
replaceOnce(
  "  Loader2,\n  MessageSquarePlus,\n",
  "  Loader2,\n  Mail,\n  MapPin,\n  MessageSquarePlus,\n",
  'mail and map icons',
);
replaceOnce(
  "  Pause,\n  Play,\n",
  "  Pause,\n  Phone,\n  Play,\n",
  'phone icon',
);

replaceOnce(
  "} from '@/services/pilot/pilotAdminService';\nimport { CAMPUS_LABELS, PILOT_CAMPUS_VALUES, PILOT_STATUS_LABELS } from '@/config/pilot';\n",
  "} from '@/services/pilot/pilotAdminService';\nimport {\n  getPilotStudentName,\n  loadPilotStudentIdentities,\n  type PilotStudentIdentity,\n} from '@/services/pilot/pilotProfileService';\nimport { CAMPUS_LABELS, PILOT_CAMPUS_VALUES, PILOT_ROUTES, PILOT_STATUS_LABELS } from '@/config/pilot';\n",
  'student identity service',
);

replaceOnce(
  "export function PilotSuperAdminDashboard() {\n  const { userProfile } = useAuth();\n",
  "export function PilotSuperAdminDashboard() {\n  const navigate = useNavigate();\n  const { userProfile } = useAuth();\n",
  'navigate hook',
);

replaceOnce(
  "  const [data, setData] = useState<PilotAdminData>(EMPTY_DATA);\n",
  "  const [data, setData] = useState<PilotAdminData>(EMPTY_DATA);\n  const [studentIdentities, setStudentIdentities] = useState<PilotStudentIdentity[]>([]);\n",
  'student identity state',
);

replaceOnce(
  "      const next = await loadPilotAdminData({ programId });\n      setData(next);\n",
  "      const next = await loadPilotAdminData({ programId });\n      const identities = await loadPilotStudentIdentities(next.participants.map((item) => item.user_id));\n      setData(next);\n      setStudentIdentities(identities);\n",
  'load student identities',
);

replaceOnce(
  "'pilot_feature_tests', 'pilot_audit_logs'] as const)",
  "'pilot_feature_tests', 'pilot_audit_logs', 'profiles'] as const)",
  'profile realtime subscription',
);

replaceOnce(
  "  const selectedProgram = useMemo<PilotProgram | null>(\n",
  "  const identityByUserId = useMemo(\n    () => new Map(studentIdentities.map((identity) => [identity.id, identity])),\n    [studentIdentities],\n  );\n\n  const selectedProgram = useMemo<PilotProgram | null>(\n",
  'identity lookup',
);

replaceRegex(
  /  const filteredReports = useMemo\(\(\) => data\.reports\.filter\(\(report\) => \{[\s\S]*?  \}\), \[data\.reports, search, statusFilter, campusFilter\]\);\n/,
  `  const filteredReports = useMemo(() => data.reports.filter((report) => {
    const query = search.trim().toLowerCase();
    const identity = identityByUserId.get(report.submitted_by);
    const studentText = [
      getPilotStudentName(identity, report.submitted_by),
      identity?.student_number,
      identity?.email,
      identity?.phone_number,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !query
      || report.reference_number.toLowerCase().includes(query)
      || report.title.toLowerCase().includes(query)
      || report.category.toLowerCase().includes(query)
      || (report.location_description ?? '').toLowerCase().includes(query)
      || studentText.includes(query);
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesCampus = campusFilter === 'all' || report.campus === campusFilter;
    return matchesSearch && matchesStatus && matchesCampus;
  }), [data.reports, identityByUserId, search, statusFilter, campusFilter]);
`,
  'student-aware report filtering',
);

replaceOnce(
  "{ view: 'participants', icon: Users, label: 'Participants' },",
  "{ view: 'participants', icon: Users, label: 'Students' },",
  'students navigation label',
);

replaceOnce(
  '<div className="min-h-[calc(100vh-12rem)] space-y-6" data-testid="ready-pilot-super-admin-parity">',
  `<div className="min-h-[calc(100vh-12rem)] space-y-6" data-testid="ready-pilot-super-admin-parity" ${marker}>`,
  'migration marker',
);

for (const [search, replacement, label] of [
  ['<Metric icon={Users} label="Participants" value={data.participants.length} />', '<Metric icon={Users} label="Students" value={data.participants.length} />', 'overview students metric'],
  ['<CampusStat label="Participants" value={summary.participants} />', '<CampusStat label="Students" value={summary.participants} />', 'campus students metric'],
  ['<CampusStat label="Participants" value={data.participants.length} />', '<CampusStat label="Students" value={data.participants.length} />', 'programme students metric'],
  ['placeholder="Search reference, title or category"', 'placeholder="Search case, student, email, phone or location"', 'student-aware search copy'],
  ['<CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Invite Participant</CardTitle>', '<CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Invite Student</CardTitle>', 'invite student title'],
  ["'Select one programme before inviting participants.'", "'Select one programme before inviting students.'", 'invite students description'],
  ["toast({ title: 'Pilot participant invited' });", "toast({ title: 'Pilot student invited' });", 'invite student toast'],
  ["toast({ title: `Participant marked ${status}` });", "toast({ title: `Student marked ${status}` });", 'student status toast'],
  ["toast({ title: 'Participant update failed'", "toast({ title: 'Student update failed'", 'student status error'],
  ['<CardTitle>Pilot Participant Register</CardTitle><CardDescription>Programme status, campus allocation and controlled removal.</CardDescription>', '<CardTitle>Pilot Student Register</CardTitle><CardDescription>Registered names, student details, programme status, campus allocation and controlled removal.</CardDescription>', 'student register title'],
  ['title="No participants in scope"', 'title="No students in scope"', 'empty student register title'],
  ['description="Feature validation events appear after participant testing."', 'description="Feature validation events appear after student testing."', 'student testing copy'],
]) {
  replaceOnce(search, replacement, label);
}

const oldOverviewRows = `<CardContent className="space-y-3">{activeReports.slice(0, 8).map((report) => <ReportRow key={report.id} report={report} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!activeReports.length && <EmptyState title="No active Pilot cases" description="Student simulations will appear here in realtime." />}</CardContent>`;
const newOverviewRows = `<CardContent className="space-y-3">{activeReports.slice(0, 8).map((report) => <ReportRow key={report.id} report={report} identity={identityByUserId.get(report.submitted_by)} onOpen={() => navigate(PILOT_ROUTES.report(report.id))} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!activeReports.length && <EmptyState title="No active Pilot cases" description="Student simulations will appear here in realtime." />}</CardContent>`;
replaceOnce(oldOverviewRows, newOverviewRows, 'openable overview reports');

const oldOperationRows = `<div className="space-y-3">{filteredReports.map((report) => <ReportRow key={report.id} report={report} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!filteredReports.length && <EmptyState title="No reports match the filters" description="Change the programme, campus, status or search query." />}</div>`;
const newOperationRows = `<div className="space-y-3">{filteredReports.map((report) => <ReportRow key={report.id} report={report} identity={identityByUserId.get(report.submitted_by)} onOpen={() => navigate(PILOT_ROUTES.report(report.id))} onAdvance={moveReport} onNote={() => beginAction(report, 'note')} onNotify={() => beginAction(report, 'notify')} />)}{!filteredReports.length && <EmptyState title="No reports match the filters" description="Change the programme, campus, status or search query." />}</div>`;
replaceOnce(oldOperationRows, newOperationRows, 'openable operations reports');

replaceOnce(
  '<CardDescription>Newest active simulations across all authorised campuses.</CardDescription>',
  '<CardDescription>Tap any incident card to open the full student profile, readable location, evidence and case timeline.</CardDescription>',
  'openable case guidance',
);
replaceOnce(
  '<CardHeader><CardTitle>Cross-Campus Pilot Operations</CardTitle><CardDescription>Global triage and lifecycle controls affect only isolated Pilot records.</CardDescription></CardHeader>',
  '<CardHeader><CardTitle>Cross-Campus Pilot Operations</CardTitle><CardDescription>Tap a case for full details. Global triage and lifecycle controls affect only isolated Pilot records.</CardDescription></CardHeader>',
  'operations case guidance',
);

replaceRegex(
  /            <CardContent className="space-y-3">\{data\.participants\.map\(\(participant\) => <div key=\{participant\.id\}[\s\S]*?<\/CardContent>\n          <\/Card>/,
  `            <CardContent className="space-y-3">
              {data.participants.map((student) => {
                const identity = identityByUserId.get(student.user_id);
                return (
                  <div key={student.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="font-semibold">{getPilotStudentName(identity, student.user_id)}</p>
                      <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                        <p className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />{identity?.student_number || 'Student number not supplied'}</p>
                        <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{identity?.email || 'Email not supplied'}</p>
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{identity?.phone_number || 'Phone not supplied'}</p>
                        <p>{identity?.course || 'Course not supplied'}{identity?.year_of_study ? ` · Year ${identity.year_of_study}` : ''}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{CAMPUS_LABELS[student.campus]} · invited {formatDate(student.invited_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{student.status}</Badge>
                      {student.status === 'removed'
                        ? <Button size="sm" variant="outline" onClick={() => void setParticipantStatus(student, 'invited')}>Restore invitation</Button>
                        : <Button size="sm" variant="destructive" onClick={() => void setParticipantStatus(student, 'removed')}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>}
                    </div>
                  </div>
                );
              })}
              {!data.participants.length && <EmptyState title="No students in scope" description="Select a programme or invite its first student." />}
            </CardContent>
          </Card>`,
  'named student register',
);

replaceRegex(
  /function ReportRow\(\{ report, onAdvance, onNote, onNotify \}: \{ report: PilotReport; onAdvance: \(report: PilotReport\) => Promise<void>; onNote: \(\) => void; onNotify: \(\) => void \}\) \{[\s\S]*?\n\}\n\nfunction EmptyState/,
  `function ReportRow({
  report,
  identity,
  onOpen,
  onAdvance,
  onNote,
  onNotify,
}: {
  report: PilotReport;
  identity?: PilotStudentIdentity;
  onOpen: () => void;
  onAdvance: (report: PilotReport) => Promise<void>;
  onNote: () => void;
  onNotify: () => void;
}) {
  const nextLabel: Partial<Record<PilotReportStatus, string>> = {
    received: 'Assess',
    assessing: 'Take ownership',
    assigned: 'Start response',
    in_progress: 'Complete simulation',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open case ${report.reference_number}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-xl border p-4 transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{report.title}</p>
            <Badge variant="secondary">{PILOT_STATUS_LABELS[report.status]}</Badge>
          </div>
          <p className="mt-1 font-semibold text-primary">{getPilotStudentName(identity, report.submitted_by)}</p>
          <p className="text-sm text-muted-foreground">
            {identity?.student_number || 'Student number not supplied'} · {report.reference_number} · {CAMPUS_LABELS[report.campus]} · {report.category}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{report.location_description || 'Readable location unavailable'}</span>
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary">
            Open full case <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextLabel[report.status] && (
            <Button size="sm" onClick={(event) => { event.stopPropagation(); void onAdvance(report); }}>
              {nextLabel[report.status]}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onNote(); }}>
            <MessageSquarePlus className="mr-2 h-4 w-4" />Note
          </Button>
          <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onNotify(); }}>
            <Bell className="mr-2 h-4 w-4" />Notify
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState`,
  'openable named report row',
);

if (
  !source.includes('Pilot Student Register')
  || !source.includes('getPilotStudentName(identity, report.submitted_by)')
  || !source.includes('navigate(PILOT_ROUTES.report(report.id))')
  || !source.includes('report.location_description')
) {
  throw new Error('Super-admin student case migration did not produce all required controls.');
}

fs.writeFileSync(file, source);
console.log('Applied super-admin student identities, readable locations and openable incident cards.');
