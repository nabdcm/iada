"use client";
// ============================================================
// VitalsSection — تسجيل المريض لمقاييسه الحيوية ومتابعة تطوّرها
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";

const BRAND = {
  primary: "#0863ba", primaryLight: "#3d8fd6", sky: "#eaf3fc",
  green: "#2e7d32", orange: "#e67e22", red: "#c0392b", teal: "#16a085",
  ink: "#1c2b3a", muted: "#8a97a6", border: "#eef0f3",
};

export interface Vital {
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

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 12,
  border: "1.5px solid #dbe4ef", background: "#fbfdff",
  fontFamily: "'Rubik',sans-serif", fontSize: 14, color: BRAND.ink, outline: "none",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#4b5563", marginBottom: 6 };
const noWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

const GLUCOSE_STATES = [
  { k: "fasting", ar: "صائم" },
  { k: "postprandial", ar: "بعد الأكل" },
  { k: "random", ar: "عشوائي" },
];

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("ar-SY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** تقييم إرشادي للقراءة — لا يُشخّص، بل يوجّه المريض لمراجعة طبيبه عند اللزوم */
function bpFlag(sys: number | null, dia: number | null): { color: string; label: string } | null {
  if (sys == null || dia == null) return null;
  if (sys >= 180 || dia >= 120) return { color: BRAND.red, label: "مرتفع جداً — راجع الطوارئ" };
  if (sys >= 140 || dia >= 90) return { color: BRAND.orange, label: "مرتفع" };
  if (sys < 90 || dia < 60) return { color: BRAND.orange, label: "منخفض" };
  return { color: BRAND.green, label: "طبيعي" };
}

export default function VitalsSection() {
  const [items, setItems] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [f, setF] = useState({
    weight: "", height: "", bp_sys: "", bp_dia: "", pulse: "",
    temperature: "", glucose: "", spo2: "", glucose_state: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/portal/vitals");
      const json = await r.json();
      if (!r.ok) setErr(json.error === "unauthorized" ? "انتهت الجلسة — أعد الدخول" : "تعذّر التحميل");
      else setItems((json.vitals ?? []) as Vital[]);
    } catch { setErr("تعذّر الاتصال"); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/portal/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const json = await r.json();
      if (!r.ok) { setErr(json.error ?? "تعذّر الحفظ"); setSaving(false); return; }
      setItems(v => [json.vital as Vital, ...v]);
      setF({ weight: "", height: "", bp_sys: "", bp_dia: "", pulse: "", temperature: "", glucose: "", spo2: "", glucose_state: "", notes: "" });
      setShowForm(false);
    } catch { setErr("تعذّر الاتصال"); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("حذف هذا القياس؟")) return;
    const r = await fetch(`/api/portal/vitals?id=${id}`, { method: "DELETE" });
    if (r.ok) setItems(v => v.filter(x => x.id !== id));
  };

  // آخر قراءة لكل مقياس
  const latest = useMemo(() => {
    const pick = (key: keyof Vital) => items.find(v => v[key] !== null && v[key] !== undefined);
    return {
      bp: items.find(v => v.bp_sys != null && v.bp_dia != null),
      weight: pick("weight"),
      glucose: pick("glucose"),
      pulse: pick("pulse"),
    };
  }, [items]);

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", direction: "rtl" }}>

      {/* ملخّص آخر القراءات */}
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            latest.bp ? { icon: "🩺", label: "آخر ضغط", value: `${latest.bp.bp_sys}/${latest.bp.bp_dia}`, sub: fmtDateTime(latest.bp.measured_at), color: bpFlag(latest.bp.bp_sys, latest.bp.bp_dia)?.color ?? BRAND.primary } : null,
            latest.glucose ? { icon: "🩸", label: "آخر سكر", value: `${latest.glucose.glucose}`, sub: GLUCOSE_STATES.find(g => g.k === latest.glucose!.glucose_state)?.ar ?? "—", color: BRAND.red } : null,
            latest.weight ? { icon: "⚖️", label: "آخر وزن", value: `${latest.weight.weight} كغ`, sub: fmtDateTime(latest.weight.measured_at), color: BRAND.teal } : null,
            latest.pulse ? { icon: "💓", label: "آخر نبض", value: `${latest.pulse.pulse}`, sub: "ن/د", color: BRAND.primary } : null,
          ].filter(Boolean).map((s, i) => {
            const c = s as { icon: string; label: string; value: string; sub: string; color: string };
            return (
              <div key={i} style={{
                background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18,
                padding: "14px 16px", boxShadow: "0 4px 16px rgba(8,99,186,.05)",
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color, lineHeight: 1, direction: "ltr", textAlign: "right" }}>{c.value}</div>
                <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 5, fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 10, color: "#c8d2dc", marginTop: 2 }}>{c.sub}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* زر التسجيل */}
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 16, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff",
            fontFamily: "'Rubik',sans-serif", fontSize: 14.5, fontWeight: 700,
            boxShadow: "0 6px 20px rgba(8,99,186,.28)", marginBottom: 18,
          }}>＋ تسجيل قياس جديد</button>
      )}

      {err && (
        <div style={{
          background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
          color: BRAND.red, borderRadius: 14, padding: "12px 16px",
          fontSize: 13, fontWeight: 600, marginBottom: 16,
        }}>{err}</div>
      )}

      {/* النموذج */}
      {showForm && (
        <div style={{
          background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
          padding: 18, marginBottom: 18, boxShadow: "0 4px 20px rgba(8,99,186,.07)",
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: BRAND.ink, marginBottom: 16 }}>قياس جديد</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>الضغط الانقباضي</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="120"
                value={f.bp_sys} onChange={e => setF({ ...f, bp_sys: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>الضغط الانبساطي</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="80"
                value={f.bp_dia} onChange={e => setF({ ...f, bp_dia: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>النبض (ن/د)</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="72"
                value={f.pulse} onChange={e => setF({ ...f, pulse: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>الحرارة (°م)</label>
              <input type="number" step="0.1" inputMode="decimal" onWheel={noWheel} placeholder="37"
                value={f.temperature} onChange={e => setF({ ...f, temperature: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>الوزن (كغ)</label>
              <input type="number" step="0.1" inputMode="decimal" onWheel={noWheel} placeholder="70"
                value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>الطول (سم)</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="170"
                value={f.height} onChange={e => setF({ ...f, height: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>السكر (ملغ/دل)</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="100"
                value={f.glucose} onChange={e => setF({ ...f, glucose: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>الأكسجين SpO₂ (%)</label>
              <input type="number" inputMode="numeric" onWheel={noWheel} placeholder="98"
                value={f.spo2} onChange={e => setF({ ...f, spo2: e.target.value })} style={inp} />
            </div>
          </div>

          {f.glucose && (
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>حالة قياس السكر</label>
              <div style={{ display: "flex", gap: 7 }}>
                {GLUCOSE_STATES.map(g => (
                  <button key={g.k} onClick={() => setF({ ...f, glucose_state: f.glucose_state === g.k ? "" : g.k })}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 12, cursor: "pointer",
                      border: `1.5px solid ${f.glucose_state === g.k ? BRAND.primary : BRAND.border}`,
                      background: f.glucose_state === g.k ? BRAND.sky : "#fff",
                      color: f.glucose_state === g.k ? BRAND.primary : BRAND.muted,
                      fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700,
                    }}>{g.ar}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>ملاحظة</label>
            <textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })}
              placeholder="مثال: بعد المشي، أو شعرت بدوار..."
              style={{ ...inp, minHeight: 70, resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving}
              style={{
                flex: 1, padding: "13px 0", borderRadius: 14, border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
                color: "#fff", fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 700,
                opacity: saving ? .6 : 1,
              }}>{saving ? "جارٍ الحفظ..." : "حفظ القياس"}</button>
            <button onClick={() => { setShowForm(false); setErr(null); }}
              style={{
                padding: "13px 22px", borderRadius: 14, border: `1.5px solid ${BRAND.border}`,
                cursor: "pointer", background: "#fff", color: BRAND.muted,
                fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 600,
              }}>إلغاء</button>
          </div>
        </div>
      )}

      {/* السجل */}
      {loading ? (
        <div style={{
          background: "#fff", borderRadius: 20, padding: "50px 20px",
          textAlign: "center", color: "#c8d2dc", fontSize: 14, border: `1.5px solid ${BRAND.border}`,
        }}>جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div style={{
          background: "#fff", borderRadius: 20, padding: "48px 24px",
          textAlign: "center", border: "1.5px dashed #e8eaed",
        }}>
          <div style={{ fontSize: 42, marginBottom: 12, opacity: .5 }}>📈</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#888", marginBottom: 6 }}>لا توجد قياسات بعد</div>
          <div style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.8 }}>
            سجّل ضغطك أو سكرك أو وزنك ليطّلع عليها طبيبك في زيارتك القادمة.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(v => {
            const bp = bpFlag(v.bp_sys, v.bp_dia);
            const chips = [
              v.bp_sys != null ? { t: `ضغط ${v.bp_sys}/${v.bp_dia}`, c: bp?.color ?? BRAND.primary } : null,
              v.pulse != null ? { t: `نبض ${v.pulse}`, c: BRAND.primary } : null,
              v.glucose != null ? { t: `سكر ${v.glucose}${v.glucose_state ? ` (${GLUCOSE_STATES.find(g => g.k === v.glucose_state)?.ar})` : ""}`, c: BRAND.red } : null,
              v.weight != null ? { t: `وزن ${v.weight} كغ`, c: BRAND.teal } : null,
              v.height != null ? { t: `طول ${v.height} سم`, c: BRAND.teal } : null,
              v.temperature != null ? { t: `حرارة ${v.temperature}°`, c: BRAND.orange } : null,
              v.spo2 != null ? { t: `SpO₂ ${v.spo2}%`, c: BRAND.primary } : null,
            ].filter(Boolean) as { t: string; c: string }[];

            return (
              <div key={v.id} style={{
                background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18,
                padding: "14px 16px", boxShadow: "0 3px 14px rgba(8,99,186,.05)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.muted }}>{fmtDateTime(v.measured_at)}</span>
                  <button onClick={() => void remove(v.id)}
                    style={{
                      border: "none", background: "transparent", cursor: "pointer",
                      color: "#c8d2dc", fontSize: 15, padding: 2,
                    }} aria-label="حذف">✕</button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {chips.map((c, i) => (
                    <span key={i} style={{
                      fontSize: 12, fontWeight: 700, color: c.c,
                      background: `${c.c}12`, borderRadius: 14, padding: "5px 12px", direction: "rtl",
                    }}>{c.t}</span>
                  ))}
                </div>

                {bp && bp.label !== "طبيعي" && (
                  <div style={{
                    marginTop: 10, fontSize: 11.5, fontWeight: 700, color: bp.color,
                    background: `${bp.color}0f`, borderRadius: 12, padding: "8px 12px",
                  }}>⚠ الضغط {bp.label}</div>
                )}

                {v.notes && (
                  <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 9, lineHeight: 1.8 }}>{v.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 16, lineHeight: 1.9, textAlign: "center" }}>
        هذه قراءاتك الذاتية ولا تُغني عن قياس طبيبك. عند أي عَرَض مقلق راجع الطبيب مباشرةً.
      </p>
    </div>
  );
}
