"use client";

import { useState, useEffect, useCallback } from "react";
import SharedSidebar from "@/components/SharedSidebar";
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
      is24h: "العيادة تعمل 24 ساعة",
      is24hSub: "فتح كامل اليوم لاستقبال الحجوزات في أي وقت",
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
      is24h: "Clinic operates 24 hours",
      is24hSub: "Open all day for bookings at any time",
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


// ─── تبويب جدول الدوام ────────────────────────────────────────
function ScheduleTab({ lang, doctors, userId, isMobile }: { lang: Lang; doctors: Doctor[]; userId: string; isMobile: boolean }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const s = tr.schedule;

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctors[0]?.id ?? null);
  const [schedules, setSchedules] = useState<Record<number, DoctorSchedule>>({});
  const [saveStatus, setSaveStatus] = useState<Record<number, "idle"|"saving"|"saved">>({});

  // تحويل مفاتيح days من strings إلى numbers (Supabase JSONB يعيد strings)
  const normalizeDays = (rawDays: any): Record<number, WorkDay> => {
    const parsed = typeof rawDays === "string" ? JSON.parse(rawDays) : (rawDays ?? {});
    const result: Record<number, WorkDay> = {};
    for (const key of Object.keys(parsed)) {
      result[parseInt(key, 10)] = parsed[key];
    }
    // تأكد أن كل أيام الأسبوع موجودة
    for (let i = 0; i < 7; i++) {
      if (!(i in result)) result[i] = defaultWorkDay(i >= 1 && i <= 4);
    }
    return result;
  };

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
            days: normalizeDays(row.days),
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
    // نقرأ أحدث نسخة من الجدول من schedules state بشكل آمن
    const currentSchedules = await new Promise<Record<number, DoctorSchedule>>(resolve => {
      setSchedules(prev => { resolve(prev); return prev; });
    });
    const sch = currentSchedules[doctorId] ?? defaultSchedule(doctorId, userId);
    setSaveStatus(p => ({ ...p, [doctorId]: "saving" }));

    // نحوّل days وvacations لـ JSON string صراحةً لتجنب مشاكل Supabase JSONB
    const daysJson = JSON.parse(JSON.stringify(sch.days));
    const vacationsJson = Array.isArray(sch.vacations) ? sch.vacations : [];

    if (sch.id) {
      // عند التحديث: لا نرسل user_id أو doctor_id (immutable / RLS protected)
      const updatePayload = {
        days: daysJson,
        vacations: vacationsJson,
        appointment_duration: sch.appointment_duration,
        max_daily_appointments: sch.max_daily_appointments,
        notes: sch.notes ?? "",
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("doctor_schedules")
        .update(updatePayload)
        .eq("id", sch.id)
        .eq("user_id", userId); // ضمان الأمان عبر user_id في الـ filter
      if (error) {
        console.error("Save error:", error.message, error.details, error.hint);
        setSaveStatus(p => ({ ...p, [doctorId]: "idle" }));
        return;
      }
    } else {
      // عند الإنشاء: نرسل كل الحقول
      const insertPayload = {
        doctor_id: doctorId,
        user_id: userId,
        days: daysJson,
        vacations: vacationsJson,
        appointment_duration: sch.appointment_duration,
        max_daily_appointments: sch.max_daily_appointments,
        notes: sch.notes ?? "",
      };
      const { data, error } = await supabase
        .from("doctor_schedules")
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        console.error("Insert error:", error.message, error.details, error.hint);
        setSaveStatus(p => ({ ...p, [doctorId]: "idle" }));
        return;
      }
      if (data) setSchedules(prev => ({ ...prev, [doctorId]: { ...sch, id: data.id } }));
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
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 20 }}>
      {/* قائمة الأطباء */}
      <div style={{ width: isMobile ? "100%" : 200, flexShrink:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#888", marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>
          {s.selectDoctor}
        </div>
        <div style={{ display:"flex", flexDirection: isMobile ? "row" : "column", gap:6, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 4 : 0 }}>
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
                  flexShrink: isMobile ? 0 : undefined,
                  minWidth: isMobile ? 140 : undefined,
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
              style={{ padding:"10px 22px",background:saveStatus[doc.id]==="saved"?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",transition:"background .3s",display:"flex",alignItems:"center",gap:6, width: isMobile ? "100%" : undefined, justifyContent: isMobile ? "center" : undefined }}
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
                  <div key={dayIdx} style={{ display:"flex",flexDirection:"column",gap:8,padding:"12px 14px",borderRadius:12,background:enabled?`${color}07`:"#fafafa",border:`1.5px solid ${enabled?color+"25":"#f0f2f5"}`,transition:"all .2s" }}>
                    {/* الصف الأول: toggle + اسم اليوم */}
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <button
                        onClick={() => updateDay(doc.id, dayIdx, { enabled: !enabled })}
                        style={{ width:44,height:24,borderRadius:12,background:enabled?color:"#ddd",border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background .2s" }}
                      >
                        <div style={{ position:"absolute",top:3,left:isAr?(enabled?3:22):(enabled?22:3),right:"auto",width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
                      </button>
                      <div style={{ fontSize:13,fontWeight:700,color:enabled?color:"#bbb",flex:1 }}>
                        {tr.weekDays[dayIdx]}
                      </div>
                      {!enabled && (
                        <span style={{ fontSize:12,color:"#ccc",fontStyle:"italic" }}>{s.disabled}</span>
                      )}
                    </div>
                    {/* الصف الثاني: ساعات العمل */}
                    {enabled && (
                      <div style={{ display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,paddingInlineStart:54 }}>
                        {/* خيار 24 ساعة */}
                        <button
                          onClick={() => {
                            const is24 = day.start==="00:00" && day.end==="23:59";
                            updateDay(doc.id, dayIdx, is24
                              ? { start:"09:00", end:"17:00", break_start:undefined, break_end:undefined }
                              : { start:"00:00", end:"23:59", break_start:undefined, break_end:undefined }
                            );
                          }}
                          style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20,
                            background: day.start==="00:00"&&day.end==="23:59" ? color : "rgba(0,0,0,.04)",
                            color: day.start==="00:00"&&day.end==="23:59" ? "#fff" : "#888",
                            border: `1.5px solid ${day.start==="00:00"&&day.end==="23:59" ? color : "#e0e0e0"}`,
                            cursor:"pointer", transition:"all .15s" }}
                        >
                          {isAr ? "24 ساعة" : "24h"}
                        </button>
                        {!(day.start==="00:00" && day.end==="23:59") && (<>
                          <span style={{ fontSize:12,color:"#888" }}>{s.from}</span>
                          <input type="time" value={day.start} onChange={e => updateDay(doc.id,dayIdx,{start:e.target.value})} style={timeInputSt}/>
                          <span style={{ fontSize:12,color:"#888" }}>{s.to}</span>
                          <input type="time" value={day.end} onChange={e => updateDay(doc.id,dayIdx,{end:e.target.value})} style={timeInputSt}/>
                        </>)}
                      </div>
                    )}
                    {/* الصف الثالث: الاستراحة */}
                    {enabled && (
                      <div style={{ display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,paddingInlineStart:54 }}>
                        {day.break_start ? (
                          <>
                            <span style={{ fontSize:12,color:"#aaa" }}>☕ {s.breakTime}</span>
                            <input type="time" value={day.break_start} onChange={e => updateDay(doc.id,dayIdx,{break_start:e.target.value})} style={timeInputSt}/>
                            <span style={{ fontSize:12,color:"#aaa" }}>-</span>
                            <input type="time" value={day.break_end??""} onChange={e => updateDay(doc.id,dayIdx,{break_end:e.target.value})} style={timeInputSt}/>
                            <button onClick={() => updateDay(doc.id,dayIdx,{break_start:undefined,break_end:undefined})} style={{ fontSize:11,color:"#c0392b",background:"none",border:"none",cursor:"pointer",padding:0 }}>✕ {isAr?"إزالة الاستراحة":"remove"}</button>
                          </>
                        ) : (
                          <button onClick={() => updateDay(doc.id,dayIdx,{break_start:"13:00",break_end:"14:00"})}
                            style={{ fontSize:11,color:"#0863ba",background:"rgba(8,99,186,.07)",border:"1px solid rgba(8,99,186,.15)",borderRadius:6,padding:"4px 8px",cursor:"pointer" }}>
                            + {s.breakTime}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* إعدادات إضافية */}
          <div style={{ display:"grid",gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",gap:12,marginBottom:16 }}>
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
function VacationsTab({ lang, doctors, userId, isMobile }: { lang: Lang; doctors: Doctor[]; userId: string; isMobile: boolean }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const v = tr.vacation;

  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(doctors[0]?.id ?? null);
  const [schedules, setSchedules] = useState<Record<number, DoctorSchedule>>({});
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizeDaysV = (rawDays: any): Record<number, WorkDay> => {
    const parsed = typeof rawDays === "string" ? JSON.parse(rawDays) : (rawDays ?? {});
    const result: Record<number, WorkDay> = {};
    for (const key of Object.keys(parsed)) result[parseInt(key, 10)] = parsed[key];
    for (let i = 0; i < 7; i++) if (!(i in result)) result[i] = defaultWorkDay(i >= 1 && i <= 4);
    return result;
  };

  useEffect(() => {
    if (!doctors.length) return;
    const fetchSchedules = async () => {
      const { data } = await supabase.from("doctor_schedules").select("*").eq("user_id", userId);
      if (data) {
        const map: Record<number, DoctorSchedule> = {};
        for (const row of data) {
          map[row.doctor_id] = {
            id: row.id, doctor_id: row.doctor_id, user_id: row.user_id,
            days: normalizeDaysV(row.days),
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
    <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 20 }}>
      {/* قائمة الأطباء */}
      <div style={{ width: isMobile ? "100%" : 200, flexShrink:0 }}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10,textTransform:"uppercase",letterSpacing:.5 }}>
          {v.selectDoctor}
        </div>
        <div style={{ display:"flex",flexDirection: isMobile ? "row" : "column",gap:6,overflowX: isMobile ? "auto" : "visible",paddingBottom: isMobile ? 4 : 0 }}>
          {doctors.map((d, idx) => {
            const color = d.color ?? getDoctorColor(idx);
            const isSelected = d.id === selectedDoctorId;
            const dSch = getSchedule(d.id);
            const vacCount = dSch.vacations.filter(vd => vd >= todayStr).length;
            return (
              <button key={d.id}
                onClick={() => setSelectedDoctorId(d.id)}
                style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:isSelected?`${color}12`:"#f9fafb",border:`1.5px solid ${isSelected?color:"#eee"}`,cursor:"pointer",textAlign:isAr?"right":"left",direction:isAr?"rtl":"ltr",transition:"all .15s",flexShrink: isMobile ? 0 : undefined,minWidth: isMobile ? 140 : undefined }}
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
function SettingsTab({ lang, userId, isMobile }: { lang: Lang; userId: string; isMobile: boolean }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const s = tr.settings;

  const [clinicName, setClinicName] = useState("");
  const [defaultFrom, setDefaultFrom] = useState("08:00");
  const [defaultTo, setDefaultTo] = useState("18:00");
  const [is24h, setIs24h] = useState(false);
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
          setIs24h(st.is_24_hours ?? (st.default_from === "00:00" && st.default_to === "23:59"));
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
    const effectiveFrom = is24h ? "00:00" : defaultFrom;
    const effectiveTo   = is24h ? "23:59" : defaultTo;
    const settings = {
      default_from: effectiveFrom,
      default_to: effectiveTo,
      is_24_hours: is24h,
      weekend_days: weekendDays,
      allow_online_booking: allowOnline,
      require_approval: requireApproval,
    };
    // حفظ في clinics
    await supabase.from("clinics").update({ name: clinicName, settings }).eq("user_id", userId);
    // مزامنة مع clinic_profiles لتنعكس على صفحة الحجز
    const workingDaysCodes = ["sun","mon","tue","wed","thu","fri","sat"]
      .filter((_,i) => !weekendDays.includes(i));
    await supabase.from("clinic_profiles").update({
      clinic_name: clinicName,
      working_hours_start: effectiveFrom,
      working_hours_end:   effectiveTo,
      working_days:        workingDaysCodes,
    }).eq("id", userId);
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
    <div style={{ maxWidth: isMobile ? "100%" : 600 }}>
      {/* اسم العيادة */}
      <div style={cardSt}>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>🏥 {s.clinicName}</div>
        <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder={s.clinicNamePh} style={inputSt}/>
      </div>

      {/* ساعات العمل */}
      <div style={cardSt}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>🌙 {s.is24h}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{s.is24hSub}</div>
          </div>
          <button onClick={() => setIs24h(v => !v)}
            style={{ width:48,height:26,borderRadius:13,background:is24h?"#0863ba":"#ddd",border:"none",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0 }}>
            <div style={{ position:"absolute",top:3,left:isAr ? (is24h?3:26) : (is24h?26:3),width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
          </button>
        </div>
        <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:12,paddingTop:12,borderTop:"1px solid #f5f5f5",opacity:is24h?.4:1 }}>⏰ {s.workingHours}</div>
        <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",opacity:is24h?.4:1,pointerEvents:is24h?"none":"auto" }}>
          <div>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>{s.defaultFrom}</div>
            <input type="time" value={defaultFrom} disabled={is24h} onChange={e=>setDefaultFrom(e.target.value)} style={{ ...inputSt, width:110 }}/>
          </div>
          <div style={{ color:"#ccc",marginTop:16 }}>→</div>
          <div>
            <div style={{ fontSize:11,color:"#aaa",marginBottom:4 }}>{s.defaultTo}</div>
            <input type="time" value={defaultTo} disabled={is24h} onChange={e=>setDefaultTo(e.target.value)} style={{ ...inputSt, width:110 }}/>
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
            <div style={{ position:"absolute",top:3,left:isAr ? (allowOnline?3:26) : (allowOnline?26:3),width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
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
              <div style={{ position:"absolute",top:3,left:isAr ? (requireApproval?3:26) : (requireApproval?26:3),width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,.2)",transition:"left .2s" }}/>
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

// ─── تبويب خطط العيادة (رابط عام للباقات) ─────────────────────
type ClinicPackage = {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  features: string[];
  payment_type: "link" | "whatsapp";
  payment_value: string;
  button_label: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
};

const emptyPackage: Omit<ClinicPackage, "id"> = {
  title: "", description: "", price: 0, currency: "USD", billing_period: "monthly",
  features: [], payment_type: "link", payment_value: "", button_label: "",
  is_featured: false, is_active: true, sort_order: 0,
};

function PlansTab({ lang, userId, isMobile }: { lang: Lang; userId: string; isMobile: boolean }) {
  const isAr = lang === "ar";
  const tx = {
    ar: {
      title: "خطط وباقات العيادة", sub: "أضف الباقات التي يمكن للمرضى الاشتراك بها عبر رابط عام خاص بعيادتك",
      shareLink: "مشاركة رابط الباقات", copy: "نسخ الرابط", copied: "تم النسخ ✓",
      addPackage: "إضافة باقة جديدة", edit: "تعديل", delete: "حذف", save: "حفظ", cancel: "إلغاء",
      packageTitle: "اسم الباقة", packageTitlePh: "مثال: الباقة الذهبية",
      description: "الوصف", descriptionPh: "وصف مختصر للباقة...",
      price: "السعر", currency: "العملة", billing: "الدورة",
      monthly: "شهرياً", yearly: "سنوياً", onetime: "دفعة واحدة",
      features: "المزايا", featuresPh: "اكتب ميزة واضغط Enter",
      paymentMethod: "طريقة الدفع", paymentLink: "رابط دفع", paymentWhatsapp: "واتساب",
      paymentValueLink: "رابط الدفع", paymentValueLinkPh: "https://...",
      paymentValueWa: "رقم الواتساب", paymentValueWaPh: "9639XXXXXXXX",
      buttonLabel: "نص الزر", buttonLabelPh: "اشترك الآن",
      featured: "تمييز هذه الباقة كالأكثر طلباً",
      active: "مفعّلة وظاهرة للمرضى",
      noPackages: "لا توجد باقات بعد، ابدأ بإضافة أول باقة",
      confirmDelete: "هل تريد حذف هذه الباقة؟",
    },
    en: {
      title: "Clinic Plans & Packages", sub: "Add packages patients can subscribe to via your clinic's public link",
      shareLink: "Share Packages Link", copy: "Copy Link", copied: "Copied ✓",
      addPackage: "Add New Package", edit: "Edit", delete: "Delete", save: "Save", cancel: "Cancel",
      packageTitle: "Package Name", packageTitlePh: "e.g. Gold Package",
      description: "Description", descriptionPh: "Short package description...",
      price: "Price", currency: "Currency", billing: "Billing",
      monthly: "Monthly", yearly: "Yearly", onetime: "One-time",
      features: "Features", featuresPh: "Type a feature and press Enter",
      paymentMethod: "Payment Method", paymentLink: "Payment Link", paymentWhatsapp: "WhatsApp",
      paymentValueLink: "Payment Link", paymentValueLinkPh: "https://...",
      paymentValueWa: "WhatsApp Number", paymentValueWaPh: "9639XXXXXXXX",
      buttonLabel: "Button Text", buttonLabelPh: "Subscribe Now",
      featured: "Mark as Most Popular",
      active: "Active & visible to patients",
      noPackages: "No packages yet, add your first one",
      confirmDelete: "Delete this package?",
    },
  }[lang];

  const [packages, setPackages] = useState<ClinicPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClinicPackage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("clinic_packages").select("*").eq("user_id", userId).order("sort_order");
    setPackages((data ?? []).map((p: any) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : (typeof p.features === "string" ? JSON.parse(p.features) : []),
    })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/clinic-plans/${userId}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openNew = () => {
    setEditing({ ...emptyPackage, id: 0, sort_order: packages.length });
    setShowForm(true);
  };

  const openEdit = (p: ClinicPackage) => { setEditing({ ...p }); setShowForm(true); };

  const savePackage = async () => {
    if (!editing || !editing.title.trim()) return;
    const payload = {
      user_id: userId,
      title: editing.title.trim(),
      description: editing.description,
      price: editing.price,
      currency: editing.currency,
      billing_period: editing.billing_period,
      features: editing.features,
      payment_type: editing.payment_type,
      payment_value: editing.payment_value,
      button_label: editing.button_label,
      is_featured: editing.is_featured,
      is_active: editing.is_active,
      sort_order: editing.sort_order,
    };
    if (editing.id) {
      await supabase.from("clinic_packages").update(payload).eq("id", editing.id).eq("user_id", userId);
    } else {
      await supabase.from("clinic_packages").insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const deletePackage = async (id: number) => {
    if (!confirm(tx.confirmDelete)) return;
    await supabase.from("clinic_packages").delete().eq("id", id).eq("user_id", userId);
    load();
  };

  const addFeature = () => {
    if (!featureInput.trim() || !editing) return;
    setEditing({ ...editing, features: [...editing.features, featureInput.trim()] });
    setFeatureInput("");
  };

  const removeFeature = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, features: editing.features.filter((_, i) => i !== idx) });
  };

  const inputSt: React.CSSProperties = {
    padding: "11px 14px", border: "1.5px solid #e8eaed", borderRadius: 10,
    fontFamily: "Rubik,sans-serif", fontSize: 14, color: "#353535",
    background: "#fafbfc", outline: "none", direction: isAr ? "rtl" : "ltr", width: "100%", boxSizing: "border-box",
  };
  const cardSt: React.CSSProperties = {
    background: "#fff", borderRadius: 16, border: "1.5px solid #f0f2f5",
    padding: "20px 22px", marginBottom: 14, boxShadow: "0 2px 10px rgba(0,0,0,.04)",
  };
  const labelSt: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>...</div>;

  return (
    <div style={{ maxWidth: isMobile ? "100%" : 720 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#353535" }}>{tx.title}</div>
        <div style={{ fontSize: 12.5, color: "#999", marginTop: 4 }}>{tx.sub}</div>
      </div>

      {/* رابط المشاركة */}
      <div style={{ ...cardSt, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6 }}>🔗 {tx.shareLink}</div>
          <div style={{ fontSize: 13, color: "#0863ba", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{shareUrl}</div>
        </div>
        <button onClick={copyLink} style={{ padding: "10px 18px", background: copied ? "#2e7d32" : "#0863ba", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Rubik,sans-serif", flexShrink: 0 }}>
          {copied ? tx.copied : tx.copy}
        </button>
      </div>

      {/* زر إضافة */}
      {!showForm && (
        <button onClick={openNew} style={{ marginBottom: 16, padding: "12px 22px", background: "#0863ba", color: "#fff", border: "none", borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "Rubik,sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
          ＋ {tx.addPackage}
        </button>
      )}

      {/* نموذج الإضافة/التعديل */}
      {showForm && editing && (
        <div style={cardSt}>
          <div style={labelSt}>{tx.packageTitle}</div>
          <input style={{ ...inputSt, marginBottom: 12 }} value={editing.title} placeholder={tx.packageTitlePh}
            onChange={e => setEditing({ ...editing, title: e.target.value })} />

          <div style={labelSt}>{tx.description}</div>
          <textarea style={{ ...inputSt, marginBottom: 12, minHeight: 60, resize: "vertical" }} value={editing.description} placeholder={tx.descriptionPh}
            onChange={e => setEditing({ ...editing, description: e.target.value })} />

          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={labelSt}>{tx.price}</div>
              <input type="number" style={inputSt} value={editing.price}
                onChange={e => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div style={{ flex: 1, minWidth: 90 }}>
              <div style={labelSt}>{tx.currency}</div>
              <input style={inputSt} value={editing.currency}
                onChange={e => setEditing({ ...editing, currency: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={labelSt}>{tx.billing}</div>
              <select style={inputSt} value={editing.billing_period}
                onChange={e => setEditing({ ...editing, billing_period: e.target.value })}>
                <option value="monthly">{tx.monthly}</option>
                <option value="yearly">{tx.yearly}</option>
                <option value="onetime">{tx.onetime}</option>
              </select>
            </div>
          </div>

          <div style={labelSt}>{tx.features}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input style={inputSt} value={featureInput} placeholder={tx.featuresPh}
              onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} />
            <button onClick={addFeature} style={{ padding: "0 18px", background: "#eef3fb", color: "#0863ba", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>＋</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {editing.features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7f9fc", borderRadius: 8, padding: "7px 12px", fontSize: 13 }}>
                <span>✓ {f}</span>
                <button onClick={() => removeFeature(i)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 15, fontWeight: 700 }}>×</button>
              </div>
            ))}
          </div>

          <div style={labelSt}>{tx.paymentMethod}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["link", "whatsapp"] as const).map(pt => (
              <button key={pt} onClick={() => setEditing({ ...editing, payment_type: pt })}
                style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${editing.payment_type === pt ? "#0863ba" : "#eee"}`, background: editing.payment_type === pt ? "rgba(8,99,186,.08)" : "#fafbfc", color: editing.payment_type === pt ? "#0863ba" : "#888", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>
                {pt === "link" ? `🔗 ${tx.paymentLink}` : `💬 ${tx.paymentWhatsapp}`}
              </button>
            ))}
          </div>
          <div style={labelSt}>{editing.payment_type === "link" ? tx.paymentValueLink : tx.paymentValueWa}</div>
          <input style={{ ...inputSt, marginBottom: 12, direction: "ltr" }}
            value={editing.payment_value}
            placeholder={editing.payment_type === "link" ? tx.paymentValueLinkPh : tx.paymentValueWaPh}
            onChange={e => setEditing({ ...editing, payment_value: e.target.value })} />

          <div style={labelSt}>{tx.buttonLabel}</div>
          <input style={{ ...inputSt, marginBottom: 14 }} value={editing.button_label} placeholder={tx.buttonLabelPh}
            onChange={e => setEditing({ ...editing, button_label: e.target.value })} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={editing.is_featured} onChange={e => setEditing({ ...editing, is_featured: e.target.checked })} />
            <span style={{ fontSize: 13, color: "#555" }}>{tx.featured}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
            <span style={{ fontSize: 13, color: "#555" }}>{tx.active}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={savePackage} style={{ padding: "11px 26px", background: "#0863ba", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tx.save}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} style={{ padding: "11px 26px", background: "#f5f6f8", color: "#666", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tx.cancel}</button>
          </div>
        </div>
      )}

      {/* قائمة الباقات */}
      {packages.length === 0 && !showForm ? (
        <div style={{ ...cardSt, textAlign: "center", color: "#999", fontSize: 13 }}>{tx.noPackages}</div>
      ) : (
        packages.map(p => (
          <div key={p.id} style={{ ...cardSt, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", opacity: p.is_active ? 1 : 0.55 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#353535", display: "flex", alignItems: "center", gap: 8 }}>
                {p.title}
                {p.is_featured && <span style={{ fontSize: 10, background: "#0863ba", color: "#fff", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>⭐</span>}
                {!p.is_active && <span style={{ fontSize: 10, background: "#eee", color: "#999", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{isAr ? "غير مفعّلة" : "Inactive"}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "#999", marginTop: 3 }}>{p.price} {p.currency} · {p.features.length} {isAr ? "ميزة" : "features"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEdit(p)} style={{ padding: "8px 16px", background: "#eef3fb", color: "#0863ba", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tx.edit}</button>
              <button onClick={() => deletePackage(p.id)} style={{ padding: "8px 16px", background: "rgba(192,57,43,.08)", color: "#c0392b", border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tx.delete}</button>
            </div>
          </div>
        ))
      )}
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
  const [activeTab, setActiveTab] = useState<"schedules"|"vacations"|"settings"|"plans">("schedules");
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

      // جلب الأطباء لجميع الخطط
      const { data: doctorsData } = await supabase
        .from("doctors").select("id,name,specialty,color,user_id")
        .eq("user_id", user.id).order("name");
      let docsList = (doctorsData ?? []) as Doctor[];
      // للخطط الفردية: إذا لم يوجد طبيب، ننشئ سجل افتراضي من بيانات العيادة
      if (!isSharedPlan(fetchedPlan) && docsList.length === 0) {
        const { data: clinicProfile } = await supabase
          .from("clinic_profiles").select("doctor_name,clinic_name").eq("id", user.id).single();
        const doctorName = clinicProfile?.doctor_name ?? clinicProfile?.clinic_name ?? "الطبيب";
        const { data: newDoc } = await supabase
          .from("doctors")
          .insert({ name: doctorName, user_id: user.id, color: "#0863ba" })
          .select().single();
        if (newDoc) docsList = [newDoc as Doctor];
      }
      setDoctors(docsList);
      setLoading(false);
    };
    init();
  }, []);

  // ── إحصائيات سريعة ────────────────────────────────────────
  const todayDayIdx = new Date().getDay();
  const [schedulesForStats, setSchedulesForStats] = useState<DoctorSchedule[]>([]);

  useEffect(() => {
    if (!userId || !doctors.length) return;
    const normalizeStDays = (rawDays: any): Record<number, WorkDay> => {
      const parsed = typeof rawDays === "string" ? JSON.parse(rawDays) : (rawDays ?? {});
      const result: Record<number, WorkDay> = {};
      for (const key of Object.keys(parsed)) result[parseInt(key, 10)] = parsed[key];
      for (let i = 0; i < 7; i++) if (!(i in result)) result[i] = defaultWorkDay(i >= 1 && i <= 4);
      return result;
    };
    supabase.from("doctor_schedules").select("*").eq("user_id", userId).then(({ data }) => {
      if (data) {
        setSchedulesForStats(data.map(row => ({
          ...row,
          days: normalizeStDays(row.days),
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
    flex: 1, minWidth: 0, padding: isMobile ? "60px 16px 32px" : "24px 28px 40px",
    background: "#f7f9fc",
    overflowY: "auto",
    height: "100vh",
    direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik, sans-serif",
  };

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"Rubik,sans-serif",color:"#0863ba",fontSize:16 }}>
      {tr.loading}
    </div>
  );

  // ── متاحة لجميع الخطط ──

  // خطط العيادة متاحة فقط للخطة الشاملة (enterprise / shared_enterprise)
  const hasPlansAccess = plan === "enterprise" || plan === "shared_enterprise";

  const tabs: { key: "schedules"|"vacations"|"settings"|"plans"; label: string; icon: string }[] = [
    { key:"schedules",  label:tr.tabs.schedules,  icon:"🗓" },
    { key:"vacations",  label:tr.tabs.vacations,  icon:"🏖" },
    { key:"settings",   label:tr.tabs.settings,   icon:"⚙️" },
    ...(hasPlansAccess ? [{ key:"plans" as const, label:isAr?"خطط العيادة":"Clinic Plans", icon:"💳" }] : []),
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
        <SharedSidebar lang={lang as "ar"|"en"} setLang={setLang as (l:"ar"|"en")=>void} activePage="clinicManagement" plan={plan} />

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
          <div style={{ display:"grid",gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:24,animation:"fadeUp .4s ease" }}>
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
          <div style={{ background:"#fff",borderRadius:20,border:"1.5px solid #f0f2f5",boxShadow:"0 2px 16px rgba(0,0,0,.05)",animation:"fadeUp .45s ease" }}>
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
            <div style={{ padding:isMobile?"16px":"24px", paddingBottom:"32px", borderRadius:"0 0 20px 20px" }}>
              {activeTab === "schedules" && (
                <ScheduleTab lang={lang} doctors={doctors} userId={userId} isMobile={isMobile}/>
              )}
              {activeTab === "vacations" && (
                <VacationsTab lang={lang} doctors={doctors} userId={userId} isMobile={isMobile}/>
              )}
              {activeTab === "settings" && (
                <SettingsTab lang={lang} userId={userId} isMobile={isMobile}/>
              )}
              {activeTab === "plans" && hasPlansAccess && (
                <PlansTab lang={lang} userId={userId} isMobile={isMobile}/>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}