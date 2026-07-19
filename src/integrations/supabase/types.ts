export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accredited_residences: {
        Row: {
          address: string | null
          bed_count: string | null
          campus: string
          created_at: string | null
          email: string | null
          id: number
          is_accredited: boolean | null
          landlord_phone: string | null
          lat: number | null
          lng: number | null
          notes: string | null
          property_category: string | null
          property_name: string
          representative_phone: string | null
          res_manager_name: string | null
          res_manager_phone: string | null
        }
        Insert: {
          address?: string | null
          bed_count?: string | null
          campus: string
          created_at?: string | null
          email?: string | null
          id?: number
          is_accredited?: boolean | null
          landlord_phone?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          property_category?: string | null
          property_name: string
          representative_phone?: string | null
          res_manager_name?: string | null
          res_manager_phone?: string | null
        }
        Update: {
          address?: string | null
          bed_count?: string | null
          campus?: string
          created_at?: string | null
          email?: string | null
          id?: number
          is_accredited?: boolean | null
          landlord_phone?: string | null
          lat?: number | null
          lng?: number | null
          notes?: string | null
          property_category?: string | null
          property_name?: string
          representative_phone?: string | null
          res_manager_name?: string | null
          res_manager_phone?: string | null
        }
        Relationships: []
      }
      admin_access: {
        Row: {
          admin_id: string
          campus: Database["public"]["Enums"]["campus_location"]
          created_at: string | null
          id: string
          is_head: boolean | null
        }
        Insert: {
          admin_id: string
          campus: Database["public"]["Enums"]["campus_location"]
          created_at?: string | null
          id?: string
          is_head?: boolean | null
        }
        Update: {
          admin_id?: string
          campus?: Database["public"]["Enums"]["campus_location"]
          created_at?: string | null
          id?: string
          is_head?: boolean | null
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          incident_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          incident_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          incident_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      bento_layouts: {
        Row: {
          created_at: string
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campus_emergency_contacts: {
        Row: {
          availability: string | null
          campus: Database["public"]["Enums"]["campus_location"] | null
          created_at: string
          extension: string | null
          id: string
          is_active: boolean
          label: string
          last_verified_at: string | null
          phone_number: string
          priority: number
          service: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          availability?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string
          extension?: string | null
          id?: string
          is_active?: boolean
          label: string
          last_verified_at?: string | null
          phone_number: string
          priority?: number
          service: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          availability?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string
          extension?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_verified_at?: string | null
          phone_number?: string
          priority?: number
          service?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
      campus_police_stations: {
        Row: {
          address: string | null
          campus: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          lat: number | null
          lng: number | null
          phone: string | null
          station_name: string
          station_type: string
        }
        Insert: {
          address?: string | null
          campus: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          station_name: string
          station_type: string
        }
        Update: {
          address?: string | null
          campus?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          station_name?: string
          station_type?: string
        }
        Relationships: []
      }
      carousel_images: {
        Row: {
          campus: string
          category: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          campus: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          campus?: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_escalations: {
        Row: {
          acknowledged_at: string | null
          agency_type: string
          api_reference_id: string | null
          api_response: Json | null
          cas_number: string | null
          created_at: string
          escalated_by: string
          id: string
          incident_id: string
          notes: string | null
          police_station: string
          police_station_address: string | null
          police_station_phone: string | null
          priority: string
          resolved_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          agency_type: string
          api_reference_id?: string | null
          api_response?: Json | null
          cas_number?: string | null
          created_at?: string
          escalated_by: string
          id?: string
          incident_id: string
          notes?: string | null
          police_station: string
          police_station_address?: string | null
          police_station_phone?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          agency_type?: string
          api_reference_id?: string | null
          api_response?: Json | null
          cas_number?: string | null
          created_at?: string
          escalated_by?: string
          id?: string
          incident_id?: string
          notes?: string | null
          police_station?: string
          police_station_address?: string | null
          police_station_phone?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_escalations_escalated_by_fkey"
            columns: ["escalated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_escalations_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      case_updates: {
        Row: {
          admin_id: string
          created_at: string
          description: string | null
          id: string
          incident_id: string
          scheduled_date: string | null
          title: string
          update_type: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          description?: string | null
          id?: string
          incident_id: string
          scheduled_date?: string | null
          title: string
          update_type?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          description?: string | null
          id?: string
          incident_id?: string
          scheduled_date?: string | null
          title?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          incident_id: string | null
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          is_admin: boolean | null
          joined_at: string | null
          last_read_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          campus: Database["public"]["Enums"]["campus_location"] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          last_message_at: string | null
          name: string
          room_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          name: string
          room_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          last_message_at?: string | null
          name?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_location_updates: {
        Row: {
          accuracy_meters: number | null
          created_at: string
          id: string
          incident_id: string
          location_address: string | null
          location_lat: number
          location_lng: number
        }
        Insert: {
          accuracy_meters?: number | null
          created_at?: string
          id?: string
          incident_id: string
          location_address?: string | null
          location_lat: number
          location_lng: number
        }
        Update: {
          accuracy_meters?: number | null
          created_at?: string
          id?: string
          incident_id?: string
          location_address?: string | null
          location_lat?: number
          location_lng?: number
        }
        Relationships: [
          {
            foreignKeyName: "incident_location_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_media: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          incident_id: string
          media_type: string
          media_url: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          incident_id: string
          media_type: string
          media_url: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          incident_id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_media_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          campus: Database["public"]["Enums"]["campus_location"] | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          location_description: string | null
          location_lat: number | null
          location_lng: number | null
          reporter_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          signature_data: string | null
          status: Database["public"]["Enums"]["incident_status"]
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean
          location_description?: string | null
          location_lat?: number | null
          location_lng?: number | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean
          location_description?: string | null
          location_lat?: number | null
          location_lng?: number | null
          reporter_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signature_data?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_incident_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_incident_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_incident_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_attachments: {
        Row: {
          checksum: string | null
          created_at: string
          id: string
          mime_type: string
          original_filename: string | null
          program_id: string
          report_id: string
          session_id: string
          size_bytes: number
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type: string
          original_filename?: string | null
          program_id: string
          report_id: string
          session_id: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          id?: string
          mime_type?: string
          original_filename?: string | null
          program_id?: string
          report_id?: string
          session_id?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_attachments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_audit_logs: {
        Row: {
          action: string
          actor_campus: Database["public"]["Enums"]["campus_location"] | null
          actor_id: string
          actor_role: Database["public"]["Enums"]["user_role"]
          affected_count: number
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          program_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_campus?: Database["public"]["Enums"]["campus_location"] | null
          actor_id: string
          actor_role: Database["public"]["Enums"]["user_role"]
          affected_count?: number
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          program_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_campus?: Database["public"]["Enums"]["campus_location"] | null
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["user_role"]
          affected_count?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          program_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_audit_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_feature_tests: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_code: string | null
          feature_key: string
          id: string
          metadata: Json
          outcome: Database["public"]["Enums"]["pilot_test_outcome"]
          program_id: string
          report_id: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          feature_key: string
          id?: string
          metadata?: Json
          outcome: Database["public"]["Enums"]["pilot_test_outcome"]
          program_id: string
          report_id?: string | null
          session_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          feature_key?: string
          id?: string
          metadata?: Json
          outcome?: Database["public"]["Enums"]["pilot_test_outcome"]
          program_id?: string
          report_id?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_feature_tests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feature_tests_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feature_tests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feature_tests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_feedback: {
        Row: {
          clarity_rating: number | null
          comments: string | null
          confidence_rating: number | null
          created_at: string
          ease_of_use_rating: number | null
          id: string
          program_id: string
          report_id: string | null
          session_id: string
          updated_at: string
          user_id: string
          would_use_in_emergency: boolean | null
        }
        Insert: {
          clarity_rating?: number | null
          comments?: string | null
          confidence_rating?: number | null
          created_at?: string
          ease_of_use_rating?: number | null
          id?: string
          program_id: string
          report_id?: string | null
          session_id: string
          updated_at?: string
          user_id?: string
          would_use_in_emergency?: boolean | null
        }
        Update: {
          clarity_rating?: number | null
          comments?: string | null
          confidence_rating?: number | null
          created_at?: string
          ease_of_use_rating?: number | null
          id?: string
          program_id?: string
          report_id?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
          would_use_in_emergency?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_feedback_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_location_events: {
        Row: {
          accuracy: number | null
          altitude: number | null
          captured_at: string
          created_at: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          program_id: string
          report_id: string
          session_id: string
          source: Database["public"]["Enums"]["pilot_location_source"]
          speed: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          captured_at?: string
          created_at?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          program_id: string
          report_id: string
          session_id: string
          source: Database["public"]["Enums"]["pilot_location_source"]
          speed?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          captured_at?: string
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          program_id?: string
          report_id?: string
          session_id?: string
          source?: Database["public"]["Enums"]["pilot_location_source"]
          speed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_location_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_location_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_location_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_location_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_notifications: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_read: boolean
          message: string
          notification_type: Database["public"]["Enums"]["pilot_notification_type"]
          program_id: string
          read_at: string | null
          report_id: string | null
          session_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_read?: boolean
          message: string
          notification_type: Database["public"]["Enums"]["pilot_notification_type"]
          program_id: string
          read_at?: string | null
          report_id?: string | null
          session_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: Database["public"]["Enums"]["pilot_notification_type"]
          program_id?: string
          read_at?: string | null
          report_id?: string | null
          session_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_notifications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_participants: {
        Row: {
          campus: Database["public"]["Enums"]["campus_location"]
          consent_version: string | null
          consented_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string
          program_id: string
          status: Database["public"]["Enums"]["pilot_participant_status"]
          updated_at: string
          user_id: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          campus: Database["public"]["Enums"]["campus_location"]
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          program_id: string
          status?: Database["public"]["Enums"]["pilot_participant_status"]
          updated_at?: string
          user_id: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_location"]
          consent_version?: string | null
          consented_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          program_id?: string
          status?: Database["public"]["Enums"]["pilot_participant_status"]
          updated_at?: string
          user_id?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_participants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_programs: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string | null
          eligible_campuses: Database["public"]["Enums"]["campus_location"][]
          ends_at: string | null
          id: string
          name: string
          retention_days: number
          starts_at: string | null
          status: Database["public"]["Enums"]["pilot_program_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          eligible_campuses: Database["public"]["Enums"]["campus_location"][]
          ends_at?: string | null
          id?: string
          name: string
          retention_days?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["pilot_program_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          eligible_campuses?: Database["public"]["Enums"]["campus_location"][]
          ends_at?: string | null
          id?: string
          name?: string
          retention_days?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["pilot_program_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_report_events: {
        Row: {
          actor_id: string
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          event_type: Database["public"]["Enums"]["pilot_event_type"]
          from_status: Database["public"]["Enums"]["pilot_report_status"] | null
          id: string
          metadata: Json
          notes: string | null
          program_id: string
          report_id: string
          session_id: string
          to_status: Database["public"]["Enums"]["pilot_report_status"] | null
        }
        Insert: {
          actor_id: string
          actor_role: Database["public"]["Enums"]["user_role"]
          created_at?: string
          event_type: Database["public"]["Enums"]["pilot_event_type"]
          from_status?: Database["public"]["Enums"]["pilot_report_status"] | null
          id?: string
          metadata?: Json
          notes?: string | null
          program_id: string
          report_id: string
          session_id: string
          to_status?: Database["public"]["Enums"]["pilot_report_status"] | null
        }
        Update: {
          actor_id?: string
          actor_role?: Database["public"]["Enums"]["user_role"]
          created_at?: string
          event_type?: Database["public"]["Enums"]["pilot_event_type"]
          from_status?: Database["public"]["Enums"]["pilot_report_status"] | null
          id?: string
          metadata?: Json
          notes?: string | null
          program_id?: string
          report_id?: string
          session_id?: string
          to_status?: Database["public"]["Enums"]["pilot_report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_report_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_report_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_reports: {
        Row: {
          assigned_to: string | null
          campus: Database["public"]["Enums"]["campus_location"]
          category: Database["public"]["Enums"]["incident_category"]
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          is_anonymous: boolean
          location_accuracy: number | null
          location_description: string | null
          location_lat: number | null
          location_lng: number | null
          participant_id: string
          program_id: string
          reference_number: string
          scenario_id: string | null
          session_id: string
          simulation_completed_at: string | null
          status: Database["public"]["Enums"]["pilot_report_status"]
          submitted_at: string
          submitted_by: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campus: Database["public"]["Enums"]["campus_location"]
          category: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          is_anonymous?: boolean
          location_accuracy?: number | null
          location_description?: string | null
          location_lat?: number | null
          location_lng?: number | null
          participant_id: string
          program_id: string
          reference_number?: string
          scenario_id?: string | null
          session_id: string
          simulation_completed_at?: string | null
          status?: Database["public"]["Enums"]["pilot_report_status"]
          submitted_at?: string
          submitted_by?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campus?: Database["public"]["Enums"]["campus_location"]
          category?: Database["public"]["Enums"]["incident_category"]
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_anonymous?: boolean
          location_accuracy?: number | null
          location_description?: string | null
          location_lat?: number | null
          location_lng?: number | null
          participant_id?: string
          program_id?: string
          reference_number?: string
          scenario_id?: string | null
          session_id?: string
          simulation_completed_at?: string | null
          status?: Database["public"]["Enums"]["pilot_report_status"]
          submitted_at?: string
          submitted_by?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_reports_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_reports_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "pilot_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_reports_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "pilot_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pilot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_scenarios: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          expected_category: Database["public"]["Enums"]["incident_category"] | null
          id: string
          instructions: string
          is_active: boolean
          program_id: string
          requires_attachment: boolean
          requires_live_tracking: boolean
          requires_location: boolean
          requires_notification: boolean
          requires_resource_download: boolean
          scenario_type: Database["public"]["Enums"]["pilot_scenario_type"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          display_order?: number
          expected_category?: Database["public"]["Enums"]["incident_category"] | null
          id?: string
          instructions: string
          is_active?: boolean
          program_id: string
          requires_attachment?: boolean
          requires_live_tracking?: boolean
          requires_location?: boolean
          requires_notification?: boolean
          requires_resource_download?: boolean
          scenario_type: Database["public"]["Enums"]["pilot_scenario_type"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          expected_category?: Database["public"]["Enums"]["incident_category"] | null
          id?: string
          instructions?: string
          is_active?: boolean
          program_id?: string
          requires_attachment?: boolean
          requires_live_tracking?: boolean
          requires_location?: boolean
          requires_notification?: boolean
          requires_resource_download?: boolean
          scenario_type?: Database["public"]["Enums"]["pilot_scenario_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_scenarios_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_sessions: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          campus: Database["public"]["Enums"]["campus_location"]
          completed_at: string | null
          created_at: string
          device_type: string | null
          expires_at: string
          id: string
          last_activity_at: string
          network_type: string | null
          operating_system: string | null
          participant_id: string
          program_id: string
          started_at: string
          status: Database["public"]["Enums"]["pilot_session_status"]
          updated_at: string
          user_id: string
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          campus: Database["public"]["Enums"]["campus_location"]
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          expires_at?: string
          id?: string
          last_activity_at?: string
          network_type?: string | null
          operating_system?: string | null
          participant_id: string
          program_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["pilot_session_status"]
          updated_at?: string
          user_id?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          campus?: Database["public"]["Enums"]["campus_location"]
          completed_at?: string | null
          created_at?: string
          device_type?: string | null
          expires_at?: string
          id?: string
          last_activity_at?: string
          network_type?: string | null
          operating_system?: string | null
          participant_id?: string
          program_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["pilot_session_status"]
          updated_at?: string
          user_id?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "pilot_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allergies: string | null
          avatar_url: string | null
          blood_type: string | null
          campus: Database["public"]["Enums"]["campus_location"] | null
          chronic_conditions: string | null
          course: string | null
          created_at: string
          disability_status: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          medical_aid_name: string | null
          medical_aid_number: string | null
          phone_number: string | null
          profile_completed: boolean | null
          residence: Database["public"]["Enums"]["residence_name"] | null
          residence_id: number | null
          special_needs: string | null
          student_number: string | null
          updated_at: string
          year_of_study: number | null
        }
        Insert: {
          allergies?: string | null
          avatar_url?: string | null
          blood_type?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          chronic_conditions?: string | null
          course?: string | null
          created_at?: string
          disability_status?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          residence?: Database["public"]["Enums"]["residence_name"] | null
          residence_id?: number | null
          special_needs?: string | null
          student_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Update: {
          allergies?: string | null
          avatar_url?: string | null
          blood_type?: string | null
          campus?: Database["public"]["Enums"]["campus_location"] | null
          chronic_conditions?: string | null
          course?: string | null
          created_at?: string
          disability_status?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          medical_aid_name?: string | null
          medical_aid_number?: string | null
          phone_number?: string | null
          profile_completed?: boolean | null
          residence?: Database["public"]["Enums"]["residence_name"] | null
          residence_id?: number | null
          special_needs?: string | null
          student_number?: string | null
          updated_at?: string
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_residence_id_fkey"
            columns: ["residence_id"]
            isOneToOne: false
            referencedRelation: "accredited_residences"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          id: string
          room_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          room_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          room_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      wifi_access_points: {
        Row: {
          band: string
          campus: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          location: string
          name: string
          ssid: string
          updated_at: string
          x_position: number
          y_position: number
        }
        Insert: {
          band?: string
          campus: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location: string
          name: string
          ssid?: string
          updated_at?: string
          x_position?: number
          y_position?: number
        }
        Update: {
          band?: string
          campus?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          ssid?: string
          updated_at?: string
          x_position?: number
          y_position?: number
        }
        Relationships: []
      }
    }
    Views: {
      pilot_aggregate_results: {
        Row: {
          campus: Database["public"]["Enums"]["campus_location"] | null
          category: Database["public"]["Enums"]["incident_category"] | null
          program_id: string | null
          report_count: number | null
          status: Database["public"]["Enums"]["pilot_report_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_campus_admin: {
        Args: {
          p_campus: Database["public"]["Enums"]["campus_location"]
          p_is_head?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      ensure_all_staff_room: { Args: never; Returns: undefined }
      get_security_officers: {
        Args: { p_campus?: Database["public"]["Enums"]["campus_location"] }
        Returns: {
          campus: Database["public"]["Enums"]["campus_location"]
          email: string
          full_name: string
          id: string
        }[]
      }
      get_user_campus: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["campus_location"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_campus_access: {
        Args: {
          _campus: Database["public"]["Enums"]["campus_location"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_campus_admin: { Args: { _user_id: string }; Returns: boolean }
      is_head_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      pilot_add_report_note: {
        Args: { p_notes: string; p_report_id: string }
        Returns: Database["public"]["Tables"]["pilot_report_events"]["Row"]
      }
      pilot_cleanup_plan: {
        Args: { p_entity_id: string; p_kind: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_cleanup: {
        Args: { p_actor_id: string; p_entity_id: string; p_kind: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_entity_cleanup: {
        Args: { p_actor_id: string; p_entity_id: string; p_reason: string }
        Returns: Json
      }
      pilot_complete_session_cleanup: {
        Args: { p_actor_id: string; p_reason: string; p_session_id: string }
        Returns: Json
      }
      pilot_entity_cleanup_plan: { Args: { p_entity_id: string; p_reason: string }; Returns: Json }
      pilot_execute_expired_cleanup: { Args: never; Returns: Json }
      pilot_execute_program_cleanup: {
        Args: { p_program_id: string; p_reason: string }
        Returns: Json
      }
      pilot_finalize_delete_report: {
        Args: { p_actor_id: string; p_reason: string; p_report_id: string }
        Returns: Json
      }
      pilot_finalize_delete_session: {
        Args: { p_actor_id: string; p_reason: string; p_session_id: string }
        Returns: Json
      }
      pilot_finalize_purge_campus: {
        Args: {
          p_actor_id: string
          p_campus: Database["public"]["Enums"]["campus_location"]
          p_program_id: string
          p_reason: string
        }
        Returns: Json
      }
      pilot_finalize_purge_expired: {
        Args: { p_actor_id: string; p_session_ids: string[] }
        Returns: Json
      }
      pilot_finalize_purge_program: {
        Args: { p_actor_id: string; p_program_id: string; p_reason: string }
        Returns: Json
      }
      pilot_finish_workflow: { Args: { p_id: string; p_reason: string }; Returns: Json }
      pilot_safe_results: {
        Args: { p_campus?: Database["public"]["Enums"]["campus_location"]; p_program_id: string }
        Returns: Json
      }
      pilot_session_cleanup_plan: { Args: { p_reason: string; p_session_id: string }; Returns: Json }
      pilot_staff_message: {
        Args: {
          p_content: string
          p_kind: Database["public"]["Enums"]["pilot_notification_type"]
          p_report_id: string
          p_title: string
        }
        Returns: Database["public"]["Tables"]["pilot_notifications"]["Row"]
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
      remove_campus_admin: {
        Args: {
          p_campus: Database["public"]["Enums"]["campus_location"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      campus_location:
        | "pretoria_west_main"
        | "arcadia"
        | "arts"
        | "giyani"
        | "mbombela"
        | "polokwane"
        | "garankuwa"
        | "soshanguve_south"
        | "soshanguve_north"
        | "emalahleni"
      incident_category:
        | "Rape"
        | "Sexual assault"
        | "Gbv"
        | "Murder"
        | "Attempted murder"
        | "Assault common"
        | "Assault GBH"
        | "Fraud"
        | "Theft"
        | "Robbery"
        | "Armed robbery"
        | "Arson"
        | "Malicious damage to property"
        | "Trespassing"
        | "Reckless and negligent driving"
        | "Driving under the influence of alcohol"
        | "Public violence"
        | "Sports and Rec Events Act Violation"
        | "Crimmen enjuria (Hate speech)"
        | "Cyber related crime (bullying etc.)"
        | "Vandalism"
      incident_status: "pending" | "assigned" | "resolved" | "rejected"
      pilot_event_type:
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
      residence_name:
        | "zeddishoef"
        | "headhoff"
        | "monitor"
        | "legae"
        | "tempo"
        | "topishoek"
        | "orion"
        | "magalies"
        | "lezard"
        | "minjonet"
        | "polonaise"
        | "denise"
        | "marabastaad"
        | "astra"
      user_role: "student" | "admin" | "security"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      campus_location: [
        "pretoria_west_main",
        "arcadia",
        "arts",
        "giyani",
        "mbombela",
        "polokwane",
        "garankuwa",
        "soshanguve_south",
        "soshanguve_north",
        "emalahleni",
      ],
      incident_category: [
        "Rape",
        "Sexual assault",
        "Gbv",
        "Murder",
        "Attempted murder",
        "Assault common",
        "Assault GBH",
        "Fraud",
        "Theft",
        "Robbery",
        "Armed robbery",
        "Arson",
        "Malicious damage to property",
        "Trespassing",
        "Reckless and negligent driving",
        "Driving under the influence of alcohol",
        "Public violence",
        "Sports and Rec Events Act Violation",
        "Crimmen enjuria (Hate speech)",
        "Cyber related crime (bullying etc.)",
        "Vandalism",
      ],
      incident_status: ["pending", "assigned", "resolved", "rejected"],
      pilot_event_type: [
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
      residence_name: [
        "zeddishoef",
        "headhoff",
        "monitor",
        "legae",
        "tempo",
        "topishoek",
        "orion",
        "magalies",
        "lezard",
        "minjonet",
        "polonaise",
        "denise",
        "marabastaad",
        "astra",
      ],
      user_role: ["student", "admin", "security"],
    },
  },
} as const
