import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Announcement = Tables<'announcements'>;

const QUERY_KEY = 'announcements';

// Announcements can be cached longer
const STALE_TIME = 60 * 1000; // 1 minute
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

// Fetch all announcements
async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}

// Fetch active announcements (not expired)
async function fetchActiveAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) throw error;
  return data || [];
}

// Hook for all announcements (admin view)
export function useAnnouncementsQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'all'],
    queryFn: fetchAnnouncements,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for active announcements (student view)
export function useActiveAnnouncementsQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: fetchActiveAnnouncements,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Mutation hook for creating announcement
export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (announcement: TablesInsert<'announcements'>) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Announcement created successfully');
    },
    onError: (error) => {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    },
  });
}

// Mutation hook for updating announcement
export function useUpdateAnnouncementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'announcements'> }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Announcement updated successfully');
    },
    onError: (error) => {
      console.error('Error updating announcement:', error);
      toast.error('Failed to update announcement');
    },
  });
}

// Mutation hook for deleting announcement
export function useDeleteAnnouncementMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Announcement deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    },
  });
}
