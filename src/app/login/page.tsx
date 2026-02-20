"use client";

import { useState } from "react";

// ============================================================
// NABD - نبض | Login Page
// ============================================================

export default function LoginPage() {
  const [lang, setLang] = useState("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const isAr = lang === "ar";

  const t = {
    ar: {
      welcome: "مرحباً بعودتك",
      sub: "سجّل الدخول لإدارة عيادتك",
      emailLabel: "البريد الإلكتروني أو اسم المستخدم",
      emailPlaceholder: "أدخل بريدك الإلكتروني",
      passLabel: "كلمة المرور",
      passPlaceholder: "أدخل كلمة المرور",
      btn: "تسجيل الدخول",
      loading: "جارٍ الدخول...",
      errorMsg: "بيانات الدخول غير صحيحة. حاول مجدداً.",
      backToSite: "العودة للصفحة الرئيسية",
      copyright: "© ٢٠٢٦ نبض - جميع الحقوق محفوظة",
    },
    en: {
      welcome: "Welcome Back",
      sub: "Sign in to manage your clinic",
      emailLabel: "Email or Username",
      emailPlaceholder: "Enter your email",
      passLabel: "Password",
      passPlaceholder: "Enter your password",
      btn: "Sign In",
      loading: "Signing in...",
      errorMsg: "Invalid credentials. Please try again.",
      backToSite: "Back to homepage",
      copyright: "© 2026 NABD - All rights reserved",
    },
  };

  const tr = t[lang];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Auth logic will be connected to Supabase here
    setTimeout(() => {
      setLoading(false);
      setError(tr.errorMsg);
    }, 1500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --primary: #0863ba;
          --primary-light: #a4c4e4;
          --bg: #f2f2f2;
          --dark: #353535;
          --accent: #ffb5b5;
          --white: #ffffff;
        }

        body {
          font-family: 'Rubik', sans-serif;
          background: var(--bg);
          direction: ${isAr ? "rtl" : "ltr"};
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* LEFT PANEL */
        .left-panel {
          background: linear-gradient(155deg, #0863ba 0%, #054a8c 60%, #03346e 100%);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 40px;
          position: relative; overflow: hidden;
        }
        .left-panel::before {
          content: '';
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='white' stroke-width='0.3' stroke-opacity='0.1'/%3E%3C/svg%3E") repeat;
        }
        .panel-blob {
          position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.15;
        }
        .panel-blob-1 { width: 300px; height: 300px; background: #a4c4e4; top: -50px; left: -50px; }
        .panel-blob-2 { width: 200px; height: 200px; background: #ffb5b5; bottom: 40px; right: -30px; }

        .panel-content { position: relative; z-index: 1; text-align: center; color: white; }
        .panel-logo {
          width: 72px; height: 72px; background: rgba(255,255,255,0.15);
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin: 0 auto 24px;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(8px);
        }
        .panel-app-name {
          font-size: 42px; font-weight: 800; letter-spacing: -1px; margin-bottom: 6px;
        }
        .panel-tagline {
          font-size: 15px; opacity: 0.75; margin-bottom: 48px; font-weight: 400;
        }
        .panel-features { text-align: ${isAr ? "right" : "left"}; }
        .panel-feature {
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 20px;
        }
        .panel-feature-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
          flex-shrink: 0;
        }
        .panel-feature-text { font-size: 15px; opacity: 0.85; font-weight: 400; }

        /* RIGHT PANEL */
        .right-panel {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 60px;
          background: var(--bg);
          position: relative;
        }
        .top-bar {
          position: absolute; top: 24px;
          ${isAr ? "left" : "right"}: 24px;
          display: flex; align-items: center; gap: 12px;
        }
        .lang-btn {
          background: var(--white); border: 1.5px solid #ddd;
          color: var(--dark); border-radius: 8px;
          padding: 6px 14px; font-family: 'Rubik', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .lang-btn:hover { border-color: var(--primary); color: var(--primary); }
        .back-link {
          font-size: 13px; color: #999; text-decoration: none;
          display: flex; align-items: center; gap: 6px;
          transition: color 0.2s;
        }
        .back-link:hover { color: var(--primary); }

        .form-container { width: 100%; max-width: 400px; }

        .form-title {
          font-size: 28px; font-weight: 800; color: var(--dark);
          margin-bottom: 8px;
        }
        .form-sub {
          font-size: 15px; color: #888; margin-bottom: 36px; font-weight: 400;
        }

        .field { margin-bottom: 20px; }
        .field-label {
          display: block; font-size: 13px; font-weight: 600;
          color: var(--dark); margin-bottom: 8px;
        }
        .field-input-wrap { position: relative; }
        .field-input {
          width: 100%; padding: 13px 16px;
          border: 1.5px solid #e0e0e0; border-radius: 12px;
          font-family: 'Rubik', sans-serif; font-size: 15px;
          color: var(--dark); background: var(--white);
          transition: all 0.2s; outline: none;
        }
        .field-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(8,99,186,0.1);
        }
        .field-input::placeholder { color: #bbb; }
        .show-pass {
          position: absolute; top: 50%; transform: translateY(-50%);
          ${isAr ? "left" : "right"}: 14px;
          background: none; border: none; cursor: pointer;
          font-size: 16px; color: #aaa; padding: 4px;
          transition: color 0.2s;
        }
        .show-pass:hover { color: var(--primary); }

        .error-box {
          background: rgba(255,181,181,0.2); border: 1.5px solid rgba(255,181,181,0.6);
          border-radius: 10px; padding: 12px 16px;
          font-size: 13px; color: #c0392b;
          margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }

        .submit-btn {
          width: 100%; padding: 14px;
          background: var(--primary); color: var(--white);
          border: none; border-radius: 12px;
          font-family: 'Rubik', sans-serif; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: all 0.25s;
          box-shadow: 0 6px 20px rgba(8,99,186,0.25);
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #054a8c; transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(8,99,186,0.35);
        }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .spinner {
          width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .footer-note {
          text-align: center; font-size: 12px; color: #bbb; margin-top: 32px;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .page { grid-template-columns: 1fr; }
          .left-panel { display: none; }
          .right-panel { padding: 80px 24px 40px; }
        }
      `}</style>

      <div
        className="page"
        style={{ fontFamily: "'Rubik', sans-serif", direction: isAr ? "rtl" : "ltr" }}
      >
        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="panel-blob panel-blob-1" />
          <div className="panel-blob panel-blob-2" />
          <div className="panel-content">
            <div className="panel-logo">💗</div>
            <div className="panel-app-name">{isAr ? "نبض" : "NABD"}</div>
            <div className="panel-tagline">
              {isAr ? "نبض عيادتك في يدك" : "Your Clinic's Pulse in Your Hands"}
            </div>
            <div className="panel-features">
              {[
                { icon: "👥", text: isAr ? "إدارة كاملة لملفات المرضى" : "Complete patient record management" },
                { icon: "📅", text: isAr ? "جدولة المواعيد بذكاء" : "Smart appointment scheduling" },
                { icon: "💳", text: isAr ? "تتبع المدفوعات والفواتير" : "Payment and billing tracking" },
                { icon: "🔔", text: isAr ? "تنبيهات تلقائية للمواعيد" : "Automatic appointment reminders" },
              ].map((f, i) => (
                <div className="panel-feature" key={i}>
                  <div className="panel-feature-icon">{f.icon}</div>
                  <span className="panel-feature-text">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="top-bar">
            <a href="/" className="back-link">
              {isAr ? "→" : "←"} {tr.backToSite}
            </a>
            <button className="lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
          </div>

          <div className="form-container">
            <h1 className="form-title">{tr.welcome}</h1>
            <p className="form-sub">{tr.sub}</p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-box">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="field">
                <label className="field-label">{tr.emailLabel}</label>
                <div className="field-input-wrap">
                  <input
                    type="text"
                    className="field-input"
                    placeholder={tr.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">{tr.passLabel}</label>
                <div className="field-input-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    className="field-input"
                    placeholder={tr.passPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: isAr ? "44px" : undefined, paddingRight: !isAr ? "44px" : undefined }}
                    required
                  />
                  <button
                    type="button"
                    className="show-pass"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <div className="spinner" />
                    {tr.loading}
                  </>
                ) : (
                  tr.btn
                )}
              </button>
            </form>

            <p className="footer-note">{tr.copyright}</p>
          </div>
        </div>
      </div>
    </>
  );
}
