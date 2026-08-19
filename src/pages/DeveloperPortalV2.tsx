import { useCallback, useEffect, useMemo, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertTriangle, Ban, CheckCircle2, CloudCog, Database, Download, Eye,
  FileClock, Fingerprint, Gauge, KeyRound, Laptop, LockKeyhole, LogOut, Network,
  RefreshCw, Rocket, Search, ServerCog, ShieldAlert, ShieldCheck,
  SlidersHorizontal, Users, Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

type Row = Record<string, unknown>;
type Mode = 'live' | 'read_only' | 'maintenance' | 'locked';
interface DeveloperResponse extends Row { error?: string; code?: string }
interface PendingControl { key: string; action: string; payload: Row }

const CAMPUSES: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main Campus)', arcadia: 'Arcadia', arts: 'Arts',
  giyani: 'Giyani', mbombela: 'Mbombela', polokwane: 'Polokwane', garankuwa: 'Ga-Rankuwa',
  soshanguve_south: 'Soshanguve South', soshanguve_north: 'Soshanguve North', emalahleni: 'Emalahleni',
};
const MODULES: Record<string, string> = {
  report_incident: 'Report Incident', evidence: 'Evidence', radar: 'Campus Radar', mobility: 'Safety Mobility',
  community: 'Community', sport: 'Sports', judiciary: 'Judiciary', chat: 'Chat / Support', notifications: 'Notifications',
  admin_portal: 'Admin Portal', cps_portal: 'CPS / Security Portal', official_dashboard: 'Official Dashboard',
  pilot_reporting: 'Pilot Reporting', pilot_reviews: 'Pilot Reviews', pilot_resources: 'Pilot Resources', safety_quest: 'Safety Quest',
};
const MODES: Mode[] = ['live', 'read_only', 'maintenance', 'locked'];
const STEP_UP_ACTIONS = new Set([
  'set_system', 'set_campus_mode', 'create_maintenance', 'cancel_maintenance', 'set_user_access',
  'block', 'unblock', 'revoke_session', 'revoke_user_sessions', 'toggle_feature', 'set_feature_override',
  'remove_feature_override', 'create_feature_rule', 'delete_feature_rule', 'add_ip_allow', 'remove_ip_allow',
  'set_ip_allowlist', 'set_alert_rule', 'ack_alert', 'ack_anomaly', 'create_release_marker', 'export_audit',
]);

const rows = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
const obj = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown, fallback = '—') => value == null || value === '' ? fallback : String(value);
const bool = (value: unknown) => value === true;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleString('en-ZA') : '—';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];

async function callDeveloper(action: string, payload: Row = {}): Promise<DeveloperResponse> {
  const { data, error } = await supabase.functions.invoke<DeveloperResponse>('developer-control', { body: { action, payload } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json() as DeveloperResponse;
        if (body?.error) {
          const failure = new Error(body.error) as Error & { code?: string };
          failure.code = body.code;
          throw failure;
        }
      } catch (caught) {
        if (caught instanceof Error && 'code' in caught) throw caught;
      }
    }
    throw error;
  }
  const result = data ?? {};
  if (result.error) {
    const failure = new Error(result.error) as Error & { code?: string };
    failure.code = result.code;
    throw failure;
  }
  return result;
}

function matches(row: Row, query: string, fields: string[]) {
  if (!query) return true;
  return fields.some((field) => {
    const value = row[field];
    if (Array.isArray(value)) return value.some((entry) => String(entry).toLowerCase().includes(query));
    return value != null && String(value).toLowerCase().includes(query);
  });
}

export default function DeveloperPortalV2() {
  const { signOut } = useAuth();
  const { refresh: refreshRuntime } = useRuntimeControl();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [summary, setSummary] = useState<Row>({});
  const [users, setUsers] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [runtime, setRuntime] = useState<Row>({});
  const [featureData, setFeatureData] = useState<Row>({});
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
  const [freshMfaOpen, setFreshMfaOpen] = useState(false);
  const [pendingControl, setPendingControl] = useState<PendingControl | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [campusModes, setCampusModes] = useState<Record<string, Mode>>({});
  const [newIp, setNewIp] = useState('');
  const [rolePreview, setRolePreview] = useState('student');
  const [maintenance, setMaintenance] = useState({ scope: 'global', mode: 'maintenance', campus: 'pretoria_west_main', module_key: 'report_incident', starts_at: '', ends_at: '', message: '' });
  const [cohort, setCohort] = useState({ feature_key: 'report_incident', enabled: 'true', rollout_percent: '100', campus: '', role: '', user_id: '', starts_at: '', ends_at: '', reason: '' });
  const [releaseForm, setReleaseForm] = useState({ deployment_url: '', notes: '' });

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const results = await Promise.all([
        callDeveloper('summary'), callDeveloper('list_users'), callDeveloper('list_sessions'),
        callDeveloper('list_runtime'), callDeveloper('list_features'), callDeveloper('list_security'),
        callDeveloper('database_health'), callDeveloper('metrics', { minutes: 60 }), callDeveloper('release_info'),
        callDeveloper('list_ip_allowlist'), callDeveloper('role_diagnostics'), callDeveloper('list_audit'),
      ]);
      const [s, u, se, r, f, sec, h, m, rel, ip, diag, a] = results;
      setSummary(s); setUsers(rows(u.users)); setSessions(rows(se.sessions)); setRuntime(r); setFeatureData(f);
      setSecurity(sec); setHealth(obj(h.health)); setMetrics(obj(m.metrics)); setRelease(obj(rel.release));
      setIpAllow(ip); setDiagnostics(obj(diag.diagnostics)); setAudit(rows(a.audit));
      const next: Record<string, Mode> = {};
      for (const campus of rows(r.campuses)) next[text(campus.campus)] = text(campus.mode, 'live') as Mode;
      setCampusModes(next);
    } catch (caught) {
      toast({ title: 'Developer control plane unavailable', description: caught instanceof Error ? caught.message : 'Unable to load developer data.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { void load(true); }, [load]);

  const freshMfaActive = () => Boolean(freshUntil && new Date(freshUntil) > new Date());

  const executeControl = async (control: PendingControl, afterFreshMfa = false) => {
    setBusy(control.key);
    try {
      const result = await callDeveloper(control.action, control.payload);
      toast({ title: 'Developer control updated', description: 'The control-plane change was recorded and audited.' });
      await load(false);
      await refreshRuntime({ type: 'developer_control_changed', severity: 'info', metadata: { action: control.action } });
      return result;
    } catch (caught) {
      const failure = caught as Error & { code?: string };
      if (failure.code === 'reauthentication_required' && !afterFreshMfa) {
        setPendingControl(control);
        setFreshCode('');
        setMfaError(null);
        setFreshMfaOpen(true);
        return null;
      }
      toast({ title: 'Control update failed', description: failure.message, variant: 'destructive' });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const mutate = async (key: string, action: string, payload: Row = {}) => {
    const control = { key, action, payload };
    if (STEP_UP_ACTIONS.has(action) && !freshMfaActive()) {
      setPendingControl(control);
      setFreshCode('');
      setMfaError(null);
      setFreshMfaOpen(true);
      return null;
    }
    return executeControl(control);
  };

  const unlockFreshMfa = async () => {
    if (!/^\d{6}$/.test(freshCode)) {
      setMfaError('Enter the current six-digit code from your authenticator app.');
      return;
    }
    setBusy('fresh-mfa');
    setMfaError(null);
    try {
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const factor = factors.totp.find((item) => item.status === 'verified');
      if (!factor) throw new Error('No verified TOTP factor is available for this developer account.');
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: freshCode });
      if (verifyError) throw verifyError;
      await supabase.auth.refreshSession();
      const result = await callDeveloper('mark_reauthenticated');
      const expiresAt = text(result.expires_at, '');
      setFreshUntil(expiresAt);
      setFreshCode('');
      setFreshMfaOpen(false);
      toast({ title: 'Fresh MFA verified', description: `Sensitive controls are unlocked until ${date(expiresAt)}.` });
      const queued = pendingControl;
      setPendingControl(null);
      if (queued) await executeControl(queued, true);
    } catch (caught) {
      setMfaError(caught instanceof Error ? caught.message : 'Fresh MFA verification failed.');
    } finally {
      setBusy(null);
    }
  };

  const exportAudit = async () => {
    const result = await mutate('audit-export', 'export_audit');
    if (!result?.csv) return;
    const blob = new Blob([text(result.csv, '')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = text(result.filename, 'ccsf-developer-audit.csv');
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const flags = rows(featureData.flags);
  const featureRules = rows(featureData.rules);
  const campuses = rows(runtime.campuses);
  const windows = rows(runtime.windows);
  const anomalies = rows(security.anomalies);
  const alerts = rows(security.alerts);
  const alertRules = rows(security.rules);
  const ipEntries = rows(ipAllow.entries);
  const system = obj(summary.system);
  const developer = obj(summary.developer);
  const roleRoutes = obj(diagnostics.routes);
  const selectedRoutes = strings(roleRoutes[rolePreview]);
  const build = {
    sha: import.meta.env.VITE_BUILD_SHA || 'unknown',
    branch: import.meta.env.VITE_BUILD_BRANCH || 'unknown',
    environment: import.meta.env.VITE_DEPLOYMENT_ENV || import.meta.env.MODE,
  };

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return users.filter((row) => matches(row, query, ['full_name', 'first_name', 'last_name', 'email', 'campus', 'roles', 'access_status']));
  }, [userQuery, users]);

  const filteredSessions = useMemo(() => {
    const query = sessionQuery.trim().toLowerCase();
    return sessions.filter((row) => matches(row, query, ['full_name', 'email', 'ip_address', 'browser_name', 'browser_version', 'operating_system', 'device_type', 'city', 'region', 'country_code', 'session_id']));
  }, [sessionQuery, sessions]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="ml-3 font-semibold">Loading Developer Control Plane…</span></main>;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 border-b border-t-4 border-t-[#F2A900] bg-background/95 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <InstitutionBrand size="header" />
            <div>
              <div className="flex flex-wrap items-center gap-2"><ServerCog className="h-5 w-5 text-primary" /><h1 className="text-xl font-black">Developer Control Plane</h1><Badge>God Mode</Badge><Badge variant="outline">AAL2</Badge></div>
              <p className="text-xs text-muted-foreground">Production authority · security intelligence · audited actions · step-up controls</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={freshMfaActive() ? 'default' : 'outline'}>{freshMfaActive() ? `Fresh MFA until ${new Date(freshUntil!).toLocaleTimeString('en-ZA')}` : 'Sensitive controls locked'}</Badge>
            <Button variant="outline" onClick={() => { setPendingControl(null); setFreshCode(''); setMfaError(null); setFreshMfaOpen(true); }}><KeyRound className="mr-2 h-4 w-4" />Fresh MFA</Button>
            <Button variant="outline" disabled={refreshing} onClick={() => void load(false)}>{refreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
            <Button variant="ghost" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric icon={Users} label="Onboarded users" value={text(obj(summary.users).total, '0')} />
          <Metric icon={Laptop} label="Auth sessions" value={text(obj(summary.sessions).total, '0')} />
          <Metric icon={Ban} label="Restrictions" value={text(obj(summary.restrictions).active, '0')} />
          <Metric icon={ShieldAlert} label="Open alerts" value={text(obj(summary.alerts).unacknowledged, '0')} />
          <Metric icon={Activity} label="24h telemetry" value={text(obj(summary.health_24h).total_events, '0')} />
          <Metric icon={Fingerprint} label="Biometric policy" value={bool(system.developer_biometric_required) ? 'Step-up required' : 'Login available'} />
        </div>

        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 p-1">
            {['overview','campuses','people','sessions','modules','security','health','releases','diagnostics','audit'].map((tab) => <TabsTrigger key={tab} value={tab} className="capitalize">{tab}</TabsTrigger>)}
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <Card className="border-destructive/20">
                <CardHeader><CardTitle>Global application state</CardTitle><CardDescription>Read-only preserves viewing but rejects writes. Maintenance and Full Lock deny ordinary application access.</CardDescription></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  {MODES.map((mode) => <Button key={mode} variant={text(system.mode) === mode ? 'default' : mode === 'locked' ? 'destructive' : 'outline'} className="h-16 capitalize" onClick={() => void mutate(`global-${mode}`, 'set_system', { config: { mode, message: mode === 'locked' ? 'CCSF is temporarily locked by the developer.' : mode === 'maintenance' ? 'CCSF is undergoing maintenance.' : mode === 'read_only' ? 'CCSF is temporarily in read-only emergency mode.' : '' } })}>{mode === 'locked' ? <LockKeyhole className="mr-2 h-5 w-5" /> : mode === 'read_only' ? <Eye className="mr-2 h-5 w-5" /> : mode === 'maintenance' ? <Wrench className="mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}{mode.replace('_', ' ')}</Button>)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Authority posture</CardTitle><CardDescription>Current control-plane identity and enforcement state.</CardDescription></CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Info label="Developer authority" value={bool(developer.is_owner) ? 'Sole owner' : 'Delegated developer'} />
                  <Info label="MFA assurance" value={text(developer.aal, 'aal2').toUpperCase()} />
                  <Info label="Current network" value={text(developer.current_ip)} />
                  <Info label="Server access gate" value={bool(system.access_gate_enabled) ? 'Enforced' : 'Prepared / staged'} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campuses" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {campuses.map((row) => {
                const campus = text(row.campus);
                const mode = campusModes[campus] ?? 'live';
                return <Card key={campus}><CardHeader><CardTitle className="text-base">{CAMPUSES[campus] ?? campus}</CardTitle><CardDescription>Independent campus runtime state</CardDescription></CardHeader><CardContent className="flex gap-2"><select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={mode} onChange={(event) => setCampusModes((current) => ({ ...current, [campus]: event.target.value as Mode }))}>{MODES.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select><Button onClick={() => void mutate(`campus-${campus}`, 'set_campus_mode', { campus, mode })}>Apply</Button></CardContent></Card>;
              })}
            </div>
            <Card><CardHeader><CardTitle>Scheduled maintenance / kill window</CardTitle><CardDescription>Schedule global, campus, or module read-only/maintenance/lock windows.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Field label="Scope"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.scope} onChange={(event) => setMaintenance({ ...maintenance, scope: event.target.value })}><option value="global">Global</option><option value="campus">Campus</option><option value="module">Module</option></select></Field><Field label="Mode"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.mode} onChange={(event) => setMaintenance({ ...maintenance, mode: event.target.value })}><option value="read_only">Read only</option><option value="maintenance">Maintenance</option><option value="locked">Locked</option></select></Field>{maintenance.scope === 'campus' && <Field label="Campus"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.campus} onChange={(event) => setMaintenance({ ...maintenance, campus: event.target.value })}>{Object.entries(CAMPUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>}{maintenance.scope === 'module' && <Field label="Module"><select className="h-10 w-full rounded-md border bg-background px-3" value={maintenance.module_key} onChange={(event) => setMaintenance({ ...maintenance, module_key: event.target.value })}>{flags.map((flag) => <option key={text(flag.key)} value={text(flag.key)}>{MODULES[text(flag.key)] ?? text(flag.key)}</option>)}</select></Field>}<Field label="Starts"><Input type="datetime-local" value={maintenance.starts_at} onChange={(event) => setMaintenance({ ...maintenance, starts_at: event.target.value })} /></Field><Field label="Ends"><Input type="datetime-local" value={maintenance.ends_at} onChange={(event) => setMaintenance({ ...maintenance, ends_at: event.target.value })} /></Field><Field label="Message"><Input value={maintenance.message} onChange={(event) => setMaintenance({ ...maintenance, message: event.target.value })} /></Field><div className="md:col-span-3"><Button onClick={() => void mutate('maintenance-create', 'create_maintenance', { scope: maintenance.scope, mode: maintenance.mode, campus: maintenance.scope === 'campus' ? maintenance.campus : null, module_key: maintenance.scope === 'module' ? maintenance.module_key : null, message: maintenance.message, starts_at: new Date(maintenance.starts_at).toISOString(), ends_at: new Date(maintenance.ends_at).toISOString() })} disabled={!maintenance.starts_at || !maintenance.ends_at}><FileClock className="mr-2 h-4 w-4" />Schedule window</Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Maintenance windows</CardTitle></CardHeader><CardContent className="space-y-2">{windows.map((row) => <div key={text(row.id)} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{text(row.scope)} · {text(row.mode)} {row.campus ? `· ${CAMPUSES[text(row.campus)] ?? text(row.campus)}` : ''} {row.module_key ? `· ${MODULES[text(row.module_key)] ?? text(row.module_key)}` : ''}</p><p className="text-xs text-muted-foreground">{date(row.starts_at)} → {date(row.ends_at)} · {bool(row.active) ? 'active/scheduled' : 'cancelled'}</p></div>{bool(row.active) && <Button size="sm" variant="outline" onClick={() => void mutate(`cancel-${text(row.id)}`, 'cancel_maintenance', { id: text(row.id) })}>Cancel</Button>}</div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search name, surname, email, campus, role or status" /></div><p className="mt-2 text-xs text-muted-foreground">Instant local filtering · {filteredUsers.length} of {users.length} users · no dashboard reload while typing</p></CardContent></Card>
            {filteredUsers.map((row) => <Card key={text(row.user_id)}><CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]"><div><p className="font-bold">{text(row.full_name)} <Badge variant="outline">{text(row.access_status, 'approved')}</Badge></p><p className="text-sm text-muted-foreground">{text(row.email)} · {CAMPUSES[text(row.campus)] ?? text(row.campus)} · {strings(row.roles).join(', ') || 'No role'}</p><p className="mt-1 font-mono text-[11px] text-muted-foreground">{text(row.user_id)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void mutate(`approve-${text(row.user_id)}`, 'set_user_access', { user_id: text(row.user_id), status: 'approved', reason: 'Developer approved' })}>Approve</Button><Button size="sm" variant="outline" onClick={() => void mutate(`quarantine-${text(row.user_id)}`, 'set_user_access', { user_id: text(row.user_id), status: 'quarantined', reason: 'Developer quarantine: read-only access' })}>Quarantine</Button><Button size="sm" variant="outline" onClick={() => void mutate(`suspend-${text(row.user_id)}`, 'set_user_access', { user_id: text(row.user_id), status: 'suspended', reason: 'Developer suspension' })}>Suspend</Button><Button size="sm" variant="destructive" onClick={() => void mutate(`block-${text(row.user_id)}`, 'set_user_access', { user_id: text(row.user_id), status: 'blocked', reason: 'Developer block' })}>Block</Button><Button size="sm" variant="ghost" onClick={() => void mutate(`revoke-${text(row.user_id)}`, 'revoke_user_sessions', { user_id: text(row.user_id), reason: 'Developer session revocation' })}>Revoke sessions</Button></div></CardContent></Card>)}
            {!filteredUsers.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No onboarded user matches this search.</CardContent></Card>}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={sessionQuery} onChange={(event) => setSessionQuery(event.target.value)} placeholder="Search user, IP, browser, OS, device, city or session" /></div><p className="mt-2 text-xs text-muted-foreground">Instant local filtering · {filteredSessions.length} of {sessions.length} sessions · no network refresh while typing</p></CardContent></Card>
            <div className="grid gap-3 xl:grid-cols-2">{filteredSessions.map((row) => <Card key={text(row.session_id)}><CardHeader><CardTitle className="text-base">{text(row.full_name)} · {text(row.device_type)}</CardTitle><CardDescription>{text(row.email)} · {text(row.browser_name)} {text(row.browser_version, '')} · {text(row.operating_system)}</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-2"><Info label="IP" value={text(row.ip_address)} /><Info label="Geography" value={[row.city, row.region, row.country_code].filter(Boolean).map(String).join(', ') || 'Not supplied by edge'} /><Info label="Last seen" value={date(row.device_last_seen_at ?? row.updated_at)} /><Info label="Device hash" value={text(row.device_hash)} /></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="destructive" onClick={() => void mutate(`session-${text(row.session_id)}`, 'revoke_session', { session_id: text(row.session_id), reason: 'Developer session block' })}>Revoke session</Button>{Boolean(row.ip_address) && <Button size="sm" variant="outline" onClick={() => void mutate(`ip-${text(row.session_id)}`, 'block', { kind: 'ip', value: text(row.ip_address), reason: 'Blocked from session inventory' })}><Network className="mr-1 h-4 w-4" />Block IP</Button>}{Boolean(row.device_hash) && <Button size="sm" variant="outline" onClick={() => void mutate(`device-${text(row.session_id)}`, 'block', { kind: 'device', value: text(row.device_hash), reason: 'Blocked device fingerprint' })}><Fingerprint className="mr-1 h-4 w-4" />Block device</Button>}</div></CardContent></Card>)}</div>
            {!filteredSessions.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No authentication session matches this search.</CardContent></Card>}
          </TabsContent>

          <TabsContent value="modules" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{flags.map((flag) => <Card key={text(flag.key)}><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-bold">{MODULES[text(flag.key)] ?? text(flag.key)}</p><p className="text-xs text-muted-foreground">{text(flag.description)}</p></div><Switch checked={bool(flag.enabled)} onCheckedChange={(enabled) => void mutate(`flag-${text(flag.key)}`, 'toggle_feature', { key: text(flag.key), enabled })} /></CardContent></Card>)}</div>
            <Card><CardHeader><CardTitle>Feature cohorts</CardTitle><CardDescription>Enable or disable by percentage, campus, role, exact user, or date range.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Field label="Feature"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.feature_key} onChange={(event) => setCohort({ ...cohort, feature_key: event.target.value })}>{flags.map((flag) => <option key={text(flag.key)} value={text(flag.key)}>{MODULES[text(flag.key)] ?? text(flag.key)}</option>)}</select></Field><Field label="State"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.enabled} onChange={(event) => setCohort({ ...cohort, enabled: event.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></Field><Field label="Rollout %"><Input type="number" min="0" max="100" value={cohort.rollout_percent} onChange={(event) => setCohort({ ...cohort, rollout_percent: event.target.value })} /></Field><Field label="Campus"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.campus} onChange={(event) => setCohort({ ...cohort, campus: event.target.value })}><option value="">All campuses</option>{Object.entries(CAMPUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Role"><select className="h-10 w-full rounded-md border bg-background px-3" value={cohort.role} onChange={(event) => setCohort({ ...cohort, role: event.target.value })}><option value="">All roles</option><option value="student">Student</option><option value="security">Security</option><option value="admin">Admin</option></select></Field><Field label="Exact user UUID"><Input value={cohort.user_id} onChange={(event) => setCohort({ ...cohort, user_id: event.target.value })} /></Field><Field label="Starts"><Input type="datetime-local" value={cohort.starts_at} onChange={(event) => setCohort({ ...cohort, starts_at: event.target.value })} /></Field><Field label="Ends"><Input type="datetime-local" value={cohort.ends_at} onChange={(event) => setCohort({ ...cohort, ends_at: event.target.value })} /></Field><Field label="Reason"><Input value={cohort.reason} onChange={(event) => setCohort({ ...cohort, reason: event.target.value })} /></Field><div className="md:col-span-3"><Button onClick={() => void mutate('cohort-create', 'create_feature_rule', { feature_key: cohort.feature_key, enabled: cohort.enabled === 'true', rollout_percent: cohort.rollout_percent === '' ? null : Number(cohort.rollout_percent), campuses: cohort.campus ? [cohort.campus] : [], roles: cohort.role ? [cohort.role] : [], user_ids: cohort.user_id ? [cohort.user_id] : [], starts_at: cohort.starts_at ? new Date(cohort.starts_at).toISOString() : null, ends_at: cohort.ends_at ? new Date(cohort.ends_at).toISOString() : null, reason: cohort.reason })}><SlidersHorizontal className="mr-2 h-4 w-4" />Create cohort rule</Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Active cohort rules</CardTitle></CardHeader><CardContent className="space-y-2">{featureRules.map((row) => <div key={text(row.id)} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{MODULES[text(row.feature_key)] ?? text(row.feature_key)} · {bool(row.enabled) ? 'Enabled' : 'Disabled'} · {text(row.rollout_percent, 'All')}%</p><p className="text-xs text-muted-foreground">Campuses: {strings(row.campuses).join(', ') || 'all'} · Roles: {strings(row.roles).join(', ') || 'all'} · {text(row.reason, 'No reason')}</p></div><Button size="sm" variant="outline" onClick={() => void mutate(`rule-${text(row.id)}`, 'delete_feature_rule', { id: text(row.id) })}>Delete</Button></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3"><Metric icon={ShieldCheck} label="AAL level" value={text(developer.aal, 'aal2').toUpperCase()} /><Metric icon={Fingerprint} label="Biometric credentials" value={text(developer.biometric_credentials, '0')} /><Metric icon={Network} label="Current IP" value={text(developer.current_ip)} /></div>
            <Card><CardHeader><CardTitle>Developer IP allowlist</CardTitle><CardDescription>Optional network boundary after MFA. Current network: {text(ipAllow.current_ip)}.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-semibold">Restrict Developer Portal by network</p><p className="text-xs text-muted-foreground">Add a trusted CIDR first. Owner recovery remains protected by fresh MFA.</p></div><Switch checked={bool(ipAllow.enabled)} onCheckedChange={(enabled) => void mutate('ip-toggle', 'set_ip_allowlist', { enabled })} /></div><div className="flex gap-2"><Input value={newIp} onChange={(event) => setNewIp(event.target.value)} placeholder={ipAllow.current_ip ? `${text(ipAllow.current_ip)}/32` : '196.0.0.0/24'} /><Button onClick={() => void mutate('ip-add', 'add_ip_allow', { network: newIp || `${text(ipAllow.current_ip)}/32`, label: 'Developer trusted network' })}>Add network</Button></div>{ipEntries.map((row) => <div key={text(row.id)} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-mono text-sm">{text(row.network)}</p><p className="text-xs text-muted-foreground">{text(row.label)}</p></div><Button size="sm" variant="outline" onClick={() => void mutate(`ip-remove-${text(row.id)}`, 'remove_ip_allow', { id: text(row.id) })}>Remove</Button></div>)}</CardContent></Card>
            <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Security anomalies</CardTitle></CardHeader><CardContent className="space-y-2">{anomalies.slice(0, 30).map((row) => <SecurityRow key={text(row.id)} row={row} onAction={() => void mutate(`anomaly-${text(row.id)}`, 'ack_anomaly', { id: Number(row.id), status: 'resolved' })} />)}</CardContent></Card><Card><CardHeader><CardTitle>Developer alerts</CardTitle></CardHeader><CardContent className="space-y-2">{alerts.slice(0, 30).map((row) => <SecurityRow key={text(row.id)} row={row} onAction={() => void mutate(`alert-${text(row.id)}`, 'ack_alert', { id: Number(row.id) })} />)}</CardContent></Card></div>
            <Card><CardHeader><CardTitle>Rate / abuse intelligence</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Auth sessions" value={text(metrics.auth_sessions_created, '0')} /><Info label="Reports" value={text(metrics.reports_created, '0')} /><Info label="Uploads" value={text(metrics.uploads_created, '0')} /><Info label="Observed Edge calls" value={text(metrics.edge_invocations, '0')} /><Info label="Access denials" value={text(metrics.access_denials, '0')} /><Info label="Errors" value={text(metrics.errors, '0')} /><Info label="Auth audit events" value={text(metrics.auth_audit_events, '0')} /><Info label="Pilot reports" value={text(metrics.pilot_reports_created, '0')} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Alert rules</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{alertRules.map((row) => <Info key={text(row.rule_key)} label={text(row.rule_key)} value={`${text(row.severity)} · threshold ${text(row.threshold)} · ${text(row.window_minutes)} min · ${bool(row.enabled) ? 'enabled' : 'disabled'}`} />)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Database} label="Database bytes" value={Number(health.database_size_bytes || 0).toLocaleString('en-ZA')} /><Metric icon={Gauge} label="Connections" value={text(health.connections, '0')} /><Metric icon={Activity} label="Mean query exec" value={`${text(health.mean_query_exec_ms, '0')} ms`} /><Metric icon={AlertTriangle} label="24h runtime errors" value={text(health.runtime_errors_24h, '0')} /></div>
            <Card><CardHeader><CardTitle>Database / storage health</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-3"><Info label="Storage bytes" value={Number(health.storage_bytes || 0).toLocaleString('en-ZA')} /><Info label="Active connections" value={text(health.active_connections, '0')} /><Info label="Long queries" value={text(health.long_running_queries, '0')} /><Info label="Slow statements" value={text(health.slow_statement_count, '0')} /><Info label="Dead tuples" value={text(health.dead_tuples, '0')} /><Info label="Latest migration" value={text(health.latest_migration)} /></CardContent></Card>
          </TabsContent>

          <TabsContent value="releases" className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3"><Metric icon={Rocket} label="Frontend SHA" value={build.sha.slice(0, 12)} /><Metric icon={CloudCog} label="Branch" value={build.branch} /><Metric icon={ServerCog} label="Environment" value={build.environment} /></div>
            <Card><CardHeader><CardTitle>Supabase release state</CardTitle><CardDescription>Migration history and audited release, backup-verification, and rollback markers.</CardDescription></CardHeader><CardContent className="space-y-2"><p className="font-mono text-sm">Latest migration: {text(release.latest_migration)}</p>{rows(release.migrations).slice(0, 10).map((row) => <div key={text(row.version)} className="flex justify-between rounded-lg border px-3 py-2 text-sm"><span>{text(row.name, 'migration')}</span><code>{text(row.version)}</code></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle>Release / backup verification / rollback markers</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={releaseForm.deployment_url} onChange={(event) => setReleaseForm({ ...releaseForm, deployment_url: event.target.value })} placeholder="Vercel deployment or rollback URL" /><Textarea value={releaseForm.notes} onChange={(event) => setReleaseForm({ ...releaseForm, notes: event.target.value })} placeholder="Notes" /><div className="flex flex-wrap gap-2"><Button onClick={() => void mutate('release-marker', 'create_release_marker', { kind: 'release', git_sha: build.sha, branch: build.branch, deployment_url: releaseForm.deployment_url, provider_state: 'verified', migration_version: release.latest_migration, notes: releaseForm.notes })}>Record release</Button><Button variant="outline" onClick={() => void mutate('backup-marker', 'create_release_marker', { kind: 'backup_verification', git_sha: build.sha, branch: build.branch, migration_version: release.latest_migration, provider_state: 'manual-verification', notes: releaseForm.notes || 'Supabase provider backup verification marker' })}>Record backup verification</Button><Button variant="outline" onClick={() => void mutate('rollback-marker', 'create_release_marker', { kind: 'rollback', git_sha: build.sha, branch: build.branch, deployment_url: releaseForm.deployment_url, migration_version: release.latest_migration, notes: releaseForm.notes })}>Record rollback point</Button></div>{rows(release.markers).map((row) => <div key={text(row.id)} className="rounded-lg border p-3"><p className="font-semibold">{text(row.kind)} · {text(row.git_sha)}</p><p className="text-xs text-muted-foreground">{date(row.created_at)} · migration {text(row.migration_version)} · {text(row.notes)}</p>{Boolean(row.deployment_url) && <a className="text-xs font-semibold text-primary underline" href={text(row.deployment_url)} target="_blank" rel="noreferrer">Open deployment/provider link</a>}</div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-5">
            <Card><CardHeader><CardTitle>Read-only “View as Role” diagnostics</CardTitle><CardDescription>No identity impersonation, token minting, or account switching occurs.</CardDescription></CardHeader><CardContent className="space-y-4"><select className="h-10 rounded-md border bg-background px-3" value={rolePreview} onChange={(event) => setRolePreview(event.target.value)}><option value="student">Student</option><option value="security">CPS / Security</option><option value="admin">Super Admin</option><option value="developer">Developer</option></select><div className="grid gap-3 md:grid-cols-2"><Info label="Users in role" value={text(obj(diagnostics.role_counts)[rolePreview], '0')} /><Info label="Route contract" value={selectedRoutes.join(', ') || 'None'} /></div><div className="grid gap-2 md:grid-cols-3">{rows(diagnostics.features).map((row) => <div key={text(row.key)} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>{MODULES[text(row.key)] ?? text(row.key)}</span><Badge variant={bool(row.enabled) ? 'default' : 'outline'}>{bool(row.enabled) ? 'on' : 'off'}</Badge></div>)}</div></CardContent></Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Control-plane audit trail</CardTitle><CardDescription>Every high-impact change is server audited.</CardDescription></div><Button onClick={() => void exportAudit()} disabled={busy === 'audit-export'}><Download className="mr-2 h-4 w-4" />Export CSV</Button></CardHeader><CardContent className="space-y-2">{audit.slice(0, 200).map((row) => <div key={text(row.id)} className="rounded-lg border p-3"><div className="flex justify-between gap-2"><p className="font-semibold">{text(row.action)}</p><span className="text-xs text-muted-foreground">{date(row.created_at)}</span></div><p className="mt-1 break-all text-xs text-muted-foreground">{text(row.target_type)} · {text(row.target_id)} · {JSON.stringify(row.details ?? {})}</p></div>)}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={freshMfaOpen} onOpenChange={(open) => {
        setFreshMfaOpen(open);
        if (!open) {
          setPendingControl(null);
          setFreshCode('');
          setMfaError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"><KeyRound className="h-5 w-5 text-primary" /></div>
            <DialogTitle>Fresh MFA verification</DialogTitle>
            <DialogDescription>{pendingControl ? 'This control changes protected production state. Verify a fresh authenticator code and the exact action will resume automatically without signing you out.' : 'Verify a fresh authenticator code to unlock protected controls for the short server-side re-authentication window.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {pendingControl && <div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="font-semibold">Pending action</p><p className="mt-1 text-muted-foreground">{pendingControl.action.replaceAll('_', ' ')} · {pendingControl.key}</p></div>}
            <Label htmlFor="developer-fresh-mfa">Authenticator code</Label>
            <Input id="developer-fresh-mfa" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={freshCode} onChange={(event) => setFreshCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter' && freshCode.length === 6) void unlockFreshMfa(); }} placeholder="000000" className="h-12 text-center font-mono text-xl tracking-[0.35em]" />
            {mfaError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{mfaError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreshMfaOpen(false)} disabled={busy === 'fresh-mfa'}>Cancel</Button>
            <Button onClick={() => void unlockFreshMfa()} disabled={busy === 'fresh-mfa' || freshCode.length !== 6}>{busy === 'fresh-mfa' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Verify MFA{pendingControl ? ' & continue' : ''}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div><div className="min-w-0"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="truncate text-xl font-black">{value}</p></div></CardContent></Card>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/25 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-all text-sm font-semibold">{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function SecurityRow({ row, onAction }: { row: Row; onAction: () => void }) {
  const severe = ['critical', 'error'].includes(text(row.severity, ''));
  return <div className="rounded-lg border p-3"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Badge variant={severe ? 'destructive' : 'outline'}>{text(row.severity)}</Badge><p className="font-semibold">{text(row.title)}</p></div><p className="mt-1 text-xs text-muted-foreground">{text(row.message)} · {date(row.created_at)}</p></div><Button size="sm" variant="outline" onClick={onAction}>Resolve</Button></div></div>;
}
