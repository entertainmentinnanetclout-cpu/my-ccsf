import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Flag,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  Search,
  Star,
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
import {
  createPilotReviewAttachmentSignedUrl,
  loadPilotReviews,
  moderatePilotReview,
  subscribeToPilotReviews,
} from '@/services/pilot/pilotReviewService';
import {
  PILOT_REVIEW_CATEGORY_LABELS,
  PILOT_REVIEW_STATUS_LABELS,
  type PilotReview,
  type PilotReviewCategory,
  type PilotReviewStatus,
} from '@/types/pilotReviews';

const MANAGEABLE_STATUSES: Array<Exclude<PilotReviewStatus, 'submitted'>> = [
  'under_review',
  'responded',
  'resolved',
  'flagged',
  'hidden',
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
  const [reviews, setReviews] = useState<PilotReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PilotReviewStatus>('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PilotReviewCategory>('all');
  const [actionReview, setActionReview] = useState<PilotReview | null>(null);
  const [actionStatus, setActionStatus] = useState<Exclude<PilotReviewStatus, 'submitted'>>('responded');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      setReviews(await loadPilotReviews());
    } catch (error) {
      toast({
        title: 'Pilot reviews unavailable',
        description: error instanceof Error ? error.message : 'Unable to load reviews.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeToPilotReviews(() => void refresh());
    const fallback = window.setInterval(() => void refresh(), 15000);
    return () => {
      unsubscribe();
      window.clearInterval(fallback);
    };
  }, [refresh]);

  const filteredReviews = useMemo(() => reviews.filter((review) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || review.review_text.toLowerCase().includes(query)
      || review.quick_feedback.join(' ').toLowerCase().includes(query)
      || review.user_id.toLowerCase().includes(query)
      || (review.report_id ?? '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesRating = ratingFilter === 'all' || review.rating === Number(ratingFilter);
    const matchesCategory = categoryFilter === 'all' || review.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesRating && matchesCategory;
  }), [categoryFilter, ratingFilter, reviews, search, statusFilter]);

  const metrics = useMemo(() => {
    const average = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;
    return {
      total: reviews.length,
      average: average.toFixed(1),
      pending: reviews.filter((item) => ['submitted', 'under_review'].includes(item.status)).length,
      resolved: reviews.filter((item) => item.status === 'resolved').length,
    };
  }, [reviews]);

  const runImmediateAction = async (review: PilotReview, status: 'under_review' | 'flagged' | 'hidden') => {
    setSaving(true);
    try {
      await moderatePilotReview(review.id, status);
      toast({ title: `Review marked ${PILOT_REVIEW_STATUS_LABELS[status].toLowerCase()}` });
      await refresh();
    } catch (error) {
      toast({ title: 'Moderation failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (path: string) => {
    try {
      const url = await createPilotReviewAttachmentSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ title: 'Screenshot unavailable', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="pilot-review-management-page">
      <PilotBanner />

      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] to-[#002F6C]/90 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="text-2xl">Pilot Review Management</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/80">
                {userRole === 'admin'
                  ? 'Cross-campus review oversight. Every moderation action is recorded in the isolated Pilot audit log.'
                  : 'Campus-scoped review moderation. Reviews from other campuses remain inaccessible.'}
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Reviews in scope" value={metrics.total} />
        <Metric label="Average rating" value={`${metrics.average}/5`} />
        <Metric label="Awaiting action" value={metrics.pending} />
        <Metric label="Resolved" value={metrics.resolved} />
      </div>

      <Card className="shadow-large">
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>Search, filter, respond, resolve, flag or hide isolated Pilot feedback.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.7fr_0.9fr]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search feedback, user or case ID" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | PilotReviewStatus)}>
              <SelectTrigger aria-label="Filter review status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(['submitted', ...MANAGEABLE_STATUSES] as PilotReviewStatus[]).map((status) => <SelectItem key={status} value={status}>{PILOT_REVIEW_STATUS_LABELS[status]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger aria-label="Filter rating"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All ratings</SelectItem>{[5, 4, 3, 2, 1].map((rating) => <SelectItem key={rating} value={String(rating)}>{rating} stars</SelectItem>)}</SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | PilotReviewCategory)}>
              <SelectTrigger aria-label="Filter category"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(PILOT_REVIEW_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-primary" /></div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No reviews match the selected filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(review.status)}>{PILOT_REVIEW_STATUS_LABELS[review.status]}</Badge>
                        <Badge variant="outline">{PILOT_REVIEW_CATEGORY_LABELS[review.category]}</Badge>
                        <Badge variant="outline">{CAMPUS_LABELS[review.campus]}</Badge>
                      </div>
                      <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-[#F2A900] text-[#F2A900]' : 'text-muted-foreground/30'}`} />)}
                      </div>
                      <p className="text-xs text-muted-foreground">Submitted {format(new Date(review.created_at), 'dd MMM yyyy, HH:mm')} · Student {review.user_id.slice(0, 8)}</p>
                      {review.quick_feedback.length > 0 && <div className="flex flex-wrap gap-2">{review.quick_feedback.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}</div>}
                      {review.review_text && <p className="whitespace-pre-wrap text-sm leading-6">{review.review_text}</p>}
                      {review.admin_response && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Current response</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">{review.admin_response}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-fit flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                      {review.report_id && <Button size="sm" variant="outline" onClick={() => navigate(PILOT_ROUTES.report(review.report_id as string))}>Open case</Button>}
                      {review.attachment_path && <Button size="sm" variant="outline" onClick={() => void openAttachment(review.attachment_path as string)}><Camera className="mr-2 h-4 w-4" />Screenshot<ExternalLink className="ml-2 h-3.5 w-3.5" /></Button>}
                      <Button size="sm" variant="outline" disabled={saving || review.status === 'under_review'} onClick={() => void runImmediateAction(review, 'under_review')}><AlertTriangle className="mr-2 h-4 w-4" />Review</Button>
                      <Button size="sm" disabled={saving} onClick={() => openResponseAction(review, 'responded')}><MessageSquareReply className="mr-2 h-4 w-4" />Respond</Button>
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => openResponseAction(review, 'resolved')}><CheckCircle2 className="mr-2 h-4 w-4" />Resolve</Button>
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void runImmediateAction(review, 'flagged')}><Flag className="mr-2 h-4 w-4" />Flag</Button>
                      <Button size="sm" variant="destructive" disabled={saving} onClick={() => void runImmediateAction(review, 'hidden')}><EyeOff className="mr-2 h-4 w-4" />Hide</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(actionReview)} onOpenChange={(open) => { if (!open) setActionReview(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionStatus === 'resolved' ? 'Resolve Pilot review' : 'Respond to Pilot review'}</DialogTitle>
            <DialogDescription>The student will see this response in the Reviews tab and receive a Pilot notification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-response">Authorised response</Label>
            <Textarea id="review-response" value={response} onChange={(event) => setResponse(event.target.value)} rows={6} maxLength={5000} placeholder="Explain the action taken or request further details." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionReview(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void submitResponse()} disabled={saving || !response.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionStatus === 'resolved' ? 'Resolve and notify' : 'Send response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card className="shadow-sm"><CardContent className="p-5"><p className="text-sm font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-extrabold text-[#002F6C] dark:text-[#F2A900]">{value}</p></CardContent></Card>;
}
