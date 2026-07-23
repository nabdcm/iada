// ============================================================
// src/lib/supabase.ts
// ============================================================

import { createBrowserClient } from "@supabase/ssr";
import { isDemoActive, createDemoClient } from "./demo";
import { wrapWithOffline } from "./offline";
import type { Database } from "./database.types";

export type { Database };
import type { Tables } from "./database.types";
export type { Tables, TablesInsert, TablesUpdate } from "./database.types";

const supabaseUrl     = "https://ldqaohjnlxiwvaijcsbm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";

// في وضع التجربة (Demo) نستخدم عميلاً وهمياً يعمل في الذاكرة فقط —
// لا يمس قاعدة البيانات ولا جلسات العملاء الحقيقيين إطلاقاً
// wrapWithOffline: يعيد العميل الأصلي نفسه ما لم يفعّل المستخدم
// ميزة العمل دون اتصال بنفسه (معطّلة افتراضياً — صفر تأثير)
export const supabase = (
  isDemoActive()
    ? (createDemoClient() as ReturnType<typeof createBrowserClient<Database>>)
    : wrapWithOffline(createBrowserClient<Database>(supabaseUrl, supabaseAnonKey))
);

// ============================================================
// TypeScript Types
// ============================================================

// الأنواع أدناه مشتقة من مخطط قاعدة البيانات الفعلي (database.types.ts)
// حتى لا تتباعد عن الجداول مع مرور الوقت.
export type Patient     = Tables<"patients">;
export type Appointment = Tables<"appointments">;
export type Payment     = Tables<"payments">;
