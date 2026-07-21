// ============================================================
// src/lib/supabase.ts
// ============================================================

import { createBrowserClient } from "@supabase/ssr";
import { isDemoActive, createDemoClient } from "./demo";
import { wrapWithOffline } from "./offline";

const supabaseUrl     = "https://ldqaohjnlxiwvaijcsbm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";

// في وضع التجربة (Demo) نستخدم عميلاً وهمياً يعمل في الذاكرة فقط —
// لا يمس قاعدة البيانات ولا جلسات العملاء الحقيقيين إطلاقاً
// wrapWithOffline: يعيد العميل الأصلي نفسه ما لم يفعّل المستخدم
// ميزة العمل دون اتصال بنفسه (معطّلة افتراضياً — صفر تأثير)
export const supabase = (
  isDemoActive()
    ? (createDemoClient() as ReturnType<typeof createBrowserClient>)
    : wrapWithOffline(createBrowserClient(supabaseUrl, supabaseAnonKey))
);

// ============================================================
// TypeScript Types
// ============================================================

export type Patient = {
  id: number;
  user_id: string;
  name: string;
  phone?: string;
  gender?: "male" | "female";
  date_of_birth?: string;
  has_diabetes: boolean;
  has_hypertension: boolean;
  notes?: string;
  is_hidden: boolean;
  created_at: string;
};

export type Appointment = {
  id: number;
  user_id: string;
  patient_id: number;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  duration: number;    // بالدقائق
  type?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  created_at: string;
};

export type Payment = {
  id: number;
  user_id: string;
  patient_id?: number;
  amount: number;
  description: string;
  method: "cash" | "card" | "transfer";
  status: "paid" | "pending" | "cancelled";
  date: string;
  notes?: string;
  created_at: string;
};
