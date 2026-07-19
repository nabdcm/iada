"use client";

import AppIcon from "@/components/AppIcon";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD — نبض | Portal Page v2
// Dark theme · Switch selector · Inline login · ? info modal
// ============================================================

type Lang = "ar" | "en";
type Portal = "clinic" | "pharmacy" | "lab" | "patient";

const T = {
  ar: {
    tagline: "نبض عيادتك في يدك",
    desc: "منصة متكاملة لإدارة العيادات والصيدليات",
    switchLabel: "اختر نوع الدخول",
    portals: {
      clinic:   { icon: "🏥", label: "عيادة",   sub: "للأطباء وإدارة العيادات" },
      pharmacy: { icon: "💊", label: "صيدلية",  sub: "لإدارة الصيدليات" },
      lab:      { icon: "🧪", label: "مخبر",    sub: "لإدارة المخابر الطبية", badge: "جديد" },
      patient:  { icon: "👤", label: "مريض",    sub: "للمرضى ومتابعة الحالة" },
    },
    login: {
      email:       "البريد الإلكتروني",
      emailPh:     "أدخل بريدك الإلكتروني",
      pass:        "كلمة المرور",
      passPh:      "أدخل كلمة المرور",
      phone:       "رقم الهاتف",
      phonePh:     "05xxxxxxxx",
      mrn:         "رقم السجل الطبي (MRN)",
      mrnPh:       "مثال: NABD-00001",
      mrnHelp:     "رقم السجل يُعطى لك من الطبيب عند تسجيلك",
      btn:         "تسجيل الدخول",
      loading:     "جارٍ الدخول...",
      errors: {
        invalid:  "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        network:  "تعذّر الاتصال. تحقق من الإنترنت وحاول مجدداً.",
        notFound: "لا يوجد حساب بهذا البريد الإلكتروني.",
        unknown:  "حدث خطأ غير متوقع. حاول مجدداً.",
        patient:  "رقم الهاتف أو رقم السجل الطبي غير صحيح.",
      },
    },
    about: {
      title: "ما هو نبض؟",
      desc: "نبض هو نظام متكامل لإدارة العيادات الطبية والصيدليات. يتيح للأطباء إدارة مرضاهم ومواعيدهم ومدفوعاتهم بكل سهولة، ويمنح المرضى رابطاً خاصاً لمتابعة حالتهم الصحية وحجز مواعيدهم مباشرة.",
      features: [
        { icon: "👥", text: "إدارة كاملة لملفات المرضى" },
        { icon: "📅", text: "جدولة المواعيد بذكاء" },
        { icon: "💳", text: "تتبع المدفوعات والفواتير" },
        { icon: "💬", text: "تذكير عبر واتساب" },
        { icon: "🔒", text: "بيانات آمنة ومشفّرة" },
        { icon: "📊", text: "إحصائيات وتحليلات شاملة" },
      ],
      close: "إغلاق",
    },
    privacy:   "سياسة الخصوصية",
    contact:   "تواصل معنا",
    copyright: "© 2026 نبض — جميع الحقوق محفوظة",
  },
  en: {
    tagline: "Your Clinic's Pulse in Your Hands",
    desc: "An integrated platform for clinics and pharmacies",
    switchLabel: "Choose access type",
    portals: {
      clinic:   { icon: "🏥", label: "Clinic",   sub: "For doctors & clinic management" },
      pharmacy: { icon: "💊", label: "Pharmacy", sub: "For pharmacy management" },
      lab:      { icon: "🧪", label: "Lab",      sub: "For medical labs", badge: "New" },
      patient:  { icon: "👤", label: "Patient",  sub: "For patients & health tracking" },
    },
    login: {
      email:    "Email Address",
      emailPh:  "Enter your email",
      pass:     "Password",
      passPh:   "Enter your password",
      phone:    "Phone Number",
      phonePh:  "05xxxxxxxx",
      mrn:      "Medical Record Number (MRN)",
      mrnPh:    "e.g. NABD-00001",
      mrnHelp:  "Your MRN is provided by your doctor upon registration",
      btn:      "Sign In",
      loading:  "Signing in...",
      errors: {
        invalid:  "Incorrect email or password.",
        network:  "Connection failed. Check your internet and try again.",
        notFound: "No account found with this email.",
        unknown:  "An unexpected error occurred. Please try again.",
        patient:  "Phone number or MRN is incorrect.",
      },
    },
    about: {
      title: "What is NABD?",
      desc: "NABD is an integrated system for managing medical clinics and pharmacies. It enables doctors to manage their patients, appointments, and payments with ease, and gives patients a personal link to track their health and book appointments directly.",
      features: [
        { icon: "👥", text: "Complete patient record management" },
        { icon: "📅", text: "Smart appointment scheduling" },
        { icon: "💳", text: "Payment and billing tracking" },
        { icon: "💬", text: "WhatsApp reminders" },
        { icon: "🔒", text: "Secure and encrypted data" },
        { icon: "📊", text: "Comprehensive analytics" },
      ],
      close: "Close",
    },
    privacy:   "Privacy Policy",
    contact:   "Contact Us",
    copyright: "© 2026 NABD — All rights reserved",
  },
} as const;

// ─── Portal accent colours ────────────────────────────────────
const PORTAL_ACCENT: Record<Portal, { color: string; glow: string }> = {
  clinic:   { color: "#1a8fe3", glow: "rgba(26,143,227,0.22)" },
  pharmacy: { color: "#2fc98f", glow: "rgba(47,201,143,0.18)" },
  lab:      { color: "#f5a623", glow: "rgba(245,166,35,0.18)" },
  patient:  { color: "#5aa7f0", glow: "rgba(90,167,240,0.20)" },
};

// ─── Shared login translation type ───────────────────────────
type LoginTranslation = typeof T["ar"]["login"] | typeof T["en"]["login"];

// ─── Patient login (phone + MRN) ──────────────────────────────
function PatientLoginForm({ lang, tr }: { lang: Lang; tr: LoginTranslation }) {
  const isAr = lang === "ar";
  const [phone, setPhone]     = useState("");
  const [mrn, setMrn]         = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/patient-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), mrn: mrn.trim().toUpperCase() }),
      });
      if (!res.ok) {
        setError(tr.errors.patient);
        setLoading(false);
        return;
      }
      window.location.href = "/patient-portal";
    } catch {
      setError(tr.errors.network);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form" dir={isAr ? "rtl" : "ltr"}>
      {error && <div className="err-box"><span><AppIcon glyph="⚠️" /></span> {error}</div>}
      <div className="field">
        <label className="field-lbl">{tr.phone}</label>
        <input type="tel" className="field-inp" placeholder={tr.phonePh}
          value={phone} onChange={e => setPhone(e.target.value)} required />
      </div>
      <div className="field">
        <label className="field-lbl">{tr.mrn}</label>
        <input type="text" className="field-inp" placeholder={tr.mrnPh}
          value={mrn} onChange={e => setMrn(e.target.value)}
          style={{ textTransform: "uppercase" }} required />
        <span className="field-hint">{tr.mrnHelp}</span>
      </div>
      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? <><span className="spinner" /> {tr.loading}</> : tr.btn}
      </button>
    </form>
  );
}

// ─── Clinic / Pharmacy login (email + password) ───────────────
function ClinicLoginForm({ lang, tr, redirectTo }: {
  lang: Lang;
  tr: LoginTranslation;
  redirectTo?: string;
}) {
  const isAr = lang === "ar";
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [showPass, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: pass,
      });
      if (authErr) {
        const msg = authErr.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password"))
          setError(tr.errors.invalid);
        else if (msg.includes("not found") || msg.includes("user"))
          setError(tr.errors.notFound);
        else if (msg.includes("network") || msg.includes("fetch"))
          setError(tr.errors.network);
        else setError(tr.errors.unknown);
        setLoading(false);
        return;
      }
      // إصدار cookie جلسة موقّع من الخادم حتى يسمح الـ middleware بالمرور
      if (authData?.session?.access_token) {
        try {
          await fetch("/api/session-cookie", { method: "POST", headers: { Authorization: `Bearer ${authData.session.access_token}` } });
        } catch { /* non-blocking */ }
      }
      // ── التحقق من نوع الحساب وتوجيه كل نوع للمسار الصحيح ──
      // metadata أولاً، ثم fallback من جدول clinics (حسابات الصيدلية القديمة بلا account_type)
      let accountType: string | undefined = authData?.user?.user_metadata?.account_type;
      if (!accountType && authData?.user?.id) {
        const { data: clinicRow } = await supabase
          .from("clinics")
          .select("account_type, plan")
          .eq("user_id", authData.user.id)
          .maybeSingle();
        accountType = clinicRow?.account_type
          ?? (clinicRow?.plan === "pharmacy" ? "pharmacy" : "clinic");
      }
      if (accountType === "pharmacy") {
        window.location.href = redirectTo && redirectTo.startsWith("/pharmacy") ? redirectTo : "/pharmacy";
      } else if (accountType === "lab") {
        window.location.href = redirectTo && redirectTo.startsWith("/lab") ? redirectTo : "/lab";
      } else {
        window.location.href = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
      }
    } catch {
      setError(tr.errors.network);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form" dir={isAr ? "rtl" : "ltr"}>
      {error && <div className="err-box" key={error}><span><AppIcon glyph="⚠️" /></span> {error}</div>}
      <div className="field">
        <label className="field-lbl">{tr.email}</label>
        <input type="email" className="field-inp" placeholder={tr.emailPh}
          value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div className="field">
        <label className="field-lbl">{tr.pass}</label>
        <div style={{ position: "relative" }}>
          <input
            type={showPass ? "text" : "password"}
            className="field-inp"
            placeholder={tr.passPh}
            value={pass}
            onChange={e => setPass(e.target.value)}
            autoComplete="current-password"
            style={{ paddingInlineEnd: "44px" }}
            required
          />
          <button type="button" className="pass-eye" onClick={() => setShow(!showPass)}><AppIcon glyph={showPass ? "🙈" : "👁️"} /></button>
        </div>
      </div>
      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? <><span className="spinner" /> {tr.loading}</> : tr.btn}
      </button>
    </form>
  );
}

// ─── About modal ──────────────────────────────────────────────
type AboutTranslation = typeof T["ar"]["about"] | typeof T["en"]["about"];

function AboutModal({ tr, isAr, onClose }: {
  tr: AboutTranslation;
  isAr: boolean;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} dir={isAr ? "rtl" : "ltr"}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title"><AppIcon glyph="💡" /> {tr.title}</div>
        <p className="modal-desc">{tr.desc}</p>
        <div className="modal-features">
          {tr.features.map((f) => (
            <div key={f.text} className="modal-feat">
              <span className="modal-feat-icon"><AppIcon glyph={f.icon} /></span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
        <button className="modal-close-btn" onClick={onClose}>{tr.close}</button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
function PortalPageContent() {
  const searchParams = useSearchParams();
  const typeParam    = searchParams.get("type");
  const initialPortal: Portal =
    typeParam === "pharmacy" || typeParam === "patient" || typeParam === "clinic" || typeParam === "lab"
      ? typeParam
      : "clinic";
  const redirectTo = searchParams.get("redirect") ?? "";

  const [lang, setLang]         = useState<Lang>("ar");
  const [portal, setPortal]     = useState<Portal>(initialPortal);
  const [showAbout, setAbout]   = useState(false);
  const isAr = lang === "ar";
  const tr   = T[lang];
  const accent = PORTAL_ACCENT[portal];

  const PORTALS: Portal[] = ["clinic", "pharmacy", "lab", "patient"];


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Rubik', sans-serif;
          background: #051224;
          min-height: 100vh;
          direction: ${isAr ? "rtl" : "ltr"};
        }

        /* ── Root ── */
        .root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          background:
            radial-gradient(1100px 600px at 85% -10%, rgba(8,99,186,0.28) 0%, transparent 60%),
            radial-gradient(900px 700px at -10% 110%, rgba(26,143,227,0.18) 0%, transparent 55%),
            linear-gradient(160deg, #071a33 0%, #051224 55%, #04101f 100%);
          font-family: 'Rubik', sans-serif;
          direction: ${isAr ? "rtl" : "ltr"};
          position: relative;
          overflow: hidden;
        }

        /* subtle radial glow behind hero */
        .root::before {
          content: '';
          position: fixed;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, ${accent.glow} 0%, transparent 70%);
          pointer-events: none;
          transition: background 0.5s ease;
          z-index: 0;
        }

        /* ── Top bar ── */
        .topbar {
          width: 100%;
          max-width: 420px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 0;
          position: relative;
          z-index: 10;
        }
        .topbar-actions { display: flex; align-items: center; gap: 10px; }
        .btn-ghost {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
          border-radius: 10px;
          padding: 6px 14px;
          font-family: 'Rubik', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.12); color: #fff; }

        .btn-info {
          width: 34px; height: 34px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
          border-radius: 50%;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
          font-family: 'Rubik', sans-serif;
        }
        .btn-info:hover { background: ${accent.glow}; border-color: ${accent.color}; color: ${accent.color}; }

        /* ── Hero ── */
        .hero {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 36px 20px 28px;
          position: relative;
          z-index: 1;
        }
        .logo-ring {
          width: 74px; height: 74px;
          border-radius: 22px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
          transition: border-color .4s, box-shadow .4s;
          box-shadow: 0 0 0 0px ${accent.glow};
        }
        .logo-ring.lit {
          border-color: ${accent.color}44;
          box-shadow: 0 0 0 6px ${accent.glow};
        }
        .hero-name {
          font-size: 36px; font-weight: 900;
          color: #fff; letter-spacing: -1px;
          margin-bottom: 6px;
        }
        .hero-tagline { font-size: 13px; color: rgba(255,255,255,0.45); font-weight: 500; }

        /* ── Switch selector ── */
        .switch-wrap {
          width: 100%; max-width: 420px;
          padding: 0 20px 24px;
          position: relative; z-index: 1;
        }
        .switch-label {
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: .8px;
          margin-bottom: 12px;
          text-align: ${isAr ? "right" : "left"};
        }
        .switch-track {
          display: flex;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 5px;
          gap: 4px;
          position: relative;
        }
        .switch-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 10px 6px;
          border-radius: 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all .25s cubic-bezier(.4,0,.2,1);
          font-family: 'Rubik', sans-serif;
          position: relative;
        }
        .switch-tab.active {
          background: ${accent.color}22;
          box-shadow: inset 0 0 0 1.5px ${accent.color}66;
        }
        .switch-tab-icon { font-size: 22px; line-height: 1; }
        .switch-tab-label {
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.4);
          transition: color .25s;
          white-space: nowrap;
        }
        .switch-tab.active .switch-tab-label { color: ${accent.color}; }
        .switch-tab-badge {
          position: absolute;
          top: 6px;
          ${isAr ? "left" : "right"}: 6px;
          background: ${accent.color};
          color: #0a0f1e;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 20px;
          line-height: 1.3;
        }

        /* ── Login card ── */
        .login-card {
          width: 100%; max-width: 420px;
          padding: 0 20px 12px;
          position: relative; z-index: 1;
        }
        .login-box {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 24px 20px;
          transition: border-color .4s;
        }
        .login-box.accent-border { border-color: ${accent.color}44; }
        .login-portal-header {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 22px;
          direction: ${isAr ? "rtl" : "ltr"};
        }
        .login-portal-icon {
          width: 44px; height: 44px;
          background: ${accent.glow};
          border: 1.5px solid ${accent.color}44;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .login-portal-title { font-size: 17px; font-weight: 800; color: #fff; }
        .login-portal-sub   { font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 2px; }

        /* ── Form fields ── */
        .login-form { display: flex; flex-direction: column; gap: 0; }
        .field { margin-bottom: 16px; }
        .field-lbl {
          display: block;
          font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.5);
          margin-bottom: 8px;
        }
        .field-inp {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          font-family: 'Rubik', sans-serif;
          font-size: 15px;
          color: #fff;
          outline: none;
          transition: border-color .2s, background .2s;
        }
        .field-inp::placeholder { color: rgba(255,255,255,0.2); }
        .field-inp:focus {
          border-color: ${accent.color}88;
          background: rgba(255,255,255,0.09);
        }
        .field-hint { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 6px; display: block; }
        .pass-eye {
          position: absolute; top: 50%; transform: translateY(-50%);
          ${isAr ? "left" : "right"}: 14px;
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: rgba(255,255,255,0.3);
          padding: 4px; transition: color .2s;
        }
        .pass-eye:hover { color: rgba(255,255,255,0.7); }

        .err-box {
          background: rgba(239,68,68,0.12);
          border: 1.5px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px; color: #fca5a5;
          margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
          animation: shake .4s ease;
        }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: ${accent.color};
          color: #0a0f1e;
          border: none;
          border-radius: 12px;
          font-family: 'Rubik', sans-serif;
          font-size: 15px; font-weight: 800;
          cursor: pointer;
          transition: all .25s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .submit-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(10,15,30,.25);
          border-top-color: #0a0f1e;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Footer ── */
        .footer {
          width: 100%; max-width: 420px;
          padding: 20px 20px 32px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-top: auto;
          position: relative; z-index: 1;
        }
        .footer-links { display: flex; gap: 20px; }
        .footer-link {
          font-size: 12px; color: rgba(255,255,255,0.3);
          text-decoration: none; transition: color .2s;
        }
        .footer-link:hover { color: ${accent.color}; }
        .footer-copy { font-size: 11px; color: rgba(255,255,255,0.2); }

        /* ── About modal ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-end;
          z-index: 100;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box {
          width: 100%; max-width: 480px;
          margin: 0 auto;
          background: #131929;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px 24px 0 0;
          padding: 28px 24px 40px;
          position: relative;
          animation: slideUp .3s cubic-bezier(.4,0,.2,1);
        }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-close {
          position: absolute; top: 18px;
          ${isAr ? "left" : "right"}: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.5);
          width: 30px; height: 30px;
          border-radius: 50%; cursor: pointer;
          font-size: 13px;
          display: flex; align-items: center; justify-content: center;
          transition: all .2s;
        }
        .modal-close:hover { background: rgba(255,255,255,0.14); color: #fff; }
        .modal-title {
          font-size: 18px; font-weight: 800; color: #fff;
          margin-bottom: 14px;
        }
        .modal-desc {
          font-size: 14px; color: rgba(255,255,255,0.55);
          line-height: 1.75; margin-bottom: 20px;
        }
        .modal-features {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          margin-bottom: 24px;
        }
        .modal-feat {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 12px;
          display: flex; align-items: center; gap: 9px;
          font-size: 13px; color: rgba(255,255,255,0.65);
          font-weight: 500;
        }
        .modal-feat-icon { font-size: 18px; flex-shrink: 0; }
        .modal-close-btn {
          width: 100%; padding: 13px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
          border-radius: 12px;
          font-family: 'Rubik', sans-serif;
          font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all .2s;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* ── Layout wrapper (mobile: stacked, desktop: split) ── */
        .main {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .pane-brand, .pane-login {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .desktop-features { display: none; }

        /* ══ Desktop ≥ 1024px ══ */
        @media (min-width: 1024px) {
          .topbar, .footer { max-width: 1200px; }
          .topbar { padding: 26px 48px 0; }
          .footer {
            max-width: 100%;
            flex-direction: row;
            justify-content: space-between;
            padding: 20px 48px 26px;
          }
          .main {
            max-width: 1200px;
            flex: 1;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 72px;
            padding: 24px 48px 40px;
          }
          .pane-brand {
            flex: 1;
            align-items: ${isAr ? "flex-start" : "flex-start"};
          }
          .hero {
            max-width: none;
            align-items: flex-start;
            text-align: ${isAr ? "right" : "left"};
            padding: 0 0 30px;
          }
          .logo-ring { width: 88px; height: 88px; border-radius: 26px; margin-bottom: 24px; }
          .logo-ring img { width: 54px !important; height: 54px !important; }
          .hero-name { font-size: 56px; letter-spacing: -1.5px; margin-bottom: 12px; }
          .hero-tagline { font-size: 18px; color: rgba(255,255,255,0.55); }
          .desktop-features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            width: 100%;
            max-width: 520px;
            margin-top: 8px;
          }
          .desk-feat {
            display: flex; align-items: center; gap: 11px;
            background: rgba(26,143,227,0.07);
            border: 1px solid rgba(26,143,227,0.16);
            border-radius: 14px;
            padding: 13px 16px;
            font-size: 13.5px; font-weight: 600;
            color: rgba(255,255,255,0.72);
            transition: border-color .25s, background .25s, transform .25s;
          }
          .desk-feat:hover {
            border-color: rgba(26,143,227,0.4);
            background: rgba(26,143,227,0.12);
            transform: translateY(-2px);
          }
          .desk-feat-icon { font-size: 19px; flex-shrink: 0; }
          .pane-login { width: 480px; flex-shrink: 0; }
          .switch-wrap { max-width: none; padding: 0 0 22px; }
          .login-card { max-width: none; padding: 0; }
          .login-box {
            padding: 32px 30px;
            border-radius: 24px;
            background: rgba(8,30,58,0.55);
            backdrop-filter: blur(14px);
            box-shadow: 0 24px 70px rgba(2,12,28,0.55);
          }
          .switch-tab { padding: 13px 8px; }
          .switch-tab-icon { font-size: 24px; }
          .field-inp { padding: 14px 17px; font-size: 15px; }
          .submit-btn { padding: 15px; font-size: 16px; }
          .modal-overlay { align-items: center; }
          .modal-box { border-radius: 24px; }
        }

        /* ══ Large desktop ≥ 1440px ══ */
        @media (min-width: 1440px) {
          .main { gap: 110px; }
          .hero-name { font-size: 64px; }
        }
      `}</style>

      <div className="root">

        {/* ── Top bar ── */}
        <div className="topbar">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:32, height:32, borderRadius:8 }} />
            <span style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-0.5px" }}>
              {isAr ? "نبض" : "NABD"}
            </span>
          </div>
          <div className="topbar-actions">
            <button className="btn-info" onClick={() => setAbout(true)} title="ما هو نبض؟">?</button>
            <button className="btn-ghost" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
          </div>
        </div>

        {/* ── Main split layout ── */}
        <div className="main">

          {/* ── Brand pane (hero + desktop features) ── */}
          <div className="pane-brand">
            <div className="hero">
              <div className={`logo-ring lit`} style={{
                borderColor: `${accent.color}44`,
                boxShadow: `0 0 0 8px ${accent.glow}`,
              }}>
                <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:44, height:44, borderRadius:12 }} />
              </div>
              <div className="hero-name">{isAr ? "نبض" : "NABD"}</div>
              <div className="hero-tagline">{tr.tagline}</div>
            </div>

            {/* features — desktop only */}
            <div className="desktop-features">
              {tr.about.features.map((f, i) => (
                <div key={i} className="desk-feat">
                  <span className="desk-feat-icon"><AppIcon glyph={f.icon} /></span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Login pane (switch + card) ── */}
          <div className="pane-login">
            {/* ── Switch selector ── */}
            <div className="switch-wrap">
          <div className="switch-label">{tr.switchLabel}</div>
          <div className="switch-track">
            {PORTALS.map((p) => {
              const pd = tr.portals[p];
              const isActive = portal === p;
              return (
                <button
                  key={p}
                  className={`switch-tab${isActive ? " active" : ""}`}
                  onClick={() => setPortal(p)}
                  style={isActive ? {
                    background: `${PORTAL_ACCENT[p].color}1a`,
                    boxShadow: `inset 0 0 0 1.5px ${PORTAL_ACCENT[p].color}55`,
                  } : {}}
                >
                  {"badge" in pd && pd.badge && (
                    <span className="switch-tab-badge" style={{ background: PORTAL_ACCENT[p].color }}>
                      {pd.badge}
                    </span>
                  )}
                  <span className="switch-tab-icon"><AppIcon glyph={pd.icon} /></span>
                  <span className="switch-tab-label" style={isActive ? { color: PORTAL_ACCENT[p].color } : {}}>
                    {pd.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Login card ── */}
        <div className="login-card">
          <div className="login-box" style={{ borderColor: `${accent.color}33` }}>
            <div className="login-portal-header">
              <div className="login-portal-icon" style={{
                background: accent.glow,
                borderColor: `${accent.color}44`,
              }}>
                {tr.portals[portal].icon}
              </div>
              <div>
                <div className="login-portal-title">{tr.portals[portal].label}</div>
                <div className="login-portal-sub">{tr.portals[portal].sub}</div>
              </div>
            </div>

            {portal === "patient" ? (
              <PatientLoginForm lang={lang} tr={tr.login} />
            ) : (
              <ClinicLoginForm lang={lang} tr={tr.login} redirectTo={redirectTo} />
            )}
          </div>
        </div>

          </div>{/* /pane-login */}
        </div>{/* /main */}

        {/* ── Footer ── */}
        <div className="footer">
          <div className="footer-links">
            <a href="/privacy-policy" className="footer-link">{tr.privacy}</a>
            <a href="https://wa.me/963998285483" className="footer-link" target="_blank" rel="noreferrer">
              {tr.contact}
            </a>
          </div>
          <div className="footer-copy">{tr.copyright}</div>
        </div>

      </div>

      {/* ── About modal ── */}
      {showAbout && (
        <AboutModal tr={tr.about} isAr={isAr} onClose={() => setAbout(false)} />
      )}
    </>
  );
}

export default function NabdPortalPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0f1e" }}>
        <div style={{ textAlign:"center" }}>
          <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:48, height:48, marginBottom:16, borderRadius:12 }} />
          <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,0.1)", borderTopColor:"#4a9eff", borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    }>
      <PortalPageContent />
    </Suspense>
  );
}