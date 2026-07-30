import { useRef } from 'react';
import { Camera, FileCheck2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MobileEvidencePickerProps {
  id: string;
  label: string;
  accept: string;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onBeforeOpen?: () => void;
  helpText: string;
  required?: boolean;
  restoredEvidenceNames?: string[];
  className?: string;
}

export function MobileEvidencePicker({ id, label, accept, files, onFilesSelected, onBeforeOpen, helpText, required = false, restoredEvidenceNames = [], className }: MobileEvidencePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('space-y-3', className)}>
      <Label htmlFor={id}>{label}{required ? ' *' : ''}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept}
        onChange={(event) => {
          onFilesSelected(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }}
        className="sr-only"
        tabIndex={-1}
        aria-describedby={`${id}-help`}
      />
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full justify-start gap-3 border-dashed text-left"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onBeforeOpen?.();
          inputRef.current?.click();
        }}
      >
        <span className="rounded-lg bg-primary/10 p-2 text-primary"><Camera className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Choose photos, video or documents</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">Camera, gallery and Files are supported on mobile.</span>
        </span>
        <Paperclip className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Button>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">{helpText}</p>

      {files.length > 0 && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div><p className="font-semibold">{files.length} file{files.length === 1 ? '' : 's'} attached</p><p className="mt-1 break-words text-muted-foreground">{files.map((file) => file.name).join(', ')}</p></div>
          </div>
        </div>
      )}

      {files.length === 0 && restoredEvidenceNames.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Draft restored — reselect evidence before submitting</p>
          <p className="mt-1 break-words text-muted-foreground">Previously selected: {restoredEvidenceNames.join(', ')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Browsers cannot restore private file contents after Android or iOS closes a file picker, so the original files must be selected again.</p>
        </div>
      )}
    </div>
  );
}
