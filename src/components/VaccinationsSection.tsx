"use client";

// ============================================================
// VaccinationsSection — إدارة اللقاحات وجدول تطعيم الأطفال
// يولّد الجدول الوطني الافتراضي من تاريخ الميلاد، ويسمح بالتعديل
// وإضافة لقاحات خارج الجدول.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildScheduleRows, effectiveStatus, VACC_STATUS_META,
  type VaccineRow, type VaccineStatus,
} from "@/lib/vaccineSchedule";

type Lang = "ar" | "en";
const BR = { primary: "#0863ba", ink: "#353535", muted: "#8a97a6", border: "#eef0f3", bg: "#f7f9fc" };

const IS: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BR.border}`, fontFamily: "Rubik,sans-serif",
  fontSize: 13, outline: "none", background: "#fff", color: BR.ink,
};

const T = {
  ar: {
    title: "جدول التطعيم", sub: "متابعة اللقاحات المستحقة والمُعطاة",
    generate: "توليد الجدول الافتراضي", regenerate: "إعادة توليد الجدول",
    generating: "جاري التوليد...", addOne: "إضافة لقاح",
    needDob: "أضف تاريخ ميلاد المريض أولاً لتوليد جدول التطعيم تلقائياً.",
    empty: "لا توجد لقاحات مسجّلة — يمكنك توليد الجدول الافتراضي.",
    confirmRegen: "سيُحذف الجدول الحالي ويُعاد توليده من تاريخ الميلاد. هل تريد المتابعة؟ (اللقاحات المُعطاة ستُحذف أيضاً)",
    confirmDel: "حذف هذا اللقاح من السجل؟",
    markGiven: "تسجيل الإعطاء", undo: "تراجع", edit: "تعديل", del: "حذف",
    vaccine: "اللقاح", dose: "الجرعة", due: "الاستحقاق", given: "تاريخ الإعطاء",
    batch: "رقم التشغيلة", notes: "ملاحظات", status: "الحالة",
    save: "حفظ", cancel: "إلغاء", saving: "جاري الحفظ...",
    addTitle: "إضافة لقاح", editTitle: "تعديل اللقاح",
    namePh: "اسم اللقاح", dosePh: "مثال: الجرعة 1",
    counts: { given: "أُعطي", overdue: "متأخر", scheduled: "قادم" },
    disclaimer: "الجدول قالب إرشادي — يُعدَّل حسب توصيات وزارة الصحة والحالة السريرية.",
    loadErr: "تعذّر تحميل اللقاحات",
    saveErr: "تعذّر الحفظ — لم تُسجّل التغييرات",
  },
  en: {
    title: "Vaccination Schedule", sub: "Track due and administered vaccines",
    generate: "Generate default schedule", regenerate: "Regenerate schedule",
    generating: "Generating...", addOne: "Add vaccine",
    needDob: "Add the patient's date of birth first to auto-generate the schedule.",
    empty: "No vaccines recorded — you can generate the default schedule.",
    confirmRegen: "The current schedule will be deleted and rebuilt from the date of birth. Continue? (Administered doses will be removed too)",
    confirmDel: "Delete this vaccine record?",
    markGiven: "Mark as given", undo: "Undo", edit: "Edit", del: "Delete",
    vaccine: "Vaccine", dose: "Dose", due: "Due", given: "Given on",
    batch: "Batch no.", notes: "Notes", status: "Status",
    save: "Save", cancel: "Cancel", saving: "Saving...",
    addTitle: "Add vaccine", editTitle: "Edit vaccine",
    namePh: "Vaccine name", dosePh: "e.g. Dose 1",
    counts: { given: "Given", overdue: "Overdue", scheduled: "Upcoming" },
    disclaimer: "This is a guideline template — adjust to national recommendations and clinical status.",
    loadErr: "Failed to load vaccinations",
    saveErr: "Save failed — changes were not recorded",
  },
};

interface Props {
  lang: Lang;
  patientId: number;
  userId: string;
  dob: string | null;
}

export default function VaccinationsSection({ lang, patientId, userId, dob }: Props) {
  const isAr = lang === "ar";
  const tr = T[isAr ? "ar" : "en"];

  const [rows, setRows] = useState<VaccineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<{ row: VaccineRow; isNew: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase
      .from("patient_vaccinations")
      .select("*")
      .eq("user_id", userId)
      .eq("patient_id", patientId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .range(0, 999);
    if (error) setErr(tr.loadErr);
    else setRows((data ?? []) as VaccineRow[]);
    setLoading(false);
  }, [patientId, userId, tr.loadErr]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    if (!dob) return;
    if (rows.length > 0 && !confirm(tr.confirmRegen)) return;
    setBusy(true); setErr(null);
    if (rows.length > 0) {
      const { error: delErr } = await supabase
        .from("patient_vaccinations").delete()
        .eq("user_id", userId).eq("patient_id", patientId);
      if (delErr) { setErr(tr.saveErr); setBusy(false); return; }
    }
    const payload = buildScheduleRows(patientId, dob).map(r => ({ ...r, user_id: userId }));
    const { error } = await supabase.from("patient_vaccinations").insert(payload);
    if (error) setErr(tr.saveErr);
    setBusy(false);
    await load();
  };

  const patchRow = async (id: number, patch: Partial<VaccineRow>) => {
    setErr(null);
    const { error } = await supabase
      .from("patient_vaccinations").update(patch)
      .eq("id", id).eq("user_id", userId);
    if (error) { setErr(tr.saveErr); return; }
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleGiven = async (row: VaccineRow) => {
    if (!row.id) return;
    if (row.status === "given") await patchRow(row.id, { status: "scheduled", given_date: null });
    else await patchRow(row.id, { status: "given", given_date: new Date().toISOString().slice(0, 10) });
  };

  const removeRow = async (row: VaccineRow) => {
    if (!row.id || !confirm(tr.confirmDel)) return;
    setErr(null);
    const { error } = await supabase
      .from("patient_vaccinations").delete().eq("id", row.id).eq("user_id", userId);
    if (error) { setErr(tr.saveErr); return; }
    setRows(rs => rs.filter(r => r.id !== row.id));
  };

  const saveModal = async () => {
    if (!modal) return;
    const r = modal.row;
    if (!r.vaccine_name.trim()) return;
    setBusy(true); setErr(null);
    if (modal.isNew) {
      const { data, error } = await supabase.from("patient_vaccinations")
        .insert({
          user_id: userId, patient_id: patientId,
          vaccine_key: r.vaccine_key, vaccine_name: r.vaccine_name.trim(),
          dose_label: r.dose_label, due_date: r.due_date, given_date: r.given_date,
          status: r.status, batch_no: r.batch_no, notes: r.notes,
        })
        .select().single();
      if (error) { setErr(tr.saveErr); setBusy(false); return; }
      setRows(rs => [...rs, data as VaccineRow]);
    } else if (r.id) {
      const { error } = await supabase.from("patient_vaccinations")
        .update({
          vaccine_name: r.vaccine_name.trim(), dose_label: r.dose_label,
          due_date: r.due_date, given_date: r.given_date, status: r.status,
          batch_no: r.batch_no, notes: r.notes,
        })
        .eq("id", r.id).eq("user_id", userId);
      if (error) { setErr(tr.saveErr); setBusy(false); return; }
      setRows(rs => rs.map(x => (x.id === r.id ? r : x)));
    }
    setBusy(false); setModal(null);
  };

  const counts = rows.reduce(
    (a, r) => { const s = effectiveStatus(r); if (s === "given") a.given++; else if (s === "overdue") a.overdue++; else if (s === "scheduled") a.scheduled++; return a; },
    { given: 0, overdue: 0, scheduled: 0 }
  );

  const blank = (): VaccineRow => ({
    patient_id: patientId, vaccine_key: null, vaccine_name: "", dose_label: "",
    due_date: new Date().toISOString().slice(0, 10), given_date: null,
    status: "scheduled", batch_no: null, notes: null,
  });

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik,sans-serif" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: 0 }}>{tr.title}</h3>
          <p style={{ fontSize: 12, color: BR.muted, margin: "3px 0 0" }}>{tr.sub}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setModal({ row: blank(), isNew: true })}
            style={{
              padding: "9px 16px", borderRadius: 10, cursor: "pointer",
              border: `1.5px solid ${BR.border}`, background: "#fff", color: BR.ink,
              fontFamily: "Rubik,sans-serif", fontSize: 12.5, fontWeight: 700,
            }}>＋ {tr.addOne}</button>
          <button type="button" onClick={generate} disabled={!dob || busy}
            title={!dob ? tr.needDob : undefined}
            style={{
              padding: "9px 16px", borderRadius: 10, border: "none",
              cursor: !dob || busy ? "not-allowed" : "pointer",
              background: BR.primary, color: "#fff", opacity: !dob || busy ? .55 : 1,
              fontFamily: "Rubik,sans-serif", fontSize: 12.5, fontWeight: 700,
              boxShadow: "0 4px 14px rgba(8,99,186,.22)",
            }}>
            {busy ? tr.generating : rows.length > 0 ? tr.regenerate : tr.generate}
          </button>
        </div>
      </div>

      {!dob && (
        <div style={{
          background: "rgba(230,126,34,.07)", border: "1.5px solid rgba(230,126,34,.25)",
          color: "#b9651b", borderRadius: 12, padding: "11px 14px", fontSize: 12.5, marginBottom: 14,
        }}>{tr.needDob}</div>
      )}

      {err && (
        <div style={{
          background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
          color: "#c0392b", borderRadius: 12, padding: "11px 14px", fontSize: 12.5, marginBottom: 14, fontWeight: 600,
        }}>{err}</div>
      )}

      {/* عدّادات */}
      {rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
          {(["given", "overdue", "scheduled"] as const).map(k => {
            const meta = VACC_STATUS_META[k as VaccineStatus];
            return (
              <div key={k} style={{
                background: meta.bg, border: `1.5px solid ${meta.color}25`,
                borderRadius: 13, padding: "12px 14px",
              }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: meta.color, lineHeight: 1 }}>{counts[k]}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: meta.color, opacity: .8, marginTop: 4 }}>{tr.counts[k]}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* القائمة */}
      <div style={{
        background: "#fff", border: `1.5px solid ${BR.border}`, borderRadius: 14,
        overflow: "hidden", boxShadow: "0 2px 10px rgba(8,99,186,.04)",
      }}>
        {loading ? (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "44px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>{tr.empty}</div>
        ) : (
          rows.map((r, i) => {
            const st = effectiveStatus(r);
            const meta = VACC_STATUS_META[st];
            return (
              <div key={r.id ?? i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderBottom: i < rows.length - 1 ? `1px solid ${BR.border}` : "none",
                background: st === "overdue" ? "rgba(192,57,43,.03)" : "#fff",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BR.ink }}>
                    {r.vaccine_name}
                    {r.dose_label && <span style={{ color: BR.muted, fontWeight: 600, fontSize: 11.5 }}> · {r.dose_label}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: BR.muted, marginTop: 3 }}>
                    {r.due_date ? `${tr.due}: ${r.due_date}` : ""}
                    {r.given_date ? ` · ${tr.given}: ${r.given_date}` : ""}
                    {r.batch_no ? ` · ${tr.batch}: ${r.batch_no}` : ""}
                  </div>
                  {r.notes && <div style={{ fontSize: 11, color: BR.muted, marginTop: 3 }}>{r.notes}</div>}
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: meta.color, background: meta.bg,
                  borderRadius: 20, padding: "3px 10px", flexShrink: 0,
                }}>{meta.ar}</span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => void toggleGiven(r)} title={r.status === "given" ? tr.undo : tr.markGiven}
                    style={{
                      padding: "6px 11px", borderRadius: 9, cursor: "pointer",
                      border: `1.5px solid ${r.status === "given" ? BR.border : "rgba(46,125,50,.3)"}`,
                      background: r.status === "given" ? BR.bg : "rgba(46,125,50,.07)",
                      color: r.status === "given" ? BR.muted : "#2e7d32",
                      fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                    }}>{r.status === "given" ? tr.undo : "✓"}</button>
                  <button type="button" onClick={() => setModal({ row: { ...r }, isNew: false })} title={tr.edit}
                    style={{
                      padding: "6px 11px", borderRadius: 9, cursor: "pointer",
                      border: `1.5px solid ${BR.border}`, background: "#fff", color: BR.muted,
                      fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                    }}>✎</button>
                  <button type="button" onClick={() => void removeRow(r)} title={tr.del}
                    style={{
                      padding: "6px 11px", borderRadius: 9, cursor: "pointer",
                      border: "1.5px solid rgba(192,57,43,.2)", background: "rgba(192,57,43,.05)", color: "#c0392b",
                      fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                    }}>✕</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: 11, color: BR.muted, marginTop: 10, lineHeight: 1.7 }}>{tr.disclaimer}</p>

      {/* نافذة الإضافة/التعديل */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}
            onClick={() => setModal(null)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: 18, padding: 20,
            width: "min(94vw,440px)", maxHeight: "88vh", overflowY: "auto",
            boxShadow: "0 24px 70px rgba(0,0,0,.2)", direction: isAr ? "rtl" : "ltr",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: BR.ink, margin: "0 0 16px" }}>
              {modal.isNew ? tr.addTitle : tr.editTitle}
            </h3>

            <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.vaccine} *</label>
            <input value={modal.row.vaccine_name} placeholder={tr.namePh}
              onChange={e => setModal({ ...modal, row: { ...modal.row, vaccine_name: e.target.value } })}
              style={{ ...IS, marginBottom: 12 }} />

            <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.dose}</label>
            <input value={modal.row.dose_label ?? ""} placeholder={tr.dosePh}
              onChange={e => setModal({ ...modal, row: { ...modal.row, dose_label: e.target.value || null } })}
              style={{ ...IS, marginBottom: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.due}</label>
                <input type="date" value={modal.row.due_date ?? ""}
                  onChange={e => setModal({ ...modal, row: { ...modal.row, due_date: e.target.value || null } })}
                  style={IS} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.given}</label>
                <input type="date" value={modal.row.given_date ?? ""}
                  onChange={e => setModal({
                    ...modal,
                    row: { ...modal.row, given_date: e.target.value || null, status: e.target.value ? "given" : modal.row.status },
                  })}
                  style={IS} />
              </div>
            </div>

            <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.batch}</label>
            <input value={modal.row.batch_no ?? ""}
              onChange={e => setModal({ ...modal, row: { ...modal.row, batch_no: e.target.value || null } })}
              style={{ ...IS, marginBottom: 12 }} />

            <label style={{ fontSize: 11.5, fontWeight: 700, color: BR.muted, display: "block", marginBottom: 6 }}>{tr.notes}</label>
            <textarea value={modal.row.notes ?? ""}
              onChange={e => setModal({ ...modal, row: { ...modal.row, notes: e.target.value || null } })}
              style={{ ...IS, minHeight: 66, resize: "vertical", marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={saveModal} disabled={busy || !modal.row.vaccine_name.trim()}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 11, border: "none",
                  cursor: busy ? "not-allowed" : "pointer", background: BR.primary, color: "#fff",
                  fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 700,
                  opacity: busy || !modal.row.vaccine_name.trim() ? .6 : 1,
                }}>{busy ? tr.saving : tr.save}</button>
              <button type="button" onClick={() => setModal(null)}
                style={{
                  padding: "12px 18px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: BR.bg, color: BR.muted, fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 600,
                }}>{tr.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
