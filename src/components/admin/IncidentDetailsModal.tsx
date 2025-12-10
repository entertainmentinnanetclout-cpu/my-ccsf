import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, MapPin, User, Clock, Shield, ExternalLink, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  location_lat: number | null;
  location_lng: number | null;
  location_description: string | null;
  reporter_id: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  campus: string | null;
  created_at: string;
  updated_at: string;
};

type IncidentMedia = {
  id: string;
  media_url: string;
  media_type: string;
};

type StaffMember = {
  id: string;
  full_name: string | null;
  email: string;
};

interface IncidentDetailsModalProps {
  incidentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const EMERGENCY_CATEGORIES = [
  'Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder',
  'Armed robbery', 'Assault GBH', 'Public violence'
];

const campusDisplayNames: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main)',
  arcadia: 'Arcadia Campus',
  arts: 'Arts Campus',
  giyani: 'Giyani Campus',
  mbombela: 'Mbombela Campus',
  polokwane: 'Polokwane Campus',
  garankuwa: 'Ga-Rankuwa Campus',
  soshanguve_south: 'Soshanguve South',
  soshanguve_north: 'Soshanguve North',
  emalahleni: 'eMalahleni Campus'
};

export const IncidentDetailsModal = ({ incidentId, isOpen, onClose }: IncidentDetailsModalProps) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [media, setMedia] = useState<IncidentMedia[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && incidentId) {
      fetchIncidentDetails();
      fetchStaffMembers();
    }
  }, [isOpen, incidentId]);

  const fetchIncidentDetails = async () => {
    const { data: incidentData, error: incidentError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .maybeSingle();

    if (incidentError) {
      console.error('Error fetching incident details:', incidentError);
    } else if (incidentData) {
      setIncident(incidentData);
      setSelectedStaff(incidentData.assigned_to || '');
      setResolutionNotes(incidentData.resolution_notes || '');
    }

    const { data: mediaData, error: mediaError } = await supabase
      .from('incident_media')
      .select('*')
      .eq('incident_id', incidentId);

    if (!mediaError) {
      setMedia(mediaData || []);
    }
  };

  const fetchStaffMembers = async () => {
    // Fetch security officers using the database function
    const { data, error } = await supabase
      .rpc('get_security_officers');

    if (!error && data) {
      setStaffMembers(data.map((s: { id: string; full_name: string | null; email: string }) => ({
        id: s.id,
        full_name: s.full_name,
        email: s.email
      })));
    } else {
      console.error('Error fetching security officers:', error);
      // Fallback to fetching all profiles if function fails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .limit(50);
      if (profiles) {
        setStaffMembers(profiles);
      }
    }
  };

  const updateIncident = async (updates: Record<string, unknown>) => {
    if (!incident) return;
    setIsUpdating(true);
    
    const { error } = await supabase
      .from('incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', incident.id);

    setIsUpdating(false);

    if (error) {
      toast({
        title: 'Error updating incident', 
        description: error.message,
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Incident updated successfully' });
      fetchIncidentDetails();
    }
  };

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast({ title: 'Please select a staff member', variant: 'destructive' });
      return;
    }
    await updateIncident({ 
      assigned_to: selectedStaff, 
      status: 'assigned' as const
    });
  };

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast({ title: 'Please add resolution notes', variant: 'destructive' });
      return;
    }
    await updateIncident({ 
      status: 'resolved' as const,
      resolution_notes: resolutionNotes,
      resolved_at: new Date().toISOString()
    });
  };

  const handleReject = async () => {
    if (!resolutionNotes.trim()) {
      toast({ title: 'Please add reason for rejection', variant: 'destructive' });
      return;
    }
    await updateIncident({ 
      status: 'rejected' as const,
      resolution_notes: resolutionNotes
    });
  };

  const handleReopen = async () => {
    await updateIncident({ 
      status: 'pending' as const,
      resolved_at: null,
      resolved_by: null
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      assigned: 'default',
      resolved: 'outline',
      rejected: 'destructive'
    };
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/30'
    };
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const isEmergency = incident?.category && EMERGENCY_CATEGORIES.includes(incident.category);

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span>{incident.title}</span>
            {isEmergency && (
              <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                Emergency
              </Badge>
            )}
            {getStatusBadge(incident.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left Column - Incident Details */}
          <div className="space-y-6">
            {/* Description */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Category & Campus */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <p className="font-medium">{incident.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <Label className="text-xs text-muted-foreground">Campus</Label>
                <p className="font-medium">
                  {incident.campus ? campusDisplayNames[incident.campus] || incident.campus : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              {incident.location_description ? (
                <p className="text-sm mb-2">{incident.location_description}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">No address provided</p>
              )}
              {incident.location_lat && incident.location_lng && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {incident.location_lat.toFixed(6)}, {incident.location_lng.toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${incident.location_lat},${incident.location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Maps
                  </a>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reported</span>
                  <span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{formatDistanceToNow(new Date(incident.updated_at), { addSuffix: true })}</span>
                </div>
                {incident.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span>{formatDistanceToNow(new Date(incident.resolved_at), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reporter Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Reporter
              </h3>
              {incident.is_anonymous ? (
                <p className="text-muted-foreground italic">Anonymous report</p>
              ) : (
                <p className="text-sm">Reporter ID: {incident.reporter_id || 'Not available'}</p>
              )}
            </div>
          </div>

          {/* Right Column - Media & Actions */}
          <div className="space-y-6">
            {/* Media */}
            {media.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Evidence ({media.length} files)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {media.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ scale: 1.02 }}
                      className="relative rounded-lg overflow-hidden border"
                    >
                      {item.media_type.startsWith('video') ? (
                        <video 
                          src={item.media_url} 
                          controls 
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                          <img 
                            src={item.media_url} 
                            alt="Incident evidence" 
                            className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Section */}
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Case Assignment
              </h3>
              <div className="space-y-3">
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name || staff.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAssign} 
                  disabled={!selectedStaff || isUpdating}
                  className="w-full"
                  variant="secondary"
                >
                  Assign Case
                </Button>
              </div>
            </div>

            {/* Resolution Notes */}
            <div className="p-4 rounded-lg border bg-card">
              <h3 className="font-semibold mb-3">Resolution Notes</h3>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about how this case was handled, actions taken, or reason for rejection..."
                className="min-h-[120px]"
              />
              {incident.resolution_notes && incident.status !== 'pending' && (
                <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                  <Label className="text-xs text-muted-foreground">Previous Notes:</Label>
                  <p className="mt-1">{incident.resolution_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap gap-2 mt-6">
          {incident.status === 'resolved' || incident.status === 'rejected' ? (
            <Button 
              variant="outline" 
              onClick={handleReopen}
              disabled={isUpdating}
            >
              Reopen Case
            </Button>
          ) : (
            <>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isUpdating}
              >
                Reject
              </Button>
              <Button 
                onClick={handleResolve}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Mark Resolved
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
