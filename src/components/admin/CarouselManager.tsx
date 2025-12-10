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
import { Plus, Trash2, GripVertical, Image, Edit2, Eye, EyeOff, Upload, Link, Copy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CAMPUSES = [
  { value: 'all', label: 'All Campuses' },
  { value: 'pretoria_west_main', label: 'Pretoria West (Main)' },
  { value: 'arcadia', label: 'Arcadia Campus' },
  { value: 'arts', label: 'Arts Campus' },
  { value: 'giyani', label: 'Giyani Campus' },
  { value: 'mbombela', label: 'Mbombela Campus' },
  { value: 'polokwane', label: 'Polokwane Campus' },
  { value: 'garankuwa', label: 'Ga-Rankuwa Campus' },
  { value: 'soshanguve_south', label: 'Soshanguve South' },
  { value: 'soshanguve_north', label: 'Soshanguve North' },
  { value: 'emalahleni', label: 'eMalahleni Campus' }
];

const CATEGORIES = ['Campus', 'Security', 'Facilities', 'Events', 'Students', 'Announcements'];

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
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<CarouselImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<CarouselImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTab, setUploadTab] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    campus: 'pretoria_west_main',
    image_url: '',
    title: '',
    category: 'Campus'
  });

  useEffect(() => {
    fetchImages();

    // Real-time subscription
    const channel = supabase
      .channel('carousel-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => {
        fetchImages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCampus]);

  const fetchImages = async () => {
    setIsLoading(true);
    let query = supabase
      .from('carousel_images')
      .select('*')
      .order('campus', { ascending: true })
      .order('display_order', { ascending: true });

    if (selectedCampus !== 'all') {
      query = query.eq('campus', selectedCampus);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Error fetching images', description: error.message, variant: 'destructive' });
    } else {
      setImages(data || []);
    }
    setIsLoading(false);
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

    const { data, error } = await supabase.storage
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
    toast({ title: 'Image uploaded successfully' });
  };

  const handleSubmit = async () => {
    if (!formData.image_url || !formData.title) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (editingImage) {
      const { error } = await supabase
        .from('carousel_images')
        .update({
          campus: formData.campus,
          image_url: formData.image_url,
          title: formData.title,
          category: formData.category
        })
        .eq('id', editingImage.id);

      if (error) {
        toast({ title: 'Error updating image', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Image updated successfully' });
      }
    } else {
      // Check campus limit: 15 images per campus (5 Campus + 10 Residence images)
      const campusImages = images.filter(i => i.campus === formData.campus);
      const MAX_IMAGES_PER_CAMPUS = 15;
      
      if (campusImages.length >= MAX_IMAGES_PER_CAMPUS) {
        toast({ 
          title: 'Campus limit reached', 
          description: `Maximum ${MAX_IMAGES_PER_CAMPUS} images per campus (5 Campus + 2 per 5 residences)`, 
          variant: 'destructive' 
        });
        return;
      }
      
      const maxOrder = campusImages.length > 0 ? Math.max(...campusImages.map(i => i.display_order)) + 1 : 0;
      
      const { error } = await supabase
        .from('carousel_images')
        .insert({
          campus: formData.campus,
          image_url: formData.image_url,
          title: formData.title,
          category: formData.category,
          display_order: maxOrder,
          is_active: true
        });

      if (error) {
        toast({ title: 'Error adding image', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Image added successfully' });
      }
    }

    setIsDialogOpen(false);
    setEditingImage(null);
    setFormData({ campus: 'pretoria_west_main', image_url: '', title: '', category: 'Campus' });
  };

  const confirmDelete = (image: CarouselImage) => {
    setImageToDelete(image);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!imageToDelete) return;

    const { error } = await supabase
      .from('carousel_images')
      .delete()
      .eq('id', imageToDelete.id);

    if (error) {
      toast({ title: 'Error deleting image', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Image deleted' });
    }
    
    setDeleteDialogOpen(false);
    setImageToDelete(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('carousel_images')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    }
  };

  const handleDuplicate = async (image: CarouselImage) => {
    const campusImages = images.filter(i => i.campus === image.campus);
    const MAX_IMAGES_PER_CAMPUS = 15;
    
    if (campusImages.length >= MAX_IMAGES_PER_CAMPUS) {
      toast({ 
        title: 'Campus limit reached', 
        description: `Maximum ${MAX_IMAGES_PER_CAMPUS} images per campus`, 
        variant: 'destructive' 
      });
      return;
    }
    
    const maxOrder = campusImages.length > 0 ? Math.max(...campusImages.map(i => i.display_order)) + 1 : 0;

    const { error } = await supabase
      .from('carousel_images')
      .insert({
        campus: image.campus,
        image_url: image.image_url,
        title: `${image.title} (Copy)`,
        category: image.category,
        display_order: maxOrder,
        is_active: true
      });

    if (error) {
      toast({ title: 'Error duplicating image', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Image duplicated' });
    }
  };

  const handleReorder = async (newOrder: CarouselImage[]) => {
    setImages(newOrder);
    
    const updates = newOrder.map((img, index) => ({
      id: img.id,
      display_order: index
    }));

    for (const update of updates) {
      await supabase
        .from('carousel_images')
        .update({ display_order: update.display_order })
        .eq('id', update.id);
    }
  };

  const openEditDialog = (image: CarouselImage) => {
    setEditingImage(image);
    setFormData({
      campus: image.campus,
      image_url: image.image_url,
      title: image.title,
      category: image.category
    });
    setUploadTab('url');
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingImage(null);
    setFormData({ 
      campus: selectedCampus === 'all' ? 'pretoria_west_main' : selectedCampus, 
      image_url: '', 
      title: '', 
      category: 'Campus' 
    });
    setUploadTab('url');
    setIsDialogOpen(true);
  };

  const getCampusLabel = (value: string) => {
    return CAMPUSES.find(c => c.value === value)?.label || value;
  };

  // Group images by campus
  const imagesByCampus = images.reduce((acc, image) => {
    if (!acc[image.campus]) {
      acc[image.campus] = [];
    }
    acc[image.campus].push(image);
    return acc;
  }, {} as Record<string, CarouselImage[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            Carousel Manager
          </h2>
          <p className="text-muted-foreground">Manage campus carousel images - changes sync in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {CAMPUSES.map(campus => (
                <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => fetchImages()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{images.length}</p>
          <p className="text-sm text-muted-foreground">Total Images</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-600">{images.filter(i => i.is_active).length}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-muted-foreground">{images.filter(i => !i.is_active).length}</p>
          <p className="text-sm text-muted-foreground">Hidden</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{Object.keys(imagesByCampus).length}</p>
          <p className="text-sm text-muted-foreground">Campuses</p>
        </Card>
      </div>

      {/* Images Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No carousel images</h3>
            <p className="text-muted-foreground mb-4">
              Add images to display in the campus carousel
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Image
            </Button>
          </CardContent>
        </Card>
      ) : selectedCampus === 'all' ? (
        // Grouped by campus view
        <div className="space-y-6">
          {Object.entries(imagesByCampus).map(([campus, campusImages]) => (
            <Card key={campus}>
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{getCampusLabel(campus)}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant={campusImages.length >= 15 ? 'destructive' : 'secondary'}>
                      {campusImages.length}/15 images
                    </Badge>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {campusImages.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      onEdit={openEditDialog}
                      onDelete={confirmDelete}
                      onToggle={handleToggleActive}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Single campus - reorderable list
        <Reorder.Group axis="y" values={images} onReorder={handleReorder} className="space-y-3">
          <AnimatePresence>
            {images.map((image) => (
              <Reorder.Item key={image.id} value={image}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className={`${!image.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        
                        <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img 
                            src={image.image_url} 
                            alt={image.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Image+Error';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{image.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {image.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(image.id, image.is_active)}
                            title={image.is_active ? 'Hide' : 'Show'}
                          >
                            {image.is_active ? (
                              <Eye className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(image)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(image)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDelete(image)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle>{editingImage ? 'Edit Image' : 'Add New Image'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select value={formData.campus} onValueChange={(v) => setFormData({ ...formData, campus: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {CAMPUSES.filter(c => c.value !== 'all').map(campus => (
                    <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Image Source</Label>
              <Tabs value={uploadTab} onValueChange={(v) => setUploadTab(v as 'url' | 'upload')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url" className="gap-2">
                    <Link className="h-4 w-4" /> URL
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" /> Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-2">
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </TabsContent>
                <TabsContent value="upload" className="space-y-2">
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
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
              
              {formData.image_url && (
                <div className="w-full h-40 rounded-lg overflow-hidden bg-muted mt-2">
                  <img 
                    src={formData.image_url} 
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Invalid+URL';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Image title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isUploading}>
              {editingImage ? 'Save Changes' : 'Add Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{imageToDelete?.title}"? This action cannot be undone.
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

// Image Card Component for Grid View
const ImageCard = ({ 
  image, 
  onEdit, 
  onDelete, 
  onToggle,
  onDuplicate
}: { 
  image: CarouselImage;
  onEdit: (image: CarouselImage) => void;
  onDelete: (image: CarouselImage) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDuplicate: (image: CarouselImage) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`group relative rounded-lg overflow-hidden border ${!image.is_active ? 'opacity-60' : ''}`}
  >
    <div className="aspect-video bg-muted">
      <img 
        src={image.image_url} 
        alt={image.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Image+Error';
        }}
      />
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-medium truncate">{image.title}</p>
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => onToggle(image.id, image.is_active)}
          >
            {image.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDuplicate(image)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(image)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(image)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
    <div className="p-2">
      <Badge variant="secondary" className="text-xs">{image.category}</Badge>
    </div>
  </motion.div>
);
