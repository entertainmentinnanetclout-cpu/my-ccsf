import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const write = (path, content) => writeFileSync(path, content);
const replace = (path, from, to) => {
  const current = read(path);
  if (current.includes(to)) return;
  if (!current.includes(from)) throw new Error(`Patch anchor not found in ${path}: ${from.slice(0, 100)}`);
  write(path, current.replace(from, to));
};

// ---------------------------------------------------------------------------
// Canonical branding: one official TUT + CCSF/CPS lockup on Safety Quest.
// ---------------------------------------------------------------------------
replace(
  'src/features/safety-quest/SafetyQuestGame.tsx',
  "import cpsLogo from '@/assets/CPS Campus Protection Services logo(1).png';\n",
  '',
);
replace(
  'src/features/safety-quest/SafetyQuestGame.tsx',
  `<div className="safety-quest-brand-lockup" aria-label="TUT, CCSF and Campus Protection Services partnership">
                  <div className="safety-quest-brand-tut">
                    <InstitutionBrand
                      size="compact"
                      themeOverride="dark"
                      className="w-full justify-center"
                      ccsfClassName="!w-auto"
                      tutClassName="!w-auto"
                    />
                  </div>
                  <div className="safety-quest-brand-community">
                    <img src={cpsLogo} alt="Campus Protection Services" />
                  </div>
                </div>`,
  `<div className="safety-quest-brand-lockup" aria-label="Tshwane University of Technology and Campus Community Safety Forum">
                  <div className="safety-quest-brand-tut safety-quest-brand-tut--single">
                    <InstitutionBrand
                      size="compact"
                      themeOverride="dark"
                      className="w-full justify-center"
                      ccsfClassName="!w-auto"
                      tutClassName="!w-auto"
                    />
                  </div>
                </div>`,
);
replace(
  'src/features/safety-quest/safety-quest.css',
  `.safety-quest-brand-tut {
  width: 13.5rem;`,
  `.safety-quest-brand-tut {
  width: min(22rem, calc(100vw - 2.3rem));`,
);
replace(
  'scripts/verify-safety-quest-release.mjs',
  `requireMatch(game, /safety-quest-brand-lockup[\\s\\S]*<InstitutionBrand\\b[\\s\\S]*cpsLogo/, 'TUT/CCSF shared branding and the CPS mark must remain in the game scene.');`,
  `requireMatch(game, /safety-quest-brand-lockup[\\s\\S]*<InstitutionBrand\\b/, 'Safety Quest must use one canonical TUT and CCSF/CPS institutional lockup.');
if (game.includes('cpsLogo')) throw new Error('Safety Quest must not render a duplicate CPS logo beside the canonical institutional lockup.');`,
);

// ---------------------------------------------------------------------------
// Evidence compatibility: normalize missing MIME values and accept modern
// mobile video containers while keeping validation explicit.
// ---------------------------------------------------------------------------
write('src/lib/evidenceProcessing.ts', `const HEIC_TYPES = new Set(['image/heic', 'image/heif']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', ...HEIC_TYPES]);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/3gpp2']);
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', '3gp': 'video/3gpp', '3g2': 'video/3gpp2',
  pdf: 'application/pdf',
};

export interface EvidencePreparationOptions { allowPdf?: boolean; maxBytes: number; maxDimension?: number; compressAboveBytes?: number; jpegQuality?: number }
export interface EvidenceManifestItem { path: string; original_filename: string; mime_type: string; size_bytes: number; checksum: string }

function extensionOf(name: string): string { return name.split('.').pop()?.trim().toLowerCase() ?? ''; }
export function normaliseEvidenceMimeType(file: File): string {
  const type = file.type.trim().toLowerCase();
  if (type && type !== 'application/octet-stream') return type;
  return MIME_BY_EXTENSION[extensionOf(file.name)] ?? type;
}
export function evidenceFileIdentity(file: File): string { return \`\${file.name}:\${file.size}:\${file.lastModified}:\${normaliseEvidenceMimeType(file)}\`; }
export function isAllowedEvidenceFile(file: File, allowPdf = false): boolean {
  const type = normaliseEvidenceMimeType(file);
  return IMAGE_TYPES.has(type) || VIDEO_TYPES.has(type) || (allowPdf && type === 'application/pdf');
}

function withNormalisedMime(file: File): File {
  const type = normaliseEvidenceMimeType(file);
  if (!type || type === file.type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified || Date.now() });
}

async function loadImageSource(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* Safari may decode through HTMLImageElement. */ }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(\`\${file.name} could not be decoded on this device. Save HEIC/HEIF evidence as JPEG or PNG and try again.\`));
    image.src = url;
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}
function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The image could not be converted.')), type, quality));
}
async function convertOrCompressImage(file: File, options: Required<Pick<EvidencePreparationOptions, 'maxDimension' | 'compressAboveBytes' | 'jpegQuality'>>): Promise<File> {
  const type = normaliseEvidenceMimeType(file);
  const needsConversion = HEIC_TYPES.has(type);
  const needsCompression = file.size > options.compressAboveBytes;
  if (!needsConversion && !needsCompression) return withNormalisedMime(file);
  const loaded = await loadImageSource(file);
  try {
    const scale = Math.min(1, options.maxDimension / Math.max(loaded.width, loaded.height));
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Image processing is not supported by this browser.');
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, width, height); context.drawImage(loaded.source, 0, 0, width, height);
    const outputType = needsConversion ? 'image/jpeg' : type === 'image/png' ? 'image/webp' : type;
    const blob = await canvasBlob(canvas, outputType, options.jpegQuality);
    const outputExtension = outputType === 'image/webp' ? 'webp' : outputType === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\\.[^.]+$/, '') || 'evidence';
    const converted = new File([blob], \`\${baseName}.\${outputExtension}\`, { type: outputType, lastModified: file.lastModified || Date.now() });
    return converted.size < file.size || needsConversion ? converted : withNormalisedMime(file);
  } finally { loaded.close(); }
}
export async function evidenceChecksum(file: Blob): Promise<string> {
  if (!crypto.subtle) return '';
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}
export async function prepareEvidenceFile(file: File, options: EvidencePreparationOptions): Promise<File> {
  if (file.size <= 0) throw new Error(\`\${file.name} is empty.\`);
  const normalized = withNormalisedMime(file);
  if (!isAllowedEvidenceFile(normalized, options.allowPdf)) throw new Error(\`\${file.name} is not an accepted evidence format.\`);
  const prepared = IMAGE_TYPES.has(normaliseEvidenceMimeType(normalized)) ? await convertOrCompressImage(normalized, {
    maxDimension: options.maxDimension ?? 2560,
    compressAboveBytes: options.compressAboveBytes ?? 2 * 1024 * 1024,
    jpegQuality: options.jpegQuality ?? 0.86,
  }) : normalized;
  if (prepared.size > options.maxBytes) throw new Error(\`\${prepared.name} is \${(prepared.size / (1024 * 1024)).toFixed(1)} MB after processing and exceeds the \${(options.maxBytes / (1024 * 1024)).toFixed(0)} MB limit.\`);
  return prepared;
}
export async function prepareEvidenceFiles(files: File[], options: EvidencePreparationOptions): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) prepared.push(await prepareEvidenceFile(file, options));
  return prepared;
}
export function revokePreviewUrls(urls: string[]): void { urls.forEach((url) => URL.revokeObjectURL(url)); }
`);

replace(
  'src/components/shared/MobileEvidencePicker.tsx',
  `accept="video/mp4" capture="environment"`,
  `accept="video/mp4,video/quicktime,video/webm,video/3gpp,video/3gpp2,.mov,.m4v,.webm,.3gp,.3g2" capture="environment"`,
);
replace(
  'src/components/shared/MobileEvidencePicker.tsx',
  `accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4"`,
  `accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/3gpp,video/3gpp2,.mov,.m4v,.webm,.3gp,.3g2"`,
);
replace(
  'src/services/evidenceSubmissionService.ts',
  `import { evidenceChecksum, evidenceFileIdentity, type EvidenceManifestItem } from '@/lib/evidenceProcessing';`,
  `import { evidenceChecksum, evidenceFileIdentity, normaliseEvidenceMimeType, type EvidenceManifestItem } from '@/lib/evidenceProcessing';`,
);
replace(
  'src/services/evidenceSubmissionService.ts',
  `manifest.push({ path, original_filename: file.name, mime_type: file.type, size_bytes: file.size, checksum });`,
  `manifest.push({ path, original_filename: file.name, mime_type: normaliseEvidenceMimeType(file), size_bytes: file.size, checksum });`,
);
for (const path of ['src/components/student/ReportIncidentV2.tsx', 'src/components/pilot/PilotReportFormV2.tsx']) {
  const current = read(path);
  if (current.includes('const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;')) {
    write(path, current.replace('const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;', 'const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;'));
  }
}

// ---------------------------------------------------------------------------
// Profile media: larger originals, deterministic standard output, accessible
// controls, no timestamped object accumulation.
// ---------------------------------------------------------------------------
write('src/components/shared/AvatarUpload.tsx', `import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { prepareEvidenceFile } from '@/lib/evidenceProcessing';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onUploadComplete?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const AvatarUpload = ({ userId, currentAvatarUrl, userName, onUploadComplete, size = 'lg' }: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => setAvatarUrl(currentAvatarUrl), [currentAvatarUrl]);

  const sizeClasses = { sm: 'h-12 w-12', md: 'h-20 w-20', lg: 'h-24 w-24' };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !userId) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: 'Photo is too large', description: 'Choose an original image smaller than 25 MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const prepared = await prepareEvidenceFile(file, {
        maxBytes: 1.8 * 1024 * 1024,
        maxDimension: 1024,
        compressAboveBytes: 1,
        jpegQuality: 0.88,
      });
      const extension = EXTENSION_BY_MIME[prepared.type];
      if (!extension) throw new Error('This photo could not be converted to a supported profile-image format.');

      const folder = userId;
      const { data: existing } = await supabase.storage.from('avatars').list(folder, { limit: 20 });
      const stalePaths = (existing ?? []).map((item) => \`\${folder}/\${item.name}\`);
      if (stalePaths.length) await supabase.storage.from('avatars').remove(stalePaths);

      const objectPath = \`\${folder}/avatar.\${extension}\`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(objectPath, prepared, {
        cacheControl: '3600',
        contentType: prepared.type,
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      const versionedUrl = \`\${publicUrl}?v=\${Date.now()}\`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: versionedUrl }).eq('id', userId);
      if (updateError) throw updateError;

      setAvatarUrl(versionedUrl);
      onUploadComplete?.(versionedUrl);
      toast({ title: 'Profile photo updated', description: 'Your new image is ready across My CCSF.' });
    } catch (error) {
      toast({ title: 'Profile photo upload failed', description: error instanceof Error ? error.message : 'Try a JPEG, PNG or WebP image.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const initials = userName?.split(/\\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="relative inline-block">
      <Avatar className={\`\${sizeClasses[size]} border-2 border-border shadow-sm\`}>
        <AvatarImage src={avatarUrl || undefined} alt={userName ? \`\${userName} profile photo\` : 'Student profile photo'} />
        <AvatarFallback className="bg-primary/10 font-bold text-primary">{initials}</AvatarFallback>
      </Avatar>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(event) => void handleFileSelect(event)}
        className="sr-only"
        disabled={isUploading}
        aria-label="Choose a profile photo"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute -bottom-2 -right-2 h-11 w-11 touch-manipulation rounded-full border-2 border-background shadow-lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={isUploading ? 'Uploading profile photo' : 'Upload profile photo'}
      >
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </Button>
    </div>
  );
};
`);

// ---------------------------------------------------------------------------
// Emergency path: server-routed case creation, safe-area controls and truthful
// delivery messaging.
// ---------------------------------------------------------------------------
write('src/components/student/EmergencyReport.tsx', `import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, MapPin, Radio, StopCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { captureBrowserPosition, normalizeGeolocationError } from '@/lib/browserGeolocation';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';
import { CampusEmergencyContact } from './CampusEmergencyContact';
import type { Database } from '@/integrations/supabase/types';

type IncidentCategory = Database['public']['Enums']['incident_category'];
const EMERGENCY_TYPES: Array<{ value: IncidentCategory; label: string }> = [
  { value: 'Public violence', label: 'Immediate danger / feeling unsafe' },
  { value: 'Assault common', label: 'Assault or threat' },
  { value: 'Assault GBH', label: 'Serious physical assault' },
  { value: 'Gbv', label: 'Gender-based violence' },
  { value: 'Armed robbery', label: 'Armed threat or robbery' },
  { value: 'Arson', label: 'Fire or suspected arson' },
  { value: 'Attempted murder', label: 'Life-threatening attack' },
];

export const EmergencyReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [category, setCategory] = useState<IncidentCategory>('Public violence');
  const [details, setDetails] = useState('I need immediate safety assistance.');
  const [locationPreview, setLocationPreview] = useState('');
  const { startTracking, stopTracking, isTracking } = useLocationTracking();

  const reset = () => {
    setConsentAgreed(false);
    setCategory('Public violence');
    setDetails('I need immediate safety assistance.');
    setLocationPreview('');
  };

  const sendEmergencyReport = async () => {
    if (!user || !consentAgreed || details.trim().length < 5) {
      toast({ title: 'Complete the emergency declaration', description: 'Choose the emergency type, add a short description and confirm the declaration.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      let accuracy: number | null = null;
      let address: string | null = null;
      try {
        const { position } = await captureBrowserPosition();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracy = position.coords.accuracy ?? null;
        const resolved = await reverseGeocodeCoordinates(latitude, longitude);
        address = resolved.address ?? formatCoordinatePair(latitude, longitude);
        setLocationPreview(\`\${address}\${accuracy ? \` · ±\${Math.round(accuracy)} m\` : ''}\`);
      } catch (locationError) {
        const normalized = normalizeGeolocationError(locationError);
        toast({ title: 'Location unavailable', description: \`The emergency case will still be created. \${normalized.message}\` });
      }

      const { data, error } = await supabase.rpc('create_emergency_alert' as never, {
        p_category: category,
        p_reason: details.trim(),
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy_meters: accuracy,
        p_location_description: address,
      } as never);
      if (error || !data) throw error ?? new Error('The emergency case could not be created.');
      const incident = data as unknown as { id: string };
      startTracking(incident.id);

      toast({
        title: 'Emergency case created',
        description: 'Your case is in the official CCSF/CPS queue. Use the verified emergency contact below for immediate voice assistance.',
      });
      setOpen(false);
      reset();
    } catch (error) {
      toast({ title: 'Emergency case not delivered', description: error instanceof Error ? error.message : 'Use the verified campus emergency contact immediately.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {isTracking && (
        <motion.div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.75rem)] right-[max(1rem,env(safe-area-inset-right))] z-[60] md:bottom-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl bg-destructive p-3 text-destructive-foreground shadow-2xl">
            <Radio className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold sm:text-sm">Live tracking active while My CCSF is open</span>
            <Button size="sm" variant="ghost" className="h-9 shrink-0 hover:bg-white/10" onClick={stopTracking}>
              <StopCircle className="mr-1 h-4 w-4" />Stop
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-[max(1rem,env(safe-area-inset-right))] z-[60] md:bottom-6"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="icon"
          variant="destructive"
          className="h-14 w-14 touch-manipulation rounded-full border-2 border-white/70 shadow-[0_14px_35px_rgba(190,18,60,0.42)] ring-4 ring-destructive/20"
          onClick={() => setOpen(true)}
          aria-label="Open emergency safety alert"
          data-testid="emergency-safety-button"
        >
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) reset(); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-destructive"><AlertTriangle className="h-6 w-6" />Emergency safety alert</DialogTitle>
            <DialogDescription>Create an official high-priority case and share the best location your device can provide.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Emergency type</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMERGENCY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency-details">What is happening?</Label>
              <Textarea id="emergency-details" value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} />
              <p className="text-xs text-muted-foreground">Do not include information that is not needed for immediate assistance.</p>
            </div>

            {locationPreview && (
              <div className="rounded-xl border border-success/25 bg-success/10 p-3">
                <p className="flex items-center gap-2 text-xs font-bold text-success"><MapPin className="h-4 w-4" />Location captured</p>
                <p className="mt-1 text-sm">{locationPreview}</p>
              </div>
            )}

            <div className="rounded-xl border border-warning/25 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <Checkbox id="emergency-consent" checked={consentAgreed} onCheckedChange={(checked) => setConsentAgreed(checked === true)} />
                <Label htmlFor="emergency-consent" className="cursor-pointer leading-5">I confirm this is a genuine emergency and consent to sharing my profile identity and current location with authorised safety personnel.</Label>
              </div>
            </div>
            <CampusEmergencyContact />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
            <Button variant="destructive" onClick={() => void sendEmergencyReport()} disabled={sending || !consentAgreed}>
              {sending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating case…</> : 'Send alert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
`);

write('src/hooks/useLocationTracking.ts', `import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCoordinatePair, reverseGeocodeCoordinates } from '@/lib/reverseGeocode';

const STORAGE_KEY = 'emergency_tracking:v2';
const MAX_ACCURACY_METERS = 250;
const MIN_SEND_INTERVAL_MS = 15000;
const STATUS_INTERVAL_MS = 60000;
const MAX_TRACKING_DURATION_MS = 6 * 60 * 60 * 1000;

interface TrackingState { incidentId: string; startedAt: string }

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useLocationTracking = () => {
  const watchIdRef = useRef<number | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentRef = useRef<{ latitude: number; longitude: number; at: number } | null>(null);
  const sendingRef = useRef(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);

  const clearRuntime = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    watchIdRef.current = null;
    statusTimerRef.current = null;
    lastSentRef.current = null;
  }, []);

  const stopTracking = useCallback(() => {
    clearRuntime();
    localStorage.removeItem(STORAGE_KEY);
    setIsTracking(false);
    setCurrentIncidentId(null);
  }, [clearRuntime]);

  const checkActive = useCallback(async (incidentId: string) => {
    const { data, error } = await supabase.from('incidents').select('status').eq('id', incidentId).maybeSingle();
    return !error && data && data.status !== 'resolved' && data.status !== 'rejected';
  }, []);

  const sendPosition = useCallback(async (incidentId: string, position: GeolocationPosition) => {
    if (sendingRef.current || position.coords.accuracy > MAX_ACCURACY_METERS) return;
    const now = Date.now();
    const previous = lastSentRef.current;
    const moved = previous ? distanceMeters(previous.latitude, previous.longitude, position.coords.latitude, position.coords.longitude) : Infinity;
    if (previous && now - previous.at < MIN_SEND_INTERVAL_MS && moved < 10) return;

    sendingRef.current = true;
    try {
      const resolved = await reverseGeocodeCoordinates(position.coords.latitude, position.coords.longitude);
      const label = resolved.address ?? formatCoordinatePair(position.coords.latitude, position.coords.longitude);
      const { error } = await supabase.rpc('record_emergency_location_update' as never, {
        p_incident_id: incidentId,
        p_latitude: position.coords.latitude,
        p_longitude: position.coords.longitude,
        p_accuracy_meters: position.coords.accuracy ?? null,
        p_location_description: label,
      } as never);
      if (!error) lastSentRef.current = { latitude: position.coords.latitude, longitude: position.coords.longitude, at: now };
    } finally {
      sendingRef.current = false;
    }
  }, []);

  const beginWatch = useCallback((incidentId: string) => {
    clearRuntime();
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(incidentId, position),
      () => undefined,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
    );
    statusTimerRef.current = setInterval(() => {
      void checkActive(incidentId).then((active) => { if (!active) stopTracking(); });
    }, STATUS_INTERVAL_MS);
  }, [checkActive, clearRuntime, sendPosition, stopTracking]);

  const startTracking = useCallback((incidentId: string) => {
    const state: TrackingState = { incidentId, startedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setCurrentIncidentId(incidentId);
    setIsTracking(true);
    beginWatch(incidentId);
  }, [beginWatch]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return () => clearRuntime();
    try {
      const state = JSON.parse(raw) as TrackingState;
      const startedAt = new Date(state.startedAt).getTime();
      if (!state.incidentId || !Number.isFinite(startedAt) || Date.now() - startedAt > MAX_TRACKING_DURATION_MS) {
        stopTracking();
        return () => clearRuntime();
      }
      void checkActive(state.incidentId).then((active) => {
        if (!active) { stopTracking(); return; }
        setCurrentIncidentId(state.incidentId);
        setIsTracking(true);
        beginWatch(state.incidentId);
      });
    } catch {
      stopTracking();
    }
    return () => clearRuntime();
  }, [beginWatch, checkActive, clearRuntime, stopTracking]);

  return { startTracking, stopTracking, isTracking, currentIncidentId };
};
`);

// Anonymous reports remain visible to the submitting student without exposing
// their identity in the case itself.
replace(
  'src/components/student/MyCaseReports.tsx',
  `.eq('reporter_id', user.id)
        .order('created_at', { ascending: false });`,
  `.or(\`reporter_id.eq.\${user.id},submitted_by.eq.\${user.id}\`)
        .order('created_at', { ascending: false });`,
);
replace(
  'src/components/student/MyCaseReports.tsx',
  `          table: 'incidents',
          filter: \`reporter_id=eq.\${user.id}\`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {`,
  `          table: 'incidents',
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as Incident;
          if (record.reporter_id !== user.id && record.submitted_by !== user.id) return;
          if (payload.eventType === 'UPDATE') {`,
);
replace('src/components/student/MyCaseReports.tsx', `<h4 className="font-semibold mb-2 text-primary dark:text-[#F2A900]">📍 Location Details</h4>`, `<h4 className="font-semibold mb-2 text-primary dark:text-[#F2A900]">Location details</h4>`);
replace('src/components/student/MyCaseReports.tsx', `<h4 className="font-semibold mb-2 text-success">✅ Resolution</h4>`, `<h4 className="font-semibold mb-2 text-success">Official resolution</h4>`);

// Exact Radar sharing now fails closed when the device cannot provide an
// institutional-quality fix. Approximate sharing remains consent-based.
replace(
  'src/hooks/useSafetyMobility.ts',
  `    const fix = location ?? await captureNow();
    await setSafetyPresence({ ...input, campus, location: fix });`,
  `    const fix = location ?? await captureNow();
    if (next.visibility === 'campus_exact' && (fix.accuracy === null || fix.accuracy > 50)) {
      throw new Error('Exact Radar sharing requires a fresh GPS fix accurate to 50 metres or better. Move outdoors, enable Precise Location, and try again.');
    }
    await setSafetyPresence({ ...input, campus, location: fix });`,
);

// ---------------------------------------------------------------------------
// Audit record and release verifier.
// ---------------------------------------------------------------------------
write('docs/audits/INSTITUTIONAL_HARDENING_AUDIT_2026-08.md', `# My CCSF Institutional Hardening Audit — August 2026

## Phase 1: Security and mobile reliability

This release addresses verified implementation defects before any visual 3D or map expansion:

- protects incident status, assignment, resolution and campus routing from student-side mutation;
- derives official case campus from the authenticated profile;
- validates report payload lengths, coordinates, signatures and evidence manifests on the server;
- routes emergency creation and live location updates through vetted RPCs;
- makes the emergency control safe-area aware and touch-accessible on iOS and Android;
- normalises evidence MIME types and supports MP4, MOV/QuickTime, WebM and 3GP mobile video evidence;
- raises the private evidence video limit to 25 MB while retaining 10 MB for images and PDFs;
- fixes anonymous reports disappearing from My Cases;
- improves avatar conversion, touch target size and stale-object cleanup;
- rejects poor-quality fixes for exact Campus Radar sharing;
- removes the duplicate CPS mark from the Safety Quest header;
- removes dormant anonymous brand-transfer storage policies;
- adds missing evidence and safety-mobility indexes.

## Deferred to Phase 2

- first-party interactive Campus Safety Radar map;
- verified Pretoria West building/office/route data model;
- accuracy circles, safety zones, internal navigation and 2.5D/3D building overlays;
- removal of generic placeholder landmarks and external Google map dependencies.

## Deferred to Phase 3

- institutional case-card and timeline redesign;
- private/signed avatar delivery architecture;
- unified high-resolution asset pipeline, adaptive media and premium motion system;
- full accessibility and cross-device visual regression suite.
`);

write('scripts/verify-institutional-hardening-phase-1.mjs', `import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(\`../\${path}\`, import.meta.url), 'utf8');
const requireText = (content, text, message) => { if (!content.includes(text)) throw new Error(message); };

const migration = read('supabase/migrations/20260804160000_institutional_hardening_phase_1.sql');
const emergency = read('src/components/student/EmergencyReport.tsx');
const tracking = read('src/hooks/useLocationTracking.ts');
const evidence = read('src/lib/evidenceProcessing.ts');
const picker = read('src/components/shared/MobileEvidencePicker.tsx');
const submission = read('src/services/evidenceSubmissionService.ts');
const avatar = read('src/components/shared/AvatarUpload.tsx');
const cases = read('src/components/student/MyCaseReports.tsx');
const quest = read('src/features/safety-quest/SafetyQuestGame.tsx');

for (const marker of ['incidents_workflow_integrity', 'evidence_submission_integrity', 'create_emergency_alert', 'record_emergency_location_update', 'student_safety_presence_quality']) requireText(migration, marker, \`Missing database hardening marker: \${marker}\`);
requireText(migration, 'video/quicktime', 'Database and storage must support iOS QuickTime evidence.');
requireText(migration, 'temporary brand transfer insert', 'Dormant anonymous brand-transfer policy cleanup is missing.');
requireText(emergency, 'env(safe-area-inset-bottom)', 'Emergency button must respect mobile safe areas.');
requireText(emergency, "rpc('create_emergency_alert'", 'Emergency creation must use the vetted server function.');
requireText(tracking, "rpc('record_emergency_location_update'", 'Emergency location updates must use the vetted server function.');
if (tracking.includes(".from('incidents').update")) throw new Error('Client-side direct incident location mutation must be removed.');
requireText(evidence, 'video/quicktime', 'Evidence processing must recognise modern iOS video.');
requireText(picker, '.mov', 'Mobile picker must expose MOV/QuickTime selection.');
requireText(submission, 'normaliseEvidenceMimeType(file)', 'Evidence manifests must not use an empty raw browser MIME value.');
requireText(avatar, 'maxDimension: 1024', 'Avatar processing must produce a high-quality standard image.');
requireText(avatar, 'h-11 w-11', 'Avatar control must meet a mobile touch target.');
requireText(cases, 'submitted_by.eq.', 'Anonymous submissions must remain visible in My Cases.');
if (quest.includes('cpsLogo')) throw new Error('Safety Quest still renders a duplicate CPS logo.');

console.log('Institutional hardening Phase 1 verification passed.');
`);

// Add the verifier to package scripts without reformatting the package file.
replace(
  'package.json',
  `"test:safety-quest": "node scripts/verify-safety-quest-release.mjs",`,
  `"test:safety-quest": "node scripts/verify-safety-quest-release.mjs",\n    "test:institutional-hardening": "node scripts/verify-institutional-hardening-phase-1.mjs",`,
);

console.log('Institutional hardening Phase 1 patch applied.');
