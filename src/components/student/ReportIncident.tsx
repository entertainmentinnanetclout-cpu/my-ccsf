import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { MapPin, Loader2, Camera } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const ReportIncident = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    locationDescription: '',
    isAnonymous: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => console.log('Location permission denied')
      );
    }
  }, []);

  const categories = [
    { value: 'Rape', label: 'Rape' },
    { value: 'Sexual assault', label: 'Sexual Assault' },
    { value: 'Gbv', label: 'Gender-Based Violence (GBV)' },
    { value: 'Murder', label: 'Murder' },
    { value: 'Theft', label: 'Theft' },
    { value: 'Robbery', label: 'Robbery' },
    { value: 'Vandalism', label: 'Vandalism' },
    { value: 'Other', label: 'Other' },
  ];

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast({ title: 'Location captured' });
        },
        () => toast({ title: 'Location error', variant: 'destructive' })
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: incident, error } = await supabase
        .from('incidents')
        .insert([{
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_description: formData.locationDescription,
          is_anonymous: formData.isAnonymous,
          reporter_id: formData.isAnonymous ? null : user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      if (files.length > 0 && incident) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${incident.id}/${Date.now()}-${i}.${file.name.split('.').pop()}`;

          await supabase.storage.from('incident-media').upload(fileName, file);
          await supabase.from('incident_media').insert({
            incident_id: incident.id,
            media_url: fileName,
            media_type: file.type,
          });

          setUploadProgress(((i + 1) / files.length) * 100);
        }
      }

      toast({ title: 'Report submitted successfully' });
      setFormData({ title: '', description: '', category: '', locationDescription: '', isAnonymous: false });
      setFiles([]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Report an Incident</CardTitle>
          <CardDescription>Provide details about the incident. Your report helps keep campus safe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Incident Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Brief description"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Statement *</Label>
              <Textarea
                placeholder="Provide your detailed statement..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Building, room number, or area"
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={getCurrentLocation}>
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {location && (
                <p className="text-sm text-muted-foreground">
                  GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Photos/Evidence</Label>
              <div className="flex items-center gap-2">
                <Input type="file" multiple accept="image/*" onChange={handleFileChange} className="flex-1" />
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
              {files.length > 0 && <p className="text-sm text-muted-foreground">{files.length} file(s) selected</p>}
            </div>

            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label>Report Anonymously</Label>
                <p className="text-sm text-muted-foreground">Your identity will not be associated with this report</p>
              </div>
              <Switch
                checked={formData.isAnonymous}
                onCheckedChange={(checked) => setFormData({ ...formData, isAnonymous: checked })}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : 'Submit Report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
