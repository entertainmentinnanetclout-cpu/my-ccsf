import { useState } from 'react';
import {
  Award,
  Compass,
  Gamepad2,
  HeartHandshake,
  LockKeyhole,
  Podcast,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';
import { SportsTournamentHub } from '@/components/community/SportsTournamentHub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CommunityEnvironment, CommunityIdentity, CommunitySection } from '@/types/community';

interface CommunityHubProps {
  environment: CommunityEnvironment;
  identity: CommunityIdentity;
  onCompleteProfile: () => void;
}

const SECTION_ITEMS: Array<{ value: CommunitySection; label: string; icon: typeof Users; live?: boolean }> = [
  { value: 'overview', label: 'Overview', icon: Compass, live: true },
  { value: 'sports', label: 'Sports', icon: Trophy, live: true },
  { value: 'games', label: 'Safety Games', icon: Gamepad2 },
  { value: 'join', label: 'Join', icon: HeartHandshake },
  { value: 'media', label: 'Media', icon: Podcast },
  { value: 'participation', label: 'My Participation', icon: Award },
];

export function CommunityHub({ environment, identity, onCompleteProfile }: CommunityHubProps) {
  const [section, setSection] = useState<CommunitySection>('overview');

  return (
    <div className="space-y-6" data-testid={`community-hub-${environment}`}>
      <section className="relative overflow-hidden rounded-3xl border border-[#F2A900]/50 bg-gradient-to-br from-[#002F6C] via-[#073B78] to-[#1A0D2B] p-6 text-white shadow-large sm:p-8">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#D7193F]/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#F2A900]/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#F2A900]/70 bg-[#F2A900] font-extrabold text-[#002F6C]">Official Campus Safety App {environment === 'pilot' ? 'Pilot ' : ''}Community</Badge>
              <Badge variant="outline" className="border-white/30 text-white">Registered TUT students</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Join the Community</h1>
            <p className="mt-2 text-xl font-extrabold text-[#F2A900]">Play. Participate. Learn Safety. Lead. Represent.</p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80 sm:text-base">Sports onboarding is live while Community Safety Games are being prepared. The community layer combines entertainment, campus engagement and practical safety learning inside the Campus Safety App.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90" onClick={() => setSection('sports')}><Trophy className="mr-2 h-4 w-4" />Open Sports Tournament</Button>
              {!identity.profileCompleted && <Button variant="secondary" className="font-extrabold" onClick={onCompleteProfile}><Users className="mr-2 h-4 w-4" />Complete Student Profile</Button>}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <InstitutionBrand size="header" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <HeroMetric value="2" label="Live sports" />
              <HeroMetric value="8" label="Places per sport" />
              <HeroMetric value="12–15" label="Player minimum" />
              <HeroMetric value="08 Aug" label="Tournament" />
            </div>
          </div>
        </div>
      </section>

      <Tabs value={section} onValueChange={(value) => setSection(value as CommunitySection)}>
        <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-2xl bg-muted/70 p-1 md:grid-cols-6">
          {SECTION_ITEMS.map(({ value, label, icon: Icon, live }) => (
            <TabsTrigger key={value} value={value} className="relative min-h-11 gap-1.5 rounded-xl text-xs sm:text-sm">
              <Icon className="h-4 w-4" />{label}
              {!live && <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-[#F2A900]" aria-label="Coming soon" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="overflow-hidden border-[#F2A900]/55 shadow-large">
            <CardContent className="grid gap-5 bg-gradient-to-r from-[#F2A900]/20 via-background to-[#D7193F]/10 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-4 w-4" />Live now</div><h2 className="mt-2 text-2xl font-black">Soccer and Netball Team Onboarding</h2><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Teams are publicly discoverable inside the Campus Safety App. Students request to join, team creators approve them, approved rosters are visible, and teams activate automatically when they reach the minimum.</p></div>
              <Button onClick={() => setSection('sports')}><Trophy className="mr-2 h-4 w-4" />Enter Sports</Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LaunchCard icon={Trophy} title="Sports and Tournaments" description="Soccer and netball team creation, join requests, approved rosters, activation and draws." live onClick={() => setSection('sports')} />
            <LaunchCard icon={Gamepad2} title="Community Safety Games" description="Safety Treasure Hunt, Spot the Safety Building, CPS Service Match, Safety Quiz, reporting-route races and scenario missions." />
            <LaunchCard icon={HeartHandshake} title="Student Safety Roles" description="Safety ambassadors, crime-prevention awareness, administration support, media, IT and event-safety volunteering." />
            <LaunchCard icon={Podcast} title="Safety Blogs and Media" description="Safety podcasts, vlogs, interviews, awareness stories, sports updates and verified community notices." />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TimelineCard number="1" title="Choose Player or Coach" description="Your selected role follows you when creating a team or requesting to join one." />
            <TimelineCard number="2" title="Create or Join a Team" description="Every created team is visible across student devices in the same official or Pilot environment." />
            <TimelineCard number="3" title="Reach the Minimum" description="Soccer activates at 15 approved players plus a coach. Netball activates at 12 approved players." />
          </div>
        </TabsContent>

        <TabsContent value="sports">
          <SportsTournamentHub environment={environment} identity={identity} onCompleteProfile={onCompleteProfile} />
        </TabsContent>

        <TabsContent value="games"><ComingSoonPanel icon={Gamepad2} title="Community Safety Games" description="Safety Treasure Hunt, Spot the Safety Building, CPS Service Match, Campus Safety Quiz, reporting-route challenges and scenario missions are being prepared. Every game will combine entertainment with practical campus-safety knowledge." /></TabsContent>
        <TabsContent value="join"><ComingSoonPanel icon={HeartHandshake} title="Student Safety Roles and Volunteering" description="Campus Safety Ambassadors, Residence Safety Ambassadors, Crime Prevention Awareness, Administration Support, Safety Media, IT and event-safety volunteer applications are being prepared." /></TabsContent>
        <TabsContent value="media"><ComingSoonPanel icon={Podcast} title="Safety Blogs and Media" description="The Campus Safety Community Podcast, safety vlogs, awareness blogs, interviews, sports updates and moderated student submissions are being prepared." /></TabsContent>
        <TabsContent value="participation"><ComingSoonPanel icon={Award} title="Community Safety Participation Dashboard" description="Safety-learning points, verified badges, activity history, role applications and leaderboard controls will unlock after the sports tournament pilot." /></TabsContent>
      </Tabs>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string | number; label: string }) {
  return <div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-black text-[#F2A900]">{value}</p><p className="text-xs text-white/70">{label}</p></div>;
}

function LaunchCard({ icon: Icon, title, description, live = false, onClick }: { icon: typeof Trophy; title: string; description: string; live?: boolean; onClick?: () => void }) {
  return <Card className={`relative overflow-hidden shadow-elevated ${live ? 'border-[#F2A900]/65' : 'opacity-75'}`}>{!live && <div className="absolute right-3 top-3 animate-pulse rounded-full bg-[#F2A900] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#002F6C]">Coming soon</div>}<CardHeader><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div><CardTitle className="mt-3">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{live ? <Button className="w-full" onClick={onClick}>Open now</Button> : <Button className="w-full" variant="outline" disabled><LockKeyhole className="mr-2 h-4 w-4" />Coming soon</Button>}</CardContent></Card>;
}

function TimelineCard({ number, title, description }: { number: string; title: string; description: string }) {
  return <Card><CardContent className="p-5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-black text-primary-foreground">{number}</div><p className="mt-4 font-black">{title}</p><p className="mt-2 text-sm text-muted-foreground">{description}</p></CardContent></Card>;
}

function ComingSoonPanel({ icon: Icon, title, description }: { icon: typeof Gamepad2; title: string; description: string }) {
  return <Card className="relative overflow-hidden border-[#F2A900]/50 shadow-large"><div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-[#F2A900]" /><CardContent className="p-8 text-center sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10"><Icon className="h-8 w-8 text-primary" /></div><Badge className="mt-5 animate-pulse bg-[#F2A900] font-black text-[#002F6C]">COMING SOON</Badge><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p><Button className="mt-6" variant="outline" disabled><LockKeyhole className="mr-2 h-4 w-4" />Not available during this pilot</Button></CardContent></Card>;
}
