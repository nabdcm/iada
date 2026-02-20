// ============================================================
// src/lib/supabase.ts
// ملف الاتصال بقاعدة البيانات Supabase
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.https://ldqaohjnlxiwvaijcsbm.supabase.co!
const supabaseAnonKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo!

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
