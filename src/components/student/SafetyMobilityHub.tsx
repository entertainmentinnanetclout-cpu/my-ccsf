import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BatteryCharging,
  Car,
  CheckCircle2,
  Clock3,
  Compass,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  LocateFixed,
  Map,
  MapPinned,
  MoonStar,
  Navigation,
  PhoneCall,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { CampusMap } from '@/components/student/CampusMap';
import { SafetyQuestLaunchCard } from '@/components/student/SafetyQuestLaunchCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSafetyMobility } from '@/hooks/useSafetyMobility';
import { useToast } from '@/hooks/use-toast';
import { formatCoordinatePair } from '@/lib/reverseGeocode';
import { loadCampusRadar } from '@/services/safetyMobilityService';
import type { CampusLocation } from '@/types/pilot';
import type { SafetyMobilityMode, SafetyPresenceVisibility, SafetyRadarStudent, SafetyShareScope } from '@/types/safetyMobility';

const MODE_CONTENT: Record<SafetyMobilityMode, { title: string; description: string; icon: LucideIcon }> = {
  in_transit: { title: 'In-Transit', description: 'Use while travelling in an Uber, Bolt, taxi, bus or private vehicle.', icon: Car },
  night_travel: { title: 'Night Travel', description: 'Keep an active safety check-in while walking or travelling after dark.', icon: MoonStar },
  find_my_phone: { title: 'Track This Phone', description: 'Keep the latest consented phone location available in your account.', icon: Smartphone },
};

const visibilityLabels: Record<SafetyPresenceVisibility, string> = {
  off: 'Invisible',
  campus_approximate: 'Campus - approximate area',
  campus_exact: 'Campus - exact live position',
};

const toExpectedEnd = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TU';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const earth = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
    - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function SafetyMobilityHub({ campus }: { campus: CampusLocation }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const mobility = useSafetyMobility({ campus, userId: user?.id });
  const [mode, setMode] = useState<SafetyMobilityMode>('in_transit');
  const [transportType, setTransportType] = useState('Uber / Bolt');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [destination, setDestination] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [shareScope, setShareScope] = useState<SafetyShareScope>('trusted_circle');
  const [travelConsent, setTravelConsent] = useState(false);
  const [alertReason, setAlertReason] = useState('I do not feel safe and need campus-security follow-up.');
  const [radarVisibility, setRadarVisibility] = useState<SafetyPresenceVisibility>(mobility.radarPreference.visibility);
  const [radarDuration, setRadarDuration] = useState('120');
  const [radarMessage, setRadarMessage] = useState(mobility.radarPreference.statusMessage ?? 'Available on campus');
  const [exactConsent, setExactConsent] = useState(mobility.radarPreference.confirmExact);
  const [radarStudents, setRadarStudents] = useState<SafetyRadarStudent[]>([]);
  const [radarLoading, setRadarLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SafetyRadarStudent | null>(null);

  useEffect(() => {
    setRadarVisibility(mobility.radarPreference.visibility);
    setRadarMessage(mobility.radarPreference.statusMessage ?? 'Available on campus');
    setExactConsent(mobility.radarPreference.confirmExact);
  }, [mobility.radarPreference]);

  const refreshRadar = useCallback(async () => {
    setRadarLoading(true);
    try {
      setRadarStudents(await loadCampusRadar(campus));
    } catch (caught) {
      toast({ title: 'Campus Radar unavailable', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    } finally {
      setRadarLoading(false);
    }
  }, [campus, toast]);

  useEffect(() => {
    void refreshRadar();
    const timer = window.setInterval(() => void refreshRadar(), 20_000);
    return () => window.clearInterval(timer);
  }, [refreshRadar]);

  const startTravel = async () => {
    if (!travelConsent) {
      toast({ title: 'Consent required', description: 'Confirm the live-location and safety-routing notice before starting.', variant: 'destructive' });
      return;
    }
    try {
      await mobility.start({
        mode,
        transportType: mode === 'find_my_phone' ? 'This device' : transportType,
        vehicleDetails: vehicleDetails.trim() || null,
        destinationLabel: destination.trim() || null,
        expectedEndAt: toExpectedEnd(Number(durationMinutes)),
        shareScope,
      });
      toast({ title: `${MODE_CONTENT[mode].title} started`, description: 'Live location is active while this device grants browser location access.' });
    } catch (caught) {
      toast({ title: 'Safety Mobility did not start', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    }
  };

  const finishTravel = async () => {
    try {
      await mobility.finish('completed');
      toast({ title: 'Marked safe', description: 'The active tracking session has ended.' });
    } catch (caught) {
      toast({ title: 'Unable to end tracking', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    }
  };

  const sendAlert = async () => {
    try {
      const result = await mobility.alert(alertReason);
      toast({ title: 'Safety alert sent', description: 'An official case was created and live location will continue updating.' });
      navigate(`/dashboard?tab=mycases&incident=${result.incident_id}`);
    } catch (caught) {
      toast({ title: 'Alert could not be sent', description: caught instanceof Error ? caught.message : 'Call emergency services if danger is immediate.', variant: 'destructive' });
    }
  };

  const updateRadar = async () => {
    if (radarVisibility === 'campus_exact' && !exactConsent) {
      toast({ title: 'Exact-location consent required', description: 'Confirm that other opted-in campus users may see your exact live position.', variant: 'destructive' });
      return;
    }
    const sharingUntil = radarDuration === 'until_off' ? null : toExpectedEnd(Number(radarDuration));
    try {
      await mobility.setRadar({
        visibility: radarVisibility,
        statusMessage: radarMessage.trim() || null,
        sharingUntil,
        confirmExact: radarVisibility === 'campus_exact' && exactConsent,
      });
      await refreshRadar();
      toast({
        title: radarVisibility === 'off' ? 'Radar visibility off' : 'Radar visibility updated',
        description: radarVisibility === 'off' ? 'Your profile is no longer visible on Campus Radar.' : visibilityLabels[radarVisibility],
      });
    } catch (caught) {
      toast({ title: 'Radar setting failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' });
    }
  };

  const selfFix = mobility.location;
  const plottedStudents = useMemo(() => radarStudents.slice(0, 24).map((student, index) => {
    let distance: number | null = null;
    let angle = (index * 137.5) % 360;
    if (selfFix) {
      distance = haversineMeters(selfFix.latitude, selfFix.longitude, student.latitude, student.longitude);
      angle = bearingDegrees(selfFix.latitude, selfFix.longitude, student.latitude, student.longitude);
    }
    const ring = distance === null ? 0.28 + (index % 4) * 0.15 : Math.min(0.44, 0.1 + Math.log10(Math.max(10, distance)) * 0.11);
    const radians = (angle - 90) * Math.PI / 180;
    return {
      student,
      distance,
      left: 50 + Math.cos(radians) * ring * 100,
      top: 50 + Math.sin(radians) * ring * 100,
    };
  }), [radarStudents, selfFix]);

  const activeMode = mobility.session ? MODE_CONTENT[mobility.session.mode] : MODE_CONTENT[mode];
  const ActiveIcon = activeMode.icon;
  const overdue = Boolean(mobility.session?.expected_end_at && new Date(mobility.session.expected_end_at).getTime() < Date.now());
  const mapsUrl = mobility.location
    ? `https://www.google.com/maps/search/?api=1&query=${mobility.location.latitude},${mobility.location.longitude}`
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5" data-testid="student-safety-mobility-hub">
      <section className="overflow-hidden rounded-3xl border border-[#F2A900]/40 bg-gradient-to-br from-[#002F6C] via-[#092A5C] to-[#14091F] p-6 text-white shadow-large sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F2A900]/45 bg-[#F2A900]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F2A900]"><ShieldCheck className="h-4 w-4" />Student Safety Mobility</div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Travel, locate, check in and report from one safety hub.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75 sm:text-base">Live location is consent-based and can be stopped at any time. A safety alert creates an official case and connects subsequent location updates to the existing CCSF incident workflow.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button className="bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90" onClick={() => navigate('/dashboard?tab=report')}><ShieldAlert className="mr-2 h-4 w-4" />Report</Button>
            <Button variant="destructive" className="font-extrabold" onClick={() => navigate('/dashboard?tab=report')}><PhoneCall className="mr-2 h-4 w-4" />Emergency</Button>
          </div>
        </div>
      </section>
      <section className="space-y-3" aria-labelledby="student-safety-tools-title" data-testid="student-safety-tools">
        <div className="flex flex-col justify-between gap-1 px-1 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Safety tools</p>
            <h3 id="student-safety-tools-title" className="mt-1 text-2xl font-black tracking-tight">Learn, prepare and take action</h3>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">Safety Quest is the onboarding tool for CPS services, fraud awareness, office locations and reporting.</p>
        </div>
        <SafetyQuestLaunchCard />
      </section>

      {mobility.error && <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />{mobility.error}</div>}

      <Tabs defaultValue="travel" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted p-1 sm:grid-cols-4">
          <TabsTrigger value="travel" className="py-3"><Navigation className="mr-2 h-4 w-4" />Travel</TabsTrigger>
          <TabsTrigger value="radar" className="py-3"><Radar className="mr-2 h-4 w-4" />Campus Radar</TabsTrigger>
          <TabsTrigger value="phone" className="py-3"><Smartphone className="mr-2 h-4 w-4" />Track Phone</TabsTrigger>
          <TabsTrigger value="map" className="py-3"><Map className="mr-2 h-4 w-4" />Campus Maps</TabsTrigger>
        </TabsList>

        <TabsContent value="travel" className="space-y-5">
          {mobility.session ? (
            <Card className={`overflow-hidden shadow-large ${mobility.session.status === 'alerted' ? 'border-destructive' : 'border-[#F2A900]/55'}`}>
              <CardHeader className="bg-gradient-to-r from-[#002F6C] to-[#0055A5] text-white">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3"><ActiveIcon className="h-7 w-7 text-[#F2A900]" /></div>
                    <div><CardTitle>{activeMode.title} is active</CardTitle><CardDescription className="text-white/70">{mobility.session.status === 'alerted' ? 'Official alert created - live location remains active.' : activeMode.description}</CardDescription></div>
                  </div>
                  <Badge className={overdue ? 'bg-destructive text-white' : 'bg-[#F2A900] text-[#002F6C]'}>{overdue ? 'Check-in overdue' : mobility.session.status.replace('_', ' ')}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatusTile icon={Clock3} label="Expected end" value={mobility.session.expected_end_at ? new Date(mobility.session.expected_end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Until stopped'} />
                  <StatusTile icon={LocateFixed} label="Last location" value={mobility.location?.readableLocation ?? 'Waiting for location'} />
                  <StatusTile icon={BatteryCharging} label="Location accuracy" value={mobility.location?.accuracy ? `±${Math.round(mobility.location.accuracy)} m` : 'Checking'} />
                  <StatusTile icon={Users} label="Sharing" value={mobility.session.share_scope.replace('_', ' ')} />
                </div>
                <div className="space-y-2"><Label htmlFor="safety-alert-reason">What feels unsafe?</Label><Textarea id="safety-alert-reason" value={alertReason} onChange={(event) => setAlertReason(event.target.value)} rows={3} maxLength={800} /></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" onClick={() => void mobility.captureNow()} disabled={mobility.locating}><RefreshCw className={`mr-2 h-4 w-4 ${mobility.locating ? 'animate-spin' : ''}`} />Update location</Button>
                  <Button className="bg-emerald-600 font-bold text-white hover:bg-emerald-700" onClick={() => void finishTravel()}><CheckCircle2 className="mr-2 h-4 w-4" />I am safe - end</Button>
                  <Button variant="destructive" className="font-extrabold" onClick={() => void sendAlert()}><ShieldAlert className="mr-2 h-4 w-4" />Alert CCSF / CPS</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="shadow-large">
                <CardHeader><CardTitle>Start a travel safety session</CardTitle><CardDescription>Choose a mode, expected duration and who may receive the live safety trail.</CardDescription></CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(Object.keys(MODE_CONTENT) as SafetyMobilityMode[]).map((key) => {
                      const item = MODE_CONTENT[key];
                      const Icon = item.icon;
                      return <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-2xl border p-4 text-left transition ${mode === key ? 'border-[#D7193F] bg-[#D7193F]/5 shadow-md' : 'hover:border-primary/50'}`}><Icon className={`h-6 w-6 ${mode === key ? 'text-[#D7193F]' : 'text-primary'}`} /><p className="mt-3 font-extrabold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></button>;
                    })}
                  </div>
                  {mode !== 'find_my_phone' && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Transport</Label><Select value={transportType} onValueChange={setTransportType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Uber / Bolt">Uber / Bolt</SelectItem><SelectItem value="Taxi">Taxi</SelectItem><SelectItem value="Bus">Bus</SelectItem><SelectItem value="Private vehicle">Private vehicle</SelectItem><SelectItem value="Walking">Walking</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="vehicle-details">Vehicle / driver details</Label><Input id="vehicle-details" value={vehicleDetails} onChange={(event) => setVehicleDetails(event.target.value)} placeholder="Registration, driver name or route" maxLength={300} /></div></div>}
                  <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="destination">Destination or check-in point</Label><Input id="destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Residence, campus gate or address" maxLength={300} /></div><div className="space-y-2"><Label>Expected duration</Label><Select value={durationMinutes} onValueChange={setDurationMinutes}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30">30 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="240">4 hours</SelectItem><SelectItem value="480">8 hours</SelectItem></SelectContent></Select></div></div>
                  <div className="space-y-2"><Label>Safety sharing</Label><Select value={shareScope} onValueChange={(value) => setShareScope(value as SafetyShareScope)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="private">Private - only my account</SelectItem><SelectItem value="trusted_circle">Trusted circle / account safety tools</SelectItem><SelectItem value="campus_security">Campus security can monitor this session</SelectItem></SelectContent></Select></div>
                  <div className="flex items-start gap-3 rounded-xl border bg-muted/35 p-4"><Checkbox id="travel-consent" checked={travelConsent} onCheckedChange={(checked) => setTravelConsent(checked === true)} /><Label htmlFor="travel-consent" className="leading-6">I consent to live location collection for this safety session. I understand browser tracking works while the device grants location permission and may pause when the app is fully closed or the operating system restricts background access.</Label></div>
                  <Button className="h-12 w-full bg-gradient-to-r from-[#D7193F] to-[#A70F30] text-base font-extrabold text-white" onClick={() => void startTravel()} disabled={mobility.loading || mobility.locating}>{mobility.locating ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Navigation className="mr-2 h-5 w-5" />}Start {MODE_CONTENT[mode].title}</Button>
                </CardContent>
              </Card>
              <SafetyBoundaryCard />
            </div>
          )}
        </TabsContent>

        <TabsContent value="radar" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="overflow-hidden border-fuchsia-500/35 bg-black text-white shadow-[0_0_45px_rgba(236,72,153,0.22)]">
              <CardHeader className="relative z-20 border-b border-fuchsia-400/20 bg-black/45"><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Radar className="h-5 w-5 text-fuchsia-400" />Campus Safety Radar</CardTitle><CardDescription className="text-white/60">Tap a profile icon. Approximate users are deliberately blurred to a campus area.</CardDescription></div><Button size="sm" variant="outline" className="border-fuchsia-400/35 bg-black text-white hover:bg-fuchsia-500/15" onClick={() => void refreshRadar()} disabled={radarLoading}><RefreshCw className={`mr-2 h-4 w-4 ${radarLoading ? 'animate-spin' : ''}`} />Refresh</Button></div></CardHeader>
              <CardContent className="p-0">
                <div className="relative aspect-square min-h-[360px] w-full overflow-hidden bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.22)_0,rgba(101,18,86,0.18)_20%,rgba(0,0,0,0.96)_70%)] sm:min-h-[520px]">
                  {[18, 34, 50, 66, 82].map((size) => <div key={size} className="absolute left-1/2 top-1/2 rounded-full border border-fuchsia-400/45 shadow-[0_0_20px_rgba(236,72,153,0.35)]" style={{ width: `${size}%`, height: `${size}%`, transform: 'translate(-50%, -50%)' }} />)}
                  <div className="absolute left-1/2 top-1/2 h-[86%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-fuchsia-400/40 to-transparent" />
                  <div className="absolute left-1/2 top-1/2 h-px w-[86%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-fuchsia-400/40 to-transparent" />
                  <div className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#002F6C] shadow-[0_0_30px_rgba(236,72,153,0.75)]"><Crosshair className="h-9 w-9 text-[#F2A900]" /></div>
                  {plottedStudents.map(({ student, left, top, distance }) => (
                    <button key={student.user_id} type="button" onClick={() => setSelectedStudent(student)} className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]" style={{ left: `${left}%`, top: `${top}%` }} aria-label={`Open ${student.full_name} on Campus Radar`}>
                      <span className="absolute inset-[-8px] animate-pulse rounded-full bg-fuchsia-500/20 blur-md" />
                      <Avatar className="relative h-11 w-11 border-2 border-fuchsia-300 shadow-[0_0_20px_rgba(236,72,153,0.65)] sm:h-14 sm:w-14"><AvatarImage src={student.avatar_url ?? undefined} alt="" /><AvatarFallback className="bg-[#002F6C] text-xs font-black text-white">{initials(student.full_name)}</AvatarFallback></Avatar>
                      <span className="pointer-events-none absolute left-1/2 top-full mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 px-2 py-1 text-[10px] font-bold text-white group-hover:block sm:block">{student.full_name.split(' ')[0]}{distance !== null ? ` · ${distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}` : ''}</span>
                    </button>
                  ))}
                  {!plottedStudents.length && <div className="absolute inset-0 flex items-center justify-center p-10 text-center text-sm text-white/65"><div><Users className="mx-auto mb-3 h-10 w-10 text-fuchsia-400" /><p>No active opted-in students are visible on this campus radar yet.</p></div></div>}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-large">
              <CardHeader><CardTitle>My Radar visibility</CardTitle><CardDescription>Visibility is voluntary, time-controlled and can be disabled immediately.</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2"><Label>Who can locate me?</Label><Select value={radarVisibility} onValueChange={(value) => setRadarVisibility(value as SafetyPresenceVisibility)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="off"><span className="flex items-center gap-2"><EyeOff className="h-4 w-4" />Invisible</span></SelectItem><SelectItem value="campus_approximate"><span className="flex items-center gap-2"><Eye className="h-4 w-4" />Campus approximate</span></SelectItem><SelectItem value="campus_exact"><span className="flex items-center gap-2"><LocateFixed className="h-4 w-4" />Campus exact location</span></SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Sharing duration</Label><Select value={radarDuration} onValueChange={setRadarDuration}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">1 hour</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="480">8 hours</SelectItem><SelectItem value="until_off">Until I turn it off</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="radar-status">Status message</Label><Input id="radar-status" value={radarMessage} onChange={(event) => setRadarMessage(event.target.value)} maxLength={100} placeholder="At the library / walking to residence" /></div>
                {radarVisibility === 'campus_exact' && <div className="flex items-start gap-3 rounded-xl border border-fuchsia-300 bg-fuchsia-50 p-4 dark:bg-fuchsia-950/20"><Checkbox id="exact-location-consent" checked={exactConsent} onCheckedChange={(checked) => setExactConsent(checked === true)} /><Label htmlFor="exact-location-consent" className="leading-6">I understand that opted-in campus users may see my exact live position until the selected time or until I switch it off.</Label></div>}
                <Button className="h-11 w-full font-extrabold" onClick={() => void updateRadar()}>{radarVisibility === 'off' ? <EyeOff className="mr-2 h-4 w-4" /> : <Radar className="mr-2 h-4 w-4" />}{radarVisibility === 'off' ? 'Turn off Radar visibility' : 'Activate Radar visibility'}</Button>
                <div className="rounded-xl bg-muted/50 p-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Privacy blueprint:</strong> approximate mode rounds coordinates and reports at least a 120m uncertainty. Exact mode requires explicit consent. Stale locations disappear after 15 minutes.</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="phone" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="shadow-large"><CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" />Track This Phone</CardTitle><CardDescription>Store and refresh this device's last-known location under your signed-in My CCSF account.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border bg-gradient-to-br from-primary/10 to-[#F2A900]/10 p-5"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Last known location</p><p className="mt-3 font-bold">{mobility.location?.readableLocation ?? 'No location captured in this session.'}</p>{mobility.location && <p className="mt-2 font-mono text-xs text-muted-foreground">{formatCoordinatePair(mobility.location.latitude, mobility.location.longitude)}</p>}</div><div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" onClick={() => void mobility.captureNow()} disabled={mobility.locating}><LocateFixed className="mr-2 h-4 w-4" />Refresh phone location</Button>{mapsUrl && <Button asChild><a href={mapsUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open in Maps</a></Button>}</div>{!mobility.session && <Button className="w-full" onClick={() => { setMode('find_my_phone'); void mobility.start({ mode: 'find_my_phone', transportType: 'This device', expectedEndAt: toExpectedEnd(480), shareScope: 'private' }).then(() => toast({ title: 'Track This Phone started', description: 'The last-known device position will update while location access remains available.' })).catch((caught) => toast({ title: 'Tracking did not start', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' })); }}><Smartphone className="mr-2 h-4 w-4" />Start 8-hour phone tracking</Button>}</CardContent></Card>
            <SafetyBoundaryCard phone />
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-6">
          <Card className="border-[#F2A900]/50 shadow-large"><CardHeader><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" />Pretoria Campus Structure Reference</CardTitle><CardDescription>This traced version of the uploaded structure map is an additional reference only. It does not replace the existing live linked GPS campus map below.</CardDescription></CardHeader><CardContent><div className="overflow-hidden rounded-2xl border bg-white p-2"><img src="/campus-guides/pretoria-campus-structure-map.svg" alt="TUT Pretoria Campus structure reference showing numbered buildings, roads, transport points, sports areas and Technikonrand Station" className="mx-auto max-h-[760px] w-full object-contain" /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">The source map visibly identifies Buildings 1-13, 20, 21, 30, 31, 44, 50-53, the dam, bus stops, bus parking, Prestige Auditorium, Denisburg, the Visitors Centre and Technikonrand Station. Some building numbers are absent from the supplied map and remain covered by the separate Building Structure guide.</p></CardContent></Card>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"><strong>Existing live GPS map retained.</strong> The component below remains the connected campus map with directions, campus coordinates, Wi-Fi tools and existing data sources.</div>
          <CampusMap />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent><DialogHeader><DialogTitle>{selectedStudent?.full_name}</DialogTitle><DialogDescription>{selectedStudent?.is_exact ? 'Exact location shared with explicit consent.' : 'Approximate campus-area location.'}</DialogDescription></DialogHeader>{selectedStudent && <div className="space-y-4"><div className="flex items-center gap-4"><Avatar className="h-16 w-16 border-2 border-fuchsia-400"><AvatarImage src={selectedStudent.avatar_url ?? undefined} /><AvatarFallback>{initials(selectedStudent.full_name)}</AvatarFallback></Avatar><div><p className="font-bold">{selectedStudent.status_message ?? 'Visible on Campus Radar'}</p><p className="text-sm text-muted-foreground">{selectedStudent.zone_label ?? 'Campus location shared'}</p></div></div><div className="grid grid-cols-2 gap-3"><StatusTile icon={Clock3} label="Last seen" value={new Date(selectedStudent.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /><StatusTile icon={Compass} label="Precision" value={selectedStudent.is_exact ? `Exact ±${Math.round(selectedStudent.accuracy_meters ?? 0)}m` : 'Approximate area'} /></div></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border bg-muted/35 p-3"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div><p className="mt-2 line-clamp-2 text-sm font-semibold">{value}</p></div>;
}

function SafetyBoundaryCard({ phone = false }: { phone?: boolean }) {
  return <Card className="border-[#F2A900]/55 bg-gradient-to-br from-[#F2A900]/12 to-background shadow-large"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#D7193F]" />What this feature can and cannot do</CardTitle></CardHeader><CardContent className="space-y-3 text-sm leading-6"><Boundary icon={CheckCircle2} text="Records consented live or last-known location and connects an alert to the official CCSF incident workflow." /><Boundary icon={CheckCircle2} text="Keeps the existing campus GPS map and incident live-location system unchanged." /><Boundary icon={AlertTriangle} text={phone ? 'A web app cannot locate a powered-off phone or bypass Android/iOS location restrictions. It stores the last location received while permission and app execution are available.' : 'It does not guarantee continuous background tracking when the browser is fully closed or the operating system suspends the app.'} /><Boundary icon={PhoneCall} text="For immediate danger, call 112 or SAPS 10111 and follow verified campus CPS instructions." /></CardContent></Card>;
}

function Boundary({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return <div className="flex items-start gap-3"><Icon className="mt-1 h-4 w-4 shrink-0 text-primary" /><span>{text}</span></div>;
}
