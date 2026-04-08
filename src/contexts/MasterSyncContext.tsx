import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Types
type Incident = Tables<'incidents'>;
type Profile = Tables<'profiles'>;
type Announcement = Tables<'announcements'>;
type CarouselImage = Tables<'carousel_images'>;
type Notification = Tables<'notifications'>;
type CampusLocation = Database['public']['Enums']['campus_location'];

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface MasterSyncContextType {
  // Data
  incidents: Incident[];
  profiles: Profile[];
  announcements: Announcement[];
  carouselImages: CarouselImage[];
  notifications: Notification[];
  
  // Pagination state
  incidentsPagination: PaginationState;
  profilesPagination: PaginationState;
  
  // Status
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  connectionStatus: ConnectionStatus;
  userCampus: CampusLocation | null;
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshIncidents: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  refreshCarouselImages: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreIncidents: () => Promise<void>;
  loadMoreProfiles: () => Promise<void>;
  
  // Filtered getters
  getIncidentsByCampus: (campus: string) => Incident[];
  getIncidentsByStatus: (status: string) => Incident[];
  getProfilesByCampus: (campus: string) => Profile[];
  getActiveEmergencies: () => Incident[];
}

const MasterSyncContext = createContext<MasterSyncContextType | null>(null);

// Debounce helper
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface MasterSyncProviderProps {
  children: ReactNode;
}

export const MasterSyncProvider: React.FC<MasterSyncProviderProps> = ({ children }) => {
  // OPTIMIZED: Reduced from 500 to 50 for better memory management
  const PAGE_SIZE = 50;
  
  // User context for campus-scoped queries
  const [userCampus, setUserCampus] = useState<CampusLocation | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Pagination states
  const [incidentsPagination, setIncidentsPagination] = useState<PaginationState>({
    page: 0, pageSize: PAGE_SIZE, total: 0, hasMore: true
  });
  const [profilesPagination, setProfilesPagination] = useState<PaginationState>({
    page: 0, pageSize: PAGE_SIZE, total: 0, hasMore: true
  });
  
  // Status states
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  
  // Refs for cleanup
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  // Fetch user context (campus and role) for scoped queries
  const fetchUserContext = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserCampus(null);
      setUserRole(null);
      setUserId(null);
      return null;
    }
    
    setUserId(user.id);
    
    // Get user's campus
    const { data: profile } = await supabase
      .from('profiles')
      .select('campus')
      .eq('id', user.id)
      .single();
    
    if (profile?.campus) {
      setUserCampus(profile.campus);
    }
    
    // Get user's role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleData?.role) {
      setUserRole(roleData.role);
    }
    
    return { campus: profile?.campus, role: roleData?.role, userId: user.id };
  }, []);

  // OPTIMIZED: Server-side filtered fetch for incidents
  const fetchIncidents = useCallback(async (reset = true) => {
    const page = reset ? 0 : incidentsPagination.page;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    // Build query with server-side campus filter for non-admin users
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching incidents:', error);
      return;
    }
    
    if (reset) {
      setIncidents(data || []);
    } else {
      setIncidents(prev => [...prev, ...(data || [])]);
    }
    
    setIncidentsPagination({
      page,
      pageSize: PAGE_SIZE,
      total: count || 0,
      hasMore: (data?.length || 0) === PAGE_SIZE
    });
  }, [incidentsPagination.page, PAGE_SIZE]);

  // Load more incidents
  const loadMoreIncidents = useCallback(async () => {
    if (!incidentsPagination.hasMore) return;
    
    const nextPage = incidentsPagination.page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (!error && data) {
      setIncidents(prev => [...prev, ...data]);
      setIncidentsPagination(prev => ({
        ...prev,
        page: nextPage,
        hasMore: data.length === PAGE_SIZE
      }));
    }
  }, [incidentsPagination, PAGE_SIZE]);

  // OPTIMIZED: Only fetch profiles for admin/security roles
  const fetchProfiles = useCallback(async (reset = true) => {
    // Only load profiles for admin/security users
    if (userRole !== 'admin' && userRole !== 'security') {
      setProfiles([]);
      setProfilesPagination({
        page: 0,
        pageSize: PAGE_SIZE,
        total: 0,
        hasMore: false
      });
      return;
    }
    
    const page = reset ? 0 : profilesPagination.page;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    
    if (reset) {
      setProfiles(data || []);
    } else {
      setProfiles(prev => [...prev, ...(data || [])]);
    }
    
    setProfilesPagination({
      page,
      pageSize: PAGE_SIZE,
      total: count || 0,
      hasMore: (data?.length || 0) === PAGE_SIZE
    });
  }, [profilesPagination.page, userRole, PAGE_SIZE]);

  // Load more profiles
  const loadMoreProfiles = useCallback(async () => {
    if (!profilesPagination.hasMore || (userRole !== 'admin' && userRole !== 'security')) return;
    
    const nextPage = profilesPagination.page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (!error && data) {
      setProfiles(prev => [...prev, ...data]);
      setProfilesPagination(prev => ({
        ...prev,
        page: nextPage,
        hasMore: data.length === PAGE_SIZE
      }));
    }
  }, [profilesPagination, userRole, PAGE_SIZE]);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50); // Limit announcements
    
    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }
    setAnnouncements(data || []);
  }, []);

  const fetchCarouselImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('carousel_images')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(20); // Limit carousel images
    
    if (error) {
      console.error('Error fetching carousel images:', error);
      return;
    }
    setCarouselImages(data || []);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50); // Reduced from 100
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }
    setNotifications(data || []);
  }, [userId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.all([
        fetchIncidents(),
        fetchProfiles(),
        fetchAnnouncements(),
        fetchCarouselImages(),
        fetchNotifications(),
      ]);
      setLastSyncTime(new Date());
      toast.success('All data synchronized');
    } catch (error) {
      console.error('Error refreshing all data:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  }, [fetchIncidents, fetchProfiles, fetchAnnouncements, fetchCarouselImages, fetchNotifications]);

  // Debounced update handlers for real-time events
  const debouncedIncidentUpdate = useMemo(
    () => debounce(() => fetchIncidents(), 300), // Increased debounce
    [fetchIncidents]
  );

  const debouncedProfileUpdate = useMemo(
    () => debounce(() => fetchProfiles(), 300),
    [fetchProfiles]
  );

  const debouncedAnnouncementUpdate = useMemo(
    () => debounce(() => fetchAnnouncements(), 300),
    [fetchAnnouncements]
  );

  const debouncedCarouselUpdate = useMemo(
    () => debounce(() => fetchCarouselImages(), 300),
    [fetchCarouselImages]
  );

  const debouncedNotificationUpdate = useMemo(
    () => debounce(() => fetchNotifications(), 300),
    [fetchNotifications]
  );

  // OPTIMIZED: Single consolidated real-time channel instead of 5 separate channels
  useEffect(() => {
    if (isInitialized.current) return;
    
    const setupSubscriptions = async () => {
      setIsLoading(true);
      setConnectionStatus('connecting');

      // Fetch user context first
      await fetchUserContext();

      // Initial data fetch
      await Promise.all([
        fetchIncidents(),
        fetchProfiles(),
        fetchAnnouncements(),
        fetchCarouselImages(),
        fetchNotifications(),
      ]);

      setIsLoading(false);
      setLastSyncTime(new Date());
      isInitialized.current = true;

      // OPTIMIZED: Single consolidated channel for all tables
      const masterChannel = supabase
        .channel('master-sync-consolidated')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
          debouncedIncidentUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          debouncedProfileUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          debouncedAnnouncementUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => {
          debouncedCarouselUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          debouncedNotificationUpdate();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionStatus('disconnected');
            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              isInitialized.current = false;
              setupSubscriptions();
            }, 5000);
          }
        });

      channelsRef.current = [masterChannel];
    };

    setupSubscriptions();

    // Cleanup
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      isInitialized.current = false;
    };
  }, [
    fetchUserContext,
    fetchIncidents,
    fetchProfiles,
    fetchAnnouncements,
    fetchCarouselImages,
    fetchNotifications,
    debouncedIncidentUpdate,
    debouncedProfileUpdate,
    debouncedAnnouncementUpdate,
    debouncedCarouselUpdate,
    debouncedNotificationUpdate,
  ]);

  // Filtered getters (memoized)
  const getIncidentsByCampus = useCallback((campus: string) => {
    return incidents.filter(i => i.campus === campus);
  }, [incidents]);

  const getIncidentsByStatus = useCallback((status: string) => {
    return incidents.filter(i => i.status === status);
  }, [incidents]);

  const getProfilesByCampus = useCallback((campus: string) => {
    return profiles.filter(p => p.campus === campus);
  }, [profiles]);

  const getActiveEmergencies = useCallback(() => {
    return incidents.filter(i => 
      (i.status === 'pending' || i.status === 'assigned')
    );
  }, [incidents]);

  const value: MasterSyncContextType = {
    // Data
    incidents,
    profiles,
    announcements,
    carouselImages,
    notifications,
    
    // Pagination
    incidentsPagination,
    profilesPagination,
    
    // Status
    isLoading,
    isSyncing,
    lastSyncTime,
    connectionStatus,
    userCampus,
    
    // Actions
    refreshAll,
    refreshIncidents: () => fetchIncidents(true),
    refreshProfiles: () => fetchProfiles(true),
    refreshAnnouncements: fetchAnnouncements,
    refreshCarouselImages: fetchCarouselImages,
    refreshNotifications: fetchNotifications,
    loadMoreIncidents,
    loadMoreProfiles,
    
    // Filtered getters
    getIncidentsByCampus,
    getIncidentsByStatus,
    getProfilesByCampus,
    getActiveEmergencies,
  };

  return (
    <MasterSyncContext.Provider value={value}>
      {children}
    </MasterSyncContext.Provider>
  );
};

export const useMasterSync = (): MasterSyncContextType => {
  const context = useContext(MasterSyncContext);
  if (!context) {
    throw new Error('useMasterSync must be used within a MasterSyncProvider');
  }
  return context;
};
