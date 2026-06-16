"use client";
// ============================================================
// SharedSidebar.tsx — القائمة الجانبية الموحّدة لتطبيق نبض
// تُستخدم في: dashboard, patients, appointments, payments,
//             prescriptions, patient-tracking, clinic-management, secretary
// ============================================================

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ───────────────────────────────────────────────────
export type PlanType =
  | "basic" | "pro" | "enterprise"
  | "shared_basic" | "shared_pro" | "shared_enterprise";

export type Lang = "ar" | "en";

// ─── Plan access ─────────────────────────────────────────────
const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

const PLAN_BADGE: Record<PlanType, { label: { ar: string; en: string }; color: string; isShared?: boolean }> = {
  basic:             { label: { ar: "الأساسية",           en: "Basic"          }, color: "#0863ba" },
  pro:               { label: { ar: "الاحترافية",         en: "Professional"   }, color: "#7b2d8b" },
  enterprise:        { label: { ar: "الشاملة",            en: "Comprehensive"  }, color: "#e67e22" },
  shared_basic:      { label: { ar: "مشتركة - أساسية",   en: "Shared - Basic" }, color: "#0e8a6e", isShared: true },
  shared_pro:        { label: { ar: "مشتركة - احترافية", en: "Shared - Pro"   }, color: "#6a1fa8", isShared: true },
  shared_enterprise: { label: { ar: "مشتركة - شاملة",    en: "Shared - Full"  }, color: "#c0620a", isShared: true },
};

// ─── Colour tokens ───────────────────────────────────────────
const SB_BG        = "#0558a8";
const SB_HEADER    = "#044d96";
const SB_ACTIVE_BG = "rgba(255,255,255,0.15)";
const SB_ACTIVE    = "#ffffff";
const SB_IDLE      = "rgba(255,255,255,0.62)";
const SB_BORDER    = "rgba(255,255,255,0.1)";
const SB_INDICATOR = "#7dd3fc";

// ─── SVG Icons ───────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  patients: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  appointments: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  payments: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  prescriptions: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/>
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
    </svg>
  ),
  tracking: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  clinicManagement: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  messages: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  signOut: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ─── Nav labels ──────────────────────────────────────────────
const NAV_LABELS = {
  ar: {
    dashboard: "الرئيسية", patients: "المرضى", appointments: "المواعيد",
    payments: "المدفوعات", prescriptions: "الوصفات",
    tracking: "متابعة المرضى", clinicManagement: "إدارة العيادة",
    signOut: "تسجيل الخروج", plan: "خطة", clinic: "عيادة",
    notAvailable: "غير متاح في خطتك",
    expand: "توسيع القائمة", collapse: "طي القائمة",
    lang: "English",
  },
  en: {
    dashboard: "Dashboard", patients: "Patients", appointments: "Appointments",
    payments: "Payments", prescriptions: "Prescriptions",
    tracking: "Patient Tracking", clinicManagement: "Clinic Management",
    signOut: "Sign Out", plan: "Plan", clinic: "Clinic",
    notAvailable: "Not available in your plan",
    expand: "Expand sidebar", collapse: "Collapse sidebar",
    lang: "العربية",
  },
};

// ─── Props ───────────────────────────────────────────────────
export interface SharedSidebarProps {
  lang: Lang;
  setLang: (l: Lang) => void;
  activePage: string;
  plan?: PlanType;
  doctorCount?: number;
  maxDoctorCount?: number;
  userId?: string;
  onCollapse?: (collapsed: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────
export default function SharedSidebar({
  lang,
  setLang,
  activePage,
  plan = "basic",
  doctorCount,
  maxDoctorCount,
  userId,
  onCollapse,
}: SharedSidebarProps) {
  const isAr = lang === "ar";
  const tr   = NAV_LABELS[lang];

  const [collapsed,   setCollapsed]   = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [pushPerm,    setPushPerm]    = useState<"default"|"granted"|"denied"|"unsupported">("default");

  useEffect(() => { onCollapse?.(collapsed); }, [collapsed, onCollapse]);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // إغلاق القائمة عند الضغط على Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // فحص حالة إذن الإشعارات
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPerm("unsupported"); return;
    }
    setPushPerm(Notification.permission as any);
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => {
      if (sub) setPushPerm("granted");
    }).catch(() => {});
  }, []);

  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE["basic"];

  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  const handlePushToggle = async () => {
    if (!userId || !("serviceWorker" in navigator)) return;
    setPushLoading(true);
    try {
      if (pushPerm === "granted") {
        // إلغاء الاشتراك
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
        }
        setPushPerm("default");
      } else {
        // طلب الإذن والاشتراك
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setPushPerm(perm as any); return; }
        const reg = await navigator.serviceWorker.ready;
        const b64 = (s: string) => { const p = "=".repeat((4-s.length%4)%4); const b = (s+p).replace(/-/g,"+").replace(/_/g,"/"); const r = window.atob(b); return Uint8Array.from(r,c=>c.charCodeAt(0)); };
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
        const j = sub.toJSON(); const k = j.keys as {p256dh:string;auth:string};
        await supabase.from("push_subscriptions").upsert({ user_id: userId, endpoint: j.endpoint!, p256dh: k.p256dh, auth: k.auth }, { onConflict: "user_id,endpoint" });
        setPushPerm("granted");
      }
    } catch(e) { console.warn("push:", e); }
    finally { setPushLoading(false); }
  };

  const navItems = [
    { key: "dashboard",        href: "/dashboard",        icon: Icons.dashboard        },
    { key: "patients",         href: "/patients",         icon: Icons.patients         },
    { key: "appointments",     href: "/appointments",     icon: Icons.appointments     },
    { key: "clinicManagement", href: "/clinic-management",icon: Icons.clinicManagement },
    { key: "payments",         href: "/payments",         icon: Icons.payments         },
    { key: "prescriptions",    href: "/prescriptions",    icon: Icons.prescriptions    },
    { key: "tracking",         href: "/patient-tracking", icon: Icons.tracking         },
    { key: "messages",         href: "/messages",         icon: Icons.messages         },
  ];

  const transform = isMobile
    ? mobileOpen ? "translateX(0)" : isAr ? "translateX(100%)" : "translateX(-100%)"
    : "translateX(0)";

  const sideWidth = isMobile ? 260 : collapsed ? 70 : 240;

  return (
    <>
      {/* Overlay للموبايل */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 49,
          }}
        />
      )}

      {/* زر الهامبرغر */}
      {isMobile && (
        <button
          aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: "fixed", top: 14, zIndex: 60,
            right: isAr ? 16 : undefined, left: isAr ? undefined : 16,
            width: 40, height: 40, borderRadius: 10,
            background: "#0863ba", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(8,99,186,.4)",
          }}
        >
          {mobileOpen ? Icons.close : Icons.menu}
        </button>
      )}

      {/* القائمة الجانبية */}
      <aside
        style={{
          width: sideWidth,
          minHeight: "100vh",
          background: SB_BG,
          display: "flex", flexDirection: "column",
          transition: "transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",
          position: "fixed", top: 0,
          right: isAr ? 0 : undefined, left: isAr ? undefined : 0,
          zIndex: 50, transform,
          boxShadow: isAr
            ? "-4px 0 32px rgba(5,88,168,.45)"
            : "4px 0 32px rgba(5,88,168,.45)",
        }}
      >
        {/* ── Header / Logo ── */}
        <div style={{
          padding: collapsed ? "22px 0" : "22px 20px",
          borderBottom: `1px solid ${SB_BORDER}`,
          background: SB_HEADER,
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 72,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid rgba(255,255,255,0.2)", overflow: "hidden",
              }}>
                <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 26, height: 26 }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>نبض</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Clinic Manager</div>
              </div>
            </div>
          )}

          {collapsed && (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid rgba(255,255,255,0.2)", overflow: "hidden",
            }}>
              <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 26, height: 26 }} />
            </div>
          )}

          {!isMobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? tr.expand : tr.collapse}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.12)",
                border: "1.5px solid rgba(255,255,255,0.22)",
                cursor: "pointer", color: "rgba(255,255,255,0.9)",
                fontSize: 14, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)"; }}
            >
              {collapsed ? (isAr ? "‹" : "›") : (isAr ? "›" : "‹")}
            </button>
          )}
        </div>

        {/* ── Nav items ── */}
        <nav style={{ flex: 1, padding: collapsed ? "16px 10px" : "14px 12px", overflowY: "auto" }}>
          {navItems.map(item => {
            const isActive = item.key === activePage;
            const isLocked = !canAccess(item.key, plan);
            return (
              <a
                key={item.key}
                href={isLocked ? undefined : item.href}
                title={collapsed || isLocked ? (isLocked ? tr.notAvailable : (tr as Record<string,string>)[item.key]) : undefined}
                onClick={e => { if (isLocked) e.preventDefault(); else if (isMobile) setMobileOpen(false); }}
                style={{
                  display: "flex", alignItems: "center",
                  gap: collapsed ? 0 : 11,
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "11px 0" : "10px 13px",
                  borderRadius: 10, marginBottom: 4,
                  textDecoration: "none",
                  background: isActive ? SB_ACTIVE_BG : "transparent",
                  color: isLocked ? "rgba(255,255,255,0.28)" : (isActive ? SB_ACTIVE : SB_IDLE),
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 13.5,
                  transition: "all .18s",
                  position: "relative",
                  border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
                  cursor: isLocked ? "not-allowed" : "pointer",
                  opacity: isLocked ? 0.5 : 1,
                  fontFamily: "Rubik, sans-serif",
                }}
                onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = isActive ? SB_ACTIVE_BG : "transparent"; }}
              >
                {isActive && (
                  <div style={{
                    position: "absolute",
                    [isAr ? "right" : "left"]: 0,
                    top: "50%", transform: "translateY(-50%)",
                    width: 3, height: 22, background: SB_INDICATOR,
                    borderRadius: isAr ? "3px 0 0 3px" : "0 3px 3px 0",
                  }} />
                )}
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", opacity: isActive ? 1 : 0.8 }}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span style={{ lineHeight: 1.3, flex: 1 }}>
                    {(tr as Record<string,string>)[item.key]}
                  </span>
                )}
                {isLocked && !collapsed && (
                  <span style={{ fontSize: 11, opacity: 0.6 }}>🔒</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* ── Footer ── */}
        <div style={{
          padding: collapsed ? "14px 10px" : "14px 12px",
          borderTop: `1px solid ${SB_BORDER}`,
          background: SB_HEADER,
        }}>
          {!collapsed && (
            <>
              {/* Plan badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", marginBottom: 8,
                background: "rgba(255,255,255,0.08)",
                border: `1.5px solid ${badge.color}50`,
                borderRadius: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: badge.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", flex: 1 }}>
                  {isAr ? (badge.isShared ? "عيادة" : "خطة") : (badge.isShared ? "Clinic" : "Plan")}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>
                  {badge.label[lang]}
                </span>
              </div>

              {/* Doctor count — للخطط المشتركة فقط */}
              {badge.isShared && doctorCount !== undefined && maxDoctorCount !== undefined && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", marginBottom: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 13 }}>👨‍⚕️</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", flex: 1 }}>
                    {isAr ? "الأطباء" : "Doctors"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: badge.color }}>
                    {doctorCount} / {maxDoctorCount}
                  </span>
                </div>
              )}

              {/* Language toggle */}
              <button
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                style={{
                  width: "100%", padding: "8px 12px", marginBottom: 8,
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, cursor: "pointer",
                  fontSize: 12, fontFamily: "Rubik, sans-serif",
                  color: "rgba(255,255,255,0.75)", fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
              >
                🌐 {tr.lang}
              </button>
            </>
          )}

          {/* زر الإشعارات */}
          {!collapsed && userId && pushPerm !== "unsupported" && pushPerm !== "denied" && (
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
                fontFamily: "Rubik,sans-serif",
                border: pushPerm === "granted" ? "1.5px solid rgba(34,197,94,.35)" : "1.5px solid rgba(255,255,255,.2)",
                background: pushPerm === "granted" ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.08)",
                opacity: pushLoading ? 0.7 : 1,
              }}
            >
              <span style={{ fontSize: 15 }}>{pushPerm === "granted" ? "🔔" : "🔕"}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: pushPerm === "granted" ? "#86efac" : "rgba(255,255,255,.7)" }}>
                {pushLoading
                  ? (isAr ? "جارٍ..." : "Loading...")
                  : pushPerm === "granted"
                    ? (isAr ? "الإشعارات مفعّلة" : "Notifications On")
                    : (isAr ? "تفعيل الإشعارات" : "Enable Notifications")}
              </span>
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            style={{
              width: "100%",
              display: "flex", alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              padding: collapsed ? "10px 0" : "10px 12px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.25)",
              cursor: "pointer", fontFamily: "Rubik, sans-serif",
              transition: "all .2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.22)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)"; }}
          >
            {Icons.signOut}
            {!collapsed && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>
                {tr.signOut}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Spacer لمنع تداخل المحتوى مع القائمة على الديسكتوب */}
      {!isMobile && (
        <div style={{ width: collapsed ? 70 : 240, flexShrink: 0, transition: "width .3s cubic-bezier(.4,0,.2,1)" }} />
      )}
    </>
  );
}
