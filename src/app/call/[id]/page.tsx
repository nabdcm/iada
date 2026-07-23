"use client";
// ============================================================
// NABD - نبض | مكالمة الطبيب (Telemedicine)
// Route: /call/[id]  — id = رقم الموعد الأونلاين
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";
import VideoRoom from "@/components/VideoRoom";

const BRAND = { primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc", green: "#2e7d32", purple: "#7b2d8b" };

type Lang = "ar" | "en";

const T = {
  ar: {
    title: "كشف عن بُعد", patient: "المريض", back: "إنهاء والعودة",
    tabNotes: "ملاحظات", tabRx: "وصفة",
    notesPh: "اكتب ملاحظاتك أثناء الكشف...",
    diagnosis: "التشخيص", diagnosisPh: "التشخيص المبدئي",
    meds: "الأدوية", medsPh: "دواء واحد في كل سطر",
    saveNotes: "حفظ الملاحظات", saveRx: "حفظ وإرسال الوصفة",
    saved: "✓ تم الحفظ", savedRx: "✓ حُفظت الوصفة في ملف المريض",
    loading: "جارٍ التحضير...",
    notEnabled: "ميزة العيادة الأونلاين غير مفعّلة لعيادتك. تواصل مع إدارة نبض لتفعيلها.",
    notFound: "الموعد غير موجود أو ليس موعداً أونلاين.",
    err: "حدث خطأ، حاول مجدداً.",
  },
  en: {
    title: "Video Consultation", patient: "Patient", back: "End & Back",
    tabNotes: "Notes", tabRx: "Prescription",
    notesPh: "Write your notes during the visit...",
    diagnosis: "Diagnosis", diagnosisPh: "Preliminary diagnosis",
    meds: "Medications", medsPh: "One medication per line",
    saveNotes: "Save Notes", saveRx: "Save & Send Rx",
    saved: "✓ Saved", savedRx: "✓ Prescription saved to patient file",
    loading: "Preparing...",
    notEnabled: "Online clinic isn't enabled for your account. Contact NABD to enable it.",
    notFound: "Appointment not found or not an online visit.",
    err: "Something went wrong, try again.",
  },
};

export default function DoctorCallPage() {
  const params = useParams();
  const apptId = Number(params?.id);

  const [lang, setLang] = useState<Lang>("ar");
  const [phase, setPhase] = useState<"loading" | "ready" | "error" | "disabled">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [token, setToken] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");

  const [tab, setTab] = useState<"notes" | "rx">("notes");
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [meds, setMeds] = useState("");
  const [msg, setMsg] = useState("");
  const [savingN, setSavingN] = useState(false);
  const [savingRx, setSavingRx] = useState(false);

  const isAr = lang === "ar";
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "en") setLang("en");
  }, []);

  const init = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setPhase("error"); setErrMsg(T.ar.err); return; }
    setUserId(session.user.id);

    // اسم الطبيب + المريض
    const { data: appt } = await supabase
      .from("appointments").select("id, patient_id, is_online, notes").eq("id", apptId).maybeSingle();
    if (!appt || !appt.is_online) { setPhase("error"); setErrMsg(t.notFound); return; }
    setPatientId(appt.patient_id as number);
    if (appt.notes) setNotes(String(appt.notes));

    const [{ data: clinic }, { data: pat }] = await Promise.all([
      supabase.from("clinics").select("owner, name").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("patients").select("name").eq("id", appt.patient_id).maybeSingle(),
    ]);
    setDoctorName((clinic?.owner as string) || (clinic?.name as string) || "الطبيب");
    setPatientName((pat?.name as string) || "");

    // إنشاء/جلب الغرفة
    try {
      const res = await fetch("/api/video/room", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ appointmentId: apptId }),
      });
      const json = (await res.json()) as { ok?: boolean; roomUrl?: string; token?: string; error?: string };
      if (json.ok && json.roomUrl) { setRoomUrl(json.roomUrl); setToken(json.token ?? ""); setPhase("ready"); }
      else if (json.error === "feature_disabled") { setPhase("disabled"); }
      else if (json.error === "not_configured") { setPhase("error"); setErrMsg(isAr ? "خدمة الفيديو غير مهيأة. أضف مفتاح Daily في إعدادات الخادم." : "Video service not configured."); }
      else { setPhase("error"); setErrMsg(t.notFound); }
    } catch { setPhase("error"); setErrMsg(t.err); }
  }, [apptId, t]);

  useEffect(() => { if (apptId) void init(); }, [apptId, init]);

  async function saveNotes() {
    setSavingN(true); setMsg("");
    try {
      await supabase.from("appointments").update({ notes }).eq("id", apptId);
      setMsg(t.saved);
    } catch { setMsg(t.err); }
    setSavingN(false);
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveRx() {
    if (!patientId) return;
    setSavingRx(true); setMsg("");
    try {
      const medications = meds.split("\n").map(m => m.trim()).filter(Boolean);
      const { data: clinic } = await supabase.from("clinics").select("name").eq("user_id", userId).maybeSingle();
      await supabase.from("prescriptions").insert({
        patient_id: patientId,
        date: new Date().toISOString().slice(0, 10),
        diagnosis,
        notes: (isAr ? "كشف عن بُعد. " : "Telemedicine visit. ") + notes,
        medications: JSON.stringify(medications),
        doctor_name: doctorName,
        clinic_name: (clinic?.name as string) ?? "",
        user_id: userId,
      });
      setMsg(t.savedRx);
      setDiagnosis(""); setMeds("");
    } catch { setMsg(t.err); }
    setSavingRx(false);
    setTimeout(() => setMsg(""), 3000);
  }

  async function endCall() {
    try { await supabase.from("appointments").update({ call_status: "completed", call_ended_at: new Date().toISOString() }).eq("id", apptId); } catch { /* ignore */ }
    window.location.href = "/appointments";
  }

  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${BRAND.border}`, fontFamily: "'Rubik',sans-serif", fontSize: 13.5, color: BRAND.ink, background: "#fbfdff", outline: "none" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: "#4b5563", marginBottom: 6 };

  return (
    <AuthGuard>
      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <style>{`
          *{box-sizing:border-box}
          .call-wrap{display:grid;grid-template-columns:1fr 360px;gap:16px;padding:16px;height:100vh}
          @media(max-width:900px){
            .call-wrap{grid-template-columns:1fr;height:auto;min-height:100vh}
            .call-video{height:52vh!important}
            .call-panel{height:auto!important}
          }
        `}</style>

        {phase === "loading" && (
          <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.muted, fontSize: 15 }}>{t.loading}</div>
        )}

        {phase === "disabled" && (
          <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: 34 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <p style={{ fontSize: 14.5, color: BRAND.ink, lineHeight: 1.9, marginBottom: 20 }}>{t.notEnabled}</p>
              <a href="/appointments" style={{ color: BRAND.primary, fontWeight: 700, textDecoration: "none" }}>← {t.back}</a>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: 34 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <p style={{ fontSize: 14.5, color: BRAND.ink, lineHeight: 1.9, marginBottom: 20 }}>{errMsg || t.err}</p>
              <a href="/appointments" style={{ color: BRAND.primary, fontWeight: 700, textDecoration: "none" }}>← {t.back}</a>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="call-wrap">
            {/* الفيديو */}
            <div className="call-video" style={{ height: "calc(100vh - 32px)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.ink }}>🎥 {t.title}</div>
                  <div style={{ fontSize: 12.5, color: BRAND.muted }}>{t.patient}: {patientName || "—"}</div>
                </div>
                <button onClick={endCall}
                  style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {t.back}
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <VideoRoom roomUrl={roomUrl} token={token} displayName={doctorName} lang={lang} onLeave={endCall} />
              </div>
            </div>

            {/* اللوحة الجانبية */}
            <div className="call-panel" style={{ height: "calc(100vh - 32px)", background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: `1.5px solid ${BRAND.border}` }}>
                {(["notes", "rx"] as const).map(k => (
                  <button key={k} onClick={() => setTab(k)}
                    style={{ flex: 1, padding: "14px", border: "none", background: tab === k ? BRAND.bg : "#fff", color: tab === k ? BRAND.primary : BRAND.muted, fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer", borderBottom: tab === k ? `2px solid ${BRAND.primary}` : "2px solid transparent" }}>
                    {k === "notes" ? `📝 ${t.tabNotes}` : `💊 ${t.tabRx}`}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>
                {tab === "notes" ? (
                  <>
                    <label style={lbl}>{t.tabNotes}</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t.notesPh} style={{ ...inp, minHeight: 260, resize: "vertical" }} />
                    <button onClick={saveNotes} disabled={savingN}
                      style={{ width: "100%", marginTop: 14, background: BRAND.primary, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer", opacity: savingN ? .7 : 1 }}>
                      {t.saveNotes}
                    </button>
                  </>
                ) : (
                  <>
                    <label style={lbl}>{t.diagnosis}</label>
                    <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder={t.diagnosisPh} style={{ ...inp, marginBottom: 14 }} />
                    <label style={lbl}>{t.meds}</label>
                    <textarea value={meds} onChange={e => setMeds(e.target.value)} placeholder={t.medsPh} style={{ ...inp, minHeight: 180, resize: "vertical" }} />
                    <button onClick={saveRx} disabled={savingRx || !patientId}
                      style={{ width: "100%", marginTop: 14, background: `linear-gradient(135deg,${BRAND.purple},#a23bb5)`, color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer", opacity: savingRx ? .7 : 1 }}>
                      {t.saveRx}
                    </button>
                  </>
                )}
                {msg && <div style={{ marginTop: 12, textAlign: "center", fontSize: 12.5, fontWeight: 600, color: BRAND.green }}>{msg}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
