import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, FileUp, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Json } from '@/integrations/supabase/types';
import type { PilotFeatureTest } from '@/types/pilot';

function objectValue(value: Json | null | undefined): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Json | undefined> : {};
}

function text(value: Json | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function PilotEvidenceAnalytics() {
  const [tests, setTests] = useState<PilotFeatureTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('pilot_feature_tests')
      .select('*')
      .or('feature_key.ilike.%attachment%,feature_key.ilike.%evidence%,feature_key.ilike.%report_submission%')
      .order('created_at', { ascending: false })
      .limit(500);
    if (queryError) { setError(queryError.message); setLoading(false); return; }
    setTests((data ?? []) as PilotFeatureTest[]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('pilot-evidence-analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pilot_feature_tests' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const metrics = useMemo(() => {
    const passed = tests.filter((item) => item.outcome === 'passed').length;
    const failed = tests.filter((item) => item.outcome === 'failed').length;
    const durationValues = tests.map((item) => item.duration_ms).filter((value): value is number => typeof value === 'number');
    const averageDuration = durationValues.length ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length) : 0;
    const deviceCounts = new Map<string, number>();
    const networkCounts = new Map<string, number>();
    const errors = new Map<string, number>();

    tests.forEach((item) => {
      const metadata = objectValue(item.metadata);
      const device = objectValue(metadata.device);
      const operatingSystem = text(device.operating_system) ?? 'Unknown OS';
      const browser = text(device.browser_name) ?? 'Unknown browser';
      const deviceType = text(device.device_type) ?? 'unknown device';
      const key = `${operatingSystem} · ${browser} · ${deviceType}`;
      deviceCounts.set(key, (deviceCounts.get(key) ?? 0) + 1);
      const network = text(device.network_type) ?? 'Unknown network';
      networkCounts.set(network, (networkCounts.get(network) ?? 0) + 1);
      if (item.error_code) errors.set(item.error_code, (errors.get(item.error_code) ?? 0) + 1);
    });

    const total = tests.length;
    return {
      total, passed, failed, averageDuration,
      successRate: total ? Math.round((passed / total) * 100) : 0,
      devices: [...deviceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      networks: [...networkCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      errors: [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [tests]);

  return (
    <Card className="border-primary/20 shadow-large" data-testid="pilot-evidence-analytics">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />Mobile Evidence Reliability</CardTitle><CardDescription>Measured evidence-first submissions, interruptions, device conditions and upload failures across the Controlled Pilot.</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4" />{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={CheckCircle2} label="Evidence success" value={`${metrics.successRate}%`} />
          <Metric icon={FileUp} label="Measured attempts" value={metrics.total} />
          <Metric icon={AlertCircle} label="Failed attempts" value={metrics.failed} />
          <Metric icon={Clock3} label="Average duration" value={metrics.averageDuration ? `${(metrics.averageDuration / 1000).toFixed(1)} s` : '—'} />
        </div>
        <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Verified upload success</span><span>{metrics.passed} passed / {metrics.total} measured</span></div><Progress value={metrics.successRate} /></div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Breakdown title="Devices and browsers" icon={Smartphone} entries={metrics.devices} empty="Device telemetry appears after evidence tests." />
          <Breakdown title="Network conditions" icon={FileUp} entries={metrics.networks} empty="Network telemetry appears after evidence tests." />
          <Breakdown title="Recurring errors" icon={AlertCircle} entries={metrics.errors} empty="No recurring evidence errors recorded." danger />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileUp; label: string; value: string | number }) {
  return <div className="rounded-xl border p-4"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p></div>;
}

function Breakdown({ title, icon: Icon, entries, empty, danger = false }: { title: string; icon: typeof FileUp; entries: Array<[string, number]>; empty: string; danger?: boolean }) {
  return <div className="rounded-xl border p-4"><h3 className="flex items-center gap-2 font-semibold"><Icon className={`h-4 w-4 ${danger ? 'text-destructive' : 'text-primary'}`} />{title}</h3><div className="mt-3 space-y-2">{entries.map(([label, count]) => <div key={label} className="flex items-start justify-between gap-3 rounded-lg bg-muted/35 p-2 text-sm"><span className="min-w-0 break-words">{label}</span><Badge variant={danger ? 'destructive' : 'secondary'}>{count}</Badge></div>)}{!entries.length && <p className="text-sm text-muted-foreground">{empty}</p>}</div></div>;
}
