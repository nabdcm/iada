"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Login Page — مع Supabase Auth كامل
// ============================================================

type Lang = "ar" | "en";

const T = {
  ar: {
    welcome: "مرحباً بعودتك",
    sub: "سجّل الدخول لإدارة عيادتك",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    passLabel: "كلمة المرور",
    passPlaceholder: "أدخل كلمة المرور",
    btn: "تسجيل الدخول",
    loading: "جارٍ الدخول...",
    backToSite: "العودة للصفحة الرئيسية",
    copyright: "© ٢٠٢٦ نبض - جميع الحقوق محفوظة",
    errors: {
      invalid:   "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      network:   "تعذّر الاتصال. تحقق من الإنترنت وحاول مجدداً.",
      notFound:  "لا يوجد حساب بهذا البريد الإلكتروني.",
      unknown:   "حدث خطأ غير متوقع. حاول مجدداً.",
    },
    features: [
      { icon: "👥", text: "إدارة كاملة لملفات المرضى" },
      { icon: "📅", text: "جدولة المواعيد بذكاء" },
      { icon: "💳", text: "تتبع المدفوعات والفواتير" },
      { icon: "🔒", text: "بيانات آمنة ومشفّرة" },
    ],
  },
  en: {
    welcome: "Welcome Back",
    sub: "Sign in to manage your clinic",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    passLabel: "Password",
    passPlaceholder: "Enter your password",
    btn: "Sign In",
    loading: "Signing in...",
    backToSite: "Back to homepage",
    copyright: "© 2026 NABD — All rights reserved",
    errors: {
      invalid:   "Incorrect email or password.",
      network:   "Connection failed. Check your internet and try again.",
      notFound:  "No account found with this email.",
      unknown:   "An unexpected error occurred. Please try again.",
    },
    features: [
      { icon: "👥", text: "Complete patient record management" },
      { icon: "📅", text: "Smart appointment scheduling" },
      { icon: "💳", text: "Payment and billing tracking" },
      { icon: "🔒", text: "Secure and encrypted data" },
    ],
  },
} as const;

// المكوّن الداخلي — يستخدم useSearchParams داخل Suspense
function LoginContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? "/dashboard";

  const [lang, setLang]       = useState<Lang>("ar");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError]     = useState("");
  const [showPass, setShowPass] = useState(false);

  const isAr = lang === "ar";
  const tr   = T[lang];

  // إذا المستخدم مسجل مسبقاً → انتقل للـ dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo);
      else setChecking(false);
    });
  }, []);

  // ── تسجيل الدخول ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("password")) {
          setError(tr.errors.invalid);
        } else if (msg.includes("not found") || msg.includes("user")) {
          setError(tr.errors.notFound);
        } else if (msg.includes("network") || msg.includes("fetch")) {
          setError(tr.errors.network);
        } else {
          setError(tr.errors.unknown);
        }
        return;
      }

      // نجح تسجيل الدخول
      router.replace(redirectTo);

    } catch {
      setError(tr.errors.network);
    } finally {
      setLoading(false);
    }
  };

  // شاشة تحميل أثناء التحقق من الجلسة
  if (checking) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f2f2f2" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>💗</div>
          <div style={{ width:32,height:32,border:"3px solid #e0e0e0",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f2f2f2; direction: ${isAr ? "rtl" : "ltr"}; min-height: 100vh; }

        .page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }

        /* LEFT */
        .left-panel {
          background: linear-gradient(155deg, #0863ba 0%, #054a8c 60%, #03346e 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 40px; position: relative; overflow: hidden;
        }
        .left-panel::before {
          content: ''; position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='30' cy='30' r='25' fill='none' stroke='white' stroke-width='0.3' stroke-opacity='0.08'/%3E%3C/svg%3E") repeat;
        }
        .blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.15; }
        .blob-1 { width:300px; height:300px; background:#a4c4e4; top:-50px; ${isAr ? "right" : "left"}:-50px; }
        .blob-2 { width:200px; height:200px; background:#ffb5b5; bottom:40px; ${isAr ? "left" : "right"}:-30px; }

        .panel-content { position: relative; z-index: 1; text-align: center; color: white; }
        .panel-logo {
          width:72px; height:72px; background: rgba(255,255,255,0.15);
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin: 0 auto 24px;
          border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px);
        }
        .panel-name { font-size: 42px; font-weight: 800; letter-spacing:-1px; margin-bottom:6px; }
        .panel-tag  { font-size: 15px; opacity: 0.75; margin-bottom: 48px; font-weight:400; }
        .features { text-align: ${isAr ? "right" : "left"}; }
        .feature { display:flex; align-items:center; gap:14px; margin-bottom:20px; }
        .feature-icon {
          width:40px; height:40px; border-radius:10px;
          background:rgba(255,255,255,0.12);
          display:flex; align-items:center; justify-content:center;
          font-size:18px; flex-shrink:0;
        }
        .feature-text { font-size:15px; opacity:0.85; font-weight:400; }

        /* RIGHT */
        .right-panel {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px; background: #f2f2f2; position: relative;
        }
        .top-bar {
          position: absolute; top: 24px;
          ${isAr ? "left" : "right"}: 24px;
          display: flex; align-items: center; gap: 12px;
        }
        .lang-btn {
          background: #fff; border: 1.5px solid #ddd; color: #353535;
          border-radius: 8px; padding: 6px 14px;
          font-family: 'Rubik', sans-serif; font-size:13px; font-weight:600;
          cursor: pointer; transition: all .2s;
        }
        .lang-btn:hover { border-color: #0863ba; color: #0863ba; }
        .back-link { font-size:13px; color:#999; text-decoration:none; display:flex; align-items:center; gap:6px; transition:color .2s; }
        .back-link:hover { color: #0863ba; }

        .form-box { width:100%; max-width:400px; }
        .form-title { font-size:28px; font-weight:800; color:#353535; margin-bottom:8px; }
        .form-sub   { font-size:15px; color:#888; margin-bottom:36px; font-weight:400; }

        .field { margin-bottom: 20px; }
        .field-label { display:block; font-size:13px; font-weight:600; color:#353535; margin-bottom:8px; }
        .field-wrap  { position: relative; }
        .field-input {
          width:100%; padding:13px 16px;
          border:1.5px solid #e0e0e0; border-radius:12px;
          font-family:'Rubik',sans-serif; font-size:15px;
          color:#353535; background:#fff;
          transition:all .2s; outline:none;
        }
        .field-input:focus { border-color:#0863ba; box-shadow:0 0 0 3px rgba(8,99,186,.1); }
        .field-input::placeholder { color:#bbb; }
        .pass-toggle {
          position:absolute; top:50%; transform:translateY(-50%);
          ${isAr ? "left" : "right"}: 14px;
          background:none; border:none; cursor:pointer;
          font-size:16px; color:#aaa; padding:4px; transition:color .2s;
        }
        .pass-toggle:hover { color: #0863ba; }

        .error-box {
          background:rgba(255,181,181,.18); border:1.5px solid rgba(255,181,181,.6);
          border-radius:10px; padding:12px 16px; font-size:13px; color:#c0392b;
          margin-bottom:20px; display:flex; align-items:center; gap:8px;
          animation: shake .4s ease;
        }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-6px)}
          40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)}
          80%{transform:translateX(4px)}
        }

        .submit-btn {
          width:100%; padding:14px;
          background:#0863ba; color:#fff; border:none; border-radius:12px;
          font-family:'Rubik',sans-serif; font-size:16px; font-weight:700;
          cursor:pointer; transition:all .25s;
          box-shadow:0 6px 20px rgba(8,99,186,.25);
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .submit-btn:hover:not(:disabled) { background:#054a8c; transform:translateY(-2px); box-shadow:0 10px 28px rgba(8,99,186,.35); }
        .submit-btn:disabled { opacity:.7; cursor:not-allowed; transform:none; }

        .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .footer { text-align:center; font-size:12px; color:#bbb; margin-top:32px; }

        @media (max-width: 768px) {
          .page { grid-template-columns: 1fr; }
          .left-panel { display: none; }
          .right-panel { padding: 80px 24px 40px; }
        }
      `}</style>

      <div className="page" style={{ fontFamily:"'Rubik',sans-serif", direction:isAr?"rtl":"ltr" }}>

        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="panel-content">
            <div className="panel-logo">💗</div>
            <div className="panel-name">{isAr ? "نبض" : "NABD"}</div>
            <div className="panel-tag">{isAr ? "نبض عيادتك في يدك" : "Your Clinic's Pulse in Your Hands"}</div>
            <div className="features">
              {tr.features.map((f, i) => (
                <div className="feature" key={i}>
                  <div className="feature-icon">{f.icon}</div>
                  <span className="feature-text">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="right-panel">
          <div className="top-bar">
            <a href="/" className="back-link">
              {isAr ? "→" : "←"} {tr.backToSite}
            </a>
            <button className="lang-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
          </div>

          <div className="form-box">
            <h1 className="form-title">{tr.welcome}</h1>
            <p className="form-sub">{tr.sub}</p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="error-box" key={error}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Email */}
              <div className="field">
                <label className="field-label">{tr.emailLabel}</label>
                <div className="field-wrap">
                  <input
                    type="email"
                    className="field-input"
                    placeholder={tr.emailPlaceholder}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field">
                <label className="field-label">{tr.passLabel}</label>
                <div className="field-wrap">
                  <input
                    type={showPass ? "text" : "password"}
                    className="field-input"
                    placeholder={tr.passPlaceholder}
                    value={password}
                    onChange={e => setPass(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      paddingLeft:  isAr ? "44px" : undefined,
                      paddingRight: isAr ? undefined : "44px",
                    }}
                    required
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> {tr.loading}</>
                ) : (
                  tr.btn
                )}
              </button>
            </form>

            <p className="footer">{tr.copyright}</p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Export مع Suspense لحل مشكلة prerendering ───────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f2f2f2" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:16 }}>💗</div>
          <div style={{ width:32,height:32,border:"3px solid #e0e0e0",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
