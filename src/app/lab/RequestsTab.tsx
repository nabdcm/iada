"use client";
// ============================================================
// RequestsTab — طلبات التحاليل الواردة من العيادات (ميزة 8 + 9)
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const BRAND = {
  primary: "#0863ba", green: "#2e7d32", orange: "#e67e22",
  red: "#c0392b", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type ReqStatus = "pending" | "accepted" | "completed" | "rejected" | "cancelled";
interface TestItem { catalog_id: number | null; name: string; unit?: string | null; price?: number }
export interface ClinicLabRequest {
  id: number; clinic_user_id: string; clinic_name: string | null;
  mrn: string | null; patient_name: string; patient_phone: string | null;
  patient_gender: string | null; patient_age: string | null;
  referring_doctor: string | null; tests: TestItem[]; notes: string | null;
  urgency: "normal" | "urgent"; status: ReqStatus;
  lab_order_id: number | null; reject_reason: string | null; created_at: string;
}

const STATUS: Record<ReqStatus, { ar: string; color: string; bg: string }> = {
  pending:   { ar: "جديد",          color: BRAND.orange,  bg: "rgba(230,126,34,.1)" },
  accepted:  { ar: "قيد التنفيذ",   color: BRAND.primary, bg: "rgba(8,99,186,.08)" },
  completed: { ar: "أُرسلت النتيجة", color: BRAND.green,   bg: "rgba(46,125,50,.1)" },
  rejected:  { ar: "مرفوض",         color: BRAND.red,     bg: "rgba(192,57,43,.1)" },
  cancelled: { ar: "سحبته العيادة", color: BRAND.muted,   bg: "rgba(138,151,166,.12)" },
};

interface Props {
  /** يُستدعى بعد تحويل الطلب إلى طلب مخبري لإعادة تحميل قائمة الطلبات */
  onConverted: () => void;
  /** يفتح نافذة إدخال النتائج لطلب مخبري محدّد */
  onOpenOrder: (orderId: number) => void;
  notify: (msg: string, ok?: boolean) => void;
  /** لإبلاغ الصفحة الأم بعدد الطلبات الجديدة */
  onCount?: (n: number) => void;
}

export default function RequestsTab({ onConverted, onOpenOrder, notify, onCount }: Props) {
  const [reqs, setReqs] = useState<ClinicLabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | ReqStatus>("pending");

  const authHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const h = await authHeaders();
    if (!h) { setLoading(false); return; }
    try {
      const r = await fetch("/api/lab-requests?role=lab", { headers: h });
      const json = await r.json();
      if (r.ok) {
        const list = (json.requests ?? []) as ClinicLabRequest[];
        setReqs(list);
        onCount?.(list.filter(x => x.status === "pending").length);
      } else notify(json.error ?? "تعذّر التحميل", false);
    } catch {
      notify("تعذّر تحميل الطلبات", false);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: number, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(id);
    const h = await authHeaders();
    if (!h) { setBusy(null); return; }
    try {
      const r = await fetch("/api/lab-requests", {
        method: "POST", headers: h, body: JSON.stringify({ action, id, ...extra }),
      });
      const json = await r.json();
      if (!r.ok) { notify(json.error ?? "فشل الإجراء", false); setBusy(null); return; }

      if (action === "convert") {
        notify("أُنشئ طلب مخبري من طلب العيادة");
        onConverted();
        if (json.order_id) onOpenOrder(json.order_id as number);
      } else if (action === "notify_result") {
        notify("أُشعِرت العيادة بصدور النتيجة");
      } else if (action === "reject") {
        notify("رُفض الطلب وأُشعِرت العيادة");
      }
      await load();
    } catch {
      notify("فشل الإجراء", false);
    }
    setBusy(null);
  };

  const reject = (id: number) => {
    const reason = prompt("سبب الرفض (اختياري):") ?? "";
    void act(id, "reject", { reason: reason.trim() || null });
  };

  const shown = useMemo(
    () => (filter === "all" ? reqs : reqs.filter(r => r.status === filter)),
    [reqs, filter]
  );

  const counts = useMemo(() => ({
    pending: reqs.filter(r => r.status === "pending").length,
    accepted: reqs.filter(r => r.status === "accepted").length,
    completed: reqs.filter(r => r.status === "completed").length,
  }), [reqs]);

  return (
    <div style={{ direction: "rtl", fontFamily: "Rubik,sans-serif" }}>

      {/* عدّادات */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { l: "طلبات جديدة", v: counts.pending, c: BRAND.orange },
          { l: "قيد التنفيذ", v: counts.accepted, c: BRAND.primary },
          { l: "أُرسلت نتيجتها", v: counts.completed, c: BRAND.green },
        ].map((s, i) => (
          <div key={i} style={{
            background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 13,
            padding: "13px 15px", boxShadow: "0 2px 9px rgba(8,99,186,.04)",
          }}>
            <div style={{ fontSize: 21, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 5, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* فلاتر */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
        {([["pending", "الجديدة"], ["accepted", "قيد التنفيذ"], ["completed", "المكتملة"], ["all", "الكل"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setFilter(k as "all" | ReqStatus)}
            style={{
              padding: "7px 15px", borderRadius: 20, cursor: "pointer",
              border: `1.5px solid ${filter === k ? BRAND.primary : BRAND.border}`,
              background: filter === k ? "rgba(8,99,186,.08)" : "#fff",
              color: filter === k ? BRAND.primary : BRAND.muted,
              fontFamily: "Rubik,sans-serif", fontSize: 12, fontWeight: 700,
            }}>{l}</button>
        ))}
      </div>

      {/* القائمة */}
      <div style={{
        background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16,
        overflow: "hidden", boxShadow: "0 2px 12px rgba(8,99,186,.05)",
      }}>
        {loading ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>…</div>
        ) : shown.length === 0 ? (
          <div style={{ padding: "56px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13.5 }}>
            لا توجد طلبات في هذا التصنيف
          </div>
        ) : shown.map((r, i) => {
          const st = STATUS[r.status];
          return (
            <div key={r.id} style={{
              padding: "14px 16px",
              borderBottom: i < shown.length - 1 ? `1px solid ${BRAND.border}` : "none",
              background: r.urgency === "urgent" && r.status === "pending" ? "rgba(192,57,43,.03)" : "#fff",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 210 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: BRAND.ink }}>{r.patient_name}</span>
                    {r.mrn && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: BRAND.primary,
                        background: "rgba(8,99,186,.08)", borderRadius: 20, padding: "2px 9px",
                      }}>{r.mrn}</span>
                    )}
                    {r.urgency === "urgent" && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: BRAND.red,
                        background: "rgba(192,57,43,.1)", borderRadius: 20, padding: "2px 9px",
                      }}>عاجل</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 5 }}>
                    {r.clinic_name ?? "عيادة"}
                    {r.referring_doctor ? ` · د. ${r.referring_doctor}` : ""}
                    {" · "}{new Date(r.created_at).toLocaleDateString("ar-EG")}
                    {r.patient_phone ? ` · ${r.patient_phone}` : ""}
                    {r.patient_age ? ` · ${r.patient_age} سنة` : ""}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                    {(r.tests ?? []).map((t, k) => (
                      <span key={k} style={{
                        fontSize: 11, fontWeight: 600, color: BRAND.muted,
                        background: BRAND.bg, border: `1px solid ${BRAND.border}`,
                        borderRadius: 8, padding: "3px 9px",
                      }}>{t.name}</span>
                    ))}
                  </div>
                  {r.notes && (
                    <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 8, lineHeight: 1.7 }}>{r.notes}</div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: st.color, background: st.bg,
                    borderRadius: 20, padding: "4px 12px",
                  }}>{st.ar}</span>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {r.status === "pending" && (
                      <>
                        <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, "convert")}
                          style={{
                            padding: "7px 14px", borderRadius: 9, border: "none",
                            cursor: busy === r.id ? "not-allowed" : "pointer",
                            background: BRAND.primary, color: "#fff", opacity: busy === r.id ? .6 : 1,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>قبول وإنشاء طلب</button>
                        <button type="button" disabled={busy === r.id} onClick={() => reject(r.id)}
                          style={{
                            padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                            border: "1.5px solid rgba(192,57,43,.22)", background: "rgba(192,57,43,.05)", color: BRAND.red,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>رفض</button>
                      </>
                    )}
                    {r.status === "accepted" && r.lab_order_id && (
                      <>
                        <button type="button" onClick={() => onOpenOrder(r.lab_order_id!)}
                          style={{
                            padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                            border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.ink,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>إدخال النتائج</button>
                        <button type="button" disabled={busy === r.id} onClick={() => void act(r.id, "notify_result")}
                          style={{
                            padding: "7px 14px", borderRadius: 9, border: "none",
                            cursor: busy === r.id ? "not-allowed" : "pointer",
                            background: BRAND.green, color: "#fff", opacity: busy === r.id ? .6 : 1,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>إرسال النتيجة للعيادة</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
