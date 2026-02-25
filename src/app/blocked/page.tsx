"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Blocked / Subscription Inactive Page
// ============================================================

const REASONS = {
  frozen: {
    ar: {
      icon: "⏸",
      title: "الاشتراك موقوف مؤقتاً",
      desc: "تم إيقاف اشتراكك مؤقتاً من قبل الإدارة. للاستفسار أو إعادة التفعيل يرجى التواصل مع الدعم.",
      color: "#e67e22",
      bg: "rgba(230,126,34,.06)",
      border: "rgba(230,126,34,.2)",
    },
    en: {
      icon: "⏸",
      title: "Subscription Temporarily Suspended",
      desc: "Your subscription has been temporarily suspended by the administration. Please contact support to inquire or reactivate.",
      color: "#e67e22",
      bg: "rgba(230,126,34,.06)",
      border: "rgba(230,126,34,.2)",
    },
  },
  cancelled: {
    ar: {
      icon: "🚫",
      title: "تم إلغاء الاشتراك",
      desc: "انتهت صلاحية اشتراكك. للتجديد أو الاستفسار يرجى التواصل مع فريق المبيعات.",
      color: "#c0392b",
      bg: "rgba(192,57,43,.06)",
      border: "rgba(192,57,43,.2)",
    },
    en: {
      icon: "🚫",
      title: "Subscription Cancelled",
      desc: "Your subscription has been cancelled. Please contact our sales team to renew or for more information.",
      color: "#c0392b",
      bg: "rgba(192,57,43,.06)",
      border: "rgba(192,57,43,.2)",
    },
  },
  expired: {
    ar: {
      icon: "⏰",
      title: "انتهت صلاحية الاشتراك",
      desc: "لقد انتهت مدة اشتراكك. جدّد اشتراكك الآن للاستمرار في استخدام نبض.",
      color: "#7b2d8b",
      bg: "rgba(123,45,139,.06)",
      border: "rgba(123,45,139,.2)",
    },
    en: {
      icon: "⏰",
      title: "Subscription Expired",
      desc: "Your subscription period has ended. Renew your subscription now to continue using NABD.",
      color: "#7b2d8b",
      bg: "rgba(123,45,139,.06)",
      border: "rgba(123,45,139,.2)",
    },
  },
};

function BlockedContent() {
  const searchParams = useSearchParams();
  const reason = (searchParams.get("reason") || "expired") as keyof typeof REASONS;
  const lang   = "ar"; // يمكن جعلها ديناميكية لاحقاً

  const info = REASONS[reason]?.[lang] ?? REASONS.expired[lang];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .card { animation: fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f7f9fc 0%, #eef4fb 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Rubik', sans-serif", direction: "rtl", padding: 20,
      }}>
        {/* خلفية زخرفية */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: `${info.color}08`, filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "rgba(8,99,186,.04)", filter: "blur(100px)" }} />
        </div>

        <div className="card" style={{
          background: "#fff", borderRadius: 28, maxWidth: 480, width: "100%",
          padding: "48px 40px", textAlign: "center",
          boxShadow: "0 24px 80px rgba(8,99,186,.1)",
          border: "1.5px solid #eef0f3", position: "relative",
        }}>

          {/* Logo */}
          <div style={{ marginBottom: 32 }}>
            <svg viewBox="0 0 337.74 393.31" style={{ width: 48, height: 48 }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="bl-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
                  <stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/>
                </linearGradient>
                <linearGradient id="bl-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/>
                </linearGradient>
              </defs>
              <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
              <path fill="url(#bl-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
              <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
              <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
              <path fill="url(#bl-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0863ba", marginTop: 6, letterSpacing: .5 }}>نبض</div>
          </div>

          {/* أيقونة الحالة */}
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: info.bg, border: `2px solid ${info.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, margin: "0 auto 24px",
          }}>
            {info.icon}
          </div>

          {/* النص */}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#353535", marginBottom: 12 }}>
            {info.title}
          </h1>
          <p style={{ fontSize: 14, color: "#888", lineHeight: 1.8, marginBottom: 32, maxWidth: 340, margin: "0 auto 32px" }}>
            {info.desc}
          </p>

          {/* معلومات التواصل */}
          <div style={{
            background: "rgba(8,99,186,.04)", border: "1.5px solid rgba(8,99,186,.1)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 28,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0863ba", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
              📞 تواصل مع الدعم
            </div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.8 }}>
              <div>البريد: <span style={{ color: "#0863ba", fontWeight: 600 }}>support@nabd.clinic</span></div>
              <div>الواتساب: <span style={{ color: "#0863ba", fontWeight: 600 }}>+966 5X XXX XXXX</span></div>
            </div>
          </div>

          {/* زر تسجيل الخروج */}
          <button
            onClick={handleSignOut}
            style={{
              width: "100%", padding: "13px", background: "#f7f9fc",
              color: "#666", border: "1.5px solid #eef0f3", borderRadius: 12,
              fontFamily: "Rubik, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer", transition: "all .2s",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#c0392b"; (e.target as HTMLButtonElement).style.color = "#c0392b"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#eef0f3"; (e.target as HTMLButtonElement).style.color = "#666"; }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f9fc" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #eef0f3", borderTopColor: "#0863ba", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <BlockedContent />
    </Suspense>
  );
}
