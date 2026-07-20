import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Siren,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PilotBanner } from '@/components/pilot/PilotBanner';
import { CAMPUS_LABELS, PILOT_MAX_ATTACHMENTS, PILOT_ROUTES } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import {
  createPilotReport,
  insertPilotLocationEvent,
  recordPilotFeatureTest,
  uploadPilotAttachments,
  validatePilotFiles,
} from '@/services/pilot/pilotCoreService';
import type { IncidentCategory, PilotParticipant, PilotScenario, PilotSession } from '@/types/pilot';

const EMERGENCY_TITLE = 'Emergency assistance request';
const EMERGENCY_DESCRIPTION = 'Emergency assistance requested. The student may be unable to provide further details.';
const EMERGENCY_FALLBACK_CATEGORY: IncidentCategory = 'Public violence';

const categories: { value: IncidentCategory; label: string }[] = [
  { value: 'Rape', label: 'Rape' },
  { value: 'Sexual assault', label: 'Sexual Assault' },
  { value: 'Gbv', label: 'Gender-Based Violence' },
  { value: 'Murder', label: 'Murder' },
  { value: 'Attempted murder', label: 'Attempted Murder' },
  { value: 'Assault common', label: 'Common Assault' },
  { value: 'Assault GBH', label: 'Assault GBH' },
  { value: 'Fraud', label: 'Fraud' },
  { value: 'Theft', label: 'Theft' },
  { value: 'Robbery', label: 'Robbery' },
  { value: 'Armed robbery', label: 'Armed Robbery' },
  { value: 'Arson', label: 'Arson' },
  { value: 'Malicious damage to property', label: 'Malicious Damage to Property' },
  { value: 'Trespassing', label: 'Trespassing' },
  { value: 'Reckless and negligent driving', label: 'Reckless and Negligent Driving' },
  { value: 'Driving under the influence of alcohol', label: 'Driving Under the Influence' },
  { value: 'Public violence', label: 'Public Violence' },
  { value: 'Sports and Rec Events Act Violation', label: 'Sports and Recreation Event Violation' },
  { value: 'Crimmen enjuria (Hate speech)', label: 'Crimen Injuria / Hate Speech' },
  { value: 'Cyber related crime (bullying etc.)', label: 'Cyber Crime / Bullying' },
  { value: 'Vandalism', label: 'Vandalism' },
];

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function PilotReportForm({
  scenario,
  participant,
  session,
  emergency = false,
}: {
  scenario: PilotScenario;
  participant: PilotParticipant;
  session: PilotSession;
  emergency?: boolean;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const emergencyLocationAttempted = useRef(false);
  const [title, setTitle] = useState(emergency ? EMERGENCY_TITLE : scenario.title);
  const [description, setDescription] = useState(emergency ? EMERGENCY_DESCRIPTION : '');
  const [category, setCategory] = useState<IncidentCategory | ''>(
    emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : scenario.expected_category ?? '',
  );
  const [locationDescription, setLocationDescription] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [emergencyConsent, setEmergencyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;
  const requiresAttachment = !emergency && scenario.requires_attachment;

  const canSubmit = useMemo(() => {
    if (emergency) {
      return emergencyConsent
        && Boolean(location)
        && Boolean(locationDescription.trim())
        && !locationLoading;
    }
    if (!title.trim() || description.trim().length < 5 || !category) return false;
    if (requiresLocation && (!location || !locationDescription.trim() || locationLoading)) return false;
    if (requiresAttachment && files.length === 0) return false;
    return true;
  }, [
    emergency,
    emergencyConsent,
    location,
    locationDescription,
    locationLoading,
    title,
    description,
    category,
    requiresLocation,
    requiresAttachment,
    files.length,
  ]);

  const captureLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    const started = performance.now();

    try {
      const { position, acquisition, permission } = await captureBrowserPosition();
      const nextLocation: CapturedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };
      const geocoded = await reverseGeocodeCoordinates(nextLocation.latitude, nextLocation.longitude);
      const readableAddress = geocoded.address
        ?? `Location captured near ${CAMPUS_LABELS[participant.campus]}; street address lookup was unavailable.`;

      setLocation(nextLocation);
      setLocationDescription(readableAddress);
      toast({
        title: acquisition === 'network_fallback'
          ? 'Location captured using network fallback'
          : 'Location captured',
        description: readableAddress,
      });

      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: 'location_permission_capture',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: {
          accuracy: position.coords.accuracy,
          acquisition,
          permission,
          address_source: geocoded.source,
          address: readableAddress,
        },
      }).catch(() => undefined);
    } catch (caught) {
      const failure = normalizeGeolocationError(caught);
      setLocation(null);
      setLocationDescription('');
      setLocationError(failure.message);
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: 'location_permission_capture',
        outcome: failure.denied ? 'denied' : 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: `${failure.code ?? 'unknown'}:${failure.message}`,
      }).catch(() => undefined);
      toast({
        title: failure.denied ? 'Location permission denied' : 'Location capture failed',
        description: failure.message,
        variant: 'destructive',
      });
    } finally {
      setLocationLoading(false);
    }
  }, [participant.campus, participant.program_id, session.id, toast]);

  useEffect(() => {
    if (!emergency || emergencyLocationAttempted.current) return;
    emergencyLocationAttempted.current = true;
    void captureLocation();
  }, [captureLocation, emergency]);

  const handleFiles = (nextFiles: File[]) => {
    try {
      validatePilotFiles(nextFiles);
      setFiles(nextFiles);
    } catch (caught) {
      toast({
        title: 'Attachment not accepted',
        description: caught instanceof Error ? caught.message : 'Invalid attachment.',
        variant: 'destructive',
      });
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    const selectedCategory = emergency
      ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY
      : category;
    if (!selectedCategory) return;

    setLoading(true);
    const started = performance.now();
    try {
      const report = await createPilotReport({
        program_id: participant.program_id,
        session_id: session.id,
        participant_id: participant.id,
        scenario_id: scenario.id,
        campus: participant.campus,
        title: emergency ? EMERGENCY_TITLE : title.trim(),
        description: emergency ? EMERGENCY_DESCRIPTION : description.trim(),
        category: selectedCategory,
        is_anonymous: emergency ? false : anonymous,
        location_lat: location?.latitude ?? null,
        location_lng: location?.longitude ?? null,
        location_accuracy: location?.accuracy ?? null,
        location_description: locationDescription.trim() || null,
      });

      if (location) {
        await insertPilotLocationEvent({
          program_id: report.program_id,
          session_id: report.session_id,
          report_id: report.id,
          user_id: report.submitted_by,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          source: 'initial_fix',
        });
      }

      if (!emergency && files.length) {
        const attachmentStarted = performance.now();
        try {
          await uploadPilotAttachments(report, files, report.submitted_by);
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: 'attachment_upload',
            outcome: 'passed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            metadata: { file_count: files.length },
          });
        } catch (attachmentError) {
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: 'attachment_upload',
            outcome: 'failed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            errorCode: attachmentError instanceof Error ? attachmentError.message : 'attachment_error',
          }).catch(() => undefined);
          throw attachmentError;
        }
      }

      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: emergency ? 'emergency_simulation_submission' : 'standard_report_submission',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: {
          scenario_type: scenario.scenario_type,
          minimal_emergency_flow: emergency,
          readable_location: locationDescription.trim(),
        },
      }).catch(() => undefined);

      toast({
        title: emergency ? 'Emergency report created' : 'Report created',
        description: emergency
          ? `${report.reference_number}. Your identity and location are visible to authorised campus-security Pilot staff.`
          : `${report.reference_number}. The case is now visible in the authorised campus-security Pilot queue.`,
      });
      navigate(PILOT_ROUTES.report(report.id));
    } catch (caught) {
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: session.id,
        featureKey: emergency ? 'emergency_simulation_submission' : 'standard_report_submission',
        outcome: 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: caught instanceof Error ? caught.message : 'submission_error',
      }).catch(() => undefined);
      toast({
        title: 'Pilot submission failed',
        description: caught instanceof Error ? caught.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={emergency ? 'border-destructive/50 shadow-large' : 'shadow-large'}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={emergency ? 'rounded-full bg-destructive/10 p-3 text-destructive' : 'rounded-full bg-primary/10 p-3 text-primary'}>
            {emergency ? <Siren className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>
          <div>
            <CardTitle>{emergency ? 'Emergency Report' : scenario.title}</CardTitle>
            <CardDescription>
              {emergency
                ? 'No incident explanation is required. Share your location, give consent and submit.'
                : scenario.instructions}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <PilotBanner compact />

        {emergency ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold">Your student profile is attached automatically</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Authorised campus-security Pilot staff will receive your registered name, student details and captured location. You do not need to type an explanation.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`pilot-title-${scenario.id}`}>Report title</Label>
                <Input
                  id={`pilot-title-${scenario.id}`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </div>
              <div className="space-y-2">
                <Label>Incident category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`pilot-description-${scenario.id}`}>Incident description</Label>
              <Textarea
                id={`pilot-description-${scenario.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what happened and any information campus security should know."
                rows={5}
                maxLength={5000}
              />
            </div>
          </>
        )}

        <div className={emergency ? 'rounded-xl border border-destructive/30 p-4' : 'rounded-lg border p-4'}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Current location <span className="text-destructive">required</span></p>
              <p className="text-sm text-muted-foreground">The system stores a readable street or campus-area description, with coordinates retained as supporting technical data.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={locationLoading}>
              {locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
              {locationLoading ? 'Finding address…' : location ? 'Capture again' : 'Share my location'}
            </Button>
          </div>

          {location && locationDescription && (
            <div className="mt-3 rounded-md bg-muted p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <div>
                  <p className="font-medium">{locationDescription}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCoordinatePair(location.latitude, location.longitude)} · accuracy {Math.round(location.accuracy ?? 0)} m
                  </p>
                </div>
              </div>
            </div>
          )}

          {locationError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {!emergency && (
            <div className="mt-3 space-y-2">
              <Label htmlFor={`pilot-location-${scenario.id}`}>Location description</Label>
              <Input
                id={`pilot-location-${scenario.id}`}
                value={locationDescription}
                onChange={(event) => setLocationDescription(event.target.value)}
                placeholder="Building, gate, residence or street address"
              />
            </div>
          )}
        </div>

        {!emergency && (
          <>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <p className="font-semibold">Attachments {requiresAttachment && <span className="text-destructive">required</span>}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Up to {PILOT_MAX_ATTACHMENTS} files. JPEG, PNG, WebP, MP4 or PDF. Maximum 10 MB each.</p>
              <Input
                className="mt-3"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
              />
              {files.length > 0 && <p className="mt-2 text-sm">{files.length} attachment{files.length === 1 ? '' : 's'} selected.</p>}
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id={`pilot-anonymous-${scenario.id}`}
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(checked === true)}
              />
              <Label htmlFor={`pilot-anonymous-${scenario.id}`} className="leading-relaxed">
                Display this report as anonymous in participant-facing presentation. Authenticated ownership remains available to authorised staff for case handling and audit.
              </Label>
            </div>
          </>
        )}

        {emergency && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`pilot-emergency-consent-${scenario.id}`}
                checked={emergencyConsent}
                onCheckedChange={(checked) => setEmergencyConsent(checked === true)}
              />
              <Label htmlFor={`pilot-emergency-consent-${scenario.id}`} className="leading-relaxed">
                I consent to share my current location and registered student profile with authorised campus-security Pilot staff. I understand Pilot Mode does not contact CPS, SAPS, an ambulance or another external emergency service.
              </Label>
            </div>
          </div>
        )}

        {!canSubmit && (
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {emergency
              ? 'Capture your location and give consent to submit the emergency report.'
              : 'Complete all required report fields before submitting.'}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={() => void submit()}
          disabled={!canSubmit || loading}
          variant={emergency ? 'destructive' : 'default'}
        >
          {loading
            ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            : emergency
              ? <Siren className="mr-2 h-5 w-5" />
              : <MapPin className="mr-2 h-5 w-5" />}
          {emergency ? 'Submit Emergency Report' : 'Submit Report'}
        </Button>
      </CardContent>
    </Card>
  );
}
