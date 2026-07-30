import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Navigation, PenTool, Trash2 } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';
import { useToast } from '@/hooks/use-toast';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import {
  clearDraftEvidence,
  clearReportDraft,
  loadDraftEvidence,
  readReportDraft,
  reportDraftKey,
  saveDraftEvidence,
  writeReportDraft,
} from '@/lib/reportDraftStorage';
import type { Database } from '@/integrations/supabase/types';

type IncidentCategory = Database['public']['Enums']['incident_category'];

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);

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
  title: '',
  description: '',
  category: '',
  locationDescription: '',
  isAnonymous: false,
};

async function uploadEvidenceWithRetry(path: string, file: File) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await supabase.storage.from('incident-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (!result.error) return;
    if (attempt === 0) await supabase.auth.refreshSession().catch(() => undefined);
    else throw result.error;
  }
}

export function ReportIncidentV2() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const signatureRef = useRef<SignatureCanvas>(null);
  const hydratedKey = useRef<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<OfficialReportDraft['location']>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState('');

  const draftKey = user?.id ? reportDraftKey('official', user.id, 'incident') : null;
  const evidenceKey = draftKey ? `${draftKey}:evidence` : null;

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
    writeReportDraft<OfficialReportDraft>(draftKey, {
      formData,
      location,
      locationAddress,
      consentAgreed,
      signatureData,
    });
  }, [consentAgreed, draftKey, draftReady, formData, loading, location, locationAddress, signatureData]);

  useEffect(() => {
    if (!draftReady || !evidenceKey || loading) return;
    void saveDraftEvidence(evidenceKey, files);
  }, [draftReady, evidenceKey, files, loading]);

  const captureLocation = async () => {
    setGettingLocation(true);
    try {
      const { position } = await captureBrowserPosition();
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };
      const geocoded = await reverseGeocodeCoordinates(next.lat, next.lng);
      const address = geocoded.address ?? `Near ${formatCoordinatePair(next.lat, next.lng)}`;
      setLocation(next);
      setLocationAddress(address);
      setFormData((current) => ({
        ...current,
        locationDescription: current.locationDescription.trim() || address,
      }));
      toast({ title: 'Location captured', description: address });
    } catch (error) {
      const failure = normalizeGeolocationError(error);
      toast({ title: 'Location could not be captured', description: failure.message, variant: 'destructive' });
    } finally {
      setGettingLocation(false);
    }
  };

  const validateAndSetFiles = (nextFiles: File[]) => {
    if (nextFiles.length > MAX_EVIDENCE_FILES) {
      toast({ title: 'Too many evidence files', description: `Attach no more than ${MAX_EVIDENCE_FILES} files.`, variant: 'destructive' });
      return;
    }
    const invalid = nextFiles.find((file) => !ALLOWED_EVIDENCE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_EVIDENCE_BYTES);
    if (invalid) {
      toast({ title: 'Evidence file not accepted', description: `${invalid.name} must be JPG, PNG, WebP or MP4 and no larger than 10 MB.`, variant: 'destructive' });
      return;
    }
    setFiles(nextFiles);
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignatureData('');
  };

  const saveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) setSignatureData(signatureRef.current.toDataURL());
  };

  const clearLocalDraft = async () => {
    if (draftKey) clearReportDraft(draftKey);
    if (evidenceKey) await clearDraftEvidence(evidenceKey);
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

    setLoading(true);
    setUploadProgress(0);
    try {
      const fullLocationDescription = [formData.locationDescription.trim(), locationAddress]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(' | ');

      const { data: incident, error } = await supabase.from('incidents').insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location_lat: location?.lat ?? null,
        location_lng: location?.lng ?? null,
        location_description: fullLocationDescription || null,
        is_anonymous: formData.isAnonymous,
        reporter_id: formData.isAnonymous ? null : user.id,
        campus: userProfile?.campus as Database['public']['Enums']['campus_location'] | null,
        signature_data: formData.isAnonymous ? null : signatureData,
      }).select().single();
      if (error || !incident) throw error ?? new Error('The report could not be created.');

      const failedEvidence: string[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${incident.id}/${crypto.randomUUID()}.${extension}`;
        try {
          await uploadEvidenceWithRetry(path, file);
          const { error: metadataError } = await supabase.from('incident_media').insert({
            incident_id: incident.id,
            media_url: path,
            media_type: file.type,
            file_size: file.size,
          });
          if (metadataError) {
            await supabase.storage.from('incident-media').remove([path]);
            throw metadataError;
          }
        } catch {
          failedEvidence.push(file.name);
        }
        setUploadProgress(((index + 1) / Math.max(files.length, 1)) * 100);
      }

      await clearLocalDraft();
      setFormData(EMPTY_FORM);
      setFiles([]);
      setLocation(null);
      setLocationAddress('');
      setConsentAgreed(false);
      setSignatureData('');
      signatureRef.current?.clear();

      toast({
        title: failedEvidence.length ? 'Report saved with an evidence warning' : 'Report submitted successfully',
        description: failedEvidence.length
          ? `The case was saved, but these files could not be attached after retrying: ${failedEvidence.join(', ')}.`
          : 'The report and selected evidence are now available to the authorised campus team.',
        variant: failedEvidence.length ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({ title: 'Report submission failed', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl shadow-medium" data-testid="official-mobile-report-form">
      <CardHeader>
        <CardTitle>Report an Incident</CardTitle>
        <CardDescription>Your unfinished report and selected evidence are restored automatically if the mobile app is interrupted.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <Label>Incident Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData((current) => ({ ...current, category: value as IncidentCategory }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>Title *</Label><Input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="Brief description of the incident" /></div>
          <div className="space-y-2"><Label>What happened? *</Label><Textarea value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} rows={5} placeholder="Provide a factual statement of what happened." /></div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">Incident location</p><p className="text-sm text-muted-foreground">Use GPS or add a building, room, gate or landmark manually.</p></div>
              <Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={gettingLocation}>
                {gettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}{location ? 'Update location' : 'Use my location'}
              </Button>
            </div>
            {locationAddress && <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /><span>{locationAddress}</span></div>}
            <Input value={formData.locationDescription} onChange={(event) => setFormData((current) => ({ ...current, locationDescription: event.target.value }))} placeholder="Building, room, floor or nearby landmark" />
          </div>

          <div className="space-y-2">
            <Label>Photos or evidence</Label>
            <MobileEvidencePicker files={files} onFilesChange={validateAndSetFiles} maxFiles={MAX_EVIDENCE_FILES} disabled={loading} helpText="Up to 3 JPG, PNG, WebP or MP4 files; maximum 10 MB each." />
          </div>

          {loading && uploadProgress > 0 && <div className="space-y-2"><Label>Evidence upload</Label><Progress value={uploadProgress} /></div>}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div><Label>Report anonymously</Label><p className="text-sm text-muted-foreground">Your identity will not be attached to the case.</p></div>
            <Switch checked={formData.isAnonymous} onCheckedChange={(checked) => {
              setFormData((current) => ({ ...current, isAnonymous: checked }));
              if (checked) { setConsentAgreed(false); clearSignature(); }
            }} />
          </div>

          {!formData.isAnonymous && (
            <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-2"><PenTool className="mt-0.5 h-5 w-5 text-primary" /><div><h3 className="font-semibold">Consent declaration</h3><p className="text-sm text-muted-foreground">Confirm the information is accurate and sign below.</p></div></div>
              <div className="flex items-start gap-3 rounded-lg border bg-background p-3"><Checkbox checked={consentAgreed} onCheckedChange={(checked) => setConsentAgreed(checked === true)} id="official-report-consent" /><Label htmlFor="official-report-consent" className="leading-relaxed">I confirm that this report is accurate to the best of my knowledge and consent to an authorised investigation.</Label></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Your signature *</Label><Button type="button" size="sm" variant="ghost" onClick={clearSignature}><Trash2 className="mr-1 h-4 w-4" />Clear</Button></div>
                <div className="overflow-hidden rounded-lg border-2 border-dashed bg-background"><SignatureCanvas ref={signatureRef} canvasProps={{ className: 'h-32 w-full cursor-crosshair', style: { width: '100%', height: '128px' } }} penColor="black" backgroundColor="transparent" onEnd={saveSignature} /></div>
                <p className="text-xs text-muted-foreground">{signatureData ? 'Signature captured and saved with this unfinished draft.' : 'Sign using your finger, stylus or mouse.'}</p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Your sign-in session, current tab, report fields and selected evidence are retained when the mobile camera or file picker temporarily suspends the app.</div>
          <Button type="submit" className="h-12 w-full font-bold" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting securely…</> : <><MapPin className="mr-2 h-4 w-4" />Submit report</>}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
