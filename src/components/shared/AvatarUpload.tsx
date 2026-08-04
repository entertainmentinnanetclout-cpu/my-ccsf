import { useEffect, useRef, useState } from 'react';
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
      const stalePaths = (existing ?? []).map((item) => `${folder}/${item.name}`);
      if (stalePaths.length) await supabase.storage.from('avatars').remove(stalePaths);

      const objectPath = `${folder}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(objectPath, prepared, {
        cacheControl: '3600',
        contentType: prepared.type,
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;
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

  const initials = userName?.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClasses[size]} border-2 border-border shadow-sm`}>
        <AvatarImage src={avatarUrl || undefined} alt={userName ? `${userName} profile photo` : 'Student profile photo'} />
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
