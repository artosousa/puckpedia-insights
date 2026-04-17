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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          created_at: string
          id: string
          player_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          user_id?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      player_media: {
        Row: {
          ai_analysis: string | null
          ai_analyzed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          mime_type: string | null
          notes: string | null
          player_id: string
          size_bytes: number | null
          storage_path: string
          tags: string[]
          updated_at: string
          user_id: string
          viewing_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: string
          mime_type?: string | null
          notes?: string | null
          player_id: string
          size_bytes?: number | null
          storage_path: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          viewing_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_analyzed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          notes?: string | null
          player_id?: string
          size_bytes?: number | null
          storage_path?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          viewing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_media_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_media_viewing_id_fkey"
            columns: ["viewing_id"]
            isOneToOne: false
            referencedRelation: "viewings"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          date_of_birth: string | null
          first_name: string
          height_cm: number | null
          id: string
          jersey_number: number | null
          last_name: string
          position: string | null
          shoots: string | null
          team_id: string | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_name: string
          position?: string | null
          shoots?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_name?: string
          position?: string | null
          shoots?: string | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_theme_prefs: {
        Row: {
          accent: string | null
          background: string | null
          border: string | null
          card: string | null
          foreground: string | null
          primary_color: string | null
          primary_foreground: string | null
          surface_elevated: string | null
          surface_sunken: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent?: string | null
          background?: string | null
          border?: string | null
          card?: string | null
          foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          surface_elevated?: string | null
          surface_sunken?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          accent?: string | null
          background?: string | null
          border?: string | null
          card?: string | null
          foreground?: string | null
          primary_color?: string | null
          primary_foreground?: string | null
          surface_elevated?: string | null
          surface_sunken?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      viewings: {
        Row: {
          created_at: string
          game_date: string
          id: string
          location: string | null
          notes: string | null
          opponent: string | null
          player_id: string
          projection: string | null
          rating_compete: number | null
          rating_hands: number | null
          rating_iq: number | null
          rating_overall: number | null
          rating_physicality: number | null
          rating_shot: number | null
          rating_skating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          opponent?: string | null
          player_id: string
          projection?: string | null
          rating_compete?: number | null
          rating_hands?: number | null
          rating_iq?: number | null
          rating_overall?: number | null
          rating_physicality?: number | null
          rating_shot?: number | null
          rating_skating?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          game_date?: string
          id?: string
          location?: string | null
          notes?: string | null
          opponent?: string | null
          player_id?: string
          projection?: string | null
          rating_compete?: number | null
          rating_hands?: number | null
          rating_iq?: number | null
          rating_overall?: number | null
          rating_physicality?: number | null
          rating_shot?: number | null
          rating_skating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_list: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          player_id: string
          tier: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          player_id: string
          tier?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          player_id?: string
          tier?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_list_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tier_id: { Args: { uid: string }; Returns: string }
      tier_player_limit: { Args: { tier: string }; Returns: number }
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
