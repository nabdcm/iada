// ============================================================
// src/app/admin/_parts/admin-fetch.ts
// مساعد نداءات API الخاصة بالمدير.
// الـ secret يُرسَل عبر httpOnly cookie لا عبر NEXT_PUBLIC.
// ============================================================

import { SESSION_KEY } from "./session";

export const adminFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // يُرسل الـ httpOnly cookie تلقائياً
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    // الجلسة انتهت — أعد تحميل الصفحة لإظهار شاشة تسجيل الدخول
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }
  return res;
};
