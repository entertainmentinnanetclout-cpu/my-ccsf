#!/usr/bin/env python3
"""Harden carousel upload lifecycle, failure states and responsive controls."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "src/components/admin/CarouselManager.tsx"


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return content.replace(old, new, 1)


content = PATH.read_text()

content = replace_once(
    content,
    "import { Plus, Trash2, Image, Edit2, Eye, EyeOff, Upload, ChevronRight, Images, Building2 } from 'lucide-react';",
    "import { Plus, Trash2, Image, Edit2, Eye, EyeOff, Upload, ChevronRight, Images, Building2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';",
    "add carousel state icons",
)
content = replace_once(
    content,
    "  const [isLoading, setIsLoading] = useState(true);\n",
    "  const [isLoading, setIsLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());\n",
    "add carousel error states",
)
content = replace_once(
    content,
    "  const [uploadProgress, setUploadProgress] = useState(0);\n",
    "  const [uploadProgress, setUploadProgress] = useState(0);\n  const [pendingStoragePath, setPendingStoragePath] = useState<string | null>(null);\n  const [isSaving, setIsSaving] = useState(false);\n",
    "add carousel media lifecycle state",
)

content = replace_once(
    content,
    "      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, fetchAllImages)\n      .subscribe();\n\n    return () => {\n      supabase.removeChannel(channel);\n",
    "      .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => void fetchAllImages())\n      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {\n          setLoadError('Live carousel updates are temporarily unavailable.');\n        }\n      });\n\n    return () => {\n      void supabase.removeChannel(channel);\n",
    "surface carousel realtime state",
)
content = replace_once(
    content,
    "  const fetchAllImages = async () => {\n    setIsLoading(true);\n",
    "  const fetchAllImages = async () => {\n    setIsLoading(true);\n    setLoadError(null);\n",
    "reset carousel error",
)
content = replace_once(
    content,
    "    if (error) {\n      toast({ title: 'Error fetching images', description: error.message, variant: 'destructive' });\n    } else {\n",
    "    if (error) {\n      setLoadError('Carousel images could not be loaded.');\n      toast({ title: 'Error fetching images', description: error.message, variant: 'destructive' });\n    } else {\n",
    "surface carousel load failure",
)

content = replace_once(
    content,
    "    if (!file.type.startsWith('image/')) {\n      toast({ title: 'Please select an image file', variant: 'destructive' });\n      return;\n    }\n",
    "    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {\n      toast({ title: 'Image format not accepted', description: 'Use JPG, PNG or WebP.', variant: 'destructive' });\n      return;\n    }\n",
    "restrict carousel image formats",
)

content = replace_once(
    content,
    "    const progressInterval = setInterval(() => {\n      setUploadProgress(prev => {\n        if (prev >= 90) {\n          clearInterval(progressInterval);\n          return 90;\n        }\n        return prev + Math.random() * 15;\n      });\n    }, 200);\n\n    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;\n",
    "    setUploadProgress(15);\n    const fileName = `${selectedCampus}/${crypto.randomUUID()}.jpg`;\n",
    "remove simulated progress and random filename",
)
content = replace_once(
    content,
    "        contentType: 'image/jpeg',\n        upsert: true\n",
    "        contentType: 'image/jpeg',\n        upsert: false\n",
    "prevent carousel upload overwrite",
)
content = replace_once(
    content,
    "    clearInterval(progressInterval);\n\n    if (error) {\n",
    "    if (error) {\n",
    "remove fake progress interval cleanup",
)
content = replace_once(
    content,
    "    setTimeout(() => {\n      setFormData({ ...formData, image_url: publicUrl.publicUrl });\n      setIsUploading(false);\n      setUploadProgress(0);\n      setImageToCrop(null);\n      toast({ title: 'Image uploaded' });\n    }, 300);\n",
    "    setPendingStoragePath(fileName);\n    setFormData((current) => ({ ...current, image_url: publicUrl.publicUrl }));\n    setIsUploading(false);\n    setUploadProgress(0);\n    setImageToCrop(null);\n    toast({ title: 'Image uploaded', description: 'Save the carousel entry to publish it.' });\n",
    "record pending carousel object",
)

helper = """
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

"""
content = replace_once(
    content,
    "  const handleSubmit = async () => {\n",
    helper + "  const handleSubmit = async () => {\n",
    "add carousel storage helpers",
)

start = content.index("  const handleSubmit = async () => {")
end = content.index("\n  const closeDialog =", start)
old_submit = content[start:end]
new_submit = """  const handleSubmit = async () => {
    if (!formData.image_url || !formData.title.trim()) {
      toast({ title: 'Please add an image and title', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const title = formData.title.trim();

    if (editingImage) {
      const previousStoragePath = getStoragePath(editingImage.image_url);
      const { error } = await supabase
        .from('carousel_images')
        .update({ image_url: formData.image_url, title, category: formData.category })
        .eq('id', editingImage.id);

      if (error) {
        toast({ title: 'Image was not updated', description: error.message, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      if (pendingStoragePath && previousStoragePath && previousStoragePath !== pendingStoragePath) {
        const removed = await removeStorageObject(previousStoragePath);
        if (!removed) {
          toast({ title: 'Image updated with cleanup warning', description: 'The previous file could not be removed from Storage.', variant: 'destructive' });
        }
      }
      toast({ title: 'Image updated' });
    } else {
      if (campusCount >= MAX_IMAGES_PER_CAMPUS) {
        toast({ title: 'Limit reached', description: `Maximum ${MAX_IMAGES_PER_CAMPUS} images per campus`, variant: 'destructive' });
        setIsSaving(false);
        return;
      }

      const maxOrder = campusImages.length > 0 ? Math.max(...campusImages.map(i => i.display_order)) + 1 : 0;
      const { error } = await supabase.from('carousel_images').insert({
        campus: selectedCampus,
        image_url: formData.image_url,
        title,
        category: formData.category,
        display_order: maxOrder,
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
    closeDialog(false);
    await fetchAllImages();
  };"""
content = content[:start] + new_submit + content[end:]

content = replace_once(
    content,
    "  const closeDialog = () => {\n    setIsDialogOpen(false);\n    setEditingImage(null);\n    setFormData({ image_url: '', title: '', category: 'Campus' });\n  };",
    "  const closeDialog = async (removePending = true) => {\n    if (removePending && pendingStoragePath) {\n      const removed = await removeStorageObject(pendingStoragePath);\n      if (!removed) {\n        toast({ title: 'Upload cleanup warning', description: 'The unused upload could not be removed from Storage.', variant: 'destructive' });\n      }\n    }\n    setPendingStoragePath(null);\n    setIsDialogOpen(false);\n    setEditingImage(null);\n    setFormData({ image_url: '', title: '', category: 'Campus' });\n  };",
    "clean pending upload on dialog close",
)

content = replace_once(
    content,
    "    if (error) {\n      toast({ title: 'Error deleting', description: error.message, variant: 'destructive' });\n    } else {\n      toast({ title: 'Image deleted' });\n    }\n    \n    setDeleteDialogOpen(false);\n    setImageToDelete(null);\n",
    "    if (error) {\n      toast({ title: 'Image was not deleted', description: error.message, variant: 'destructive' });\n      return;\n    }\n\n    const removed = await removeStorageObject(getStoragePath(imageToDelete.image_url));\n    toast({\n      title: removed ? 'Image deleted' : 'Image deleted with cleanup warning',\n      description: removed ? undefined : 'The database entry was deleted, but the file could not be removed from Storage.',\n      variant: removed ? 'default' : 'destructive',\n    });\n    setDeleteDialogOpen(false);\n    setImageToDelete(null);\n    await fetchAllImages();\n",
    "delete carousel row and storage object",
)
content = replace_once(
    content,
    "    if (error) {\n      toast({ title: 'Error updating', description: error.message, variant: 'destructive' });\n    }\n",
    "    if (error) {\n      toast({ title: 'Visibility was not updated', description: error.message, variant: 'destructive' });\n      return;\n    }\n    setAllImages((current) => current.map((item) => item.id === image.id ? { ...item, is_active: !item.is_active } : item));\n",
    "make carousel visibility update immediate and failure-aware",
)

content = replace_once(
    content,
    "    setEditingImage(image);\n    setFormData({\n",
    "    setPendingStoragePath(null);\n    setEditingImage(image);\n    setFormData({\n",
    "clear pending path before carousel edit",
)
content = replace_once(
    content,
    "    setEditingImage(null);\n    setFormData({ image_url: '', title: '', category: 'Campus' });\n",
    "    setPendingStoragePath(null);\n    setEditingImage(null);\n    setFormData({ image_url: '', title: '', category: 'Campus' });\n",
    "clear pending path before carousel add",
)

content = replace_once(
    content,
    '<div className="flex h-[calc(100vh-12rem)] gap-4">',
    '<div className="flex min-h-[calc(100vh-12rem)] flex-col gap-4 lg:h-[calc(100vh-12rem)] lg:flex-row">',
    "make carousel layout responsive",
)
content = replace_once(
    content,
    '<Card className="w-64 flex-shrink-0">',
    '<Card className="w-full flex-shrink-0 lg:w-64">',
    "make carousel campus selector responsive",
)
content = replace_once(
    content,
    '<ScrollArea className="h-[calc(100%-4rem)]">\n          <div className="p-2">',
    '<ScrollArea className="max-h-56 lg:h-[calc(100%-4rem)] lg:max-h-none">\n          <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:block">',
    "make carousel campuses mobile grid",
)
content = replace_once(
    content,
    "                  <div className=\"flex items-center justify-center h-48\">\n                   <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\" />\n                 </div>",
    "                  <div className=\"flex h-48 items-center justify-center\" role=\"status\" aria-label=\"Loading carousel images\">\n                   <Loader2 className=\"h-8 w-8 animate-spin text-primary\" aria-hidden=\"true\" />\n                 </div>",
    "announce carousel loading",
)
content = replace_once(
    content,
    "              ) : campusImages.length === 0 ? (",
    "              ) : loadError ? (\n                <div className=\"py-12 text-center\" role=\"alert\">\n                  <AlertCircle className=\"mx-auto mb-3 h-12 w-12 text-destructive\" aria-hidden=\"true\" />\n                  <h3 className=\"mb-1 font-semibold\">Carousel unavailable</h3>\n                  <p className=\"mb-4 text-sm text-muted-foreground\">{loadError}</p>\n                  <Button variant=\"outline\" onClick={() => void fetchAllImages()} className=\"gap-2\">\n                    <RefreshCw className=\"h-4 w-4\" aria-hidden=\"true\" /> Retry\n                  </Button>\n                </div>\n              ) : campusImages.length === 0 ? (",
    "add carousel retry error state",
)
content = replace_once(
    content,
    '<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">',
    '<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">',
    "make carousel grid fit phones",
)

content = replace_once(
    content,
    "                          <img \n                            src={image.image_url} \n                            alt={image.title}\n                            className=\"w-full h-full object-cover\"\n                            onError={(e) => {\n                              (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';\n                            }}\n                          />",
    "                          {brokenImages.has(image.id) ? (\n                            <div className=\"flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground\" role=\"img\" aria-label={`${image.title} image unavailable`}>\n                              <AlertCircle className=\"h-7 w-7 text-destructive\" aria-hidden=\"true\" />\n                              <span className=\"text-xs\">Image unavailable</span>\n                            </div>\n                          ) : (\n                            <img\n                              src={image.image_url}\n                              alt={image.title}\n                              className=\"h-full w-full object-cover\"\n                              onError={() => setBrokenImages((current) => new Set(current).add(image.id))}\n                            />\n                          )}",
    "replace remote carousel placeholder with explicit state",
)
content = replace_once(
    content,
    '<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">',
    '<div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">',
    "show carousel controls on touch and keyboard",
)
content = content.replace('title={image.is_active ? \'Hide\' : \'Show\'}', 'aria-label={image.is_active ? `Hide ${image.title}` : `Show ${image.title}`}')
content = content.replace('title="Edit"', 'aria-label={`Edit ${image.title}`}')
content = content.replace('title="Delete"', 'aria-label={`Delete ${image.title}`}')

content = replace_once(
    content,
    '<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>',
    '<Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) void closeDialog(); else setIsDialogOpen(true); }}>',
    "clean carousel pending upload when dialog closes",
)
content = content.replace('<Label>Image</Label>', '<Label htmlFor="carousel-image-upload">Image</Label>', 1)
content = content.replace('ref={fileInputRef}\n                type="file"', 'id="carousel-image-upload"\n                ref={fileInputRef}\n                type="file"', 1)
content = content.replace('accept="image/*"', 'accept="image/jpeg,image/png,image/webp"', 1)
content = replace_once(
    content,
    "                    <img \n                      src={formData.image_url} \n                      alt=\"Preview\"\n                      className=\"w-full h-full object-cover\"\n                      onError={(e) => {\n                        (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Error';\n                      }}\n                    />",
    "                    <img\n                      src={formData.image_url}\n                      alt=\"Carousel preview\"\n                      className=\"h-full w-full object-cover\"\n                      onError={() => toast({ title: 'Preview unavailable', description: 'Choose a different image before saving.', variant: 'destructive' })}\n                    />",
    "remove remote preview placeholder",
)
content = content.replace('<Label>Title</Label>', '<Label htmlFor="carousel-image-title">Title</Label>', 1)
content = content.replace('placeholder="e.g. Main Building Entrance"', 'id="carousel-image-title"\n                placeholder="e.g. Main Building Entrance"', 1)
content = content.replace('<Label>Type</Label>', '<Label htmlFor="carousel-image-category">Type</Label>', 1)
content = content.replace('<SelectTrigger>\n                  <SelectValue />', '<SelectTrigger id="carousel-image-category" aria-label="Carousel image type">\n                  <SelectValue />', 1)
content = content.replace('<Button variant="outline" onClick={closeDialog}>Cancel</Button>', '<Button variant="outline" onClick={() => void closeDialog()}>Cancel</Button>', 1)
content = content.replace('disabled={isUploading || !formData.image_url || !formData.title}', 'disabled={isUploading || isSaving || !formData.image_url || !formData.title.trim()}', 1)
content = content.replace("{editingImage ? 'Save' : 'Add'}", "{isSaving ? 'Saving…' : editingImage ? 'Save' : 'Add'}", 1)

PATH.write_text(content)
print("Applied Phase 4 carousel hardening.")
