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
};

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
    submit:          "تأكيد الحجز",
    submitting:      "جاري الحجز...",
    required:        "يرجى تعبئة الاسم والهاتف واختيار الموعد",
    success:         "تم حجز موعدك بنجاح! ✓",
    successSub:      "تم تسجيلك في العيادة وسنتواصل معك لتأكيد الموعد",
    newBooking:      "حجز موعد آخر",
    errorBook:       "حدث خطأ، حاول مجدداً",
    poweredBy:       "مدعوم بواسطة نبض",
    offDay:          "هذا اليوم خارج أوقات عمل العيادة",
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
    submit:          "Confirm Booking",
    submitting:      "Booking...",
    required:        "Please fill name, phone and select a time",
    success:         "Appointment Booked Successfully! ✓",
    successSub:      "You've been registered. We'll contact you to confirm.",
    newBooking:      "Book Another Appointment",
    errorBook:       "An error occurred, please try again",
    poweredBy:       "Powered by NABD",
    offDay:          "This day is outside clinic working hours",
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

  const isAr = lang === "ar";
  const tr   = T[lang];

  useEffect(() => {
    if (!clinicId) return;
    supabase
      .from("clinic_profiles")
      .select("*")
      .eq("id", clinicId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setClinic(null);
        else setClinic(data as ClinicProfile);
        setLoading(false);
      });
  }, [clinicId]);

  const timeSlots = clinic
    ? generateTimeSlots(clinic.working_hours_start, clinic.working_hours_end, clinic.appointment_duration)
    : [];

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) {
      setError(tr.required);
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      // ── 1. تحقق إذا المريض مسجل مسبقاً بنفس الهاتف ──────
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", clinicId)
        .eq("phone", form.phone.trim())
        .maybeSingle();

      let patientId: number;

      if (existing) {
        patientId = existing.id;
      } else {
        // ── 2. تسجيل المريض تلقائياً ──────────────────────
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            user_id:          clinicId,
            name:             form.name.trim(),
            phone:            form.phone.trim(),
            gender:           form.gender || null,
            has_diabetes:     form.has_diabetes,
            has_hypertension: form.has_hypertension,
            notes:            form.notes.trim() || null,
            is_hidden:        false,
          })
          .select("id")
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      // ── 3. إنشاء الموعد مرتبطاً بالمريض ─────────────────
      const { error: apptError } = await supabase
        .from("appointments")
        .insert({
          user_id:    clinicId,
          patient_id: patientId,
          date:       form.date,
          time:       form.time,
          duration:   clinic?.appointment_duration ?? 30,
          type:       "حجز إلكتروني / Online Booking",
          notes:      form.notes.trim() || null,
          status:     "scheduled",
        });

      if (apptError) throw apptError;
      setSuccess(true);

    } catch (err) {
      console.error(err);
      setError(tr.errorBook);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
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
        <div style={{ fontSize:40,marginBottom:16 }}>💗</div>
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
        .time-slot:hover{border-color:#0863ba;color:#0863ba;background:rgba(8,99,186,.04)}
        .time-slot.selected{border-color:#0863ba !important;background:#0863ba !important;color:#fff !important;font-weight:700}
      `}</style>

      <div style={{ minHeight:"100vh",background:"#f7f9fc",fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0863ba 0%,#054a8c 100%)",padding:"28px 24px 80px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,opacity:.06,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"24px 24px" }}/>
          <div style={{ maxWidth:540,margin:"0 auto",position:"relative",zIndex:1 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:40,height:40,background:"rgba(255,255,255,.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"1px solid rgba(255,255,255,.2)" }}>💗</div>
                <span style={{ fontSize:16,fontWeight:800,color:"#fff" }}>نبض | NABD</span>
              </div>
              <button onClick={()=>setLang(lang==="ar"?"en":"ar")}
                style={{ padding:"6px 14px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                {lang==="ar"?"EN":"عر"}
              </button>
            </div>
            <div style={{ color:"#fff" }}>
              <div style={{ fontSize:13,opacity:.75,marginBottom:4 }}>{isAr?"حجز موعد في":"Book at"}</div>
              <h1 style={{ fontSize:26,fontWeight:800,marginBottom:4 }}>{clinic.clinic_name}</h1>
              {clinic.doctor_name && <div style={{ fontSize:14,opacity:.85 }}>👨‍⚕️ {clinic.doctor_name}</div>}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:540,margin:"-48px auto 40px",padding:"0 16px",position:"relative",zIndex:1 }}>

          {/* معلومات العيادة */}
          <div style={{ background:"#fff",borderRadius:16,padding:"14px 20px",marginBottom:16,border:"1.5px solid #eef0f3",boxShadow:"0 4px 24px rgba(8,99,186,.08)",display:"flex",gap:20,flexWrap:"wrap" }}>
            {clinic.phone   && <div style={{ fontSize:13,color:"#555" }}>📞 {clinic.phone}</div>}
            {clinic.address && <div style={{ fontSize:13,color:"#555" }}>📍 {clinic.address}</div>}
            <div style={{ fontSize:13,color:"#555" }}>🕐 {clinic.working_hours_start?.slice(0,5)} – {clinic.working_hours_end?.slice(0,5)}</div>
          </div>

          {/* نجاح */}
          {success ? (
            <div style={{ background:"#fff",borderRadius:20,padding:"48px 32px",textAlign:"center",border:"1.5px solid #eef0f3",boxShadow:"0 4px 24px rgba(8,99,186,.08)",animation:"popIn .4s ease" }}>
              <div style={{ width:80,height:80,background:"rgba(46,125,50,.1)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 20px" }}>✅</div>
              <h2 style={{ fontSize:22,fontWeight:800,color:"#2e7d32",marginBottom:8 }}>{tr.success}</h2>
              <p style={{ fontSize:14,color:"#888",marginBottom:28,lineHeight:1.7 }}>{tr.successSub}</p>
              <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px 20px",marginBottom:28,textAlign:isAr?"right":"left" }}>
                <div style={{ fontSize:13,color:"#555",marginBottom:6 }}>📅 {form.date} — {form.time}</div>
                <div style={{ fontSize:13,color:"#555" }}>👤 {form.name} | 📞 {form.phone}</div>
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
                    {form.date && !isDayWorking(form.date, clinic.working_days) && (
                      <div style={{ fontSize:12,color:"#c0392b",marginTop:6 }}>⚠️ {tr.offDay}</div>
                    )}
                  </div>

                  {form.date && isDayWorking(form.date, clinic.working_days) && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:10 }}>{tr.time}</label>
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
                        {timeSlots.map(slot => (
                          <button key={slot} type="button"
                            className={`time-slot${form.time===slot?" selected":""}`}
                            onClick={()=>setForm({...form,time:slot})}>
                            {slot}
                          </button>
                        ))}
                      </div>
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

          <div style={{ textAlign:"center",marginTop:24,fontSize:12,color:"#bbb" }}>💗 {tr.poweredBy}</div>
        </div>
      </div>
    </>
  );
}
