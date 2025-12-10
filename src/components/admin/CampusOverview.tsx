import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  TrendingUp,
  XCircle,
  Building2,
  Upload,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type CampusLocation = Database['public']['Enums']['campus_location'];
type Incident = Database['public']['Tables']['incidents']['Row'];

interface CampusMetrics {
  total: number;
  pending: number;
  assigned: number;
  resolved: number;
  rejected: number;
  emergencies: number;
}

interface CampusInfo {
  id: CampusLocation;
  name: string;
  fullName: string;
  image?: string;
}

// Full campus names as per TUT
const campusData: CampusInfo[] = [
  { id: 'pretoria_west_main', name: 'Pretoria West', fullName: 'Pretoria West Campus (Main)' },
  { id: 'arcadia', name: 'Arcadia', fullName: 'Arcadia Campus' },
  { id: 'arts', name: 'Arts', fullName: 'Arts Campus' },
  { id: 'giyani', name: 'Giyani', fullName: 'Giyani Campus' },
  { id: 'mbombela', name: 'Mbombela', fullName: 'Mbombela Campus' },
  { id: 'polokwane', name: 'Polokwane', fullName: 'Polokwane Campus' },
  { id: 'garankuwa', name: 'Ga-Rankuwa', fullName: 'Ga-Rankuwa Campus' },
  { id: 'soshanguve_south', name: 'Soshanguve South', fullName: 'Soshanguve South Campus' },
  { id: 'soshanguve_north', name: 'Soshanguve North', fullName: 'Soshanguve North Campus' },
  { id: 'emalahleni', name: 'eMalahleni', fullName: 'eMalahleni Campus' },
];

const MetricCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
}) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg ${color}`}>
    <Icon className="h-5 w-5" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  </div>
);

export const CampusOverview = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState<CampusLocation | null>(null);
  const [campusImages, setCampusImages] = useState<Record<string, string>>({});
  const [uploadingFor, setUploadingFor] = useState<CampusLocation | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setIncidents(data);
    }
    setLoading(false);
  };

  const fetchCampusImages = async () => {
    // Fetch campus images from carousel_images with category 'campus_entrance'
    const { data } = await supabase
      .from('carousel_images')
      .select('*')
      .eq('category', 'campus_entrance')
      .eq('is_active', true);

    if (data) {
      const imageMap: Record<string, string> = {};
      data.forEach(img => {
        imageMap[img.campus] = img.image_url;
      });
      setCampusImages(imageMap);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchCampusImages();

    // Real-time subscription for incidents
    const channel = supabase
      .channel('campus-incidents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          console.log('Real-time incident update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [payload.new as Incident, ...prev]);
            toast.info('New incident reported');
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => 
              prev.map(inc => inc.id === payload.new.id ? payload.new as Incident : inc)
            );
          } else if (payload.eventType === 'DELETE') {
            setIncidents(prev => prev.filter(inc => inc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getCampusMetrics = (campusId: CampusLocation): CampusMetrics => {
    const campusIncidents = incidents.filter(i => i.campus === campusId);
    return {
      total: campusIncidents.length,
      pending: campusIncidents.filter(i => i.status === 'pending').length,
      assigned: campusIncidents.filter(i => i.status === 'assigned').length,
      resolved: campusIncidents.filter(i => i.status === 'resolved').length,
      rejected: campusIncidents.filter(i => i.status === 'rejected').length,
      emergencies: campusIncidents.filter(i => i.title.includes('EMERGENCY')).length,
    };
  };

  const handleImageUpload = async (file: File, campusId: CampusLocation) => {
    try {
      setUploadingFor(campusId);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `campus-entrance-${campusId}-${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      // Check if entry exists
      const { data: existing } = await supabase
        .from('carousel_images')
        .select('id')
        .eq('campus', campusId)
        .eq('category', 'campus_entrance')
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase
          .from('carousel_images')
          .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Insert new
        await supabase
          .from('carousel_images')
          .insert({
            campus: campusId,
            category: 'campus_entrance',
            title: `${campusId} Entrance`,
            image_url: urlData.publicUrl,
            is_active: true
          });
      }

      setCampusImages(prev => ({ ...prev, [campusId]: urlData.publicUrl }));
      toast.success('Campus image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingFor(null);
    }
  };

  const selectedMetrics = selectedCampus ? getCampusMetrics(selectedCampus) : null;
  const selectedCampusInfo = campusData.find(c => c.id === selectedCampus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Campus Overview</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {incidents.length} total incidents
          </Badge>
          <Button variant="ghost" size="icon" onClick={fetchIncidents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-52 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {campusData.map((campus, index) => {
            const metrics = getCampusMetrics(campus.id);
            const hasEmergencies = metrics.emergencies > 0;
            const hasPending = metrics.pending > 0;
            const campusImage = campusImages[campus.id];

            return (
              <motion.button
                key={campus.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCampus(campus.id)}
                className={`relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  hasEmergencies 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : hasPending 
                      ? 'border-amber-500/30 bg-amber-500/5' 
                      : 'border-border bg-card'
                }`}
              >
                {/* Campus Image */}
                <div className="h-24 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                  {campusImage ? (
                    <img 
                      src={campusImage} 
                      alt={campus.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary/40" />
                  )}
                </div>

                {/* Campus Info */}
                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm text-foreground truncate" title={campus.fullName}>
                    {campus.name}
                  </h3>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center p-1 rounded bg-muted/50">
                      <p className="font-bold text-foreground">{metrics.total}</p>
                      <p className="text-muted-foreground text-[10px]">Total</p>
                    </div>
                    <div className="text-center p-1 rounded bg-green-500/10">
                      <p className="font-bold text-green-600">{metrics.resolved}</p>
                      <p className="text-muted-foreground text-[10px]">Resolved</p>
                    </div>
                    <div className="text-center p-1 rounded bg-amber-500/10">
                      <p className="font-bold text-amber-600">{metrics.pending}</p>
                      <p className="text-muted-foreground text-[10px]">Pending</p>
                    </div>
                  </div>

                  {/* Emergency Badge */}
                  {hasEmergencies && (
                    <div className="flex items-center gap-1 text-destructive text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{metrics.emergencies} emergency</span>
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${
                  hasEmergencies 
                    ? 'bg-destructive animate-pulse' 
                    : hasPending 
                      ? 'bg-amber-500' 
                      : metrics.total > 0 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                }`} />
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Detailed Metrics Dialog */}
      <Dialog open={!!selectedCampus} onOpenChange={() => setSelectedCampus(null)}>
        <DialogContent className="max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedCampusInfo?.fullName}
            </DialogTitle>
          </DialogHeader>

          {selectedMetrics && selectedCampus && (
            <div className="space-y-4">
              {/* Campus Image with Upload */}
              <div className="relative h-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-border overflow-hidden group">
                {campusImages[selectedCampus] ? (
                  <img 
                    src={campusImages[selectedCampus]} 
                    alt={selectedCampusInfo?.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No campus image</p>
                  </div>
                )}
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                  <div className="text-center text-white">
                    <Upload className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-xs">{uploadingFor === selectedCampus ? 'Uploading...' : 'Upload Image'}</p>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, selectedCampus);
                    }}
                    disabled={uploadingFor === selectedCampus}
                  />
                </label>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={FileText} 
                  label="Total Cases" 
                  value={selectedMetrics.total} 
                  color="bg-muted/50"
                />
                <MetricCard 
                  icon={AlertTriangle} 
                  label="Emergencies" 
                  value={selectedMetrics.emergencies} 
                  color="bg-destructive/10 text-destructive"
                />
                <MetricCard 
                  icon={Clock} 
                  label="Pending" 
                  value={selectedMetrics.pending} 
                  color="bg-amber-500/10 text-amber-600"
                />
                <MetricCard 
                  icon={TrendingUp} 
                  label="Assigned" 
                  value={selectedMetrics.assigned} 
                  color="bg-blue-500/10 text-blue-600"
                />
                <MetricCard 
                  icon={CheckCircle} 
                  label="Resolved" 
                  value={selectedMetrics.resolved} 
                  color="bg-green-500/10 text-green-600"
                />
                <MetricCard 
                  icon={XCircle} 
                  label="Rejected" 
                  value={selectedMetrics.rejected} 
                  color="bg-red-500/10 text-red-600"
                />
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Real-time data • Click to view detailed incidents
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
