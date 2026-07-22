"use client";
// ============================================================
// NABD - نبض | Referrals — تحويل المرضى بين العيادات
// تصميم موحّد مع لوحة التحكم (BRAND / hero gradient / stat cards)
// Route: /referrals
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import PageIntro from "@/components/PageIntro";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6",
  sky: "#eaf3fc", green: "#2e7d32", purple: "#7b2d8b", orange: "#e67e22",
  teal: "#16a085", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

type Snapshot = {
  name?: string; phone?: string; gender?: string; date_of_birth?: string;
  has_diabetes?: boolean; has_hypertension?: boolean; notes?: string;
};
type Referral = {
  id: number; from_user_id: string; to_user_id: string;
  from_clinic_name: string | null; to_clinic_name: string | null;
  patient_snapshot: Snapshot; reason: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string; responded_at: string | null;
};
type PatientOpt = { id: number; name: string };
type DoctorResult = { user_id: string; clinic_name: string; doctor_name: string; clinic_type: string };

const CLINIC_TYPES: Record<string, { ar: string; en: string; icon: string }> = {
  general: { ar: "طب عام", en: "General", icon: "🏥" },
  dental: { ar: "طب أسنان", en: "Dentistry", icon: "🦷" },
  dermatology: { ar: "جلدية", en: "Dermatology", icon: "🧴" },
  cosmetic: { ar: "تجميل", en: "Cosmetic", icon: "💆" },
  pediatrics: { ar: "أطفال", en: "Pediatrics", icon: "👶" },
  physical_therapy: { ar: "علاج فيزيائي", en: "Physiotherapy", icon: "🏃" },
  mental_health: { ar: "صحة نفسية", en: "Mental Health", icon: "🧠" },
  nutrition: { ar: "تغذية", en: "Nutrition", icon: "🥗" },
  ophthalmology: { ar: "عينية", en: "Ophthalmology", icon: "👁️" },
  orthopedic: { ar: "عظمية", en: "Orthopedics", icon: "🦴" },
  cardiology: { ar: "قلبية", en: "Cardiology", icon: "❤️" },
  gynecology: { ar: "نسائية", en: "Gynecology", icon: "🌸" },
  ent: { ar: "أذن أنف حنجرة", en: "ENT", icon: "👂" },
  urology: { ar: "بولية", en: "Urology", icon: "💧" },
  other: { ar: "أخرى", en: "Other", icon: "🏨" },
};

const T = {
  ar: {
    title: "تحويل المرضى", subtitle: "أرسل واستقبل تحويلات المرضى بين عيادات نبض",
    statReceived: "تحويلات واردة", statSent: "تحويلات صادرة", statPending: "بانتظار ردّك",
    tabReceived: "الواردة", tabSent: "الصادرة",
    newReferral: "تحويل مريض جديد", patient: "المريض", selectPatient: "اختر المريض...",
    targetDoctor: "الطبيب / العيادة المستقبلة", targetPh: "اكتب اسم الطبيب أو العيادة...",
    searching: "جارٍ البحث...", noMatch: "لا نتائج — تأكد من الاسم أو جرّب اسم العيادة",
    reason: "سبب التحويل / ملخص الحالة", reasonPh: "مثال: يحتاج استشارة قلبية — لديه ارتفاع ضغط غير مستقر",
    send: "إرسال التحويل", sending: "جارٍ الإرسال...", sentOk: "✓ تم إرسال التحويل إلى",
    from: "من", to: "إلى",
    accept: "قبول وإضافة المريض", reject: "رفض",
    accepted: "مقبول", rejected: "مرفوض", pending: "قيد الانتظار",
    acceptedNote: "أُضيف المريض إلى قائمة مرضاك", empty: "لا توجد تحويلات",
    delete: "حذف", confirmDelete: "حذف هذا التحويل نهائياً؟",
    diabetes: "سكري", hypertension: "ضغط", notesLbl: "ملاحظات",
    errors: {
      clinic_not_found: "لم يتم العثور على هذه العيادة على نبض.",
      self_referral: "لا يمكنك التحويل إلى عيادتك نفسها.",
      missing_fields: "اختر المريض ثم اختر الطبيب المستقبِل من نتائج البحث.",
      generic: "حدث خطأ. حاول مجدداً.",
    },
  },
  en: {
    title: "Patient Referrals", subtitle: "Send and receive patient transfers between NABD clinics",
    statReceived: "Received", statSent: "Sent", statPending: "Awaiting you",
    tabReceived: "Received", tabSent: "Sent",
    newReferral: "New Referral", patient: "Patient", selectPatient: "Select patient...",
    targetDoctor: "Receiving doctor / clinic", targetPh: "Type doctor or clinic name...",
    searching: "Searching...", noMatch: "No results — check the name or try the clinic name",
    reason: "Referral reason / case summary", reasonPh: "e.g. Needs cardiology consult — unstable hypertension",
    send: "Send Referral", sending: "Sending...", sentOk: "✓ Referral sent to",
    from: "From", to: "To",
    accept: "Accept & Add Patient", reject: "Reject",
    accepted: "Accepted", rejected: "Rejected", pending: "Pending",
    acceptedNote: "Patient added to your list", empty: "No referrals",
    delete: "Delete", confirmDelete: "Delete this referral permanently?",
    diabetes: "Diabetes", hypertension: "Hypertension", notesLbl: "Notes",
    errors: {
      clinic_not_found: "This clinic was not found on NABD.",
      self_referral: "You can't refer to your own clinic.",
      missing_fields: "Select a patient, then pick the receiving doctor from search results.",
      generic: "Something went wrong. Try again.",
    },
  },
};

const STATUS_STYLE: Record<Referral["status"], { bg: string; color: string }> = {
  pending: { bg: "rgba(230,126,34,.12)", color: "#c96a12" },
  accepted: { bg: "rgba(46,125,50,.12)", color: "#2e7d32" },
  rejected: { bg: "rgba(192,57,43,.12)", color: "#c0392b" },
};

function StatCard({ icon, accent, accentSoft, label, value }: { icon: string; accent: string; accentSoft: string; label: string; value: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", border: `1.5px solid ${BRAND.border}`, boxShadow: "0 4px 16px rgba(8,99,186,.05)", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 14, background: accentSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 600, marginTop: 5 }}>{label}</div>
      </div>
    </div>
  );
}

export default function ReferralsPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"received" | "sent">("received");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [selPatient, setSelPatient] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [docResults, setDocResults] = useState<DoctorResult[]>([]);
  const [docSearching, setDocSearching] = useState(false);
  const [selDoctor, setSelDoctor] = useState<DoctorResult | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isAr = lang === "ar";
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "en") setLang("en");
  }, []);

  const loadAll = useCallback(async (uid: string) => {
    const [{ data: refs }, { data: pats }] = await Promise.all([
      supabase.from("referrals").select("*")
        .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
        .order("created_at", { ascending: false }),
      supabase.from("patients").select("id, name")
        .eq("user_id", uid).eq("is_hidden", false).order("name", { ascending: true }),
    ]);
    setReferrals((refs ?? []) as Referral[]);
    setPatients((pats ?? []) as PatientOpt[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: clinic } = await supabase.from("clinics").select("plan").eq("user_id", user.id).maybeSingle();
      if (clinic?.plan) setPlan(clinic.plan as PlanType);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [loadAll]);

  useEffect(() => {
    if (selDoctor || docQuery.trim().length < 2) { setDocResults([]); return; }
    const id = setTimeout(async () => {
      setDocSearching(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/refer/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ q: docQuery.trim() }),
        });
        const json = (await res.json()) as { results?: DoctorResult[] };
        setDocResults(json.results ?? []);
      } catch { setDocResults([]); }
      setDocSearching(false);
    }, 350);
    return () => clearTimeout(id);
  }, [docQuery, selDoctor]);

  async function sendReferral() {
    setNotice(null);
    if (!selPatient || !selDoctor) { setNotice({ kind: "err", text: t.errors.missing_fields }); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ targetUserId: selDoctor.user_id, patientId: Number(selPatient), reason }),
      });
      const json = (await res.json()) as { ok?: boolean; toClinic?: string; error?: string };
      if (json.ok) {
        setNotice({ kind: "ok", text: `${t.sentOk} ${json.toClinic ?? ""}` });
        setSelPatient(""); setDocQuery(""); setSelDoctor(null); setReason(""); setShowForm(false);
        await loadAll(userId); setTab("sent");
      } else {
        const key = (json.error ?? "generic") as keyof typeof t.errors;
        setNotice({ kind: "err", text: t.errors[key] ?? t.errors.generic });
      }
    } catch { setNotice({ kind: "err", text: t.errors.generic }); }
    setSending(false);
  }

  async function respond(ref: Referral, accept: boolean) {
    setActingId(ref.id);
    try {
      if (accept) {
        const snap = ref.patient_snapshot ?? {};
        const refNote = [
          isAr ? `محوَّل من: ${ref.from_clinic_name ?? "عيادة نبض"}` : `Referred from: ${ref.from_clinic_name ?? "a NABD clinic"}`,
          ref.reason ? (isAr ? `السبب: ${ref.reason}` : `Reason: ${ref.reason}`) : "",
          snap.notes ? `${t.notesLbl}: ${snap.notes}` : "",
        ].filter(Boolean).join("\n");
        const { error: insErr } = await supabase.from("patients").insert({
          user_id: userId, name: snap.name ?? "", phone: snap.phone ?? null,
          gender: snap.gender ?? null, date_of_birth: snap.date_of_birth ?? null,
          has_diabetes: !!snap.has_diabetes, has_hypertension: !!snap.has_hypertension,
          notes: refNote, is_hidden: false,
        });
        if (insErr) throw insErr;
      }
      await supabase.from("referrals")
        .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
        .eq("id", ref.id);
      await loadAll(userId);
    } catch (e) { console.error(e); setNotice({ kind: "err", text: t.errors.generic }); }
    setActingId(null);
  }

  async function deleteReferral(ref: Referral) {
    if (!confirm(t.confirmDelete)) return;
    setDeletingId(ref.id);
    try {
      const { error } = await supabase.from("referrals").delete().eq("id", ref.id);
      if (error) throw error;
      setReferrals(prev => prev.filter(r => r.id !== ref.id));
    } catch (e) { console.error(e); setNotice({ kind: "err", text: t.errors.generic }); }
    setDeletingId(null);
  }

  const received = referrals.filter(r => r.to_user_id === userId);
  const sent = referrals.filter(r => r.from_user_id === userId);
  const list = tab === "received" ? received : sent;
  const pendingCount = received.filter(r => r.status === "pending").length;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SY" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <AuthGuard>
      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <style>{`
          *{box-sizing:border-box}
          .ref-main{margin-${isAr ? "right" : "left"}:${sidebarWidth}px;transition:margin .3s cubic-bezier(.4,0,.2,1)}
          .ref-fade{animation:refFade .4s ease}
          @keyframes refFade{from{opacity:0}to{opacity:1}}
          .ref-actionbtn{transition:transform .18s ease,box-shadow .18s ease}
          .ref-actionbtn:hover{transform:translateY(-2px)}
          .ref-card{transition:box-shadow .2s ease}
          .ref-card:hover{box-shadow:0 10px 30px rgba(8,99,186,.09)}
          @media(max-width:860px){
            .ref-main{margin-right:0!important;margin-left:0!important;padding:0 14px 110px!important}
            .ref-stats{grid-template-columns:1fr!important}
            .ref-head{flex-direction:column;align-items:stretch!important}
            .ref-head .ref-newbtn{width:100%}
            .ref-tabs button{flex:1}
            .ref-cardrow{flex-direction:column!important}
            .ref-actions{width:100%;flex-direction:row!important;align-items:center!important;justify-content:space-between!important}
            .ref-actions .ref-btns{display:flex;gap:8px;flex:1}
            .ref-actions .ref-btns button{flex:1}
          }
        `}</style>

        <PageIntro pageKey="referrals" lang={lang} />

        <SharedSidebar
          lang={lang} setLang={setLang} activePage="referrals"
          plan={plan} planLoading={loading}
          onCollapse={(c: boolean) => setSidebarWidth(c ? 70 : 240)}
        />

        <main className="ref-fade ref-main" style={{ padding: "0 28px 90px", minHeight: "100vh" }}>

          {/* ─── HERO HEADER ─── */}
          <div style={{
            margin: "20px 0 24px",
            background: `linear-gradient(120deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 100%)`,
            borderRadius: 24, padding: "26px 30px", position: "relative", overflow: "hidden",
            boxShadow: "0 12px 36px rgba(8,99,186,.28)",
          }}>
            <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div style={{ position: "absolute", bottom: -80, insetInlineEnd: 120, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
            <div className="ref-head" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 5 }}>🔄 {t.title}</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{t.subtitle}</p>
              </div>
              <button
                className="ref-newbtn ref-actionbtn"
                onClick={() => { setShowForm(v => !v); setNotice(null); }}
                style={{ background: "rgba(255,255,255,.16)", color: "#fff", border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 14, padding: "12px 22px", fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" }}
              >
                + {t.newReferral}
              </button>
            </div>
          </div>

          {/* ─── STAT CARDS ─── */}
          <div className="ref-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon="📥" accent={BRAND.primary} accentSoft={BRAND.sky} label={t.statReceived} value={String(received.length)} />
            <StatCard icon="📤" accent={BRAND.teal} accentSoft="rgba(22,160,133,.09)" label={t.statSent} value={String(sent.length)} />
            <StatCard icon="⏳" accent={BRAND.orange} accentSoft="rgba(230,126,34,.1)" label={t.statPending} value={String(pendingCount)} />
          </div>

          {notice && (
            <div style={{ marginBottom: 18, padding: "13px 18px", borderRadius: 14, fontSize: 13.5, fontWeight: 600, background: notice.kind === "ok" ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.1)", color: notice.kind === "ok" ? BRAND.green : "#c0392b" }}>
              {notice.text}
            </div>
          )}

          {/* ─── FORM ─── */}
          {showForm && (
            <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 20, padding: 24, marginBottom: 24, boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={lbl}>{t.patient}</label>
                  <select value={selPatient} onChange={e => setSelPatient(e.target.value)} style={inp}>
                    <option value="">{t.selectPatient}</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ position: "relative" }}>
                  <label style={lbl}>{t.targetDoctor}</label>
                  {selDoctor ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, border: `1.5px solid ${BRAND.primary}`, background: BRAND.sky, borderRadius: 14, padding: "12px 16px" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {(CLINIC_TYPES[selDoctor.clinic_type] ?? CLINIC_TYPES.other).icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: BRAND.ink }}>{selDoctor.doctor_name || selDoctor.clinic_name}</div>
                        <div style={{ fontSize: 12.5, color: "#5a6b80" }}>
                          {(CLINIC_TYPES[selDoctor.clinic_type] ?? CLINIC_TYPES.other)[isAr ? "ar" : "en"]} • {selDoctor.clinic_name}
                        </div>
                      </div>
                      <button onClick={() => { setSelDoctor(null); setDocQuery(""); }} style={{ background: "none", border: "none", color: "#c0392b", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <input value={docQuery} onChange={e => setDocQuery(e.target.value)} placeholder={t.targetPh} style={inp} />
                      {(docSearching || docResults.length > 0 || (docQuery.trim().length >= 2 && !docSearching)) && (
                        <div style={{ position: "absolute", insetInline: 0, top: "100%", marginTop: 6, background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 14, boxShadow: "0 14px 40px rgba(15,40,80,.14)", zIndex: 50, overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
                          {docSearching && <div style={{ padding: "14px 16px", fontSize: 13, color: BRAND.muted }}>{t.searching}</div>}
                          {!docSearching && docResults.length === 0 && docQuery.trim().length >= 2 && (
                            <div style={{ padding: "14px 16px", fontSize: 13, color: BRAND.muted }}>{t.noMatch}</div>
                          )}
                          {!docSearching && docResults.map(r => {
                            const ct = CLINIC_TYPES[r.clinic_type] ?? CLINIC_TYPES.other;
                            return (
                              <button key={r.user_id} onClick={() => { setSelDoctor(r); setDocResults([]); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${BRAND.bg}`, cursor: "pointer", textAlign: "start", fontFamily: "'Rubik',sans-serif" }}>
                                <span style={{ fontSize: 20 }}>{ct.icon}</span>
                                <span style={{ flex: 1 }}>
                                  <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: BRAND.ink }}>{r.doctor_name || r.clinic_name}</span>
                                  <span style={{ display: "block", fontSize: 12, color: BRAND.muted }}>{ct[isAr ? "ar" : "en"]} • {r.clinic_name}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label style={lbl}>{t.reason}</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t.reasonPh} rows={3} style={{ ...inp, resize: "vertical" }} />
                </div>
                <button
                  onClick={sendReferral} disabled={sending}
                  style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", border: "none", borderRadius: 14, padding: "13px", fontFamily: "'Rubik',sans-serif", fontSize: 14.5, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? .7 : 1, boxShadow: "0 6px 18px rgba(8,99,186,.25)" }}
                >
                  {sending ? t.sending : t.send}
                </button>
              </div>
            </div>
          )}

          {/* ─── TABS ─── */}
          <div className="ref-tabs" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {(["received", "sent"] as const).map(k => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "11px 24px", borderRadius: 14, border: "1.5px solid",
                borderColor: tab === k ? BRAND.primary : BRAND.border,
                background: tab === k ? BRAND.sky : "#fff",
                color: tab === k ? BRAND.primary : BRAND.muted,
                fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {k === "received" ? t.tabReceived : t.tabSent}
                {k === "received" && pendingCount > 0 && (
                  <span style={{ background: BRAND.orange, color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 8px" }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── LIST ─── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: BRAND.muted }}>...</div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 20px", background: "#fff", borderRadius: 20, border: `1.5px dashed ${BRAND.border}`, color: BRAND.muted, fontSize: 14.5 }}>
              🔄 {t.empty}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {list.map(ref => {
                const snap = ref.patient_snapshot ?? {};
                const st = STATUS_STYLE[ref.status];
                const statusLabel = ref.status === "pending" ? t.pending : ref.status === "accepted" ? t.accepted : t.rejected;
                const isReceived = ref.to_user_id === userId;
                return (
                  <div key={ref.id} className="ref-card" style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: "18px 20px", boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
                    <div className="ref-cardrow" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 260px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
                            {(snap.name ?? "?").charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: 15.5, fontWeight: 800, color: BRAND.ink }}>{snap.name}</div>
                            <div style={{ fontSize: 12.5, color: BRAND.muted }}>
                              {isReceived ? `${t.from}: ${ref.from_clinic_name ?? "—"}` : `${t.to}: ${ref.to_clinic_name ?? "—"}`} • {fmtDate(ref.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: ref.reason ? 10 : 0 }}>
                          {snap.has_diabetes && <span style={chip}>🩸 {t.diabetes}</span>}
                          {snap.has_hypertension && <span style={chip}>❤️ {t.hypertension}</span>}
                          {snap.phone && <span style={chip} dir="ltr">📞 {snap.phone}</span>}
                        </div>
                        {ref.reason && (
                          <div style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.8, background: BRAND.bg, borderRadius: 12, padding: "11px 15px" }}>{ref.reason}</div>
                        )}
                      </div>
                      <div className="ref-actions" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "5px 15px", fontSize: 12, fontWeight: 700 }}>{statusLabel}</span>
                        {isReceived && ref.status === "pending" && (
                          <div className="ref-btns" style={{ display: "flex", gap: 8 }}>
                            <button className="ref-actionbtn" onClick={() => respond(ref, true)} disabled={actingId === ref.id}
                              style={{ background: BRAND.green, color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                              ✓ {t.accept}
                            </button>
                            <button className="ref-actionbtn" onClick={() => respond(ref, false)} disabled={actingId === ref.id}
                              style={{ background: "#fff", color: "#c0392b", border: "1.5px solid #f1c7c2", borderRadius: 12, padding: "10px 16px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                              ✕ {t.reject}
                            </button>
                          </div>
                        )}
                        {isReceived && ref.status === "accepted" && (
                          <span style={{ fontSize: 12, color: BRAND.green }}>{t.acceptedNote}</span>
                        )}
                        <button
                          onClick={() => deleteReferral(ref)}
                          disabled={deletingId === ref.id}
                          title={t.delete}
                          style={{ background: "none", border: "none", color: BRAND.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 4, opacity: deletingId === ref.id ? .5 : 1 }}
                        >
                          🗑 {t.delete}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 7 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid #dbe4ef", fontFamily: "'Rubik',sans-serif", fontSize: 14, color: "#1c2b3a", background: "#fbfdff", outline: "none" };
const chip: React.CSSProperties = { background: "#f1f5fb", color: "#5a6b80", borderRadius: 16, padding: "3px 12px", fontSize: 12, fontWeight: 600 };
