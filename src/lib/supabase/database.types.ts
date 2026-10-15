export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      board_assets: {
        Row: {
          board_id: string;
          created_at: string;
          data: NonNullable<Json>;
          file_id: string | null;
          id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          data?: NonNullable<Json>;
          file_id?: string | null;
          id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          file_id?: string | null;
          id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "board_assets_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "board_assets_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "files";
            referencedColumns: ["id"];
          },
        ];
      };
      boards: {
        Row: {
          canvas_schema: Json | null;
          created_at: string;
          id: string;
          name: string;
          position: number;
          project_id: string;
          template: string | null;
          updated_at: string;
        };
        Insert: {
          canvas_schema?: Json | null;
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          project_id: string;
          template?: string | null;
          updated_at?: string;
        };
        Update: {
          canvas_schema?: Json | null;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          project_id?: string;
          template?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boards_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boards_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_connections: {
        Row: {
          board_id: string;
          created_at: string;
          data: NonNullable<Json>;
          from_id: string;
          id: string;
          to_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          data?: NonNullable<Json>;
          from_id: string;
          id: string;
          to_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          from_id?: string;
          id?: string;
          to_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_connections_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_objects: {
        Row: {
          board_id: string;
          created_at: string;
          created_by: string | null;
          data: NonNullable<Json>;
          height: number;
          id: string;
          parent_id: string | null;
          rotation: number;
          type: string;
          updated_at: string;
          width: number;
          x: number;
          y: number;
          z_index: string;
        };
        Insert: {
          board_id: string;
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          height?: number;
          id: string;
          parent_id?: string | null;
          rotation?: number;
          type: string;
          updated_at?: string;
          width?: number;
          x?: number;
          y?: number;
          z_index: string;
        };
        Update: {
          board_id?: string;
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          height?: number;
          id?: string;
          parent_id?: string | null;
          rotation?: number;
          type?: string;
          updated_at?: string;
          width?: number;
          x?: number;
          y?: number;
          z_index?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canvas_objects_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          author_id: string;
          board_id: string | null;
          body: string;
          created_at: string;
          id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          board_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          board_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      files: {
        Row: {
          board_id: string | null;
          created_at: string;
          height: number | null;
          id: string;
          mime_type: string;
          name: string;
          owner_id: string;
          preview_path: string | null;
          project_id: string;
          size_bytes: number;
          storage_path: string;
          width: number | null;
        };
        Insert: {
          board_id?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          mime_type: string;
          name?: string;
          owner_id?: string;
          preview_path?: string | null;
          project_id: string;
          size_bytes: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          board_id?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          mime_type?: string;
          name?: string;
          owner_id?: string;
          preview_path?: string | null;
          project_id?: string;
          size_bytes?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "files_board_id_fkey";
            columns: ["board_id"];
            isOneToOne: false;
            referencedRelation: "boards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_events: {
        Row: {
          all_day: boolean;
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          id: string;
          kind: string;
          location: string | null;
          notes: string | null;
          project_id: string;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          all_day?: boolean;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: string;
          location?: string | null;
          notes?: string | null;
          project_id: string;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          all_day?: boolean;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          id?: string;
          kind?: string;
          location?: string | null;
          notes?: string | null;
          project_id?: string;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          project_id: string;
          token_hash: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          project_id: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          project_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_invitations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          added_by: string | null;
          created_at: string;
          project_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          project_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          project_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_requests: {
        Row: {
          created_at: string;
          currency: string;
          decided_at: string | null;
          decided_by: string | null;
          details: string | null;
          id: string;
          project_id: string;
          quantity: number;
          requested_by: string;
          service_id: string | null;
          status: string;
          title: string;
          unit: string;
          unit_price: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          details?: string | null;
          id?: string;
          project_id: string;
          quantity?: number;
          requested_by?: string;
          service_id?: string | null;
          status?: string;
          title: string;
          unit?: string;
          unit_price?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          details?: string | null;
          id?: string;
          project_id?: string;
          quantity?: number;
          requested_by?: string;
          service_id?: string | null;
          status?: string;
          title?: string;
          unit?: string;
          unit_price?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_requests_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      project_tasks: {
        Row: {
          created_at: string;
          created_by: string | null;
          done: boolean;
          due_date: string | null;
          id: string;
          notes: string | null;
          phase: string;
          position: number;
          project_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          done?: boolean;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          phase?: string;
          position?: number;
          project_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          done?: boolean;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          phase?: string;
          position?: number;
          project_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          client_name: string | null;
          cover_path: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          owner_id: string;
          phase: string;
          updated_at: string;
        };
        Insert: {
          client_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          owner_id?: string;
          phase?: string;
          updated_at?: string;
        };
        Update: {
          client_name?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          phase?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          name: string;
          position: number;
          unit: string;
          unit_price: number | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          name: string;
          position?: number;
          unit?: string;
          unit_price?: number | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          name?: string;
          position?: number;
          unit?: string;
          unit_price?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      studio_members: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      project_summaries: {
        Row: {
          board_count: number | null;
          client_name: string | null;
          cover_path: string | null;
          created_at: string | null;
          created_by_client: boolean | null;
          description: string | null;
          id: string | null;
          item_count: number | null;
          name: string | null;
          next_event_at: string | null;
          open_request_count: number | null;
          owner_id: string | null;
          phase: string | null;
          updated_at: string | null;
        };
        Insert: {
          board_count?: never;
          client_name?: string | null;
          cover_path?: never;
          created_at?: string | null;
          created_by_client?: never;
          description?: string | null;
          id?: string | null;
          item_count?: never;
          name?: string | null;
          next_event_at?: never;
          open_request_count?: never;
          owner_id?: string | null;
          phase?: string | null;
          updated_at?: string | null;
        };
        Update: {
          board_count?: never;
          client_name?: string | null;
          cover_path?: never;
          created_at?: string | null;
          created_by_client?: never;
          description?: string | null;
          id?: string | null;
          item_count?: never;
          name?: string | null;
          next_event_at?: never;
          open_request_count?: never;
          owner_id?: string | null;
          phase?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_invitation: { Args: { invite_token: string }; Returns: string };
      current_user_is_studio: { Args: Record<PropertyKey, never>; Returns: boolean };
      get_invitation: {
        Args: { invite_token: string };
        Returns: {
          email: string;
          invited_by_name: string;
          project_name: string;
          status: string;
        }[];
      };
      studio_is_set_up: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
