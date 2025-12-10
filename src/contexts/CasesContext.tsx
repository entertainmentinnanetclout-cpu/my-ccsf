import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Incident = Tables<'incidents'>;

interface CasesContextType {
  cases: Incident[];
  loading: boolean;
  updateCaseStatus: (caseId: string, status: string) => Promise<void>;
  refreshCases: () => Promise<void>;
}

const CasesContext = createContext<CasesContextType | null>(null);

interface CasesProviderProps {
  children: ReactNode;
}

export const CasesProvider: React.FC<CasesProviderProps> = ({ children }) => {
  const [cases, setCases] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cases:', error);
    } else {
      setCases(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();

    // Real-time subscription for case updates
    const channel = supabase
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCases(prev => [payload.new as Incident, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCases(prev => 
              prev.map(c => c.id === (payload.new as Incident).id ? payload.new as Incident : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setCases(prev => prev.filter(c => c.id !== (payload.old as Incident).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateCaseStatus = async (caseId: string, status: string) => {
    const { error } = await supabase
      .from('incidents')
      .update({ status: status as Incident['status'] })
      .eq('id', caseId);

    if (error) {
      console.error('Error updating case status:', error);
      throw error;
    }
  };

  const refreshCases = async () => {
    await fetchCases();
  };

  return (
    <CasesContext.Provider value={{ cases, loading, updateCaseStatus, refreshCases }}>
      {children}
    </CasesContext.Provider>
  );
};

export const useCases = (): CasesContextType => {
  const context = useContext(CasesContext);
  if (!context) {
    throw new Error('useCases must be used within a CasesProvider');
  }
  return context;
};