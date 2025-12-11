import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, User } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userName?: string | null;
  onUploadComplete?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarUpload = ({ 
  userId, 
  currentAvatarUrl, 
  userName,
  onUploadComplete,
  size = 'lg'
}: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      // Compress the image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 400,
        useWebWorker: true
      });

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      onUploadComplete?.(publicUrl);
      toast({ title: 'Success', description: 'Profile photo updated' });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({ 
        title: 'Upload failed', 
        description: error.message || 'Failed to upload image', 
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = () => {
    if (!userName) return 'U';
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClasses[size]} border-2 border-border`}>
        <AvatarImage src={avatarUrl || undefined} alt={userName || 'User'} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {avatarUrl ? (
            <User className={iconSizes[size]} />
          ) : (
            getInitials()
          )}
        </AvatarFallback>
      </Avatar>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};