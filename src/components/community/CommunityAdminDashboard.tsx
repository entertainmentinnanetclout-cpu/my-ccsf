import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { generateTournamentDraw, loadSportsHub, subscribeSportsHub } from '@/services/sportsTournamentService';
import type { CommunityEnvironment, SportsHubSnapshot, SportsTeamSummary, SportsTournamentSummary } from '@/types/community';

export function CommunityAdminDashboard({ environment }: { environment: CommunityEnvironment }) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<SportsHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawingTournamentId, setDrawingTournamentId] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    try {
      setSnapshot(await loadSportsHub(environment, force));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [environment]);

  useEffect(() => { void refresh(true); }, [refresh]);
  useEffect(() => subscribeSportsHub(environment, () => void refresh(true)), [environment, refresh]);

  const metrics = useMemo(() => {
    const teams = snapshot?.teams ?? [];
    return {
      teams: teams.length,
      recruiting: teams.filter((team) => team.status === 'recruiting').length,
      onboarded: teams.filter((team) => team.status === 'activated' || team.status === 'draw_published').length,
      waitlisted: teams.filter((team) => team.status === 'waitlisted').length,
      approvedPlayers: teams.reduce((total, team) => total + team.approvedPlayerCount, 0),
      pendingRequests: teams.reduce((total, team) => total + team.pendingRequests.length, 0),
    };
  }, [snapshot?.teams]);

  const createDraw = async (tournament: SportsTournamentSummary) => {
    setDrawingTournamentId(tournament.id);
    try {
      await generateTournamentDraw(environment, tournament.id);
      await refresh(true);
      toast({ title: `${tournament.sport} draw generated`, description: `Fixtures remain hidden from students until ${formatSast(tournament.drawsPublishAt)}.` });
    } catch (error) {
      toast({ title: 'Draw could not be generated', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setDrawingTournamentId(null);
    }
  };

  if (loading || !snapshot) {
    return <div className="flex min-h-[420px] items-center justify-center" role="status"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6" data-testid={`community-admin-${environment}`}>
      <section className="overflow-hidden rounded-3xl border border-[#F2A900]/45 bg-gradient-to-r from-[#002F6C] via-[#073B78] to-[#1A0D2B] p-6 text-white shadow-large sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2"><Badge className="bg-[#F2A900] font-black text-[#002F6C]">Community Administration</Badge><Badge variant="outline" className="border-white/30 text-white">{environment === 'pilot' ? 'Pilot records' : 'Official records'}</Badge></div>
            <h2 className="mt-4 text-3xl font-black">Soccer and Netball Tournament Operations</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/75">Monitor discoverable teams, approved public rosters, onboarding progress, the first-eight activation queue and the timed Friday draw release. Other community modules remain locked during this pilot.</p>
          </div>
          <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
        </div>
      </section>

      {snapshot.warning && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><LockKeyhole className="mr-2 inline h-4 w-4" />{snapshot.warning}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <AdminMetric icon={Trophy} value={metrics.teams} label="Teams" />
        <AdminMetric icon={Clock3} value={metrics.recruiting} label="Onboarding" />
        <AdminMetric icon={CheckCircle2} value={metrics.onboarded} label="Onboarded" />
        <AdminMetric icon={Activity} value={metrics.waitlisted} label="Waitlisted" />
        <AdminMetric icon={Users} value={metrics.approvedPlayers} label="Approved players" />
        <AdminMetric icon={CalendarClock} value={metrics.pendingRequests} label="Pending requests" />
      </div>

      <Tabs defaultValue="sports">
        <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl p-1 md:grid-cols-6">
          <TabsTrigger value="sports">Sports</TabsTrigger>
          <TabsTrigger value="draws">Draws</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="sports" className="space-y-6">
          {snapshot.tournaments.map((tournament) => {
            const teams = snapshot.teams.filter((team) => team.tournamentId === tournament.id);
            return <TournamentAdminCard key={tournament.id} tournament={tournament} teams={teams} />;
          })}
        </TabsContent>

        <TabsContent value="draws" className="space-y-6">
          {snapshot.tournaments.map((tournament) => {
            const eligible = snapshot.teams.filter((team) => team.tournamentId === tournament.id && (team.status === 'activated' || team.status === 'draw_published') && (team.queuePosition ?? 999) <= tournament.teamLimit);
            const fixtures = snapshot.fixtures.filter((fixture) => fixture.tournamentId === tournament.id);
            return <Card key={tournament.id} className="shadow-elevated"><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><CardTitle>{tournament.sport} draw control</CardTitle><CardDescription>Onboarding closes {formatSast(tournament.registrationDeadline)}. Student visibility unlocks automatically {formatSast(tournament.drawsPublishAt)}.</CardDescription></div><Badge variant="outline">{eligible.length}/{tournament.teamLimit} eligible</Badge></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><StatusCell label="Tournament starts" value={formatSast(tournament.startsAt)} /><StatusCell label="Prepared fixtures" value={fixtures.length} /><StatusCell label="Release rule" value="Timed at 18:00" /></div><Button onClick={() => void createDraw(tournament)} disabled={!snapshot.persistenceReady || drawingTournamentId === tournament.id || eligible.length < 2}>{drawingTournamentId === tournament.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}Generate official draw</Button><p className="rounded-xl border border-[#F2A900]/45 bg-[#F2A900]/10 p-3 text-sm">The draw uses only onboarded teams within the first eight queue positions. It can be prepared after Friday 12:00, but students cannot see fixtures before Friday 18:00.</p></CardContent></Card>;
          })}
        </TabsContent>

        <TabsContent value="governance" className="grid gap-5 lg:grid-cols-2">
          <GovernanceCard title="Roster and activation controls" items={['Only completed My CCSF profiles can create or join teams', 'A student cannot be approved for two teams in the same tournament', 'Only the team creator or an administrator can approve requests', 'Soccer requires 15 approved players and one approved coach', 'Netball requires 12 approved players; a coach is optional', 'Activation is automatic and first-eight queue positions are timestamped']} />
          <GovernanceCard title="Privacy and resource controls" items={['Public rosters expose approved names and roles only', 'Student numbers, email addresses and phone numbers remain private', 'One compressed WebP logo is stored per team', 'Logo uploads target 512×512 and approximately 220 KB', 'The Sports hub loads through one aggregated RPC', 'One debounced realtime channel refreshes cross-device changes']} />
        </TabsContent>

        <TabsContent value="games"><ComingSoonAdmin title="Community Games" /></TabsContent>
        <TabsContent value="roles"><ComingSoonAdmin title="Roles and Volunteering" /></TabsContent>
        <TabsContent value="media"><ComingSoonAdmin title="Blogs and Media" /></TabsContent>
      </Tabs>
    </div>
  );
}

function TournamentAdminCard({ tournament, teams }: { tournament: SportsTournamentSummary; teams: SportsTeamSummary[] }) {
  const recruiting = teams.filter((team) => team.status === 'recruiting');
  const onboarded = teams.filter((team) => team.status === 'activated' || team.status === 'draw_published');
  const waitlisted = teams.filter((team) => team.status === 'waitlisted');
  return <Card className="shadow-elevated"><CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex gap-2"><Badge>{tournament.sport}</Badge><Badge variant="outline">{onboarded.length}/{tournament.teamLimit} onboarded</Badge></div><CardTitle className="mt-3">{tournament.name}</CardTitle><CardDescription>{formatSast(tournament.startsAt)} · {tournament.venue}</CardDescription></div><div className="text-sm text-muted-foreground"><p>Deadline: <strong className="text-foreground">{formatSast(tournament.registrationDeadline)}</strong></p><p>Draw release: <strong className="text-foreground">{formatSast(tournament.drawsPublishAt)}</strong></p></div></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-4"><StatusCell label="Onboarding" value={recruiting.length} /><StatusCell label="Onboarded" value={onboarded.length} /><StatusCell label="Waitlisted" value={waitlisted.length} /><StatusCell label="Minimum" value={`${tournament.requiredPlayerCount} players${tournament.coachRequired ? ' + coach' : ''}`} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <AdminTeamCard key={team.id} team={team} />)}{teams.length === 0 && <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">No teams have been created for this tournament.</p>}</div></CardContent></Card>;
}

function AdminTeamCard({ team }: { team: SportsTeamSummary }) {
  const progress = Math.min(100, Math.round((team.approvedPlayerCount / Math.max(team.requiredPlayerCount, 1)) * 100));
  return <div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{team.name}</p><p className="text-xs text-muted-foreground">Created by a {team.creatorRole}</p></div><Badge variant={team.status === 'activated' || team.status === 'draw_published' ? 'default' : 'secondary'}>{team.status.replace(/_/g, ' ')}</Badge></div><div className="mt-4"><div className="flex justify-between text-sm"><span>Players</span><strong>{team.approvedPlayerCount}/{team.requiredPlayerCount}</strong></div><Progress value={progress} className="mt-2" /></div><div className="mt-3 grid grid-cols-2 gap-2"><StatusCell label="Coach" value={team.coachRequired ? `${team.approvedCoachCount}/1` : `${team.approvedCoachCount} optional`} /><StatusCell label="Requests" value={team.pendingRequests.length} /></div>{team.queuePosition && <p className="mt-3 rounded-xl bg-primary/10 p-2 text-center text-xs font-black text-primary">Queue position {team.queuePosition}</p>}</div>;
}

function AdminMetric({ icon: Icon, value, label }: { icon: typeof Users; value: string | number; label: string }) {
  return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>;
}

function StatusCell({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function GovernanceCard({ title, items }: { title: string; items: string[] }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />{title}</CardTitle></CardHeader><CardContent className="space-y-2">{items.map((item) => <p key={item} className="flex gap-2 rounded-xl border p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</p>)}</CardContent></Card>;
}

function ComingSoonAdmin({ title }: { title: string }) {
  return <Card className="border-[#F2A900]/45"><CardContent className="p-10 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-muted-foreground" /><Badge className="mt-4 animate-pulse bg-[#F2A900] font-black text-[#002F6C]">COMING SOON</Badge><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-muted-foreground">This administration module remains locked while Soccer and Netball onboarding is the active community pilot.</p></CardContent></Card>;
}

function formatSast(value: string) {
  if (!value) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
