import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate, Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Profile = Tables<'profiles'>;
type CampusLocation = Database['public']['Enums']['campus_location'];

const QUERY_KEY = 'profiles';
const PAGE_SIZE = 50;

// Profiles change less frequently, longer stale time
const STALE_TIME = 60 * 1000; // 1 minute
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

// Fetch profiles with pagination
async function fetchProfiles(page: number = 0, campus?: CampusLocation) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (campus) {
    query = query.eq('campus', campus);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    profiles: data || [],
    total: count || 0,
    hasMore: (data?.length || 0) === PAGE_SIZE,
    page,
  };
}

// Fetch current user profile
async function fetchCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) throw error;
  return data;
}

// Fetch single profile
async function fetchProfile(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Hook for paginated profiles list (admin only)
export function useProfilesQuery(campus?: CampusLocation) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', campus],
    queryFn: () => fetchProfiles(0, campus),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for infinite scroll profiles
export function useInfiniteProfilesQuery(campus?: CampusLocation) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, 'infinite', campus],
    queryFn: ({ pageParam = 0 }) => fetchProfiles(pageParam, campus),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for current user profile
export function useCurrentUserProfileQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'current'],
    queryFn: fetchCurrentUserProfile,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for single profile
export function useProfileQuery(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => fetchProfile(id!),
    enabled: !!id,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Mutation hook for updating profile
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'profiles'> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    },
  });
}

// Hook for security officers
export function useSecurityOfficersQuery(campus?: CampusLocation) {
  return useQuery({
    queryKey: [QUERY_KEY, 'security-officers', campus],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_security_officers', campus ? { p_campus: campus } : undefined);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}
