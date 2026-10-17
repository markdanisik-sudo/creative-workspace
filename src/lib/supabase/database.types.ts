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
      app_settings: {
        Row: {
          emails_verified: boolean;
          id: boolean;
        };
        Insert: {
          emails_verified?: boolean;
          id?: boolean;
        };
        Update: {
          emails_verified?: boolean;
          id?: boolean;
        };
        Relationships: [];
      };
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
      budget_items: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          project_id: string;
          quantity: number;
          title: string;
          unit: string | null;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position?: number;
          project_id: string;
          quantity?: number;
          title: string;
          unit?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          project_id?: string;
          quantity?: number;
          title?: string;
          unit?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budget_items_project_id_fkey";
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
          resolved_at: string | null;
          resolved_by: string | null;
          target: string | null;
          topic: string | null;
          updated_at: string;
        };
        Insert: {
          author_id?: string;
          board_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          project_id: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          target?: string | null;
          topic?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          board_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          project_id?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          target?: string | null;
          topic?: string | null;
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
      invoices: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency: string;
          customer: NonNullable<Json>;
          due_on: string;
          id: string;
          issued_on: string;
          items: NonNullable<Json>;
          number: string;
          paid_at: string | null;
          project_id: string;
          subtotal: number;
          supplier: NonNullable<Json>;
          total: number;
          variable_symbol: string;
          vat: number;
          vat_rate: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency: string;
          customer: NonNullable<Json>;
          due_on: string;
          id?: string;
          issued_on?: string;
          items: NonNullable<Json>;
          number: string;
          paid_at?: string | null;
          project_id: string;
          subtotal: number;
          supplier: NonNullable<Json>;
          total: number;
          variable_symbol: string;
          vat: number;
          vat_rate: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          customer?: NonNullable<Json>;
          due_on?: string;
          id?: string;
          issued_on?: string;
          items?: NonNullable<Json>;
          number?: string;
          paid_at?: string | null;
          project_id?: string;
          subtotal?: number;
          supplier?: NonNullable<Json>;
          total?: number;
          variable_symbol?: string;
          vat?: number;
          vat_rate?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          data: NonNullable<Json>;
          done: boolean;
          id: string;
          module: string;
          position: number;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          done?: boolean;
          id?: string;
          module: string;
          position?: number;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          data?: NonNullable<Json>;
          done?: boolean;
          id?: string;
          module?: string;
          position?: number;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_items_project_id_fkey";
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
      project_budgets: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          client_billing: NonNullable<Json>;
          currency: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          client_billing?: NonNullable<Json>;
          currency?: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          client_billing?: NonNullable<Json>;
          currency?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_budgets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
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
      project_images: {
        Row: {
          caption: string | null;
          collection: string;
          created_at: string;
          height: number | null;
          id: string;
          location_id: string | null;
          position: number;
          preview_path: string | null;
          project_id: string;
          storage_path: string;
          uploaded_by: string | null;
          width: number | null;
        };
        Insert: {
          caption?: string | null;
          collection: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          location_id?: string | null;
          position?: number;
          preview_path?: string | null;
          project_id: string;
          storage_path: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Update: {
          caption?: string | null;
          collection?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          location_id?: string | null;
          position?: number;
          preview_path?: string | null;
          project_id?: string;
          storage_path?: string;
          uploaded_by?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_images_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "project_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_images_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_images_project_id_fkey";
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
      project_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          label: string | null;
          project_id: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          label?: string | null;
          project_id: string;
          url: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          label?: string | null;
          project_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_locations: {
        Row: {
          address: string | null;
          contact: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          position: number;
          project_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          position?: number;
          project_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          position?: number;
          project_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_locations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_locations_project_id_fkey";
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
      project_workspaces: {
        Row: {
          brief: NonNullable<Json>;
          medium: string;
          modules: string[] | null;
          palette: NonNullable<Json>;
          project_id: string;
          shot_defaults: NonNullable<Json>;
          template: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          brief?: NonNullable<Json>;
          medium?: string;
          modules?: string[] | null;
          palette?: NonNullable<Json>;
          project_id: string;
          shot_defaults?: NonNullable<Json>;
          template?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          brief?: NonNullable<Json>;
          medium?: string;
          modules?: string[] | null;
          palette?: NonNullable<Json>;
          project_id?: string;
          shot_defaults?: NonNullable<Json>;
          template?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_workspaces_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_workspaces_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
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
      shots: {
        Row: {
          created_at: string;
          created_by: string | null;
          day_night: string | null;
          description: string | null;
          done: boolean;
          duration_seconds: number | null;
          id: string;
          int_ext: string | null;
          location_id: string | null;
          notes: string | null;
          position: number;
          project_id: string;
          scene: string | null;
          specs: NonNullable<Json>;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          day_night?: string | null;
          description?: string | null;
          done?: boolean;
          duration_seconds?: number | null;
          id?: string;
          int_ext?: string | null;
          location_id?: string | null;
          notes?: string | null;
          position?: number;
          project_id: string;
          scene?: string | null;
          specs?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          day_night?: string | null;
          description?: string | null;
          done?: boolean;
          duration_seconds?: number | null;
          id?: string;
          int_ext?: string | null;
          location_id?: string | null;
          notes?: string | null;
          position?: number;
          project_id?: string;
          scene?: string | null;
          specs?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shots_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "project_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shots_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "project_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shots_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      studio_billing: {
        Row: {
          address: string | null;
          bank_account: string | null;
          dic: string | null;
          due_days: number;
          email: string | null;
          iban: string | null;
          ico: string | null;
          id: boolean;
          invoice_note: string | null;
          invoice_seq: number;
          invoice_year: number | null;
          name: string;
          phone: string | null;
          updated_at: string;
          vat_payer: boolean;
          vat_rate: number;
        };
        Insert: {
          address?: string | null;
          bank_account?: string | null;
          dic?: string | null;
          due_days?: number;
          email?: string | null;
          iban?: string | null;
          ico?: string | null;
          id?: boolean;
          invoice_note?: string | null;
          invoice_seq?: number;
          invoice_year?: number | null;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          vat_payer?: boolean;
          vat_rate?: number;
        };
        Update: {
          address?: string | null;
          bank_account?: string | null;
          dic?: string | null;
          due_days?: number;
          email?: string | null;
          iban?: string | null;
          ico?: string | null;
          id?: boolean;
          invoice_note?: string | null;
          invoice_seq?: number;
          invoice_year?: number | null;
          name?: string;
          phone?: string | null;
          updated_at?: string;
          vat_payer?: boolean;
          vat_rate?: number;
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
      accept_invitation_by_id: { Args: { invitation_id: string }; Returns: string };
      create_invoice: { Args: { target: string }; Returns: string };
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
      my_invitations: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          id: string;
          invited_by_name: string;
          project_name: string;
        }[];
      };
      set_comment_resolved: { Args: { comment_id: string; resolved: boolean }; Returns: undefined };
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
