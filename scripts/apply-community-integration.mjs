import { readFileSync, writeFileSync } from 'node:fs';

function update(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`No community integration change required in ${path}.`);
    return;
  }
  writeFileSync(path, after);
  console.log(`Integrated Join the Community into ${path}.`);
}

function replaceRequired(source, from, to, path) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Community integration anchor missing in ${path}: ${from.slice(0, 80)}`);
  return source.replace(from, to);
}

update('src/pages/Dashboard.tsx', (input) => {
  let source = input;
  source = replaceRequired(source,
    "import { Link, useSearchParams } from 'react-router-dom';",
    "import { Link, useNavigate, useSearchParams } from 'react-router-dom';",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "import { FileText, FlaskConical, Home, LifeBuoy, LogOut, MapPin, Plus, Radar, Shield, ShieldCheck } from 'lucide-react';",
    "import { FileText, FlaskConical, Home, LifeBuoy, LogOut, MapPin, Plus, Radar, Shield, ShieldCheck, UsersRound } from 'lucide-react';",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "import { AcademicFraudLaunchCard } from '@/components/shared/AcademicFraudLaunchCard';",
    "import { AcademicFraudLaunchCard } from '@/components/shared/AcademicFraudLaunchCard';\nimport { CommunityHub } from '@/components/community/CommunityHub';",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "type StudentView = 'home' | 'report' | 'mycases' | 'safety' | 'messages';",
    "type StudentView = 'home' | 'report' | 'mycases' | 'safety' | 'community' | 'messages';",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "const STUDENT_VIEWS = new Set<StudentView>(['home', 'report', 'mycases', 'safety', 'messages']);",
    "const STUDENT_VIEWS = new Set<StudentView>(['home', 'report', 'mycases', 'safety', 'community', 'messages']);",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "const Dashboard = () => {\n  const { userProfile, signOut } = useAuth();",
    "const Dashboard = () => {\n  const navigate = useNavigate();\n  const { userProfile, signOut } = useAuth();",
    'src/pages/Dashboard.tsx');
  source = replaceRequired(source,
    "    { view: 'safety', icon: Radar, label: 'Safety' },\n    { view: 'messages', icon: LifeBuoy, label: 'Support' },",
    "    { view: 'safety', icon: Radar, label: 'Safety' },\n    { view: 'community', icon: UsersRound, label: 'Community' },\n    { view: 'messages', icon: LifeBuoy, label: 'Support' },",
    'src/pages/Dashboard.tsx');
  source = source.replace('grid grid-cols-5 gap-1.5', 'grid grid-cols-6 gap-1.5');
  source = replaceRequired(source,
    "            {activeView === 'messages' && <StudentChat onNavigate={changeView} />}",
    "            {activeView === 'community' && userProfile && (\n              <CommunityHub\n                environment=\"official\"\n                identity={{\n                  userId: userProfile.id,\n                  fullName: userProfile.full_name ?? 'TUT Student',\n                  email: userProfile.email,\n                  campus: userProfile.campus,\n                  profileCompleted: userProfile.profile_completed,\n                }}\n                onCompleteProfile={() => navigate('/profile-completion')}\n              />\n            )}\n            {activeView === 'messages' && <StudentChat onNavigate={changeView} />}",
    'src/pages/Dashboard.tsx');
  return source;
});

update('src/components/pilot/PilotStudentDashboard.tsx', (input) => {
  let source = input;
  source = replaceRequired(source,
    "  Siren,\n} from 'lucide-react';",
    "  Siren,\n  UsersRound,\n} from 'lucide-react';",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "import { SafetyMobilityHub } from '@/components/student/SafetyMobilityHub';",
    "import { SafetyMobilityHub } from '@/components/student/SafetyMobilityHub';\nimport { CommunityHub } from '@/components/community/CommunityHub';",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "import { usePilotGuide } from '@/hooks/pilot/usePilotGuide';",
    "import { useAuth } from '@/contexts/AuthContext';\nimport { usePilotGuide } from '@/hooks/pilot/usePilotGuide';",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "type View = 'home' | 'mycases' | 'report' | 'safety' | 'support';",
    "type View = 'home' | 'mycases' | 'report' | 'safety' | 'community' | 'support';",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "const PILOT_VIEWS = new Set<View>(['home', 'mycases', 'report', 'safety', 'support']);",
    "const PILOT_VIEWS = new Set<View>(['home', 'mycases', 'report', 'safety', 'community', 'support']);",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "  const { toast } = useToast();\n  const guide = usePilotGuide({ autoOpen: true });",
    "  const { toast } = useToast();\n  const { userProfile } = useAuth();\n  const guide = usePilotGuide({ autoOpen: true });",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = replaceRequired(source,
    "    { view: 'safety', icon: Radar, label: 'Safety' },\n    { view: 'support', icon: LifeBuoy, label: 'Support' },",
    "    { view: 'safety', icon: Radar, label: 'Safety' },\n    { view: 'community', icon: UsersRound, label: 'Community' },\n    { view: 'support', icon: LifeBuoy, label: 'Support' },",
    'src/components/pilot/PilotStudentDashboard.tsx');
  source = source.replace('grid grid-cols-5 gap-2', 'grid grid-cols-6 gap-2');
  source = replaceRequired(source,
    "        {view === 'support' && (",
    "        {view === 'community' && (\n          <div className=\"px-4 sm:px-6\">\n            <CommunityHub\n              environment=\"pilot\"\n              identity={{\n                userId: participant.user_id,\n                fullName: userProfile?.full_name ?? 'TUT Student',\n                email: userProfile?.email ?? '',\n                campus: participant.campus,\n                profileCompleted: userProfile?.profile_completed ?? true,\n              }}\n              onCompleteProfile={() => navigate('/profile')}\n            />\n          </div>\n        )}\n\n        {view === 'support' && (",
    'src/components/pilot/PilotStudentDashboard.tsx');
  return source;
});

update('src/pages/Admin.tsx', (input) => {
  let source = input;
  source = replaceRequired(source,
    "import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, BarChart3, Images, Users, Siren, Building2, Wifi } from 'lucide-react';",
    "import { Shield, LayoutDashboard, AlertCircle, Megaphone, MessageSquare, BarChart3, Images, Users, Siren, Building2, Wifi, HeartHandshake } from 'lucide-react';",
    'src/pages/Admin.tsx');
  source = replaceRequired(source,
    "import { WifiAccessPointManager } from '@/components/admin/WifiAccessPointManager';",
    "import { WifiAccessPointManager } from '@/components/admin/WifiAccessPointManager';\nimport { CommunityAdminDashboard } from '@/components/community/CommunityAdminDashboard';",
    'src/pages/Admin.tsx');
  source = replaceRequired(source,
    "const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'analytics' | 'announcements' | 'communication' | 'carousel' | 'admins' | 'escalation' | 'office' | 'wifi'>('overview');",
    "const [activeView, setActiveView] = useState<'overview' | 'incidents' | 'analytics' | 'announcements' | 'communication' | 'carousel' | 'admins' | 'community' | 'escalation' | 'office' | 'wifi'>('overview');",
    'src/pages/Admin.tsx');
  source = replaceRequired(source,
    "  }, {\n    view: 'wifi',",
    "  }, {\n    view: 'community',\n    icon: HeartHandshake,\n    label: 'Community'\n  }, {\n    view: 'wifi',",
    'src/pages/Admin.tsx');
  source = replaceRequired(source,
    "            {activeView === 'wifi' && <WifiAccessPointManager />}",
    "            {activeView === 'community' && <CommunityAdminDashboard environment=\"official\" />}\n            {activeView === 'wifi' && <WifiAccessPointManager />}",
    'src/pages/Admin.tsx');
  return source;
});

update('src/components/pilot/PilotSuperAdminDashboard.tsx', (input) => {
  let source = input;
  source = replaceRequired(source,
    "  GraduationCap,\n  History,",
    "  GraduationCap,\n  HeartHandshake,\n  History,",
    'src/components/pilot/PilotSuperAdminDashboard.tsx');
  source = replaceRequired(source,
    "import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';",
    "import { PilotCsvExportPanel } from '@/components/pilot/PilotCsvExportPanel';\nimport { CommunityAdminDashboard } from '@/components/community/CommunityAdminDashboard';",
    'src/components/pilot/PilotSuperAdminDashboard.tsx');
  source = replaceRequired(source,
    "type AdminView = 'overview' | 'operations' | 'campuses' | 'programmes' | 'participants' | 'analytics' | 'governance' | 'audit';",
    "type AdminView = 'overview' | 'operations' | 'campuses' | 'programmes' | 'participants' | 'analytics' | 'community' | 'governance' | 'audit';",
    'src/components/pilot/PilotSuperAdminDashboard.tsx');
  source = replaceRequired(source,
    "    { view: 'analytics', icon: BarChart3, label: 'Analytics' },\n    { view: 'governance', icon: Database, label: 'Governance' },",
    "    { view: 'analytics', icon: BarChart3, label: 'Analytics' },\n    { view: 'community', icon: HeartHandshake, label: 'Community' },\n    { view: 'governance', icon: Database, label: 'Governance' },",
    'src/components/pilot/PilotSuperAdminDashboard.tsx');
  source = replaceRequired(source,
    "      {activeView === 'governance' && (",
    "      {activeView === 'community' && <CommunityAdminDashboard environment=\"pilot\" />}\n\n      {activeView === 'governance' && (",
    'src/components/pilot/PilotSuperAdminDashboard.tsx');
  return source;
});

update('package.json', (input) => {
  const pkg = JSON.parse(input);
  pkg.scripts['test:community'] = 'node scripts/verify-community-release.mjs';
  for (const key of ['build', 'build:dev']) {
    if (!pkg.scripts[key].includes('verify-community-release.mjs')) {
      pkg.scripts[key] = pkg.scripts[key].replace(
        'node scripts/verify-institutional-phases-2-3.mjs',
        'node scripts/verify-institutional-phases-2-3.mjs && node scripts/verify-community-release.mjs',
      );
    }
  }
  if (!pkg.scripts['qa:pilot'].includes('test:community')) {
    pkg.scripts['qa:pilot'] = pkg.scripts['qa:pilot'].replace(
      'npm run test:institutional-phases-2-3 && npm run typecheck',
      'npm run test:institutional-phases-2-3 && npm run test:community && npm run typecheck',
    );
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
});
