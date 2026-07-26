"use client";
// ============================================================
// LabsSection — نتائج تحاليل المريض المرتبطة برقم سجله الطبي
// ============================================================

import { useState } from "react";

const BRAND = {
  primary: "#0863ba", primaryLight: "#3d8fd6", sky: "#eaf3fc",
  green: "#2e7d32", red: "#c0392b", blue: "#1f6fd6",
  ink: "#1c2b3a", muted: "#8a97a6", border: "#eef0f3",
};

export interface LabResultRow {
  test_name: string; value: string; unit?: string | null;
  ref_low?: number | null; ref_high?: number | null; ref_text?: string | null;
}
export interface PortalLab {
  id: number;
  lab_name: string;
  sample_date: string | null;
  result_date: string | null;
  referring_doctor: string | null;
  notes: string | null;
  share_token: string;
  results: LabResultRow[];
}

const flagOf = (r: LabResultRow): "high" | "low" | "normal" | "empty" => {
  if (!r.value?.trim()) return "empty";
  const v = parseFloat(r.value);
  if (!isNaN(v)) {
    if (r.ref_high != null && v > r.ref_high) return "high";
    if (r.ref_low != null && v < r.ref_low) return "low";
  }
  return "normal";
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ar-SY", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function LabsSection({ items }: { items: PortalLab[] }) {
  const [open, setOpen] = useState<number | null>(items.length > 0 ? items[0].id : null);

  if (items.length === 0) {
    return (
      <div style={{
        background: "#fff", borderRadius: 20, padding: "48px 24px",
        textAlign: "center", border: "1.5px dashed #e8eaed",
      }}>
        <div style={{ fontSize: 42, marginBottom: 12, opacity: .5 }}>🧪</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#888", marginBottom: 6 }}>
          لا توجد نتائج تحاليل
        </div>
        <div style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.8 }}>
          كل تحليل يُجرى لك في مخبر على نبض برقم سجلك الطبي سيظهر هنا فور صدوره.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map(o => {
        const isOpen = open === o.id;
        const abnormal = o.results.filter(r => {
          const f = flagOf(r);
          return f === "high" || f === "low";
        }).length;

        return (
          <div key={o.id} style={{
            background: "#fff", borderRadius: 20, border: `1.5px solid ${BRAND.border}`,
            boxShadow: "0 4px 20px rgba(8,99,186,.06)", overflow: "hidden",
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : o.id)}
              style={{
                width: "100%", padding: "16px 18px", border: "none", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 13,
                textAlign: "right", fontFamily: "Rubik, sans-serif",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg,#16a085,#0d7c68)`,
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20,
              }}>🧪</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: BRAND.ink }}>{o.lab_name}</div>
                <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 4 }}>
                  {fmtDate(o.result_date ?? o.sample_date)}
                  {o.referring_doctor ? ` · ${o.referring_doctor}` : ""}
                </div>
              </div>

              {abnormal > 0 ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: BRAND.red,
                  background: "rgba(192,57,43,.1)", borderRadius: 16, padding: "4px 11px", flexShrink: 0,
                }}>{abnormal} خارج المجال</span>
              ) : (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: BRAND.green,
                  background: "rgba(46,125,50,.1)", borderRadius: 16, padding: "4px 11px", flexShrink: 0,
                }}>ضمن المجال</span>
              )}

              <span style={{
                fontSize: 13, color: BRAND.muted, flexShrink: 0,
                transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s",
              }}>▾</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 18px 18px", animation: "fadeIn .25s ease" }}>
                <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 14, display: "grid", gap: 9 }}>
                  {o.results.map((r, i) => {
                    const f = flagOf(r);
                    const c = f === "high" ? BRAND.red : f === "low" ? BRAND.blue
                      : f === "normal" ? BRAND.green : BRAND.muted;
                    const refTxt = r.ref_text
                      ?? (r.ref_low != null || r.ref_high != null ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""}` : "—");
                    return (
                      <div key={i} style={{
                        border: `1px solid ${BRAND.border}`, borderRadius: 14,
                        borderInlineStart: `4px solid ${c}`, background: "#f7fafd",
                        padding: "12px 14px", display: "flex", justifyContent: "space-between",
                        alignItems: "center", gap: 12, flexWrap: "wrap",
                      }}>
                        <div style={{ minWidth: 130 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.ink }}>{r.test_name}</div>
                          <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 4 }}>
                            المجال الطبيعي: {refTxt}
                          </div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: c, direction: "ltr" }}>
                            {r.value || "—"}{r.unit ? ` ${r.unit}` : ""}
                          </div>
                          {(f === "high" || f === "low") && (
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: c, marginTop: 2 }}>
                              {f === "high" ? "▲ مرتفع" : "▼ منخفض"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {o.notes && (
                    <div style={{
                      fontSize: 12.5, color: "#5a6b80", lineHeight: 1.9,
                      background: BRAND.sky, borderRadius: 12, padding: "11px 14px",
                    }}>{o.notes}</div>
                  )}

                  <div style={{
                    fontSize: 11.5, color: BRAND.muted, lineHeight: 1.8,
                    textAlign: "center", marginTop: 2,
                  }}>
                    القراءة خارج المجال لا تعني بالضرورة وجود مرض — ناقش نتائجك مع طبيبك.
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
