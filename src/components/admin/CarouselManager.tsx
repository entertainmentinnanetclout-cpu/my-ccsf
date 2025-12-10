import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Image, Edit2, Eye, EyeOff, Upload, ChevronRight, Images, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  { value: 'emalahleni', label: 'eMalahleni' }
];

const CATEGORIES = ['Campus', 'Residence'];
const MAX_IMAGES_PER_CAMPUS = 15;

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

export const CarouselManager = () => {
  const [allImages, setAllImages] = useState<CarouselImage[]>([]);
  const [selectedCampus, setSelectedCampus] = useState(CAMPUSES[0].value);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<CarouselImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<CarouselImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    category: 'Campus'
  });

  const campusImages = allImages.filter(img => img.campus === selectedCampus);
  const campusCount = campusImages.length;
  const activeCount = campusImages.filter(i => i.is_active).length;

  useEffect(() => {
    fetchAllImages();

    const channel = supabase
      .channel('carousel-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, fetchAllImages)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllImages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching images', description: error.message, variant: 'destructive' });
    } else {
      setAllImages(data || []);
    }
    setIsLoading(false);
  };

  const getImageCountForCampus = (campusValue: string) => {
    return allImages.filter(img => img.campus === campusValue).length;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum size is 15MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('carousel-images')
      .upload(fileName, file);

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('carousel-images')
      .getPublicUrl(fileName);

    setFormData({ ...formData, image_url: publicUrl.publicUrl });
    setIsUploading(false);
    toast({ title: 'Image uploaded' });
  };

  const handleSubmit = async () => {
    if (!formData.image_url || !formData.title) {
      toast({ title: 'Please add an image and title', variant: 'destructive' });
      return;
    }

    if (editingImage) {
      const { error } = await supabase
        .from('carousel_images')
        .update({
          image_url: formData.image_url,
          title: formData.title,
          category: formData.category
        })
        .eq('id', editingImage.id);

      if (error) {
        toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Image updated' });
      }
    } else {
      if (campusCount >= MAX_IMAGES_PER_CAMPUS) {
        toast({ 
          title: 'Limit reached', 
          description: `Maximum ${MAX_IMAGES_PER_CAMPUS} images per campus`, 
          variant: 'destructive' 
        });
        return;
      }
      
      const maxOrder = campusImages.length > 0 ? Math.max(...campusImages.map(i => i.display_order)) + 1 : 0;
      
      const { error } = await supabase
        .from('carousel_images')
        .insert({
          campus: selectedCampus,
          image_url: formData.image_url,
          title: formData.title,
          category: formData.category,
          display_order: maxOrder,
          is_active: true
        });

      if (error) {
        toast({ title: 'Error adding image', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Image added' });
      }
    }

    closeDialog();
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingImage(null);
    setFormData({ image_url: '', title: '', category: 'Campus' });
  };

  const handleDelete = async () => {
    if (!imageToDelete) return;

    const { error } = await supabase
      .from('carousel_images')
      .delete()
      .eq('id', imageToDelete.id);

    if (error) {
      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Image deleted' });
    }
    
    setDeleteDialogOpen(false);
    setImageToDelete(null);
  };

  const handleToggleActive = async (image: CarouselImage) => {
    const { error } = await supabase
      .from('carousel_images')
      .update({ is_active: !image.is_active })
      .eq('id', image.id);

    if (error) {
      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });
    }
  };

  const openEditDialog = (image: CarouselImage) => {
    setEditingImage(image);
    setFormData({
      image_url: image.image_url,
      title: image.title,
      category: image.category
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingImage(null);
    setFormData({ image_url: '', title: '', category: 'Campus' });
    setIsDialogOpen(true);
  };

  const getCampusLabel = (value: string) => {
    return CAMPUSES.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Campus Sidebar */}
      <Card className="w-64 flex-shrink-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Campuses
          </h3>
        </div>
        <ScrollArea className="h-[calc(100%-4rem)]">
          <div className="p-2">
            {CAMPUSES.map(campus => {
              const count = getImageCountForCampus(campus.value);
              const isSelected = selectedCampus === campus.value;
              return (
                <button
                  key={campus.value}
                  onClick={() => setSelectedCampus(campus.value)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-sm font-medium truncate">{campus.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={isSelected ? 'secondary' : 'outline'} 
                      className={`text-xs ${count >= MAX_IMAGES_PER_CAMPUS ? 'bg-destructive/20' : ''}`}
                    >
                      {count}/{MAX_IMAGES_PER_CAMPUS}
                    </Badge>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Images className="h-5 w-5 text-primary" />
                {getCampusLabel(selectedCampus)}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{activeCount} active</span>
                  <span>•</span>
                  <span>{campusCount - activeCount} hidden</span>
                </div>
                <Progress 
                  value={(campusCount / MAX_IMAGES_PER_CAMPUS) * 100} 
                  className="w-32 h-2"
                />
              </div>
            </div>
            <Button 
              onClick={openAddDialog} 
              disabled={campusCount >= MAX_IMAGES_PER_CAMPUS}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </div>
        </Card>

        {/* Images Grid */}
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : campusImages.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">No images yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add images to show in the {getCampusLabel(selectedCampus)} carousel
                  </p>
                  <Button onClick={openAddDialog} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {campusImages.map((image) => (
                      <motion.div
                        key={image.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                          image.is_active 
                            ? 'border-transparent hover:border-primary/50' 
                            : 'border-dashed border-muted-foreground/30 opacity-60'
                        }`}
                      >
                        {/* Image */}
                        <div className="aspect-video bg-muted">
                          <img 
                            src={image.image_url} 
                            alt={image.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';
                            }}
                          />
                        </div>

                        {/* Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9"
                            onClick={() => handleToggleActive(image)}
                            title={image.is_active ? 'Hide' : 'Show'}
                          >
                            {image.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-9 w-9"
                            onClick={() => openEditDialog(image)}
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-9 w-9"
                            onClick={() => {
                              setImageToDelete(image);
                              setDeleteDialogOpen(true);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Info Bar */}
                        <div className="p-3 bg-card">
                          <p className="font-medium text-sm truncate">{image.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-xs">
                              {image.category}
                            </Badge>
                            {!image.is_active && (
                              <span className="text-xs text-muted-foreground">Hidden</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Edit Image' : 'Add Image'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload Area */}
            <div className="space-y-2">
              <Label>Image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              
              {formData.image_url ? (
                <div className="relative group">
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={formData.image_url} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';
                      }}
                    />
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8" />
                      <span className="text-sm">Click to upload (max 15MB)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Main Building Entrance"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isUploading || !formData.image_url || !formData.title}>
              {editingImage ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{imageToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
