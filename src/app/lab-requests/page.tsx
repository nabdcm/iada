"use client";
// ============================================================
// NABD - نبض | طلبات المخبر — إرسال طلب تحليل ومتابعة النتيجة
// Route: /lab-requests   (ميزة 8 + 9)
// تصميم موحّد مع لوحة التحكم: hero gradient · stat cards · موبايل أولاً
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, fetchAll } from "@/lib/supabase";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";
import PageIntro from "@/components/PageIntro";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6",
  sky: "#eaf3fc", green: "#2e7d32", teal: "#16a085", orange: "#e67e22",
  red: "#c0392b", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
type ReqStatus = "pending" | "accepted" | "completed" | "rejected" | "cancelled";
type TabKey = "all" | "pending" | "accepted" | "completed";

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
  title: "طلبات المخبر",
  subtitle: "أرسل طلب تحليل إلى مخبر على نبض وتابع النتيجة فور صدورها",
  newReq: "طلب تحليل جديد",
  statPending: "بانتظار المخبر", statActive: "قيد التنفيذ", statDone: "نتائج جاهزة",
  tabs: { all: "الكل", pending: "بالانتظار", accepted: "قيد التنفيذ", completed: "جاهزة" } as Record<TabKey, string>,
  empty: "لا توجد طلبات بعد",
  emptyHint: "ابدأ بإرسال أول طلب تحليل إلى مخبر على نبض",
  emptyFiltered: "لا توجد طلبات في هذا التصنيف",
  lab: "المخبر", selectLab: "اختر المخبر...", noLabs: "لا توجد مخابر مسجّلة على نبض حالياً",
  patient: "المريض", selectPatient: "اختر من مرضاك...",
  patientName: "اسم المريض", phone: "الهاتف", age: "العمر", gender: "الجنس",
  male: "ذكر", female: "أنثى",
  doctor: "الطبيب المُحيل", tests: "التحاليل المطلوبة",
  searchTest: "ابحث في دليل التحاليل...", addCustom: "إضافة تحليل باسم مخصّص",
  selected: "المحدّدة", noneSelected: "لم تُحدَّد تحاليل بعد",
  notes: "ملاحظات سريرية",
  notesPh: "معلومات تساعد المخبر: الشك السريري، الأدوية الحالية...",
  urgent: "عاجل", normal: "عادي", urgency: "الأولوية",
  send: "إرسال الطلب", sending: "جارٍ الإرسال...", cancel: "إلغاء",
  cancelReq: "سحب الطلب", confirmCancel: "سحب هذا الطلب من المخبر؟",
  viewResult: "عرض النتيجة",
  status: {
    pending: "بانتظار المخبر", accepted: "قيد التنفيذ",
    completed: "النتيجة جاهزة", rejected: "مرفوض", cancelled: "مسحوب",
  } as Record<ReqStatus, string>,
  result: "النتيجة", ref: "المجال المرجعي",
  noResult: "لم تُدخل النتائج بعد",
  high: "مرتفع", low: "منخفض",
  err: "حدث خطأ. حاول مجدداً.",
  mrnNote: "سيُرسل رقم السجل الطبي تلقائياً ليطابق المخبر المريض.",
  noMrn: "هذا المريض بلا رقم سجل طبي — سيصل الطلب بالاسم والهاتف.",
  required: "اختر المخبر، وأدخل اسم المريض، وحدّد تحليلاً واحداً على الأقل.",
  noCatalog: "لا نتائج في الدليل — استخدم الإضافة المخصّصة",
  loading: "جارٍ التحميل...",
  sentOk: "✓ أُرسل الطلب إلى المخبر",
  years: "سنة",
};

const STATUS_META: Record<ReqStatus, { color: string; bg: string }> = {
  pending:   { color: BRAND.orange,  bg: "rgba(230,126,34,.1)" },
  accepted:  { color: BRAND.primary, bg: "rgba(8,99,186,.09)" },
  completed: { color: BRAND.green,   bg: "rgba(46,125,50,.1)" },
  rejected:  { color: BRAND.red,     bg: "rgba(192,57,43,.1)" },
  cancelled: { color: BRAND.muted,   bg: "rgba(138,151,166,.12)" },
};

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 7 };
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12,
  border: "1.5px solid #dbe4ef", fontFamily: "'Rubik',sans-serif", fontSize: 14,
  color: BRAND.ink, background: "#fbfdff", outline: "none",
};

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

function StatCard({ icon, accent, accentSoft, label, value }: {
  icon: string; accent: string; accentSoft: string; label: string; value: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: "18px 20px",
      border: `1.5px solid ${BRAND.border}`, boxShadow: "0 4px 16px rgba(8,99,186,.05)",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, background: accentSoft,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 600, marginTop: 5 }}>{label}</div>
      </div>
    </div>
  );
}

export default function LabRequestsPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [loading, setLoading] = useState(true);
  const isAr = lang === "ar";

  const [reqs, setReqs] = useState<LabRequest[]>([]);
  const [labs, setLabs] = useState<LabOpt[]>([]);
  const [catalog, setCatalog] = useState<CatalogTest[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [tab, setTab] = useState<TabKey>("all");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
    setLoading(true);
    const h = await authHeaders();
    const { data: { user } } = await supabase.auth.getUser();
    if (!h || !user) { setLoading(false); return; }

    const { data: clinic } = await supabase
      .from("clinics").select("plan, owner").eq("user_id", user.id).maybeSingle();
    if (clinic?.plan) setPlan(clinic.plan as PlanType);
    if (clinic?.owner) setFDoctor(prev => prev || String(clinic.owner));

    try {
      const [rRes, lRes] = await Promise.all([
        fetch("/api/lab-requests?role=clinic", { headers: h }),
        fetch("/api/lab-requests/labs", { headers: h }),
      ]);
      const rJson = await rRes.json();
      const lJson = await lRes.json();
      if (rRes.ok) setReqs((rJson.requests ?? []) as LabRequest[]);
      else setNotice({ kind: "err", text: rJson.error ?? T.err });
      if (lRes.ok) {
        setLabs((lJson.labs ?? []) as LabOpt[]);
        setCatalog((lJson.catalog ?? []) as CatalogTest[]);
      }
    } catch {
      setNotice({ kind: "err", text: T.err });
    }

    const pats = await fetchAll<PatientOpt>((f, t) =>
      supabase.from("patients")
        .select("id, name, phone, gender, date_of_birth, mrn")
        .eq("user_id", user.id).order("name", { ascending: true }).range(f, t)
    );
    setPatients(pats);
    setLoading(false);
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
      if (ts.some(t => t.catalog_id === c.id)) return ts.filter(t => t.catalog_id !== c.id);
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

  const canSend = Boolean(fLab && fName.trim() && fTests.length > 0);

  const submit = async () => {
    if (!canSend) return;
    setSending(true); setNotice(null);
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
      if (!r.ok) { setNotice({ kind: "err", text: json.error ?? T.err }); setSending(false); return; }
      setReqs(rs => [json.request as LabRequest, ...rs]);
      setShowNew(false); resetForm();
      setNotice({ kind: "ok", text: T.sentOk });
    } catch {
      setNotice({ kind: "err", text: T.err });
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
    if (!r.ok) { setNotice({ kind: "err", text: json.error ?? T.err }); return; }
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

  const shown = useMemo(
    () => (tab === "all" ? reqs : reqs.filter(r => r.status === tab)),
    [reqs, tab]
  );

  const filteredCatalog = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    const list = q
      ? catalog.filter(c => c.name_ar.toLowerCase().includes(q) || (c.name_en ?? "").toLowerCase().includes(q))
      : catalog;
    return list.slice(0, 40);
  }, [catalog, testSearch]);

  const selectedPatient = patients.find(p => String(p.id) === fPatientId);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SY" : "en-US", { day: "numeric", month: "short" });

  return (
    <AuthGuard>
      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <style>{`
          *{box-sizing:border-box}
          .lr-main{margin-${isAr ? "right" : "left"}:${sidebarWidth}px;transition:margin .3s cubic-bezier(.4,0,.2,1)}
          .lr-fade{animation:lrFade .4s ease}
          @keyframes lrFade{from{opacity:0}to{opacity:1}}
          .lr-actionbtn{transition:transform .18s ease,box-shadow .18s ease}
          .lr-actionbtn:hover{transform:translateY(-2px)}
          .lr-card{transition:box-shadow .2s ease}
          .lr-card:hover{box-shadow:0 10px 30px rgba(8,99,186,.09)}
          .lr-sheet{width:min(96vw,620px);max-height:90vh;border-radius:24px}
          .lr-formgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
          @media(max-width:860px){
            .lr-main{margin-right:0!important;margin-left:0!important;padding:0 14px 110px!important}
            .lr-stats{grid-template-columns:1fr!important}
            .lr-head{flex-direction:column;align-items:stretch!important}
            .lr-head .lr-newbtn{width:100%}
            .lr-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
            .lr-tabs button{flex:0 0 auto}
            .lr-cardrow{flex-direction:column!important;align-items:stretch!important}
            .lr-side{flex-direction:row!important;align-items:center!important;justify-content:space-between!important;width:100%}
            .lr-side .lr-btns button{flex:1}
            .lr-modalwrap{align-items:flex-end!important;padding:0!important}
            .lr-sheet{width:100vw!important;max-height:94vh!important;border-radius:24px 24px 0 0!important}
            .lr-formgrid{grid-template-columns:1fr!important}
          }
        `}</style>

        <PageIntro pageKey="labRequests" lang={lang} />

        <SharedSidebar
          lang={lang} setLang={setLang} activePage="labRequests"
          plan={plan} planLoading={loading}
          onCollapse={(c: boolean) => setSidebarWidth(c ? 70 : 240)}
        />

        <main className="lr-fade lr-main" style={{ padding: "0 28px 90px", minHeight: "100vh" }}>

          {/* ─── HERO ─── */}
          <div style={{
            margin: "20px 0 24px",
            background: `linear-gradient(120deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 100%)`,
            borderRadius: 24, padding: "26px 30px", position: "relative", overflow: "hidden",
            boxShadow: "0 12px 36px rgba(8,99,186,.28)",
          }}>
            <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div style={{ position: "absolute", bottom: -80, insetInlineEnd: 120, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
            <div className="lr-head" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 5 }}>🧪 {T.title}</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{T.subtitle}</p>
              </div>
              <button
                className="lr-newbtn lr-actionbtn"
                onClick={() => { setShowNew(true); setNotice(null); }}
                style={{
                  background: "rgba(255,255,255,.16)", color: "#fff",
                  border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 14,
                  padding: "12px 22px", fontFamily: "'Rubik',sans-serif",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)",
                }}
              >
                + {T.newReq}
              </button>
            </div>
          </div>

          {/* ─── STATS ─── */}
          <div className="lr-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 22 }}>
            <StatCard icon="⏳" accent={BRAND.orange} accentSoft="rgba(230,126,34,.1)" label={T.statPending} value={String(stats.pending)} />
            <StatCard icon="🔬" accent={BRAND.primary} accentSoft={BRAND.sky} label={T.statActive} value={String(stats.active)} />
            <StatCard icon="✅" accent={BRAND.green} accentSoft="rgba(46,125,50,.09)" label={T.statDone} value={String(stats.done)} />
          </div>

          {notice && (
            <div style={{
              marginBottom: 18, padding: "13px 18px", borderRadius: 14, fontSize: 13.5, fontWeight: 600,
              background: notice.kind === "ok" ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.1)",
              color: notice.kind === "ok" ? BRAND.green : BRAND.red,
            }}>{notice.text}</div>
          )}

          {/* ─── TABS ─── */}
          <div className="lr-tabs" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {(["all", "pending", "accepted", "completed"] as TabKey[]).map(k => {
              const on = tab === k;
              const n = k === "all" ? reqs.length
                : k === "pending" ? stats.pending
                : k === "accepted" ? stats.active : stats.done;
              return (
                <button key={k} onClick={() => setTab(k)}
                  style={{
                    padding: "10px 18px", borderRadius: 14, cursor: "pointer",
                    border: `1.5px solid ${on ? BRAND.primary : BRAND.border}`,
                    background: on ? BRAND.primary : "#fff",
                    color: on ? "#fff" : BRAND.muted,
                    fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 700,
                    whiteSpace: "nowrap", transition: "all .18s",
                    boxShadow: on ? "0 4px 14px rgba(8,99,186,.22)" : "none",
                  }}>
                  {T.tabs[k]}
                  <span style={{
                    marginInlineStart: 7, fontSize: 11.5, fontWeight: 800,
                    background: on ? "rgba(255,255,255,.22)" : "#f1f5fb",
                    color: on ? "#fff" : BRAND.muted,
                    borderRadius: 10, padding: "1px 8px",
                  }}>{n}</span>
                </button>
              );
            })}
          </div>

          {/* ─── LIST ─── */}
          {loading ? (
            <div style={{
              background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
              padding: "70px 20px", textAlign: "center", color: "#c8d2dc", fontSize: 14,
            }}>{T.loading}</div>
          ) : shown.length === 0 ? (
            <div style={{
              background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
              padding: "60px 24px", textAlign: "center", boxShadow: "0 4px 16px rgba(8,99,186,.05)",
            }}>
              <div style={{ fontSize: 44, marginBottom: 12, opacity: .5 }}>🧪</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.ink, marginBottom: 6 }}>
                {reqs.length === 0 ? T.empty : T.emptyFiltered}
              </div>
              {reqs.length === 0 && <div style={{ fontSize: 13, color: BRAND.muted }}>{T.emptyHint}</div>}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {shown.map(r => {
                const meta = STATUS_META[r.status];
                return (
                  <div key={r.id} className="lr-card" style={{
                    background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20,
                    padding: "18px 20px", boxShadow: "0 4px 16px rgba(8,99,186,.05)",
                    borderInlineStart: `4px solid ${meta.color}`,
                  }}>
                    <div className="lr-cardrow" style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 7 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: BRAND.ink }}>{r.patient_name}</span>
                          {r.mrn && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: BRAND.primary,
                              background: BRAND.sky, borderRadius: 16, padding: "3px 11px",
                            }}>{r.mrn}</span>
                          )}
                          {r.urgency === "urgent" && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, color: BRAND.red,
                              background: "rgba(192,57,43,.1)", borderRadius: 16, padding: "3px 11px",
                            }}>⚡ {T.urgent}</span>
                          )}
                        </div>

                        <div style={{ fontSize: 12.5, color: BRAND.muted, marginBottom: 11, fontWeight: 500 }}>
                          {fmtDate(r.created_at)}
                          {r.referring_doctor ? ` · ${r.referring_doctor}` : ""}
                          {r.patient_age ? ` · ${r.patient_age} ${T.years}` : ""}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {(r.tests ?? []).map((t, k) => (
                            <span key={k} style={{
                              background: "#f1f5fb", color: "#5a6b80", borderRadius: 16,
                              padding: "4px 13px", fontSize: 12, fontWeight: 600,
                            }}>{t.name}</span>
                          ))}
                        </div>

                        {r.notes && (
                          <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 11, lineHeight: 1.8 }}>{r.notes}</div>
                        )}
                        {r.reject_reason && (
                          <div style={{
                            fontSize: 12.5, color: BRAND.red, marginTop: 11, fontWeight: 600,
                            background: "rgba(192,57,43,.06)", borderRadius: 12, padding: "9px 13px",
                          }}>{r.reject_reason}</div>
                        )}
                      </div>

                      <div className="lr-side" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 11, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: meta.color, background: meta.bg,
                          borderRadius: 16, padding: "6px 14px", whiteSpace: "nowrap",
                        }}>{T.status[r.status]}</span>

                        <div className="lr-btns" style={{ display: "flex", gap: 8 }}>
                          {r.status === "pending" && (
                            <button onClick={() => void cancelReq(r.id)}
                              style={{
                                padding: "9px 16px", borderRadius: 12, cursor: "pointer",
                                border: `1.5px solid ${BRAND.border}`, background: "#fff", color: BRAND.muted,
                                fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                              }}>{T.cancelReq}</button>
                          )}
                          {(r.status === "completed" || r.status === "accepted") && r.lab_order_id && (
                            <button className="lr-actionbtn" onClick={() => void openResult(r)}
                              style={{
                                padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer",
                                background: `linear-gradient(135deg,${BRAND.green},#3d9142)`, color: "#fff",
                                fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700,
                                whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(46,125,50,.25)",
                              }}>{T.viewResult}</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ══════ نافذة الطلب الجديد ══════ */}
        {showNew && (
          <div className="lr-modalwrap" onClick={() => setShowNew(false)} style={{
            position: "fixed", inset: 0, zIndex: 600, display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
            background: "rgba(16,42,80,.45)", backdropFilter: "blur(4px)",
          }}>
            <div className="lr-sheet" onClick={e => e.stopPropagation()} style={{
              background: "#fff", overflowY: "auto",
              boxShadow: "0 24px 70px rgba(0,0,0,.22)", direction: isAr ? "rtl" : "ltr",
            }}>
              <div style={{
                position: "sticky", top: 0, zIndex: 5, background: "#fff",
                borderBottom: `1px solid ${BRAND.border}`, padding: "18px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: BRAND.ink, margin: 0 }}>🧪 {T.newReq}</h3>
                <button onClick={() => setShowNew(false)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, background: "#f1f5fb", border: "none",
                    cursor: "pointer", fontSize: 16, color: BRAND.muted, fontWeight: 700,
                  }}>✕</button>
              </div>

              <div style={{ padding: "22px 24px", display: "grid", gap: 16 }}>

                <div>
                  <label style={lbl}>{T.lab} *</label>
                  {labs.length === 0 ? (
                    <div style={{
                      background: "rgba(230,126,34,.08)", border: "1.5px solid rgba(230,126,34,.25)",
                      color: "#b9651b", borderRadius: 12, padding: "12px 14px", fontSize: 13,
                    }}>{T.noLabs}</div>
                  ) : (
                    <select value={fLab} onChange={e => setFLab(e.target.value)} style={inp}>
                      <option value="">{T.selectLab}</option>
                      {labs.map(l => <option key={l.user_id} value={l.user_id}>{l.name ?? "مخبر"}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label style={lbl}>{T.patient}</label>
                  <select value={fPatientId} onChange={e => pickPatient(e.target.value)} style={inp}>
                    <option value="">{T.selectPatient}</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.mrn ? ` — ${p.mrn}` : ""}</option>
                    ))}
                  </select>
                  {fPatientId && (
                    <div style={{
                      fontSize: 12, marginTop: 7, lineHeight: 1.7,
                      color: selectedPatient?.mrn ? BRAND.muted : BRAND.orange,
                    }}>{selectedPatient?.mrn ? T.mrnNote : T.noMrn}</div>
                  )}
                </div>

                <div>
                  <label style={lbl}>{T.patientName} *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} style={inp} />
                </div>

                <div className="lr-formgrid">
                  <div>
                    <label style={lbl}>{T.phone}</label>
                    <input value={fPhone} onChange={e => setFPhone(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>{T.age}</label>
                    <input value={fAge} onChange={e => setFAge(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>{T.gender}</label>
                    <select value={fGender} onChange={e => setFGender(e.target.value)} style={inp}>
                      <option value="">—</option>
                      <option value="male">{T.male}</option>
                      <option value="female">{T.female}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={lbl}>{T.doctor}</label>
                  <input value={fDoctor} onChange={e => setFDoctor(e.target.value)} style={inp} />
                </div>

                <div>
                  <label style={lbl}>{T.tests} *</label>
                  <input value={testSearch} onChange={e => setTestSearch(e.target.value)}
                    placeholder={T.searchTest} style={{ ...inp, marginBottom: 10 }} />

                  {testSearch.trim() && (
                    <button onClick={addCustomTest}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 12, marginBottom: 10, cursor: "pointer",
                        border: `1.5px dashed ${BRAND.primary}55`, background: BRAND.sky, color: BRAND.primary,
                        fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700,
                      }}>+ {T.addCustom}: «{testSearch.trim()}»</button>
                  )}

                  <div style={{
                    maxHeight: 180, overflowY: "auto", border: `1.5px solid ${BRAND.border}`,
                    borderRadius: 14, padding: 12, background: "#fbfdff",
                  }}>
                    {filteredCatalog.length === 0 ? (
                      <div style={{ padding: "18px", textAlign: "center", color: "#c8d2dc", fontSize: 12.5 }}>{T.noCatalog}</div>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {filteredCatalog.map(c => {
                          const on = fTests.some(t => t.catalog_id === c.id);
                          return (
                            <button key={c.id} onClick={() => toggleTest(c)}
                              style={{
                                padding: "7px 14px", borderRadius: 16, cursor: "pointer",
                                border: `1.5px solid ${on ? BRAND.primary : BRAND.border}`,
                                background: on ? BRAND.sky : "#fff",
                                color: on ? BRAND.primary : "#5a6b80",
                                fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 600,
                                transition: "all .15s",
                              }}>{on ? "✓ " : ""}{c.name_ar}</button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#4b5563", marginBottom: 8 }}>
                      {T.selected} ({fTests.length})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, minHeight: 26 }}>
                      {fTests.length === 0 ? (
                        <span style={{ fontSize: 12.5, color: "#c8d2dc" }}>{T.noneSelected}</span>
                      ) : fTests.map((t, i) => (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: 7,
                          fontSize: 12.5, fontWeight: 700, color: BRAND.primary,
                          background: BRAND.sky, borderRadius: 16, padding: "5px 12px",
                        }}>
                          {t.name}
                          <button onClick={() => setFTests(ts => ts.filter((_, k) => k !== i))}
                            style={{
                              border: "none", background: "none", cursor: "pointer",
                              color: BRAND.primary, fontSize: 14, lineHeight: 1, padding: 0,
                            }}>✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={lbl}>{T.urgency}</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { v: false, l: T.normal, c: BRAND.primary, i: "🕐" },
                      { v: true, l: T.urgent, c: BRAND.red, i: "⚡" },
                    ].map((o, i) => (
                      <button key={i} onClick={() => setFUrgent(o.v)}
                        style={{
                          flex: 1, padding: "12px 0", borderRadius: 14, cursor: "pointer",
                          border: `1.5px solid ${fUrgent === o.v ? o.c : BRAND.border}`,
                          background: fUrgent === o.v ? `${o.c}12` : "#fff",
                          color: fUrgent === o.v ? o.c : BRAND.muted,
                          fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700,
                          transition: "all .18s",
                        }}>{o.i} {o.l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>{T.notes}</label>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder={T.notesPh}
                    style={{ ...inp, minHeight: 80, resize: "vertical" }} />
                </div>

                {!canSend && (
                  <div style={{ fontSize: 12.5, color: BRAND.muted, lineHeight: 1.7 }}>{T.required}</div>
                )}
              </div>

              <div style={{
                position: "sticky", bottom: 0, background: "#fff",
                borderTop: `1px solid ${BRAND.border}`, padding: "14px 24px",
                display: "flex", gap: 10,
              }}>
                <button onClick={submit} disabled={sending || !canSend}
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 14, border: "none",
                    cursor: sending || !canSend ? "not-allowed" : "pointer",
                    background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
                    color: "#fff", fontFamily: "'Rubik',sans-serif", fontSize: 14.5, fontWeight: 700,
                    opacity: sending || !canSend ? .5 : 1,
                    boxShadow: sending || !canSend ? "none" : "0 6px 18px rgba(8,99,186,.3)",
                  }}>{sending ? T.sending : T.send}</button>
                <button onClick={() => setShowNew(false)}
                  style={{
                    padding: "14px 24px", borderRadius: 14, border: `1.5px solid ${BRAND.border}`,
                    cursor: "pointer", background: "#fff", color: BRAND.muted,
                    fontFamily: "'Rubik',sans-serif", fontSize: 14.5, fontWeight: 600,
                  }}>{T.cancel}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ نافذة النتيجة ══════ */}
        {resultFor && (
          <div className="lr-modalwrap" onClick={() => setResultFor(null)} style={{
            position: "fixed", inset: 0, zIndex: 600, display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
            background: "rgba(16,42,80,.45)", backdropFilter: "blur(4px)",
          }}>
            <div className="lr-sheet" onClick={e => e.stopPropagation()} style={{
              background: "#fff", overflowY: "auto",
              boxShadow: "0 24px 70px rgba(0,0,0,.22)", direction: isAr ? "rtl" : "ltr",
            }}>
              <div style={{
                position: "sticky", top: 0, zIndex: 5, background: "#fff",
                borderBottom: `1px solid ${BRAND.border}`, padding: "18px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: 16.5, fontWeight: 800, color: BRAND.ink, margin: 0 }}>
                    {T.result} — {resultFor.req.patient_name}
                  </h3>
                  {resultFor.req.mrn && (
                    <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 4 }}>{resultFor.req.mrn}</div>
                  )}
                </div>
                <button onClick={() => setResultFor(null)}
                  style={{
                    width: 34, height: 34, borderRadius: 10, background: "#f1f5fb", border: "none",
                    cursor: "pointer", fontSize: 16, color: BRAND.muted, fontWeight: 700, flexShrink: 0,
                  }}>✕</button>
              </div>

              <div style={{ padding: "20px 24px 26px" }}>
                {resultFor.rows === null ? (
                  <div style={{ padding: "50px", textAlign: "center", color: "#c8d2dc", fontSize: 13.5 }}>{T.loading}</div>
                ) : resultFor.rows.length === 0 ? (
                  <div style={{ padding: "50px", textAlign: "center", color: "#c8d2dc", fontSize: 13.5 }}>{T.noResult}</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {resultFor.rows.map((r, i) => {
                      const f = flagOf(r);
                      const c = f === "high" ? BRAND.red : f === "low" ? "#1f6fd6" : f === "normal" ? BRAND.green : BRAND.muted;
                      const refTxt = r.ref_text ?? (r.ref_low != null || r.ref_high != null ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""}` : "—");
                      return (
                        <div key={i} style={{
                          border: `1.5px solid ${BRAND.border}`, borderRadius: 16, padding: "14px 16px",
                          borderInlineStart: `4px solid ${c}`, background: "#fbfdff",
                          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
                        }}>
                          <div style={{ minWidth: 140 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink }}>{r.test_name}</div>
                            <div style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 4 }}>{T.ref}: {refTxt}</div>
                          </div>
                          <div style={{ textAlign: isAr ? "left" : "right" }}>
                            <div style={{ fontSize: 19, fontWeight: 800, color: c, direction: "ltr" }}>
                              {r.value || "—"}{r.unit ? ` ${r.unit}` : ""}
                            </div>
                            {(f === "high" || f === "low") && (
                              <div style={{ fontSize: 11, fontWeight: 700, color: c, marginTop: 3 }}>
                                {f === "high" ? `▲ ${T.high}` : `▼ ${T.low}`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
