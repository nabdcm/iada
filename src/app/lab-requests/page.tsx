"use client";
// ============================================================
// NABD - نبض | طلبات المخبر — إرسال طلب تحليل ومتابعة النتيجة
// Route: /lab-requests   (ميزة 8 + 9)
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, fetchAll } from "@/lib/supabase";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";
import PageIntro from "@/components/PageIntro";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", sky: "#eaf3fc",
  green: "#2e7d32", orange: "#e67e22", red: "#c0392b", purple: "#7b2d8b",
  ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
type ReqStatus = "pending" | "accepted" | "completed" | "rejected" | "cancelled";

interface TestItem {
  catalog_id: number | null; name: string; unit?: string | null;
  ref_low?: number | null; ref_high?: number | null; ref_text?: string | null; price?: number;
}
interface LabRequest {
  id: number; lab_user_id: string | null; clinic_name: string | null;
  patient_id: number | null; mrn: string | null; patient_name: string;
  patient_phone: string | null; patient_gender: string | null; patient_age: string | null;
  referring_doctor: string | null; tests: TestItem[]; notes: string | null;
  urgency: "normal" | "urgent"; status: ReqStatus; lab_order_id: number | null;
  reject_reason: string | null; created_at: string; completed_at: string | null;
}
interface LabOpt { user_id: string; name: string | null; phone: string | null }
interface CatalogTest {
  id: number; name_ar: string; name_en: string | null; category: string;
  unit: string | null; ref_low: number | null; ref_high: number | null;
  ref_text: string | null; price: number;
}
interface PatientOpt {
  id: number; name: string; phone: string | null;
  gender: string | null; date_of_birth: string | null; mrn: string | null;
}
interface ResultRow {
  test_name: string; value: string; unit?: string | null;
  ref_low?: number | null; ref_high?: number | null; ref_text?: string | null;
}

const T = {
  title: "طلبات المخبر", subtitle: "أرسل طلب تحليل إلى مخبر على نبض وتابع النتيجة فور صدورها",
  newReq: "طلب تحليل جديد",
  statPending: "بانتظار المخبر", statActive: "قيد التنفيذ", statDone: "نتائج جاهزة",
  empty: "لا توجد طلبات بعد",
  lab: "المخبر", selectLab: "اختر المخبر...", noLabs: "لا توجد مخابر مسجّلة على نبض حالياً",
  patient: "المريض", selectPatient: "اختر من مرضاك...", manual: "أو أدخل الاسم يدوياً",
  patientName: "اسم المريض *", phone: "الهاتف", age: "العمر", gender: "الجنس",
  male: "ذكر", female: "أنثى",
  doctor: "الطبيب المُحيل", tests: "التحاليل المطلوبة *",
  searchTest: "ابحث في دليل التحاليل...", addCustom: "إضافة تحليل باسم مخصّص",
  selected: "المحدّدة", noneSelected: "لم تُحدَّد تحاليل بعد",
  notes: "ملاحظات سريرية", notesPh: "معلومات تساعد المخبر: الشك السريري، الأدوية الحالية...",
  urgent: "عاجل", normal: "عادي", urgency: "الأولوية",
  send: "إرسال الطلب", sending: "جارٍ الإرسال...", cancel: "إلغاء",
  cancelReq: "سحب الطلب", confirmCancel: "سحب هذا الطلب من المخبر؟",
  viewResult: "عرض النتيجة", closeResult: "إغلاق",
  status: { pending: "بانتظار المخبر", accepted: "قيد التنفيذ", completed: "النتيجة جاهزة", rejected: "مرفوض", cancelled: "مسحوب" } as Record<ReqStatus, string>,
  result: "النتيجة", test: "التحليل", value: "القيمة", ref: "المجال المرجعي",
  noResult: "لم تُدخل النتائج بعد",
  high: "مرتفع", low: "منخفض", normalFlag: "طبيعي",
  err: "حدث خطأ. حاول مجدداً.",
  mrnNote: "يُرسل رقم السجل الطبي (MRN) تلقائياً ليطابق المخبر المريض في منظومة نبض.",
  noMrn: "هذا المريض بلا MRN — سيصل الطلب بالاسم والهاتف.",
};

const STATUS_META: Record<ReqStatus, { color: string; bg: string }> = {
  pending:   { color: BRAND.orange,  bg: "rgba(230,126,34,.1)" },
  accepted:  { color: BRAND.primary, bg: "rgba(8,99,186,.08)" },
  completed: { color: BRAND.green,   bg: "rgba(46,125,50,.1)" },
  rejected:  { color: BRAND.red,     bg: "rgba(192,57,43,.1)" },
  cancelled: { color: BRAND.muted,   bg: "rgba(138,151,166,.12)" },
};

const IS: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: `1.5px solid ${BRAND.border}`, fontFamily: "Rubik,sans-serif",
  fontSize: 13, outline: "none", background: "#fff", color: BRAND.ink,
};
const LB: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: BRAND.muted, display: "block", marginBottom: 6 };

const flagOf = (r: ResultRow): "high" | "low" | "normal" | "empty" => {
  if (!r.value?.trim()) return "empty";
  const v = parseFloat(r.value);
  if (!isNaN(v)) {
    if (r.ref_high != null && v > r.ref_high) return "high";
    if (r.ref_low != null && v < r.ref_low) return "low";
  }
  return "normal";
};

const ageFromDob = (dob: string | null): string => {
  if (!dob) return "";
  const d = new Date(dob), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a >= 0 ? String(a) : "";
};

export default function LabRequestsPage() {
  return (
    <AuthGuard>
      <LabRequestsInner />
    </AuthGuard>
  );
}

function LabRequestsInner() {
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [planLoading, setPlanLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(240);

  const [reqs, setReqs] = useState<LabRequest[]>([]);
  const [labs, setLabs] = useState<LabOpt[]>([]);
  const [catalog, setCatalog] = useState<CatalogTest[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [sending, setSending] = useState(false);
  const [resultFor, setResultFor] = useState<{ req: LabRequest; rows: ResultRow[] | null } | null>(null);

  // نموذج الطلب
  const [fLab, setFLab] = useState("");
  const [fPatientId, setFPatientId] = useState("");
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fGender, setFGender] = useState("");
  const [fAge, setFAge] = useState("");
  const [fDoctor, setFDoctor] = useState("");
  const [fTests, setFTests] = useState<TestItem[]>([]);
  const [fNotes, setFNotes] = useState("");
  const [fUrgent, setFUrgent] = useState(false);
  const [testSearch, setTestSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "ar" || saved === "en") setLang(saved);
  }, []);

  const authHeaders = useCallback(async (): Promise<Record<string, string> | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const h = await authHeaders();
    if (!h) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: clinic } = await supabase
      .from("clinics").select("plan, owner").eq("user_id", user.id).maybeSingle();
    if (clinic?.plan) setPlan(clinic.plan as PlanType);
    if (clinic?.owner && !fDoctor) setFDoctor(clinic.owner);
    setPlanLoading(false);

    try {
      const [rRes, lRes] = await Promise.all([
        fetch("/api/lab-requests?role=clinic", { headers: h }),
        fetch("/api/lab-requests/labs", { headers: h }),
      ]);
      const rJson = await rRes.json();
      const lJson = await lRes.json();
      if (rRes.ok) setReqs((rJson.requests ?? []) as LabRequest[]); else setErr(rJson.error ?? T.err);
      if (lRes.ok) { setLabs((lJson.labs ?? []) as LabOpt[]); setCatalog((lJson.catalog ?? []) as CatalogTest[]); }
    } catch {
      setErr(T.err);
    }

    const pats = await fetchAll<PatientOpt>(
      supabase.from("patients")
        .select("id, name, phone, gender, date_of_birth, mrn")
        .eq("user_id", user.id).order("name", { ascending: true })
    );
    setPatients(pats);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  useEffect(() => { void load(); }, [load]);

  const pickPatient = (id: string) => {
    setFPatientId(id);
    const p = patients.find(x => String(x.id) === id);
    if (p) {
      setFName(p.name);
      setFPhone(p.phone ?? "");
      setFGender(p.gender ?? "");
      setFAge(ageFromDob(p.date_of_birth));
    }
  };

  const toggleTest = (c: CatalogTest) => {
    setFTests(ts => {
      const exists = ts.find(t => t.catalog_id === c.id);
      if (exists) return ts.filter(t => t.catalog_id !== c.id);
      return [...ts, {
        catalog_id: c.id, name: c.name_ar, unit: c.unit,
        ref_low: c.ref_low, ref_high: c.ref_high, ref_text: c.ref_text, price: c.price,
      }];
    });
  };

  const addCustomTest = () => {
    const n = testSearch.trim();
    if (!n) return;
    setFTests(ts => [...ts, { catalog_id: null, name: n }]);
    setTestSearch("");
  };

  const resetForm = () => {
    setFLab(""); setFPatientId(""); setFName(""); setFPhone(""); setFGender("");
    setFAge(""); setFTests([]); setFNotes(""); setFUrgent(false); setTestSearch("");
  };

  const submit = async () => {
    if (!fLab || !fName.trim() || fTests.length === 0) return;
    setSending(true); setErr(null);
    const h = await authHeaders();
    if (!h) { setSending(false); return; }
    try {
      const r = await fetch("/api/lab-requests", {
        method: "POST", headers: h,
        body: JSON.stringify({
          action: "create", lab_user_id: fLab,
          patient_id: fPatientId || null, patient_name: fName.trim(),
          patient_phone: fPhone || null, patient_gender: fGender || null,
          patient_age: fAge || null, referring_doctor: fDoctor || null,
          tests: fTests, notes: fNotes || null,
          urgency: fUrgent ? "urgent" : "normal",
        }),
      });
      const json = await r.json();
      if (!r.ok) { setErr(json.error ?? T.err); setSending(false); return; }
      setReqs(rs => [json.request as LabRequest, ...rs]);
      setShowNew(false); resetForm();
    } catch {
      setErr(T.err);
    }
    setSending(false);
  };

  const cancelReq = async (id: number) => {
    if (!confirm(T.confirmCancel)) return;
    const h = await authHeaders();
    if (!h) return;
    const r = await fetch("/api/lab-requests", {
      method: "POST", headers: h, body: JSON.stringify({ action: "cancel", id }),
    });
    const json = await r.json();
    if (!r.ok) { setErr(json.error ?? T.err); return; }
    setReqs(rs => rs.map(x => (x.id === id ? { ...x, status: "cancelled" } : x)));
  };

  const openResult = async (req: LabRequest) => {
    setResultFor({ req, rows: null });
    const h = await authHeaders();
    if (!h) return;
    const r = await fetch(`/api/lab-requests/result?request_id=${req.id}`, { headers: h });
    const json = await r.json();
    setResultFor({ req, rows: (json.order?.results ?? []) as ResultRow[] });
  };

  const stats = useMemo(() => ({
    pending: reqs.filter(r => r.status === "pending").length,
    active: reqs.filter(r => r.status === "accepted").length,
    done: reqs.filter(r => r.status === "completed").length,
  }), [reqs]);

  const filteredCatalog = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    const list = q
      ? catalog.filter(c => c.name_ar.toLowerCase().includes(q) || (c.name_en ?? "").toLowerCase().includes(q))
      : catalog;
    return list.slice(0, 40);
  }, [catalog, testSearch]);

  const selectedPatient = patients.find(p => String(p.id) === fPatientId);

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", direction: "rtl", minHeight: "100vh", background: BRAND.bg }}>
      <SharedSidebar lang={lang} setLang={setLang} activePage="labRequests"
        plan={plan} planLoading={planLoading} onCollapse={c => setSidebarWidth(c ? 70 : 240)} />

      <main className="lr-main" style={{ padding: "0 20px 60px", minHeight: "100vh", transition: "margin .3s" }}>
        <PageIntro pageKey="labRequests" lang={lang} />

        {/* أزرار وإحصاءات */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(110px,1fr))", gap: 10, flex: 1, minWidth: 260 }}>
            {[
              { l: T.statPending, v: stats.pending, c: BRAND.orange },
              { l: T.statActive, v: stats.active, c: BRAND.primary },
              { l: T.statDone, v: stats.done, c: BRAND.green },
            ].map((s, i) => (
              <div key={i} style={{
                background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 13,
                padding: "12px 14px", boxShadow: "0 2px 9px rgba(8,99,186,.04)",
              }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 5, fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowNew(true)}
            style={{
              padding: "11px 20px", borderRadius: 11, border: "none", cursor: "pointer",
              background: BRAND.primary, color: "#fff", fontFamily: "Rubik,sans-serif",
              fontSize: 13.5, fontWeight: 700, boxShadow: "0 4px 16px rgba(8,99,186,.25)",
            }}>＋ {T.newReq}</button>
        </div>

        {err && (
          <div style={{
            background: "rgba(192,57,43,.07)", border: "1.5px solid rgba(192,57,43,.25)",
            color: BRAND.red, borderRadius: 12, padding: "11px 14px", fontSize: 12.5,
            marginBottom: 14, fontWeight: 600,
          }}>{err}</div>
        )}

        {/* القائمة */}
        <div style={{
          background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16,
          overflow: "hidden", boxShadow: "0 2px 12px rgba(8,99,186,.05)",
        }}>
          {loading ? (
            <div style={{ padding: "50px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>…</div>
          ) : reqs.length === 0 ? (
            <div style={{ padding: "56px 16px", textAlign: "center", color: "#c8d2dc", fontSize: 13.5 }}>{T.empty}</div>
          ) : reqs.map((r, i) => {
            const meta = STATUS_META[r.status];
            return (
              <div key={r.id} style={{
                padding: "14px 16px",
                borderBottom: i < reqs.length - 1 ? `1px solid ${BRAND.border}` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
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
                        }}>{T.urgent}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 5 }}>
                      {new Date(r.created_at).toLocaleDateString("ar-EG")}
                      {r.referring_doctor ? ` · ${r.referring_doctor}` : ""}
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
                    {r.reject_reason && (
                      <div style={{ fontSize: 11.5, color: BRAND.red, marginTop: 8 }}>{r.reject_reason}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg,
                      borderRadius: 20, padding: "4px 12px",
                    }}>{T.status[r.status]}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.status === "pending" && (
                        <button type="button" onClick={() => void cancelReq(r.id)}
                          style={{
                            padding: "6px 13px", borderRadius: 9, cursor: "pointer",
                            border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.muted,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>{T.cancelReq}</button>
                      )}
                      {(r.status === "completed" || r.status === "accepted") && r.lab_order_id && (
                        <button type="button" onClick={() => void openResult(r)}
                          style={{
                            padding: "6px 13px", borderRadius: 9, cursor: "pointer",
                            border: "1.5px solid rgba(46,125,50,.28)", background: "rgba(46,125,50,.07)", color: BRAND.green,
                            fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                          }}>{T.viewResult}</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ══ نافذة الطلب الجديد ══ */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}
            onClick={() => setShowNew(false)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: 18, padding: 20,
            width: "min(95vw,560px)", maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 24px 70px rgba(0,0,0,.22)", direction: "rtl",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: BRAND.ink, margin: "0 0 16px" }}>{T.newReq}</h3>

            <label style={LB}>{T.lab} *</label>
            {labs.length === 0 ? (
              <div style={{
                background: "rgba(230,126,34,.07)", border: "1.5px solid rgba(230,126,34,.25)",
                color: "#b9651b", borderRadius: 10, padding: "10px 12px", fontSize: 12, marginBottom: 12,
              }}>{T.noLabs}</div>
            ) : (
              <select value={fLab} onChange={e => setFLab(e.target.value)} style={{ ...IS, marginBottom: 12 }}>
                <option value="">{T.selectLab}</option>
                {labs.map(l => <option key={l.user_id} value={l.user_id}>{l.name ?? "مخبر"}</option>)}
              </select>
            )}

            <label style={LB}>{T.patient}</label>
            <select value={fPatientId} onChange={e => pickPatient(e.target.value)} style={{ ...IS, marginBottom: 8 }}>
              <option value="">{T.selectPatient}</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.mrn ? ` — ${p.mrn}` : ""}</option>)}
            </select>
            {fPatientId && (
              <div style={{ fontSize: 11, color: selectedPatient?.mrn ? BRAND.muted : BRAND.orange, marginBottom: 10, lineHeight: 1.7 }}>
                {selectedPatient?.mrn ? T.mrnNote : T.noMrn}
              </div>
            )}

            <label style={LB}>{T.patientName}</label>
            <input value={fName} onChange={e => setFName(e.target.value)} style={{ ...IS, marginBottom: 12 }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 12 }}>
              <div>
                <label style={LB}>{T.phone}</label>
                <input value={fPhone} onChange={e => setFPhone(e.target.value)} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.age}</label>
                <input value={fAge} onChange={e => setFAge(e.target.value)} style={IS} />
              </div>
              <div>
                <label style={LB}>{T.gender}</label>
                <select value={fGender} onChange={e => setFGender(e.target.value)} style={IS}>
                  <option value="">—</option>
                  <option value="male">{T.male}</option>
                  <option value="female">{T.female}</option>
                </select>
              </div>
            </div>

            <label style={LB}>{T.doctor}</label>
            <input value={fDoctor} onChange={e => setFDoctor(e.target.value)} style={{ ...IS, marginBottom: 12 }} />

            <label style={LB}>{T.tests}</label>
            <input value={testSearch} onChange={e => setTestSearch(e.target.value)}
              placeholder={T.searchTest} style={{ ...IS, marginBottom: 8 }} />

            {testSearch.trim() && (
              <button type="button" onClick={addCustomTest}
                style={{
                  width: "100%", padding: "8px 0", borderRadius: 9, marginBottom: 8, cursor: "pointer",
                  border: `1.5px dashed ${BRAND.border}`, background: BRAND.bg, color: BRAND.primary,
                  fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                }}>＋ {T.addCustom}: «{testSearch.trim()}»</button>
            )}

            <div style={{
              maxHeight: 170, overflowY: "auto", border: `1.5px solid ${BRAND.border}`,
              borderRadius: 11, padding: 8, marginBottom: 10, background: BRAND.bg,
            }}>
              {filteredCatalog.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#c8d2dc", fontSize: 12 }}>—</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {filteredCatalog.map(c => {
                    const on = fTests.some(t => t.catalog_id === c.id);
                    return (
                      <button key={c.id} type="button" onClick={() => toggleTest(c)}
                        style={{
                          padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                          border: `1.5px solid ${on ? BRAND.primary : BRAND.border}`,
                          background: on ? "rgba(8,99,186,.08)" : "#fff",
                          color: on ? BRAND.primary : BRAND.muted,
                          fontFamily: "Rubik,sans-serif", fontSize: 11.5, fontWeight: 700,
                        }}>{c.name_ar}</button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, color: BRAND.muted, marginBottom: 6 }}>
              {T.selected} ({fTests.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, minHeight: 24 }}>
              {fTests.length === 0 ? (
                <span style={{ fontSize: 11.5, color: "#c8d2dc" }}>{T.noneSelected}</span>
              ) : fTests.map((t, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, fontWeight: 700, color: BRAND.primary,
                  background: "rgba(8,99,186,.08)", borderRadius: 20, padding: "4px 10px",
                }}>
                  {t.name}
                  <button type="button" onClick={() => setFTests(ts => ts.filter((_, k) => k !== i))}
                    style={{ border: "none", background: "none", cursor: "pointer", color: BRAND.primary, fontSize: 13, lineHeight: 1, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>

            <label style={LB}>{T.urgency}</label>
            <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
              {[{ v: false, l: T.normal, c: BRAND.primary }, { v: true, l: T.urgent, c: BRAND.red }].map((o, i) => (
                <button key={i} type="button" onClick={() => setFUrgent(o.v)}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${fUrgent === o.v ? o.c : BRAND.border}`,
                    background: fUrgent === o.v ? `${o.c}12` : "#fff",
                    color: fUrgent === o.v ? o.c : BRAND.muted,
                    fontFamily: "Rubik,sans-serif", fontSize: 12.5, fontWeight: 700,
                  }}>{o.l}</button>
              ))}
            </div>

            <label style={LB}>{T.notes}</label>
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder={T.notesPh}
              style={{ ...IS, minHeight: 70, resize: "vertical", marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={submit}
                disabled={sending || !fLab || !fName.trim() || fTests.length === 0}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 11, border: "none",
                  cursor: sending ? "not-allowed" : "pointer", background: BRAND.primary, color: "#fff",
                  fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 700,
                  opacity: sending || !fLab || !fName.trim() || fTests.length === 0 ? .55 : 1,
                }}>{sending ? T.sending : T.send}</button>
              <button type="button" onClick={() => setShowNew(false)}
                style={{
                  padding: "12px 20px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: BRAND.bg, color: BRAND.muted, fontFamily: "Rubik,sans-serif", fontSize: 13.5, fontWeight: 600,
                }}>{T.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ نافذة النتيجة ══ */}
      {resultFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(5px)" }}
            onClick={() => setResultFor(null)} />
          <div style={{
            position: "relative", background: "#fff", borderRadius: 18, padding: 20,
            width: "min(95vw,600px)", maxHeight: "88vh", overflowY: "auto",
            boxShadow: "0 24px 70px rgba(0,0,0,.22)", direction: "rtl",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15.5, fontWeight: 800, color: BRAND.ink, margin: 0 }}>
                  {T.result} — {resultFor.req.patient_name}
                </h3>
                {resultFor.req.mrn && <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 3 }}>{resultFor.req.mrn}</div>}
              </div>
              <button type="button" onClick={() => setResultFor(null)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: BRAND.muted }}>✕</button>
            </div>

            {resultFor.rows === null ? (
              <div style={{ padding: "36px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>…</div>
            ) : resultFor.rows.length === 0 ? (
              <div style={{ padding: "36px", textAlign: "center", color: "#c8d2dc", fontSize: 13 }}>{T.noResult}</div>
            ) : (
              <div style={{ border: `1.5px solid ${BRAND.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "9px 12px",
                  background: BRAND.bg, fontSize: 10.5, fontWeight: 800, color: BRAND.muted,
                }}>
                  <div>{T.test}</div><div>{T.value}</div><div>{T.ref}</div>
                </div>
                {resultFor.rows.map((r, i) => {
                  const f = flagOf(r);
                  const c = f === "high" ? BRAND.red : f === "low" ? BRAND.orange : f === "normal" ? BRAND.green : BRAND.muted;
                  return (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "10px 12px",
                      borderTop: `1px solid ${BRAND.border}`, fontSize: 12, alignItems: "center",
                    }}>
                      <div style={{ fontWeight: 700, color: BRAND.ink }}>{r.test_name}</div>
                      <div style={{ fontWeight: 800, color: c }}>
                        {r.value || "—"}{r.unit ? ` ${r.unit}` : ""}
                        {f !== "empty" && f !== "normal" && (
                          <span style={{ fontSize: 10, marginRight: 5 }}>({f === "high" ? T.high : T.low})</span>
                        )}
                      </div>
                      <div style={{ color: BRAND.muted, fontSize: 11 }}>
                        {r.ref_text ?? (r.ref_low != null || r.ref_high != null ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""}` : "—")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .lr-main { margin-right: ${sidebarWidth}px; }
        @media (max-width: 900px) { .lr-main { margin-right: 0 !important; } }
      `}</style>
    </div>
  );
}
