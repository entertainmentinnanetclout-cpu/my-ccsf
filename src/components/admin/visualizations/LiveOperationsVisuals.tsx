import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  Filter,
  MapPinned,
  Radio,
  RefreshCw,
  RotateCcw,
  Rows3,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, startOfDay, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface LiveVisualRecord {
  id: string;
  campus: string | null;
  status: string;
  category: string;
  createdAt: string;
  resolvedAt?: string | null;
  title?: string | null;
  isCritical?: boolean;
}

interface LiveOperationsVisualsProps {
  records: LiveVisualRecord[];
  title?: string;
  description?: string;
  locationLabels?: Record<string, string>;
  defaultCampus?: string;
  lockCampus?: boolean;
  statusOrder?: string[];
  statusLabels?: Record<string, string>;
  resolvedStatuses?: string[];
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  onOpenQueue?: () => void;
  onOpenAnalytics?: () => void;
  onOpenRecord?: (recordId: string) => void;
}

type PeriodFilter = '7d' | '30d' | 'all';

const DEFAULT_STATUS_ORDER = ['pending', 'assigned', 'resolved'];
const DEFAULT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  assessing: 'Assessing',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  simulation_completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 12px 30px -12px rgba(0,0,0,0.28)',
};

const formatStatus = (status: string, labels: Record<string, string>) =>
  labels[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function LiveOperationsVisuals({
  records,
  title = 'Live Visual Intelligence',
  description = 'Interactive operational patterns with direct drill-down and queue actions.',
  locationLabels = {},
  defaultCampus,
  lockCampus = false,
  statusOrder = DEFAULT_STATUS_ORDER,
  statusLabels = DEFAULT_STATUS_LABELS,
  resolvedStatuses = ['resolved', 'simulation_completed'],
  onRefresh,
  refreshing = false,
  onOpenQueue,
  onOpenAnalytics,
  onOpenRecord,
}: LiveOperationsVisualsProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [campus, setCampus] = useState(defaultCampus ?? 'all');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');

  const campuses = useMemo(
    () => Array.from(new Set(records.map((record) => record.campus).filter((value): value is string => Boolean(value)))).sort(),
    [records],
  );
  const statuses = useMemo(() => Array.from(new Set(records.map((record) => record.status))).sort(), [records]);
  const categories = useMemo(() => Array.from(new Set(records.map((record) => record.category))).sort(), [records]);

  const periodStart = useMemo(() => {
    if (period === 'all') return null;
    return startOfDay(subDays(new Date(), period === '7d' ? 6 : 29)).getTime();
  }, [period]);

  const periodRecords = useMemo(
    () => records.filter((record) => !periodStart || new Date(record.createdAt).getTime() >= periodStart),
    [records, periodStart],
  );

  const filteredRecords = useMemo(
    () => periodRecords.filter((record) => {
      const campusMatch = campus === 'all' || record.campus === campus;
      const statusMatch = status === 'all' || record.status === status;
      const categoryMatch = category === 'all' || record.category === category;
      return campusMatch && statusMatch && categoryMatch;
    }),
    [periodRecords, campus, status, category],
  );

  const activeCount = filteredRecords.filter((record) => !resolvedStatuses.includes(record.status)).length;
  const criticalCount = filteredRecords.filter((record) => record.isCritical).length;
  const resolvedCount = filteredRecords.filter((record) => resolvedStatuses.includes(record.status)).length;
  const resolutionRate = filteredRecords.length ? Math.round((resolvedCount / filteredRecords.length) * 100) : 0;

  const trendDays = period === '7d' ? 7 : 30;
  const trendData = useMemo(
    () => Array.from({ length: trendDays }, (_, index) => {
      const date = subDays(new Date(), trendDays - 1 - index);
      const dateKey = format(date, 'yyyy-MM-dd');
      const matches = filteredRecords.filter((record) => format(new Date(record.createdAt), 'yyyy-MM-dd') === dateKey);
      return {
        date: format(date, trendDays === 7 ? 'EEE' : 'dd MMM'),
        total: matches.length,
        critical: matches.filter((record) => record.isCritical).length,
      };
    }),
    [filteredRecords, trendDays],
  );

  const categoryData = useMemo(() => {
    const counts = filteredRecords.reduce<Record<string, number>>((result, record) => {
      result[record.category] = (result[record.category] ?? 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, shortName: name.length > 19 ? `${name.slice(0, 18)}…` : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [filteredRecords]);

  const campusData = useMemo(() => campuses.map((campusKey) => {
    const campusRecords = periodRecords.filter((record) => record.campus === campusKey && (status === 'all' || record.status === status) && (category === 'all' || record.category === category));
    const active = campusRecords.filter((record) => !resolvedStatuses.includes(record.status)).length;
    const critical = campusRecords.filter((record) => record.isCritical).length;
    const riskScore = active + critical * 2;
    return {
      key: campusKey,
      label: locationLabels[campusKey] ?? campusKey.replace(/_/g, ' '),
      total: campusRecords.length,
      active,
      critical,
      riskScore,
      size: 82 + Math.min(62, Math.sqrt(Math.max(1, campusRecords.length)) * 15),
    };
  }).sort((a, b) => b.riskScore - a.riskScore), [campuses, periodRecords, status, category, resolvedStatuses, locationLabels]);

  const flowData = useMemo(() => statusOrder.map((statusKey) => ({
    status: statusKey,
    label: formatStatus(statusKey, statusLabels),
    value: filteredRecords.filter((record) => record.status === statusKey).length,
  })), [filteredRecords, statusOrder, statusLabels]);

  const heatmapData = useMemo(() => {
    const timeBands = [
      { label: '00–06', from: 0, to: 5 },
      { label: '06–12', from: 6, to: 11 },
      { label: '12–18', from: 12, to: 17 },
      { label: '18–24', from: 18, to: 23 },
    ];
    return Array.from({ length: 7 }, (_, index) => {
      const date = subDays(new Date(), 6 - index);
      const dateKey = format(date, 'yyyy-MM-dd');
      return {
        day: format(date, 'EEE'),
        cells: timeBands.map((band) => ({
          ...band,
          count: filteredRecords.filter((record) => {
            const created = new Date(record.createdAt);
            return format(created, 'yyyy-MM-dd') === dateKey && created.getHours() >= band.from && created.getHours() <= band.to;
          }).length,
        })),
      };
    });
  }, [filteredRecords]);
  const maxHeat = Math.max(1, ...heatmapData.flatMap((day) => day.cells.map((cell) => cell.count)));

  const recentCritical = useMemo(
    () => filteredRecords.filter((record) => record.isCritical).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4),
    [filteredRecords],
  );

  const resetFilters = () => {
    setPeriod('30d');
    setCampus(defaultCampus ?? 'all');
    setStatus('all');
    setCategory('all');
  };

  return (
    <section className="space-y-5" aria-label={title}>
      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-background">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5"><Radio className="h-3.5 w-3.5 animate-pulse" />Live</Badge>
                <Badge variant="outline">{filteredRecords.length} visible records</Badge>
                <Badge variant="outline">{PERIOD_LABELS[period]}</Badge>
              </div>
              <CardTitle className="flex items-center gap-2 text-xl"><MapPinned className="h-5 w-5 text-primary" />{title}</CardTitle>
              <CardDescription className="mt-1 max-w-3xl">{description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {onOpenQueue && <Button size="sm" onClick={onOpenQueue}><Rows3 className="mr-2 h-4 w-4" />Open live queue</Button>}
              {onOpenAnalytics && <Button size="sm" variant="outline" onClick={onOpenAnalytics}><BarChart3 className="mr-2 h-4 w-4" />Full analytics</Button>}
              {onRefresh && <Button size="sm" variant="outline" onClick={() => void onRefresh()} disabled={refreshing}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_1fr_auto]">
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
              <SelectTrigger aria-label="Filter visual period"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(PERIOD_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            {!lockCampus && <Select value={campus} onValueChange={setCampus}><SelectTrigger aria-label="Filter visual campus"><SelectValue placeholder="All campuses" /></SelectTrigger><SelectContent><SelectItem value="all">All campuses</SelectItem>{campuses.map((campusKey) => <SelectItem key={campusKey} value={campusKey}>{locationLabels[campusKey] ?? campusKey.replace(/_/g, ' ')}</SelectItem>)}</SelectContent></Select>}
            <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Filter visual status"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((statusKey) => <SelectItem key={statusKey} value={statusKey}>{formatStatus(statusKey, statusLabels)}</SelectItem>)}</SelectContent></Select>
            <Select value={category} onValueChange={setCategory}><SelectTrigger aria-label="Filter visual category"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((categoryKey) => <SelectItem key={categoryKey} value={categoryKey}>{categoryKey}</SelectItem>)}</SelectContent></Select>
            <Button variant="ghost" onClick={resetFilters}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4"><Activity className="h-4 w-4 text-primary" /><p className="mt-2 text-2xl font-extrabold">{filteredRecords.length}</p><p className="text-xs text-muted-foreground">Cases in view</p></div>
            <div className="rounded-xl border bg-card p-4"><Clock3 className="h-4 w-4 text-warning" /><p className="mt-2 text-2xl font-extrabold">{activeCount}</p><p className="text-xs text-muted-foreground">Active workflow</p></div>
            <div className="rounded-xl border bg-card p-4"><AlertTriangle className="h-4 w-4 text-destructive" /><p className="mt-2 text-2xl font-extrabold">{criticalCount}</p><p className="text-xs text-muted-foreground">Critical cases</p></div>
            <div className="rounded-xl border bg-card p-4"><Filter className="h-4 w-4 text-success" /><p className="mt-2 text-2xl font-extrabold">{resolutionRate}%</p><p className="text-xs text-muted-foreground">Resolution rate</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Campus risk bubble map</CardTitle><CardDescription>Bubble size represents case volume; stronger emphasis represents active and critical workload. Select a campus to filter every visual.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex min-h-[300px] flex-wrap items-center justify-center gap-4 rounded-2xl border bg-gradient-to-br from-muted/35 to-background p-5">
              {campusData.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => !lockCampus && setCampus(campus === item.key ? 'all' : item.key)}
                  disabled={lockCampus}
                  className={`relative flex shrink-0 flex-col items-center justify-center rounded-full border text-center transition duration-300 ${campus === item.key ? 'border-primary bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/15' : item.critical ? 'border-destructive/40 bg-destructive/10 hover:-translate-y-1 hover:shadow-lg' : 'border-primary/25 bg-primary/10 hover:-translate-y-1 hover:shadow-lg'} disabled:cursor-default`}
                  style={{ width: item.size, height: item.size }}
                  aria-label={`${item.label}: ${item.total} cases, ${item.active} active, ${item.critical} critical`}
                >
                  <span className="px-2 text-[11px] font-bold leading-tight">{item.label}</span>
                  <span className="mt-1 text-2xl font-black">{item.total}</span>
                  <span className="text-[10px] opacity-75">{item.active} active</span>
                </button>
              ))}
              {!campusData.length && <p className="text-sm text-muted-foreground">No campus records are available for the selected filters.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Operational flow</CardTitle><CardDescription>Click a stage to filter the entire dashboard. This exposes where cases accumulate in the response process.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {flowData.map((stage, index) => {
              const share = filteredRecords.length ? Math.max(8, Math.round((stage.value / filteredRecords.length) * 100)) : 8;
              return (
                <div key={stage.status} className="flex items-center gap-3">
                  <button type="button" onClick={() => setStatus(status === stage.status ? 'all' : stage.status)} className={`min-w-0 flex-1 rounded-xl border p-3 text-left transition hover:border-primary ${status === stage.status ? 'border-primary bg-primary/10 ring-2 ring-primary/10' : ''}`}>
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold">{stage.label}</span><Badge variant="secondary">{stage.value}</Badge></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${share}%` }} /></div>
                  </button>
                  {index < flowData.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Incident movement</CardTitle><CardDescription>Ordered trend for total and critical activity.</CardDescription></CardHeader>
          <CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><defs><linearGradient id="live-total-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.42} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={18} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#live-total-gradient)" /><Area type="monotone" dataKey="critical" name="Critical" stroke="hsl(var(--destructive))" strokeWidth={2} fill="transparent" /></AreaChart></ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Category concentration</CardTitle><CardDescription>Selecting a category from the filter immediately updates the entire command view.</CardDescription></CardHeader>
          <CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{ left: 16 }}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" allowDecimals={false} /><YAxis dataKey="shortName" type="category" width={122} tick={{ fontSize: 10 }} /><Tooltip formatter={(value, _name, item) => [value, item.payload.name]} contentStyle={tooltipStyle} /><Bar dataKey="value" name="Cases" radius={[0, 8, 8, 0]}>{categoryData.map((entry) => <Cell key={entry.name} fill={filteredRecords.some((record) => record.category === entry.name && record.isCritical) ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Seven-day time heatmap</CardTitle><CardDescription>Intensity shows when activity concentrates across the day.</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[520px] space-y-2">
              <div className="grid grid-cols-[70px_repeat(4,1fr)] gap-2 text-center text-xs font-semibold text-muted-foreground"><span />{heatmapData[0]?.cells.map((cell) => <span key={cell.label}>{cell.label}</span>)}</div>
              {heatmapData.map((day) => <div key={day.day} className="grid grid-cols-[70px_repeat(4,1fr)] gap-2"><span className="flex items-center text-xs font-semibold">{day.day}</span>{day.cells.map((cell) => <div key={cell.label} className="flex h-12 items-center justify-center rounded-lg border text-sm font-bold" style={{ backgroundColor: `hsl(var(--primary) / ${0.06 + (cell.count / maxHeat) * 0.7})`, color: cell.count / maxHeat > 0.55 ? 'hsl(var(--primary-foreground))' : undefined }} title={`${day.day} ${cell.label}: ${cell.count}`}>{cell.count}</div>)}</div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Critical action list</CardTitle><CardDescription>The most recent critical records are directly actionable.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {recentCritical.map((record) => <button key={record.id} type="button" onClick={() => onOpenRecord?.(record.id)} disabled={!onOpenRecord} className="w-full rounded-xl border p-3 text-left transition hover:border-destructive/60 hover:bg-destructive/5 disabled:cursor-default"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{record.title || record.category}</p><p className="mt-1 text-xs text-muted-foreground">{locationLabels[record.campus ?? ''] ?? record.campus ?? 'Campus unavailable'} · {format(new Date(record.createdAt), 'dd MMM, HH:mm')}</p></div><Badge variant="destructive">{formatStatus(record.status, statusLabels)}</Badge></div></button>)}
            {!recentCritical.length && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No critical records match the current filters.</div>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
