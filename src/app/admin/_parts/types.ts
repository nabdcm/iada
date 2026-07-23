// ============================================================
// src/app/admin/_parts/types.ts
// أنواع لوحة المدير — مستخرَجة من page.tsx
// ============================================================

import type { ClinicType } from "@/lib/clinic-types";

export type Lang = "ar" | "en";

// الخطط الفردية: basic, pro, enterprise
// الخطط المشتركة: shared_basic, shared_pro, shared_enterprise
export type PlanType =
  | "basic" | "pro" | "enterprise"
  | "shared_basic" | "shared_pro" | "shared_enterprise"
  | "pharmacy" | "lab";

export type AccountType = "clinic" | "pharmacy" | "lab";

export interface ClinicData {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: PlanType;
  expiry: string;
  status: "active" | "inactive" | "expired";
  user_id?: string;
  account_type?: AccountType;
  clinic_type?: ClinicType;
  plain_password?: string | null;   // كلمة السر النصية (تُملأ عند الإنشاء/إعادة التعيين)
  // للخطط المشتركة فقط
  max_doctors?: number;       // الحد الأقصى من الأطباء (قابل للتعديل من الأدمن)
  doctors_count?: number;     // عدد الأطباء الفعلي المضاف
  // قفل صفحة المدفوعات بكلمة سر
  payments_lock_enabled?: boolean;
  payments_lock_password?: string;
  // دخول مقيّد للأطباء (الخطط المشتركة فقط)
  restricted_access_enabled?: boolean;
  restricted_access_pin?: string;
  country_code?: string;   // رمز بلد العيادة الدولي (لأرقام واتساب)
  telemedicine_enabled?: boolean;  // ميزة العيادة الأونلاين (تفعيل مدفوع)
}

export interface Doctor {
  id?: number;
  user_id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
}

export type { ClinicType };
