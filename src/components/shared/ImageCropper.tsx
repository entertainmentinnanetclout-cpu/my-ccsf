import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import imageCompression from 'browser-image-compression';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crop as CropIcon, RotateCcw, Check, X, Loader2 } from 'lucide-react';

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio?: number;
  onCropComplete: (croppedBlob: Blob) => void;
  maxSizeKB?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export const ImageCropper = ({
  open,
  onClose,
  imageSrc,
  aspectRatio = 16 / 9,
  onCropComplete,
  maxSizeKB = 500,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspectRatio));
  }, [aspectRatio]);

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return;

    setIsProcessing(true);
    setProcessingStatus('Cropping...');

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Limit max dimensions for performance
      const maxDimension = 1920;
      let targetWidth = completedCrop.width * scaleX;
      let targetHeight = completedCrop.height * scaleY;

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const ratio = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
        targetWidth *= ratio;
        targetHeight *= ratio;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Convert canvas to blob
      const croppedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.92
        );
      });

      setProcessingStatus('Compressing...');

      // Compress the image
      const compressedFile = await imageCompression(
        new File([croppedBlob], 'image.jpg', { type: 'image/jpeg' }),
        {
          maxSizeMB: maxSizeKB / 1024,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg',
        }
      );

      const originalSize = (croppedBlob.size / 1024).toFixed(0);
      const compressedSize = (compressedFile.size / 1024).toFixed(0);
      console.log(`Image compressed: ${originalSize}KB → ${compressedSize}KB`);

      onCropComplete(compressedFile);
      onClose();
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" />
            Crop & Compress Image
            <Badge variant="outline" className="text-xs ml-2">
              Max {maxSizeKB}KB
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-border">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-w-full"
              />
            </ReactCrop>
          </div>

          <p className="text-xs text-muted-foreground">
            Drag to adjust. Auto-compressed for optimal performance.
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isProcessing}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCropComplete} disabled={isProcessing || !completedCrop}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {processingStatus}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Apply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
