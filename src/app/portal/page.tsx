"use client";

import { useState } from "react";

// ============================================================
// NABD — نبض | App Portal Page
// واجهة التطبيق الرئيسية — بوابة الدخول للمستخدمين
// ============================================================

type Lang = "ar" | "en";

const T = {
  ar: {
    tagline: "نبض عيادتك في يدك",
    desc: "منصة متكاملة لإدارة العيادات والصيدليات — مرضى، مواعيد، ومدفوعات في مكان واحد.",
    choosePortal: "اختر بوابتك",
    portals: [
      {
        key: "clinic",
        icon: "🏥",
        title: "نبض عيادة",
        subtitle: "للأطباء وإدارة العيادات",
        desc: "إدارة المرضى، المواعيد، والمدفوعات",
        color: "#0863ba",
        bg: "rgba(8,99,186,0.06)",
        border: "rgba(8,99,186,0.2)",
        url: "https://www.nabd.clinic/login",
        badge: null,
      },
      {
        key: "pharmacy",
        icon: "💊",
        title: "نبض صيدلية",
        subtitle: "لإدارة الصيدليات",
        desc: "جرد الأدوية، الوصفات، والمبيعات",
        color: "#0d7a4e",
        bg: "rgba(13,122,78,0.06)",
        border: "rgba(13,122,78,0.2)",
        url: "https://www.nabd.clinic/pharmacy/login",
        badge: "جديد",
      },
      {
        key: "patient",
        icon: "👤",
        title: "بوابة المريض",
        subtitle: "للمرضى ومتابعة الحالة",
        desc: "تتبع حالتك الصحية وحجز المواعيد",
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.06)",
        border: "rgba(124,58,237,0.2)",
        url: "https://www.nabd.clinic/patient-portal",
        badge: null,
      },
    ],
    features: [
      { icon: "👥", text: "إدارة كاملة لملفات المرضى" },
      { icon: "📅", text: "جدولة المواعيد بذكاء" },
      { icon: "💳", text: "تتبع المدفوعات والفواتير" },
      { icon: "💬", text: "تذكير عبر واتساب" },
      { icon: "🔒", text: "بيانات آمنة ومشفّرة" },
      { icon: "📊", text: "إحصائيات وتحليلات شاملة" },
    ],
    stats: [
      { value: "+50", label: "عيادة تثق بنا" },
      { value: "99%", label: "رضا العملاء" },
      { value: "24/7", label: "دعم مستمر" },
    ],
    aboutTitle: "ما هو نبض؟",
    aboutDesc:
      "نبض هو نظام متكامل لإدارة العيادات الطبية والصيدليات. يتيح للأطباء إدارة مرضاهم ومواعيدهم ومدفوعاتهم بكل سهولة، ويمنح المرضى رابطاً خاصاً لمتابعة حالتهم الصحية وحجز مواعيدهم مباشرة.",
    privacy: "سياسة الخصوصية",
    contact: "تواصل معنا",
    copyright: "© ٢٠٢٦ نبض — جميع الحقوق محفوظة",
    enter: "دخول",
  },
  en: {
    tagline: "Your Clinic's Pulse in Your Hands",
    desc: "An integrated platform for managing clinics and pharmacies — patients, appointments, and payments in one place.",
    choosePortal: "Choose your portal",
    portals: [
      {
        key: "clinic",
        icon: "🏥",
        title: "NABD Clinic",
        subtitle: "For doctors & clinic management",
        desc: "Manage patients, appointments & payments",
        color: "#0863ba",
        bg: "rgba(8,99,186,0.06)",
        border: "rgba(8,99,186,0.2)",
        url: "https://www.nabd.clinic/login",
        badge: null,
      },
      {
        key: "pharmacy",
        icon: "💊",
        title: "NABD Pharmacy",
        subtitle: "For pharmacy management",
        desc: "Inventory, prescriptions & sales",
        color: "#0d7a4e",
        bg: "rgba(13,122,78,0.06)",
        border: "rgba(13,122,78,0.2)",
        url: "https://www.nabd.clinic/pharmacy/login",
        badge: "New",
      },
      {
        key: "patient",
        icon: "👤",
        title: "Patient Portal",
        subtitle: "For patients & health tracking",
        desc: "Track your health & book appointments",
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.06)",
        border: "rgba(124,58,237,0.2)",
        url: "https://www.nabd.clinic/patient-portal",
        badge: null,
      },
    ],
    features: [
      { icon: "👥", text: "Complete patient record management" },
      { icon: "📅", text: "Smart appointment scheduling" },
      { icon: "💳", text: "Payment and billing tracking" },
      { icon: "💬", text: "WhatsApp reminders" },
      { icon: "🔒", text: "Secure and encrypted data" },
      { icon: "📊", text: "Comprehensive analytics" },
    ],
    stats: [
      { value: "50+", label: "Trusted clinics" },
      { value: "99%", label: "Client satisfaction" },
      { value: "24/7", label: "Continuous support" },
    ],
    aboutTitle: "What is NABD?",
    aboutDesc:
      "NABD is an integrated system for managing medical clinics and pharmacies. It enables doctors to manage their patients, appointments, and payments with ease, and gives patients a personal link to track their health and book appointments directly.",
    privacy: "Privacy Policy",
    contact: "Contact Us",
    copyright: "© 2026 NABD — All rights reserved",
    enter: "Enter",
  },
} as const;

export default function NabdPortalPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Rubik', sans-serif;
          background: #f0f4fa;
          min-height: 100vh;
          direction: ${isAr ? "rtl" : "ltr"};
        }

        .portal-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #f0f4fa;
          font-family: 'Rubik', sans-serif;
          direction: ${isAr ? "rtl" : "ltr"};
        }

        /* ── Hero ── */
        .hero {
          width: 100%;
          background: linear-gradient(155deg, #0863ba 0%, #054a8c 55%, #03346e 100%);
          position: relative;
          overflow: hidden;
          padding: 52px 20px 44px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(164,196,228,0.18) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(255,181,181,0.12) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-dots {
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        .hero-inner { position: relative; z-index: 1; max-width: 420px; width: 100%; }

        .logo-wrap {
          width: 76px; height: 76px;
          background: rgba(255,255,255,0.14);
          border-radius: 22px;
          border: 1.5px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .hero-name {
          font-size: 38px; font-weight: 900;
          color: #fff; letter-spacing: -1px;
          margin-bottom: 4px;
        }
        .hero-tagline {
          font-size: 14px; color: rgba(255,255,255,0.72);
          margin-bottom: 14px; font-weight: 500;
        }
        .hero-desc {
          font-size: 14px; color: rgba(255,255,255,0.82);
          line-height: 1.7; max-width: 340px; margin: 0 auto;
        }

        /* ── Stats bar ── */
        .stats-bar {
          width: 100%;
          max-width: 420px;
          display: flex;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(12px);
          border-radius: 0 0 20px 20px;
          border: 1px solid rgba(255,255,255,0.15);
          border-top: none;
          padding: 14px 0;
          margin-top: -1px;
        }
        .stat-item {
          flex: 1;
          text-align: center;
          border-${isAr ? "left" : "right"}: 1px solid rgba(255,255,255,0.15);
        }
        .stat-item:last-child { border: none; }
        .stat-val { font-size: 20px; font-weight: 800; color: #fff; }
        .stat-lbl { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 2px; }

        /* ── Main content ── */
        .content {
          width: 100%;
          max-width: 420px;
          padding: 28px 16px 40px;
          flex: 1;
        }

        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 14px;
          text-align: center;
        }

        /* ── Portal cards ── */
        .portal-card {
          background: #fff;
          border-radius: 18px;
          border: 1.5px solid #e8edf5;
          padding: 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .portal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.10);
        }
        .portal-card:active { transform: translateY(0); }

        .portal-icon-wrap {
          width: 56px; height: 56px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
        }
        .portal-texts { flex: 1; min-width: 0; }
        .portal-title {
          font-size: 17px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 2px;
        }
        .portal-subtitle {
          font-size: 12px;
          color: #888;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .portal-desc {
          font-size: 13px;
          color: #555;
          line-height: 1.5;
        }
        .portal-arrow {
          font-size: 20px;
          opacity: 0.4;
          flex-shrink: 0;
          transform: ${isAr ? "rotate(180deg)" : "none"};
        }
        .portal-badge {
          position: absolute;
          top: 12px;
          ${isAr ? "left" : "right"}: 12px;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 20px;
          color: #fff;
        }

        /* ── About section ── */
        .about-card {
          background: #fff;
          border-radius: 18px;
          border: 1.5px solid #e8edf5;
          padding: 22px;
          margin-bottom: 12px;
          margin-top: 8px;
        }
        .about-title {
          font-size: 16px;
          font-weight: 800;
          color: #1a1a2e;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .about-desc {
          font-size: 14px;
          color: #555;
          line-height: 1.75;
        }

        /* ── Features grid ── */
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
        }
        .feature-chip {
          background: #f5f8ff;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          color: #444;
          font-weight: 500;
          border: 1px solid #edf0f7;
        }
        .feature-chip-icon { font-size: 18px; flex-shrink: 0; }

        /* ── Top bar ── */
        .top-bar {
          position: absolute;
          top: 16px;
          ${isAr ? "left" : "right"}: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 10;
        }
        .lang-btn {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          border-radius: 8px;
          padding: 5px 13px;
          font-family: 'Rubik', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: background 0.2s;
        }
        .lang-btn:hover { background: rgba(255,255,255,0.28); }

        /* ── Footer ── */
        .footer {
          width: 100%;
          text-align: center;
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          border-top: 1px solid #e8edf5;
          background: #fff;
        }
        .footer-links {
          display: flex;
          gap: 20px;
        }
        .footer-link {
          font-size: 13px;
          color: #0863ba;
          text-decoration: none;
          font-weight: 600;
        }
        .footer-link:hover { text-decoration: underline; }
        .footer-copy {
          font-size: 12px;
          color: #bbb;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .hero { padding: 48px 16px 40px; }
          .hero-name { font-size: 34px; }
        }
      `}</style>

      <div className="portal-root">
        {/* ── Hero ── */}
        <div className="hero">
          <div className="hero-dots" />

          {/* Lang toggle */}
          <div className="top-bar">
            <button className="lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
          </div>

          <div className="hero-inner">
            <div className="logo-wrap">
              <img
                src="/Logo_Nabd.svg"
                alt="NABD"
                style={{ width: 48, height: 48, borderRadius: 12 }}
              />
            </div>
            <div className="hero-name">{isAr ? "نبض" : "NABD"}</div>
            <div className="hero-tagline">{tr.tagline}</div>
            <div className="hero-desc">{tr.desc}</div>
          </div>

          {/* Stats */}
          <div className="stats-bar">
            {tr.stats.map((s) => (
              <div key={s.label} className="stat-item">
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="content">

          {/* Portal selector */}
          <div className="section-title">{tr.choosePortal}</div>

          {tr.portals.map((p) => (
            <a
              key={p.key}
              href={p.url}
              className="portal-card"
              style={{ borderColor: p.border }}
            >
              {p.badge && (
                <div
                  className="portal-badge"
                  style={{ background: p.color }}
                >
                  {p.badge}
                </div>
              )}
              <div
                className="portal-icon-wrap"
                style={{ background: p.bg }}
              >
                <span style={{ fontSize: 28 }}>{p.icon}</span>
              </div>
              <div className="portal-texts">
                <div className="portal-title" style={{ color: p.color }}>
                  {p.title}
                </div>
                <div className="portal-subtitle">{p.subtitle}</div>
                <div className="portal-desc">{p.desc}</div>
              </div>
              <div className="portal-arrow">›</div>
            </a>
          ))}

          {/* About section */}
          <div className="about-card">
            <div className="about-title">
              <span>💡</span> {tr.aboutTitle}
            </div>
            <div className="about-desc">{tr.aboutDesc}</div>

            <div className="features-grid">
              {tr.features.map((f) => (
                <div key={f.text} className="feature-chip">
                  <span className="feature-chip-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="footer">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/Logo_Nabd.svg"
              alt="NABD"
              style={{ width: 22, height: 22, borderRadius: 6 }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
              {isAr ? "نبض" : "NABD"}
            </span>
          </div>
          <div className="footer-links">
            <a href="/privacy-policy" className="footer-link">
              {tr.privacy}
            </a>
            <a href="https://wa.me/963998285483" className="footer-link" target="_blank" rel="noreferrer">
              {tr.contact}
            </a>
          </div>
          <div className="footer-copy">{tr.copyright}</div>
        </div>
      </div>
    </>
  );
}