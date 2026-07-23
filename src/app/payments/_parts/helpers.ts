// ============================================================
// src/app/payments/_parts/helpers.ts
// مساعدات عرض وصلاحيات — دوال خالصة.
// ============================================================

export type PlanType =
  | "basic" | "pro" | "enterprise"
  | "shared_basic" | "shared_pro" | "shared_enterprise";

/** الخطط المشتركة للعيادات (أكثر من طبيب). */
export const SHARED_CLINIC_PLANS: PlanType[] = ["shared_basic", "shared_pro", "shared_enterprise"];
export const isSharedClinicPlan = (plan: PlanType) => SHARED_CLINIC_PLANS.includes(plan);

export const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

export const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

export const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22"];
export const getColor    = (id: number) => AVT_COLORS[(id - 1) % AVT_COLORS.length];
export const getInitials = (name: string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
export const fmt         = (d: Date) => d.toISOString().split("T")[0];
