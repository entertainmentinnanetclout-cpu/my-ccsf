import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Clock, Download, ExternalLink, FileText, Loader2, MapPin, Radio, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LiveLocationTracker } from './LiveLocationTracker';
import { createAuditedEvidenceLink } from '@/services/evidenceAccessService';

type Incident = {
  id: string; title: string; description: string; category: string; status: string; is_anonymous: boolean;
  location_lat: number | null; location_lng: number | null; location_description: string | null;
  reporter_id: string | null; assigned_to: string | null; resolution_notes: string | null;
  resolved_at: string | null; resolved_by: string | null; campus: string | null; created_at: string; updated_at: string;
};

type IncidentMedia = {
  id: string;
  media_url: string;
  media_type: string;
  original_filename?: string | null;
  signed_url?: string | null;
  access_error?: string | null;
};

type StaffMember = { id: string; full_name: string | null; email: string };
interface IncidentDetailsModalProps { incidentId: string; isOpen: boolean; onClose: () => void }

const EMERGENCY_CATEGORIES = ['Rape', 'Sexual assault', 'Gbv', 'Murder', 'Attempted murder', 'Armed robbery', 'Assault GBH', 'Public violence'];
const campusDisplayNames: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main)', arcadia: 'Arcadia Campus', arts: 'Arts Campus', giyani: 'Giyani Campus',
  mbombela: 'Mbombela Campus', polokwane: 'Polokwane Campus', garankuwa: 'Ga-Rankuwa Campus',
  soshanguve_south: 'Soshanguve South', soshanguve_north: 'Soshanguve North', emalahleni: 'eMalahleni Campus',
};

export const IncidentDetailsModal = ({ incidentId, isOpen, onClose }: IncidentDetailsModalProps) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [media, setMedia] = useState<IncidentMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchIncidentDetails = async () => {
    const { data: incidentData, error: incidentError } = await supabase.from('incidents').select('*').eq('id', incidentId).maybeSingle();
    if (incidentError) {
      toast({ title: 'Unable to open incident', description: incidentError.message, variant: 'destructive' });
      return;
    }
    if (incidentData) {
      setIncident(incidentData);
      setSelectedStaff(incidentData.assigned_to || '');
      setResolutionNotes(incidentData.resolution_notes || '');
    }

    setMediaLoading(true);
    const { data: mediaData, error: mediaError } = await supabase.from('incident_media').select('*').eq('incident_id', incidentId);
    if (mediaError) {
      setMedia([]);
      setMediaLoading(false);
      return;
    }
    const protectedMedia = await Promise.all((mediaData ?? []).map(async (item) => {
      try {
        const signedUrl = await createAuditedEvidenceLink({ scope: 'official', objectPath: item.media_url, action: 'preview', incidentId });
        return { ...item, signed_url: signedUrl, access_error: null } as IncidentMedia;
      } catch (error) {
        return { ...item, signed_url: null, access_error: error instanceof Error ? error.message : 'Evidence access failed.' } as IncidentMedia;
      }
    }));
    setMedia(protectedMedia);
    setMediaLoading(false);
  };

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase.rpc('get_security_officers');
    if (!error && data) {
      setStaffMembers(data.map((staff: { id: string; full_name: string | null; email: string }) => ({ id: staff.id, full_name: staff.full_name, email: staff.email })));
      return;
    }
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').limit(50);
    if (profiles) setStaffMembers(profiles);
  };

  useEffect(() => {
    if (!isOpen || !incidentId) return;
    void fetchIncidentDetails();
    void fetchStaffMembers();
  }, [isOpen, incidentId]);

  const updateIncident = async (updates: Record<string, unknown>) => {
    if (!incident) return;
    setIsUpdating(true);
    const { error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', incident.id);
    setIsUpdating(false);
    if (error) toast({ title: 'Error updating incident', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Incident updated successfully' }); await fetchIncidentDetails(); }
  };

  const handleAssign = async () => {
    if (!selectedStaff) { toast({ title: 'Please select a staff member', variant: 'destructive' }); return; }
    await updateIncident({ assigned_to: selectedStaff, status: 'assigned' as const });
  };
  const handleResolve = async () => {
    if (!resolutionNotes.trim()) { toast({ title: 'Please add resolution notes', variant: 'destructive' }); return; }
    await updateIncident({ status: 'resolved' as const, resolution_notes: resolutionNotes, resolved_at: new Date().toISOString() });
  };
  const handleReject = async () => {
    if (!resolutionNotes.trim()) { toast({ title: 'Please add reason for rejection', variant: 'destructive' }); return; }
    await updateIncident({ status: 'rejected' as const, resolution_notes: resolutionNotes });
  };
  const handleReopen = async () => updateIncident({ status: 'pending' as const, resolved_at: null, resolved_by: null });

  const downloadEvidence = async (item: IncidentMedia) => {
    const reason = window.prompt('State the operational reason for downloading this private evidence:');
    if (!reason?.trim()) return;
    try {
      const link = await createAuditedEvidenceLink({ scope: 'official', objectPath: item.media_url, action: 'download', incidentId, reason: reason.trim() });
      window.open(link, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ title: 'Evidence download denied', description: error instanceof Error ? error.message : 'Try again.', variant: 'destructive' });
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { pending: 'secondary', assigned: 'default', resolved: 'outline', rejected: 'destructive' };
    return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  if (!incident) return null;
  const isEmergency = EMERGENCY_CATEGORIES.includes(incident.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex flex-wrap items-center gap-3 text-xl"><span>{incident.title}</span>{isEmergency && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Emergency</Badge>}{statusBadge(incident.status)}</DialogTitle></DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-lg bg-muted/50 p-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" />Description</h3><p className="whitespace-pre-wrap text-muted-foreground">{incident.description}</p></section>
            <div className="grid grid-cols-2 gap-4"><div className="rounded-lg bg-muted/30 p-3"><Label className="text-xs text-muted-foreground">Category</Label><p className="font-medium">{incident.category}</p></div><div className="rounded-lg bg-muted/30 p-3"><Label className="text-xs text-muted-foreground">Campus</Label><p className="font-medium">{incident.campus ? campusDisplayNames[incident.campus] || incident.campus : 'Not specified'}</p></div></div>

            <section className="rounded-lg bg-muted/50 p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Location{incident.title.includes('LIVE TRACKING') && <Badge variant="destructive" className="flex items-center gap-1 text-xs"><Radio className="h-3 w-3" />Live</Badge>}</h3>{incident.title.includes('EMERGENCY') ? <LiveLocationTracker incidentId={incident.id} currentLat={incident.location_lat} currentLng={incident.location_lng} currentAddress={incident.location_description} /> : <>{incident.location_description ? <p className="mb-2 text-sm">{incident.location_description}</p> : <p className="mb-2 text-sm text-muted-foreground">No address provided</p>}{incident.location_lat && incident.location_lng && <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{incident.location_lat.toFixed(6)}, {incident.location_lng.toFixed(6)}</span><a href={`https://www.google.com/maps?q=${incident.location_lat},${incident.location_lng}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />Open in Maps</a></div>}</>}</section>

            <section className="rounded-lg bg-muted/50 p-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><Clock className="h-4 w-4" />Timeline</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Reported</span><span>{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Last Updated</span><span>{formatDistanceToNow(new Date(incident.updated_at), { addSuffix: true })}</span></div>{incident.resolved_at && <div className="flex justify-between"><span className="text-muted-foreground">Resolved</span><span>{formatDistanceToNow(new Date(incident.resolved_at), { addSuffix: true })}</span></div>}</div></section>
            <section className="rounded-lg bg-muted/50 p-4"><h3 className="mb-2 flex items-center gap-2 font-semibold"><User className="h-4 w-4" />Reporter</h3>{incident.is_anonymous ? <p className="italic text-muted-foreground">Anonymous report</p> : <p className="text-sm">Reporter ID: {incident.reporter_id || 'Not available'}</p>}</section>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="mb-3 font-semibold">Private Evidence ({media.length} files)</h3>
              {mediaLoading && <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Authorising private previews…</div>}
              {!mediaLoading && media.length === 0 && <p className="rounded-lg border p-4 text-sm text-muted-foreground">No evidence is attached.</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{media.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border bg-card">{item.signed_url ? <>{item.media_type.startsWith('video') ? <video src={item.signed_url} controls className="h-36 w-full object-cover" /> : item.media_type === 'application/pdf' ? <a href={item.signed_url} target="_blank" rel="noopener noreferrer" className="flex h-36 flex-col items-center justify-center gap-2 bg-muted/30"><FileText className="h-8 w-8 text-primary" /><span className="text-sm font-medium">Open PDF evidence</span></a> : <a href={item.signed_url} target="_blank" rel="noopener noreferrer"><img src={item.signed_url} alt="Incident evidence" className="h-36 w-full object-cover" /></a>}<div className="flex items-center justify-between gap-2 border-t p-2"><span className="truncate text-xs text-muted-foreground">{item.original_filename || 'Private evidence'}</span><Button type="button" size="sm" variant="ghost" onClick={() => void downloadEvidence(item)}><Download className="h-4 w-4" /></Button></div></> : <div className="flex h-36 items-center justify-center p-4 text-center text-xs text-destructive">{item.access_error || 'Private preview unavailable'}</div>}</div>)}</div>
              <p className="mt-3 text-xs text-muted-foreground">Every preview and download is recorded with the staff member, campus, case and access time. Downloads require an operational reason.</p>
            </section>

            <section className="rounded-lg border bg-card p-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" />Case Assignment</h3><div className="space-y-3"><Select value={selectedStaff} onValueChange={setSelectedStaff}><SelectTrigger><SelectValue placeholder="Select staff member to assign" /></SelectTrigger><SelectContent>{staffMembers.map((staff) => <SelectItem key={staff.id} value={staff.id}>{staff.full_name || staff.email}</SelectItem>)}</SelectContent></Select><Button onClick={() => void handleAssign()} disabled={!selectedStaff || isUpdating} className="w-full" variant="secondary">Assign Case</Button></div></section>
            <section className="rounded-lg border bg-card p-4"><h3 className="mb-3 font-semibold">Resolution Notes</h3><Textarea value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} placeholder="Add notes about actions taken or reason for rejection..." className="min-h-[120px]" />{incident.resolution_notes && incident.status !== 'pending' && <div className="mt-2 rounded bg-muted/50 p-2 text-sm"><Label className="text-xs text-muted-foreground">Previous Notes:</Label><p className="mt-1">{incident.resolution_notes}</p></div>}</section>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-wrap gap-2">{incident.status === 'resolved' || incident.status === 'rejected' ? <Button variant="outline" onClick={() => void handleReopen()} disabled={isUpdating}>Reopen Case</Button> : <><Button variant="destructive" onClick={() => void handleReject()} disabled={isUpdating}>Reject</Button><Button onClick={() => void handleResolve()} disabled={isUpdating} className="bg-success hover:bg-success/90">Mark Resolved</Button></>}<Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
