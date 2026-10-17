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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_preferences: {
        Row: {
          channel: string
          enabled: Json
          grace_minutes: number
          traveller_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          enabled?: Json
          grace_minutes?: number
          traveller_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          enabled?: Json
          grace_minutes?: number
          traveller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_sessions: {
        Row: {
          created_at: string
          id: string
          location: Json | null
          note: string
          payload: Json
          request_key: string
          traveller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: Json | null
          note?: string
          payload: Json
          request_key: string
          traveller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: Json | null
          note?: string
          payload?: Json
          request_key?: string
          traveller_id?: string
        }
        Relationships: []
      }
      guardian_enrollments: {
        Row: {
          consent: string
          consent_at: string | null
          created_at: string
          expires_at: string
          id: string
          invited_email: string
          name: string
          phone: string | null
          recipient_id: string | null
          revoked_at: string | null
          token_hash: string
          traveller_id: string
        }
        Insert: {
          consent?: string
          consent_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          invited_email: string
          name: string
          phone?: string | null
          recipient_id?: string | null
          revoked_at?: string | null
          token_hash: string
          traveller_id: string
        }
        Update: {
          consent?: string
          consent_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invited_email?: string
          name?: string
          phone?: string | null
          recipient_id?: string | null
          revoked_at?: string | null
          token_hash?: string
          traveller_id?: string
        }
        Relationships: []
      }
      notify_jobs: {
        Row: {
          id: string
          job_key: string
          payload: Json
          run_at: string
          status: string
          trip_id: string
        }
        Insert: {
          id: string
          job_key: string
          payload: Json
          run_at: string
          status: string
          trip_id: string
        }
        Update: {
          id?: string
          job_key?: string
          payload?: Json
          run_at?: string
          status?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notify_jobs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "emergency_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_outbox: {
        Row: {
          claim_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          next_attempt_at: string
          payload: Json
          provider_sid: string | null
          recipient_id: string
          status: string
          traveller_id: string
          trip_id: string
        }
        Insert: {
          claim_at?: string | null
          created_at?: string
          id: string
          idempotency_key: string
          next_attempt_at?: string
          payload: Json
          provider_sid?: string | null
          recipient_id: string
          status?: string
          traveller_id: string
          trip_id: string
        }
        Update: {
          claim_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          next_attempt_at?: string
          payload?: Json
          provider_sid?: string | null
          recipient_id?: string
          status?: string
          traveller_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notify_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "guardian_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notify_outbox_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "emergency_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notify_webhook_events: {
        Row: {
          event_id: string
          payload: Json
          processed_at: string | null
          received_at: string
          sid: string
          status: string
        }
        Insert: {
          event_id: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          sid: string
          status: string
        }
        Update: {
          event_id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          sid?: string
          status?: string
        }
        Relationships: []
      }
      notify_worker_leases: {
        Row: {
          name: string
          token: string
          until_at: string
        }
        Insert: {
          name: string
          token: string
          until_at: string
        }
        Update: {
          name?: string
          token?: string
          until_at?: string
        }
        Relationships: []
      }
      production_service_state: {
        Row: {
          paused: boolean
          reason: string | null
          service: string
          updated_at: string
        }
        Insert: {
          paused?: boolean
          reason?: string | null
          service: string
          updated_at?: string
        }
        Update: {
          paused?: boolean
          reason?: string | null
          service?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          ended_at: string | null
          expires_at: string
          id: string
          provider_call_id: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          provider_call_id?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          ended_at?: string | null
          expires_at?: string
          id?: string
          provider_call_id?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ack_notify: { Args: { p_id: string }; Returns: undefined }
      acquire_notify_worker: { Args: { p_token: string }; Returns: boolean }
      claim_notify: { Args: { p_id: string }; Returns: boolean }
      commit_sos_intent: {
        Args: {
          p_location: Json
          p_messages: Json
          p_note: string
          p_owner: string
          p_request: string
          p_snapshot: Json
        }
        Returns: string
      }
      confirm_guardian: {
        Args: { p_hash: string; p_phone: string }
        Returns: string
      }
      fail_ambiguous_notify: { Args: never; Returns: undefined }
      patch_notify: {
        Args: { p_id: string; p_patch: Json }
        Returns: undefined
      }
      reconcile_notify: { Args: { p_sid: string }; Returns: undefined }
      release_notify_worker: { Args: { p_token: string }; Returns: undefined }
      reserve_voice: { Args: { p_user: string }; Returns: string }
      revoke_guardian: { Args: { p_id: string }; Returns: undefined }
      store_notify_callback: {
        Args: {
          p_key: string
          p_payload: Json
          p_sid: string
          p_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

