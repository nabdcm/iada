"use client";

import AppIcon from "@/components/AppIcon";
import { type CSSProperties, useState, useEffect, useMemo, useRef } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { supabase } from "@/lib/supabase";
import { currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";

// رمز عملة العيادة الحالي — يُحدَّث عند تحميل بيانات العيادة
let CUR = currencySymbol(DEFAULT_CURRENCY, true);
import PageIntro from "@/components/PageIntro";
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
    pendingSection:{ title:"المستحقات المعلّقة", markPaid:"تحديد كمدفوع", empty:"لا توجد مستحقات معلّقة " },
    modal:{
      addTitle:"تسجيل دفعة جديدة",
      patient:"المريض *", selectPatient:"اختر المريض",
      amount:"المبلغ *", amountPh:"0.00",
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
      doctorShare:"نسبة الطبيب من الدفعة (%)",
      doctorSharePh:"مثال: 50",
      doctorShareHint:"اتركه فارغاً لاستخدام النسبة الافتراضية للعيادة",
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
      other:"أخرى",
      otherReason:"سبب آخر *",
      otherReasonPh:"اكتب السبب...",
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
      amount:"المبلغ المسحوب *",
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
      amount:"المبلغ *",
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
    expensesSection:{ title:"مصروفات العيادة", empty:"لا توجد مصروفات مسجّلة", reverseConfirm:"هل تريد التراجع عن هذا المصروف؟ سيُعاد المبلغ للرصيد.", reverseBtn:"تراجع", reversed:"مُلغى" },
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
        shared_basic:     "7.99 $ / شهر · 79 $ / سنة",
        shared_pro:       "13.99 $ / شهر · 139 $ / سنة",
        shared_enterprise:"21.99 $ / شهر · 219 $ / سنة",
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
    pendingSection:{ title:"Pending Dues", markPaid:"Mark as Paid", empty:"No pending dues " },
    modal:{
      addTitle:"Record New Payment",
      patient:"Patient *", selectPatient:"Select patient",
      amount:"Amount *", amountPh:"0.00",
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
      doctorShare:"Doctor's Share of Payment (%)",
      doctorSharePh:"e.g. 50",
      doctorShareHint:"Leave empty to use the clinic's default percentage",
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
      other:"Other",
      otherReason:"Reason *",
      otherReasonPh:"Enter reason...",
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
      amount:"Withdrawn Amount *",
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
      amount:"Amount *",
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
    expensesSection:{ title:"Clinic Expenses", empty:"No expenses recorded", reverseConfirm:"Undo this expense? The amount will be returned to the balance.", reverseBtn:"Undo", reversed:"Reversed" },
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

const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

const PLAN_BADGE: Record<PlanType,{label:{ar:string;en:string};color:string;isShared?:boolean}> = {
  basic:             {label:{ar:"الأساسية",            en:"Basic"},             color:"#0863ba"},
  pro:               {label:{ar:"الاحترافية",          en:"Professional"},      color:"#7b2d8b"},
  enterprise:        {label:{ar:"الشاملة",             en:"Comprehensive"},     color:"#e67e22"},
  shared_basic:      {label:{ar:"مشتركة — أساسية",    en:"Shared — Basic"},    color:"#0e7c6a", isShared:true},
  shared_pro:        {label:{ar:"مشتركة — احترافية",  en:"Shared — Pro"},      color:"#b5451b", isShared:true},
  shared_enterprise: {label:{ar:"مشتركة — شاملة",    en:"Shared — Full"},     color:"#4a1480", isShared:true},
};


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
    doctorSharePercentage:"", // نسبة الطبيب من الدفعة — للخطط المشتركة فقط
    sessionType:"session", // معاينة | جلسة | مراجعة | أخرى
    sessionTypeOther:"", // السبب عند اختيار "أخرى"
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
    if (form.sessionType==="other" && !form.sessionTypeOther.trim()) { setError(tr.sessionType.otherReason); return; }
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
        session_type_other: form.sessionType==="other" ? form.sessionTypeOther.trim() : undefined,
        is_prepayment: form.isPrepayment,
        prepayment_sessions: form.isPrepayment ? form.prepaymentSessions : undefined,
        ...(isSharedClinic && form.doctorId ? { doctor_id: Number(form.doctorId) } : {}),
        ...(() => {
          if (!isSharedClinic || !form.doctorId || !form.doctorSharePercentage) return {};
          const parsed = parseFloat(form.doctorSharePercentage);
          if (isNaN(parsed)) return {}; // قيمة غير صالحة — تُعامل كأنها غير محددة
          return { doctor_share_percentage: Math.min(100, Math.max(0, parsed)) };
        })(),
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
            <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph="💳" /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.addTitle}</h2>
          </div>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:10,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}><AppIcon glyph="⚠️" /> {error}</div>}
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
                    <AppIcon glyph="🏥" />
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
              {form.doctorId && (
                <div style={{ marginTop:12 }}>
                  <label style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:6,display:"block" }}>{tr.modal.doctorShare}</label>
                  <input
                    type="text" inputMode="decimal"
                    value={form.doctorSharePercentage}
                    onChange={e=>{
                      // يسمح فقط بأرقام إنجليزية وفاصلة عشرية واحدة، ويحوّل الأرقام العربية/الفارسية تلقائياً
                      let v = e.target.value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, ch => String(ch.charCodeAt(0) % 16 % 10));
                      v = v.replace(/[^0-9.]/g, "");
                      const firstDot = v.indexOf(".");
                      if (firstDot !== -1) v = v.slice(0, firstDot+1) + v.slice(firstDot+1).replace(/\./g, "");
                      if (v !== "") {
                        const num = parseFloat(v);
                        if (!isNaN(num) && num > 100) v = "100";
                      }
                      setForm({...form,doctorSharePercentage:v});
                    }}
                    placeholder={tr.modal.doctorSharePh}
                    style={inputSt}
                    onFocus={e=>(e.target.style.borderColor="#0891b2")}
                    onBlur={e=>(e.target.style.borderColor="#e8eaed")}
                  />
                  <div style={{ marginTop:6,fontSize:11,color:"#aaa",lineHeight:1.6 }}>{tr.modal.doctorShareHint}</div>
                </div>
              )}
            </F>
          )}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.amount} half>
              <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder={tr.modal.amountPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
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
                { k:"other",        icon:"📝", label:tr.sessionType.other        },
              ].map(s=>(
                <label key={s.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.sessionType===s.k?"1.5px solid #0863ba":"1.5px solid #eee",background:form.sessionType===s.k?"rgba(8,99,186,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.sessionType===s.k?700:400,color:form.sessionType===s.k?"#0863ba":"#888" }}>
                  <span><AppIcon glyph={s.icon} /></span>{s.label}
                  <input type="radio" name="sessionType" value={s.k} checked={form.sessionType===s.k} onChange={e=>setForm({...form,sessionType:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
            {form.sessionType==="other" && (
              <input
                value={form.sessionTypeOther}
                onChange={e=>setForm({...form,sessionTypeOther:e.target.value})}
                placeholder={tr.sessionType.otherReasonPh}
                style={{ ...inputSt, marginTop:8 }}
                onFocus={e=>(e.target.style.borderColor="#0863ba")}
                onBlur={e=>(e.target.style.borderColor="#e8eaed")}
              />
            )}
          </F>

          {/* دفع مسبق */}
          <F label={tr.prepayment.label}>
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",borderRadius:10,border:form.isPrepayment?"1.5px solid #7b2d8b":"1.5px solid #eee",background:form.isPrepayment?"rgba(123,45,139,.06)":"#fafbfc",transition:"all .2s" }}>
              <div style={{ width:20,height:20,borderRadius:6,border:form.isPrepayment?"2px solid #7b2d8b":"2px solid #ddd",background:form.isPrepayment?"#7b2d8b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",flexShrink:0 }}>
                {form.isPrepayment&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input type="checkbox" checked={form.isPrepayment} onChange={e=>setForm({...form,isPrepayment:e.target.checked,prepaymentSessions:e.target.checked?form.prepaymentSessions:1})} style={{ display:"none" }}/>
              <span style={{ fontSize:13,fontWeight:600,color:form.isPrepayment?"#7b2d8b":"#666" }}>
                <AppIcon glyph="💳" /> {tr.prepayment.toggle}
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
                  <span><AppIcon glyph={m.icon} /></span>{m.label}
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

// ─── PasswordPromptModal: حالة الإدخال داخلية لمنع إعادة رندر الصفحة الثقيلة مع كل حرف ───
function PasswordPromptModal({ isAr, icon, title, desc, confirmLabel, expected, onSuccess, onClose }: {
  isAr: boolean; icon: string; title: string; desc: string; confirmLabel: string;
  expected: string; onSuccess: () => void; onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (val.trim() === (expected ?? "").trim()) { onSuccess(); }
    else setErr(true);
  };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:360,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
        <div style={{ width:60,height:60,borderRadius:18,background:"linear-gradient(135deg,#0863ba,#3d8fd6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px",boxShadow:"0 8px 20px rgba(8,99,186,.3)" }}>{icon}</div>
        <h3 style={{ fontSize:16,fontWeight:800,color:"#1c2b3a",marginBottom:8 }}>{title}</h3>
        <p style={{ fontSize:13,color:"#8a97a6",marginBottom:20 }}>{desc}</p>
        {/* type="text" مع إخفاء بصري للأحرف — المتصفح لا يملأ حقول النص تلقائياً أبداً */}
        <input
          type="text" value={val}
          autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="off"
          name="npx-code" data-lpignore="true" data-1p-ignore="true"
          onChange={e=>{ setVal(e.target.value); if(err) setErr(false); }}
          onKeyDown={e=>{ if(e.key==="Enter" && !e.nativeEvent.isComposing){ e.preventDefault(); submit(); } }}
          placeholder={isAr?"كلمة السر...":"Password..."}
          style={{ width:"100%",padding:"13px 16px",border:err?"2px solid #c0392b":"1.5px solid #e6edf5",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:err?8:16,textAlign:"center",letterSpacing:3,direction:"ltr",background:"#f8fbfe",WebkitTextSecurity:"disc",textSecurity:"disc" } as CSSProperties}
        />
        {err && <p style={{ color:"#c0392b",fontSize:12,marginBottom:16,fontWeight:600 }}>{isAr?"كلمة السر غير صحيحة":"Incorrect password"}</p>}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={submit} style={{ flex:1,padding:"13px",background:"linear-gradient(135deg,#0863ba,#3d8fd6)",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)" }}>{confirmLabel}</button>
          <button onClick={onClose} style={{ flex:1,padding:"13px",background:"#f4f8fc",color:"#8a97a6",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

function MobileStatsSlider({ stats, methodStats, methodIcon, tr, isAr, numbersHidden, onReveal }: {
  stats: any; methodStats: any[]; methodIcon: any; tr: any; isAr: boolean;
  numbersHidden: boolean; onReveal: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const maskVal = (val: number) => numbersHidden ? "••••••" : val.toLocaleString();

  const cards = [
    {
      gradient: "linear-gradient(90deg,#2e7d32,#66bb6a)",
      icon: "💰",
      iconBg: "rgba(46,125,50,.1)",
      value: `${maskVal(stats.totalMonth)} ${CUR}`,
      valueColor: "#2e7d32",
      label: tr.stats.totalMonth,
      sub: `↑ 12% ${tr.stats.vsLast}`,
      subColor: "#2e7d32",
      eyeColor: "#2e7d32",
      eyeBg: "rgba(46,125,50,.1)",
      eyeBorder: "rgba(46,125,50,.2)",
    },
    {
      gradient: "linear-gradient(90deg,#0863ba,#a4c4e4)",
      icon: "📊",
      iconBg: "rgba(8,99,186,.08)",
      value: `${maskVal(stats.totalYear)} ${CUR}`,
      valueColor: "#0863ba",
      label: tr.stats.totalYear,
      sub: `${stats.paidCount} ${tr.stats.transactions}`,
      subColor: "#888",
      eyeColor: "#0863ba",
      eyeBg: "rgba(8,99,186,.08)",
      eyeBorder: "rgba(8,99,186,.2)",
    },
    {
      gradient: "linear-gradient(90deg,#e67e22,#f39c12)",
      icon: "⏳",
      iconBg: "rgba(230,126,34,.08)",
      value: `${maskVal(stats.pendingAmt)} ${CUR}`,
      valueColor: "#e67e22",
      label: tr.stats.pending,
      sub: `${stats.pendingCount} ${tr.stats.unpaidCount}`,
      subColor: "#e67e22",
      eyeColor: "#e67e22",
      eyeBg: "rgba(230,126,34,.08)",
      eyeBorder: "rgba(230,126,34,.2)",
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
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <div style={{ width:40,height:40,background:c.iconBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph={c.icon} /></div>
              <button onClick={onReveal} style={{ width:32,height:32,borderRadius:8,background:c.eyeBg,border:`1.5px solid ${c.eyeBorder}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:c.eyeColor,fontSize:15,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
            </div>
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
              <div style={{ fontSize:10,color:isLast?"#2e7d32":"#ccc",fontWeight:isLast?700:400 }}>{v>=1000?(v/1000).toFixed(0)+"k":v} {CUR}</div>
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
            <div style={{ width:40,height:40,background:"rgba(192,57,43,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph="💸" /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.withdrawModal.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}><AppIcon glyph="⚠️" /> {error}</div>}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.withdrawModal.amount} half>
              <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
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
            <div style={{ width:40,height:40,background:"rgba(123,45,139,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph="🏪" /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.expenseModal.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}><AppIcon glyph="⚠️" /> {error}</div>}
          {/* Category Selector */}
          <F label={tr.expenseModal.category}>
            <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
              {(Object.entries(tr.expenseModal.categories) as [string, string][]).map(([k,v])=>(
                <button key={k} onClick={()=>setForm({...form,category:k})}
                  style={{ padding:"8px 14px",borderRadius:10,cursor:"pointer",border:form.category===k?"1.5px solid #7b2d8b":"1.5px solid #eee",background:form.category===k?"rgba(123,45,139,.08)":"#fafbfc",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:form.category===k?700:400,color:form.category===k?"#7b2d8b":"#888",transition:"all .2s",display:"flex",alignItems:"center",gap:6 }}>
                  <span><AppIcon glyph={catIcons[k] ?? "📋"} /></span><span>{v}</span>
                </button>
              ))}
            </div>
          </F>
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.expenseModal.amount} half>
              <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt} onFocus={e=>e.target.style.borderColor="#7b2d8b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
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
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState("ar");
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
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
  const [reverseExpenseId, setReverseExpenseId] = useState<number|null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [plan, setPlan] = useState<PlanType>("basic");

  // إخفاء الأرقام الرئيسية (وضع الخصوصية) — يُفعّل فقط إذا كان قفل المدفوعات مُفعّلاً من الأدمن
  const [numbersHidden, setNumbersHidden] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const TX_PAGE_SIZE = 10;
  const [revealPasswordInput, setRevealPasswordInput] = useState("");
  const [revealPasswordError, setRevealPasswordError] = useState(false);

  // قفل التقرير الشهري
  const [showMonthlyReportPasswordModal, setShowMonthlyReportPasswordModal] = useState(false);
  const [monthlyReportPasswordInput, setMonthlyReportPasswordInput] = useState("");
  const [monthlyReportPasswordError, setMonthlyReportPasswordError] = useState(false);
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
        .from("clinics").select("name, plan, payments_lock_enabled, payments_lock_password, currency").eq("user_id", user.id).single();
      if (clinicRow?.name && !clinicMeta) setClinicName(prev => prev || clinicRow.name);
      if (clinicRow?.plan) setPlan(clinicRow.plan as PlanType);
      const cCode = (clinicRow as { currency?: string } | null)?.currency || DEFAULT_CURRENCY;
      CUR = currencySymbol(cCode, lang === "ar");
      setCurrency(cCode);
      // قفل المدفوعات
      if (clinicRow?.payments_lock_enabled) {
        setPaymentsLockEnabled(true);
        setPaymentsLockPassword(clinicRow.payments_lock_password || "");
        setNumbersHidden(true); // إخفاء الأرقام افتراضياً فقط عند تفعيل القفل من الأدمن
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

  // إعادة تحميل خفيفة للسحوبات والمصروفات فقط (بدون spinner)
  const reloadFinancials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: wData }, { data: eData }] = await Promise.all([
        supabase.from("clinic_withdrawals").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("clinic_expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      ]);
      if (wData) setWithdrawals(wData);
      if (eData) setExpenses(eData);
    } catch (err) {
      console.error("reloadFinancials error:", err);
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

  // ── سجل موحّد كحركة حساب بنكي: مدفوعات + سحوبات + مصروفات ──
  const ledger = useMemo(() => {
    const q = search.toLowerCase();
    const showP = !["withdrawal","expense"].includes(filter);
    const showW = filter === "all" || filter === "withdrawal";
    const showE = filter === "all" || filter === "expense";
    const items: any[] = [];
    if (showP) items.push(...filtered);
    if (showW && selectedDoctor === null)
      items.push(...withdrawals.filter(w => !q || (w.reason||"").toLowerCase().includes(q) || (w.notes||"").toLowerCase().includes(q)).map(w => ({ ...w, __kind:"withdrawal" })));
    if (showE && selectedDoctor === null)
      items.push(...expenses.filter(e => !q || (e.description||"").toLowerCase().includes(q)).map(e => ({ ...e, __kind:"expense" })));
    return items.sort((a,b) => (b.date||"").localeCompare(a.date||"") || (b.created_at||"").localeCompare(a.created_at||""));
  }, [filtered, withdrawals, expenses, filter, search, selectedDoctor]);

  useEffect(()=>{ setTxPage(1); },[search,filter,selectedDoctor]);
  const txTotalPages = Math.max(1, Math.ceil(ledger.length / TX_PAGE_SIZE));
  const txSafePage = Math.min(txPage, txTotalPages);
  const txPaged = ledger.slice((txSafePage-1)*TX_PAGE_SIZE, txSafePage*TX_PAGE_SIZE);

  // صف موحّد لسحب/مصروف داخل السجل
  const renderLedgerExtraRow = (item: any) => {
    const isW = item.__kind === "withdrawal";
    const color = isW ? "#c0392b" : "#7b2d8b";
    const label = isW ? (isAr?"سحب":"Withdrawal") : (isAr?"مصروف":"Expense");
    const title = isW ? item.reason : item.description;
    const catLabels = tr.expenseModal.categories as Record<string,string>;
    return (
      <div key={`${item.__kind}-${item.id}`} className="tx-row" style={{ display:"flex",alignItems:"center",gap:12,padding:"13px 20px",borderBottom:"1px solid #f2f6fa",background:`${color}05` }}>
        <div style={{ width:36,height:36,borderRadius:10,background:`${color}14`,color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
          {isW
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7 7 7-7"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.6.6-.2 1.7.7 1.7H17"/></svg>}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#1c2b3a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{title}</div>
          <div style={{ fontSize:11,color:"#8a97a6",marginTop:2,display:"flex",gap:8,flexWrap:"wrap" }}>
            <span>{fmtDate(item.date)}</span>
            {!isW && item.category && <span style={{ color }}>{catLabels[item.category] || item.category}</span>}
            {item.notes && <span>· {item.notes}</span>}
          </div>
        </div>
        <span style={{ fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:20,background:`${color}12`,color,flexShrink:0 }}>{label}</span>
        <span style={{ fontSize:14,fontWeight:800,color,whiteSpace:"nowrap",flexShrink:0,fontVariantNumeric:"tabular-nums" }}>
          -{numbersHidden ? "••••" : item.amount.toLocaleString()} {CUR}
        </span>
        <button
          onClick={()=> isW ? setReverseWithdrawalId(item.id) : setReverseExpenseId(item.id)}
          title={isAr?"تراجع / حذف":"Undo / Delete"}
          style={{ width:32,height:32,borderRadius:9,background:`${color}0d`,border:`1.5px solid ${color}30`,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}
        >↩️</button>
      </div>
    );
  };

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
      let shareRevenue = 0;
      let unspecified = 0;
      docPayments.forEach(p => {
        const rawPct = (p as any).doctor_share_percentage;
        const pct = Number(rawPct);
        if (rawPct != null && rawPct !== "" && !isNaN(pct)) {
          shareRevenue += p.amount * (Math.min(100, Math.max(0, pct)) / 100);
        } else {
          shareRevenue += p.amount; // بدون نسبة محددة → تُحسب كاملة
          unspecified++;
        }
      });
      return {
        id: doc.id,
        name: doc.name,
        color: doc.color || "#0863ba",
        monthlyRevenue: docPayments.reduce((s, p) => s + p.amount, 0),
        shareRevenue: Math.round(shareRevenue),
        unspecified,
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
      setTimeout(() => { if (isMounted.current) setAnimIds(prev => prev.filter(x => x !== inserted.id)); }, 600);
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

  // ── التراجع عن سحب (حذف نهائي) ───────────────────────────────
  const reverseWithdrawal = async (id: number) => {
    const { error } = await supabase
      .from("clinic_withdrawals")
      .delete()
      .eq("id", id);
    if (!error) {
      setWithdrawals(prev => prev.filter(w => w.id !== id));
    }
    setReverseWithdrawalId(null);
    // إعادة تحميل البيانات لضمان تزامن الواجهة
    setTimeout(() => { if (isMounted.current) reloadFinancials(); }, 300);
  };

  // ── التراجع عن مصروف (حذف نهائي) ────────────────────────────
  const reverseExpense = async (id: number) => {
    const { error } = await supabase
      .from("clinic_expenses")
      .delete()
      .eq("id", id);
    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
    setReverseExpenseId(null);
    // إعادة تحميل البيانات لضمان تزامن الواجهة
    setTimeout(() => { if (isMounted.current) reloadFinancials(); }, 300);
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

  // دالة إخفاء/إظهار الأرقام
  const maskNumber = (val: string | number) => {
    if (numbersHidden) return "••••••";
    return typeof val === "number" ? val.toLocaleString() : val;
  };

  // دالة الكشف عن الأرقام بكلمة السر
  const handleRevealNumbers = () => {
    if (paymentsLockEnabled && revealPasswordInput.trim() === (paymentsLockPassword ?? "").trim()) {
      setNumbersHidden(false);
      setShowRevealModal(false);
      setRevealPasswordInput("");
      setRevealPasswordError(false);
    } else if (!paymentsLockEnabled) {
      setNumbersHidden(false);
      setShowRevealModal(false);
    } else {
      setRevealPasswordError(true);
    }
  };

  // دالة إصدار التقرير الشهري (محمي بكلمة السر)
  const handleMonthlyReportPassword = () => {
    if (paymentsLockEnabled && monthlyReportPasswordInput.trim() === (paymentsLockPassword ?? "").trim()) {
      setShowMonthlyReportPasswordModal(false);
      setMonthlyReportPasswordInput("");
      setMonthlyReportPasswordError(false);
      exportPDF();
    } else if (!paymentsLockEnabled) {
      setShowMonthlyReportPasswordModal(false);
      exportPDF();
    } else {
      setMonthlyReportPasswordError(true);
    }
  };

  const fmtDate = (d: string) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory-nu-latn":"en-GB",{ year:"numeric",month:"short",day:"numeric",calendar:"gregory" });

  // ── مساعد تنسيق التاريخ الميلادي للـ PDF ─────────────────────
  const fmtDateGregorian = (d: string) =>
    new Date(d+"T00:00:00").toLocaleDateString("ar-EG-u-ca-gregory-nu-latn", { year:"numeric", month:"short", day:"numeric" });

  // ── تصدير تقرير PDF شهري ─────────────────────────────────
  const exportPDF = () => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0,7);
    const monthPayments = payments
      .filter(p => p.date.startsWith(thisMonth))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthWithdrawals = withdrawals
      .filter(w => w.date.startsWith(thisMonth) && !w.is_reversed)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthExpenses = expenses
      .filter(e => e.date.startsWith(thisMonth) && !e.is_reversed)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthName = now.toLocaleDateString("ar-EG-u-ca-gregory-nu-latn", { year:"numeric", month:"long" });
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
        <td class="amount-green">+${p.amount.toLocaleString()} ${CUR}</td>
      </tr>`;
    }).join("");

    const withdrawalRows = monthWithdrawals.length > 0 ? monthWithdrawals.map(w => `<tr>
        <td>${fmtDateGregorian(w.date)}</td>
        <td colspan="3">${w.reason}</td>
        <td><span style="background:rgba(192,57,43,.1);color:#c0392b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">سحب</span></td>
        <td class="amount-red">-${w.amount.toLocaleString()} ${CUR}</td>
      </tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa;font-style:italic">لا توجد سحوبات هذا الشهر</td></tr>`;

    const catLabelsAr: Record<string,string> = { rent:"إيجار", supplies:"مستلزمات طبية", salary:"رواتب موظفين", utilities:"فواتير كهرباء/ماء", maintenance:"صيانة", other:"أخرى" };
    const expenseRows = monthExpenses.length > 0 ? monthExpenses.map(e => `<tr>
        <td>${fmtDateGregorian(e.date)}</td>
        <td colspan="2">${e.description}</td>
        <td>${catLabelsAr[e.category] || e.category}</td>
        <td><span style="background:rgba(123,45,139,.1);color:#7b2d8b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">مصروف</span></td>
        <td class="amount-purple">-${e.amount.toLocaleString()} ${CUR}</td>
      </tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa;font-style:italic">لا توجد مصروفات هذا الشهر</td></tr>`;

    // ── محاسبة الأطباء — للعيادات المشتركة فقط ─────────────
    const doctorSettlementRows = (() => {
      if (!isSharedClinicPlan(plan) || doctors.length === 0) return "";
      const paidMonthPayments = monthPayments.filter(p => p.status === "paid");
      const rows = doctors.map(doc => {
        const docPayments = paidMonthPayments.filter(p => (p as any).doctor_id === doc.id);
        if (docPayments.length === 0) return null;
        const totalRevenue = docPayments.reduce((s, p) => s + p.amount, 0);
        const docShare = docPayments.reduce((s, p) => {
          const pct = Number((p as any).doctor_share_percentage);
          return s + (!isNaN(pct) && (p as any).doctor_share_percentage != null ? p.amount * (pct / 100) : 0);
        }, 0);
        const unspecifiedCount = docPayments.filter(p => {
          const pct = (p as any).doctor_share_percentage;
          return pct == null || isNaN(Number(pct));
        }).length;
        return `<tr>
          <td>${isAr ? "د. " : "Dr. "}${doc.name}</td>
          <td>${docPayments.length}</td>
          <td class="amount-blue">${totalRevenue.toLocaleString()} ${CUR}</td>
          <td class="amount-green">${docShare.toLocaleString()} ${CUR}${unspecifiedCount > 0 ? ` <span style="color:#e67e22;font-size:10px">(${unspecifiedCount} بدون نسبة محددة)</span>` : ""}</td>
          <td class="amount-purple">${(totalRevenue - docShare).toLocaleString()} ${CUR}</td>
        </tr>`;
      }).filter(Boolean).join("");
      if (!rows) return "";
      return `
  <!-- قسم محاسبة الأطباء -->
  <div class="section-title" style="border-color:#0891b2">محاسبة الأطباء (نسبة كل طبيب من الإيرادات)</div>
  <table>
    <thead style="background:#0891b2"><tr style="color:#fff">
      <th>الطبيب</th><th>عدد الدفعات</th><th>إجمالي الإيرادات</th><th>حصة الطبيب</th><th>حصة العيادة</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
    })();


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
  .amount-blue { font-weight: 700; color: #0863ba; }
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
      <div class="stat-val green">+${totalPaid.toLocaleString()} ${CUR}</div>
      <div class="stat-label">إجمالي الدخل المدفوع</div>
    </div>
    <div class="stat">
      <div class="stat-val orange">${totalPending.toLocaleString()} ${CUR}</div>
      <div class="stat-label">إجمالي المعلّق</div>
    </div>
    <div class="stat">
      <div class="stat-val red">-${totalWD.toLocaleString()} ${CUR}</div>
      <div class="stat-label">إجمالي السحوبات</div>
    </div>
    <div class="stat">
      <div class="stat-val purple">-${totalEX.toLocaleString()} ${CUR}</div>
      <div class="stat-label">مصروفات العيادة</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${monthPayments.length + monthWithdrawals.length + monthExpenses.length}</div>
      <div class="stat-label">إجمالي الحركات</div>
    </div>
  </div>

  <!-- قسم الدخل -->
  <div class="section-title section-income">حركة الدفع — المدفوعات والمستحقات</div>
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
        <td>+${totalPaid.toLocaleString()} {CUR}</td>
      </tr>
    </tbody>
  </table>

  <!-- قسم السحوبات -->
  <div class="section-title section-withdraw">حركة السحوبات</div>
  <table>
    <thead class="withdraw-head">
      <tr>
        <th>التاريخ</th><th colspan="3">سبب السحب</th><th>النوع</th><th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${withdrawalRows}
      ${monthWithdrawals.length > 0 ? `<tr class="total-row"><td colspan="5" style="color:#c0392b">إجمالي السحوبات</td><td style="color:#c0392b">-${totalWD.toLocaleString()} ${CUR}</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم المصروفات -->
  <div class="section-title section-expense">حركة مصروفات العيادة</div>
  <table>
    <thead class="expense-head">
      <tr>
        <th>التاريخ</th><th colspan="2">الوصف</th><th>التصنيف</th><th>النوع</th><th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${expenseRows}
      ${monthExpenses.length > 0 ? `<tr class="total-row"><td colspan="5" style="color:#7b2d8b">إجمالي المصروفات</td><td style="color:#7b2d8b">-${totalEX.toLocaleString()} ${CUR}</td></tr>` : ""}
    </tbody>
  </table>
${doctorSettlementRows}

  <!-- الرصيد الصافي -->
  <div class="net-box ${netBalance >= 0 ? "net-positive" : "net-negative"}">
    <div>
      <div style="font-size:13px;font-weight:700;color:#555">الرصيد الصافي للشهر</div>
      <div style="font-size:11px;color:#888;margin-top:2px">الدخل المدفوع − السحوبات − المصروفات</div>
    </div>
    <div style="font-size:24px;font-weight:900;color:${netBalance >= 0 ? "#2e7d32" : "#c0392b"}">
      ${netBalance >= 0 ? "+" : ""}${netBalance.toLocaleString()} {CUR}
    </div>
  </div>

  <div class="footer">
    <span>نبض${clinicName ? " — " + clinicName : " — نظام إدارة العيادة"}</span>
    <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-EG-u-ca-gregory-nu-latn", { year:"numeric", month:"long", day:"numeric" })}</span>
  </div>
</body>
</html>`;

    const openReport = (html: string) => {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 500);
      } else {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
    };
    openReport(html);
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

    const dayLabel = now.toLocaleDateString("ar-EG-u-ca-gregory-nu-latn", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
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
            <td class="amount-green">+${p.amount.toLocaleString()} ${CUR}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa;font-style:italic;padding:16px">لا توجد مدفوعات اليوم</td></tr>`;

    const withdrawalRows = todayWithdrawals.length > 0
      ? todayWithdrawals.map(w => `<tr>
          <td colspan="3">${w.reason}${w.is_reversed ? ' <span style="color:#bbb;font-size:10px">(مُلغى)</span>' : ""}</td>
          <td><span style="background:rgba(192,57,43,.1);color:#c0392b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">سحب</span></td>
          <td class="${w.is_reversed?"":"amount-red"}" style="${w.is_reversed?"color:#bbb;text-decoration:line-through":""}">-${w.amount.toLocaleString()} ${CUR}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#aaa;font-style:italic;padding:16px">لا توجد سحوبات اليوم</td></tr>`;

    const expenseRows = todayExpenses.length > 0
      ? todayExpenses.map(e => `<tr>
          <td colspan="2">${e.description}</td>
          <td>${catLabelsAr[e.category] || e.category}</td>
          <td><span style="background:rgba(123,45,139,.1);color:#7b2d8b;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px">مصروف</span></td>
          <td class="amount-purple">-${e.amount.toLocaleString()} ${CUR}</td>
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
      <div class="day-badge">${dayLabel}</div>
    </div>
  </div>

  <!-- إحصائيات سريعة -->
  <div class="stats">
    <div class="stat stat-income">
      <div class="stat-val green">+${totalPaid.toLocaleString()} ${CUR}</div>
      <div class="stat-label">إجمالي الدخل اليوم</div>
    </div>
    <div class="stat stat-pending">
      <div class="stat-val orange">${totalPending.toLocaleString()} ${CUR}</div>
      <div class="stat-label">⏳ مستحقات معلّقة</div>
    </div>
    <div class="stat stat-withdraw">
      <div class="stat-val red">-${totalWD.toLocaleString()} ${CUR}</div>
      <div class="stat-label">سحوبات اليوم</div>
    </div>
    <div class="stat stat-expense">
      <div class="stat-val purple">-${totalEX.toLocaleString()} ${CUR}</div>
      <div class="stat-label">مصروفات اليوم</div>
    </div>
  </div>

  <!-- قسم المدفوعات -->
  <div class="section-title section-income">المدفوعات والمستحقات — اليوم</div>
  <table>
    <thead class="income-head">
      <tr><th>المريض</th><th>الوصف</th><th>طريقة الدفع</th><th>الحالة</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${paymentRows}
      ${todayPayments.length > 0 ? `<tr class="total-row"><td colspan="4">الإجمالي المدفوع</td><td>+${totalPaid.toLocaleString()} ${CUR}</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم السحوبات -->
  <div class="section-title section-withdraw">سحوبات اليوم</div>
  <table>
    <thead class="withdraw-head">
      <tr><th colspan="3">سبب السحب</th><th>النوع</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${withdrawalRows}
      ${todayWithdrawals.filter(w=>!w.is_reversed).length > 0 ? `<tr class="total-row"><td colspan="4" style="color:#c0392b">إجمالي السحوبات</td><td style="color:#c0392b">-${totalWD.toLocaleString()} ${CUR}</td></tr>` : ""}
    </tbody>
  </table>

  <!-- قسم المصروفات -->
  <div class="section-title section-expense">مصروفات العيادة — اليوم</div>
  <table>
    <thead class="expense-head">
      <tr><th colspan="2">الوصف</th><th>التصنيف</th><th>النوع</th><th>المبلغ</th></tr>
    </thead>
    <tbody>
      ${expenseRows}
      ${todayExpenses.length > 0 ? `<tr class="total-row"><td colspan="4" style="color:#7b2d8b">إجمالي المصروفات</td><td style="color:#7b2d8b">-${totalEX.toLocaleString()} ${CUR}</td></tr>` : ""}
    </tbody>
  </table>

  <!-- الرصيد اليومي الصافي -->
  <div class="net-box ${netBalance >= 0 ? "net-positive" : "net-negative"}">
    <div>
      <div class="net-label">${netBalance >= 0 ? "" : ""} الحساب اليومي الصافي</div>
      <div class="net-sub">الدخل المدفوع (${totalPaid.toLocaleString()}) − السحوبات (${totalWD.toLocaleString()}) − المصروفات (${totalEX.toLocaleString()})</div>
    </div>
    <div class="net-val" style="color:${netBalance >= 0 ? "#2e7d32" : "#c0392b"}">
      ${netBalance >= 0 ? "+" : ""}${netBalance.toLocaleString()} {CUR}
    </div>
  </div>

  <div class="footer">
    <span>نبض${clinicName ? " — " + clinicName : " — نظام إدارة العيادة"}</span>
    <span>وقت الطباعة: ${now.toLocaleString("ar-EG-u-ca-gregory-nu-latn", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
  </div>
</body>
</html>`;

    const openDailyReport = (html: string) => {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.focus(); win.print(); }, 500);
      } else {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
    };
    openDailyReport(html);
  };

  // ── استخراج فاتورة لدفعة واحدة ───────────────────────────
  const exportInvoicePDF = (payment: Payment, previewOnly: boolean = false) => {
    const patient = patients.find(x => x.id === payment.patient_id);
    const doctor = isSharedClinicPlan(plan) ? doctors.find(d => d.id === (payment as any).doctor_id) : null;
    const methodMap: Record<string,string> = { cash:"نقداً", card:"بطاقة", transfer:"تحويل" };
    const statusMap: Record<string,string> = { paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" };
    const sessionTypeMap: Record<string,string> = { consultation:"معاينة", session:"جلسة", followup:"مراجعة", other:(payment as any).session_type_other || "أخرى" };
    const invoiceNo = `INV-${payment.id}-${payment.date.replace(/-/g,"")}`;

    // ── محاسبة الطبيب — النسبة والحصص ─────────────────────
    const rawPct = (payment as any).doctor_share_percentage;
    const pctNum = rawPct != null && !isNaN(Number(rawPct)) ? Number(rawPct) : null;
    const doctorShareAmount = pctNum != null ? payment.amount * (pctNum / 100) : null;
    const clinicShareAmount = doctorShareAmount != null ? payment.amount - doctorShareAmount : null;
    const doctorSection = doctor ? `
  <div class="info-box" style="margin-bottom:24px;border-color:#0891b2">
    <h3 style="color:#0891b2">محاسبة الطبيب</h3>
    <div class="info-row"><span>الطبيب المعالج</span><span>د. ${doctor.name}</span></div>
    <div class="info-row"><span>النسبة المحتسبة للطبيب</span><span>${pctNum != null ? pctNum + " %" : "غير محددة"}</span></div>
    ${doctorShareAmount != null ? `<div class="info-row"><span>حصة الطبيب</span><span style="color:#2e7d32">${doctorShareAmount.toLocaleString()} ${CUR}</span></div>
    <div class="info-row"><span>حصة العيادة</span><span style="color:#0863ba">${clinicShareAmount!.toLocaleString()} ${CUR}</span></div>` : ""}
  </div>` : "";

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة ${invoiceNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Rubik', 'Arial', sans-serif; direction: rtl; background: #fff; color: #222; padding: 40px; font-size: 14px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0863ba; padding-bottom: 20px; margin-bottom: 28px; }
  .logo-text { font-size: 28px; font-weight: 800; color: #0863ba; }
  .logo-sub { font-size: 12px; color: #888; margin-top: 2px; }
  .invoice-title { text-align: left; }
  .invoice-title h1 { font-size: 20px; font-weight: 800; color: #353535; }
  .invoice-title p { font-size: 12px; color: #888; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .info-box { background: #f7f9fc; border: 1.5px solid #eef0f3; border-radius: 12px; padding: 16px 20px; }
  .info-box h3 { font-size: 11px; color: #aaa; font-weight: 700; text-transform: uppercase; margin-bottom: 10px; letter-spacing: .4px; }
  .info-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .info-row span:first-child { color: #888; }
  .info-row span:last-child { font-weight: 700; color: #353535; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #0863ba; color: #fff; }
  th { padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 700; }
  td { padding: 14px 16px; border-bottom: 1px solid #eef0f3; font-size: 13px; }
  .total-row td { font-weight: 800; background: #f0f7ff; color: #0863ba; border-top: 2px solid #0863ba; font-size: 16px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .status-paid { background: rgba(46,125,50,.1); color: #2e7d32; }
  .status-pending { background: rgba(230,126,34,.1); color: #e67e22; }
  .status-cancelled { background: rgba(192,57,43,.1); color: #c0392b; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1.5px solid #eef0f3; text-align: center; font-size: 11px; color: #aaa; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-text">نبض</div>
      <div class="logo-sub">${clinicName || "نظام إدارة العيادة"}</div>
    </div>
    <div class="invoice-title">
      <h1>فاتورة دفعة</h1>
      <p>${invoiceNo}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>بيانات المريض</h3>
      <div class="info-row"><span>الاسم</span><span>${patient?.name || "—"}</span></div>
      ${doctor ? `<div class="info-row"><span>الطبيب المعالج</span><span>${isAr ? "د. " : "Dr. "}${doctor.name}</span></div>` : ""}
    </div>
    <div class="info-box">
      <h3>بيانات الفاتورة</h3>
      <div class="info-row"><span>التاريخ</span><span>${fmtDateGregorian(payment.date)}</span></div>
      <div class="info-row"><span>طريقة الدفع</span><span>${methodMap[payment.method] || payment.method}</span></div>
      <div class="info-row"><span>الحالة</span><span class="status-badge status-${payment.status}">${statusMap[payment.status] || payment.status}</span></div>
    </div>
  </div>

  <table>
    <thead><tr><th>الوصف</th><th>نوع الجلسة</th><th>المبلغ</th></tr></thead>
    <tbody>
      <tr>
        <td>${payment.description || "—"}</td>
        <td>${(payment as any).session_type ? (sessionTypeMap[(payment as any).session_type] || "—") : "—"}</td>
        <td>${payment.amount.toLocaleString()} {CUR}</td>
      </tr>
      <tr class="total-row"><td colspan="2">الإجمالي</td><td>${payment.amount.toLocaleString()} ${CUR}</td></tr>
    </tbody>
  </table>

  ${doctorSection}

  ${payment.notes ? `<div class="info-box"><h3>ملاحظات</h3><div style="font-size:13px;color:#555">${payment.notes}</div></div>` : ""}

  <div class="footer">
    نبض${clinicName ? " — " + clinicName : ""} · تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG-u-ca-gregory-nu-latn", { year:"numeric", month:"long", day:"numeric" })}
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      if (!previewOnly) setTimeout(() => { win.focus(); win.print(); }, 500);
    } else {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
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
        .hero-glass-btn:hover{background:rgba(255,255,255,.24)!important}
        .page-anim{animation:fadeUp .4s ease both}
        .tx-row{transition:background .15s;border-bottom:1px solid #f0f2f5}
        .tx-row:last-child{border-bottom:none}
        .tx-row:hover{background:#fafbff}
        .filter-chip{padding:7px 16px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:linear-gradient(135deg,#0863ba,#3d8fd6);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(8,99,186,.3)}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .icon-btn{width:30px;height:30px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .tx-action-btn{width:36px;height:36px;border-radius:11px;border:1.5px solid transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;flex-shrink:0}
        .tx-action-btn:hover{transform:translateY(-2px)}
        .tx-action-view{background:rgba(8,99,186,.08);color:#0863ba;border-color:rgba(8,99,186,.18)}
        .tx-action-view:hover{background:rgba(8,99,186,.16);box-shadow:0 4px 12px rgba(8,99,186,.2)}
        .tx-action-invoice{background:rgba(46,125,50,.08);color:#2e7d32;border-color:rgba(46,125,50,.18)}
        .tx-action-invoice:hover{background:rgba(46,125,50,.16);box-shadow:0 4px 12px rgba(46,125,50,.2)}
        .tx-action-delete{background:rgba(192,57,43,.07);color:#c0392b;border-color:rgba(192,57,43,.16)}
        .tx-action-delete:hover{background:rgba(192,57,43,.15);box-shadow:0 4px 12px rgba(192,57,43,.2)}
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
          .page-title{font-size:19px!important}
          .page-sub{font-size:11.5px!important}
          .hero-card{margin:14px 0 18px!important;padding:18px 18px!important;border-radius:18px!important}
          .hero-inner{gap:10px!important}
          .page-sub{display:none!important}
          .export-btn{display:flex!important;padding:10px 12px!important;font-size:12px!important}
          .export-btn .export-btn-text{display:none!important}
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
          .main-content{margin-${isAr?"right":"left"}:${sidebarWidth}px;padding:0 32px 48px}
          .add-btn-text-short{display:none!important}
          .stats-slider-wrap{display:none!important}
          .stats-grid{display:grid!important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <PageIntro pageKey="payments" lang={lang as "ar" | "en"} />
        <SharedSidebar lang={lang as "ar"|"en"} setLang={setLang as (l:"ar"|"en")=>void} activePage="payments" plan={plan} planLoading={loading} onCollapse={(c) => setSidebarWidth(c ? 70 : 240)} />

        <main className="page-anim main-content" style={{ transition:"margin .3s" }}>

          {/* ── شاشة "غير متاح في الخطة الأساسية" ── */}
          {!loading && !canAccess("payments", plan) && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center",gap:16 }}>
              <div style={{ fontSize:64 }}><AppIcon glyph="🔒" /></div>
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
                  <AppIcon glyph="✅" /> {isAr?"الاحترافية — فردي أو مشترك":"Professional — Individual or Shared"}
                </div>
                <div style={{ padding:"10px 20px",background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontSize:13,color:"#e67e22",fontWeight:600 }}>
                  <AppIcon glyph="✅" /> {isAr?"الشاملة — فردي أو مشترك":"Comprehensive — Individual or Shared"}
                </div>
              </div>
              <a href="https://wa.me/963998285483" target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",background:"#25D366",color:"#fff",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:"0 4px 16px rgba(37,211,102,.35)",marginTop:8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.535 5.847L.057 23.882l6.196-1.447A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.214-3.68.859.925-3.585-.234-.369A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
                {isAr ? "تواصل معنا للترقية" : "Contact Us to Upgrade"}
              </a>
            </div>
          )}

          {/* ── المحتوى الكامل ── */}
          {canAccess("payments", plan) && (<>

          {/* ─── HERO HEADER ─── */}
          <div className="hero-card" style={{ margin:"20px 0 24px",background:"linear-gradient(120deg, #054a8c 0%, #0863ba 55%, #3d8fd6 100%)",borderRadius:24,padding:"26px 30px",position:"relative",overflow:"hidden",boxShadow:"0 12px 36px rgba(8,99,186,.26)" }}>
            <div style={{ position:"absolute",top:-60,insetInlineEnd:-40,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.07)" }}/>
            <div style={{ position:"absolute",bottom:-80,insetInlineEnd:130,width:170,height:170,borderRadius:"50%",background:"rgba(255,255,255,.05)" }}/>
            <div className="hero-inner" style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap" }}>
              <div>
                <h1 className="page-title" style={{ fontSize:24,fontWeight:800,color:"#fff" }}>{tr.page.title}</h1>
                <p className="page-sub" style={{ fontSize:12.5,color:"rgba(255,255,255,.85)",marginTop:5,fontWeight:500 }}>{tr.page.sub}</p>
              </div>
              <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                <button className="export-btn hero-glass-btn" onClick={()=>paymentsLockEnabled ? setShowMonthlyReportPasswordModal(true) : exportPDF()} style={{ padding:"9px 14px",background:"rgba(255,255,255,.14)",color:"#fff",border:"1.5px solid rgba(255,255,255,.28)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,backdropFilter:"blur(4px)",transition:"all .2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  {paymentsLockEnabled && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  <span className="export-btn-text">{tr.exportBtn} PDF</span>
                </button>
                <button onClick={exportDailyPDF} className="topbar-secondary-btn hero-glass-btn" style={{ padding:"9px 14px",background:"rgba(255,255,255,.14)",color:"#fff",border:"1.5px solid rgba(255,255,255,.28)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,backdropFilter:"blur(4px)",transition:"all .2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span className="btn-label">{tr.exportDailyBtn}</span>
                </button>
                <button onClick={()=>setShowExpenseModal(true)} className="topbar-secondary-btn hero-glass-btn" style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"rgba(255,255,255,.14)",color:"#fff",border:"1.5px solid rgba(255,255,255,.28)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",backdropFilter:"blur(4px)",transition:"all .2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
                  <span className="btn-label add-btn-text-full">{tr.expenseBtn}</span>
                </button>
                <button onClick={()=>setShowWithdrawModal(true)} className="topbar-secondary-btn hero-glass-btn" style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"rgba(255,255,255,.14)",color:"#fff",border:"1.5px solid rgba(255,255,255,.28)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",backdropFilter:"blur(4px)",transition:"all .2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  <span className="btn-label add-btn-text-full">{tr.withdrawBtn}</span>
                </button>
                <button className="add-btn" onClick={()=>setShowModal(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#fff",color:"#0863ba",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:"0 6px 18px rgba(0,0,0,.18)",transition:"all .2s" }}>
                  <span style={{ fontSize:18 }}>＋</span>
                  <span className="add-btn-text-full">{tr.recordPayment}</span>
                  <span className="add-btn-text-short">{isAr?"دفعة":"Add"}</span>
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:24 }}>
              {/* Monthly Revenue - big card */}
              <div className="stat-big" style={{ gridColumn:"span 1",animation:"fadeUp .4s 0ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#2e7d32,#66bb6a)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                  <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}><AppIcon glyph="💰" /></div>
                  <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)} title={numbersHidden?(isAr?"إظهار الأرقام":"Show numbers"):(isAr?"إخفاء الأرقام":"Hide numbers")}
                    style={{ width:32,height:32,borderRadius:8,background:"rgba(46,125,50,.08)",border:"1.5px solid rgba(46,125,50,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#2e7d32",fontSize:15,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                </div>
                <div style={{ fontSize:30,fontWeight:900,color:"#2e7d32",lineHeight:1 }}>
                  {maskNumber(stats.totalMonth)} {CUR}
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalMonth}</div>
                <div style={{ fontSize:11,color:"#2e7d32",marginTop:4,fontWeight:600 }}>↑ 12% {tr.stats.vsLast}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 60ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#0863ba,#a4c4e4)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                  <div style={{ width:40,height:40,background:"rgba(8,99,186,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}><AppIcon glyph="📊" /></div>
                  <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)} title={numbersHidden?(isAr?"إظهار الأرقام":"Show numbers"):(isAr?"إخفاء الأرقام":"Hide numbers")}
                    style={{ width:32,height:32,borderRadius:8,background:"rgba(8,99,186,.08)",border:"1.5px solid rgba(8,99,186,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#0863ba",fontSize:15,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                </div>
                <div style={{ fontSize:30,fontWeight:900,color:"#0863ba",lineHeight:1 }}>
                  {maskNumber(stats.totalYear)} {CUR}
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalYear}</div>
                <div style={{ fontSize:11,color:"#888",marginTop:4 }}>{stats.paidCount} {tr.stats.transactions}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 120ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#e67e22,#f39c12)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                  <div style={{ width:40,height:40,background:"rgba(230,126,34,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>⏳</div>
                  <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)} title={numbersHidden?(isAr?"إظهار الأرقام":"Show numbers"):(isAr?"إخفاء الأرقام":"Hide numbers")}
                    style={{ width:32,height:32,borderRadius:8,background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#e67e22",fontSize:15,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                </div>
                <div style={{ fontSize:30,fontWeight:900,color:"#e67e22",lineHeight:1 }}>
                  {maskNumber(stats.pendingAmt)} {CUR}
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
            <MobileStatsSlider stats={stats} methodStats={methodStats} methodIcon={methodIcon} tr={tr} isAr={isAr} numbersHidden={numbersHidden} onReveal={()=>{ if(numbersHidden){setRevealPasswordInput("");setRevealPasswordError(false);setShowRevealModal(true);}else{setNumbersHidden(true);}}} />

            {/* ── FINANCIAL SUMMARY ROW ── */}
            <div className="fin-summary-grid">
              {/* الرصيد الصافي */}
              <div style={{ background: stats.netBalance >= 0 ? "linear-gradient(135deg,#1b5e20,#2e7d32)" : "linear-gradient(135deg,#b71c1c,#c0392b)",borderRadius:18,padding:"20px 24px",color:"#fff",position:"relative",overflow:"hidden",boxShadow: stats.netBalance >= 0 ? "0 10px 28px rgba(46,125,50,.3)":"0 10px 28px rgba(192,57,43,.3)" }}>
                <div style={{ position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.06)" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div style={{ fontSize:12,fontWeight:600,opacity:.8 }}>{tr.netBalance} ({isAr?"السنة الحالية":"Current Year"})</div>
                  <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)}
                    style={{ width:30,height:30,borderRadius:8,background:"rgba(255,255,255,.15)",border:"1.5px solid rgba(255,255,255,.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                </div>
                <div style={{ fontSize:28,fontWeight:900,lineHeight:1 }}>{numbersHidden ? "••••••" : `${stats.netBalance.toLocaleString()}`} {CUR}</div>
                <div style={{ fontSize:11,opacity:.7,marginTop:8 }}>{isAr?"الإيرادات - السحوبات - المصروفات":"Revenue - Withdrawals - Expenses"}</div>
              </div>
              {/* إجمالي السحوبات */}
              <div style={{ background:"#fff",borderRadius:18,padding:"20px 24px",border:"1.5px solid #e6edf5",position:"relative",overflow:"hidden",boxShadow:"0 4px 20px rgba(8,99,186,.06)" }}>
                <div style={{ position:"absolute",top:0,insetInlineStart:0,width:"100%",height:4,background:"linear-gradient(90deg,#c0392b,#c0392b55)" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:"#888" }}>{tr.totalWithdrawals}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)}
                      style={{ width:30,height:30,borderRadius:8,background:"rgba(192,57,43,.08)",border:"1.5px solid rgba(192,57,43,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                    <button onClick={()=>setShowWithdrawModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(192,57,43,.08)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.withdrawBtn}</button>
                  </div>
                </div>
                <div style={{ fontSize:26,fontWeight:900,color:"#c0392b" }}>{numbersHidden ? "••••••" : `${stats.totalWithdrawals.toLocaleString()}`} {CUR}</div>
                <div style={{ fontSize:11,color:"#aaa",marginTop:6 }}>{withdrawals.length} {isAr?"عملية سحب":"withdrawals"}</div>
              </div>
              {/* مصروفات العيادة */}
              <div style={{ background:"#fff",borderRadius:18,padding:"20px 24px",border:"1.5px solid #e6edf5",position:"relative",overflow:"hidden",boxShadow:"0 4px 20px rgba(8,99,186,.06)" }}>
                <div style={{ position:"absolute",top:0,insetInlineStart:0,width:"100%",height:4,background:"linear-gradient(90deg,#7b2d8b,#7b2d8b55)" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:"#888" }}>{tr.totalExpenses}</span>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <button onClick={()=>numbersHidden ? (setRevealPasswordInput(""),setRevealPasswordError(false),setShowRevealModal(true)) : setNumbersHidden(true)}
                      style={{ width:30,height:30,borderRadius:8,background:"rgba(123,45,139,.08)",border:"1.5px solid rgba(123,45,139,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}><AppIcon glyph={numbersHidden?"👁":"🙈"} /></button>
                    <button onClick={()=>setShowExpenseModal(true)} style={{ fontSize:11,padding:"4px 10px",background:"rgba(123,45,139,.08)",color:"#7b2d8b",border:"1.5px solid rgba(123,45,139,.15)",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontWeight:600 }}>+ {tr.expenseBtn}</button>
                  </div>
                </div>
                <div style={{ fontSize:26,fontWeight:900,color:"#7b2d8b" }}>{numbersHidden ? "••••••" : `${stats.totalExpenses.toLocaleString()}`} {CUR}</div>
                <div style={{ fontSize:11,color:"#aaa",marginTop:6 }}>{expenses.length} {isAr?"مصروف مسجّل":"recorded expenses"}</div>
              </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div className="main-grid" style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,minWidth:0 }}>

              {/* LEFT: Table */}
              <div style={{ minWidth:0 }}>
                {/* Search + Filter */}
                <div style={{ background:"#fff",borderRadius:18,padding:"16px 18px",border:"1.5px solid #e6edf5",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",boxShadow:"0 4px 20px rgba(8,99,186,.06)" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#bbb",fontSize:14 }}><AppIcon glyph="🔍" /></span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}/>
                    {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb" }}>✕</button>}
                  </div>
                  <div className="filter-chips-wrap" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {Object.entries(tr.filter as Record<string, string>).map(([k, v]) => (
                      <button key={k} className={`filter-chip${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                    ))}
                    <button className={`filter-chip${filter==="withdrawal"?" active":""}`} onClick={()=>setFilter("withdrawal")}>{isAr?"سحوبات":"Withdrawals"}</button>
                    <button className={`filter-chip${filter==="expense"?" active":""}`} onClick={()=>setFilter("expense")}>{isAr?"مصروفات":"Expenses"}</button>
                    {isSharedClinicPlan(plan) && doctors.length > 0 && (
                      <>
                        <span style={{ width:1,alignSelf:"stretch",background:"#e6edf5",margin:"0 2px" }}/>
                        <button className={`filter-chip${selectedDoctor===null?" active":""}`} onClick={()=>setSelectedDoctor(null)}>{tr.sharedClinic.allDoctors}</button>
                        {doctors.map(doc => (
                          <button key={doc.id} onClick={()=>setSelectedDoctor(selectedDoctor===doc.id ? null : doc.id)}
                            className={`filter-chip${selectedDoctor===doc.id?" active":""}`}
                            style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <span style={{ width:8,height:8,borderRadius:"50%",background:selectedDoctor===doc.id?"#fff":(doc.color||"#0891b2"),flexShrink:0 }}/>
                            {isAr ? "د. " : "Dr. "}{doc.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Table / Cards */}
                <div style={{ background:"#fff",borderRadius:20,border:"1.5px solid #e6edf5",boxShadow:"0 4px 24px rgba(8,99,186,.07)",overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.table.title}</h3>
                    <span style={{ fontSize:12,color:"#aaa" }}>{filtered.length} {tr.stats.transactions}</span>
                  </div>

                  {/* Header row — desktop only */}
                  <div className="desktop-table-header" style={{ gridTemplateColumns: isSharedClinicPlan(plan) ? "100px 1.1fr 120px 1fr 96px 92px 110px 132px" : "100px 1.1fr 1fr 96px 92px 110px 132px",padding:"12px 22px",background:"linear-gradient(180deg,#f7fafd,#f1f6fb)",borderBottom:"1.5px solid #e6edf5",gap:0 }}>
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
                      <div style={{ fontSize:36,marginBottom:10 }}><AppIcon glyph="🔍" /></div>
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
                        {txPaged.map(p=>{
                          if ((p as any).__kind) return renderLedgerExtraRow(p);
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
                                  <div style={{ fontSize:15,fontWeight:800,color:amtColor }}>{p.amount.toLocaleString()} {CUR}</div>
                                  <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ss.bg,color:ss.color,marginTop:3,display:"inline-block" }}>{ss.label}</span>
                                </div>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                                  <span style={{ fontSize:11,color:"#aaa" }}>{fmtDate(p.date)}</span>
                                  <span style={{ fontSize:11,color:"#aaa" }}>{methodIcon[p.method]} {tr.methods[p.method]}</span>
                                </div>
                                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                  <button className="icon-btn" onClick={()=>exportInvoicePDF(p, true)} title={isAr?"معاينة الفاتورة":"Preview Invoice"}><AppIcon glyph="👁️" /></button>
                                <button className="icon-btn" onClick={()=>exportInvoicePDF(p)} title={isAr?"استخراج فاتورة":"Export Invoice"}><AppIcon glyph="🧾" /></button>
                                  <button className="icon-btn" onClick={()=>setDeleteId(p.id)}><AppIcon glyph="🗑️" /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* DESKTOP ROWS */}
                      <div className="desktop-tx">
                        {txPaged.map(p=>{
                          if ((p as any).__kind) return renderLedgerExtraRow(p);
                          const patient = patients.find(x=>x.id===p.patient_id);
                          const ss = statusStyle[p.status]||statusStyle.paid;
                          const isNew = animIds.includes(p.id);
                          const doctor = isSharedClinicPlan(plan) ? doctors.find(d => d.id === (p as any).doctor_id) : null;
                          return (
                            <div key={p.id} className="tx-row" style={{ display:"grid",gridTemplateColumns:isSharedClinicPlan(plan)?"100px 1.1fr 120px 1fr 96px 92px 110px 132px":"100px 1.1fr 1fr 96px 92px 110px 132px",padding:"16px 22px",alignItems:"center",animation:isNew?"rowPop .4s ease":undefined }}>
                              <div style={{ fontSize:12,color:"#888" }}>{fmtDate(p.date)}</div>
                              <div style={{ display:"flex",alignItems:"center",gap:10,paddingLeft:8 }}>
                                <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                                  {patient?getInitials(patient.name):"?"}
                                </div>
                                <div style={{ fontSize:13,fontWeight:500,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
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
                                    other:       {icon:"📝",color:"#e67e22",bg:"rgba(230,126,34,.08)"},
                                  };
                                  const st = stMap[(p as any).session_type];
                                  if (!st) return null;
                                  const label = (p as any).session_type==="other"
                                    ? ((p as any).session_type_other || tr.sessionType.other)
                                    : tr.sessionType[(p as any).session_type as keyof typeof tr.sessionType];
                                  return (
                                    <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:st.bg,color:st.color,marginInlineEnd:5 }}>
                                      {st.icon} {label}
                                    </span>
                                  );
                                })()}
                                {/* شارة الدفع المسبق */}
                                {(p as any).is_prepayment && (
                                  <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"rgba(123,45,139,.1)",color:"#7b2d8b",marginInlineEnd:5 }}>
                                    <AppIcon glyph="💳" /> {tr.prepayment.badgePrefix}{(p as any).prepayment_sessions ?? ""}
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
                                {p.amount.toLocaleString()} {CUR}
                              </div>
                              <div style={{ display:"flex",justifyContent:"flex-end",gap:6 }}>
                                <button className="tx-action-btn tx-action-view" onClick={()=>exportInvoicePDF(p, true)} title={isAr?"معاينة الفاتورة":"Preview Invoice"}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                                <button className="tx-action-btn tx-action-invoice" onClick={()=>exportInvoicePDF(p)} title={isAr?"استخراج فاتورة":"Export Invoice"}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
                                </button>
                                <button className="tx-action-btn tx-action-delete" onClick={()=>setDeleteId(p.id)} title={tr.deleteConfirm}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* ── ترقيم الصفحات ── */}
                      {txTotalPages > 1 && (
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"16px 0 18px",flexWrap:"wrap",borderTop:"1px solid #f2f6fa" }}>
                          <button onClick={()=>setTxPage(p=>Math.max(1,p-1))} disabled={txSafePage===1}
                            style={{ width:34,height:34,borderRadius:10,border:"1.5px solid #e6edf5",background:"#fff",cursor:txSafePage===1?"not-allowed":"pointer",opacity:txSafePage===1?0.4:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0863ba" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isAr?"none":"scaleX(-1)" }}><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                          {(() => {
                            const pages: (number|string)[] = [];
                            for (let i=1;i<=txTotalPages;i++){
                              if (i===1||i===txTotalPages||Math.abs(i-txSafePage)<=1) pages.push(i);
                              else if (pages[pages.length-1]!=="…") pages.push("…");
                            }
                            return pages.map((pg,idx)=> pg==="…" ? (
                              <span key={`e${idx}`} style={{ color:"#b3bdc9",fontSize:13,padding:"0 2px" }}>…</span>
                            ) : (
                              <button key={pg} onClick={()=>setTxPage(pg as number)}
                                style={{ minWidth:34,height:34,padding:"0 8px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",fontVariantNumeric:"tabular-nums",
                                  border:pg===txSafePage?"none":"1.5px solid #e6edf5",
                                  background:pg===txSafePage?"linear-gradient(135deg,#0863ba,#3d8fd6)":"#fff",
                                  color:pg===txSafePage?"#fff":"#8a97a6",
                                  boxShadow:pg===txSafePage?"0 4px 12px rgba(8,99,186,.3)":"none",transition:"all .2s" }}>
                                {pg}
                              </button>
                            ));
                          })()}
                          <button onClick={()=>setTxPage(p=>Math.min(txTotalPages,p+1))} disabled={txSafePage===txTotalPages}
                            style={{ width:34,height:34,borderRadius:10,border:"1.5px solid #e6edf5",background:"#fff",cursor:txSafePage===txTotalPages?"not-allowed":"pointer",opacity:txSafePage===txTotalPages?0.4:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0863ba" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform:isAr?"scaleX(-1)":"none" }}><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Total */}
                {filtered.length>0&&(
                  <div style={{ display:"flex",justifyContent:"flex-end",alignItems:"center",gap:16,marginTop:14,padding:"12px 20px",background:"#fff",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                    <span style={{ fontSize:13,color:"#888" }}>{isAr?"المجموع:":"Total:"}</span>
                    <span style={{ fontSize:18,fontWeight:900,color:"#2e7d32" }}>
                      {filtered.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()} {CUR}
                    </span>
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
                  <div style={{ background:"#fff",borderRadius:18,border:"1.5px solid #e6edf5",padding:"18px 18px",boxShadow:"0 4px 20px rgba(8,99,186,.06)",marginBottom:16,position:"relative",overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,insetInlineStart:0,width:"100%",height:4,background:"linear-gradient(90deg,#0891b2,#0891b255)" }}/>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
                      <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:16 }}><AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /></span>
                        {tr.sharedClinic.doctorRevenue}
                      </h3>
                      <span style={{ fontSize:11,background:"rgba(8,145,178,.08)",color:"#0891b2",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>
                        {isAr ? "هذا الشهر" : "This Month"}
                      </span>
                    </div>
                    {doctorRevenueStats.map((doc, i) => {
                      const maxRev = Math.max(...doctorRevenueStats.map(d => d.shareRevenue), 1);
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
                              <span style={{ fontSize:13,fontWeight:800,color:doc.color||"#0891b2" }}>{numbersHidden ? "••••••" : doc.shareRevenue.toLocaleString()} {CUR}</span>
                              <span style={{ fontSize:10,color:"#aaa",marginInlineStart:6 }}>({doc.count} {isAr?"معاملة":"tx"})</span>
                              {!numbersHidden && doc.shareRevenue !== doc.monthlyRevenue && (
                                <div style={{ fontSize:9.5,color:"#8a97a6",marginTop:2 }}>
                                  {isAr?"الإجمالي:":"Gross:"} {doc.monthlyRevenue.toLocaleString()} {CUR}
                                  {doc.unspecified>0 && <span style={{ color:"#e67e22" }}> · {doc.unspecified} {isAr?"بدون نسبة":"no %"}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ height:5,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${Math.round((doc.shareRevenue/maxRev)*100)}%`,background:`linear-gradient(90deg, ${doc.color||"#0891b2"}, ${doc.color||"#0891b2"}99)`,borderRadius:10,transition:"width .8s cubic-bezier(.4,0,.2,1)" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pending Dues */}
                <div style={{ background:"#fff",borderRadius:18,border:"1.5px solid #e6edf5",padding:"18px",boxShadow:"0 4px 20px rgba(8,99,186,.06)",minWidth:0,overflow:"hidden",position:"relative" }}>
                  <div style={{ position:"absolute",top:0,insetInlineStart:0,width:"100%",height:4,background:"linear-gradient(90deg,#e67e22,#e67e2255)" }}/>
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
                            <span style={{ fontSize:14,fontWeight:800,color:"#e67e22" }}>{p.amount.toLocaleString()} {CUR}</span>
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

              </div>

            </div>
          </div>
          </>)}
        </main>

        {/* Add Modal */}
        {showModal&&<PaymentModal lang={lang} patients={patients} doctors={doctors} isSharedClinic={isSharedClinicPlan(plan)} onSave={handleSave} onClose={()=>setShowModal(false)}/>}

        {/* Reveal Numbers Modal */}
        {showRevealModal&&(
          <PasswordPromptModal
            isAr={isAr} icon="👁" expected={paymentsLockPassword}
            title={isAr?"إظهار الأرقام":"Show Numbers"}
            desc={isAr?"أدخل كلمة السر لرؤية الأرقام":"Enter password to view numbers"}
            confirmLabel={isAr?"عرض":"Show"}
            onSuccess={()=>{ setNumbersHidden(false); setShowRevealModal(false); }}
            onClose={()=>setShowRevealModal(false)}
          />
        )}

        {/* Monthly Report Password Modal */}
        {showMonthlyReportPasswordModal&&(
          <PasswordPromptModal
            isAr={isAr} icon="🔒" expected={paymentsLockPassword}
            title={isAr?"التقرير الشهري محمي":"Monthly Report Protected"}
            desc={isAr?"أدخل كلمة سر صفحة المدفوعات لإصدار التقرير الشهري":"Enter payments page password to export monthly report"}
            confirmLabel={isAr?"إصدار التقرير":"Export Report"}
            onSuccess={()=>{ setShowMonthlyReportPasswordModal(false); exportPDF(); }}
            onClose={()=>setShowMonthlyReportPasswordModal(false)}
          />
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal&&<WithdrawModal lang={lang} onSave={handleWithdraw} onClose={()=>setShowWithdrawModal(false)}/>}

        {/* Expense Modal */}
        {showExpenseModal&&<ExpenseModal lang={lang} onSave={handleExpense} onClose={()=>setShowExpenseModal(false)}/>}

        {/* Delete Confirm */}
        {deleteId&&(
          <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
            <div onClick={()=>setDeleteId(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
            <div className="modal-inner-center" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:360,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}><AppIcon glyph="🗑️" /></div>
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
                    <span style={{ fontSize:13,fontWeight:700,color:"#c0392b" }}>+{w.amount.toLocaleString()} {CUR}</span>
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
        {/* Reverse Expense Confirm */}
        {reverseExpenseId!==null&&(
          <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
            <div onClick={()=>setReverseExpenseId(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
            <div className="modal-inner-center" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:44,marginBottom:12 }}>↩️</div>
              <h3 style={{ fontSize:16,fontWeight:800,color:"#353535",marginBottom:10 }}>
                {isAr?"التراجع عن المصروف":"Undo Expense"}
              </h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.7,marginBottom:6 }}>
                {tr.expensesSection.reverseConfirm}
              </p>
              {(()=>{
                const exp = expenses.find(x=>x.id===reverseExpenseId);
                return exp ? (
                  <div style={{ background:"rgba(123,45,139,.06)",border:"1.5px solid rgba(123,45,139,.15)",borderRadius:12,padding:"10px 16px",marginBottom:20,display:"inline-flex",alignItems:"center",gap:8 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"#7b2d8b" }}>+{exp.amount.toLocaleString()} {CUR}</span>
                    <span style={{ fontSize:12,color:"#888" }}>{exp.description}</span>
                  </div>
                ) : null;
              })()}
              <div style={{ display:"flex",gap:12,marginTop:8 }}>
                <button onClick={()=>reverseExpense(reverseExpenseId)}
                  style={{ flex:1,padding:"14px",background:"#7b2d8b",color:"#fff",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(123,45,139,.3)",minHeight:50 }}>
                  {isAr?"نعم، تراجع":"Yes, Undo"}
                </button>
                <button onClick={()=>setReverseExpenseId(null)}
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