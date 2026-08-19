import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Ban, CheckCircle2, CloudCog, Database, Download, Eye, FileClock,
  Fingerprint, Gauge, KeyRound, Laptop, LockKeyhole, LogOut, Network, RefreshCw, Rocket,
  Search, ServerCog, ShieldAlert, ShieldCheck, SlidersHorizontal, Users, Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

interface DeveloperResponse extends Record<string, unknown> { error?: string; code?: string }
type Row = Record<string, unknown>;
type Mode = 'live' | 'read_only' | 'maintenance' | 'locked';

const CAMPUS_LABELS: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main Campus)', arcadia: 'Arcadia', arts: 'Arts', giyani: 'Giyani',
  mbombela: 'Mbombela', polokwane: 'Polokwane', garankuwa: 'Ga-Rankuwa', soshanguve_south: 'Soshanguve South',
  soshanguve_north: 'Soshanguve North', emalahleni: 'Emalahleni',
};
const MODULE_LABELS: Record<string, string> = {
  report_incident: 'Report Incident', evidence: 'Evidence Uploads', radar: 'Campus Radar', mobility: 'Safety Mobility',
  community: 'Community', sport: 'Sports', judiciary: 'Judiciary', chat: 'Chat / Support', notifications: 'Notifications',
  admin_portal: 'Admin Portal', cps_portal: 'CPS / Security Portal', official_dashboard: 'Official Dashboard',
  pilot_reporting: 'Pilot Reporting', pilot_reviews: 'Pilot Reviews', pilot_resources: 'Pilot Resources', safety_quest: 'Safety Quest',
};
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((row): row is Row => Boolean(row) && typeof row === 'object' && !Array.isArray(row)) : [];
const asObject = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const display = (value: unknown, fallback = '—') => value == null || value === '' ? fallback : String(value);
const formatDate = (value: unknown) => value ? new Date(String(value)).toLocaleString('en-ZA') : '—';

async function developerCall(action: string, payload: Record<string, unknown> = {}): Promise<DeveloperResponse> {
  const { data, error } = await supabase.functions.invoke<DeveloperResponse>('developer-control', { body: { action, payload } });
  if (error) throw error;
  const response = data ?? {};
  if (response.error) {
    const failure = new Error(response.error) as Error & { code?: string };
    failure.code = response.code;
    throw failure;
  }
  return response;
}

export default function DeveloperPortalV2() {
  const { signOut } = useAuth();
  const { refresh: refreshRuntime } = useRuntimeControl();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [summary, setSummary] = useState<Row>({});
  const [users, setUsers] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [runtime, setRuntime] = useState<Row>({});
  const [features, setFeatures] = useState<Row>({});
  const [security, setSecurity] = useState<Row>({});
  const [health, setHealth] = useState<Row>({});
  const [metrics, setMetrics] = useState<Row>({});
  const [release, setRelease] = useState<Row>({});
  const [ipAllow, setIpAllow] = useState<Row>({});
  const [diagnostics, setDiagnostics] = useState<Row>({});
  const [audit, setAudit] = useState<Row[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [freshCode, setFreshCode] = useState('');
  const [freshUntil, setFreshUntil] = useState<string | null>(null);
  const [campusModes, setCampusModes] = useState<Record<string, Mode>>({});
  const [newIp, setNewIp] = useState('');
  const [maintenance, setMaintenance] = useState({ scope: 'global', mode: 'maintenance', campus: 'pretoria_west_main', module_key: 'report_incident', starts_at: '', ends_at: '', message: '' });
  const [cohort, setCohort] = useState({ feature_key: 'report_incident', enabled: 'true', rollout_percent: '100', campus: '', role: '', user_id: '', starts_at: '', ends_at: '', reason: '' });
  const [rolePreview, setRolePreview] = useState('student');
  const [releaseForm, setReleaseForm] = useState({ deployment_url: '', notes: '' });

  const loadEverything = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, usersRes, sessionsRes, runtimeRes, featuresRes, securityRes, healthRes, metricsRes, releaseRes, ipRes, diagRes, auditRes] = await Promise.all([
        developerCall('summary'), developerCall('list_users', { query: userQuery }), developerCall('list_sessions', { query: sessionQuery }), developerCall('list_runtime'),
        developerCall('list_features'), developerCall('list_security'), developerCall('database_health'), developerCall('metrics', { minutes: 60 }),
        developerCall('release_info'), developerCall('list_ip_allowlist'), developerCall('role_diagnostics'), developerCall('list_audit'),
      ]);
      setSummary(summaryRes); setUsers(asRows(usersRes.users)); setSessions(asRows(sessionsRes.sessions)); setRuntime(runtimeRes); setFeatures(featuresRes); setSecurity(securityRes);
      setHealth(asObject(healthRes.health)); setMetrics(asObject(metricsRes.metrics)); setRelease(asObject(releaseRes.release)); setIpAllow(ipRes); setDiagnostics(asObject(diagRes.diagnostics)); setAudit(asRows(auditRes.audit));
      const nextModes: Record<string, Mode> = {}; for (const row of asRows(runtimeRes.campuses)) nextModes[String(row.campus)] = String(row.mode) as Mode; setCampusModes(nextModes);
    } catch (caught) {
      toast({ title: 'Developer control plane unavailable', description: caught instanceof Error ? caught.message : 'Unable to load developer data.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [sessionQuery, toast, userQuery]);

  useEffect(() => { void loadEverything(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = async (key: string, action: string, payload: Record<string, unknown> = {}, refresh = true) => {
    setBusy(key);
    try {
      const result = await developerCall(action, payload);
      toast({ title: 'Developer control updated', description: result.success === false ? 'The operation did not complete.' : 'The control-plane change was recorded and audited.' });
      if (refresh) await loadEverything();
      await refreshRuntime({ type: 'developer_control_changed', severity: 'info', metadata: { action } });
      return result;
    } catch (caught) {
      const error = caught as Error & { code?: string };
      toast({ title: error.code === 'reauthentication_required' ? 'Fresh MFA required' : 'Control update failed', description: error.message, variant: 'destructive' });
      return null;
    } finally { setBusy(null); }
  };

  const unlockSensitiveControls = async () => {
    if (!/^\d{6}$/.test(freshCode)) { toast({ title: 'Enter a six-digit authenticator code', variant: 'destructive' }); return; }
    setBusy('fresh-mfa');
    try {
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors(); if (factorError) throw factorError;
      const factor = factors.totp.find((item) => item.status === 'verified'); if (!factor) throw new Error('No verified TOTP factor is available.');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: freshCode }); if (verifyError) throw verifyError;
      await supabase.auth.refreshSession();
      const result = await developerCall('mark_reauthenticated');
      setFreshUntil(String(result.expires_at ?? '')); setFreshCode(''); toast({ title: 'Sensitive controls unlocked', description: `Fresh MFA is valid until ${formatDate(result.expires_at)}.` });
    } catch (caught) { toast({ title: 'Fresh MFA failed', description: caught instanceof Error ? caught.message : 'Verification failed.', variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const system = asObject(summary.system);
  const flags = asRows(features.flags);
  const featureRules = asRows(features.rules);
  const campuses = asRows(runtime.campuses);
  const windows = asRows(runtime.windows);
  const anomalies = asRows(security.anomalies);
  const alerts = asRows(security.alerts);
  const alertRules = asRows(security.rules);
  const ipEntries = asRows(ipAllow.entries);
  const buildMeta = {
    sha: import.meta.env.VITE_BUILD_SHA || 'unknown',
    branch: import.meta.env.VITE_BUILD_BRANCH || 'unknown',
    environment: import.meta.env.VITE_DEPLOYMENT_ENV || import.meta.env.MODE,
  };
  const routes = asObject(diagnostics.routes);
  const selectedRoutes = Array.isArray(routes[rolePreview]) ? routes[rolePreview] as unknown[] : [];

  const createMaintenance = async () => {
    if (!maintenance.starts_at || !maintenance.ends_at) { toast({ title: 'Start and end times are required', variant: 'destructive' }); return; }
    await mutate('maintenance-create', 'create_maintenance', {
      scope: maintenance.scope, mode: maintenance.mode, campus: maintenance.scope === 'campus' ? maintenance.campus : null,
      module_key: maintenance.scope === 'module' ? maintenance.module_key : null, message: maintenance.message,
      starts_at: new Date(maintenance.starts_at).toISOString(), ends_at: new Date(maintenance.ends_at).toISOString(),
    });
  };

  const createCohort = async () => {
    await mutate('cohort-create', 'create_feature_rule', {
      feature_key: cohort.feature_key, enabled: cohort.enabled === 'true', rollout_percent: cohort.rollout_percent === '' ? null : Number(cohort.rollout_percent),
      campuses: cohort.campus ? [cohort.campus] : [], roles: cohort.role ? [cohort.role] : [], user_ids: cohort.user_id ? [cohort.user_id] : [],
      starts_at: cohort.starts_at ? new Date(cohort.starts_at).toISOString() : null, ends_at: cohort.ends_at ? new Date(cohort.ends_at).toISOString() : null, reason: cohort.reason,
    });
  };

  const exportAudit = async () => {
    setBusy('audit-export');
    try {
      const result = await developerCall('export_audit');
      const blob = new Blob([String(result.csv ?? '')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = String(result.filename ?? 'ccsf-developer-audit.csv'); anchor.click(); URL.revokeObjectURL(url);
      toast({ title: 'Audit export created' });
    } catch (caught) { toast({ title: 'Audit export failed', description: caught instanceof Error ? caught.message : 'Try again.', variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-background"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 font-semibold">Loading Developer Control Plane…</span></main>;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 border-b border-t-4 border-t-[#F2A900] bg-background/95 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><InstitutionBrand size="header" /><div><div className="flex items-center gap-2"><ServerCog className="h-5 w-5 text-primary" /><h1 className="text-xl font-black">Developer Control Plane</h1><Badge>God Mode</Badge></div><p className="text-xs text-muted-foreground">AAL2 protected · production controls · audited actions</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><Badge variant={freshUntil && new Date(freshUntil) > new Date() ? 'default' : 'outline'}>{freshUntil && new Date(freshUntil) > new Date() ? `Fresh MFA until ${new Date(freshUntil).toLocaleTimeString('en-ZA')}` : 'Sensitive controls locked'}</Badge><Button variant="outline" onClick={() => void loadEverything()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button variant="ghost" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button></div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 lg:p-6">
        <Card className="border-[#F2A900]/55"><CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="flex items-center gap-2 font-bold"><KeyRound className="h-4 w-4 text-primary" />Fresh re-authentication for destructive/sensitive controls</p><p className="mt-1 text-sm text-muted-foreground">Enter a new code from your authenticator. This creates a short-lived server-side control window independent of the normal AAL2 login.</p></div><div className="flex gap-2"><Input value={freshCode} onChange={(event) => setFreshCode(event.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} inputMode="numeric" placeholder="6-digit code" className="w-40 font-mono" /><Button onClick={() => void unlockSensitiveControls()} disabled={busy === 'fresh-mfa'}><ShieldCheck className="mr-2 h-4 w-4" />Unlock</Button></div></CardContent></Card>

        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 p-1">
            {['overview','campuses','people','sessions','modules','security','health','releases','diagnostics','audit'].map((tab) => <TabsTrigger key={tab} value={tab} className="capitalize">{tab}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric icon={Users} label="Onboarded users" value={display(asObject(summary.users).total,'0')} /><Metric icon={Laptop} label="Auth sessions" value={display(asObject(summary.sessions).total,'0')} /><Metric icon={Ban} label="Restrictions" value={display(asObject(summary.restrictions).active,'0')} /><Metric icon={ShieldAlert} label="Open alerts" value={display(asObject(summary.alerts).unacknowledged,'0')} /><Metric icon={Activity} label="24h telemetry" value={display(asObject(summary.health_24h).total_events,'0')} /></div>
            <Card><CardHeader><CardTitle>Global application state</CardTitle><CardDescription>Live allows normal operation. Read-only preserves viewing but rejects writes. Maintenance and Full Lock deny non-developer access.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4">{(['live','read_only','maintenance','locked'] as Mode[]).map((mode) => <Button key={mode} variant={String(system.mode) === mode ? 'default' : 'outline'} className="h-16 capitalize" disabled={busy === `system-${mode}`} onClick={() => void mutate(`system-${mode}`,'set_system',{config:{mode,message:mode==='locked'?'CCSF is temporarily locked by the developer.':mode==='maintenance'?'CCSF is undergoing scheduled maintenance.':mode==='read_only'?'CCSF is temporarily in read-only emergency mode.':''}})}>{mode === 'locked' ? <LockKeyhole className="mr-2 h-5 w-5" /> : mode === 'read_only' ? <Eye className="mr-2 h-5 w-5" /> : mode === 'maintenance' ? <Wrench className="mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}{mode.replace('_',' ')}</Button>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="campuses" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{campuses.map((row) => { const campus=String(row.campus), mode=campusModes[campus] ?? 'live'; return <Card key={campus}><CardHeader><CardTitle className="text-base">{CAMPUS_LABELS[campus] ?? campus}</CardTitle><CardDescription>Independent campus runtime state</CardDescription></CardHeader><CardContent className="flex gap-2"><select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={mode} onChange={(event) => setCampusModes((current) => ({...current,[campus]:event.target.value as Mode}))}>{['live','read_only','maintenance','locked'].map((item)=><option key={item} value={item}>{item.replace('_',' ')}</option>)}</select><Button onClick={() => void mutate(`campus-${campus}`,'set_campus_mode',{campus,mode})}>Apply</Button></CardContent></Card>; })}</div>
            <Card><CardHeader><CardTitle>Scheduled maintenance / lock window</CardTitle><CardDescription>Schedule a global, campus or module read-only/maintenance/lock period with automatic start and end times.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Field label="Scope"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.scope} onChange={(e)=>setMaintenance({...maintenance,scope:e.target.value})}><option value="global">Global</option><option value="campus">Campus</option><option value="module">Module</option></select></Field><Field label="Mode"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.mode} onChange={(e)=>setMaintenance({...maintenance,mode:e.target.value})}><option value="read_only">Read only</option><option value="maintenance">Maintenance</option><option value="locked">Locked</option></select></Field>{maintenance.scope==='campus'&&<Field label="Campus"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.campus} onChange={(e)=>setMaintenance({...maintenance,campus:e.target.value})}>{Object.entries(CAMPUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>}{maintenance.scope==='module'&&<Field label="Module"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.module_key} onChange={(e)=>setMaintenance({...maintenance,module_key:e.target.value})}>{flags.map((f)=><option key={String(f.key)} value={String(f.key)}>{MODULE_LABELS[String(f.key)]??String(f.key)}</option>)}</select></Field>}<Field label="Starts"><Input type="datetime-local" value={maintenance.starts_at} onChange={(e)=>setMaintenance({...maintenance,starts_at:e.target.value})}/></Field><Field label="Ends"><Input type="datetime-local" value={maintenance.ends_at} onChange={(e)=>setMaintenance({...maintenance,ends_at:e.target.value})}/></Field><Field label="Message"><Input value={maintenance.message} onChange={(e)=>setMaintenance({...maintenance,message:e.target.value})} placeholder="Maintenance notice"/></Field><div className="md:col-span-3"><Button onClick={() => void createMaintenance()}><FileClock className="mr-2 h-4 w-4" />Schedule window</Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Maintenance windows</CardTitle></CardHeader><CardContent className="space-y-2">{windows.map((row)=><div key={String(row.id)} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{display(row.scope)} · {display(row.mode)} {row.campus?`· ${CAMPUS_LABELS[String(row.campus)]??row.campus}`:''} {row.module_key?`· ${MODULE_LABELS[String(row.module_key)]??row.module_key}`:''}</p><p className="text-xs text-muted-foreground">{formatDate(row.starts_at)} → {formatDate(row.ends_at)} · {row.active?'Active/scheduled':'Cancelled'}</p></div>{row.active===true&&<Button size="sm" variant="outline" onClick={() => void mutate(`cancel-${row.id}`,'cancel_maintenance',{id:row.id})}>Cancel</Button>}</div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            <Card><CardContent className="flex gap-2 p-4"><Input value={userQuery} onChange={(e)=>setUserQuery(e.target.value)} placeholder="Search name, surname, email, campus or role"/><Button onClick={() => void loadEverything()}><Search className="mr-2 h-4 w-4" />Search</Button></CardContent></Card>
            <div className="space-y-3">{users.map((row)=><Card key={String(row.user_id)}><CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]"><div><p className="font-bold">{display(row.full_name)} <Badge variant="outline">{display(row.access_status,'approved')}</Badge></p><p className="text-sm text-muted-foreground">{display(row.email)} · {CAMPUS_LABELS[String(row.campus)]??display(row.campus)} · {Array.isArray(row.roles)?row.roles.join(', '):''}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void mutate(`approve-${row.user_id}`,'set_user_access',{user_id:row.user_id,status:'approved',reason:'Developer approved'})}>Approve</Button><Button size="sm" variant="outline" onClick={() => void mutate(`quarantine-${row.user_id}`,'set_user_access',{user_id:row.user_id,status:'quarantined',reason:'Developer quarantine: read-only access'})}>Quarantine</Button><Button size="sm" variant="outline" onClick={() => void mutate(`suspend-${row.user_id}`,'set_user_access',{user_id:row.user_id,status:'suspended',reason:'Developer suspension'})}>Suspend</Button><Button size="sm" variant="destructive" onClick={() => void mutate(`block-${row.user_id}`,'set_user_access',{user_id:row.user_id,status:'blocked',reason:'Developer block'})}>Block</Button><Button size="sm" variant="ghost" onClick={() => void mutate(`revoke-${row.user_id}`,'revoke_user_sessions',{user_id:row.user_id,reason:'Developer session revocation'})}>Revoke sessions</Button></div></CardContent></Card>)}</div>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card><CardContent className="flex gap-2 p-4"><Input value={sessionQuery} onChange={(e)=>setSessionQuery(e.target.value)} placeholder="Search user, IP, browser, OS, device or city"/><Button onClick={() => void loadEverything()}><Search className="mr-2 h-4 w-4" />Search</Button></CardContent></Card>
            <div className="grid gap-3 xl:grid-cols-2">{sessions.map((row)=><Card key={String(row.session_id)}><CardHeader><CardTitle className="text-base">{display(row.full_name)} · {display(row.device_type)}</CardTitle><CardDescription>{display(row.email)} · {display(row.browser_name)} {display(row.browser_version,'')} · {display(row.operating_system)}</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="grid grid-cols-2 gap-2"><Info label="IP" value={display(row.ip_address)}/><Info label="Geography" value={[row.city,row.region,row.country_code].filter(Boolean).join(', ')||'Not supplied by edge'}/><Info label="Last seen" value={formatDate(row.device_last_seen_at??row.updated_at)}/><Info label="Device hash" value={display(row.device_hash)}/></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="destructive" onClick={() => void mutate(`session-${row.session_id}`,'revoke_session',{session_id:row.session_id,reason:'Developer session block'})}>Revoke session</Button>{row.ip_address&&<Button size="sm" variant="outline" onClick={() => void mutate(`ip-${row.session_id}`,'block',{kind:'ip',value:row.ip_address,reason:'Blocked from session inventory'})}><Network className="mr-1 h-4 w-4" />Block IP</Button>}{row.device_hash&&<Button size="sm" variant="outline" onClick={() => void mutate(`device-${row.session_id}`,'block',{kind:'device',value:row.device_hash,reason:'Blocked device fingerprint'})}><Fingerprint className="mr-1 h-4 w-4" />Block device</Button>}</div></CardContent></Card>)}</div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{flags.map((flag)=><Card key={String(flag.key)}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-bold">{MODULE_LABELS[String(flag.key)]??display(flag.key)}</p><p className="text-xs text-muted-foreground">{display(flag.description)}</p></div><Switch checked={flag.enabled===true} onCheckedChange={(enabled)=>void mutate(`flag-${flag.key}`,'toggle_feature',{key:flag.key,enabled})}/></CardContent></Card>)}</div>
            <Card><CardHeader><CardTitle>Feature cohorts / staged rollout</CardTitle><CardDescription>Target a percentage, campus, role, exact user, or date range. Empty dimensions mean “all”. Exact per-user overrides continue to have highest priority.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Field label="Feature"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.feature_key} onChange={(e)=>setCohort({...cohort,feature_key:e.target.value})}>{flags.map((f)=><option key={String(f.key)} value={String(f.key)}>{MODULE_LABELS[String(f.key)]??String(f.key)}</option>)}</select></Field><Field label="State"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.enabled} onChange={(e)=>setCohort({...cohort,enabled:e.target.value})}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field><Field label="Rollout %"><Input type="number" min="0" max="100" value={cohort.rollout_percent} onChange={(e)=>setCohort({...cohort,rollout_percent:e.target.value})}/></Field><Field label="Campus"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.campus} onChange={(e)=>setCohort({...cohort,campus:e.target.value})}><option value="">All campuses</option>{Object.entries(CAMPUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field><Field label="Role"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.role} onChange={(e)=>setCohort({...cohort,role:e.target.value})}><option value="">All roles</option><option value="student">Student</option><option value="security">Security</option><option value="admin">Admin</option></select></Field><Field label="Exact user UUID"><Input value={cohort.user_id} onChange={(e)=>setCohort({...cohort,user_id:e.target.value})} placeholder="Optional"/></Field><Field label="Starts"><Input type="datetime-local" value={cohort.starts_at} onChange={(e)=>setCohort({...cohort,starts_at:e.target.value})}/></Field><Field label="Ends"><Input type="datetime-local" value={cohort.ends_at} onChange={(e)=>setCohort({...cohort,ends_at:e.target.value})}/></Field><Field label="Reason"><Input value={cohort.reason} onChange={(e)=>setCohort({...cohort,reason:e.target.value})}/></Field><div className="md:col-span-3"><Button onClick={() => void createCohort()}><SlidersHorizontal className="mr-2 h-4 w-4" />Create cohort rule</Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Active cohort rules</CardTitle></CardHeader><CardContent className="space-y-2">{featureRules.map((row)=><div key={String(row.id)} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{MODULE_LABELS[String(row.feature_key)]??display(row.feature_key)} · {row.enabled?'Enabled':'Disabled'} · {row.rollout_percent??'All'}%</p><p className="text-xs text-muted-foreground">Campuses: {Array.isArray(row.campuses)&&row.campuses.length?row.campuses.join(', '):'all'} · Roles: {Array.isArray(row.roles)&&row.roles.length?row.roles.join(', '):'all'} · {display(row.reason,'No reason')}</p></div><Button size="sm" variant="outline" onClick={() => void mutate(`rule-${row.id}`,'delete_feature_rule',{id:row.id})}>Delete</Button></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-5">
            <Card><CardHeader><CardTitle>Developer IP allowlist</CardTitle><CardDescription>Optional second boundary after AAL2. Current network: {display(ipAllow.current_ip)}. An AAL2 recovery action remains available if your network changes.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">Restrict Developer Portal by network</p><p className="text-xs text-muted-foreground">Add at least one CIDR before enabling.</p></div><Switch checked={ipAllow.enabled===true} onCheckedChange={(enabled)=>void mutate('ip-toggle','set_ip_allowlist',{enabled})}/></div><div className="flex gap-2"><Input value={newIp} onChange={(e)=>setNewIp(e.target.value)} placeholder={ipAllow.current_ip?`${ipAllow.current_ip}/32 or CIDR`:'196.0.0.0/24'}/><Button onClick={() => void mutate('ip-add','add_ip_allow',{network:newIp||`${ipAllow.current_ip}/32`,label:'Developer trusted network'})}>Add network</Button></div>{ipEntries.map((row)=><div key={String(row.id)} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-mono text-sm">{display(row.network)}</p><p className="text-xs text-muted-foreground">{display(row.label)}</p></div><Button size="sm" variant="outline" onClick={() => void mutate(`ip-remove-${row.id}`,'remove_ip_allow',{id:row.id})}>Remove</Button></div>)}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Security anomalies</CardTitle></CardHeader><CardContent className="space-y-2">{anomalies.slice(0,30).map((row)=><SecurityRow key={String(row.id)} row={row} onAction={()=>void mutate(`anomaly-${row.id}`,'ack_anomaly',{id:row.id,status:'resolved'})}/>)}</CardContent></Card><Card><CardHeader><CardTitle>Developer alerts</CardTitle></CardHeader><CardContent className="space-y-2">{alerts.slice(0,30).map((row)=><SecurityRow key={String(row.id)} row={row} onAction={()=>void mutate(`alert-${row.id}`,'ack_alert',{id:row.id})}/>)}</CardContent></Card></div>
            <Card><CardHeader><CardTitle>Rate / abuse dashboard</CardTitle><CardDescription>Actual database/Auth/storage counts plus observed control-plane Edge invocations for the last hour.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Auth sessions" value={display(metrics.auth_sessions_created,'0')}/><Info label="Reports" value={display(metrics.reports_created,'0')}/><Info label="Uploads" value={display(metrics.uploads_created,'0')}/><Info label="Observed Edge calls" value={display(metrics.edge_invocations,'0')}/><Info label="Access denials" value={display(metrics.access_denials,'0')}/><Info label="Errors" value={display(metrics.errors,'0')}/><Info label="Auth audit events" value={display(metrics.auth_audit_events,'0')}/><Info label="Pilot reports" value={display(metrics.pilot_reports_created,'0')}/></CardContent></Card>
            <Card><CardHeader><CardTitle>Alert rules</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{alertRules.map((row)=><div key={String(row.rule_key)} className="rounded-lg border p-3"><p className="font-semibold">{display(row.rule_key)}</p><p className="text-xs text-muted-foreground">{display(row.severity)} · threshold {display(row.threshold)} · {display(row.window_minutes)} min · {row.enabled?'enabled':'disabled'}</p></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={Database} label="Database bytes" value={Number(health.database_size_bytes||0).toLocaleString('en-ZA')} /><Metric icon={Gauge} label="Connections" value={display(health.connections,'0')} /><Metric icon={Activity} label="Active connections" value={display(health.active_connections,'0')} /><Metric icon={AlertTriangle} label="24h runtime errors" value={display(health.runtime_errors_24h,'0')} /></div>
            <Card><CardHeader><CardTitle>Database / storage health</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Info label="Storage bytes" value={Number(health.storage_bytes||0).toLocaleString('en-ZA')}/><Info label="Long-running queries" value={display(health.long_running_queries,'0')}/><Info label="Dead tuples" value={display(health.dead_tuples,'0')}/><Info label="Live tuples" value={display(health.live_tuples,'0')}/><Info label="Latest migration" value={display(health.latest_migration)}/><Info label="Latest telemetry" value={formatDate(health.latest_runtime_event_at)}/></CardContent></Card>
          </TabsContent>

          <TabsContent value="releases" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3"><Metric icon={Rocket} label="Frontend SHA" value={buildMeta.sha.slice(0,12)} /><Metric icon={CloudCog} label="Branch" value={buildMeta.branch} /><Metric icon={ServerCog} label="Environment" value={buildMeta.environment} /></div>
            <Card><CardHeader><CardTitle>Supabase release state</CardTitle><CardDescription>Database migration history and audited release/rollback/checkpoint markers. Provider-native backups remain managed by Supabase; this portal records verification/checkpoints rather than fabricating backup execution.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="font-mono text-sm">Latest migration: {display(release.latest_migration)}</p>{asRows(release.migrations).slice(0,10).map((row)=><div key={String(row.version)} className="flex justify-between rounded-lg border px-3 py-2 text-sm"><span>{display(row.name,'migration')}</span><code>{display(row.version)}</code></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Release / backup verification / rollback markers</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={releaseForm.deployment_url} onChange={(e)=>setReleaseForm({...releaseForm,deployment_url:e.target.value})} placeholder="Vercel deployment or rollback URL (optional)"/><Textarea value={releaseForm.notes} onChange={(e)=>setReleaseForm({...releaseForm,notes:e.target.value})} placeholder="Release, backup verification or rollback notes"/><div className="flex flex-wrap gap-2"><Button onClick={() => void mutate('release-marker','create_release_marker',{kind:'release',git_sha:buildMeta.sha,branch:buildMeta.branch,deployment_url:releaseForm.deployment_url,provider_state:'verified',migration_version:release.latest_migration,notes:releaseForm.notes})}><Rocket className="mr-2 h-4 w-4" />Record release</Button><Button variant="outline" onClick={() => void mutate('backup-marker','create_release_marker',{kind:'backup_verification',git_sha:buildMeta.sha,branch:buildMeta.branch,migration_version:release.latest_migration,provider_state:'manual-verification',notes:releaseForm.notes||'Supabase provider backup verification marker'})}>Record backup verification</Button><Button variant="outline" onClick={() => void mutate('rollback-marker','create_release_marker',{kind:'rollback',git_sha:buildMeta.sha,branch:buildMeta.branch,deployment_url:releaseForm.deployment_url,migration_version:release.latest_migration,notes:releaseForm.notes})}>Record rollback point</Button></div>{asRows(release.markers).map((row)=><div key={String(row.id)} className="rounded-lg border p-3"><p className="font-semibold">{display(row.kind)} · {display(row.git_sha)}</p><p className="text-xs text-muted-foreground">{formatDate(row.created_at)} · migration {display(row.migration_version)} · {display(row.notes)}</p>{row.deployment_url&&<a className="text-xs font-semibold text-primary underline" href={String(row.deployment_url)} target="_blank" rel="noreferrer">Open deployment/provider link</a>}</div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-5">
            <Card><CardHeader><CardTitle>Read-only “View as Role” diagnostics</CardTitle><CardDescription>This does not impersonate a person, mint a token, or switch identity. It shows the route/feature contract for a role so you can diagnose availability safely.</CardDescription></CardHeader><CardContent className="space-y-4"><select className="h-10 rounded-md border bg-background px-3" value={rolePreview} onChange={(e)=>setRolePreview(e.target.value)}><option value="student">Student</option><option value="security">CPS / Security</option><option value="admin">Super Admin</option><option value="developer">Developer</option></select><div className="grid gap-3 md:grid-cols-2"><Info label="Users in role" value={display(asObject(diagnostics.role_counts)[rolePreview],'0')}/><Info label="Accessible route contract" value={selectedRoutes.map(String).join(', ')||'None'}/></div><div className="grid gap-2 md:grid-cols-3">{asRows(diagnostics.features).map((row)=><div key={String(row.key)} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{MODULE_LABELS[String(row.key)]??display(row.key)}</span><Badge variant={row.enabled?'default':'outline'}>{row.enabled?'on':'off'}</Badge></div>)}</div></CardContent></Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Control-plane audit trail</CardTitle><CardDescription>Every high-impact developer change is server-audited.</CardDescription></div><Button onClick={() => void exportAudit()} disabled={busy==='audit-export'}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="space-y-2">{audit.slice(0,200).map((row)=><div key={String(row.id)} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{display(row.action)}</p><span className="text-xs text-muted-foreground">{formatDate(row.created_at)}</span></div><p className="mt-1 text-xs text-muted-foreground">{display(row.target_type)} · {display(row.target_id)} · {JSON.stringify(row.details??{})}</p></div>)}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="truncate text-xl font-black">{value}</p></div></CardContent></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border bg-muted/25 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-all text-sm font-semibold">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function SecurityRow({ row, onAction }: { row: Row; onAction: () => void }) { return <div className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge variant={String(row.severity)==='critical'||String(row.severity)==='error'?'destructive':'outline'}>{display(row.severity)}</Badge><p className="font-semibold">{display(row.title)}</p></div><p className="mt-1 text-xs text-muted-foreground">{display(row.message)} · {formatDate(row.created_at)}</p></div><Button size="sm" variant="outline" onClick={onAction}>Resolve</Button></div></div>; }
