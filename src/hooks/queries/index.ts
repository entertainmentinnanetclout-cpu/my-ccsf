// Incidents
export {
  useIncidentsQuery,
  useInfiniteIncidentsQuery,
  useIncidentQuery,
  useActiveEmergenciesQuery,
  useUpdateIncidentMutation,
  useCreateIncidentMutation,
  usePrefetchIncidents,
} from './useIncidentsQuery';

// Profiles
export {
  useProfilesQuery,
  useInfiniteProfilesQuery,
  useCurrentUserProfileQuery,
  useProfileQuery,
  useUpdateProfileMutation,
  useSecurityOfficersQuery,
} from './useProfilesQuery';

// Announcements
export {
  useAnnouncementsQuery,
  useActiveAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} from './useAnnouncementsQuery';

// Notifications
export {
  useNotificationsQuery,
  useUnreadNotificationsCount,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from './useNotificationsQuery';

// Case Escalations
export {
  useIncidentEscalationsQuery,
  useAllEscalationsQuery,
  usePendingEscalationsQuery,
  useCreateEscalationMutation,
  useUpdateEscalationMutation,
} from './useCaseEscalationsQuery';
