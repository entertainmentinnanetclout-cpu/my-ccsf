import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Ban,
  CheckCircle2,
  CircleOff,
  Clock3,
  Database,
  Fingerprint,
  Gauge,
  Laptop,
  LockKeyhole,
  MonitorCog,
  Power,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  TerminalSquare,
  UserCheck,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRuntimeControl } from '@/contexts/RuntimeControlContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InstitutionBrand } from '@/components/shared/InstitutionBrand';

const controlClass = 'h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const textareaClass = `${controlClass} min-h-24 resize-y`;

type SystemConfig = {
  mode?: 'live' | 'maintenance' | 'locked' | string;
  message?: string;
  approval_required?: boolean;
  access_gate_enabled?: boolean;
  telemetry_enabled?: boolean;
};

type DeveloperSummary = {
  users: { total: number; by_status: Record<string, number> };
  sessions: { total: number; revoked: number };
  health_24h: { total_events: number; by_severity: Record<string, number> };
  restrictions: { active: number };
  system: SystemConfig;
  developer: { user_id: string; is_owner: boolean; permissions: Record<string, boolean> };
};

type DeveloperUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  campus: string | null;
  roles: string[];
  access_status: string;
  access_reason: string | null;
  account_created_at: string;
  last_sign_in_at: string | null;
  active_sessions: number;
  last_session_at: string | null;
};

type DeveloperSession = {
  session_id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  refreshed_at: string | null;
  not_after: string | null;
  device_hash: string | null;
  device_type: string | null;
  browser_name: string | null;
  browser_version: string | null;
  operating_system: string | null;
  device_last_seen_at: string | null;
  revoked: boolean;
};

type Restriction = {
  id: string;
  restriction_kind: 'user' | 'email' | 'ip' | 'device' | 'session';
  target_user_id: string | null;
  target_email: string | null;
  target_ip: string | null;
  target_device_hash: string | null;
  target_session_id: string | null;
  reason: string;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

type FeatureFlag = {
  key: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  updated_at: string;
};

type FeatureOverride = {
  feature_key: string;
  user_id: string;
  enabled: boolean;
  reason: string | null;
  updated_at: string;
};

type HealthEvent = {
  id: number;
  user_id: string | null;
  auth_session_id: string | null;
  device_hash: string | null;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | string;
  route: string | null;
  message: string | null;
  duration_ms: number | null;
  status_code: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type AuditLog = {
  id: number;
  developer_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type HealthResponse = {
  hours: number;
  summary: {
    total: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    average_duration_ms: number | null;
  };
  events: HealthEvent[];
};

async function developerCall<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>('developer-control', {
    body: { action, payload },
  });
  if (error) throw error;
  if (!data) throw new Error('Developer control plane returned no data.');
  if (data.error) throw new Error(data.error);
  return data;
}

function displayName(user: DeveloperUser | { full_name?: string | null; email?: string | null }) {
  return user.full_name?.trim() || user.email || 'Unnamed user';
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortId(value: string | null | undefined) {
  if (!value) return '—';
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function restrictionTarget(row: Restriction) {
  if (row.restriction_kind === 'user') return row.target_user_id;
  if (row.restriction_kind === 'email') return row.target_email;
  if (row.restriction_kind === 'ip') return row.target_ip;
  if (row.restriction_kind === 'device') return row.target_device_hash;
  return row.target_session_id;
}

function accessBadge(status: string) {
  const classes: Record<string, string> = {
    approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    pending: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    suspended: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    blocked: 'border-destructive/30 bg-destructive/10 text-destructive',
  };
  return <Badge variant="outline" className={classes[status] ?? ''}>{status}</Badge>;
}

function severityBadge(severity: string) {
  const classes: Record<string, string> = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    error: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    critical: 'border-destructive/30 bg-destructive/10 text-destructive',
  };
  return <Badge variant="outline" className={classes[severity] ?? ''}>{severity}</Badge>;
}

export default function DeveloperPortal() {
  const queryClient = useQueryClient();
  const { refresh: refreshRuntime } = useRuntimeControl();
  const [userSearch, setUserSearch] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [restrictionKind, setRestrictionKind] = useState<Restriction['restriction_kind']>('email');
  const [restrictionValue, setRestrictionValue] = useState('');
  const [restrictionReason, setRestrictionReason] = useState('Developer restriction');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [overrideEnabled, setOverrideEnabled] = useState(true);
  const [overrideReason, setOverrideReason] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['developer', 'summary'],
    queryFn: () => developerCall<DeveloperSummary>('summary'),
    refetchInterval: 30_000,
  });
  const usersQuery = useQuery({
    queryKey: ['developer', 'users'],
    queryFn: () => developerCall<{ users: DeveloperUser[] }>('list_users'),
  });
  const sessionsQuery = useQuery({
    queryKey: ['developer', 'sessions'],
    queryFn: () => developerCall<{ sessions: DeveloperSession[] }>('list_sessions'),
    refetchInterval: 30_000,
  });
  const restrictionsQuery = useQuery({
    queryKey: ['developer', 'restrictions'],
    queryFn: () => developerCall<{ restrictions: Restriction[] }>('list_restrictions'),
  });
  const featuresQuery = useQuery({
    queryKey: ['developer', 'features'],
    queryFn: () => developerCall<{ flags: FeatureFlag[]; overrides: FeatureOverride[] }>('list_features'),
  });
  const healthQuery = useQuery({
    queryKey: ['developer', 'health'],
    queryFn: () => developerCall<HealthResponse>('list_health', { hours: 24 }),
    refetchInterval: 30_000,
  });
  const auditQuery = useQuery({
    queryKey: ['developer', 'audit'],
    queryFn: () => developerCall<{ audit: AuditLog[] }>('list_audit'),
  });

  const mutation = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) => developerCall<Record<string, unknown>>(action, payload),
    onSuccess: async (_data, variables) => {
      toast.success('Developer control applied');
      await queryClient.invalidateQueries({ queryKey: ['developer'] });
      if (variables.action === 'set_system' || variables.action.includes('feature') || variables.action === 'toggle_feature') {
        await refreshRuntime({ type: 'developer_control_refresh', severity: 'info', metadata: { action: variables.action } });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Developer control failed');
    },
  });

  const users = usersQuery.data?.users ?? [];
  const sessions = sessionsQuery.data?.sessions ?? [];
  const restrictions = restrictionsQuery.data?.restrictions ?? [];
  const flags = featuresQuery.data?.flags ?? [];
  const overrides = featuresQuery.data?.overrides ?? [];
  const health = healthQuery.data;
  const audit = auditQuery.data?.audit ?? [];
  const summary = summaryQuery.data;
  const system = summary?.system ?? {};

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [
      user.full_name,
      user.first_name,
      user.last_name,
      user.email,
      user.campus,
      ...user.roles,
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
  }, [userSearch, users]);

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) => [
      session.full_name,
      session.email,
      session.ip_address,
      session.device_type,
      session.browser_name,
      session.operating_system,
      session.session_id,
    ].some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
  }, [sessionSearch, sessions]);

  const selectedUser = users.find((user) => user.user_id === selectedUserId) ?? null;
  const selectedUserOverrides = overrides.filter((override) => override.user_id === selectedUserId);

  const setSystem = (patch: SystemConfig) => {
    mutation.mutate({ action: 'set_system', payload: { config: patch } });
  };

  const setUserAccess = (user: DeveloperUser, status: string, reason?: string) => {
    const label = status === 'approved' ? 'approve' : status;
    if (status === 'blocked' && !window.confirm(`Block ${displayName(user)} and revoke all known sessions?`)) return;
    mutation.mutate({
      action: 'set_user_access',
      payload: { user_id: user.user_id, status, reason: reason ?? `Developer ${label}` },
    });
  };

  const block = (kind: Restriction['restriction_kind'], value: string | null | undefined, reason: string) => {
    if (!value) return;
    if (!window.confirm(`Create an active ${kind} restriction for ${value}?`)) return;
    mutation.mutate({ action: 'block', payload: { kind, value, reason } });
  };

  const createRestriction = () => {
    const value = restrictionValue.trim();
    if (!value) {
      toast.error('Enter a restriction target.');
      return;
    }
    block(restrictionKind, value, restrictionReason.trim() || 'Developer restriction');
  };

  const applyOverride = () => {
    if (!selectedUserId || !selectedFeature) {
      toast.error('Select a user and feature first.');
      return;
    }
    mutation.mutate({
      action: 'set_feature_override',
      payload: {
        user_id: selectedUserId,
        key: selectedFeature,
        enabled: overrideEnabled,
        reason: overrideReason.trim() || null,
      },
    });
  };

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['developer'] });
    toast.success('Developer data refreshed');
  };

  return (
    <main className="min-h-screen bg-muted/20">
      <div className="border-b bg-background">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <InstitutionBrand size="header" />
            <div className="border-l pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Developer Control Plane</h1>
                {summary?.developer.is_owner && <Badge>Owner</Badge>}
                <SystemModeBadge mode={system.mode ?? 'live'} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">CCSF system authority, access enforcement, sessions, feature flags and runtime health.</p>
            </div>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void refreshAll()}>
            <RefreshCw className="h-4 w-4" /> Refresh all
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-5">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-auto min-w-max flex-wrap justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="restrictions">Restrictions</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="health">Health</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Users} label="Onboarded users" value={summary?.users.total ?? 0} detail={`${summary?.users.by_status.pending ?? 0} pending approval`} />
              <MetricCard icon={Laptop} label="Known sessions" value={summary?.sessions.total ?? 0} detail={`${summary?.sessions.revoked ?? 0} revoked`} />
              <MetricCard icon={Ban} label="Active restrictions" value={summary?.restrictions.active ?? 0} detail="User, email, IP, device or session" />
              <MetricCard icon={Activity} label="Events · 24h" value={summary?.health_24h.total_events ?? 0} detail={`${summary?.health_24h.by_severity.error ?? 0} errors`} />
              <MetricCard icon={ShieldOff} label="Critical · 24h" value={summary?.health_24h.by_severity.critical ?? 0} detail="Runtime critical events" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
              <Card className="border-destructive/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2"><Power className="h-5 w-5 text-destructive" /> Master system control</CardTitle>
                      <CardDescription>Change the whole application state. Developer accounts retain recovery access.</CardDescription>
                    </div>
                    <SystemModeBadge mode={system.mode ?? 'live'} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button disabled={mutation.isPending} variant={system.mode === 'live' ? 'default' : 'outline'} onClick={() => setSystem({ mode: 'live' })} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Live
                    </Button>
                    <Button disabled={mutation.isPending} variant={system.mode === 'maintenance' ? 'secondary' : 'outline'} onClick={() => setSystem({ mode: 'maintenance' })} className="gap-2">
                      <Wrench className="h-4 w-4" /> Maintenance
                    </Button>
                    <Button disabled={mutation.isPending} variant="destructive" onClick={() => {
                      if (window.confirm('FULL LOCK blocks the CCSF application for all non-developer users. Continue?')) setSystem({ mode: 'locked' });
                    }} className="gap-2">
                      <LockKeyhole className="h-4 w-4" /> Full lock
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ControlToggle
                      title="Server access gate"
                      description="Enforce approvals, bans and revoked sessions in database RLS."
                      enabled={system.access_gate_enabled === true}
                      onToggle={() => setSystem({ access_gate_enabled: system.access_gate_enabled !== true })}
                      critical
                    />
                    <ControlToggle
                      title="Approval required"
                      description="New onboarded accounts stay pending until you approve them."
                      enabled={system.approval_required !== false}
                      onToggle={() => setSystem({ approval_required: system.approval_required === false })}
                    />
                    <ControlToggle
                      title="Runtime telemetry"
                      description="Collect health events, device metadata and client failures."
                      enabled={system.telemetry_enabled !== false}
                      onToggle={() => setSystem({ telemetry_enabled: system.telemetry_enabled === false })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium" htmlFor="system-message">Lock / maintenance message</label>
                    <textarea
                      id="system-message"
                      className={textareaClass}
                      value={systemMessage}
                      placeholder={system.message || 'Message users should see when CCSF is paused or locked'}
                      onChange={(event) => setSystemMessage(event.target.value)}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button variant="outline" disabled={mutation.isPending} onClick={() => setSystem({ message: systemMessage.trim() })}>Save message</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ServerCog className="h-5 w-5" /> Authority status</CardTitle>
                  <CardDescription>Current protection posture for the control plane.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <StatusLine icon={ShieldCheck} label="Developer identity" value={summary?.developer.is_owner ? 'Owner authority' : 'Delegated developer'} positive />
                  <StatusLine icon={Database} label="Database enforcement" value={system.access_gate_enabled ? 'Enforced' : 'Prepared · not enabled'} positive={system.access_gate_enabled === true} />
                  <StatusLine icon={UserCheck} label="New account approval" value={system.approval_required === false ? 'Automatic / unrestricted' : 'Developer approval required'} positive={system.approval_required !== false} />
                  <StatusLine icon={Gauge} label="Telemetry" value={system.telemetry_enabled === false ? 'Disabled' : 'Enabled'} positive={system.telemetry_enabled !== false} />
                  <StatusLine icon={Fingerprint} label="Restriction matching" value="User · email · IP · device · session" positive />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Onboarded people</CardTitle>
                <CardDescription>Search by name, surname, email, campus or role, then control the exact account.</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchField value={userSearch} onChange={setUserSearch} placeholder="Search name, surname, email, campus or role" />
                <div className="mt-4 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Campus / role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Last sign-in</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <div className="font-medium">{displayName(user)}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{shortId(user.user_id)}</div>
                          </TableCell>
                          <TableCell>
                            <div>{user.campus || 'No campus'}</div>
                            <div className="text-xs text-muted-foreground">{user.roles.join(', ') || 'No role'}</div>
                          </TableCell>
                          <TableCell>
                            {accessBadge(user.access_status)}
                            {user.access_reason && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{user.access_reason}</div>}
                          </TableCell>
                          <TableCell>{user.active_sessions}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(user.last_sign_in_at)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {user.access_status !== 'approved' && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setUserAccess(user, 'approved', 'Approved by developer')}>Approve</Button>}
                              {user.access_status === 'approved' && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setUserAccess(user, 'suspended', 'Suspended by developer')}>Suspend</Button>}
                              <Button size="sm" variant="destructive" disabled={mutation.isPending || summary?.developer.user_id === user.user_id} onClick={() => setUserAccess(user, 'blocked', 'Blocked by developer')}>Block</Button>
                              <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'revoke_user_sessions', payload: { user_id: user.user_id, reason: 'All sessions revoked by developer' } })}>Revoke sessions</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setSelectedUserId(user.user_id); setSelectedFeature(flags[0]?.key ?? ''); }}>Features</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredUsers.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No users match this search.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Authentication sessions & devices</CardTitle>
                <CardDescription>Supabase Auth session identity is joined with device telemetry for browser, OS, IP and device controls.</CardDescription>
              </CardHeader>
              <CardContent>
                <SearchField value={sessionSearch} onChange={setSessionSearch} placeholder="Search user, IP, browser, OS, device or session ID" />
                <div className="mt-4 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Browser / OS</TableHead>
                        <TableHead>Last activity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Control</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session) => (
                        <TableRow key={session.session_id}>
                          <TableCell>
                            <div className="font-medium">{displayName(session)}</div>
                            <div className="text-xs text-muted-foreground">{session.email || 'No email'}</div>
                            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{shortId(session.session_id)}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{session.ip_address || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5"><DeviceIcon type={session.device_type} /> {session.device_type || 'Unknown'}</div>
                            {session.device_hash && <div className="mt-1 font-mono text-[10px] text-muted-foreground">{shortId(session.device_hash)}</div>}
                          </TableCell>
                          <TableCell>
                            <div>{session.browser_name || 'Unknown'} {session.browser_version || ''}</div>
                            <div className="text-xs text-muted-foreground">{session.operating_system || 'Unknown OS'}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(session.device_last_seen_at || session.updated_at)}</TableCell>
                          <TableCell>{session.revoked ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="outline">Known</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <Button size="sm" variant="destructive" disabled={mutation.isPending || session.revoked} onClick={() => mutation.mutate({ action: 'revoke_session', payload: { session_id: session.session_id, reason: 'Session revoked by developer' } })}>Revoke</Button>
                              <Button size="sm" variant="outline" disabled={!session.ip_address || mutation.isPending} onClick={() => block('ip', session.ip_address, `Blocked from session ${session.session_id}`)}>Block IP</Button>
                              <Button size="sm" variant="outline" disabled={!session.device_hash || mutation.isPending} onClick={() => block('device', session.device_hash, `Blocked device from session ${session.session_id}`)}>Block device</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredSessions.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No sessions match this search.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5" /> Create restriction</CardTitle>
                  <CardDescription>Directly deny an exact account, email, IP, device fingerprint or auth session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block text-sm font-medium">Restriction type</label>
                  <select className={controlClass} value={restrictionKind} onChange={(event) => setRestrictionKind(event.target.value as Restriction['restriction_kind'])}>
                    <option value="user">User ID</option>
                    <option value="email">Email</option>
                    <option value="ip">IP address</option>
                    <option value="device">Device hash</option>
                    <option value="session">Session ID</option>
                  </select>
                  <label className="block text-sm font-medium">Exact target</label>
                  <input className={controlClass} value={restrictionValue} onChange={(event) => setRestrictionValue(event.target.value)} placeholder={`Enter ${restrictionKind} value`} />
                  <label className="block text-sm font-medium">Reason</label>
                  <textarea className={textareaClass} value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} />
                  <Button variant="destructive" className="w-full gap-2" disabled={mutation.isPending} onClick={createRestriction}><LockKeyhole className="h-4 w-4" /> Apply restriction</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active and historical restrictions</CardTitle>
                  <CardDescription>Every restriction remains auditable even after it is released.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Reason</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                      <TableBody>
                        {restrictions.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell><Badge variant="outline">{row.restriction_kind}</Badge></TableCell>
                            <TableCell className="max-w-52 break-all font-mono text-xs">{restrictionTarget(row) || '—'}</TableCell>
                            <TableCell className="max-w-56 text-xs">{row.reason}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs">{formatDate(row.created_at)}</TableCell>
                            <TableCell>{row.active ? <Badge variant="destructive">Active</Badge> : <Badge variant="outline">Released</Badge>}</TableCell>
                            <TableCell className="text-right">{row.active && <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'unblock', payload: { restriction_id: row.id } })}>Unblock</Button>}</TableCell>
                          </TableRow>
                        ))}
                        {!restrictions.length && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No restrictions recorded.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><MonitorCog className="h-5 w-5" /> Global feature flags</CardTitle>
                  <CardDescription>Switch a feature on or off for the entire authorised user base.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {flags.map((flag) => (
                    <div key={flag.key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{flag.key}</div>
                        <div className="text-xs text-muted-foreground">{flag.description || 'No description'}</div>
                      </div>
                      <Button size="sm" variant={flag.enabled ? 'default' : 'outline'} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'toggle_feature', payload: { key: flag.key, enabled: !flag.enabled } })}>
                        {flag.enabled ? 'ON' : 'OFF'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TerminalSquare className="h-5 w-5" /> Per-user feature override</CardTitle>
                  <CardDescription>Give or remove a specific feature for one exact user without changing the global flag.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block text-sm font-medium">User</label>
                  <select className={controlClass} value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                    <option value="">Select user</option>
                    {users.map((user) => <option key={user.user_id} value={user.user_id}>{displayName(user)} — {user.email}</option>)}
                  </select>
                  <label className="block text-sm font-medium">Feature</label>
                  <select className={controlClass} value={selectedFeature} onChange={(event) => setSelectedFeature(event.target.value)}>
                    <option value="">Select feature</option>
                    {flags.map((flag) => <option key={flag.key} value={flag.key}>{flag.key}</option>)}
                  </select>
                  <label className="block text-sm font-medium">Override state</label>
                  <select className={controlClass} value={overrideEnabled ? 'enabled' : 'disabled'} onChange={(event) => setOverrideEnabled(event.target.value === 'enabled')}>
                    <option value="enabled">Force enabled</option>
                    <option value="disabled">Force disabled</option>
                  </select>
                  <label className="block text-sm font-medium">Reason</label>
                  <textarea className={textareaClass} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Why this user receives a different feature state" />
                  <Button className="w-full" disabled={mutation.isPending} onClick={applyOverride}>Apply override</Button>

                  {selectedUser && (
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                      <div className="text-sm font-medium">Overrides for {displayName(selectedUser)}</div>
                      <div className="mt-2 space-y-2">
                        {selectedUserOverrides.map((override) => (
                          <div key={override.feature_key} className="flex items-center justify-between gap-3 rounded-md border bg-background p-2 text-xs">
                            <div><span className="font-medium">{override.feature_key}</span> → {override.enabled ? 'enabled' : 'disabled'}{override.reason ? ` · ${override.reason}` : ''}</div>
                            <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: 'remove_feature_override', payload: { key: override.feature_key, user_id: selectedUser.user_id } })}>Remove</Button>
                          </div>
                        ))}
                        {!selectedUserOverrides.length && <div className="text-xs text-muted-foreground">No per-user overrides.</div>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="health" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Activity} label="Runtime events" value={health?.summary.total ?? 0} detail="Last 24 hours" />
              <MetricCard icon={ShieldOff} label="Critical" value={health?.summary.by_severity.critical ?? 0} detail="Needs immediate review" />
              <MetricCard icon={CircleOff} label="Errors" value={health?.summary.by_severity.error ?? 0} detail="Client/runtime failures" />
              <MetricCard icon={Clock3} label="Avg duration" value={health?.summary.average_duration_ms ?? 0} detail="Milliseconds for timed events" />
              <MetricCard icon={Wifi} label="Warnings" value={health?.summary.by_severity.warning ?? 0} detail="Degraded or unusual states" />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Runtime event stream</CardTitle>
                    <CardDescription>Navigation, heartbeats, render failures, unhandled rejections and other instrumented flow signals.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void healthQuery.refetch()} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Event</TableHead><TableHead>Route / message</TableHead><TableHead>Timing</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(health?.events ?? []).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>{severityBadge(event.severity)}</TableCell>
                          <TableCell className="font-medium">{event.event_type}</TableCell>
                          <TableCell className="max-w-xl">
                            <div className="truncate text-xs font-medium">{event.route || 'No route'}</div>
                            {event.message && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.message}</div>}
                          </TableCell>
                          <TableCell className="text-xs">{event.duration_ms != null ? `${event.duration_ms} ms` : '—'}{event.status_code != null ? ` · HTTP ${event.status_code}` : ''}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(event.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {!(health?.events.length) && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No runtime telemetry has been recorded in this window yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Immutable developer action trail</CardTitle>
                <CardDescription>Every control-plane mutation records the developer, action, target and details.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Developer</TableHead><TableHead>Details</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {audit.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.action}</TableCell>
                          <TableCell><div className="text-xs">{row.target_type || '—'}</div><div className="font-mono text-[11px] text-muted-foreground">{shortId(row.target_id)}</div></TableCell>
                          <TableCell className="font-mono text-xs">{shortId(row.developer_id)}</TableCell>
                          <TableCell className="max-w-xl"><pre className="max-h-20 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">{JSON.stringify(row.details)}</pre></TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(row.created_at)}</TableCell>
                        </TableRow>
                      ))}
                      {!audit.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No developer actions recorded yet.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: number | string; detail: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5"><Icon className="h-5 w-5 text-primary" /></div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function SystemModeBadge({ mode }: { mode: string }) {
  if (mode === 'live') return <Badge className="bg-emerald-600">LIVE</Badge>;
  if (mode === 'maintenance') return <Badge variant="secondary">MAINTENANCE</Badge>;
  return <Badge variant="destructive">FULL LOCK</Badge>;
}

function ControlToggle({ title, description, enabled, onToggle, critical = false }: { title: string; description: string; enabled: boolean; onToggle: () => void; critical?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${critical && !enabled ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Button size="sm" variant={enabled ? 'default' : 'outline'} onClick={onToggle}>{enabled ? 'ON' : 'OFF'}</Button>
    </div>
  );
}

function StatusLine({ icon: Icon, label, value, positive }: { icon: typeof ShieldCheck; label: string; value: string; positive: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className={`rounded-md p-2 ${positive ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
        <Icon className={`h-4 w-4 ${positive ? 'text-emerald-600' : 'text-amber-600'}`} />
      </div>
      <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate font-medium">{value}</div></div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-xl">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input className={`${controlClass} pl-9`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type?.toLowerCase().includes('mobile')) return <Smartphone className="h-4 w-4 text-muted-foreground" />;
  if (type?.toLowerCase().includes('tablet')) return <Laptop className="h-4 w-4 text-muted-foreground" />;
  return <Laptop className="h-4 w-4 text-muted-foreground" />;
}
