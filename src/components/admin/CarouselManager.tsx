import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  Image,
  Images,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageCropper } from '@/components/shared/ImageCropper';

const CAMPUSES = [
  { value: 'pretoria_west_main', label: 'Pretoria West (Main)' },
  { value: 'arcadia', label: 'Arcadia' },
  { value: 'arts', label: 'Arts' },
  { value: 'giyani', label: 'Giyani' },
  { value: 'mbombela', label: 'Mbombela' },
  { value: 'polokwane', label: 'Polokwane' },
  { value: 'garankuwa', label: 'Ga-Rankuwa' },
  { value: 'soshanguve_south', label: 'Soshanguve South' },
  { value: 'soshanguve_north', label: 'Soshanguve North' },
  { value: 'emalahleni', label: 'eMalahleni' },
] as const;

const CATEGORIES = ['Campus', 'Residence', 'Campus Entrance'] as const;
const MAX_IMAGES_PER_CAMPUS = 30;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface CarouselImage {
  id: string;
  campus: string;
  image_url: string;
  title: string;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

type FormData = {
  image_url: string;
  title: string;
  category: string;
};

const EMPTY_FORM: FormData = { image_url: '', title: '', category: 'Campus' };

export const CarouselManager = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [allImages, setAllImages] = useState<CarouselImage[]>([]);
  const [selectedCampus, setSelectedCampus] = useState(CAMPUSES[0].value as string);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<CarouselImage | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [pendingStoragePath, setPendingStoragePath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<CarouselImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const campusImages = useMemo(
    () => allImages.filter((image) => image.campus === selectedCampus),
    [allImages, selectedCampus],
  );
  const campusCount = campusImages.length;
  const activeCount = campusImages.filter((image) => image.is_active).length;

  const fetchAllImages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      setLoadError('Carousel images could not be loaded.');
      toast({ title: 'Carousel unavailable', description: error.message, variant: 'destructive' });
    } else {
      setAllImages(data || []);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    void fetchAllImages();
    const channel = supabase
      .channel('carousel-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => void fetchAllImages())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLoadError('Live carousel updates are temporarily unavailable.');
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchAllImages]);

  const getCampusLabel = (value: string) => CAMPUSES.find((campus) => campus.value === value)?.label || value;
  const getImageCountForCampus = (value: string) => allImages.filter((image) => image.campus === value).length;

  const getStoragePath = (publicUrl: string) => {
    const marker = '/storage/v1/object/public/carousel-images/';
    const index = publicUrl.indexOf(marker);
    return index >= 0 ? decodeURIComponent(publicUrl.slice(index + marker.length)) : null;
  };

  const removeStorageObject = async (storagePath: string | null) => {
    if (!storagePath) return true;
    const { error } = await supabase.storage.from('carousel-images').remove([storagePath]);
    if (error) {
      console.error('Unable to remove carousel Storage object:', error);
      return false;
    }
    return true;
  };

  const closeDialog = async (removePending = true) => {
    if (removePending && pendingStoragePath) {
      const removed = await removeStorageObject(pendingStoragePath);
      if (!removed) {
        toast({
          title: 'Upload cleanup warning',
          description: 'The unused upload could not be removed from Storage.',
          variant: 'destructive',
        });
      }
    }
    setPendingStoragePath(null);
    setEditingImage(null);
    setFormData(EMPTY_FORM);
    setIsDialogOpen(false);
    setImageToCrop(null);
    setCropperOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddDialog = () => {
    setPendingStoragePath(null);
    setEditingImage(null);
    setFormData(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (image: CarouselImage) => {
    setPendingStoragePath(null);
    setEditingImage(image);
    setFormData({ image_url: image.image_url, title: image.title, category: image.category });
    setIsDialogOpen(true);
  };

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast({ title: 'Image format not accepted', description: 'Use JPG, PNG or WebP.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'File too large', description: 'Maximum image size is 5 MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast({ title: 'Image could not be read', variant: 'destructive' });
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    setIsUploading(true);

    if (pendingStoragePath) {
      const removed = await removeStorageObject(pendingStoragePath);
      if (!removed) {
        toast({ title: 'Previous upload cleanup failed', description: 'Retry before selecting another image.', variant: 'destructive' });
        setIsUploading(false);
        return;
      }
    }

    const fileName = `${selectedCampus}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('carousel-images').upload(fileName, croppedBlob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from('carousel-images').getPublicUrl(fileName);
    setPendingStoragePath(fileName);
    setFormData((current) => ({ ...current, image_url: data.publicUrl }));
    setImageToCrop(null);
    setCropperOpen(false);
    setIsUploading(false);
    toast({ title: 'Image uploaded', description: 'Save the carousel entry to publish it.' });
  };

  const handleSubmit = async () => {
    const title = formData.title.trim();
    if (!formData.image_url || !title || isSaving) {
      toast({ title: 'Please add an image and title', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    if (editingImage) {
      const { error } = await supabase
        .from('carousel_images')
        .update({ image_url: formData.image_url, title, category: formData.category })
        .eq('id', editingImage.id);

      if (error) {
        toast({ title: 'Image was not updated', description: error.message, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const previousPath = getStoragePath(editingImage.image_url);
      if (pendingStoragePath && previousPath && previousPath !== pendingStoragePath) {
        const removed = await removeStorageObject(previousPath);
        if (!removed) {
          toast({ title: 'Image updated with cleanup warning', description: 'The previous file remains in Storage.', variant: 'destructive' });
        }
      }
      toast({ title: 'Image updated' });
    } else {
      if (campusCount >= MAX_IMAGES_PER_CAMPUS) {
        toast({ title: 'Limit reached', description: `Maximum ${MAX_IMAGES_PER_CAMPUS} images per campus.`, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const displayOrder = campusImages.length > 0
        ? Math.max(...campusImages.map((image) => image.display_order)) + 1
        : 0;
      const { error } = await supabase.from('carousel_images').insert({
        campus: selectedCampus,
        image_url: formData.image_url,
        title,
        category: formData.category,
        display_order: displayOrder,
        is_active: true,
      });

      if (error) {
        const removed = await removeStorageObject(pendingStoragePath);
        if (removed) {
          setPendingStoragePath(null);
          setFormData((current) => ({ ...current, image_url: '' }));
        }
        toast({ title: 'Image was not added', description: error.message, variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      toast({ title: 'Image added' });
    }

    setPendingStoragePath(null);
    setIsSaving(false);
    await closeDialog(false);
    await fetchAllImages();
  };

  const handleToggleActive = async (image: CarouselImage) => {
    const nextValue = !image.is_active;
    setAllImages((current) => current.map((item) => item.id === image.id ? { ...item, is_active: nextValue } : item));
    const { error } = await supabase.from('carousel_images').update({ is_active: nextValue }).eq('id', image.id);
    if (error) {
      setAllImages((current) => current.map((item) => item.id === image.id ? image : item));
      toast({ title: 'Visibility was not updated', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!imageToDelete || isDeleting) return;
    setIsDeleting(true);
    const { error } = await supabase.from('carousel_images').delete().eq('id', imageToDelete.id);
    if (error) {
      toast({ title: 'Image was not deleted', description: error.message, variant: 'destructive' });
      setIsDeleting(false);
      return;
    }

    const removed = await removeStorageObject(getStoragePath(imageToDelete.image_url));
    toast({
      title: removed ? 'Image deleted' : 'Image deleted with cleanup warning',
      description: removed ? undefined : 'The database entry was deleted, but the file remains in Storage.',
      variant: removed ? 'default' : 'destructive',
    });
    setDeleteDialogOpen(false);
    setImageToDelete(null);
    setIsDeleting(false);
    await fetchAllImages();
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:h-[calc(100vh-12rem)] lg:flex-row">
      <Card className="w-full flex-shrink-0 lg:w-64">
        <div className="border-b p-4">
          <h3 className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4" aria-hidden="true" />Campuses</h3>
        </div>
        <ScrollArea className="max-h-56 lg:h-[calc(100%-4rem)] lg:max-h-none">
          <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:block">
            {CAMPUSES.map((campus) => {
              const count = getImageCountForCampus(campus.value);
              const selected = selectedCampus === campus.value;
              return (
                <button
                  key={campus.value}
                  type="button"
                  onClick={() => setSelectedCampus(campus.value)}
                  aria-pressed={selected}
                  className={`mb-1 flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <span className="truncate text-sm font-medium">{campus.label}</span>
                  <span className="flex items-center gap-1">
                    <Badge variant={selected ? 'secondary' : 'outline'} className={`text-xs ${count >= MAX_IMAGES_PER_CAMPUS ? 'bg-destructive/20' : ''}`}>{count}/{MAX_IMAGES_PER_CAMPUS}</Badge>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selected ? 'rotate-90' : ''}`} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <div className="flex min-w-0 flex-1 flex-col">
        <Card className="mb-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold"><Images className="h-5 w-5 text-primary" aria-hidden="true" />{getCampusLabel(selectedCampus)}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">{activeCount} active · {campusCount - activeCount} hidden</span>
                <Progress value={(campusCount / MAX_IMAGES_PER_CAMPUS) * 100} className="h-2 w-32" aria-label={`${campusCount} of ${MAX_IMAGES_PER_CAMPUS} carousel images used`} />
              </div>
            </div>
            <Button onClick={openAddDialog} disabled={campusCount >= MAX_IMAGES_PER_CAMPUS} className="gap-2"><Plus className="h-4 w-4" aria-hidden="true" />Add Image</Button>
          </div>
        </Card>

        <Card className="min-h-[440px] flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="flex h-48 items-center justify-center" role="status" aria-label="Loading carousel images"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" /></div>
              ) : loadError ? (
                <div className="py-12 text-center" role="alert"><AlertCircle className="mx-auto mb-3 h-12 w-12 text-destructive" aria-hidden="true" /><h3 className="mb-1 font-semibold">Carousel unavailable</h3><p className="mb-4 text-sm text-muted-foreground">{loadError}</p><Button variant="outline" onClick={() => void fetchAllImages()} className="gap-2"><RefreshCw className="h-4 w-4" />Retry</Button></div>
              ) : campusImages.length === 0 ? (
                <div className="py-12 text-center"><Image className="mx-auto mb-3 h-12 w-12 text-muted-foreground" aria-hidden="true" /><h3 className="mb-1 font-semibold">No images yet</h3><p className="mb-4 text-sm text-muted-foreground">Add images to the {getCampusLabel(selectedCampus)} carousel.</p><Button onClick={openAddDialog} variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add First Image</Button></div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {campusImages.map((image) => (
                      <motion.article
                        key={image.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all ${image.is_active ? 'border-transparent hover:border-primary/50' : 'border-dashed border-muted-foreground/30 opacity-70'}`}
                      >
                        <div className="aspect-video bg-muted">
                          {brokenImages.has(image.id) ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground" role="img" aria-label={`${image.title} image unavailable`}><AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" /><span className="text-xs">Image unavailable</span></div>
                          ) : (
                            <img src={image.image_url} alt={image.title} className="h-full w-full object-cover" onError={() => setBrokenImages((current) => new Set(current).add(image.id))} />
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <Button size="icon" variant="secondary" onClick={() => void handleToggleActive(image)} aria-label={image.is_active ? `Hide ${image.title}` : `Show ${image.title}`}>{image.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                          <Button size="icon" variant="secondary" onClick={() => openEditDialog(image)} aria-label={`Edit ${image.title}`}><Edit2 className="h-4 w-4" /></Button>
                          <Button size="icon" variant="destructive" onClick={() => { setImageToDelete(image); setDeleteDialogOpen(true); }} aria-label={`Delete ${image.title}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="bg-card p-3"><p className="truncate text-sm font-medium">{image.title}</p><div className="mt-1 flex items-center justify-between"><Badge variant="outline" className="text-xs">{image.category}</Badge>{!image.is_active && <span className="text-xs text-muted-foreground">Hidden</span>}</div></div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) void closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader><DialogTitle>{editingImage ? 'Edit Image' : 'Add Image'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="carousel-image-upload">Image</Label>
              <input id="carousel-image-upload" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleFileSelect(file); }} />
              {formData.image_url ? (
                <div className="group relative"><div className="aspect-video overflow-hidden rounded-lg bg-muted"><img src={formData.image_url} alt="Carousel preview" className="h-full w-full object-cover" onError={() => toast({ title: 'Preview unavailable', description: 'Choose a different image before saving.', variant: 'destructive' })} /></div><Button type="button" variant="secondary" size="sm" className="absolute bottom-2 right-2" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Change</Button></div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {isUploading ? <><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="text-sm">Uploading image…</span></> : <><Upload className="h-8 w-8" /><span className="text-sm">Choose JPG, PNG or WebP (max 5 MB)</span></>}
                </button>
              )}
            </div>
            <div className="space-y-2"><Label htmlFor="carousel-image-title">Title</Label><Input id="carousel-image-title" placeholder="e.g. Main Building Entrance" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} maxLength={160} /></div>
            <div className="space-y-2"><Label htmlFor="carousel-image-category">Type</Label><Select value={formData.category} onValueChange={(value) => setFormData((current) => ({ ...current, category: value }))}><SelectTrigger id="carousel-image-category"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => void closeDialog()}>Cancel</Button><Button onClick={() => void handleSubmit()} disabled={isUploading || isSaving || !formData.image_url || !formData.title.trim()}>{isSaving ? 'Saving…' : editingImage ? 'Save' : 'Add'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Image?</AlertDialogTitle><AlertDialogDescription>This permanently removes “{imageToDelete?.title}” from the carousel and attempts to delete its Storage file.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void handleDelete()} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Deleting…' : 'Delete'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {imageToCrop && <ImageCropper open={cropperOpen} onClose={() => { setCropperOpen(false); setImageToCrop(null); }} imageSrc={imageToCrop} aspectRatio={16 / 9} onCropComplete={handleCroppedImage} />}
    </div>
  );
};
