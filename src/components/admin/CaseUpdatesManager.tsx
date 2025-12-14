import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Clock, Gavel, FileText, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CaseUpdate {
  id: string;
  incident_id: string;
  title: string;
  description: string | null;
  update_type: string;
  scheduled_date: string | null;
  created_at: string;
  incident?: {
    title: string;
    status: string;
  };
}

interface Incident {
  id: string;
  title: string;
  status: string;
}

export const CaseUpdatesManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedIncident, setSelectedIncident] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [updateType, setUpdateType] = useState<'note' | 'hearing' | 'resolution' | 'escalation'>('note');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch incidents
    const { data: incidentsData } = await supabase
      .from('incidents')
      .select('id, title, status')
      .order('created_at', { ascending: false });

    if (incidentsData) {
      setIncidents(incidentsData);
    }

    // Fetch case updates
    const { data: updatesData } = await supabase
      .from('case_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (updatesData) {
      // Map incidents to updates
      const incidentsMap = new Map(incidentsData?.map(i => [i.id, i]) || []);
      const updatesWithIncidents = updatesData.map(update => ({
        ...update,
        incident: incidentsMap.get(update.incident_id)
      }));
      setCaseUpdates(updatesWithIncidents);
    }
    
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedIncident('');
    setTitle('');
    setDescription('');
    setUpdateType('note');
    setScheduledDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIncident || !title) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);

    const { error } = await supabase
      .from('case_updates')
      .insert({
        incident_id: selectedIncident,
        admin_id: user?.id,
        title,
        description: description || null,
        update_type: updateType,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      });

    if (error) {
      toast({ title: 'Error creating update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Case update added successfully' });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSubmitting(false);
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return <Gavel className="h-4 w-4" />;
      case 'resolution': return <FileText className="h-4 w-4" />;
      case 'escalation': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'bg-primary/20 text-primary border-primary';
      case 'resolution': return 'bg-green-500/20 text-green-600 border-green-500';
      case 'escalation': return 'bg-destructive/20 text-destructive border-destructive';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Case Updates
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Case Update</DialogTitle>
              <DialogDescription>
                Add a note, schedule a hearing, or update case status.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Select Case *</Label>
                <Select value={selectedIncident} onValueChange={setSelectedIncident}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an incident" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidents.map(incident => (
                      <SelectItem key={incident.id} value={incident.id}>
                        {incident.title} ({incident.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Update Type</Label>
                <Select value={updateType} onValueChange={(v) => setUpdateType(v as typeof updateType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="hearing">Hearing Scheduled</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                    <SelectItem value="escalation">Escalation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Update title"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              {updateType === 'hearing' && (
                <div>
                  <Label>Scheduled Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Update'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : caseUpdates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Case Updates</h3>
          <p className="text-muted-foreground">Add updates to keep track of case progress.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {caseUpdates.map((update, index) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-large">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getUpdateTypeIcon(update.update_type)}
                          <CardTitle className="text-base">{update.title}</CardTitle>
                          <Badge variant="outline" className={getUpdateTypeColor(update.update_type)}>
                            {update.update_type.toUpperCase()}
                          </Badge>
                        </div>
                        {update.incident && (
                          <p className="text-sm text-primary">
                            Case: {update.incident.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {update.description && (
                      <p className="text-sm text-muted-foreground mb-3">{update.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {update.scheduled_date && (
                        <span className="flex items-center gap-1 text-primary">
                          <Gavel className="h-3 w-3" />
                          Scheduled: {format(new Date(update.scheduled_date), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};