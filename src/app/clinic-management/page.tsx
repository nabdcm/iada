"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────
type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

type Doctor = {
  id: number;
  name: string;
  specialty?: string;
  color?: string;
  user_id: string;
};

type WorkDay = {
  enabled: boolean;
  start: string;   // "09:00"
  end: string;     // "17:00"
  break_start?: string;
  break_end?: string;
};

type DoctorSchedule = {
  id?: number;
  doctor_id: number;
  user_id: string;
  // أيام الأسبوع 0=أحد ... 6=سبت
  days: Record<number, WorkDay>;
  // إجازات مخصصة: مصفوفة تواريخ YYYY-MM-DD
  vacations: string[];
  appointment_duration: number; // بالدقائق
  max_daily_appointments: number;
  notes: string;
};

// ─── الألوان الافتراضية للأطباء ───────────────────────────────
const DOCTOR_COLORS = ["#0863ba","#2e7d32","#7b2d8b","#c0392b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getDoctorColor = (idx: number) => DOCTOR_COLORS[idx % DOCTOR_COLORS.length];

// ─── التحقق من الخطة المشتركة ──────────────────────────────────
const isSharedPlan = (plan: PlanType) => plan.startsWith("shared_");

// ─── النصوص ───────────────────────────────────────────────────
const T = {
  ar: {
    appName: "نبض", appSub: "إدارة العيادة",
    nav: {
      dashboard: "لوحة المعلومات", patients: "المرضى",
      appointments: "المواعيد", payments: "المدفوعات",
      prescriptions: "الوصفات الطبية", tracking: "متابعة المرضى",
      clinicManagement: "إدارة العيادة",
    },
    page: {
      title: "إدارة العيادة",
      sub: "ضبط دوام الأطباء وإعدادات العيادة المشتركة",
      sharedOnly: "هذه الصفحة متاحة فقط للاشتراكات المشتركة",
      sharedOnlySub: "قم بترقية اشتراكك إلى خطة مشتركة للوصول لهذه الميزات",
    },
    tabs: {
      schedules: "دوام الأطباء",
      vacations: "الإجازات والعطل",
      settings: "إعدادات العيادة",
    },
    weekDays: ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],
    weekDaysShort: ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"],
    schedule: {
      title: "جدول الدوام",
      selectDoctor: "اختر طبيباً",
      noDoctors: "لا يوجد أطباء مسجلون",
      workingDays: "أيام العمل",
      workHours: "ساعات الدوام",
      from: "من",
      to: "إلى",
      breakTime: "استراحة",
      breakFrom: "من",
      breakTo: "إلى",
      noBreak: "بدون استراحة",
      duration: "مدة الموعد الافتراضية",
      minutes: "دقيقة",
      maxDaily: "الحد الأقصى للمواعيد اليومية",
      appointment: "موعد",
      notes: "ملاحظات للطبيب",
      notesPlaceholder: "تعليمات خاصة، ملاحظات...",
      save: "حفظ الجدول",
      saving: "جاري الحفظ...",
      saved: "تم الحفظ ✓",
      enabled: "يعمل",
      disabled: "إجازة",
    },
    vacation: {
      title: "إدارة الإجازات",
      selectDoctor: "اختر طبيباً لإدارة إجازاته",
      addVacation: "إضافة إجازة / يوم عطلة",
      date: "التاريخ",
      reason: "السبب (اختياري)",
      reasonPlaceholder: "إجازة سنوية، مؤتمر طبي...",
      add: "إضافة",
      noVacations: "لا توجد إجازات مسجلة لهذا الطبيب",
      upcoming: "الإجازات القادمة",
      past: "الإجازات السابقة",
      delete: "حذف",
      today: "اليوم",
      tomorrow: "غداً",
    },
    settings: {
      title: "إعدادات العيادة",
      clinicName: "اسم العيادة",
      clinicNamePh: "عيادة د. محمد الأحمدي",
      workingHours: "ساعات العمل الافتراضية للعيادة",
      defaultFrom: "من",
      defaultTo: "إلى",
      weekendDays: "أيام العطلة الأسبوعية",
      allowOnlineBooking: "السماح بالحجز الإلكتروني",
      requireApproval: "يتطلب موافقة الطبيب",
      save: "حفظ الإعدادات",
      saving: "جاري الحفظ...",
      saved: "تم الحفظ ✓",
    },
    stats: {
      totalDoctors: "عدد الأطباء",
      workingToday: "يعملون اليوم",
      onVacation: "في إجازة",
      avgDuration: "متوسط مدة الموعد",
    },
    loading: "جاري التحميل...",
    signOut: "تسجيل الخروج",
    planBadge: {
      shared_basic: "المشتركة - الأساسية",
      shared_pro: "المشتركة - الاحترافية",
      shared_enterprise: "المشتركة - الشاملة",
    } as Record<string, string>,
  },
  en: {
    appName: "NABD", appSub: "Clinic Manager",
    nav: {
      dashboard: "Dashboard", patients: "Patients",
      appointments: "Appointments", payments: "Payments",
      prescriptions: "Prescriptions", tracking: "Patient Tracking",
      clinicManagement: "Clinic Management",
    },
    page: {
      title: "Clinic Management",
      sub: "Configure doctor schedules and shared clinic settings",
      sharedOnly: "This page is only available for shared subscriptions",
      sharedOnlySub: "Upgrade your plan to a shared subscription to access these features",
    },
    tabs: {
      schedules: "Doctor Schedules",
      vacations: "Vacations & Holidays",
      settings: "Clinic Settings",
    },
    weekDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    weekDaysShort: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
    schedule: {
      title: "Work Schedule",
      selectDoctor: "Select a doctor",
      noDoctors: "No doctors registered",
      workingDays: "Working Days",
      workHours: "Work Hours",
      from: "From",
      to: "To",
      breakTime: "Break",
      breakFrom: "From",
      breakTo: "To",
      noBreak: "No break",
      duration: "Default appointment duration",
      minutes: "min",
      maxDaily: "Max daily appointments",
      appointment: "appt",
      notes: "Notes for doctor",
      notesPlaceholder: "Special instructions, notes...",
      save: "Save Schedule",
      saving: "Saving...",
      saved: "Saved ✓",
      enabled: "Working",
      disabled: "Off",
    },
    vacation: {
      title: "Vacation Management",
      selectDoctor: "Select a doctor to manage their vacations",
      addVacation: "Add Vacation / Holiday",
      date: "Date",
      reason: "Reason (optional)",
      reasonPlaceholder: "Annual leave, medical conference...",
      add: "Add",
      noVacations: "No vacations registered for this doctor",
      upcoming: "Upcoming Vacations",
      past: "Past Vacations",
      delete: "Delete",
      today: "Today",
      tomorrow: "Tomorrow",
    },
    settings: {
      title: "Clinic Settings",
      clinicName: "Clinic Name",
      clinicNamePh: "Dr. Ahmed's Clinic",
      workingHours: "Default clinic working hours",
      defaultFrom: "From",
      defaultTo: "To",
      weekendDays: "Weekend Days",
      allowOnlineBooking: "Allow online booking",
      requireApproval: "Requires doctor approval",
      save: "Save Settings",
      saving: "Saving...",
      saved: "Saved ✓",
    },
    stats: {
      totalDoctors: "Total Doctors",
      workingToday: "Working Today",
      onVacation: "On Vacation",
      avgDuration: "Avg Appt Duration",
    },
    loading: "Loading...",
    signOut: "Sign Out",
    planBadge: {
      shared_basic: "Shared - Basic",
      shared_pro: "Shared - Professional",
      shared_enterprise: "Shared - Comprehensive",
    } as Record<string, string>,
  },
} as const;

// ─── الجدول الافتراضي الفارغ ─────────────────────────────────
const defaultWorkDay = (enabled: boolean): WorkDay => ({
  enabled,
  start: "09:00",
  end: "17:00",
  break_start: "13:00",
  break_end: "14:00",
});

const defaultSchedule = (doctor_id: number, user_id: string): DoctorSchedule => ({
  doctor_id,
  user_id,
  days: {
    0: defaultWorkDay(false), // أحد
    1: defaultWorkDay(true),  // إثنين
    2: defaultWorkDay(true),  // ثلاثاء
    3: defaultWorkDay(true),  // أربعاء
    4: defaultWorkDay(true),  // خميس
    5: defaultWorkDay(false), // جمعة
    6: defaultWorkDay(false), // سبت
  },
  vacations: [],
  appointment_duration: 30,
  max_daily_appointments: 20,
  notes: "",
});

// ─── Sidebar الشريط الجانبي (مطابق لصفحة المواعيد) ───────────
const SB_BG        = "#0558a8";
const SB_BG_HEADER = "#044d96";
const SB_BG_FOOTER = "#044d96";
const SB_ACTIVE_BG = "rgba(255,255,255,0.15)";
const SB_IDLE_TEXT = "rgba(255,255,255,0.62)";
const SB_BORDER    = "rgba(255,255,255,0.1)";

const PLAN_BADGE_COLOR: Record<string, string> = {
  basic: "#0863ba", pro: "#7b2d8b", enterprise: "#e67e22",
  shared_basic: "#0891b2", shared_pro: "#6d28d9", shared_enterprise: "#b45309",
};

function Sidebar({ lang, setLang, plan }: { lang: Lang; setLang: (l: Lang) => void; plan: PlanType }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [col, setCol] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile && mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  const navItems = [
    { key: "dashboard",        href: "/dashboard",           icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { key: "patients",         href: "/patients",            icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { key: "appointments",     href: "/appointments",        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { key: "clinicManagement", href: "/clinic-management",   icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, locked: !isSharedPlan(plan) },
    { key: "payments",         href: "/payments",            icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  ];

  const sidebarTransform = isMobile
    ? (mobileOpen ? "translateX(0)" : (isAr ? "translateX(100%)" : "translateX(-100%)"))
    : "translateX(0)";

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{ position:"fixed",top:14,left:isAr?undefined:14,right:isAr?14:undefined,zIndex:300,width:40,height:40,borderRadius:10,background:SB_BG,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(5,88,168,.3)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      )}
      {isMobile && mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:"fixed",inset:0,zIndex:250,background:"rgba(0,0,0,.4)" }}/>}
      <aside style={{
        position: isMobile ? "fixed" : "sticky",
        top: 0, [isAr?"right":"left"]: 0,
        zIndex: isMobile ? 260 : 10,
        width: col ? 58 : 220,
        height: "100vh",
        background: SB_BG,
        display: "flex", flexDirection: "column",
        transition: "width .25s, transform .3s",
        transform: sidebarTransform,
        flexShrink: 0,
        fontFamily: "Rubik, sans-serif",
        direction: isAr ? "rtl" : "ltr",
      }}>
        {/* Header */}
        <div style={{ padding: col ? "18px 10px" : "18px 16px", background: SB_BG_HEADER, borderBottom: `1px solid ${SB_BORDER}`, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>💙</div>
          {!col && (
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:"#fff",lineHeight:1 }}>{tr.appName}</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,.55)",marginTop:2 }}>{tr.appSub}</div>
            </div>
          )}
          {!isMobile && (
            <button onClick={() => setCol(c => !c)} style={{ marginInlineStart:"auto",width:24,height:24,borderRadius:6,background:"rgba(255,255,255,.1)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2.5"><polyline points={col?"9 18 15 12 9 6":"15 18 9 12 15 6"}/></svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
          {navItems.map(item => {
            const active = item.key === "clinicManagement";
            const locked = (item as any).locked;
            return (
              <a key={item.key} href={locked ? undefined : item.href}
                style={{ display:"flex",alignItems:"center",gap:10,padding:col?"12px 0":"10px 14px",margin:"1px 8px",borderRadius:10,cursor:locked?"not-allowed":"pointer",textDecoration:"none",background:active?SB_ACTIVE_BG:"transparent",color:active?"#fff":locked?"rgba(255,255,255,.3)":SB_IDLE_TEXT,transition:"background .15s,color .15s",justifyContent:col?"center":"flex-start" }}
                onMouseEnter={e => { if(!active&&!locked) (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.08)"; }}
                onMouseLeave={e => { if(!active&&!locked) (e.currentTarget as HTMLElement).style.background="transparent"; }}
              >
                {item.icon}
                {!col && <span style={{ fontSize:13,fontWeight:active?700:500 }}>{(tr.nav as any)[item.key]}</span>}
                {!col && active && <div style={{ marginInlineStart:"auto",width:4,height:4,borderRadius:"50%",background:"#7dd3fc" }}/>}
                {locked && !col && <span style={{ fontSize:11,opacity:.7 }}>🔒</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:col?"14px 10px":"14px 12px",background:SB_BG_FOOTER,borderTop:`1px solid ${SB_BORDER}` }}>
          {!col && (
            <>
              <div style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",marginBottom:8,background:"rgba(255,255,255,.08)",border:`1.5px solid ${(PLAN_BADGE_COLOR[plan]??"")}50`,borderRadius:8 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:PLAN_BADGE_COLOR[plan]??SB_BG,flexShrink:0 }}/>
                <span style={{ fontSize:11,color:"rgba(255,255,255,.7)",flex:1 }}>{isAr?"خطة":"Plan"}</span>
                <span style={{ fontSize:11,fontWeight:700,color:PLAN_BADGE_COLOR[plan]??SB_BG }}>{(tr.planBadge as any)[plan] ?? plan}</span>
              </div>
              <button onClick={() => setLang(lang==="ar"?"en":"ar")}
                style={{ width:"100%",padding:"8px",marginBottom:10,background:"rgba(255,255,255,.06)",border:`1px solid ${SB_BORDER}`,borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"rgba(255,255,255,.8)",fontWeight:600 }}>
                🌐 {lang==="ar"?"English":"العربية"}
              </button>
            </>
          )}
          <button onClick={() => { supabase.auth.signOut(); window.location.href="/login"; }}
            style={{ width:"100%",padding:col?"10px 0":"10px 14px",background:"rgba(192,57,43,.15)",border:"1.5px solid rgba(192,57,43,.3)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#ffb3a7",fontWeight:600,display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!col && <span>{tr.signOut}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── تبويب جدول الدوام ────────────────────────────────────────
function ScheduleTab({ lang, doctors, userId }: { lang: Lang; doctors: Doctor[]; userId: string }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const s = tr.schedule;

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctors[0]?.id ?? null);
  const [schedules, setSchedules] = useState<Record<number, DoctorSchedule>>({});
  const [saveStatus, setSaveStatus] = useState<Record<number, "idle"|"saving"|"saved">>({});

  // جلب الجداول من Supabase
  useEffect(() => {
    if (!doctors.length) return;
    const fetchSchedules = async () => {
      const { data } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("user_id", userId);
      if (data) {
        const map: Record<number, DoctorSchedule> = {};
        for (const row of data) {
          map[row.doctor_id] = {
            id: row.id,
            doctor_id: row.doctor_id,
            user_id: row.user_id,
            days: typeof row.days === "string" ? JSON.parse(row.days) : row.days,
            vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
            appointment_duration: row.appointment_duration ?? 30,
            max_daily_appointments: row.max_daily_appointments ?? 20,
            notes: row.notes ?? "",
          };
        }
        setSchedules(map);
      }
    };
    fetchSchedules();
  }, [doctors, userId]);

  const getSchedule = (id: number): DoctorSchedule =>
    schedules[id] ?? defaultSchedule(id, userId);

  const updateSchedule = (id: number, updater: (s: DoctorSchedule) => DoctorSchedule) => {
    setSchedules(prev => ({ ...prev, [id]: updater(getSchedule(id)) }));
  };

  const updateDay = (doctorId: number, dayIdx: number, patch: Partial<WorkDay>) => {
    updateSchedule(doctorId, sch => ({
      ...sch,
      days: { ...sch.days, [dayIdx]: { ...sch.days[dayIdx], ...patch } },
    }));
  };

  const saveSchedule = async (doctorId: number) => {
    setSaveStatus(p => ({ ...p, [doctorId]: "saving" }));
    const sch = getSchedule(doctorId);
    const payload = {
      doctor_id: doctorId,
      user_id: userId,
      days: sch.days,
      vacations: sch.vacations,
      appointment_duration: sch.appointment_duration,
      max_daily_appointments: sch.max_daily_appointments,
      notes: sch.notes,
    };
    if (sch.id) {
      await supabase.from("doctor_schedules").update(payload).eq("id", sch.id);
    } else {
      const { data } = await supabase.from("doctor_schedules").insert(payload).select().single();
      if (data) {
        setSchedules(prev => ({ ...prev, [doctorId]: { ...sch, id: data.id } }));
      }
    }
    setSaveStatus(p => ({ ...p, [doctorId]: "saved" }));
    setTimeout(() => setSaveStatus(p => ({ ...p, [doctorId]: "idle" })), 2500);
  };

  if (!doctors.length) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"#aaa" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>👨‍⚕️</div>
      <div style={{ fontSize:15, fontWeight:600 }}>{s.noDoctors}</div>
    </div>
  );

  const doc = doctors.find(d => d.id === selectedDoctorId);
  const sch = selectedDoctorId ? getSchedule(selectedDoctorId) : null;

  const inputSt: React.CSSProperties = {
    padding:"8px 12px", border:"1.5px solid #e8eaed", borderRadius:8,
    fontFamily:"Rubik,sans-serif", fontSize:13, color:"#353535",
    background:"#fafbfc", outline:"none", direction:isAr?"rtl":"ltr",
  };

  const timeInputSt: React.CSSProperties = {
    ...inputSt, width:90,
  };

  return (
    <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
      {/* قائمة الأطباء */}
      <div style={{ width:200, flexShrink:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#888", marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>
          {s.selectDoctor}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {doctors.map((d, idx) => {
            const color = d.color ?? getDoctorColor(idx);
            const isSelected = d.id === selectedDoctorId;
            const dSch = getSchedule(d.id);
            const activeCount = Object.values(dSch.days).filter(day => day.enabled).length;
            return (
              <button key={d.id}
                onClick={() => setSelectedDoctorId(d.id)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"10px 12px", borderRadius:12,
                  background: isSelected ? `${color}12` : "#f9fafb",
                  border: `1.5px solid ${isSelected ? color : "#eee"}`,
                  cursor:"pointer", textAlign:isAr?"right":"left",
                  transition:"all .15s",
                  direction: isAr ? "rtl" : "ltr",
                }}
              >
                <div style={{ width:36,height:36,borderRadius:10,background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0 }}>
                  {d.name.split(" ").slice(0,2).map((w:string)=>w[0]).join("").toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:isSelected?color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{d.name}</div>
                  {d.specialty && <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{d.specialty}</div>}
                  <div style={{ fontSize:10,color:isSelected?color:"#bbb",marginTop:2,fontWeight:600 }}>
                    {activeCount} {isAr?"أيام عمل":"work days"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* لوحة تعديل الجدول */}
      {doc && sch && (
        <div style={{ flex:1, minWidth:280 }}>
          {/* رأس اللوحة */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:42,height:42,borderRadius:12,background:(doc.color??getDoctorColor(doctors.indexOf(doc))),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700 }}>
                {doc.name.split(" ").slice(0,2).map((w:string)=>w[0]).join("").toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#353535" }}>{doc.name}</div>
                {doc.specialty && <div style={{ fontSize:12,color:"#888" }}>{doc.specialty}</div>}
              </div>
            </div>
            <button
              onClick={() => saveSchedule(doc.id)}
              disabled={saveStatus[doc.id]==="saving"}
              style={{ padding:"10px 22px",background:saveStatus[doc.id]==="saved"?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"background .3s",display:"flex",alignItems:"center",gap:6 }}
            >
              {saveStatus[doc.id]==="saving" ? s.saving : saveStatus[doc.id]==="saved" ? s.saved : s.save}
            </button>
          </div>

          {/* أيام الأسبوع */}
          <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #f0f2f5",padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#555",marginBottom:14,display:"flex",alignItems:"center",gap:6 }}>
              <span>🗓</span> {s.workingDays}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {[0,1,2,3,4,5,6].map(dayIdx => {
                const day = sch.days[dayIdx];
                const enabled = day?.enabled ?? false;
                const color = doc.color ?? getDoctorColor(doctors.indexOf(doc));
                return (
                  <div key={dayIdx} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:12,background:enabled?`${color}07`:"#fafafa",border:`1.5px solid ${enabled?color+"25":"#f0f2f5"}`,transition:"all .2s",flexWrap:"wrap" }}>
                    {/* Toggle */}
                    <button
                      onClick={() => updateDay(doc.id, dayIdx, { enabled: !enabled })}
                      style={{ width:44,height:24,borderRadius:12,background:enabled?color:"#ddd",border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background .2s" }}
                    >
                      <div style={{ position:"absolute",top:3,left:enabled?22:3,right:"auto",width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
                    </button>
                    {/* اسم اليوم */}
                    <div style={{ width:70,fontSize:13,fontWeight:700,color:enabled?color:"#bbb",flexShrink:0 }}>
                      {tr.weekDays[dayIdx]}
                    </div>
                    {/* ساعات العمل */}
                    {enabled && (
                      <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                        <span style={{ fontSize:12,color:"#888" }}>{s.from}</span>
                        <input type="time" value={day.start} onChange={e => updateDay(doc.id,dayIdx,{start:e.target.value})} style={timeInputSt}/>
                        <span style={{ fontSize:12,color:"#888" }}>{s.to}</span>
                        <input type="time" value={day.end} onChange={e => updateDay(doc.id,dayIdx,{end:e.target.value})} style={timeInputSt}/>
                        {/* استراحة */}
                        {day.break_start ? (
                          <>
                            <span style={{ fontSize:12,color:"#aaa",marginInlineStart:8 }}>☕ {s.breakTime}</span>
                            <input type="time" value={day.break_start} onChange={e => updateDay(doc.id,dayIdx,{break_start:e.target.value})} style={timeInputSt}/>
                            <span style={{ fontSize:12,color:"#aaa" }}>-</span>
                            <input type="time" value={day.break_end??""} onChange={e => updateDay(doc.id,dayIdx,{break_end:e.target.value})} style={timeInputSt}/>
                            <button onClick={() => updateDay(doc.id,dayIdx,{break_start:undefined,break_end:undefined})} style={{ fontSize:11,color:"#c0392b",background:"none",border:"none",cursor:"pointer",padding:0 }}>✕</button>
                          </>
                        ) : (
                          <button onClick={() => updateDay(doc.id,dayIdx,{break_start:"13:00",break_end:"14:00"})}
                            style={{ fontSize:11,color:"#0863ba",background:"rgba(8,99,186,.07)",border:"1px solid rgba(8,99,186,.15)",borderRadius:6,padding:"4px 8px",cursor:"pointer" }}>
                            + {s.breakTime}
                          </button>
                        )}
                      </div>
                    )}
                    {!enabled && (
                      <span style={{ fontSize:12,color:"#ccc",fontStyle:"italic" }}>{s.disabled}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* إعدادات إضافية */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
            {/* مدة الموعد */}
            <div style={{ background:"#fff",borderRadius:14,border:"1.5px solid #f0f2f5",padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.03)" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>⏱ {s.duration}</div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="number" min={5} max={120} step={5}
                  value={sch.appointment_duration}
                  onChange={e => updateSchedule(doc.id, s2 => ({...s2, appointment_duration: Number(e.target.value)}))}
                  style={{ ...inputSt, width:70, textAlign:"center" }}
                />
                <span style={{ fontSize:13,color:"#555" }}>{s.minutes}</span>
              </div>
            </div>
            {/* الحد الأقصى */}
            <div style={{ background:"#fff",borderRadius:14,border:"1.5px solid #f0f2f5",padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.03)" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>📋 {s.maxDaily}</div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <input type="number" min={1} max={100}
                  value={sch.max_daily_appointments}
                  onChange={e => updateSchedule(doc.id, s2 => ({...s2, max_daily_appointments: Number(e.target.value)}))}
                  style={{ ...inputSt, width:70, textAlign:"center" }}
                />
                <span style={{ fontSize:13,color:"#555" }}>{s.appointment}</span>
              </div>
            </div>
          </div>

          {/* ملاحظات */}
          <div style={{ background:"#fff",borderRadius:14,border:"1.5px solid #f0f2f5",padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>📝 {s.notes}</div>
            <textarea
              value={sch.notes}
              onChange={e => updateSchedule(doc.id, s2 => ({...s2, notes:e.target.value}))}
              placeholder={s.notesPlaceholder}
              rows={3}
              style={{ ...inputSt, width:"100%", resize:"vertical", boxSizing:"border-box" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── تبويب الإجازات ───────────────────────────────────────────
function VacationsTab({ lang, doctors, userId }: { lang: Lang; doctors: Doctor[]; userId: string }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const v = tr.vacation;

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctors[0]?.id ?? null);
  const [schedules, setSchedules] = useState<Record<number, DoctorSchedule>>({});
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctors.length) return;
    const fetchSchedules = async () => {
      const { data } = await supabase.from("doctor_schedules").select("*").eq("user_id", userId);
      if (data) {
        const map: Record<number, DoctorSchedule> = {};
        for (const row of data) {
          map[row.doctor_id] = {
            id: row.id, doctor_id: row.doctor_id, user_id: row.user_id,
            days: typeof row.days === "string" ? JSON.parse(row.days) : row.days,
            vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
            appointment_duration: row.appointment_duration ?? 30,
            max_daily_appointments: row.max_daily_appointments ?? 20,
            notes: row.notes ?? "",
          };
        }
        setSchedules(map);
      }
    };
    fetchSchedules();
  }, [doctors, userId]);

  const getSchedule = (id: number): DoctorSchedule =>
    schedules[id] ?? defaultSchedule(id, userId);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const addVacation = async () => {
    if (!selectedDoctorId || !newDate) return;
    setSaving(true);
    const sch = getSchedule(selectedDoctorId);
    const updated = { ...sch, vacations: [...sch.vacations, newDate].sort() };
    const payload = {
      doctor_id: selectedDoctorId, user_id: userId,
      days: updated.days, vacations: updated.vacations,
      appointment_duration: updated.appointment_duration,
      max_daily_appointments: updated.max_daily_appointments,
      notes: updated.notes,
    };
    if (sch.id) {
      await supabase.from("doctor_schedules").update(payload).eq("id", sch.id);
      setSchedules(prev => ({ ...prev, [selectedDoctorId]: { ...updated } }));
    } else {
      const { data } = await supabase.from("doctor_schedules").insert(payload).select().single();
      if (data) setSchedules(prev => ({ ...prev, [selectedDoctorId]: { ...updated, id: data.id } }));
    }
    setNewDate(""); setNewReason(""); setSaving(false);
  };

  const removeVacation = async (dateStr: string) => {
    if (!selectedDoctorId) return;
    const sch = getSchedule(selectedDoctorId);
    const updated = { ...sch, vacations: sch.vacations.filter(d => d !== dateStr) };
    setSchedules(prev => ({ ...prev, [selectedDoctorId]: updated }));
    if (sch.id) {
      await supabase.from("doctor_schedules").update({ vacations: updated.vacations }).eq("id", sch.id);
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    const months = tr.vacation; // not ideal but we use month names
    const monthNames = isAr
      ? ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
      : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${monthNames[parseInt(m)-1]} ${y}`;
  };

  const doc = doctors.find(d => d.id === selectedDoctorId);
  const sch = selectedDoctorId ? getSchedule(selectedDoctorId) : null;
  const upcomingVacations = sch?.vacations.filter(d => d >= todayStr) ?? [];
  const pastVacations = sch?.vacations.filter(d => d < todayStr) ?? [];

  const inputSt: React.CSSProperties = {
    padding:"10px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:13, color:"#353535",
    background:"#fafbfc", outline:"none", direction:isAr?"rtl":"ltr", width:"100%", boxSizing:"border-box",
  };

  return (
    <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
      {/* قائمة الأطباء */}
      <div style={{ width:200, flexShrink:0 }}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10,textTransform:"uppercase",letterSpacing:.5 }}>
          {v.selectDoctor}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {doctors.map((d, idx) => {
            const color = d.color ?? getDoctorColor(idx);
            const isSelected = d.id === selectedDoctorId;
            const dSch = getSchedule(d.id);
            const vacCount = dSch.vacations.filter(vd => vd >= todayStr).length;
            return (
              <button key={d.id}
                onClick={() => setSelectedDoctorId(d.id)}
                style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:isSelected?`${color}12`:"#f9fafb",border:`1.5px solid ${isSelected?color:"#eee"}`,cursor:"pointer",textAlign:isAr?"right":"left",direction:isAr?"rtl":"ltr",transition:"all .15s" }}
              >
                <div style={{ width:36,height:36,borderRadius:10,background:color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0 }}>
                  {d.name.split(" ").slice(0,2).map((w:string)=>w[0]).join("").toUpperCase()}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:700,color:isSelected?color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{d.name}</div>
                  {vacCount > 0 && (
                    <div style={{ fontSize:10,color:"#e67e22",fontWeight:700,marginTop:1 }}>
                      🏖 {vacCount} {isAr?"إجازة":"vacation(s)"}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* لوحة الإجازات */}
      {doc && sch && (
        <div style={{ flex:1, minWidth:280 }}>
          {/* إضافة إجازة */}
          <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #f0f2f5",padding:20,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#555",marginBottom:14,display:"flex",alignItems:"center",gap:6 }}>
              <span>➕</span> {v.addVacation}
            </div>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end" }}>
              <div style={{ flex:"0 0 160px" }}>
                <div style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:6 }}>{v.date}</div>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={todayStr} style={inputSt}/>
              </div>
              <div style={{ flex:1, minWidth:160 }}>
                <div style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:6 }}>{v.reason}</div>
                <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder={v.reasonPlaceholder} style={inputSt}/>
              </div>
              <button onClick={addVacation} disabled={saving||!newDate}
                style={{ padding:"10px 20px",background:!newDate?"#ddd":"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:!newDate?"not-allowed":"pointer",flexShrink:0 }}>
                {saving ? "..." : v.add}
              </button>
            </div>
          </div>

          {/* الإجازات القادمة */}
          <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #f0f2f5",padding:20,marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,.03)" }}>
            <div style={{ fontSize:13,fontWeight:700,color:"#555",marginBottom:12,display:"flex",alignItems:"center",gap:6 }}>
              📅 {v.upcoming} ({upcomingVacations.length})
            </div>
            {upcomingVacations.length === 0 ? (
              <div style={{ textAlign:"center",padding:"24px",color:"#ccc",fontSize:13 }}>{v.noVacations}</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {upcomingVacations.map(dateStr => (
                  <div key={dateStr} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"rgba(230,126,34,.05)",border:"1.5px solid rgba(230,126,34,.15)",borderRadius:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <span style={{ fontSize:18 }}>🏖</span>
                      <div>
                        <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{formatDate(dateStr)}</div>
                        {dateStr === todayStr && <div style={{ fontSize:11,color:"#e67e22",fontWeight:600 }}>{v.today}</div>}
                      </div>
                    </div>
                    <button onClick={() => removeVacation(dateStr)}
                      style={{ padding:"5px 12px",background:"rgba(192,57,43,.08)",border:"1px solid rgba(192,57,43,.2)",borderRadius:7,color:"#c0392b",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                      {v.delete}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* الإجازات السابقة */}
          {pastVacations.length > 0 && (
            <div style={{ background:"#fafafa",borderRadius:14,border:"1.5px solid #f0f2f5",padding:"14px 18px" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#aaa",marginBottom:10 }}>⏮ {v.past} ({pastVacations.length})</div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {pastVacations.slice(-5).reverse().map(dateStr => (
                  <div key={dateStr} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#fff",border:"1px solid #eee",borderRadius:8,opacity:.7 }}>
                    <div style={{ fontSize:13,color:"#888" }}>{formatDate(dateStr)}</div>
                    <button onClick={() => removeVacation(dateStr)}
                      style={{ fontSize:11,color:"#c0392b",background:"none",border:"none",cursor:"pointer" }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── تبويب الإعدادات ──────────────────────────────────────────
function SettingsTab({ lang, userId }: { lang: Lang; userId: string }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const s = tr.settings;

  const [clinicName, setClinicName] = useState("");
  const [defaultFrom, setDefaultFrom] = useState("08:00");
  const [defaultTo, setDefaultTo] = useState("18:00");
  const [weekendDays, setWeekendDays] = useState<number[]>([5,6]);
  const [allowOnline, setAllowOnline] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved">("idle");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("clinics").select("*").eq("user_id", userId).single();
      if (data) {
        setClinicName(data.name ?? "");
        if (data.settings) {
          const st = typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings;
          setDefaultFrom(st.default_from ?? "08:00");
          setDefaultTo(st.default_to ?? "18:00");
          setWeekendDays(st.weekend_days ?? [5,6]);
          setAllowOnline(st.allow_online_booking ?? true);
          setRequireApproval(st.require_approval ?? false);
        }
      }
    };
    load();
  }, [userId]);

  const toggleWeekend = (d: number) => {
    setWeekendDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const save = async () => {
    setSaveStatus("saving");
    const settings = {
      default_from: defaultFrom,
      default_to: defaultTo,
      weekend_days: weekendDays,
      allow_online_booking: allowOnline,
      require_approval: requireApproval,
    };
    await supabase.from("clinics").update({ name: clinicName, settings }).eq("user_id", userId);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const inputSt: React.CSSProperties = {
    padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535",
    background:"#fafbfc", outline:"none", direction:isAr?"rtl":"ltr", width:"100%", boxSizing:"border-box",
  };

  const cardSt: React.CSSProperties = {
    background:"#fff", borderRadius:16, border:"1.5px solid #f0f2f5",
    padding:"20px 22px", marginBottom:14, boxShadow:"0 2px 10px rgba(0,0,0,.04)",
  };

  return (
    <div style={{ maxWidth:600 }}>
      {/* اسم العيادة */}
      <div style={cardSt}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>🏥 {s.clinicName}</div>
        <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder={s.clinicNamePh} style={inputSt}/>
      </div>

      {/* ساعات العمل */}
      <div style={cardSt}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:12 }}>⏰ {s.workingHours}</div>
        <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>{s.defaultFrom}</div>
            <input type="time" value={defaultFrom} onChange={e=>setDefaultFrom(e.target.value)} style={{ ...inputSt, width:110 }}/>
          </div>
          <div style={{ color:"#ccc",marginTop:16 }}>→</div>
          <div>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>{s.defaultTo}</div>
            <input type="time" value={defaultTo} onChange={e=>setDefaultTo(e.target.value)} style={{ ...inputSt, width:110 }}/>
          </div>
        </div>
      </div>

      {/* أيام العطلة */}
      <div style={cardSt}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:12 }}>🏖 {s.weekendDays}</div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {tr.weekDaysShort.map((day, idx) => {
            const isW = weekendDays.includes(idx);
            return (
              <button key={idx} onClick={() => toggleWeekend(idx)}
                style={{ padding:"8px 14px",borderRadius:10,background:isW?"rgba(192,57,43,.1)":"#f5f6f8",border:`1.5px solid ${isW?"rgba(192,57,43,.3)":"#eee"}`,color:isW?"#c0392b":"#555",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .15s" }}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* الحجز الإلكتروني */}
      <div style={cardSt}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{s.allowOnlineBooking}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
              {isAr ? "السماح للمرضى بالحجز عبر رابط العيادة" : "Allow patients to book via clinic link"}
            </div>
          </div>
          <button onClick={() => setAllowOnline(v => !v)}
            style={{ width:48,height:26,borderRadius:13,background:allowOnline?"#0863ba":"#ddd",border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0 }}>
            <div style={{ position:"absolute",top:3,left:allowOnline?26:3,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
          </button>
        </div>
        {allowOnline && (
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:12,borderTop:"1px solid #f5f5f5" }}>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{s.requireApproval}</div>
              <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
                {isAr ? "كل حجز يتطلب موافقة قبل التأكيد" : "Each booking requires approval before confirmation"}
              </div>
            </div>
            <button onClick={() => setRequireApproval(v => !v)}
              style={{ width:48,height:26,borderRadius:13,background:requireApproval?"#2e7d32":"#ddd",border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0 }}>
              <div style={{ position:"absolute",top:3,left:requireApproval?26:3,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
            </button>
          </div>
        )}
      </div>

      {/* زر الحفظ */}
      <button onClick={save} disabled={saveStatus==="saving"}
        style={{ padding:"13px 32px",background:saveStatus==="saved"?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",transition:"background .3s",display:"flex",alignItems:"center",gap:8 }}>
        {saveStatus==="saving" ? s.saving : saveStatus==="saved" ? s.saved : s.save}
      </button>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────
export default function ClinicManagementPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  const [plan, setPlan] = useState<PlanType>("basic");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"schedules"|"vacations"|"settings">("schedules");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      setUserId(user.id);

      const { data: clinicData } = await supabase
        .from("clinics").select("plan").eq("user_id", user.id).single();
      const fetchedPlan = (clinicData?.plan ?? "basic") as PlanType;
      setPlan(fetchedPlan);

      if (isSharedPlan(fetchedPlan)) {
        const { data: doctorsData } = await supabase
          .from("doctors").select("id,name,specialty,color,user_id")
          .eq("user_id", user.id).order("name");
        setDoctors((doctorsData ?? []) as Doctor[]);
      }
      setLoading(false);
    };
    init();
  }, []);

  // ── إحصائيات سريعة ────────────────────────────────────────
  const todayDayIdx = new Date().getDay();
  const [schedulesForStats, setSchedulesForStats] = useState<DoctorSchedule[]>([]);

  useEffect(() => {
    if (!userId || !doctors.length) return;
    supabase.from("doctor_schedules").select("*").eq("user_id", userId).then(({ data }) => {
      if (data) {
        setSchedulesForStats(data.map(row => ({
          ...row,
          days: typeof row.days === "string" ? JSON.parse(row.days) : row.days,
          vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
        })) as DoctorSchedule[]);
      }
    });
  }, [userId, doctors]);

  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
  })();

  const workingToday = schedulesForStats.filter(s => s.days[todayDayIdx]?.enabled && !s.vacations.includes(todayStr)).length;
  const onVacation = schedulesForStats.filter(s => s.vacations.includes(todayStr)).length;
  const avgDuration = schedulesForStats.length
    ? Math.round(schedulesForStats.reduce((a, s) => a + s.appointment_duration, 0) / schedulesForStats.length)
    : 30;

  const mainStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: isMobile ? "60px 16px 24px" : "24px 28px",
    background: "#f7f9fc", minHeight: "100vh",
    direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik, sans-serif",
  };

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Rubik,sans-serif",color:"#0863ba",fontSize:16 }}>
      {tr.loading}
    </div>
  );

  // ── حراسة الخطة ──────────────────────────────────────────
  if (!isSharedPlan(plan)) return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      <Sidebar lang={lang} setLang={setLang} plan={plan}/>
      <main style={mainStyle}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:16,textAlign:"center" }}>
          <div style={{ fontSize:64 }}>🔒</div>
          <h2 style={{ fontSize:22,fontWeight:800,color:"#353535",margin:0 }}>{tr.page.sharedOnly}</h2>
          <p style={{ fontSize:14,color:"#888",maxWidth:380,lineHeight:1.7,margin:0 }}>{tr.page.sharedOnlySub}</p>
          <a href="/dashboard" style={{ marginTop:8,padding:"12px 28px",background:"#0863ba",color:"#fff",borderRadius:12,textDecoration:"none",fontSize:14,fontWeight:700 }}>
            {isAr ? "العودة للرئيسية" : "Back to Dashboard"}
          </a>
        </div>
      </main>
    </div>
  );

  const tabs: { key: "schedules"|"vacations"|"settings"; label: string; icon: string }[] = [
    { key:"schedules",  label:tr.tabs.schedules,  icon:"🗓" },
    { key:"vacations",  label:tr.tabs.vacations,  icon:"🏖" },
    { key:"settings",   label:tr.tabs.settings,   icon:"⚙️" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type="time"]::-webkit-calendar-picker-indicator,
        input[type="date"]::-webkit-calendar-picker-indicator { opacity:.5; cursor:pointer; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
      `}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <Sidebar lang={lang} setLang={setLang} plan={plan}/>

        <main style={mainStyle}>
          {/* رأس الصفحة */}
          <div style={{ marginBottom:24, animation:"fadeUp .35s ease" }}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
              <div>
                <h1 style={{ fontSize:isMobile?20:24,fontWeight:800,color:"#353535",margin:0 }}>{tr.page.title}</h1>
                <p style={{ fontSize:13,color:"#999",margin:"4px 0 0",lineHeight:1.5 }}>{tr.page.sub}</p>
              </div>
              {/* بادج الخطة */}
              <div style={{ padding:"6px 14px",background:`${PLAN_BADGE_COLOR[plan]}12`,border:`1.5px solid ${PLAN_BADGE_COLOR[plan]}30`,borderRadius:20,display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:PLAN_BADGE_COLOR[plan] }}/>
                <span style={{ fontSize:12,fontWeight:700,color:PLAN_BADGE_COLOR[plan] }}>{(tr.planBadge as any)[plan]}</span>
              </div>
            </div>
          </div>

          {/* إحصائيات سريعة */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:24,animation:"fadeUp .4s ease" }}>
            {[
              { icon:"👨‍⚕️", label:tr.stats.totalDoctors,   value:doctors.length,   color:"#0863ba" },
              { icon:"✅", label:tr.stats.workingToday,  value:workingToday,     color:"#2e7d32" },
              { icon:"🏖", label:tr.stats.onVacation,    value:onVacation,       color:"#e67e22" },
              { icon:"⏱", label:tr.stats.avgDuration,   value:`${avgDuration} ${tr.schedule.minutes}`, color:"#7b2d8b" },
            ].map((stat, i) => (
              <div key={i} style={{ background:"#fff",borderRadius:14,border:"1.5px solid #f0f2f5",padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.04)",display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:42,height:42,borderRadius:12,background:`${stat.color}10`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{stat.icon}</div>
                <div>
                  <div style={{ fontSize:11,color:"#aaa",fontWeight:600 }}>{stat.label}</div>
                  <div style={{ fontSize:22,fontWeight:800,color:stat.color,lineHeight:1.1,marginTop:2 }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* التبويبات */}
          <div style={{ background:"#fff",borderRadius:20,border:"1.5px solid #f0f2f5",boxShadow:"0 2px 16px rgba(0,0,0,.05)",overflow:"hidden",animation:"fadeUp .45s ease" }}>
            {/* رأس التبويبات */}
            <div style={{ display:"flex",borderBottom:"2px solid #f5f5f5",padding:"0 8px",overflowX:"auto",background:"#fafbfc" }}>
              {tabs.map(tab => (
                <button key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ padding:"16px 20px",background:"none",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:activeTab===tab.key?700:500,color:activeTab===tab.key?"#0863ba":"#888",borderBottom:`2.5px solid ${activeTab===tab.key?"#0863ba":"transparent"}`,marginBottom:-2,whiteSpace:"nowrap",transition:"all .15s",display:"flex",alignItems:"center",gap:6 }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* محتوى التبويب */}
            <div style={{ padding:isMobile?"16px":"24px" }}>
              {activeTab === "schedules" && (
                <ScheduleTab lang={lang} doctors={doctors} userId={userId}/>
              )}
              {activeTab === "vacations" && (
                <VacationsTab lang={lang} doctors={doctors} userId={userId}/>
              )}
              {activeTab === "settings" && (
                <SettingsTab lang={lang} userId={userId}/>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}