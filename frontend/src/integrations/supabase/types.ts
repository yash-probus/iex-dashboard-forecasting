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
      consumer_credits: {
        Row: {
          consumer_id: string
          consumer_name: string
          created_at: string
          credit_limit: number
          current_balance: number
          daily_consumption_estimate: number
          days_of_balance_remaining: number | null
          id: string
          last_payment_date: string | null
          status: string | null
          trader_id: string | null
          updated_at: string
        }
        Insert: {
          consumer_id: string
          consumer_name: string
          created_at?: string
          credit_limit?: number
          current_balance?: number
          daily_consumption_estimate?: number
          days_of_balance_remaining?: number | null
          id?: string
          last_payment_date?: string | null
          status?: string | null
          trader_id?: string | null
          updated_at?: string
        }
        Update: {
          consumer_id?: string
          consumer_name?: string
          created_at?: string
          credit_limit?: number
          current_balance?: number
          daily_consumption_estimate?: number
          days_of_balance_remaining?: number | null
          id?: string
          last_payment_date?: string | null
          status?: string | null
          trader_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_alerts: {
        Row: {
          action_taken: string | null
          alert_type: Database["public"]["Enums"]["credit_alert_type"]
          amount: number | null
          consumer_credit_id: string
          created_at: string
          days_remaining: number | null
          id: string
          is_resolved: boolean | null
          message: string
          overdue_days: number | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["credit_alert_severity"]
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          alert_type: Database["public"]["Enums"]["credit_alert_type"]
          amount?: number | null
          consumer_credit_id: string
          created_at?: string
          days_remaining?: number | null
          id?: string
          is_resolved?: boolean | null
          message: string
          overdue_days?: number | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["credit_alert_severity"]
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          alert_type?: Database["public"]["Enums"]["credit_alert_type"]
          amount?: number | null
          consumer_credit_id?: string
          created_at?: string
          days_remaining?: number | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          overdue_days?: number | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["credit_alert_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_alerts_consumer_credit_id_fkey"
            columns: ["consumer_credit_id"]
            isOneToOne: false
            referencedRelation: "consumer_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          consumer_credit_id: string
          created_at: string
          days_overdue: number | null
          due_date: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          consumer_credit_id: string
          created_at?: string
          days_overdue?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          consumer_credit_id?: string
          created_at?: string
          days_overdue?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_consumer_credit_id_fkey"
            columns: ["consumer_credit_id"]
            isOneToOne: false
            referencedRelation: "consumer_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          consumer_credit_id: string
          created_at: string
          error_message: string | null
          id: string
          message_template: string | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"] | null
          updated_at: string
        }
        Insert: {
          consumer_credit_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_template?: string | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          updated_at?: string
        }
        Update: {
          consumer_credit_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_template?: string | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_consumer_credit_id_fkey"
            columns: ["consumer_credit_id"]
            isOneToOne: false
            referencedRelation: "consumer_credits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      credit_alert_severity: "info" | "warning" | "critical"
      credit_alert_type: "insufficient_balance" | "payment_due" | "overdue"
      reminder_status: "pending" | "sent" | "failed" | "cancelled"
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
      credit_alert_severity: ["info", "warning", "critical"],
      credit_alert_type: ["insufficient_balance", "payment_due", "overdue"],
      reminder_status: ["pending", "sent", "failed", "cancelled"],
    },
  },
} as const
