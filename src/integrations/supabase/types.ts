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
          model: string | null
          player_id: string
          report_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          player_id: string
          report_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          player_id?: string
          report_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: string
          level: string | null
          name: string
          user_id: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name: string
          user_id?: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_branding: {
        Row: {
          created_at: string
          logo_path: string | null
          organization_id: string
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          logo_path?: string | null
          organization_id: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          logo_path?: string | null
          organization_id?: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_media: {
        Row: {
          ai_analysis: string | null
          ai_analyzed_at: string | null
          created_at: string
          duration_seconds: number | null
          edit: Json | null
          id: string
          kind: string
          mime_type: string | null
          notes: string | null
          player_id: string
          size_bytes: number | null
          source_url: string | null
          storage_path: string | null
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
          edit?: Json | null
          id?: string
          kind: string
          mime_type?: string | null
          notes?: string | null
          player_id: string
          size_bytes?: number | null
          source_url?: string | null
          storage_path?: string | null
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
          edit?: Json | null
          id?: string
          kind?: string
          mime_type?: string | null
          notes?: string | null
          player_id?: string
          size_bytes?: number | null
          source_url?: string | null
          storage_path?: string | null
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
          player_context: string | null
          position: string | null
          scout_confidence: string | null
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
          player_context?: string | null
          position?: string | null
          scout_confidence?: string | null
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
          player_context?: string | null
          position?: string | null
          scout_confidence?: string | null
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
          appearance_mode: string
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
          appearance_mode?: string
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
          appearance_mode?: string
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
      can_manage_organization: {
        Args: { _organization_id: string; _user_id?: string }
        Returns: boolean
      }
      claim_organization_invitations: { Args: never; Returns: number }
      current_tier_id: { Args: { uid: string }; Returns: string }
      ensure_default_organization: { Args: never; Returns: string }
      is_organization_member: {
        Args: { _organization_id: string; _user_id?: string }
        Returns: boolean
      }
      tier_player_limit: { Args: { tier: string }; Returns: number }
    }
    Enums: {
      organization_role: "owner" | "admin" | "member"
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
    Enums: {
      organization_role: ["owner", "admin", "member"],
    },
  },
} as const
