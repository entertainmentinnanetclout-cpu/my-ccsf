import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  location_lat: number;
  location_lng: number;
  location_description: string;
  reporter_id: string;
  created_at: string;
};

type IncidentMedia = {
  id: string;
  media_url: string;
  media_type: string;
};

interface IncidentDetailsModalProps {
  incidentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentDetailsModal = ({ incidentId, isOpen, onClose }: IncidentDetailsModalProps) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [media, setMedia] = useState<IncidentMedia[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && incidentId) {
      const fetchIncidentDetails = async () => {
        const { data: incidentData, error: incidentError } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .maybeSingle();

        if (incidentError) {
          console.error('Error fetching incident details:', incidentError);
        } else {
          setIncident(incidentData);
        }

        const { data: mediaData, error: mediaError } = await supabase
          .from('incident_media')
          .select('*')
          .eq('incident_id', incidentId);

        if (mediaError) {
          console.error('Error fetching incident media:', mediaError);
        } else {
          setMedia(mediaData || []);
        }
      };

      fetchIncidentDetails();
    }
  }, [isOpen, incidentId]);

  const updateStatus = async (status: 'pending' | 'assigned' | 'resolved' | 'rejected') => {
    if (!incident) return;
    await supabase.from('incidents').update({ status }).eq('id', incident.id);
    toast({ title: 'Status updated' });
    onClose();
  };

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {incident.title}
            {incident.category === 'emergency' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className="font-semibold mb-2">Details</h3>
            <p><strong>Description:</strong> {incident.description}</p>
            <p><strong>Status:</strong> {incident.status}</p>
            <p><strong>Anonymous:</strong> {incident.is_anonymous ? 'Yes' : 'No'}</p>
            <p><strong>Location:</strong> {incident.location_description}</p>
            <p><strong>Reported At:</strong> {new Date(incident.created_at).toLocaleString()}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Media</h3>
            <div className="grid grid-cols-2 gap-2">
              {media.map((item) => (
                <motion.div key={item.id} whileHover={{ scale: 1.05 }}>
                  <img src={item.media_url} alt="Incident media" className="rounded-lg" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => updateStatus('assigned')}>Assign</Button>
          <Button variant="destructive" onClick={() => updateStatus('rejected')}>Reject</Button>
          <Button onClick={() => updateStatus('resolved')}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
