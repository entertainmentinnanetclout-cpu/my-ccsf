import { useEffect, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gamepad2,
  Loader2,
  Megaphone,
  Podcast,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COMMUNITY_GAMES, COMMUNITY_ROLES, COMMUNITY_TOURNAMENTS } from '@/data/communityCatalog';
import { loadCommunityAdminMetrics } from '@/services/communityService';
import type { CommunityEnvironment } from '@/types/community';

interface CommunityMetrics {
  members: number;
  applications: number;
  games: number;
  teams: number;
  compliantTeams: number;
  contentSubmissions: number;
}

const EMPTY_METRICS: CommunityMetrics = {
  members: 0,
  applications: 0,
  games: 0,
  teams: 0,
  compliantTeams: 0,
  contentSubmissions: 0,
};

export function CommunityAdminDashboard({ environment }: { environment: CommunityEnvironment }) {
  const [metrics, setMetrics] = useState<CommunityMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setMetrics(await loadCommunityAdminMetrics(environment));
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [environment]);

  return (
    <div className="space-y-6" data-testid={`community-admin-${environment}`}>
      <section className="overflow-hidden rounded-3xl border border-[#F2A900]/45 bg-gradient-to-r from-[#002F6C] via-[#073B78] to-[#1A0D2B] p-6 text-white shadow-large sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Badge className="bg-[#F2A900] font-black text-[#002F6C]">Community Administration</Badge><Badge variant="outline" className="border-white/30 text-white">{environment === 'pilot' ? 'Pilot records' : 'Official records'}</Badge></div>
            <h2 className="mt-4 text-3xl font-black">Join the Community Management</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/75">Manage members, applications, games, sports, attendance, moderation, points, notifications and governance without exposing incident or student-document data to unauthorised volunteers.</p>
          </div>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetric icon={Users} value={metrics.members} label="Members" />
        <AdminMetric icon={ClipboardCheck} value={metrics.applications} label="Applications" />
        <AdminMetric icon={Gamepad2} value={metrics.games || COMMUNITY_GAMES.length} label="Active games" />
        <AdminMetric icon={Trophy} value={metrics.teams} label="Teams" />
        <AdminMetric icon={UserCheck} value={metrics.compliantTeams} label="Compliant teams" />
        <AdminMetric icon={Podcast} value={metrics.contentSubmissions} label="Content queue" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl p-1 md:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="sports">Sports</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 lg:grid-cols-2">
          <AdminSection icon={Activity} title="Community operations" description="Current operational areas and authorised management queues." items={['Members and verification', 'Role applications and assignments', 'Events and attendance', 'Points and badge approvals', 'Notifications and reminders', 'Community analytics']} />
          <AdminSection icon={BarChart3} title="Impact analytics" description="Privacy-safe participation and conversion reporting." items={['Community tab visits', 'Games started and completed', 'Team registrations and onboarding conversion', 'Role application completion', 'Event attendance', 'Content views and publication']} />
        </TabsContent>

        <TabsContent value="applications" className="space-y-5">
          <AdminSection icon={ClipboardCheck} title="Role application workflow" description="Review, shortlist, interview, approve, waitlist, reject or close student applications." items={COMMUNITY_ROLES.map((role) => role.title)} />
          <Notice text="Community-role approval does not grant admin, developer, incident, security-case or document access. Assign platform permissions separately through authorised RBAC." />
        </TabsContent>

        <TabsContent value="games" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {COMMUNITY_GAMES.map((game) => <Card key={game.id}><CardHeader><div className="flex items-center justify-between gap-2"><Badge>{game.difficulty}</Badge><Badge variant="outline">{game.points} pts</Badge></div><CardTitle>{game.title}</CardTitle><CardDescription>{game.description}</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p><strong>Checkpoint mode:</strong> {game.type.replace(/_/g, ' ')}</p><p><strong>Verification:</strong> Required for high-value points</p><Button variant="outline" className="w-full"><Settings2 className="mr-2 h-4 w-4" />Manage Game</Button></CardContent></Card>)}
        </TabsContent>

        <TabsContent value="sports" className="space-y-5">
          {COMMUNITY_TOURNAMENTS.map((tournament) => <Card key={tournament.id}><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>{tournament.name}</CardTitle><CardDescription>{tournament.date} · {tournament.venue}</CardDescription></div><Badge>{tournament.approvedTeams}/{tournament.teamLimit} approved</Badge></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><StatusCell label="Required players" value={tournament.requiredPlayers} /><StatusCell label="Coach required" value={tournament.coachRequired ? 'Yes' : 'No'} /><StatusCell label="Queue rule" value="Compliance timestamp" /><StatusCell label="Status" value={tournament.status} /></CardContent></Card>)}
          <Notice text="The first eight priority rule must use compliance_completed_at only after all required players are onboarded and verified, the coach requirement is complete and rules are accepted. Administrators retain fraud and duplicate-player override authority." />
        </TabsContent>

        <TabsContent value="content" className="grid gap-5 lg:grid-cols-2">
          <AdminSection icon={Podcast} title="Content moderation" description="Every student contribution enters review before publication." items={['Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Approved', 'Scheduled', 'Published', 'Rejected or Archived']} />
          <AdminSection icon={Megaphone} title="Community channels" description="Manage official community publishing destinations." items={['Campus Community Podcast', 'Vlogs', 'Blogs', 'News and Updates', 'Student Interviews', 'Sports and Residence Updates']} />
        </TabsContent>

        <TabsContent value="governance" className="grid gap-5 lg:grid-cols-2">
          <AdminSection icon={ShieldCheck} title="Access boundaries" description="Community permissions are separated from safety-case permissions." items={['Patrol volunteers cannot access private incidents', 'Sports coordinators cannot access safety cases', 'Content contributors cannot publish without moderation', 'Student documents require authorised verification access', 'Developer access is never granted automatically']} />
          <AdminSection icon={FileText} title="Audit requirements" description="Sensitive operations should create immutable audit records." items={['Application status changes', 'Role assignments', 'Team compliance overrides', 'Point and badge awards', 'Content publication', 'Student verification decisions']} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdminMetric({ icon: Icon, value, label }: { icon: typeof Users; value: string | number; label: string }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

function AdminSection({ icon: Icon, title, description, items }: { icon: typeof Users; title: string; description: string; items: string[] }) {
  return <Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{items.map((item) => <div key={item} className="flex items-start gap-2 rounded-xl border p-3 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</div>)}</CardContent></Card>;
}

function StatusCell({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function Notice({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[#F2A900]/50 bg-[#F2A900]/10 p-4 text-sm"><Bell className="mr-2 inline h-4 w-4 text-primary" />{text}</div>;
}
