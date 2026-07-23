// ============================================================
// src/lib/database.types.ts
// مولّد من مخطط Supabase — لا تعدّله يدوياً.
// لإعادة التوليد:
//   npx supabase gen types typescript --project-id ldqaohjnlxiwvaijcsbm --schema public > src/lib/database.types.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean
          code: string
          commission_pct: number
          created_at: string
          id: number
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          active?: boolean
          code: string
          commission_pct?: number
          created_at?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          commission_pct?: number
          created_at?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      app_flags: {
        Row: { key: string; updated_at: string; value: string }
        Insert: { key: string; updated_at?: string; value: string }
        Update: { key?: string; updated_at?: string; value?: string }
        Relationships: []
      }
      appointments: {
        Row: {
          assigned_doctor: string | null
          call_ended_at: string | null
          call_started_at: string | null
          call_status: string | null
          created_at: string | null
          date: string
          doctor_id: number | null
          duration: number | null
          guest_data: Json | null
          guest_name: string | null
          guest_phone: string | null
          id: number
          is_online: boolean
          notes: string | null
          patient_id: number | null
          queue_status: string
          room_name: string | null
          status: string | null
          time: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          assigned_doctor?: string | null
          call_ended_at?: string | null
          call_started_at?: string | null
          call_status?: string | null
          created_at?: string | null
          date: string
          doctor_id?: number | null
          duration?: number | null
          guest_data?: Json | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: number
          is_online?: boolean
          notes?: string | null
          patient_id?: number | null
          queue_status?: string
          room_name?: string | null
          status?: string | null
          time: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_doctor?: string | null
          call_ended_at?: string | null
          call_started_at?: string | null
          call_status?: string | null
          created_at?: string | null
          date?: string
          doctor_id?: number | null
          duration?: number | null
          guest_data?: Json | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: number
          is_online?: boolean
          notes?: string | null
          patient_id?: number | null
          queue_status?: string
          room_name?: string | null
          status?: string | null
          time?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clinic_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: number
          is_reversed: boolean
          notes: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description: string
          id?: number
          is_reversed?: boolean
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: number
          is_reversed?: boolean
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clinic_messages: {
        Row: {
          body: string
          created_at: string
          expires_at: string
          from_id: string
          from_role: string
          id: number
          is_read: boolean
          to_id: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string
          from_id: string
          from_role: string
          id?: number
          is_read?: boolean
          to_id: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string
          from_id?: string
          from_role?: string
          id?: number
          is_read?: boolean
          to_id?: string
        }
        Relationships: []
      }
      clinic_packages: {
        Row: {
          billing_period: string | null
          button_label: string | null
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: number
          is_active: boolean
          is_featured: boolean
          payment_type: string
          payment_value: string | null
          price: number
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          button_label?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: number
          is_active?: boolean
          is_featured?: boolean
          payment_type?: string
          payment_value?: string | null
          price?: number
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string | null
          button_label?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: number
          is_active?: boolean
          is_featured?: boolean
          payment_type?: string
          payment_value?: string | null
          price?: number
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinic_profiles: {
        Row: {
          address: string | null
          appointment_duration: number | null
          clinic_name: string
          created_at: string | null
          doctor_name: string | null
          id: string
          phone: string | null
          time_format: string
          working_days: string[] | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          address?: string | null
          appointment_duration?: number | null
          clinic_name: string
          created_at?: string | null
          doctor_name?: string | null
          id: string
          phone?: string | null
          time_format?: string
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          address?: string | null
          appointment_duration?: number | null
          clinic_name?: string
          created_at?: string | null
          doctor_name?: string | null
          id?: string
          phone?: string | null
          time_format?: string
          working_days?: string[] | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
      }
      clinic_withdrawals: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: number
          is_reversed: boolean | null
          notes: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: number
          is_reversed?: boolean | null
          notes?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: number
          is_reversed?: boolean | null
          notes?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          account_type: string | null
          agent_id: number | null
          clinic_type: string
          country_code: string
          created_at: string | null
          doctors_count: number | null
          email: string
          expiry: string | null
          id: number
          max_doctors: number | null
          name: string
          owner: string | null
          payments_lock_enabled: boolean | null
          payments_lock_password: string | null
          phone: string | null
          plain_password: string | null
          plan: string | null
          restricted_access_enabled: boolean | null
          restricted_access_pin: string | null
          settings: Json
          status: string | null
          telemedicine_enabled: boolean
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          agent_id?: number | null
          clinic_type?: string
          country_code?: string
          created_at?: string | null
          doctors_count?: number | null
          email: string
          expiry?: string | null
          id?: number
          max_doctors?: number | null
          name: string
          owner?: string | null
          payments_lock_enabled?: boolean | null
          payments_lock_password?: string | null
          phone?: string | null
          plain_password?: string | null
          plan?: string | null
          restricted_access_enabled?: boolean | null
          restricted_access_pin?: string | null
          settings?: Json
          status?: string | null
          telemedicine_enabled?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          agent_id?: number | null
          clinic_type?: string
          country_code?: string
          created_at?: string | null
          doctors_count?: number | null
          email?: string
          expiry?: string | null
          id?: number
          max_doctors?: number | null
          name?: string
          owner?: string | null
          payments_lock_enabled?: boolean | null
          payments_lock_password?: string | null
          phone?: string | null
          plain_password?: string | null
          plan?: string | null
          restricted_access_enabled?: boolean | null
          restricted_access_pin?: string | null
          settings?: Json
          status?: string | null
          telemedicine_enabled?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          clinic_type: string
          doctor_comment: string | null
          fields: Json
          general_notes: string | null
          id: string
          log_date: string
          patient_id: number
          submitted_at: string | null
          token: string
        }
        Insert: {
          clinic_type: string
          doctor_comment?: string | null
          fields?: Json
          general_notes?: string | null
          id?: string
          log_date: string
          patient_id: number
          submitted_at?: string | null
          token: string
        }
        Update: {
          clinic_type?: string
          doctor_comment?: string | null
          fields?: Json
          general_notes?: string | null
          id?: string
          log_date?: string
          patient_id?: number
          submitted_at?: string | null
          token?: string
        }
        Relationships: []
      }
      doctor_schedules: {
        Row: {
          appointment_duration: number | null
          created_at: string | null
          days: Json | null
          doctor_id: number | null
          id: number
          max_daily_appointments: number | null
          notes: string | null
          updated_at: string | null
          user_id: string | null
          vacations: Json | null
        }
        Insert: {
          appointment_duration?: number | null
          created_at?: string | null
          days?: Json | null
          doctor_id?: number | null
          id?: number
          max_daily_appointments?: number | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          vacations?: Json | null
        }
        Update: {
          appointment_duration?: number | null
          created_at?: string | null
          days?: Json | null
          doctor_id?: number | null
          id?: number
          max_daily_appointments?: number | null
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
          vacations?: Json | null
        }
        Relationships: []
      }
      doctors: {
        Row: {
          color: string
          created_at: string
          email: string | null
          id: number
          is_active: boolean
          name: string
          phone: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name: string
          phone?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name?: string
          phone?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          expense_date: string | null
          id: number
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          expense_date?: string | null
          notes?: string | null
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          expense_date?: string | null
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_orders: {
        Row: {
          created_at: string | null
          id: number
          mrn: string | null
          notes: string | null
          paid: number | null
          patient_age: string | null
          patient_gender: string | null
          patient_name: string
          patient_phone: string | null
          price: number | null
          referring_doctor: string | null
          result_date: string | null
          results: Json | null
          sample_date: string | null
          share_token: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          mrn?: string | null
          notes?: string | null
          paid?: number | null
          patient_age?: string | null
          patient_gender?: string | null
          patient_name: string
          patient_phone?: string | null
          price?: number | null
          referring_doctor?: string | null
          result_date?: string | null
          results?: Json | null
          sample_date?: string | null
          share_token?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          mrn?: string | null
          notes?: string | null
          paid?: number | null
          patient_age?: string | null
          patient_gender?: string | null
          patient_name?: string
          patient_phone?: string | null
          price?: number | null
          referring_doctor?: string | null
          result_date?: string | null
          results?: Json | null
          sample_date?: string | null
          share_token?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_tests_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          is_hidden: boolean | null
          name_ar: string
          name_en: string | null
          price: number | null
          ref_high: number | null
          ref_low: number | null
          ref_text: string | null
          unit: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          is_hidden?: boolean | null
          name_ar: string
          name_en?: string | null
          price?: number | null
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          is_hidden?: boolean | null
          name_ar?: string
          name_en?: string | null
          price?: number | null
          ref_high?: number | null
          ref_low?: number | null
          ref_text?: string | null
          unit?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      master_patients: {
        Row: {
          created_at: string | null
          id: number
          mrn: string | null
          name: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          mrn?: string | null
          name: string
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: number
          mrn?: string | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          expires_at: string
          from_id: string
          from_role: string
          id: number
          is_read: boolean
          to_id: string
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string
          from_id: string
          from_role: string
          id?: number
          is_read?: boolean
          to_id: string
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string
          from_id?: string
          from_role?: string
          id?: number
          is_read?: boolean
          to_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: number
          read: boolean
          tag: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          read?: boolean
          tag?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          read?: boolean
          tag?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          allergies: string | null
          allergy_list: Json | null
          dental_chart: Json | null
          extended_notes: string | null
          extra_form_fields: Json | null
          family_history: string | null
          id: string
          medical_fields: Json | null
          medications: string | null
          patient_id: number
          surgeries: string | null
          updated_at: string | null
          user_id: string
          xrays: Json | null
        }
        Insert: {
          allergies?: string | null
          allergy_list?: Json | null
          dental_chart?: Json | null
          extended_notes?: string | null
          extra_form_fields?: Json | null
          family_history?: string | null
          id?: string
          medical_fields?: Json | null
          medications?: string | null
          patient_id: number
          surgeries?: string | null
          updated_at?: string | null
          user_id: string
          xrays?: Json | null
        }
        Update: {
          allergies?: string | null
          allergy_list?: Json | null
          dental_chart?: Json | null
          extended_notes?: string | null
          extra_form_fields?: Json | null
          family_history?: string | null
          id?: string
          medical_fields?: Json | null
          medications?: string | null
          patient_id?: number
          surgeries?: string | null
          updated_at?: string | null
          user_id?: string
          xrays?: Json | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          doctor_id: number | null
          gender: string | null
          has_diabetes: boolean | null
          has_hypertension: boolean | null
          id: number
          is_hidden: boolean | null
          mrn: string | null
          name: string
          notes: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          doctor_id?: number | null
          gender?: string | null
          has_diabetes?: boolean | null
          has_hypertension?: boolean | null
          id?: number
          is_hidden?: boolean | null
          mrn?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          doctor_id?: number | null
          gender?: string | null
          has_diabetes?: boolean | null
          has_hypertension?: boolean | null
          id?: number
          is_hidden?: boolean | null
          mrn?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string | null
          doctor_id: number | null
          doctor_share_percentage: number | null
          id: number
          is_prepayment: boolean | null
          method: string | null
          notes: string | null
          patient_id: number | null
          prepayment_sessions: number | null
          session_type: string | null
          session_type_other: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          description?: string | null
          doctor_id?: number | null
          doctor_share_percentage?: number | null
          id?: number
          is_prepayment?: boolean | null
          method?: string | null
          notes?: string | null
          patient_id?: number | null
          prepayment_sessions?: number | null
          session_type?: string | null
          session_type_other?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          doctor_id?: number | null
          doctor_share_percentage?: number | null
          id?: number
          is_prepayment?: boolean | null
          method?: string | null
          notes?: string | null
          patient_id?: number | null
          prepayment_sessions?: number | null
          session_type?: string | null
          session_type_other?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pharmacy_cash_closings: {
        Row: {
          card_sales: number
          cash_returns: number
          cash_sales: number
          closed_at: string
          closed_by: string | null
          counted_cash: number
          date: string
          difference: number
          expected_cash: number
          id: number
          insurance_sales: number
          notes: string | null
          user_id: string
        }
        Insert: {
          card_sales?: number
          cash_returns?: number
          cash_sales?: number
          closed_at?: string
          closed_by?: string | null
          counted_cash?: number
          date: string
          difference?: number
          expected_cash?: number
          insurance_sales?: number
          notes?: string | null
          user_id: string
        }
        Update: {
          card_sales?: number
          cash_returns?: number
          cash_sales?: number
          closed_at?: string
          closed_by?: string | null
          counted_cash?: number
          date?: string
          difference?: number
          expected_cash?: number
          insurance_sales?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_drug_interactions: {
        Row: {
          created_at: string | null
          description: string
          drug_a: string
          drug_b: string
          id: number
          is_seed: boolean
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          drug_a: string
          drug_b: string
          is_seed?: boolean
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          drug_a?: string
          drug_b?: string
          is_seed?: boolean
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pharmacy_medicine_batches: {
        Row: {
          batch_no: string | null
          created_at: string
          expiry_date: string | null
          id: number
          invoice_id: number | null
          medicine_id: number
          qty: number
          received_date: string
          unit_cost: number
          user_id: string
        }
        Insert: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          invoice_id?: number | null
          medicine_id: number
          qty: number
          received_date?: string
          unit_cost?: number
          user_id: string
        }
        Update: {
          batch_no?: string | null
          created_at?: string
          expiry_date?: string | null
          invoice_id?: number | null
          medicine_id?: number
          qty?: number
          received_date?: string
          unit_cost?: number
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_medicines: {
        Row: {
          avg_cost: number
          barcode: string
          category: string
          created_at: string | null
          expiry_date: string | null
          id: number
          manufacturer: string | null
          min_stock: number
          name_ar: string
          name_en: string
          purchase_price: number
          sell_price: number
          stock: number
          unit: string
          user_id: string
        }
        Insert: {
          avg_cost?: number
          barcode?: string
          category?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: number
          manufacturer?: string | null
          min_stock?: number
          name_ar: string
          name_en?: string
          purchase_price?: number
          sell_price?: number
          stock?: number
          unit?: string
          user_id: string
        }
        Update: {
          avg_cost?: number
          barcode?: string
          category?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: number
          manufacturer?: string | null
          min_stock?: number
          name_ar?: string
          name_en?: string
          purchase_price?: number
          sell_price?: number
          stock?: number
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_period_locks: {
        Row: {
          closed_at: string
          closed_by: string | null
          locked_until: string
          user_id: string
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          locked_until?: string
          user_id: string
        }
        Update: {
          closed_at?: string
          closed_by?: string | null
          locked_until?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_prescription_items: {
        Row: {
          dispensed_qty: number
          dosage: string
          duration: string
          id: number
          instructions: string
          medicine_id: number | null
          medicine_name: string
          prescription_id: string
          qty: number
        }
        Insert: {
          dispensed_qty?: number
          dosage?: string
          duration?: string
          id?: number
          instructions?: string
          medicine_id?: number | null
          medicine_name: string
          prescription_id: string
          qty?: number
        }
        Update: {
          dispensed_qty?: number
          dosage?: string
          duration?: string
          id?: number
          instructions?: string
          medicine_id?: number | null
          medicine_name?: string
          prescription_id?: string
          qty?: number
        }
        Relationships: []
      }
      pharmacy_prescriptions: {
        Row: {
          created_at: string | null
          dispensed: boolean
          dispensed_at: string | null
          dispensed_by: string | null
          doctor_id: number
          doctor_name: string
          id: string
          mrn: string
          notes: string | null
          patient_id: number | null
          patient_name: string
          priority: string
          source: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dispensed?: boolean
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id?: number
          doctor_name: string
          id: string
          mrn?: string
          notes?: string | null
          patient_id?: number | null
          patient_name: string
          priority?: string
          source?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dispensed?: boolean
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id?: number
          doctor_name?: string
          id?: string
          mrn?: string
          notes?: string | null
          patient_id?: number | null
          patient_name?: string
          priority?: string
          source?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_purchase_invoice_items: {
        Row: {
          batch_no: string | null
          expiry_date: string | null
          id: number
          invoice_id: number
          medicine_id: number
          medicine_name: string
          qty: number
          unit_price: number
        }
        Insert: {
          batch_no?: string | null
          expiry_date?: string | null
          id?: number
          invoice_id: number
          medicine_id: number
          medicine_name: string
          qty?: number
          unit_price?: number
        }
        Update: {
          batch_no?: string | null
          expiry_date?: string | null
          id?: number
          invoice_id?: number
          medicine_id?: number
          medicine_name?: string
          qty?: number
          unit_price?: number
        }
        Relationships: []
      }
      pharmacy_purchase_invoices: {
        Row: {
          created_at: string | null
          created_by: string
          date: string
          id: number
          notes: string | null
          paid: number
          status: string
          supplier_id: number
          supplier_name: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string
          date?: string
          id?: number
          notes?: string | null
          paid?: number
          status?: string
          supplier_id: number
          supplier_name: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date?: string
          id?: number
          notes?: string | null
          paid?: number
          status?: string
          supplier_id?: number
          supplier_name?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_return_items: {
        Row: {
          id: number
          medicine_id: number
          medicine_name: string
          qty: number
          return_id: number
          sale_item_id: number
          unit_price: number
        }
        Insert: {
          medicine_id: number
          medicine_name: string
          qty: number
          return_id: number
          sale_item_id: number
          unit_price: number
        }
        Update: {
          medicine_id?: number
          medicine_name?: string
          qty?: number
          return_id?: number
          sale_item_id?: number
          unit_price?: number
        }
        Relationships: []
      }
      pharmacy_returns: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: number
          reason: string | null
          sale_id: number
          total_refund: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          reason?: string | null
          sale_id: number
          total_refund?: number
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          reason?: string | null
          sale_id?: number
          total_refund?: number
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_sale_item_batches: {
        Row: {
          batch_id: number | null
          id: number
          qty: number
          sale_item_id: number
          unit_cost: number
        }
        Insert: {
          batch_id?: number | null
          qty: number
          sale_item_id: number
          unit_cost?: number
        }
        Update: {
          batch_id?: number | null
          qty?: number
          sale_item_id?: number
          unit_cost?: number
        }
        Relationships: []
      }
      pharmacy_sale_items: {
        Row: {
          id: number
          item_discount: number
          medicine_id: number
          medicine_name: string
          qty: number
          returned_qty: number
          sale_id: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          id?: number
          item_discount?: number
          medicine_id: number
          medicine_name: string
          qty?: number
          returned_qty?: number
          sale_id: number
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          id?: number
          item_discount?: number
          medicine_id?: number
          medicine_name?: string
          qty?: number
          returned_qty?: number
          sale_id?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: []
      }
      pharmacy_sales: {
        Row: {
          cashier: string
          coupon_code: string | null
          coupon_discount: number
          created_at: string | null
          date: string
          discount: number
          id: number
          paid_card: number
          paid_cash: number
          paid_insurance: number
          patient_name: string | null
          payment_method: string
          prescription_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          cashier?: string
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string | null
          date?: string
          discount?: number
          id?: number
          paid_card?: number
          paid_cash?: number
          paid_insurance?: number
          patient_name?: string | null
          payment_method?: string
          prescription_id?: string | null
          total?: number
          user_id: string
        }
        Update: {
          cashier?: string
          coupon_code?: string | null
          coupon_discount?: number
          created_at?: string | null
          date?: string
          discount?: number
          id?: number
          paid_card?: number
          paid_cash?: number
          paid_insurance?: number
          patient_name?: string | null
          payment_method?: string
          prescription_id?: string | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_stock_logs: {
        Row: {
          created_at: string | null
          date: string
          id: number
          medicine_id: number
          medicine_name: string
          notes: string | null
          qty: number
          ref: string | null
          type: string
          user: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: number
          medicine_id: number
          medicine_name: string
          notes?: string | null
          qty?: number
          ref?: string | null
          type: string
          user?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: number
          medicine_id?: number
          medicine_name?: string
          notes?: string | null
          qty?: number
          ref?: string | null
          type?: string
          user?: string
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          date: string
          id: number
          invoice_id: number | null
          method: string | null
          notes: string | null
          supplier_id: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          date?: string
          invoice_id?: number | null
          method?: string | null
          notes?: string | null
          supplier_id: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          date?: string
          invoice_id?: number | null
          method?: string | null
          notes?: string | null
          supplier_id?: number
          user_id?: string
        }
        Relationships: []
      }
      pharmacy_suppliers: {
        Row: {
          address: string
          balance: number
          contact: string
          created_at: string | null
          email: string
          id: number
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          address?: string
          balance?: number
          contact?: string
          created_at?: string | null
          email?: string
          id?: number
          name: string
          phone?: string
          user_id: string
        }
        Update: {
          address?: string
          balance?: number
          contact?: string
          created_at?: string | null
          email?: string
          id?: number
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          clinic_name: string | null
          created_at: string
          date: string
          diagnosis: string | null
          doctor_id: number | null
          doctor_name: string | null
          id: number
          medications: Json
          notes: string | null
          patient_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          doctor_id?: number | null
          doctor_name?: string | null
          id?: number
          medications?: Json
          notes?: string | null
          patient_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          date?: string
          diagnosis?: string | null
          doctor_id?: number | null
          doctor_name?: string | null
          id?: number
          medications?: Json
          notes?: string | null
          patient_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          clinic_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          clinic_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: number
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: number
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: number
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          from_clinic_name: string | null
          from_user_id: string
          id: number
          patient_id: number | null
          patient_snapshot: Json
          reason: string | null
          responded_at: string | null
          status: string
          to_clinic_name: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_clinic_name?: string | null
          from_user_id: string
          patient_id?: number | null
          patient_snapshot: Json
          reason?: string | null
          responded_at?: string | null
          status?: string
          to_clinic_name?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_clinic_name?: string | null
          from_user_id?: string
          patient_id?: number | null
          patient_snapshot?: Json
          reason?: string | null
          responded_at?: string | null
          status?: string
          to_clinic_name?: string | null
          to_user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          clinic_name: string | null
          created_at: string
          doctor_name: string | null
          id: number
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: number
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          features_ar: string[] | null
          features_en: string[] | null
          key: string
          name_ar: string
          name_en: string
          price_half_year: number
          price_monthly: number
          price_yearly: number
          sort_order: number | null
        }
        Insert: {
          features_ar?: string[] | null
          features_en?: string[] | null
          key: string
          name_ar: string
          name_en: string
          price_half_year: number
          price_monthly: number
          price_yearly: number
          sort_order?: number | null
        }
        Update: {
          features_ar?: string[] | null
          features_en?: string[] | null
          key?: string
          name_ar?: string
          name_en?: string
          price_half_year?: number
          price_monthly?: number
          price_yearly?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      tracking_links: {
        Row: {
          active: boolean
          clinic_name: string
          clinic_type: string
          created_at: string | null
          custom_questions: Json | null
          doctor_name: string
          expires_at: string | null
          id: string
          notes_for_patient: string | null
          patient_id: number
          patient_name: string
          token: string
          user_id: string
        }
        Insert: {
          active?: boolean
          clinic_name?: string
          clinic_type: string
          created_at?: string | null
          custom_questions?: Json | null
          doctor_name?: string
          expires_at?: string | null
          id?: string
          notes_for_patient?: string | null
          patient_id: number
          patient_name: string
          token: string
          user_id: string
        }
        Update: {
          active?: boolean
          clinic_name?: string
          clinic_type?: string
          created_at?: string | null
          custom_questions?: Json | null
          doctor_name?: string
          expires_at?: string | null
          id?: string
          notes_for_patient?: string | null
          patient_id?: number
          patient_name?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_financial_summary: {
        Row: {
          net_balance: number | null
          total_expenses: number | null
          total_revenue: number | null
          total_withdrawals: number | null
          user_id: string | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_medicine_batch: {
        Args: {
          p_batch_no?: string
          p_expiry_date?: string
          p_invoice_id?: number
          p_medicine_id: number
          p_qty: number
          p_unit_cost: number
          p_user_id: string
        }
        Returns: number
      }
      adjust_medicine_stock: {
        Args: {
          p_delta: number
          p_id: number
          p_unit_cost?: number
          p_user_id: string
        }
        Returns: {
          medicine_name: string
          new_avg_cost: number
          new_stock: number
        }[]
      }
      cleanup_old_xrays: { Args: Record<string, never>; Returns: undefined }
      delete_expired_clinic_messages: { Args: Record<string, never>; Returns: undefined }
      delete_expired_messages: { Args: Record<string, never>; Returns: undefined }
      dispense_fefo: {
        Args: {
          p_medicine_id: number
          p_qty: number
          p_sale_item_id?: number
          p_user_id: string
        }
        Returns: {
          avg_unit_cost?: number
          batch_id?: number
          qty_taken?: number
          total_cost?: number
          unit_cost?: number
        }[]
      }
      return_to_batch: {
        Args: {
          p_batch_id: number
          p_medicine_id: number
          p_qty: number
          p_unit_cost: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never
