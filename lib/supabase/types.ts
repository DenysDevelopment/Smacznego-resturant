export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          building: string | null
          created_at: string
          customer_id: string
          entrance: string | null
          floor: string | null
          formatted: string | null
          id: string
          intercom: string | null
          label: string | null
          lat: number | null
          lng: number | null
          street: string | null
        }
        Insert: {
          apartment?: string | null
          building?: string | null
          created_at?: string
          customer_id: string
          entrance?: string | null
          floor?: string | null
          formatted?: string | null
          id?: string
          intercom?: string | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          street?: string | null
        }
        Update: {
          apartment?: string | null
          building?: string | null
          created_at?: string
          customer_id?: string
          entrance?: string | null
          floor?: string | null
          formatted?: string | null
          id?: string
          intercom?: string | null
          label?: string | null
          lat?: number | null
          lng?: number | null
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          id: string
          is_visible: boolean
          name: Json
          sort: number
        }
        Insert: {
          id?: string
          is_visible?: boolean
          name: Json
          sort?: number
        }
        Update: {
          id?: string
          is_visible?: boolean
          name?: Json
          sort?: number
        }
        Relationships: []
      }
      combo_items: {
        Row: {
          combo_id: string
          dish_id: string | null
          id: string
          qty: number
        }
        Insert: {
          combo_id: string
          dish_id?: string | null
          id?: string
          qty?: number
        }
        Update: {
          combo_id?: string
          dish_id?: string | null
          id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey"
            columns: ["combo_id"]
            isOneToOne: false
            referencedRelation: "combos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "combo_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          description: Json
          id: string
          is_available: boolean
          name: Json
          photo_url: string | null
          price: number
          sort: number
        }
        Insert: {
          description?: Json
          id?: string
          is_available?: boolean
          name: Json
          photo_url?: string | null
          price: number
          sort?: number
        }
        Update: {
          description?: Json
          id?: string
          is_available?: boolean
          name?: Json
          photo_url?: string | null
          price?: number
          sort?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          base_price: number
          category_id: string
          description: Json
          id: string
          is_available: boolean
          is_hidden: boolean
          name: Json
          photo_url: string | null
          sort: number
          tags: string[]
        }
        Insert: {
          base_price: number
          category_id: string
          description?: Json
          id?: string
          is_available?: boolean
          is_hidden?: boolean
          name: Json
          photo_url?: string | null
          sort?: number
          tags?: string[]
        }
        Update: {
          base_price?: number
          category_id?: string
          description?: Json
          id?: string
          is_available?: boolean
          is_hidden?: boolean
          name?: Json
          photo_url?: string | null
          sort?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      option_groups: {
        Row: {
          dish_id: string
          id: string
          max_select: number
          min_select: number
          name: Json
          required: boolean
          sort: number
        }
        Insert: {
          dish_id: string
          id?: string
          max_select?: number
          min_select?: number
          name: Json
          required?: boolean
          sort?: number
        }
        Update: {
          dish_id?: string
          id?: string
          max_select?: number
          min_select?: number
          name?: Json
          required?: boolean
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "option_groups_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          id: string
          name: Json
          option_group_id: string
          price_delta: number
          sort: number
        }
        Insert: {
          id?: string
          name: Json
          option_group_id: string
          price_delta?: number
          sort?: number
        }
        Update: {
          id?: string
          name?: Json
          option_group_id?: string
          price_delta?: number
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          dish_id: string | null
          id: string
          line_total: number
          name: string
          order_id: string
          qty: number
          selected_options: Json
          unit_price: number
        }
        Insert: {
          dish_id?: string | null
          id?: string
          line_total: number
          name: string
          order_id: string
          qty: number
          selected_options?: Json
          unit_price: number
        }
        Update: {
          dish_id?: string | null
          id?: string
          line_total?: number
          name?: string
          order_id?: string
          qty?: number
          selected_options?: Json
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot: Json | null
          cash_change_from: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount: number
          id: string
          language: string
          notes: string | null
          payment_method: string
          public_token: string
          scheduled_for: string | null
          status: string
          subtotal: number
          total: number
          type: string
        }
        Insert: {
          address_snapshot?: Json | null
          cash_change_from?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          discount?: number
          id?: string
          language?: string
          notes?: string | null
          payment_method?: string
          public_token: string
          scheduled_for?: string | null
          status?: string
          subtotal: number
          total: number
          type: string
        }
        Update: {
          address_snapshot?: Json | null
          cash_change_from?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          discount?: number
          id?: string
          language?: string
          notes?: string | null
          payment_method?: string
          public_token?: string
          scheduled_for?: string | null
          status?: string
          subtotal?: number
          total?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          address_text: string
          delivery_fee: number
          delivery_radius_m: number
          free_delivery_threshold: number
          hours: Json
          id: boolean
          lat: number
          lng: number
          min_order: number
          name: string
          phone: string
          prep_lead_minutes: number
        }
        Insert: {
          address_text: string
          delivery_fee: number
          delivery_radius_m: number
          free_delivery_threshold: number
          hours: Json
          id?: boolean
          lat: number
          lng: number
          min_order: number
          name: string
          phone: string
          prep_lead_minutes: number
        }
        Update: {
          address_text?: string
          delivery_fee?: number
          delivery_radius_m?: number
          free_delivery_threshold?: number
          hours?: Json
          id?: boolean
          lat?: number
          lng?: number
          min_order?: number
          name?: string
          phone?: string
          prep_lead_minutes?: number
        }
        Relationships: []
      }
      site_content: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_flags: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

