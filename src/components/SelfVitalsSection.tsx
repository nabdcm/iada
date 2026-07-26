"use client";
// ============================================================
// SelfVitalsSection — القراءات التي سجّلها المريض بنفسه (عرض للطبيب)
// تُعرض موسومة بوضوح كقراءات ذاتية غير موثّقة طبياً
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const BR = {
  primary: "#0863ba", green: "#2e7d32", orange: "#e67e22", red: "#c0392b",
  teal: "#16a085", ink: "#353535", muted: "#8a97a6", border: "#eef0f3", bg: "#f7f9fc",
};

interface Vital {
  id: number;
  measured_at: string;
  weight: number | null; height: number | null;
  bp_sys: number | null; bp_dia: number | null;
  pulse: number | null; temperature: number | null;
  glucose: number | null; spo2: number | null;
  glucose_state: string | null;
  notes: string | null;
  source: string;
}

const GS: Record<string, string> = { fasting: "صائم", postprandial: "بعد الأكل", random: "عشوائي" };

const fmt = (d: string) =>
  new Date(d).toLocaleString("ar-SY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function bpFlag(sys: number | null, dia: number | null) {
  if (sys == null || dia == null) return null;
  if (sys >= 180 || dia >= 120) return { color: BR.red, label: "ارتفاع شديد" };
  if (sys >= 140 || dia >= 90) return { color: BR.orange, label: "مرتفع" };
  if (sys < 90 || dia < 60) return { color: BR.orange, label: "منخفض" };
  return { color: BR.green, label: "طبيعي" };
}

export default function SelfVitalsSection({ patientId, isAr = true }: { patientId: number; isAr?: boolean }) {
  const [items, setItems] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/clinic/patient-vitals?patient_id=${patientId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await r.json();
      if (!r.ok) setErr("تعذّر تحميل القراءات");
      else setItems((json.vitals ?? []) as Vital[]);
    } catch { setErr("تعذّر الاتصال"); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik,sans-serif" }}>

      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: 0 }}>
          {isAr ? "القراءات الذاتية للمريض" : "Patient Self-Reported Vitals"}
        </h3>
        <p style={{ fontSize: 12, color: BR.muted, margin: "3px 0 0" }}>
          {isAr ? "سجّلها المريض من بوابته عبر رقم سجله الطبي" : "Recorded by the patient from their portal"}
        </p>
      </div>

      {/* تحذير الموثوقية */}
      <div style={{
        background: "rgba(230,126,34,.07)", border: "1.5px solid rgba(230,126,34,.25)",
        color: "#b9651b", borderRadius: 12, padding: "11px 14px",
        fontSize: 12, fontWeight: 600, marginBottom: 14, lineHeight: 1.8,
      }}>
        {isAr
          ? "قراءات ذاتية غير موثّقة طبياً — قد تختلف حسب الجهاز وطريقة القياس. اعتمدها كمؤشر اتجاه لا كبديل عن قياس العيادة."
          : "Self-reported and unverified — treat as a trend indicator, not a substitute for in-clinic measurement."}
      </div>

      {err && (
        <div style={{
          background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
          color: BR.red, borderRadius: 12, padding: "11px 14px",
          fontSize: 12.5, fontWeight: 600, marginBottom: 14,
        }}>{err}</div>
      )}

      {loading ? (
        <div style={{
          background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
          padding: "40px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13,
        }}>…</div>
      ) : items.length === 0 ? (
        <div style={{
          background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
          padding: "44px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13,
        }}>
          {isAr ? "لم يسجّل المريض أي قراءة بعد" : "No self-reported readings yet"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {items.map(v => {
            const bp = bpFlag(v.bp_sys, v.bp_dia);
            const chips = [
              v.bp_sys != null ? { t: `ضغط ${v.bp_sys}/${v.bp_dia}`, c: bp?.color ?? BR.primary } : null,
              v.pulse != null ? { t: `نبض ${v.pulse}`, c: BR.primary } : null,
              v.glucose != null ? { t: `سكر ${v.glucose}${v.glucose_state ? ` (${GS[v.glucose_state] ?? ""})` : ""}`, c: BR.red } : null,
              v.weight != null ? { t: `وزن ${v.weight} كغ`, c: BR.teal } : null,
              v.height != null ? { t: `طول ${v.height} سم`, c: BR.teal } : null,
              v.temperature != null ? { t: `حرارة ${v.temperature}°`, c: BR.orange } : null,
              v.spo2 != null ? { t: `SpO₂ ${v.spo2}%`, c: BR.primary } : null,
            ].filter(Boolean) as { t: string; c: string }[];

            return (
              <div key={v.id} style={{
                background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 13,
                padding: "12px 14px",
                borderInlineStart: `3px solid ${bp?.color ?? BR.border}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: BR.muted }}>{fmt(v.measured_at)}</span>
                  {bp && bp.label !== "طبيعي" && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: bp.color,
                      background: `${bp.color}14`, borderRadius: 14, padding: "3px 10px",
                    }}>{bp.label}</span>
                  )}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {chips.map((c, i) => (
                    <span key={i} style={{
                      fontSize: 11.5, fontWeight: 700, color: c.c,
                      background: `${c.c}12`, borderRadius: 12, padding: "4px 11px",
                    }}>{c.t}</span>
                  ))}
                </div>

                {v.notes && (
                  <div style={{ fontSize: 11.5, color: BR.muted, marginTop: 8, lineHeight: 1.8 }}>{v.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
