"use client";
// ============================================================
// SharedSidebar.tsx — القائمة الجانبية الموحّدة لتطبيق نبض
// الموبايل: Bottom Navigation Bar بدلاً من زر الهامبرغر
// ============================================================

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
const SB_IDLE      = "rgba(255,255,255,0.65)";
const SB_BORDER    = "rgba(255,255,255,0.1)";
const SB_INDICATOR = "#7dd3fc";

// Bottom nav colours
const BN_BG        = "#0558a8";
const BN_ACTIVE    = "#ffffff";
const BN_IDLE      = "rgba(255,255,255,0.55)";
const BN_INDICATOR = "#7dd3fc";

// ─── SVG Icons ───────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  dashboardSm: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  patients: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  patientsSm: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  appointments: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  appointmentsSm: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  payments: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  paymentsSm: (
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
  more: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  signOut: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  lang: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  backRtl: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
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
    tracking: "متابعة", clinicManagement: "إدارة العيادة",
    messages: "الرسائل",
    more: "المزيد",
    signOut: "خروج", plan: "خطة", clinic: "عيادة",
    notAvailable: "غير متاح في خطتك",
    expand: "توسيع القائمة", collapse: "طي القائمة",
    lang: "English",
    back: "رجوع",
    moreMenu: "قائمة إضافية",
  },
  en: {
    dashboard: "Dashboard", patients: "Patients", appointments: "Appointments",
    payments: "Payments", prescriptions: "Prescriptions",
    tracking: "Tracking", clinicManagement: "Clinic Mgmt",
    messages: "Messages",
    more: "More",
    signOut: "Sign Out", plan: "Plan", clinic: "Clinic",
    notAvailable: "Not available in your plan",
    expand: "Expand sidebar", collapse: "Collapse sidebar",
    lang: "العربية",
    back: "Back",
    moreMenu: "More Menu",
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

// ─── Main nav items (bottom bar shows first 4) ───────────────
const MAIN_NAV = [
  { key: "dashboard",    href: "/dashboard",       iconLg: "dashboard",    iconSm: "dashboardSm"    },
  { key: "patients",     href: "/patients",         iconLg: "patients",     iconSm: "patientsSm"     },
  { key: "appointments", href: "/appointments",     iconLg: "appointments", iconSm: "appointmentsSm" },
  { key: "payments",     href: "/payments",         iconLg: "payments",     iconSm: "paymentsSm"     },
];

const SECONDARY_NAV = [
  { key: "prescriptions",    href: "/prescriptions",     icon: "prescriptions"    },
  { key: "tracking",         href: "/patient-tracking",  icon: "tracking"         },
  { key: "clinicManagement", href: "/clinic-management", icon: "clinicManagement" },
  { key: "messages",         href: "/messages",           icon: "messages"         },
];

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

  const router   = useRouter();
  const pathname = usePathname();

  const [mounted,      setMounted]      = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const [pushPerm,     setPushPerm]     = useState<"default"|"granted"|"denied"|"unsupported">("default");
  const [pushLoading,  setPushLoading]  = useState(false);
  const [selfUserId,   setSelfUserId]   = useState<string>("");
  const [unreadMsgs,   setUnreadMsgs]   = useState(0);

  // ─── جلب هوية المستخدم الحالي (الطبيب) داخلياً ────────────
  useEffect(() => {
    if (userId) { setSelfUserId(userId); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setSelfUserId(data.user.id);
    });
  }, [userId]);

  // ─── صوت إشعار وصول رسالة (Web Audio API) ─────────────────
  const playMsgSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* صامت إذا لم يدعم المتصفح */ }
  };

  // ─── عدّاد الرسائل غير المقروءة + Realtime ────────────────
  useEffect(() => {
    if (!selfUserId) return;

    const loadUnread = async () => {
      const { count } = await supabase
        .from("clinic_messages")
        .select("id", { count: "exact", head: true })
        .eq("to_id", selfUserId)
        .eq("is_read", false);
      setUnreadMsgs(count ?? 0);
    };
    loadUnread();

    const channel = supabase
      .channel(`sidebar-unread-${selfUserId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "clinic_messages",
        filter: `to_id=eq.${selfUserId}`,
      }, () => {
        setUnreadMsgs(prev => prev + 1);
        // لا نُشغّل الصوت إذا كان المستخدم بالفعل في صفحة الرسائل
        if (pathname !== "/messages") playMsgSound();
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "clinic_messages",
        filter: `to_id=eq.${selfUserId}`,
      }, () => { loadUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfUserId]);

  // ─── إعادة فحص العداد عند الدخول لصفحة الرسائل (تصفير) ────
  useEffect(() => {
    if (pathname === "/messages" && selfUserId) {
      const t = setTimeout(async () => {
        const { count } = await supabase
          .from("clinic_messages")
          .select("id", { count: "exact", head: true })
          .eq("to_id", selfUserId)
          .eq("is_read", false);
        setUnreadMsgs(count ?? 0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [pathname, selfUserId]);

  // ─── Detect mobile ───────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ─── Close more drawer on route change ───────────────────
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // ─── Escape key closes more drawer ───────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { onCollapse?.(collapsed); }, [collapsed, onCollapse]);

  // ─── Push notifications ──────────────────────────────────
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPerm("unsupported"); return;
    }
    setPushPerm(Notification.permission as "default"|"granted"|"denied");
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setPushPerm("granted"); })
      .catch(() => {});
  }, []);

  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BG73PZ28jKm8MniGKb0DJCG45VDuUBJdAJNNRX9VwPr1YD-y4o0vXy4BJRHL1qYoCIKOhuRfHE0QKLca7fq-ZQc";

  const handlePushToggle = async () => {
    if (!userId || !("serviceWorker" in navigator)) return;
    setPushLoading(true);
    try {
      if (pushPerm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", sub.endpoint);
        }
        setPushPerm("default");
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setPushPerm(perm as "default"|"denied"); return; }
        const reg = await navigator.serviceWorker.ready;
        const b64 = (s: string) => {
          const p = "=".repeat((4 - s.length % 4) % 4);
          const b = (s + p).replace(/-/g, "+").replace(/_/g, "/");
          const r = window.atob(b);
          return Uint8Array.from(r, c => c.charCodeAt(0));
        };
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) });
        const j = sub.toJSON();
        const k = j.keys as { p256dh: string; auth: string };
        await supabase.from("push_subscriptions").upsert(
          { user_id: userId, endpoint: j.endpoint!, p256dh: k.p256dh, auth: k.auth },
          { onConflict: "user_id,endpoint" }
        );
        setPushPerm("granted");
      }
    } catch (e) { console.warn("push:", e); }
    finally { setPushLoading(false); }
  };

  // ─── Can go back? ────────────────────────────────────────
  // لا نعرض شيئاً حتى يتم التحقق من حجم الشاشة (يمنع وميض الـ Sidebar)
  if (!mounted) return null;

  const rootPages = ["/dashboard", "/patients", "/appointments", "/payments",
    "/prescriptions", "/patient-tracking", "/clinic-management", "/messages"];
  const isRootPage = rootPages.some(p => pathname === p);
  const canGoBack  = !isRootPage;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  // ─── Sidebar nav item (desktop) ──────────────────────────
  const renderSidebarItem = (item: { key: string; href: string; icon?: string }, compact = false) => {
    const isActive = item.key === activePage;
    const isLocked = !canAccess(item.key, plan);
    const iconKey  = (item.icon ?? item.key) as keyof typeof Icons;
    const icon     = Icons[iconKey] ?? Icons.dashboard;
    const showBadge = item.key === "messages" && unreadMsgs > 0;
    return (
      <a
        key={item.key}
        href={isLocked ? undefined : item.href}
        title={collapsed || isLocked || compact
          ? (isLocked ? tr.notAvailable : (tr as Record<string,string>)[item.key])
          : undefined}
        onClick={e => { if (isLocked) e.preventDefault(); }}
        style={{
          display: "flex", alignItems: "center",
          gap: (collapsed || compact) ? 0 : 11,
          justifyContent: (collapsed || compact) ? "center" : "flex-start",
          padding: (collapsed || compact) ? "10px 0" : "10px 13px",
          borderRadius: 10,
          marginBottom: compact ? 0 : 3,
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
          flex: compact ? 1 : undefined,
          minWidth: 0,
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
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", opacity: isActive ? 1 : 0.8, position: "relative" }}>
          {icon}
          {showBadge && (
            <span style={{
              position: "absolute", top: -4, [isAr ? "left" : "right"]: -6,
              minWidth: 15, height: 15, padding: "0 3px",
              borderRadius: "50%", background: "#e53935",
              color: "#fff", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid #0558a8", lineHeight: 1,
            }}>
              {unreadMsgs > 9 ? "9+" : unreadMsgs}
            </span>
          )}
        </span>
        {!collapsed && !compact && (
          <span style={{ lineHeight: 1.3, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(tr as Record<string,string>)[item.key]}
          </span>
        )}
        {!collapsed && !compact && showBadge && (
          <span style={{
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9, background: "#e53935", color: "#fff",
            fontSize: 10, fontWeight: 700, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {unreadMsgs > 9 ? "9+" : unreadMsgs}
          </span>
        )}
        {!collapsed && !compact && isLocked && (
          <span style={{ fontSize: 11, opacity: 0.6 }}>🔒</span>
        )}
      </a>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MOBILE — Bottom Navigation Bar
  // ═══════════════════════════════════════════════════════════
  if (isMobile) {
    const isMoreActive = SECONDARY_NAV.some(i => i.key === activePage);

    return (
      <>
        {/* ── Safe area spacer at bottom ── */}
        <div style={{ height: 72, flexShrink: 0 }} />

        {/* ── More drawer overlay ── */}
        {moreOpen && (
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 59,
            }}
          />
        )}

        {/* ── More drawer (slides up) ── */}
        <div
          style={{
            position: "fixed",
            bottom: moreOpen ? 72 : -400,
            left: 0, right: 0,
            background: SB_BG,
            borderRadius: "20px 20px 0 0",
            zIndex: 60,
            transition: "bottom .3s cubic-bezier(.4,0,.2,1)",
            boxShadow: "0 -8px 32px rgba(5,88,168,0.45)",
            padding: "0 16px 16px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {/* Drawer handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />
          </div>

          {/* Secondary nav items */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {SECONDARY_NAV.map(item => {
              const isActive = item.key === activePage;
              const isLocked = !canAccess(item.key, plan);
              const icon = Icons[item.icon as keyof typeof Icons] ?? Icons.dashboard;
              const showBadge = item.key === "messages" && unreadMsgs > 0;
              return (
                <a
                  key={item.key}
                  href={isLocked ? undefined : item.href}
                  onClick={e => { if (isLocked) { e.preventDefault(); return; } setMoreOpen(false); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "14px 8px",
                    borderRadius: 14,
                    textDecoration: "none",
                    background: isActive ? SB_ACTIVE_BG : "rgba(255,255,255,0.07)",
                    color: isLocked ? "rgba(255,255,255,0.28)" : (isActive ? SB_ACTIVE : SB_IDLE),
                    border: isActive ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    opacity: isLocked ? 0.5 : 1,
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {showBadge && (
                    <span style={{
                      position: "absolute", top: 8, [isAr ? "left" : "right"]: 8,
                      minWidth: 16, height: 16, padding: "0 4px",
                      borderRadius: "50%", background: "#e53935",
                      color: "#fff", fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1,
                    }}>
                      {unreadMsgs > 9 ? "9+" : unreadMsgs}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
                  <span>
                    {(tr as Record<string,string>)[item.key]}
                    {isLocked && " 🔒"}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: SB_BORDER, marginBottom: 12 }} />

          {/* Push + Sign out + Lang */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {userId && pushPerm !== "unsupported" && pushPerm !== "denied" && (
              <button
                onClick={handlePushToggle}
                disabled={pushLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                  fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 600,
                  border: pushPerm === "granted" ? "1.5px solid rgba(34,197,94,.35)" : "1.5px solid rgba(255,255,255,.2)",
                  background: pushPerm === "granted" ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.08)",
                  color: pushPerm === "granted" ? "#86efac" : "rgba(255,255,255,.7)",
                  opacity: pushLoading ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 18 }}>{pushPerm === "granted" ? "🔔" : "🔕"}</span>
                {pushLoading
                  ? (isAr ? "جارٍ..." : "Loading...")
                  : pushPerm === "granted"
                    ? (isAr ? "الإشعارات مفعّلة" : "Notifications On")
                    : (isAr ? "تفعيل الإشعارات" : "Enable Notifications")}
              </button>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", borderRadius: 12,
                  background: "rgba(239,68,68,0.12)",
                  border: "1.5px solid rgba(239,68,68,0.25)",
                  cursor: "pointer", fontFamily: "Rubik, sans-serif",
                  fontSize: 13, fontWeight: 600, color: "#fca5a5",
                }}
              >
                {Icons.signOut}
                {tr.signOut}
              </button>
              <button
                onClick={() => { setLang(lang === "ar" ? "en" : "ar"); setMoreOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  cursor: "pointer", fontFamily: "Rubik, sans-serif",
                  fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)",
                }}
              >
                {Icons.lang}
                {tr.lang}
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom Navigation Bar ── */}
        <nav
          style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            height: 72,
            background: BN_BG,
            borderTop: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "stretch",
            zIndex: 58,
            boxShadow: "0 -4px 24px rgba(5,88,168,0.35)",
            // Safe area for iPhone home indicator
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {/* Back button — only on inner pages */}
          {canGoBack && (
            <button
              onClick={handleBack}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, flex: 1, border: "none", background: "transparent",
                color: BN_IDLE, cursor: "pointer", fontFamily: "Rubik, sans-serif",
                fontSize: 10, fontWeight: 500, padding: "8px 4px",
                transition: "color .18s",
              }}
            >
              <span style={{ display: "flex", alignItems: "center" }}>
                {isAr ? Icons.backRtl : Icons.back}
              </span>
              {tr.back}
            </button>
          )}

          {/* Main nav items */}
          {MAIN_NAV.map(item => {
            const isActive = item.key === activePage;
            const isLocked = !canAccess(item.key, plan);
            const iconKey  = item.iconLg as keyof typeof Icons;
            const icon     = Icons[iconKey];
            return (
              <a
                key={item.key}
                href={isLocked ? undefined : item.href}
                onClick={e => { if (isLocked) e.preventDefault(); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 3, flex: 1, textDecoration: "none",
                  color: isLocked ? "rgba(255,255,255,0.2)" : (isActive ? BN_ACTIVE : BN_IDLE),
                  fontFamily: "Rubik, sans-serif",
                  fontSize: 10, fontWeight: isActive ? 700 : 500,
                  padding: "8px 4px",
                  position: "relative",
                  transition: "color .18s",
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                {isActive && (
                  <div style={{
                    position: "absolute",
                    top: 0, left: "50%", transform: "translateX(-50%)",
                    width: 32, height: 3, background: BN_INDICATOR,
                    borderRadius: "0 0 4px 4px",
                  }} />
                )}
                <span style={{ display: "flex", alignItems: "center", opacity: isActive ? 1 : 0.75 }}>
                  {icon}
                </span>
                <span style={{ lineHeight: 1 }}>
                  {isLocked ? "🔒" : (tr as Record<string,string>)[item.key]}
                </span>
              </a>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(o => !o)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, flex: 1, border: "none", background: "transparent",
              color: isMoreActive || moreOpen ? BN_ACTIVE : BN_IDLE,
              cursor: "pointer", fontFamily: "Rubik, sans-serif",
              fontSize: 10, fontWeight: isMoreActive || moreOpen ? 700 : 500,
              padding: "8px 4px", position: "relative",
              transition: "color .18s",
            }}
          >
            {(isMoreActive || moreOpen) && (
              <div style={{
                position: "absolute",
                top: 0, left: "50%", transform: "translateX(-50%)",
                width: 32, height: 3, background: BN_INDICATOR,
                borderRadius: "0 0 4px 4px",
              }} />
            )}
            <span style={{ display: "flex", alignItems: "center", opacity: isMoreActive || moreOpen ? 1 : 0.75, position: "relative" }}>
              {Icons.more}
              {unreadMsgs > 0 && (
                <span style={{
                  position: "absolute", top: -4, [isAr ? "left" : "right"]: -6,
                  minWidth: 14, height: 14, padding: "0 3px",
                  borderRadius: "50%", background: "#e53935",
                  color: "#fff", fontSize: 8, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid #0558a8", lineHeight: 1,
                }}>
                  {unreadMsgs > 9 ? "9+" : unreadMsgs}
                </span>
              )}
            </span>
            {tr.more}
          </button>
        </nav>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DESKTOP — Original Sidebar
  // ═══════════════════════════════════════════════════════════
  const allNavItems = [
    { key: "dashboard",    href: "/dashboard",      icon: "dashboardSm"    },
    { key: "patients",     href: "/patients",        icon: "patientsSm"     },
    { key: "appointments", href: "/appointments",    icon: "appointmentsSm" },
    { key: "payments",     href: "/payments",        icon: "paymentsSm"     },
    { key: "prescriptions",href: "/prescriptions",   icon: "prescriptions"  },
    { key: "tracking",     href: "/patient-tracking",icon: "tracking"       },
  ];

  const pairedNavItems = [
    { key: "clinicManagement", href: "/clinic-management", icon: "clinicManagement" },
    { key: "messages",         href: "/messages",           icon: "messages"         },
  ];

  const sideWidth = collapsed ? 70 : 240;

  return (
    <>
      {/* القائمة الجانبية */}
      <aside
        style={{
          width: sideWidth,
          minHeight: "100vh",
          background: SB_BG,
          display: "flex", flexDirection: "column",
          transition: "width .3s cubic-bezier(.4,0,.2,1)",
          position: "fixed", top: 0,
          right: isAr ? 0 : undefined, left: isAr ? undefined : 0,
          zIndex: 50,
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
              <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 32, height: 32, filter: "brightness(0) invert(1)" }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>نبض</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Clinic Manager</div>
              </div>
            </div>
          )}
          {collapsed && (
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 28, height: 28, filter: "brightness(0) invert(1)" }} />
          )}
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
        </div>

        {/* ── Nav items ── */}
        <nav style={{ flex: 1, padding: collapsed ? "16px 10px" : "14px 12px", overflowY: "auto" }}>
          {allNavItems.map(item => renderSidebarItem(item))}

          <div style={{ height: 1, background: SB_BORDER, margin: "10px 4px" }} />

          {collapsed ? (
            pairedNavItems.map(item => renderSidebarItem(item))
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 3 }}>
              {pairedNavItems.map(item => {
                const isActive = item.key === activePage;
                const isLocked = !canAccess(item.key, plan);
                const icon = Icons[item.icon as keyof typeof Icons] ?? Icons.dashboard;
                const showBadge = item.key === "messages" && unreadMsgs > 0;
                return (
                  <a
                    key={item.key}
                    href={isLocked ? undefined : item.href}
                    title={isLocked ? tr.notAvailable : (tr as Record<string,string>)[item.key]}
                    onClick={e => { if (isLocked) e.preventDefault(); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: 5, padding: "10px 4px", borderRadius: 10, textDecoration: "none",
                      background: isActive ? SB_ACTIVE_BG : "rgba(255,255,255,0.05)",
                      color: isLocked ? "rgba(255,255,255,0.28)" : (isActive ? SB_ACTIVE : SB_IDLE),
                      fontWeight: isActive ? 600 : 400, fontSize: 11,
                      transition: "all .18s", position: "relative",
                      border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.08)",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.5 : 1, fontFamily: "Rubik, sans-serif", textAlign: "center",
                    }}
                    onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = isActive ? SB_ACTIVE_BG : "rgba(255,255,255,0.05)"; }}
                  >
                    {isActive && (
                      <div style={{
                        position: "absolute", top: 0, left: "50%",
                        transform: "translateX(-50%)",
                        width: 22, height: 3, background: SB_INDICATOR,
                        borderRadius: "0 0 3px 3px",
                      }} />
                    )}
                    <span style={{ display: "flex", alignItems: "center", opacity: isActive ? 1 : 0.85, position: "relative" }}>
                      {icon}
                      {showBadge && (
                        <span style={{
                          position: "absolute", top: -5, [isAr ? "left" : "right"]: -8,
                          minWidth: 15, height: 15, padding: "0 3px",
                          borderRadius: "50%", background: "#e53935",
                          color: "#fff", fontSize: 9, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1.5px solid #0558a8", lineHeight: 1,
                        }}>
                          {unreadMsgs > 9 ? "9+" : unreadMsgs}
                        </span>
                      )}
                    </span>
                    <span style={{ lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", paddingInline: 2 }}>
                      {(tr as Record<string,string>)[item.key]}
                      {isLocked && " 🔒"}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: collapsed ? "12px 10px" : "12px 12px", borderTop: `1px solid ${SB_BORDER}`, background: SB_HEADER }}>
          {!collapsed && userId && pushPerm !== "unsupported" && pushPerm !== "denied" && (
            <button
              onClick={handlePushToggle}
              disabled={pushLoading}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 10, marginBottom: 8, cursor: "pointer",
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

          <div style={{ display: "grid", gridTemplateColumns: collapsed ? "1fr" : "1fr 1fr", gap: 6 }}>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              title={tr.signOut}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: collapsed ? 0 : 6, padding: "10px 0", borderRadius: 10,
                background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.25)",
                cursor: "pointer", fontFamily: "Rubik, sans-serif", transition: "all .2s", flex: 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)"; }}
            >
              {Icons.signOut}
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, color: "#fca5a5" }}>{tr.signOut}</span>}
            </button>

            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              title={tr.lang}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: collapsed ? 0 : 5, padding: "10px 0",
                background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: 10, cursor: "pointer", fontSize: 12,
                fontFamily: "Rubik, sans-serif", color: "rgba(255,255,255,0.8)",
                fontWeight: 600, transition: "all .2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.16)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
            >
              <span style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.8)" }}>{Icons.lang}</span>
              {!collapsed && <span style={{ fontSize: 11 }}>{tr.lang}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer */}
      <div style={{ width: sideWidth, flexShrink: 0, transition: "width .3s cubic-bezier(.4,0,.2,1)" }} />
    </>
  );
}
