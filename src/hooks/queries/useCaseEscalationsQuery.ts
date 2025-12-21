import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type CaseEscalation = Tables<'case_escalations'>;

const QUERY_KEY = 'case-escalations';

const STALE_TIME = 30 * 1000; // 30 seconds
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// Fetch escalations for an incident
async function fetchEscalationsForIncident(incidentId: string) {
  const { data, error } = await supabase
    .from('case_escalations')
    .select('*')
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Fetch all escalations
async function fetchAllEscalations() {
  const { data, error } = await supabase
    .from('case_escalations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  return data || [];
}

// Fetch pending escalations
async function fetchPendingEscalations() {
  const { data, error } = await supabase
    .from('case_escalations')
    .select('*')
    .in('status', ['pending', 'submitted', 'acknowledged'])
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Hook for escalations by incident
export function useIncidentEscalationsQuery(incidentId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'incident', incidentId],
    queryFn: () => fetchEscalationsForIncident(incidentId!),
    enabled: !!incidentId,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for all escalations (admin view)
export function useAllEscalationsQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'all'],
    queryFn: fetchAllEscalations,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  });
}

// Hook for pending escalations
export function usePendingEscalationsQuery() {
  return useQuery({
    queryKey: [QUERY_KEY, 'pending'],
    queryFn: fetchPendingEscalations,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Mutation hook for creating escalation
export function useCreateEscalationMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (escalation: TablesInsert<'case_escalations'>) => {
      const { data, error } = await supabase
        .from('case_escalations')
        .insert(escalation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Case escalated successfully');
    },
    onError: (error) => {
      console.error('Error creating escalation:', error);
      toast.error('Failed to escalate case');
    },
  });
}

// Mutation hook for updating escalation
export function useUpdateEscalationMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<'case_escalations'> }) => {
      const { data, error } = await supabase
        .from('case_escalations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Escalation updated successfully');
    },
    onError: (error) => {
      console.error('Error updating escalation:', error);
      toast.error('Failed to update escalation');
    },
  });
}
