import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, ImageUp, Loader2, RotateCcw, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { prepareEvidenceFile } from '@/lib/evidenceProcessing';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PremiumAvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onUploadComplete?: (url: string) => void;
  size?: 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-36 w-36 sm:h-40 sm:w-40',
};

const createCenteredSquareCrop = (width: number, height: number) => centerCrop(
  makeAspectCrop({ unit: '%', width: 82 }, 1, width, height),
  width,
  height,
);

const cropImage = async (image: HTMLImageElement, crop: PixelCrop) => {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const outputSize = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the profile image.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    outputSize,
    outputSize,
  );

  const toBlob = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp', 0.9);
  if (webp) return webp;
  const jpeg = await toBlob('image/jpeg', 0.9);
  if (!jpeg) throw new Error('The cropped image could not be encoded.');
  return jpeg;
};

export const PremiumAvatarUpload = ({
  userId,
  currentAvatarUrl,
  userName,
  onUploadComplete,
  size = 'xl',
}: PremiumAvatarUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setAvatarUrl(currentAvatarUrl ?? null), [currentAvatarUrl]);
  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  const initials = userName
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TU';

  const closeEditor = () => {
    setDialogOpen(false);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setPreparedFile(null);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
  };

  const choosePhoto = () => fileInputRef.current?.click();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!selected || !userId) return;
    if (selected.size > 25 * 1024 * 1024) {
      toast({ title: 'Photo is too large', description: 'Choose an original image smaller than 25 MB.', variant: 'destructive' });
      return;
    }

    setPreparing(true);
    try {
      const prepared = await prepareEvidenceFile(selected, {
        maxBytes: 5 * 1024 * 1024,
        maxDimension: 2048,
        compressAboveBytes: 2.5 * 1024 * 1024,
        jpegQuality: 0.92,
      });
      if (!prepared.type.startsWith('image/')) throw new Error('Choose a supported photograph.');
      const objectUrl = URL.createObjectURL(prepared);
      setPreparedFile(prepared);
      setSourceUrl(objectUrl);
      setDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Photo could not be prepared',
        description: error instanceof Error ? error.message : 'Try a JPEG, PNG, WebP, HEIC or HEIF image.',
        variant: 'destructive',
      });
    } finally {
      setPreparing(false);
    }
  };

  const uploadCrop = async () => {
    if (!preparedFile || !imageRef.current || !userId) return;
    setUploading(true);
    try {
      const cropToUse = completedCrop && completedCrop.width > 0 && completedCrop.height > 0
        ? completedCrop
        : { x: 0, y: 0, width: imageRef.current.width, height: imageRef.current.height, unit: 'px' as const };
      const blob = await cropImage(imageRef.current, cropToUse);
      const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const objectPath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(objectPath, blob, {
        cacheControl: '3600',
        contentType: blob.type,
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: existing } = await supabase.storage.from('avatars').list(userId, { limit: 20 });
      const stalePaths = (existing ?? [])
        .map((item) => `${userId}/${item.name}`)
        .filter((path) => path !== objectPath);
      if (stalePaths.length) await supabase.storage.from('avatars').remove(stalePaths);

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: versionedUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (profileError) throw profileError;

      setAvatarUrl(versionedUrl);
      onUploadComplete?.(versionedUrl);
      toast({ title: 'Profile photo updated', description: 'The cropped image is now available across My CCSF.' });
      closeEditor();
    } catch (error) {
      toast({
        title: 'Profile photo upload failed',
        description: error instanceof Error ? error.message : 'The image could not be uploaded. Try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="premium-avatar-upload">
      <div className="relative mx-auto w-fit">
        <div className="absolute inset-[-10px] rounded-full bg-gradient-to-br from-[#F2A900]/40 via-[#D7193F]/20 to-[#0055A5]/35 blur-lg" />
        <Avatar className={`relative ${sizeClasses[size]} border-4 border-background shadow-[0_18px_44px_rgba(0,47,108,0.28)]`}>
          <AvatarImage src={avatarUrl ?? undefined} alt={userName ? `${userName} profile photo` : 'Student profile photo'} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-[#002F6C] to-[#0055A5] text-2xl font-black text-white">{initials}</AvatarFallback>
        </Avatar>
        <Button
          type="button"
          size="icon"
          className="absolute bottom-0 right-0 h-12 w-12 touch-manipulation rounded-full border-4 border-background bg-[#D7193F] text-white shadow-xl hover:bg-[#B01233]"
          onClick={choosePhoto}
          disabled={preparing || uploading}
          aria-label={avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
        >
          {preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={(event) => void handleFileSelect(event)}
        className="sr-only"
        aria-label="Choose a profile photograph"
        disabled={preparing || uploading}
      />
      <Button type="button" variant="outline" size="sm" className="mx-auto flex min-h-11 touch-manipulation" onClick={choosePhoto} disabled={preparing || uploading}>
        <ImageUp className="mr-2 h-4 w-4" />{avatarUrl ? 'Change and crop photo' : 'Upload and crop photo'}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">JPEG, PNG, WebP or supported HEIC/HEIF · cropped to a consistent 1024px profile image</p>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open && !uploading) closeEditor(); }}>
        <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />Crop profile photo</DialogTitle>
            <DialogDescription>Move and resize the square to choose how your institutional profile image will appear.</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-slate-950 p-3 sm:p-5">
            {sourceUrl && (
              <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)} aspect={1} circularCrop keepSelection>
                <img
                  ref={imageRef}
                  src={sourceUrl}
                  alt="Profile photo crop preview"
                  className="max-h-[58dvh] w-auto max-w-full object-contain"
                  onLoad={(event) => {
                    const { width, height } = event.currentTarget;
                    setCrop(createCenteredSquareCrop(width, height));
                  }}
                />
              </ReactCrop>
            )}
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Only your authenticated account can update the profile record. The image is normalised before upload to avoid oversized phone photographs.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => {
              if (imageRef.current) setCrop(createCenteredSquareCrop(imageRef.current.width, imageRef.current.height));
            }} disabled={uploading}>
              <RotateCcw className="mr-2 h-4 w-4" />Reset crop
            </Button>
            <Button type="button" className="bg-[#D7193F] font-extrabold text-white hover:bg-[#B01233]" onClick={() => void uploadCrop()} disabled={uploading || !sourceUrl}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageUp className="mr-2 h-4 w-4" />}{uploading ? 'Uploading…' : 'Use this photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
