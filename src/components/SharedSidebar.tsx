"use client";
import AppIcon from "@/components/AppIcon";
// ============================================================
// SharedSidebar.tsx — القائمة الجانبية الموحّدة لتطبيق نبض
// الموبايل: Bottom Navigation Bar بدلاً من زر الهامبرغر
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/NotificationBell";

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
  clinicManagement: ["basic", "pro", "enterprise", "shared_basic", "shared_pro", "shared_enterprise"],
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
  planLoading?: boolean;
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
  planLoading = false,
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

  // ─── Pill nav: drag-to-scroll + auto-center active pill ────
  const pillScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, moved: false, startX: 0, startScroll: 0 });

  const onPillPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pillScrollRef.current;
    if (!el) return;
    dragState.current = { dragging: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
  };
  const onPillPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = pillScrollRef.current;
    if (!el || !dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 6) dragState.current.moved = true;
    if (dragState.current.moved) el.scrollLeft = dragState.current.startScroll - dx;
  };
  const onPillPointerUp = () => {
    dragState.current.dragging = false;
    // إبقاء moved لحظة قصيرة حتى لا ينطلق click بعد السحب
    setTimeout(() => { dragState.current.moved = false; }, 60);
  };

  useEffect(() => {
    if (!isMobile) return;
    const el = pillScrollRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-pill-key="${activePage}"]`);
    if (active) {
      const offset = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
      el.scrollTo({ left: offset, behavior: "smooth" });
    }
  }, [activePage, isMobile]);

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
    const isLocked = !planLoading && !canAccess(item.key, plan);
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
          padding: (collapsed || compact) ? "10px 0" : "11px 13px",
          borderRadius: 13,
          marginBottom: compact ? 0 : 5,
          textDecoration: "none",
          background: isActive ? "#fff" : "transparent",
          color: isLocked ? "rgba(255,255,255,0.28)" : (isActive ? "#0863ba" : SB_IDLE),
          fontWeight: isActive ? 700 : 500,
          fontSize: 13.5,
          transition: "all .2s cubic-bezier(.4,0,.2,1)",
          position: "relative",
          border: "1px solid transparent",
          boxShadow: isActive ? "0 6px 18px rgba(0,0,0,.22)" : "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          opacity: isLocked ? 0.5 : 1,
          fontFamily: "Rubik, sans-serif",
          flex: compact ? 1 : undefined,
          minWidth: 0,
        }}
        onMouseEnter={e => { if (!isActive && !isLocked) { const el=e.currentTarget as HTMLAnchorElement; el.style.background = "rgba(255,255,255,0.1)"; el.style.transform = `translateX(${isAr?-3:3}px)`; } }}
        onMouseLeave={e => { const el=e.currentTarget as HTMLAnchorElement; if (!isActive) el.style.background = "transparent"; el.style.transform = "translateX(0)"; }}
      >
        {isActive && (collapsed || compact) && (
          <div style={{
            position: "absolute",
            [isAr ? "right" : "left"]: -10,
            top: "50%", transform: "translateY(-50%)",
            width: 4, height: 24, background: SB_INDICATOR,
            borderRadius: 4, boxShadow: "0 0 10px rgba(125,211,252,.7)",
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
              border: isActive ? "1.5px solid #fff" : "1.5px solid #0558a8", lineHeight: 1,
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
          <span style={{ fontSize: 11, opacity: 0.6 }}><AppIcon glyph="🔒" /></span>
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
        <div style={{ height: 96, flexShrink: 0 }} />

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
            bottom: moreOpen ? "calc(88px + env(safe-area-inset-bottom, 0px))" : -400,
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
              const isLocked = !planLoading && !canAccess(item.key, plan);
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
                    {isLocked && <AppIcon glyph="🔒" />}
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
                <span style={{ fontSize: 18 }}><AppIcon glyph={pushPerm === "granted" ? "🔔" : "🔕"} /></span>
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

        {/* ── Pill Navigation Bar (scrollable) ── */}
        <style>{`
          .nabd-pill-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          .nabd-pill-scroll::-webkit-scrollbar { display: none; }
          @keyframes nabdPillIn { from { transform: scale(.92); opacity:.6 } to { transform: scale(1); opacity:1 } }
        `}</style>
        <nav
          style={{
            position: "fixed",
            bottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
            left: 12, right: 12,
            background: "linear-gradient(135deg, rgba(8,99,186,0.94), rgba(5,88,168,0.92) 50%, rgba(4,64,124,0.94))",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 999,
            display: "flex", alignItems: "center",
            zIndex: 58,
            boxShadow: "0 12px 32px rgba(5,88,168,0.45), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {/* Back — fixed at edge */}
          {canGoBack && (
            <button
              onClick={handleBack}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 44, height: 44, margin: "10px 4px 10px 10px",
                marginInlineStart: 10, marginInlineEnd: 4,
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                color: BN_IDLE, cursor: "pointer", flexShrink: 0,
                transition: "all .18s",
              }}
              aria-label={tr.back}
            >
              {isAr ? Icons.backRtl : Icons.back}
            </button>
          )}

          {/* Scrollable pills */}
          <div
            ref={pillScrollRef}
            className="nabd-pill-scroll"
            onPointerDown={onPillPointerDown}
            onPointerMove={onPillPointerMove}
            onPointerUp={onPillPointerUp}
            onPointerLeave={onPillPointerUp}
            style={{
              flex: 1, minWidth: 0,
              display: "flex", alignItems: "center", gap: 8,
              overflowX: "auto",
              padding: "12px 10px",
              scrollBehavior: dragState.current.dragging ? "auto" : "smooth",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-x",
              maskImage: "linear-gradient(90deg, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 14px), transparent 100%)",
              cursor: dragState.current.dragging ? "grabbing" : "grab",
            }}
          >
            {[...MAIN_NAV.map(i => ({ key: i.key, href: i.href, iconKey: i.iconLg })),
              ...SECONDARY_NAV.map(i => ({ key: i.key, href: i.href, iconKey: i.icon }))
            ].map(item => {
              const isActive  = item.key === activePage;
              const isLocked  = !planLoading && !canAccess(item.key, plan);
              const icon      = Icons[item.iconKey as keyof typeof Icons] ?? Icons.dashboard;
              const showBadge = item.key === "messages" && unreadMsgs > 0;
              return (
                <a
                  key={item.key}
                  data-pill-key={item.key}
                  href={isLocked ? undefined : item.href}
                  onClick={e => {
                    if (isLocked || dragState.current.moved) { e.preventDefault(); return; }
                  }}
                  draggable={false}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: isActive ? "10px 16px" : "10px 13px",
                    borderRadius: 999,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    userSelect: "none",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(230,244,255,0.95))"
                      : "rgba(255,255,255,0.09)",
                    border: isActive
                      ? "1px solid rgba(255,255,255,0.9)"
                      : "1px solid rgba(255,255,255,0.14)",
                    color: isLocked
                      ? "rgba(255,255,255,0.25)"
                      : isActive ? "#0558a8" : BN_IDLE,
                    boxShadow: isActive ? "0 4px 14px rgba(0,0,0,0.25)" : "none",
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    position: "relative",
                    transition: "background .22s, color .22s, box-shadow .22s, padding .22s",
                    animation: isActive ? "nabdPillIn .22s ease" : undefined,
                    cursor: isLocked ? "not-allowed" : "pointer",
                    opacity: isLocked ? 0.55 : 1,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", transform: "scale(.85)", position: "relative" }}>
                    {icon}
                    {showBadge && (
                      <span style={{
                        position: "absolute", top: -5, [isAr ? "left" : "right"]: -7,
                        minWidth: 15, height: 15, padding: "0 3px",
                        borderRadius: "50%", background: "#e53935",
                        color: "#fff", fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${isActive ? "#fff" : "#0558a8"}`, lineHeight: 1,
                      }}>
                        {unreadMsgs > 9 ? "9+" : unreadMsgs}
                      </span>
                    )}
                  </span>
                  <span style={{ lineHeight: 1 }}>
                    {(tr as Record<string,string>)[item.key]}{isLocked && <AppIcon glyph="🔒" style={{marginInlineStart:4}} />}
                  </span>
                </a>
              );
            })}
          </div>

          {/* More — fixed at edge */}
          <button
            onClick={() => setMoreOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44,
              marginInlineStart: 4, marginInlineEnd: 10,
              border: moreOpen ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              background: moreOpen ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
              color: isMoreActive || moreOpen ? BN_ACTIVE : BN_IDLE,
              cursor: "pointer", flexShrink: 0, position: "relative",
              transition: "all .18s",
            }}
            aria-label={tr.more}
          >
            {Icons.more}
            {unreadMsgs > 0 && (
              <span style={{
                position: "absolute", top: 2, [isAr ? "left" : "right"]: 0,
                minWidth: 14, height: 14, padding: "0 3px",
                borderRadius: "50%", background: "#e53935",
                color: "#fff", fontSize: 8, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1.5px solid #0558a8", lineHeight: 1,
              }}>
                {unreadMsgs > 9 ? "9+" : unreadMsgs}
              </span>
            )}
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
          background: "linear-gradient(180deg,#044d96 0%,#0558a8 45%,#0b6ec7 100%)",
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
        {/* زخارف — طبقة خلفية مقصوصة لا تؤثر على القوائم المنبثقة */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", top:-70, insetInlineStart:-50, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
          <div style={{ position:"absolute", bottom:120, insetInlineEnd:-70, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.04)" }}/>
        </div>

        {/* ── Header / Logo ── */}
        <div style={{
          padding: collapsed ? "22px 0" : "22px 20px",
          borderBottom: `1px solid ${SB_BORDER}`,
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 72,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width:40,height:40,borderRadius:12,background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 24, height: 24, filter: "brightness(0) invert(1)" }} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>نبض</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Clinic Manager</div>
              </div>
            </div>
          )}
          {collapsed && (
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 28, height: 28, filter: "brightness(0) invert(1)" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!collapsed && <NotificationBell userId={selfUserId} lang={lang} variant="light" />}
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
                const isLocked = !planLoading && !canAccess(item.key, plan);
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
                      background: isActive ? "#fff" : "rgba(255,255,255,0.06)",
                      color: isLocked ? "rgba(255,255,255,0.28)" : (isActive ? "#0863ba" : SB_IDLE),
                      fontWeight: isActive ? 700 : 500, fontSize: 11,
                      transition: "all .2s", position: "relative",
                      border: "1px solid " + (isActive ? "transparent" : "rgba(255,255,255,0.1)"),
                      boxShadow: isActive ? "0 6px 18px rgba(0,0,0,.22)" : "none",
                      cursor: isLocked ? "not-allowed" : "pointer",
                      opacity: isLocked ? 0.5 : 1, fontFamily: "Rubik, sans-serif", textAlign: "center",
                    }}
                    onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = isActive ? SB_ACTIVE_BG : "rgba(255,255,255,0.05)"; }}
                  >

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
                      {isLocked && <AppIcon glyph="🔒" />}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </nav>

        {/* ── Footer ── */}
        <div style={{ padding: collapsed ? "12px 10px" : "12px 12px", borderTop: `1px solid ${SB_BORDER}`, background: "rgba(0,0,0,0.12)" }}>
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
              <span style={{ fontSize: 15 }}><AppIcon glyph={pushPerm === "granted" ? "🔔" : "🔕"} /></span>
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
