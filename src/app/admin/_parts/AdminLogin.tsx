"use client";
// ============================================================
// src/app/admin/_parts/AdminLogin.tsx
// شاشة تسجيل دخول المدير — مستخرَجة من page.tsx
// ============================================================

import { useState } from "react";
import AppIcon from "@/components/AppIcon";
import { SESSION_KEY } from "./session";

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin-login", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        // حفظ flag بسيط في sessionStorage فقط للـ UI state (ليس للتحقق الأمني)
        sessionStorage.setItem(SESSION_KEY, "1");
        onSuccess();
      } else if (res.status === 503) {
        setError("بيانات دخول الأدمن غير مضبوطة على السيرفر. أضف NABD_ADMIN_USERNAME و NABD_ADMIN_PASSWORD في إعدادات Vercel ثم أعد النشر.");
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
        setPassword("");
      }
    } catch {
      setError("خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f0f4ff}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        .login-card{animation:fadeUp .5s cubic-bezier(.4,0,.2,1) both}
        .login-input{
          width:100%;padding:12px 16px;
          border:1.5px solid #e8eaed;border-radius:12px;
          font-family:'Rubik',sans-serif;font-size:14px;
          color:#353535;background:#fff;outline:none;
          transition:border .2s,box-shadow .2s;
        }
        .login-input:focus{border-color:#0863ba;box-shadow:0 0 0 3px rgba(8,99,186,.08)}
        .login-btn{
          width:100%;padding:13px;background:#0863ba;color:#fff;
          border:none;border-radius:12px;font-family:'Rubik',sans-serif;
          font-size:15px;font-weight:700;cursor:pointer;
          transition:all .2s;box-shadow:0 4px 16px rgba(8,99,186,.3);
        }
        .login-btn:hover:not(:disabled){background:#0752a0;box-shadow:0 6px 20px rgba(8,99,186,.4);transform:translateY(-1px)}
        .login-btn:active:not(:disabled){transform:translateY(0)}
        .login-btn:disabled{background:#93b8dc;cursor:not-allowed;box-shadow:none}
        .error-box{animation:shake .4s ease}
      `}</style>

      <div style={{
        minHeight:"100vh", background:"linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 50%,#f5f0ff 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Rubik',sans-serif", padding:"20px",
      }}>
        {/* خلفية زخرفية */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"rgba(8,99,186,.06)",filter:"blur(60px)" }}/>
          <div style={{ position:"absolute",bottom:"-10%",left:"-5%",width:500,height:500,borderRadius:"50%",background:"rgba(123,45,139,.04)",filter:"blur(80px)" }}/>
        </div>

        <div className="login-card" style={{
          background:"#fff", borderRadius:24, width:"100%", maxWidth:400,
          padding:"40px 36px", boxShadow:"0 24px 80px rgba(8,99,186,.12)",
          border:"1.5px solid rgba(8,99,186,.08)", position:"relative",
        }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,background:"rgba(8,99,186,.06)",borderRadius:20,marginBottom:14,border:"1.5px solid rgba(8,99,186,.1)" }}>
              <svg viewBox="0 0 337.74 393.31" style={{ width:48,height:48 }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="lg-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse"><stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/></linearGradient>
                  <linearGradient id="lg-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/></linearGradient>
                </defs>
                <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
                <path fill="url(#lg-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
                <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
                <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
                <path fill="url(#lg-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
              </svg>
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#353535", marginBottom:4 }}>نبض</h1>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background:"rgba(8,99,186,.06)", border:"1.5px solid rgba(8,99,186,.12)",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#0863ba", letterSpacing:.5 }}>ADMIN ACCESS</span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* خطأ */}
            {error && (
              <div className="error-box" style={{
                background:"rgba(192,57,43,.06)", border:"1.5px solid rgba(192,57,43,.2)",
                borderRadius:10, padding:"10px 14px", fontSize:13, color:"#c0392b",
                textAlign:"center", fontWeight:500,
              }}>
                <AppIcon glyph="⚠️" /> {error}
              </div>
            )}

            {/* اسم المستخدم */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                اسم المستخدم
              </label>
              <input
                className="login-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                autoFocus
                required
                style={{ direction:"ltr" }}
              />
            </div>

            {/* كلمة المرور */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                كلمة المرور
              </label>
              <div style={{ position:"relative" }}>
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                  style={{ direction:"ltr", paddingRight:44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16,
                    color:"#aaa", display:"flex", alignItems:"center",
                  }}
                ><AppIcon glyph={showPass ? "🙈" : "👁️"} /></button>
              </div>
            </div>

            {/* زر الدخول */}
            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop:6 }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/>
                  جاري التحقق...
                </span>
              ) : "دخول لوحة المدير →"}
            </button>
          </form>

          <p style={{ textAlign:"center", fontSize:11, color:"#ccc", marginTop:24 }}>
            هذه الصفحة مخصصة للمدير فقط
          </p>
        </div>
      </div>
    </>
  );
}

