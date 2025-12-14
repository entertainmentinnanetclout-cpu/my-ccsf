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
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { z } from 'zod';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Clock, Megaphone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  expires_at: string | null;
  created_at: string;
}

const announcementSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(1000, 'Content must be less than 1000 characters'),
  priority: z.enum(['normal', 'high', 'urgent']),
});

export const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setExpiresAt('');
    setEditingAnnouncement(null);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setContent(announcement.content);
    setPriority(announcement.priority as 'normal' | 'high' | 'urgent');
    setExpiresAt(announcement.expires_at ? announcement.expires_at.split('T')[0] : '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const validation = announcementSchema.safeParse({ title, content, priority });
    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(', ');
      toast({ title: 'Validation Error', description: errors, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    const announcementData = {
      title,
      content,
      priority,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user?.id,
    };

    if (editingAnnouncement) {
      const { error } = await supabase
        .from('announcements')
        .update(announcementData)
        .eq('id', editingAnnouncement.id);

      if (error) {
        toast({ title: 'Error updating announcement', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Announcement updated successfully' });
        setIsDialogOpen(false);
        resetForm();
        fetchAnnouncements();
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert(announcementData);

      if (error) {
        toast({ title: 'Error creating announcement', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Announcement created successfully' });
        setIsDialogOpen(false);
        resetForm();
        fetchAnnouncements();
      }
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting announcement', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement deleted' });
      fetchAnnouncements();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Announcements
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
              <DialogDescription>
                {editingAnnouncement ? 'Update the announcement details below.' : 'Fill in the details to create a new announcement.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  required
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Announcement content"
                  required
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as 'normal' | 'high' | 'urgent')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expires On (optional)</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingAnnouncement ? 'Update' : 'Publish')}
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
      ) : announcements.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Announcements</h3>
          <p className="text-muted-foreground">Create your first announcement to notify students.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-large">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{announcement.title}</CardTitle>
                          <Badge className={getPriorityColor(announcement.priority)}>
                            {announcement.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(announcement.created_at), 'MMM d, yyyy h:mm a')}
                          {announcement.expires_at && (
                            <span className="text-warning">
                              • Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the announcement.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(announcement.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
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