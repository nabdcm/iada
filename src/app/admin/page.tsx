"use client";

import AdminOfflineToggle from "@/components/AdminOfflineToggle";
import AgentsPanel from "@/components/AgentsPanel";
import AppIcon from "@/components/AppIcon";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/lib/database.types";
import type { Lang, PlanType, AccountType, ClinicType, ClinicData, Doctor } from "./_parts/types";
import { exportClinicData, downloadJSON, downloadCSV, importClinicData, type ImportResult } from "./_parts/data-tools";
import { PLAN_COLORS, PLAN_PRICING, SHARED_PLAN_DEFAULT_DOCTORS, PLAN_PATIENT_LIMITS, PLAN_FEATURES, genPass } from "./_parts/plans";
import AdminLogin from "./_parts/AdminLogin";
import { SESSION_KEY } from "./_parts/session";
import ClinicInfoModal from "./_parts/ClinicInfoModal";
import Field from "./_parts/Field";
import ClinicModal from "./_parts/ClinicModal";
import SubscriptionModal from "./_parts/SubscriptionModal";
import ResetPassModal from "./_parts/ResetPassModal";
import DataToolsModal from "./_parts/DataToolsModal";
import { adminFetch } from "./_parts/admin-fetch";
import { T } from "./_parts/translations";
import { CLINIC_TYPE_ICONS } from "@/lib/clinic-types";
import { COUNTRIES } from "@/lib/phone";

// ============================================================
// TypeScript Types
// ============================================================


// ============================================================
// NABD - نبض | Admin Panel
// ============================================================



// Clinic type icons



// ─── Clinic Modal ──────────────────────────────────────────
// ─── Subscription Modal ────────────────────────────────────
// ─── Reset Password Modal ──────────────────────────────────
// ── DataToolsModal ─────────────────────────────────────────────
// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AdminPage() {
  // ── التحقق من جلسة المدير — يجب أن يكون أول شيء ──────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // التحقق من الجلسة عبر الـ server (httpOnly cookie)
    fetch("/api/admin-check", { credentials: "include" })
      .then(r => setIsAuthenticated(r.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin-logout", { method: "POST", credentials: "include" })
      .catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // ── كل الـ state الخاص بصفحة الأدمن (دائماً في نفس الترتيب) ─
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = T[lang];

  const [activeTab,    setActiveTab]    = useState("clinics");
  const [clinics,      setClinics]      = useState<ClinicData[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("all");
  const [addModal,     setAddModal]     = useState(false);
  const [editClinic,   setEditClinic]   = useState<ClinicData | null>(null);
  const [deleteClinic, setDeleteClinic] = useState<ClinicData | null>(null);
  const [resetClinic,  setResetClinic]  = useState<ClinicData | null>(null);
  const [subClinic,    setSubClinic]    = useState<ClinicData | null>(null);
  const [infoClinic,   setInfoClinic]   = useState<ClinicData | null>(null);
  const [openMenuId,   setOpenMenuId]   = useState<number | null>(null);
  const [msgClinic,        setMsgClinic]        = useState<ClinicData|null>(null);
  const [msgBody,          setMsgBody]          = useState("");
  const [msgTemplate,      setMsgTemplate]      = useState("custom");
  const [msgSending,       setMsgSending]       = useState(false);
  const [msgSuccess,       setMsgSuccess]       = useState(false);
  const [msgUnread,        setMsgUnread]        = useState<Record<string,number>>({});
  const [msgHistory,       setMsgHistory]       = useState<Array<{id:number;from_id:string;to_id:string;from_role:"admin"|"doctor";body:string;is_read:boolean;created_at:string;expires_at:string}>>([]);
  const [msgHistoryLoading,setMsgHistoryLoading]= useState(false);
  const [msgView,          setMsgView]          = useState<"compose"|"history">("history");
  const msgBottomRef = useRef<HTMLDivElement>(null);

  // ── إرسال رسالة للطبيب ─────────────────────────────────
  const getMsgTemplate = (t: string, clinicName: string) => {
    const temps: Record<string,string> = {
      welcome: `مرحباً ${clinicName}،\nنرحب بانضمامك لمنصة نبض. يسعدنا خدمتك وتوفير أفضل تجربة لإدارة عيادتك.\n\nفريق نبض `,
      expiry:  `عزيزي ${clinicName}،\nاشتراكك في منصة نبض سينتهي قريباً. يرجى التواصل معنا للتجديد.\n\nفريق نبض `,
      custom:  "",
    };
    return temps[t] ?? "";
  };

  // تحميل تاريخ المحادثة مع عيادة معينة — عبر API بصلاحية service_role
  // (الأدمن ليس مستخدم Supabase Auth، لذا لا يمكن الاعتماد على auth.uid()/RLS هنا)
  const loadMsgHistory = async (clinicUserId: string) => {
    setMsgHistoryLoading(true);
    try {
      const res = await adminFetch(`/api/admin-messages?clinicUserId=${clinicUserId}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setMsgHistory(data ?? []);
    } catch (e) { console.error("loadMsgHistory:", e); }
    setMsgHistoryLoading(false);
    setMsgUnread(prev => ({ ...prev, [clinicUserId]: 0 }));
    setTimeout(() => { msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, 150);
  };

  // تحميل عدّاد الرسائل غير المقروءة لكل العيادات (polling)
  const loadAllUnread = async () => {
    try {
      const res = await adminFetch("/api/admin-messages", { method: "PATCH", cache: "no-store" });
      if (res.ok) {
        const counts = await res.json();
        setMsgUnread(counts ?? {});
      }
    } catch (e) { console.error("loadAllUnread:", e); }
  };

  // Polling: تحديث العداد كل 15 ثانية + تحديث المحادثة المفتوحة إن وُجدت
  useEffect(() => {
    if (!isAuthenticated) return; // لا نستدعي الـ API قبل التأكد من الجلسة — لتفادي حلقة 401 → reload
    loadAllUnread();
    const interval = setInterval(() => {
      loadAllUnread();
      setMsgClinic(current => {
        if (current?.user_id) loadMsgHistory(current.user_id);
        return current;
      });
    }, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSendMessage = async () => {
    if (!msgClinic?.user_id || !msgBody.trim()) return;
    setMsgSending(true);
    try {
      const bodyText = msgBody.trim();
      const res = await adminFetch("/api/admin-messages", {
        method: "POST",
        body: JSON.stringify({ clinicUserId: msgClinic.user_id, body: bodyText }),
      });
      if (res.ok) {
        setMsgSuccess(true); setMsgBody(""); setMsgTemplate("custom");
        fetch("/api/push", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ user_id: msgClinic.user_id, title:"رسالة جديدة من نبض", body: bodyText.slice(0,80), url:"/messages" }) });
        await loadMsgHistory(msgClinic.user_id);
        setTimeout(() => setMsgSuccess(false), 3000);
      }
    } catch(e) { console.error(e); }
    setMsgSending(false);
  };

  const [dataToolsModal, setDataToolsModal] = useState(false);
  const [accountFilter, setAccountFilter] = useState<"all"|"clinic"|"pharmacy"|"lab">("all");
  const [currentPage,   setCurrentPage]   = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { if (isAuthenticated) loadClinics(); }, [isAuthenticated]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      // نستخدم API route بدلاً من Supabase مباشرة
      // لأن الأدمن ليس مسجلاً عبر Supabase Auth وRLS تمنع القراءة المباشرة
      const res = await adminFetch("/api/get-clinics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const clinicsData: ClinicData[] = (data || []).map((row: Record<string, unknown>, index: number) => ({
        id:           (row.id as number) || index + 1,
        user_id:      row.user_id as string,
        name:         (row.name as string)   || `عيادة ${index + 1}`,
        owner:        (row.owner as string)  || "—",
        email:        (row.email as string)  || "",
        phone:        (row.phone as string)  || "",
        plan:         (row.plan as PlanType) || "basic",
        expiry:       (row.expiry as string) || "",
        status:       (row.status as "active"|"inactive"|"expired") || "active",
        clinic_type:  (row.clinic_type as ClinicType) || "general",
        account_type: (row.account_type as AccountType) || "clinic",
        max_doctors:  (row.max_doctors as number) || undefined,
        doctors_count:(row.doctors_count as number) || undefined,
        payments_lock_enabled:  (row.payments_lock_enabled as boolean) ?? false,
        payments_lock_password: (row.payments_lock_password as string) || "",
        restricted_access_enabled: (row.restricted_access_enabled as boolean) ?? false,
        restricted_access_pin:     (row.restricted_access_pin as string) || "",
        country_code:              (row.country_code as string) || "963",
        plain_password:            (row.plain_password as string) ?? null,
      }));

      setClinics(clinicsData);
    } catch (err) {
      console.error("Error loading clinics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ── مزامنة subClinic مع أحدث بيانات من القائمة ─────────────
  // عند تغيير status (تجميد/رفع تجميد) يُحدَّث subClinic تلقائياً
  useEffect(() => {
    if (!subClinic) return;
    const updated = clinics.find(c => c.user_id === subClinic.user_id);
    if (updated) setSubClinic(updated);
  }, [clinics]);

  const fmtDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(isAr ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { year:"numeric", month:"short", day:"numeric" });
  };
  const isExpiringSoon = (d: string) => {
    const diff = new Date(d).getTime() - new Date().getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (d: string) => d && new Date(d) < new Date();

  const fmtDateEn = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
  };

  // نقطة الحالة: أصفر=نشط، أخضر=محمد(مدفوع ونشط أكثر من شهر)، أحمر=منتهي، رمادي=قارب
  const statusDot = (c: ClinicData) => {
    if (isExpired(c.expiry))           return { color:"#c0392b", title: isAr?"منتهية":"Expired" };
    if (isExpiringSoon(c.expiry))      return { color:"#aaa",    title: isAr?"قاربت على الانتهاء":"Expiring soon" };
    if (c.status === "inactive")       return { color:"#e67e22", title: isAr?"معلّق":"Suspended" };
    if (c.status === "active") {
      const diff = new Date(c.expiry).getTime() - new Date().getTime();
      if (diff > 30 * 24 * 60 * 60 * 1000) return { color:"#27ae60", title: isAr?"نشط":"Active" };
      return { color:"#f1c40f", title: isAr?"نشط":"Active" };
    }
    return { color:"#aaa", title: "" };
  };

  const filtered = useMemo(() => clinics.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active"   && c.status !== "active")   return false;
    if (filter === "inactive" && c.status !== "inactive") return false;
    if (accountFilter === "clinic"   && c.account_type !== "clinic"   && c.account_type !== undefined) return false;
    if (accountFilter === "pharmacy" && c.account_type !== "pharmacy") return false;
    if (accountFilter === "lab"      && c.account_type !== "lab") return false;
    return true;
  }), [clinics, search, filter, accountFilter]);

  // ── إعادة الصفحة لـ 1 عند أي تغيير في البحث أو الفلاتر ────
  useEffect(() => { setCurrentPage(1); }, [search, filter, accountFilter]);

  const totalPages      = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedClinics = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total:      clinics.length,
    clinics:    clinics.filter(c => c.account_type !== "pharmacy" && c.account_type !== "lab").length,
    pharmacies: clinics.filter(c => c.account_type === "pharmacy").length,
    labs:       clinics.filter(c => c.account_type === "lab").length,
    active:     clinics.filter(c => c.status === "active").length,
    frozen:     clinics.filter(c => c.status === "inactive").length,
    expired:    clinics.filter(c => isExpired(c.expiry)).length,
    expiringSoon: clinics.filter(c => {
      const d = new Date(c.expiry);
      const n = new Date();
      return (d.getTime() - n.getTime()) < 30 * 24 * 60 * 60 * 1000 && d > n;
    }).length,
  }), [clinics]);

  // ── العيادات التي ينتهي اشتراكها خلال أسبوع (لبطاقة التذكير) ──
  const expiringWithinWeek = useMemo(() => clinics.filter(c => {
    if (!c.expiry) return false;
    const diff = new Date(c.expiry).getTime() - new Date().getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()), [clinics]);

  const [expiryCardIndex, setExpiryCardIndex] = useState(0);
  useEffect(() => {
    if (expiringWithinWeek.length < 2) return;
    const t = setInterval(() => {
      setExpiryCardIndex(i => (i + 1) % expiringWithinWeek.length);
    }, 4000);
    return () => clearInterval(t);
  }, [expiringWithinWeek.length]);
  useEffect(() => { setExpiryCardIndex(0); }, [expiringWithinWeek.length]);

  const toggleStatus = async (clinic: ClinicData) => {
    if (!clinic.user_id) return;
    const newStatus = clinic.status === "active" ? "inactive" : "active";
    await adminFetch("/api/update-clinic", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: clinic.user_id, ...clinic, status: newStatus }),
    });
    loadClinics();
  };

  const handleDelete = async () => {
    if (!deleteClinic?.user_id) return;
    try {
      const res = await adminFetch("/api/delete-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: deleteClinic.user_id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("delete failed:", json.error);
        return;
      }
    } catch (err) {
      console.error("delete-clinic error:", err);
      return;
    }
    setDeleteClinic(null);
    loadClinics();
  };


  // ── بوابة المصادقة — بعد كل الـ hooks ─────────────────────
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc" }}>
        <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-anim{animation:fadeUp .4s ease both}
        .admin-row{border-bottom:1px solid #eef0f3;transition:background .15s}
        .admin-row:last-child{border-bottom:none}
        .admin-row:hover{background:#f7f9fc}
        .tab-btn{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;transition:all .2s}
        .tab-btn.active{background:rgba(8,99,186,.08);color:#0863ba;font-weight:700}
        .tab-btn:not(.active){background:transparent;color:#888}
        .tab-btn:not(.active):hover{background:rgba(8,99,186,.04);color:#666}
        .icon-btn-dark{width:32px;height:32px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#aaa;flex-shrink:0}
        .icon-btn-dark:hover{border-color:#0863ba;background:rgba(8,99,186,.06);color:#0863ba}
        .icon-btn-dark.msg:hover{border-color:#8e44ad;background:rgba(142,68,173,.06);color:#8e44ad}
        .icon-btn-dark.edit:hover{border-color:#2980b9;background:rgba(41,128,185,.06);color:#2980b9}
        .icon-btn-dark.more:hover{border-color:#666;background:#f7f9fc;color:#666}
        .filter-chip-dark{padding:6px 14px;border-radius:20px;border:1.5px solid #eef0f3;background:transparent;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;color:#888;transition:all .2s}
        .filter-chip-dark.active{background:rgba(8,99,186,.08);color:#0863ba;border-color:rgba(8,99,186,.2)}
        .filter-chip-dark:hover:not(.active){border-color:#ccc;color:#666}
        .stat-dark{background:#fff;border-radius:16px;padding:18px 20px;border:1.5px solid #eef0f3;position:relative;overflow:hidden;box-shadow:0 2px 12px rgba(8,99,186,.05)}
        .dropdown-dark{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(8,99,186,.12);border:1.5px solid #eef0f3;min-width:170px;z-index:100;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-dark-item{padding:10px 16px;font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-dark-item:hover{background:#f7f9fc;color:#353535}
        .dropdown-dark-item.danger:hover{background:rgba(192,57,43,.06);color:#c0392b}
        .email-copy{cursor:pointer;transition:color .15s}
        .email-copy:hover{color:#0863ba !important}
        /* ── Mobile ── */
        @media(max-width:768px){
          .admin-sidebar{display:none !important}
          .admin-main{margin-left:0 !important;margin-right:0 !important;padding:12px !important}
          .admin-topbar{padding:12px 16px !important}
          .stats-grid{grid-template-columns:repeat(2,1fr) !important;gap:10px !important}
          .admin-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .admin-row-grid{grid-template-columns:1fr auto !important}
          .admin-row-desktop{display:none !important}
          .admin-row-mobile{display:flex !important}
          .admin-header-row{display:none !important}
          .search-filter-wrap{flex-direction:column !important;gap:8px !important}
          .filter-chips-wrap{flex-wrap:wrap !important}
          .topbar-actions{gap:8px !important}
          .topbar-actions button{padding:8px 12px !important;font-size:12px !important}
        }
        @media(min-width:769px){
          .admin-row-mobile{display:none !important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc",display:"flex" }}>

        {/* ── SIDEBAR ── */}
        <aside className="admin-sidebar" style={{ width:220,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50,boxShadow:"4px 0 24px rgba(8,99,186,.06)" }}>
          <div style={{ padding:"24px 20px",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg viewBox="0 0 337.74 393.31" style={{ width:36,height:36 }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="adm-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse"><stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/></linearGradient>
                    <linearGradient id="adm-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/></linearGradient>
                  </defs>
                  <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
                  <path fill="url(#adm-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
                  <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
                  <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
                  <path fill="url(#adm-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:9,color:"#aaa",fontWeight:400,letterSpacing:.5,textTransform:"uppercase" }}>{tr.adminBadge}</div>
              </div>
            </div>
            <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>Admin Access</span>
            </div>
          </div>

          <nav style={{ flex:1,padding:"16px 12px" }}>
            {Object.entries(tr.nav).map(([k, v]) => {
              const icons = { clinics:"🏥", agents:"🤝" }; // rendered via AppIcon
              const isActive = activeTab === k;
              return (
                <button key={k} onClick={() => setActiveTab(k)}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,marginBottom:4,border:"none",cursor:"pointer",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:13,fontFamily:"Rubik,sans-serif",transition:"all .18s",textAlign:isAr?"right":"left" }}>
                  <span style={{ fontSize:16, display:"flex" }}><AppIcon glyph={icons[k as keyof typeof icons]} /></span>
                  <span style={{ flex:1 }}>{v}</span>
                  {k === "clinics" && <span style={{ fontSize:11,background:"rgba(8,99,186,.08)",color:"#0863ba",padding:"2px 8px",borderRadius:20 }}>{clinics.length}</span>}
                </button>
              );
            })}
          </nav>

          <div style={{ padding:"16px",borderTop:"1.5px solid #eef0f3" }}>
            <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:12 }}>{tr.systemInfo}</div>
            <AdminOfflineToggle isAr={isAr} />
            {[
              { l: tr.version,    v: "1.0.0" },
              { l: tr.lastBackup, v: isAr ? "منذ ساعة" : "1h ago" },
              { l: tr.uptime,     v: "99.9%" },
            ].map(s => (
              <div key={s.l} style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:11,color:"#aaa" }}>{s.l}</span>
                <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>{s.v}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                style={{ width:"100%",padding:"7px",background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#666",transition:"all .2s",marginBottom:8 }}>
                <AppIcon glyph="🌐" /> {lang === "ar" ? "English" : "العربية"}
              </button>
              <button onClick={handleLogout}
                style={{ width:"100%",padding:"7px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#c0392b" }}>
                → {tr.signOut}
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="page-anim admin-main" style={{ [isAr?"marginRight":"marginLeft"]:220,flex:1,padding:"0 32px 48px",minHeight:"100vh" }}>

          {/* TOP BAR */}
          <div className="admin-topbar" style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:20,fontWeight:800,color:"#353535" }}>
                  {tr.clinics.title}
                </h1>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
                  {`${stats.active} ${isAr?"نشط من":"active of"} ${stats.total} · ${stats.clinics} ${isAr?"عيادة":"clinics"} · ${stats.pharmacies} ${isAr?"صيدلية":"pharmacies"}`}
                </p>
              </div>
              {activeTab === "clinics" && (
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={() => setDataToolsModal(true)}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}>
                    <AppIcon glyph="🗄️" /> {isAr ? "أدوات البيانات" : "Data Tools"}
                  </button>
                  <button onClick={() => setAddModal(true)}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.35)",transition:"all .2s" }}>
                    <span>＋</span> {isAr?"إضافة حساب":"Add Account"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* STATS */}
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:24 }}>
              {[
                { label:isAr?"إجمالي الحسابات":"Total Accounts",  value:stats.total,        icon:"📊", color:"#0863ba", accent:"#0863ba" },
                { label:isAr?"عيادات":"Clinics",                   value:stats.clinics,      icon:"🏥", color:"#0863ba", accent:"#0863ba" },
                { label:isAr?"صيدليات":"Pharmacies",               value:stats.pharmacies,   icon:"💊", color:"#27ae60", accent:"#27ae60" },
                { label:isAr?"نشطة":"Active",                      value:stats.active,       icon:"✅", color:"#2e7d32", accent:"#2e7d32" },
                { label:isAr?"تنتهي قريباً":"Expiring Soon",       value:stats.expiringSoon, icon:"⏳", color:"#e67e22", accent:"#e67e22" },
                { label:isAr?"منتهية":"Expired",                   value:stats.expired,      icon:"❌", color:"#c0392b", accent:"#c0392b" },
              ].map((s, i) => (
                <div key={i} className="stat-dark" style={{ animation:`fadeUp .4s ${i*50}ms ease both` }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:s.accent,borderRadius:"16px 16px 0 0" }} />
                  <div style={{ width:34,height:34,background:`${s.accent}15`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:10 }}><AppIcon glyph={s.icon} /></div>
                  <div style={{ fontSize:26,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10,color:"#aaa",marginTop:5,fontWeight:500,lineHeight:1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* بطاقة تذكير بقرب انتهاء الاشتراك (خلال أسبوع) — تتقلّب بين العيادات إن كان أكثر من واحدة */}
            {expiringWithinWeek.length > 0 && (() => {
              const c = expiringWithinWeek[expiryCardIndex % expiringWithinWeek.length];
              const daysLeft = Math.max(1, Math.ceil((new Date(c.expiry).getTime() - Date.now()) / (24*60*60*1000)));
              return (
                <div key={c.user_id} style={{ background:"linear-gradient(90deg,rgba(230,126,34,.08),rgba(230,126,34,.02))",border:"1.5px solid rgba(230,126,34,.25)",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14,animation:"fadeUp .35s ease both" }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:"rgba(230,126,34,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>⏳</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>
                      {isAr
                        ? `اشتراك «${c.name}» ينتهي خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"} (${fmtDate(c.expiry)})`
                        : `«${c.name}»'s subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${fmtDateEn(c.expiry)})`}
                    </div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                      {c.owner} · {c.email}
                    </div>
                  </div>
                  {expiringWithinWeek.length > 1 && (
                    <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                      {expiringWithinWeek.map((_, i) => (
                        <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:i===expiryCardIndex?"#e67e22":"rgba(230,126,34,.25)",transition:"background .2s" }} />
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSubClinic(c)}
                    style={{ padding:"7px 14px",background:"#e67e22",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:700,fontFamily:"Rubik,sans-serif",cursor:"pointer",flexShrink:0 }}>
                    {isAr?"تجديد":"Renew"}
                  </button>
                </div>
              );
            })()}

            {activeTab === "agents" && <AgentsPanel isAr={isAr} />}

            {/* CLINICS TAB */}
            {activeTab === "clinics" && (
              <>
                {/* SEARCH + FILTER */}
                <div className="search-filter-wrap" style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #eef0f3",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#ccc",fontSize:14 }}><AppIcon glyph="🔍" /></span>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={tr.clinics.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}
                    />
                    {search && <button onClick={() => setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa" }}>✕</button>}
                  </div>
                <div className="filter-chips-wrap" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {[["all",tr.filterAll],["active",tr.filterActive],["inactive",tr.filterInactive]].map(([k,v]) => (
                      <button key={k} className={`filter-chip-dark${filter===k?" active":""}`} onClick={() => setFilter(k)}>{v}</button>
                    ))}
                    <div style={{ width:1,background:"#eef0f3",margin:"0 4px" }}/>
                    {([["all", isAr?"الكل":"All"],["clinic",(isAr?tr.pharmacy.filterClinics:tr.pharmacy.filterClinics)],["pharmacy",(isAr?tr.pharmacy.filterPharmacies:tr.pharmacy.filterPharmacies)],["lab",(isAr?"مخابر":"Labs")]] as [string,string][]).map(([k,v]) => (
                      <button key={k} className={`filter-chip-dark${accountFilter===k?" active":""}`}
                        style={{ borderColor: accountFilter===k&&k==="pharmacy" ? "rgba(39,174,96,.3)" : accountFilter===k&&k==="lab" ? "rgba(224,140,0,.3)" : undefined, background: accountFilter===k&&k==="pharmacy" ? "rgba(39,174,96,.08)" : accountFilter===k&&k==="lab" ? "rgba(224,140,0,.08)" : undefined, color: accountFilter===k&&k==="pharmacy" ? "#27ae60" : accountFilter===k&&k==="lab" ? "#e08c00" : undefined }}
                        onClick={() => setAccountFilter(k as "all"|"clinic"|"pharmacy"|"lab")}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* TABLE */}
                {loading ? (
                  <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                    <div style={{ fontSize:36,marginBottom:10,display:"inline-block",animation:"spin 1s linear infinite" }}><AppIcon glyph="⚙️" /></div>
                    <div style={{ fontSize:14 }}>{tr.loading}</div>
                  </div>
                ) : (
                  <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
                    <div className="admin-header-row" style={{ display:"grid",gridTemplateColumns:"minmax(200px,1.6fr) 150px 150px 190px",gap:12,padding:"12px 20px",background:"#f7f9fc",borderBottom:"1.5px solid #eef0f3" }}>
                      {[
                        isAr?"العيادة / الصيدلية":"Clinic / Pharmacy",
                        isAr?"الخطة":"Plan",
                        isAr?"تاريخ الانتهاء":"Expiry",
                        isAr?"الإجراءات":"Actions",
                      ].map((h,i) => (
                        <div key={i} style={{ fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.6,textAlign:i===3?"end":"start",paddingLeft:i>0&&i<3?8:0 }}>{h}</div>
                      ))}
                    </div>

                    {filtered.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                        <div style={{ fontSize:36,marginBottom:10 }}><AppIcon glyph="🔍" /></div>
                        <div style={{ fontSize:14 }}>{tr.noResults}</div>
                      </div>
                    ) : (
                      paginatedClinics.map(c => {
                        const dot     = statusDot(c);
                        const expSoon = isExpiringSoon(c.expiry);
                        const exp     = isExpired(c.expiry);
                        const planColor = PLAN_COLORS[c.plan] || "#0863ba";
                        return (
                          <div key={c.id} className="admin-row">
                            {/* ── Desktop row ── */}
                            <div className="admin-row-desktop" style={{ display:"grid",gridTemplateColumns:"minmax(200px,1.6fr) 150px 150px 190px",gap:12,padding:"16px 20px",alignItems:"center" }}>

                              {/* العيادة: نقطة + اسم + إيميل */}
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div title={dot.title} style={{ width:9,height:9,borderRadius:"50%",background:dot.color,flexShrink:0,boxShadow:`0 0 0 2px ${dot.color}22` }} />
                                <div style={{ minWidth:0 }}>
                                  <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                                    <span style={{ fontSize:14, display:"flex" }}><AppIcon glyph={c.account_type==="lab" ? "🧪" : c.account_type==="pharmacy" ? "💊" : CLINIC_TYPE_ICONS[c.clinic_type||"general"]} /></span>
                                    <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</span>
                                  </div>
                                  <div
                                    className="email-copy"
                                    title={isAr?"اضغط لنسخ":"Click to copy"}
                                    onClick={() => copyEmail(c.email)}
                                    style={{ fontSize:11,color:"#aaa",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:280 }}
                                  >{c.email}</div>
                                </div>
                              </div>

                              {/* الخطة */}
                              <div style={{ paddingLeft:8 }}>
                                {c.account_type === "pharmacy" ? (
                                  <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:"rgba(39,174,96,.12)",color:"#27ae60" }}>
                                    <AppIcon glyph="💊" /> {isAr?"صيدلية":"Pharmacy"}
                                  </span>
                                ) : (
                                  <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${planColor}18`,color:planColor }}>
                                    {tr.clinics.plans[c.plan as keyof typeof tr.clinics.plans] || c.plan}
                                  </span>
                                )}
                                {["shared_basic","shared_pro","shared_enterprise"].includes(c.plan) && (
                                  <div style={{ fontSize:9,color:planColor,fontWeight:600,marginTop:3 }}>
                                    <AppIcon glyph="👥" /> {c.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[c.plan] ?? 2} {isAr?"أطباء":"drs"}
                                  </div>
                                )}
                              </div>

                              {/* تاريخ الانتهاء — أرقام إنجليزية دائماً */}
                              <div style={{ paddingLeft:8 }}>
                                <div style={{ fontSize:12,fontWeight:exp||expSoon?700:400,color:exp?"#c0392b":expSoon?"#e67e22":"#666",fontVariantNumeric:"tabular-nums",direction:"ltr",textAlign:"start" }}>
                                  {fmtDateEn(c.expiry)}
                                </div>
                                {expSoon && !exp && <div style={{ fontSize:9,color:"#e67e22",fontWeight:600,marginTop:2 }}><AppIcon glyph="⚠" /> {isAr?"قريباً":"Soon"}</div>}
                                {exp      && <div style={{ fontSize:9,color:"#c0392b",fontWeight:600,marginTop:2 }}>✗ {isAr?"منتهية":"Expired"}</div>}
                              </div>

                              {/* أزرار الإجراءات */}
                              <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,position:"relative" }} onClick={e => e.stopPropagation()}>
                                {/* معلومات العيادة */}
                                <button
                                  className="icon-btn-dark"
                                  title={isAr?"معلومات العيادة":"Clinic Info"}
                                  onClick={e => { e.stopPropagation(); setInfoClinic(c); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                >ℹ️</button>

                                {/* تعديل الاشتراك */}
                                <button
                                  className="icon-btn-dark"
                                  title={isAr?"تعديل الاشتراك":"Edit Subscription"}
                                  onClick={e => { e.stopPropagation(); setSubClinic(c); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                ><AppIcon glyph="💳" /></button>

                                {/* مراسلة */}
                                <button
                                  className="icon-btn-dark msg"
                                  title={isAr?"مراسلة":"Message"}
                                  onClick={e => { e.stopPropagation(); setMsgClinic(c); setMsgTemplate("custom"); setMsgBody(""); setMsgView("history"); setMsgHistory([]); if(c.user_id) loadMsgHistory(c.user_id); }}
                                  style={{ width:38,height:38,fontSize:16,position:"relative" }}
                                >
                                  <AppIcon glyph="💬" />
                                  {msgUnread[c.user_id ?? ""] ? (
                                    <span style={{ position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:"50%",background:"#c0392b",color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                      {msgUnread[c.user_id ?? ""]}
                                    </span>
                                  ) : null}
                                </button>

                                {/* المزيد */}
                                <button
                                  className="icon-btn-dark more"
                                  title={isAr?"المزيد":"More"}
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId===c.id?null:(c.id||null)); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                >⋯</button>

                                {openMenuId === c.id && (
                                  <div className="dropdown-dark">
                                    <div className="dropdown-dark-item" onClick={() => { setEditClinic(c); setOpenMenuId(null); }}><AppIcon glyph="✏️" /> {tr.clinics.actions.edit}</div>
                                    <div className="dropdown-dark-item" onClick={() => { setResetClinic(c); setOpenMenuId(null); }}><AppIcon glyph="🔑" /> {tr.clinics.actions.resetPass}</div>
                                    <div className="dropdown-dark-item" onClick={() => { toggleStatus(c); setOpenMenuId(null); }}>
                                      {c.status==="active" ? "⏸ "+tr.clinics.actions.suspend : "▶ "+tr.clinics.actions.activate}
                                    </div>
                                    <div style={{ height:1,background:"#eef0f3",margin:"4px 0" }} />
                                    <div className="dropdown-dark-item danger" onClick={() => { setDeleteClinic(c); setOpenMenuId(null); }}><AppIcon glyph="🗑️" /> {tr.clinics.actions.delete}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Mobile row ── */}
                            <div className="admin-row-mobile" style={{ padding:"14px 16px",flexDirection:"column",gap:10 }}>
                              {/* الصف الأول: نقطة + اسم + أزرار */}
                              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                <div title={dot.title} style={{ width:8,height:8,borderRadius:"50%",background:dot.color,flexShrink:0 }} />
                                <span style={{ fontSize:13,fontWeight:700,color:"#353535",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                                  <AppIcon glyph={c.account_type==="lab" ? "🧪" : c.account_type==="pharmacy" ? "💊" : CLINIC_TYPE_ICONS[c.clinic_type||"general"]} style={{marginInlineEnd:5}} />{c.name}
                                </span>
                                <div style={{ display:"flex",gap:5,flexShrink:0 }} onClick={e => e.stopPropagation()}>
                                  <button className="icon-btn-dark" title={isAr?"معلومات":"Info"} onClick={e => { e.stopPropagation(); setInfoClinic(c); }} style={{ width:30,height:30 }}>ℹ️</button>
                                  <button className="icon-btn-dark" title={isAr?"تعديل الاشتراك":"Edit Sub"} onClick={e => { e.stopPropagation(); setSubClinic(c); }} style={{ width:30,height:30 }}><AppIcon glyph="💳" /></button>
                                  <button className="icon-btn-dark msg" title={isAr?"مراسلة":"Msg"} onClick={e => { e.stopPropagation(); setMsgClinic(c); setMsgTemplate("custom"); setMsgBody(""); setMsgView("history"); setMsgHistory([]); if(c.user_id) loadMsgHistory(c.user_id); }} style={{ width:30,height:30,position:"relative" }}>
                                    <AppIcon glyph="💬" />
                                    {msgUnread[c.user_id ?? ""] ? <span style={{ position:"absolute",top:-3,right:-3,width:13,height:13,borderRadius:"50%",background:"#c0392b",color:"#fff",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{msgUnread[c.user_id ?? ""]}</span> : null}
                                  </button>
                                  <button className="icon-btn-dark more" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId===c.id?null:(c.id||null)); }} style={{ width:30,height:30 }}>⋯</button>
                                  {openMenuId === c.id && (
                                    <div className="dropdown-dark" style={{ top:"calc(100% + 4px)",right:0 }}>
                                      <div className="dropdown-dark-item" onClick={() => { setEditClinic(c); setOpenMenuId(null); }}><AppIcon glyph="✏️" /> {tr.clinics.actions.edit}</div>
                                      <div className="dropdown-dark-item" onClick={() => { setResetClinic(c); setOpenMenuId(null); }}><AppIcon glyph="🔑" /> {tr.clinics.actions.resetPass}</div>
                                      <div className="dropdown-dark-item" onClick={() => { toggleStatus(c); setOpenMenuId(null); }}>
                                        {c.status==="active" ? "⏸ "+tr.clinics.actions.suspend : "▶ "+tr.clinics.actions.activate}
                                      </div>
                                      <div style={{ height:1,background:"#eef0f3",margin:"4px 0" }} />
                                      <div className="dropdown-dark-item danger" onClick={() => { setDeleteClinic(c); setOpenMenuId(null); }}><AppIcon glyph="🗑️" /> {tr.clinics.actions.delete}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* الصف الثاني: إيميل + خطة + تاريخ */}
                              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                                <span
                                  className="email-copy"
                                  onClick={() => copyEmail(c.email)}
                                  style={{ fontSize:11,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}
                                >{c.email}</span>
                                <span style={{ width:1,height:12,background:"#eef0f3",flexShrink:0 }} />
                                <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${planColor}15`,color:planColor }}>
                                  {c.account_type==="lab" ? (isAr?"مخبر":"Lab") : c.account_type==="pharmacy" ? (isAr?"صيدلية":"Pharmacy") : (tr.clinics.plans[c.plan as keyof typeof tr.clinics.plans]||c.plan)}
                                </span>
                                <span style={{ fontSize:11,color:exp?"#c0392b":expSoon?"#e67e22":"#aaa",fontVariantNumeric:"tabular-nums",direction:"ltr",display:"inline-block",fontWeight:exp||expSoon?700:400 }}>{fmtDateEn(c.expiry)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ── PAGINATION ── */}
                {!loading && filtered.length > PAGE_SIZE && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, padding:"12px 16px", background:"#fff", borderRadius:12, border:"1.5px solid #eef0f3" }}>
                    {/* عداد النتائج */}
                    <span style={{ fontSize:12, color:"#aaa", fontFamily:"Rubik,sans-serif" }}>
                      {isAr
                        ? `عرض ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} من ${filtered.length}`
                        : `Showing ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                    </span>

                    {/* أزرار التنقل */}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {/* السابق */}
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                        disabled={currentPage === 1}
                        style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #eef0f3", background: currentPage===1 ? "#f7f9fc" : "#fff", cursor: currentPage===1 ? "not-allowed" : "pointer", fontSize:14, color: currentPage===1 ? "#ccc" : "#666", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                      >
                        {isAr ? "›" : "‹"}
                      </button>

                      {/* أرقام الصفحات */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx-1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === "..." ? (
                            <span key={`dots-${idx}`} style={{ width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#aaa" }}>…</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setCurrentPage(item as number)}
                              style={{ width:34, height:34, borderRadius:8, border: currentPage===item ? "1.5px solid rgba(8,99,186,.3)" : "1.5px solid #eef0f3", background: currentPage===item ? "rgba(8,99,186,.08)" : "#fff", cursor:"pointer", fontSize:13, fontWeight: currentPage===item ? 700 : 400, color: currentPage===item ? "#0863ba" : "#666", fontFamily:"Rubik,sans-serif", transition:"all .15s" }}
                            >
                              {item}
                            </button>
                          )
                        )}

                      {/* التالي */}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                        disabled={currentPage === totalPages}
                        style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #eef0f3", background: currentPage===totalPages ? "#f7f9fc" : "#fff", cursor: currentPage===totalPages ? "not-allowed" : "pointer", fontSize:14, color: currentPage===totalPages ? "#ccc" : "#666", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                      >
                        {isAr ? "‹" : "›"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>

        {/* Modals */}
        {(addModal || editClinic) && (
          <ClinicModal
            lang={lang}
            clinic={editClinic}
            onSave={loadClinics}
            onClose={() => { setAddModal(false); setEditClinic(null); }}
          />
        )}
        {resetClinic && <ResetPassModal lang={lang} clinic={resetClinic} onClose={() => { setResetClinic(null); loadClinics(); }} />}

        {subClinic && (
          <SubscriptionModal
            lang={lang}
            clinic={subClinic}
            onSave={loadClinics}
            onClose={() => { setSubClinic(null); loadClinics(); }}
          />
        )}

        {dataToolsModal && (
          <DataToolsModal
            lang={lang}
            clinics={clinics}
            onClose={() => setDataToolsModal(false)}
          />
        )}

        {infoClinic && (
          <ClinicInfoModal clinic={infoClinic} isAr={isAr} onClose={() => setInfoClinic(null)} />
        )}

        {deleteClinic && (
          <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={() => setDeleteClinic(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)" }} />
            <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(8,99,186,.15)",border:"1.5px solid #eef0f3",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}><AppIcon glyph="🗑️" /></div>
              <h3 style={{ fontSize:17,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteModal.title}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6 }}>
                {tr.deleteModal.msg} <strong style={{ color:"#353535" }}>{deleteClinic.name}</strong>؟<br/>
                <span style={{ color:"#c0392b",fontSize:12 }}>{tr.deleteModal.warning}</span>
              </p>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={handleDelete} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.deleteModal.confirm}</button>
                <button onClick={() => setDeleteClinic(null)} style={{ flex:1,padding:"12px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.deleteModal.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ Modal المراسلة ══════════════════════════════════════ */}
      {msgClinic && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
          onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}>
          <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"85vh",direction:"rtl",fontFamily:"Rubik,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background:"#0863ba",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
              <div style={{ width:36,height:36,background:"rgba(255,255,255,.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}><AppIcon glyph="💬" /></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15,fontWeight:800,color:"#fff" }}>{msgClinic.name}</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.7)" }}>الرسائل تُحذف تلقائياً بعد 48 ساعة</div>
              </div>
              <button onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}
                style={{ background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>
                ✕
              </button>
            </div>

            {/* تبديل العرض */}
            <div style={{ display:"flex",borderBottom:"1.5px solid #eef0f3",flexShrink:0 }}>
              {(["history","compose"] as const).map(v => (
                <button key={v}
                  onClick={() => {
                    setMsgView(v);
                    if (v === "history") setTimeout(() => { msgBottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, 100);
                  }}
                  style={{ flex:1,padding:"11px",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,
                    background: msgView===v ? "#f0f6ff" : "#fff",
                    color:      msgView===v ? "#0863ba" : "#888",
                    borderBottom: msgView===v ? "2.5px solid #0863ba" : "2.5px solid transparent" }}>
                  {v === "history" ? "سجل المحادثة" : "رسالة جديدة"}
                </button>
              ))}
            </div>

            {/* سجل المحادثة */}
            {msgView === "history" && (
              <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8 }}>
                {msgHistoryLoading ? (
                  <div style={{ textAlign:"center",color:"#aaa",padding:40,fontSize:13 }}>جارٍ التحميل...</div>
                ) : msgHistory.length === 0 ? (
                  <div style={{ textAlign:"center",color:"#aaa",padding:40,fontSize:13 }}>
                    لا توجد رسائل سابقة مع هذه العيادة.<br/>
                    <span style={{ fontSize:11 }}>انتقل لـ &quot;رسالة جديدة&quot; لبدء المحادثة</span>
                  </div>
                ) : msgHistory.map(msg => {
                  const isAdminMsg = msg.from_role === "admin";
                  return (
                    <div key={msg.id} style={{ display:"flex",justifyContent: isAdminMsg ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth:"80%",padding:"9px 13px",
                        borderRadius: isAdminMsg ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isAdminMsg ? "#0863ba" : "#f0f6ff",
                        color: isAdminMsg ? "#fff" : "#1a2840",
                        fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap",
                        boxShadow:"0 1px 3px rgba(0,0,0,.08)",
                      }}>
                        {!isAdminMsg && <div style={{ fontSize:10,fontWeight:700,color:"#0863ba",marginBottom:3 }}>الطبيب <AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /></div>}
                        {msg.body}
                        <div style={{ fontSize:10,opacity:.5,marginTop:3,textAlign:"left" }}>
                          {new Date(msg.created_at).toLocaleString("ar-SA-u-ca-gregory-nu-latn",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgBottomRef} />
              </div>
            )}

            {/* رسالة جديدة */}
            {msgView === "compose" && (
              <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12 }}>
                <div>
                  <div style={{ fontSize:12,color:"#888",marginBottom:8 }}>قوالب سريعة</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {(["welcome","expiry","custom"] as const).map(t => (
                      <button key={t}
                        onClick={() => { setMsgTemplate(t); setMsgBody(getMsgTemplate(t, msgClinic?.name ?? "")); }}
                        style={{ padding:"7px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"Rubik,sans-serif",
                          borderColor: msgTemplate===t ? "#0863ba" : "#e0e0e0",
                          background:  msgTemplate===t ? "#0863ba" : "#f5f7fa",
                          color:       msgTemplate===t ? "#fff" : "#555" }}>
                        {t === "welcome" ? "ترحيبية" : t === "expiry" ? "انتهاء الاشتراك" : "مخصصة"}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="اكتب رسالتك هنا... (Enter للإرسال)"
                  rows={6}
                  style={{ width:"100%",padding:12,borderRadius:12,border:"1.5px solid #e0e0e0",fontFamily:"Rubik,sans-serif",fontSize:14,resize:"vertical",outline:"none",lineHeight:1.7 }}
                />
                <div style={{ fontSize:11,color:"#aaa",textAlign:"left" }}>{msgBody.length}/2000</div>
              </div>
            )}

            {/* أزرار الإجراء */}
            <div style={{ borderTop:"1.5px solid #eef0f3",padding:"12px 16px",display:"flex",gap:10,flexShrink:0 }}>
              {msgView === "compose" ? (
                <>
                  <button onClick={handleSendMessage}
                    disabled={msgSending || !msgBody.trim() || msgBody.length > 2000}
                    style={{ flex:1,padding:"12px 0",borderRadius:12,background:"linear-gradient(135deg,#0863ba,#0558a8)",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif",opacity:msgSending||!msgBody.trim()?0.6:1 }}>
                    {msgSuccess ? "تم الإرسال" : msgSending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
                  </button>
                  <button onClick={() => setMsgView("history")}
                    style={{ padding:"12px 16px",borderRadius:12,background:"#f5f7fa",color:"#888",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:13,fontFamily:"Rubik,sans-serif" }}>
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setMsgView("compose")}
                    style={{ flex:1,padding:"12px 0",borderRadius:12,background:"linear-gradient(135deg,#0863ba,#0558a8)",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif" }}>
                    <AppIcon glyph="✏️" /> رسالة جديدة
                  </button>
                  <button onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}
                    style={{ padding:"12px 16px",borderRadius:12,background:"#f5f7fa",color:"#888",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:13,fontFamily:"Rubik,sans-serif" }}>
                    إغلاق
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─── Exports for use in other pages ──────────────────────────
export { PLAN_PRICING, PLAN_PATIENT_LIMITS, PLAN_FEATURES, SHARED_PLAN_DEFAULT_DOCTORS };
export type { PlanType };