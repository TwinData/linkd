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
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      float_deposits: {
        Row: {
          created_at: string
          date: string
          id: string
          owner_id: string
          profit: number | null
          rate: number
          sarah_share_percentage: number
          sarah_total: number
          total_kd: number
          total_kes: number
          transaction_fee: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          owner_id: string
          profit?: number | null
          rate: number
          sarah_share_percentage?: number
          sarah_total?: number
          total_kd: number
          total_kes?: number
          transaction_fee?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          owner_id?: string
          profit?: number | null
          rate?: number
          sarah_share_percentage?: number
          sarah_total?: number
          total_kd?: number
          total_kes?: number
          transaction_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          ends_at: string | null
          id: string
          name: string
          results: string | null
          starts_at: string | null
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          ends_at?: string | null
          id?: string
          name: string
          results?: string | null
          starts_at?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promo_discount_type"]
          ends_at?: string | null
          id?: string
          name?: string
          results?: string | null
          starts_at?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          owner_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          owner_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          owner_id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      transaction_charges: {
        Row: {
          charge_amount: number
          created_at: string
          id: string
          max_amount: number
          min_amount: number
          transaction_type: string
          updated_at: string
        }
        Insert: {
          charge_amount: number
          created_at?: string
          id?: string
          max_amount: number
          min_amount: number
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          charge_amount?: number
          created_at?: string
          id?: string
          max_amount?: number
          min_amount?: number
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_kd: number
          amount_kes: number
          client_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          paid_at: string | null
          payout_kes: number
          rate_kes_per_kd: number
          reference: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_fee_kes: number
          type: string | null
          updated_at: string
        }
        Insert: {
          amount_kd: number
          amount_kes: number
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          paid_at?: string | null
          payout_kes?: number
          rate_kes_per_kd: number
          reference?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_fee_kes?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          amount_kd?: number
          amount_kes?: number
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          paid_at?: string | null
          payout_kes?: number
          rate_kes_per_kd?: number
          reference?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_fee_kes?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_client_transaction_patterns: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_amount_kd: number
          avg_payout_kes: number
          client_email: string
          client_id: string
          client_name: string
          days_between_transactions: number
          first_transaction: string
          last_transaction: string
          total_amount_kd: number
          total_payout_kes: number
          transaction_count: number
        }[]
      }
      get_rate_analysis: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_transaction_amount_kd: number
          rate_kes_per_kd: number
          rate_rank: number
          total_volume_kd: number
          transaction_count: number
        }[]
      }
      get_sarahs_share_analysis: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          period: string
          sarahs_share_amount_kes: number
          sarahs_share_percentage: number
          total_agent_share_kd: number
          total_payout_kes: number
          total_transactions: number
          total_volume_kd: number
        }[]
      }
      get_transaction_type_analysis: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_amount_kd: number
          percentage_of_total: number
          total_payout_kes: number
          total_volume_kd: number
          transaction_count: number
          transaction_type: string
        }[]
      }
      get_user_transaction_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_amount_kd: number
          avg_rate: number
          total_amount_kd: number
          total_amount_kes: number
          total_payout_kes: number
          transaction_count: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user"
      promo_discount_type: "percentage" | "fixed"
      transaction_status: "pending" | "verified" | "paid" | "rejected"
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
      app_role: ["superadmin", "admin", "user"],
      promo_discount_type: ["percentage", "fixed"],
      transaction_status: ["pending", "verified", "paid", "rejected"],
    },
  },
} as const
