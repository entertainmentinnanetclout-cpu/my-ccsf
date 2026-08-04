import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Compass,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  Laptop,
  MapPin,
  Medal,
  Megaphone,
  Mic2,
  Newspaper,
  PlayCircle,
  Podcast,
  Radio,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  UserCheck,
  Users,
  Video,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  COMMUNITY_BADGES,
  COMMUNITY_GAMES,
  COMMUNITY_LEADERBOARD,
  COMMUNITY_MEDIA,
  COMMUNITY_NOTIFICATIONS,
  COMMUNITY_ROLES,
  COMMUNITY_TOURNAMENTS,
} from '@/data/communityCatalog';
import {
  calculateTeamCompliance,
  joinCommunityGame,
  loadCommunityState,
  submitCommunityContent,
  submitCommunityRoleApplication,
  submitCommunityTeam,
  updateLeaderboardPrivacy,
} from '@/services/communityService';
import type {
  CommunityContentSubmissionInput,
  CommunityEnvironment,
  CommunityIdentity,
  CommunityLocalState,
  CommunityRoleApplicationInput,
  CommunitySection,
  CommunityTeamInput,
} from '@/types/community';

interface CommunityHubProps {
  environment: CommunityEnvironment;
  identity: CommunityIdentity;
  onCompleteProfile: () => void;
}

const SECTION_ITEMS: Array<{ value: CommunitySection; label: string; icon: typeof Users }> = [
  { value: 'overview', label: 'Overview', icon: Compass },
  { value: 'games', label: 'Games', icon: Gamepad2 },
  { value: 'sports', label: 'Sports', icon: Trophy },
  { value: 'join', label: 'Join', icon: HeartHandshake },
  { value: 'media', label: 'Media', icon: Podcast },
  { value: 'participation', label: 'My Participation', icon: Award },
];

const EMPTY_APPLICATION: CommunityRoleApplicationInput = {
  selectedRole: '',
  secondaryRole: '',
  faculty: '',
  course: '',
  yearOfStudy: '',
  residence: '',
  relevantSkills: '',
  experience: '',
  motivation: '',
  weeklyAvailability: '',
  preferredDays: '',
  preferredTimes: '',
  hasSmartphone: true,
  hasLaptop: false,
  hasDriversLicence: false,
  portfolioLink: '',
  consentAccepted: false,
  codeOfConductAccepted: false,
  status: 'submitted',
};

const EMPTY_TEAM: CommunityTeamInput = {
  tournamentId: '',
  teamName: '',
  affiliationType: 'Independent',
  affiliationName: '',
  coachName: '',
  coachEmail: '',
  invitedPlayers: 0,
  registeredPlayers: 0,
  verifiedPlayers: 0,
  allMembersOnboarded: false,
  rulesAccepted: false,
};

const EMPTY_CONTENT: CommunityContentSubmissionInput = {
  type: 'blog',
  title: '',
  summary: '',
  link: '',
  status: 'submitted',
};

export function CommunityHub({ environment, identity, onCompleteProfile }: CommunityHubProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [section, setSection] = useState<CommunitySection>('overview');
  const [search, setSearch] = useState('');
  const [state, setState] = useState<CommunityLocalState>(() => loadCommunityState(environment, identity.userId));
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [application, setApplication] = useState<CommunityRoleApplicationInput>(EMPTY_APPLICATION);
  const [team, setTeam] = useState<CommunityTeamInput>(EMPTY_TEAM);
  const [content, setContent] = useState<CommunityContentSubmissionInput>(EMPTY_CONTENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState(loadCommunityState(environment, identity.userId));
  }, [environment, identity.userId]);

  const selectedTournament = useMemo(
    () => COMMUNITY_TOURNAMENTS.find((item) => item.id === team.tournamentId) ?? COMMUNITY_TOURNAMENTS[0],
    [team.tournamentId],
  );
  const compliance = useMemo(() => calculateTeamCompliance(selectedTournament, team), [selectedTournament, team]);
  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COMMUNITY_ROLES;
    return COMMUNITY_ROLES.filter((role) => [role.title, role.category, role.summary, ...role.skills].join(' ').toLowerCase().includes(query));
  }, [search]);

  const requireOnboarding = (action: () => void) => {
    if (!identity.profileCompleted) {
      setOnboardingOpen(true);
      return;
    }
    action();
  };

  const openRoleApplication = (roleId?: string) => requireOnboarding(() => {
    const role = COMMUNITY_ROLES.find((item) => item.id === roleId);
    setApplication({
      ...EMPTY_APPLICATION,
      selectedRole: role?.title ?? '',
      course: identity.course ?? '',
      yearOfStudy: identity.yearOfStudy ?? '',
    });
    setRoleOpen(true);
  });

  const openTeamRegistration = (tournamentId?: string) => requireOnboarding(() => {
    setTeam({ ...EMPTY_TEAM, tournamentId: tournamentId ?? COMMUNITY_TOURNAMENTS[0].id });
    setTeamOpen(true);
  });

  const openContentSubmission = () => requireOnboarding(() => {
    setContent(EMPTY_CONTENT);
    setContentOpen(true);
  });

  const handleJoinGame = (gameId: string) => requireOnboarding(async () => {
    const game = COMMUNITY_GAMES.find((item) => item.id === gameId);
    if (!game) return;
    if (game.type === 'safety_quiz') {
      navigate(environment === 'pilot' ? '/pilot/safety-quest' : '/safety-quest');
      return;
    }
    setSaving(true);
    const next = await joinCommunityGame({
      environment,
      userId: identity.userId,
      gameId: game.id,
      title: game.title,
      points: game.points,
      badge: game.badge,
    });
    setState(next);
    setSaving(false);
    toast({ title: `${game.title} joined`, description: 'Your participation is saved. Verified completion unlocks the remaining points.' });
  });

  const saveRoleApplication = async (status: 'draft' | 'submitted') => {
    if (!application.selectedRole || !application.course || !application.yearOfStudy) {
      toast({ title: 'Complete the required role fields', description: 'Role, course and year of study are required.', variant: 'destructive' });
      return;
    }
    if (status === 'submitted' && (!application.consentAccepted || !application.codeOfConductAccepted)) {
      toast({ title: 'Consent is required', description: 'Accept the consent and code of conduct before submission.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const next = await submitCommunityRoleApplication({
      environment,
      userId: identity.userId,
      campus: identity.campus,
      application: { ...application, status },
    });
    setState(next);
    setSaving(false);
    setRoleOpen(false);
    toast({ title: status === 'draft' ? 'Application draft saved' : 'Application submitted', description: 'Track the application in My Participation.' });
  };

  const saveTeam = async () => {
    if (!team.teamName.trim()) {
      toast({ title: 'Team name required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await submitCommunityTeam({
      environment,
      userId: identity.userId,
      campus: identity.campus,
      tournament: selectedTournament,
      team,
    });
    setState(result.state);
    setSaving(false);
    setTeamOpen(false);
    toast({
      title: result.compliance.isCompliant ? 'Team is ready for submission' : 'Team saved — onboarding incomplete',
      description: result.compliance.isCompliant
        ? 'The compliance timestamp can now determine queue priority after administrator review.'
        : 'Invite and verify the required players before the team enters the selection queue.',
    });
  };

  const saveContent = async (status: 'draft' | 'submitted') => {
    if (!content.title.trim() || !content.summary.trim()) {
      toast({ title: 'Title and summary required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const next = await submitCommunityContent({
      environment,
      userId: identity.userId,
      campus: identity.campus,
      submission: { ...content, status },
    });
    setState(next);
    setSaving(false);
    setContentOpen(false);
    toast({ title: status === 'draft' ? 'Content draft saved' : 'Content submitted for moderation' });
  };

  return (
    <div className="space-y-6" data-testid={`community-hub-${environment}`}>
      <section className="relative overflow-hidden rounded-3xl border border-[#F2A900]/50 bg-gradient-to-br from-[#002F6C] via-[#073B78] to-[#1A0D2B] p-6 text-white shadow-large sm:p-8">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#D7193F]/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#F2A900]/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#F2A900]/70 bg-[#F2A900] font-extrabold text-[#002F6C]">Official My CCSF {environment === 'pilot' ? 'Pilot ' : ''}Community</Badge>
              <Badge variant="outline" className="border-white/30 text-white">Registered TUT students</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Join the Community</h1>
            <p className="mt-2 text-xl font-extrabold text-[#F2A900]">Play. Participate. Volunteer. Lead. Represent.</p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">Become part of the My CCSF student community. Join campus games, register for tournaments, apply for student roles, create community content and help shape a safer, more connected TUT campus.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90" onClick={() => setSection('games')}><Gamepad2 className="mr-2 h-4 w-4" />Explore Activities</Button>
              <Button variant="secondary" className="font-extrabold" onClick={() => openRoleApplication()}><HeartHandshake className="mr-2 h-4 w-4" />Apply for a Role</Button>
              <Button variant="outline" className="border-white/40 bg-white/10 font-extrabold text-white hover:bg-white/20 hover:text-white" onClick={() => setSection('participation')}><Award className="mr-2 h-4 w-4" />View My Participation</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <InstitutionBrand size="header" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <HeroMetric value={COMMUNITY_GAMES.length} label="Activities" />
              <HeroMetric value={COMMUNITY_ROLES.length} label="Student roles" />
              <HeroMetric value={COMMUNITY_TOURNAMENTS.length} label="Tournaments" />
              <HeroMetric value={state.points} label="Your points" />
            </div>
          </div>
        </div>
      </section>

      <Tabs value={section} onValueChange={(value) => setSection(value as CommunitySection)}>
        <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1 md:grid-cols-6">
          {SECTION_ITEMS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="min-h-11 gap-1.5 rounded-xl text-xs sm:text-sm"><Icon className="h-4 w-4" />{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CategoryCard icon={Gamepad2} title="Community Games" description="Treasure hunts, building discovery, safety quizzes, check-ins and missions." action="Play Community Games" onClick={() => setSection('games')} />
            <CategoryCard icon={Trophy} title="Sports" description="Create teams, invite players and complete soccer or netball compliance." action="Join a Tournament" onClick={() => setSection('sports')} />
            <CategoryCard icon={HeartHandshake} title="Join" description="Apply as an ambassador, volunteer, administrator, creator or technical contributor." action="Explore Roles" onClick={() => setSection('join')} />
            <CategoryCard icon={Podcast} title="Blogs and Media" description="Podcasts, vlogs, blogs, news, interviews and moderated student submissions." action="Open Community Media" onClick={() => setSection('media')} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card className="shadow-elevated">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Upcoming Activities</CardTitle><CardDescription>Verified activities currently available through the My CCSF community.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {COMMUNITY_GAMES.slice(0, 4).map((game) => (
                  <button key={game.id} onClick={() => setSection('games')} className="rounded-2xl border p-4 text-left transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{game.title}</p><p className="mt-1 text-sm text-muted-foreground">{game.description}</p></div><Badge variant="secondary">{game.points} pts</Badge></div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{game.campus}<span>•</span>{game.estimatedMinutes} min</div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-elevated">
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-[#D7193F]" />Community Updates</CardTitle><CardDescription>Applications, activities and tournament notices.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {COMMUNITY_NOTIFICATIONS.map((item) => <div key={item.id} className="rounded-xl border bg-muted/30 p-4"><div className="flex items-start justify-between gap-3"><p className="font-bold">{item.title}</p><span className="text-xs text-muted-foreground">{item.time}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p></div>)}
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-[#F2A900]/40 shadow-large">
            <CardContent className="grid gap-5 bg-gradient-to-r from-[#F2A900]/15 via-background to-[#D7193F]/10 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Central community message</p><h2 className="mt-2 text-2xl font-black">Your Campus. Your Community. Your Voice.</h2><p className="mt-2 text-sm text-muted-foreground">Join the My CCSF Pilot Programme and help build a safer, more connected and active student community.</p></div>
              <Button onClick={() => setSection('participation')}><Award className="mr-2 h-4 w-4" />My Participation</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <SectionHeading icon={Gamepad2} title="Community Games" description="Explore campus, learn verified safety information and earn controlled recognition through approved activities." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {COMMUNITY_GAMES.map((game) => (
              <motion.div key={game.id} whileHover={{ y: -4 }}>
                <Card className={`h-full overflow-hidden shadow-elevated ${game.featured ? 'border-[#F2A900]/60' : ''}`}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3"><Badge>{game.difficulty}</Badge><Badge variant="outline">{game.points} points</Badge></div>
                    <div><CardTitle>{game.title}</CardTitle><CardDescription className="mt-2">{game.description}</CardDescription></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-sm"><InfoCell label="Campus" value={game.campus} /><InfoCell label="Time" value={`${game.estimatedMinutes} min`} /><InfoCell label="Mode" value={game.participantMode} /><InfoCell label="Badge" value={game.badge} /></div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><ShieldCheck className="mr-1.5 inline h-4 w-4" />{game.safetyNotice}</div>
                    <Button className="w-full" disabled={saving} onClick={() => void handleJoinGame(game.id)}>{game.type === 'safety_quiz' ? <><GraduationCap className="mr-2 h-4 w-4" />Open Safety Quest</> : <><PlayCircle className="mr-2 h-4 w-4" />Start / Join Game</>}</Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sports" className="space-y-6">
          <SectionHeading icon={Trophy} title="Sports and Tournaments" description="Team priority begins only after the minimum player, onboarding, verification, coach and rules requirements are complete." />
          <div className="grid gap-5 lg:grid-cols-2">
            {COMMUNITY_TOURNAMENTS.map((tournament) => (
              <Card key={tournament.id} className="overflow-hidden border-primary/20 shadow-large">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-[#F2A900]/10">
                  <div className="flex flex-wrap items-center justify-between gap-2"><Badge>{tournament.sport}</Badge><Badge variant={tournament.status === 'Open' ? 'default' : 'secondary'}>{tournament.status}</Badge></div>
                  <CardTitle className="mt-2">{tournament.name}</CardTitle>
                  <CardDescription>{tournament.date} · {tournament.time} · {tournament.venue}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric value={tournament.requiredPlayers} label="Players" /><Metric value={tournament.coachRequired ? 1 : 0} label="Coach" /><Metric value={`${tournament.approvedTeams}/${tournament.teamLimit}`} label="Approved" /><Metric value={tournament.registrationDeadline} label="Deadline" compact /></div>
                  <div className="space-y-2">{tournament.rules.map((rule) => <div key={rule} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>{rule}</span></div>)}</div>
                  <div className="rounded-xl bg-muted/50 p-3 text-sm"><strong>Prize:</strong> {tournament.prize}</div>
                  <Button className="w-full" onClick={() => openTeamRegistration(tournament.id)}><Users className="mr-2 h-4 w-4" />Create or Register Team</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle>First eight compliant teams</CardTitle><CardDescription>Creation time does not determine priority.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-5">{['Minimum players joined', 'All players onboarded', 'All players verified', 'Coach completed if required', 'Rules accepted and submitted'].map((step, index) => <div key={step} className="rounded-xl border p-4 text-center"><div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">{index + 1}</div><p className="mt-2 text-sm font-bold">{step}</p></div>)}</div><p className="mt-4 rounded-xl border border-[#F2A900]/40 bg-[#F2A900]/10 p-4 text-sm">A compliant team receives a <code>compliance_completed_at</code> timestamp. The first eight valid timestamps receive priority, subject to administrator fraud and duplicate-player review.</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="join" className="space-y-6">
          <SectionHeading icon={HeartHandshake} title="Join" description="Apply to help operate, manage and grow the My CCSF Pilot Programme. Community approval never grants sensitive system access automatically." />
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ambassador, administration, media, IT or volunteer opportunities" className="pl-9" /></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id} className={`flex h-full flex-col shadow-elevated ${role.featured ? 'border-[#F2A900]/55' : ''}`}>
                <CardHeader><div className="flex items-center justify-between gap-2"><Badge variant="outline">{role.category}</Badge>{role.featured && <Sparkles className="h-5 w-5 text-[#F2A900]" />}</div><CardTitle className="mt-2">{role.title}</CardTitle><CardDescription>{role.summary}</CardDescription></CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Responsibilities</p><ul className="mt-2 space-y-1.5 text-sm">{role.responsibilities.slice(0, 5).map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</li>)}</ul></div>{role.disclaimer && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">{role.disclaimer}</div>}<Button className="mt-auto w-full" onClick={() => openRoleApplication(role.id)}><ClipboardList className="mr-2 h-4 w-4" />Apply for this Role</Button></CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <SectionHeading icon={Podcast} title="Blogs and Media" description="Student-created podcasts, vlogs, blogs, interviews, sports updates and community stories are moderated before publication." />
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">Become one of the first community contributors</p><p className="text-sm text-muted-foreground">Submit a story, news tip, podcast idea, vlog proposal, photos or sports update.</p></div><Button onClick={openContentSubmission}><Upload className="mr-2 h-4 w-4" />Submit Content</Button></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{COMMUNITY_MEDIA.map((item) => <MediaCard key={item.id} item={item} />)}</div>
          <Card><CardHeader><CardTitle>Moderation workflow</CardTitle><CardDescription>All student submissions follow a controlled publication process.</CardDescription></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-8">{['Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Approved', 'Scheduled', 'Published', 'Archived'].map((status, index) => <div key={status} className="rounded-xl border p-3 text-center"><div className="text-xs font-black text-primary">{index + 1}</div><p className="mt-1 text-xs font-bold">{status}</p></div>)}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="participation" className="space-y-6">
          <SectionHeading icon={Award} title="My Participation" description="Track games, teams, role applications, volunteering, content submissions, points and badges." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={Award} value={state.points} label="Community points" /><MetricCard icon={Medal} value={state.badges.length} label="Badges earned" /><MetricCard icon={ClipboardList} value={state.records.filter((item) => item.kind === 'role').length} label="Role applications" /><MetricCard icon={Users} value={state.records.filter((item) => item.kind === 'team').length} label="Sports teams" /></div>
          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card className="shadow-elevated"><CardHeader><CardTitle>Participation history</CardTitle><CardDescription>Applications and activity records saved for this {environment} experience.</CardDescription></CardHeader><CardContent className="space-y-3">{state.records.map((record) => <div key={record.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-extrabold">{record.title}</p><p className="text-sm text-muted-foreground">{record.kind} · {new Date(record.createdAt).toLocaleDateString()}</p></div><Badge variant="outline">{record.status}</Badge></div>{typeof record.progress === 'number' && <Progress value={record.progress} className="mt-3" />}</div>)}{!state.records.length && <EmptyState icon={Award} title="No participation yet" description="Join a game, tournament, role or content activity to begin your community record." />}</CardContent></Card>
            <div className="space-y-6"><Card><CardHeader><CardTitle>Badges</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{COMMUNITY_BADGES.map((badge) => <Badge key={badge} variant={state.badges.includes(badge) ? 'default' : 'outline'} className={state.badges.includes(badge) ? '' : 'opacity-45'}>{badge}</Badge>)}</CardContent></Card><Card><CardHeader><CardTitle>Community profile</CardTitle><CardDescription>{identity.profileCompleted ? '100% complete' : 'Onboarding required'}</CardDescription></CardHeader><CardContent><Progress value={identity.profileCompleted ? 100 : 60} /><Button className="mt-4 w-full" variant={identity.profileCompleted ? 'outline' : 'default'} onClick={onCompleteProfile}>{identity.profileCompleted ? 'Review Profile' : 'Complete My CCSF Profile'}</Button></CardContent></Card></div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-[#F2A900]" />Community Leaderboard</CardTitle><CardDescription>No student numbers, phone numbers or private records are shown.</CardDescription></CardHeader><CardContent className="space-y-2">{COMMUNITY_LEADERBOARD.map((entry) => <div key={entry.rank} className="flex items-center gap-3 rounded-xl border p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-black text-primary-foreground">{entry.rank}</div><div className="min-w-0 flex-1"><p className="font-bold">{entry.name}</p><p className="text-xs text-muted-foreground">{entry.campus} · {entry.badge}</p></div><strong>{entry.points}</strong></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Leaderboard privacy</CardTitle><CardDescription>Choose how your name may appear in public community rankings.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Display preference</Label><Select value={state.leaderboardPrivacy} onValueChange={(value: CommunityLocalState['leaderboardPrivacy']) => setState(updateLeaderboardPrivacy(environment, identity.userId, value, state.nickname))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_name">Full name</SelectItem><SelectItem value="first_name">First name only</SelectItem><SelectItem value="nickname">Nickname</SelectItem><SelectItem value="hidden">Remain hidden</SelectItem></SelectContent></Select></div>{state.leaderboardPrivacy === 'nickname' && <div className="space-y-2"><Label>Nickname</Label><Input value={state.nickname} onChange={(event) => setState(updateLeaderboardPrivacy(environment, identity.userId, 'nickname', event.target.value))} placeholder="Choose a safe public nickname" /></div>}<p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">High-value points require attendance, checkpoint, verification or administrator approval to prevent abuse.</p></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent><DialogHeader><DialogTitle>Complete your My CCSF Pilot profile to participate</DialogTitle><DialogDescription>Official roles, games, sports teams and content submissions require a completed and verified TUT student profile. Already verified students are not asked to repeat their information.</DialogDescription></DialogHeader><div className="rounded-xl border bg-muted/30 p-4 text-sm"><p className="font-bold">Required onboarding</p><p className="mt-2 text-muted-foreground">Full name, student number, TUT email, phone, campus, course, year of study, registration verification, terms and privacy consent.</p></div><DialogFooter><Button variant="outline" onClick={() => setOnboardingOpen(false)}>Not now</Button><Button onClick={() => { setOnboardingOpen(false); onCompleteProfile(); }}><UserCheck className="mr-2 h-4 w-4" />Complete Profile</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Community Role Application</DialogTitle><DialogDescription>Applications are reviewed before any assignment. Approval does not automatically grant system access.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Selected role"><Select value={application.selectedRole} onValueChange={(value) => setApplication((current) => ({ ...current, selectedRole: value }))}><SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger><SelectContent>{COMMUNITY_ROLES.map((role) => <SelectItem key={role.id} value={role.title}>{role.title}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Secondary role"><Select value={application.secondaryRole || 'none'} onValueChange={(value) => setApplication((current) => ({ ...current, secondaryRole: value === 'none' ? '' : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{COMMUNITY_ROLES.map((role) => <SelectItem key={role.id} value={role.title}>{role.title}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Faculty"><Input value={application.faculty} onChange={(event) => setApplication((current) => ({ ...current, faculty: event.target.value }))} /></Field>
            <Field label="Course"><Input value={application.course} onChange={(event) => setApplication((current) => ({ ...current, course: event.target.value }))} /></Field>
            <Field label="Year of study"><Input value={application.yearOfStudy} onChange={(event) => setApplication((current) => ({ ...current, yearOfStudy: event.target.value }))} /></Field>
            <Field label="Residence, where applicable"><Input value={application.residence} onChange={(event) => setApplication((current) => ({ ...current, residence: event.target.value }))} /></Field>
            <Field label="Weekly availability"><Input value={application.weeklyAvailability} onChange={(event) => setApplication((current) => ({ ...current, weeklyAvailability: event.target.value }))} placeholder="Example: 6 hours" /></Field>
            <Field label="Preferred days and times"><Input value={`${application.preferredDays}${application.preferredTimes ? ` · ${application.preferredTimes}` : ''}`} onChange={(event) => setApplication((current) => ({ ...current, preferredDays: event.target.value, preferredTimes: '' }))} placeholder="Example: Monday and Wednesday afternoons" /></Field>
            <Field label="Relevant skills" wide><Textarea value={application.relevantSkills} onChange={(event) => setApplication((current) => ({ ...current, relevantSkills: event.target.value }))} /></Field>
            <Field label="Experience" wide><Textarea value={application.experience} onChange={(event) => setApplication((current) => ({ ...current, experience: event.target.value }))} /></Field>
            <Field label="Motivation" wide><Textarea value={application.motivation} onChange={(event) => setApplication((current) => ({ ...current, motivation: event.target.value }))} /></Field>
            <Field label="Portfolio link" wide><Input value={application.portfolioLink} onChange={(event) => setApplication((current) => ({ ...current, portfolioLink: event.target.value }))} placeholder="Optional for media, design and IT roles" /></Field>
          </div>
          <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3"><CheckField checked={application.hasSmartphone} onChange={(checked) => setApplication((current) => ({ ...current, hasSmartphone: checked }))} label="Smartphone access" /><CheckField checked={application.hasLaptop} onChange={(checked) => setApplication((current) => ({ ...current, hasLaptop: checked }))} label="Laptop access" /><CheckField checked={application.hasDriversLicence} onChange={(checked) => setApplication((current) => ({ ...current, hasDriversLicence: checked }))} label="Driver’s licence" /></div>
          <div className="space-y-3"><CheckField checked={application.consentAccepted} onChange={(checked) => setApplication((current) => ({ ...current, consentAccepted: checked }))} label="I consent to the role-application and verification process." /><CheckField checked={application.codeOfConductAccepted} onChange={(checked) => setApplication((current) => ({ ...current, codeOfConductAccepted: checked }))} label="I accept the My CCSF community code of conduct." /></div>
          <DialogFooter className="gap-2"><Button variant="outline" disabled={saving} onClick={() => void saveRoleApplication('draft')}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button disabled={saving} onClick={() => void saveRoleApplication('submitted')}><ClipboardList className="mr-2 h-4 w-4" />Submit Application</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Register a Sports Team</DialogTitle><DialogDescription>Create the team, invite players and monitor onboarding before compliance submission.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Tournament"><Select value={team.tournamentId} onValueChange={(value) => setTeam((current) => ({ ...current, tournamentId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMMUNITY_TOURNAMENTS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Team name"><Input value={team.teamName} onChange={(event) => setTeam((current) => ({ ...current, teamName: event.target.value }))} /></Field><Field label="Affiliation"><Select value={team.affiliationType} onValueChange={(value: CommunityTeamInput['affiliationType']) => setTeam((current) => ({ ...current, affiliationType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Residence', 'Faculty', 'Course', 'Campus community', 'Independent'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="Affiliation name"><Input value={team.affiliationName} onChange={(event) => setTeam((current) => ({ ...current, affiliationName: event.target.value }))} /></Field>{selectedTournament.coachRequired && <><Field label="Coach name"><Input value={team.coachName} onChange={(event) => setTeam((current) => ({ ...current, coachName: event.target.value }))} /></Field><Field label="Coach email"><Input value={team.coachEmail} onChange={(event) => setTeam((current) => ({ ...current, coachEmail: event.target.value }))} /></Field></>}<Field label="Players invited"><Input type="number" min={0} value={team.invitedPlayers} onChange={(event) => setTeam((current) => ({ ...current, invitedPlayers: Number(event.target.value) }))} /></Field><Field label="Players registered"><Input type="number" min={0} value={team.registeredPlayers} onChange={(event) => setTeam((current) => ({ ...current, registeredPlayers: Number(event.target.value) }))} /></Field><Field label="Players verified"><Input type="number" min={0} value={team.verifiedPlayers} onChange={(event) => setTeam((current) => ({ ...current, verifiedPlayers: Number(event.target.value) }))} /></Field></div><div className="rounded-xl border p-4"><div className="flex items-center justify-between"><p className="font-extrabold">Team compliance</p><Badge variant={compliance.isCompliant ? 'default' : 'secondary'}>{compliance.isCompliant ? 'Ready for Submission' : 'Incomplete'}</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><ComplianceItem passed={compliance.playerTargetReached} label={`${selectedTournament.requiredPlayers} registered players`} /><ComplianceItem passed={compliance.verificationTargetReached} label={`${selectedTournament.requiredPlayers} verified players`} /><ComplianceItem passed={team.allMembersOnboarded} label="All members onboarded" /><ComplianceItem passed={compliance.coachCompleted} label="Coach requirement complete" /><ComplianceItem passed={team.rulesAccepted} label="Tournament rules accepted" /></div></div><div className="space-y-3"><CheckField checked={team.allMembersOnboarded} onChange={(checked) => setTeam((current) => ({ ...current, allMembersOnboarded: checked }))} label="All required players have completed My CCSF onboarding." /><CheckField checked={team.rulesAccepted} onChange={(checked) => setTeam((current) => ({ ...current, rulesAccepted: checked }))} label="The team accepts the tournament and participation rules." /></div><DialogFooter><Button variant="outline" onClick={() => setTeamOpen(false)}>Cancel</Button><Button disabled={saving} onClick={() => void saveTeam()}><Users className="mr-2 h-4 w-4" />Save Team</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={contentOpen} onOpenChange={setContentOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Submit Community Content</DialogTitle><DialogDescription>All student content enters moderation before publication.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Submission type"><Select value={content.type} onValueChange={(value: CommunityContentSubmissionInput['type']) => setContent((current) => ({ ...current, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blog">Blog article</SelectItem><SelectItem value="news_tip">News tip</SelectItem><SelectItem value="podcast_idea">Podcast idea or guest</SelectItem><SelectItem value="vlog">Vlog proposal</SelectItem><SelectItem value="photos">Photos</SelectItem><SelectItem value="event_coverage">Event coverage</SelectItem><SelectItem value="community_story">Community story</SelectItem><SelectItem value="sports_update">Sports update</SelectItem></SelectContent></Select></Field><Field label="Title"><Input value={content.title} onChange={(event) => setContent((current) => ({ ...current, title: event.target.value }))} /></Field><Field label="Summary"><Textarea value={content.summary} onChange={(event) => setContent((current) => ({ ...current, summary: event.target.value }))} rows={5} /></Field><Field label="Portfolio, draft or media link"><Input value={content.link} onChange={(event) => setContent((current) => ({ ...current, link: event.target.value }))} placeholder="Optional secure share link" /></Field></div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => void saveContent('draft')}><Save className="mr-2 h-4 w-4" />Save Draft</Button><Button onClick={() => void saveContent('submitted')}><Upload className="mr-2 h-4 w-4" />Submit for Moderation</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string | number; label: string }) { return <div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-black text-[#F2A900]">{value}</p><p className="text-xs text-white/70">{label}</p></div>; }
function CategoryCard({ icon: Icon, title, description, action, onClick }: { icon: typeof Users; title: string; description: string; action: string; onClick: () => void }) { return <motion.button whileHover={{ y: -4 }} onClick={onClick} className="rounded-2xl border bg-card p-5 text-left shadow-elevated transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{description}</p><p className="mt-4 flex items-center text-sm font-extrabold text-primary">{action}<ChevronRight className="ml-1 h-4 w-4" /></p></motion.button>; }
function SectionHeading({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) { return <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div><div><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>; }
function InfoCell({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
function Metric({ value, label, compact = false }: { value: string | number; label: string; compact?: boolean }) { return <div className="rounded-xl border p-3 text-center"><p className={`${compact ? 'text-sm' : 'text-xl'} font-black text-primary`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>; }
function MetricCard({ icon: Icon, value, label }: { icon: typeof Users; value: string | number; label: string }) { return <Card><CardContent className="p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-3xl font-black">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>; }
function MediaCard({ item }: { item: (typeof COMMUNITY_MEDIA)[number] }) { const Icon = item.type === 'podcast' ? Mic2 : item.type === 'vlog' ? Video : item.type === 'blog' ? Newspaper : Megaphone; return <Card className="h-full shadow-elevated"><CardHeader><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><Badge variant="outline">{item.type}</Badge></div><CardTitle className="mt-3 text-lg">{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></CardHeader><CardContent><p className="text-xs font-bold text-primary">{item.category}</p><p className="mt-2 text-xs text-muted-foreground">{item.author} · {item.publishedAt}{item.duration ? ` · ${item.duration}` : ''}{item.readingTime ? ` · ${item.readingTime}` : ''}</p><Button variant="outline" className="mt-4 w-full"><PlayCircle className="mr-2 h-4 w-4" />Open</Button></CardContent></Card>; }
function EmptyState({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) { return <div className="rounded-2xl border border-dashed p-8 text-center"><Icon className="mx-auto h-10 w-10 text-muted-foreground/50" /><p className="mt-3 font-black">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}><Label>{label}</Label>{children}</div>; }
function CheckField({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-start gap-3 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span>{label}</span></label>; }
function ComplianceItem({ passed, label }: { passed: boolean; label: string }) { return <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${passed ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100' : ''}`}><CheckCircle2 className={`h-4 w-4 ${passed ? 'text-success' : 'text-muted-foreground'}`} />{label}</div>; }
