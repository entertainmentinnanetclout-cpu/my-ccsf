import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, FileText, FileUp, FolderOpen, Loader2, RotateCcw, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { evidenceFileIdentity } from '@/lib/evidenceProcessing';
import type { EvidenceUploadState } from '@/services/evidenceSubmissionService';

interface MobileEvidencePickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void | Promise<void>;
  acceptPdf?: boolean;
  disabled?: boolean;
  maxFiles: number;
  helpText: string;
  fileStates?: Record<string, EvidenceUploadState>;
  onRetryFile?: (file: File, index: number) => void;
}

interface PreviewItem {
  key: string;
  url: string | null;
  kind: 'image' | 'video' | 'document';
}

export function MobileEvidencePicker({
  files,
  onFilesChange,
  acceptPdf = false,
  disabled = false,
  maxFiles,
  helpText,
  fileStates = {},
  onRetryFile,
}: MobileEvidencePickerProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const documentInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  const previews = useMemo<PreviewItem[]>(() => files.map((file) => {
    const type = file.type.toLowerCase();
    const kind = type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : 'document';
    return { key: evidenceFileIdentity(file), url: kind === 'document' ? null : URL.createObjectURL(file), kind };
  }), [files]);

  useEffect(() => () => previews.forEach((preview) => { if (preview.url) URL.revokeObjectURL(preview.url); }), [previews]);

  const appendFiles = async (selected: File[]) => {
    const existing = new Set(files.map(evidenceFileIdentity));
    const merged = [...files];
    selected.forEach((file) => {
      const identity = evidenceFileIdentity(file);
      if (!existing.has(identity) && merged.length < maxFiles) {
        existing.add(identity);
        merged.push(file);
      }
    });
    setProcessing(true);
    try { await onFilesChange(merged); } finally { setProcessing(false); }
  };

  const handleSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (selected.length) await appendFiles(selected);
  };

  const openPicker = (input: React.RefObject<HTMLInputElement>) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    input.current?.click();
  };

  const removeFile = async (index: number) => {
    setProcessing(true);
    try { await onFilesChange(files.filter((_, fileIndex) => fileIndex !== index)); } finally { setProcessing(false); }
  };

  const pickerDisabled = disabled || processing || files.length >= maxFiles;

  return (
    <div className="space-y-3" data-testid="mobile-evidence-picker">
      <div className={`grid gap-2 ${acceptPdf ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <Button type="button" variant="outline" onClick={openPicker(photoInput)} disabled={pickerDisabled}>
          <Camera className="mr-2 h-4 w-4" />Take photo
        </Button>
        <Button type="button" variant="outline" onClick={openPicker(videoInput)} disabled={pickerDisabled}>
          <Video className="mr-2 h-4 w-4" />Record video
        </Button>
        <Button type="button" variant="outline" onClick={openPicker(galleryInput)} disabled={pickerDisabled}>
          <FolderOpen className="mr-2 h-4 w-4" />Gallery
        </Button>
        {acceptPdf && (
          <Button type="button" variant="outline" onClick={openPicker(documentInput)} disabled={pickerDisabled}>
            <FileText className="mr-2 h-4 w-4" />Document
          </Button>
        )}
      </div>

      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" className="sr-only" tabIndex={-1} onChange={(event) => void handleSelection(event)} aria-label="Take an evidence photo" />
      <input ref={videoInput} type="file" accept="video/mp4,video/quicktime,video/webm,video/3gpp,video/3gpp2,.mov,.m4v,.webm,.3gp,.3g2" capture="environment" className="sr-only" tabIndex={-1} onChange={(event) => void handleSelection(event)} aria-label="Record an evidence video" />
      <input ref={galleryInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,video/3gpp,video/3gpp2,.mov,.m4v,.webm,.3gp,.3g2" className="sr-only" tabIndex={-1} onChange={(event) => void handleSelection(event)} aria-label="Choose evidence from the gallery" />
      {acceptPdf && <input ref={documentInput} type="file" multiple accept="application/pdf" className="sr-only" tabIndex={-1} onChange={(event) => void handleSelection(event)} aria-label="Choose evidence documents" />}

      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-start gap-2">
          {processing ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /> : <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
          <p>{processing ? 'Preparing mobile evidence. HEIC/HEIF photos are converted where supported and large images are compressed. ' : ''}{helpText} Selected evidence is stored privately on this device for up to 24 hours while the report remains unfinished.</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {files.map((file, index) => {
            const preview = previews[index];
            const state = fileStates[evidenceFileIdentity(file)] ?? { status: 'queued', progress: 0 };
            return (
              <div key={preview.key} className="rounded-xl border bg-background p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                    {preview.kind === 'image' && preview.url && <img src={preview.url} alt="Evidence preview" className="h-full w-full object-cover" />}
                    {preview.kind === 'video' && preview.url && <video src={preview.url} className="h-full w-full object-cover" muted />}
                    {preview.kind === 'document' && <FileText className="h-6 w-6 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || 'Detected by file extension'}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {state.status === 'uploaded' && <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700">Uploaded{state.resumed ? ' after resuming' : ''}</span></>}
                      {state.status === 'uploading' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /><span>{state.progress}% uploaded</span></>}
                      {state.status === 'failed' && <><AlertCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{state.error || 'Upload failed'}</span></>}
                      {state.status === 'queued' && <span className="text-muted-foreground">Ready for secure upload</span>}
                    </div>
                  </div>
                  {state.status === 'failed' && onRetryFile && <Button type="button" size="icon" variant="ghost" onClick={() => onRetryFile(file, index)} aria-label={`Retry ${file.name}`}><RotateCcw className="h-4 w-4" /></Button>}
                  <Button type="button" size="icon" variant="ghost" onClick={() => void removeFile(index)} disabled={disabled || state.status === 'uploading'} aria-label={`Remove ${file.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {state.status === 'uploading' && <Progress value={state.progress} className="mt-3 h-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
