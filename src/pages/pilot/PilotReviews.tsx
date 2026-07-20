import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { useAuth } from '@/contexts/AuthContext';
import { usePilotMode } from '@/contexts/PilotModeContext';
import { useToast } from '@/hooks/use-toast';
import { collectPilotDeviceInfo, loadOwnPilotReports } from '@/services/pilot/pilotCoreService';
import {
  createPilotReviewAttachmentSignedUrl,
  loadPilotReviews,
  submitPilotReview,
  subscribeToPilotReviews,
  uploadPilotReviewAttachment,
} from '@/services/pilot/pilotReviewService';
import type { PilotReport } from '@/types/pilot';
import {
  EDITABLE_PILOT_REVIEW_STATUSES,
  PILOT_REVIEW_CATEGORY_LABELS,
  PILOT_REVIEW_STATUS_LABELS,
  type PilotReview,
  type PilotReviewCategory,
  type PilotReviewStatus,
} from '@/types/pilotReviews';

const QUICK_FEEDBACK: Array<{ label: string; category: PilotReviewCategory; positive: boolean }> = [
  { label: 'Easy to use', category: 'usability', positive: true },
  { label: 'Location worked correctly', category: 'location', positive: true },
  { label: 'Reporting was clear', category: 'reporting', positive: true },
  { label: 'Case updates were useful', category: 'case_updates', positive: true },
  { label: 'I felt more informed', category: 'case_updates', positive: true },
  { label: 'Navigation was confusing', category: 'navigation', positive: false },
  { label: 'Location was inaccurate', category: 'location', positive: false },
  { label: 'App was slow', category: 'performance', positive: false },
  { label: 'I found a broken feature', category: 'broken_feature', positive: false },
  { label: 'Other feedback', category: 'other', positive: true },
];

const EMPTY_FORM = {
  rating: 0,
  category: 'usability' as PilotReviewCategory,
  quickFeedback: [] as string[],
  reviewText: '',
  reportId: 'none',
  contactPermission: false,
};

function statusVariant(status: PilotReviewStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'resolved') return 'default';
  if (status === 'flagged' || status === 'hidden') return 'destructive';
  if (status === 'under_review' || status === 'responded') return 'secondary';
  return 'outline';
}

export default function PilotReviews() {
  const { user } = useAuth();
  const { program, participant } = usePilotMode();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<PilotReview[]>([]);
  const [reports, setReports] = useState<PilotReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingReview, setEditingReview] = useState<PilotReview | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [nextReviews, nextReports] = await Promise.all([
        loadPilotReviews(),
        loadOwnPilotReports(),
      ]);
      setReviews(nextReviews);
      setReports(nextReports);
    } catch (error) {
      toast({
        title: 'Reviews unavailable',
        description: error instanceof Error ? error.message : 'Unable to load Pilot reviews.',
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
    const fallback = window.setInterval(() => void refresh(), 20000);
    return () => {
      unsubscribe();
      window.clearInterval(fallback);
    };
  }, [refresh]);

  const reportById = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingReview(null);
    setScreenshot(null);
  };

  const toggleQuickFeedback = (label: string, category: PilotReviewCategory) => {
    setForm((current) => {
      const selected = current.quickFeedback.includes(label);
      const quickFeedback = selected
        ? current.quickFeedback.filter((item) => item !== label)
        : [...current.quickFeedback, label];
      return {
        ...current,
        quickFeedback,
        category: selected || current.quickFeedback.length > 0 ? current.category : category,
      };
    });
  };

  const beginEdit = (review: PilotReview) => {
    if (!EDITABLE_PILOT_REVIEW_STATUSES.has(review.status)) return;
    setEditingReview(review);
    setScreenshot(null);
    setForm({
      rating: review.rating,
      category: review.category,
      quickFeedback: review.quick_feedback,
      reviewText: review.review_text,
      reportId: review.report_id ?? 'none',
      contactPermission: review.contact_permission,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!user || !program || !participant) {
      toast({ title: 'Pilot context unavailable', description: 'Refresh the Pilot portal and try again.', variant: 'destructive' });
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      toast({ title: 'Rating required', description: 'Select an overall rating from 1 to 5 stars.', variant: 'destructive' });
      return;
    }
    if (!form.reviewText.trim() && form.quickFeedback.length === 0) {
      toast({ title: 'Feedback required', description: 'Select a quick review card or enter written feedback.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let attachmentPath = editingReview?.attachment_path ?? null;
      if (screenshot) {
        attachmentPath = await uploadPilotReviewAttachment({
          file: screenshot,
          programId: program.id,
          campus: participant.campus,
          userId: user.id,
        });
      }

      await submitPilotReview({
        rating: form.rating,
        category: form.category,
        quickFeedback: form.quickFeedback,
        reviewText: form.reviewText.trim(),
        reportId: form.reportId === 'none' ? null : form.reportId,
        attachmentPath,
        deviceMetadata: collectPilotDeviceInfo(),
        contactPermission: form.contactPermission,
        reviewId: editingReview?.id ?? null,
      });

      toast({
        title: editingReview ? 'Review updated' : 'Review submitted',
        description: 'Your feedback is now available to the authorised Pilot review team.',
      });
      resetForm();
      await refresh();
    } catch (error) {
      toast({
        title: 'Review not saved',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (path: string) => {
    try {
      const url = await createPilotReviewAttachmentSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: 'Screenshot unavailable',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" data-testid="pilot-reviews-page">
      <PilotBanner />

      <Card className="overflow-hidden border-primary/20 shadow-large">
        <CardHeader className="bg-gradient-to-r from-[#002F6C] to-[#002F6C]/90 text-white">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="text-2xl">Pilot Reviews</CardTitle>
              <CardDescription className="mt-2 max-w-3xl text-white/80">
                Rate the reporting journey, select quick feedback and explain any issue. Reviews remain inside the controlled Pilot environment.
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={() => void refresh(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle>{editingReview ? 'Edit unresolved review' : 'Submit a review'}</CardTitle>
            <CardDescription>Quick cards populate the form immediately and remain editable.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Quick feedback</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {QUICK_FEEDBACK.map((item) => {
                  const selected = form.quickFeedback.includes(item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleQuickFeedback(item.label, item.category)}
                      className={`rounded-xl border p-4 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? 'border-[#002F6C] bg-[#002F6C] text-white shadow-md' : 'border-border bg-background hover:border-primary hover:bg-primary/5'}`}
                    >
                      <span className="flex items-center gap-2">
                        {item.positive ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Overall rating</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Overall Pilot rating">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    role="radio"
                    aria-checked={form.rating === rating}
                    aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
                    onClick={() => setForm((current) => ({ ...current, rating }))}
                    className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Star className={`h-8 w-8 ${rating <= form.rating ? 'fill-[#F2A900] text-[#F2A900]' : 'text-muted-foreground/35'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="review-category">Review category</Label>
                <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value as PilotReviewCategory }))}>
                  <SelectTrigger id="review-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PILOT_REVIEW_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="related-case">Related case (optional)</Label>
                <Select value={form.reportId} onValueChange={(value) => setForm((current) => ({ ...current, reportId: value }))}>
                  <SelectTrigger id="related-case"><SelectValue placeholder="No related case" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No related case</SelectItem>
                    {reports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>{report.reference_number} · {report.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-text">Written feedback</Label>
              <Textarea
                id="review-text"
                value={form.reviewText}
                onChange={(event) => setForm((current) => ({ ...current, reviewText: event.target.value }))}
                placeholder="Describe what worked, what failed and what should be improved."
                rows={6}
                maxLength={5000}
              />
              <p className="text-right text-xs text-muted-foreground">{form.reviewText.length}/5000</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-screenshot">Screenshot (optional)</Label>
              <Input
                id="review-screenshot"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Private JPG, PNG or WebP. Maximum 5 MB.</p>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4">
              <Checkbox
                id="contact-permission"
                checked={form.contactPermission}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, contactPermission: checked === true }))}
              />
              <div>
                <Label htmlFor="contact-permission" className="cursor-pointer">Permission to contact me</Label>
                <p className="mt-1 text-xs text-muted-foreground">Authorised Pilot staff may contact you to clarify this review.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="sm:min-w-44" onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {editingReview ? 'Update review' : 'Submit review'}
              </Button>
              {editingReview && <Button variant="outline" onClick={resetForm} disabled={saving}>Cancel edit</Button>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5" />Your previous reviews</CardTitle>
            <CardDescription>Read status changes and authorised staff responses.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No Pilot reviews submitted yet.</div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const relatedReport = review.report_id ? reportById.get(review.report_id) : null;
                  return (
                    <article key={review.id} className="rounded-xl border border-border p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                            {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-[#F2A900] text-[#F2A900]' : 'text-muted-foreground/30'}`} />)}
                          </div>
                          <p className="mt-2 text-sm font-bold">{PILOT_REVIEW_CATEGORY_LABELS[review.category]}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'dd MMM yyyy, HH:mm')}</p>
                        </div>
                        <Badge variant={statusVariant(review.status)}>{PILOT_REVIEW_STATUS_LABELS[review.status]}</Badge>
                      </div>

                      {review.quick_feedback.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.quick_feedback.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                        </div>
                      )}
                      {review.review_text && <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{review.review_text}</p>}
                      {relatedReport && <p className="mt-3 text-xs font-semibold text-muted-foreground">Related case: {relatedReport.reference_number}</p>}

                      {review.admin_response && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Authorised staff response</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">{review.admin_response}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {EDITABLE_PILOT_REVIEW_STATUSES.has(review.status) && (
                          <Button size="sm" variant="outline" onClick={() => beginEdit(review)}><Edit3 className="mr-2 h-4 w-4" />Edit</Button>
                        )}
                        {review.attachment_path && (
                          <Button size="sm" variant="outline" onClick={() => void openAttachment(review.attachment_path as string)}>
                            <Camera className="mr-2 h-4 w-4" />Screenshot<ExternalLink className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
