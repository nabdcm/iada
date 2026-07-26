"use client";
// ============================================================
// PrescriptionsSection — وصفات المريض من كل العيادات
// ============================================================

import { useState } from "react";

const BRAND = {
  primary: "#0863ba", primaryLight: "#3d8fd6", sky: "#eaf3fc",
  ink: "#1c2b3a", muted: "#8a97a6", border: "#eef0f3",
};

export interface Medication {
  name?: string; dosage?: string; frequency?: string;
  duration?: string; instructions?: string;
}
export interface PortalPrescription {
  id: number;
  date: string | null;
  diagnosis: string | null;
  notes: string | null;
  medications: Medication[];
  doctor_name: string;
  clinic_name: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("ar-SY", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function PrescriptionsSection({ items }: { items: PortalPrescription[] }) {
  const [open, setOpen] = useState<number | null>(items.length > 0 ? items[0].id : null);

  if (items.length === 0) {
    return (
      <div style={{
        background: "#fff", borderRadius: 20, padding: "48px 24px",
        textAlign: "center", border: "1.5px dashed #e8eaed",
      }}>
        <div style={{ fontSize: 42, marginBottom: 12, opacity: .5 }}>💊</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#888", marginBottom: 6 }}>
          لا توجد وصفات طبية مسجّلة
        </div>
        <div style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.8 }}>
          ستظهر هنا كل وصفة يكتبها لك أي طبيب على نبض.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map(rx => {
        const isOpen = open === rx.id;
        return (
          <div key={rx.id} style={{
            background: "#fff", borderRadius: 20, border: `1.5px solid ${BRAND.border}`,
            boxShadow: "0 4px 20px rgba(8,99,186,.06)", overflow: "hidden",
          }}>
            <button
              onClick={() => setOpen(isOpen ? null : rx.id)}
              style={{
                width: "100%", padding: "16px 18px", border: "none", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 13,
                textAlign: "right", fontFamily: "Rubik, sans-serif",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20,
              }}>💊</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: BRAND.ink }}>
                  {rx.diagnosis || "وصفة طبية"}
                </div>
                <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 4 }}>
                  {fmtDate(rx.date)} · {rx.doctor_name}
                </div>
              </div>

              <span style={{
                fontSize: 11, fontWeight: 700, color: BRAND.primary,
                background: BRAND.sky, borderRadius: 16, padding: "4px 11px", flexShrink: 0,
              }}>{rx.medications.length} دواء</span>

              <span style={{
                fontSize: 13, color: BRAND.muted, flexShrink: 0,
                transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s",
              }}>▾</span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 18px 18px", animation: "fadeIn .25s ease" }}>
                <div style={{ borderTop: `1px solid ${BRAND.border}`, paddingTop: 14 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: BRAND.muted, marginBottom: 10 }}>
                    {rx.clinic_name}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {rx.medications.map((m, i) => (
                      <div key={i} style={{
                        background: "#f7fafd", border: `1px solid ${BRAND.border}`,
                        borderRadius: 14, padding: "12px 14px",
                      }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.ink, marginBottom: 6 }}>
                          {m.name || "—"}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {[
                            m.dosage ? `الجرعة: ${m.dosage}` : null,
                            m.frequency ? `التكرار: ${m.frequency}` : null,
                            m.duration ? `المدة: ${m.duration}` : null,
                          ].filter(Boolean).map((txt, k) => (
                            <span key={k} style={{
                              fontSize: 11.5, fontWeight: 600, color: "#5a6b80",
                              background: "#fff", border: `1px solid ${BRAND.border}`,
                              borderRadius: 12, padding: "3px 10px",
                            }}>{txt}</span>
                          ))}
                        </div>
                        {m.instructions && (
                          <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 8, lineHeight: 1.8 }}>
                            {m.instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {rx.notes && (
                    <div style={{
                      marginTop: 12, fontSize: 12.5, color: "#5a6b80", lineHeight: 1.9,
                      background: BRAND.sky, borderRadius: 12, padding: "11px 14px",
                    }}>{rx.notes}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
