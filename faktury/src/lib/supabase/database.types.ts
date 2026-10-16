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
      businesses: {
        Row: {
          bank_account: string | null;
          bic: string | null;
          city: string | null;
          country: string;
          dic: string | null;
          due_days: number;
          email: string | null;
          iban: string | null;
          ico: string | null;
          invoice_note: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          registry: string | null;
          street: string | null;
          updated_at: string;
          vat_payer: boolean;
          web: string | null;
          zip: string | null;
        };
        ComputedFields: never;
        Insert: {
          bank_account?: string | null;
          bic?: string | null;
          city?: string | null;
          country?: string;
          dic?: string | null;
          due_days?: number;
          email?: string | null;
          iban?: string | null;
          ico?: string | null;
          invoice_note?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          registry?: string | null;
          street?: string | null;
          updated_at?: string;
          vat_payer?: boolean;
          web?: string | null;
          zip?: string | null;
        };
        Update: {
          bank_account?: string | null;
          bic?: string | null;
          city?: string | null;
          country?: string;
          dic?: string | null;
          due_days?: number;
          email?: string | null;
          iban?: string | null;
          ico?: string | null;
          invoice_note?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          registry?: string | null;
          street?: string | null;
          updated_at?: string;
          vat_payer?: boolean;
          web?: string | null;
          zip?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          city: string | null;
          country: string;
          created_at: string;
          dic: string | null;
          email: string | null;
          ico: string | null;
          id: string;
          name: string;
          owner_id: string;
          phone: string | null;
          street: string | null;
          updated_at: string;
          zip: string | null;
        };
        ComputedFields: never;
        Insert: {
          city?: string | null;
          country?: string;
          created_at?: string;
          dic?: string | null;
          email?: string | null;
          ico?: string | null;
          id?: string;
          name: string;
          owner_id?: string;
          phone?: string | null;
          street?: string | null;
          updated_at?: string;
          zip?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string;
          created_at?: string;
          dic?: string | null;
          email?: string | null;
          ico?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          street?: string | null;
          updated_at?: string;
          zip?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          contact_id: string | null;
          created_at: string;
          currency: string;
          customer: NonNullable<Json>;
          due_on: string;
          exchange_rate: number;
          external_id: string | null;
          id: string;
          issued_on: string;
          items: NonNullable<Json>;
          kind: string;
          note: string | null;
          number: string;
          owner_id: string;
          paid_on: string | null;
          source: string;
          subtotal: number;
          supplier: NonNullable<Json>;
          taxable_on: string | null;
          total: number;
          total_czk: number | null;
          updated_at: string;
          variable_symbol: string | null;
          vat: number;
        };
        ComputedFields: never;
        Insert: {
          contact_id?: string | null;
          created_at?: string;
          currency?: string;
          customer?: NonNullable<Json>;
          due_on: string;
          exchange_rate?: number;
          external_id?: string | null;
          id?: string;
          issued_on: string;
          items?: NonNullable<Json>;
          kind?: string;
          note?: string | null;
          number: string;
          owner_id?: string;
          paid_on?: string | null;
          source?: string;
          subtotal?: number;
          supplier?: NonNullable<Json>;
          taxable_on?: string | null;
          total?: number;
          total_czk?: never;
          updated_at?: string;
          variable_symbol?: string | null;
          vat?: number;
        };
        Update: {
          contact_id?: string | null;
          created_at?: string;
          currency?: string;
          customer?: NonNullable<Json>;
          due_on?: string;
          exchange_rate?: number;
          external_id?: string | null;
          id?: string;
          issued_on?: string;
          items?: NonNullable<Json>;
          kind?: string;
          note?: string | null;
          number?: string;
          owner_id?: string;
          paid_on?: string | null;
          source?: string;
          subtotal?: number;
          supplier?: NonNullable<Json>;
          taxable_on?: string | null;
          total?: number;
          total_czk?: never;
          updated_at?: string;
          variable_symbol?: string | null;
          vat?: number;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      sign_up_open: { Args: Record<PropertyKey, never>; Returns: boolean };
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
