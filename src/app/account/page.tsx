"use client";
// ============================================================
// NABD - نبض | حسابي — مركز إدارة حساب الطبيب
// أقسام: الملف الشخصي · كلمة السر · إدارة العيادة · التفضيلات
// Route: /account
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import SharedSidebar from "@/components/SharedSidebar";
import AuthGuard from "@/components/AuthGuard";
import ChangePasswordCard from "@/components/ChangePasswordCard";

const BRAND = {
  primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6",
  sky: "#eaf3fc", green: "#2e7d32", orange: "#e67e22", ink: "#1c2b3a",
  muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
type Tab = "profile" | "password" | "clinic" | "prefs";

type Account = {
  email: string; clinic_name: string; owner: string; phone: string;
  plan: string; status: string; expiry: string; account_type: string;
};

const PLAN_LABEL: Record<string, { ar: string; en: string }> = {
  basic: { ar: "الأساسية", en: "Basic" }, pro: { ar: "الاحترافية", en: "Pro" },
  enterprise: { ar: "الشاملة", en: "Enterprise" },
  shared_basic: { ar: "مشتركة أساسية", en: "Shared Basic" },
  shared_pro: { ar: "مشتركة احترافية", en: "Shared Pro" },
  shared_enterprise: { ar: "مشتركة شاملة", en: "Shared Enterprise" },
  pharmacy: { ar: "صيدلية", en: "Pharmacy" }, lab: { ar: "مخبر", en: "Lab" },
};

const T = {
  ar: {
    title: "حسابي", subtitle: "تحكّم بمعلومات حسابك وأمانه",
    tabs: { profile: "الملف الشخصي", password: "كلمة السر", clinic: "إدارة العيادة", prefs: "التفضيلات" },
    profileTitle: "معلومات الحساب", profileSub: "اسمك واسم عيادتك ورقم تواصلك",
    ownerName: "اسم الطبيب", clinicName: "اسم العيادة", phone: "رقم الهاتف", email: "البريد الإلكتروني",
    emailNote: "البريد لا يمكن تغييره (اسم الدخول)",
    save: "حفظ التغييرات", saving: "جارٍ الحفظ...", saved: "✓ تم حفظ التغييرات",
    plan: "الخطة", status: "الحالة", expiry: "تنتهي في",
    active: "نشط", frozen: "موقوف",
    clinicTitle: "إدارة العيادة", clinicSub: "أوقات الدوام، العطل، وإعدادات الحجز",
    clinicBtn: "فتح إدارة العيادة",
    prefsTitle: "التفضيلات", prefsSub: "اللغة والإشعارات",
    langLabel: "لغة التطبيق", langBtn: "التبديل إلى English",
    signOut: "تسجيل الخروج", signOutSub: "إنهاء جلستك الحالية على هذا الجهاز",
    err: "حدث خطأ، حاول مجدداً.",
  },
  en: {
    title: "My Account", subtitle: "Manage your account info and security",
    tabs: { profile: "Profile", password: "Password", clinic: "Clinic", prefs: "Preferences" },
    profileTitle: "Account Info", profileSub: "Your name, clinic name, and contact number",
    ownerName: "Doctor name", clinicName: "Clinic name", phone: "Phone", email: "Email",
    emailNote: "Email can't be changed (login username)",
    save: "Save Changes", saving: "Saving...", saved: "✓ Changes saved",
    plan: "Plan", status: "Status", expiry: "Expires",
    active: "Active", frozen: "Frozen",
    clinicTitle: "Clinic Management", clinicSub: "Working hours, vacations, and booking settings",
    clinicBtn: "Open Clinic Management",
    prefsTitle: "Preferences", prefsSub: "Language and notifications",
    langLabel: "App language", langBtn: "Switch to العربية",
    signOut: "Sign Out", signOutSub: "End your current session on this device",
    err: "Something went wrong, try again.",
  },
};

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: 24, boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
      {children}
    </div>
  );
}

export default function AccountPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  const [acc, setAcc] = useState<Account | null>(null);
  const [owner, setOwner] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const isAr = lang === "ar";
  const t = T[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "en") setLang("en");
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("t");
      if (q === "profile" || q === "password" || q === "clinic" || q === "prefs") setTab(q);
    }
  }, []);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = (await res.json()) as { account?: Account };
      if (json.account) {
        setAcc(json.account);
        setOwner(json.account.owner);
        setClinicName(json.account.clinic_name);
        setPhone(json.account.phone);
        if (json.account.plan) setPlan(json.account.plan as PlanType);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    setMsg(null); setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ owner, phone, clinic_name: clinicName }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) { setMsg({ kind: "ok", text: t.saved }); await load(); }
      else setMsg({ kind: "err", text: t.err });
    } catch { setMsg({ kind: "err", text: t.err }); }
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: `1.5px solid #dbe4ef`, fontFamily: "'Rubik',sans-serif", fontSize: 14, color: BRAND.ink, background: "#fbfdff", outline: "none" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 7 };

  const tabs: { key: Tab; icon: string }[] = [
    { key: "profile", icon: "👤" }, { key: "password", icon: "🔑" },
    { key: "clinic", icon: "🏥" }, { key: "prefs", icon: "⚙️" },
  ];

  const planLabel = acc ? (PLAN_LABEL[acc.plan]?.[isAr ? "ar" : "en"] ?? acc.plan) : "";

  return (
    <AuthGuard>
      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <style>{`
          *{box-sizing:border-box}
          .acc-main{margin-${isAr ? "right" : "left"}:${sidebarWidth}px;transition:margin .3s cubic-bezier(.4,0,.2,1)}
          .acc-fade{animation:accFade .4s ease}
          @keyframes accFade{from{opacity:0}to{opacity:1}}
          .acc-tabbtn{transition:all .18s ease}
          @media(max-width:860px){
            .acc-main{margin-right:0!important;margin-left:0!important;padding:0 14px 110px!important}
            .acc-tabs{overflow-x:auto;-webkit-overflow-scrolling:touch}
            .acc-tabs::-webkit-scrollbar{display:none}
            .acc-tabs button{flex:0 0 auto}
            .acc-grid2{grid-template-columns:1fr!important}
          }
        `}</style>

        <SharedSidebar
          lang={lang} setLang={setLang} activePage="account"
          plan={plan} planLoading={loading}
          onCollapse={(c: boolean) => setSidebarWidth(c ? 70 : 240)}
        />

        <main className="acc-fade acc-main" style={{ padding: "0 28px 90px", minHeight: "100vh" }}>

          {/* ─── HERO ─── */}
          <div style={{
            margin: "20px 0 24px",
            background: `linear-gradient(120deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 100%)`,
            borderRadius: 24, padding: "26px 30px", position: "relative", overflow: "hidden",
            boxShadow: "0 12px 36px rgba(8,99,186,.28)",
          }}>
            <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,.18)", border: "2px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {(owner || acc?.clinic_name || "؟").charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{owner || acc?.clinic_name || t.title}</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>
                  {acc?.email}{planLabel ? ` • ${planLabel}` : ""}
                </p>
              </div>
              {acc?.status && (
                <span style={{ background: acc.status === "active" ? "rgba(46,204,113,.25)" : "rgba(230,126,34,.3)", color: "#fff", borderRadius: 20, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, border: "1px solid rgba(255,255,255,.3)" }}>
                  {acc.status === "active" ? t.active : t.frozen}
                </span>
              )}
            </div>
          </div>

          {/* ─── TABS ─── */}
          <div className="acc-tabs" style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            {tabs.map(x => (
              <button key={x.key} className="acc-tabbtn" onClick={() => { setTab(x.key); setMsg(null); }}
                style={{
                  padding: "11px 20px", borderRadius: 14, border: "1.5px solid",
                  borderColor: tab === x.key ? BRAND.primary : BRAND.border,
                  background: tab === x.key ? BRAND.sky : "#fff",
                  color: tab === x.key ? BRAND.primary : BRAND.muted,
                  fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                }}>
                <span>{x.icon}</span>{t.tabs[x.key]}
              </button>
            ))}
          </div>

          {/* ─── PROFILE ─── */}
          {tab === "profile" && (
            <div style={{ maxWidth: 620, display: "grid", gap: 18 }}>
              <SectionCard>
                <div style={{ marginBottom: 18 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: BRAND.ink }}>{t.profileTitle}</h3>
                  <p style={{ margin: "5px 0 0", fontSize: 12.5, color: BRAND.muted }}>{t.profileSub}</p>
                </div>
                <div style={{ display: "grid", gap: 16 }}>
                  <div className="acc-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div><label style={lbl}>{t.ownerName}</label><input style={inp} value={owner} onChange={e => setOwner(e.target.value)} /></div>
                    <div><label style={lbl}>{t.phone}</label><input style={inp} dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  </div>
                  <div><label style={lbl}>{t.clinicName}</label><input style={inp} value={clinicName} onChange={e => setClinicName(e.target.value)} /></div>
                  <div>
                    <label style={lbl}>{t.email}</label>
                    <input style={{ ...inp, background: "#f1f4f8", color: BRAND.muted, cursor: "not-allowed" }} value={acc?.email ?? ""} disabled dir="ltr" />
                    <span style={{ fontSize: 11.5, color: BRAND.muted, marginTop: 5, display: "block" }}>{t.emailNote}</span>
                  </div>
                  {msg && (
                    <div style={{ padding: "11px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: msg.kind === "ok" ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.1)", color: msg.kind === "ok" ? BRAND.green : "#c0392b" }}>{msg.text}</div>
                  )}
                  <button onClick={saveProfile} disabled={saving}
                    style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1, boxShadow: "0 6px 18px rgba(8,99,186,.22)" }}>
                    {saving ? t.saving : t.save}
                  </button>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ─── PASSWORD ─── */}
          {tab === "password" && <ChangePasswordCard lang={lang} />}

          {/* ─── CLINIC ─── */}
          {tab === "clinic" && (
            <div style={{ maxWidth: 620 }}>
              <SectionCard>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: BRAND.sky, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🏥</div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: BRAND.ink }}>{t.clinicTitle}</h3>
                    <p style={{ margin: "5px 0 0", fontSize: 12.5, color: BRAND.muted }}>{t.clinicSub}</p>
                  </div>
                  <a href="/clinic-management"
                    style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", textDecoration: "none", borderRadius: 12, padding: "12px 22px", fontSize: 13.5, fontWeight: 700, boxShadow: "0 6px 18px rgba(8,99,186,.22)", whiteSpace: "nowrap" }}>
                    {t.clinicBtn} ←
                  </a>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ─── PREFERENCES ─── */}
          {tab === "prefs" && (
            <div style={{ maxWidth: 620, display: "grid", gap: 18 }}>
              <SectionCard>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: BRAND.ink }}>{t.prefsTitle}</h3>
                <p style={{ margin: "0 0 18px", fontSize: 12.5, color: BRAND.muted }}>{t.prefsSub}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: `1px solid ${BRAND.bg}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink }}>🌐 {t.langLabel}</div>
                    <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 3 }}>{isAr ? "العربية" : "English"}</div>
                  </div>
                  <button onClick={() => setLang(isAr ? "en" : "ar")}
                    style={{ background: BRAND.sky, color: BRAND.primary, border: `1.5px solid ${BRAND.border}`, borderRadius: 10, padding: "9px 18px", fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {t.langBtn}
                  </button>
                </div>
              </SectionCard>

              <SectionCard>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#c0392b" }}>🚪 {t.signOut}</div>
                    <div style={{ fontSize: 12.5, color: BRAND.muted, marginTop: 3 }}>{t.signOutSub}</div>
                  </div>
                  <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
                    style={{ background: "rgba(192,57,43,.08)", color: "#c0392b", border: "1.5px solid rgba(192,57,43,.2)", borderRadius: 10, padding: "9px 20px", fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {t.signOut}
                  </button>
                </div>
              </SectionCard>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
