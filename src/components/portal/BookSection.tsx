"use client";
// ============================================================
// BookSection — بحث المريض عن طبيب وحجز موعد مباشرةً من بوابته
// ينقل المريض إلى صفحة حجز العيادة مع تعبئة بياناته مسبقاً
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { CLINIC_TYPE_META } from "@/lib/clinicTypes";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6",
  sky: "#eaf3fc", green: "#2e7d32", ink: "#1c2b3a",
  muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

interface DoctorResult {
  user_id: string;
  clinic_name: string;
  doctor_name: string;
  clinic_type: string;
  phone: string | null;
  telemedicine: boolean;
  visited: boolean;
}

interface Props {
  patientName: string;
  patientPhone: string;
}

const TYPES = CLINIC_TYPE_META as Record<string, { ar: string; en: string; icon: string }>;

export default function BookSection({ patientName, patientPhone }: Props) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [results, setResults] = useState<DoctorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const search = useCallback(async (query: string, clinicType: string) => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams();
      if (query.trim().length >= 2) params.set("q", query.trim());
      if (clinicType) params.set("type", clinicType);
      const r = await fetch(`/api/portal/doctors?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) { setErr(json.error === "unauthorized" ? "انتهت الجلسة — أعد الدخول" : "تعذّر البحث"); setResults([]); }
      else setResults((json.results ?? []) as DoctorResult[]);
    } catch {
      setErr("تعذّر الاتصال");
    }
    setLoading(false);
  }, []);

  // تحميل أولي + تهدئة أثناء الكتابة
  useEffect(() => {
    const t = setTimeout(() => { void search(q, type); }, q ? 400 : 0);
    return () => clearTimeout(t);
  }, [q, type, search]);

  const bookUrl = (userId: string) => {
    const p = new URLSearchParams();
    if (patientName) p.set("name", patientName);
    if (patientPhone) p.set("phone", patientPhone);
    return `/book/${userId}?${p.toString()}`;
  };

  const typeOptions = useMemo(
    () => Object.entries(TYPES).map(([k, v]) => ({ key: k, ar: v.ar, icon: v.icon })),
    []
  );

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", direction: "rtl" }}>

      {/* البحث */}
      <div style={{
        background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
        padding: 18, marginBottom: 18, boxShadow: "0 4px 16px rgba(8,99,186,.05)",
      }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 8 }}>
          ابحث عن طبيبك أو عيادتك
        </label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="اكتب اسم الطبيب أو اسم العيادة..."
            style={{
              width: "100%", boxSizing: "border-box", padding: "13px 44px 13px 14px",
              borderRadius: 14, border: `1.5px solid #dbe4ef`, background: "#fbfdff",
              fontFamily: "'Rubik',sans-serif", fontSize: 14.5, color: BRAND.ink, outline: "none",
            }}
          />
          <span style={{
            position: "absolute", top: "50%", right: 15, transform: "translateY(-50%)",
            fontSize: 16, color: BRAND.muted, pointerEvents: "none",
          }}>🔍</span>
        </div>

        {/* تصفية بالتخصص */}
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
          <button onClick={() => setType("")}
            style={{
              flex: "0 0 auto", padding: "7px 15px", borderRadius: 20, cursor: "pointer",
              border: `1.5px solid ${type === "" ? BRAND.primary : BRAND.border}`,
              background: type === "" ? BRAND.primary : "#fff",
              color: type === "" ? "#fff" : BRAND.muted,
              fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
            }}>كل التخصصات</button>
          {typeOptions.map(t => (
            <button key={t.key} onClick={() => setType(type === t.key ? "" : t.key)}
              style={{
                flex: "0 0 auto", padding: "7px 15px", borderRadius: 20, cursor: "pointer",
                border: `1.5px solid ${type === t.key ? BRAND.primary : BRAND.border}`,
                background: type === t.key ? BRAND.sky : "#fff",
                color: type === t.key ? BRAND.primary : BRAND.muted,
                fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap",
              }}>{t.icon} {t.ar}</button>
          ))}
        </div>
      </div>

      {err && (
        <div style={{
          background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
          color: "#c0392b", borderRadius: 14, padding: "12px 16px",
          fontSize: 13, fontWeight: 600, marginBottom: 16,
        }}>{err}</div>
      )}

      {/* النتائج */}
      {loading ? (
        <div style={{
          background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
          padding: "50px 20px", textAlign: "center", color: "#c8d2dc", fontSize: 14,
        }}>جارٍ البحث...</div>
      ) : results.length === 0 ? (
        <div style={{
          background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
          padding: "50px 24px", textAlign: "center", boxShadow: "0 4px 16px rgba(8,99,186,.05)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>🔍</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: BRAND.ink, marginBottom: 6 }}>
            لا توجد نتائج
          </div>
          <div style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.8 }}>
            جرّب اسماً آخر، أو تأكد من أن عيادتك مشتركة في نبض وتتيح الحجز الإلكتروني.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {results.map(d => {
            const meta = TYPES[d.clinic_type] ?? TYPES.other;
            return (
              <div key={d.user_id} style={{
                background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
                padding: "16px 18px", boxShadow: "0 4px 16px rgba(8,99,186,.05)",
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 16, flexShrink: 0,
                  background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
                  color: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 22,
                }}>{meta?.icon ?? "🏥"}</div>

                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: BRAND.ink }}>
                      {d.doctor_name || d.clinic_name}
                    </span>
                    {d.visited && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: BRAND.green,
                        background: "rgba(46,125,50,.1)", borderRadius: 16, padding: "3px 10px",
                      }}>زرتها سابقاً</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 4 }}>
                    {d.doctor_name ? `${d.clinic_name} · ` : ""}{meta?.ar ?? "عيادة"}
                    {d.telemedicine ? " · كشف عن بُعد 🎥" : ""}
                  </div>
                </div>

                <a href={bookUrl(d.user_id)}
                  style={{
                    padding: "11px 22px", borderRadius: 14, textDecoration: "none",
                    background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
                    color: "#fff", fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700,
                    boxShadow: "0 5px 16px rgba(8,99,186,.28)", whiteSpace: "nowrap",
                  }}>احجز موعداً</a>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 14, lineHeight: 1.8, textAlign: "center" }}>
        يصل طلبك إلى الطبيب ويُؤكَّد بعد موافقته.
      </p>
    </div>
  );
}
