import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Home,
  Loader2,
  Mail,
  MapPin,
  Navigation,
  PauseCircle,
  Phone,
  UserRound,
} from 'lucide-react';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePilotLocationTracking } from '@/hooks/pilot/usePilotLocationTracking';
import {
  createPilotAttachmentSignedUrl,
  loadPilotAttachments,
  loadPilotNotifications,
  loadPilotReport,
  loadPilotReportEvents,
  markPilotNotificationRead,
  subscribeToPilotNotifications,
  subscribeToPilotReport,
} from '@/services/pilot/pilotCoreService';
import {
  getPilotStudentName,
  loadPilotStudentIdentity,
  type PilotStudentIdentity,
} from '@/services/pilot/pilotProfileService';
import { CAMPUS_LABELS, PILOT_ROUTES, PILOT_STATUS_LABELS, PILOT_STATUS_SEQUENCE } from '@/config/pilot';
import { formatCoordinatePair } from '@/lib/reverseGeocode';
import type { PilotAttachment, PilotNotification, PilotReport, PilotReportEvent } from '@/types/pilot';

export default function PilotReportTracking() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState<PilotReport | null>(null);
  const [reporter, setReporter] = useState<PilotStudentIdentity | null>(null);
  const [events, setEvents] = useState<PilotReportEvent[]>([]);
  const [attachments, setAttachments] = useState<PilotAttachment[]>([]);
  const [notifications, setNotifications] = useState<PilotNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const location = usePilotLocationTracking(report);

  const reload = useCallback(async () => {
    if (!reportId) return;
    try {
      const nextReport = await loadPilotReport(reportId);
      if (!nextReport) {
        setReport(null);
        setReporter(null);
        return;
      }

      const [nextEvents, nextAttachments, nextNotifications, nextReporter] = await Promise.all([
        loadPilotReportEvents(reportId),
        loadPilotAttachments(reportId),
        loadPilotNotifications(),
        loadPilotStudentIdentity(nextReport.submitted_by),
      ]);
      setReport(nextReport);
      setReporter(nextReporter);
      setEvents(nextEvents);
      setAttachments(nextAttachments);
      setNotifications(nextNotifications.filter((item) => item.report_id === reportId));
    } catch (error) {
      toast({
        title: 'Unable to load Pilot report',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [reportId, toast]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => reportId ? subscribeToPilotReport(reportId, () => void reload()) : undefined, [reportId, reload]);
  useEffect(() => user ? subscribeToPilotNotifications(user.id, () => void reload()) : undefined, [user, reload]);

  const currentStep = useMemo(
    () => report ? PILOT_STATUS_SEQUENCE.indexOf(report.status) : -1,
    [report],
  );

  const openAttachment = async (attachment: PilotAttachment) => {
    try {
      const url = await createPilotAttachmentSignedUrl(attachment.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({
        title: 'Private file unavailable',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!report) {
    return <div className="container mx-auto max-w-3xl px-4 py-10"><PilotBanner /><Card className="mt-6"><CardContent className="py-10 text-center">Pilot report not found or access denied.</CardContent></Card></div>;
  }

  const terminal = ['simulation_completed', 'cancelled', 'withdrawn', 'expired'].includes(report.status);
  const reporterName = getPilotStudentName(reporter, report.submitted_by);
  const readableLocation = report.location_description?.trim() || 'Readable address unavailable';
  const hasCoordinates = report.location_lat !== null && report.location_lng !== null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <PilotBanner className="mb-6" />
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{report.title}</h1>
              <Badge variant={report.status === 'simulation_completed' ? 'default' : 'secondary'}>{PILOT_STATUS_LABELS[report.status]}</Badge>
              {report.is_anonymous && <Badge variant="outline">Anonymous presentation</Badge>}
            </div>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{report.reference_number}</p>
          </div>
          <Button variant="outline" asChild><Link to={PILOT_ROUTES.session(report.session_id)}>Back to Session</Link></Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.86fr]">
          <div className="space-y-6">
            <Card className="shadow-large">
              <CardHeader><CardTitle>Case Status</CardTitle><CardDescription>Every stage below is written to the isolated Pilot case timeline.</CardDescription></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-5">
                {PILOT_STATUS_SEQUENCE.map((status, index) => {
                  const reached = currentStep >= index || report.status === status;
                  return (
                    <div key={status} className={`rounded-lg border p-3 text-center ${reached ? 'border-primary bg-primary/5' : 'opacity-50'}`}>
                      {reached ? <CheckCircle2 className="mx-auto h-5 w-5 text-primary" /> : <Clock3 className="mx-auto h-5 w-5" />}
                      <p className="mt-2 text-xs font-semibold">{PILOT_STATUS_LABELS[status]}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Incident Location</CardTitle><CardDescription>The readable location is shown first; coordinates remain available as supporting technical detail.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="font-semibold">{readableLocation}</p>
                  {hasCoordinates && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Coordinates: {formatCoordinatePair(report.location_lat as number, report.location_lng as number)}
                      {report.location_accuracy !== null ? ` · accuracy ${Math.round(report.location_accuracy)} m` : ''}
                    </p>
                  )}
                </div>

                {location.coordinates && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    Latest captured position: {formatCoordinatePair(location.coordinates.latitude, location.coordinates.longitude)} · accuracy {Math.round(location.coordinates.accuracy ?? 0)} m
                  </div>
                )}
                {location.error && <p className="text-sm text-destructive">{location.error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void location.captureOnce()} disabled={location.loading || terminal}>
                    <Navigation className="mr-2 h-4 w-4" /> Capture Once
                  </Button>
                  {!location.tracking
                    ? <Button onClick={() => location.startTracking()} disabled={terminal}><MapPin className="mr-2 h-4 w-4" /> Start Test Tracking</Button>
                    : <Button variant="destructive" onClick={() => void location.stopTracking()}><PauseCircle className="mr-2 h-4 w-4" /> Stop Tracking</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Full Incident Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Category" value={report.category} />
                  <Detail label="Campus" value={CAMPUS_LABELS[report.campus]} />
                  <Detail label="Submitted" value={new Date(report.submitted_at).toLocaleString('en-ZA')} />
                  <Detail label="Case reference" value={report.reference_number} />
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student statement</p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{report.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {events.map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-lg border p-3">
                    <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-semibold capitalize">{item.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString('en-ZA')}</p>
                      {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
                    </div>
                  </div>
                ))}
                {!events.length && <p className="text-sm text-muted-foreground">No Pilot timeline entries.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20 shadow-large">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Student Information</CardTitle>
                <CardDescription>Identity is taken from the authenticated student profile, not typed into the incident form.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <IdentityRow icon={UserRound} label="Full name" value={reporterName} />
                <IdentityRow icon={GraduationCap} label="Student number" value={reporter?.student_number || 'Not supplied'} />
                <IdentityRow icon={Mail} label="Email" value={reporter?.email || 'Not supplied'} />
                <IdentityRow icon={Phone} label="Phone" value={reporter?.phone_number || 'Not supplied'} />
                <IdentityRow icon={GraduationCap} label="Course" value={reporter?.course || 'Not supplied'} />
                <IdentityRow icon={GraduationCap} label="Year of study" value={reporter?.year_of_study ? String(reporter.year_of_study) : 'Not supplied'} />
                <IdentityRow icon={Home} label="Residence" value={reporter?.residence ? String(reporter.residence).replace(/_/g, ' ') : 'Not supplied'} />
                {reporter?.emergency_contact_phone && (
                  <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="font-semibold">Emergency contact</p>
                    <p className="mt-1 text-muted-foreground">
                      {reporter.emergency_contact_name || 'Registered contact'}
                      {reporter.emergency_contact_relationship ? ` · ${reporter.emergency_contact_relationship}` : ''}
                    </p>
                    <p className="mt-1 font-medium">{reporter.emergency_contact_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Private Attachments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {attachments.map((attachment) => (
                  <Button key={attachment.id} variant="outline" className="w-full justify-between" onClick={() => void openAttachment(attachment)}>
                    <span className="truncate">{attachment.original_filename || 'Pilot attachment'}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ))}
                {!attachments.length && <p className="text-sm text-muted-foreground">No attachments.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Pilot Notifications</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => !notification.is_read && void markPilotNotificationRead(notification.id).then(reload)}
                    className={`w-full rounded-lg border p-3 text-left ${notification.is_read ? 'opacity-70' : 'border-primary/40 bg-primary/5'}`}
                  >
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  </button>
                ))}
                {!notifications.length && <p className="text-sm text-muted-foreground">No Pilot notifications.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}

function IdentityRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words font-medium">{value}</p>
      </div>
    </div>
  );
}
