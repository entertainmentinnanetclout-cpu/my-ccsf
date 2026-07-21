import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  EyeOff,
  Flag,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  Search,
  Star,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_ROUTES } from '@/config/pilot';
import { downloadCsv } from '@/services/pilot/pilotContentAdminService';
import {
  createPilotReviewAttachmentSignedUrl,
  loadPilotReviewOptions,
  loadPilotReviews,
  loadPilotStudentIdentities,
  moderatePilotReview,
  subscribeToPilotReviews,
} from '@/services/pilot/pilotReviewService';
import type { CampusLocation } from '@/types/pilot';
import {
  PILOT_REVIEW_CATEGORY_LABELS,
  PILOT_REVIEW_STATUS_LABELS,
  type PilotReview,
  type PilotReviewOptions,
  type PilotReviewStatus,
  type PilotStudentIdentity,
} from '@/types/pilotReviews';

const MANAGEABLE_STATUSES: Array<Exclude<PilotReviewStatus, 'submitted'>> = [
  'under_review', 'responded', 'resolved', 'flagged', 'hidden',
];

function statusVariant(status: PilotReviewStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'resolved') return 'default';
  if (status === 'flagged' || status === 'hidden') return 'destructive';
  if (status === 'under_review' || status === 'responded') return 'secondary';
  return 'outline';
}

export default function PilotReviewManagement() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = userRole === 'admin';
  const [reviews, setReviews] = useState<PilotReview[]>([]);
  const [identities, setIdentities] = useState<Record<string, PilotStudentIdentity>>({});
  const [options, setOptions] = useState<PilotReviewOptions>({ categories: [], quickCards: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PilotReviewStatus>('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState<'all' | CampusLocation>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionReview, setActionReview] = useState<PilotReview | null>(null);
  const [actionStatus, setActionStatus] = useState<Exclude<PilotReviewStatus, 'submitted'>>('responded');
  const [response, setResponse] = useState('');
  const [student, setStudent] = useState<PilotStudentIdentity | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [nextReviews, nextOptions] = await Promise.all([loadPilotReviews(), loadPilotReviewOptions()]);
      const nextIdentities = await loadPilotStudentIdentities(nextReviews.map((review) => review.user_id));
      setReviews(nextReviews);
      setOptions(nextOptions);
      setIdentities(nextIdentities);
    } catch (error) {
      toast({ title: 'Pilot reviews unavailable', description: error instanceof Error ? error.message : 'Unable to load reviews.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const unsubscribe = subscribeToPilotReviews(() => void refresh());
    const fallback = window.setInterval(() => void refresh(), 15000);
    return () => { unsubscribe(); window.clearInterval(fallback); };
  }, [refresh]);

  const categoryLabels = useMemo(() => ({
    ...PILOT_REVIEW_CATEGORY_LABELS,
    ...Object.fromEntries(options.categories.map((category) => [category.key, category.label])),
  }), [options.categories]);

  const filteredReviews = useMemo(() => reviews.filter((review) => {
    const identity = identities[review.user_id];
    const query = search.trim().toLowerCase();
    const searchable = [
      review.review_text, review.quick_feedback.join(' '), review.user_id, review.report_id ?? '',
      identity?.full_name ?? '', identity?.student_number ?? '', identity?.email ?? '', identity?.phone_number ?? '',
    ].join(' ').toLowerCase();
    const created = new Date(review.created_at).getTime();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return (!query || searchable.includes(query))
      && (statusFilter === 'all' || review.status === statusFilter)
      && (ratingFilter === 'all' || review.rating === Number(ratingFilter))
      && (categoryFilter === 'all' || review.category === categoryFilter)
      && (!isSuperAdmin || campusFilter === 'all' || review.campus === campusFilter)
      && created >= from && created <= to;
  }), [campusFilter, categoryFilter, dateFrom, dateTo, identities, isSuperAdmin, ratingFilter, reviews, search, statusFilter]);

  const metrics = useMemo(() => {
    const average = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
    return {
      total: reviews.length,
      average: average.toFixed(1),
      pending: reviews.filter((item) => ['submitted', 'under_review'].includes(item.status)).length,
      resolved: reviews.filter((item) => item.status === 'resolved').length,
    };
  }, [reviews]);

  const campusStats = useMemo(() => {
    const grouped = new Map<CampusLocation, PilotReview[]>();
    reviews.forEach((review) => grouped.set(review.campus, [...(grouped.get(review.campus) ?? []), review]));
    return [...grouped.entries()].map(([campus, items]) => ({
      campus,
      count: items.length,
      average: items.reduce((sum, item) => sum + item.rating, 0) / items.length,
      resolved: items.filter((item) => item.status === 'resolved').length,
    })).sort((left, right) => right.average - left.average);
  }, [reviews]);

  const trend = useMemo(() => {
    const grouped = new Map<string, PilotReview[]>();
    reviews.forEach((review) => {
      const day = review.created_at.slice(0, 10);
      grouped.set(day, [...(grouped.get(day) ?? []), review]);
    });
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right)).slice(-14).map(([day, items]) => ({
      day,
      average: items.reduce((sum, item) => sum + item.rating, 0) / items.length,
      count: items.length,
    }));
  }, [reviews]);

  const runImmediateAction = async (review: PilotReview, status: 'under_review' | 'flagged' | 'hidden') => {
    setSaving(true);
    try {
      await moderatePilotReview(review.id, status);
      toast({ title: `Review marked ${PILOT_REVIEW_STATUS_LABELS[status].toLowerCase()}` });
      await refresh();
    } catch (error) {
      toast({ title: 'Moderation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const openResponseAction = (review: PilotReview, status: 'responded' | 'resolved') => {
    setActionReview(review);
    setActionStatus(status);
    setResponse(review.admin_response ?? '');
  };

  const submitResponse = async () => {
    if (!actionReview || !response.trim()) return;
    setSaving(true);
    try {
      await moderatePilotReview(actionReview.id, actionStatus, response.trim());
      toast({ title: actionStatus === 'resolved' ? 'Review resolved' : 'Response sent to student' });
      setActionReview(null);
      setResponse('');
      await refresh();
    } catch (error) {
      toast({ title: 'Moderation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const openAttachment = async (path: string) => {
    try {
      const url = await createPilotReviewAttachmentSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ title: 'Screenshot unavailable', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const exportReviews = () => {
    downloadCsv(`pilot-reviews-${isSuperAdmin ? 'all-campuses' : 'campus'}-${new Date().toISOString().slice(0, 10)}.csv`, filteredReviews.map((review) => {
      const identity = identities[review.user_id];
      return {
        review_id: review.id,
        campus: CAMPUS_LABELS[review.campus],
        student_name: identity?.full_name ?? '',
        student_number: identity?.student_number ?? '',
        email: identity?.email ?? '',
        phone: identity?.phone_number ?? '',
        rating: review.rating,
        category: categoryLabels[review.category] ?? review.category,
        quick_feedback: review.quick_feedback.join(' | '),
        review_text: review.review_text,
        status: PILOT_REVIEW_STATUS_LABELS[review.status],
        admin_response: review.admin_response ?? '',
        related_case_id: review.report_id ?? '',
        contact_permission: review.contact_permission,
        submitted_at: review.created_at,
        reviewed_at: review.reviewed_at ?? '',
      };
    }));
    toast({ title: 'Pilot review export created', description: `${filteredReviews.length} review records were exported.` });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="pilot-review-management-page">
      <PilotBanner />
      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] to-[#002F6C]/90 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div><CardTitle className="text-2xl">Pilot Review Management</CardTitle><CardDescription className="mt-2 max-w-3xl text-white/80">{isSuperAdmin ? 'Cross-campus review oversight, rating comparison, trends and complete exports.' : 'Campus-scoped review moderation. Reviews from other campuses remain inaccessible.'}</CardDescription></div>
            <div className="flex gap-2"><Button variant="secondary" onClick={exportReviews} disabled={!filteredReviews.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button></div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Reviews in scope" value={metrics.total} />
        <Metric label="Average rating" value={`${metrics.average}/5`} />
        <Metric label="Awaiting action" value={metrics.pending} />
        <Metric label="Resolved" value={metrics.resolved} />
      </div>

      {isSuperAdmin && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="shadow-large"><CardHeader><CardTitle>Campus rating comparison</CardTitle><CardDescription>Average score and resolution volume for each campus represented in the Pilot reviews.</CardDescription></CardHeader><CardContent className="space-y-4">{campusStats.map((item) => <div key={item.campus}><div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{CAMPUS_LABELS[item.campus]}</span><span>{item.average.toFixed(1)}/5 · {item.count} reviews · {item.resolved} resolved</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#F2A900]" style={{ width: `${item.average * 20}%` }} /></div></div>)}{!campusStats.length && <p className="text-sm text-muted-foreground">No campus ratings are available yet.</p>}</CardContent></Card>
          <Card className="shadow-large"><CardHeader><CardTitle>Rating trend</CardTitle><CardDescription>Daily average across the most recent 14 review dates.</CardDescription></CardHeader><CardContent className="flex min-h-52 items-end gap-2 overflow-x-auto">{trend.map((item) => <div key={item.day} className="flex min-w-12 flex-1 flex-col items-center gap-2"><span className="text-xs font-bold">{item.average.toFixed(1)}</span><div className="w-full rounded-t bg-[#002F6C]" style={{ height: `${Math.max(item.average * 28, 12)}px` }} title={`${item.day}: ${item.average.toFixed(1)}/5 from ${item.count} reviews`} /><span className="text-[10px] text-muted-foreground">{item.day.slice(5)}</span></div>)}{!trend.length && <p className="m-auto text-sm text-muted-foreground">No rating trend is available yet.</p>}</CardContent></Card>
        </div>
      )}

      <Card className="shadow-large">
        <CardHeader><CardTitle>Review queue</CardTitle><CardDescription>Filter by rating, category, date and status; open the student or related case; respond, resolve, flag or hide.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className={`grid gap-3 ${isSuperAdmin ? 'xl:grid-cols-[1.5fr_repeat(6,minmax(130px,0.7fr))]' : 'lg:grid-cols-[1.5fr_repeat(5,minmax(130px,0.8fr))]'}`}>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, feedback, email or case" className="pl-9" /></div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PilotReviewStatus)}><SelectTrigger aria-label="Filter review status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{(['submitted', ...MANAGEABLE_STATUSES] as PilotReviewStatus[]).map((status) => <SelectItem key={status} value={status}>{PILOT_REVIEW_STATUS_LABELS[status]}</SelectItem>)}</SelectContent></Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}><SelectTrigger aria-label="Filter rating"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ratings</SelectItem>{[5,4,3,2,1].map((rating) => <SelectItem key={rating} value={String(rating)}>{rating} stars</SelectItem>)}</SelectContent></Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger aria-label="Filter category"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{options.categories.map((category) => <SelectItem key={category.key} value={category.key}>{category.label}</SelectItem>)}</SelectContent></Select>
            {isSuperAdmin && <Select value={campusFilter} onValueChange={(value) => setCampusFilter(value as 'all' | CampusLocation)}><SelectTrigger aria-label="Filter campus"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All campuses</SelectItem>{Object.entries(CAMPUS_LABELS).map(([campus, label]) => <SelectItem key={campus} value={campus}>{label}</SelectItem>)}</SelectContent></Select>}
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Review date from" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Review date to" />
          </div>

          {loading ? <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div> : filteredReviews.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No reviews match the selected filters.</div> : <div className="space-y-4">{filteredReviews.map((review) => {
            const identity = identities[review.user_id];
            return <article key={review.id} className="rounded-xl border border-border p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={statusVariant(review.status)}>{PILOT_REVIEW_STATUS_LABELS[review.status]}</Badge><Badge variant="outline">{categoryLabels[review.category] ?? review.category}</Badge><Badge variant="outline">{CAMPUS_LABELS[review.campus]}</Badge></div><div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-[#F2A900] text-[#F2A900]' : 'text-muted-foreground/30'}`} />)}</div><div><p className="font-bold">{identity?.full_name || identity?.student_number || `Student ${review.user_id.slice(0, 8)}`}</p><p className="text-xs text-muted-foreground">{identity?.student_number || 'Student number unavailable'} · Submitted {format(new Date(review.created_at), 'dd MMM yyyy, HH:mm')}</p></div>{review.quick_feedback.length > 0 && <div className="flex flex-wrap gap-2">{review.quick_feedback.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>}{review.review_text && <p className="whitespace-pre-wrap text-sm leading-6">{review.review_text}</p>}{review.admin_response && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Current response</p><p className="mt-2 whitespace-pre-wrap text-sm">{review.admin_response}</p></div>}</div><div className="flex min-w-fit flex-wrap gap-2 lg:max-w-sm lg:justify-end"><Button size="sm" variant="outline" onClick={() => identity && setStudent(identity)} disabled={!identity}><UserRound className="mr-2 h-4 w-4" />Student</Button>{review.report_id && <Button size="sm" variant="outline" onClick={() => navigate(PILOT_ROUTES.report(review.report_id as string))}>Open case</Button>}{review.attachment_path && <Button size="sm" variant="outline" onClick={() => void openAttachment(review.attachment_path as string)}><Camera className="mr-2 h-4 w-4" />Screenshot<ExternalLink className="ml-2 h-3.5 w-3.5" /></Button>}<Button size="sm" variant="outline" disabled={saving || review.status === 'under_review'} onClick={() => void runImmediateAction(review, 'under_review')}><AlertTriangle className="mr-2 h-4 w-4" />Review</Button><Button size="sm" disabled={saving} onClick={() => openResponseAction(review, 'responded')}><MessageSquareReply className="mr-2 h-4 w-4" />Respond</Button><Button size="sm" variant="outline" disabled={saving} onClick={() => openResponseAction(review, 'resolved')}><CheckCircle2 className="mr-2 h-4 w-4" />Resolve</Button><Button size="sm" variant="outline" disabled={saving} onClick={() => void runImmediateAction(review, 'flagged')}><Flag className="mr-2 h-4 w-4" />Flag</Button><Button size="sm" variant="destructive" disabled={saving} onClick={() => void runImmediateAction(review, 'hidden')}><EyeOff className="mr-2 h-4 w-4" />Hide</Button></div></div></article>;
          })}</div>}
        </CardContent>
      </Card>

      <Dialog open={Boolean(actionReview)} onOpenChange={(open) => { if (!open) setActionReview(null); }}><DialogContent><DialogHeader><DialogTitle>{actionStatus === 'resolved' ? 'Resolve Pilot review' : 'Respond to Pilot review'}</DialogTitle><DialogDescription>The student will see this response in Reviews and receive a Pilot notification.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="review-response">Authorised response</Label><Textarea id="review-response" value={response} onChange={(event) => setResponse(event.target.value)} rows={6} maxLength={5000} placeholder="Explain the action taken or request further details." /></div><DialogFooter><Button variant="outline" onClick={() => setActionReview(null)} disabled={saving}>Cancel</Button><Button onClick={() => void submitResponse()} disabled={saving || !response.trim()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{actionStatus === 'resolved' ? 'Resolve and notify' : 'Send response'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(student)} onOpenChange={(open) => { if (!open) setStudent(null); }}><DialogContent><DialogHeader><DialogTitle>Authorised Pilot student details</DialogTitle><DialogDescription>Visible only to the super admin or security staff assigned to the same campus.</DialogDescription></DialogHeader>{student && <div className="grid gap-3 sm:grid-cols-2"><Detail label="Full name" value={student.full_name} /><Detail label="Student number" value={student.student_number} /><Detail label="Email" value={student.email} /><Detail label="Phone" value={student.phone_number} /><Detail label="Campus" value={student.campus ? CAMPUS_LABELS[student.campus] : null} /><Detail label="Course" value={student.course} /><Detail label="Year of study" value={student.year_of_study} /><Detail label="Residence" value={student.residence} /><Detail label="Emergency contact" value={student.emergency_contact_name} /><Detail label="Emergency phone" value={student.emergency_contact_phone} /></div>}</DialogContent></Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold text-[#002F6C] dark:text-[#F2A900]">{value}</p></CardContent></Card>; }
function Detail({ label, value }: { label: string; value: string | number | null }) { return <div className="rounded-xl border p-3"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value ?? 'Not provided'}</p></div>; }
