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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      allowed_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          role?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          invoice_number: string | null
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          invoice_number?: string | null
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          invoice_number?: string | null
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          error_details: Json | null
          error_message: string | null
          history_id: number | null
          id: string
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          message_id: string
          priority: number
          started_at: string | null
          status: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          history_id?: number | null
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          message_id: string
          priority?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          error_message?: string | null
          history_id?: number | null
          id?: string
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          message_id?: string
          priority?: number
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      gmail_history_log: {
        Row: {
          date_for: string
          email_address: string | null
          history_id: number
          id: number
          received_at: string
          source: string
        }
        Insert: {
          date_for?: string
          email_address?: string | null
          history_id: number
          id?: number
          received_at?: string
          source?: string
        }
        Update: {
          date_for?: string
          email_address?: string | null
          history_id?: number
          id?: number
          received_at?: string
          source?: string
        }
        Relationships: []
      }
      gmail_messages_stage: {
        Row: {
          check_date: string
          email_address: string | null
          history_id: number
          loaded_at: string
          message_id: string
        }
        Insert: {
          check_date: string
          email_address?: string | null
          history_id?: number
          loaded_at?: string
          message_id: string
        }
        Update: {
          check_date?: string
          email_address?: string | null
          history_id?: number
          loaded_at?: string
          message_id?: string
        }
        Relationships: []
      }
      gmail_watermark: {
        Row: {
          id: number
          last_processed_history_id: number
          updated_at: string
        }
        Insert: {
          id?: number
          last_processed_history_id?: number
          updated_at?: string
        }
        Update: {
          id?: number
          last_processed_history_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          approved: boolean | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          email_id: string | null
          entity: string | null
          flag_email_address: string | null
          flag_email_body: string | null
          flag_email_subject: string | null
          flag_type: string | null
          google_drive_embed_link: string | null
          google_drive_id: string | null
          google_drive_link: string | null
          gst: number | null
          id: string
          invoice_date: string | null
          invoice_no: string | null
          link_to_invoice: string | null
          list_items: Json[] | null
          paid_date: string | null
          partially_paid: boolean | null
          payment_ref: string | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          project: string | null
          remittance_email: string | null
          remittance_sent: boolean | null
          saved_emails: string[] | null
          sender_email: string | null
          status: string | null
          subtotal: number | null
          supplier_abn: string | null
          supplier_bank: string | null
          supplier_contact_no_on_invoice: string | null
          supplier_email_on_invoice: string | null
          supplier_name: string | null
          total_amount: number | null
          upload_tracking_id: string | null
          xero_contact_id: string | null
          xero_invoice_id: string | null
          xero_invoice_link: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          approved?: boolean | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          email_id?: string | null
          entity?: string | null
          flag_email_address?: string | null
          flag_email_body?: string | null
          flag_email_subject?: string | null
          flag_type?: string | null
          google_drive_embed_link?: string | null
          google_drive_id?: string | null
          google_drive_link?: string | null
          gst?: number | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          link_to_invoice?: string | null
          list_items?: Json[] | null
          paid_date?: string | null
          partially_paid?: boolean | null
          payment_ref?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project?: string | null
          remittance_email?: string | null
          remittance_sent?: boolean | null
          saved_emails?: string[] | null
          sender_email?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_abn?: string | null
          supplier_bank?: string | null
          supplier_contact_no_on_invoice?: string | null
          supplier_email_on_invoice?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          upload_tracking_id?: string | null
          xero_contact_id?: string | null
          xero_invoice_id?: string | null
          xero_invoice_link?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          approved?: boolean | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          email_id?: string | null
          entity?: string | null
          flag_email_address?: string | null
          flag_email_body?: string | null
          flag_email_subject?: string | null
          flag_type?: string | null
          google_drive_embed_link?: string | null
          google_drive_id?: string | null
          google_drive_link?: string | null
          gst?: number | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string | null
          link_to_invoice?: string | null
          list_items?: Json[] | null
          paid_date?: string | null
          partially_paid?: boolean | null
          payment_ref?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project?: string | null
          remittance_email?: string | null
          remittance_sent?: boolean | null
          saved_emails?: string[] | null
          sender_email?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_abn?: string | null
          supplier_bank?: string | null
          supplier_contact_no_on_invoice?: string | null
          supplier_email_on_invoice?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          upload_tracking_id?: string | null
          xero_contact_id?: string | null
          xero_invoice_id?: string | null
          xero_invoice_link?: string | null
        }
        Relationships: []
      }
      reconciliation_log: {
        Row: {
          check_date: string
          completed_at: string | null
          created_at: string | null
          db_message_count: number
          details: Json | null
          email_address: string | null
          end_history_id: number
          extra_in_db: string[]
          gmail_message_count: number
          id: string
          missing_in_db: string[]
          start_history_id: number
          status: string
        }
        Insert: {
          check_date: string
          completed_at?: string | null
          created_at?: string | null
          db_message_count: number
          details?: Json | null
          email_address?: string | null
          end_history_id: number
          extra_in_db?: string[]
          gmail_message_count: number
          id?: string
          missing_in_db?: string[]
          start_history_id: number
          status?: string
        }
        Update: {
          check_date?: string
          completed_at?: string | null
          created_at?: string | null
          db_message_count?: number
          details?: Json | null
          email_address?: string | null
          end_history_id?: number
          extra_in_db?: string[]
          gmail_message_count?: number
          id?: string
          missing_in_db?: string[]
          start_history_id?: number
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_user_allowed: {
        Args: { user_email: string }
        Returns: boolean
      }
      log_api_error: {
        Args: {
          api_endpoint: string
          error_details?: Json
          error_message: string
          request_data?: Json
          response_data?: string
          response_status?: number
        }
        Returns: undefined
      }
      test_pgnet_webhook: {
        Args: Record<PropertyKey, never>
        Returns: number
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
    Enums: {},
  },
} as const
