// ============================================================
// src/lib/auth.ts — دوال مساعدة لـ Supabase Auth
// ============================================================

import { supabase } from "./supabase";

/** تسجيل الخروج وإعادة التوجيه لصفحة الدخول */
export async function signOut() {
  await supabase.auth.signOut();
  // مسح الـ cookie الموقّع من الخادم
  try { await fetch("/api/session-cookie", { method: "DELETE" }); } catch { /* ignore */ }
  window.location.href = "/login";
}

/** جلب المستخدم الحالي */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** الاشتراك في تغييرات حالة الجلسة */
export function onAuthChange(callback: (isLoggedIn: boolean) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(!!session);
  });
}
