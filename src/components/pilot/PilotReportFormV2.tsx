import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileText, GraduationCap, Loader2, MapPin, Navigation, ShieldCheck, Siren } from 'lucide-react';
import { AcademicFraudLaunchCard, ACADEMIC_FRAUD_REPORT_TYPES } from '@/components/shared/AcademicFraudLaunchCard';
import { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_MAX_ATTACHMENTS, PILOT_ROUTES } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import {
  clearDraftEvidence,
  clearReportDraft,
  loadDraftEvidence,
  readReportDraft,
  reportDraftKey,
  saveDraftEvidence,
  writeReportDraft,
} from '@/lib/reportDraftStorage';
import {
  createPilotReport,
  ensureActivePilotSession,
  insertPilotLocationEvent,
  recordPilotFeatureTest,
} from '@/services/pilot/pilotCoreService';
import { uploadPilotEvidenceResilient, validatePilotEvidence } from '@/services/pilot/pilotEvidenceService';
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

interface PilotReportDraft {
  description: string;
  category: IncidentCategory | '';
  academicServiceType: string;
  locationDescription: string;
  location: CapturedLocation | null;
  anonymous: boolean;
  emergencyConsent: boolean;
}

const isSessionFailure = (error: unknown) => /pilot session|session_(expired|not_found)|active owned pilot session/i.test(error instanceof Error ? error.message : '');

export function PilotReportFormV2({
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
  const hydrated = useRef(false);
  const academicFraud = ACADEMIC_SCENARIO_PATTERN.test(scenario.title);
  const [workingSession, setWorkingSession] = useState(session);
  const [description, setDescription] = useState(emergency ? EMERGENCY_DESCRIPTION : '');
  const [category, setCategory] = useState<IncidentCategory | ''>(academicFraud ? 'Fraud' : emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : scenario.expected_category ?? '');
  const [academicServiceType, setAcademicServiceType] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [emergencyConsent, setEmergencyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draftReady, setDraftReady] = useState(false);

  const draftKey = reportDraftKey('pilot', participant.user_id, scenario.id);
  const evidenceKey = `${draftKey}:evidence`;
  const requiresAttachment = !emergency && (scenario.requires_attachment || academicFraud);
  const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;

  useEffect(() => setWorkingSession(session), [session]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = readReportDraft<PilotReportDraft>(draftKey);
    if (saved) {
      setDescription(saved.description || (emergency ? EMERGENCY_DESCRIPTION : ''));
      setCategory(saved.category || (academicFraud ? 'Fraud' : emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : scenario.expected_category ?? ''));
      setAcademicServiceType(saved.academicServiceType || '');
      setLocationDescription(saved.locationDescription || '');
      setLocation(saved.location || null);
      setAnonymous(saved.anonymous || false);
      setEmergencyConsent(saved.emergencyConsent || false);
    }
    void loadDraftEvidence(evidenceKey).then(setFiles).finally(() => setDraftReady(true));
  }, [academicFraud, draftKey, emergency, evidenceKey, scenario.expected_category]);

  useEffect(() => {
    if (!draftReady || loading) return;
    writeReportDraft<PilotReportDraft>(draftKey, {
      description,
      category,
      academicServiceType,
      locationDescription,
      location,
      anonymous,
      emergencyConsent,
    });
  }, [academicServiceType, anonymous, category, description, draftKey, draftReady, emergencyConsent, loading, location, locationDescription]);

  useEffect(() => {
    if (!draftReady || loading) return;
    void saveDraftEvidence(evidenceKey, files);
  }, [draftReady, evidenceKey, files, loading]);

  const canSubmit = useMemo(() => {
    if (emergency) return emergencyConsent && Boolean(location) && Boolean(locationDescription.trim()) && !locationLoading;
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
      const readable = geocoded.address ?? `Location captured near ${CAMPUS_LABELS[participant.campus]}; street address lookup was unavailable.`;
      setLocation(nextLocation);
      setLocationDescription(readable);
      toast({ title: 'Location ready', description: readable });
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: workingSession.id,
        featureKey: 'location_permission_capture',
        outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: { accuracy: nextLocation.accuracy, acquisition, permission, address: readable },
      }).catch(() => undefined);
    } catch (error) {
      const failure = normalizeGeolocationError(error);
      setLocation(null);
      setLocationDescription('');
      setLocationError(failure.message);
      toast({ title: 'Location capture failed', description: failure.message, variant: 'destructive' });
    } finally {
      setLocationLoading(false);
    }
  }, [participant.campus, participant.program_id, toast, workingSession.id]);

  useEffect(() => {
    if (!emergency || emergencyLocationAttempted.current || location) return;
    emergencyLocationAttempted.current = true;
    void captureLocation();
  }, [captureLocation, emergency, location]);

  const validateAndSetFiles = (nextFiles: File[]) => {
    try {
      validatePilotEvidence(nextFiles);
      setFiles(nextFiles);
    } catch (error) {
      toast({ title: 'Evidence not accepted', description: error instanceof Error ? error.message : 'Invalid evidence file.', variant: 'destructive' });
    }
  };

  const clearDraft = async () => {
    clearReportDraft(draftKey);
    await clearDraftEvidence(evidenceKey);
  };

  const submit = async () => {
    if (!canSubmit) return;
    const selectedCategory = emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : academicFraud ? 'Fraud' : category;
    if (!selectedCategory) return;

    setLoading(true);
    setUploadProgress(0);
    const started = performance.now();
    let activeSession = workingSession;
    const reportTitle = emergency ? EMERGENCY_TITLE : academicFraud ? `Academic fraud: ${academicServiceType}` : scenario.title;
    const reportDescription = emergency ? EMERGENCY_DESCRIPTION : academicFraud ? `Reported service: ${academicServiceType}\n\n${description.trim()}` : description.trim();

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
      } catch (error) {
        if (!isSessionFailure(error)) throw error;
        activeSession = await ensureActivePilotSession(participant, null);
        setWorkingSession(activeSession);
        report = await submitWithSession(activeSession);
      }

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
        }).catch(() => undefined);
      }

      let evidenceWarning: string | null = null;
      if (!emergency && files.length) {
        try {
          await uploadPilotEvidenceResilient(report, files, report.submitted_by, setUploadProgress);
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: academicFraud ? 'academic_fraud_evidence_upload' : 'attachment_upload',
            outcome: 'passed',
            durationMs: Math.round(performance.now() - started),
            metadata: { file_count: files.length },
          }).catch(() => undefined);
        } catch (error) {
          evidenceWarning = error instanceof Error ? error.message : 'Evidence upload failed.';
          await recordPilotFeatureTest({
            programId: report.program_id,
            sessionId: report.session_id,
            reportId: report.id,
            featureKey: academicFraud ? 'academic_fraud_evidence_upload' : 'attachment_upload',
            outcome: 'failed',
            errorCode: evidenceWarning,
          }).catch(() => undefined);
        }
      }

      await clearDraft();
      toast({
        title: evidenceWarning ? 'Pilot case saved with an evidence warning' : 'Pilot report submitted',
        description: evidenceWarning ? `The case is in the campus queue, but evidence could not be attached after retrying: ${evidenceWarning}` : `${report.reference_number}. The report and evidence are available to the authorised Pilot team.`,
        variant: evidenceWarning ? 'destructive' : 'default',
      });
      navigate(PILOT_ROUTES.report(report.id));
    } catch (error) {
      await recordPilotFeatureTest({
        programId: participant.program_id,
        sessionId: activeSession.id,
        featureKey: emergency ? 'emergency_simulation_submission' : academicFraud ? 'academic_fraud_report_submission' : 'standard_report_submission',
        outcome: 'failed',
        durationMs: Math.round(performance.now() - started),
        errorCode: error instanceof Error ? error.message : 'submission_error',
      }).catch(() => undefined);
      toast({ title: 'Pilot submission failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className={emergency ? 'overflow-hidden border-destructive/40 shadow-large' : academicFraud ? 'overflow-hidden border-[#D7193F]/40 shadow-large' : 'overflow-hidden shadow-large'} data-testid="pilot-mobile-report-form">
      <CardHeader className={emergency ? 'border-b bg-destructive/5' : 'border-b bg-primary/5'}>
        <div className="flex items-start gap-3">
          <div className={emergency ? 'rounded-xl bg-destructive/10 p-3 text-destructive' : 'rounded-xl bg-primary/10 p-3 text-primary'}>{emergency ? <Siren className="h-6 w-6" /> : academicFraud ? <GraduationCap className="h-6 w-6" /> : <FileText className="h-6 w-6" />}</div>
          <div><CardTitle>{emergency ? 'Emergency Test' : academicFraud ? 'Academic Fraud & Fake Admin Services' : 'Test Report Incident'}</CardTitle><CardDescription className="mt-1">{emergency ? 'Only location and consent are required.' : 'Your unfinished report and evidence are restored automatically after a mobile interruption.'}</CardDescription></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        {emergency ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-semibold">Your student profile is attached automatically</p><p className="text-sm text-muted-foreground">No title, category or written explanation is required.</p></div></div></div>
        ) : (
          <div className="space-y-4">
            {academicFraud && <><AcademicFraudLaunchCard /><div className="space-y-2"><Label>What was offered or advertised? *</Label><Select value={academicServiceType} onValueChange={setAcademicServiceType}><SelectTrigger><SelectValue placeholder="Select the suspicious service" /></SelectTrigger><SelectContent>{ACADEMIC_FRAUD_REPORT_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></>}
            {!academicFraud && <div className="space-y-2"><Label>Incident type *</Label><Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}><SelectTrigger><SelectValue placeholder="Select incident type" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>}
            <div className="space-y-2"><Label>What happened? *</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={5000} placeholder={academicFraud ? 'Include the account, platform, amount requested and what was promised.' : 'Briefly describe the test incident.'} /></div>
          </div>
        )}

        {(requiresLocation || location || locationError) && <div className="rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Current location</p><p className="text-sm text-muted-foreground">{requiresLocation ? 'Required for this reporting scenario.' : 'Optional supporting context.'}</p></div><Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={locationLoading}>{locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}{location ? 'Update location' : 'Use my location'}</Button></div>{location && locationDescription && <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{locationDescription}</span></div>}{locationError && <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4" /><span>{locationError}</span></div>}</div>}

        {!emergency && <div className="space-y-2"><Label>{requiresAttachment ? 'Evidence *' : 'Evidence (optional)'}</Label><MobileEvidencePicker files={files} onFilesChange={validateAndSetFiles} acceptPdf maxFiles={PILOT_MAX_ATTACHMENTS} disabled={loading} helpText={`Up to ${PILOT_MAX_ATTACHMENTS} files, maximum 10 MB each. JPG, PNG, WebP, MP4 and PDF are supported.`} />{uploadProgress > 0 && <Progress value={uploadProgress} />}<div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"><Checkbox checked={anonymous} onCheckedChange={(checked) => setAnonymous(checked === true)} id={`pilot-anonymous-${scenario.id}`} /><Label htmlFor={`pilot-anonymous-${scenario.id}`} className="leading-relaxed">Hide my name from participant-facing displays. Authorised Pilot staff retain access for intake and audit.</Label></div></div>}

        {emergency && <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex items-start gap-3"><Checkbox checked={emergencyConsent} onCheckedChange={(checked) => setEmergencyConsent(checked === true)} id={`pilot-emergency-consent-${scenario.id}`} /><Label htmlFor={`pilot-emergency-consent-${scenario.id}`} className="leading-relaxed">I consent to share my current location and registered student profile with authorised campus-security Pilot staff. I understand this test does not contact CPS, SAPS, an ambulance or another external service.</Label></div></div>}

        <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">The Pilot session, current report fields and selected evidence remain available when the camera or file picker temporarily suspends the mobile app.</div>
        <Button type="button" className="h-12 w-full font-bold" onClick={() => void submit()} disabled={!canSubmit || loading} variant={emergency ? 'destructive' : 'default'}>{loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : emergency ? <Siren className="mr-2 h-5 w-5" /> : <MapPin className="mr-2 h-5 w-5" />}{loading ? 'Submitting securely…' : emergency ? 'Submit Emergency Test' : 'Submit Pilot Report'}</Button>
        {!canSubmit && <p className="text-center text-sm text-muted-foreground">{emergency ? 'Use your location and confirm consent to continue.' : requiresAttachment ? 'Complete the required details and attach at least one evidence file.' : 'Complete the required report details to continue.'}</p>}
      </CardContent>
    </Card>
  );
}
