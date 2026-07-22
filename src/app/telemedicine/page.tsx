"use client";
// ============================================================
// NABD - نبض | العيادة الأونلاين (Telemedicine)
// يجمع كل مواعيد الكشف عن بُعد ويربطها بصفحة المواعيد
// Route: /telemedicine
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";
import PageIntro from "@/components/PageIntro";
import { normalizePhone } from "@/lib/phone";
import { fmtTime } from "@/lib/timeFormat";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6",
  sky: "#eaf3fc", green: "#2e7d32", orange: "#e67e22", purple: "#7b2d8b",
  ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
type Status = "scheduled" | "completed" | "cancelled" | "no-show";

type Appt = {
  id: number; patient_id: number; date: string; time: string;
  duration: number; type: string | null; status: Status;
  is_online: boolean; call_status: string | null;
};
type Patient = { id: number; name: string; phone: string | null };

const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const T = {
  ar: {
    title: "العيادة الأونلاين", subtitle: "كل مواعيد الكشف عن بُعد في مكان واحد",
    statToday: "اليوم", statUpcoming: "قادمة", statDone: "مكتملة",
    tabUpcoming: "القادمة", tabToday: "اليوم", tabPast: "السابقة",
    join: "دخول الكشف", copy: "نسخ رابط المريض", copied: "✓ نُسخ",
    whatsapp: "إرسال الرابط واتساب", addNew: "+ موعد أونلاين جديد",
    empty: "لا مواعيد أونلاين هنا",
    disabled: "ميزة العيادة الأونلاين غير مفعّلة لعيادتك. تواصل مع إدارة نبض لتفعيلها.",
    manageInAppts: "تُدار المواعيد من صفحة المواعيد",
    statuses: { scheduled: "مجدول", completed: "مكتمل", cancelled: "ملغى", "no-show": "لم يحضر" } as Record<Status, string>,
    waMsg: (n: string, d: string, t: string, link: string) =>
      `مرحباً ${n}، لديك موعد كشف عن بُعد بتاريخ ${d} الساعة ${t}.\nادخل من الرابط في وقت موعدك:\n${link}`,
  },
  en: {
    title: "Online Clinic", subtitle: "All your telemedicine visits in one place",
    statToday: "Today", statUpcoming: "Upcoming", statDone: "Completed",
    tabUpcoming: "Upcoming", tabToday: "Today", tabPast: "Past",
    join: "Join call", copy: "Copy patient link", copied: "✓ Copied",
    whatsapp: "Send link via WhatsApp", addNew: "+ New online visit",
    empty: "No online visits here",
    disabled: "Online clinic isn't enabled for your account. Contact NABD to enable it.",
    manageInAppts: "Visits are managed from the Appointments page",
    statuses: { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", "no-show": "No-show" } as Record<Status, string>,
    waMsg: (n: string, d: string, t: string, link: string) =>
      `Hi ${n}, you have an online visit on ${d} at ${t}.\nJoin from this link at your appointment time:\n${link}`,
  },
};

export default function TelemedicinePage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [countryCode, setCountryCode] = useState("963");

  const [appts, setAppts] = useState<Appt[]>([]);
  const [patients, setPatients] = useState<Record<number, Patient>>({});
  const [tab, setTab] = useState<"today" | "upcoming" | "past">("today");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const isAr = lang === "ar";
  const t = T[lang];
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "en") setLang("en");
  }, []);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: clinic } = await supabase
      .from("clinics").select("plan, telemedicine_enabled, country_code").eq("user_id", user.id).maybeSingle();
    if (clinic?.plan) setPlan(clinic.plan as PlanType);
    if (clinic?.country_code) setCountryCode(clinic.country_code as string);
    setEnabled(!!clinic?.telemedicine_enabled);

    const [{ data: apptData }, { data: patData }] = await Promise.all([
      supabase.from("appointments")
        .select("id, patient_id, date, time, duration, type, status, is_online, call_status")
        .eq("user_id", user.id).eq("is_online", true)
        .order("date", { ascending: true }).order("time", { ascending: true }),
      supabase.from("patients").select("id, name, phone").eq("user_id", user.id),
    ]);
    setAppts((apptData ?? []) as Appt[]);
    const map: Record<number, Patient> = {};
    (patData ?? []).forEach((p: any) => { map[p.id] = p as Patient; });
    setPatients(map);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pName = (id: number) => patients[id]?.name ?? "—";
  const pPhone = (id: number) => patients[id]?.phone ?? "";
  const visitUrl = (id: number) => `${typeof window !== "undefined" ? window.location.origin : ""}/visit/${id}`;

  const fmtDate = (d: string) => {
    const [y, mo, dd] = d.split("-");
    return `${parseInt(dd)} ${(isAr ? MONTHS_AR : MONTHS_EN)[parseInt(mo) - 1]} ${y}`;
  };

  function copyLink(id: number) {
    try { navigator.clipboard?.writeText(visitUrl(id)); } catch { /* ignore */ }
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1500);
  }

  function sendWhatsApp(a: Appt) {
    const raw = normalizePhone(pPhone(a.patient_id), countryCode);
    const msg = encodeURIComponent(t.waMsg(pName(a.patient_id), fmtDate(a.date), fmtTime(a.time, "24", isAr), visitUrl(a.id)));
    window.open(raw ? `https://wa.me/${raw}?text=${msg}` : `https://wa.me/?text=${msg}`, "_blank");
  }

  const active = appts.filter(a => a.status !== "cancelled");
  const todayList = active.filter(a => a.date === todayStr);
  const upcoming = active.filter(a => a.date > todayStr);
  const past = active.filter(a => a.date < todayStr);
  const list = tab === "today" ? todayList : tab === "upcoming" ? upcoming : past;
  const doneCount = appts.filter(a => a.status === "completed").length;

  function StatCard({ icon, accent, soft, label, value }: { icon: string; accent: string; soft: string; label: string; value: string }) {
    return (
      <div style={{ background: "#fff", borderRadius: 18, padding: "18px 20px", border: `1.5px solid ${BRAND.border}`, boxShadow: "0 4px 16px rgba(8,99,186,.05)", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: BRAND.muted, fontWeight: 600, marginTop: 5 }}>{label}</div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <PageIntro pageKey="telemedicine" lang={lang} />
      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <style>{`
          *{box-sizing:border-box}
          .tm-main{margin-${isAr ? "right" : "left"}:${sidebarWidth}px;transition:margin .3s cubic-bezier(.4,0,.2,1)}
          .tm-fade{animation:tmFade .4s ease}
          @keyframes tmFade{from{opacity:0}to{opacity:1}}
          .tm-card{transition:box-shadow .2s ease}
          .tm-card:hover{box-shadow:0 10px 30px rgba(8,99,186,.09)}
          .tm-btn{transition:transform .16s ease}
          .tm-btn:hover{transform:translateY(-1px)}
          @media(max-width:860px){
            .tm-main{margin-right:0!important;margin-left:0!important;padding:0 14px 110px!important}
            .tm-stats{grid-template-columns:1fr!important}
            .tm-head{flex-direction:column;align-items:stretch!important}
            .tm-head .tm-newbtn{width:100%}
            .tm-tabs button{flex:1}
            .tm-cardrow{flex-direction:column!important;align-items:stretch!important}
            .tm-actions{width:100%;justify-content:space-between!important}
            .tm-actions .tm-join{flex:1}
          }
        `}</style>

        <SharedSidebar
          lang={lang} setLang={setLang} activePage="telemedicine"
          plan={plan} planLoading={loading}
          onCollapse={(c: boolean) => setSidebarWidth(c ? 70 : 240)}
        />

        <main className="tm-fade tm-main" style={{ padding: "0 28px 90px", minHeight: "100vh" }}>

          {/* HERO */}
          <div style={{
            margin: "20px 0 24px",
            background: `linear-gradient(120deg, ${BRAND.purple} 0%, #6a2a86 50%, #a23bb5 100%)`,
            borderRadius: 24, padding: "26px 30px", position: "relative", overflow: "hidden",
            boxShadow: "0 12px 36px rgba(123,45,139,.28)",
          }}>
            <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div className="tm-head" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 5 }}>🎥 {t.title}</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>{t.subtitle}</p>
              </div>
              <a href="/appointments"
                className="tm-newbtn tm-btn"
                style={{ background: "rgba(255,255,255,.16)", color: "#fff", border: "1.5px solid rgba(255,255,255,.35)", borderRadius: 14, padding: "12px 22px", fontSize: 14, fontWeight: 700, textDecoration: "none", backdropFilter: "blur(4px)", textAlign: "center" }}>
                {t.addNew}
              </a>
            </div>
          </div>

          {!enabled && !loading ? (
            <div style={{ textAlign: "center", padding: "70px 24px", background: "#fff", borderRadius: 20, border: `1.5px dashed ${BRAND.border}` }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
              <p style={{ fontSize: 15, color: BRAND.ink, lineHeight: 1.9, maxWidth: 420, margin: "0 auto" }}>{t.disabled}</p>
            </div>
          ) : (
            <>
              {/* STATS */}
              <div className="tm-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
                <StatCard icon="📆" accent={BRAND.purple} soft="rgba(123,45,139,.09)" label={t.statToday} value={String(todayList.length)} />
                <StatCard icon="⏭️" accent={BRAND.primary} soft={BRAND.sky} label={t.statUpcoming} value={String(upcoming.length)} />
                <StatCard icon="✅" accent={BRAND.green} soft="rgba(46,125,50,.09)" label={t.statDone} value={String(doneCount)} />
              </div>

              {/* TABS */}
              <div className="tm-tabs" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {(["today", "upcoming", "past"] as const).map(k => (
                  <button key={k} onClick={() => setTab(k)} style={{
                    padding: "11px 22px", borderRadius: 14, border: "1.5px solid",
                    borderColor: tab === k ? BRAND.purple : BRAND.border,
                    background: tab === k ? "rgba(123,45,139,.07)" : "#fff",
                    color: tab === k ? BRAND.purple : BRAND.muted,
                    fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    {k === "today" ? t.tabToday : k === "upcoming" ? t.tabUpcoming : t.tabPast}
                    {k === "today" && todayList.length > 0 && (
                      <span style={{ background: BRAND.purple, color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 8px" }}>{todayList.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* LIST */}
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: BRAND.muted }}>...</div>
              ) : list.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: `1.5px dashed ${BRAND.border}`, color: BRAND.muted, fontSize: 14.5 }}>
                  🎥 {t.empty}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {list.map(a => {
                    const isToday = a.date === todayStr;
                    return (
                      <div key={a.id} className="tm-card" style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: "16px 20px", boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
                        <div className="tm-cardrow" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                          {/* time */}
                          <div style={{ flexShrink: 0, textAlign: "center", minWidth: 60, background: "rgba(123,45,139,.06)", borderRadius: 12, padding: "8px 10px", border: "1px solid rgba(123,45,139,.15)" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.purple, lineHeight: 1 }}>{fmtTime(a.time, "24", isAr)}</div>
                            <div style={{ fontSize: 10, color: BRAND.muted, marginTop: 3 }}>{a.duration} {isAr ? "د" : "m"}</div>
                          </div>
                          {/* avatar */}
                          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${BRAND.purple},#a23bb5)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                            {pName(a.patient_id).charAt(0)}
                          </div>
                          {/* details */}
                          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: BRAND.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pName(a.patient_id)}</div>
                            <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 2 }}>
                              {fmtDate(a.date)}{a.type ? ` • ${a.type}` : ""} • <span style={{ color: a.status === "completed" ? BRAND.green : BRAND.purple, fontWeight: 700 }}>{t.statuses[a.status]}</span>
                            </div>
                          </div>
                          {/* actions */}
                          <div className="tm-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <button className="tm-btn tm-join" onClick={() => { window.location.href = `/call/${a.id}`; }}
                              style={{ height: 38, padding: "0 18px", borderRadius: 11, background: `linear-gradient(135deg,${BRAND.purple},#a23bb5)`, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Rubik',sans-serif", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                              🎥 {t.join}
                            </button>
                            <button className="tm-btn" title={t.copy} onClick={() => copyLink(a.id)}
                              style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(123,45,139,.08)", border: "1.5px solid rgba(123,45,139,.2)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {copiedId === a.id ? "✓" : "🔗"}
                            </button>
                            <button className="tm-btn" title={t.whatsapp} onClick={() => sendWhatsApp(a)}
                              style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(37,211,102,.1)", border: "1.5px solid rgba(37,211,102,.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ textAlign: "center", fontSize: 12, color: BRAND.muted, marginTop: 22 }}>
                {t.manageInAppts} ← <a href="/appointments" style={{ color: BRAND.primary, fontWeight: 700, textDecoration: "none" }}>{isAr ? "المواعيد" : "Appointments"}</a>
              </p>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
