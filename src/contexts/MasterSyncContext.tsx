import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Incident = Tables<'incidents'>;
type Profile = Tables<'profiles'>;
type Announcement = Tables<'announcements'>;
type CarouselImage = Tables<'carousel_images'>;
type Notification = Tables<'notifications'>;
type CampusLocation = Database['public']['Enums']['campus_location'];
type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const PAGE_SIZE = 50;

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface AccessScope {
  campus: CampusLocation | null;
  role: string | null;
  userId: string | null;
}

interface MasterSyncContextType {
  incidents: Incident[];
  profiles: Profile[];
  announcements: Announcement[];
  carouselImages: CarouselImage[];
  notifications: Notification[];
  incidentsPagination: PaginationState;
  profilesPagination: PaginationState;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  connectionStatus: ConnectionStatus;
  userCampus: CampusLocation | null;
  refreshAll: () => Promise<void>;
  refreshIncidents: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshAnnouncements: () => Promise<void>;
  refreshCarouselImages: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreIncidents: () => Promise<void>;
  loadMoreProfiles: () => Promise<void>;
  getIncidentsByCampus: (campus: string) => Incident[];
  getIncidentsByStatus: (status: string) => Incident[];
  getProfilesByCampus: (campus: string) => Profile[];
  getActiveEmergencies: () => Incident[];
}

const MasterSyncContext = createContext<MasterSyncContextType | null>(null);

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
  const [userCampus, setUserCampus] = useState<CampusLocation | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [incidentsPagination, setIncidentsPagination] = useState<PaginationState>({ page: 0, pageSize: PAGE_SIZE, total: 0, hasMore: true });
  const [profilesPagination, setProfilesPagination] = useState<PaginationState>({ page: 0, pageSize: PAGE_SIZE, total: 0, hasMore: true });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const scopeRef = useRef<AccessScope>({ campus: null, role: null, userId: null });
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const fetchUserContext = useCallback(async (): Promise<AccessScope> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const emptyScope = { campus: null, role: null, userId: null };
      scopeRef.current = emptyScope;
      setUserCampus(null);
      return emptyScope;
    }

    const [{ data: profile }, { data: roleData }] = await Promise.all([
      supabase.from('profiles').select('campus').eq('id', user.id).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    ]);

    const scope: AccessScope = {
      campus: profile?.campus ?? null,
      role: roleData?.role ?? null,
      userId: user.id,
    };
    scopeRef.current = scope;
    setUserCampus(scope.campus);
    return scope;
  }, []);

  const fetchIncidents = useCallback(async () => {
    let query = supabase
      .from('incidents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    const scope = scopeRef.current;
    if (scope.role === 'security' && scope.campus) query = query.eq('campus', scope.campus);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching incidents:', error);
      return;
    }

    setIncidents(data || []);
    setIncidentsPagination({
      page: 0,
      pageSize: PAGE_SIZE,
      total: count || 0,
      hasMore: (data?.length || 0) === PAGE_SIZE,
    });
  }, []);

  const loadMoreIncidents = useCallback(async () => {
    if (!incidentsPagination.hasMore) return;
    const nextPage = incidentsPagination.page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from('incidents').select('*').order('created_at', { ascending: false }).range(from, to);
    const scope = scopeRef.current;
    if (scope.role === 'security' && scope.campus) query = query.eq('campus', scope.campus);

    const { data, error } = await query;
    if (!error && data) {
      setIncidents((previous) => [...previous, ...data]);
      setIncidentsPagination((previous) => ({ ...previous, page: nextPage, hasMore: data.length === PAGE_SIZE }));
    }
  }, [incidentsPagination]);

  const fetchProfiles = useCallback(async () => {
    const scope = scopeRef.current;
    if (scope.role !== 'admin' && scope.role !== 'security') {
      setProfiles([]);
      setProfilesPagination({ page: 0, pageSize: PAGE_SIZE, total: 0, hasMore: false });
      return;
    }

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (scope.role === 'security' && scope.campus) query = query.eq('campus', scope.campus);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    setProfiles(data || []);
    setProfilesPagination({
      page: 0,
      pageSize: PAGE_SIZE,
      total: count || 0,
      hasMore: (data?.length || 0) === PAGE_SIZE,
    });
  }, []);

  const loadMoreProfiles = useCallback(async () => {
    const scope = scopeRef.current;
    if (!profilesPagination.hasMore || (scope.role !== 'admin' && scope.role !== 'security')) return;
    const nextPage = profilesPagination.page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(from, to);
    if (scope.role === 'security' && scope.campus) query = query.eq('campus', scope.campus);

    const { data, error } = await query;
    if (!error && data) {
      setProfiles((previous) => [...previous, ...data]);
      setProfilesPagination((previous) => ({ ...previous, page: nextPage, hasMore: data.length === PAGE_SIZE }));
    }
  }, [profilesPagination]);

  const fetchAnnouncements = useCallback(async () => {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('Error fetching announcements:', error);
      return;
    }
    setAnnouncements(data || []);
  }, []);

  const fetchCarouselImages = useCallback(async () => {
    const { data, error } = await supabase.from('carousel_images').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(20);
    if (error) {
      console.error('Error fetching carousel images:', error);
      return;
    }
    setCarouselImages(data || []);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const userId = scopeRef.current.userId;
    if (!userId) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }
    setNotifications(data || []);
  }, []);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.all([fetchIncidents(), fetchProfiles(), fetchAnnouncements(), fetchCarouselImages(), fetchNotifications()]);
      setLastSyncTime(new Date());
      toast.success('All data synchronized');
    } catch (error) {
      console.error('Error refreshing all data:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  }, [fetchIncidents, fetchProfiles, fetchAnnouncements, fetchCarouselImages, fetchNotifications]);

  const debouncedIncidentUpdate = useMemo(() => debounce(() => fetchIncidents(), 500), [fetchIncidents]);
  const debouncedAnnouncementUpdate = useMemo(() => debounce(() => fetchAnnouncements(), 500), [fetchAnnouncements]);
  const debouncedCarouselUpdate = useMemo(() => debounce(() => fetchCarouselImages(), 500), [fetchCarouselImages]);
  const debouncedNotificationUpdate = useMemo(() => debounce(() => fetchNotifications(), 500), [fetchNotifications]);

  useEffect(() => {
    let disposed = false;

    const setupSubscriptions = async () => {
      setIsLoading(true);
      setConnectionStatus('connecting');
      const scope = await fetchUserContext();
      if (disposed) return;

      await Promise.all([fetchIncidents(), fetchProfiles(), fetchAnnouncements(), fetchCarouselImages(), fetchNotifications()]);
      if (disposed) return;

      setIsLoading(false);
      setLastSyncTime(new Date());

      let channel = supabase.channel(`master-sync-${scope.role ?? 'anonymous'}-${scope.campus ?? 'all'}`);
      const incidentChanges = scope.role === 'security' && scope.campus
        ? { event: '*' as const, schema: 'public', table: 'incidents', filter: `campus=eq.${scope.campus}` }
        : { event: '*' as const, schema: 'public', table: 'incidents' };

      channel = channel.on('postgres_changes', incidentChanges, () => debouncedIncidentUpdate());

      // Profiles deliberately do not use Realtime here. During mass onboarding every new
      // profile would otherwise fan out a refetch to staff clients. Staff still receive
      // fresh paginated profile data on manual/full refresh without touching incident flow.
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => debouncedAnnouncementUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'carousel_images' }, () => debouncedCarouselUpdate());

      if (scope.userId) {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${scope.userId}` },
          () => debouncedNotificationUpdate(),
        );
      }

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnectionStatus('disconnected');
      });

      channelsRef.current = [channel];
    };

    void setupSubscriptions();

    return () => {
      disposed = true;
      channelsRef.current.forEach((channel) => { void supabase.removeChannel(channel); });
      channelsRef.current = [];
    };
  }, [fetchUserContext, fetchIncidents, fetchProfiles, fetchAnnouncements, fetchCarouselImages, fetchNotifications, debouncedIncidentUpdate, debouncedAnnouncementUpdate, debouncedCarouselUpdate, debouncedNotificationUpdate]);

  const getIncidentsByCampus = useCallback((campus: string) => incidents.filter((incident) => incident.campus === campus), [incidents]);
  const getIncidentsByStatus = useCallback((status: string) => incidents.filter((incident) => incident.status === status), [incidents]);
  const getProfilesByCampus = useCallback((campus: string) => profiles.filter((profile) => profile.campus === campus), [profiles]);
  const getActiveEmergencies = useCallback(() => incidents.filter((incident) => incident.status === 'pending' || incident.status === 'assigned'), [incidents]);

  const value: MasterSyncContextType = {
    incidents,
    profiles,
    announcements,
    carouselImages,
    notifications,
    incidentsPagination,
    profilesPagination,
    isLoading,
    isSyncing,
    lastSyncTime,
    connectionStatus,
    userCampus,
    refreshAll,
    refreshIncidents: fetchIncidents,
    refreshProfiles: fetchProfiles,
    refreshAnnouncements: fetchAnnouncements,
    refreshCarouselImages: fetchCarouselImages,
    refreshNotifications: fetchNotifications,
    loadMoreIncidents,
    loadMoreProfiles,
    getIncidentsByCampus,
    getIncidentsByStatus,
    getProfilesByCampus,
    getActiveEmergencies,
  };

  return <MasterSyncContext.Provider value={value}>{children}</MasterSyncContext.Provider>;
};

export const useMasterSync = (): MasterSyncContextType => {
  const context = useContext(MasterSyncContext);
  if (!context) throw new Error('useMasterSync must be used within a MasterSyncProvider');
  return context;
};
