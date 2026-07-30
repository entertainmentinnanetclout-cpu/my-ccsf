import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, FileText, GraduationCap, Loader2, MapPin, Navigation, Send, ShieldCheck, Siren, Trash2, WifiOff } from 'lucide-react';
import { AcademicFraudLaunchCard, ACADEMIC_FRAUD_REPORT_TYPES } from '@/components/shared/AcademicFraudLaunchCard';
import { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';
import { SubmissionReceiptCard } from '@/components/shared/SubmissionReceiptCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CAMPUS_LABELS, PILOT_MAX_ATTACHMENTS, PILOT_MAX_FILE_BYTES, PILOT_ROUTES } from '@/config/pilot';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import { prepareEvidenceFiles } from '@/lib/evidenceProcessing';
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
  deleteOfflineSubmission,
  enqueueOfflineSubmission,
  listOfflineSubmissions,
  setOfflineSubmissionError,
  subscribeOfflineQueue,
  type QueuedSubmission,
} from '@/lib/offlineReportQueue';
import {
  createEvidenceSubmissionDraft,
  evidenceUploadKey,
  finalizePilotSubmission,
  uploadSubmissionEvidence,
  type EvidenceSubmissionDraft,
  type EvidenceUploadState,
  type SubmissionReceipt,
} from '@/services/evidenceSubmissionService';
import {
  collectPilotDeviceInfo,
  createPilotReport,
  ensureActivePilotSession,
  insertPilotLocationEvent,
  recordPilotFeatureTest,
} from '@/services/pilot/pilotCoreService';
import type { IncidentCategory, PilotParticipant, PilotScenario, PilotSession } from '@/types/pilot';

const EMERGENCY_TITLE = 'Emergency assistance request';
const EMERGENCY_DESCRIPTION = 'Emergency assistance requested. The student may be unable to provide further details.';
const EMERGENCY_FALLBACK_CATEGORY: IncidentCategory = 'Public violence';
const ACADEMIC_SCENARIO_PATTERN = /academic fraud|fake admin services/i;

const categories: { value: IncidentCategory; label: string }[] = [
  { value: 'Rape', label: 'Rape' }, { value: 'Sexual assault', label: 'Sexual Assault' },
  { value: 'Gbv', label: 'Gender-Based Violence' }, { value: 'Murder', label: 'Murder' },
  { value: 'Attempted murder', label: 'Attempted Murder' }, { value: 'Assault common', label: 'Common Assault' },
  { value: 'Assault GBH', label: 'Assault GBH' }, { value: 'Fraud', label: 'Fraud' },
  { value: 'Theft', label: 'Theft' }, { value: 'Robbery', label: 'Robbery' },
  { value: 'Armed robbery', label: 'Armed Robbery' }, { value: 'Arson', label: 'Arson' },
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

interface CapturedLocation { latitude: number; longitude: number; accuracy: number | null }
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

export function PilotReportFormV2({ scenario, participant, session, emergency = false }: {
  scenario: PilotScenario;
  participant: PilotParticipant;
  session: PilotSession;
  emergency?: boolean;
}) {
  const { toast } = useToast();
  const emergencyLocationAttempted = useRef(false);
  const hydrated = useRef(false);
  const activeSubmissionRef = useRef<{ draft: EvidenceSubmissionDraft; payloadHash: string; sessionId: string } | null>(null);
  const academicFraud = ACADEMIC_SCENARIO_PATTERN.test(scenario.title);
  const [workingSession, setWorkingSession] = useState(session);
  const [description, setDescription] = useState(emergency ? EMERGENCY_DESCRIPTION : '');
  const [category, setCategory] = useState<IncidentCategory | ''>(academicFraud ? 'Fraud' : emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : scenario.expected_category ?? '');
  const [academicServiceType, setAcademicServiceType] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<Record<string, EvidenceUploadState>>({});
  const [anonymous, setAnonymous] = useState(false);
  const [emergencyConsent, setEmergencyConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [queued, setQueued] = useState<QueuedSubmission[]>([]);
  const [queueLoadingId, setQueueLoadingId] = useState<string | null>(null);

  const draftKey = reportDraftKey('pilot', participant.user_id, scenario.id);
  const evidenceKey = `${draftKey}:evidence`;
  const requiresAttachment = !emergency && (scenario.requires_attachment || academicFraud);
  const requiresLocation = emergency || scenario.requires_location || scenario.requires_live_tracking;

  const refreshQueue = useCallback(async () => {
    const records = await listOfflineSubmissions(participant.user_id, 'pilot').catch(() => []);
    setQueued(records.filter((item) => item.context.scenarioId === scenario.id));
  }, [participant.user_id, scenario.id]);

  useEffect(() => setWorkingSession(session), [session]);
  useEffect(() => {
    void refreshQueue();
    const unsubscribe = subscribeOfflineQueue(() => void refreshQueue());
    window.addEventListener('online', refreshQueue);
    return () => { unsubscribe(); window.removeEventListener('online', refreshQueue); };
  }, [refreshQueue]);

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
    writeReportDraft<PilotReportDraft>(draftKey, { description, category, academicServiceType, locationDescription, location, anonymous, emergencyConsent });
  }, [academicServiceType, anonymous, category, description, draftKey, draftReady, emergencyConsent, loading, location, locationDescription]);
  useEffect(() => { if (draftReady && !loading) void saveDraftEvidence(evidenceKey, files); }, [draftReady, evidenceKey, files, loading]);

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
      const nextLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy ?? null };
      const geocoded = await reverseGeocodeCoordinates(nextLocation.latitude, nextLocation.longitude);
      const readable = geocoded.address ?? `Location captured near ${CAMPUS_LABELS[participant.campus]}; street address lookup was unavailable.`;
      setLocation(nextLocation);
      setLocationDescription(readable);
      toast({ title: 'Location ready', description: readable });
      await recordPilotFeatureTest({ programId: participant.program_id, sessionId: workingSession.id, featureKey: 'location_permission_capture', outcome: 'passed', durationMs: Math.round(performance.now() - started), metadata: { accuracy: nextLocation.accuracy, acquisition, permission, address: readable } }).catch(() => undefined);
    } catch (error) {
      const failure = normalizeGeolocationError(error);
      setLocation(null); setLocationDescription(''); setLocationError(failure.message);
      toast({ title: 'Location capture failed', description: failure.message, variant: 'destructive' });
    } finally { setLocationLoading(false); }
  }, [participant.campus, participant.program_id, toast, workingSession.id]);

  useEffect(() => {
    if (!emergency || emergencyLocationAttempted.current || location) return;
    emergencyLocationAttempted.current = true;
    void captureLocation();
  }, [captureLocation, emergency, location]);

  const validateAndSetFiles = async (nextFiles: File[]) => {
    if (nextFiles.length > PILOT_MAX_ATTACHMENTS) {
      toast({ title: 'Evidence not accepted', description: `Attach no more than ${PILOT_MAX_ATTACHMENTS} files.`, variant: 'destructive' });
      return;
    }
    try {
      const prepared = await prepareEvidenceFiles(nextFiles, { allowPdf: true, maxBytes: PILOT_MAX_FILE_BYTES });
      setFiles(prepared);
      setFileStates(Object.fromEntries(prepared.map((file) => [evidenceUploadKey(file), { status: 'queued', progress: 0 }] as const)));
    } catch (error) {
      toast({ title: 'Evidence not accepted', description: error instanceof Error ? error.message : 'Invalid evidence file.', variant: 'destructive' });
    }
  };

  const clearDraft = async () => { clearReportDraft(draftKey); await clearDraftEvidence(evidenceKey); activeSubmissionRef.current = null; };
  const resetForm = async () => {
    await clearDraft();
    setDescription(emergency ? EMERGENCY_DESCRIPTION : '');
    setCategory(academicFraud ? 'Fraud' : emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : scenario.expected_category ?? '');
    setAcademicServiceType(''); setLocationDescription(''); setLocation(null); setFiles([]); setFileStates({}); setAnonymous(false); setEmergencyConsent(false);
  };

  const reportFields = (selectedCategory: IncidentCategory): Record<string, unknown> => ({
    title: emergency ? EMERGENCY_TITLE : academicFraud ? `Academic fraud: ${academicServiceType}` : scenario.title,
    description: emergency ? EMERGENCY_DESCRIPTION : academicFraud ? `Reported service: ${academicServiceType}\n\n${description.trim()}` : description.trim(),
    category: selectedCategory,
    is_anonymous: emergency ? false : anonymous,
    emergency_consent: emergency ? emergencyConsent : false,
    location_lat: location?.latitude ?? null,
    location_lng: location?.longitude ?? null,
    location_accuracy: location?.accuracy ?? null,
    location_description: locationDescription.trim() || null,
  });

  const submitEmergency = async (selectedCategory: IncidentCategory, activeSession: PilotSession) => {
    return createPilotReport({
      program_id: participant.program_id, session_id: activeSession.id, participant_id: participant.id, scenario_id: scenario.id,
      campus: participant.campus, ...reportFields(selectedCategory),
    } as Parameters<typeof createPilotReport>[0]);
  };

  const processEvidenceFirst = async (payload: Record<string, unknown>, evidence: File[], activeSession: PilotSession, submittedOffline = false) => {
    const payloadHash = JSON.stringify(payload);
    let draft = activeSubmissionRef.current?.payloadHash === payloadHash && activeSubmissionRef.current.sessionId === activeSession.id
      ? activeSubmissionRef.current.draft : null;
    if (!draft) {
      draft = await createEvidenceSubmissionDraft({
        scope: 'pilot', payload, requiredEvidence: requiresAttachment, programId: participant.program_id,
        sessionId: activeSession.id, participantId: participant.id, scenarioId: scenario.id, campus: participant.campus,
      });
      activeSubmissionRef.current = { draft, payloadHash, sessionId: activeSession.id };
    }
    const manifest = await uploadSubmissionEvidence({ draft, files: evidence, onState: (key, state) => setFileStates((current) => ({ ...current, [key]: state })) });
    return finalizePilotSubmission({
      draft,
      report: { session_id: activeSession.id, scenario_id: scenario.id, ...payload },
      evidence: manifest,
      submittedOffline,
    });
  };

  const queueOffline = async (payload: Record<string, unknown>) => {
    await enqueueOfflineSubmission({
      scope: 'pilot', userId: participant.user_id, payload, files,
      context: { programId: participant.program_id, participantId: participant.id, scenarioId: scenario.id, campus: participant.campus, requiresAttachment },
    });
    await resetForm();
    toast({ title: 'Pilot report saved on this device', description: 'It has not reached the Pilot queue. Reconnect and choose Send now.' });
  };

  const submit = async () => {
    if (!canSubmit) return;
    const selectedCategory = emergency ? scenario.expected_category ?? EMERGENCY_FALLBACK_CATEGORY : academicFraud ? 'Fraud' : category;
    if (!selectedCategory) return;
    if (!navigator.onLine) {
      if (emergency) {
        toast({ title: 'Emergency Test not delivered', description: 'This device is offline. The simulation was not submitted. In a real emergency, contact CPS or emergency services immediately.', variant: 'destructive' });
        return;
      }
      await queueOffline(reportFields(selectedCategory)).catch((error) => toast({ title: 'Offline Pilot report could not be saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }));
      return;
    }

    setLoading(true); setReceipt(null);
    const started = performance.now();
    let activeSession = workingSession;
    try {
      activeSession = await ensureActivePilotSession(participant, workingSession);
      if (activeSession.id !== workingSession.id) setWorkingSession(activeSession);
      if (emergency) {
        let report;
        try { report = await submitEmergency(selectedCategory, activeSession); }
        catch (error) {
          if (!isSessionFailure(error)) throw error;
          activeSession = await ensureActivePilotSession(participant, null); setWorkingSession(activeSession);
          report = await submitEmergency(selectedCategory, activeSession);
        }
        await clearDraft();
        toast({ title: 'Emergency Test submitted', description: `${report.reference_number}. No external service was dispatched.` });
        window.location.assign(PILOT_ROUTES.report(report.id));
        return;
      }

      const result = await processEvidenceFirst(reportFields(selectedCategory), files, activeSession);
      if (location) await insertPilotLocationEvent({ program_id: result.report.program_id, session_id: result.report.session_id, report_id: result.report.id, user_id: result.report.submitted_by, latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, source: 'initial_fix' }).catch(() => undefined);
      await recordPilotFeatureTest({
        programId: result.report.program_id, sessionId: result.report.session_id, reportId: result.report.id,
        featureKey: academicFraud ? 'academic_fraud_evidence_upload' : 'attachment_upload', outcome: 'passed',
        durationMs: Math.round(performance.now() - started),
        metadata: { file_count: files.length, file_types: files.map((file) => file.type), total_bytes: files.reduce((total, file) => total + file.size, 0), evidence_first: true, device: collectPilotDeviceInfo() },
      }).catch(() => undefined);
      setReceipt(result.receipt);
      await resetForm();
      toast({ title: 'Pilot report submitted', description: `${result.report.reference_number}. Evidence was verified before the simulated case entered the queue.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pilot submission failed.';
      await recordPilotFeatureTest({ programId: participant.program_id, sessionId: activeSession.id, featureKey: emergency ? 'emergency_simulation_submission' : academicFraud ? 'academic_fraud_report_submission' : 'standard_report_submission', outcome: 'failed', durationMs: Math.round(performance.now() - started), errorCode: message, metadata: { device: collectPilotDeviceInfo(), evidence_count: files.length } }).catch(() => undefined);
      toast({ title: 'Pilot report not finalised', description: `${message} Your draft and selected evidence remain on this device.`, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const sendQueued = async (item: QueuedSubmission) => {
    if (!navigator.onLine) { toast({ title: 'Still offline', variant: 'destructive' }); return; }
    setQueueLoadingId(item.id);
    try {
      const activeSession = await ensureActivePilotSession(participant, workingSession);
      setWorkingSession(activeSession);
      const queuedRequiresAttachment = Boolean(item.context.requiresAttachment);
      const draft = await createEvidenceSubmissionDraft({ scope: 'pilot', payload: item.payload, requiredEvidence: queuedRequiresAttachment, programId: participant.program_id, sessionId: activeSession.id, participantId: participant.id, scenarioId: scenario.id, campus: participant.campus });
      const manifest = await uploadSubmissionEvidence({ draft, files: item.files, onState: (key, state) => setFileStates((current) => ({ ...current, [key]: state })) });
      const result = await finalizePilotSubmission({ draft, report: { session_id: activeSession.id, scenario_id: scenario.id, ...item.payload }, evidence: manifest, submittedOffline: true });
      await deleteOfflineSubmission(item.id);
      setReceipt(result.receipt);
      toast({ title: 'Queued Pilot report delivered', description: result.report.reference_number });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Queued Pilot report delivery failed.';
      await setOfflineSubmissionError(item.id, message).catch(() => undefined);
      toast({ title: 'Queued Pilot report not delivered', description: message, variant: 'destructive' });
    } finally { setQueueLoadingId(null); await refreshQueue(); }
  };

  return (
    <div className="space-y-5">
      {receipt && <SubmissionReceiptCard receipt={receipt} onOpenCase={() => receipt.pilot_report_id && window.location.assign(PILOT_ROUTES.report(receipt.pilot_report_id))} />}
      {queued.length > 0 && <Card className="border-amber-500/35"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CloudOff className="h-5 w-5" />Queued Pilot report</CardTitle><CardDescription>This simulation has not reached the authorised Pilot queue.</CardDescription></CardHeader><CardContent className="space-y-3">{queued.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"><div><p className="font-semibold">{String(item.payload.title || scenario.title)}</p><p className="text-xs text-muted-foreground">Saved {new Date(item.createdAt).toLocaleString('en-ZA')} · {item.files.length} evidence file{item.files.length === 1 ? '' : 's'}</p>{item.lastError && <p className="text-xs text-destructive">{item.lastError}</p>}</div><div className="flex gap-2"><Button size="sm" onClick={() => void sendQueued(item)} disabled={queueLoadingId === item.id}>{queueLoadingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send now</Button><Button size="sm" variant="outline" onClick={() => void deleteOfflineSubmission(item.id)}><Trash2 className="h-4 w-4" /></Button></div></div>)}</CardContent></Card>}

      <Card className={emergency ? 'overflow-hidden border-destructive/40 shadow-large' : academicFraud ? 'overflow-hidden border-[#D7193F]/40 shadow-large' : 'overflow-hidden shadow-large'} data-testid="pilot-mobile-report-form">
        <CardHeader className={emergency ? 'border-b bg-destructive/5' : 'border-b bg-primary/5'}><div className="flex items-start gap-3"><div className={emergency ? 'rounded-xl bg-destructive/10 p-3 text-destructive' : 'rounded-xl bg-primary/10 p-3 text-primary'}>{emergency ? <Siren className="h-6 w-6" /> : academicFraud ? <GraduationCap className="h-6 w-6" /> : <FileText className="h-6 w-6" />}</div><div><CardTitle>{emergency ? 'Emergency Test' : academicFraud ? 'Academic Fraud & Fake Admin Services' : 'Test Report Incident'}</CardTitle><CardDescription className="mt-1">{emergency ? 'Only location and consent are required. This test does not contact an external service.' : 'Unfinished details and selected evidence remain available after mobile interruptions. Evidence is verified before the simulated case is created.'}</CardDescription></div></div></CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-6">
          {!navigator.onLine && <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"><WifiOff className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Offline Pilot mode</p><p className="text-sm text-muted-foreground">Non-emergency simulations can be saved locally but are not delivered until you reconnect and choose Send now.</p></div></div>}
          {emergency ? <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-destructive" /><div><p className="font-semibold">Your student profile is attached automatically</p><p className="text-sm text-muted-foreground">No title, category or written explanation is required.</p></div></div></div> : <div className="space-y-4">{academicFraud && <><AcademicFraudLaunchCard /><div className="space-y-2"><Label>What was offered or advertised? *</Label><Select value={academicServiceType} onValueChange={setAcademicServiceType}><SelectTrigger><SelectValue placeholder="Select the suspicious service" /></SelectTrigger><SelectContent>{ACADEMIC_FRAUD_REPORT_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div></>}{!academicFraud && <div className="space-y-2"><Label>Incident type *</Label><Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}><SelectTrigger><SelectValue placeholder="Select incident type" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>}<div className="space-y-2"><Label>What happened? *</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={5000} placeholder={academicFraud ? 'Include the account, platform, amount requested and what was promised.' : 'Briefly describe the test incident.'} /></div></div>}

          {(requiresLocation || location || locationError) && <div className="rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Current location</p><p className="text-sm text-muted-foreground">{requiresLocation ? 'Required for this reporting scenario.' : 'Optional supporting context.'}</p></div><Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={locationLoading}>{locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}{location ? 'Update location' : 'Use my location'}</Button></div>{location && locationDescription && <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{locationDescription}</span></div>}{locationError && <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4" /><span>{locationError}</span></div>}</div>}

          {!emergency && <div className="space-y-2"><Label>{requiresAttachment ? 'Evidence *' : 'Evidence (optional)'}</Label><MobileEvidencePicker files={files} onFilesChange={validateAndSetFiles} acceptPdf maxFiles={PILOT_MAX_ATTACHMENTS} disabled={loading} helpText={`Up to ${PILOT_MAX_ATTACHMENTS} files, maximum 10 MB each after processing. JPG, PNG, WebP, HEIC/HEIF, MP4 and PDF are supported.`} fileStates={fileStates} /><div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"><Checkbox checked={anonymous} onCheckedChange={(checked) => setAnonymous(checked === true)} id={`pilot-anonymous-${scenario.id}`} /><Label htmlFor={`pilot-anonymous-${scenario.id}`} className="leading-relaxed">Hide my name from participant-facing displays. Authorised Pilot staff retain access for intake and audit.</Label></div></div>}
          {emergency && <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"><div className="flex items-start gap-3"><Checkbox checked={emergencyConsent} onCheckedChange={(checked) => setEmergencyConsent(checked === true)} id={`pilot-emergency-consent-${scenario.id}`} /><Label htmlFor={`pilot-emergency-consent-${scenario.id}`} className="leading-relaxed">I consent to share my current location and registered student profile with authorised campus-security Pilot staff. I understand this test does not contact CPS, SAPS, an ambulance or another external service.</Label></div></div>}

          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">The Pilot session, current report fields and selected evidence remain available when the camera or file picker suspends the mobile app. Required evidence must verify before the simulated case enters the queue.</div>
          <Button type="button" className="h-12 w-full font-bold" onClick={() => void submit()} disabled={!canSubmit || loading} variant={emergency ? 'destructive' : 'default'}>{loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : emergency ? <Siren className="mr-2 h-5 w-5" /> : navigator.onLine ? <MapPin className="mr-2 h-5 w-5" /> : <CloudOff className="mr-2 h-5 w-5" />}{loading ? 'Uploading and verifying…' : emergency ? 'Submit Emergency Test' : navigator.onLine ? 'Submit Pilot Report' : 'Save Pilot report offline'}</Button>
          {!canSubmit && <p className="text-center text-sm text-muted-foreground">{emergency ? 'Use your location and confirm consent to continue.' : requiresAttachment ? 'Complete the required details and attach at least one evidence file.' : 'Complete the required report details to continue.'}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
