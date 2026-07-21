"use client";
// ============================================================
// NABD - نبض | Referrals — تحويل المرضى بين العيادات
// Route: /referrals
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

type Snapshot = {
  name?: string; phone?: string; gender?: string; date_of_birth?: string;
  has_diabetes?: boolean; has_hypertension?: boolean; notes?: string;
};

type Referral = {
  id: number;
  from_user_id: string;
  to_user_id: string;
  from_clinic_name: string | null;
  to_clinic_name: string | null;
  patient_snapshot: Snapshot;
  reason: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
};

type PatientOpt = { id: number; name: string };

const T = {
  ar: {
    title: "تحويل المرضى",
    subtitle: "أرسل واستقبل تحويلات المرضى بين عيادات نبض",
    tabReceived: "الواردة",
    tabSent: "الصادرة",
    newReferral: "تحويل مريض جديد",
    patient: "المريض",
    selectPatient: "اختر المريض...",
    targetEmail: "بريد العيادة المستقبلة",
    targetPh: "clinic@example.com",
    reason: "سبب التحويل / ملخص الحالة",
    reasonPh: "مثال: يحتاج استشارة قلبية — لديه ارتفاع ضغط غير مستقر",
    send: "إرسال التحويل",
    sending: "جارٍ الإرسال...",
    sentOk: "✓ تم إرسال التحويل إلى",
    from: "من",
    to: "إلى",
    accept: "قبول وإضافة المريض",
    reject: "رفض",
    accepted: "مقبول",
    rejected: "مرفوض",
    pending: "قيد الانتظار",
    acceptedNote: "أُضيف المريض إلى قائمة مرضاك",
    empty: "لا توجد تحويلات",
    errors: {
      clinic_not_found: "لا توجد عيادة بهذا البريد على نبض.",
      self_referral: "لا يمكنك التحويل إلى عيادتك نفسها.",
      missing_fields: "اختر المريض وأدخل بريد العيادة.",
      generic: "حدث خطأ. حاول مجدداً.",
    },
    diabetes: "سكري",
    hypertension: "ضغط",
    notesLbl: "ملاحظات",
  },
  en: {
    title: "Patient Referrals",
    subtitle: "Send and receive patient transfers between NABD clinics",
    tabReceived: "Received",
    tabSent: "Sent",
    newReferral: "New Referral",
    patient: "Patient",
    selectPatient: "Select patient...",
    targetEmail: "Receiving clinic email",
    targetPh: "clinic@example.com",
    reason: "Referral reason / case summary",
    reasonPh: "e.g. Needs cardiology consult — unstable hypertension",
    send: "Send Referral",
    sending: "Sending...",
    sentOk: "✓ Referral sent to",
    from: "From",
    to: "To",
    accept: "Accept & Add Patient",
    reject: "Reject",
    accepted: "Accepted",
    rejected: "Rejected",
    pending: "Pending",
    acceptedNote: "Patient added to your list",
    empty: "No referrals",
    errors: {
      clinic_not_found: "No clinic found with this email on NABD.",
      self_referral: "You can't refer to your own clinic.",
      missing_fields: "Select a patient and enter the clinic email.",
      generic: "Something went wrong. Try again.",
    },
    diabetes: "Diabetes",
    hypertension: "Hypertension",
    notesLbl: "Notes",
  },
};

const STATUS_STYLE: Record<Referral["status"], { bg: string; color: string }> = {
  pending:  { bg: "rgba(230,126,34,.12)", color: "#c96a12" },
  accepted: { bg: "rgba(46,125,50,.12)",  color: "#2e7d32" },
  rejected: { bg: "rgba(192,57,43,.12)",  color: "#c0392b" },
};

export default function ReferralsPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"received" | "sent">("received");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [selPatient, setSelPatient] = useState<string>("");
  const [targetEmail, setTargetEmail] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);

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
        .eq("user_id", uid).eq("is_hidden", false)
        .order("name", { ascending: true }),
    ]);
    setReferrals((refs ?? []) as Referral[]);
    setPatients((pats ?? []) as PatientOpt[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data: clinic } = await supabase
        .from("clinics").select("plan").eq("user_id", user.id).maybeSingle();
      if (clinic?.plan) setPlan(clinic.plan as PlanType);
      await loadAll(user.id);
      setLoading(false);
    })();
  }, [loadAll]);

  async function sendReferral() {
    setNotice(null);
    if (!selPatient || !targetEmail.trim()) {
      setNotice({ kind: "err", text: t.errors.missing_fields });
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/refer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          targetEmail: targetEmail.trim(),
          patientId: Number(selPatient),
          reason,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; toClinic?: string; error?: string };
      if (json.ok) {
        setNotice({ kind: "ok", text: `${t.sentOk} ${json.toClinic ?? ""}` });
        setSelPatient(""); setTargetEmail(""); setReason(""); setShowForm(false);
        await loadAll(userId);
        setTab("sent");
      } else {
        const key = (json.error ?? "generic") as keyof typeof t.errors;
        setNotice({ kind: "err", text: t.errors[key] ?? t.errors.generic });
      }
    } catch {
      setNotice({ kind: "err", text: t.errors.generic });
    }
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
          user_id: userId,
          name: snap.name ?? "",
          phone: snap.phone ?? null,
          gender: snap.gender ?? null,
          date_of_birth: snap.date_of_birth ?? null,
          has_diabetes: !!snap.has_diabetes,
          has_hypertension: !!snap.has_hypertension,
          notes: refNote,
          is_hidden: false,
        });
        if (insErr) throw insErr;
      }
      await supabase.from("referrals")
        .update({ status: accept ? "accepted" : "rejected", responded_at: new Date().toISOString() })
        .eq("id", ref.id);
      await loadAll(userId);
    } catch (e) {
      console.error(e);
      setNotice({ kind: "err", text: t.errors.generic });
    }
    setActingId(null);
  }

  const received = referrals.filter(r => r.to_user_id === userId);
  const sent     = referrals.filter(r => r.from_user_id === userId);
  const list     = tab === "received" ? received : sent;
  const pendingCount = received.filter(r => r.status === "pending").length;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SY" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <AuthGuard>
      <div dir={isAr ? "rtl" : "ltr"} style={{ minHeight: "100vh", background: "#f7f9fc", fontFamily: "'Rubik',sans-serif" }}>
        <SharedSidebar
          lang={lang}
          setLang={setLang}
          activePage="referrals"
          plan={plan}
          planLoading={loading}
          onCollapse={(c) => setSidebarWidth(c ? 70 : 240)}
        />
        <div style={{ [isAr ? "marginRight" : "marginLeft"]: sidebarWidth, padding: "28px 24px 80px", transition: "margin .25s" } as React.CSSProperties}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>

            {/* رأس الصفحة */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#2c3e50" }}>{t.title}</h1>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#8a94a3" }}>{t.subtitle}</p>
              </div>
              <button
                onClick={() => { setShowForm(v => !v); setNotice(null); }}
                style={{ background: "linear-gradient(135deg,#0863ba,#5694cf)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 22px", fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 18px rgba(8,99,186,.25)" }}
              >
                + {t.newReferral}
              </button>
            </div>

            {notice && (
              <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, background: notice.kind === "ok" ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.1)", color: notice.kind === "ok" ? "#2e7d32" : "#c0392b" }}>
                {notice.text}
              </div>
            )}

            {/* نموذج الإرسال */}
            {showForm && (
              <div style={{ background: "#fff", border: "1px solid #e6eef8", borderRadius: 18, padding: 24, marginBottom: 24, boxShadow: "0 8px 30px rgba(8,99,186,.06)" }}>
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <label style={lbl}>{t.patient}</label>
                    <select value={selPatient} onChange={e => setSelPatient(e.target.value)} style={inp}>
                      <option value="">{t.selectPatient}</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>{t.targetEmail}</label>
                    <input dir="ltr" value={targetEmail} onChange={e => setTargetEmail(e.target.value)} placeholder={t.targetPh} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>{t.reason}</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t.reasonPh} rows={3} style={{ ...inp, resize: "vertical" }} />
                  </div>
                  <button
                    onClick={sendReferral}
                    disabled={sending}
                    style={{ background: "#0863ba", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontFamily: "'Rubik',sans-serif", fontSize: 14.5, fontWeight: 700, cursor: sending ? "wait" : "pointer", opacity: sending ? .7 : 1 }}
                  >
                    {sending ? t.sending : t.send}
                  </button>
                </div>
              </div>
            )}

            {/* التبويبات */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {(["received", "sent"] as const).map(k => (
                <button key={k} onClick={() => setTab(k)} style={{
                  padding: "10px 22px", borderRadius: 12, border: "1px solid",
                  borderColor: tab === k ? "#0863ba" : "#e2e8f0",
                  background: tab === k ? "rgba(8,99,186,.08)" : "#fff",
                  color: tab === k ? "#0863ba" : "#7d8896",
                  fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {k === "received" ? t.tabReceived : t.tabSent}
                  {k === "received" && pendingCount > 0 && (
                    <span style={{ background: "#e67e22", color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 8px" }}>{pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* القائمة */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#8a94a3" }}>...</div>
            ) : list.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px", background: "#fff", borderRadius: 18, border: "1px dashed #d6e2f0", color: "#8a94a3", fontSize: 14.5 }}>
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
                    <div key={ref.id} style={{ background: "#fff", border: "1px solid #e6eef8", borderRadius: 16, padding: "18px 20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ flex: "1 1 260px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0863ba,#5694cf)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15 }}>
                              {(snap.name ?? "?").charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontSize: 15.5, fontWeight: 800, color: "#2c3e50" }}>{snap.name}</div>
                              <div style={{ fontSize: 12.5, color: "#8a94a3" }}>
                                {isReceived
                                  ? `${t.from}: ${ref.from_clinic_name ?? "—"}`
                                  : `${t.to}: ${ref.to_clinic_name ?? "—"}`} • {fmtDate(ref.created_at)}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: ref.reason ? 8 : 0 }}>
                            {snap.has_diabetes && <span style={chip}>🩸 {t.diabetes}</span>}
                            {snap.has_hypertension && <span style={chip}>❤️ {t.hypertension}</span>}
                            {snap.phone && <span style={chip} dir="ltr">📞 {snap.phone}</span>}
                          </div>
                          {ref.reason && (
                            <div style={{ fontSize: 13.5, color: "#4b5563", lineHeight: 1.8, background: "#f6f9fd", borderRadius: 10, padding: "10px 14px" }}>
                              {ref.reason}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                          <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>
                            {statusLabel}
                          </span>
                          {isReceived && ref.status === "pending" && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => respond(ref, true)}
                                disabled={actingId === ref.id}
                                style={{ background: "#2e7d32", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                              >
                                ✓ {t.accept}
                              </button>
                              <button
                                onClick={() => respond(ref, false)}
                                disabled={actingId === ref.id}
                                style={{ background: "#fff", color: "#c0392b", border: "1px solid #f1c7c2", borderRadius: 10, padding: "9px 16px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                              >
                                ✕ {t.reject}
                              </button>
                            </div>
                          )}
                          {isReceived && ref.status === "accepted" && (
                            <span style={{ fontSize: 12, color: "#2e7d32" }}>{t.acceptedNote}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 7 };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1px solid #dbe4ef", fontFamily: "'Rubik',sans-serif", fontSize: 14, color: "#2c3e50", background: "#fbfdff", outline: "none" };

const chip: React.CSSProperties = { background: "#f1f5fb", color: "#5a6b80", borderRadius: 16, padding: "3px 12px", fontSize: 12, fontWeight: 600 };
