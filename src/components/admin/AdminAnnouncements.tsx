import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const announcementSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be less than 100 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(1000, 'Content must be less than 1000 characters'),
});

export const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = announcementSchema.safeParse({ title, content });
    if (!validation.success) {
      const errors = validation.error.errors.map(err => err.message).join(', ');
      toast({
        title: 'Validation Error',
        description: errors,
        variant: 'destructive'
      });
      return;
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({ title, content, created_by: user?.id })
      .select();

    if (error) {
      toast({
        title: 'Error creating announcement',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    if (data) {
      toast({ title: 'Announcement created successfully' });
      setTitle('');
      setContent('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Announcement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
            />
          </div>
          <Button type="submit">Publish</Button>
        </form>
      </CardContent>
    </Card>
  );
};
