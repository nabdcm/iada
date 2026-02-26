"use client";

import { useState, useEffect } from "react";

// ============================================================
// NABD - نبض | Landing Page
// Bilingual (AR/EN) | Light Mode | Rubik Font
// ============================================================

const LOGO_SVG = (
  <svg viewBox="0 0 337.74 393.31" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id="lg-nl1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
        <stop offset=".3" stopColor="#0863ba" /><stop offset=".69" stopColor="#5694cf" />
      </linearGradient>
      <linearGradient id="lg-nl2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#5694cf" /><stop offset=".68" stopColor="#a4c4e4" />
      </linearGradient>
    </defs>
    <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
    <path fill="url(#lg-nl1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
    <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
    <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
    <path fill="url(#lg-nl2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
  </svg>
);

const WA_LINK = "https://wa.me/963998285483";
const YT_LINK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const translations = {
  ar: {
    nav: {
      features: "المميزات",
      about: "عن التطبيق",
      contact: "تواصل معنا",
      login: "تسجيل الدخول",
    },
    hero: {
      badge: "نظام إدارة العيادات",
      title1: "إدارة عيادتك",
      title2: "بكل سهولة واحترافية",
      subtitle: "نبض هو نظام متكامل لإدارة العيادات الطبية — مرضى، مواعيد، ومدفوعات في مكان واحد.",
      cta: "ابدأ الآن",
      demo: "مشاهدة العرض",
    },
    stats: [
      { value: "99%", label: "رضا العملاء" },
      { value: "+50", label: "عيادة تثق بنا" },
      { value: "24/7", label: "دعم مستمر" },
      { value: "3s", label: "ثوانٍ للإعداد" },
    ],
    features: {
      title: "كل ما تحتاجه في مكان",
      titleHighlight: "واحد",
      subtitle: "تم تصميم نبض خصيصاً لتبسيط العمل اليومي في العيادة",
      items: [
        {
          icon: "👥",
          title: "إدارة المرضى",
          desc: "سجلات مرضى منظمة وكاملة مع تاريخ طبي لكل مريض، إمكانية البحث والتعديل بسهولة.",
        },
        {
          icon: "📅",
          title: "نظام المواعيد",
          desc: "تقويم ذكي لإدارة المواعيد مع تنبيهات تلقائية قبل ربع ساعة من كل موعد.",
        },
        {
          icon: "💳",
          title: "إدارة المدفوعات",
          desc: "تتبع كامل للمدفوعات والفواتير مع لوحة إحصائيات توضح الأرقام المالية بوضوح.",
        },
        {
          icon: "📊",
          title: "لوحة التحكم",
          desc: "نظرة شاملة على نشاط العيادة من إحصائيات ومؤشرات أداء بشكل يومي وشهري.",
        },
        {
          icon: "🔔",
          title: "نظام التنبيهات",
          desc: "تنبيهات فورية للسكرتيرة بمواعيد المرضى القادمة حتى لا يفوت أي موعد.",
        },
        {
          // Fix 7: Replace "ثنائي اللغة" with WhatsApp reminders card
          icon: "💬",
          title: "تذكير المرضى عبر واتساب",
          desc: "أرسل تذكيراً تلقائياً للمريض على واتساب قبل موعده مباشرةً من التطبيق بضغطة واحدة.",
          whatsapp: true,
        },
      ],
    },
    howItWorks: {
      title: "كيف يعمل نبض؟",
      subtitle: "أربع خطوات بسيطة لبدء إدارة عيادتك",
      steps: [
        {
          num: "1",
          title: "تسجيل الدخول",
          desc: "احصل على بيانات دخولك من المزود وسجّل الدخول بأمان.",
        },
        {
          num: "2",
          title: "أضف مرضاك",
          desc: "أدخل بيانات المرضى بسهولة وابدأ في إدارة سجلاتهم.",
        },
        {
          num: "3",
          title: "نظّم مواعيدك",
          desc: "حدد المواعيد واستقبل التنبيهات واتبع المدفوعات.",
        },
        {
          num: "4",
          title: "ذكّر مرضاك عبر واتساب",
          desc: "أرسل تذكيراً فورياً للمريض على واتساب قبل موعده مباشرةً من التطبيق.",
          whatsapp: true,
        },
      ],
    },
    cta: {
      title: "هل أنت مستعد لتطوير عيادتك؟",
      subtitle: "انضم إلى العيادات التي تثق بنبض لإدارة عملها اليومي",
      btn: "تواصل معنا عبر واتساب",
    },
    footer: {
      tagline: "نبض عيادتك في يدك",
      copy: "© 2026 نبض. جميع الحقوق محفوظة.",
    },
  },
  en: {
    nav: {
      features: "Features",
      about: "About",
      contact: "Contact",
      login: "Login",
    },
    hero: {
      badge: "Clinic Management System",
      title1: "Manage Your Clinic",
      title2: "Effortlessly & Professionally",
      subtitle: "NABD is a complete clinic management system — patients, appointments, and payments all in one place.",
      cta: "Get Started",
      demo: "Watch Demo",
    },
    stats: [
      { value: "99%", label: "Client Satisfaction" },
      { value: "50+", label: "Clinics Trust Us" },
      { value: "24/7", label: "Continuous Support" },
      { value: "3s", label: "Setup Time" },
    ],
    features: {
      title: "Everything You Need in One",
      titleHighlight: "Place",
      subtitle: "NABD is designed specifically to simplify daily clinic operations",
      items: [
        {
          icon: "👥",
          title: "Patient Management",
          desc: "Organized patient records with complete medical history, easy search and editing capabilities.",
        },
        {
          icon: "📅",
          title: "Appointment System",
          desc: "Smart calendar for managing appointments with automatic alerts 15 minutes before each visit.",
        },
        {
          icon: "💳",
          title: "Payment Management",
          desc: "Complete payment and invoice tracking with a statistics dashboard showing financial figures clearly.",
        },
        {
          icon: "📊",
          title: "Dashboard",
          desc: "Comprehensive view of clinic activity with daily and monthly statistics and performance indicators.",
        },
        {
          icon: "🔔",
          title: "Alert System",
          desc: "Instant notifications for the secretary about upcoming appointments so nothing gets missed.",
        },
        {
          icon: "💬",
          title: "WhatsApp Appointment Reminders",
          desc: "Send automatic WhatsApp reminders to patients before their appointment — directly from the app in one click.",
          whatsapp: true,
        },
      ],
    },
    howItWorks: {
      title: "How Does NABD Work?",
      subtitle: "Four simple steps to start managing your clinic",
      steps: [
        {
          num: "1",
          title: "Login",
          desc: "Get your credentials from the provider and log in securely.",
        },
        {
          num: "2",
          title: "Add Your Patients",
          desc: "Easily enter patient information and start managing their records.",
        },
        {
          num: "3",
          title: "Organize Appointments",
          desc: "Schedule appointments, receive alerts, and track payments.",
        },
        {
          num: "4",
          title: "Remind via WhatsApp",
          desc: "Send an instant WhatsApp reminder to patients before their appointment — right from the app.",
          whatsapp: true,
        },
      ],
    },
    cta: {
      title: "Ready to Upgrade Your Clinic?",
      subtitle: "Join the clinics that trust NABD for daily management",
      btn: "Contact Us on WhatsApp",
    },
    footer: {
      tagline: "Your Clinic's Pulse in Your Hands",
      copy: "© 2026 NABD. All rights reserved.",
    },
  },
};

export default function LandingPage() {
  const [lang, setLang] = useState("ar");
  const [scrolled, setScrolled] = useState(false);
  const t = translations[lang];
  const isAr = lang === "ar";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --primary: #0863ba;
          --primary-light: #a4c4e4;
          --bg: #f2f2f2;
          --dark: #353535;
          --accent: #ffb5b5;
          --white: #ffffff;
          --wa: #25D366;
          --shadow: 0 4px 24px rgba(8,99,186,0.10);
          --shadow-lg: 0 8px 48px rgba(8,99,186,0.16);
        }

        body {
          font-family: 'Rubik', sans-serif;
          background: var(--bg);
          color: var(--dark);
          direction: ${isAr ? "rtl" : "ltr"};
        }

        /* ── NAVBAR ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 16px 40px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
        }
        .nav.scrolled {
          background: rgba(242,242,242,0.95);
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 20px rgba(8,99,186,0.08);
          padding: 12px 40px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .nav-logo-text {
          font-size: 22px; font-weight: 700; color: var(--primary);
          letter-spacing: -0.5px;
        }
        .nav-logo-sub {
          font-size: 11px; color: #888; font-weight: 400;
          display: block; line-height: 1;
        }
        .nav-links {
          display: flex; align-items: center; gap: 8px;
          list-style: none;
        }
        .nav-links a {
          text-decoration: none; color: var(--dark);
          font-size: 15px; font-weight: 500;
          padding: 8px 16px; border-radius: 8px;
          transition: all 0.2s;
        }
        .nav-links a:hover { background: var(--primary-light); color: var(--primary); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .lang-toggle {
          background: var(--white); border: 1.5px solid var(--primary-light);
          color: var(--primary); border-radius: 8px;
          padding: 7px 14px; font-family: 'Rubik', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .lang-toggle:hover { background: var(--primary); color: var(--white); }
        .nav-cta {
          background: var(--primary); color: var(--white) !important;
          border-radius: 10px; padding: 9px 22px !important;
          font-weight: 600; box-shadow: 0 4px 12px rgba(8,99,186,0.25);
          transition: all 0.2s !important;
        }
        .nav-cta:hover {
          background: #054a8c !important; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(8,99,186,0.35) !important;
        }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 120px 40px 80px;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 60% -10%, rgba(8,99,186,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 10% 80%, rgba(164,196,228,0.15) 0%, transparent 60%);
        }
        .hero-blob {
          position: absolute;
          border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: 0;
          animation: floatBlob 8s ease-in-out infinite;
        }
        .hero-blob-1 { width: 500px; height: 500px; background: var(--primary); top: -100px; right: -100px; }
        .hero-blob-2 { width: 300px; height: 300px; background: var(--accent); bottom: 0; left: 10%; animation-delay: -4s; }
        @keyframes floatBlob {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.05); }
        }
        .hero-content {
          position: relative; z-index: 1;
          text-align: center; max-width: 760px;
          animation: heroFadeIn 0.8s ease both;
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(8,99,186,0.08); border: 1.5px solid rgba(8,99,186,0.15);
          color: var(--primary); padding: 8px 20px; border-radius: 100px;
          font-size: 13px; font-weight: 600; margin-bottom: 28px;
          animation: heroFadeIn 0.8s 0.1s ease both;
        }
        .hero-badge::before { content: ''; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        .hero-title {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800; line-height: 1.15;
          color: var(--dark); margin-bottom: 20px;
          animation: heroFadeIn 0.8s 0.2s ease both;
        }
        .hero-title span { color: var(--primary); }
        .hero-subtitle {
          font-size: clamp(15px, 2vw, 18px); color: #666;
          line-height: 1.7; max-width: 560px; margin: 0 auto 40px;
          font-weight: 400;
          animation: heroFadeIn 0.8s 0.3s ease both;
        }
        .hero-btns {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          flex-wrap: wrap;
          animation: heroFadeIn 0.8s 0.4s ease both;
        }
        .btn-primary {
          background: var(--primary); color: var(--white);
          padding: 14px 36px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 600; border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(8,99,186,0.3);
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { background: #054a8c; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(8,99,186,0.4); }
        .btn-wa {
          background: var(--wa); color: var(--white);
          padding: 14px 36px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 600; border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(37,211,102,0.35);
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 10px;
        }
        .btn-wa:hover { background: #1da851; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(37,211,102,0.45); }
        .btn-secondary {
          background: var(--white); color: var(--dark);
          padding: 14px 32px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 500; border: 1.5px solid #ddd; cursor: pointer;
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-secondary:hover { border-color: var(--primary-light); color: var(--primary); background: rgba(8,99,186,0.04); }

        /* Hero mockup */
        .hero-visual {
          position: relative; z-index: 1; margin-top: 60px;
          animation: heroFadeIn 0.8s 0.5s ease both;
        }
        .mockup-window {
          background: var(--white); border-radius: 20px;
          box-shadow: 0 20px 80px rgba(8,99,186,0.15), 0 4px 20px rgba(0,0,0,0.06);
          overflow: hidden; max-width: 700px; margin: 0 auto;
          border: 1px solid rgba(8,99,186,0.08);
        }
        .mockup-bar {
          background: #f7f9fc; padding: 12px 20px;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid #eee;
        }
        .mockup-dot { width: 12px; height: 12px; border-radius: 50%; }
        .mockup-body { padding: 24px; background: var(--bg); }
        .mockup-card {
          background: var(--white); border-radius: 12px; padding: 16px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .mockup-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: var(--white); flex-shrink: 0;
        }
        .mockup-info { flex: 1; }
        .mockup-name { font-size: 14px; font-weight: 600; color: var(--dark); }
        .mockup-detail { font-size: 12px; color: #999; margin-top: 2px; }
        .mockup-badge-green {
          background: #e6f4ea; color: #2e7d32; padding: 4px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .mockup-badge-blue {
          background: rgba(8,99,186,0.1); color: var(--primary); padding: 4px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .mockup-stats-row { display: flex; gap: 12px; margin-bottom: 12px; }
        .mockup-stat {
          flex: 1; background: var(--white); border-radius: 12px; padding: 14px;
          text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .mockup-stat-val { font-size: 22px; font-weight: 800; color: var(--primary); }
        .mockup-stat-lbl { font-size: 11px; color: #999; margin-top: 2px; }

        /* ── STATS ── */
        .stats-section { padding: 0 40px 80px; position: relative; z-index: 1; }
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
          max-width: 900px; margin: 0 auto;
          background: var(--white); border-radius: 20px; padding: 10px;
          box-shadow: var(--shadow);
        }
        .stat-item {
          text-align: center; padding: 28px 20px;
          border-radius: 14px; transition: all 0.2s;
        }
        .stat-item:hover { background: rgba(8,99,186,0.04); }
        .stat-val { font-size: 36px; font-weight: 800; color: var(--primary); line-height: 1; font-variant-numeric: tabular-nums; }
        .stat-lbl { font-size: 14px; color: #888; margin-top: 8px; font-weight: 500; }

        /* ── FEATURES ── */
        .features-section { padding: 80px 40px; max-width: 1100px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 56px; }
        .section-title {
          font-size: clamp(28px, 4vw, 40px); font-weight: 800;
          color: var(--dark); margin-bottom: 14px;
        }
        .section-title span { color: var(--primary); }
        .section-sub { font-size: 16px; color: #888; max-width: 500px; margin: 0 auto; line-height: 1.6; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .feature-card {
          background: var(--white); border-radius: 20px; padding: 32px 28px;
          box-shadow: var(--shadow); border: 1.5px solid transparent;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background: linear-gradient(135deg, rgba(8,99,186,0.04), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover { border-color: var(--primary-light); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .feature-card:hover::before { opacity: 1; }
        .feature-card.wa-card { border-color: rgba(37,211,102,0.25); background: linear-gradient(135deg, #f0fff6, #fff); }
        .feature-card.wa-card:hover { border-color: var(--wa); box-shadow: 0 8px 40px rgba(37,211,102,0.15); }
        .feature-icon {
          font-size: 36px; margin-bottom: 20px;
          width: 64px; height: 64px; border-radius: 16px;
          background: rgba(8,99,186,0.08); display: flex; align-items: center; justify-content: center;
        }
        .feature-icon.wa-icon { background: rgba(37,211,102,0.12); }
        .feature-title { font-size: 18px; font-weight: 700; color: var(--dark); margin-bottom: 10px; }
        .feature-desc { font-size: 14px; color: #888; line-height: 1.7; }
        .wa-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(37,211,102,0.12); color: #1a9e4a;
          font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
          margin-top: 12px;
        }

        /* ── HOW IT WORKS ── */
        .hiw-section { padding: 80px 40px; background: var(--white); }
        .hiw-inner { max-width: 1000px; margin: 0 auto; }
        .hiw-steps {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
          margin-top: 56px;
        }
        .hiw-step { text-align: center; position: relative; }
        .hiw-step:not(:last-child)::after {
          content: '→';
          position: absolute; top: 30px;
          ${isAr ? "left" : "right"}: -20px;
          font-size: 20px; color: var(--primary-light);
        }
        .hiw-num {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--primary); color: var(--white);
          font-size: 24px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px; box-shadow: 0 8px 24px rgba(8,99,186,0.25);
        }
        .hiw-num.wa-num {
          background: var(--wa); box-shadow: 0 8px 24px rgba(37,211,102,0.3);
        }
        .hiw-title { font-size: 16px; font-weight: 700; color: var(--dark); margin-bottom: 10px; }
        .hiw-desc { font-size: 13px; color: #888; line-height: 1.7; }
        .hiw-wa-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(37,211,102,0.1); color: #1a9e4a;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
          margin-top: 10px;
        }

        /* ── CTA ── */
        .cta-section {
          padding: 100px 40px;
          background: linear-gradient(135deg, var(--primary) 0%, #054a8c 100%);
          text-align: center; position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: ''; position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .cta-content { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
        .cta-title { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--white); margin-bottom: 16px; }
        .cta-sub { font-size: 17px; color: rgba(255,255,255,0.8); margin-bottom: 40px; line-height: 1.6; }

        /* ── FOOTER ── */
        .footer {
          background: var(--dark); color: rgba(255,255,255,0.7);
          padding: 40px; text-align: center;
        }
        .footer-logo { font-size: 24px; font-weight: 800; color: var(--white); margin-bottom: 8px; display:flex; align-items:center; justify-content:center; gap:10px; }
        .footer-tagline { font-size: 14px; margin-bottom: 20px; }
        .footer-copy { font-size: 13px; color: rgba(255,255,255,0.4); }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .hiw-steps { grid-template-columns: repeat(2, 1fr); }
          .hiw-step:nth-child(2)::after { display: none; }
          .hiw-step:nth-child(4)::after { display: none; }
        }
        @media (max-width: 768px) {
          .nav { padding: 14px 20px; }
          .nav.scrolled { padding: 10px 20px; }
          .nav-links { display: none; }
          .hero { padding: 100px 20px 60px; }
          .stats-grid { grid-template-columns: repeat(2,1fr); }
          .features-grid { grid-template-columns: 1fr; }
          .hiw-steps { grid-template-columns: 1fr; gap: 24px; }
          .hiw-step::after { display: none !important; }
          .stats-section { padding: 0 20px 60px; }
          .features-section { padding: 60px 20px; }
          .mockup-stats-row { flex-direction: column; }
        }
      `}</style>

      <div style={{ fontFamily: "'Rubik', sans-serif", direction: isAr ? "rtl" : "ltr" }}>

        {/* ── NAVBAR ── */}
        <nav className={`nav${scrolled ? " scrolled" : ""}`}>
          {/* Fix 4: SVG Logo */}
          <a href="#" className="nav-logo">
            <div className="nav-logo-icon">{LOGO_SVG}</div>
            <div>
              <span className="nav-logo-text">{isAr ? "نبض" : "NABD"}</span>
              <span className="nav-logo-sub">Clinic Manager</span>
            </div>
          </a>
          <ul className="nav-links">
            <li><a href="#features">{t.nav.features}</a></li>
            <li><a href="#how">{t.nav.about}</a></li>
            <li><a href="#cta">{t.nav.contact}</a></li>
          </ul>
          <div className="nav-right">
            <button className="lang-toggle" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
            <a href="/login" style={{ textDecoration: "none" }}>
              <span className="nav-cta" style={{
                background: "var(--primary)", color: "#fff", borderRadius: "10px",
                padding: "9px 22px", fontWeight: 600, fontSize: 15,
                boxShadow: "0 4px 12px rgba(8,99,186,0.25)", display: "inline-block"
              }}>
                {t.nav.login}
              </span>
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />
          <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="hero-content">
              <div className="hero-badge">
                <span></span>
                {t.hero.badge}
              </div>
              <h1 className="hero-title">
                {t.hero.title1}<br />
                <span>{t.hero.title2}</span>
              </h1>
              <p className="hero-subtitle">{t.hero.subtitle}</p>
              <div className="hero-btns">
                {/* Fix 5: WhatsApp link for "ابدأ الآن" */}
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-wa">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  {t.hero.cta}
                </a>
                {/* Fix 6: YouTube placeholder link */}
                <a href={YT_LINK} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
                  </svg>
                  {t.hero.demo}
                </a>
              </div>
            </div>

            {/* Mockup */}
            <div className="hero-visual">
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: "#ff5f57" }} />
                  <div className="mockup-dot" style={{ background: "#ffbd2e" }} />
                  <div className="mockup-dot" style={{ background: "#28c840" }} />
                  <div style={{ flex: 1, height: 20, background: "#eee", borderRadius: 6, marginLeft: 12, marginRight: 12 }} />
                </div>
                <div className="mockup-body">
                  <div className="mockup-stats-row">
                    <div className="mockup-stat">
                      <div className="mockup-stat-val">24</div>
                      <div className="mockup-stat-lbl">{isAr ? "موعد اليوم" : "Today's Appts"}</div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-val">142</div>
                      <div className="mockup-stat-lbl">{isAr ? "مريض مسجل" : "Patients"}</div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-val" style={{ color: "#2e7d32" }}>3,200</div>
                      <div className="mockup-stat-lbl">{isAr ? "إيرادات الشهر" : "Monthly Revenue"}</div>
                    </div>
                  </div>
                  {[
                    { initials: "KO", color: "#0863ba", name: isAr ? "خالد عثمان" : "Khalid Othman",   detail: isAr ? "10:00 صباحاً • متابعة"   : "10:00 AM • Follow-up", badge: "scheduled" },
                    { initials: "FH", color: "#2e7d32", name: isAr ? "فاطمة حسن" : "Fatima Hassan",    detail: isAr ? "11:30 صباحاً • فحص عام"  : "11:30 AM • General",   badge: "paid" },
                    { initials: "AA", color: "#c0392b", name: isAr ? "أحمد علي"   : "Ahmed Ali",        detail: isAr ? "2:00 مساءً • سكري"       : "2:00 PM • Diabetes",   badge: "scheduled" },
                  ].map((p) => (
                    <div className="mockup-card" key={p.initials}>
                      <div className="mockup-avatar" style={{ background: p.color }}>{p.initials}</div>
                      <div className="mockup-info">
                        <div className="mockup-name">{p.name}</div>
                        <div className="mockup-detail">{p.detail}</div>
                      </div>
                      <div className={p.badge === "paid" ? "mockup-badge-green" : "mockup-badge-blue"}>
                        {p.badge === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "محدد" : "Scheduled")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS — Fix 2: English numbers ── */}
        <div className="stats-section">
          <div className="stats-grid">
            {t.stats.map((s, i) => (
              <div className="stat-item" key={i}>
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES — Fix 1: span bug fixed | Fix 7: WhatsApp card ── */}
        <section className="features-section" id="features">
          <div className="section-header">
            {/* Fix 1: title split into plain text + highlighted word — no dangerouslySetInnerHTML */}
            <h2 className="section-title">
              {t.features.title} <span>{t.features.titleHighlight}</span>
            </h2>
            <p className="section-sub">{t.features.subtitle}</p>
          </div>
          <div className="features-grid">
            {t.features.items.map((f: any, i) => (
              <div className={`feature-card${f.whatsapp ? " wa-card" : ""}`} key={i}>
                <div className={`feature-icon${f.whatsapp ? " wa-icon" : ""}`}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                {f.whatsapp && (
                  <div className="wa-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS — Fix 3: 4th WhatsApp step ── */}
        <section className="hiw-section" id="how">
          <div className="hiw-inner">
            <div className="section-header">
              <h2 className="section-title">{t.howItWorks.title}</h2>
              <p className="section-sub">{t.howItWorks.subtitle}</p>
            </div>
            <div className="hiw-steps">
              {t.howItWorks.steps.map((s: any, i) => (
                <div className="hiw-step" key={i}>
                  <div className={`hiw-num${s.whatsapp ? " wa-num" : ""}`}>{s.num}</div>
                  <h3 className="hiw-title">{s.title}</h3>
                  <p className="hiw-desc">{s.desc}</p>
                  {s.whatsapp && (
                    <div className="hiw-wa-tag">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                      </svg>
                      WhatsApp
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="cta-section" id="cta">
          <div className="cta-content">
            <h2 className="cta-title">{t.cta.title}</h2>
            <p className="cta-sub">{t.cta.subtitle}</p>
            {/* Fix 5: WhatsApp CTA */}
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-wa">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              {t.cta.btn}
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-logo">
            <div style={{ width: 32, height: 32 }}>{LOGO_SVG}</div>
            {isAr ? "نبض" : "NABD"}
          </div>
          <p className="footer-tagline">{t.footer.tagline}</p>
          <p className="footer-copy">{t.footer.copy}</p>
        </footer>

      </div>
    </>
  );
}
