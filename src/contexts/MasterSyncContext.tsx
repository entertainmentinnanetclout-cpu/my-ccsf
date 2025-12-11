import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Types
type Incident = Tables<'incidents'>;
type Profile = Tables<'profiles'>;
type Announcement = Tables<'announcements'>;
type CarouselImage = Tables<'carousel_images'>;
type Notification = Tables<'notifications'>;

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface MasterSyncContextType {
  // Data
  incidents: Incident[];
  profiles: Profile[];
  announcements: Announcement[];
  carouselImages: CarouselImage[];
  notifications: Notification[];
  
  // Status
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  connectionStatus: ConnectionStatus;
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshIncidents: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  refreshCarouselImages: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Filtered getters
  getIncidentsByCampus: (campus: string) => Incident[];
  getIncidentsByStatus: (status: string) => Incident[];
  getProfilesByCampus: (campus: string) => Profile[];
  getActiveEmergencies: () => Incident[];
}

const MasterSyncContext = createContext<MasterSyncContextType | null>(null);

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface MasterSyncProviderProps {
  children: ReactNode;
}

export const MasterSyncProvider: React.FC<MasterSyncProviderProps> = ({ children }) => {
  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Status states
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  
  // Refs for cleanup
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch functions with error handling
  const fetchIncidents = useCallback(async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.error('Error fetching incidents:', error);
      return;
    }
    setIncidents(data || []);
  }, []);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    setProfiles(data || []);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
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
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching carousel images:', error);
      return;
    }
    setCarouselImages(data || []);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }
    setNotifications(data || []);
  }, []);

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
    () => debounce(() => fetchIncidents(), 100),
    [fetchIncidents]
  );

  const debouncedProfileUpdate = useMemo(
    () => debounce(() => fetchProfiles(), 100),
    [fetchProfiles]
  );

  const debouncedAnnouncementUpdate = useMemo(
    () => debounce(() => fetchAnnouncements(), 100),
    [fetchAnnouncements]
  );

  const debouncedCarouselUpdate = useMemo(
    () => debounce(() => fetchCarouselImages(), 100),
    [fetchCarouselImages]
  );

  const debouncedNotificationUpdate = useMemo(
    () => debounce(() => fetchNotifications(), 100),
    [fetchNotifications]
  );

  // Setup real-time subscriptions
  useEffect(() => {
    const setupSubscriptions = async () => {
      setIsLoading(true);
      setConnectionStatus('connecting');

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

      // Incidents channel
      const incidentsChannel = supabase
        .channel('master-sync-incidents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
          debouncedIncidentUpdate();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setConnectionStatus('disconnected');
            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              setupSubscriptions();
            }, 5000);
          }
        });

      // Profiles channel
      const profilesChannel = supabase
        .channel('master-sync-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          debouncedProfileUpdate();
        })
        .subscribe();

      // Announcements channel
      const announcementsChannel = supabase
        .channel('master-sync-announcements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          debouncedAnnouncementUpdate();
        })
        .subscribe();

      // Carousel images channel
      const carouselChannel = supabase
        .channel('master-sync-carousel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => {
          debouncedCarouselUpdate();
        })
        .subscribe();

      // Notifications channel
      const notificationsChannel = supabase
        .channel('master-sync-notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          debouncedNotificationUpdate();
        })
        .subscribe();

      channelsRef.current = [
        incidentsChannel,
        profilesChannel,
        announcementsChannel,
        carouselChannel,
        notificationsChannel,
      ];
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
    };
  }, [
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
    
    // Status
    isLoading,
    isSyncing,
    lastSyncTime,
    connectionStatus,
    
    // Actions
    refreshAll,
    refreshIncidents: fetchIncidents,
    refreshProfiles: fetchProfiles,
    refreshAnnouncements: fetchAnnouncements,
    refreshCarouselImages: fetchCarouselImages,
    refreshNotifications: fetchNotifications,
    
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
