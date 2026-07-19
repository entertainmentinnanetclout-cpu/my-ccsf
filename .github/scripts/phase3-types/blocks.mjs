export const pilotFunctionsBlock = `      pilot_add_report_note: {
        Args: { p_notes: string; p_report_id: string }
        Returns: Database["public"]["Tables"]["pilot_report_events"]["Row"]
      }
      pilot_consent_participation: {
        Args: { p_consent_version: string; p_participant_id: string }
        Returns: Database["public"]["Tables"]["pilot_participants"]["Row"]
      }
      pilot_create_notification: {
        Args: {
          p_message: string
          p_report_id: string
          p_title: string
          p_type: Database["public"]["Enums"]["pilot_notification_type"]
        }
        Returns: Database["public"]["Tables"]["pilot_notifications"]["Row"]
      }
      pilot_delete_report: { Args: { p_reason: string; p_report_id: string }; Returns: Json }
      pilot_delete_session: { Args: { p_reason: string; p_session_id: string }; Returns: Json }
      pilot_export_data: {
        Args: {
          p_campus?: Database["public"]["Enums"]["campus_location"]
          p_identified?: boolean
          p_program_id: string
        }
        Returns: Json
      }
      pilot_mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: Database["public"]["Tables"]["pilot_notifications"]["Row"]
      }
      pilot_purge_campus: {
        Args: {
          p_campus: Database["public"]["Enums"]["campus_location"]
          p_program_id: string
          p_reason: string
        }
        Returns: Json
      }
      pilot_purge_expired: { Args: never; Returns: Json }
      pilot_purge_program: { Args: { p_program_id: string; p_reason: string }; Returns: Json }
      pilot_transition_report: {
        Args: {
          p_assigned_to?: string
          p_notes?: string
          p_report_id: string
          p_to_status: Database["public"]["Enums"]["pilot_report_status"]
        }
        Returns: Database["public"]["Tables"]["pilot_reports"]["Row"]
      }
      pilot_withdraw_session: { Args: { p_reason: string; p_session_id: string }; Returns: Json }
`;

export const pilotEnumsBlock = `      pilot_event_type:
        | "report_created" | "status_changed" | "assigned" | "note_added"
        | "location_started" | "location_stopped" | "attachment_added"
        | "notification_created" | "simulation_completed" | "report_deleted"
      pilot_location_source: "initial_fix" | "live_tracking" | "manual_pin" | "resumed_tracking"
      pilot_notification_type:
        | "report_received" | "status_changed" | "assigned" | "simulation_completed"
        | "action_required" | "session_expiring" | "programme_message"
      pilot_participant_status:
        | "invited" | "consented" | "active" | "completed" | "declined" | "withdrawn" | "removed"
      pilot_program_status: "draft" | "active" | "paused" | "completed" | "archived"
      pilot_report_status:
        | "received" | "assessing" | "assigned" | "in_progress"
        | "simulation_completed" | "cancelled" | "withdrawn" | "expired"
      pilot_scenario_type:
        | "standard_report" | "emergency_simulation" | "location_test" | "live_tracking_test"
        | "attachment_test" | "notification_test" | "resource_download" | "end_to_end"
      pilot_session_status: "in_progress" | "completed" | "abandoned" | "withdrawn" | "expired"
      pilot_test_outcome: "passed" | "failed" | "skipped" | "denied" | "abandoned"
`;

export const pilotConstantsBlock = `      pilot_event_type: [
        "report_created", "status_changed", "assigned", "note_added", "location_started",
        "location_stopped", "attachment_added", "notification_created", "simulation_completed", "report_deleted",
      ],
      pilot_location_source: ["initial_fix", "live_tracking", "manual_pin", "resumed_tracking"],
      pilot_notification_type: [
        "report_received", "status_changed", "assigned", "simulation_completed",
        "action_required", "session_expiring", "programme_message",
      ],
      pilot_participant_status: ["invited", "consented", "active", "completed", "declined", "withdrawn", "removed"],
      pilot_program_status: ["draft", "active", "paused", "completed", "archived"],
      pilot_report_status: [
        "received", "assessing", "assigned", "in_progress", "simulation_completed", "cancelled", "withdrawn", "expired",
      ],
      pilot_scenario_type: [
        "standard_report", "emergency_simulation", "location_test", "live_tracking_test",
        "attachment_test", "notification_test", "resource_download", "end_to_end",
      ],
      pilot_session_status: ["in_progress", "completed", "abandoned", "withdrawn", "expired"],
      pilot_test_outcome: ["passed", "failed", "skipped", "denied", "abandoned"],
`;
