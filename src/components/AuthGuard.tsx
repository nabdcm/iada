"use client";

// ============================================================
// AuthGuard — حماية الصفحات على مستوى الـ client
// يضمن استمرار الجلسة حتى في PWA على الموبايل
// ============================================================

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  children: ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = "/login" }: Props) {
  const [status, setStatus] = useState<"loading" | "ok" | "redirect">("loading");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // getSession يقرأ من التخزين المحلي أولاً ويجدد تلقائياً إن انتهى
      // إعادة المحاولة حتى 3 مرات — فشل الشبكة المؤقت عند فتح التطبيق
      // يجب ألا يؤدي لتسجيل الخروج
      let session = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (session || cancelled) break;
        await new Promise(r => setTimeout(r, 700));
      }

      if (cancelled) return;

      if (session) {
        // ── فرض نوع الحساب حسب المسار ──────────────────────
        // حساب الصيدلية لا يدخل صفحات العيادة، والعكس تتكفل به صفحة الصيدلية
        const isPharmacyPath = window.location.pathname.startsWith("/pharmacy");
        const accountType = session.user?.user_metadata?.account_type;
        if (!isPharmacyPath && accountType === "pharmacy") {
          window.location.href = "/pharmacy";
          return;
        }
        // كتابة cookie بسيط حتى يعمل الـ middleware
        const maxAge = 400 * 24 * 60 * 60;
        document.cookie = `nabd-session=1; path=/; max-age=${maxAge}; SameSite=Lax`;
        setStatus("ok");
      } else {
        setStatus("redirect");
      }
    }

    check();

    // الاستماع لتغييرات الجلسة — التوجيه للدخول فقط عند خروج صريح
    // (SIGNED_OUT) وليس عند أي غياب مؤقت للجلسة (فشل تجديد لحظي إلخ)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        document.cookie = "nabd-session=; path=/; max-age=0; SameSite=Lax";
        setStatus("redirect");
      } else if (session) {
        const maxAge = 400 * 24 * 60 * 60;
        document.cookie = `nabd-session=1; path=/; max-age=${maxAge}; SameSite=Lax`;
        setStatus("ok");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'Rubik', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "3px solid #e2e8f0",
            borderTopColor: "#0f766e",
            borderRadius: "50%",
            animation: "spin .7s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (status === "redirect") {
    if (typeof window !== "undefined") {
      const current = window.location.pathname;
      window.location.href = `${redirectTo}?redirect=${encodeURIComponent(current)}`;
    }
    return null;
  }

  return <>{children}</>;
}
