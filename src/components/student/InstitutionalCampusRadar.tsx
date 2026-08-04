import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Building2,
  Clock3,
  Crosshair,
  Gauge,
  Info,
  Layers3,
  LocateFixed,
  MapPinned,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CAMPUS_CATEGORY_COLOURS,
  CAMPUS_CATEGORY_LABELS,
  getCampusSafetyPlan,
  searchCampusPois,
  type CampusPoiCategory,
  type CampusSafetyPoi,
} from '@/data/campusSafetyCatalog';
import { formatCoordinatePair } from '@/lib/reverseGeocode';
import type { CampusLocation } from '@/types/pilot';
import type { SafetyLocationFix, SafetyRadarStudent } from '@/types/safetyMobility';

const RADAR_WIDTH = 800;
const RADAR_HEIGHT = 600;
const RADAR_CENTRE = { x: 400, y: 300 };
const RADAR_RADIUS = 238;

const toRadians = (value: number) => value * Math.PI / 180;

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'TU';

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earth = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number) {
  const y = Math.sin(toRadians(lng2 - lng1)) * Math.cos(toRadians(lat2));
  const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2))
    - Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lng2 - lng1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function formatDistance(distance: number) {
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(1)} km`;
}

function formatFixAge(capturedAt?: string | null) {
  if (!capturedAt) return 'No current fix';
  const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(capturedAt).getTime()) / 1000));
  if (ageSeconds < 5) return 'Live now';
  if (ageSeconds < 60) return `${ageSeconds}s ago`;
  return `${Math.floor(ageSeconds / 60)}m ago`;
}

function getLocationQuality(accuracy?: number | null) {
  if (!accuracy || !Number.isFinite(accuracy)) return { label: 'Unavailable', detail: 'Capture a new device position.', className: 'text-muted-foreground' };
  if (accuracy <= 15) return { label: 'Excellent', detail: 'High-confidence outdoor-quality fix.', className: 'text-emerald-600' };
  if (accuracy <= 35) return { label: 'Strong', detail: 'Suitable for exact Campus Radar sharing.', className: 'text-emerald-600' };
  if (accuracy <= 50) return { label: 'Verified', detail: 'Within the exact-sharing quality boundary.', className: 'text-blue-600' };
  if (accuracy <= 100) return { label: 'Approximate', detail: 'Useful for area awareness, not room-level routing.', className: 'text-amber-600' };
  return { label: 'Weak', detail: 'Move outdoors and refresh before relying on this fix.', className: 'text-destructive' };
}

interface InstitutionalCampusRadarProps {
  campus: CampusLocation;
  selfLocation: SafetyLocationFix | null;
  students: SafetyRadarStudent[];
  loading?: boolean;
  onRefresh?: () => void | Promise<void>;
  onSelectStudent?: (student: SafetyRadarStudent) => void;
  defaultView?: 'live' | 'plan';
  planOnly?: boolean;
}

export function InstitutionalCampusRadar({
  campus,
  selfLocation,
  students,
  loading = false,
  onRefresh,
  onSelectStudent,
  defaultView = 'live',
  planOnly = false,
}: InstitutionalCampusRadarProps) {
  const locationQuality = getLocationQuality(selfLocation?.accuracy);

  if (planOnly) return <CampusPlanExplorer campus={campus} />;

  return (
    <Card className="overflow-hidden border-[#002F6C]/20 shadow-large" data-testid="institutional-campus-radar">
      <CardHeader className="border-b bg-gradient-to-r from-[#002F6C] via-[#003F82] to-[#0055A5] text-white">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#F2A900]/15 p-2"><Radio className="h-5 w-5 text-[#F2A900]" /></span>
              <CardTitle className="text-xl">Campus Safety Radar</CardTitle>
            </div>
            <CardDescription className="mt-2 max-w-3xl text-white/70">
              A first-party My CCSF map. Live positions are plotted from measured coordinates and their stated accuracy; campus destinations use the approved institutional structure reference.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => void onRefresh?.()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh live data
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue={defaultView} className="w-full">
          <div className="border-b bg-muted/30 p-3 sm:p-4">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="live" className="py-3"><Crosshair className="mr-2 h-4 w-4" />Live Radar</TabsTrigger>
              <TabsTrigger value="plan" className="py-3"><MapPinned className="mr-2 h-4 w-4" />Campus Plan</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="live" className="m-0">
            <LiveRadarMap selfLocation={selfLocation} students={students} onSelectStudent={onSelectStudent} />
            <div className="grid gap-3 border-t bg-background p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
              <Metric icon={Gauge} label="Fix quality" value={locationQuality.label} valueClassName={locationQuality.className} detail={locationQuality.detail} />
              <Metric icon={LocateFixed} label="Measured accuracy" value={selfLocation?.accuracy ? `±${Math.round(selfLocation.accuracy)} m` : 'Unavailable'} detail="Reported by the phone operating system." />
              <Metric icon={Clock3} label="Fix freshness" value={formatFixAge(selfLocation?.capturedAt)} detail="Refresh before acting on an old position." />
              <Metric icon={Users} label="Visible students" value={`${students.length}`} detail="Only voluntary, non-stale Radar sharing is shown." />
            </div>
            {selfLocation && (
              <div className="border-t bg-slate-950 px-4 py-3 font-mono text-xs text-slate-200 sm:px-5">
                <span className="font-bold text-[#F2A900]">DEVICE FIX</span>
                <span className="mx-2 text-white/30">•</span>
                {formatCoordinatePair(selfLocation.latitude, selfLocation.longitude)}
                <span className="mx-2 text-white/30">•</span>
                Accuracy ±{Math.round(selfLocation.accuracy ?? 0)} m
              </div>
            )}
          </TabsContent>
          <TabsContent value="plan" className="m-0 p-4 sm:p-5">
            <CampusPlanExplorer campus={campus} embedded />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function LiveRadarMap({
  selfLocation,
  students,
  onSelectStudent,
}: {
  selfLocation: SafetyLocationFix | null;
  students: SafetyRadarStudent[];
  onSelectStudent?: (student: SafetyRadarStudent) => void;
}) {
  const reducedMotion = useReducedMotion();
  const plotted = useMemo(() => {
    if (!selfLocation) return [];
    return students.slice(0, 40).map((student) => {
      const distance = haversineMeters(selfLocation.latitude, selfLocation.longitude, student.latitude, student.longitude);
      const bearing = bearingDegrees(selfLocation.latitude, selfLocation.longitude, student.latitude, student.longitude);
      return { student, distance, bearing };
    });
  }, [selfLocation, students]);

  const maxRange = useMemo(() => {
    const farthest = plotted.reduce((maximum, item) => Math.max(maximum, item.distance), 0);
    const accuracyBoundary = Math.max(selfLocation?.accuracy ?? 0, 50) * 2;
    return Math.min(2_000, Math.max(250, Math.ceil(Math.max(farthest, accuracyBoundary) / 50) * 50));
  }, [plotted, selfLocation?.accuracy]);

  const selfAccuracyRadius = selfLocation?.accuracy
    ? Math.min(RADAR_RADIUS, Math.max(9, (selfLocation.accuracy / maxRange) * RADAR_RADIUS))
    : 0;

  return (
    <div className="relative overflow-hidden bg-[#03152D]" aria-label="Internal live campus safety map">
      <svg viewBox={`0 0 ${RADAR_WIDTH} ${RADAR_HEIGHT}`} className="block min-h-[390px] w-full sm:min-h-[560px]" role="img" aria-label="Live relative Campus Safety Radar">
        <defs>
          <radialGradient id="radarBackground" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#0B4B7A" stopOpacity="0.62" />
            <stop offset="45%" stopColor="#06284F" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#020817" />
          </radialGradient>
          <radialGradient id="accuracyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.03" />
          </radialGradient>
          <filter id="markerShadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <pattern id="smallGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60A5FA" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={RADAR_WIDTH} height={RADAR_HEIGHT} fill="url(#radarBackground)" />
        <rect width={RADAR_WIDTH} height={RADAR_HEIGHT} fill="url(#smallGrid)" />
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <circle cx={RADAR_CENTRE.x} cy={RADAR_CENTRE.y} r={RADAR_RADIUS * ratio} fill="none" stroke="#7DD3FC" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray={ratio === 1 ? undefined : '6 8'} />
            <text x={RADAR_CENTRE.x + 8} y={RADAR_CENTRE.y - RADAR_RADIUS * ratio + 18} fill="#BAE6FD" fillOpacity="0.72" fontSize="13" fontWeight="700">
              {formatDistance(maxRange * ratio)}
            </text>
          </g>
        ))}
        <line x1={RADAR_CENTRE.x - RADAR_RADIUS} y1={RADAR_CENTRE.y} x2={RADAR_CENTRE.x + RADAR_RADIUS} y2={RADAR_CENTRE.y} stroke="#7DD3FC" strokeOpacity="0.16" />
        <line x1={RADAR_CENTRE.x} y1={RADAR_CENTRE.y - RADAR_RADIUS} x2={RADAR_CENTRE.x} y2={RADAR_CENTRE.y + RADAR_RADIUS} stroke="#7DD3FC" strokeOpacity="0.16" />
        <text x={RADAR_CENTRE.x} y={38} textAnchor="middle" fill="#E0F2FE" fontSize="13" fontWeight="900" letterSpacing="3">NORTH</text>

        {selfLocation && selfAccuracyRadius > 0 && (
          <motion.circle
            cx={RADAR_CENTRE.x}
            cy={RADAR_CENTRE.y}
            r={selfAccuracyRadius}
            fill="url(#accuracyGlow)"
            stroke="#38BDF8"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeDasharray="7 7"
            initial={reducedMotion ? false : { opacity: 0.4, scale: 0.85 }}
            animate={reducedMotion ? undefined : { opacity: [0.42, 0.82, 0.42], scale: [0.94, 1.04, 0.94] }}
            transition={reducedMotion ? undefined : { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
            style={{ transformOrigin: `${RADAR_CENTRE.x}px ${RADAR_CENTRE.y}px` }}
          />
        )}

        {plotted.map(({ student, distance, bearing }) => {
          const radialDistance = Math.min(RADAR_RADIUS - 24, Math.max(18, (distance / maxRange) * RADAR_RADIUS));
          const radians = toRadians(bearing - 90);
          const x = RADAR_CENTRE.x + Math.cos(radians) * radialDistance;
          const y = RADAR_CENTRE.y + Math.sin(radians) * radialDistance;
          const uncertainty = Math.min(70, Math.max(12, ((student.accuracy_meters ?? 120) / maxRange) * RADAR_RADIUS));
          return (
            <g
              key={student.user_id}
              role="button"
              tabIndex={0}
              aria-label={`Open ${student.full_name}, ${formatDistance(distance)} away`}
              onClick={() => onSelectStudent?.(student)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectStudent?.(student);
                }
              }}
              className="cursor-pointer outline-none"
            >
              <circle cx={x} cy={y} r={uncertainty} fill={student.is_exact ? '#22D3EE' : '#A78BFA'} fillOpacity="0.08" stroke={student.is_exact ? '#22D3EE' : '#C4B5FD'} strokeOpacity="0.42" strokeDasharray={student.is_exact ? undefined : '4 5'} />
              <circle cx={x} cy={y} r="21" fill={student.is_exact ? '#0055A5' : '#5B21B6'} stroke="#fff" strokeWidth="2" filter="url(#markerShadow)" />
              <text x={x} y={y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">{initials(student.full_name)}</text>
              <text x={x} y={y + 38} textAnchor="middle" fill="#E0F2FE" fontSize="11" fontWeight="700">{formatDistance(distance)}</text>
            </g>
          );
        })}

        <g filter="url(#markerShadow)">
          <circle cx={RADAR_CENTRE.x} cy={RADAR_CENTRE.y} r="31" fill="#F2A900" stroke="#fff" strokeWidth="3" />
          <circle cx={RADAR_CENTRE.x} cy={RADAR_CENTRE.y} r="12" fill="#002F6C" />
          <path d={`M ${RADAR_CENTRE.x} ${RADAR_CENTRE.y - 18} L ${RADAR_CENTRE.x + 6} ${RADAR_CENTRE.y - 5} L ${RADAR_CENTRE.x} ${RADAR_CENTRE.y - 9} L ${RADAR_CENTRE.x - 6} ${RADAR_CENTRE.y - 5} Z`} fill="#002F6C" />
        </g>
        <text x={RADAR_CENTRE.x} y={RADAR_CENTRE.y + 52} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900">YOUR DEVICE</text>

        {!selfLocation && (
          <g>
            <rect x="180" y="220" width="440" height="160" rx="28" fill="#020817" fillOpacity="0.88" stroke="#38BDF8" strokeOpacity="0.4" />
            <text x="400" y="275" textAnchor="middle" fill="#F2A900" fontSize="22" fontWeight="900">LOCATION FIX REQUIRED</text>
            <text x="400" y="311" textAnchor="middle" fill="#E0F2FE" fontSize="15">Refresh your device location to plot measured positions.</text>
            <text x="400" y="340" textAnchor="middle" fill="#94A3B8" fontSize="13">The app will not invent a location when GPS data is unavailable.</text>
          </g>
        )}
      </svg>
      <div className="absolute left-3 top-3 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-[11px] font-bold text-slate-200 backdrop-blur sm:left-5 sm:top-5 sm:text-xs">
        <span className="text-[#F2A900]">INTERNAL MAP</span> · No external redirect
      </div>
    </div>
  );
}

export function CampusPlanExplorer({
  campus,
  embedded = false,
}: {
  campus: CampusLocation;
  embedded?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const plan = getCampusSafetyPlan(campus);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(plan?.defaultOriginId ?? null);
  const [category, setCategory] = useState<CampusPoiCategory | 'all'>('all');
  const [isDepthMode, setIsDepthMode] = useState(true);
  const [zoom, setZoom] = useState(1);

  const filtered = useMemo(() => {
    if (!plan) return [];
    const searched = searchCampusPois(plan, query);
    return category === 'all' ? searched : searched.filter((poi) => poi.category === category);
  }, [category, plan, query]);

  const selected = plan?.pois.find((poi) => poi.id === selectedId) ?? null;
  const origin = plan?.pois.find((poi) => poi.id === plan.defaultOriginId) ?? null;
  const routePath = origin?.x !== undefined && origin.y !== undefined && selected?.x !== undefined && selected.y !== undefined && selected.id !== origin.id
    ? `M ${origin.x} ${origin.y} C ${(origin.x + selected.x) / 2} ${origin.y - 90}, ${(origin.x + selected.x) / 2} ${selected.y + 70}, ${selected.x} ${selected.y}`
    : null;

  if (!plan) {
    return (
      <Card className={embedded ? 'border-dashed shadow-none' : 'shadow-large'} data-testid="campus-plan-unavailable">
        <CardContent className="p-7 text-center sm:p-10">
          <MapPinned className="mx-auto h-12 w-12 text-primary" />
          <h3 className="mt-4 text-xl font-black">Validated campus plan pending</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Live device coordinates and accuracy remain available, but My CCSF will not publish invented buildings or estimated office positions for this campus. The plan activates after institutional POIs are verified.
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryOptions: Array<CampusPoiCategory | 'all'> = ['all', 'administration', 'protection', 'control', 'student_support', 'transport', 'meeting_point', 'building'];

  return (
    <div className="space-y-4" data-testid="campus-plan-explorer">
      {!embedded && (
        <div className="rounded-3xl border border-[#F2A900]/35 bg-gradient-to-br from-[#002F6C] via-[#003F82] to-[#10172A] p-5 text-white shadow-large sm:p-7">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <Badge className="bg-[#F2A900] text-[#002F6C] hover:bg-[#F2A900]"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Institutional map layer</Badge>
              <h2 className="mt-3 text-2xl font-black sm:text-3xl">{plan.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">Search official services, inspect campus landmarks and generate an internal visual route without leaving My CCSF.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => setIsDepthMode((value) => !value)}>
                <Layers3 className="mr-2 h-4 w-4" />{isDepthMode ? '2D view' : '2.5D view'}
              </Button>
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { setQuery(''); setCategory('all'); setSelectedId(plan.defaultOriginId); setZoom(1); }}>
                <RefreshCw className="mr-2 h-4 w-4" />Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">
        <Card className="overflow-hidden border-[#002F6C]/20 shadow-large">
          <CardHeader className="border-b bg-background/95">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Interactive campus structure</CardTitle>
                <CardDescription>Tap a marker or search a service. Depth mode is visual only and does not change destination data.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.max(0.85, Number((value - 0.1).toFixed(2))))} aria-label="Zoom campus plan out"><ZoomOut className="h-4 w-4" /></Button>
                <Badge variant="secondary" className="min-w-14 justify-center">{Math.round(zoom * 100)}%</Badge>
                <Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))))} aria-label="Zoom campus plan in"><ZoomIn className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-10" placeholder="Search Building 21, registration, CPS, Control, counselling…" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
              {categoryOptions.map((option) => (
                <Button key={option} size="sm" variant={category === option ? 'default' : 'outline'} className="shrink-0" onClick={() => setCategory(option)}>
                  {option === 'all' ? 'All destinations' : CAMPUS_CATEGORY_LABELS[option]}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="overflow-auto bg-gradient-to-br from-slate-100 via-white to-blue-50 p-3 sm:p-5 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/50">
            <div className="mx-auto min-w-[640px] max-w-[1100px] py-4 sm:py-8" style={{ perspective: '1500px' }}>
              <motion.div
                className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-[0_35px_70px_rgba(15,23,42,0.32)]"
                animate={reducedMotion ? undefined : {
                  rotateX: isDepthMode ? 46 : 0,
                  rotateZ: isDepthMode ? -1.5 : 0,
                  scale: zoom,
                }}
                style={reducedMotion ? { transform: `scale(${zoom})` } : undefined}
                transition={{ type: 'spring', stiffness: 110, damping: 20 }}
              >
                <img src={plan.sourceImage} alt={`${plan.name} approved campus structure reference`} className="block h-auto w-full select-none" draggable={false} />
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${plan.viewBox.width} ${plan.viewBox.height}`} aria-hidden="true">
                  {routePath && (
                    <>
                      <path d={routePath} fill="none" stroke="#fff" strokeWidth="15" strokeLinecap="round" strokeDasharray="20 18" opacity="0.92" />
                      <path d={routePath} fill="none" stroke="#D7193F" strokeWidth="8" strokeLinecap="round" strokeDasharray="20 18" />
                    </>
                  )}
                </svg>
                {plan.pois.filter((poi) => poi.x !== undefined && poi.y !== undefined).map((poi) => {
                  const colours = CAMPUS_CATEGORY_COLOURS[poi.category];
                  const active = selected?.id === poi.id;
                  return (
                    <button
                      key={poi.id}
                      type="button"
                      className="group absolute -translate-x-1/2 -translate-y-1/2 touch-manipulation rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2A900]/70"
                      style={{ left: `${(poi.x! / plan.viewBox.width) * 100}%`, top: `${(poi.y! / plan.viewBox.height) * 100}%` }}
                      onClick={() => setSelectedId(poi.id)}
                      aria-label={`Select ${poi.name}`}
                    >
                      <span className={`absolute inset-[-10px] rounded-full blur-md transition ${active ? 'bg-[#F2A900]/55' : 'bg-black/18 group-hover:bg-[#F2A900]/35'}`} />
                      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[11px] font-black text-white shadow-xl sm:h-11 sm:w-11" style={{ backgroundColor: colours.fill, boxShadow: `0 8px 18px ${colours.stroke}66` }}>
                        {poi.category === 'administration' ? '21' : poi.category === 'meeting_point' ? 'F' : poi.shortName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-extrabold text-white shadow-lg ${active ? 'block' : 'hidden group-hover:block'}`}>{poi.shortName}</span>
                    </button>
                  );
                })}
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-[#F2A900]/40 shadow-large">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-[#D7193F]" />Selected destination</CardTitle>
              <CardDescription>Institutional service information is kept separate from unverified turn-by-turn claims.</CardDescription>
            </CardHeader>
            <CardContent>
              {selected ? <PoiDetail poi={selected} origin={origin} hasVisualRoute={Boolean(routePath)} /> : <p className="text-sm text-muted-foreground">Choose a destination from the map or directory.</p>}
            </CardContent>
          </Card>

          <Card className="shadow-large">
            <CardHeader className="pb-3"><CardTitle className="text-base">Destination directory</CardTitle><CardDescription>{filtered.length} matching destination(s)</CardDescription></CardHeader>
            <CardContent className="max-h-[480px] space-y-2 overflow-y-auto">
              {filtered.map((poi) => {
                const colours = CAMPUS_CATEGORY_COLOURS[poi.category];
                return (
                  <button key={poi.id} type="button" onClick={() => setSelectedId(poi.id)} className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === poi.id ? 'border-primary bg-primary/5' : 'bg-background'}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colours.fill }} />
                      <span className="min-w-0">
                        <span className="block font-extrabold leading-5">{poi.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{poi.buildingLabel}{poi.roomLabel ? ` · ${poi.roomLabel}` : ''}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
              {!filtered.length && <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No verified destination matches this search.</div>}
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{plan.notice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PoiDetail({ poi, origin, hasVisualRoute }: { poi: CampusSafetyPoi; origin: CampusSafetyPoi | null; hasVisualRoute: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <Badge variant="outline">{CAMPUS_CATEGORY_LABELS[poi.category]}</Badge>
        <h3 className="mt-3 text-xl font-black">{poi.name}</h3>
        <p className="mt-1 text-sm font-bold text-primary">{poi.buildingLabel}{poi.roomLabel ? ` · ${poi.roomLabel}` : ''}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{poi.description}</p>
      </div>
      <div className="rounded-2xl bg-muted/45 p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Available support</p>
        <ul className="mt-3 space-y-2">
          {poi.services.map((service) => <li key={service} className="flex items-start gap-2 text-sm"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{service}</li>)}
        </ul>
      </div>
      <div className="rounded-2xl border border-[#F2A900]/35 bg-[#F2A900]/10 p-4 text-sm leading-6">
        <div className="flex items-center gap-2 font-extrabold text-[#7A5200] dark:text-[#F2A900]"><Navigation className="h-4 w-4" />Internal route guidance</div>
        <p className="mt-2">
          {hasVisualRoute && origin
            ? `The campus-plan layer shows a visual connection from ${origin.shortName} to ${poi.shortName}. Confirm signs and current access points when walking.`
            : `${poi.buildingLabel}${poi.roomLabel ? `, room ${poi.roomLabel}` : ''} is the verified service reference. A false map pin is intentionally not shown until its plan position is institutionally validated.`}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />Data confidence: {poi.confidence.replace(/_/g, ' ')}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  valueClassName = '',
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border bg-muted/25 p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</div>
      <p className={`mt-2 text-lg font-black ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function RadarStudentAvatar({ student }: { student: SafetyRadarStudent }) {
  return (
    <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-lg">
      <AvatarImage src={student.avatar_url ?? undefined} alt={`${student.full_name} profile photo`} />
      <AvatarFallback className="bg-primary font-black text-primary-foreground">{initials(student.full_name)}</AvatarFallback>
    </Avatar>
  );
}
