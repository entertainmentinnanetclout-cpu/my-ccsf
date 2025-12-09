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
import { MapPin, Loader2, Camera, Navigation, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Database } from '@/integrations/supabase/types';

type IncidentCategory = Database['public']['Enums']['incident_category'];

// Reverse geocode using free Nominatim API (OpenStreetMap)
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CCSF-Campus-Safety-App'
        }
      }
    );
    const data = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

export const ReportIncident = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IncidentCategory | '',
    locationDescription: '',
    isAnonymous: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-fetch location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const categories: { value: IncidentCategory; label: string }[] = [
    { value: 'Rape', label: 'Rape' },
    { value: 'Sexual assault', label: 'Sexual Assault' },
    { value: 'Gbv', label: 'Gender-Based Violence (GBV)' },
    { value: 'Murder', label: 'Murder' },
    { value: 'Attempted murder', label: 'Attempted Murder' },
    { value: 'Assault common', label: 'Common Assault' },
    { value: 'Assault GBH', label: 'Assault GBH (Grievous Bodily Harm)' },
    { value: 'Fraud', label: 'Fraud' },
    { value: 'Theft', label: 'Theft' },
    { value: 'Robbery', label: 'Robbery' },
    { value: 'Armed robbery', label: 'Armed Robbery' },
    { value: 'Arson', label: 'Arson' },
    { value: 'Malicious damage to property', label: 'Malicious Damage to Property' },
    { value: 'Trespassing', label: 'Trespassing' },
    { value: 'Reckless and negligent driving', label: 'Reckless and Negligent Driving' },
    { value: 'Driving under the influence of alcohol', label: 'Driving Under the Influence' },
    { value: 'Public violence', label: 'Public Violence' },
    { value: 'Sports and Rec Events Act Violation', label: 'Sports & Rec Events Act Violation' },
    { value: 'Crimmen enjuria (Hate speech)', label: 'Crimen Injuria (Hate Speech)' },
    { value: 'Cyber related crime (bullying etc.)', label: 'Cyber Crime / Bullying' },
    { value: 'Vandalism', label: 'Vandalism' },
  ];

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setLocation({ lat, lng });
        
        // Get full address from coordinates
        const address = await reverseGeocode(lat, lng);
        setLocationAddress(address);
        
        // Auto-fill location description with the address
        if (!formData.locationDescription) {
          setFormData(prev => ({ ...prev, locationDescription: address }));
        }
        
        setGettingLocation(false);
        toast({ 
          title: 'Location captured successfully',
          description: 'Your GPS location has been recorded with full address.',
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location permission denied. Please enable location access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location unavailable. Please try again.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        toast({ title: message, variant: 'destructive' });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
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
      if (!formData.category) {
        toast({ title: 'Please select a category', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (!formData.title.trim()) {
        toast({ title: 'Please enter a title', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (!formData.description.trim()) {
        toast({ title: 'Please enter a description', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Build full location description including address
      let fullLocationDescription = formData.locationDescription;
      if (locationAddress && !fullLocationDescription.includes(locationAddress)) {
        fullLocationDescription = fullLocationDescription 
          ? `${fullLocationDescription} | GPS: ${locationAddress}`
          : locationAddress;
      }

      const { data: incident, error } = await supabase
        .from('incidents')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category as IncidentCategory,
          location_lat: location?.lat,
          location_lng: location?.lng,
          location_description: fullLocationDescription,
          is_anonymous: formData.isAnonymous,
          reporter_id: formData.isAnonymous ? null : user?.id,
          campus: userProfile?.campus as any || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload media files if any
      if (files.length > 0 && incident) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${incident.id}/${Date.now()}-${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('incident-media')
            .upload(fileName, file);

          if (!uploadError) {
            await supabase.from('incident_media').insert({
              incident_id: incident.id,
              media_url: fileName,
              media_type: file.type,
              file_size: file.size,
            });
          }

          setUploadProgress(((i + 1) / files.length) * 100);
        }
      }

      toast({ 
        title: 'Report submitted successfully!',
        description: 'Your incident has been recorded and will be reviewed by campus security.',
      });
      
      // Reset form
      setFormData({ title: '', description: '', category: '', locationDescription: '', isAnonymous: false });
      setFiles([]);
      setLocationAddress('');
      setLocation(null);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Incident Category *</Label>
              <Select value={formData.category} onValueChange={(value: IncidentCategory) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Brief description of incident"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Statement *</Label>
              <Textarea
                placeholder="Provide your detailed statement of what happened..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={5}
              />
            </div>

            {/* Location Section */}
            <div className="space-y-3">
              <Label>Location</Label>
              
              {/* GPS Location Status */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {location ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Navigation className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      {location ? 'Location Captured' : 'GPS Location'}
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting Location...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        {location ? 'Refresh Location' : 'Get My Location'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Display GPS Coordinates */}
                {location && (
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium">GPS Coordinates:</span> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                  </div>
                )}

                {/* Display Full Address */}
                {locationAddress && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm">
                      <span className="font-semibold text-green-700 dark:text-green-400">📍 Full Address:</span>
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                      {locationAddress}
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Location Details */}
              <div className="space-y-2">
                <Label className="text-sm">Additional Location Details</Label>
                <Input
                  placeholder="Building name, room number, or specific area..."
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Add any specific details like building name, floor, or nearby landmarks
                </p>
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
              <Label>Photos/Evidence</Label>
              <div className="flex items-center gap-2">
                <Input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="flex-1" />
                <Camera className="h-5 w-5 text-muted-foreground" />
              </div>
              {files.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {files.length} file(s) selected ({files.map(f => f.name).join(', ')})
                </p>
              )}
            </div>

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} />
                <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
              </div>
            )}

            {/* Anonymous Toggle */}
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

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
