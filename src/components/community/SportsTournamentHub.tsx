import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createSportsTeam,
  getTeamLogoUrl,
  loadSportsHub,
  requestToJoinTeam,
  reviewTeamJoinRequest,
  saveSportsRole,
  setTeamRecruitment,
  subscribeSportsHub,
  uploadTeamLogo,
} from '@/services/sportsTournamentService';
import type {
  CommunityEnvironment,
  CommunityIdentity,
  SportsCreateTeamInput,
  SportsHubSnapshot,
  SportsRole,
  SportsTeamSummary,
  SportsTournamentSummary,
} from '@/types/community';

interface SportsTournamentHubProps {
  environment: CommunityEnvironment;
  identity: CommunityIdentity;
  onCompleteProfile: () => void;
}

const EMPTY_TEAM_FORM: Omit<SportsCreateTeamInput, 'environment' | 'creatorRole'> = {
  tournamentId: '',
  name: '',
  description: '',
  affiliationType: 'Independent',
  affiliationName: '',
  rulesAccepted: false,
};

export function SportsTournamentHub({ environment, identity, onCompleteProfile }: SportsTournamentHubProps) {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<SportsHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading && snapshot?.persistenceReady && identity.profileCompleted && !snapshot.sportsRole) setRoleOpen(true);
  }, [identity.profileCompleted, loading, snapshot?.persistenceReady, snapshot?.sportsRole]);

  useEffect(() => {
    if (!teamForm.tournamentId && snapshot?.tournaments[0]) {
      setTeamForm((current) => ({ ...current, tournamentId: snapshot.tournaments[0].id }));
    }
  }, [snapshot?.tournaments, teamForm.tournamentId]);

  const selectedTeam = useMemo(
    () => snapshot?.teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, snapshot?.teams],
  );
  const recruitingTeams = useMemo(
    () => snapshot?.teams.filter((team) => team.status === 'recruiting') ?? [],
    [snapshot?.teams],
  );
  const onboardedTeams = useMemo(
    () => snapshot?.teams.filter((team) => team.status === 'activated' || team.status === 'draw_published') ?? [],
    [snapshot?.teams],
  );
  const waitlistedTeams = useMemo(
    () => snapshot?.teams.filter((team) => team.status === 'waitlisted') ?? [],
    [snapshot?.teams],
  );

  const chooseRole = async (role: SportsRole) => {
    if (!identity.profileCompleted) {
      setRoleOpen(false);
      onCompleteProfile();
      return;
    }
    if (!snapshot?.persistenceReady) return;
    setSaving(true);
    try {
      await saveSportsRole(environment, role);
      await refresh(true);
      setRoleOpen(false);
      toast({ title: role === 'coach' ? 'Coach profile selected' : 'Player profile selected', description: 'You can now create a team or request to join one.' });
    } catch (error) {
      toast({ title: 'Sports profile was not saved', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openCreateTeam = () => {
    if (!identity.profileCompleted) {
      onCompleteProfile();
      return;
    }
    if (!snapshot?.sportsRole) {
      setRoleOpen(true);
      return;
    }
    setTeamForm({ ...EMPTY_TEAM_FORM, tournamentId: snapshot.tournaments[0]?.id ?? '' });
    setLogoFile(null);
    setCreateOpen(true);
  };

  const createTeam = async () => {
    if (!snapshot?.sportsRole || !snapshot.persistenceReady) return;
    if (!teamForm.name.trim() || !teamForm.tournamentId) {
      toast({ title: 'Team name and tournament are required', variant: 'destructive' });
      return;
    }
    if (!teamForm.rulesAccepted) {
      toast({ title: 'Accept the tournament rules first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const teamId = await createSportsTeam({
        ...teamForm,
        environment,
        creatorRole: snapshot.sportsRole,
      });
      if (logoFile) {
        try {
          await uploadTeamLogo({ environment, userId: identity.userId, teamId, file: logoFile });
        } catch (error) {
          toast({ title: 'Team created; logo upload needs attention', description: errorMessage(error), variant: 'destructive' });
        }
      }
      await refresh(true);
      setCreateOpen(false);
      setSelectedTeamId(teamId);
      toast({
        title: 'Team created and visible',
        description: snapshot.sportsRole === 'coach'
          ? 'You are listed as the approved coach. Players can now request to join.'
          : 'You are listed as the first approved player. Other students can now request to join.',
      });
    } catch (error) {
      toast({ title: 'Team could not be created', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const requestJoin = async (team: SportsTeamSummary) => {
    if (!identity.profileCompleted) {
      onCompleteProfile();
      return;
    }
    if (!snapshot?.sportsRole) {
      setRoleOpen(true);
      return;
    }
    setSaving(true);
    try {
      await requestToJoinTeam(environment, team.id, snapshot.sportsRole);
      await refresh(true);
      toast({ title: 'Join request sent', description: `${team.name} can now approve or decline your ${snapshot.sportsRole} request.` });
    } catch (error) {
      toast({ title: 'Join request was not sent', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const reviewRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    setSaving(true);
    try {
      await reviewTeamJoinRequest(environment, requestId, decision);
      await refresh(true);
      toast({ title: decision === 'approved' ? 'Student approved' : 'Request declined', description: decision === 'approved' ? 'The public roster and activation progress have been updated.' : undefined });
    } catch (error) {
      toast({ title: 'Request could not be updated', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleRecruitment = async (team: SportsTeamSummary) => {
    setSaving(true);
    try {
      await setTeamRecruitment(environment, team.id, !team.acceptingRequests);
      await refresh(true);
    } catch (error) {
      toast({ title: 'Recruitment setting was not changed', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !snapshot) {
    return <div className="flex min-h-[320px] items-center justify-center" role="status"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>;
  }

  const primaryTournament = snapshot.tournaments[0];
  const deadlineOpen = primaryTournament ? now < new Date(primaryTournament.registrationDeadline).getTime() : false;
  const drawsUnlocked = primaryTournament ? now >= new Date(primaryTournament.drawsPublishAt).getTime() : false;

  return (
    <div className="space-y-6" data-testid={`sports-tournament-hub-${environment}`}>
      <section className="overflow-hidden rounded-3xl border border-[#F2A900]/55 bg-gradient-to-br from-[#002F6C] via-[#073B78] to-[#1A0D2B] p-6 text-white shadow-large sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2"><Badge className="bg-[#F2A900] font-black text-[#002F6C]">Sports is live</Badge><Badge variant="outline" className="border-white/35 text-white">Soccer and Netball only</Badge></div>
            <h2 className="mt-4 text-3xl font-black">Build your team. Get onboarded. Make the draw.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">Choose Player or Coach, create a team or request to join one, approve your roster and track the minimum requirement live. Approved names are publicly visible inside the tournament community; contact details and student numbers remain private.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button className="bg-[#F2A900] font-black text-[#002F6C] hover:bg-[#F2A900]/90" onClick={openCreateTeam} disabled={!deadlineOpen || !snapshot.persistenceReady}><Users className="mr-2 h-4 w-4" />Create Team</Button>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh teams</Button>
          </div>
        </div>
      </section>

      {snapshot.warning && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><LockKeyhole className="mr-2 inline h-4 w-4" />{snapshot.warning} The interface is showing the approved tournament configuration, but cross-device creation and joining begin after the migration is applied.</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <DeadlineCard icon={CalendarClock} label="Team onboarding deadline" value="Friday, 7 August · 12:00" detail={deadlineOpen ? timeRemaining(primaryTournament?.registrationDeadline, now) : 'Registration closed'} />
        <DeadlineCard icon={Clock3} label="Draw release" value="Friday, 7 August · 18:00" detail={drawsUnlocked ? 'Draws are available' : timeRemaining(primaryTournament?.drawsPublishAt, now)} />
        <DeadlineCard icon={Trophy} label="Tournament day" value="Saturday, 8 August 2026" detail="Pretoria West · Soccer and Netball" />
      </div>

      <Card className="border-primary/25 shadow-elevated">
        <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><UserCog className="h-6 w-6 text-primary" /></div>
            <div><p className="font-black">Your tournament profile</p><p className="text-sm text-muted-foreground">{snapshot.sportsRole ? `Registered as ${snapshot.sportsRole}` : 'Choose whether you are joining as a player or coach.'}</p></div>
          </div>
          {!snapshot.sportsRole && <Button onClick={() => setRoleOpen(true)} disabled={!snapshot.persistenceReady}><UserCheck className="mr-2 h-4 w-4" />Choose role</Button>}
          {snapshot.sportsRole && <Badge className="w-fit capitalize">{snapshot.sportsRole}</Badge>}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {snapshot.tournaments.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} onboarded={snapshot.teams.filter((team) => team.tournamentId === tournament.id && (team.status === 'activated' || team.status === 'draw_published')).length} />)}
      </div>

      <TeamSection
        title="Teams still onboarding"
        description="These teams are visible to students and are still accepting approved players or a coach. There is no hard roster maximum; the displayed number is the minimum activation threshold."
        teams={recruitingTeams}
        empty="No team is onboarding yet. Create the first team and invite students to find it from their own phones."
        currentRole={snapshot.sportsRole}
        saving={saving}
        deadlineOpen={deadlineOpen}
        onOpen={setSelectedTeamId}
        onJoin={(team) => void requestJoin(team)}
      />

      <TeamSection
        title="Onboarded tournament teams"
        description="Teams move here automatically when the minimum approved-player requirement and coach requirement are reached. The first eight activated teams receive tournament positions."
        teams={onboardedTeams}
        empty="No team has reached the onboarding minimum yet."
        currentRole={snapshot.sportsRole}
        saving={saving}
        deadlineOpen={deadlineOpen}
        onOpen={setSelectedTeamId}
        onJoin={(team) => void requestJoin(team)}
        onboarded
      />

      {waitlistedTeams.length > 0 && (
        <TeamSection
          title="Tournament waitlist"
          description="These teams reached their minimum after all eight tournament places were allocated. Administrators can still review duplicate-player or eligibility issues."
          teams={waitlistedTeams}
          empty=""
          currentRole={snapshot.sportsRole}
          saving={saving}
          deadlineOpen={deadlineOpen}
          onOpen={setSelectedTeamId}
          onJoin={(team) => void requestJoin(team)}
          waitlist
        />
      )}

      <Card className="overflow-hidden border-[#F2A900]/45 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#F2A900]/15 to-background"><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />Tournament draws and fixtures</CardTitle><CardDescription>Pairings remain locked until Friday at 18:00, even when administrators prepare the draw earlier.</CardDescription></CardHeader>
        <CardContent className="p-5">
          {!drawsUnlocked && <div className="rounded-2xl border border-dashed p-8 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">Draw release coming Friday at 18:00</p><p className="mt-1 text-sm text-muted-foreground">{timeRemaining(primaryTournament?.drawsPublishAt, now)}</p></div>}
          {drawsUnlocked && snapshot.fixtures.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center"><Clock3 className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-black">The official draw has not been published yet</p><p className="mt-1 text-sm text-muted-foreground">Refresh once tournament administration completes the fixture generation.</p></div>}
          {drawsUnlocked && snapshot.fixtures.length > 0 && <div className="grid gap-3 md:grid-cols-2">{snapshot.fixtures.map((fixture) => <div key={fixture.id} className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-3"><Badge variant="outline">{fixture.roundName} · Match {fixture.matchNumber}</Badge><span className="text-xs text-muted-foreground">{formatSast(fixture.scheduledAt)}</span></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center"><p className="font-black">{fixture.homeTeamName}</p><span className="text-xs font-bold text-muted-foreground">VS</span><p className="font-black">{fixture.awayTeamName}</p></div><p className="mt-3 text-center text-xs text-muted-foreground">{fixture.venue}</p></div>)}</div>}
        </CardContent>
      </Card>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>How are you joining the tournament?</DialogTitle><DialogDescription>This role is used when you create a team or request to join one. A soccer team requires at least 15 approved players and one approved coach; netball requires at least 12 approved players.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><RoleChoice icon={Users} title="I am a player" description="Create a team as its first player or request to join an existing team." disabled={saving || !snapshot.persistenceReady} onClick={() => void chooseRole('player')} /><RoleChoice icon={UserCog} title="I am a coach" description="Create a team as its coach or request the available coach position." disabled={saving || !snapshot.persistenceReady} onClick={() => void chooseRole('coach')} /></div></DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Create a tournament team</DialogTitle><DialogDescription>Your team becomes visible immediately. Students on other phones can open Sports, view the team and submit a join request.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Tournament"><Select value={teamForm.tournamentId} onValueChange={(value) => setTeamForm((current) => ({ ...current, tournamentId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{snapshot.tournaments.map((tournament) => <SelectItem key={tournament.id} value={tournament.id}>{tournament.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Team name"><Input value={teamForm.name} maxLength={60} onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))} placeholder="Example: West Campus Lions" /></Field><Field label="Affiliation"><Select value={teamForm.affiliationType} onValueChange={(value: SportsCreateTeamInput['affiliationType']) => setTeamForm((current) => ({ ...current, affiliationType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Residence', 'Faculty', 'Course', 'Campus community', 'Independent'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Affiliation name"><Input value={teamForm.affiliationName} maxLength={80} onChange={(event) => setTeamForm((current) => ({ ...current, affiliationName: event.target.value }))} placeholder="Optional" /></Field><Field label="Team description" wide><Textarea value={teamForm.description} maxLength={240} onChange={(event) => setTeamForm((current) => ({ ...current, description: event.target.value }))} placeholder="Tell students what your team represents." /></Field><Field label="Team logo" wide><label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-4 transition hover:border-primary"><ImagePlus className="h-7 w-7 text-primary" /><span className="min-w-0"><span className="block font-bold">{logoFile?.name ?? 'Choose logo image'}</span><span className="block text-xs text-muted-foreground">Automatically compressed to WebP, maximum 512×512 and approximately 220 KB. One stable file is kept per team.</span></span><Input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} /></label></Field></div><div className="flex items-start gap-3 rounded-2xl border p-4"><Checkbox id="team-rules" checked={teamForm.rulesAccepted} onCheckedChange={(checked) => setTeamForm((current) => ({ ...current, rulesAccepted: checked === true }))} /><Label htmlFor="team-rules" className="leading-5">I accept the tournament rules, truthful roster requirements and duplicate-player checks. I understand that the first eight teams to reach the minimum are onboarded.</Label></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={() => void createTeam()} disabled={saving || !snapshot.persistenceReady}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}Create visible team</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTeam)} onOpenChange={(open) => { if (!open) setSelectedTeamId(null); }}>
        {selectedTeam && <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><div className="flex items-start gap-4"><TeamLogo team={selectedTeam} size="large" /><div><div className="flex flex-wrap gap-2"><Badge>{selectedTeam.status.replace(/_/g, ' ')}</Badge>{selectedTeam.queuePosition && <Badge variant="outline">Position {selectedTeam.queuePosition}</Badge>}</div><DialogTitle className="mt-2">{selectedTeam.name}</DialogTitle><DialogDescription>{selectedTeam.description || selectedTeam.affiliationName || 'My CCSF tournament team'}</DialogDescription></div></div></DialogHeader><div className="grid gap-3 sm:grid-cols-3"><StatusCell label="Approved players" value={`${selectedTeam.approvedPlayerCount}/${selectedTeam.requiredPlayerCount} minimum`} /><StatusCell label="Approved coaches" value={selectedTeam.coachRequired ? `${selectedTeam.approvedCoachCount}/1 required` : `${selectedTeam.approvedCoachCount} optional`} /><StatusCell label="Recruitment" value={selectedTeam.acceptingRequests ? 'Open' : 'Closed'} /></div><div><h3 className="font-black">Public approved roster</h3><p className="mt-1 text-sm text-muted-foreground">Only approved names and roles are public. Student numbers, email addresses and phone numbers are never shown here.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{selectedTeam.roster.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-xl border p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><UserCheck className="h-4 w-4 text-primary" /></div><div><p className="font-bold">{member.displayName}</p><p className="text-xs capitalize text-muted-foreground">{member.role}</p></div></div>)}{selectedTeam.roster.length === 0 && <p className="col-span-full rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No approved members yet.</p>}</div></div>{selectedTeam.isOwner && <div><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Join requests</h3><p className="text-sm text-muted-foreground">Approving a request updates the public roster and activation count immediately.</p></div><Button variant="outline" size="sm" disabled={saving || !deadlineOpen} onClick={() => void toggleRecruitment(selectedTeam)}>{selectedTeam.acceptingRequests ? 'Pause requests' : 'Reopen requests'}</Button></div><div className="mt-3 space-y-2">{selectedTeam.pendingRequests.map((request) => <div key={request.id} className="flex flex-col justify-between gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"><div><p className="font-bold">{request.displayName}</p><p className="text-xs capitalize text-muted-foreground">Requests to join as {request.role}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={saving || !deadlineOpen} onClick={() => void reviewRequest(request.id, 'rejected')}><XCircle className="mr-1.5 h-4 w-4" />Decline</Button><Button size="sm" disabled={saving || !deadlineOpen} onClick={() => void reviewRequest(request.id, 'approved')}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button></div></div>)}{selectedTeam.pendingRequests.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">No pending requests.</p>}</div></div>}<DialogFooter>{!selectedTeam.isOwner && !selectedTeam.myMembershipRole && selectedTeam.myRequestStatus !== 'pending' && selectedTeam.acceptingRequests && deadlineOpen && <Button onClick={() => void requestJoin(selectedTeam)} disabled={saving}><UserPlus className="mr-2 h-4 w-4" />Request to join as {snapshot.sportsRole ?? 'player'}</Button>}<Button variant="outline" onClick={() => setSelectedTeamId(null)}>Close</Button></DialogFooter></DialogContent>}
      </Dialog>
    </div>
  );
}

function TournamentCard({ tournament, onboarded }: { tournament: SportsTournamentSummary; onboarded: number }) {
  return <Card className="overflow-hidden shadow-elevated"><CardHeader className="bg-gradient-to-r from-primary/10 to-[#F2A900]/10"><div className="flex items-center justify-between gap-3"><Badge>{tournament.sport}</Badge><Badge variant="outline">{onboarded}/{tournament.teamLimit} onboarded</Badge></div><CardTitle className="mt-2">{tournament.name}</CardTitle><CardDescription>{formatSast(tournament.startsAt)} · {tournament.venue}</CardDescription></CardHeader><CardContent className="space-y-3 p-5"><div className="grid grid-cols-2 gap-3"><StatusCell label="Minimum players" value={tournament.requiredPlayerCount} /><StatusCell label="Coach" value={tournament.coachRequired ? 'Required' : 'Optional'} /></div><div className="space-y-2">{tournament.rules.slice(0, 5).map((rule) => <p key={rule} className="flex gap-2 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />{rule}</p>)}</div></CardContent></Card>;
}

function TeamSection({ title, description, teams, empty, currentRole, saving, deadlineOpen, onOpen, onJoin, onboarded = false, waitlist = false }: { title: string; description: string; teams: SportsTeamSummary[]; empty: string; currentRole: SportsRole | null; saving: boolean; deadlineOpen: boolean; onOpen: (id: string) => void; onJoin: (team: SportsTeamSummary) => void; onboarded?: boolean; waitlist?: boolean }) {
  return <section className="space-y-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{title}</h2>{onboarded && <Badge className="bg-success">Activated</Badge>}{waitlist && <Badge variant="secondary">Waitlist</Badge>}</div><p className="mt-1 max-w-4xl text-sm text-muted-foreground">{description}</p></div>{teams.length === 0 ? <Card><CardContent className="p-8 text-center"><Users className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-bold">{empty}</p></CardContent></Card> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{teams.map((team) => <TeamCard key={team.id} team={team} currentRole={currentRole} saving={saving} deadlineOpen={deadlineOpen} onOpen={() => onOpen(team.id)} onJoin={() => onJoin(team)} />)}</div>}</section>;
}

function TeamCard({ team, currentRole, saving, deadlineOpen, onOpen, onJoin }: { team: SportsTeamSummary; currentRole: SportsRole | null; saving: boolean; deadlineOpen: boolean; onOpen: () => void; onJoin: () => void }) {
  const progress = Math.min(100, Math.round((team.approvedPlayerCount / Math.max(team.requiredPlayerCount, 1)) * 100));
  const canRequest = deadlineOpen && team.acceptingRequests && !team.isOwner && !team.myMembershipRole && team.myRequestStatus !== 'pending';
  return <Card className="overflow-hidden shadow-elevated"><CardHeader><div className="flex items-start gap-3"><TeamLogo team={team} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={team.status === 'activated' || team.status === 'draw_published' ? 'default' : 'secondary'}>{team.status.replace(/_/g, ' ')}</Badge>{team.queuePosition && <Badge variant="outline">#{team.queuePosition}</Badge>}</div><CardTitle className="mt-2 truncate">{team.name}</CardTitle><CardDescription className="line-clamp-2">{team.description || team.affiliationName || 'Student tournament team'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4"><div><div className="flex items-center justify-between text-sm"><span>Player minimum</span><strong>{team.approvedPlayerCount}/{team.requiredPlayerCount}</strong></div><Progress value={progress} className="mt-2" /></div><div className="grid grid-cols-2 gap-2"><StatusCell label="Coach" value={team.coachRequired ? `${team.approvedCoachCount}/1` : `${team.approvedCoachCount} optional`} /><StatusCell label="Approved roster" value={team.roster.length} /></div><div className="flex -space-x-2">{team.roster.slice(0, 5).map((member) => <div key={member.userId} title={`${member.displayName} · ${member.role}`} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-black text-primary-foreground">{initials(member.displayName)}</div>)}{team.roster.length > 5 && <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-black">+{team.roster.length - 5}</div>}</div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onOpen}>View roster</Button>{team.isOwner ? <Button onClick={onOpen}>{team.pendingRequests.length ? `${team.pendingRequests.length} request${team.pendingRequests.length === 1 ? '' : 's'}` : 'Manage team'}</Button> : team.myMembershipRole ? <Button disabled><BadgeCheck className="mr-2 h-4 w-4" />Approved {team.myMembershipRole}</Button> : team.myRequestStatus === 'pending' ? <Button disabled><Clock3 className="mr-2 h-4 w-4" />Request pending</Button> : <Button disabled={!canRequest || saving || !currentRole} onClick={onJoin}><UserPlus className="mr-2 h-4 w-4" />Join as {currentRole ?? 'player'}</Button>}</div></CardContent></Card>;
}

function TeamLogo({ team, size = 'normal' }: { team: SportsTeamSummary; size?: 'normal' | 'large' }) {
  const url = getTeamLogoUrl(team.logoPath);
  const className = size === 'large' ? 'h-20 w-20' : 'h-14 w-14';
  return url ? <img src={url} alt={`${team.name} logo`} loading="lazy" decoding="async" className={`${className} shrink-0 rounded-2xl border object-cover`} /> : <div className={`${className} flex shrink-0 items-center justify-center rounded-2xl bg-primary font-black text-primary-foreground`}>{initials(team.name)}</div>;
}

function RoleChoice({ icon: Icon, title, description, disabled, onClick }: { icon: typeof Users; title: string; description: string; disabled: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-2xl border p-5 text-left transition hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><Icon className="h-7 w-7 text-primary" /><p className="mt-4 font-black">{title}</p><p className="mt-2 text-sm text-muted-foreground">{description}</p></button>;
}

function DeadlineCard({ icon: Icon, label, value, detail }: { icon: typeof Trophy; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div></div></CardContent></Card>;
}

function StatusCell({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TM';
}

function formatSast(value: string) {
  if (!value) return 'Time to be confirmed';
  return new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function timeRemaining(value: string | undefined, now: number) {
  if (!value) return 'Time to be confirmed';
  const remaining = new Date(value).getTime() - now;
  if (remaining <= 0) return 'Time reached';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? '' : 's'} ${hours % 24} hours remaining`;
  return `${hours} hours ${minutes} minutes remaining`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Try again.';
}
