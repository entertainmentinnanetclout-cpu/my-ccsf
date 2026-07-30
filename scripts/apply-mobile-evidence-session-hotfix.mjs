import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function update(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const before = fs.readFileSync(filePath, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`[mobile-evidence] ${relativePath}: already current`);
    return;
  }
  fs.writeFileSync(filePath, after);
  console.log(`[mobile-evidence] ${relativePath}: updated`);
}

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`Patch anchor not found: ${label}`);
  return source.replace(search, replacement);
}

update('src/components/pilot/PilotStudentDashboard.tsx', (source) => {
  source = replaceOnce(
    source,
    "import { usePilotGuide } from '@/hooks/pilot/usePilotGuide';\n",
    "import { usePilotGuide } from '@/hooks/pilot/usePilotGuide';\nimport { useUrlBackedView } from '@/hooks/useUrlBackedView';\n",
    'Pilot dashboard URL-backed view import',
  );
  source = replaceOnce(
    source,
    "type View = 'home' | 'mycases' | 'report' | 'map' | 'support';\n",
    "type View = 'home' | 'mycases' | 'report' | 'map' | 'support';\nconst PILOT_VIEWS = new Set<View>(['home', 'mycases', 'report', 'map', 'support']);\n",
    'Pilot dashboard view registry',
  );
  source = replaceOnce(
    source,
    "  const [view, setView] = useState<View>('home');\n",
    "  const [view, setView] = useUrlBackedView<View>({\n    searchParams,\n    setSearchParams,\n    parameter: 'tab',\n    allowedValues: PILOT_VIEWS,\n    defaultValue: 'home',\n  });\n",
    'Pilot dashboard persistent view state',
  );
  source = replaceOnce(
    source,
    "    setScenarioId(academicFraudScenario.id);\n    setView('report');\n    const next = new URLSearchParams(searchParams);\n    next.delete('open');\n    setSearchParams(next, { replace: true });",
    "    setScenarioId(academicFraudScenario.id);\n    setView('report');\n    const next = new URLSearchParams(searchParams);\n    next.delete('open');\n    next.set('tab', 'report');\n    setSearchParams(next, { replace: true });",
    'Pilot academic fraud return route',
  );
  return source;
});

update('src/components/pilot/PilotReportForm.tsx', (source) => {
  source = replaceOnce(
    source,
    "import { AcademicFraudLaunchCard, ACADEMIC_FRAUD_REPORT_TYPES } from '@/components/shared/AcademicFraudLaunchCard';\n",
    "import { AcademicFraudLaunchCard, ACADEMIC_FRAUD_REPORT_TYPES } from '@/components/shared/AcademicFraudLaunchCard';\nimport { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';\n",
    'Pilot mobile evidence picker import',
  );
  source = source.replace("import { Input } from '@/components/ui/input';\n", '');
  source = replaceOnce(
    source,
    "import { useToast } from '@/hooks/use-toast';\n",
    "import { useToast } from '@/hooks/use-toast';\nimport { usePersistentReportDraft } from '@/hooks/usePersistentReportDraft';\n",
    'Pilot draft hook import',
  );
  source = replaceOnce(
    source,
    "interface CapturedLocation {\n  latitude: number;\n  longitude: number;\n  accuracy: number | null;\n}\n",
    "interface CapturedLocation {\n  latitude: number;\n  longitude: number;\n  accuracy: number | null;\n}\n\ninterface PilotReportDraft {\n  description: string;\n  category: IncidentCategory | '';\n  academicServiceType: string;\n  locationDescription: string;\n  location: CapturedLocation | null;\n  anonymous: boolean;\n}\n",
    'Pilot draft type',
  );
  source = replaceOnce(
    source,
    "  const [loading, setLoading] = useState(false);\n  const [locationLoading, setLocationLoading] = useState(false);\n\n  useEffect(() => setWorkingSession(session), [session]);",
    "  const [loading, setLoading] = useState(false);\n  const [locationLoading, setLocationLoading] = useState(false);\n\n  const draftStorageKey = emergency ? null : `ccsf:pilot-report-draft:v1:${participant.user_id}:${scenario.id}`;\n  const draftValue = useMemo<PilotReportDraft>(() => ({\n    description,\n    category,\n    academicServiceType,\n    locationDescription,\n    location,\n    anonymous,\n  }), [academicServiceType, anonymous, category, description, location, locationDescription]);\n  const draftDirty = Boolean(\n    description.trim() || category || academicServiceType || locationDescription.trim() || location || files.length || anonymous,\n  );\n  const {\n    saveNow: saveDraftNow,\n    clearDraft,\n    restoredAt,\n    restoredEvidenceNames,\n  } = usePersistentReportDraft<PilotReportDraft>({\n    storageKey: draftStorageKey,\n    value: draftValue,\n    evidenceNames: files.map((file) => file.name),\n    enabled: !emergency && draftDirty,\n    onRestore: (draft) => {\n      setDescription(draft.description ?? '');\n      setCategory(draft.category ?? '');\n      setAcademicServiceType(draft.academicServiceType ?? '');\n      setLocationDescription(draft.locationDescription ?? '');\n      setLocation(draft.location ?? null);\n      setAnonymous(Boolean(draft.anonymous));\n    },\n  });\n\n  useEffect(() => setWorkingSession(session), [session]);",
    'Pilot draft persistence state',
  );
  source = replaceOnce(
    source,
    "                <div className=\"space-y-2\">\n                  <Label htmlFor={`pilot-files-${scenario.id}`}>{academicFraud ? 'Attach screenshots, PDFs, payment proof or media *' : 'Add photos, video or a document'}</Label>\n                  <Input\n                    id={`pilot-files-${scenario.id}`}\n                    type=\"file\"\n                    multiple\n                    accept=\"image/jpeg,image/png,image/webp,video/mp4,application/pdf\"\n                    onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}\n                  />\n                  <p className=\"text-xs text-muted-foreground\">Up to {PILOT_MAX_ATTACHMENTS} files, maximum 10 MB each. Original files remain private and are served through controlled access.</p>\n                  {files.length > 0 && <p className=\"text-sm font-medium\">{files.length} file{files.length === 1 ? '' : 's'} ready: {files.map((file) => file.name).join(', ')}</p>}\n                </div>",
    "                <MobileEvidencePicker\n                  id={`pilot-files-${scenario.id}`}\n                  label={academicFraud ? 'Attach screenshots, PDFs, payment proof or media' : 'Add photos, video or a document'}\n                  accept=\"image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,application/pdf\"\n                  files={files}\n                  onFilesSelected={handleFiles}\n                  onBeforeOpen={saveDraftNow}\n                  helpText={`Up to ${PILOT_MAX_ATTACHMENTS} files, maximum 10 MB each. Original files remain private and are served through controlled access.`}\n                  required={requiresAttachment}\n                  restoredEvidenceNames={restoredEvidenceNames}\n                />\n                {restoredAt && <p className=\"text-xs text-muted-foreground\">Saved report details were restored from {new Date(restoredAt).toLocaleString('en-ZA')}.</p>}",
    'Pilot file input replacement',
  );
  source = replaceOnce(
    source,
    "      navigate(PILOT_ROUTES.report(report.id));",
    "      clearDraft();\n      navigate(PILOT_ROUTES.report(report.id));",
    'Pilot clear draft after submission',
  );
  return source;
});

update('src/components/student/ReportIncident.tsx', (source) => {
  source = source.replace("import { useState, useEffect, useRef } from 'react';", "import { useState, useEffect, useMemo, useRef } from 'react';");
  source = source.replace("import { MapPin, Loader2, Camera, Navigation, CheckCircle2, PenTool, Trash2 } from 'lucide-react';", "import { MapPin, Loader2, Navigation, CheckCircle2, PenTool, Trash2 } from 'lucide-react';");
  source = replaceOnce(
    source,
    "import type { Database } from '@/integrations/supabase/types';\n",
    "import type { Database } from '@/integrations/supabase/types';\nimport { MobileEvidencePicker } from '@/components/shared/MobileEvidencePicker';\nimport { usePersistentReportDraft } from '@/hooks/usePersistentReportDraft';\nimport { isAllowedEvidenceFile, normaliseEvidenceMimeType } from '@/lib/evidenceFiles';\n",
    'Official evidence helpers',
  );
  source = replaceOnce(
    source,
    "const ALLOWED_EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);\n",
    "const ALLOWED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'application/pdf'] as const;\n",
    'Official mobile MIME list',
  );
  source = replaceOnce(
    source,
    "type IncidentCategory = Database['public']['Enums']['incident_category'];\n\nconst MAX_EVIDENCE_FILES",
    "type IncidentCategory = Database['public']['Enums']['incident_category'];\n\ninterface OfficialReportDraft {\n  formData: {\n    title: string;\n    description: string;\n    category: IncidentCategory | '';\n    locationDescription: string;\n    isAnonymous: boolean;\n  };\n  location: { lat: number; lng: number } | null;\n  locationAddress: string;\n}\n\nconst MAX_EVIDENCE_FILES",
    'Official report draft type',
  );
  source = replaceOnce(
    source,
    "  const signatureRef = useRef<SignatureCanvas>(null);\n\n  // Auto-fetch location on component mount",
    "  const signatureRef = useRef<SignatureCanvas>(null);\n\n  const draftStorageKey = user?.id ? `ccsf:official-report-draft:v1:${user.id}` : null;\n  const draftValue = useMemo<OfficialReportDraft>(() => ({\n    formData,\n    location,\n    locationAddress,\n  }), [formData, location, locationAddress]);\n  const draftDirty = Boolean(\n    formData.title.trim() || formData.description.trim() || formData.category || formData.locationDescription.trim() || files.length,\n  );\n  const {\n    saveNow: saveDraftNow,\n    clearDraft,\n    restoredAt,\n    restoredEvidenceNames,\n  } = usePersistentReportDraft<OfficialReportDraft>({\n    storageKey: draftStorageKey,\n    value: draftValue,\n    evidenceNames: files.map((file) => file.name),\n    enabled: draftDirty,\n    onRestore: (draft) => {\n      setFormData(draft.formData);\n      setLocation(draft.location ?? null);\n      setLocationAddress(draft.locationAddress ?? '');\n      setConsentAgreed(false);\n      setSignatureData('');\n    },\n  });\n\n  // Auto-fetch location on component mount",
    'Official draft persistence state',
  );
  source = source.replace(
    "  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n    const selected = Array.from(e.target.files || []);",
    "  const handleFiles = (selected: File[]) => {",
  );
  source = source.replace("      e.target.value = '';\n      return;", "      return;");
  source = source.replace(
    "    const invalid = selected.find((file) => !ALLOWED_EVIDENCE_TYPES.has(file.type) || file.size > MAX_EVIDENCE_BYTES);",
    "    const invalid = selected.find((file) => !isAllowedEvidenceFile(file, ALLOWED_EVIDENCE_TYPES) || file.size > MAX_EVIDENCE_BYTES);",
  );
  source = source.replace(
    "        description: `${invalid.name} must be JPG, PNG, WebP or MP4 and no larger than 10 MB.`,",
    "        description: `${invalid.name} must be JPG, PNG, WebP, HEIC, HEIF, MP4 or PDF and no larger than 10 MB.`,",
  );
  source = source.replace(
    ".upload(fileName, file, { contentType: file.type, upsert: false });",
    ".upload(fileName, file, { contentType: normaliseEvidenceMimeType(file), upsert: false });",
  );
  source = replaceOnce(
    source,
    "            {/* Evidence Upload */}\n            <div className=\"space-y-2\">\n              <Label>Photos/Evidence</Label>\n              <div className=\"flex items-center gap-2\">\n                <Input id=\"incident-evidence\" type=\"file\" multiple accept=\"image/jpeg,image/png,image/webp,video/mp4\" onChange={handleFileChange} className=\"flex-1\" aria-describedby=\"incident-evidence-help\" />\n                <Camera className=\"h-5 w-5 text-muted-foreground\" />\n              </div>\n              <p id=\"incident-evidence-help\" className=\"text-xs text-muted-foreground\">Up to 3 JPG, PNG, WebP or MP4 files; 10 MB maximum per file.</p>\n              {files.length > 0 && (\n                <p className=\"text-sm text-muted-foreground\">\n                  {files.length} file(s) selected ({files.map(f => f.name).join(', ')})\n                </p>\n              )}\n            </div>",
    "            {/* Evidence Upload */}\n            <MobileEvidencePicker\n              id=\"incident-evidence\"\n              label=\"Photos / Evidence\"\n              accept=\"image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,application/pdf\"\n              files={files}\n              onFilesSelected={handleFiles}\n              onBeforeOpen={saveDraftNow}\n              helpText=\"Up to 3 JPG, PNG, WebP, HEIC, HEIF, MP4 or PDF files; 10 MB maximum per file.\"\n              restoredEvidenceNames={restoredEvidenceNames}\n            />\n            {restoredAt && <p className=\"text-xs text-muted-foreground\">Saved report details were restored from {new Date(restoredAt).toLocaleString('en-ZA')}. Consent and signature must be confirmed again.</p>}",
    'Official file input replacement',
  );
  source = replaceOnce(
    source,
    "      signatureRef.current?.clear();\n      \n    } catch",
    "      signatureRef.current?.clear();\n      clearDraft();\n      \n    } catch",
    'Official clear draft after submission',
  );
  return source;
});

update('src/services/pilot/pilotCoreService.ts', (source) => {
  source = replaceOnce(
    source,
    "import type { Database, Json } from '@/integrations/supabase/types';\n",
    "import type { Database, Json } from '@/integrations/supabase/types';\nimport { isAllowedEvidenceFile, normaliseEvidenceMimeType } from '@/lib/evidenceFiles';\n",
    'Pilot MIME helper import',
  );
  source = source.replace(
    "    if (!PILOT_ALLOWED_MIME_TYPES.includes(file.type as (typeof PILOT_ALLOWED_MIME_TYPES)[number])) fail(`${file.name} has an unsupported file type.`);",
    "    if (!isAllowedEvidenceFile(file, PILOT_ALLOWED_MIME_TYPES)) fail(`${file.name} has an unsupported file type.`);",
  );
  source = source.replace(
    "      cacheControl: '3600', contentType: file.type, upsert: false,",
    "      cacheControl: '3600', contentType: normaliseEvidenceMimeType(file), upsert: false,",
  );
  return source;
});

update('src/config/pilot.ts', (source) => replaceOnce(
  source,
  "  'image/webp',\n  'video/mp4',",
  "  'image/webp',\n  'image/heic',\n  'image/heif',\n  'video/mp4',",
  'Pilot HEIC and HEIF MIME support',
));

update('package.json', (source) => {
  source = replaceOnce(
    source,
    '    "test:safety-mobility": "node scripts/verify-safety-mobility-release.mjs",\n',
    '    "test:safety-mobility": "node scripts/verify-safety-mobility-release.mjs",\n    "test:mobile-evidence": "node scripts/verify-mobile-evidence-session-persistence.mjs",\n',
    'Mobile evidence test command',
  );
  source = source.replace(
    'npm run test:admin-visuals && npm run typecheck',
    'npm run test:admin-visuals && npm run test:mobile-evidence && npm run typecheck',
  );
  return source;
});
