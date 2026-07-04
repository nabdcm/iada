"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "en";

type ClinicProfile = {
  id: string;
  clinic_name: string;
  doctor_name?: string;
  phone?: string;
  address?: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
  appointment_duration: number;
  plan?: string;
  require_approval?: boolean;
};

type ClinicDoctor = {
  id: number;
  name: string;
  specialty?: string;
  color?: string;
};

const SHARED_CLINIC_PLANS = ["shared_basic", "shared_pro", "shared_enterprise"];

const WORKING_DAYS_MAP: Record<string, number> = {
  sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6
};

const T = {
  ar: {
    loading:         "جاري التحميل...",
    notFound:        "عيادة غير موجودة",
    notFoundSub:     "تحقق من الرابط وحاول مجدداً",
    title:           "احجز موعدك",
    sub:             "اختر الوقت المناسب لك",
    sec1:            "البيانات الشخصية",
    sec2:            "الحالة الصحية",
    sec3:            "تفاصيل الموعد",
    name:            "الاسم الكامل *",
    namePh:          "أدخل اسمك الكامل",
    phone:           "رقم الهاتف *",
    phonePh:         "مثال: 0501234567",
    gender:          "الجنس",
    male:            "ذكر",
    female:          "أنثى",
    diabetes:        "هل تعاني من مرض السكري؟",
    hypertension:    "هل تعاني من ارتفاع ضغط الدم؟",
    yes:             "نعم",
    no:              "لا",
    date:            "تاريخ الموعد *",
    time:            "وقت الموعد *",
    notes:           "ملاحظات للطبيب (اختياري)",
    notesPh:         "أي شكاوى أو ملاحظات...",
    submit:          "إرسال طلب الحجز",
    submitting:      "جاري الإرسال...",
    required:        "يرجى تعبئة الاسم والهاتف واختيار الموعد",
    success:         "تم إرسال طلب حجزك! ✓",
    // ── رسالة النجاح تُوضح أن الموعد بانتظار موافقة الطبيب ──
    successSub:      "طلبك قيد المراجعة من قِبل الطبيب. سنتواصل معك عند تأكيد الموعد.",
    pendingNote:     "⏳ بانتظار موافقة الطبيب",
    newBooking:      "حجز موعد آخر",
    errorBook:       "حدث خطأ، حاول مجدداً",
    poweredBy:       "مدعوم بواسطة نبض",
    offDay:          "هذا اليوم خارج أوقات عمل العيادة",
    slotBooked:      "محجوز",
    slotAvailable:   "متاح",
    slotsLegend:     "دليل الألوان",
    slotBookedErr:   "هذا الموعد محجوز مسبقاً، الرجاء اختيار وقت آخر",
    selectDoctor:    "اختر طبيبك",
    selectDoctorSub: "اختر الطبيب الذي تريد الحجز معه",
    doctor:          "الطبيب",
    doctorRequired:  "يرجى اختيار الطبيب أولاً",
    noDoctors:       "لا يوجد أطباء متاحون حالياً",
  },
  en: {
    loading:         "Loading...",
    notFound:        "Clinic Not Found",
    notFoundSub:     "Please check the link and try again",
    title:           "Book an Appointment",
    sub:             "Choose a time that works for you",
    sec1:            "Personal Information",
    sec2:            "Medical History",
    sec3:            "Appointment Details",
    name:            "Full Name *",
    namePh:          "Enter your full name",
    phone:           "Phone Number *",
    phonePh:         "e.g. 0501234567",
    gender:          "Gender",
    male:            "Male",
    female:          "Female",
    diabetes:        "Do you have diabetes?",
    hypertension:    "Do you have high blood pressure?",
    yes:             "Yes",
    no:              "No",
    date:            "Appointment Date *",
    time:            "Appointment Time *",
    notes:           "Notes for the doctor (optional)",
    notesPh:         "Any complaints or notes...",
    submit:          "Send Booking Request",
    submitting:      "Sending...",
    required:        "Please fill name, phone and select a time",
    success:         "Booking Request Sent! ✓",
    successSub:      "Your request is pending doctor approval. We'll contact you once confirmed.",
    pendingNote:     "⏳ Awaiting doctor approval",
    newBooking:      "Book Another Appointment",
    errorBook:       "An error occurred, please try again",
    poweredBy:       "Powered by NABD",
    offDay:          "This day is outside clinic working hours",
    slotBooked:      "Booked",
    slotAvailable:   "Available",
    slotsLegend:     "Color Guide",
    slotBookedErr:   "This slot is already booked, please choose another time",
    selectDoctor:    "Choose your doctor",
    selectDoctorSub: "Select the doctor you'd like to book with",
    doctor:          "Doctor",
    doctorRequired:  "Please select a doctor first",
    noDoctors:       "No doctors available at the moment",
  },
} as const;

function generateTimeSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur + duration <= endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    cur += duration;
  }
  return slots;
}

function isDayWorking(dateStr: string, workingDays: string[]): boolean {
  const day = new Date(dateStr + "T00:00:00").getDay();
  return workingDays.some(d => WORKING_DAYS_MAP[d] === day);
}

export default function BookingPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = use(params);

  const [lang,       setLang]       = useState<Lang>("ar");
  const [clinic,     setClinic]     = useState<ClinicProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  // قائمة الأطباء للعيادات المشتركة
  const [doctors,        setDoctors]        = useState<ClinicDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<ClinicDoctor | null>(null);

  const [form, setForm] = useState({
    name:             "",
    phone:            "",
    gender:           "" as "" | "male" | "female",
    has_diabetes:     false,
    has_hypertension: false,
    date:             "",
    time:             "",
    notes:            "",
  });

  // المواعيد المحجوزة للتاريخ المختار
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  // جدول دوام الطبيب المختار (من doctor_schedules)
  const [doctorSchedule, setDoctorSchedule] = useState<{
    days: Record<number, { enabled: boolean; start: string; end: string; break_start?: string; break_end?: string }>;
    vacations: string[];
    appointment_duration: number;
  } | null>(null);

  const isSharedClinic = clinic ? SHARED_CLINIC_PLANS.includes(clinic.plan ?? "") : false;

  const isAr = lang === "ar";
  const tr   = T[lang];

  useEffect(() => {
    if (!clinicId) return;

    // جلب بيانات العيادة + الخطة من جدول clinics
    const loadClinic = async () => {
      const { data: profileData, error: profileError } = await supabase
        .from("clinic_profiles")
        .select("*")
        .eq("id", clinicId)
        .single();

      if (profileError || !profileData) { setClinic(null); setLoading(false); return; }

      // جلب الخطة وإعدادات الموافقة من جدول clinics
      const { data: clinicRow } = await supabase
        .from("clinics")
        .select("plan, settings")
        .eq("user_id", clinicId)
        .single();

      // استخراج require_approval من clinics.settings
      const clinicSettings = typeof clinicRow?.settings === "string"
        ? JSON.parse(clinicRow.settings)
        : (clinicRow?.settings ?? {});
      const requireApproval: boolean = clinicSettings.require_approval ?? false;

      const clinicWithPlan = { ...profileData, plan: clinicRow?.plan ?? "", require_approval: requireApproval } as ClinicProfile;
      setClinic(clinicWithPlan);

      // جلب قائمة الأطباء (مشتركة أو فردية)
      const { data: doctorsData } = await supabase
        .from("doctors")
        .select("id, name, specialty, color")
        .eq("user_id", clinicId)
        .order("name");
      setDoctors(doctorsData ?? []);
      // للعيادات الفردية: تحديد الطبيب الوحيد تلقائياً لجلب دوامه
      if (!(clinicRow?.plan && SHARED_CLINIC_PLANS.includes(clinicRow.plan)) && doctorsData && doctorsData.length > 0) {
        setSelectedDoctor(doctorsData[0]);
      }

      setLoading(false);
    };

    loadClinic();

  }, [clinicId]);

  // جلب المواعيد المحجوزة عند تغيير التاريخ أو الطبيب (للعيادات المشتركة)
  useEffect(() => {
    if (!form.date || !clinicId) {
      setBookedSlots([]);
      return;
    }
    // للعيادات المشتركة: لا تجلب المواعيد حتى يُختار الطبيب
    if (isSharedClinic && !selectedDoctor) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    let query = supabase
      .from("appointments")
      .select("time")
      .eq("user_id", clinicId)
      .eq("date", form.date)
      .in("status", ["pending_approval", "confirmed", "scheduled"]);

    // فلترة بالطبيب للعيادات المشتركة
    if (isSharedClinic && selectedDoctor) {
      query = query.eq("doctor_id", selectedDoctor.id);
    }

    query.then(({ data }) => {
      const times = (data ?? []).map((r: { time: string }) => r.time.slice(0, 5));
      setBookedSlots(times);
      setLoadingSlots(false);
    });
  }, [form.date, clinicId, selectedDoctor, isSharedClinic]);

  // جلب جدول الطبيب عند اختياره
  useEffect(() => {
    if (!selectedDoctor && !clinic) return;
    const fetchSchedule = async () => {
      // للعيادات الفردية: نأخذ أول طبيب
      const doctorId = selectedDoctor?.id;
      if (!doctorId) { setDoctorSchedule(null); return; }
      const { data } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_id", doctorId)
        .single();
      if (data) {
        setDoctorSchedule({
          days: typeof data.days === "string" ? JSON.parse(data.days) : (data.days ?? {}),
          vacations: typeof data.vacations === "string" ? JSON.parse(data.vacations) : (data.vacations ?? []),
          appointment_duration: data.appointment_duration ?? clinic?.appointment_duration ?? 30,
        });
      } else {
        setDoctorSchedule(null);
      }
    };
    fetchSchedule();
  }, [selectedDoctor, clinic]);

  // توليد slots: من جدول الطبيب إن وُجد، وإلا من إعدادات العيادة
  const timeSlots = (() => {
    if (!clinic) return [];
    if (doctorSchedule && form.date) {
      const dayIdx = new Date(form.date + "T00:00:00").getDay();
      const workDay = doctorSchedule.days[dayIdx];
      if (!workDay || !workDay.enabled) return [];
      // 24 ساعة
      if (workDay.start === "00:00" && workDay.end === "23:59") {
        return generateTimeSlots("00:00", "23:30", doctorSchedule.appointment_duration);
      }
      // دوام عادي مع تصفية الاستراحة
      const allSlots = generateTimeSlots(workDay.start, workDay.end, doctorSchedule.appointment_duration);
      if (!workDay.break_start || !workDay.break_end) return allSlots;
      const bStart = workDay.break_start;
      const bEnd   = workDay.break_end;
      return allSlots.filter(slot => slot < bStart || slot >= bEnd);
    }
    // fallback: إعدادات العيادة العامة
    return generateTimeSlots(clinic.working_hours_start, clinic.working_hours_end, clinic.appointment_duration);
  })();

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) {
      setError(tr.required);
      return;
    }
    // للعيادات المشتركة: يجب اختيار الطبيب
    if (isSharedClinic && !selectedDoctor) {
      setError(isAr ? "يرجى اختيار الطبيب أولاً" : "Please select a doctor first");
      return;
    }
    // التحقق من أن الموعد لم يُحجز بعد تحديد الوقت
    if (bookedSlots.includes(form.time)) {
      setError(tr.slotBookedErr);
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const cleanPhone = form.phone.trim();

      // ── تحقق إذا المريض مسجل مسبقاً في هذه العيادة (بالهاتف) ──
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", clinicId)
        .eq("phone", cleanPhone)
        .maybeSingle();

      // ── إنشاء الموعد بـ guest fields — المريض لا يُضاف حتى تتم الموافقة ──
      // إذا كان المريض مسجلاً مسبقاً: نربط patient_id فوراً
      // إذا كان جديداً: نخزن بياناته في guest_data حتى يوافق الطبيب
      const { error: apptError } = await supabase
        .from("appointments")
        .insert({
          user_id:      clinicId,
          patient_id:   existingPatient?.id ?? null,
          date:         form.date,
          time:         form.time,
          duration:     clinic?.appointment_duration ?? 30,
          type:         "حجز إلكتروني / Online Booking",
          notes:        form.notes.trim() || null,
          status:       "pending_approval",
          // بيانات الحاجز المؤقتة — تُستخدم لعرض الطلب للطبيب
          guest_name:   existingPatient ? null : form.name.trim(),
          guest_phone:  existingPatient ? null : cleanPhone,
          guest_data:   existingPatient ? null : {
            gender:           form.gender || null,
            has_diabetes:     form.has_diabetes,
            has_hypertension: form.has_hypertension,
          },
          // للعيادات المشتركة: تسجيل الطبيب المختار
          ...(isSharedClinic && selectedDoctor ? { doctor_id: selectedDoctor.id } : {}),
        });

      if (apptError) throw apptError;
      setSuccess(true);

      // ── إرسال إشعار للطبيب ──────────────────────────────
      try {
        const requiresApproval = clinic?.require_approval ?? false;
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: clinicId,
            title:   requiresApproval
              ? (lang === "ar" ? "🔔 طلب حجز جديد يحتاج موافقة" : "🔔 New Booking Request — Approval Needed")
              : (lang === "ar" ? "📅 موعد جديد تم حجزه"          : "📅 New Appointment Booked"),
            body: lang === "ar"
              ? `${form.name} — ${form.date} الساعة ${form.time}`
              : `${form.name} — ${form.date} at ${form.time}`,
            url:  "/appointments",
            tag:  "new-booking",
            requireInteraction: requiresApproval,
            actions: requiresApproval ? [
              { action:"approve", title: lang==="ar" ? "✅ موافقة" : "✅ Approve" }
            ] : [],
          }),
        });
      } catch (_) { /* لا نوقف الحجز إذا فشل الإشعار */ }

    } catch (err) {
      console.error(err);
      setError(tr.errorBook);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setBookedSlots([]);
    setSelectedDoctor(null);
    setForm({ name:"", phone:"", gender:"", has_diabetes:false, has_hypertension:false, date:"", time:"", notes:"" });
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"13px 16px",
    border:"1.5px solid #e0e0e0", borderRadius:12,
    fontFamily:"Rubik,sans-serif", fontSize:15,
    color:"#353535", background:"#fff",
    outline:"none", transition:"border .2s",
    direction: isAr ? "rtl" : "ltr",
  };

  const secTitle = (icon: string, text: string, color = "#0863ba") => (
    <div style={{ fontSize:11,fontWeight:700,color,textTransform:"uppercase" as const,letterSpacing:.8,marginBottom:14,display:"flex",alignItems:"center",gap:6 }}>
      {icon} {text}
    </div>
  );

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc" }}>
      <div style={{ textAlign:"center" }}>
        <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:56,height:56,marginBottom:16,borderRadius:12 }} />
        <div style={{ width:36,height:36,border:"3px solid #e0e0e0",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ── Not Found ──
  if (!clinic) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc",direction:"rtl" }}>
      <div style={{ textAlign:"center",padding:40 }}>
        <div style={{ fontSize:60,marginBottom:16 }}>🏥</div>
        <h1 style={{ fontSize:24,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.notFound}</h1>
        <p style={{ fontSize:15,color:"#aaa" }}>{tr.notFoundSub}</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;direction:${isAr?"rtl":"ltr"}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
        .book-input:focus{border-color:#0863ba !important;box-shadow:0 0 0 3px rgba(8,99,186,.1)}
        .time-slot{padding:10px;border:1.5px solid #e0e0e0;border-radius:10px;background:#fff;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;color:#555;transition:all .2s;text-align:center}
        .time-slot:hover:not(.booked){border-color:#0863ba;color:#0863ba;background:rgba(8,99,186,.04)}
        .time-slot.selected{border-color:#0863ba !important;background:#0863ba !important;color:#fff !important;font-weight:700}
        .time-slot.booked{border-color:#e8c5c5 !important;background:#fdf2f2 !important;color:#c0392b !important;cursor:not-allowed;opacity:.85;font-weight:600}
        .time-slot.booked::after{content:' •';font-size:10px}
      `}</style>

      <div style={{ minHeight:"100vh",background:"#f7f9fc",fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0863ba 0%,#054a8c 100%)",padding:"28px 24px 80px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,opacity:.06,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"24px 24px" }}/>
          <div style={{ maxWidth:540,margin:"0 auto",position:"relative",zIndex:1 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:40,height:40,borderRadius:10,border:"1px solid rgba(255,255,255,.2)" }} />
                <span style={{ fontSize:16,fontWeight:800,color:"#fff" }}>نبض | NABD</span>
              </div>
              <button onClick={()=>setLang(lang==="ar"?"en":"ar")}
                style={{ padding:"6px 14px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                {lang==="ar"?"EN":"عر"}
              </button>
            </div>
            <div style={{ color:"#fff" }}>
              <div style={{ fontSize:13,opacity:.75,marginBottom:4 }}>{isAr?"حجز موعد في":"Book at"}</div>
              <h1 style={{ fontSize:26,fontWeight:800,marginBottom:6 }}>{clinic.clinic_name}</h1>
              {/* للعيادات الفردية: عرض اسم الطبيب. للمشتركة: عرض بادج "عيادة مشتركة" */}
              {!isSharedClinic && clinic.doctor_name && (
                <div style={{ fontSize:14,opacity:.85,marginBottom:8 }}>👨‍⚕️ {clinic.doctor_name}</div>
              )}
              {isSharedClinic && doctors.length > 0 && (
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap" }}>
                  <span style={{ fontSize:12,padding:"3px 10px",background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,color:"#fff",fontWeight:600 }}>
                    🏥 {isAr ? "عيادة مشتركة" : "Shared Clinic"}
                  </span>
                  {doctors.slice(0,3).map(doc => (
                    <span key={doc.id} style={{ fontSize:12,color:"rgba(255,255,255,.85)" }}>
                      {isAr?"د. ":"Dr. "}{doc.name.split(" ")[0]}
                    </span>
                  ))}
                  {doctors.length > 3 && (
                    <span style={{ fontSize:12,color:"rgba(255,255,255,.6)" }}>+{doctors.length - 3}</span>
                  )}
                </div>
              )}
              <div style={{ display:"flex",flexWrap:"wrap",gap:14,opacity:.8,fontSize:13,marginTop:4 }}>
                {clinic.phone   && <span>📞 {clinic.phone}</span>}
                {clinic.address && <span>📍 {clinic.address}</span>}
                <span>🕐 {clinic.working_hours_start?.slice(0,5)} – {clinic.working_hours_end?.slice(0,5)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth:540,margin:"-48px auto 40px",padding:"0 16px",position:"relative",zIndex:1 }}>

          {/* نجاح */}
          {success ? (
            <div style={{ background:"#fff",borderRadius:20,padding:"48px 32px",textAlign:"center",border:"1.5px solid #eef0f3",boxShadow:"0 4px 24px rgba(8,99,186,.08)",animation:"popIn .4s ease" }}>
              <div style={{ width:80,height:80,background:"rgba(8,99,186,.1)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px" }}>📋</div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"#0863ba",marginBottom:8 }}>{tr.success}</h2>
              <p style={{ fontSize:14,color:"#888",marginBottom:20,lineHeight:1.7 }}>{tr.successSub}</p>
              {/* بادج "بانتظار الموافقة" */}
              <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(230,126,34,.1)",border:"1.5px solid rgba(230,126,34,.25)",borderRadius:20,padding:"8px 18px",marginBottom:24,fontSize:13,fontWeight:700,color:"#e67e22" }}>
                {tr.pendingNote}
              </div>
              <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px 20px",marginBottom:28,textAlign:isAr?"right":"left" }}>
                <div style={{ fontSize:13,color:"#555",marginBottom:6 }}>📅 {form.date} — {form.time}</div>
                <div style={{ fontSize:13,color:"#555",marginBottom: isSharedClinic && selectedDoctor ? 6 : 0 }}>👤 {form.name} | 📞 {form.phone}</div>
                {isSharedClinic && selectedDoctor && (
                  <div style={{ fontSize:13,color:"#0891b2",fontWeight:600 }}>
                    👨‍⚕️ {isAr?"د. ":"Dr. "}{selectedDoctor.name}
                    {selectedDoctor.specialty && <span style={{ fontWeight:400,color:"#888" }}> — {selectedDoctor.specialty}</span>}
                  </div>
                )}
              </div>
              <button onClick={resetForm}
                style={{ padding:"12px 28px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
                {tr.newBooking}
              </button>
            </div>
          ) : (
            <div style={{ background:"#fff",borderRadius:20,border:"1.5px solid #eef0f3",boxShadow:"0 4px 24px rgba(8,99,186,.08)",overflow:"hidden",animation:"fadeUp .4s ease" }}>
              <div style={{ padding:"22px 24px 18px",borderBottom:"1.5px solid #f5f7fa" }}>
                <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",marginBottom:4 }}>{tr.title}</h2>
                <p style={{ fontSize:13,color:"#aaa" }}>{tr.sub}</p>
              </div>

              <form onSubmit={handleSubmit} style={{ padding:"24px",display:"flex",flexDirection:"column",gap:0 }}>
                {error && (
                  <div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:20,display:"flex",alignItems:"center",gap:8 }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* ══ اختيار الطبيب — للعيادات المشتركة فقط ══ */}
                {isSharedClinic && (
                  <div style={{ marginBottom:24,background:"linear-gradient(135deg,rgba(8,145,178,.04),rgba(124,58,237,.04))",border:"1.5px solid rgba(8,145,178,.18)",borderRadius:14,padding:"18px" }}>
                    {secTitle("👨‍⚕️", (tr as any).selectDoctor, "#0891b2")}
                    <p style={{ fontSize:12,color:"#888",marginBottom:14,marginTop:-8 }}>{(tr as any).selectDoctorSub}</p>
                    {doctors.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"16px",color:"#aaa",fontSize:13 }}>
                        {(tr as any).noDoctors}
                      </div>
                    ) : (
                      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                        {doctors.map(doc => {
                          const isSelected = selectedDoctor?.id === doc.id;
                          const docColor = doc.color || "#0891b2";
                          return (
                            <button key={doc.id} type="button"
                              onClick={() => {
                                setSelectedDoctor(isSelected ? null : doc);
                                setForm(f => ({ ...f, date: "", time: "" }));
                                setBookedSlots([]);
                              }}
                              style={{
                                display:"flex", alignItems:"center", gap:14,
                                padding:"14px 16px", borderRadius:12, cursor:"pointer",
                                border: isSelected ? `2px solid ${docColor}` : "1.5px solid #e0e0e0",
                                background: isSelected ? `${docColor}10` : "#fff",
                                fontFamily:"Rubik,sans-serif", textAlign:"start",
                                transition:"all .2s",
                              }}>
                              <div style={{ width:44,height:44,borderRadius:12,background:docColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,flexShrink:0 }}>
                                {doc.name.split(" ").slice(0,2).map((w:string)=>w[0]).join("").toUpperCase()}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:15,fontWeight:700,color: isSelected ? docColor : "#353535" }}>
                                  {isAr ? "د. " : "Dr. "}{doc.name}
                                </div>
                                {doc.specialty && (
                                  <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{doc.specialty}</div>
                                )}
                              </div>
                              {isSelected && (
                                <div style={{ width:22,height:22,borderRadius:"50%",background:docColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ القسم 1: البيانات الشخصية ══ */}
                <div style={{ marginBottom:24 }}>
                  {secTitle("👤", tr.sec1)}

                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{tr.name}</label>
                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
                      placeholder={tr.namePh} style={inputSt} className="book-input" required />
                  </div>

                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{tr.phone}</label>
                    <input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}
                      placeholder={tr.phonePh} style={{ ...inputSt,direction:"ltr",textAlign:isAr?"right":"left" }}
                      className="book-input" required />
                  </div>

                  <div>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{tr.gender}</label>
                    <div style={{ display:"flex",gap:10 }}>
                      {(["male","female"] as const).map(g => (
                        <button key={g} type="button"
                          onClick={() => setForm({ ...form, gender: form.gender === g ? "" : g })}
                          style={{ flex:1,padding:"11px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all .2s",
                            border: form.gender === g ? "2px solid #0863ba" : "1.5px solid #e0e0e0",
                            background: form.gender === g ? "rgba(8,99,186,.06)" : "#fff",
                            color: form.gender === g ? "#0863ba" : "#888",
                          }}>
                          {g === "male" ? `👨 ${tr.male}` : `👩 ${tr.female}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ══ القسم 2: الحالة الصحية ══ */}
                <div style={{ marginBottom:24,background:"rgba(192,57,43,.03)",border:"1.5px solid rgba(192,57,43,.1)",borderRadius:14,padding:"18px" }}>
                  {secTitle("🩺", tr.sec2, "#c0392b")}

                  {/* السكري */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:"block",fontSize:13,fontWeight:600,color:"#444",marginBottom:8 }}>🍬 {tr.diabetes}</label>
                    <div style={{ display:"flex",gap:10 }}>
                      {([true,false] as const).map(val => (
                        <button key={String(val)} type="button"
                          onClick={() => setForm({ ...form, has_diabetes: val })}
                          style={{ flex:1,padding:"11px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all .2s",
                            border: form.has_diabetes === val ? `2px solid ${val?"#c0392b":"#2e7d32"}` : "1.5px solid #e0e0e0",
                            background: form.has_diabetes === val ? (val?"rgba(192,57,43,.08)":"rgba(46,125,50,.08)") : "#fff",
                            color: form.has_diabetes === val ? (val?"#c0392b":"#2e7d32") : "#888",
                          }}>
                          {val ? `✓ ${tr.yes}` : `✗ ${tr.no}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* الضغط */}
                  <div>
                    <label style={{ display:"block",fontSize:13,fontWeight:600,color:"#444",marginBottom:8 }}>💊 {tr.hypertension}</label>
                    <div style={{ display:"flex",gap:10 }}>
                      {([true,false] as const).map(val => (
                        <button key={String(val)} type="button"
                          onClick={() => setForm({ ...form, has_hypertension: val })}
                          style={{ flex:1,padding:"11px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer",transition:"all .2s",
                            border: form.has_hypertension === val ? `2px solid ${val?"#c0392b":"#2e7d32"}` : "1.5px solid #e0e0e0",
                            background: form.has_hypertension === val ? (val?"rgba(192,57,43,.08)":"rgba(46,125,50,.08)") : "#fff",
                            color: form.has_hypertension === val ? (val?"#c0392b":"#2e7d32") : "#888",
                          }}>
                          {val ? `✓ ${tr.yes}` : `✗ ${tr.no}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ══ القسم 3: تفاصيل الموعد ══ */}
                <div style={{ marginBottom:20 }}>
                  {secTitle("📅", tr.sec3)}

                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{tr.date}</label>
                    <input type="date" value={form.date} min={todayStr}
                      onChange={e => setForm({...form, date:e.target.value, time:""})}
                      style={inputSt} className="book-input" required />
                    {form.date && !isDayWorking(form.date, doctorSchedule
                        ? Object.entries(doctorSchedule.days)
                            .filter(([,d]: [string, any]) => d.enabled)
                            .map(([k]: [string, any]) => ["sun","mon","tue","wed","thu","fri","sat"][parseInt(k)])
                        : clinic.working_days) && (
                      <div style={{ fontSize:12,color:"#c0392b",marginTop:6 }}>⚠️ {tr.offDay}</div>
                    )}
                  </div>

                  {/* للعيادات المشتركة: تنبيه إذا لم يُختار طبيب بعد */}
                  {isSharedClinic && !selectedDoctor && form.date && isDayWorking(form.date, clinic.working_days) && (
                    <div style={{ padding:"12px 14px",background:"rgba(8,145,178,.06)",border:"1.5px solid rgba(8,145,178,.2)",borderRadius:10,fontSize:13,color:"#0891b2",fontWeight:600,marginBottom:10 }}>
                      👨‍⚕️ {isAr ? "اختر الطبيب أولاً لعرض المواعيد المتاحة" : "Select a doctor first to view available slots"}
                    </div>
                  )}

                  {form.date && (doctorSchedule
                      ? (() => { const di = new Date(form.date + "T00:00:00").getDay(); const wd = doctorSchedule.days[di]; return wd?.enabled && !doctorSchedule.vacations.includes(form.date); })()
                      : isDayWorking(form.date, clinic.working_days)
                    ) && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:10 }}>{tr.time}</label>
                      {/* عرض الطبيب المختار فوق الأوقات — للعيادات المشتركة */}
                      {isSharedClinic && selectedDoctor && (
                        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`${selectedDoctor.color||"#0891b2"}10`,border:`1.5px solid ${selectedDoctor.color||"#0891b2"}30`,borderRadius:10,marginBottom:12 }}>
                          <div style={{ width:28,height:28,borderRadius:7,background:selectedDoctor.color||"#0891b2",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800 }}>
                            {selectedDoctor.name.split(" ").slice(0,2).map((w:string)=>w[0]).join("").toUpperCase()}
                          </div>
                          <span style={{ fontSize:13,fontWeight:700,color:selectedDoctor.color||"#0891b2" }}>
                            {isAr?"د. ":"Dr. "}{selectedDoctor.name}
                          </span>
                        </div>
                      )}

                      {/* دليل الألوان */}
                      <div style={{ display:"flex",gap:16,marginBottom:12,padding:"10px 14px",background:"#f7f9fc",borderRadius:10,border:"1px solid #eef0f3",flexWrap:"wrap" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#555" }}>
                          <span style={{ width:14,height:14,borderRadius:4,background:"#fff",border:"1.5px solid #e0e0e0",display:"inline-block" }}/>
                          {tr.slotAvailable}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#c0392b" }}>
                          <span style={{ width:14,height:14,borderRadius:4,background:"#fdf2f2",border:"1.5px solid #e8c5c5",display:"inline-block" }}/>
                          {tr.slotBooked}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#0863ba" }}>
                          <span style={{ width:14,height:14,borderRadius:4,background:"#0863ba",border:"1.5px solid #0863ba",display:"inline-block" }}/>
                          {isAr ? "مختار" : "Selected"}
                        </div>
                      </div>

                      {loadingSlots ? (
                        <div style={{ textAlign:"center",padding:"20px 0",color:"#aaa",fontSize:13 }}>
                          <div style={{ width:24,height:24,border:"2px solid #e0e0e0",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 8px" }}/>
                          {isAr ? "جاري تحميل المواعيد..." : "Loading slots..."}
                        </div>
                      ) : (
                        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
                          {timeSlots.map(slot => {
                            const isBooked   = bookedSlots.includes(slot);
                            const isSelected = form.time === slot;
                            return (
                              <button key={slot} type="button"
                                className={`time-slot${isSelected?" selected":""}${isBooked?" booked":""}`}
                                onClick={() => {
                                  if (isBooked) {
                                    setError(tr.slotBookedErr);
                                    return;
                                  }
                                  setError("");
                                  setForm({...form, time: slot});
                                }}
                                title={isBooked ? tr.slotBooked : tr.slotAvailable}>
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{tr.notes}</label>
                    <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}
                      placeholder={tr.notesPh} rows={3}
                      style={{ ...inputSt,resize:"vertical",lineHeight:1.6 } as React.CSSProperties}
                      className="book-input" />
                  </div>
                </div>

                <button type="submit" disabled={submitting || !form.time}
                  style={{ width:"100%",padding:"15px",background:submitting||!form.time?"#a4c4e4":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:16,fontWeight:700,cursor:submitting||!form.time?"not-allowed":"pointer",transition:"all .2s",boxShadow:!form.time?"none":"0 6px 20px rgba(8,99,186,.25)" }}>
                  {submitting ? tr.submitting : tr.submit}
                </button>
              </form>
            </div>
          )}

          <div style={{ textAlign:"center",marginTop:24,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:18,height:18,borderRadius:4 }} />
            <span style={{ fontSize:12,color:"#bbb" }}>{tr.poweredBy}</span>
          </div>
        </div>
      </div>
    </>
  );
}