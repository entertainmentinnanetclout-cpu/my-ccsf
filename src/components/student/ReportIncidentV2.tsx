import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CloudOff, FileText, Loader2, MapPin, Navigation, PenTool, RefreshCw, Send, Trash2, WifiOff } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';
import { SubmissionReceiptCard } from '@/components/shared/SubmissionReceiptCard';
import { useToast } from '@/hooks/use-toast';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
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
  finalizeOfficialSubmission,
  uploadSubmissionEvidence,
  type EvidenceSubmissionDraft,
  type EvidenceUploadState,
  type SubmissionReceipt,
} from '@/services/evidenceSubmissionService';
import type { Database } from '@/integrations/supabase/types';
import type { CampusLocation } from '@/types/pilot';

type IncidentCategory = Database['public']['Enums']['incident_category'];

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
const EMERGENCY_CATEGORIES = new Set<IncidentCategory>([
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder', 'Armed robbery', 'Assault GBH', 'Public violence',
]);

const categories: { value: IncidentCategory; label: string }[] = [
  { value: 'Rape', label: 'Rape' },
  { value: 'Sexual assault', label: 'Sexual Assault' },
  { value: 'Gbv', label: 'Gender-Based Violence (GBV)' },
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

interface OfficialReportDraft {
  formData: {
    title: string;
    description: string;
    category: IncidentCategory | '';
    locationDescription: string;
    isAnonymous: boolean;
  };
  location: { lat: number; lng: number; accuracy: number | null } | null;
  locationAddress: string;
  consentAgreed: boolean;
  signatureData: string;
}

const EMPTY_FORM: OfficialReportDraft['formData'] = {
  title: '', description: '', category: '', locationDescription: '', isAnonymous: false,
};

export function ReportIncidentV2() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const signatureRef = useRef<SignatureCanvas>(null);
  const hydratedKey = useRef<string | null>(null);
  const activeSubmissionRef = useRef<{ draft: EvidenceSubmissionDraft; payloadHash: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<Record<string, EvidenceUploadState>>({});
  const [location, setLocation] = useState<OfficialReportDraft['location']>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [queued, setQueued] = useState<QueuedSubmission[]>([]);
  const [queueLoadingId, setQueueLoadingId] = useState<string | null>(null);

  const draftKey = user?.id ? reportDraftKey('official', user.id, 'incident') : null;
  const evidenceKey = draftKey ? `${draftKey}:evidence` : null;
  const campus = (userProfile?.campus ?? null) as CampusLocation | null;

  const refreshQueue = useCallback(async () => {
    if (!user?.id) { setQueued([]); return; }
    setQueued(await listOfflineSubmissions(user.id, 'official').catch(() => []));
  }, [user?.id]);

  useEffect(() => {
    void refreshQueue();
    const unsubscribe = subscribeOfflineQueue(() => void refreshQueue());
    const handleOnline = () => void refreshQueue();
    window.addEventListener('online', handleOnline);
    return () => { unsubscribe(); window.removeEventListener('online', handleOnline); };
  }, [refreshQueue]);

  useEffect(() => {
    if (!draftKey || !evidenceKey || hydratedKey.current === draftKey) return;
    hydratedKey.current = draftKey;
    const saved = readReportDraft<OfficialReportDraft>(draftKey);
    if (saved) {
      setFormData({ ...EMPTY_FORM, ...saved.formData });
      setLocation(saved.location ?? null);
      setLocationAddress(saved.locationAddress ?? '');
      setConsentAgreed(saved.consentAgreed ?? false);
      setSignatureData(saved.signatureData ?? '');
    }
    void loadDraftEvidence(evidenceKey).then(setFiles).finally(() => setDraftReady(true));
  }, [draftKey, evidenceKey]);

  useEffect(() => {
    if (!signatureData || !signatureRef.current || !signatureRef.current.isEmpty()) return;
    signatureRef.current.fromDataURL(signatureData);
  }, [signatureData, formData.isAnonymous]);

  useEffect(() => {
    if (!draftReady || !draftKey || loading) return;
    writeReportDraft<OfficialReportDraft>(draftKey, { formData, location, locationAddress, consentAgreed, signatureData });
  }, [consentAgreed, draftKey, draftReady, formData, loading, location, locationAddress, signatureData]);

  useEffect(() => {
    if (!draftReady || !evidenceKey || loading) return;
    void saveDraftEvidence(evidenceKey, files);
  }, [draftReady, evidenceKey, files, loading]);

  const captureLocation = async () => {
    setGettingLocation(true);
    try {
      const { position } = await captureBrowserPosition();
      const next = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy ?? null };
      const geocoded = await reverseGeocodeCoordinates(next.lat, next.lng);
      const address = geocoded.address ?? `Near ${formatCoordinatePair(next.lat, next.lng)}`;
      setLocation(next);
      setLocationAddress(address);
      setFormData((current) => ({ ...current, locationDescription: current.locationDescription.trim() || address }));
      toast({ title: 'Location captured', description: address });
    } catch (error) {
      const failure = normalizeGeolocationError(error);
      toast({ title: 'Location could not be captured', description: failure.message, variant: 'destructive' });
    } finally { setGettingLocation(false); }
  };

  const validateAndSetFiles = async (nextFiles: File[]) => {
    if (nextFiles.length > MAX_EVIDENCE_FILES) {
      toast({ title: 'Too many evidence files', description: `Attach no more than ${MAX_EVIDENCE_FILES} files.`, variant: 'destructive' });
      return;
    }
    try {
      const prepared = await prepareEvidenceFiles(nextFiles, { allowPdf: true, maxBytes: MAX_EVIDENCE_BYTES });
      setFiles(prepared);
      setFileStates(Object.fromEntries(prepared.map((file) => [evidenceUploadKey(file), { status: 'queued', progress: 0 }] as const)));
    } catch (error) {
      toast({ title: 'Evidence file not accepted', description: error instanceof Error ? error.message : 'The selected file is not supported.', variant: 'destructive' });
    }
  };

  const clearSignature = () => { signatureRef.current?.clear(); setSignatureData(''); };
  const saveSignature = () => { if (signatureRef.current && !signatureRef.current.isEmpty()) setSignatureData(signatureRef.current.toDataURL()); };

  const clearLocalDraft = async () => {
    if (draftKey) clearReportDraft(draftKey);
    if (evidenceKey) await clearDraftEvidence(evidenceKey);
  };

  const buildPayload = (): Record<string, unknown> => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    category: formData.category,
    location_lat: location?.lat ?? null,
    location_lng: location?.lng ?? null,
    location_accuracy: location?.accuracy ?? null,
    location_description: [formData.locationDescription.trim(), locationAddress].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' | ') || null,
    is_anonymous: formData.isAnonymous,
    signature_data: formData.isAnonymous ? null : signatureData,
  });

  const resetForm = async () => {
    await clearLocalDraft();
    setFormData(EMPTY_FORM);
    setFiles([]);
    setFileStates({});
    setLocation(null);
    setLocationAddress('');
    setConsentAgreed(false);
    setSignatureData('');
    signatureRef.current?.clear();
    activeSubmissionRef.current = null;
  };

  const processOnline = async (payload: Record<string, unknown>, evidence: File[], submittedOffline = false) => {
    const payloadHash = JSON.stringify(payload);
    let draft = activeSubmissionRef.current?.payloadHash === payloadHash ? activeSubmissionRef.current.draft : null;
    if (!draft) {
      draft = await createEvidenceSubmissionDraft({ scope: 'official', payload, campus });
      activeSubmissionRef.current = { draft, payloadHash };
    }
    const manifest = await uploadSubmissionEvidence({
      draft,
      files: evidence,
      onState: (key, state) => setFileStates((current) => ({ ...current, [key]: state })),
    });
    const result = await finalizeOfficialSubmission({ submissionId: draft.id, evidence: manifest, submittedOffline });
    setReceipt(result.receipt);
    await resetForm();
    return result;
  };

  const queueOffline = async (payload: Record<string, unknown>) => {
    if (!user) return;
    await enqueueOfflineSubmission({ scope: 'official', userId: user.id, payload, context: { campus }, files });
    await resetForm();
    toast({ title: 'Report saved on this device', description: 'It has not been delivered. Open the queued report after reconnecting and choose Send now.' });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!formData.category || !formData.title.trim() || !formData.description.trim()) {
      toast({ title: 'Complete the required report details', variant: 'destructive' });
      return;
    }
    if (!formData.isAnonymous && (!consentAgreed || !signatureData)) {
      toast({ title: 'Consent and signature are required for an identified report', variant: 'destructive' });
      return;
    }
    const payload = buildPayload();
    if (!navigator.onLine) {
      if (EMERGENCY_CATEGORIES.has(formData.category as IncidentCategory)) {
        toast({ title: 'Emergency report not delivered', description: 'You are offline. Contact Campus Protection Services or emergency services immediately.', variant: 'destructive' });
        return;
      }
      await queueOffline(payload).catch((error) => toast({ title: 'Offline report could not be saved', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' }));
      return;
    }

    setLoading(true);
    setReceipt(null);
    try {
      await processOnline(payload, files);
      toast({ title: 'Report submitted successfully', description: 'The report and verified evidence are now available to the authorised campus team.' });
    } catch (error) {
      toast({ title: 'Report not finalised', description: error instanceof Error ? error.message : 'Your draft and evidence remain on this device. Try again.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const sendQueued = async (item: QueuedSubmission) => {
    if (!navigator.onLine) { toast({ title: 'Still offline', description: 'Reconnect before sending this queued report.', variant: 'destructive' }); return; }
    setQueueLoadingId(item.id);
    setFileStates(Object.fromEntries(item.files.map((file) => [evidenceUploadKey(file), { status: 'queued', progress: 0 }] as const)));
    try {
      const queuedCampus = (item.context.campus ?? campus) as CampusLocation | null;
      const draft = await createEvidenceSubmissionDraft({ scope: 'official', payload: item.payload, campus: queuedCampus });
      const manifest = await uploadSubmissionEvidence({ draft, files: item.files, onState: (key, state) => setFileStates((current) => ({ ...current, [key]: state })) });
      const result = await finalizeOfficialSubmission({ submissionId: draft.id, evidence: manifest, submittedOffline: true });
      await deleteOfflineSubmission(item.id);
      setReceipt(result.receipt);
      toast({ title: 'Queued report delivered', description: result.receipt.reference_number });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Queued report delivery failed.';
      await setOfflineSubmissionError(item.id, message).catch(() => undefined);
      toast({ title: 'Queued report not delivered', description: message, variant: 'destructive' });
    } finally { setQueueLoadingId(null); await refreshQueue(); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {receipt && <SubmissionReceiptCard receipt={receipt} onOpenCase={() => navigate('/dashboard?tab=mycases')} />}

      {queued.length > 0 && (
        <Card className="border-amber-500/35">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CloudOff className="h-5 w-5" />Queued reports on this device</CardTitle><CardDescription>These reports have not reached CCSF. Review and send them after reconnecting.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{queued.map((item) => <div key={item.id} className="rounded-lg border p-3"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="font-semibold">{String(item.payload.title || 'Queued incident report')}</p><p className="text-xs text-muted-foreground">Saved {new Date(item.createdAt).toLocaleString('en-ZA')} · {item.files.length} evidence file{item.files.length === 1 ? '' : 's'}</p>{item.lastError && <p className="mt-1 text-xs text-destructive">Last attempt: {item.lastError}</p>}</div><div className="flex gap-2"><Button size="sm" onClick={() => void sendQueued(item)} disabled={queueLoadingId === item.id}>{queueLoadingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send now</Button><Button size="sm" variant="outline" onClick={() => void deleteOfflineSubmission(item.id)} disabled={queueLoadingId === item.id}><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</CardContent>
        </Card>
      )}

      <Card className="shadow-medium" data-testid="official-mobile-report-form">
        <CardHeader><CardTitle>Report an Incident</CardTitle><CardDescription>Your unfinished report and selected evidence are restored automatically. Evidence is uploaded and verified before the case is finalised.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            {!navigator.onLine && <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4"><WifiOff className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Offline mode</p><p className="text-sm text-muted-foreground">Non-emergency reports can be saved on this device, but they are not delivered until you reconnect and choose Send now.</p></div></div>}
            <div className="space-y-2"><Label>Incident Category *</Label><Select value={formData.category} onValueChange={(value) => setFormData((current) => ({ ...current, category: value as IncidentCategory }))}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Brief description of the incident" /></div>
            <div className="space-y-2"><Label>What happened? *</Label><Textarea value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} rows={5} maxLength={5000} placeholder="Provide a factual statement of what happened." /></div>

            <div className="space-y-3 rounded-xl border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Incident location</p><p className="text-sm text-muted-foreground">Use GPS or add a building, room, gate or landmark manually.</p></div><Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={gettingLocation}>{gettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}{location ? 'Update location' : 'Use my location'}</Button></div>{locationAddress && <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{locationAddress}</span></div>}<Input value={formData.locationDescription} onChange={(event) => setFormData((current) => ({ ...current, locationDescription: event.target.value }))} placeholder="Building, room, floor or nearby landmark" /></div>

            <div className="space-y-2"><Label>Photos, video or documents</Label><MobileEvidencePicker files={files} onFilesChange={validateAndSetFiles} acceptPdf maxFiles={MAX_EVIDENCE_FILES} disabled={loading} helpText="Up to 3 JPG, PNG, WebP, HEIC/HEIF, MP4 or PDF files; maximum 10 MB each after processing." fileStates={fileStates} /></div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4"><div><Label>Report anonymously</Label><p className="text-sm text-muted-foreground">Your identity will not be attached to the case.</p></div><Switch checked={formData.isAnonymous} onCheckedChange={(checked) => { setFormData((current) => ({ ...current, isAnonymous: checked })); if (checked) { setConsentAgreed(false); clearSignature(); } }} /></div>

            {!formData.isAnonymous && <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-2"><PenTool className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-semibold">Consent declaration</h3><p className="text-sm text-muted-foreground">Confirm the information is accurate and sign below.</p></div></div><div className="flex items-start gap-3 rounded-lg border bg-background p-3"><Checkbox checked={consentAgreed} onCheckedChange={(checked) => setConsentAgreed(checked === true)} id="official-report-consent" /><Label htmlFor="official-report-consent" className="leading-relaxed">I confirm that this report is accurate to the best of my knowledge and consent to an authorised investigation.</Label></div><div className="space-y-2"><div className="flex items-center justify-between"><Label>Your signature *</Label><Button type="button" size="sm" variant="ghost" onClick={clearSignature}><Trash2 className="mr-1 h-4 w-4" />Clear</Button></div><div className="overflow-hidden rounded-lg border-2 border-dashed bg-background"><SignatureCanvas ref={signatureRef} canvasProps={{ className: 'h-32 w-full cursor-crosshair', style: { width: '100%', height: '128px' } }} penColor="black" backgroundColor="transparent" onEnd={saveSignature} /></div><p className="text-xs text-muted-foreground">{signatureData ? 'Signature captured and saved with this unfinished draft.' : 'Sign using your finger, stylus or mouse.'}</p></div></div>}

            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground"><FileText className="mr-2 inline h-4 w-4" />The case becomes visible to authorised staff only after required fields and all selected evidence have been securely verified.</div>
            <Button type="submit" className="h-12 w-full font-bold" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading and verifying…</> : navigator.onLine ? <><MapPin className="mr-2 h-4 w-4" />Submit report</> : <><CloudOff className="mr-2 h-4 w-4" />Save non-emergency report offline</>}</Button>
            {loading && <Button type="button" variant="ghost" className="w-full" disabled><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Do not close the app while evidence is being finalised</Button>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
