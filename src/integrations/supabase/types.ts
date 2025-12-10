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
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          incident_id: string | null
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          incident_id?: string | null
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
      chat_rooms: {
        Row: {
          campus: Database["public"]["Enums"]["campus_location"] | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          campus?: Database["public"]["Enums"]["campus_location"] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
