"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Lang = "ar" | "en";

export default function PharmacyLogin() {
  const [lang, setLang] = useState<Lang>("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPass, setShowPass] = useState(false);

  const isAr = lang === "ar";

  // ── التحقق من أن user_id مرتبط بصيدلية ──────────────────
  // يبحث أولاً في user_metadata ثم في جدول clinics كـ fallback
  const checkIsPharmacy = async (userId: string, meta: Record<string, unknown>): Promise<boolean> => {
    // 1) التحقق من user_metadata (المفتاح الصحيح الذي يحفظه الأدمن)
    if (
      meta?.account_type === "pharmacy" ||
      meta?.pharmacy_role ||
      meta?.type === "pharmacy"
    ) return true;

    // 2) fallback: البحث في جدول clinics مباشرة
    const { data } = await supabase
      .from("clinics")
      .select("account_type")
      .eq("user_id", userId)
      .single();

    return data?.account_type === "pharmacy";
  };

  // التحقق من وجود جلسة نشطة
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // نتأكد أن الجلسة الموجودة هي فعلاً لصيدلية قبل أي redirect
        const isPharmacy = await checkIsPharmacy(session.user.id, session.user.user_metadata);
        if (isPharmacy) {
          window.location.href = "/pharmacy";
          return;
        }
        // جلسة موجودة لكن ليست صيدلية → نعرض صفحة تسجيل الدخول
      }
      setCheckingSession(false);
    });
  }, []);

  const doLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(isAr ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter email and password");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr || !data?.user) {
      setError(isAr ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password");
      setLoading(false);
      return;
    }

    // التحقق أن الحساب مرتبط بصيدلية (metadata + fallback من جدول clinics)
    const isPharmacy = await checkIsPharmacy(data.user.id, data.user.user_metadata);

    if (!isPharmacy) {
      await supabase.auth.signOut();
      setError(
        isAr
          ? "هذا الحساب غير مرتبط بصيدلية. إذا كنت تبحث عن دخول العيادات، توجه إلى nabd.clinic/login"
          : "This account is not linked to a pharmacy. For clinic access, visit nabd.clinic/login"
      );
      setLoading(false);
      return;
    }

    // ✅ نجاح → توجيه لصفحة الصيدلية
    window.location.href = "/pharmacy";
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doLogin();
  };

  if (checkingSession) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f0f4f8", fontFamily: "'Rubik', sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36, border: "3px solid #dde3ea",
            borderTopColor: "#0863ba", borderRadius: "50%",
            animation: "spin .8s linear infinite", margin: "0 auto 12px"
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ fontSize: 13, color: "#9aabb8" }}>
            {lang === "ar" ? "جاري التحقق..." : "Checking session..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideRight { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-12px) rotate(3deg); } }
        @keyframes floatSlow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: .7; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .login-card {
          animation: fadeIn .55s cubic-bezier(.34,1.3,.64,1) both;
        }

        .pill-input {
          width: 100%;
          padding: 13px 16px;
          border: 2px solid #dde5ef;
          border-radius: 13px;
          font-family: 'Rubik', sans-serif;
          font-size: 14px;
          color: #1a2840;
          background: #fff;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          direction: ltr;
        }
        .pill-input:focus {
          border-color: #0863ba;
          box-shadow: 0 0 0 4px rgba(8,99,186,.1);
        }
        .pill-input.err {
          border-color: #e74c3c;
          box-shadow: 0 0 0 4px rgba(231,76,60,.1);
        }

        .sign-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #0558a8, #0863ba, #1278d4);
          background-size: 200% auto;
          color: #fff;
          border: none;
          border-radius: 13px;
          font-family: 'Rubik', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all .25s;
          box-shadow: 0 6px 20px rgba(8,99,186,.35);
          position: relative;
          overflow: hidden;
        }
        .sign-btn:not(:disabled):hover {
          background-position: right center;
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(8,99,186,.45);
        }
        .sign-btn:not(:disabled):active { transform: translateY(0); }
        .sign-btn:disabled { opacity: .65; cursor: not-allowed; }

        .lang-btn {
          background: rgba(255,255,255,.15);
          border: 1.5px solid rgba(255,255,255,.3);
          color: #fff;
          border-radius: 8px;
          padding: 5px 12px;
          font-family: 'Rubik', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
        }
        .lang-btn:hover {
          background: rgba(255,255,255,.25);
        }

        .show-pass-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #9aabb8;
          font-size: 16px;
          padding: 0 4px;
          transition: color .15s;
          display: flex;
          align-items: center;
        }
        .show-pass-btn:hover { color: #0863ba; }

        .bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        .pill-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .3px;
        }

        @media (max-width: 600px) {
          .split-layout { flex-direction: column !important; }
          .brand-panel { display: none !important; }
          .login-card { border-radius: 0 !important; min-height: 100vh !important; }
        }
      `}</style>

      <div
        className="split-layout"
        style={{
          minHeight: "100vh",
          display: "flex",
          fontFamily: "'Rubik', sans-serif",
          direction: isAr ? "rtl" : "ltr",
          background: "#f0f4f8",
        }}
      >
        {/* ═══ اللوحة اليسارية (البراند) ═══ */}
        <div
          className="brand-panel"
          style={{
            flex: "0 0 44%",
            background: "linear-gradient(160deg, #051c3a 0%, #083a7a 45%, #0863ba 100%)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 40px",
          }}
        >
          {/* خلفية ديكورية */}
          <div className="bg-blob" style={{ width: 320, height: 320, background: "rgba(26,143,227,.25)", top: -80, left: isAr ? "auto" : -60, right: isAr ? -60 : "auto" }} />
          <div className="bg-blob" style={{ width: 240, height: 240, background: "rgba(8,99,186,.3)", bottom: 40, right: isAr ? "auto" : 20, left: isAr ? 20 : "auto" }} />
          <div className="bg-blob" style={{ width: 160, height: 160, background: "rgba(39,174,96,.15)", top: "50%", left: "50%" }} />

          {/* نقاط شبكية */}
          <div style={{
            position: "absolute", inset: 0, opacity: .07,
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }} />

          {/* المحتوى */}
          <div style={{ position: "relative", zIndex: 1, textAlign: "center", color: "#fff", animation: "slideRight .6s cubic-bezier(.34,1.2,.64,1) both" }}>
            {/* أيقونة نبض */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
              <div style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                background: "rgba(255,255,255,.15)",
                animation: "pulse-ring 2.2s ease-out infinite",
              }} />
              <div style={{
                width: 96, height: 96, borderRadius: 26,
                background: "rgba(255,255,255,.18)",
                backdropFilter: "blur(12px)",
                border: "2px solid rgba(255,255,255,.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 46,
                boxShadow: "0 16px 48px rgba(0,0,0,.3)",
                animation: "float 4s ease-in-out infinite",
              }}>
                💊
              </div>
            </div>

            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>نبض</div>
            <div style={{ fontSize: 15, fontWeight: 300, letterSpacing: 4, opacity: .75, marginBottom: 32, textTransform: "uppercase" }}>NABD</div>

            <div style={{
              background: "rgba(255,255,255,.12)",
              backdropFilter: "blur(10px)",
              border: "1.5px solid rgba(255,255,255,.2)",
              borderRadius: 18,
              padding: "22px 28px",
              marginBottom: 28,
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {isAr ? "نظام إدارة الصيدلية" : "Pharmacy Management"}
              </div>
              <div style={{ fontSize: 12, opacity: .7, lineHeight: 1.7 }}>
                {isAr
                  ? "إدارة متكاملة للمخزون، المبيعات، الوصفات الطبية والتقارير"
                  : "Complete management for inventory, sales, prescriptions & reports"}
              </div>
            </div>

            {/* ميزات */}
            {[
              { icon: "🗄️", ar: "إدارة المخزون الذكية", en: "Smart Inventory" },
              { icon: "📋", ar: "مزامنة الوصفات الطبية", en: "Prescription Sync" },
              { icon: "📊", ar: "تقارير وتحليلات فورية", en: "Real-time Analytics" },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 12, marginBottom: 10, textAlign: isAr ? "right" : "left",
                  animation: `fadeIn .5s ${.2 + i * .1}s both`,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 13, opacity: .85 }}>{isAr ? f.ar : f.en}</span>
              </div>
            ))}

            <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 18 }}>
              <div
                className="pill-tag"
                style={{ background: "rgba(39,174,96,.25)", color: "#7defa8", border: "1px solid rgba(39,174,96,.3)" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4cd96e", display: "inline-block", animation: "pulse-ring 1.5s infinite" }} />
                {isAr ? "مدعوم بـ Supabase Cloud" : "Powered by Supabase Cloud"}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ لوحة تسجيل الدخول ═══ */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          background: "#f7f9fc",
          position: "relative",
        }}>
          {/* زر اللغة */}
          <div style={{ position: "absolute", top: 20, right: isAr ? 20 : "auto", left: isAr ? "auto" : 20 }}>
            <button
              className="lang-btn"
              onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
              style={{ background: "rgba(8,99,186,.08)", border: "1.5px solid rgba(8,99,186,.18)", color: "#0863ba" }}
            >
              {isAr ? "EN" : "AR"}
            </button>
          </div>

          {/* رابط للعودة */}
          <div style={{ position: "absolute", top: 20, left: isAr ? 20 : "auto", right: isAr ? "auto" : 20 }}>
            <a
              href="/login"
              style={{
                fontSize: 11, color: "#9aabb8", textDecoration: "none",
                display: "flex", alignItems: "center", gap: 4,
                transition: "color .15s",
              }}
              onMouseOver={e => (e.currentTarget.style.color = "#0863ba")}
              onMouseOut={e => (e.currentTarget.style.color = "#9aabb8")}
            >
              {isAr ? "← دخول العيادات" : "Clinic Login →"}
            </a>
          </div>

          <div
            className="login-card"
            style={{
              width: "min(100%, 420px)",
              background: "#fff",
              borderRadius: 22,
              boxShadow: "0 8px 48px rgba(8,40,80,.1)",
              overflow: "hidden",
            }}
          >
            {/* هيدر الكارد */}
            <div style={{
              background: "linear-gradient(135deg, #0863ba, #1a8fe3)",
              padding: "26px 28px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
                border: "1.5px solid rgba(255,255,255,.3)",
                animation: "floatSlow 3.5s ease-in-out infinite",
              }}>
                💊
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
                  {isAr ? "دخول الصيدلية" : "Pharmacy Login"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                  {isAr ? "نظام نبض المتكامل" : "NABD Integrated System"}
                </div>
              </div>
              <div style={{ marginRight: isAr ? "auto" : 0, marginLeft: isAr ? 0 : "auto" }}>
                <div
                  className="pill-tag"
                  style={{
                    background: "rgba(255,255,255,.2)",
                    color: "rgba(255,255,255,.9)",
                    border: "1px solid rgba(255,255,255,.25)",
                    fontSize: 9,
                  }}
                >
                  💊 {isAr ? "صيدلية" : "Pharmacy"}
                </div>
              </div>
            </div>

            {/* النموذج */}
            <div style={{ padding: "28px 28px 24px" }}>
              {/* البريد الإلكتروني */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: "#5a6a7a",
                  display: "block", marginBottom: 7, letterSpacing: .3,
                }}>
                  {isAr ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <input
                  className={`pill-input${error ? " err" : ""}`}
                  type="email"
                  placeholder={isAr ? "pharmacy@example.com" : "pharmacy@example.com"}
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={handleKey}
                  autoComplete="email"
                />
              </div>

              {/* كلمة المرور */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: "#5a6a7a",
                  display: "block", marginBottom: 7, letterSpacing: .3,
                }}>
                  {isAr ? "كلمة المرور" : "Password"}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    className={`pill-input${error ? " err" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={handleKey}
                    autoComplete="current-password"
                    style={{ paddingLeft: isAr ? 16 : 44, paddingRight: isAr ? 44 : 16 }}
                  />
                  <button
                    className="show-pass-btn"
                    onClick={() => setShowPass(s => !s)}
                    style={{
                      position: "absolute",
                      top: "50%", transform: "translateY(-50%)",
                      right: isAr ? "auto" : 14, left: isAr ? 14 : "auto",
                    }}
                    tabIndex={-1}
                    type="button"
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* رسالة الخطأ */}
              {error && (
                <div style={{
                  background: "rgba(231,76,60,.07)",
                  border: "1.5px solid rgba(231,76,60,.2)",
                  borderRadius: 11,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 12,
                  color: "#c0392b",
                  fontWeight: 600,
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  animation: "fadeIn .2s ease",
                }}>
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* زر الدخول */}
              <button
                className="sign-btn"
                onClick={doLogin}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <span style={{
                      width: 16, height: 16, border: "2.5px solid rgba(255,255,255,.4)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      display: "inline-block", animation: "spin .7s linear infinite",
                    }} />
                    {isAr ? "جاري التحقق..." : "Signing in..."}
                  </span>
                ) : (
                  isAr ? "دخول النظام ←" : "Sign In →"
                )}
              </button>

              {/* فاصل */}
              <div style={{
                margin: "20px 0",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: "#eef0f3" }} />
                <div style={{ fontSize: 11, color: "#c0ccd8", fontWeight: 500 }}>
                  {isAr ? "صيدليات نبض فقط" : "Nabd Pharmacies Only"}
                </div>
                <div style={{ flex: 1, height: 1, background: "#eef0f3" }} />
              </div>

              {/* ملاحظة */}
              <div style={{
                background: "linear-gradient(135deg,rgba(8,99,186,.05),rgba(26,143,227,.04))",
                border: "1.5px solid rgba(8,99,186,.12)",
                borderRadius: 13,
                padding: "13px 15px",
                fontSize: 11,
                color: "#5a7a9a",
                lineHeight: 1.65,
              }}>
                <div style={{ fontWeight: 700, color: "#0863ba", marginBottom: 5, fontSize: 12 }}>
                  💡 {isAr ? "ملاحظة" : "Note"}
                </div>
                {isAr
                  ? "هذه الصفحة مخصصة لصيدليات نبض فقط. يتم إنشاء الحسابات من قِبل الإدمن. إذا كنت تبحث عن دخول العيادات، توجّه إلى "
                  : "This page is for Nabd pharmacies only. Accounts are created by admin. For clinic access, visit "}
                <a
                  href="/login"
                  style={{ color: "#0863ba", fontWeight: 700, textDecoration: "none" }}
                >
                  nabd.clinic/login
                </a>
              </div>
            </div>

            {/* فوتر */}
            <div style={{
              padding: "14px 28px",
              background: "#f7f9fc",
              borderTop: "1.5px solid #eef0f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontSize: 10, color: "#b0bec8" }}>
                © 2025 نبض · NABD
              </div>
              <div style={{
                fontSize: 10, color: "#b0bec8",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#27ae60", display: "inline-block",
                }} />
                {isAr ? "متصل بالخادم" : "Server connected"}
              </div>
            </div>
          </div>

          {/* مسار URL */}
          <div style={{
            marginTop: 18, fontSize: 11, color: "#b0bec8",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              background: "#eef3f8", padding: "2px 8px", borderRadius: 5,
              fontFamily: "monospace", fontSize: 10, color: "#7a9ab8",
              letterSpacing: .5,
            }}>
              nabd.clinic/pharmacy/login
            </span>
          </div>
        </div>
      </div>
    </>
  );
}