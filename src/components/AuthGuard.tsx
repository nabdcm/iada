"use client";

// ============================================================
// AuthGuard — حماية الصفحات على مستوى الـ client
// يضمن استمرار الجلسة حتى في PWA على الموبايل
// ============================================================

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

async function issueSessionCookie(accessToken?: string) {
  if (!accessToken) return;
  try {
    await fetch("/api/session-cookie", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  } catch { /* non-blocking */ }
}


interface Props {
  children: ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ children, redirectTo = "/login" }: Props) {
  const [status, setStatus] = useState<"loading" | "ok" | "redirect" | "suspended">("loading");

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
        // إصدار cookie موقّع httpOnly عبر الخادم حتى يعمل الـ middleware
        await issueSessionCookie(session.access_token);

        // ── فحص حالة الاشتراك (تجميد/تعليق) — بدون تسجيل خروج ──
        try {
           
          const { data: row } = await supabase
            .from("clinics")
            .select("status")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (!cancelled && row?.status === "inactive") {
            setStatus("suspended");
            return;
          }
        } catch { /* في حال فشل الفحص لا نمنع الدخول */ }

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

  if (status === "suspended") {
    const isAr = typeof window !== "undefined" ? (localStorage.getItem("lang") || "ar") !== "en" : true;
    return (
      <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8fafc",fontFamily:"'Rubik',sans-serif",padding:20 }}>
        <div style={{ textAlign:"center",maxWidth:420,background:"#fff",borderRadius:20,padding:"40px 30px",boxShadow:"0 10px 40px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize:48,marginBottom:16 }}>⏸️</div>
          <h2 style={{ fontSize:20,fontWeight:800,color:"#353535",margin:"0 0 10px" }}>{isAr?"الاشتراك معلّق مؤقتاً":"Subscription Temporarily Suspended"}</h2>
          <p style={{ fontSize:14,color:"#888",lineHeight:1.8,margin:"0 0 20px" }}>{isAr?"تم تعليق اشتراكك مؤقتاً مع الحفاظ على جميع بياناتك. يرجى التواصل مع الدعم لإعادة التفعيل.":"Your subscription has been temporarily suspended. All your data is safe. Please contact support to reactivate."}</p>
          <a href="https://wa.me/963998285483" target="_blank" rel="noopener noreferrer" style={{ display:"inline-block",padding:"12px 28px",background:"#25D366",color:"#fff",borderRadius:12,fontSize:14,fontWeight:700,textDecoration:"none" }}>{isAr?"تواصل عبر واتساب":"Contact via WhatsApp"}</a>
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
