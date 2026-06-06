"use client";

// ============================================================
// NABD - نبض | Secretary Dashboard — لوحة السكرتيرة
// صفحة مخصصة للسكرتيرة: مواعيد، مرضى، دفعات، تقرير يومي
// تجربة موبايل أولى — Mobile-First
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment, Payment } from "@/lib/supabase";

type Lang = "ar" | "en";
type Status = "scheduled" | "completed" | "cancelled" | "no-show";
type Tab = "appointments" | "patients" | "payments" | "report";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

// ── Helpers ─────────────────────────────────────────────────
const AVT = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id: number) => AVT[Math.abs(id ?? 0) % AVT.length] ?? "#0863ba";
const getInitials = (name: string) => (name||"?").split(" ").slice(0,2).map(w=>w[0]??"").join("").toUpperCase()||"?";
const toKey       = (y:number,m:number,d:number) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const now         = new Date();
const todayKey    = toKey(now.getFullYear(), now.getMonth(), now.getDate());
const isSharedPlan= (p:PlanType) => p.startsWith("shared_");

const MONTH_NAMES_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const MONTH_NAMES_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES_AR   = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];
const DAY_NAMES_EN   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtDate(dateStr:string, lang:Lang){
  const d = new Date(dateStr+"T00:00:00");
  if(lang==="ar") return `${d.getDate()} ${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`;
  return `${MONTH_NAMES_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function statusColor(s:Status){ return { scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" }[s]; }
function statusLabel(s:Status, lang:Lang){ return lang==="ar"
  ? { scheduled:"محدد", completed:"مكتمل", cancelled:"ملغي", "no-show":"لم يحضر" }[s]
  : { scheduled:"Scheduled", completed:"Completed", cancelled:"Cancelled", "no-show":"No Show" }[s]; }

// ─── Strings ─────────────────────────────────────────────────
const TR = {
  ar:{
    title:"لوحة السكرتيرة",
    tabs:{ appointments:"المواعيد", patients:"المرضى", payments:"الدفعات", report:"التقرير اليومي" },
    greeting_morning:"صباح الخير", greeting_afternoon:"مساء الخير", greeting_evening:"مساء النور",
    secretary:"السكرتيرة",
    today:"اليوم", loading:"جاري التحميل...", saving:"جاري الحفظ...", noData:"لا توجد بيانات",
    // stats
    todayAppts:"مواعيد اليوم", totalPatients:"المرضى", pendingPayments:"مستحقات", todayIncome:"دخل اليوم",
    completed:"مكتمل", remaining:"متبقي",
    // appointments
    addAppt:"موعد جديد", noAppts:"لا توجد مواعيد اليوم",
    apptCard:{ time:"الوقت", patient:"المريض", type:"النوع", notes:"ملاحظات", doctor:"الطبيب" },
    statuses:{ scheduled:"محدد", completed:"مكتمل", cancelled:"ملغي", "no-show":"لم يحضر" },
    whatsapp:"واتساب",
    // patients
    addPatient:"إضافة مريض", searchPH:"بحث بالاسم أو الرقم...",
    patientCard:{ phone:"الهاتف", gender:"الجنس", lastVisit:"آخر زيارة" },
    gender:{ male:"ذكر", female:"أنثى" },
    editInfo:"تعديل المعلومات", medFile:"السجل الطبي",
    // payments
    addPayment:"إضافة دفعة", addWithdraw:"سحب/مصروف",
    payCard:{ amount:"المبلغ", method:"طريقة الدفع", status:"الحالة", date:"التاريخ" },
    methods:{ cash:"نقداً", card:"بطاقة", transfer:"تحويل" },
    payStatuses:{ paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" },
    markPaid:"تحديد كمدفوع",
    pendingSection:"المستحقات المعلّقة",
    // report
    dailyReport:"التقرير اليومي",
    reportDate:"تاريخ التقرير",
    exportPrint:"طباعة / تصدير",
    reportStats:{ appts:"مجموع المواعيد", completed:"مكتملة", cancelled:"ملغاة", noshow:"لم يحضر", income:"الدخل اليومي (مدفوع فقط)", newPatients:"مرضى جدد" },
    reportApptsTitle:"تفاصيل المواعيد",
    reportPayTitle:"المدفوعات اليومية",
    currency:"ل.س",
    // modals
    modal:{
      cancel:"إلغاء", save:"حفظ", required:"الحقول المطلوبة غير مكتملة",
      patient:"المريض *", selectPatient:"اختر المريض",
      doctor:"الطبيب", selectDoctor:"اختر الطبيب",
      date:"التاريخ *", time:"الوقت *", duration:"المدة (دقيقة) *",
      visitType:"نوع الزيارة", notesLabel:"ملاحظات",
      addApptTitle:"إضافة موعد جديد", editApptTitle:"تعديل الموعد",
      changeStatus:"تغيير الحالة",
      // patient modal
      addPatientTitle:"إضافة مريض جديد", editPatientTitle:"تعديل بيانات المريض",
      name:"الاسم *", phone:"الهاتف", genderLabel:"الجنس",
      dob:"تاريخ الميلاد", address:"العنوان", notes:"ملاحظات",
      // payment modal
      addPaymentTitle:"تسجيل دفعة جديدة",
      amount:"المبلغ (ل.س) *", amountPH:"0.00",
      description:"الوصف", descPH:"مثال: رسوم استشارة...",
      method:"طريقة الدفع *", payDate:"التاريخ *", payStatus:"الحالة",
      addPending:"إضافة كمستحق",
      // withdraw/expense modal
      withdrawTitle:"تسجيل سحب / مصروف",
      txType:"النوع *", withdrawal:"سحب", expense:"مصروف",
      reason:"السبب / الوصف *", reasonPH:"مثال: راتب، فاتورة...",
    },
    signOut:"تسجيل الخروج",
    secretaryLabel:"وصول السكرتيرة",
    restrictedNote:"لديك صلاحية الوصول للمواعيد والمرضى والدفعات والتقرير اليومي فقط",
  },
  en:{
    title:"Secretary Dashboard",
    tabs:{ appointments:"Appointments", patients:"Patients", payments:"Payments", report:"Daily Report" },
    greeting_morning:"Good Morning", greeting_afternoon:"Good Afternoon", greeting_evening:"Good Evening",
    secretary:"Secretary",
    today:"Today", loading:"Loading...", saving:"Saving...", noData:"No data",
    todayAppts:"Today's Appts", totalPatients:"Patients", pendingPayments:"Pending", todayIncome:"Today's Income",
    completed:"Completed", remaining:"Remaining",
    addAppt:"New Appointment", noAppts:"No appointments today",
    apptCard:{ time:"Time", patient:"Patient", type:"Type", notes:"Notes", doctor:"Doctor" },
    statuses:{ scheduled:"Scheduled", completed:"Completed", cancelled:"Cancelled", "no-show":"No Show" },
    whatsapp:"WhatsApp",
    addPatient:"Add Patient", searchPH:"Search by name or ID...",
    patientCard:{ phone:"Phone", gender:"Gender", lastVisit:"Last Visit" },
    gender:{ male:"Male", female:"Female" },
    editInfo:"Edit Info", medFile:"Medical File",
    addPayment:"Add Payment", addWithdraw:"Withdraw/Expense",
    payCard:{ amount:"Amount", method:"Method", status:"Status", date:"Date" },
    methods:{ cash:"Cash", card:"Card", transfer:"Transfer" },
    payStatuses:{ paid:"Paid", pending:"Pending", cancelled:"Cancelled" },
    markPaid:"Mark as Paid",
    pendingSection:"Pending Payments",
    dailyReport:"Daily Report",
    reportDate:"Report Date",
    exportPrint:"Print / Export",
    reportStats:{ appts:"Total Appointments", completed:"Completed", cancelled:"Cancelled", noshow:"No Show", income:"Daily Income (Paid)", newPatients:"New Patients" },
    reportApptsTitle:"Appointment Details",
    reportPayTitle:"Daily Payments",
    currency:"SYP",
    modal:{
      cancel:"Cancel", save:"Save", required:"Required fields are incomplete",
      patient:"Patient *", selectPatient:"Select patient",
      doctor:"Doctor", selectDoctor:"Select doctor",
      date:"Date *", time:"Time *", duration:"Duration (min) *",
      visitType:"Visit Type", notesLabel:"Notes",
      addApptTitle:"New Appointment", editApptTitle:"Edit Appointment",
      changeStatus:"Change Status",
      addPatientTitle:"Add New Patient", editPatientTitle:"Edit Patient",
      name:"Name *", phone:"Phone", genderLabel:"Gender",
      dob:"Date of Birth", address:"Address", notes:"Notes",
      addPaymentTitle:"Record New Payment",
      amount:"Amount (SYP) *", amountPH:"0.00",
      description:"Description", descPH:"e.g. Consultation fee...",
      method:"Payment Method *", payDate:"Date *", payStatus:"Status",
      addPending:"Add as Pending",
      withdrawTitle:"Record Withdrawal / Expense",
      txType:"Type *", withdrawal:"Withdrawal", expense:"Expense",
      reason:"Reason / Description *", reasonPH:"e.g. Salary, bill...",
    },
    signOut:"Sign Out",
    secretaryLabel:"Secretary Access",
    restrictedNote:"You have access to appointments, patients, payments, and daily report only",
  },
} as const;

// ─── Doctor type ──────────────────────────────────────────
type Doctor = { id: number; name: string; name_en?: string; color?: string; };

// ─── Inline CSS (injected once) ──────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{font-family:'Rubik',sans-serif;background:#f4f6fa;color:#353535;overflow-x:hidden;}
.sec-app{min-height:100vh;background:#f4f6fa;}
/* tabs */
.sec-tab-bar{display:flex;background:#fff;border-bottom:2px solid #eef0f3;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;position:sticky;top:0;z-index:40;box-shadow:0 2px 8px rgba(8,99,186,.07);}
.sec-tab-bar::-webkit-scrollbar{display:none;}
.sec-tab{flex:1;min-width:80px;padding:14px 8px;border:none;background:transparent;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;color:#999;display:flex;flex-direction:column;align-items:center;gap:4px;transition:color .2s,border-color .2s;border-bottom:3px solid transparent;white-space:nowrap;}
.sec-tab.active{color:#0863ba;border-bottom-color:#0863ba;font-weight:700;}
.sec-tab svg{transition:transform .2s;}
.sec-tab.active svg{transform:scale(1.15);}
/* cards */
.appt-card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 10px rgba(8,99,186,.06);border:1.5px solid #eef0f3;margin-bottom:10px;transition:box-shadow .2s;}
.appt-card:active{box-shadow:0 4px 20px rgba(8,99,186,.14);}
.patient-card{background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 2px 10px rgba(8,99,186,.06);border:1.5px solid #eef0f3;margin-bottom:10px;display:flex;align-items:center;gap:12px;transition:box-shadow .2s;}
.patient-card:active{box-shadow:0 4px 20px rgba(8,99,186,.14);}
.pay-card{background:#fff;border-radius:16px;padding:14px;box-shadow:0 2px 10px rgba(8,99,186,.06);border:1.5px solid #eef0f3;margin-bottom:10px;}
/* modal */
.sec-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(5px);z-index:200;display:flex;align-items:flex-end;justify-content:center;padding:0;}
.sec-modal{background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;padding:24px 20px 40px;animation:slideUp .3s cubic-bezier(.4,0,.2,1);}
@media(min-width:600px){.sec-modal-bg{align-items:center;padding:16px;} .sec-modal{border-radius:24px;max-height:88vh;}}
@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.field-input{width:100%;padding:11px 14px;border:1.5px solid #e8eaee;border-radius:12px;font-family:'Rubik',sans-serif;font-size:14px;color:#353535;background:#fafbfc;outline:none;transition:border-color .2s,box-shadow .2s;}
.field-input:focus{border-color:#0863ba;box-shadow:0 0 0 3px rgba(8,99,186,.12);background:#fff;}
/* stat pills */
.stat-pill{background:#fff;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;box-shadow:0 2px 8px rgba(8,99,186,.07);border:1.5px solid #eef0f3;flex:1;min-width:0;}
/* FAB */
.sec-fab{position:fixed;bottom:24px;right:20px;width:56px;height:56px;border-radius:50%;background:#0863ba;color:#fff;border:none;cursor:pointer;font-size:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(8,99,186,.45);z-index:50;transition:transform .2s,box-shadow .2s;}
.sec-fab:active{transform:scale(.94);box-shadow:0 3px 12px rgba(8,99,186,.35);}
.sec-fab.rtl{right:unset;left:20px;}
/* header */
.sec-header{background:linear-gradient(135deg,#0863ba 0%,#0558a3 100%);color:#fff;padding:20px 20px 16px;position:relative;overflow:hidden;}
.sec-header::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.07);pointer-events:none;}
.sec-header::after{content:'';position:absolute;bottom:-30px;left:-20px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.05);pointer-events:none;}
/* status badge */
.status-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;}
/* print */
@media print{.sec-tab-bar,.sec-fab,.no-print{display:none!important;} .print-area{padding:0!important;}}
/* scroll container */
.tab-content{padding:16px;animation:fadeIn .25s ease;}
/* report section */
.report-stat{background:#f8faff;border:1.5px solid #e4ecf8;border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
/* expand row */
.expand-row{border-top:1px solid #f0f2f5;margin-top:10px;padding-top:10px;}
/* avatar */
.avatar{width:42px;height:42px;border-radius:12px;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;}
/* section title */
.sec-section-title{font-size:15px;font-weight:700;color:#353535;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
`;

// ─── Field helper ────────────────────────────────────────
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function SecretaryDashboard({ lang: initialLang = "ar" }: { lang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const isAr = lang === "ar";
  const tr = TR[lang];

  const [activeTab, setActiveTab] = useState<Tab>("appointments");
  const [loading, setLoading] = useState(true);

  // Data
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [doctors, setDoctors]           = useState<Doctor[]>([]);
  const [clinicId, setClinicId]         = useState<string | null>(null);
  const [plan, setPlan]                 = useState<PlanType>("basic");

  // UI
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [searchPatients, setSearchPatients] = useState("");
  const [expandedAppt, setExpandedAppt]     = useState<number | null>(null);
  const [expandedPat, setExpandedPat]       = useState<number | null>(null);

  // modals
  const [apptModal, setApptModal]       = useState<"add"|"edit"|null>(null);
  const [editApptData, setEditApptData] = useState<Appointment | null>(null);
  const [patModal, setPatModal]         = useState<"add"|"edit"|null>(null);
  const [editPatData, setEditPatData]   = useState<Patient | null>(null);
  const [payModal, setPayModal]         = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [reportDate, setReportDate]     = useState(todayKey);

  // saving
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Greet
  const greetKey = (): "greeting_morning"|"greeting_afternoon"|"greeting_evening" => {
    const h = new Date().getHours();
    if(h<12) return "greeting_morning";
    if(h<17) return "greeting_afternoon";
    return "greeting_evening";
  };

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data: clinic } = await supabase
        .from("clinics").select("id,plan").eq("user_id", user.id).single();
      if (clinic) { setClinicId(clinic.id); setPlan(clinic.plan ?? "basic"); }

      const cid = clinic?.id;
      if (!cid) { setLoading(false); return; }

      const [patsRes, apptsRes, paysRes, docsRes] = await Promise.all([
        supabase.from("patients").select("*").eq("clinic_id", cid).eq("is_hidden", false).order("name"),
        supabase.from("appointments").select("*").eq("clinic_id", cid).order("date").order("time"),
        supabase.from("payments").select("*").eq("clinic_id", cid).order("date", { ascending:false }),
        supabase.from("doctors").select("id,name,name_en,color").eq("clinic_id", cid),
      ]);

      setPatients(patsRes.data ?? []);
      setAppointments(apptsRes.data ?? []);
      setPayments(paysRes.data ?? []);
      setDoctors(docsRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  // ── Derived ────────────────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments.filter(a => a.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time)),
    [appointments, selectedDate]);

  const todayPayments = useMemo(() =>
    payments.filter(p => p.date === todayKey && (p as any).type !== "withdrawal" && (p as any).type !== "expense"),
    [payments]);

  const todayIncome = useMemo(() =>
    todayPayments.filter(p => p.status === "paid").reduce((s,p) => s + Number(p.amount), 0),
    [todayPayments]);

  const pendingPayments = useMemo(() =>
    payments.filter(p => p.status === "pending" && (p as any).type !== "withdrawal" && (p as any).type !== "expense"),
    [payments]);

  const filteredPatients = useMemo(() => {
    const q = searchPatients.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      (p.phone ?? "").includes(q));
  }, [patients, searchPatients]);

  const getPatientName = (id:number) => patients.find(p=>p.id===id)?.name ?? "—";
  const getDoctorName  = (id:number, l:Lang) => { const d = doctors.find(d=>d.id===id); return d ? (l==="ar"?d.name:(d.name_en||d.name)) : "—"; };

  // ── Week dates strip ───────────────────────────────────
  const weekDates = useMemo(() => {
    const d = new Date(todayKey+"T00:00:00");
    const result = [];
    for(let i=-3; i<=6; i++){
      const nd = new Date(d);
      nd.setDate(nd.getDate()+i);
      result.push(toKey(nd.getFullYear(), nd.getMonth(), nd.getDate()));
    }
    return result;
  }, []);

  // ── Save appointment ───────────────────────────────────
  const handleSaveAppt = async (form: {
    patient_id:number|""; doctor_id:number|""; date:string; time:string; duration:number;
    type:string; notes:string; status:Status;
  }) => {
    setError("");
    if(!form.patient_id || !form.date || !form.time) { setError(tr.modal.required); return; }
    setSaving(true);
    const payload = { ...form, clinic_id: clinicId, doctor_id: form.doctor_id||null };
    if(editApptData?.id){
      const { error:e } = await supabase.from("appointments").update(payload).eq("id", editApptData.id);
      if(e){ setError(e.message); setSaving(false); return; }
      setAppointments(prev => prev.map(a => a.id===editApptData.id ? {...a,...payload} as Appointment : a));
    } else {
      const { data, error:e } = await supabase.from("appointments").insert([payload]).select().single();
      if(e){ setError(e.message); setSaving(false); return; }
      if(data) setAppointments(prev => [...prev, data]);
    }
    setSaving(false);
    setApptModal(null);
    setEditApptData(null);
  };

  // ── Save patient ────────────────────────────────────────
  const handleSavePat = async (form: {
    name:string; phone:string; gender:string; dob:string; address:string; notes:string;
  }) => {
    setError("");
    if(!form.name.trim()) { setError(tr.modal.required); return; }
    setSaving(true);
    const payload = { ...form, clinic_id: clinicId };
    if(editPatData?.id){
      const { error:e } = await supabase.from("patients").update(payload).eq("id", editPatData.id);
      if(e){ setError(e.message); setSaving(false); return; }
      setPatients(prev => prev.map(p => p.id===editPatData.id ? {...p,...form} as Patient : p));
    } else {
      const { data, error:e } = await supabase.from("patients").insert([payload]).select().single();
      if(e){ setError(e.message); setSaving(false); return; }
      if(data) setPatients(prev => [...prev, data]);
    }
    setSaving(false);
    setPatModal(null);
    setEditPatData(null);
  };

  // ── Save payment ────────────────────────────────────────
  const handleSavePay = async (form: {
    patient_id:number|""; amount:number; description:string; method:string; date:string; status:string; notes:string;
  }) => {
    setError("");
    if(!form.patient_id || !form.amount) { setError(tr.modal.required); return; }
    setSaving(true);
    const payload = { ...form, clinic_id: clinicId, type:"income" };
    const { data, error:e } = await supabase.from("payments").insert([payload]).select().single();
    if(e){ setError(e.message); setSaving(false); return; }
    if(data) setPayments(prev => [data, ...prev]);
    setSaving(false);
    setPayModal(false);
  };

  // ── Save withdraw/expense ───────────────────────────────
  const handleSaveWithdraw = async (form: {
    type:"withdrawal"|"expense"; amount:number; reason:string; date:string; notes:string;
  }) => {
    setError("");
    if(!form.amount || !form.reason.trim()) { setError(tr.modal.required); return; }
    setSaving(true);
    const payload = { amount:form.amount, description:form.reason, date:form.date, notes:form.notes, type:form.type, clinic_id:clinicId, status:"paid" };
    const { data, error:e } = await supabase.from("payments").insert([payload]).select().single();
    if(e){ setError(e.message); setSaving(false); return; }
    if(data) setPayments(prev => [data, ...prev]);
    setSaving(false);
    setWithdrawModal(false);
  };

  // ── Mark payment paid ──────────────────────────────────
  const markPaid = async (id:number) => {
    await supabase.from("payments").update({ status:"paid" }).eq("id", id);
    setPayments(prev => prev.map(p => p.id===id ? {...p, status:"paid"} : p));
  };

  // ── Change appt status ─────────────────────────────────
  const changeStatus = async (id:number, status:Status) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppointments(prev => prev.map(a => a.id===id ? {...a, status} : a));
  };

  if(loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'Rubik',sans-serif",color:"#0863ba",fontSize:16,gap:12 }}>
      <div style={{ width:24,height:24,border:"3px solid #dde4ff",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite" }}/>
      {tr.loading}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const todayStr = isAr
    ? `${DAY_NAMES_AR[new Date().getDay()]}، ${new Date().getDate()} ${MONTH_NAMES_AR[new Date().getMonth()]}`
    : `${DAY_NAMES_EN[new Date().getDay()]}, ${MONTH_NAMES_EN[new Date().getMonth()]} ${new Date().getDate()}`;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="sec-app" dir={isAr?"rtl":"ltr"}>

        {/* ── Header ── */}
        <div className="sec-header no-print">
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:500,marginBottom:3,display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ background:"rgba(255,255,255,.2)",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700 }}>🔒 {tr.secretaryLabel}</span>
              </div>
              <div style={{ fontSize:20,fontWeight:800,color:"#fff",lineHeight:1.2 }}>
                {tr[greetKey()]}
              </div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,.75)",marginTop:3 }}>{todayStr}</div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <button onClick={() => setLang(lang==="ar"?"en":"ar")}
                style={{ background:"rgba(255,255,255,.18)",border:"1.5px solid rgba(255,255,255,.3)",borderRadius:10,padding:"7px 12px",color:"#fff",cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:600 }}>
                🌐 {lang==="ar"?"EN":"ع"}
              </button>
              <button onClick={() => { supabase.auth.signOut(); window.location.href="/login"; }}
                style={{ background:"rgba(192,57,43,.35)",border:"1.5px solid rgba(192,57,43,.5)",borderRadius:10,padding:"7px 12px",color:"#ffb3a7",cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:600 }}>
                {tr.signOut}
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display:"flex",gap:8,overflow:"hidden" }}>
            {[
              { icon:"📅", label:tr.todayAppts, value: todayAppts.length, color:"#fff" },
              { icon:"👥", label:tr.totalPatients, value: patients.length, color:"#fff" },
              { icon:"⏳", label:tr.pendingPayments, value: pendingPayments.length, color:"#ffeb99" },
            ].map((s,i) => (
              <div key={i} style={{ flex:1,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"10px 12px",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)" }}>
                <div style={{ fontSize:16 }}>{s.icon}</div>
                <div style={{ fontSize:17,fontWeight:800,color:s.color,lineHeight:1.1,marginTop:3 }}>{s.value}</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,.7)",marginTop:2,lineHeight:1.2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="sec-tab-bar no-print">
          {(["appointments","patients","payments","report"] as Tab[]).map(tab => (
            <button key={tab} className={`sec-tab${activeTab===tab?" active":""}`} onClick={() => setActiveTab(tab)}>
              <span style={{ fontSize:18 }}>
                {tab==="appointments"?"📅":tab==="patients"?"👥":tab==="payments"?"💳":"📋"}
              </span>
              <span>{tr.tabs[tab]}</span>
            </button>
          ))}
        </div>

        {/* ══ TAB: APPOINTMENTS ══ */}
        {activeTab === "appointments" && (
          <div className="tab-content">
            {/* Date strip */}
            <div style={{ overflowX:"auto",display:"flex",gap:6,marginBottom:14,paddingBottom:4,WebkitOverflowScrolling:"touch",scrollbarWidth:"none" }}>
              {weekDates.map(dk => {
                const d    = new Date(dk+"T00:00:00");
                const cnt  = appointments.filter(a=>a.date===dk).length;
                const isToday = dk===todayKey;
                const isSel   = dk===selectedDate;
                return (
                  <button key={dk} onClick={() => setSelectedDate(dk)}
                    style={{ flexShrink:0,width:52,padding:"8px 4px",borderRadius:12,border:`2px solid ${isSel?"#0863ba":"#e8eaee"}`,background:isSel?"#0863ba":isToday?"rgba(8,99,186,.07)":"#fff",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,transition:"all .18s" }}>
                    <span style={{ fontSize:10,fontWeight:600,color:isSel?"rgba(255,255,255,.8)":isToday?"#0863ba":"#999" }}>
                      {isAr ? DAY_NAMES_AR[d.getDay()] : DAY_NAMES_EN[d.getDay()]}
                    </span>
                    <span style={{ fontSize:18,fontWeight:800,color:isSel?"#fff":isToday?"#0863ba":"#353535",lineHeight:1 }}>{d.getDate()}</span>
                    {cnt>0 && <span style={{ width:18,height:6,borderRadius:10,background:isSel?"rgba(255,255,255,.6)":"#0863ba",display:"block" }}/>}
                  </button>
                );
              })}
            </div>

            <div className="sec-section-title">
              <span>📅</span>
              {isAr ? `${DAY_NAMES_AR[new Date(selectedDate+"T00:00:00").getDay()]}، ${new Date(selectedDate+"T00:00:00").getDate()} ${MONTH_NAMES_AR[new Date(selectedDate+"T00:00:00").getMonth()]}` : `${DAY_NAMES_EN[new Date(selectedDate+"T00:00:00").getDay()]} ${new Date(selectedDate+"T00:00:00").getDate()} ${MONTH_NAMES_EN[new Date(selectedDate+"T00:00:00").getMonth()]}`}
              <span style={{ fontSize:12,fontWeight:500,color:"#888",marginInlineStart:"auto" }}>{todayAppts.length} {isAr?"موعد":"appts"}</span>
            </div>

            {todayAppts.length === 0 ? (
              <div style={{ textAlign:"center",padding:"48px 0",color:"#ccc" }}>
                <div style={{ fontSize:48,marginBottom:12 }}>📅</div>
                <div style={{ fontSize:14 }}>{tr.noAppts}</div>
              </div>
            ) : (
              todayAppts.map(appt => {
                const sc     = statusColor(appt.status as Status);
                const sl     = statusLabel(appt.status as Status, lang);
                const pName  = getPatientName(appt.patient_id);
                const isExp  = expandedAppt === appt.id;
                return (
                  <div key={appt.id} className="appt-card"
                    style={{ borderInlineStartWidth:4,borderInlineStartColor:sc,cursor:"pointer" }}
                    onClick={() => setExpandedAppt(isExp ? null : appt.id)}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      {/* Time bubble */}
                      <div style={{ flexShrink:0,background:`${sc}14`,border:`1.5px solid ${sc}30`,borderRadius:10,padding:"8px 10px",textAlign:"center",minWidth:52 }}>
                        <div style={{ fontSize:14,fontWeight:800,color:sc }}>{appt.time.slice(0,5)}</div>
                        <div style={{ fontSize:10,color:"#aaa" }}>{appt.duration}د</div>
                      </div>
                      {/* Avatar */}
                      <div className="avatar" style={{ background:getColor(appt.patient_id) }}>{getInitials(pName)}</div>
                      {/* Info */}
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pName}</div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:3 }}>
                          <span className="status-badge" style={{ background:`${sc}12`,color:sc,border:`1px solid ${sc}25` }}>{sl}</span>
                          {appt.type && <span style={{ fontSize:11,color:"#888" }}>{appt.type}</span>}
                        </div>
                      </div>
                      {/* Expand arrow */}
                      <span style={{ fontSize:14,color:"#bbb",transform:isExp?"rotate(180deg)":"none",transition:"transform .2s" }}>▼</span>
                    </div>

                    {/* Expanded */}
                    {isExp && (
                      <div className="expand-row">
                        {isSharedPlan(plan) && (appt as any).doctor_id && (
                          <div style={{ fontSize:12,color:"#888",marginBottom:8 }}>👨‍⚕️ {getDoctorName((appt as any).doctor_id, lang)}</div>
                        )}
                        {appt.notes && <div style={{ fontSize:12,color:"#666",background:"#f8faff",borderRadius:8,padding:"8px 10px",marginBottom:10 }}>📝 {appt.notes}</div>}
                        {/* WhatsApp */}
                        {patients.find(p=>p.id===appt.patient_id)?.phone && (
                          <a href={`https://wa.me/${patients.find(p=>p.id===appt.patient_id)?.phone?.replace(/\D/g,"")}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",background:"rgba(37,211,102,.1)",border:"1.5px solid rgba(37,211,102,.3)",borderRadius:10,color:"#128c5e",fontSize:12,fontWeight:600,textDecoration:"none",marginBottom:10 }}
                            onClick={e => e.stopPropagation()}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            {tr.whatsapp}
                          </a>
                        )}
                        {/* Status buttons */}
                        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                          {(["scheduled","completed","cancelled","no-show"] as Status[]).map(s => (
                            <button key={s} onClick={e => { e.stopPropagation(); changeStatus(appt.id, s); }}
                              style={{ padding:"6px 12px",borderRadius:10,border:`1.5px solid ${statusColor(s)}40`,background:appt.status===s?`${statusColor(s)}18`:"#f8f9fa",color:statusColor(s),fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .15s" }}>
                              {statusLabel(s,lang)}
                            </button>
                          ))}
                          <button onClick={e => { e.stopPropagation(); setEditApptData(appt); setApptModal("edit"); }}
                            style={{ padding:"6px 12px",borderRadius:10,border:"1.5px solid rgba(8,99,186,.25)",background:"rgba(8,99,186,.08)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                            ✏️ {isAr?"تعديل":"Edit"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {/* FAB add appointment */}
            <button className={`sec-fab${isAr?" rtl":""}`} onClick={() => { setEditApptData(null); setApptModal("add"); }}>＋</button>
          </div>
        )}

        {/* ══ TAB: PATIENTS ══ */}
        {activeTab === "patients" && (
          <div className="tab-content">
            <div style={{ position:"relative",marginBottom:14 }}>
              <span style={{ position:"absolute",top:"50%",transform:"translateY(-50%)",fontSize:16,[isAr?"right":"left"]:12,pointerEvents:"none" }}>🔍</span>
              <input className="field-input" placeholder={tr.searchPH} value={searchPatients}
                onChange={e => setSearchPatients(e.target.value)}
                style={{ paddingInlineStart:36,marginBottom:0 }}/>
            </div>

            <div className="sec-section-title">
              <span>👥</span> {tr.tabs.patients}
              <span style={{ fontSize:12,fontWeight:500,color:"#888",marginInlineStart:"auto" }}>{filteredPatients.length}</span>
            </div>

            {filteredPatients.length === 0 ? (
              <div style={{ textAlign:"center",padding:"48px 0",color:"#ccc" }}>
                <div style={{ fontSize:48,marginBottom:12 }}>👥</div>
                <div style={{ fontSize:14 }}>{tr.noData}</div>
              </div>
            ) : (
              filteredPatients.map(pat => {
                const isExp   = expandedPat === pat.id;
                const lastApp = appointments.filter(a=>a.patient_id===pat.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
                return (
                  <div key={pat.id} className="patient-card" style={{ flexDirection:"column",alignItems:"stretch" }}
                    onClick={() => setExpandedPat(isExp ? null : pat.id)}>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                      <div className="avatar" style={{ background:getColor(pat.id) }}>{getInitials(pat.name)}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pat.name}</div>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:3 }}>
                          {pat.phone && <span style={{ fontSize:11,color:"#888" }}>📞 {pat.phone}</span>}
                          {pat.gender && <span style={{ fontSize:11,padding:"2px 7px",borderRadius:20,background:pat.gender==="male"?"rgba(41,128,185,.1)":"rgba(142,68,173,.1)",color:pat.gender==="male"?"#2980b9":"#8e44ad",fontWeight:600 }}>{tr.gender[pat.gender as "male"|"female"]}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:14,color:"#bbb",transform:isExp?"rotate(180deg)":"none",transition:"transform .2s" }}>▼</span>
                    </div>

                    {isExp && (
                      <div className="expand-row" onClick={e => e.stopPropagation()}>
                        {lastApp && (
                          <div style={{ fontSize:12,color:"#888",marginBottom:10,background:"#f8faff",padding:"8px 10px",borderRadius:8 }}>
                            🗓 {isAr?"آخر زيارة:":"Last visit:"} {fmtDate(lastApp.date,lang)} · <span className="status-badge" style={{ background:`${statusColor(lastApp.status as Status)}12`,color:statusColor(lastApp.status as Status) }}>{statusLabel(lastApp.status as Status, lang)}</span>
                          </div>
                        )}
                        {(pat as any).address && <div style={{ fontSize:12,color:"#888",marginBottom:8 }}>📍 {(pat as any).address}</div>}
                        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                          <button onClick={() => { setEditPatData(pat); setPatModal("edit"); }}
                            style={{ flex:1,padding:"9px",borderRadius:10,border:"1.5px solid rgba(8,99,186,.25)",background:"rgba(8,99,186,.07)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                            ✏️ {tr.editInfo}
                          </button>
                          <button onClick={() => { setEditApptData(null); setApptModal("add"); }}
                            style={{ flex:1,padding:"9px",borderRadius:10,border:"1.5px solid rgba(46,125,50,.25)",background:"rgba(46,125,50,.07)",color:"#2e7d32",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                            📅 {tr.addAppt}
                          </button>
                          {pat.phone && (
                            <a href={`https://wa.me/${pat.phone?.replace(/\D/g,"")}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px",borderRadius:10,border:"1.5px solid rgba(37,211,102,.3)",background:"rgba(37,211,102,.08)",color:"#128c5e",fontSize:12,fontWeight:700,textDecoration:"none" }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <button className={`sec-fab${isAr?" rtl":""}`} onClick={() => { setEditPatData(null); setPatModal("add"); }}>＋</button>
          </div>
        )}

        {/* ══ TAB: PAYMENTS ══ */}
        {activeTab === "payments" && (
          <div className="tab-content">
            {/* Quick action buttons */}
            <div style={{ display:"flex",gap:8,marginBottom:16 }}>
              <button onClick={() => setPayModal(true)}
                style={{ flex:1,padding:"12px",borderRadius:12,border:"1.5px solid rgba(8,99,186,.25)",background:"rgba(8,99,186,.07)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                💳 {tr.addPayment}
              </button>
              <button onClick={() => setWithdrawModal(true)}
                style={{ flex:1,padding:"12px",borderRadius:12,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.06)",color:"#c0392b",fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                💸 {tr.addWithdraw}
              </button>
            </div>

            {/* Pending payments */}
            {pendingPayments.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div className="sec-section-title">⏳ {tr.pendingSection}</div>
                {pendingPayments.slice(0,5).map(pay => (
                  <div key={pay.id} className="pay-card" style={{ borderInlineStartWidth:4,borderInlineStartColor:"#e67e22" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div className="avatar" style={{ background:getColor(pay.patient_id??0),width:38,height:38,borderRadius:10,fontSize:11 }}>
                        {getInitials(getPatientName(pay.patient_id??0))}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {getPatientName(pay.patient_id??0)}
                        </div>
                        <div style={{ fontSize:11,color:"#888",marginTop:2 }}>{pay.description||"—"} · {pay.date}</div>
                      </div>
                      <div style={{ textAlign:"end",flexShrink:0 }}>
                        <div style={{ fontSize:14,fontWeight:800,color:"#e67e22" }}>{Number(pay.amount).toLocaleString()} {tr.currency}</div>
                        <button onClick={() => markPaid(pay.id)}
                          style={{ fontSize:10,padding:"3px 8px",background:"rgba(46,125,50,.1)",border:"1px solid rgba(46,125,50,.3)",borderRadius:8,color:"#2e7d32",cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontWeight:700,marginTop:4 }}>
                          ✓ {tr.markPaid}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent payments */}
            <div className="sec-section-title">💳 {isAr?"المدفوعات الأخيرة":"Recent Payments"}</div>
            {payments.filter(p => (p as any).type !== "withdrawal" && (p as any).type !== "expense").slice(0,20).map(pay => {
              const sc = pay.status==="paid"?"#2e7d32":pay.status==="pending"?"#e67e22":"#c0392b";
              return (
                <div key={pay.id} className="pay-card">
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div className="avatar" style={{ background:getColor(pay.patient_id??0),width:38,height:38,borderRadius:10,fontSize:11 }}>
                      {getInitials(getPatientName(pay.patient_id??0))}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#353535" }}>
                        {getPatientName(pay.patient_id??0)}
                      </div>
                      <div style={{ fontSize:11,color:"#888",marginTop:2,display:"flex",gap:6,flexWrap:"wrap" }}>
                        <span>{pay.date}</span>
                        {pay.description && <span>· {pay.description}</span>}
                        <span>· {tr.methods[(pay.method as keyof typeof tr.methods)] ?? pay.method}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:"end",flexShrink:0 }}>
                      <div style={{ fontSize:14,fontWeight:800,color:sc }}>{Number(pay.amount).toLocaleString()} {tr.currency}</div>
                      <span className="status-badge" style={{ background:`${sc}10`,color:sc,border:`1px solid ${sc}25`,fontSize:10 }}>
                        {tr.payStatuses[pay.status as keyof typeof tr.payStatuses] ?? pay.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TAB: DAILY REPORT ══ */}
        {activeTab === "report" && (
          <div className="tab-content print-area">
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
              <div style={{ flex:1 }}>
                <div className="sec-section-title" style={{ marginBottom:4 }}>📋 {tr.dailyReport}</div>
                <input type="date" className="field-input" value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  style={{ fontSize:13,padding:"8px 12px" }}/>
              </div>
              <button onClick={() => window.print()}
                className="no-print"
                style={{ padding:"10px 14px",borderRadius:12,border:"1.5px solid rgba(8,99,186,.25)",background:"rgba(8,99,186,.07)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,flexShrink:0,height:42,marginTop:24 }}>
                🖨️ {tr.exportPrint}
              </button>
            </div>

            {/* Print header */}
            <div style={{ background:"#0863ba",color:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:14,display:"none" }} className="print-header-only">
              <div style={{ fontSize:18,fontWeight:800 }}>{isAr?"نبض — تقرير يومي":"NABD — Daily Report"}</div>
              <div style={{ fontSize:13,opacity:.8,marginTop:4 }}>{fmtDate(reportDate,lang)}</div>
            </div>

            {/* Stats */}
            {(() => {
              const rAppts    = appointments.filter(a => a.date===reportDate);
              const rPays     = payments.filter(p => p.date===reportDate && (p as any).type!=="withdrawal" && (p as any).type!=="expense");
              const completed = rAppts.filter(a => a.status==="completed").length;
              const cancelled = rAppts.filter(a => a.status==="cancelled").length;
              const noshow    = rAppts.filter(a => a.status==="no-show").length;
              const income    = rPays.filter(p => p.status==="paid").reduce((s,p) => s+Number(p.amount), 0);
              const newPats   = patients.filter(p => (p as any).created_at?.startsWith(reportDate)).length;

              return (
                <>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
                    {[
                      { icon:"📅", label:tr.reportStats.appts, value:rAppts.length, color:"#0863ba" },
                      { icon:"✅", label:tr.reportStats.completed, value:completed, color:"#2e7d32" },
                      { icon:"❌", label:tr.reportStats.cancelled, value:cancelled, color:"#c0392b" },
                      { icon:"🚫", label:tr.reportStats.noshow, value:noshow, color:"#888" },
                    ].map((s,i) => (
                      <div key={i} style={{ background:`${s.color}09`,border:`1.5px solid ${s.color}20`,borderRadius:14,padding:"14px",display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:22 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize:20,fontWeight:800,color:s.color }}>{s.value}</div>
                          <div style={{ fontSize:11,color:"#888",marginTop:1 }}>{s.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Income — only today's income, no monthly box */}
                  <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.18)",borderRadius:14,padding:"16px 18px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:12,color:"#888",fontWeight:500 }}>{tr.reportStats.income}</div>
                      <div style={{ fontSize:24,fontWeight:900,color:"#0863ba",marginTop:2 }}>{income.toLocaleString()} {tr.currency}</div>
                    </div>
                    <span style={{ fontSize:32 }}>💰</span>
                  </div>

                  {/* Appointments detail */}
                  {rAppts.length > 0 && (
                    <div style={{ background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3",overflow:"hidden",marginBottom:14 }}>
                      <div style={{ padding:"12px 16px",background:"#f8faff",borderBottom:"1px solid #eef0f3",fontWeight:700,fontSize:14,color:"#353535" }}>
                        📅 {tr.reportApptsTitle}
                      </div>
                      {rAppts.map(a => {
                        const sc = statusColor(a.status as Status);
                        return (
                          <div key={a.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f0f2f5" }}>
                            <span style={{ fontSize:13,fontWeight:800,color:sc,minWidth:40 }}>{a.time.slice(0,5)}</span>
                            <div className="avatar" style={{ width:32,height:32,borderRadius:9,background:getColor(a.patient_id),fontSize:11 }}>{getInitials(getPatientName(a.patient_id))}</div>
                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{getPatientName(a.patient_id)}</div>
                              {a.type && <div style={{ fontSize:11,color:"#999" }}>{a.type}</div>}
                            </div>
                            <span className="status-badge" style={{ background:`${sc}12`,color:sc,border:`1px solid ${sc}25`,fontSize:10 }}>{statusLabel(a.status as Status,lang)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Payments detail */}
                  {rPays.length > 0 && (
                    <div style={{ background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3",overflow:"hidden" }}>
                      <div style={{ padding:"12px 16px",background:"#f8faff",borderBottom:"1px solid #eef0f3",fontWeight:700,fontSize:14,color:"#353535" }}>
                        💳 {tr.reportPayTitle}
                      </div>
                      {rPays.map(p => {
                        const sc = p.status==="paid"?"#2e7d32":"#e67e22";
                        return (
                          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid #f0f2f5" }}>
                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontSize:13,fontWeight:600 }}>{getPatientName(p.patient_id??0)}</div>
                              <div style={{ fontSize:11,color:"#999" }}>{p.description||"—"} · {tr.methods[(p.method as keyof typeof tr.methods)]??p.method}</div>
                            </div>
                            <div style={{ textAlign:"end",flexShrink:0 }}>
                              <div style={{ fontSize:13,fontWeight:800,color:sc }}>{Number(p.amount).toLocaleString()} {tr.currency}</div>
                              <span className="status-badge" style={{ background:`${sc}10`,color:sc,border:`1px solid ${sc}25`,fontSize:10 }}>{tr.payStatuses[p.status as keyof typeof tr.payStatuses]??p.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ══ MODAL: APPOINTMENT ══ */}
        {(apptModal) && (
          <ApptModal lang={lang} patients={patients} doctors={doctors}
            appt={editApptData} plan={plan} isShared={isSharedPlan(plan)}
            saving={saving} error={error}
            defaultDate={selectedDate}
            onSave={handleSaveAppt}
            onClose={() => { setApptModal(null); setEditApptData(null); setError(""); }} />
        )}

        {/* ══ MODAL: PATIENT ══ */}
        {(patModal) && (
          <PatModal lang={lang} patient={editPatData}
            saving={saving} error={error}
            onSave={handleSavePat}
            onClose={() => { setPatModal(null); setEditPatData(null); setError(""); }} />
        )}

        {/* ══ MODAL: PAYMENT ══ */}
        {payModal && (
          <PayModal lang={lang} patients={patients}
            saving={saving} error={error}
            onSave={handleSavePay}
            onClose={() => { setPayModal(false); setError(""); }} />
        )}

        {/* ══ MODAL: WITHDRAW/EXPENSE ══ */}
        {withdrawModal && (
          <WithdrawModal lang={lang}
            saving={saving} error={error}
            onSave={handleSaveWithdraw}
            onClose={() => { setWithdrawModal(false); setError(""); }} />
        )}
      </div>
    </>
  );
}

// ─── Appointment Modal ────────────────────────────────────
function ApptModal({ lang, patients, doctors, appt, plan, isShared, saving, error, defaultDate, onSave, onClose }: {
  lang: Lang; patients: Patient[]; doctors: Doctor[];
  appt: Appointment | null; plan: PlanType; isShared: boolean;
  saving: boolean; error: string; defaultDate: string;
  onSave: (form: any) => void; onClose: () => void;
}) {
  const isAr = lang === "ar";
  const tr = TR[lang];
  const [form, setForm] = useState({
    patient_id: appt?.patient_id ?? "" as number|"",
    doctor_id:  (appt as any)?.doctor_id ?? "" as number|"",
    date:       appt?.date ?? defaultDate,
    time:       appt?.time ?? "09:00",
    duration:   appt?.duration ?? 30,
    type:       appt?.type ?? "",
    notes:      appt?.notes ?? "",
    status:     (appt?.status ?? "scheduled") as Status,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]:v }));

  return (
    <div className="sec-modal-bg" onClick={onClose}>
      <div className="sec-modal" dir={isAr?"rtl":"ltr"} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{appt?.id ? tr.modal.editApptTitle : tr.modal.addApptTitle}</h2>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:10,border:"1.5px solid #e8eaee",background:"#f5f7fa",cursor:"pointer",fontSize:16 }}>×</button>
        </div>

        <Field label={tr.modal.patient}>
          <select className="field-input" value={form.patient_id} onChange={e => set("patient_id", Number(e.target.value)||"")}>
            <option value="">{tr.modal.selectPatient}</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        {isShared && doctors.length > 0 && (
          <Field label={tr.modal.doctor}>
            <select className="field-input" value={form.doctor_id} onChange={e => set("doctor_id", Number(e.target.value)||"")}>
              <option value="">{tr.modal.selectDoctor}</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{lang==="ar"?d.name:(d.name_en||d.name)}</option>)}
            </select>
          </Field>
        )}

        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.date}><input type="date" className="field-input" value={form.date} onChange={e => set("date",e.target.value)}/></Field></div>
          <div style={{ flex:1 }}><Field label={tr.modal.time}><input type="time" className="field-input" value={form.time} onChange={e => set("time",e.target.value)}/></Field></div>
        </div>

        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.duration}><input type="number" className="field-input" value={form.duration} min={5} max={120} step={5} onChange={e => set("duration",Number(e.target.value))}/></Field></div>
          <div style={{ flex:1 }}><Field label={tr.modal.visitType}><input className="field-input" placeholder={isAr?"مثال: متابعة":"e.g. Follow-up"} value={form.type} onChange={e => set("type",e.target.value)}/></Field></div>
        </div>

        <Field label={tr.modal.notesLabel}><textarea className="field-input" rows={2} value={form.notes} onChange={e => set("notes",e.target.value)} style={{ resize:"vertical" }}/></Field>

        {appt?.id && (
          <Field label={tr.modal.changeStatus}>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {(["scheduled","completed","cancelled","no-show"] as Status[]).map(s => {
                const sc = statusColor(s);
                return (
                  <button key={s} onClick={() => set("status",s)}
                    style={{ padding:"7px 12px",borderRadius:10,border:`1.5px solid ${sc}40`,background:form.status===s?`${sc}18`:"#f8f9fa",color:sc,fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                    {statusLabel(s,lang)}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {error && <div style={{ color:"#c0392b",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(192,57,43,.07)",borderRadius:8 }}>{error}</div>}

        <button disabled={saving} onClick={() => onSave(form)}
          style={{ width:"100%",padding:"14px",borderRadius:14,background:"#0863ba",color:"#fff",border:"none",fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:700,cursor:saving?"wait":"pointer",opacity:saving?.6:1,minHeight:50 }}>
          {saving ? tr.saving : tr.modal.save}
        </button>
      </div>
    </div>
  );
}

// ─── Patient Modal ────────────────────────────────────────
function PatModal({ lang, patient, saving, error, onSave, onClose }: {
  lang: Lang; patient: Patient | null;
  saving: boolean; error: string; onSave: (form: any) => void; onClose: () => void;
}) {
  const isAr = lang === "ar";
  const tr = TR[lang];
  const [form, setForm] = useState({
    name:    patient?.name ?? "",
    phone:   patient?.phone ?? "",
    gender:  patient?.gender ?? "",
    dob:     (patient as any)?.dob ?? "",
    address: (patient as any)?.address ?? "",
    notes:   (patient as any)?.notes ?? "",
  });
  const set = (k:string,v:string) => setForm(f => ({ ...f,[k]:v }));

  return (
    <div className="sec-modal-bg" onClick={onClose}>
      <div className="sec-modal" dir={isAr?"rtl":"ltr"} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{patient?.id ? tr.modal.editPatientTitle : tr.modal.addPatientTitle}</h2>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:10,border:"1.5px solid #e8eaee",background:"#f5f7fa",cursor:"pointer",fontSize:16 }}>×</button>
        </div>

        <Field label={tr.modal.name}><input className="field-input" value={form.name} onChange={e => set("name",e.target.value)}/></Field>
        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.phone}><input className="field-input" type="tel" value={form.phone} onChange={e => set("phone",e.target.value)}/></Field></div>
          <div style={{ flex:1 }}>
            <Field label={tr.modal.genderLabel}>
              <select className="field-input" value={form.gender} onChange={e => set("gender",e.target.value)}>
                <option value="">—</option>
                <option value="male">{tr.gender.male}</option>
                <option value="female">{tr.gender.female}</option>
              </select>
            </Field>
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.dob}><input type="date" className="field-input" value={form.dob} onChange={e => set("dob",e.target.value)}/></Field></div>
          <div style={{ flex:1 }}><Field label={tr.modal.address}><input className="field-input" value={form.address} onChange={e => set("address",e.target.value)}/></Field></div>
        </div>
        <Field label={tr.modal.notes}><textarea className="field-input" rows={2} value={form.notes} onChange={e => set("notes",e.target.value)} style={{ resize:"vertical" }}/></Field>

        {error && <div style={{ color:"#c0392b",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(192,57,43,.07)",borderRadius:8 }}>{error}</div>}

        <button disabled={saving} onClick={() => onSave(form)}
          style={{ width:"100%",padding:"14px",borderRadius:14,background:"#0863ba",color:"#fff",border:"none",fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:700,cursor:saving?"wait":"pointer",opacity:saving?.6:1,minHeight:50 }}>
          {saving ? tr.saving : tr.modal.save}
        </button>
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────
function PayModal({ lang, patients, saving, error, onSave, onClose }: {
  lang: Lang; patients: Patient[];
  saving: boolean; error: string; onSave: (form: any) => void; onClose: () => void;
}) {
  const isAr = lang === "ar";
  const tr = TR[lang];
  const [form, setForm] = useState({
    patient_id:  "" as number|"",
    amount:      "" as number|"",
    description: "",
    method:      "cash",
    date:        todayKey,
    status:      "paid",
    notes:       "",
  });
  const set = (k:string,v:any) => setForm(f => ({ ...f,[k]:v }));

  return (
    <div className="sec-modal-bg" onClick={onClose}>
      <div className="sec-modal" dir={isAr?"rtl":"ltr"} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.addPaymentTitle}</h2>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:10,border:"1.5px solid #e8eaee",background:"#f5f7fa",cursor:"pointer",fontSize:16 }}>×</button>
        </div>

        <Field label={tr.modal.patient}>
          <select className="field-input" value={form.patient_id} onChange={e => set("patient_id",Number(e.target.value)||"")}>
            <option value="">{tr.modal.selectPatient}</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>

        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.amount}><input type="number" className="field-input" placeholder={tr.modal.amountPH} value={form.amount} onChange={e => set("amount",Number(e.target.value)||"")}/></Field></div>
          <div style={{ flex:1 }}>
            <Field label={tr.modal.method}>
              <select className="field-input" value={form.method} onChange={e => set("method",e.target.value)}>
                <option value="cash">{tr.methods.cash}</option>
                <option value="card">{tr.methods.card}</option>
                <option value="transfer">{tr.methods.transfer}</option>
              </select>
            </Field>
          </div>
        </div>

        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.payDate}><input type="date" className="field-input" value={form.date} onChange={e => set("date",e.target.value)}/></Field></div>
          <div style={{ flex:1 }}>
            <Field label={tr.modal.payStatus}>
              <select className="field-input" value={form.status} onChange={e => set("status",e.target.value)}>
                <option value="paid">{tr.payStatuses.paid}</option>
                <option value="pending">{tr.payStatuses.pending}</option>
              </select>
            </Field>
          </div>
        </div>

        <Field label={tr.modal.description}><input className="field-input" placeholder={tr.modal.descPH} value={form.description} onChange={e => set("description",e.target.value)}/></Field>

        {error && <div style={{ color:"#c0392b",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(192,57,43,.07)",borderRadius:8 }}>{error}</div>}

        <button disabled={saving} onClick={() => onSave(form)}
          style={{ width:"100%",padding:"14px",borderRadius:14,background:"#0863ba",color:"#fff",border:"none",fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:700,cursor:saving?"wait":"pointer",opacity:saving?.6:1,minHeight:50 }}>
          {saving ? tr.saving : tr.modal.save}
        </button>
      </div>
    </div>
  );
}

// ─── Withdraw/Expense Modal ───────────────────────────────
function WithdrawModal({ lang, saving, error, onSave, onClose }: {
  lang: Lang;
  saving: boolean; error: string; onSave: (form: any) => void; onClose: () => void;
}) {
  const isAr = lang === "ar";
  const tr = TR[lang];
  const [form, setForm] = useState({
    type:   "withdrawal" as "withdrawal"|"expense",
    amount: "" as number|"",
    reason: "",
    date:   todayKey,
    notes:  "",
  });
  const set = (k:string,v:any) => setForm(f => ({ ...f,[k]:v }));

  return (
    <div className="sec-modal-bg" onClick={onClose}>
      <div className="sec-modal" dir={isAr?"rtl":"ltr"} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.withdrawTitle}</h2>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:10,border:"1.5px solid #e8eaee",background:"#f5f7fa",cursor:"pointer",fontSize:16 }}>×</button>
        </div>

        <Field label={tr.modal.txType}>
          <div style={{ display:"flex",gap:8 }}>
            {(["withdrawal","expense"] as const).map(t => (
              <button key={t} onClick={() => set("type",t)}
                style={{ flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${form.type===t?"#0863ba":"#e8eaee"}`,background:form.type===t?"rgba(8,99,186,.08)":"#fafbfc",color:form.type===t?"#0863ba":"#888",fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                {t==="withdrawal"?"💸 "+tr.modal.withdrawal:"🏪 "+tr.modal.expense}
              </button>
            ))}
          </div>
        </Field>

        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1 }}><Field label={tr.modal.amount.replace("(ل.س) *","*")}><input type="number" className="field-input" value={form.amount} onChange={e => set("amount",Number(e.target.value)||"")}/></Field></div>
          <div style={{ flex:1 }}><Field label={tr.modal.payDate}><input type="date" className="field-input" value={form.date} onChange={e => set("date",e.target.value)}/></Field></div>
        </div>

        <Field label={tr.modal.reason}><input className="field-input" placeholder={tr.modal.reasonPH} value={form.reason} onChange={e => set("reason",e.target.value)}/></Field>
        <Field label={isAr?"ملاحظات":"Notes"}><textarea className="field-input" rows={2} value={form.notes} onChange={e => set("notes",e.target.value)} style={{ resize:"vertical" }}/></Field>

        {error && <div style={{ color:"#c0392b",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(192,57,43,.07)",borderRadius:8 }}>{error}</div>}

        <button disabled={saving} onClick={() => onSave(form)}
          style={{ width:"100%",padding:"14px",borderRadius:14,background:"#c0392b",color:"#fff",border:"none",fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:700,cursor:saving?"wait":"pointer",opacity:saving?.6:1,minHeight:50 }}>
          {saving ? tr.saving : tr.modal.save}
        </button>
      </div>
    </div>
  );
}