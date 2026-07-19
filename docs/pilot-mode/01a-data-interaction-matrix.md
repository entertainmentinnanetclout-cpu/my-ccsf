# Phase 1 — Data Interaction Matrix

## Purpose

This matrix records the repository files that read, write, subscribe to or administrate Supabase data relevant to the controlled Pilot Mode.

## Incident and case domain

| Resource | Operations observed | Main producers/consumers | Pilot isolation consequence |
|---|---|---|---|
| `incidents` | insert, select, update, Realtime | `ReportIncident`, `EmergencyReport`, `useIncidentsQuery`, `CasesContext`, `MasterSyncContext`, `MyCaseReports`, `AdminIncidents`, `IncidentDetailsModal`, `Office`, `OfficeView`, dashboards | Never store pilot reports here. Production triggers, metrics and subscriptions consume it. |
| `incident_media` | insert, select | `ReportIncident`, `IncidentDetailsModal` | Create `pilot_attachments` metadata instead. |
| `incident_location_updates` | insert, select, Realtime | `useLocationTracking`, `LiveLocationTracker` | Create a pilot location/event destination and separate channel. |
| `case_updates` | insert, select | `CaseUpdatesManager`, `MyCaseReports` | Pilot timeline must use `pilot_report_events`. |
| `case_escalations` | insert, select, update | `CaseEscalation`, `useCaseEscalationsQuery` | Pilot Mode must not create production escalation records. |
| `campus_police_stations` | select; admin management in schema/migration | `CaseEscalation` | May be read as reference data only if approved; no external escalation. |
| `admin_logs` | insert, select under policy | `CaseEscalation` | Pilot actions require a separate pilot audit log. |

## Identity and access

| Resource | Operations observed | Main producers/consumers | Pilot use |
|---|---|---|---|
| `profiles` | select, update | `AuthContext`, dashboards, profile pages, emergency reporting, admin lists, chat, avatar flow | Reuse authenticated identity and campus; avoid copying sensitive profile fields into pilot reports. |
| `user_roles` | select | `AuthContext`, staff communication, Edge Functions | Reuse current `student`, `security`, `admin` roles. |
| `admin_access` | select, insert, update, remove through RPC | `CampusAdminManager`, `create-campus-admin` | Reuse campus authorization logic; do not create new production roles. |
| `assign_campus_admin` | RPC | `CampusAdminManager` | Not part of Pilot Mode operations. |
| `remove_campus_admin` | RPC | `CampusAdminManager` | Not part of Pilot Mode operations. |
| `get_security_officers` | RPC | `IncidentDetailsModal`, query hook | Pilot assignment may reuse returned identities but must store assignment in pilot data. |
| role/campus helper RPCs | RPC | RLS and Edge Functions | Reuse for pilot RLS where safe. |

## Notifications and subscriptions

| Resource | Operations observed | Main producers/consumers | Pilot isolation consequence |
|---|---|---|---|
| `notifications` | insert by trigger, select, update, Realtime | DB incident trigger, `NotificationBell`, notification query hook, `MasterSyncContext` | Use `pilot_notifications`; do not activate production trigger. |
| `push_subscriptions` | select, upsert, delete | `usePushNotifications`, `send-push-notification` | Initial pilot should use in-app notifications only. |

## Awareness and visual content

| Resource | Operations observed | Main producers/consumers | Pilot relevance |
|---|---|---|---|
| `announcements` | CRUD, select, Realtime | `AdminAnnouncements`, `NewsFeed`, `MasterSyncContext` | Existing production awareness feed; Pilot Mode does not require new writes. |
| `carousel_images` | CRUD, select, Realtime | `CarouselManager`, `CampusCarousel`, `CampusOverview`, `MasterSyncContext` | Existing visual content; Pilot Mode may read but should not alter it. |
| `app_settings` | select | `Dashboard` | Missing from generated types; verify live schema before relying on it. |

## Staff communication

| Resource | Operations observed | Main producers/consumers | Pilot relevance |
|---|---|---|---|
| `chat_rooms` | select, insert, update, Realtime | `StaffCommunication` | Do not use for automated pilot status simulation. |
| `chat_room_members` | select, insert | `StaffCommunication` | Not required for Pilot Mode. |
| `chat_messages` | select, insert, Realtime | `StaffCommunication` | Not required for Pilot Mode. |
| `message_reactions` | select, insert, delete, Realtime | `StaffCommunication` | Not required for Pilot Mode. |
| `typing_indicators` | no active frontend operation found | generated types/migration | Current chat uses Realtime Presence instead. |

## Supporting systems

| Resource | Operations observed | Main producers/consumers | Pilot relevance |
|---|---|---|---|
| `wifi_access_points` | CRUD, select | `WifiAccessPointManager`, `CampusMap` | Read-only supporting information if shown in Pilot Mode. |
| `bento_layouts` | select, insert, update | `useBentoLayout` | Keep production dashboard layout separate from pilot dashboard layout IDs. |
| `accredited_residences` | no active frontend operation found | generated types/migrations | Outside the initial Pilot Mode scope. |

## Storage matrix

| Bucket | Writes | Reads/URLs | Cleanup status | Pilot decision |
|---|---|---|---|---|
| `incident-media` | `ReportIncident` | metadata consumed by `IncidentDetailsModal` | no complete UI cleanup found | Do not use. |
| `avatars` | `AvatarUpload` | public URL in profiles | old objects not explicitly removed | Reuse user avatar only; no pilot writes required. |
| `carousel-images` | `CarouselManager`, `CampusOverview` | public URLs | DB deletion may orphan files | Read-only for Pilot Mode. |
| `chat-media` | `StaffCommunication` | public URLs | no object cleanup found | Do not use for pilot reports. |
| proposed `pilot-report-attachments` | not yet created | signed/private access | automatic retention and cascade deletion required | Required in Phase 3. |

## Realtime matrix

| Channel | Resource | Mode |
|---|---|---|
| `cases-changes` | `incidents` | all events |
| `master-sync-consolidated` | incidents, profiles, announcements, carousel images, notifications | all events |
| `my-case-reports` | `incidents` | reporter-filtered |
| `admin-incidents` | `incidents` | all events |
| `office-incidents` | `incidents` | all events |
| `office-embed-incidents` | `incidents` | all events |
| `location-updates-{id}` | `incident_location_updates` | incident-filtered insert |
| `user-notifications` | `notifications` | user-filtered insert |
| `announcements-feed` | `announcements` | all events |
| `carousel-images-realtime` | `carousel_images` | all events |
| `carousel-manager` | `carousel_images` | all events |
| `rooms-changes` | `chat_rooms` | all events |
| `room-messages-{id}` | `chat_messages` | room-filtered insert |
| `room-reactions-{id}` | `message_reactions` | all events |
| `typing-{id}` | Presence | typing status |

Pilot channels must be separately named and target only pilot tables.

## Edge Function invocation matrix

| Function | Invoked by | Privileged resources | Operational effect |
|---|---|---|---|
| `create-campus-admin` | `CampusAdminManager` | service role, Auth Admin, `admin_access` | creates confirmed security user |
| `reset-staff-password` | campus-admin management flow | service role, Auth Admin | generates recovery link |
| `send-push-notification` | notification flow | service role, `push_subscriptions` | currently processes/logs subscriptions; no verified transport send |

## Database trigger identified

`on_incident_update` executes `notify_incident_status_change()` after production incident updates. It inserts into `notifications` when:

- incident status changes
- assigned officer changes

This is a primary reason pilot simulation must not update `incidents`.

## Data deletion matrix

| Domain | Existing deletion | Gap |
|---|---|---|
| announcements | DB row delete | adequate for row only |
| carousel images | DB row delete | Storage object may remain |
| Wi-Fi APs | DB row delete | no major pilot relevance |
| push subscriptions | user delete | no pilot use recommended |
| reactions | DB row delete | no pilot relevance |
| incidents and children | no complete admin cascade found | critical gap |
| location history | no UI purge found | critical gap |
| report attachments | no object purge found | critical gap |
| case updates/escalations | no consolidated purge found | critical gap |
| pilot records | not yet implemented | must use role-checked RPC deletion and retention |

## Phase 1 architectural conclusion

The production data graph is highly interconnected. Pilot Mode requires:

- separate `pilot_*` tables
- separate attachment bucket
- separate Realtime channels
- separate query keys
- separate deletion RPCs
- no production notification trigger
- no production escalation or location writes
