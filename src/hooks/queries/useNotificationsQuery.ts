import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Notification = Tables<'notifications'>;

const QUERY_KEY = 'notifications';

// Notifications need frequent refresh
const STALE_TIME = 15 * 1000; // 15 seconds
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Fetch user notifications
async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}

// Fetch unread count
async function fetchUnreadCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  
  if (error) throw error;
  return count || 0;
}

// Hook for user notifications
export function useNotificationsQuery(userId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  });
}

// Hook for unread count
export function useUnreadNotificationsCount(userId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'unread-count', userId],
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: 30 * 1000,
  });
}

// Mutation hook for marking notification as read
export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
    },
  });
}

// Mutation hook for marking all notifications as read
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    },
  });
}
