// ============================================================
// src/lib/supabase.ts
// ملف الاتصال بقاعدة البيانات Supabase
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// أنواع البيانات (TypeScript Types)
// ============================================================

export type Patient = {
  id: number
  user_id: string
  name: string
  phone?: string
  gender?: 'male' | 'female'
  date_of_birth?: string
  has_diabetes: boolean
  has_hypertension: boolean
  notes?: string
  is_hidden: boolean
  created_at: string
}

export type Appointment = {
  id: number
  user_id: string
  patient_id: number
  date: string
  time: string
  duration: number
  type?: string
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  created_at: string
}

export type Payment = {
  id: number
  user_id: string
  patient_id?: number
  amount: number
  description: string
  method: 'cash' | 'card' | 'transfer'
  status: 'paid' | 'pending' | 'cancelled'
  date: string
  notes?: string
  created_at: string
}
