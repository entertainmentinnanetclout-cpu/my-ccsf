import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Siren,
  Sparkles,
} from 'lucide-react';
import { AcademicFraudLaunchCard, ACADEMIC_FRAUD_REPORT_TYPES } from '@/components/shared/AcademicFraudLaunchCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_MAX_ATTACHMENTS, PILOT_ROUTES } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import {
  createPilotReport,
  ensureActivePilotSession,
  insertPilotLocationEvent,
  recordPilotFeatureTest,
  uploadPilotAttachments,
  validatePilotFiles,
} from '@/services/pilot/pilotCoreService';
import type { IncidentCategory, PilotParticipant, PilotScenario, PilotSession } from '@/types/pilot';

const EMERGENCY_TITLE = 'Emergency assistance request';
const EMERGENCY_DESCRIPTION = 'Emergency assistance requested. The student may be unable to provide further details.';
const EMERGENCY_FALLBACK_CATEGORY: IncidentCategory = 'Public violence';
const ACADEMIC_SCENARIO_PATTERN = /academic fraud|fake admin services/i;

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

const isSessionFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  return /pilot session|session_(expired|not_found)|timed out|active owned pilot session/i.test(message);
};

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
  const academicFraud = ACADEMIC_SCENARIO_PATTERN.test(scenario.title);
  const [workingSession, setWorkingSession] = useState(session);
  const [description, setDescription] = useState(emergency ? EMERGENCY_DESCRIPTION : '');
  const [category, setCategory] = useState<IncidentCategory | ''>(
    academicFraud
      ? 'Fraud'
      : emergency
        ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY
        : scenario.expected_category ?? '',
  );
  const [academicServiceType, setAcademicServiceType] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [emergencyConsent, setEmergencyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => setWorkingSession(session), [session]);

  const requiresAttachment = !emergency && (scenario.requires_attachment || academicFraud);
  const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;

  const canSubmit = useMemo(() => {
    if (emergency) {
      return emergencyConsent && Boolean(location) && Boolean(locationDescription.trim()) && !locationLoading;
    }
    if (description.trim().length < 5 || !category) return false;
    if (academicFraud && !academicServiceType) return false;
    if (requiresLocation && (!location || !locationDescription.trim() || locationLoading)) return false;
    if (requiresAttachment && files.length === 0) return false;
    return true;
  }, [academicFraud, academicServiceType, category, description, emergency, emergencyConsent, files.length, location, locationDescription, locationLoading, requiresAttachment, requiresLocation]);

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
      toast({ title: 'Location ready', description: readableAddress });

      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: workingSession.id,
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
        sessionId: workingSession.id,
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
  }, [participant.campus, participant.program_id, toast, workingSession.id]);

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
      : academicFraud
        ? 'Fraud'
        : category;
    if (!selectedCategory) return;

    setLoading(true);
    const started = performance.now();
    let activeSession = workingSession;
    const reportTitle = emergency
      ? EMERGENCY_TITLE
      : academicFraud
        ? `Academic fraud: ${academicServiceType}`
        : scenario.title;
    const reportDescription = emergency
      ? EMERGENCY_DESCRIPTION
      : academicFraud
        ? `Reported service: ${academicServiceType}\n\n${description.trim()}`
        : description.trim();

    const submitWithSession = (sessionToUse: PilotSession) => createPilotReport({
      program_id: participant.program_id,
      session_id: sessionToUse.id,
      participant_id: participant.id,
      scenario_id: scenario.id,
      campus: participant.campus,
      title: reportTitle,
      description: reportDescription,
      category: selectedCategory,
      is_anonymous: emergency ? false : anonymous,
      emergency_consent: emergency ? emergencyConsent : false,
      location_lat: location?.latitude ?? null,
      location_lng: location?.longitude ?? null,
      location_accuracy: location?.accuracy ?? null,
      location_description: locationDescription.trim() || null,
    });

    try {
      activeSession = await ensureActivePilotSession(participant, workingSession);
      if (activeSession.id !== workingSession.id) setWorkingSession(activeSession);

      let report;
      try {
        report = await submitWithSession(activeSession);
      } catch (caught) {
        if (!isSessionFailure(caught)) throw caught;
        activeSession = await ensureActivePilotSession(participant, null);
        setWorkingSession(activeSession);
        report = await submitWithSession(activeSession);
      }

      const followUpWarnings: string[] = [];
      if (location) {
        try {
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
        } catch (locationEventError) {
          console.error('Pilot report was created but location telemetry could not be recorded.', locationEventError);
          followUpWarnings.push('Location telemetry could not be added, but the case location is saved.');
        }
      }

      if (!emergency && files.length) {
        const attachmentStarted = performance.now();
        try {
          await uploadPilotAttachments(report, files, report.submitted_by);
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: academicFraud ? 'academic_fraud_evidence_upload' : 'attachment_upload',
            outcome: 'passed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            metadata: { file_count: files.length, academic_service_type: academicServiceType || null },
          }).catch(() => undefined);
        } catch (attachmentError) {
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: academicFraud ? 'academic_fraud_evidence_upload' : 'attachment_upload',
            outcome: 'failed',
            durationMs: Math.round(performance.now() - attachmentStarted),
            errorCode: attachmentError instanceof Error ? attachmentError.message : 'attachment_error',
          }).catch(() => undefined);
          console.error('Pilot report was created but one or more attachments failed.', attachmentError);
          followUpWarnings.push('The case was submitted, but one or more attachments could not be added.');
        }
      }

      await recordPilotFeatureTest({
        programId: report.program_id,
        sessionId: report.session_id,
        reportId: report.id,
        featureKey: emergency
          ? 'emergency_simulation_submission'
          : academicFraud
            ? 'academic_fraud_report_submission'
            : 'standard_report_submission',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: {
          scenario_type: scenario.scenario_type,
          academic_service_type: academicServiceType || null,
          minimal_emergency_flow: emergency,
          emergency_consent: emergency ? true : null,
          readable_location: locationDescription.trim() || null,
          routing_campus: report.routing_campus,
          routing_destination: report.routing_destination,
          simulated_severity: report.simulated_severity,
        },
      }).catch(() => undefined);

      toast({
        title: emergency ? 'Emergency test submitted' : academicFraud ? 'Academic fraud report submitted' : 'Pilot report submitted',
        description: [`${report.reference_number}. The case is now visible in the authorised Pilot queue.`, ...followUpWarnings].join(' '),
        variant: followUpWarnings.length ? 'destructive' : 'default',
      });
      navigate(PILOT_ROUTES.report(report.id));
    } catch (caught) {
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: activeSession.id,
        featureKey: emergency
          ? 'emergency_simulation_submission'
          : academicFraud
            ? 'academic_fraud_report_submission'
            : 'standard_report_submission',
        outcome: 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: caught instanceof Error ? caught.message : 'submission_error',
      }).catch(() => undefined);
      toast({
        title: 'Pilot submission failed',
        description: caught instanceof Error ? caught.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={emergency ? 'overflow-hidden border-destructive/40 shadow-large' : academicFraud ? 'overflow-hidden border-[#D7193F]/40 shadow-large' : 'overflow-hidden border-border/60 shadow-large'}>
      <CardHeader className={emergency ? 'border-b bg-destructive/5' : academicFraud ? 'border-b bg-gradient-to-r from-[#D7193F]/10 via-[#F2A900]/10 to-background' : 'border-b bg-gradient-to-r from-primary/5 to-background'}>
        <div className="flex items-start gap-3">
          <div className={emergency ? 'rounded-xl bg-destructive/10 p-3 text-destructive' : academicFraud ? 'rounded-xl bg-[#D7193F]/10 p-3 text-[#D7193F]' : 'rounded-xl bg-primary/10 p-3 text-primary'}>
            {emergency ? <Siren className="h-6 w-6" /> : academicFraud ? <GraduationCap className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[#F2A900]" /> Isolated Pilot workflow
            </div>
            <CardTitle>{emergency ? 'Emergency Test' : academicFraud ? 'Academic Fraud & Fake Admin Services' : 'Test Report Incident'}</CardTitle>
            <CardDescription className="mt-1">
              {emergency
                ? 'Share your location, confirm consent and submit the simulation.'
                : academicFraud
                  ? 'Report suspicious paid academic or administrative offers and attach the evidence needed for intake and referral.'
                  : 'Add the essential details and submit. No external emergency service is contacted.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-2" aria-label="Reporting steps">
          {['1. Details', requiresLocation ? '2. Location' : '2. Evidence', '3. Submit'].map((step) => (
            <div key={step} className="rounded-lg border bg-muted/30 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{step}</div>
          ))}
        </div>

        {emergency ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold">Your student profile is attached automatically</p>
                <p className="mt-1 text-sm text-muted-foreground">No incident explanation is required for this emergency simulation.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {academicFraud ? (
              <>
                <AcademicFraudLaunchCard />
                <div className="space-y-2">
                  <Label>What was offered or advertised? *</Label>
                  <Select value={academicServiceType} onValueChange={setAcademicServiceType}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select the suspicious service" /></SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_FRAUD_REPORT_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>What type of incident are you testing?</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select incident type" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`pilot-description-${scenario.id}`}>{academicFraud ? 'Describe the approach, account and payment request *' : 'What happened?'}</Label>
              <Textarea
                id={`pilot-description-${scenario.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={academicFraud ? 'Include the platform, username or phone number, what was promised, amount requested, date and any payment details.' : 'Briefly describe the test incident.'}
                rows={5}
                maxLength={5000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Use factual details. Do not pay, confront the person or post unverified names publicly.</p>
            </div>
          </div>
        )}

        {(requiresLocation || location || locationError) && (
          <div className={emergency ? 'rounded-xl border border-destructive/25 p-4' : 'rounded-xl border p-4'}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Current location</p>
                <p className="text-sm text-muted-foreground">{requiresLocation ? 'Required to test campus routing.' : 'Optional supporting context for this report.'}</p>
              </div>
              <Button type="button" variant={location ? 'outline' : 'default'} onClick={() => void captureLocation()} disabled={locationLoading}>
                {locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                {locationLoading ? 'Finding location…' : location ? 'Update location' : 'Use my location'}
              </Button>
            </div>

            {location && locationDescription && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div><p className="font-medium">Location ready</p><p className="mt-0.5 text-muted-foreground">{locationDescription}</p></div>
              </div>
            )}

            {locationError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}
          </div>
        )}

        {!emergency && (
          <details className="group rounded-xl border bg-muted/20" open={requiresAttachment}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold">
              <span className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />Evidence and privacy</span>
              <span className="text-xs font-normal text-muted-foreground">{requiresAttachment ? 'Evidence required' : 'Optional'}</span>
            </summary>
            <div className="space-y-4 border-t p-4">
              <div className="space-y-2">
                <Label htmlFor={`pilot-files-${scenario.id}`}>{academicFraud ? 'Attach screenshots, PDFs, payment proof or media *' : 'Add photos, video or a document'}</Label>
                <Input
                  id={`pilot-files-${scenario.id}`}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
                  onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
                />
                <p className="text-xs text-muted-foreground">Up to {PILOT_MAX_ATTACHMENTS} files, maximum 10 MB each. Original files remain private and are served through controlled access.</p>
                {files.length > 0 && <p className="text-sm font-medium">{files.length} file{files.length === 1 ? '' : 's'} ready: {files.map((file) => file.name).join(', ')}</p>}
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-background p-3">
                <Checkbox
                  id={`pilot-anonymous-${scenario.id}`}
                  checked={anonymous}
                  onCheckedChange={(checked) => setAnonymous(checked === true)}
                />
                <Label htmlFor={`pilot-anonymous-${scenario.id}`} className="leading-relaxed">
                  Hide my name in the participant-facing view. Authorised Pilot staff retain access for testing, intake and audit.
                </Label>
              </div>
            </div>
          </details>
        )}

        {emergency && (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`pilot-emergency-consent-${scenario.id}`}
                checked={emergencyConsent}
                onCheckedChange={(checked) => setEmergencyConsent(checked === true)}
              />
              <Label htmlFor={`pilot-emergency-consent-${scenario.id}`} className="leading-relaxed">
                I consent to share my current location and registered student profile with authorised campus-security Pilot staff. I understand this test does not contact CPS, SAPS, an ambulance or another external emergency service.
              </Label>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Your Pilot session is kept in sync automatically. Reports and attachments remain inside the isolated Pilot workflow.
        </div>

        <Button
          className="h-12 w-full text-base font-bold"
          onClick={() => void submit()}
          disabled={!canSubmit || loading}
          variant={emergency ? 'destructive' : 'default'}
        >
          {loading
            ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            : emergency
              ? <Siren className="mr-2 h-5 w-5" />
              : academicFraud
                ? <ShieldCheck className="mr-2 h-5 w-5" />
                : <MapPin className="mr-2 h-5 w-5" />}
          {loading ? 'Submitting securely…' : emergency ? 'Submit Emergency Test' : academicFraud ? 'Submit Academic Fraud Report' : 'Submit Pilot Report'}
        </Button>

        {!canSubmit && (
          <p className="text-center text-sm text-muted-foreground">
            {emergency
              ? 'Use your location and confirm consent to continue.'
              : academicFraud
                ? 'Select the suspicious service, add factual details and attach at least one evidence file.'
                : requiresLocation
                  ? 'Select an incident type, add a short description and use your location.'
                  : 'Select an incident type and add a short description.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
