import { useRef } from 'react';
import { Camera, FileUp, FolderOpen, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileEvidencePickerProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  acceptPdf?: boolean;
  disabled?: boolean;
  maxFiles: number;
  helpText: string;
}

const fileIdentity = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export function MobileEvidencePicker({
  files,
  onFilesChange,
  acceptPdf = false,
  disabled = false,
  maxFiles,
  helpText,
}: MobileEvidencePickerProps) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const browseInput = useRef<HTMLInputElement>(null);

  const appendFiles = (selected: File[]) => {
    const existing = new Set(files.map(fileIdentity));
    const merged = [...files];
    selected.forEach((file) => {
      const identity = fileIdentity(file);
      if (!existing.has(identity)) {
        existing.add(identity);
        merged.push(file);
      }
    });
    onFilesChange(merged);
  };

  const handleSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (selected.length) appendFiles(selected);
  };

  const openPicker = (input: HTMLInputElement | null) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    input?.click();
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  const browseAccept = acceptPdf
    ? 'image/jpeg,image/png,image/webp,video/mp4,application/pdf'
    : 'image/jpeg,image/png,image/webp,video/mp4';

  return (
    <div className="space-y-3" data-testid="mobile-evidence-picker">
      <div className="grid gap-2 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={openPicker(photoInput.current)} disabled={disabled || files.length >= maxFiles}>
          <Camera className="mr-2 h-4 w-4" />Take photo
        </Button>
        <Button type="button" variant="outline" onClick={openPicker(videoInput.current)} disabled={disabled || files.length >= maxFiles}>
          <Video className="mr-2 h-4 w-4" />Record video
        </Button>
        <Button type="button" variant="outline" onClick={openPicker(browseInput.current)} disabled={disabled || files.length >= maxFiles}>
          <FolderOpen className="mr-2 h-4 w-4" />Choose files
        </Button>
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleSelection}
        aria-label="Take an evidence photo"
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/mp4"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={handleSelection}
        aria-label="Record an evidence video"
      />
      <input
        ref={browseInput}
        type="file"
        multiple
        accept={browseAccept}
        className="sr-only"
        tabIndex={-1}
        onChange={handleSelection}
        aria-label="Choose evidence from this device"
      />

      <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
        <div className="flex items-start gap-2">
          <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>{helpText} Selected evidence is stored privately on this device for up to 24 hours while the report remains unfinished.</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {files.map((file, index) => (
            <div key={fileIdentity(file)} className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removeFile(index)} disabled={disabled} aria-label={`Remove ${file.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
