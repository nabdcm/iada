"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Payment } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Payments Page
// داشبورد المدفوعات + الجدول + إضافة دفعة + المستحقات
// ============================================================

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"لوحة المعلومات", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", admin:"لوحة المدير", prescriptions:"الوصفات الطبية", tracking:"متابعة المرضى" },
    page:{ title:"المدفوعات", sub:"سجل المعاملات المالية وإدارة الفواتير" },
    recordPayment:"تسجيل دفعة",
    stats:{
      totalMonth:"إيرادات الشهر", totalYear:"إيرادات السنة",
      paid:"مدفوعات مكتملة", pending:"مستحقات معلّقة",
      transactions:"معاملة", vsLast:"مقارنةً بالشهر الماضي",
      unpaidCount:"فاتورة غير مسدّدة",
    },
    table:{
      title:"سجل المعاملات", date:"التاريخ", patient:"المريض",
      description:"الوصف", method:"طريقة الدفع", status:"الحالة", amount:"المبلغ", actions:"",
    },
    methods:{ cash:"نقداً", card:"بطاقة", transfer:"تحويل" },
    statuses:{ paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" },
    filter:{ all:"الكل", paid:"مدفوع", pending:"معلّق", cash:"نقداً", card:"بطاقة" },
    search:"بحث بالمريض أو الوصف...",
    pendingSection:{ title:"المستحقات المعلّقة", markPaid:"تحديد كمدفوع", empty:"لا توجد مستحقات معلّقة 🎉" },
    modal:{
      addTitle:"تسجيل دفعة جديدة",
      patient:"المريض *", selectPatient:"اختر المريض",
      amount:"المبلغ (ل.س) *", amountPh:"0.00",
      description:"الوصف", descPh:"مثال: رسوم استشارة، تحاليل...",
      method:"طريقة الدفع *",
      date:"التاريخ *",
      status:"الحالة",
      notes:"ملاحظات", notesPh:"أي ملاحظات إضافية...",
      save:"حفظ الدفعة",
      cancel:"إلغاء",
      required:"المريض والمبلغ مطلوبان",
      addPending:"إضافة كمستحق",
      doctorOptional:"الطبيب (اختياري)",
      doctorOptionalHint:"يمكنك تخصيص الدفعة لطبيب محدد أو تركها كإيراد مشترك للعيادة",
      sharedRevenue:"إيراد مشترك",
    },
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    noResults:"لا توجد نتائج",
    signOut:"تسجيل الخروج",
    revenueChart:"إيرادات آخر 6 أشهر",
    exportBtn:"تصدير شهري",
    exportDailyBtn:"تقرير يومي",
    deleteConfirm:"هل تريد حذف هذه المعاملة؟",
    paymentsLock:{
      title:"صفحة المدفوعات محمية",
      desc:"هذه الصفحة محمية بكلمة سر. أدخل كلمة السر للمتابعة.",
      placeholder:"أدخل كلمة السر...",
      submit:"دخول",
      error:"كلمة السر غير صحيحة",
    },
    sessionType:{
      label:"نوع الجلسة",
      consultation:"معاينة",
      session:"جلسة",
      followup:"مراجعة",
    },
    prepayment:{
      label:"دفع مسبق",
      toggle:"دفع مسبق (عدة جلسات)",
      sessions:"عدد الجلسات",
      sessionsHint:"المريض دفع مسبقاً لـ",
      sessionsUnit:"جلسة",
      badgePrefix:"مسبق ×",
    },
    withdrawBtn:"سحب",
    expenseBtn:"مصروف",
    withdrawModal:{
      title:"تسجيل سحب",
      amount:"المبلغ المسحوب (ل.س) *",
      reason:"سبب السحب *",
      reasonPh:"مثال: مصروف شخصي، راتب، ...",
      date:"التاريخ *",
      notes:"ملاحظات",
      notesPh:"أي تفاصيل إضافية...",
      save:"تأكيد السحب",
      cancel:"إلغاء",
      required:"المبلغ وسبب السحب مطلوبان",
    },
    expenseModal:{
      title:"تسجيل مصروف عيادة",
      amount:"المبلغ (ل.س) *",
      category:"التصنيف *",
      categories:{ rent:"إيجار", supplies:"مستلزمات طبية", salary:"رواتب موظفين", utilities:"فواتير كهرباء/ماء", maintenance:"صيانة", other:"أخرى" },
      description:"الوصف *",
      descPh:"مثال: فاتورة الكهرباء لشهر يونيو...",
      date:"التاريخ *",
      notes:"ملاحظات",
      notesPh:"أي تفاصيل إضافية...",
      save:"حفظ المصروف",
      cancel:"إلغاء",
      required:"المبلغ والتصنيف والوصف مطلوبة",
    },
    netBalance:"الرصيد الصافي",
    totalWithdrawals:"إجمالي السحوبات",
    totalExpenses:"مصروفات العيادة",
    withdrawalsSection:{ title:"السحوبات الأخيرة", empty:"لا توجد سحوبات مسجّلة", reverseConfirm:"هل تريد التراجع عن هذا السحب؟ سيُعاد المبلغ للرصيد.", reverseBtn:"تراجع", reversed:"مُلغى" },
    expensesSection:{ title:"مصروفات العيادة", empty:"لا توجد مصروفات مسجّلة" },
    txType:{ income:"دخل", withdrawal:"سحب", expense:"مصروف" },
    filterType:{ all:"الكل", income:"دخل", withdrawal:"سحوبات", expense:"مصروفات" },
    sharedClinic:{
      badge:"عيادة مشتركة",
      filterByDoctor:"فلترة حسب الطبيب",
      allDoctors:"جميع الأطباء",
      doctor:"الطبيب",
      doctorRevenue:"إيرادات حسب الطبيب",
      planLimits:{
        shared_basic:     "حتى طبيبين",
        shared_pro:       "حتى 3 أطباء",
        shared_enterprise:"حتى 5 أطباء",
      },
      planPricing:{
        shared_basic:     "٧.٩٩ $ / شهر · ٧٩ $ / سنة",
        shared_pro:       "١٣.٩٩ $ / شهر · ١٣٩ $ / سنة",
        shared_enterprise:"٢١.٩٩ $ / شهر · ٢١٩ $ / سنة",
      },
    },
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", admin:"Admin Panel", prescriptions:"Prescriptions", tracking:"Patient Tracking" },
    page:{ title:"Payments", sub:"Financial transaction records and billing management" },
    recordPayment:"Record Payment",
    stats:{
      totalMonth:"Monthly Revenue", totalYear:"Annual Revenue",
      paid:"Completed Payments", pending:"Pending Dues",
      transactions:"transactions", vsLast:"vs last month",
      unpaidCount:"unpaid invoice",
    },
    table:{
      title:"Transaction History", date:"Date", patient:"Patient",
      description:"Description", method:"Method", status:"Status", amount:"Amount", actions:"",
    },
    methods:{ cash:"Cash", card:"Card", transfer:"Transfer" },
    statuses:{ paid:"Paid", pending:"Pending", cancelled:"Cancelled" },
    filter:{ all:"All", paid:"Paid", pending:"Pending", cash:"Cash", card:"Card" },
    search:"Search by patient or description...",
    pendingSection:{ title:"Pending Dues", markPaid:"Mark as Paid", empty:"No pending dues 🎉" },
    modal:{
      addTitle:"Record New Payment",
      patient:"Patient *", selectPatient:"Select patient",
      amount:"Amount (SYP) *", amountPh:"0.00",
      description:"Description", descPh:"e.g. Consultation fee, Lab tests...",
      method:"Payment Method *",
      date:"Date *",
      status:"Status",
      notes:"Notes", notesPh:"Any additional notes...",
      save:"Save Payment",
      cancel:"Cancel",
      required:"Patient and amount are required",
      addPending:"Add as Pending",
      doctorOptional:"Doctor (Optional)",
      doctorOptionalHint:"You can assign this payment to a specific doctor or leave it as shared clinic revenue",
      sharedRevenue:"Shared Revenue",
    },
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    noResults:"No results found",
    signOut:"Sign Out",
    revenueChart:"Revenue — Last 6 Months",
    exportBtn:"Monthly Report",
    exportDailyBtn:"Daily Report",
    deleteConfirm:"Delete this transaction?",
    paymentsLock:{
      title:"Payments Page Protected",
      desc:"This page is password protected. Enter the password to continue.",
      placeholder:"Enter password...",
      submit:"Enter",
      error:"Incorrect password",
    },
    sessionType:{
      label:"Session Type",
      consultation:"Consultation",
      session:"Session",
      followup:"Follow-up",
    },
    prepayment:{
      label:"Prepayment",
      toggle:"Prepayment (multiple sessions)",
      sessions:"Number of Sessions",
      sessionsHint:"Patient paid in advance for",
      sessionsUnit:"session(s)",
      badgePrefix:"Pre ×",
    },
    withdrawBtn:"Withdraw",
    expenseBtn:"Expense",
    withdrawModal:{
      title:"Record Withdrawal",
      amount:"Withdrawn Amount (SYP) *",
      reason:"Reason *",
      reasonPh:"e.g. Personal expense, salary...",
      date:"Date *",
      notes:"Notes",
      notesPh:"Any additional details...",
      save:"Confirm Withdrawal",
      cancel:"Cancel",
      required:"Amount and reason are required",
    },
    expenseModal:{
      title:"Record Clinic Expense",
      amount:"Amount (SYP) *",
      category:"Category *",
      categories:{ rent:"Rent", supplies:"Medical Supplies", salary:"Staff Salary", utilities:"Utilities", maintenance:"Maintenance", other:"Other" },
      description:"Description *",
      descPh:"e.g. June electricity bill...",
      date:"Date *",
      notes:"Notes",
      notesPh:"Any additional details...",
      save:"Save Expense",
      cancel:"Cancel",
      required:"Amount, category and description are required",
    },
    netBalance:"Net Balance",
    totalWithdrawals:"Total Withdrawals",
    totalExpenses:"Clinic Expenses",
    withdrawalsSection:{ title:"Recent Withdrawals", empty:"No withdrawals recorded", reverseConfirm:"Undo this withdrawal? The amount will be returned to the balance.", reverseBtn:"Undo", reversed:"Reversed" },
    expensesSection:{ title:"Clinic Expenses", empty:"No expenses recorded" },
    txType:{ income:"Income", withdrawal:"Withdrawal", expense:"Expense" },
    filterType:{ all:"All", income:"Income", withdrawal:"Withdrawals", expense:"Expenses" },
    sharedClinic:{
      badge:"Shared Clinic",
      filterByDoctor:"Filter by Doctor",
      allDoctors:"All Doctors",
      doctor:"Doctor",
      doctorRevenue:"Revenue by Doctor",
      planLimits:{
        shared_basic:     "Up to 2 doctors",
        shared_pro:       "Up to 3 doctors",
        shared_enterprise:"Up to 5 doctors",
      },
      planPricing:{
        shared_basic:     "$7.99/mo · $79/yr",
        shared_pro:       "$13.99/mo · $139/yr",
        shared_enterprise:"$21.99/mo · $219/yr",
      },
    },
  },
};

const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22"];
const getColor = (id: number) => AVT_COLORS[(id - 1) % AVT_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const fmt = (d: Date) => d.toISOString().split("T")[0];

// ─── Sidebar ──────────────────────────────────────────────
// Design tokens
const SB_BG          = "#0558a8";
const SB_BG_HEADER   = "#044d96";
const SB_BG_FOOTER   = "#044d96";
const SB_ACTIVE_BG   = "rgba(255,255,255,0.15)";
const SB_ACTIVE_TEXT = "#ffffff";
const SB_IDLE_TEXT   = "rgba(255,255,255,0.62)";
const SB_BORDER      = "rgba(255,255,255,0.1)";
const SB_INDICATOR   = "#7dd3fc";

const PillIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/>
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
  </svg>
);

const TrackingIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// ─── Plan access rules ────────────────────────────────────
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

// الخطط المشتركة للعيادات
const SHARED_CLINIC_PLANS: PlanType[] = ["shared_basic", "shared_pro", "shared_enterprise"];
const isSharedClinicPlan = (plan: PlanType) => SHARED_CLINIC_PLANS.includes(plan);

// حدود الأطباء لكل خطة مشتركة
const CLINIC_PLAN_DOCTOR_LIMITS: Record<string, number> = {
  shared_basic:      2,
  shared_pro:        3,
  shared_enterprise: 5,
};

// أسعار الخطط المشتركة (دولار)
const CLINIC_PLAN_PRICING = {
  shared_basic:      { monthly: 7.99,  yearly: 79  },
  shared_pro:        { monthly: 13.99, yearly: 139 },
  shared_enterprise: { monthly: 21.99, yearly: 219 },
};

const PLAN_ACCESS: Record<string,string[]> = {
  // المدفوعات: الاحترافية والشاملة فقط — الأساسية مقفلة (فردي ومشترك)
  payments:      ["pro","enterprise","shared_pro","shared_enterprise"],
  prescriptions: ["enterprise","shared_basic","shared_pro","shared_enterprise"],
  tracking:      ["enterprise","shared_basic","shared_pro","shared_enterprise"],
};
const canAccess = (feature:string, plan:PlanType) =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

const PLAN_BADGE: Record<PlanType,{label:{ar:string;en:string};color:string;isShared?:boolean}> = {
  basic:             {label:{ar:"الأساسية",            en:"Basic"},             color:"#0863ba"},
  pro:               {label:{ar:"الاحترافية",          en:"Professional"},      color:"#7b2d8b"},
  enterprise:        {label:{ar:"الشاملة",             en:"Comprehensive"},     color:"#e67e22"},
  shared_basic:      {label:{ar:"مشتركة — أساسية",    en:"Shared — Basic"},    color:"#0e7c6a", isShared:true},
  shared_pro:        {label:{ar:"مشتركة — احترافية",  en:"Shared — Pro"},      color:"#b5451b", isShared:true},
  shared_enterprise: {label:{ar:"مشتركة — شاملة",    en:"Shared — Full"},     color:"#4a1480", isShared:true},
};

function Sidebar({ lang, setLang, isMobile, mobileOpen, setMobileOpen, activePage = "payments", plan = "basic" }: {
  lang: string; setLang: (l: string) => void;
  isMobile: boolean; mobileOpen: boolean; setMobileOpen: (v: boolean) => void;
  activePage?: string; plan?: PlanType;
}) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [col, setCol] = useState(false);

  useEffect(() => {
    if (isMobile && mobileOpen) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  const sidebarRight = isAr ? 0 : undefined;
  const sidebarLeft  = isAr ? undefined : 0;
  const sidebarTransform = isMobile
    ? (mobileOpen ? "translateX(0)" : (isAr ? "translateX(100%)" : "translateX(-100%)"))
    : "translateX(0)";

  const NAV_ICONS: Record<string, React.ReactNode> = {
    dashboard:    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    patients:     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    appointments: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    payments:     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    prescriptions: <PillIcon />,
    tracking:      <TrackingIcon />,
  };

  const navItems: { key: string; href: string }[] = [
    { key:"dashboard",     href:"/dashboard"        },
    { key:"patients",      href:"/patients"         },
    { key:"appointments",  href:"/appointments"     },
    { key:"payments",      href:"/payments"         },
    { key:"prescriptions", href:"/prescriptions"    },
    { key:"tracking",      href:"/patient-tracking" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:55,WebkitTapHighlightColor:"transparent" }} />
      )}

      {isMobile && (
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ position:"fixed",top:14,right:isAr?16:undefined,left:isAr?undefined:16,zIndex:70,width:40,height:40,borderRadius:10,background:SB_BG,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(5,88,168,.4)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      )}

      <aside style={{ width:isMobile?260:col?70:240,minHeight:"100vh",background:SB_BG,display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,right:sidebarRight,left:sidebarLeft,zIndex:60,transform:sidebarTransform,boxShadow:isMobile&&mobileOpen?(isAr?"-8px 0 32px rgba(0,0,0,.15)":"8px 0 32px rgba(0,0,0,.15)"):(isAr?"-4px 0 32px rgba(5,88,168,.45)":"4px 0 32px rgba(5,88,168,.45)") }}>

        {/* Header */}
        <div style={{ padding:col?"18px 0":"18px 20px",background:SB_BG_HEADER,borderBottom:`1px solid ${SB_BORDER}`,display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72 }}>
          {!col && (
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,.25)" }} />
              <div>
                <div style={{ fontSize:18,fontWeight:800,color:"#ffffff",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:400 }}>{tr.appSub}</div>
              </div>
            </div>
          )}
          {col && <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10 }} />}
          {!isMobile && (
            <button
              onClick={() => setCol(!col)}
              title={col ? (isAr ? "توسيع القائمة" : "Expand sidebar") : (isAr ? "طي القائمة" : "Collapse sidebar")}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)"; }}
              style={{ width:28,height:28,background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.22)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:1,transition:"background .15s",flexShrink:0,marginTop:col?8:0 }}
            >
              {col ? (isAr ? "‹" : "›") : (isAr ? "›" : "‹")}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1,padding:"12px 10px",overflowY:"auto" }}>
          {navItems.map(item => {
            const isActive = item.key === activePage;
            const isLocked = !canAccess(item.key, plan);
            const lockLabel = lang==="ar" ? "غير متاح في خطتك" : "Not available in your plan";
            return (
              <a key={item.key}
                href={isLocked ? undefined : item.href}
                title={col ? (isLocked ? lockLabel : (tr.nav as Record<string,string>)[item.key]) : (isLocked ? lockLabel : undefined)}
                onClick={isLocked ? (e) => e.preventDefault() : undefined}
                onMouseEnter={e => { if (!isActive && !isLocked) (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background="transparent"; }}
                style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"13px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?SB_ACTIVE_BG:"transparent",color:isLocked?"rgba(255,255,255,0.28)":(isActive?SB_ACTIVE_TEXT:SB_IDLE_TEXT),fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative",cursor:isLocked?"not-allowed":"pointer",opacity:isLocked?0.5:1 }}>
                {isActive && (
                  <div style={{ position:"absolute",right:isAr?-10:undefined,left:isAr?undefined:-10,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:SB_INDICATOR,borderRadius:10 }}/>
                )}
                <span style={{ display:"flex",alignItems:"center",flexShrink:0 }}>{NAV_ICONS[item.key]}</span>
                {!col && <span style={{ flex:1 }}>{(tr.nav as Record<string,string>)[item.key]}</span>}
                {isLocked && !col && <span style={{ fontSize:11,opacity:0.7 }}>🔒</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:col?"14px 10px":"14px 12px",background:SB_BG_FOOTER,borderTop:`1px solid ${SB_BORDER}` }}>
          {!col && (
            <>
              <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",marginBottom:8,background:"rgba(255,255,255,0.08)",border:`1.5px solid ${PLAN_BADGE[plan].color}50`,borderRadius:8 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:PLAN_BADGE[plan].color,flexShrink:0 }}/>
                <span style={{ fontSize:11,color:"rgba(255,255,255,0.7)",flex:1 }}>
                  {isSharedClinicPlan(plan) ? (isAr?"عيادة مشتركة":"Shared") : (isAr?"خطة":"Plan")}
                </span>
                <span style={{ fontSize:11,fontWeight:700,color:PLAN_BADGE[plan].color }}>{PLAN_BADGE[plan].label[lang as "ar"|"en"]}</span>
              </div>
              <button
                onClick={() => setLang(lang==="ar"?"en":"ar")}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)"; }}
                style={{ width:"100%",padding:"8px",marginBottom:10,background:"rgba(255,255,255,0.06)",border:`1px solid ${SB_BORDER}`,borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"rgba(255,255,255,0.8)",fontWeight:600,transition:"background .15s" }}
              >
                🌐 {lang==="ar" ? "English" : "العربية"}
              </button>
            </>
          )}
          <button
            onClick={async () => { const { supabase: sb } = await import("@/lib/supabase"); await sb.auth.signOut(); window.location.href = "/login"; }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.3)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.15)"; }}
            style={{ width:"100%",padding:col?"10px 0":"10px 14px",background:"rgba(192,57,43,.15)",border:"1.5px solid rgba(192,57,43,.3)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#ffb3a7",fontWeight:600,display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:8,transition:"all .2s" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!col && <span>{tr.signOut}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Field wrapper — خارج كل المكونات لتجنب مشكلة focus ────
// المشكلة: تعريف F داخل Modal يُعيد إنشاءها عند كل render → فقدان الـ focus
function F({ label, children, half }: { label: any; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom:16, flex: half ? "1" : undefined }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#555", marginBottom:7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Modal إضافة دفعة ─────────────────────────────────────
function PaymentModal({ lang, patients, doctors, isSharedClinic, onSave, onClose }: {
  lang: string;
  patients: Patient[];
  doctors?: {id: number; name: string}[];
  isSharedClinic?: boolean;
  onSave: (data: Omit<Payment,'id'|'user_id'|'created_at'>) => Promise<void>;
  onClose: () => void
}) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({
    patientId:"", amount:"", description:"", method:"cash",
    date:fmt(new Date()), status:"paid", notes:"",
    doctorId:"", // للخطط المشتركة فقط
    sessionType:"session", // معاينة | جلسة | مراجعة
    isPrepayment:false,    // دفع مسبق
    prepaymentSessions:1,  // عدد الجلسات المدفوعة مسبقاً
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patientDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropRef.current && !patientDropRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
        if (!form.patientId) setPatientSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [form.patientId]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleSave = async (asPending=false) => {
    if (!form.patientId||!form.amount) { setError(tr.modal.required); return; }
    // تخصيص الطبيب اختياري في الخطط المشتركة — لا validation إلزامي
    setSaving(true);
    try {
      await onSave({
        patient_id: form.patientId ? Number(form.patientId) : undefined,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        method: form.method as "cash"|"card"|"transfer",
        date: form.date,
        status: (asPending ? "pending" : "paid") as "paid"|"pending"|"cancelled",
        notes: form.notes || undefined,
        session_type: form.sessionType,
        is_prepayment: form.isPrepayment,
        prepayment_sessions: form.isPrepayment ? form.prepaymentSessions : undefined,
        ...(isSharedClinic && form.doctorId ? { doctor_id: Number(form.doctorId) } : {}),
      } as any);
    } catch(e) {
      setError(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving payment");
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
    outline:"none", transition:"border .2s", direction: isAr ? "rtl" : "ltr",
  };

  return (
    <div className="modal-sheet" style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div className="modal-inner" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          {/* Drag handle — mobile only */}
          <div style={{ position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",width:40,height:4,borderRadius:4,background:"#e0e0e0" }}/>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>💳</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.addTitle}</h2>
          </div>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:10,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          <F label={tr.modal.patient}>
            <div ref={patientDropRef} style={{ position:"relative" }}>
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setPatientDropOpen(true);
                    if (!e.target.value) setForm({ ...form, patientId: "" });
                  }}
                  onFocus={() => setPatientDropOpen(true)}
                  placeholder={tr.modal.selectPatient}
                  style={{ ...inputSt, paddingInlineEnd: 36, cursor:"text" }}
                  autoComplete="off"
                  onBlur={e => { e.currentTarget.style.borderColor="#e8eaed"; }}
                />
                <span style={{
                  position:"absolute", insetInlineEnd:12, top:"50%", transform:"translateY(-50%)",
                  pointerEvents:"none", color:"#aaa", fontSize:12,
                }}>{"▾"}</span>
              </div>
              {patientDropOpen && (
                <div style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:300,
                  background:"#fff", border:"1.5px solid #e8eaed", borderRadius:12,
                  boxShadow:"0 8px 32px rgba(46,125,50,.13)", maxHeight:220, overflowY:"auto",
                }}>
                  {filteredPatients.length === 0 ? (
                    <div style={{ padding:"14px 16px", fontSize:13, color:"#aaa", textAlign:"center" }}>
                      {isAr ? "لا توجد نتائج" : "No results found"}
                    </div>
                  ) : (
                    filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => {
                          setForm({ ...form, patientId: String(p.id) });
                          setPatientSearch(p.name);
                          setPatientDropOpen(false);
                        }}
                        style={{
                          padding:"11px 16px", fontSize:14, color:"#353535", cursor:"pointer",
                          background: form.patientId === String(p.id) ? "rgba(46,125,50,.07)" : "transparent",
                          fontWeight: form.patientId === String(p.id) ? 600 : 400,
                          borderBottom:"1px solid #f4f6f9",
                          display:"flex", alignItems:"center", gap:10,
                          transition:"background .12s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(46,125,50,.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = form.patientId === String(p.id) ? "rgba(46,125,50,.07)" : "transparent"; }}
                      >
                        <div style={{
                          width:28, height:28, borderRadius:8, background:getColor(p.id),
                          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:700, flexShrink:0,
                        }}>
                          {getInitials(p.name)}
                        </div>
                        {p.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </F>

          {/* حقل الطبيب — للخطط المشتركة فقط — اختياري */}
          {isSharedClinic && doctors && doctors.length > 0 && (
            <F label={tr.modal.doctorOptional}>
              <div style={{ marginBottom:8,fontSize:12,color:"#aaa",lineHeight:1.6 }}>
                {tr.modal.doctorOptionalHint}
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {/* زر "إيراد مشترك" */}
                <button key="none" onClick={() => setForm({...form, doctorId: ""})}
                  style={{
                    padding:"9px 16px", borderRadius:10, cursor:"pointer",
                    border: form.doctorId==="" ? "1.5px solid #888" : "1.5px solid #eee",
                    background: form.doctorId==="" ? "rgba(100,100,100,.08)" : "#fafbfc",
                    fontFamily:"Rubik,sans-serif", fontSize:13,
                    fontWeight: form.doctorId==="" ? 700 : 400,
                    color: form.doctorId==="" ? "#555" : "#aaa",
                    transition:"all .2s", display:"flex", alignItems:"center", gap:7,
                  }}>
                  <div style={{ width:22,height:22,borderRadius:6,background:form.doctorId===""?"#888":"#ddd",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>
                    🏥
                  </div>
                  {tr.modal.sharedRevenue}
                </button>
                {doctors.map(doc => (
                  <button key={doc.id} onClick={() => setForm({...form, doctorId: String(doc.id)})}
                    style={{
                      padding:"9px 16px", borderRadius:10, cursor:"pointer",
                      border: form.doctorId===String(doc.id) ? "1.5px solid #0891b2" : "1.5px solid #eee",
                      background: form.doctorId===String(doc.id) ? "rgba(8,145,178,.08)" : "#fafbfc",
                      fontFamily:"Rubik,sans-serif", fontSize:13,
                      fontWeight: form.doctorId===String(doc.id) ? 700 : 400,
                      color: form.doctorId===String(doc.id) ? "#0891b2" : "#666",
                      transition:"all .2s", display:"flex", alignItems:"center", gap:7,
                    }}>
                    <div style={{ width:22,height:22,borderRadius:6,background:form.doctorId===String(doc.id)?"#0891b2":"#ccc",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700 }}>
                      {getInitials(doc.name)}
                    </div>
                    {isAr ? "د. " : "Dr. "}{doc.name}
                  </button>
                ))}
              </div>
            </F>
          )}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.amount} half>
              <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder={tr.modal.amountPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.modal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.modal.description}>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.modal.descPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>

          {/* نوع الجلسة */}
          <F label={tr.sessionType.label}>
            <div style={{ display:"flex",gap:8 }}>
              {[
                { k:"consultation", icon:"🩺", label:tr.sessionType.consultation },
                { k:"session",      icon:"🛋️", label:tr.sessionType.session      },
                { k:"followup",     icon:"🔄", label:tr.sessionType.followup     },
              ].map(s=>(
                <label key={s.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.sessionType===s.k?"1.5px solid #0863ba":"1.5px solid #eee",background:form.sessionType===s.k?"rgba(8,99,186,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.sessionType===s.k?700:400,color:form.sessionType===s.k?"#0863ba":"#888" }}>
                  <span>{s.icon}</span>{s.label}
                  <input type="radio" name="sessionType" value={s.k} checked={form.sessionType===s.k} onChange={e=>setForm({...form,sessionType:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
          </F>

          {/* دفع مسبق */}
          <F label={tr.prepayment.label}>
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",borderRadius:10,border:form.isPrepayment?"1.5px solid #7b2d8b":"1.5px solid #eee",background:form.isPrepayment?"rgba(123,45,139,.06)":"#fafbfc",transition:"all .2s" }}>
              <div style={{ width:20,height:20,borderRadius:6,border:form.isPrepayment?"2px solid #7b2d8b":"2px solid #ddd",background:form.isPrepayment?"#7b2d8b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",flexShrink:0 }}>
                {form.isPrepayment&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input type="checkbox" checked={form.isPrepayment} onChange={e=>setForm({...form,isPrepayment:e.target.checked,prepaymentSessions:e.target.checked?form.prepaymentSessions:1})} style={{ display:"none" }}/>
              <span style={{ fontSize:13,fontWeight:600,color:form.isPrepayment?"#7b2d8b":"#666" }}>
                💳 {tr.prepayment.toggle}
              </span>
            </label>
            {form.isPrepayment && (
              <div style={{ marginTop:10,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(123,45,139,.04)",borderRadius:10,border:"1.5px solid rgba(123,45,139,.15)" }}>
                <span style={{ fontSize:12,color:"#7b2d8b",fontWeight:600,flex:1 }}>
                  {tr.prepayment.sessionsHint}
                </span>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <button onClick={()=>setForm({...form,prepaymentSessions:Math.max(1,form.prepaymentSessions-1)})} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid rgba(123,45,139,.3)",background:"#fff",cursor:"pointer",fontSize:16,color:"#7b2d8b",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif" }}>−</button>
                  <span style={{ fontSize:18,fontWeight:900,color:"#7b2d8b",minWidth:28,textAlign:"center" }}>{form.prepaymentSessions}</span>
                  <button onClick={()=>setForm({...form,prepaymentSessions:Math.min(50,form.prepaymentSessions+1)})} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid rgba(123,45,139,.3)",background:"#fff",cursor:"pointer",fontSize:16,color:"#7b2d8b",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif" }}>+</button>
                </div>
                <span style={{ fontSize:12,color:"#7b2d8b",fontWeight:600 }}>{tr.prepayment.sessionsUnit}</span>
              </div>
            )}
          </F>
          <F label={tr.modal.method}>
            <div style={{ display:"flex",gap:10 }}>
              {[
                { k:"cash",     icon:"💵", label:tr.methods.cash     },
                { k:"card",     icon:"💳", label:tr.methods.card     },
                { k:"transfer", icon:"🏦", label:tr.methods.transfer },
              ].map(m=>(
                <label key={m.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.method===m.k?"1.5px solid #2e7d32":"1.5px solid #eee",background:form.method===m.k?"rgba(46,125,50,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.method===m.k?700:400,color:form.method===m.k?"#2e7d32":"#888" }}>
                  <span>{m.icon}</span>{m.label}
                  <input type="radio" name="method" value={m.k} checked={form.method===m.k} onChange={e=>setForm({...form,method:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
          </F>
          <F label={tr.modal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.modal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        {/* Footer */}
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button
  onClick={() => handleSave(false)}
  disabled={saving}
  style={{
    flex: 1,
    padding: "13px",
    background: saving ? "#81c784" : "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontFamily: "Rubik,sans-serif",
    fontSize: 15,
    fontWeight: 700,
    cursor: saving ? "not-allowed" : "pointer",
    boxShadow: "0 4px 16px rgba(46,125,50,.25)",
    transition: "all .2s"
  }}
>
            {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : tr.modal.save}
          </button>
          <button onClick={()=>handleSave(true)} disabled={saving} style={{ padding:"13px 16px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:saving?.6:1 }}>
            {tr.modal.addPending}
          </button>
          <button onClick={onClose} style={{ padding:"13px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── سلايدر البطاقات للموبايل ─────────────────────────────
function MobileStatsSlider({ stats, methodStats, methodIcon, tr, isAr }: {
  stats: any; methodStats: any[]; methodIcon: any; tr: any; isAr: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const cards = [
    {
      gradient: "linear-gradient(90deg,#2e7d32,#66bb6a)",
      icon: "💰",
      iconBg: "rgba(46,125,50,.1)",
      value: `${stats.totalMonth.toLocaleString()} ل.س`,
      valueColor: "#2e7d32",
      label: tr.stats.totalMonth,
      sub: `↑ 12% ${tr.stats.vsLast}`,
      subColor: "#2e7d32",
    },
    {
      gradient: "linear-gradient(90deg,#0863ba,#a4c4e4)",
      icon: "📊",
      iconBg: "rgba(8,99,186,.08)",
      value: `${stats.totalYear.toLocaleString()} ل.س`,
      valueColor: "#0863ba",
      label: tr.stats.totalYear,
      sub: `${stats.paidCount} ${tr.stats.transactions}`,
      subColor: "#888",
    },
    {
      gradient: "linear-gradient(90deg,#e67e22,#f39c12)",
      icon: "⏳",
      iconBg: "rgba(230,126,34,.08)",
      value: `${stats.pendingAmt.toLocaleString()} ل.س`,
      valueColor: "#e67e22",
      label: tr.stats.pending,
      sub: `${stats.pendingCount} ${tr.stats.unpaidCount}`,
      subColor: "#e67e22",
    },
  ];

  const handleScroll = () => {
    if (!trackRef.current) return;
    const scrollLeft = trackRef.current.scrollLeft;
    const cardWidth = trackRef.current.scrollWidth / (cards.length + 1); // +1 for method card
    setActiveIdx(Math.round(Math.abs(scrollLeft) / cardWidth));
  };

  return (
    <div className="stats-slider-wrap" style={{ marginBottom:20 }}>
      <div ref={trackRef} className="stats-slider-track" onScroll={handleScroll}>
        {cards.map((c, i) => (
          <div key={i} className="stat-big" style={{ position:"relative",overflow:"hidden",background:"#fff",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.08)",borderRadius:16,padding:"20px 20px" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:c.gradient,borderRadius:"16px 16px 0 0" }}/>
            <div style={{ width:40,height:40,background:c.iconBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,marginBottom:12 }}>{c.icon}</div>
            <div style={{ fontSize:26,fontWeight:900,color:c.valueColor,lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{c.label}</div>
            <div style={{ fontSize:11,color:c.subColor,marginTop:4,fontWeight:600 }}>{c.sub}</div>
          </div>
        ))}
        {/* طرق الدفع */}
        <div className="stat-big" style={{ position:"relative",overflow:"hidden",background:"#fff",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.08)",borderRadius:16,padding:"20px 20px" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#7b2d8b,#a855f7)",borderRadius:"16px 16px 0 0" }}/>
          <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
            {isAr?"طرق الدفع":"Payment Methods"}
          </div>
          {methodStats.map((m: any) => (
            <div key={m.k} style={{ marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <span style={{ fontSize:12,color:"#666" }}>{methodIcon[m.k]} {isAr ? (m.k==="cash"?"نقداً":m.k==="card"?"بطاقة":"تحويل") : (m.k==="cash"?"Cash":m.k==="card"?"Card":"Transfer")}</span>
                <span style={{ fontSize:12,fontWeight:700,color:m.color }}>{m.pct}%</span>
              </div>
              <div style={{ height:6,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${m.pct}%`,background:m.color,borderRadius:10,transition:"width .8s" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="stats-slider-dots">
        {[...cards, null].map((_, i) => (
          <span key={i} className={activeIdx === i ? "active" : ""}/>
        ))}
      </div>
    </div>
  );
}

// ─── مخطط الإيرادات ───────────────────────────────────────
function RevenueChart({ lang, months, revenueData }: { lang: string; months: string[]; revenueData: number[] }) {
  const tr = T[lang];
  const max = Math.max(...revenueData, 1);
  const now = new Date();
  const lastSixMonths = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    return tr.months[d.getMonth()];
  });

  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"22px 24px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.revenueChart}</h3>
        <span style={{ fontSize:12,color:"#aaa",background:"#f7f9fc",padding:"4px 12px",borderRadius:20 }}>
          {tr.months[now.getMonth()]} {now.getFullYear()}
        </span>
      </div>
      {/* Bars */}
      <div style={{ display:"flex",alignItems:"flex-end",gap:10,height:120,marginBottom:12 }}>
        {revenueData.map((v,i)=>{
          const isLast = i===5;
          const h = Math.round((v/max)*100);
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isLast?"#2e7d32":"#ccc",fontWeight:isLast?700:400 }}>{v>=1000?(v/1000).toFixed(0)+"k":v} ل.س</div>
              <div style={{ width:"100%",position:"relative",height:100,display:"flex",alignItems:"flex-end" }}>
                <div style={{
                  width:"100%",borderRadius:"6px 6px 0 0",
                  height:`${h}%`,minHeight:6,
                  background: isLast
                    ? "linear-gradient(180deg,#2e7d32,#66bb6a)"
                    : "linear-gradient(180deg,#a4c4e4,#d0e8f4)",
                  transition:"height .8s cubic-bezier(.4,0,.2,1)",
                  boxShadow: isLast?"0 4px 12px rgba(46,125,50,.2)":undefined,
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div style={{ display:"flex",gap:10 }}>
        {lastSixMonths.map((m,i)=>(
          <div key={i} style={{ flex:1,textAlign:"center",fontSize:11,color:i===5?"#2e7d32":"#bbb",fontWeight:i===5?700:400 }}>{m}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal السحب ──────────────────────────────────────────────
function WithdrawModal({ lang, onSave, onClose }: { lang: string; onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({ amount:"", reason:"", date:fmt(new Date()), notes:"" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputSt: React.CSSProperties = { width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr" };

  const handleSave = async () => {
    if (!form.amount || !form.reason.trim()) { setError(tr.withdrawModal.required); return; }
    setSaving(true);
    try {
      await onSave({ amount: parseFloat(form.amount), reason: form.reason.trim(), date: form.date, notes: form.notes||undefined });
    } catch { setError(isAr?"حدث خطأ":"Error saving"); setSaving(false); }
  };

  return (
    <div className="modal-sheet" style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div className="modal-inner" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(192,57,43,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(192,57,43,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>💸</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.withdrawModal.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.withdrawModal.amount} half>
              <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.withdrawModal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.withdrawModal.reason}>
            <input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder={tr.withdrawModal.reasonPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          <F label={tr.withdrawModal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.withdrawModal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"13px",background:saving?"#e57373":"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(192,57,43,.25)",transition:"all .2s" }}>
            {saving?(isAr?"جاري الحفظ...":"Saving..."):tr.withdrawModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.withdrawModal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal مصروف العيادة ───────────────────────────────────────
function ExpenseModal({ lang, onSave, onClose }: { lang: string; onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({ amount:"", category:"rent", description:"", date:fmt(new Date()), notes:"" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputSt: React.CSSProperties = { width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr" };
  const catIcons: Record<string,string> = { rent:"🏢", supplies:"💊", salary:"👥", utilities:"⚡", maintenance:"🔧", other:"📋" };

  const handleSave = async () => {
    if (!form.amount || !form.description.trim()) { setError(tr.expenseModal.required); return; }
    setSaving(true);
    try {
      await onSave({ amount: parseFloat(form.amount), category: form.category, description: form.description.trim(), date: form.date, notes: form.notes||undefined });
    } catch { setError(isAr?"حدث خطأ":"Error saving"); setSaving(false); }
  };

  return (
    <div className="modal-sheet" style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div className="modal-inner" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(123,45,139,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(123,45,139,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🏪</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.expenseModal.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          {/* Category Selector */}
          <F label={tr.expenseModal.category}>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {(Object.entries(tr.expenseModal.categories) as [string, string][]).map(([k,v])=>(
                <button key={k} onClick={()=>setForm({...form,category:k})}
                  style={{ padding:"8px 14px",borderRadius:10,cursor:"pointer",border:form.category===k?"1.5px solid #7b2d8b":"1.5px solid #eee",background:form.category===k?"rgba(123,45,139,.08)":"#fafbfc",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:form.category===k?700:400,color:form.category===k?"#7b2d8b":"#888",transition:"all .2s",display:"flex",alignItems:"center",gap:6 }}>
                  <span>{catIcons[k] ?? "📋"}</span><span>{v}</span>
                </button>
              ))}
            </div>
          </F>
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.expenseModal.amount} half>
              <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt} onFocus={e=>e.target.style.borderColor="#7b2d8b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.expenseModal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#7b2d8b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.expenseModal.description}>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.expenseModal.descPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#7b2d8b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          <F label={tr.expenseModal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.expenseModal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#7b2d8b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"13px",background:saving?"#ba68c8":"#7b2d8b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(123,45,139,.25)",transition:"all .2s" }}>
            {saving?(isAr?"جاري الحفظ...":"Saving..."):tr.expenseModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.expenseModal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function PaymentsPage() {
  const [lang, setLang] = useState("ar");
  const isAr = lang==="ar";
  const tr = T[lang];

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth <= 768;
      setIsMobile(m);
      if (!m) setMobileOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── State ──────────────────────────────────────────────────
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [clinicName, setClinicName] = useState<string>("");
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteId,  setDeleteId]  = useState<number|null>(null);
  const [animIds,   setAnimIds]   = useState<number[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [expenses,    setExpenses]    = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showExpenseModal,  setShowExpenseModal]  = useState(false);
  const [reverseWithdrawalId, setReverseWithdrawalId] = useState<number|null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [plan, setPlan] = useState<PlanType>("basic");
  // خطط العيادات المشتركة: قائمة الأطباء والفلتر المحدد
  const [doctors, setDoctors] = useState<{id: number; name: string; color?: string}[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number|null>(null);

  // ── قفل صفحة المدفوعات بكلمة سر ────────────────────────────
  const [paymentsLockEnabled,  setPaymentsLockEnabled]  = useState(false);
  const [paymentsLockPassword, setPaymentsLockPassword] = useState("");
  const [isPaymentsUnlocked,   setIsPaymentsUnlocked]   = useState(false);
  const [lockPasswordInput,    setLockPasswordInput]    = useState("");
  const [lockPasswordError,    setLockPasswordError]    = useState(false);

  // ── جلب البيانات من Supabase ────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // جلب اسم العيادة من user_metadata أو clinic_profiles
      const clinicMeta = user.user_metadata?.clinic_name as string | undefined;
      if (clinicMeta) {
        setClinicName(clinicMeta);
      } else {
        // fallback: جلب من clinic_profiles
        const { data: profile } = await supabase
          .from("clinic_profiles")
          .select("clinic_name")
          .eq("id", user.id)
          .single();
        if (profile?.clinic_name) setClinicName(profile.clinic_name);
      }

      // جلب خطة العيادة دائماً — مستقلة عن مصدر الاسم
      const { data: clinicRow } = await supabase
        .from("clinics").select("name, plan, payments_lock_enabled, payments_lock_password").eq("user_id", user.id).single();
      if (clinicRow?.name && !clinicMeta) setClinicName(prev => prev || clinicRow.name);
      if (clinicRow?.plan) setPlan(clinicRow.plan as PlanType);
      // قفل المدفوعات
      if (clinicRow?.payments_lock_enabled) {
        setPaymentsLockEnabled(true);
        setPaymentsLockPassword(clinicRow.payments_lock_password || "");
      }

      const [{ data: paymentsData }, { data: patientsData }] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("patients")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_hidden", false)
          .order("name"),
      ]);

      setPayments(paymentsData || []);
      setPatients((patientsData ?? []) as unknown as Patient[]);

      // جلب قائمة الأطباء لخطط العيادات المشتركة
      const activePlan = (clinicRow?.plan as PlanType) || "basic";
      if (SHARED_CLINIC_PLANS.includes(activePlan)) {
        const { data: doctorsData } = await supabase
          .from("doctors")
          .select("id, name, color")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("id");
        setDoctors(doctorsData || []);
      }

      // جلب السحوبات والمصروفات
      const { data: withdrawalsData } = await supabase
        .from("clinic_withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setWithdrawals(withdrawalsData || []);

      const { data: expensesData } = await supabase
        .from("clinic_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setExpenses(expensesData || []);
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── فلترة وترتيب ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const patient = patients.find(x => x.id === p.patient_id);
      const q = search.toLowerCase();
      if (q && !patient?.name.toLowerCase().includes(q) && !(p.description||"").toLowerCase().includes(q)) return false;
      if (filter === "paid"    && p.status !== "paid")    return false;
      if (filter === "pending" && p.status !== "pending") return false;
      if (filter === "cash"    && p.method !== "cash")    return false;
      if (filter === "card"    && p.method !== "card")    return false;
      // فلتر الطبيب — للخطط المشتركة فقط
      if (isSharedClinicPlan(plan) && selectedDoctor !== null) {
        if ((p as any).doctor_id !== selectedDoctor) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [payments, patients, search, filter, selectedDoctor, plan]);

  const pendingPayments = useMemo(() => payments.filter(p => p.status === "pending"), [payments]);

  // ── إحصائيات ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthPayments = payments.filter(p => p.date.startsWith(thisMonth));
    const pending = payments.filter(p => p.status === "pending");
    const totalRevYear = payments.filter(p => p.status === "paid" && p.date.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.amount, 0);
    const totalWithdrawYear = withdrawals.filter(w => w.date.startsWith(String(new Date().getFullYear())) && !w.is_reversed).reduce((s, w) => s + w.amount, 0);
    const totalExpYear = expenses.filter(e => e.date.startsWith(String(new Date().getFullYear()))).reduce((s, e) => s + e.amount, 0);
    return {
      totalMonth:   monthPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      totalYear:    totalRevYear,
      paidCount:    payments.filter(p => p.status === "paid").length,
      pendingAmt:   pending.reduce((s, p) => s + p.amount, 0),
      pendingCount: pending.length,
      totalWithdrawals: totalWithdrawYear,
      totalExpenses:    totalExpYear,
      netBalance:   totalRevYear - totalWithdrawYear - totalExpYear,
    };
  }, [payments, withdrawals, expenses]);

  // ── إحصائيات طرق الدفع الحقيقية ────────────────────────────
  const methodStats = useMemo(() => {
    const total = payments.filter(p => p.status === "paid").length;
    if (total === 0) return [
      { k:"cash",     pct:0, color:"#0863ba" },
      { k:"card",     pct:0, color:"#2e7d32" },
      { k:"transfer", pct:0, color:"#e67e22" },
    ];
    const cash     = payments.filter(p => p.status === "paid" && p.method === "cash").length;
    const card     = payments.filter(p => p.status === "paid" && p.method === "card").length;
    const transfer = payments.filter(p => p.status === "paid" && p.method === "transfer").length;
    return [
      { k:"cash",     pct: Math.round((cash     / total) * 100), color:"#0863ba" },
      { k:"card",     pct: Math.round((card     / total) * 100), color:"#2e7d32" },
      { k:"transfer", pct: Math.round((transfer / total) * 100), color:"#e67e22" },
    ];
  }, [payments]);

  // ── إحصائيات الإيرادات حسب الطبيب — للخطط المشتركة فقط ─────
  const doctorRevenueStats = useMemo(() => {
    if (!isSharedClinicPlan(plan) || doctors.length === 0) return [];
    const thisMonth = new Date().toISOString().slice(0, 7);
    return doctors.map(doc => {
      const docPayments = payments.filter(p =>
        (p as any).doctor_id === doc.id && p.status === "paid" && p.date.startsWith(thisMonth)
      );
      return {
        id: doc.id,
        name: doc.name,
        color: doc.color || "#0863ba",
        monthlyRevenue: docPayments.reduce((s, p) => s + p.amount, 0),
        count: docPayments.length,
      };
    });
  }, [payments, doctors, plan]);
  const revenueData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return payments
        .filter(p => p.status === "paid" && p.date.startsWith(key))
        .reduce((s, p) => s + p.amount, 0);
    });
  }, [payments]);

  // ── إضافة دفعة جديدة ────────────────────────────────────────
  const handleSave = async (data: Omit<Payment,'id'|'user_id'|'created_at'>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inserted, error } = await supabase
        .from("payments")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      if (error) { console.error("insert payment error:", error); return; }

      setPayments(prev => [inserted, ...prev]);
      setAnimIds(prev => [...prev, inserted.id]);
      setTimeout(() => setAnimIds(prev => prev.filter(x => x !== inserted.id)), 600);
      setShowModal(false);
    } catch (err) {
      console.error("handleSave error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── تحديد كمدفوع ────────────────────────────────────────────
  const markPaid = async (id: number) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", id);

    if (!error) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "paid" } : p));
    }
  };

  // ── حذف دفعة ────────────────────────────────────────────────
  const deletePayment = async (id: number) => {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (!error) {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
    setDeleteId(null);
  };

  // ── تسجيل سحب ───────────────────────────────────────────────
  const handleWithdraw = async (data: { amount: number; reason: string; date: string; notes?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: inserted, error } = await supabase
      .from("clinic_withdrawals")
      .insert({ ...data, user_id: user.id })
      .select().single();
    if (!error && inserted) {
      setWithdrawals(prev => [inserted, ...prev]);
      setShowWithdrawModal(false);
    }
  };

  // ── التراجع عن سحب ───────────────────────────────────────────
  const reverseWithdrawal = async (id: number) => {
    const { error } = await supabase
      .from("clinic_withdrawals")
      .update({ is_reversed: true })
      .eq("id", id);
    if (!error) {
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, is_reversed: true } : w));
    }
    setReverseWithdrawalId(null);
  };

  // ── تسجيل مصروف عيادة ────────────────────────────────────────
  const handleExpense = async (data: { amount: number; category: string; description: string; date: string; notes?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: inserted, error } = await supabase
      .from("clinic_expenses")
      .insert({ ...data, user_id: user.id })
      .select().single();
    if (!error && inserted) {
      setExpenses(prev => [inserted, ...prev]);
      setShowExpenseModal(false);
    }
  };

  const statusStyle = {
    paid:      { bg:"rgba(46,125,50,.1)",    color:"#2e7d32", label:tr.statuses.paid      },
    pending:   { bg:"rgba(230,126,34,.1)",   color:"#e67e22", label:tr.statuses.pending   },
    cancelled: { bg:"rgba(192,57,43,.1)",   color:"#c0392b", label:tr.statuses.cancelled },
  };

  const methodIcon = { cash:"💵", card:"💳", transfer:"🏦" };

  const fmtDate = (d: string) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory":"en-GB",{ year:"numeric",month:"short",day:"numeric",calendar:"gregory" });

  // ── مساعد تنسيق التاريخ الميلادي للـ PDF ─────────────────────
  const fmtDateGregorian = (d: string) =>
    new Date(d+"T00:00:00").toLocaleDateString("ar-EG-u-ca-gregory", { year:"numeric", month:"short", day:"numeric" });

  // ── تصدير تقرير PDF شهري ─────────────────────────────────
  const exportPDF = () => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0,7);
    const monthPayments = payments
      .filter(p => p.date.startsWith(thisMonth))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthWithdrawals = withdrawals
      .filter(w => w.date.startsWith(thisMonth))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthExpenses = expenses
      .filter(e => e.date.startsWith(thisMonth))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthName = now.toLocaleDateString("ar-EG-u-ca-gregory", { year:"numeric", month:"long" });
    const totalPaid = monthPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
    const totalPending = monthPayments.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0);
    const totalWD = monthWithdrawals.reduce((s,w)=>s+w.amount,0);
    const totalEX = monthExpenses.reduce((s,e)=>s+e.amount,0);
    const netBalance = totalPaid - totalWD - totalEX;

    const paymentRows = monthPayments.map(p => {
      const patient = patients.find(x=>x.id===p.patient_id);
      const statusMap: Record<string,string> = { paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" };
      const methodMap: Record<string,string> = { cash:"نقداً", card:"بطاقة", transfer:"تحويل" };
      return `<tr>
        <td>${fmtDateGregorian(p.date)}</td>
        <td>${patient?.name || "—"}</td>
        <td>${p.description}</td>
        <td>${methodMap[p.method] || p.method}</td>
        <td class="status-${p.status}">${statusMap[p.status] || p.status}</td>
        <td class="amount-green">+${p.amount.toLocaleString()} ل.س</td>
      </tr>`;
    }).join("");

    const withdrawalRows = monthWithdrawals.length > 0 ? monthWithdrawals.map(w => `<tr>
        <td>${fmtDateGregorian(w.date)}</td>
        <td colspan="3">${w.reason}</td>
        <td><span style="background:rgba(192,57,43,.1);color:#c0392b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">سحب</span></td>
        <td class="amount-red">-${w.amount.toLocaleString()} ل.س</td>
      </tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa;font-style:italic">لا توجد سحوبات هذا الشهر</td></tr>`;

    const catLabelsAr: Record<string,string> = { rent:"إيجار", supplies:"مستلزمات طبية", salary:"رواتب موظفين", utilities:"فواتير كهرباء/ماء", maintenance:"صيانة", other:"أخرى" };
    const expenseRows = monthExpenses.length > 0 ? monthExpenses.map(e => `<tr>
        <td>${fmtDateGregorian(e.date)}</td>
        <td colspan="2">${e.description}</td>
        <td>${catLabelsAr[e.category] || e.category}</td>
        <td><span style="background:rgba(123,45,139,.1);color:#7b2d8b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">مصروف</span></td>
        <td class="amount-purple">-${e.amount.toLocaleString()} ل.س</td>
      </tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa;font-style:italic">لا توجد مصروفات هذا الشهر</td></tr>`;

    const svgLogo = `<svg viewBox="0 0 337.74 393.31" style="width:44px;height:44px" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
            <stop offset=".3" stop-color="#0863ba"/><stop offset=".69" stop-color="#5694cf"/>
          </linearGradient>
          <linearGradient id="g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#5694cf"/><stop offset=".68" stop-color="#a4c4e4"/>
          </linearGradient>
        </defs>
        <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
        <path fill="url(#g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
        <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
        <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
        <path fill="url(#g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
      </svg>`;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>تقرير المدفوعات - ${monthName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Rubik', 'Arial', sans-serif; direction: rtl; background: #fff; color: #222; padding: 32px; font-size: 13px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0863ba; padding-bottom: 18px; margin-bottom: 24px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-text { font-size: 26px; font-weight: 800; color: #0863ba; }
  .logo-sub { font-size: 12px; color: #888; }
  .report-title { text-align: left; }
  .report-title h1 { font-size: 18px; font-weight: 800; color: #353535; }
  .report-title p { font-size: 12px; color: #888; margin-top: 4px; }
  .stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 24px; }
  .stat { background: #f7f9fc; border-radius: 10px; padding: 12px 14px; border: 1.5px solid #eef0f3; }
  .stat-val { font-size: 17px; font-weight: 800; }
  .stat-label { font-size: 10px; color: #888; margin-top: 4px; }
  .green { color: #2e7d32; } .orange { color: #e67e22; } .blue { color: #0863ba; } .red { color: #c0392b; } .purple { color: #7b2d8b; }
  .section-title { font-size: 14px; font-weight: 800; color: #353535; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid; display: flex; align-items: center; gap: 8px; }
  .section-income { border-color: #2e7d32; }
  .section-withdraw { border-color: #c0392b; }
  .section-expense { border-color: #7b2d8b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  thead tr { color: #fff; }
  thead.income-head tr { background: #0863ba; }
  thead.withdraw-head tr { background: #c0392b; }
  thead.expense-head tr { background: #7b2d8b; }
  th { padding: 9px 12px; text-align: right; font-size: 11px; font-weight: 700; }
  td { padding: 8px 12px; border-bottom: 1px solid #eef0f3; font-size: 11px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .amount-green { font-weight: 700; color: #2e7d32; }
  .amount-red { font-weight: 700; color: #c0392b; }
  .amount-purple { font-weight: 700; color: #7b2d8b; }
  .status-paid { color: #2e7d32; font-weight: 600; }
  .status-pending { color: #e67e22; font-weight: 600; }
  .status-cancelled { color: #c0392b; font-weight: 600; }
  .total-row td { font-weight: 800; background: #f0f7ff !important; color: #0863ba; border-top: 2px solid #0863ba; }
  .net-box { margin-top: 20px; padding: 16px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
  .net-positive { background: linear-gradient(135deg,#e8f5e9,#f1f8e9); border: 2px solid #2e7d32; }
  .net-negative { background: linear-gradient(135deg,#ffebee,#fce4ec); border: 2px solid #c0392b; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #eef0f3; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      ${svgLogo}
      <div>
        <div class="logo-text">نبض</div>
        <div class="logo-sub">${clinicName || "نظام إدارة العيادة"}</div>
      </div>
    </div>
    <div class="report-title">
      <h1>التقرير المالي الشهري</h1>
      ${clinicName ? `<p style="font-size:14px;font-weight:700;color:#353535;margin-bottom:2px">${clinicName}</p>` : ""}
      <p>${monthName}</p>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-val green">+${totalPaid.toLocaleString()} ل.س</div>
      <div class="stat-label">إجمالي الدخل المدفوع</div>
    </div>
    <div class="stat">
      <div class="stat-val orange">${totalPending.toLocaleString()} ل.س</div>
      <div class="stat-label">إجمالي المعلّق</div>
    </div>
    <div class="stat">
      <div class="stat-val red">-${totalWD.toLocaleString()} ل.س</div>
      <div class="stat-label">إجمالي السحوبات</div>
    </div>
    <div class="stat">
      <div class="stat-val purple">-${totalEX.toLocaleString()} ل.س</div>
      <div class="stat-label">مصروفات العيادة</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${monthPayments.length + monthWithdrawals.length + monthExpenses.length}</div>
      <div class="stat-label">إجمالي الحركات</div>
    </div>
  </div>

  <!-- قسم الدخل -->
  <div class="section-title section-income">💰 حركة الدفع — المدفوعات والمستحقات</div>
  <table>
    <thead class="income-head">
      <tr>
        <th>التاريخ</th><th>المريض</th><th>الوصف</th><th>طريقة الدفع</th><th>الحالة</th><th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${paymentRows || `<tr><td colspan="6" style="text-align:center;color:#aaa;font-style:italic">لا توجد مدفوعات هذا الشهر</td></tr>`}
      <tr class="total-row">
        <td colspan="5">الإجمالي المدفوع</td>
        <td>+${totalPaid.toLocaleString()} ل.س</td>
      </tr>
    </tbody>
  </table>

  <!-- قسم السحوبات -->
  <div class="section-title section-withdraw">💸 حركة السحوبات</div>
  <table>
    <thead class="withdraw-head">
      <tr>
        <th>التاريخ</th><th colspan="3">سبب السحب</th><th>النوع</th><th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${withdrawalRows}
      ${monthWithdrawals.length > 0 ? `<tr class="total-row"><td colspan="5" style="color:#c0392b">إجمالي السحوبات</td><td style="color:#c0392b">-${totalWD.toLocaleString()} ل.س</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم المصروفات -->
  <div class="section-title section-expense">🏪 حركة مصروفات العيادة</div>
  <table>
    <thead class="expense-head">
      <tr>
        <th>التاريخ</th><th colspan="2">الوصف</th><th>التصنيف</th><th>النوع</th><th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${expenseRows}
      ${monthExpenses.length > 0 ? `<tr class="total-row"><td colspan="5" style="color:#7b2d8b">إجمالي المصروفات</td><td style="color:#7b2d8b">-${totalEX.toLocaleString()} ل.س</td></tr>` : ""}
    </tbody>
  </table>

  <!-- الرصيد الصافي -->
  <div class="net-box ${netBalance >= 0 ? "net-positive" : "net-negative"}">
    <div>
      <div style="font-size:13px;font-weight:700;color:#555">الرصيد الصافي للشهر</div>
      <div style="font-size:11px;color:#888;margin-top:2px">الدخل المدفوع − السحوبات − المصروفات</div>
    </div>
    <div style="font-size:24px;font-weight:900;color:${netBalance >= 0 ? "#2e7d32" : "#c0392b"}">
      ${netBalance >= 0 ? "+" : ""}${netBalance.toLocaleString()} ل.س
    </div>
  </div>

  <div class="footer">
    <span>نبض${clinicName ? " — " + clinicName : " — نظام إدارة العيادة"}</span>
    <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG-u-ca-gregory", { year:"numeric", month:"long", day:"numeric" })}</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 500);
    }
  };

  // ── تصدير تقرير PDF يومي ─────────────────────────────────
  const exportDailyPDF = () => {
    const now = new Date();
    const todayStr = fmt(now);

    const todayPayments = payments
      .filter(p => p.date === todayStr)
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const todayWithdrawals = withdrawals
      .filter(w => w.date === todayStr)
      .sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

    const todayExpenses = expenses
      .filter(e => e.date === todayStr)
      .sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

    const dayLabel = now.toLocaleDateString("ar-EG-u-ca-gregory", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    const totalPaid    = todayPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
    const totalPending = todayPayments.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0);
    const totalWD      = todayWithdrawals.filter(w=>!w.is_reversed).reduce((s,w)=>s+w.amount,0);
    const totalEX      = todayExpenses.reduce((s,e)=>s+e.amount,0);
    const netBalance   = totalPaid - totalWD - totalEX;

    const methodMapAr:Record<string,string> = { cash:"نقداً", card:"بطاقة", transfer:"تحويل" };
    const statusMapAr:Record<string,string> = { paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" };
    const catLabelsAr: Record<string,string> = { rent:"إيجار", supplies:"مستلزمات طبية", salary:"رواتب موظفين", utilities:"فواتير كهرباء/ماء", maintenance:"صيانة", other:"أخرى" };

    const paymentRows = todayPayments.length > 0
      ? todayPayments.map(p => {
          const patient = patients.find(x=>x.id===p.patient_id);
          return `<tr>
            <td>${patient?.name || "—"}</td>
            <td>${p.description}</td>
            <td>${methodMapAr[p.method] || p.method}</td>
            <td class="status-${p.status}">${statusMapAr[p.status] || p.status}</td>
            <td class="amount-green">+${p.amount.toLocaleString()} ل.س</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa;font-style:italic;padding:16px">لا توجد مدفوعات اليوم</td></tr>`;

    const withdrawalRows = todayWithdrawals.length > 0
      ? todayWithdrawals.map(w => `<tr>
          <td colspan="3">${w.reason}${w.is_reversed ? ' <span style="color:#bbb;font-size:10px">(مُلغى)</span>' : ""}</td>
          <td><span style="background:rgba(192,57,43,.1);color:#c0392b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">سحب</span></td>
          <td class="${w.is_reversed?"":"amount-red"}" style="${w.is_reversed?"color:#bbb;text-decoration:line-through":""}">-${w.amount.toLocaleString()} ل.س</td>
        </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa;font-style:italic;padding:16px">لا توجد سحوبات اليوم</td></tr>`;

    const expenseRows = todayExpenses.length > 0
      ? todayExpenses.map(e => `<tr>
          <td colspan="2">${e.description}</td>
          <td>${catLabelsAr[e.category] || e.category}</td>
          <td><span style="background:rgba(123,45,139,.1);color:#7b2d8b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">مصروف</span></td>
          <td class="amount-purple">-${e.amount.toLocaleString()} ل.س</td>
        </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa;font-style:italic;padding:16px">لا توجد مصروفات اليوم</td></tr>`;

    const svgLogo = `<svg viewBox="0 0 337.74 393.31" style="width:44px;height:44px" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
            <stop offset=".3" stop-color="#0863ba"/><stop offset=".69" stop-color="#5694cf"/>
          </linearGradient>
          <linearGradient id="g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#5694cf"/><stop offset=".68" stop-color="#a4c4e4"/>
          </linearGradient>
        </defs>
        <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
        <path fill="url(#g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
        <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
        <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
        <path fill="url(#g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
      </svg>`;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>التقرير اليومي - ${todayStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Rubik', 'Arial', sans-serif; direction: rtl; background: #fff; color: #222; padding: 32px; font-size: 13px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0863ba; padding-bottom: 18px; margin-bottom: 24px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-text { font-size: 26px; font-weight: 800; color: #0863ba; }
  .logo-sub { font-size: 12px; color: #888; }
  .report-title { text-align: left; }
  .report-title h1 { font-size: 18px; font-weight: 800; color: #353535; }
  .report-title .day-badge { display:inline-block; margin-top:6px; padding:4px 14px; background:linear-gradient(135deg,#e8f4fd,#d0e9ff); border:1.5px solid #a4c4e4; border-radius:20px; font-size:12px; font-weight:700; color:#0863ba; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .stat { border-radius: 12px; padding: 14px 16px; border: 1.5px solid; }
  .stat-income  { background:#f0faf0; border-color:#a5d6a7; }
  .stat-pending { background:#fff8f0; border-color:#ffcc80; }
  .stat-withdraw{ background:#fff0f0; border-color:#ef9a9a; }
  .stat-expense { background:#f8f0ff; border-color:#ce93d8; }
  .stat-val { font-size: 20px; font-weight: 800; }
  .stat-label { font-size: 10px; color: #888; margin-top: 5px; }
  .green { color: #2e7d32; } .orange { color: #e67e22; } .red { color: #c0392b; } .purple { color: #7b2d8b; } .blue { color: #0863ba; }
  .section-title { font-size: 14px; font-weight: 800; color: #353535; margin: 22px 0 10px; padding-bottom: 7px; border-bottom: 2px solid; display: flex; align-items: center; gap: 8px; }
  .section-income   { border-color: #2e7d32; }
  .section-withdraw { border-color: #c0392b; }
  .section-expense  { border-color: #7b2d8b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  thead tr { color: #fff; }
  thead.income-head tr   { background: #0863ba; }
  thead.withdraw-head tr { background: #c0392b; }
  thead.expense-head tr  { background: #7b2d8b; }
  th { padding: 9px 12px; text-align: right; font-size: 11px; font-weight: 700; }
  td { padding: 9px 12px; border-bottom: 1px solid #eef0f3; font-size: 12px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .amount-green  { font-weight: 700; color: #2e7d32; }
  .amount-red    { font-weight: 700; color: #c0392b; }
  .amount-purple { font-weight: 700; color: #7b2d8b; }
  .status-paid      { color: #2e7d32; font-weight: 600; }
  .status-pending   { color: #e67e22; font-weight: 600; }
  .status-cancelled { color: #c0392b; font-weight: 600; }
  .total-row td { font-weight: 800; background: #f0f7ff !important; color: #0863ba; border-top: 2px solid #0863ba; }
  .net-box { margin-top: 24px; padding: 20px 24px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; }
  .net-positive { background: linear-gradient(135deg,#e8f5e9,#f1f8e9); border: 2px solid #2e7d32; }
  .net-negative { background: linear-gradient(135deg,#ffebee,#fce4ec); border: 2px solid #c0392b; }
  .net-label { font-size: 14px; font-weight: 700; color: #555; }
  .net-sub   { font-size: 11px; color: #888; margin-top: 3px; }
  .net-val   { font-size: 28px; font-weight: 900; }
  .summary-row { display:flex; gap:8px; margin-bottom:6px; font-size:12px; align-items:center; }
  .dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #eef0f3; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      ${svgLogo}
      <div>
        <div class="logo-text">نبض</div>
        <div class="logo-sub">${clinicName || "نظام إدارة العيادة"}</div>
      </div>
    </div>
    <div class="report-title">
      <h1>التقرير اليومي للعيادة</h1>
      ${clinicName ? `<div style="font-size:13px;font-weight:700;color:#353535;margin-top:3px">${clinicName}</div>` : ""}
      <div class="day-badge">📅 ${dayLabel}</div>
    </div>
  </div>

  <!-- إحصائيات سريعة -->
  <div class="stats">
    <div class="stat stat-income">
      <div class="stat-val green">+${totalPaid.toLocaleString()} ل.س</div>
      <div class="stat-label">💰 إجمالي الدخل اليوم</div>
    </div>
    <div class="stat stat-pending">
      <div class="stat-val orange">${totalPending.toLocaleString()} ل.س</div>
      <div class="stat-label">⏳ مستحقات معلّقة</div>
    </div>
    <div class="stat stat-withdraw">
      <div class="stat-val red">-${totalWD.toLocaleString()} ل.س</div>
      <div class="stat-label">💸 سحوبات اليوم</div>
    </div>
    <div class="stat stat-expense">
      <div class="stat-val purple">-${totalEX.toLocaleString()} ل.س</div>
      <div class="stat-label">🏪 مصروفات اليوم</div>
    </div>
  </div>

  <!-- قسم المدفوعات -->
  <div class="section-title section-income">💰 المدفوعات والمستحقات — اليوم</div>
  <table>
    <thead class="income-head">
      <tr><th>المريض</th><th>الوصف</th><th>طريقة الدفع</th><th>الحالة</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${paymentRows}
      ${todayPayments.length > 0 ? `<tr class="total-row"><td colspan="4">الإجمالي المدفوع</td><td>+${totalPaid.toLocaleString()} ل.س</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم السحوبات -->
  <div class="section-title section-withdraw">💸 سحوبات اليوم</div>
  <table>
    <thead class="withdraw-head">
      <tr><th colspan="3">سبب السحب</th><th>النوع</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${withdrawalRows}
      ${todayWithdrawals.filter(w=>!w.is_reversed).length > 0 ? `<tr class="total-row"><td colspan="4" style="color:#c0392b">إجمالي السحوبات</td><td style="color:#c0392b">-${totalWD.toLocaleString()} ل.س</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم المصروفات -->
  <div class="section-title section-expense">🏪 مصروفات العيادة — اليوم</div>
  <table>
    <thead class="expense-head">
      <tr><th colspan="2">الوصف</th><th>التصنيف</th><th>النوع</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${expenseRows}
      ${todayExpenses.length > 0 ? `<tr class="total-row"><td colspan="4" style="color:#7b2d8b">إجمالي المصروفات</td><td style="color:#7b2d8b">-${totalEX.toLocaleString()} ل.س</td></tr>` : ""}
    </tbody>
  </table>

  <!-- الرصيد اليومي الصافي -->
  <div class="net-box ${netBalance >= 0 ? "net-positive" : "net-negative"}">
    <div>
      <div class="net-label">${netBalance >= 0 ? "✅" : "⚠️"} الحساب اليومي الصافي</div>
      <div class="net-sub">الدخل المدفوع (${totalPaid.toLocaleString()}) − السحوبات (${totalWD.toLocaleString()}) − المصروفات (${totalEX.toLocaleString()})</div>
    </div>
    <div class="net-val" style="color:${netBalance >= 0 ? "#2e7d32" : "#c0392b"}">
      ${netBalance >= 0 ? "+" : ""}${netBalance.toLocaleString()} ل.س
    </div>
  </div>

  <div class="footer">
    <span>نبض${clinicName ? " — " + clinicName : " — نظام إدارة العيادة"}</span>
    <span>وقت الطباعة: ${now.toLocaleString("ar-EG-u-ca-gregory", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 500);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{overflow-x:hidden;max-width:100vw}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rowPop{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-anim{animation:fadeUp .4s ease both}
        .tx-row{transition:background .15s;border-bottom:1px solid #f0f2f5}
        .tx-row:last-child{border-bottom:none}
        .tx-row:hover{background:#fafbff}
        .filter-chip{padding:7px 16px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .icon-btn{width:30px;height:30px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .stat-big{background:#fff;border-radius:18px;padding:22px 24px;border:1.5px solid #eef0f3;box-shadow:0 2px 16px rgba(8,99,186,.06);position:relative;overflow:hidden}
        .pending-row{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:#fff;border:1.5px solid #eef0f3;margin-bottom:10px;transition:all .2s}
        .pending-row:hover{border-color:rgba(230,126,34,.3);box-shadow:0 4px 12px rgba(230,126,34,.08)}
        /* desktop table header */
        .desktop-table-header{display:grid}
        /* mobile tx cards */
        .mobile-tx{display:none}
        .desktop-tx{display:grid}
        /* ── Stats Slider (mobile) ── */
        .stats-slider-wrap{display:none}
        .stats-slider-track{display:flex;gap:12px;padding:4px 2px 14px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .stats-slider-track::-webkit-scrollbar{display:none}
        .stats-slider-track .stat-big{min-width:75vw;max-width:78vw;scroll-snap-align:start;flex-shrink:0}
        .stats-slider-dots{display:flex;justify-content:center;gap:6px;margin-top:2px;margin-bottom:16px}
        .stats-slider-dots span{width:6px;height:6px;border-radius:50%;background:#dce2ec;transition:all .25s;display:inline-block}
        .stats-slider-dots span.active{background:#0863ba;width:18px;border-radius:3px}
        /* ── Financial summary — stack on mobile ── */
        .fin-summary-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px}
        @media(max-width:768px){
          /* Fix sidebar overlap — sidebar is position:fixed so main needs no margin */
          .main-content{
            margin-left:0!important;
            margin-right:0!important;
            padding:0 14px 100px!important;
            width:100%!important;
            max-width:100vw!important;
            box-sizing:border-box!important;
          }
          .topbar-inner{
            padding-left:${isAr?"0":"52px"}!important;
            padding-right:${isAr?"52px":"0"}!important;
            flex-wrap:wrap!important;
            gap:8px!important;
          }
          /* Topbar buttons — icon-only on mobile */
          .page-title{font-size:18px!important}
          .page-sub{display:none!important}
          .export-btn{display:none!important}
          .add-btn-text-full{display:none!important}
          .add-btn-text-short{display:inline!important}
          .add-btn{
            padding:11px 18px!important;
            font-size:14px!important;
            border-radius:14px!important;
            min-height:46px!important;
          }
          /* Topbar secondary buttons — icon only */
          .topbar-secondary-btn .btn-label{display:none!important}
          .topbar-secondary-btn{
            width:46px!important;
            height:46px!important;
            padding:0!important;
            justify-content:center!important;
            border-radius:14px!important;
            flex-shrink:0!important;
          }
          .topbar-secondary-btn svg{margin:0!important}
          /* Hide desktop stats grid, show slider */
          .stats-grid{display:none!important}
          .stats-slider-wrap{display:block!important}
          .stat-big{padding:18px 20px!important;border-radius:16px!important}
          .stat-big .stat-val{font-size:22px!important}
          /* Financial summary — 1 column on mobile */
          .fin-summary-grid{grid-template-columns:1fr!important;gap:10px!important}
          /* Main grid */
          .main-grid{grid-template-columns:1fr!important}
          /* Filter chips */
          .filter-chips-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap!important;padding-bottom:4px}
          .filter-chips-wrap::-webkit-scrollbar{display:none}
          .filter-chip{padding:9px 18px!important;font-size:13px!important;min-height:42px!important}
          /* Table */
          .desktop-table-header{display:none!important}
          .mobile-tx{display:block!important}
          .desktop-tx{display:none!important}
          /* Topbar padding */
          .topbar-pad{padding:12px 0!important}
          /* Touch targets */
          .icon-btn{width:40px!important;height:40px!important;font-size:15px!important;border-radius:10px!important}
          .tx-row{padding:16px 14px!important}
          .pending-row{padding:14px 14px!important}
          /* Modal — bottom sheet on mobile */
          .modal-sheet{align-items:flex-end!important}
          .modal-inner{
            border-radius:24px 24px 0 0!important;
            max-height:93vh!important;
            width:100%!important;
            max-width:100%!important;
          }
          .modal-inner-center{
            border-radius:20px!important;
            margin:16px!important;
            max-width:calc(100% - 32px)!important;
            width:calc(100% - 32px)!important;
            max-height:88vh!important;
          }
          /* Shared clinic filter bar */
          .shared-bar{flex-direction:column!important;align-items:flex-start!important}
        }
        @media(min-width:769px){
          .main-content{margin-${isAr?"right":"left"}:240px;padding:0 32px 48px}
          .add-btn-text-short{display:none!important}
          .stats-slider-wrap{display:none!important}
          .stats-grid{display:grid!important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang} isMobile={isMobile} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} plan={plan}/>

        <main className="page-anim main-content" style={{ transition:"margin .3s" }}>

          {/* ── شاشة "غير متاح في الخطة الأساسية" ── */}
          {!loading && !canAccess("payments", plan) && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center",gap:16 }}>
              <div style={{ fontSize:64 }}>🔒</div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>
                {isAr ? "إدارة المدفوعات غير متاحة في خطتك الحالية" : "Payments Not Available in Your Plan"}
              </h2>
              <p style={{ fontSize:14,color:"#888",maxWidth:420,lineHeight:1.8 }}>
                {isAr
                  ? "الخطة الأساسية (فردية أو مشتركة) لا تتضمن ميزة إدارة المدفوعات. هذه الميزة متاحة في الخطة الاحترافية والشاملة."
                  : "The Basic plan (individual or shared) does not include payment management. This feature is available in the Professional and Comprehensive plans."}
              </p>
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:4 }}>
                <div style={{ padding:"10px 20px",background:"rgba(123,45,139,.08)",border:"1.5px solid rgba(123,45,139,.2)",borderRadius:12,fontSize:13,color:"#7b2d8b",fontWeight:600 }}>
                  ✅ {isAr?"الاحترافية — فردي أو مشترك":"Professional — Individual or Shared"}
                </div>
                <div style={{ padding:"10px 20px",background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontSize:13,color:"#e67e22",fontWeight:600 }}>
                  ✅ {isAr?"الشاملة — فردي أو مشترك":"Comprehensive — Individual or Shared"}
                </div>
              </div>
              <a href="https://wa.me/963998285483" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",background:"#25D366",color:"#fff",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:"0 4px 16px rgba(37,211,102,.35)",marginTop:8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.535 5.847L.057 23.882l6.196-1.447A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.214-3.68.859.925-3.585-.234-.369A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
                {isAr ? "تواصل معنا للترقية" : "Contact Us to Upgrade"}
              </a>
            </div>
          )}

          {/* ── شاشة كلمة سر المدفوعات (قفل مفعّل + غير مفتوح بعد) ── */}
          {!loading && canAccess("payments", plan) && paymentsLockEnabled && !isPaymentsUnlocked && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center",gap:0 }}>
              <div style={{ background:"#fff",borderRadius:24,border:"1.5px solid #eef0f3",boxShadow:"0 8px 40px rgba(8,99,186,.1)",padding:"40px 36px",maxWidth:380,width:"100%",animation:"modalIn .3s ease" }}>
                <div style={{ fontSize:52,marginBottom:16 }}>🔐</div>
                <h2 style={{ fontSize:20,fontWeight:800,color:"#353535",marginBottom:8 }}>
                  {tr.paymentsLock.title}
                </h2>
                <p style={{ fontSize:13,color:"#aaa",lineHeight:1.7,marginBottom:24 }}>
                  {tr.paymentsLock.desc}
                </p>
                <div style={{ position:"relative",marginBottom:12 }}>
                  <input
                    type="password"
                    value={lockPasswordInput}
                    onChange={e => { setLockPasswordInput(e.target.value); setLockPasswordError(false); }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        if (lockPasswordInput === paymentsLockPassword) {
                          setIsPaymentsUnlocked(true);
                        } else {
                          setLockPasswordError(true);
                          setLockPasswordInput("");
                        }
                      }
                    }}
                    placeholder={tr.paymentsLock.placeholder}
                    autoFocus
                    style={{ width:"100%",padding:"13px 16px",border:`1.5px solid ${lockPasswordError?"#c0392b":"#e8eaed"}`,borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,color:"#353535",background:lockPasswordError?"rgba(192,57,43,.04)":"#fafbfc",outline:"none",transition:"border .2s",boxSizing:"border-box",direction:isAr?"rtl":"ltr" }}
                    onFocus={e => { if (!lockPasswordError) e.target.style.borderColor="#0863ba"; }}
                    onBlur={e => { if (!lockPasswordError) e.target.style.borderColor="#e8eaed"; }}
                  />
                </div>
                {lockPasswordError && (
                  <div style={{ fontSize:12,color:"#c0392b",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                    ⚠️ {tr.paymentsLock.error}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (lockPasswordInput === paymentsLockPassword) {
                      setIsPaymentsUnlocked(true);
                    } else {
                      setLockPasswordError(true);
                      setLockPasswordInput("");
                    }
                  }}
                  style={{ width:"100%",padding:"13px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background="#044d96"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background="#0863ba"; }}
                >
                  {tr.paymentsLock.submit}
                </button>
              </div>
            </div>
          )}

          {/* ── المحتوى الكامل — للاحترافية والشاملة فقط + بعد فتح القفل إن كان مفعلاً ── */}
          {canAccess("payments", plan) && (!paymentsLockEnabled || isPaymentsUnlocked) && (<>

          {/* TOP BAR */}
          <div className="topbar-pad" style={{ position:"sticky",top:0,zIndex:30,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div className="topbar-inner" style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 className="page-title" style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                <p className="page-sub" style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button className="export-btn" onClick={exportPDF} style={{ padding:"10px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid #d0e4f7",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all .2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#f0f7ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#fff"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {tr.exportBtn} PDF
                </button>
                <button onClick={exportDailyPDF} className="topbar-secondary-btn" style={{ padding:"10px 18px",background:"#fff",color:"#2e7d32",border:"1.5px solid #c8e6c9",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all .2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#f0faf0"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#fff"; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span className="btn-label">{tr.exportDailyBtn}</span>
                </button>
                {/* زر مصروف العيادة */}
                <button onClick={()=>setShowExpenseModal(true)} className="topbar-secondary-btn"
                  style={{ display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"rgba(123,45,139,.06)",color:"#7b2d8b",border:"1.5px solid rgba(123,45,139,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}
                  onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(123,45,139,.12)";}}
                  onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(123,45,139,.06)";}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
                  <span className="btn-label add-btn-text-full">{tr.expenseBtn}</span>
                </button>
                {/* زر السحب */}
                <button onClick={()=>setShowWithdrawModal(true)} className="topbar-secondary-btn"
                  style={{ display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"rgba(192,57,43,.06)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}
                  onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(192,57,43,.12)";}}
                  onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(192,57,43,.06)";}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span className="btn-label add-btn-text-full">{tr.withdrawBtn}</span>
                </button>
                <button className="add-btn" onClick={()=>setShowModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(46,125,50,.25)",transition:"all .2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#1b5e20"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#2e7d32"; }}
                >
                  <span style={{ fontSize:18 }}>＋</span>
                  <span className="add-btn-text-full">{tr.recordPayment}</span>
                  <span className="add-btn-text-short">{isAr?"دفعة":"Add"}</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* ── شريط الخطة المشتركة ── */}
            {isSharedClinicPlan(plan) && (
              <div style={{ marginBottom:20,padding:"14px 20px",background:"linear-gradient(135deg,rgba(14,124,106,.06),rgba(181,69,27,.06))",border:"1.5px solid rgba(14,124,106,.2)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:38,height:38,background:"rgba(14,124,106,.12)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🏥</div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:800,color:PLAN_BADGE[plan].color }}>
                      {PLAN_BADGE[plan].label[lang as "ar"|"en"]}
                      {" · "}
                      <span style={{ fontSize:11,fontWeight:500,color:"#888" }}>
                        {tr.sharedClinic.planLimits[plan as keyof typeof tr.sharedClinic.planLimits] ?? `${CLINIC_PLAN_DOCTOR_LIMITS[plan] ?? "?"} ${isAr?"أطباء":"doctors"}`}
                      </span>
                    </div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                      {isAr
                        ? `${doctors.length} ${isAr?"طبيب مسجّل":"registered"} · ${tr.sharedClinic.planPricing[plan as keyof typeof tr.sharedClinic.planPricing] ?? ""}`
                        : `${doctors.length} registered doctor(s) · ${tr.sharedClinic.planPricing[plan as keyof typeof tr.sharedClinic.planPricing] ?? ""}`}
                    </div>
                  </div>
                </div>
                {/* فلتر سريع بالطبيب */}
                {doctors.length > 0 && (
                  <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                    <span style={{ fontSize:12,color:"#888",fontWeight:600 }}>
                      {tr.sharedClinic.filterByDoctor}:
                    </span>
                    <button
                      onClick={() => setSelectedDoctor(null)}
                      style={{ padding:"5px 12px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif",
                        borderColor: selectedDoctor===null ? "#0891b2" : "#e0e0e0",
                        background: selectedDoctor===null ? "rgba(8,145,178,.1)" : "#fff",
                        color: selectedDoctor===null ? "#0891b2" : "#888",
                      }}>
                      {tr.sharedClinic.allDoctors}
                    </button>
                    {doctors.map(doc => (
                      <button key={doc.id}
                        onClick={() => setSelectedDoctor(selectedDoctor===doc.id ? null : doc.id)}
                        style={{ padding:"5px 12px",borderRadius:20,border:"1.5px solid",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif",display:"flex",alignItems:"center",gap:5,
                          borderColor: selectedDoctor===doc.id ? "#0891b2" : "#e0e0e0",
                          background: selectedDoctor===doc.id ? "rgba(8,145,178,.1)" : "#fff",
                          color: selectedDoctor===doc.id ? "#0891b2" : "#888",
                        }}>
                        <div style={{ width:16,height:16,borderRadius:4,background:doc.color||"#0891b2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff" }}>
                          {getInitials(doc.name)}
                        </div>
                        {isAr ? "د. " : "Dr. "}{doc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:24 }}>
              {/* Monthly Revenue - big card */}
              <div className="stat-big" style={{ gridColumn:"span 1",animation:"fadeUp .4s 0ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#2e7d32,#66bb6a)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>💰</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#2e7d32",lineHeight:1 }}>
                  {stats.totalMonth.toLocaleString()} ل.س
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalMonth}</div>
                <div style={{ fontSize:11,color:"#2e7d32",marginTop:4,fontWeight:600 }}>↑ 12% {tr.stats.vsLast}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 60ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#0863ba,#a4c4e4)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(8,99,186,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>📊</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#0863ba",lineHeight:1 }}>
                  {stats.totalYear.toLocaleString()} ل.س
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalYear}</div>
                <div style={{ fontSize:11,color:"#888",marginTop:4 }}>{stats.paidCount} {tr.stats.transactions}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 120ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#e67e22,#f39c12)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(230,126,34,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>⏳</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#e67e22",lineHeight:1 }}>
                  {stats.pendingAmt.toLocaleString()} ل.س
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.pending}</div>
                <div style={{ fontSize:11,color:"#e67e22",marginTop:4,fontWeight:600 }}>{stats.pendingCount} {tr.stats.unpaidCount}</div>
              </div>

              {/* Donut-style payment methods */}
              <div className="stat-big" style={{ animation:"fadeUp .4s 180ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#7b2d8b,#a855f7)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
                  {isAr?"طرق الدفع":"Payment Methods"}
                </div>
                {[
                  ...methodStats,
                ].map(m=>(
                  <div key={m.k} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:12,color:"#666" }}>{methodIcon[m.k]} {tr.methods[m.k]}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:m.color }}>{m.pct}%</span>
                    </div>
                    <div style={{ height:5,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${m.pct}%`,background:m.color,borderRadius:10,transition:"width .8s" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MOBILE STATS SLIDER ── */}
            <MobileStatsSlider stats={stats} methodStats={methodStats} methodIcon={methodIcon} tr={tr} isAr={isAr} />

            {/* ── FINANCIAL SUMMARY ROW ── */}
            <div className="fin-summary-grid">
              {/* الرصيد الصافي */}
              <div style={{ background: stats.netBalance >= 0 ? "linear-gradient(135deg,#1b5e20,#2e7d32)" : "linear-gradient(135deg,#b71c1c,#c0392b)",borderRadius:16,padding:"20px 24px",color:"#fff",position:"relative",overflow:"hidden",boxShadow: stats.netBalance >= 0 ? "0 4px 24px rgba(46,125,50,.25)":"0 4px 24px rgba(192,57,43,.25)" }}>
                <div style={{ position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.06)" }}/>
                <div style={{ fontSize:12,fontWeight:600,opacity:.8,marginBottom:10 }}>{tr.netBalance} ({isAr?"السنة الحالية":"Current Year"})</div>
                <div style={{ fontSize:28,fontWeight:900,lineHeight:1 }}>{stats.netBalance.toLocaleString()} ل.س</div>
                <div style={{ fontSize:11,opacity:.7,marginTop:8 }}>{isAr?"الإيرادات - السحوبات - المصروفات":"Revenue - Withdrawals - Expenses"}</div>
              </div>
              {/* إجمالي السحوبات */}
              <div style={{ background:"#fff",borderRadius:16,padding:"20px 24px",border:"1.5px solid rgba(192,57,43,.15)",position:"relative",overflow:"hidden",boxShadow:"0 2px 12px rgba(192,57,43,.06)" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:"#888" }}>{tr.totalWithdrawals}</span>
                  <button onClick={()=>setShowWithdrawModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(192,57,43,.08)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.withdrawBtn}</button>
                </div>
                <div style={{ fontSize:26,fontWeight:900,color:"#c0392b" }}>{stats.totalWithdrawals.toLocaleString()} ل.س</div>
                <div style={{ fontSize:11,color:"#aaa",marginTop:6 }}>{withdrawals.length} {isAr?"عملية سحب":"withdrawals"}</div>
              </div>
              {/* مصروفات العيادة */}
              <div style={{ background:"#fff",borderRadius:16,padding:"20px 24px",border:"1.5px solid rgba(123,45,139,.15)",position:"relative",overflow:"hidden",boxShadow:"0 2px 12px rgba(123,45,139,.06)" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:"#888" }}>{tr.totalExpenses}</span>
                  <button onClick={()=>setShowExpenseModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(123,45,139,.08)",color:"#7b2d8b",border:"1.5px solid rgba(123,45,139,.15)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.expenseBtn}</button>
                </div>
                <div style={{ fontSize:26,fontWeight:900,color:"#7b2d8b" }}>{stats.totalExpenses.toLocaleString()} ل.س</div>
                <div style={{ fontSize:11,color:"#aaa",marginTop:6 }}>{expenses.length} {isAr?"مصروف مسجّل":"recorded expenses"}</div>
              </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div className="main-grid" style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,minWidth:0 }}>

              {/* LEFT: Table */}
              <div style={{ minWidth:0 }}>
                {/* Search + Filter */}
                <div style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:"1.5px solid #eef0f3",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#bbb",fontSize:14 }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}/>
                    {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb" }}>✕</button>}
                  </div>
                  <div className="filter-chips-wrap" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {Object.entries(tr.filter as Record<string, string>).map(([k, v]) => (
                      <button key={k} className={`filter-chip${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* Table / Cards */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.table.title}</h3>
                    <span style={{ fontSize:12,color:"#aaa" }}>{filtered.length} {tr.stats.transactions}</span>
                  </div>

                  {/* Header row — desktop only */}
                  <div className="desktop-table-header" style={{ gridTemplateColumns: isSharedClinicPlan(plan) ? "110px 1fr 120px 110px 90px 90px 90px 40px" : "110px 1fr 130px 90px 90px 90px 40px",padding:"10px 20px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3",gap:0 }}>
                    {[
                      tr.table.date, tr.table.patient,
                      ...(isSharedClinicPlan(plan) ? [isAr ? "الطبيب" : "Doctor"] : []),
                      tr.table.description, tr.table.method, tr.table.status, tr.table.amount, ""
                    ].map((h,i)=>(
                      <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.4,textAlign:i===(isSharedClinicPlan(plan)?6:5)||i===(isSharedClinicPlan(plan)?7:6)?"center":"start",paddingLeft:i>0&&i<(isSharedClinicPlan(plan)?7:6)?8:0 }}>{h}</div>
                    ))}
                  </div>

                  {filtered.length===0?(
                    <div style={{ textAlign:"center",padding:"50px 20px",color:"#ccc" }}>
                      <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                      <div style={{ fontSize:14,fontWeight:600 }}>{tr.noResults}</div>
                    </div>
                  ):loading?(
                    <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                      <div style={{ width:32,height:32,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 12px" }}/>
                      <div style={{ fontSize:13 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
                    </div>
                  ):(
                    <>
                      {/* MOBILE CARDS */}
                      <div className="mobile-tx">
                        {filtered.map(p=>{
                          const patient = patients.find(x=>x.id===p.patient_id);
                          const ss = statusStyle[p.status]||statusStyle.paid;
                          const isNew = animIds.includes(p.id);
                          const amtColor = p.status==="pending"?"#e67e22":p.status==="cancelled"?"#ccc":"#2e7d32";
                          const doctor = isSharedClinicPlan(plan) ? doctors.find(d => d.id === (p as any).doctor_id) : null;
                          return (
                            <div key={p.id} className="tx-row" style={{ padding:"14px 16px",animation:isNew?"rowPop .4s ease":undefined }}>
                              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                  <div style={{ width:36,height:36,borderRadius:10,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>
                                    {patient?getInitials(patient.name):"?"}
                                  </div>
                                  <div>
                                    <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{patient?.name||"—"}</div>
                                    <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{p.description}</div>
                                    {/* اسم الطبيب في البطاقة المحمولة */}
                                    {doctor && (
                                      <div style={{ fontSize:10,color:"#0891b2",fontWeight:600,marginTop:2,display:"flex",alignItems:"center",gap:4 }}>
                                        <div style={{ width:14,height:14,borderRadius:3,background:doctor.color||"#0891b2",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700 }}>
                                          {getInitials(doctor.name)}
                                        </div>
                                        {isAr?"د. ":"Dr. "}{doctor.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ textAlign:"end" }}>
                                  <div style={{ fontSize:15,fontWeight:800,color:amtColor }}>{p.amount.toLocaleString()} ل.س</div>
                                  <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ss.bg,color:ss.color,marginTop:3,display:"inline-block" }}>{ss.label}</span>
                                </div>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                                  <span style={{ fontSize:11,color:"#aaa" }}>{fmtDate(p.date)}</span>
                                  <span style={{ fontSize:11,color:"#aaa" }}>{methodIcon[p.method]} {tr.methods[p.method]}</span>
                                </div>
                                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                  <button className="icon-btn" onClick={()=>setDeleteId(p.id)}>🗑️</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* DESKTOP ROWS */}
                      <div className="desktop-tx">
                        {filtered.map(p=>{
                          const patient = patients.find(x=>x.id===p.patient_id);
                          const ss = statusStyle[p.status]||statusStyle.paid;
                          const isNew = animIds.includes(p.id);
                          const doctor = isSharedClinicPlan(plan) ? doctors.find(d => d.id === (p as any).doctor_id) : null;
                          return (
                            <div key={p.id} className="tx-row" style={{ display:"grid",gridTemplateColumns:isSharedClinicPlan(plan)?"110px 1fr 120px 110px 90px 90px 90px 40px":"110px 1fr 130px 90px 90px 90px 40px",padding:"13px 20px",alignItems:"center",animation:isNew?"rowPop .4s ease":undefined }}>
                              <div style={{ fontSize:12,color:"#888" }}>{fmtDate(p.date)}</div>
                              <div style={{ display:"flex",alignItems:"center",gap:10,paddingLeft:8 }}>
                                <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                                  {patient?getInitials(patient.name):"?"}
                                </div>
                                <div style={{ fontSize:13,fontWeight:500,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:120 }}>
                                  {patient?.name||"—"}
                                </div>
                              </div>
                              {/* عمود الطبيب — للخطط المشتركة فقط */}
                              {isSharedClinicPlan(plan) && (
                                <div style={{ paddingLeft:8,display:"flex",alignItems:"center",gap:5 }}>
                                  {doctor ? (
                                    <>
                                      <div style={{ width:22,height:22,borderRadius:6,background:doctor.color||"#0891b2",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,flexShrink:0 }}>
                                        {getInitials(doctor.name)}
                                      </div>
                                      <span style={{ fontSize:11,color:"#0891b2",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:70 }}>
                                        {isAr?"د. ":"Dr. "}{doctor.name}
                                      </span>
                                    </>
                                  ) : <span style={{ fontSize:11,color:"#ccc" }}>—</span>}
                                </div>
                              )}
                              <div style={{ fontSize:12,color:"#666",paddingLeft:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                                {/* شارة نوع الجلسة */}
                                {(p as any).session_type && (()=>{
                                  const stMap: Record<string,{icon:string;color:string;bg:string}> = {
                                    consultation:{icon:"🩺",color:"#0863ba",bg:"rgba(8,99,186,.08)"},
                                    session:     {icon:"🛋️",color:"#2e7d32",bg:"rgba(46,125,50,.08)"},
                                    followup:    {icon:"🔄",color:"#7b2d8b",bg:"rgba(123,45,139,.08)"},
                                  };
                                  const st = stMap[(p as any).session_type];
                                  if (!st) return null;
                                  const label = tr.sessionType[(p as any).session_type as keyof typeof tr.sessionType];
                                  return (
                                    <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:st.bg,color:st.color,marginInlineEnd:5 }}>
                                      {st.icon} {label}
                                    </span>
                                  );
                                })()}
                                {/* شارة الدفع المسبق */}
                                {(p as any).is_prepayment && (
                                  <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"rgba(123,45,139,.1)",color:"#7b2d8b",marginInlineEnd:5 }}>
                                    💳 {tr.prepayment.badgePrefix}{(p as any).prepayment_sessions ?? ""}
                                  </span>
                                )}
                                {p.description}
                              </div>
                              <div style={{ paddingLeft:8,fontSize:12,color:"#888",display:"flex",alignItems:"center",gap:6 }}>
                                <span>{methodIcon[p.method]}</span>
                                <span>{tr.methods[p.method]}</span>
                              </div>
                              <div style={{ paddingLeft:8 }}>
                                <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color }}>{ss.label}</span>
                              </div>
                              <div style={{ textAlign:"center",fontSize:15,fontWeight:800,color:p.status==="pending"?"#e67e22":p.status==="cancelled"?"#ccc":"#2e7d32" }}>
                                {p.amount.toLocaleString()} ل.س
                              </div>
                              <div style={{ display:"flex",justifyContent:"center" }}>
                                <button className="icon-btn" onClick={()=>setDeleteId(p.id)} title={tr.deleteConfirm}>🗑️</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Total */}
                {filtered.length>0&&(
                  <div style={{ display:"flex",justifyContent:"flex-end",alignItems:"center",gap:16,marginTop:14,padding:"12px 20px",background:"#fff",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                    <span style={{ fontSize:13,color:"#888" }}>{isAr?"المجموع:":"Total:"}</span>
                    <span style={{ fontSize:18,fontWeight:900,color:"#2e7d32" }}>
                      {filtered.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()} ل.س
                    </span>
                  </div>
                )}

                {/* ── سجل السحوبات ضمن الحركة المالية ── */}
                {withdrawals.length > 0 && (
                  <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid rgba(192,57,43,.18)",boxShadow:"0 2px 16px rgba(192,57,43,.06)",overflow:"hidden",marginTop:20 }}>
                    <div style={{ padding:"16px 20px",borderBottom:"1.5px solid rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(192,57,43,.03)" }}>
                      <h3 style={{ fontSize:15,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:16 }}>💸</span>
                        {tr.withdrawalsSection.title}
                      </h3>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:12,color:"#c0392b",fontWeight:700 }}>
                          -{withdrawals.filter(w=>!w.is_reversed).reduce((s,w)=>s+w.amount,0).toLocaleString()} ل.س
                        </span>
                        <button onClick={()=>setShowWithdrawModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(192,57,43,.08)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.2)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.withdrawBtn}</button>
                      </div>
                    </div>
                    {/* Header */}
                    <div className="desktop-table-header" style={{ gridTemplateColumns:"120px 1fr 130px 90px 60px",padding:"10px 20px",background:"#fafbfc",borderBottom:"1px solid rgba(192,57,43,.08)",gap:0 }}>
                      {[tr.table.date, isAr?"السبب":"Reason", tr.table.amount, isAr?"الحالة":"Status", ""].map((h,i)=>(
                        <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.4,paddingLeft:i>0?8:0 }}>{h}</div>
                      ))}
                    </div>
                    {withdrawals.map((w,i) => (
                      <div key={w.id||i} style={{ display:"grid",gridTemplateColumns:"120px 1fr 130px 90px 60px",padding:"12px 20px",alignItems:"center",borderBottom:"1px solid #faf0ee",background:w.is_reversed?"rgba(200,200,200,.04)":"transparent",transition:"background .2s" }}
                        onMouseEnter={e=>{if(!w.is_reversed)(e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.03)";}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=w.is_reversed?"rgba(200,200,200,.04)":"transparent";}}>
                        <div style={{ fontSize:12,color:"#888" }}>{fmtDate(w.date)}</div>
                        <div style={{ fontSize:13,fontWeight:500,color:w.is_reversed?"#bbb":"#353535",paddingLeft:8,textDecoration:w.is_reversed?"line-through":"none" }}>
                          {w.reason}
                          {w.notes && <div style={{ fontSize:11,color:"#bbb",marginTop:2 }}>{w.notes}</div>}
                        </div>
                        <div style={{ textAlign:"center",fontSize:15,fontWeight:800,color:w.is_reversed?"#bbb":"#c0392b",textDecoration:w.is_reversed?"line-through":"none" }}>
                          -{w.amount.toLocaleString()} ل.س
                        </div>
                        <div style={{ paddingLeft:8 }}>
                          {w.is_reversed ? (
                            <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:"rgba(200,200,200,.15)",color:"#bbb" }}>
                              {tr.withdrawalsSection.reversed}
                            </span>
                          ) : (
                            <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:"rgba(192,57,43,.1)",color:"#c0392b" }}>
                              {isAr?"سحب":"Withdrawal"}
                            </span>
                          )}
                        </div>
                        <div style={{ display:"flex",justifyContent:"center" }}>
                          {!w.is_reversed && (
                            <button
                              className="icon-btn"
                              onClick={()=>setReverseWithdrawalId(w.id)}
                              title={tr.withdrawalsSection.reverseBtn}
                              style={{ fontSize:14 }}
                            >↩️</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: Revenue Chart + Pending */}
              <div style={{ minWidth:0 }}>
                {/* Chart */}
                <div style={{ marginBottom:16 }}>
                  <RevenueChart lang={lang} months={tr.months} revenueData={revenueData} />
                </div>

                {/* إيرادات حسب الطبيب — للخطط المشتركة فقط */}
                {isSharedClinicPlan(plan) && doctorRevenueStats.length > 0 && (
                  <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid rgba(8,145,178,.2)",padding:"18px 18px",boxShadow:"0 2px 16px rgba(8,145,178,.06)",marginBottom:16 }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                      <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:16 }}>👨‍⚕️</span>
                        {tr.sharedClinic.doctorRevenue}
                      </h3>
                      <span style={{ fontSize:11,background:"rgba(8,145,178,.08)",color:"#0891b2",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>
                        {isAr ? "هذا الشهر" : "This Month"}
                      </span>
                    </div>
                    {doctorRevenueStats.map((doc, i) => {
                      const maxRev = Math.max(...doctorRevenueStats.map(d => d.monthlyRevenue), 1);
                      return (
                        <div key={doc.id} style={{ marginBottom:i < doctorRevenueStats.length-1 ? 14 : 0 }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                              <div style={{ width:26,height:26,borderRadius:7,background:doc.color||"#0891b2",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700 }}>
                                {getInitials(doc.name)}
                              </div>
                              <span style={{ fontSize:12,fontWeight:600,color:"#353535" }}>
                                {isAr ? "د. " : "Dr. "}{doc.name}
                              </span>
                            </div>
                            <div style={{ textAlign:"end" }}>
                              <span style={{ fontSize:13,fontWeight:800,color:doc.color||"#0891b2" }}>{doc.monthlyRevenue.toLocaleString()} ل.س</span>
                              <span style={{ fontSize:10,color:"#aaa",marginInlineStart:6 }}>({doc.count} {isAr?"معاملة":"tx"})</span>
                            </div>
                          </div>
                          <div style={{ height:5,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${Math.round((doc.monthlyRevenue/maxRev)*100)}%`,background:doc.color||"#0891b2",borderRadius:10,transition:"width .8s" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending Dues */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",padding:"18px",boxShadow:"0 2px 16px rgba(8,99,186,.06)",minWidth:0,overflow:"hidden" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                    <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:"#e67e22",display:"inline-block",animation:"pulse 2s infinite" }}/>
                      {tr.pendingSection.title}
                    </h3>
                    <span style={{ fontSize:12,background:"rgba(230,126,34,.1)",color:"#e67e22",padding:"3px 10px",borderRadius:20,fontWeight:700 }}>
                      {pendingPayments.length}
                    </span>
                  </div>

                  {pendingPayments.length===0?(
                    <div style={{ textAlign:"center",padding:"24px 0",color:"#ccc",fontSize:13 }}>{tr.pendingSection.empty}</div>
                  ):(
                    pendingPayments.map(p=>{
                      const patient = patients.find(x=>x.id===p.patient_id);
                      return (
                        <div key={p.id} className="pending-row">
                          <div style={{ width:34,height:34,borderRadius:8,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                            {patient?getInitials(patient.name):"?"}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{patient?.name}</div>
                            <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{p.description}</div>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                            <span style={{ fontSize:14,fontWeight:800,color:"#e67e22" }}>{p.amount.toLocaleString()} ل.س</span>
                            <button onClick={()=>markPaid(p.id)}
                              style={{ padding:"7px 14px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(46,125,50,.25)",transition:"all .15s" }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#1b5e20"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background="#2e7d32"; }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              {tr.pendingSection.markPaid}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Recent Withdrawals */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid rgba(192,57,43,.15)",padding:"18px",boxShadow:"0 2px 16px rgba(192,57,43,.06)",marginTop:16,minWidth:0,overflow:"hidden" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                    <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:16 }}>💸</span> {tr.withdrawalsSection.title}
                    </h3>
                    <button onClick={()=>setShowWithdrawModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(192,57,43,.08)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.2)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.withdrawBtn}</button>
                  </div>
                  {withdrawals.length===0?(
                    <div style={{ textAlign:"center",padding:"18px 0",color:"#ccc",fontSize:13 }}>{tr.withdrawalsSection.empty}</div>
                  ):(
                    withdrawals.slice(0,5).map((w,i)=>(
                      <div key={w.id||i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f5f7fa",opacity:w.is_reversed?.5:1,gap:8,minWidth:0 }}>
                        <div style={{ flex:1,minWidth:0,overflow:"hidden" }}>
                          <div style={{ fontSize:12,fontWeight:600,color:w.is_reversed?"#bbb":"#353535",textDecoration:w.is_reversed?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{w.reason}</div>
                          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap" }}>
                            <span style={{ fontSize:11,color:"#aaa" }}>{new Date(w.date+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory":"en-GB",{month:"short",day:"numeric"})}</span>
                            {w.is_reversed && <span style={{ fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:"rgba(200,200,200,.15)",color:"#bbb" }}>{tr.withdrawalsSection.reversed}</span>}
                          </div>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                          <span style={{ fontSize:13,fontWeight:800,color:w.is_reversed?"#bbb":"#c0392b",textDecoration:w.is_reversed?"line-through":"none",whiteSpace:"nowrap" }}>-{w.amount.toLocaleString()} ل.س</span>
                          {!w.is_reversed && (
                            <button
                              onClick={()=>setReverseWithdrawalId(w.id)}
                              title={tr.withdrawalsSection.reverseBtn}
                              style={{ width:30,height:30,borderRadius:8,background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s" }}
                              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(230,126,34,.18)";}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background="rgba(230,126,34,.08)";}}
                            >↩️</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Clinic Expenses */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid rgba(123,45,139,.15)",padding:"18px",boxShadow:"0 2px 16px rgba(123,45,139,.06)",marginTop:16,minWidth:0,overflow:"hidden" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                    <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:16 }}>🏪</span> {tr.expensesSection.title}
                    </h3>
                    <button onClick={()=>setShowExpenseModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(123,45,139,.08)",color:"#7b2d8b",border:"1.5px solid rgba(123,45,139,.2)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.expenseBtn}</button>
                  </div>
                  {expenses.length===0?(
                    <div style={{ textAlign:"center",padding:"18px 0",color:"#ccc",fontSize:13 }}>{tr.expensesSection.empty}</div>
                  ):(
                    expenses.slice(0,5).map((e,i)=>{
                      const catLabels = tr.expenseModal.categories;
                      return (
                        <div key={e.id||i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f5f7fa",gap:8,minWidth:0 }}>
                          <div style={{ flex:1,minWidth:0,overflow:"hidden" }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{e.description}</div>
                            <div style={{ display:"flex",gap:8,marginTop:3,flexWrap:"wrap" }}>
                              <span style={{ fontSize:10,padding:"2px 8px",background:"rgba(123,45,139,.08)",color:"#7b2d8b",borderRadius:20,fontWeight:600,flexShrink:0 }}>{catLabels[e.category as keyof typeof catLabels]||e.category}</span>
                              <span style={{ fontSize:11,color:"#aaa" }}>{new Date(e.date+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory":"en-GB",{month:"short",day:"numeric"})}</span>
                            </div>
                          </div>
                          <span style={{ fontSize:13,fontWeight:800,color:"#7b2d8b",flexShrink:0,whiteSpace:"nowrap" }}>-{e.amount.toLocaleString()} ل.س</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
          </>)}
        </main>

        {/* Add Modal */}
        {showModal&&<PaymentModal lang={lang} patients={patients} doctors={doctors} isSharedClinic={isSharedClinicPlan(plan)} onSave={handleSave} onClose={()=>setShowModal(false)}/>}

        {/* Withdraw Modal */}
        {showWithdrawModal&&<WithdrawModal lang={lang} onSave={handleWithdraw} onClose={()=>setShowWithdrawModal(false)}/>}

        {/* Expense Modal */}
        {showExpenseModal&&<ExpenseModal lang={lang} onSave={handleExpense} onClose={()=>setShowExpenseModal(false)}/>}

        {/* Delete Confirm */}
        {deleteId&&(
          <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
            <div onClick={()=>setDeleteId(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
            <div className="modal-inner-center" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:360,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:16,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteConfirm}</h3>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={()=>deletePayment(deleteId)} style={{ flex:1,padding:"14px",background:"#c0392b",color:"#fff",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",minHeight:50 }}>
                  {isAr?"نعم، احذف":"Yes, Delete"}
                </button>
                <button onClick={()=>setDeleteId(null)} style={{ flex:1,padding:"14px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,cursor:"pointer",minHeight:50 }}>
                  {isAr?"إلغاء":"Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Reverse Withdrawal Confirm */}
        {reverseWithdrawalId!==null&&(
          <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
            <div onClick={()=>setReverseWithdrawalId(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
            <div className="modal-inner-center" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:44,marginBottom:12 }}>↩️</div>
              <h3 style={{ fontSize:16,fontWeight:800,color:"#353535",marginBottom:10 }}>
                {isAr?"التراجع عن السحب":"Undo Withdrawal"}
              </h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.7,marginBottom:6 }}>
                {tr.withdrawalsSection.reverseConfirm}
              </p>
              {(()=>{
                const w = withdrawals.find(x=>x.id===reverseWithdrawalId);
                return w ? (
                  <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:12,padding:"10px 16px",marginBottom:20,display:"inline-flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#c0392b" }}>+{w.amount.toLocaleString()} ل.س</span>
                    <span style={{ fontSize:12,color:"#888" }}>{w.reason}</span>
                  </div>
                ) : null;
              })()}
              <div style={{ display:"flex",gap:12,marginTop:8 }}>
                <button onClick={()=>reverseWithdrawal(reverseWithdrawalId)}
                  style={{ flex:1,padding:"14px",background:"#e67e22",color:"#fff",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(230,126,34,.3)",minHeight:50 }}>
                  {isAr?"نعم، تراجع":"Yes, Undo"}
                </button>
                <button onClick={()=>setReverseWithdrawalId(null)}
                  style={{ flex:1,padding:"14px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,cursor:"pointer",minHeight:50 }}>
                  {isAr?"إلغاء":"Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}