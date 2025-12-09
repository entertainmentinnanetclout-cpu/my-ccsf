import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Image, Edit2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

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
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    campus: 'all',
    image_url: '',
    title: '',
    category: 'Campus'
  });

  useEffect(() => {
    fetchImages();
  }, [selectedCampus]);

  const fetchImages = async () => {
    setIsLoading(true);
    let query = supabase
      .from('carousel_images')
      .select('*')
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

  const handleSubmit = async () => {
    if (!formData.image_url || !formData.title) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (editingImage) {
      // Update existing
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
        fetchImages();
      }
    } else {
      // Create new
      const maxOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order)) + 1 : 0;
      
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
        fetchImages();
      }
    }

    setIsDialogOpen(false);
    setEditingImage(null);
    setFormData({ campus: 'all', image_url: '', title: '', category: 'Campus' });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('carousel_images')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting image', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Image deleted' });
      fetchImages();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('carousel_images')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating status', description: error.message, variant: 'destructive' });
    } else {
      fetchImages();
    }
  };

  const handleReorder = async (newOrder: CarouselImage[]) => {
    setImages(newOrder);
    
    // Update display_order in database
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
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingImage(null);
    setFormData({ campus: selectedCampus === 'all' ? 'pretoria_west_main' : selectedCampus, image_url: '', title: '', category: 'Campus' });
    setIsDialogOpen(true);
  };

  const getCampusLabel = (value: string) => {
    return CAMPUSES.find(c => c.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Carousel Manager</h2>
          <p className="text-muted-foreground">Manage campus carousel images</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPUSES.map(campus => (
                <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </div>
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
      ) : (
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
                            <span className="text-xs text-muted-foreground">
                              {getCampusLabel(image.campus)}
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
                            onClick={() => openEditDialog(image)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(image.id)}
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
        <DialogContent>
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
                <SelectContent>
                  {CAMPUSES.filter(c => c.value !== 'all').map(campus => (
                    <SelectItem key={campus.value} value={campus.value}>{campus.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Image URL *</Label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="w-full h-32 rounded-lg overflow-hidden bg-muted mt-2">
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
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {editingImage ? 'Save Changes' : 'Add Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
