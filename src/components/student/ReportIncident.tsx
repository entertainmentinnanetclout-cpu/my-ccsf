import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePersistentReportDraft } from '@/hooks/usePersistentReportDraft';
import { useToast } from '@/hooks/use-toast';
import { isAllowedEvidenceFile, normaliseEvidenceMimeType } from '@/lib/evidenceFiles';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Navigation, CheckCircle2, PenTool, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import SignatureCanvas from 'react-signature-canvas';
import type { Database } from '@/integrations/supabase/types';

type IncidentCategory = Database['public']['Enums']['incident_category'];

interface OfficialReportDraft {
  formData: {
    title: string;
    description: string;
    category: IncidentCategory | '';
    locationDescription: string;
    isAnonymous: boolean;
  };
  location: { lat: number; lng: number } | null;
  locationAddress: string;
}

const MAX_EVIDENCE_FILES = 3;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'application/pdf',
] as const;

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CCSF-Campus-Safety-App',
        },
      },
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

export const ReportIncident = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IncidentCategory | '',
    locationDescription: '',
    isAnonymous: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [signatureData, setSignatureData] = useState('');
  const signatureRef = useRef<SignatureCanvas>(null);

  const draftStorageKey = user?.id ? `ccsf:official-report-draft:v1:${user.id}` : null;
  const draftValue = useMemo<OfficialReportDraft>(() => ({
    formData,
    location,
    locationAddress,
  }), [formData, location, locationAddress]);
  const draftDirty = Boolean(
    formData.title.trim()
    || formData.description.trim()
    || formData.category
    || formData.locationDescription.trim()
    || location
    || files.length,
  );
  const {
    saveNow: saveDraftNow,
    clearDraft,
    restoredAt,
    restoredEvidenceNames,
  } = usePersistentReportDraft<OfficialReportDraft>({
    storageKey: draftStorageKey,
    value: draftValue,
    evidenceNames: files.map((file) => file.name),
    enabled: draftDirty,
    onRestore: (draft) => {
      if (draft.formData) setFormData(draft.formData);
      setLocation(draft.location ?? null);
      setLocationAddress(draft.locationAddress ?? '');
      // Consent and handwritten signature are deliberately never restored.
      setConsentAgreed(false);
      setSignatureData('');
    },
  });

  useEffect(() => {
    void getCurrentLocation();
    // The initial location attempt should happen only when the report form first mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories: { value: IncidentCategory; label: string }[] = [
    { value: 'Rape', label: 'Rape' },
    { value: 'Sexual assault', label: 'Sexual Assault' },
    { value: 'Gbv', label: 'Gender-Based Violence (GBV)' },
    { value: 'Murder', label: 'Murder' },
    { value: 'Attempted murder', label: 'Attempted Murder' },
    { value: 'Assault common', label: 'Common Assault' },
    { value: 'Assault GBH', label: 'Assault GBH (Grievous Bodily Harm)' },
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
    { value: 'Sports and Rec Events Act Violation', label: 'Sports & Rec Events Act Violation' },
    { value: 'Crimmen enjuria (Hate speech)', label: 'Crimen Injuria (Hate Speech)' },
    { value: 'Cyber related crime (bullying etc.)', label: 'Cyber Crime / Bullying' },
    { value: 'Vandalism', label: 'Vandalism' },
  ];

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        const address = await reverseGeocode(lat, lng);
        setLocationAddress(address);
        setFormData((previous) => previous.locationDescription
          ? previous
          : { ...previous, locationDescription: address });
        setGettingLocation(false);
        toast({
          title: 'Location captured successfully',
          description: 'Your GPS location has been recorded with a readable address.',
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) message = 'Location permission denied. You can still enter the location manually.';
        else if (error.code === error.POSITION_UNAVAILABLE) message = 'Location unavailable. Please try again.';
        else if (error.code === error.TIMEOUT) message = 'Location request timed out. Please try again.';
        toast({ title: message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const handleFiles = (selected: File[]) => {
    if (selected.length > MAX_EVIDENCE_FILES) {
      toast({
        title: 'Too many evidence files',
        description: `Select no more than ${MAX_EVIDENCE_FILES} files.`,
        variant: 'destructive',
      });
      return;
    }

    const invalid = selected.find((file) => (
      !isAllowedEvidenceFile(file, ALLOWED_EVIDENCE_TYPES)
      || file.size <= 0
      || file.size > MAX_EVIDENCE_BYTES
    ));
    if (invalid) {
      toast({
        title: 'Evidence file not accepted',
        description: `${invalid.name} must be JPG, PNG, WebP, HEIC, HEIF, MP4 or PDF and no larger than 10 MB.`,
        variant: 'destructive',
      });
      return;
    }

    setFiles(selected);
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignatureData('');
  };

  const saveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setSignatureData(signatureRef.current.toDataURL());
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (!formData.category) {
        toast({ title: 'Please select a category', variant: 'destructive' });
        return;
      }
      if (!formData.title.trim()) {
        toast({ title: 'Please enter a title', variant: 'destructive' });
        return;
      }
      if (!formData.description.trim()) {
        toast({ title: 'Please enter a description', variant: 'destructive' });
        return;
      }
      if (!formData.isAnonymous && !consentAgreed) {
        toast({ title: 'Please agree to the consent declaration', variant: 'destructive' });
        return;
      }
      if (!formData.isAnonymous && !signatureData) {
        toast({ title: 'Please sign the consent form', variant: 'destructive' });
        return;
      }

      let fullLocationDescription = formData.locationDescription;
      if (locationAddress && !fullLocationDescription.includes(locationAddress)) {
        fullLocationDescription = fullLocationDescription
          ? `${fullLocationDescription} | GPS: ${locationAddress}`
          : locationAddress;
      }

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category as IncidentCategory,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_description: fullLocationDescription,
          is_anonymous: formData.isAnonymous,
          reporter_id: formData.isAnonymous ? null : user?.id,
          campus: userProfile?.campus as Database['public']['Enums']['campus_location'] | null,
          signature_data: formData.isAnonymous ? null : signatureData,
        })
        .select()
        .single();

      if (error) throw error;

      const failedEvidence: string[] = [];
      if (files.length > 0 && incident) {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const mimeType = normaliseEvidenceMimeType(file);
          const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
          const fileName = `${incident.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from('incident-media')
            .upload(fileName, file, { contentType: mimeType, upsert: false });

          if (uploadError) {
            failedEvidence.push(file.name);
            setUploadProgress(((index + 1) / files.length) * 100);
            continue;
          }

          const { error: metadataError } = await supabase.from('incident_media').insert({
            incident_id: incident.id,
            media_url: fileName,
            media_type: mimeType,
            file_size: file.size,
          });

          if (metadataError) {
            failedEvidence.push(file.name);
            await supabase.storage.from('incident-media').remove([fileName]);
          }
          setUploadProgress(((index + 1) / files.length) * 100);
        }
      }

      toast({
        title: failedEvidence.length ? 'Report submitted with evidence warning' : 'Report submitted successfully!',
        description: failedEvidence.length
          ? `The report was recorded, but these files were not attached: ${failedEvidence.join(', ')}. Open My Cases before retrying or contact campus security.`
          : 'Your incident has been recorded and will be reviewed by campus security.',
        variant: failedEvidence.length ? 'destructive' : 'default',
      });

      setFormData({ title: '', description: '', category: '', locationDescription: '', isAnonymous: false });
      setFiles([]);
      setLocationAddress('');
      setLocation(null);
      setConsentAgreed(false);
      setSignatureData('');
      signatureRef.current?.clear();
      clearDraft();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Report an Incident</CardTitle>
          <CardDescription>Provide details about the incident. Unfinished details save automatically on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Incident Category *</Label>
              <Select value={formData.category} onValueChange={(value: IncidentCategory) => setFormData((previous) => ({ ...previous, category: value }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Brief description of incident"
                value={formData.title}
                onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Statement *</Label>
              <Textarea
                placeholder="Provide your detailed statement of what happened..."
                value={formData.description}
                onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))}
                required
                rows={5}
              />
            </div>

            <div className="space-y-3">
              <Label>Location</Label>
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {location ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Navigation className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-sm font-medium">{location ? 'Location Captured' : 'GPS Location'}</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void getCurrentLocation()} disabled={gettingLocation}>
                    {gettingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                    {gettingLocation ? 'Getting Location...' : location ? 'Refresh Location' : 'Get My Location'}
                  </Button>
                </div>
                {location && <p className="text-sm text-muted-foreground"><span className="font-medium">GPS Coordinates:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>}
                {locationAddress && (
                  <div className="rounded-md border border-success/20 bg-success/10 p-3">
                    <p className="text-sm font-semibold text-success">Full address</p>
                    <p className="mt-1 text-sm text-foreground">{locationAddress}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Additional Location Details</Label>
                <Input
                  placeholder="Building name, room number, or specific area..."
                  value={formData.locationDescription}
                  onChange={(event) => setFormData((previous) => ({ ...previous, locationDescription: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Add the building, floor, room or nearby landmark.</p>
              </div>
            </div>

            <MobileEvidencePicker
              id="incident-evidence"
              label="Photos / Evidence"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,application/pdf"
              files={files}
              onFilesSelected={handleFiles}
              onBeforeOpen={saveDraftNow}
              helpText="Up to 3 JPG, PNG, WebP, HEIC, HEIF, MP4 or PDF files; 10 MB maximum per file."
              restoredEvidenceNames={restoredEvidenceNames}
            />
            {restoredAt && (
              <p className="text-xs text-muted-foreground">
                Saved report details were restored from {new Date(restoredAt).toLocaleString('en-ZA')}. Consent and signature must be confirmed again.
              </p>
            )}

            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} />
                <p className="text-center text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div>
                <Label>Report Anonymously</Label>
                <p className="text-sm text-muted-foreground">Your identity will not be associated with this report.</p>
              </div>
              <Switch
                aria-label="Report anonymously"
                checked={formData.isAnonymous}
                onCheckedChange={(checked) => {
                  setFormData((previous) => ({ ...previous, isAnonymous: checked }));
                  if (checked) {
                    setConsentAgreed(false);
                    setSignatureData('');
                    signatureRef.current?.clear();
                  }
                }}
              />
            </div>

            {!formData.isAnonymous && (
              <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-2">
                  <PenTool className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Consent Declaration</h3>
                    <p className="text-sm text-muted-foreground">Please read and sign to validate your report.</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border bg-background p-4 text-sm">
                  <p className="font-medium">By signing below, I hereby declare that:</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    <li>All information provided is true and accurate to the best of my knowledge.</li>
                    <li>I understand that filing a false report may result in disciplinary action.</li>
                    <li>I consent to TUT Security and relevant authorities investigating this matter.</li>
                    <li>I understand that my identity may be disclosed where the investigation requires it.</li>
                    <li>I agree to cooperate with any investigation that may follow.</li>
                  </ul>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border border-warning/20 bg-warning/10 p-3">
                  <Checkbox id="consent" checked={consentAgreed} onCheckedChange={(checked) => setConsentAgreed(checked === true)} />
                  <label htmlFor="consent" className="cursor-pointer text-sm">
                    I have read, understood and agree to the declaration. I accept responsibility for the accuracy of this report.
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Your Signature *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="text-muted-foreground">
                      <Trash2 className="mr-1 h-4 w-4" />Clear
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded-lg border-2 border-dashed bg-background">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{ className: 'h-32 w-full cursor-crosshair', style: { width: '100%', height: '128px' } }}
                      backgroundColor="transparent"
                      penColor="black"
                      onEnd={saveSignature}
                    />
                  </div>
                  {signatureData
                    ? <p className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3 w-3" />Signature captured</p>
                    : <p className="text-xs text-muted-foreground">Sign above using your mouse or finger.</p>}
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting Report...</> : 'Submit Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};