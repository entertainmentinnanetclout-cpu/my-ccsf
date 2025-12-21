import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate, Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Incident = Tables<'incidents'>;
type CampusLocation = Database['public']['Enums']['campus_location'];

const QUERY_KEY = 'incidents';
const PAGE_SIZE = 50;

// Stale time: 30 seconds - data is considered fresh for 30s
// Cache time: 5 minutes - cached data kept for 5 min after becoming inactive
const STALE_TIME = 30 * 1000;
const CACHE_TIME = 5 * 60 * 1000;

// Fetch incidents with pagination
async function fetchIncidents(page: number = 0, campus?: CampusLocation) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  
  let query = supabase
    .from('incidents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (campus) {
    query = query.eq('campus', campus);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    incidents: data || [],
    total: count || 0,
    hasMore: (data?.length || 0) === PAGE_SIZE,
    page,
  };
}

// Fetch single incident
async function fetchIncident(id: string) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

// Hook for paginated incidents list
export function useIncidentsQuery(campus?: CampusLocation) {
  return useQuery({
    queryKey: [QUERY_KEY, 'list', campus],
    queryFn: () => fetchIncidents(0, campus),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for infinite scroll incidents
export function useInfiniteIncidentsQuery(campus?: CampusLocation) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, 'infinite', campus],
    queryFn: ({ pageParam = 0 }) => fetchIncidents(pageParam, campus),
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 0,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for single incident
export function useIncidentQuery(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => fetchIncident(id!),
    enabled: !!id,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for active emergencies (pending/assigned)
export function useActiveEmergenciesQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'emergencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .in('status', ['pending', 'assigned'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 1000, // More frequent refresh for emergencies
    gcTime: CACHE_TIME,
    refetchInterval: 30 * 1000, // Auto-refresh every 30s
  });
}

// Mutation hook for updating incident status
export function useUpdateIncidentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'incidents'> }) => {
      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Incident updated successfully');
    },
    onError: (error) => {
      console.error('Error updating incident:', error);
      toast.error('Failed to update incident');
    },
  });
}

// Mutation hook for creating incident
export function useCreateIncidentMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('incidents')
        .insert(incident)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Incident reported successfully');
    },
    onError: (error) => {
      console.error('Error creating incident:', error);
      toast.error('Failed to report incident');
    },
  });
}

// Prefetch incidents (for preloading)
export function usePrefetchIncidents() {
  const queryClient = useQueryClient();
  
  return (campus?: CampusLocation) => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, 'list', campus],
      queryFn: () => fetchIncidents(0, campus),
      staleTime: STALE_TIME,
    });
  };
}
