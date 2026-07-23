"use client";
// ============================================================
// NABD - نبض | دخول المريض للكشف عن بُعد (بدون تسجيل)
// Route: /visit/[id]  — id = رقم الموعد
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import VideoRoom from "@/components/VideoRoom";

const BRAND = { primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc" };

export default function PatientVisitPage() {
  const params = useParams();
  const apptId = Number(params?.id);

  const [phase, setPhase] = useState<"loading" | "waiting" | "ready" | "error">("loading");
  const [roomUrl, setRoomUrl] = useState("");
  const [token, setToken] = useState("");
  const [joining, setJoining] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [name, setName] = useState("");
  const [entered, setEntered] = useState(false);

  const isAr = true; // بوابة المريض بالعربية افتراضياً

  const check = useCallback(async () => {
    try {
      const res = await fetch(`/api/video/room?appt=${apptId}`);
      const json = (await res.json()) as { ok?: boolean; waiting?: boolean; ready?: boolean; clinicName?: string; error?: string };
      if (!json.ok) { setPhase("error"); return; }
      setClinicName(json.clinicName ?? "");
      if (json.waiting) { setPhase("waiting"); }
      else if (json.ready) { setPhase("ready"); }
    } catch { setPhase("error"); }
  }, [apptId]);

  useEffect(() => { if (apptId) void check(); }, [apptId, check]);

  // أثناء الانتظار: نتحقق كل 5 ثوانٍ حتى يبدأ الطبيب
  useEffect(() => {
    if (phase !== "waiting") return;
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [phase, check]);

  const card: React.CSSProperties = { maxWidth: 440, width: "100%", background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 22, padding: "34px 28px", textAlign: "center", boxShadow: "0 12px 40px rgba(8,99,186,.1)" };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "'Rubik',sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');`}</style>

      {/* ترويسة */}
      <div style={{ textAlign: "center", padding: "22px 0 14px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.primary }}>نبض</div>
        <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 3 }}>كشف عن بُعد</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: entered && phase === "ready" ? "stretch" : "center", justifyContent: "center", padding: 16 }}>
        {phase === "loading" && <div style={{ color: BRAND.muted }}>جارٍ التحميل...</div>}

        {phase === "error" && (
          <div style={card}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 14.5, color: BRAND.ink, lineHeight: 1.9 }}>تعذّر الوصول إلى الموعد. تأكد من صحة الرابط أو تواصل مع العيادة.</p>
          </div>
        )}

        {phase === "waiting" && (
          <div style={card}>
            <div style={{ width: 64, height: 64, margin: "0 auto 18px", borderRadius: "50%", border: `4px solid ${BRAND.bg}`, borderTopColor: BRAND.primary, animation: "vSpin 1s linear infinite" }} />
            <style>{`@keyframes vSpin{to{transform:rotate(360deg)}}`}</style>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: BRAND.ink }}>غرفة الانتظار</h2>
            <p style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.9 }}>
              {clinicName ? `${clinicName} — ` : ""}سيبدأ الطبيب الكشف قريباً. يرجى البقاء في هذه الصفحة، وسيتم إدخالك تلقائياً.
            </p>
          </div>
        )}

        {phase === "ready" && !entered && (
          <div style={card}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎥</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: BRAND.ink }}>الطبيب جاهز</h2>
            <p style={{ fontSize: 13.5, color: BRAND.muted, lineHeight: 1.8, marginBottom: 18 }}>
              {clinicName ? `${clinicName}. ` : ""}أدخل اسمك ثم انضم للكشف.
            </p>
            <input
              value={name} onChange={e => setName(e.target.value)} placeholder="اسمك"
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${BRAND.border}`, fontFamily: "'Rubik',sans-serif", fontSize: 15, textAlign: "center", background: "#fbfdff", outline: "none", marginBottom: 14 }}
            />
            <button
              onClick={async () => {
                if (!name.trim() || joining) return;
                setJoining(true);
                try {
                  const res = await fetch(`/api/video/room?appt=${apptId}&name=${encodeURIComponent(name.trim())}`);
                  const j = (await res.json()) as { ok?: boolean; roomUrl?: string; token?: string };
                  if (j.ok && j.roomUrl) { setRoomUrl(j.roomUrl); setToken(j.token ?? ""); setEntered(true); }
                } catch { /* ignore */ }
                setJoining(false);
              }}
              disabled={!name.trim() || joining}
              style={{ width: "100%", background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontFamily: "'Rubik',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: name.trim() ? 1 : .6 }}
            >
              {joining ? "جارٍ الدخول..." : "انضمّ الآن"}
            </button>
          </div>
        )}

        {phase === "ready" && entered && (
          <div style={{ width: "100%", maxWidth: 1000, height: "calc(100vh - 120px)" }}>
            <VideoRoom roomUrl={roomUrl} token={token} displayName={name} lang="ar" onLeave={() => setEntered(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
