"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment } from "@/lib/supabase";

type Lang = "ar" | "en";
type Status = "scheduled" | "completed" | "cancelled" | "no-show";

// حقول مؤقتة للحاجز قبل الموافقة (لا تُحفظ في patients حتى القبول)
interface GuestData {
  gender?: string;
  has_diabetes?: boolean;
  has_hypertension?: boolean;
}

// ─── جداول دوام الأطباء ───────────────────────────────────
type WorkDay = {
  enabled: boolean;
  start: string;
  end: string;
  break_start?: string;
  break_end?: string;
};

type DoctorSchedule = {
  id?: number;
  doctor_id: number;
  user_id: string;
  days: Record<number, WorkDay>;
  vacations: string[];
  appointment_duration: number;
  max_daily_appointments: number;
  notes: string;
};

function checkDoctorAvailability(
  schedule: DoctorSchedule,
  dateStr: string,
  timeStr: string,
  duration: number,
  dailyCount: number
): { available: boolean; reasonAr?: string; reasonEn?: string } {
  // 1. إجازة
  if (schedule.vacations.includes(dateStr)) {
    return { available: false, reasonAr: "الطبيب في إجازة في هذا اليوم", reasonEn: "Doctor is on vacation on this day" };
  }
  // 2. يوم العطلة
  const dayIdx  = new Date(dateStr).getDay();
  const workDay = schedule.days[dayIdx];
  if (!workDay || !workDay.enabled) {
    return { available: false, reasonAr: "الطبيب لا يعمل في هذا اليوم", reasonEn: "Doctor does not work on this day" };
  }
  const toMin = (t: string) => { const [h, m] = t.slice(0,5).split(":").map(Number); return h*60+m; };
  const apptStart = toMin(timeStr);
  const apptEnd   = apptStart + duration;
  const dayStart  = toMin(workDay.start);
  const dayEnd    = toMin(workDay.end);
  // 3. قبل الدوام
  if (apptStart < dayStart) {
    return { available: false, reasonAr: `الموعد قبل بداية دوام الطبيب (${workDay.start})`, reasonEn: `Appointment is before doctor's start time (${workDay.start})` };
  }
  // 4. بعد الدوام
  if (apptEnd > dayEnd) {
    return { available: false, reasonAr: `الموعد يتجاوز نهاية دوام الطبيب (${workDay.end})`, reasonEn: `Appointment exceeds doctor's end time (${workDay.end})` };
  }
  // 5. وقت الاستراحة
  if (workDay.break_start && workDay.break_end) {
    const bs = toMin(workDay.break_start);
    const be = toMin(workDay.break_end);
    if (apptStart < be && apptEnd > bs) {
      return { available: false, reasonAr: `هذا الوقت يتزامن مع استراحة الطبيب (${workDay.break_start} - ${workDay.break_end})`, reasonEn: `This time overlaps with doctor's break (${workDay.break_start} - ${workDay.break_end})` };
    }
  }
  // 6. الحد الأقصى اليومي
  if (dailyCount >= schedule.max_daily_appointments) {
    return { available: false, reasonAr: `الطبيب وصل للحد الأقصى من المواعيد اليومية (${schedule.max_daily_appointments})`, reasonEn: `Doctor reached daily appointment limit (${schedule.max_daily_appointments})` };
  }
  return { available: true };
}

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"لوحة المعلومات", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", prescriptions:"الوصفات الطبية", tracking:"متابعة المرضى" },
    page:{ title:"المواعيد", sub:"إدارة وجدولة مواعيد المرضى" },
    addAppointment:"موعد جديد",
    weekDays:["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"],
    weekDaysFull:["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    today:"اليوم", noAppointments:"لا توجد مواعيد في هذا اليوم", fullDay:"اليوم ممتلئ",
    statuses:{ scheduled:"محدد", completed:"مكتمل", cancelled:"ملغي", "no-show":"لم يحضر" },
    statusColors:{ scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" },
    duration:{ label:"المدة", min:"دقيقة" },
    loading:"جاري التحميل...", saving:"جاري الحفظ...",
    modal:{
      addTitle:"إضافة موعد جديد", editTitle:"تعديل الموعد",
      patient:"المريض *", selectPatient:"اختر المريض",
      doctor:"الطبيب *", selectDoctor:"اختر الطبيب",
      date:"التاريخ *", time:"الوقت *",
      duration:"المدة (بالدقائق) *", type:"نوع الزيارة",
      typePh:"مثال: متابعة، فحص عام", notes:"ملاحظات", notesPh:"أي ملاحظات...",
      save:"حفظ الموعد", update:"تحديث الموعد", cancel:"إلغاء",
      required:"المريض والتاريخ والوقت مطلوبة",
      requiredDoctor:"يرجى اختيار الطبيب",
      delete:"حذف الموعد", deleting:"جاري الحذف...",
      deleteConfirmTitle:"تأكيد حذف الموعد",
      deleteConfirmMsg:"هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذه العملية.",
      deleteConfirm:"نعم، احذف", deleteCancel:"لا، تراجع",
      filterByDoctor:"تصفية حسب الطبيب",
      allDoctors:"جميع الأطباء",
    },
    stats:{ total:"مواعيد الشهر", today:"مواعيد اليوم", completed:"مكتملة", pending:"قادمة", occupancy:"إشغال العيادة اليوم" },
    signOut:"تسجيل الخروج", selectedDay:"المحدد", appointments:"مواعيد", appt:"موعد",
    notification:{ title:"تذكير بموعد", msg:"سيحين موعد المريض", in:"خلال ١٥ دقيقة", dismiss:"تجاهل" },
    errorSave:"حدث خطأ أثناء الحفظ", errorLoad:"حدث خطأ أثناء التحميل",
    errorDelete:"حدث خطأ أثناء الحذف",
    conflictError:"يوجد موعد آخر في نفس الوقت، يرجى اختيار وقت مختلف",
    whatsappMsg:(name:string, date:string, time:string) =>
      `مرحباً ${name}، نذكّركم بموعدكم في عيادتنا بتاريخ ${date} الساعة ${time}. نتطلع لرؤيتكم 💙`,
    nowCard:{ title:"الوقت الآن", dateLabel:"التاريخ" },
    // ── نصوص قسم الطلبات المعلقة (جديد) ──
    pending:{
      sectionTitle:"طلبات الحجز المعلقة",
      sectionSub:"مرضى طلبوا موعداً عبر رابط العيادة، بانتظار موافقتك",
      badge:"طلب جديد",
      approve:"✓ قبول",
      reject:"✕ رفض",
      approving:"جاري القبول...",
      rejecting:"جاري الرفض...",
      empty:"لا توجد طلبات حجز معلقة",
      date:"التاريخ",
      time:"الوقت",
      phone:"الهاتف",
      notes:"ملاحظات",
      type:"نوع الزيارة",
      confirmApprove:"هل تريد قبول موعد",
      confirmReject:"هل تريد رفض طلب",
      onlineBooking:"حجز إلكتروني",
    },
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", prescriptions:"Prescriptions", tracking:"Patient Tracking" },
    page:{ title:"Appointments", sub:"Manage and schedule patient appointments" },
    addAppointment:"New Appointment",
    weekDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    weekDaysFull:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    today:"Today", noAppointments:"No appointments on this day", fullDay:"Day is full",
    statuses:{ scheduled:"Scheduled", completed:"Completed", cancelled:"Cancelled", "no-show":"No Show" },
    statusColors:{ scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" },
    duration:{ label:"Duration", min:"min" },
    loading:"Loading...", saving:"Saving...",
    modal:{
      addTitle:"New Appointment", editTitle:"Edit Appointment",
      patient:"Patient *", selectPatient:"Select a patient",
      doctor:"Doctor *", selectDoctor:"Select a doctor",
      date:"Date *", time:"Time *",
      duration:"Duration (minutes) *", type:"Visit Type",
      typePh:"e.g. Follow-up, General", notes:"Notes", notesPh:"Any notes...",
      save:"Save Appointment", update:"Update Appointment", cancel:"Cancel",
      required:"Patient, date and time are required",
      requiredDoctor:"Please select a doctor",
      delete:"Delete Appointment", deleting:"Deleting...",
      deleteConfirmTitle:"Confirm Delete",
      deleteConfirmMsg:"Are you sure you want to delete this appointment? This cannot be undone.",
      deleteConfirm:"Yes, Delete", deleteCancel:"No, Cancel",
      filterByDoctor:"Filter by Doctor",
      allDoctors:"All Doctors",
    },
    stats:{ total:"Monthly Appts", today:"Today's Appts", completed:"Completed", pending:"Upcoming", occupancy:"Today's Occupancy" },
    signOut:"Sign Out", selectedDay:"Selected", appointments:"Appointments", appt:"appt",
    notification:{ title:"Appointment Reminder", msg:"Upcoming appointment for", in:"in 15 minutes", dismiss:"Dismiss" },
    errorSave:"Error saving appointment", errorLoad:"Error loading data",
    errorDelete:"Error deleting appointment",
    conflictError:"Another appointment exists at the same time, please choose a different time",
    whatsappMsg:(name:string, date:string, time:string) =>
      `Hello ${name}, this is a reminder for your appointment on ${date} at ${time}. We look forward to seeing you 💙`,
    nowCard:{ title:"Current Time", dateLabel:"Date" },
    // ── pending section texts (new) ──
    pending:{
      sectionTitle:"Pending Booking Requests",
      sectionSub:"Patients who requested an appointment via your booking link",
      badge:"New Request",
      approve:"✓ Approve",
      reject:"✕ Reject",
      approving:"Approving...",
      rejecting:"Rejecting...",
      empty:"No pending booking requests",
      date:"Date",
      time:"Time",
      phone:"Phone",
      notes:"Notes",
      type:"Visit Type",
      confirmApprove:"Approve appointment for",
      confirmReject:"Reject request for",
      onlineBooking:"Online Booking",
    },
  },
} as const;

const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085"];
const getColor    = (id: number) => AVT_COLORS[(id - 1) % AVT_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
const toKey       = (y: number, m: number, d: number) =>
  `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

const now      = new Date();
const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

const SLOTS: { label: string; value: string; isHour: boolean }[] = [];
for (let h = 8; h <= 22; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 22 && m > 0) break;
    const hStr = String(h).padStart(2,"0");
    const mStr = String(m).padStart(2,"0");
    SLOTS.push({
      label: `${hStr}:${mStr}`,
      value: `${hStr}:${mStr}`,
      isHour: m === 0,
    });
  }
}

const CLINIC_MINUTES = 840;

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const times = [0, 0.18, 0.36];
    times.forEach((t, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(i === 0 ? 880 : i === 1 ? 1046 : 1318, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.16);
    });
  } catch {}
}

// ─── Plan access rules ────────────────────────────────────
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

// الخطط المشتركة وحدودها من الأطباء
const SHARED_PLAN_DOCTOR_LIMITS: Record<string, number> = {
  shared_basic:      2,
  shared_pro:        3,
  shared_enterprise: 5, // قابل للزيادة من لوحة الأدمن
};

const isSharedPlan = (plan: PlanType) => plan.startsWith("shared_");

const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

const PLAN_BADGE: Record<PlanType, { label: { ar: string; en: string }; color: string }> = {
  basic:            { label:{ ar:"الأساسية",              en:"Basic"                 }, color:"#0863ba" },
  pro:              { label:{ ar:"الاحترافية",            en:"Professional"          }, color:"#7b2d8b" },
  enterprise:       { label:{ ar:"الشاملة",              en:"Comprehensive"         }, color:"#e67e22" },
  shared_basic:     { label:{ ar:"المشتركة - الأساسية",  en:"Shared - Basic"        }, color:"#0891b2" },
  shared_pro:       { label:{ ar:"المشتركة - الاحترافية",en:"Shared - Professional" }, color:"#6d28d9" },
  shared_enterprise:{ label:{ ar:"المشتركة - الشاملة",  en:"Shared - Comprehensive"}, color:"#b45309" },
};

// ─── Sidebar ──────────────────────────────────────────────
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


// ─── Field ────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div style={{ marginBottom:16, flex:half?"1":undefined }}>
    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
    {children}
  </div>
);

type ApptForm = {
  patient_id: number | "";
  doctor_id: number | "";   // للخطط المشتركة فقط
  date: string; time: string; duration: number;
  type: string; notes: string; status: Status;
};

// نوع الطبيب للخطط المشتركة
type Doctor = {
  id: number;
  name: string;
  specialty?: string;
  user_id: string;
};

// ─── Modal موعد ───────────────────────────────────────────
function AppointmentModal({ lang, appt, defaultDate, patients, appointments, doctors, doctorSchedules = [], plan, onSave, onClose, onStatusChange, onDelete, saving, quickSlot }: {
  lang: Lang; appt: Appointment | null; defaultDate: string; patients: Patient[];
  appointments: Appointment[];
  doctors: Doctor[]; doctorSchedules?: DoctorSchedule[]; plan: PlanType;
  onSave: (form: ApptForm, id?: number) => void; onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void; saving: boolean;
  quickSlot?: { doctorId: number | null; time: string; date: string } | null;
}) {
  const tr = T[lang]; const isAr = lang === "ar"; const isEdit = !!appt?.id;
  const isShared = isSharedPlan(plan);
  const [form, setForm] = useState<ApptForm>({
    patient_id: appt?.patient_id ?? "",
    doctor_id: (appt as any)?.doctor_id ?? (quickSlot?.doctorId ?? ""),
    date: appt?.date ?? defaultDate, time: appt?.time ?? (quickSlot?.time ?? "09:00"),
    duration: appt?.duration ?? 30, type: appt?.type ?? "",
    notes: appt?.notes ?? "", status: appt?.status ?? "scheduled",
  });
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [patientSearch, setPatientSearch] = useState(() => {
    if (appt?.patient_id) {
      return patients.find(p => p.id === appt.patient_id)?.name ?? "";
    }
    return "";
  });
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone && p.phone.includes(patientSearch))
  );

  const handleSave = () => {
    if (!form.patient_id || !form.date || !form.time) { setError(tr.modal.required); return; }
    if (isShared && !form.doctor_id) { setError(tr.modal.requiredDoctor); return; }

    // ── فحص جدول دوام الطبيب (للخطط المشتركة فقط) ──────────
    if (isShared && form.doctor_id) {
      const schedule = doctorSchedules.find(s => s.doctor_id === Number(form.doctor_id));
      if (schedule) {
        const doctorDailyCount = appointments.filter(a =>
          a.date === form.date &&
          (a as any).doctor_id === Number(form.doctor_id) &&
          a.status !== "cancelled" &&
          (!isEdit || a.id !== appt?.id)
        ).length;
        const avail = checkDoctorAvailability(
          schedule, form.date, form.time, form.duration || 30, doctorDailyCount
        );
        if (!avail.available) {
          setError(lang === "ar" ? (avail.reasonAr ?? "") : (avail.reasonEn ?? ""));
          return;
        }
      }
    }
    // ── نهاية فحص الجدول ─────────────────────────────────────

    const timeToMinutes = (t: string) => {
      const [h, m] = t.slice(0,5).split(":").map(Number);
      return h * 60 + m;
    };
    const newStart = timeToMinutes(form.time);
    const newEnd   = newStart + (form.duration || 30);
    const conflict = appointments.find(a => {
      if (a.date !== form.date) return false;
      if (a.status === "cancelled") return false;
      if (isEdit && a.id === appt!.id) return false;
      // في الخطط المشتركة: التعارض يكون فقط إذا كان نفس الطبيب
      if (isShared && form.doctor_id && (a as any).doctor_id) {
        if ((a as any).doctor_id !== Number(form.doctor_id)) return false;
      }
      const aStart = timeToMinutes(a.time);
      const aEnd   = aStart + (a.duration || 30);
      return newStart < aEnd && newEnd > aStart;
    });
    if (conflict) {
      const cTime = conflict.time.slice(0,5);
      const cDur  = conflict.duration || 30;
      setError(`${tr.conflictError} (${cTime} - ${cDur} ${tr.duration.min})`);
      return;
    }
    onSave(form, appt?.id);
  };

  const inputSt = useMemo((): React.CSSProperties => ({
    width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,
    fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",
    outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr",
  }), [isAr]);

  if (showDeleteConfirm) return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={()=>setShowDeleteConfirm(false)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:380,padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(192,57,43,.15)",animation:"modalIn .25s ease",direction:isAr?"rtl":"ltr" }}>
        <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px" }}>🗑️</div>
        <h3 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:10 }}>{tr.modal.deleteConfirmTitle}</h3>
        <p style={{ fontSize:14,color:"#888",lineHeight:1.7,marginBottom:28 }}>{tr.modal.deleteConfirmMsg}</p>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={()=>onDelete(appt!.id)} style={{ flex:1,padding:"13px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.modal.deleteConfirm}</button>
          <button onClick={()=>setShowDeleteConfirm(false)} style={{ flex:1,padding:"13px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.deleteCancel}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isEdit?tr.modal.editTitle:tr.modal.addTitle}</h2>
            {isEdit&&<p style={{ fontSize:11,color:"#aaa",marginTop:2 }}>ID: #{appt!.id}</p>}
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {isEdit&&<button onClick={()=>setShowDeleteConfirm(true)} style={{ width:36,height:36,borderRadius:8,background:"rgba(192,57,43,.08)",border:"1.5px solid rgba(192,57,43,.2)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#c0392b" }}>🗑️</button>}
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          <Field label={tr.modal.patient}>
            <div ref={patientRef} style={{ position:"relative" }}>
              <div style={{ position:"relative" }}>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setPatientDropOpen(true);
                    if (!e.target.value) setForm({...form, patient_id:""});
                  }}
                  onFocus={() => setPatientDropOpen(true)}
                  placeholder={tr.modal.selectPatient}
                  className="appt-input"
                  style={{ ...inputSt, paddingInlineEnd:36 }}
                  autoComplete="off"
                />
                <span style={{ position:"absolute",top:"50%",insetInlineEnd:12,transform:"translateY(-50%)",pointerEvents:"none",fontSize:14,color:"#aaa" }}>
                  {form.patient_id ? "✓" : "🔍"}
                </span>
              </div>
              {patientDropOpen && (
                <div style={{ position:"absolute",top:"calc(100% + 4px)",insetInlineStart:0,insetInlineEnd:0,background:"#fff",border:"1.5px solid #e0e6ef",borderRadius:12,boxShadow:"0 8px 32px rgba(8,99,186,.13)",zIndex:999,maxHeight:220,overflowY:"auto" }}>
                  {filteredPatients.length === 0 ? (
                    <div style={{ padding:"14px 16px",fontSize:13,color:"#aaa",textAlign:"center" }}>
                      {isAr ? "لا توجد نتائج" : "No results found"}
                    </div>
                  ) : filteredPatients.map(p => (
                    <div key={p.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        setForm({...form, patient_id: p.id});
                        setPatientSearch(p.name);
                        setPatientDropOpen(false);
                      }}
                      style={{ padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f4f6f9",transition:"background .12s" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="#f0f6ff")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                    >
                      <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{p.name}</div>
                        {p.phone && <div style={{ fontSize:11,color:"#aaa",direction:"ltr",textAlign:"start" }}>{p.phone}</div>}
                      </div>
                      {form.patient_id === p.id && <span style={{ marginInlineStart:"auto",color:"#0863ba",fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          {/* حقل الطبيب — يظهر فقط في الخطط المشتركة */}
          {isShared && (
            <Field label={tr.modal.doctor}>
              <select
                value={form.doctor_id}
                onChange={e => setForm({...form, doctor_id: e.target.value ? Number(e.target.value) : ""})}
                style={{ ...inputSt, cursor:"pointer" }}
                className="appt-input"
              >
                <option value="">{tr.modal.selectDoctor}</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.specialty ? ` — ${d.specialty}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div style={{ display:"flex",gap:12 }}>
            <Field label={tr.modal.date} half><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} className="appt-input"/></Field>
            <Field label={tr.modal.time} half><select value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={{ ...inputSt,cursor:"pointer" }} className="appt-input">{Array.from({length:15*4},(_,i)=>{const totalMin=8*60+i*15;const hh=String(Math.floor(totalMin/60)).padStart(2,"0");const mm=String(totalMin%60).padStart(2,"0");return `${hh}:${mm}`;}).map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
          </div>
          <div style={{ display:"flex",gap:12 }}>
            <Field label={tr.modal.duration} half>
              <select value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})} style={{ ...inputSt,cursor:"pointer" }}>
                {[15,20,30,45,60,90,120].map(d=><option key={d} value={d}>{d} {tr.duration.min}</option>)}
              </select>
            </Field>
            <Field label={tr.modal.type} half><input value={form.type} onChange={e=>setForm({...form,type:e.target.value})} placeholder={tr.modal.typePh} style={inputSt} className="appt-input"/></Field>
          </div>
          <Field label={tr.modal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.modal.notesPh} rows={3} className="appt-input" style={{ ...inputSt,resize:"vertical",lineHeight:1.6 } as React.CSSProperties}/>
          </Field>
          {isEdit&&(
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#aaa",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>{lang==="ar"?"تغيير حالة الموعد":"Update Status"}</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {([
                  { status:"scheduled" as Status, label:lang==="ar"?"✓ محدد":"✓ Scheduled", color:"#0863ba", bg:"rgba(8,99,186,.08)" },
                  { status:"completed" as Status, label:lang==="ar"?"✓ مكتمل":"✓ Completed", color:"#2e7d32", bg:"rgba(46,125,50,.08)" },
                  { status:"cancelled" as Status, label:lang==="ar"?"✕ ملغي":"✕ Cancelled",  color:"#c0392b", bg:"rgba(192,57,43,.08)" },
                  { status:"no-show"  as Status,  label:lang==="ar"?"⊘ لم يحضر":"⊘ No-Show", color:"#888",   bg:"rgba(136,136,136,.08)" },
                ]).map(s=>{
                  const isCurrent = appt!.status===s.status;
                  return (
                    <button key={s.status} onClick={()=>{if(!isCurrent)onStatusChange(appt!.id,s.status);}}
                      style={{ padding:"8px 14px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:isCurrent?"default":"pointer",border:isCurrent?`2px solid ${s.color}`:`1.5px solid ${s.color}30`,background:isCurrent?s.color:s.bg,color:isCurrent?"#fff":s.color,transition:"all .2s" }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"13px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {saving?(lang==="ar"?"جاري الحفظ...":"Saving..."):isEdit?tr.modal.update:tr.modal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ─────────────────────────────────────────
function ShareModal({ lang, clinicId, copied, setCopied, onClose }: {
  lang: Lang; clinicId: string; copied: boolean; setCopied:(v:boolean)=>void; onClose:()=>void;
}) {
  const isAr = lang==="ar";
  const fullUrl = typeof window!=="undefined" ? `${window.location.origin}/book/${clinicId}` : `/book/${clinicId}`;
  const displayUrl = typeof window!=="undefined"
    ? `${window.location.hostname}/book/${clinicId.slice(0,8)}...`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(()=>setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const msg = isAr
      ? `مرحباً، يمكنك حجز موعد في عيادتنا عبر الرابط:%0A${fullUrl}`
      : `Hello, book an appointment at our clinic:%0A${fullUrl}`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:440,boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)",overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0863ba,#054a8c)",padding:"28px 28px 24px",textAlign:"center",position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute",top:16,left:isAr?16:undefined,right:isAr?undefined:16,width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",fontSize:15,color:"#fff" }}>✕</button>
          <div style={{ width:60,height:60,borderRadius:16,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px" }}>🔗</div>
          <h2 style={{ fontSize:18,fontWeight:800,color:"#fff",marginBottom:6 }}>{isAr?"رابط حجز المواعيد":"Appointment Booking Link"}</h2>
          <p style={{ fontSize:13,color:"rgba(255,255,255,.75)" }}>{isAr?"شارك هذا الرابط مع مرضاك ليحجزوا مواعيدهم":"Share this link so patients can book online"}</p>
        </div>
        <div style={{ padding:"24px 28px" }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex",gap:8,alignItems:"center",background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:12,padding:"10px 14px" }}>
              <span style={{ flex:1,fontSize:14,color:"#0863ba",fontWeight:600,direction:"ltr",textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{displayUrl}</span>
              <button onClick={handleCopy} style={{ flexShrink:0,padding:"7px 14px",background:copied?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .3s" }}>
                {copied?(isAr?"✓ تم النسخ":"✓ Copied!"):(isAr?"نسخ":"Copy")}
              </button>
            </div>
            <p style={{ fontSize:11,color:"#aaa",marginTop:6,paddingInlineStart:2 }}>
              {isAr?"📋 عند النسخ يتم نسخ الرابط الكامل الذي يعمل":"📋 Clicking copy gives you the full working link"}
            </p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <button onClick={handleWhatsApp} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",background:"rgba(37,211,102,.1)",color:"#128c7e",border:"1.5px solid rgba(37,211,102,.25)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
            <button onClick={handleCopy} style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
              <span style={{ fontSize:18 }}>📋</span> {isAr?"نسخ الرابط":"Copy Link"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notification Toast ────────────────────────────────────
function NotificationToast({ lang, appt, patientName, onDismiss }: {
  lang: Lang; appt: Appointment; patientName: string; onDismiss: () => void;
}) {
  const tr = T[lang];
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTimeout(()=>setVisible(true),50); playNotificationSound(); },[]);
  return (
    <div style={{ position:"fixed",bottom:24,right:24,zIndex:300,background:"#fff",borderRadius:16,padding:"16px 20px",boxShadow:"0 8px 40px rgba(8,99,186,.2)",border:"1.5px solid rgba(8,99,186,.15)",maxWidth:320,display:"flex",gap:14,alignItems:"flex-start",transform:visible?"translateY(0)":"translateY(80px)",opacity:visible?1:0,transition:"all .35s cubic-bezier(.4,0,.2,1)" }}>
      <div style={{ width:44,height:44,borderRadius:12,background:"rgba(8,99,186,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🔔</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13,fontWeight:700,color:"#0863ba",marginBottom:4 }}>{tr.notification.title}</div>
        <div style={{ fontSize:13,color:"#353535",lineHeight:1.5 }}>
          {tr.notification.msg} <strong>{patientName}</strong><br/>
          <span style={{ fontSize:12,color:"#888" }}>{appt.time} • {tr.notification.in}</span>
        </div>
        <button onClick={onDismiss} style={{ marginTop:10,padding:"6px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>{tr.notification.dismiss}</button>
      </div>
      <button onClick={onDismiss} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:16,padding:2 }}>✕</button>
    </div>
  );
}

// ─── بطاقة الوقت والتاريخ الآني ──────────────────────────
function NowCard({ lang }: { lang: Lang }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh   = String(tick.getHours()).padStart(2,"0");
  const mm   = String(tick.getMinutes()).padStart(2,"0");
  const ss   = String(tick.getSeconds()).padStart(2,"0");
  const dayName = tr.weekDaysFull[tick.getDay()];
  const dateStr = `${tick.getDate()} ${tr.months[tick.getMonth()]} ${tick.getFullYear()}`;
  const ampm    = tick.getHours() < 12 ? (isAr ? "ص" : "AM") : (isAr ? "م" : "PM");

  return (
    <div style={{
      background:"linear-gradient(135deg, #0863ba 0%, #054a8c 100%)",
      borderRadius:16, padding:"20px 18px",
      marginTop:12, boxShadow:"0 4px 20px rgba(8,99,186,.2)",
      color:"#fff", position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute",inset:0,opacity:.07,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"20px 20px" }}/>
      <div style={{ position:"relative",zIndex:1 }}>
        <div style={{ fontSize:10,fontWeight:700,opacity:.7,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>{tr.nowCard.title}</div>
        <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:4 }}>
          <span style={{ fontSize:34,fontWeight:900,letterSpacing:-1,lineHeight:1 }}>{hh}:{mm}</span>
          <span style={{ fontSize:16,fontWeight:700,opacity:.8 }}>{ss}</span>
          <span style={{ fontSize:13,fontWeight:600,opacity:.75,marginInlineStart:4 }}>{ampm}</span>
        </div>
        <div style={{ fontSize:12,opacity:.8,fontWeight:500 }}>{dayName} · {dateStr}</div>
        <div style={{ marginTop:12,height:4,background:"rgba(255,255,255,.2)",borderRadius:10,overflow:"hidden" }}>
          <div style={{
            height:"100%",
            width:`${((tick.getHours()*60+tick.getMinutes())/(24*60))*100}%`,
            background:"rgba(255,255,255,.8)", borderRadius:10,
            transition:"width 1s linear",
          }}/>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ─── قسم طلبات الحجز المعلقة (جديد) ────────────────────────
// ════════════════════════════════════════════════════════════
function PendingBookingsSection({ lang, pendingAppointments, patients, onApprove, onReject, isMobile }: {
  lang: Lang;
  pendingAppointments: Appointment[];
  patients: Patient[];
  onApprove: (appt: Appointment) => Promise<void>;
  onReject:  (appt: Appointment) => Promise<void>;
  isMobile: boolean;
}) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"approve"|"reject"|null>(null);

  if (pendingAppointments.length === 0) return null;

  const getPatientName = (pid: number, appt?: Appointment) => {
    if (pid) return patients.find(p => p.id === pid)?.name ?? "—";
    return (appt as any)?.guest_name ?? "—";
  };
  const getPatientPhone = (pid: number, appt?: Appointment) => {
    if (pid) return patients.find(p => p.id === pid)?.phone ?? "";
    return (appt as any)?.guest_phone ?? "";
  };

  const handleApprove = async (appt: Appointment) => {
    setLoadingId(appt.id);
    setActionType("approve");
    await onApprove(appt);
    setLoadingId(null);
    setActionType(null);
  };

  const handleReject = async (appt: Appointment) => {
    setLoadingId(appt.id);
    setActionType("reject");
    await onReject(appt);
    setLoadingId(null);
    setActionType(null);
  };

  return (
    <div style={{
      background:"#fff",
      borderRadius:16,
      border:"2px solid rgba(230,126,34,.25)",
      boxShadow:"0 2px 20px rgba(230,126,34,.1)",
      marginBottom:20,
      overflow:"hidden",
      animation:"fadeUp .4s ease",
    }}>
      {/* Header القسم */}
      <div style={{
        background:"linear-gradient(135deg, rgba(230,126,34,.08) 0%, rgba(243,156,18,.05) 100%)",
        padding:"16px 22px",
        borderBottom:"1.5px solid rgba(230,126,34,.15)",
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:"rgba(230,126,34,.12)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,
          }}>🔔</div>
          <div>
            <h3 style={{ fontSize:15,fontWeight:800,color:"#e67e22",margin:0 }}>
              {tr.pending.sectionTitle}
            </h3>
            <p style={{ fontSize:11,color:"#aaa",margin:0,marginTop:2 }}>
              {tr.pending.sectionSub}
            </p>
          </div>
        </div>
        {/* عدد الطلبات */}
        <div style={{
          background:"#e67e22",
          color:"#fff",
          borderRadius:20,
          padding:"4px 12px",
          fontSize:13,
          fontWeight:700,
          minWidth:28,
          textAlign:"center",
        }}>
          {pendingAppointments.length}
        </div>
      </div>

      {/* قائمة الطلبات */}
      <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {pendingAppointments.map(appt => {
          const name  = getPatientName(appt.patient_id, appt);
          const phone = getPatientPhone(appt.patient_id, appt);
          const isLoading = loadingId === appt.id;
          const [y, mo, d] = appt.date.split("-");
          const dateFormatted = `${parseInt(d)} ${tr.months[parseInt(mo)-1]} ${y}`;

          return (
            <div
              key={appt.id}
              style={{
                background:"rgba(247,249,252,.8)",
                border:"1.5px solid rgba(230,126,34,.15)",
                borderRadius:14,
                padding:"14px 16px",
                display:"flex",
                flexDirection:isMobile?"column":"row",
                alignItems:isMobile?"flex-start":"center",
                gap:12,
                transition:"all .2s",
              }}
            >
              {/* أيقونة المريض + معلوماته */}
              <div style={{ display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0 }}>
                {/* Avatar */}
                <div style={{
                  width:44, height:44, borderRadius:12,
                  background:getColor(appt.patient_id),
                  color:"#fff",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:700,flexShrink:0,
                }}>
                  {name !== "—" ? getInitials(name) : "?"}
                </div>

                <div style={{ flex:1,minWidth:0 }}>
                  {/* اسم المريض + بادج "طلب جديد" */}
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap" }}>
                    <span style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{name}</span>
                    <span style={{
                      fontSize:10,fontWeight:700,
                      background:"rgba(230,126,34,.12)",
                      color:"#e67e22",
                      border:"1px solid rgba(230,126,34,.25)",
                      borderRadius:20,
                      padding:"2px 8px",
                    }}>
                      {tr.pending.badge}
                    </span>
                  </div>

                  {/* تفاصيل الموعد */}
                  <div style={{ display:"flex",flexWrap:"wrap",gap:10,fontSize:12,color:"#666" }}>
                    <span>📅 {dateFormatted}</span>
                    <span>🕐 {appt.time.slice(0,5)}</span>
                    {phone && <span>📞 {phone}</span>}
                    {appt.type && appt.type !== "حجز إلكتروني / Online Booking" && (
                      <span>🏷️ {appt.type}</span>
                    )}
                  </div>

                  {/* ملاحظات المريض (إن وجدت) */}
                  {appt.notes && (
                    <div style={{
                      marginTop:6,
                      fontSize:12,
                      color:"#888",
                      background:"rgba(8,99,186,.04)",
                      border:"1px solid rgba(8,99,186,.1)",
                      borderRadius:8,
                      padding:"5px 10px",
                      fontStyle:"italic",
                    }}>
                      💬 {appt.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* أزرار القبول والرفض */}
              <div style={{
                display:"flex",
                gap:8,
                flexShrink:0,
                width:isMobile?"100%":undefined,
              }}>
                {/* زر القبول */}
                <button
                  onClick={() => handleApprove(appt)}
                  disabled={isLoading}
                  style={{
                    flex:isMobile?1:undefined,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:5,
                    padding:"10px 18px",
                    background: isLoading && actionType==="approve" ? "#aaa" : "#2e7d32",
                    color:"#fff",
                    border:"none",
                    borderRadius:10,
                    fontFamily:"Rubik,sans-serif",
                    fontSize:13,
                    fontWeight:700,
                    cursor:isLoading?"not-allowed":"pointer",
                    transition:"all .2s",
                    boxShadow:"0 2px 10px rgba(46,125,50,.25)",
                    opacity:isLoading?0.7:1,
                    whiteSpace:"nowrap",
                  }}
                >
                  {isLoading && actionType==="approve"
                    ? tr.pending.approving
                    : tr.pending.approve}
                </button>

                {/* زر الرفض */}
                <button
                  onClick={() => handleReject(appt)}
                  disabled={isLoading}
                  style={{
                    flex:isMobile?1:undefined,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    gap:5,
                    padding:"10px 18px",
                    background:"rgba(192,57,43,.06)",
                    color:"#c0392b",
                    border:"1.5px solid rgba(192,57,43,.25)",
                    borderRadius:10,
                    fontFamily:"Rubik,sans-serif",
                    fontSize:13,
                    fontWeight:700,
                    cursor:isLoading?"not-allowed":"pointer",
                    transition:"all .2s",
                    opacity:isLoading?0.5:1,
                    whiteSpace:"nowrap",
                  }}
                >
                  {isLoading && actionType==="reject"
                    ? tr.pending.rejecting
                    : tr.pending.reject}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AppointmentsPage() {
  const [lang, setLang]               = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = T[lang];

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [appointments,        setAppointments]        = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [patients,            setPatients]            = useState<Patient[]>([]);
  const [doctors,             setDoctors]             = useState<Doctor[]>([]);
  const [doctorSchedules,     setDoctorSchedules]     = useState<DoctorSchedule[]>([]);
  const [selectedDoctorId,    setSelectedDoctorId]    = useState<number | "all">("all");
  const [loading,             setLoading]             = useState(true);
  const [saving,              setSaving]              = useState(false);
  const [clinicId,            setClinicId]            = useState("");
  const [plan,                setPlan]                = useState<PlanType>("basic");
  const [shareModal,          setShareModal]          = useState(false);
  const [copied,              setCopied]              = useState(false);
  const [displayCopied,       setDisplayCopied]       = useState(false);
  const [viewMonth,           setViewMonth]           = useState(now.getMonth());
  const [viewYear,            setViewYear]            = useState(now.getFullYear());
  const [selectedKey,         setSelectedKey]         = useState(todayKey);
  const [addModal,            setAddModal]            = useState(false);
  const [editAppt,            setEditAppt]            = useState<Appointment | null>(null);
  const [quickSlot,           setQuickSlot]           = useState<{ doctorId: number | null; time: string; date: string } | null>(null);
  const [notification,        setNotification]        = useState<Appointment | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const loadPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
    const { data } = await supabase
      .from("patients").select("id, name, user_id, phone, has_diabetes, has_hypertension, is_hidden, created_at")
      .eq("user_id", userId).eq("is_hidden", false).order("name");
    setPatients((data ?? []) as Patient[]);
  };

  const loadDoctors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
    const { data } = await supabase
      .from("doctors").select("id, name, specialty, user_id")
      .eq("user_id", userId).order("name");
    setDoctors((data ?? []) as Doctor[]);
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      // ── المواعيد الفعلية (كل الحالات ما عدا pending_approval) ──
      const { data, error } = await supabase
        .from("appointments").select("*")
        .eq("user_id", userId)
        .neq("status", "pending_approval")   // ◀ استثناء المواعيد المعلقة
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw error;
      setAppointments((data ?? []) as Appointment[]);

      // ── الطلبات المعلقة فقط ──
      const { data: pendingData, error: pendingError } = await supabase
        .from("appointments").select("*")
        .eq("user_id", userId)
        .eq("status", "pending_approval")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (pendingError) throw pendingError;
      setPendingAppointments((pendingData ?? []) as Appointment[]);

    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadPatients();
    loadAppointments();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setClinicId(user.id);
        // جلب خطة العيادة
        const { data: clinicData } = await supabase
          .from("clinics").select("plan").eq("user_id", user.id).single();
        if (clinicData?.plan) {
          const fetchedPlan = clinicData.plan as PlanType;
          setPlan(fetchedPlan);
          // جلب الأطباء وجداول الدوام فقط إذا كانت خطة مشتركة
          if (isSharedPlan(fetchedPlan)) {
            await loadDoctors();
            // جلب جداول الدوام
            const { data: schedData } = await supabase
              .from("doctor_schedules")
              .select("*")
              .eq("user_id", user.id);
            if (schedData) {
              setDoctorSchedules(schedData.map(row => ({
                ...row,
                days:      typeof row.days      === "string" ? JSON.parse(row.days)      : row.days,
                vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
              })) as DoctorSchedule[]);
            }
          }
        }
      }
    });
  }, []);

  // ── Realtime: مراقبة طلبات الحجز الجديدة ─────────────────
  useEffect(() => {
    if (!clinicId) return;
    const channel = supabase
      .channel("pending-bookings")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${clinicId}`,
        },
        async (payload) => {
          const newAppt = payload.new as Appointment;
          if ((newAppt.status as string) === "pending_approval") {
            // تشغيل صوت تنبيه عند وصول طلب جديد
            playNotificationSound();
            setPendingAppointments(prev => [...prev, newAppt]);
            // إعادة تحميل المرضى لضمان ظهور اسم المريض الجديد
            await loadPatients();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  // ── نظام التنبيه ───────────────────────────────────────────
  const notifiedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (appointments.length === 0) return;
    const checkNotifications = () => {
      const n   = new Date();
      const yy  = n.getFullYear();
      const mm  = String(n.getMonth()+1).padStart(2,"0");
      const dd  = String(n.getDate()).padStart(2,"0");
      const key = `${yy}-${mm}-${dd}`;
      const target = new Date(n.getTime() + 15 * 60 * 1000);
      const tH = String(target.getHours()).padStart(2,"0");
      const tM = String(target.getMinutes()).padStart(2,"0");
      const targetTime = `${tH}:${tM}`;
      const upcoming = appointments.find(a =>
        a.date === key &&
        a.status === "scheduled" &&
        a.time.slice(0,5) === targetTime &&
        !notifiedRef.current.has(a.id)
      );
      if (upcoming) {
        notifiedRef.current.add(upcoming.id);
        setNotification(upcoming);
      }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 60_000);
    return () => clearInterval(interval);
  }, [appointments]);

  useEffect(() => {
    if (selectedKey === todayKey && timelineRef.current) {
      const currentHour = new Date().getHours();
      const slotIndex = Math.max(0, (currentHour - 8) * 4);
      const slotHeight = 40;
      setTimeout(() => {
        timelineRef.current?.scrollTo({ top: slotIndex * slotHeight - 80, behavior: "smooth" });
      }, 300);
    }
  }, [selectedKey]);

  // ── Handlers ──────────────────────────────────────────────
  const handleSave = async (form: ApptForm, id?: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
      const payload: Record<string, unknown> = {
        patient_id: form.patient_id,
        date: form.date, time: form.time,
        duration: form.duration,
        type: form.type||null,
        notes: form.notes||null,
        status: form.status,
      };
      // إضافة doctor_id فقط في الخطط المشتركة
      if (isSharedPlan(plan) && form.doctor_id) {
        payload.doctor_id = form.doctor_id;
      }
      if (id) {
        await supabase.from("appointments").update(payload).eq("id",id);
      } else {
        await supabase.from("appointments").insert({ user_id:userId, ...payload, status:"scheduled" });
      }
      await loadAppointments();
      setSelectedKey(form.date);
    } catch (err) { console.error(err); }
    finally { setSaving(false); setAddModal(false); setEditAppt(null); }
  };

  const handleStatusChange = async (id: number, status: Status) => {
    try {
      await supabase.from("appointments").update({ status }).eq("id", id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) { console.error(err); }
    finally { setEditAppt(null); }
  };

  const handleDelete = async (id: number) => {
    try {
      await supabase.from("appointments").delete().eq("id", id);
      setAppointments(prev => prev.filter(a => a.id !== id));
      setPendingAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
    finally { setEditAppt(null); setAddModal(false); }
  };

  // ── قبول طلب الحجز ─────────────────────────────────────────
  // إذا كان patient_id موجوداً (مريض قديم) → فقط حدّث الحالة
  // إذا كان null (حاجز جديد) → أنشئ المريض أولاً ثم ارتبط به
  const handleApproveBooking = async (appt: Appointment) => {
    try {
      let patientId = appt.patient_id;
      const guestName  = (appt as any).guest_name  as string | null;
      const guestPhone = (appt as any).guest_phone as string | null;
      const guestData  = (appt as any).guest_data  as GuestData | null;

      if (!patientId && guestName && guestPhone) {
        // ── أنشئ سجل المريض الآن ─────────────────────────────
        // تحقق أولاً: هل هاتفه مسجل مسبقاً؟ (قد يكون سجّله الطبيب يدوياً)
        const { data: existPat } = await supabase
          .from("patients")
          .select("id")
          .eq("user_id", clinicId)
          .eq("phone", guestPhone)
          .maybeSingle();

        if (existPat) {
          patientId = existPat.id;
        } else {
          // احصل على MRN أو أنشئه
          const { data: masterUp } = await supabase
            .from("master_patients")
            .upsert({ phone: guestPhone, name: guestName }, { onConflict: "phone", ignoreDuplicates: true })
            .select("mrn")
            .maybeSingle();

          let mrn = masterUp?.mrn;
          if (!mrn) {
            const { data: masterEx } = await supabase
              .from("master_patients")
              .select("mrn")
              .eq("phone", guestPhone)
              .maybeSingle();
            mrn = masterEx?.mrn ?? undefined;
          }

          // أضف المريض
          const { data: newPat, error: patErr } = await supabase
            .from("patients")
            .insert({
              user_id:          clinicId,
              name:             guestName,
              phone:            guestPhone,
              gender:           guestData?.gender ?? null,
              has_diabetes:     guestData?.has_diabetes ?? false,
              has_hypertension: guestData?.has_hypertension ?? false,
              is_hidden:        false,
              ...(mrn ? { mrn } : {}),
            })
            .select("id")
            .single();

          if (patErr) throw patErr;
          patientId = newPat.id;
        }
      }

      // حدّث الموعد: scheduled + patient_id + امسح guest fields
      await supabase
        .from("appointments")
        .update({
          status:      "scheduled",
          patient_id:  patientId,
          guest_name:  null,
          guest_phone: null,
          guest_data:  null,
        })
        .eq("id", appt.id);

      // تحديث القوائم المحلية
      setPendingAppointments(prev => prev.filter(a => a.id !== appt.id));
      setAppointments(prev => [
        ...prev,
        { ...appt, status: "scheduled" as Status, patient_id: patientId as number }
      ].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
      // تحديث قائمة المرضى لتشمل المريض الجديد
      if (!appt.patient_id) loadPatients();
      setSelectedKey(appt.date);
    } catch (err) { console.error(err); }
  };

  // ── رفض طلب الحجز: تحويل الحالة إلى cancelled ─────────────
  const handleRejectBooking = async (appt: Appointment) => {
    try {
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appt.id);
      setPendingAppointments(prev => prev.filter(a => a.id !== appt.id));
    } catch (err) { console.error(err); }
  };

  // ── Computed ──────────────────────────────────────────────
  const dayAppointments = appointments
    .filter(a => a.date === selectedKey)
    .filter(a => {
      if (!isSharedPlan(plan)) return true;
      if (selectedDoctorId === "all") return true;
      return (a as any).doctor_id === selectedDoctorId;
    })
    .sort((a,b)=>a.time.localeCompare(b.time));
  const countByKey: Record<string,number> = {};
  appointments.forEach(a => { countByKey[a.date] = (countByKey[a.date]||0)+1; });

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const calDays: (number|null)[] = [];
  for (let i=0;i<firstDay;i++) calDays.push(null);
  for (let d=1;d<=daysInMonth;d++) calDays.push(d);

  const monthKey   = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthAppts = appointments.filter(a=>a.date.startsWith(monthKey));

  const todayAppts        = appointments.filter(a => a.date === todayKey);
  const todayMinutes      = todayAppts.reduce((s,a)=>s+(a.duration||30), 0);
  const occupancyPct      = Math.min(100, Math.round((todayMinutes / CLINIC_MINUTES) * 100));
  const occupancyColor    = occupancyPct >= 80 ? "#c0392b" : occupancyPct >= 50 ? "#e67e22" : "#2e7d32";

  const stats = {
    total:     monthAppts.length,
    today:     todayAppts.length,
    completed: monthAppts.filter(a=>a.status==="completed").length,
    pending:   appointments.filter(a=>a.status==="scheduled"&&a.date>=todayKey).length,
  };

  const getPatientName  = (pid: number) => patients.find(p=>p.id===pid)?.name ?? "—";
  const getPatientPhone = (pid: number) => patients.find(p=>p.id===pid)?.phone ?? "";

  const statusStyle = (s: string) => ({
    scheduled: { bg:"rgba(8,99,186,.06)",    border:"rgba(8,99,186,.2)"    },
    completed: { bg:"rgba(46,125,50,.06)",   border:"rgba(46,125,50,.2)"   },
    cancelled: { bg:"rgba(192,57,43,.04)",   border:"rgba(192,57,43,.15)"  },
    "no-show": { bg:"rgba(136,136,136,.04)", border:"rgba(136,136,136,.15)" },
  }[s] ?? { bg:"#f7f9fc", border:"#eef0f3" });

  const selDate  = selectedKey.split("-");
  const selLabel = selDate.length===3 ? `${parseInt(selDate[2])} ${tr.months[parseInt(selDate[1])-1]} ${selDate[0]}` : selectedKey;

  const sendWhatsApp = (appt: Appointment) => {
    let rawPhone = getPatientPhone(appt.patient_id).replace(/\D/g,"");
    if (rawPhone.startsWith("09") && rawPhone.length === 10) {
      rawPhone = "963" + rawPhone.slice(1);
    } else if (rawPhone.startsWith("9") && rawPhone.length === 9) {
      rawPhone = "963" + rawPhone;
    } else if (rawPhone.startsWith("00963")) {
      rawPhone = rawPhone.slice(2);
    }
    const name     = getPatientName(appt.patient_id);
    const [y, mo, d] = appt.date.split("-");
    const dateFormatted = `${parseInt(d)} ${T[lang].months[parseInt(mo)-1]} ${y}`;
    const msg = encodeURIComponent(T[lang].whatsappMsg(name, dateFormatted, appt.time.slice(0,5)));
    if (rawPhone) {
      const desktopUrl = `whatsapp://send?phone=${rawPhone}&text=${msg}`;
      const webUrl     = `https://wa.me/${rawPhone}?text=${msg}`;
      const a = document.createElement("a");
      a.href  = desktopUrl;
      a.click();
      setTimeout(() => { window.open(webUrl, "_blank"); }, 1500);
    } else {
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  };

  const nowH    = now.getHours();
  const nowM    = now.getMinutes();
  const nowLine = selectedKey === todayKey && nowH >= 8 && nowH < 22;
  const nowSlotIdx = nowLine ? ((nowH - 8) * 4 + Math.floor(nowM / 15)) : -1;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;direction:${isAr?"rtl":"ltr"}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes nowPulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes pendingPulse{0%,100%{box-shadow:0 0 0 0 rgba(230,126,34,.3)}50%{box-shadow:0 0 0 6px rgba(230,126,34,0)}}
        .appt-block{border:1.5px solid;border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .18s}
        .appt-block:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(8,99,186,.12)}
        .appt-input:focus{border-color:#0863ba!important;box-shadow:0 0 0 3px rgba(8,99,186,.1)}
        .cal-day{border-radius:8px;cursor:pointer;transition:all .15s;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
        .cal-day:hover{background:rgba(8,99,186,.06)}
        .wa-btn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;background:rgba(37,211,102,.12);border:1px solid rgba(37,211,102,.25);cursor:pointer;transition:all .15s;flex-shrink:0;padding:0}
        .wa-btn:hover{background:rgba(37,211,102,.3);transform:scale(1.1);border-color:rgba(37,211,102,.5)}
        .slot-row{display:flex;align-items:flex-start;gap:0;min-height:40px;position:relative}
        .slot-row:last-child{border-bottom:none}
        .timeline-scroll{overflow-y:auto;max-height:calc(100vh - 300px)}
        .timeline-scroll::-webkit-scrollbar{width:4px}
        .timeline-scroll::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @media(max-width:768px){.appt-main-content{margin-right:0!important;margin-left:0!important;padding:0 14px 48px!important;width:100%!important}}
        @media(min-width:769px){.appt-main-content{margin-${isAr?'right':'left'}:${sidebarWidth}px}}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <SharedSidebar lang={lang} setLang={setLang} activePage="appointments" plan={plan} onCollapse={(c) => setSidebarWidth(c ? 70 : 240)} />

        <main className="appt-main-content" style={{ padding:isMobile?"0 14px 48px":"0 28px 48px", minHeight:"100vh", transition:"margin .3s" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"18px 0 14px",borderBottom:"1.5px solid #eef0f3",marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between", paddingLeft:isMobile&&!isAr?52:0, paddingRight:isMobile&&isAr?52:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div>
                  <h1 style={{ fontSize:isMobile?17:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                  {!isMobile&&<p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>}
                </div>
                {/* بادج عدد الطلبات المعلقة — فقط للاحترافية والشاملة */}
                {canAccess("payments", plan) && pendingAppointments.length > 0 && (
                  <div style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(230,126,34,.1)",border:"1.5px solid rgba(230,126,34,.3)",borderRadius:20,padding:"4px 10px",animation:"pendingPulse 2s ease infinite" }}>
                    <span style={{ fontSize:14 }}>🔔</span>
                    <span style={{ fontSize:12,fontWeight:700,color:"#e67e22" }}>{pendingAppointments.length}</span>
                  </div>
                )}
              </div>
              <div style={{ display:"flex",gap:isMobile?6:10,alignItems:"center" }}>
                {/* رابط الحجز — فقط للاحترافية والشاملة */}
                {canAccess("payments", plan) && (
                  <button onClick={()=>setShareModal(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                    🔗 {isAr?"رابط الحجز":"Booking Link"}
                  </button>
                )}
                {/* زر شاشة قاعة الانتظار */}
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/display/${clinicId}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setDisplayCopied(true);
                      setTimeout(() => setDisplayCopied(false), 2500);
                    });
                  }}
                  title={isAr?"نسخ رابط شاشة قاعة الانتظار":"Copy Waiting Room Display URL"}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:displayCopied?"rgba(46,125,50,.08)":"#fff",color:displayCopied?"#2e7d32":"#555",border:`1.5px solid ${displayCopied?"rgba(46,125,50,.3)":"#eef0f3"}`,borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .25s" }}
                >
                  {displayCopied ? (isAr?"✓ تم النسخ":"✓ Copied!") : (isMobile?"🖥️":`🖥️ ${isAr?"شاشة الانتظار":"Display"}`)}
                </button>
                {/* زر التحديث */}
                <button
                  onClick={() => { loadPatients(); loadAppointments(); }}
                  title={isAr?"تحديث البيانات":"Refresh"}
                  style={{ position:"relative",display:"flex",alignItems:"center",gap:6,padding:isMobile?"9px 10px":"9px 14px",background:"#fff",color:"#666",border:"1.5px solid #eef0f3",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:isMobile?12:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}
                >
                  🔄{!isMobile&&<span>{isAr?"تحديث":"Refresh"}</span>}
                  {pendingAppointments.length > 0 && (
                    <span style={{ position:"absolute",top:-6,right:isAr?undefined:-6,left:isAr?-6:undefined,background:"#e67e22",color:"#fff",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:800,lineHeight:1.6,minWidth:18,textAlign:"center" }}>
                      {pendingAppointments.length}
                    </span>
                  )}
                </button>
                <button onClick={()=>setAddModal(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:isMobile?"9px 12px":"9px 18px",background:"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:isMobile?12:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
                  ＋ {isMobile?(isAr?"موعد":"Add"):tr.addAppointment}
                </button>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,1fr)",gap:isMobile?8:12,marginBottom:20,animation:"fadeUp .4s ease" }}>
            {[
              { label:tr.stats.total,     value:stats.total,     icon:"📅", color:"#0863ba" },
              { label:tr.stats.today,     value:stats.today,     icon:"🕐", color:"#e67e22" },
              { label:tr.stats.completed, value:stats.completed, icon:"✅", color:"#2e7d32" },
              { label:tr.stats.pending,   value:stats.pending,   icon:"⏳", color:"#7b2d8b" },
            ].map((s,i) => (
              <div key={i} style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:s.color,borderRadius:"14px 14px 0 0" }}/>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <span style={{ fontSize:10,fontWeight:700,color:s.color,background:`${s.color}14`,padding:"3px 9px",borderRadius:20 }}>{s.label}</span>
                </div>
                <div style={{ fontSize:28,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
            {/* Occupancy */}
            <div style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:occupancyColor,borderRadius:"14px 14px 0 0" }}/>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ fontSize:20 }}>🏥</span>
                <span style={{ fontSize:9,fontWeight:700,color:occupancyColor,background:`${occupancyColor}14`,padding:"3px 7px",borderRadius:20,textAlign:"center",lineHeight:1.3 }}>{tr.stats.occupancy}</span>
              </div>
              <div style={{ fontSize:28,fontWeight:900,color:occupancyColor,lineHeight:1,marginBottom:6 }}>{occupancyPct}%</div>
              <div style={{ height:5,background:"#f0f2f5",borderRadius:10,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${occupancyPct}%`,background:occupancyColor,borderRadius:10,transition:"width 1s ease" }}/>
              </div>
            </div>
          </div>

          {/* بانر الخطة المشتركة — معلومات الأطباء */}
          {isSharedPlan(plan) && doctors.length > 0 && (
            <div style={{
              background:"linear-gradient(135deg, rgba(109,40,217,.06) 0%, rgba(91,33,182,.04) 100%)",
              border:"1.5px solid rgba(109,40,217,.18)",
              borderRadius:14,
              padding:"12px 18px",
              marginBottom:16,
              display:"flex",
              alignItems:"center",
              gap:12,
              flexWrap:"wrap",
              animation:"fadeUp .4s ease",
            }}>
              <div style={{ width:36,height:36,borderRadius:10,background:"rgba(109,40,217,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>👨‍⚕️</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#6d28d9",marginBottom:4 }}>
                  {isAr ? `خطة مشتركة · ${doctors.length} أطباء مسجلين` : `Shared Plan · ${doctors.length} registered doctors`}
                  <span style={{ marginInlineStart:8,fontSize:10,fontWeight:600,color:"#888" }}>
                    ({isAr ? `الحد الأقصى: ${SHARED_PLAN_DOCTOR_LIMITS[plan] ?? "∞"}` : `Max: ${SHARED_PLAN_DOCTOR_LIMITS[plan] ?? "∞"}`})
                  </span>
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {doctors.map(d => (
                    <span key={d.id} style={{ fontSize:11,fontWeight:600,color:"#6d28d9",background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.15)",borderRadius:20,padding:"2px 10px" }}>
                      {d.name}{d.specialty ? ` · ${d.specialty}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ قسم طلبات الحجز المعلقة — فقط للاحترافية والشاملة ════ */}
          {canAccess("payments", plan) && (
            <PendingBookingsSection
              lang={lang}
              pendingAppointments={pendingAppointments}
              patients={patients}
              onApprove={handleApproveBooking}
              onReject={handleRejectBooking}
              isMobile={isMobile}
            />
          )}

          {/* CALENDAR + TIMELINE */}
          <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"300px 1fr",gap:18 }}>

            {/* ── التقويم ── */}
            <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
              <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
                <div style={{ padding:"14px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <button onClick={()=>{ let m=viewMonth-1,y=viewYear; if(m<0){m=11;y--;} setViewMonth(m);setViewYear(y); }} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
                  <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{tr.months[viewMonth]} {viewYear}</div>
                  <button onClick={()=>{ let m=viewMonth+1,y=viewYear; if(m>11){m=0;y++;} setViewMonth(m);setViewYear(y); }} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4 }}>
                    {tr.weekDays.map(d=><div key={d} style={{ textAlign:"center",fontSize:9,fontWeight:700,color:"#bbb",padding:"3px 0" }}>{d}</div>)}
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
                    {calDays.map((d,i)=>{
                      if(!d) return <div key={i}/>;
                      const k=toKey(viewYear,viewMonth,d), cnt=countByKey[k]||0;
                      const isSel=k===selectedKey, isTod=k===todayKey;
                      // فحص إجازة/عطلة الطبيب المحدد
                      const isDoctorOff = isSharedPlan(plan) && selectedDoctorId !== "all" && (() => {
                        const sch = doctorSchedules.find(s => s.doctor_id === Number(selectedDoctorId));
                        if (!sch) return false;
                        const dayIdx = new Date(k).getDay();
                        return sch.vacations.includes(k) || !sch.days[dayIdx]?.enabled;
                      })();
                      return (
                        <div key={i} className="cal-day" onClick={()=>setSelectedKey(k)}
                          style={{ background:isSel?"#0863ba":isTod?"rgba(8,99,186,.08)":isDoctorOff?"rgba(192,57,43,.07)":"transparent",color:isSel?"#fff":isTod?"#0863ba":isDoctorOff?"#c0392b":"#353535",border:isTod&&!isSel?"1.5px solid rgba(8,99,186,.2)":isDoctorOff&&!isSel?"1.5px solid rgba(192,57,43,.15)":"1.5px solid transparent" }}>
                          <span style={{ fontSize:12,fontWeight:isSel||isTod?700:400 }}>{d}</span>
                          {cnt>0&&!isDoctorOff&&<div style={{ width:14,height:4,borderRadius:3,background:isSel?"rgba(255,255,255,.6)":"#0863ba" }}/>}
                          {isDoctorOff&&!isSel&&<div style={{ fontSize:8,color:"#c0392b",fontWeight:700,lineHeight:1,marginTop:1 }}>{isAr?"عطلة":"Off"}</div>}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={()=>setSelectedKey(todayKey)} style={{ width:"100%",marginTop:10,padding:"7px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                    📅 {tr.today}
                  </button>
                </div>
              </div>
              <NowCard lang={lang}/>
            </div>

            {/* ── Timeline المواعيد ── */}
            <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
              <div style={{ padding:"16px 20px 12px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div>
                  <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>{selLabel}</h3>
                  <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
                    {dayAppointments.length} {tr.appointments}
                    {dayAppointments.length>=16&&<span style={{ marginInlineStart:8,color:"#c0392b",fontWeight:600 }}>• {tr.fullDay}</span>}
                  </p>
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  {/* فلتر الطبيب — يظهر فقط في الخطط المشتركة */}
                  {isSharedPlan(plan) && doctors.length > 0 && (
                    <select
                      value={selectedDoctorId}
                      onChange={e => setSelectedDoctorId(e.target.value === "all" ? "all" : Number(e.target.value))}
                      style={{
                        padding:"6px 10px",
                        border:"1.5px solid rgba(8,99,186,.18)",
                        borderRadius:9,
                        fontFamily:"Rubik,sans-serif",
                        fontSize:12,
                        fontWeight:600,
                        color:"#0863ba",
                        background:"rgba(8,99,186,.05)",
                        cursor:"pointer",
                        outline:"none",
                        maxWidth:isMobile?120:180,
                      }}
                    >
                      <option value="all">{tr.modal.allDoctors}</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={()=>setAddModal(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                    ＋ {tr.appt}
                  </button>
                </div>
              </div>

              <div ref={timelineRef} className="timeline-scroll" style={{ padding:"12px 16px 16px" }}>
                {loading ? (
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:14,fontWeight:600 }}>{tr.loading}</div>
                  </div>
                ) : (
                  <>
                    {dayAppointments.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                        <div style={{ fontSize:44,marginBottom:14 }}>📅</div>
                        <div style={{ fontSize:15,fontWeight:600 }}>{tr.noAppointments}</div>
                        <button onClick={()=>setAddModal(true)} style={{ marginTop:20,padding:"10px 24px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer" }}>
                          ＋ {tr.addAppointment}
                        </button>
                      </div>
                    ) : isSharedPlan(plan) ? (
                      /* ══ جدول مشترك — للخطط المشتركة فقط ══ */
                      (() => {
                        const DOC_COLORS = ["#6d28d9","#0863ba","#2e7d32","#c0392b","#e67e22","#0891b2"];

                        // استخراج الأطباء الذين لهم مواعيد في هذا اليوم
                        const docIdsOrdered: (number | null)[] = [];
                        [...dayAppointments].sort((a,b)=>a.time.localeCompare(b.time)).forEach(appt => {
                          const docId = (appt as any).doctor_id ?? null;
                          if (!docIdsOrdered.includes(docId)) docIdsOrdered.push(docId);
                        });
                        const tableDocList = docIdsOrdered.map(docId => ({
                          id: docId,
                          doc: docId ? doctors.find(d => d.id === docId) ?? null : null,
                        }));

                        // استخراج الأوقات الفريدة مرتبة
                        const uniqueTimes = [...new Set(
                          [...dayAppointments].map(a => a.time.slice(0,5))
                        )].sort();

                        // خريطة: time -> docId -> appt
                        const apptMap: Record<string, Record<string, Appointment>> = {};
                        dayAppointments.forEach(appt => {
                          const t = appt.time.slice(0,5);
                          const d = String((appt as any).doctor_id ?? "null");
                          if (!apptMap[t]) apptMap[t] = {};
                          apptMap[t][d] = appt;
                        });

                        const colW = Math.max(160, Math.floor(460 / tableDocList.length));

                        return (
                          <div style={{ overflowX:"auto", borderRadius:16, border:"1.5px solid #e8edf5", boxShadow:"0 4px 20px rgba(8,99,186,.07)" }}>
                            <table style={{ width:"100%", borderCollapse:"collapse", minWidth: 60 + tableDocList.length * colW }}>
                              {/* ── رأس الجدول: أسماء الأطباء ── */}
                              <thead>
                                <tr>
                                  {/* خلية الوقت */}
                                  <th style={{
                                    width:64, minWidth:64,
                                    background:"linear-gradient(135deg,#0863ba,#054a8c)",
                                    padding:"14px 10px",
                                    textAlign:"center",
                                    color:"#fff",
                                    fontSize:11,
                                    fontWeight:700,
                                    letterSpacing:.5,
                                    borderInlineEnd:"2px solid rgba(255,255,255,.15)",
                                    position:"sticky",
                                    ...(isAr ? { right:0 } : { left:0 }),
                                    zIndex:2,
                                  }}>
                                    {isAr ? "الساعة" : "Time"}
                                  </th>
                                  {tableDocList.map((d, i) => {
                                    const dc = DOC_COLORS[i % DOC_COLORS.length];
                                    return (
                                      <th key={i} style={{
                                        background:`linear-gradient(135deg,${dc}18,${dc}08)`,
                                        borderBottom:`3px solid ${dc}`,
                                        borderInlineEnd: i < tableDocList.length-1 ? `1.5px solid ${dc}18` : "none",
                                        padding:"12px 10px",
                                        textAlign:"center",
                                        minWidth:colW,
                                      }}>
                                        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                                          <div style={{
                                            width:38,height:38,borderRadius:10,
                                            background:dc,color:"#fff",
                                            display:"flex",alignItems:"center",justifyContent:"center",
                                            fontSize:14,fontWeight:800,
                                            boxShadow:`0 3px 10px ${dc}50`,
                                          }}>
                                            {d.doc ? getInitials(d.doc.name) : "?"}
                                          </div>
                                          <div style={{ fontSize:12,fontWeight:800,color:dc,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:colW-16 }}>
                                            {d.doc ? d.doc.name : (isAr ? "غير محدد" : "Unassigned")}
                                          </div>
                                          {d.doc?.specialty && (
                                            <div style={{ fontSize:10,color:"#aaa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:colW-16 }}>
                                              {d.doc.specialty}
                                            </div>
                                          )}
                                          <div style={{
                                            background:`${dc}15`,border:`1px solid ${dc}30`,
                                            borderRadius:20,padding:"2px 8px",
                                            fontSize:10,fontWeight:700,color:dc,
                                          }}>
                                            {dayAppointments.filter(a=>(a as any).doctor_id===d.id).length} {tr.appointments}
                                          </div>
                                        </div>
                                      </th>
                                    );
                                  })}
                                </tr>
                              </thead>

                              {/* ── صفوف الأوقات ── */}
                              <tbody>
                                {uniqueTimes.map((time, ri) => {
                                  const isEven = ri % 2 === 0;
                                  const rowHasMultiple = Object.keys(apptMap[time] ?? {}).length > 1;
                                  return (
                                    <tr key={time} style={{ background: rowHasMultiple ? "rgba(8,99,186,.03)" : (isEven ? "#fff" : "#fafbfc") }}>
                                      {/* خلية الوقت */}
                                      <td style={{
                                        padding:"10px 8px",
                                        textAlign:"center",
                                        background:"linear-gradient(135deg,#f0f6ff,#e8f0fb)",
                                        borderInlineEnd:"2px solid #e0eaf6",
                                        borderBottom:"1px solid #eef0f3",
                                        position:"sticky",
                                        ...(isAr ? { right:0 } : { left:0 }),
                                        zIndex:1,
                                        verticalAlign:"middle",
                                      }}>
                                        <div style={{ fontSize:15,fontWeight:900,color:"#0863ba",lineHeight:1 }}>{time}</div>
                                        {rowHasMultiple && (
                                          <div style={{ fontSize:9,color:"#0863ba",opacity:.6,marginTop:2,fontWeight:600 }}>
                                            {isAr ? "تعارض" : "overlap"}
                                          </div>
                                        )}
                                      </td>

                                      {/* خلايا الأطباء */}
                                      {tableDocList.map((d, ci) => {
                                        const dc = DOC_COLORS[ci % DOC_COLORS.length];
                                        const appt = apptMap[time]?.[String(d.id ?? "null")];
                                        return (
                                          <td key={ci} style={{
                                            padding:"7px 8px",
                                            borderInlineEnd: ci < tableDocList.length-1 ? `1.5px solid ${dc}15` : "none",
                                            borderBottom:"1px solid #eef0f3",
                                            verticalAlign:"middle",
                                          }}>
                                            {appt ? (() => {
                                              const pName = getPatientName(appt.patient_id);
                                              const bColor = tr.statusColors[appt.status as Status];
                                              return (
                                                <div style={{
                                                  background:`linear-gradient(135deg,${bColor}10,${bColor}05)`,
                                                  border:`1.5px solid ${bColor}35`,
                                                  borderRadius:10,
                                                  padding:"8px 10px",
                                                  display:"flex",
                                                  flexDirection:"column",
                                                  gap:5,
                                                  boxShadow:`0 2px 8px ${bColor}15`,
                                                  transition:"box-shadow .2s,transform .15s",
                                                  cursor:"pointer",
                                                }}
                                                  onMouseEnter={e=>{
                                                    (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 16px ${bColor}30`;
                                                    (e.currentTarget as HTMLElement).style.transform="translateY(-1px)";
                                                  }}
                                                  onMouseLeave={e=>{
                                                    (e.currentTarget as HTMLElement).style.boxShadow=`0 2px 8px ${bColor}15`;
                                                    (e.currentTarget as HTMLElement).style.transform="translateY(0)";
                                                  }}
                                                >
                                                  {/* اسم المريض + أفاتار */}
                                                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                                    <div style={{ width:26,height:26,borderRadius:7,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0 }}>
                                                      {pName!=="—"?getInitials(pName):"?"}
                                                    </div>
                                                    <div style={{ fontSize:11,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>
                                                      {pName}
                                                    </div>
                                                  </div>
                                                  {/* نوع + حالة + مدة */}
                                                  <div style={{ display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" }}>
                                                    <span style={{ fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,background:bColor,color:"#fff" }}>
                                                      {tr.statuses[appt.status as Status]}
                                                    </span>
                                                    <span style={{ fontSize:9,color:"#aaa" }}>{appt.duration}{tr.duration.min}</span>
                                                    {appt.type && <span style={{ fontSize:9,color:"#999",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:70 }}>{appt.type}</span>}
                                                  </div>
                                                  {/* أزرار الإجراءات */}
                                                  <div style={{ display:"flex",gap:4,marginTop:2 }}>
                                                    {canAccess("payments", plan) && (
                                                      <button
                                                        title="WhatsApp"
                                                        onClick={e=>{ e.stopPropagation(); sendWhatsApp(appt); }}
                                                        style={{ flex:1,height:24,borderRadius:6,background:"rgba(37,211,102,.12)",border:"1px solid rgba(37,211,102,.3)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s",fontSize:11 }}
                                                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(37,211,102,.25)")}
                                                        onMouseLeave={e=>(e.currentTarget.style.background="rgba(37,211,102,.12)")}
                                                      >
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#25D366">
                                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                        </svg>
                                                      </button>
                                                    )}
                                                    <button
                                                      title={lang==="ar"?"تعديل الموعد":"Edit Appointment"}
                                                      onClick={()=>setEditAppt(appt)}
                                                      style={{ flex:1,height:24,borderRadius:6,background:"rgba(8,99,186,.09)",border:"1px solid rgba(8,99,186,.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,transition:"background .15s" }}
                                                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(8,99,186,.2)")}
                                                      onMouseLeave={e=>(e.currentTarget.style.background="rgba(8,99,186,.09)")}
                                                    >
                                                      ✏️
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })() : (
                                              <div
                                                role="button"
                                                title={isAr ? `إضافة موعد — ${time}` : `Add appointment — ${time}`}
                                                onClick={() => {
                                                  setQuickSlot({ doctorId: d.id ?? null, time, date: selectedKey });
                                                  setAddModal(true);
                                                }}
                                                style={{
                                                  height: 36,
                                                  borderRadius: 8,
                                                  background: `${dc}06`,
                                                  border: `1.5px dashed ${dc}25`,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  cursor: "pointer",
                                                  transition: "background .15s, border-color .15s",
                                                  color: `${dc}60`,
                                                  fontSize: 20,
                                                  fontWeight: 300,
                                                  lineHeight: 1,
                                                  userSelect: "none",
                                                }}
                                                onMouseEnter={e => {
                                                  (e.currentTarget as HTMLElement).style.background = `${dc}14`;
                                                  (e.currentTarget as HTMLElement).style.borderColor = `${dc}55`;
                                                  (e.currentTarget as HTMLElement).style.color = dc;
                                                }}
                                                onMouseLeave={e => {
                                                  (e.currentTarget as HTMLElement).style.background = `${dc}06`;
                                                  (e.currentTarget as HTMLElement).style.borderColor = `${dc}25`;
                                                  (e.currentTarget as HTMLElement).style.color = `${dc}60`;
                                                }}
                                              >
                                                +
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()
                    ) : (
                      /* ══ عرض عادي — للخطط الفردية ══ */
                      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                        {[...dayAppointments].sort((a,b)=>a.time.localeCompare(b.time)).map(appt => {
                          const name   = getPatientName(appt.patient_id);
                          const ss     = statusStyle(appt.status);
                          const bColor = tr.statusColors[appt.status as Status];
                          return (
                            <div key={appt.id}
                              style={{
                                background:ss.bg,
                                border:`1.5px solid ${bColor}30`,
                                borderInlineStartWidth:4,
                                borderInlineStartColor:bColor,
                                borderInlineEndWidth:isAr?4:1.5,
                                borderInlineEndColor:isAr?bColor:`${bColor}30`,
                                borderRadius:14,
                                padding:"14px 16px",
                                display:"flex",
                                alignItems:"center",
                                gap:12,
                                boxShadow:"0 2px 8px rgba(0,0,0,.04)",
                                transition:"box-shadow .2s",
                              }}>
                              {/* التوقيت */}
                              <div style={{ flexShrink:0,textAlign:"center",minWidth:48,background:"rgba(255,255,255,.7)",borderRadius:10,padding:"6px 8px",border:`1px solid ${bColor}20` }}>
                                <div style={{ fontSize:15,fontWeight:800,color:bColor,lineHeight:1 }}>{appt.time.slice(0,5)}</div>
                                <div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{appt.duration} {tr.duration.min}</div>
                              </div>
                              {/* أفاتار */}
                              <div style={{ width:38,height:38,borderRadius:10,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>
                                {name!=="—"?getInitials(name):"?"}
                              </div>
                              {/* تفاصيل */}
                              <div style={{ flex:1,minWidth:0 }}>
                                <div style={{ fontSize:14,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
                                <div style={{ fontSize:11,color:"#999",marginTop:2 }}>
                                  {appt.type && <span>{appt.type} · </span>}
                                  <span style={{ fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:"#fff",color:bColor,border:`1px solid ${bColor}30` }}>
                                    {tr.statuses[appt.status as Status]}
                                  </span>
                                </div>
                              </div>
                              {/* أزرار */}
                              <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
                                {canAccess("payments", plan) && (
                                <button
                                  title="WhatsApp"
                                  onClick={e=>{ e.stopPropagation(); sendWhatsApp(appt); }}
                                  style={{ width:34,height:34,borderRadius:9,background:"rgba(37,211,102,.1)",border:"1.5px solid rgba(37,211,102,.25)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s" }}
                                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(37,211,102,.22)")}
                                  onMouseLeave={e=>(e.currentTarget.style.background="rgba(37,211,102,.1)")}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                </button>
                                )}
                                <button
                                  title={lang==="ar"?"تعديل الموعد":"Edit Appointment"}
                                  onClick={()=>setEditAppt(appt)}
                                  style={{ width:34,height:34,borderRadius:9,background:"rgba(8,99,186,.08)",border:"1.5px solid rgba(8,99,186,.18)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,transition:"background .15s" }}
                                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(8,99,186,.18)")}
                                  onMouseLeave={e=>(e.currentTarget.style.background="rgba(8,99,186,.08)")}
                                >
                                  ✏️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modals */}
        {(addModal||editAppt)&&(
          <AppointmentModal lang={lang} appt={editAppt} defaultDate={quickSlot?.date ?? selectedKey} patients={patients}
            appointments={appointments}
            doctors={doctors} doctorSchedules={doctorSchedules} plan={plan}
            onSave={handleSave} onClose={()=>{ setAddModal(false); setEditAppt(null); setQuickSlot(null); }} quickSlot={quickSlot}
            onStatusChange={handleStatusChange} onDelete={handleDelete} saving={saving}/>
        )}
        {shareModal&&(
          <ShareModal lang={lang} clinicId={clinicId} copied={copied} setCopied={setCopied} onClose={()=>setShareModal(false)}/>
        )}
        {notification&&(
          <NotificationToast lang={lang} appt={notification} patientName={getPatientName(notification.patient_id)} onDismiss={()=>setNotification(null)}/>
        )}
      </div>
    </>
  );
}

