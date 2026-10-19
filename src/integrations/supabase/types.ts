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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          mobile: string | null
          college: string | null
          year: number | null
          semester: number | null
          role: 'admin' | 'student'
          avatar_url: string | null
          disabled: boolean
          student_number?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string
          mobile?: string | null
          college?: string | null
          year?: number | null
          semester?: number | null
          role?: 'admin' | 'student'
          avatar_url?: string | null
          disabled?: boolean
          student_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          mobile?: string | null
          college?: string | null
          year?: number | null
          semester?: number | null
          role?: 'admin' | 'student'
          avatar_url?: string | null
          disabled?: boolean
          student_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      admins: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          name: string
          phone: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          name?: string
          phone?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          name?: string
          phone?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          name: string
          code: string
          type: string | null
          description: string | null
          duration_years: number
          default_semester_price: number | null
          is_active: boolean
          display_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          type?: string | null
          description?: string | null
          duration_years?: number
          default_semester_price?: number | null
          is_active?: boolean
          display_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          type?: string | null
          description?: string | null
          duration_years?: number
          default_semester_price?: number | null
          is_active?: boolean
          display_order?: number | null
          created_at?: string
        }
        Relationships: []
      }
      academic_years: {
        Row: {
          id: string
          course_id: string
          year_number: number
          title: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          year_number: number
          title: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          year_number?: number
          title?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          id: string
          course_id: string
          academic_year_id: string | null
          semester_number: number
          title: string
          price: number | null
          original_price: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          academic_year_id?: string | null
          semester_number: number
          title: string
          price?: number | null
          original_price?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          academic_year_id?: string | null
          semester_number?: number
          title?: string
          price?: number | null
          original_price?: number | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          name: string
          code: string
          year: number | null
          semester: number | null
          semester_id: string | null
          course_id: string | null
          description: string | null
          display_order: number | null
          is_active: boolean
          created_at: string
          thumbnail_url: string | null
          price: number
          is_premium: boolean
        }
        Insert: {
          id?: string
          name: string
          code: string
          year?: number | null
          semester?: number | null
          semester_id?: string | null
          course_id?: string | null
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          created_at?: string
          thumbnail_url?: string | null
          price?: number
          is_premium?: boolean
        }
        Update: {
          id?: string
          name?: string
          code?: string
          year?: number | null
          semester?: number | null
          semester_id?: string | null
          course_id?: string | null
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          created_at?: string
          thumbnail_url?: string | null
          price?: number
          is_premium?: boolean
        }
        Relationships: []
      }
      units: {
        Row: {
          id: string
          subject_id: string
          unit_number: number
          title: string
          description: string | null
          display_order: number | null
          is_active: boolean
          created_at: string
          file_url: string | null
          file_name: string | null
          file_size: number | string | null
          is_premium: boolean
        }
        Insert: {
          id?: string
          subject_id: string
          unit_number: number
          title: string
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          created_at?: string
          file_url?: string | null
          file_name?: string | null
          file_size?: number | string | null
          is_premium?: boolean
        }
        Update: {
          id?: string
          subject_id?: string
          unit_number?: number
          title?: string
          description?: string | null
          display_order?: number | null
          is_active?: boolean
          created_at?: string
          file_url?: string | null
          file_name?: string | null
          file_size?: number | string | null
          is_premium?: boolean
        }
        Relationships: []
      }
      materials: {
        Row: {
          id: string
          title: string
          description: string | null
          subject_id: string | null
          unit_id: string | null
          type: string | null
          material_type: string | null
          price: number
          is_premium: boolean
          status: string | null
          published: boolean | null
          file_url: string | null
          drive_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          subject_id?: string | null
          unit_id?: string | null
          type?: string | null
          material_type?: string | null
          price?: number
          is_premium?: boolean
          status?: string | null
          published?: boolean | null
          file_url?: string | null
          drive_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          subject_id?: string | null
          unit_id?: string | null
          type?: string | null
          material_type?: string | null
          price?: number
          is_premium?: boolean
          status?: string | null
          published?: boolean | null
          file_url?: string | null
          drive_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          student_id: string
          student_name: string
          student_email: string | null
          amount: number
          final_amount: number | null
          discount: number | null
          status: string
          transaction_id: string | null
          order_date: string
          product_title: string | null
          product_id: string | null
          product_type: string | null
          material_ids: string[] | null
          gateway: string | null
          payment_date: string | null
          razorpay_order_id: string | null
          total_amount: number | null
          currency: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          student_email?: string | null
          amount: number
          final_amount?: number | null
          discount?: number | null
          status?: string
          transaction_id?: string | null
          order_date?: string
          product_title?: string | null
          product_id?: string | null
          product_type?: string | null
          material_ids?: string[] | null
          gateway?: string | null
          payment_date?: string | null
          razorpay_order_id?: string | null
          total_amount?: number | null
          currency?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          student_email?: string | null
          amount?: number
          final_amount?: number | null
          discount?: number | null
          status?: string
          transaction_id?: string | null
          order_date?: string
          product_title?: string | null
          product_id?: string | null
          product_type?: string | null
          material_ids?: string[] | null
          gateway?: string | null
          payment_date?: string | null
          razorpay_order_id?: string | null
          total_amount?: number | null
          currency?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          student_id: string
          material_id: string
          amount: number | null
          status: string | null
          payment_status: string | null
          order_id: string | null
          purchased_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          material_id: string
          amount?: number | null
          status?: string | null
          payment_status?: string | null
          order_id?: string | null
          purchased_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          material_id?: string
          amount?: number | null
          status?: string | null
          payment_status?: string | null
          order_id?: string | null
          purchased_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          student_id: string
          material_id: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          material_id: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          material_id?: string
          created_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          id: string
          type: string | null
          year: number | null
          semester: number | null
          price: number | null
          original_price: number | null
          created_at: string
          is_active: boolean | null
        }
        Insert: {
          id?: string
          type?: string | null
          year?: number | null
          semester?: number | null
          price?: number | null
          original_price?: number | null
          created_at?: string
          is_active?: boolean | null
        }
        Update: {
          id?: string
          type?: string | null
          year?: number | null
          semester?: number | null
          price?: number | null
          original_price?: number | null
          created_at?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          material_id: string | null
          material_title_snapshot: string
          unit_price: number
          quantity: number
          line_total: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          material_id?: string | null
          material_title_snapshot?: string
          unit_price?: number
          quantity?: number
          line_total?: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          material_id?: string | null
          material_title_snapshot?: string
          unit_price?: number
          quantity?: number
          line_total?: number
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          order_id: string
          student_id: string
          gateway: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          amount: number
          currency: string
          status: string
          payment_method: string | null
          failure_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          student_id: string
          gateway?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          student_id?: string
          gateway?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          id: string
          gateway_event_id: string
          event_type: string
          processing_status: string
          payload: Json | null
          error_message: string | null
          received_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          gateway_event_id: string
          event_type: string
          processing_status?: string
          payload?: Json | null
          error_message?: string | null
          received_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          gateway_event_id?: string
          event_type?: string
          processing_status?: string
          payload?: Json | null
          error_message?: string | null
          received_at?: string
          processed_at?: string | null
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
