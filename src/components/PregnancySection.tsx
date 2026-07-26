"use client";

// ============================================================
// PregnancySection — متابعة الحمل: عمر الحمل، الزيارات، الفحوص
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  calcEDD, gestAge, trimester, TRIMESTER_LABEL, daysToEDD,
  ANC_MILESTONES, visitFlags, RISK_META,
  type Pregnancy, type PregnancyVisit, type RiskLevel,
} from "@/lib/pregnancy";

type Lang = "ar" | "en";
const BR = { primary: "#0863ba", ink: "#353535", muted: "#8a97a6", border: "#eef0f3", bg: "#f7f9fc", pink: "#d81b60" };

const IS: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BR.border}`, fontFamily: "Rubik,sans-serif",
  fontSize: 13, outline: "none", background: "#fff", color: BR.ink,
};
const LB: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 };
const noWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

const T = {
  title: "متابعة الحمل", sub: "عمر الحمل، الزيارات، والفحوص الموصى بها",
  newPreg: "تسجيل حمل جديد", noPreg: "لا يوجد حمل مسجّل لهذه المريضة",
  active: "حمل نشط", delivered: "تمت الولادة", ended: "منتهٍ",
  lmp: "آخر دورة طمثية (LMP)", edd: "الولادة المتوقعة (EDD)",
  gravida: "عدد مرات الحمل (G)", para: "عدد الولادات (P)",
  bloodType: "زمرة الدم", risk: "مستوى الخطورة", notes: "ملاحظات",
  gestAge: "عمر الحمل", remaining: "المتبقي", days: "يوم", overdue: "تجاوزت الموعد بـ",
  visits: "الزيارات", addVisit: "زيارة جديدة", noVisits: "لا توجد زيارات مسجّلة",
  visitDate: "تاريخ الزيارة", weight: "الوزن (كغ)", bp: "الضغط", sys: "الانقباضي", dia: "الانبساطي",
  fundal: "ارتفاع قاع الرحم (سم)", fhr: "نبض الجنين (ن/د)", hb: "الخضاب (g/dL)",
  us: "الإيكو", complaints: "الشكاوى", nextVisit: "الموعد القادم",
  milestones: "الفحوص الموصى بها", done: "مرّت", upcoming: "قادمة",
  save: "حفظ", cancel: "إلغاء", saving: "جاري الحفظ...", edit: "تعديل", del: "حذف",
  close: "إغلاق حالة الحمل", deliveryDate: "تاريخ الولادة", outcome: "النتيجة",
  outcomePh: "مثال: ولادة طبيعية، ذكر 3.2 كغ",
  confirmDelVisit: "حذف هذه الزيارة؟",
  confirmDelPreg: "حذف سجل الحمل وكل زياراته؟",
  saveErr: "تعذّر الحفظ — لم تُسجّل التغييرات",
  loadErr: "تعذّر تحميل بيانات الحمل",
  disclaimer: "التنبيهات أدوات مساعدة ولا تُغني عن التقييم السريري.",
  status: "الحالة",
  reopen: "إعادة فتح",
  history: "الحمول السابقة",
};

interface Props {
  lang: Lang;
  patientId: number;
  userId: string;
}

export default function PregnancySection({ lang, patientId, userId }: Props) {
  const isAr = lang === "ar";

  const [pregs, setPregs] = useState<Pregnancy[]>([]);
  const [visits, setVisits] = useState<PregnancyVisit[]>([]);
  const [selId, setSelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pregModal, setPregModal] = useState<{ row: Pregnancy; isNew: boolean } | null>(null);
  const [visitModal, setVisitModal] = useState<{ row: PregnancyVisit; isNew: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from("patient_pregnancies").select("*")
      .eq("user_id", userId).eq("patient_id", patientId)
      .order("created_at", { ascending: false }).range(0, 199);
    if (error) { setErr(T.loadErr); setLoading(false); return; }
    const list = (data ?? []) as Pregnancy[];
    setPregs(list);
    const active = list.find(p => p.status === "active") ?? list[0];
    setSelId(active?.id ?? null);
    setLoading(false);
  }, [patientId, userId]);

  useEffect(() => { void load(); }, [load]);

  const loadVisits = useCallback(async (pregId: number) => {
    const { data, error } = await supabase
      .from("pregnancy_visits").select("*")
      .eq("user_id", userId).eq("pregnancy_id", pregId)
      .order("visit_date", { ascending: false }).range(0, 499);
    if (error) { setErr(T.loadErr); return; }
    setVisits((data ?? []) as PregnancyVisit[]);
  }, [userId]);

  useEffect(() => { if (selId) void loadVisits(selId); else setVisits([]); }, [selId, loadVisits]);

  const selected = useMemo(() => pregs.find(p => p.id === selId) ?? null, [pregs, selId]);

  const ga = selected?.lmp ? gestAge(selected.lmp) : null;
  const tri = ga ? trimester(ga.weeks) : null;
  const dLeft = selected?.edd ? daysToEDD(selected.edd) : null;

  const blankPreg = (): Pregnancy => ({
    patient_id: patientId, lmp: new Date().toISOString().slice(0, 10), edd: null,
    gravida: null, para: null, blood_type: null, risk_level: "normal",
    status: "active", delivery_date: null, outcome: null, notes: null,
  });

  const blankVisit = (): PregnancyVisit => ({
    pregnancy_id: selId ?? 0, visit_date: new Date().toISOString().slice(0, 10),
    gest_weeks: ga ? ga.weeks : null, weight: null, bp_sys: null, bp_dia: null,
    fundal_height: null, fetal_hr: null, hb: null, ultrasound: null,
    complaints: null, notes: null, next_visit: null,
  });

  const savePreg = async () => {
    if (!pregModal) return;
    const r = pregModal.row;
    const edd = r.edd || (r.lmp ? calcEDD(r.lmp) : null);
    setBusy(true); setErr(null);
    const payload = {
      lmp: r.lmp, edd, gravida: r.gravida, para: r.para, blood_type: r.blood_type,
      risk_level: r.risk_level, status: r.status, delivery_date: r.delivery_date,
      outcome: r.outcome, notes: r.notes,
    };
    if (pregModal.isNew) {
      const { data, error } = await supabase.from("patient_pregnancies")
        .insert({ user_id: userId, patient_id: patientId, ...payload }).select().single();
      if (error) { setErr(T.saveErr); setBusy(false); return; }
      const row = data as Pregnancy;
      setPregs(ps => [row, ...ps]); setSelId(row.id ?? null);
    } else if (r.id) {
      const { error } = await supabase.from("patient_pregnancies")
        .update(payload).eq("id", r.id).eq("user_id", userId);
      if (error) { setErr(T.saveErr); setBusy(false); return; }
      setPregs(ps => ps.map(p => (p.id === r.id ? { ...r, edd } : p)));
    }
    setBusy(false); setPregModal(null);
  };

  const delPreg = async (p: Pregnancy) => {
    if (!p.id || !confirm(T.confirmDelPreg)) return;
    const { error } = await supabase.from("patient_pregnancies").delete().eq("id", p.id).eq("user_id", userId);
    if (error) { setErr(T.saveErr); return; }
    setPregs(ps => ps.filter(x => x.id !== p.id));
    setSelId(null);
  };

  const saveVisit = async () => {
    if (!visitModal || !selId) return;
    const r = visitModal.row;
    setBusy(true); setErr(null);
    const payload = {
      visit_date: r.visit_date, gest_weeks: r.gest_weeks, weight: r.weight,
      bp_sys: r.bp_sys, bp_dia: r.bp_dia, fundal_height: r.fundal_height,
      fetal_hr: r.fetal_hr, hb: r.hb, ultrasound: r.ultrasound,
      complaints: r.complaints, notes: r.notes, next_visit: r.next_visit,
    };
    if (visitModal.isNew) {
      const { data, error } = await supabase.from("pregnancy_visits")
        .insert({ user_id: userId, pregnancy_id: selId, ...payload }).select().single();
      if (error) { setErr(T.saveErr); setBusy(false); return; }
      setVisits(vs => [data as PregnancyVisit, ...vs]);
    } else if (r.id) {
      const { error } = await supabase.from("pregnancy_visits")
        .update(payload).eq("id", r.id).eq("user_id", userId);
      if (error) { setErr(T.saveErr); setBusy(false); return; }
      setVisits(vs => vs.map(v => (v.id === r.id ? r : v)));
    }
    setBusy(false); setVisitModal(null);
  };

  const delVisit = async (v: PregnancyVisit) => {
    if (!v.id || !confirm(T.confirmDelVisit)) return;
    const { error } = await supabase.from("pregnancy_visits").delete().eq("id", v.id).eq("user_id", userId);
    if (error) { setErr(T.saveErr); return; }
    setVisits(vs => vs.filter(x => x.id !== v.id));
  };

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik,sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: 0 }}>{T.title}</h3>
          <p style={{ fontSize: 12, color: BR.muted, margin: "3px 0 0" }}>{T.sub}</p>
        </div>
        <button type="button" onClick={() => setPregModal({ row: blankPreg(), isNew: true })}
          style={{
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: BR.pink, color: "#fff", fontFamily: "Rubik,sans-serif",
            fontSize: 12.5, fontWeight: 700, boxShadow: "0 4px 14px rgba(216,27,96,.22)",
          }}>＋ {T.newPreg}</button>
      </div>

      {err && (
        <div style={{
          background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
          color: "#c0392b", borderRadius: 12, padding: "11px 14px", fontSize: 12.5, marginBottom: 14, fontWeight: 600,
        }}>{err}</div>
      )}

      {/* اختيار الحمل عند وجود أكثر من سجل */}
      {pregs.length > 1 && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          {pregs.map(p => (
            <button key={p.id} type="button" onClick={() => setSelId(p.id ?? null)}
              style={{
                padding: "7px 14px", borderRadius: 20, cursor: "pointer",
                border: `1.5px solid ${selId === p.id ? BR.pink : BR.border}`,
                background: selId === p.id ? "rgba(216,27,96,.07)" : "#fff",
                color: selId === p.id ? BR.pink : BR.muted,
                fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
              }}>
              {p.lmp ?? "—"} · {p.status === "active" ? T.active : p.status === "delivered" ? T.delivered : T.ended}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>…</div>
      ) : !selected ? (
        <div style={{
          background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
          padding: "46px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13,
        }}>{T.noPreg}</div>
      ) : (
        <>
          {/* ── بطاقة الحالة ── */}
          <div style={{
            background: "linear-gradient(135deg,rgba(216,27,96,.06),rgba(8,99,186,.05))",
            border: `1.5px solid ${BR.border}`, borderRadius: 16, padding: 16, marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 11px",
                  background: selected.status === "active" ? "rgba(46,125,50,.1)" : BR.bg,
                  color: selected.status === "active" ? "#2e7d32" : BR.muted,
                }}>
                  {selected.status === "active" ? T.active : selected.status === "delivered" ? T.delivered : T.ended}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 11px",
                  background: RISK_META[selected.risk_level].bg, color: RISK_META[selected.risk_level].color,
                }}>{T.risk}: {RISK_META[selected.risk_level].ar}</span>
                {tri && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 11px",
                    background: "rgba(8,99,186,.08)", color: BR.primary,
                  }}>{TRIMESTER_LABEL[tri]}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setPregModal({ row: { ...selected }, isNew: false })}
                  style={{
                    padding: "6px 13px", borderRadius: 9, cursor: "pointer",
                    border: `1.5px solid ${BR.border}`, background: "#fff", color: BR.muted,
                    fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                  }}>{T.edit}</button>
                <button type="button" onClick={() => void delPreg(selected)}
                  style={{
                    padding: "6px 13px", borderRadius: 9, cursor: "pointer",
                    border: "1.5px solid rgba(192,57,43,.2)", background: "rgba(192,57,43,.05)", color: "#c0392b",
                    fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                  }}>{T.del}</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
              {[
                { l: T.gestAge, v: ga ? ga.label : "—" },
                { l: T.edd, v: selected.edd ?? "—" },
                {
                  l: dLeft !== null && dLeft < 0 ? T.overdue : T.remaining,
                  v: dLeft === null ? "—" : `${Math.abs(dLeft)} ${T.days}`,
                },
                { l: "G / P", v: `${selected.gravida ?? "—"} / ${selected.para ?? "—"}` },
                { l: T.bloodType, v: selected.blood_type ?? "—" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "11px 13px", border: `1px solid ${BR.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: BR.ink, lineHeight: 1.2 }}>{s.v}</div>
                  <div style={{ fontSize: 10.5, color: BR.muted, marginTop: 4, fontWeight: 600 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* شريط التقدّم */}
            {ga && (
              <div style={{ marginTop: 14 }}>
                <div style={{ height: 8, background: "#fff", borderRadius: 10, overflow: "hidden", border: `1px solid ${BR.border}` }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, (ga.weeks / 40) * 100)}%`,
                    background: `linear-gradient(90deg,${BR.pink},${BR.primary})`, transition: "width .6s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: BR.muted, marginTop: 5 }}>
                  <span>0</span><span>20</span><span>40 أسبوع</span>
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ fontSize: 12, color: BR.muted, marginTop: 12, lineHeight: 1.7 }}>{selected.notes}</div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(240px,320px)", gap: 14, alignItems: "start" }} className="preg-grid">

            {/* ── الزيارات ── */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: BR.ink, margin: 0 }}>
                  {T.visits} {visits.length > 0 && <span style={{ color: BR.muted, fontWeight: 600 }}>({visits.length})</span>}
                </h4>
                <button type="button" onClick={() => setVisitModal({ row: blankVisit(), isNew: true })}
                  style={{
                    padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                    border: `1.5px solid rgba(8,99,186,.2)`, background: "rgba(8,99,186,.06)", color: BR.primary,
                    fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                  }}>＋ {T.addVisit}</button>
              </div>

              <div style={{
                background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
                overflow: "hidden", boxShadow: "0 2px 10px rgba(8,99,186,.04)",
              }}>
                {visits.length === 0 ? (
                  <div style={{ padding: "40px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>{T.noVisits}</div>
                ) : visits.map((v, i) => {
                  const flags = visitFlags(v);
                  return (
                    <div key={v.id ?? i} style={{
                      padding: "12px 14px",
                      borderBottom: i < visits.length - 1 ? `1px solid ${BR.border}` : "none",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 7 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: BR.ink }}>
                          {v.visit_date}
                          {v.gest_weeks != null && <span style={{ color: BR.muted, fontWeight: 600, fontSize: 11.5 }}> · {v.gest_weeks} أسبوع</span>}
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button type="button" onClick={() => setVisitModal({ row: { ...v }, isNew: false })}
                            style={{ padding: "4px 9px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${BR.border}`, background: "#fff", color: BR.muted, fontFamily: "Rubik,sans-serif", fontSize: 11, fontWeight: 700 }}>✎</button>
                          <button type="button" onClick={() => void delVisit(v)}
                            style={{ padding: "4px 9px", borderRadius: 8, cursor: "pointer", border: "1.5px solid rgba(192,57,43,.2)", background: "rgba(192,57,43,.05)", color: "#c0392b", fontFamily: "Rubik,sans-serif", fontSize: 11, fontWeight: 700 }}>✕</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {[
                          v.weight != null ? `${T.weight}: ${v.weight}` : null,
                          v.bp_sys != null && v.bp_dia != null ? `${T.bp}: ${v.bp_sys}/${v.bp_dia}` : null,
                          v.fundal_height != null ? `${T.fundal}: ${v.fundal_height}` : null,
                          v.fetal_hr != null ? `${T.fhr}: ${v.fetal_hr}` : null,
                          v.hb != null ? `${T.hb}: ${v.hb}` : null,
                        ].filter(Boolean).map((s, k) => (
                          <span key={k} style={{
                            fontSize: 11, fontWeight: 600, color: BR.muted,
                            background: BR.bg, border: `1px solid ${BR.border}`,
                            borderRadius: 8, padding: "3px 9px",
                          }}>{s}</span>
                        ))}
                      </div>
                      {(v.ultrasound || v.complaints || v.notes) && (
                        <div style={{ fontSize: 11.5, color: BR.muted, marginTop: 7, lineHeight: 1.7 }}>
                          {[v.complaints, v.ultrasound, v.notes].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {flags.length > 0 && (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                          {flags.map((f, k) => (
                            <div key={k} style={{
                              fontSize: 11, fontWeight: 600, color: "#c0392b",
                              background: "rgba(192,57,43,.06)", border: "1px solid rgba(192,57,43,.2)",
                              borderRadius: 8, padding: "5px 10px",
                            }}>⚠ {f}</div>
                          ))}
                        </div>
                      )}
                      {v.next_visit && (
                        <div style={{ fontSize: 11, color: BR.primary, marginTop: 7, fontWeight: 600 }}>
                          {T.nextVisit}: {v.next_visit}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: BR.muted, marginTop: 10, lineHeight: 1.7 }}>{T.disclaimer}</p>
            </div>

            {/* ── الفحوص الموصى بها ── */}
            <div style={{
              background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
              padding: 14, boxShadow: "0 2px 10px rgba(8,99,186,.04)",
            }}>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: BR.ink, margin: "0 0 12px" }}>{T.milestones}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {ANC_MILESTONES.map(m => {
                  const passed = ga ? ga.weeks >= m.week : false;
                  return (
                    <div key={m.week} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{
                        width: 30, height: 22, borderRadius: 7, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10.5, fontWeight: 800,
                        background: passed ? "rgba(46,125,50,.1)" : "rgba(8,99,186,.07)",
                        color: passed ? "#2e7d32" : BR.primary,
                      }}>{m.week}أ</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: passed ? BR.muted : BR.ink }}>{m.label}</div>
                        <div style={{ fontSize: 10.5, color: BR.muted, marginTop: 2, lineHeight: 1.6 }}>{m.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ نافذة الحمل ══ */}
      {pregModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }} onClick={() => setPregModal(null)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: 18, padding: 20,
            width: "min(94vw,460px)", maxHeight: "88vh", overflowY: "auto",
            boxShadow: "0 24px 70px rgba(0,0,0,.2)", direction: isAr ? "rtl" : "ltr",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: "0 0 16px" }}>
              {pregModal.isNew ? T.newPreg : T.edit}
            </h3>

            <label style={LB}>{T.lmp} *</label>
            <input type="date" value={pregModal.row.lmp ?? ""}
              onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, lmp: e.target.value || null, edd: e.target.value ? calcEDD(e.target.value) : null } })}
              style={{ ...IS, marginBottom: 12 }} />

            <label style={LB}>{T.edd}</label>
            <input type="date" value={pregModal.row.edd ?? ""}
              onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, edd: e.target.value || null } })}
              style={{ ...IS, marginBottom: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
              <div>
                <label style={LB}>{T.gravida}</label>
                <input type="number" onWheel={noWheel} value={pregModal.row.gravida ?? ""}
                  onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, gravida: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.para}</label>
                <input type="number" onWheel={noWheel} value={pregModal.row.para ?? ""}
                  onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, para: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.bloodType}</label>
                <input value={pregModal.row.blood_type ?? ""} placeholder="O+"
                  onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, blood_type: e.target.value || null } })} style={IS} />
              </div>
            </div>

            <label style={LB}>{T.risk}</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["normal", "moderate", "high"] as RiskLevel[]).map(k => (
                <button key={k} type="button" onClick={() => setPregModal({ ...pregModal, row: { ...pregModal.row, risk_level: k } })}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${pregModal.row.risk_level === k ? RISK_META[k].color : BR.border}`,
                    background: pregModal.row.risk_level === k ? RISK_META[k].bg : "#fff",
                    color: pregModal.row.risk_level === k ? RISK_META[k].color : BR.muted,
                    fontFamily: "Rubik,sans-serif", fontSize: 12, fontWeight: 700,
                  }}>{RISK_META[k].ar}</button>
              ))}
            </div>

            <label style={LB}>{T.status}</label>
            <select value={pregModal.row.status}
              onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, status: e.target.value as Pregnancy["status"] } })}
              style={{ ...IS, marginBottom: 12 }}>
              <option value="active">{T.active}</option>
              <option value="delivered">{T.delivered}</option>
              <option value="ended">{T.ended}</option>
            </select>

            {pregModal.row.status !== "active" && (
              <>
                <label style={LB}>{T.deliveryDate}</label>
                <input type="date" value={pregModal.row.delivery_date ?? ""}
                  onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, delivery_date: e.target.value || null } })}
                  style={{ ...IS, marginBottom: 12 }} />
                <label style={LB}>{T.outcome}</label>
                <input value={pregModal.row.outcome ?? ""} placeholder={T.outcomePh}
                  onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, outcome: e.target.value || null } })}
                  style={{ ...IS, marginBottom: 12 }} />
              </>
            )}

            <label style={LB}>{T.notes}</label>
            <textarea value={pregModal.row.notes ?? ""}
              onChange={e => setPregModal({ ...pregModal, row: { ...pregModal.row, notes: e.target.value || null } })}
              style={{ ...IS, minHeight: 66, resize: "vertical", marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={savePreg} disabled={busy}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 11, border: "none",
                  cursor: busy ? "not-allowed" : "pointer", background: BR.pink, color: "#fff",
                  fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 700, opacity: busy ? .6 : 1,
                }}>{busy ? T.saving : T.save}</button>
              <button type="button" onClick={() => setPregModal(null)}
                style={{
                  padding: "12px 18px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: BR.bg, color: BR.muted, fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 600,
                }}>{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ نافذة الزيارة ══ */}
      {visitModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }} onClick={() => setVisitModal(null)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: 18, padding: 20,
            width: "min(94vw,480px)", maxHeight: "88vh", overflowY: "auto",
            boxShadow: "0 24px 70px rgba(0,0,0,.2)", direction: isAr ? "rtl" : "ltr",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: "0 0 16px" }}>
              {visitModal.isNew ? T.addVisit : T.edit}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={LB}>{T.visitDate} *</label>
                <input type="date" value={visitModal.row.visit_date}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, visit_date: e.target.value } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.gestAge} (أسبوع)</label>
                <input type="number" onWheel={noWheel} value={visitModal.row.gest_weeks ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, gest_weeks: num(e.target.value) } })} style={IS} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
              <div>
                <label style={LB}>{T.weight}</label>
                <input type="number" step="0.1" onWheel={noWheel} value={visitModal.row.weight ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, weight: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.sys}</label>
                <input type="number" onWheel={noWheel} value={visitModal.row.bp_sys ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, bp_sys: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.dia}</label>
                <input type="number" onWheel={noWheel} value={visitModal.row.bp_dia ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, bp_dia: num(e.target.value) } })} style={IS} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
              <div>
                <label style={LB}>{T.fundal}</label>
                <input type="number" step="0.1" onWheel={noWheel} value={visitModal.row.fundal_height ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, fundal_height: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.fhr}</label>
                <input type="number" onWheel={noWheel} value={visitModal.row.fetal_hr ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, fetal_hr: num(e.target.value) } })} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.hb}</label>
                <input type="number" step="0.1" onWheel={noWheel} value={visitModal.row.hb ?? ""}
                  onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, hb: num(e.target.value) } })} style={IS} />
              </div>
            </div>

            <label style={LB}>{T.us}</label>
            <input value={visitModal.row.ultrasound ?? ""}
              onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, ultrasound: e.target.value || null } })}
              style={{ ...IS, marginBottom: 12 }} />

            <label style={LB}>{T.complaints}</label>
            <textarea value={visitModal.row.complaints ?? ""}
              onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, complaints: e.target.value || null } })}
              style={{ ...IS, minHeight: 56, resize: "vertical", marginBottom: 12 }} />

            <label style={LB}>{T.notes}</label>
            <textarea value={visitModal.row.notes ?? ""}
              onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, notes: e.target.value || null } })}
              style={{ ...IS, minHeight: 56, resize: "vertical", marginBottom: 12 }} />

            <label style={LB}>{T.nextVisit}</label>
            <input type="date" value={visitModal.row.next_visit ?? ""}
              onChange={e => setVisitModal({ ...visitModal, row: { ...visitModal.row, next_visit: e.target.value || null } })}
              style={{ ...IS, marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={saveVisit} disabled={busy}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 11, border: "none",
                  cursor: busy ? "not-allowed" : "pointer", background: BR.primary, color: "#fff",
                  fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 700, opacity: busy ? .6 : 1,
                }}>{busy ? T.saving : T.save}</button>
              <button type="button" onClick={() => setVisitModal(null)}
                style={{
                  padding: "12px 18px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: BR.bg, color: BR.muted, fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 600,
                }}>{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .preg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
