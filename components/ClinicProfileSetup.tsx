"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// Clinic Profile Setup — يُضاف في صفحة Admin
// يتيح للعيادة إعداد بياناتها التي تظهر في صفحة الحجز
// ============================================================

type Lang = "ar" | "en";

const DAYS = [
  { key:"sun", ar:"الأحد",    en:"Sunday"    },
  { key:"mon", ar:"الإثنين",  en:"Monday"    },
  { key:"tue", ar:"الثلاثاء", en:"Tuesday"   },
  { key:"wed", ar:"الأربعاء", en:"Wednesday" },
  { key:"thu", ar:"الخميس",   en:"Thursday"  },
  { key:"fri", ar:"الجمعة",   en:"Friday"    },
  { key:"sat", ar:"السبت",    en:"Saturday"  },
];

export default function ClinicProfileSetup({ lang = "ar" }: { lang?: Lang }) {
  const isAr = lang === "ar";

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [clinicId, setClinicId] = useState("");

  const [form, setForm] = useState({
    clinic_name:          "",
    doctor_name:          "",
    phone:                "",
    address:              "",
    working_hours_start:  "09:00",
    working_hours_end:    "17:00",
    working_days:         ["sun","mon","tue","wed","thu"] as string[],
    appointment_duration: 30,
  });

  // جلب البيانات الحالية
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setClinicId(user.id);
      const { data } = await supabase
        .from("clinic_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setForm({
        clinic_name:         data.clinic_name          ?? "",
        doctor_name:         data.doctor_name          ?? "",
        phone:               data.phone                ?? "",
        address:             data.address              ?? "",
        working_hours_start: data.working_hours_start?.slice(0,5) ?? "09:00",
        working_hours_end:   data.working_hours_end?.slice(0,5)   ?? "17:00",
        working_days:        data.working_days         ?? ["sun","mon","tue","wed","thu"],
        appointment_duration:data.appointment_duration ?? 30,
      });
      setLoading(false);
    });
  }, []);

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const handleSave = async () => {
    if (!form.clinic_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinic_profiles")
        .upsert({
          id: clinicId,
          ...form,
        });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = typeof window !== "undefined" && clinicId
    ? `${window.location.origin}/book/${clinicId}`
    : "";

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"11px 14px",
    border:"1.5px solid #e0e0e0", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14,
    color:"#353535", background:"#fff",
    outline:"none", transition:"border .2s",
    direction: isAr ? "rtl" : "ltr",
  };

  if (loading) return (
    <div style={{ padding:40,textAlign:"center" }}>
      <div style={{ width:32,height:32,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth:640,fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr" }}>

      {/* رابط الحجز */}
      {bookingUrl && (
        <div style={{ background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.04))",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:16,padding:"18px 20px",marginBottom:24 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"#0863ba",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>
            {isAr ? "🔗 رابط الحجز الخاص بعيادتك" : "🔗 Your Clinic Booking Link"}
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <span style={{ flex:1,fontSize:13,color:"#354",direction:"ltr",wordBreak:"break-all" }}>{bookingUrl}</span>
            <button
              onClick={()=>navigator.clipboard.writeText(bookingUrl)}
              style={{ flexShrink:0,padding:"7px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}
            >
              {isAr ? "نسخ" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* بيانات العيادة */}
      <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",marginBottom:16 }}>
        <div style={{ padding:"18px 22px",borderBottom:"1.5px solid #eef0f3",background:"#f9fafb" }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>
            {isAr ? "🏥 بيانات العيادة" : "🏥 Clinic Information"}
          </h3>
          <p style={{ fontSize:12,color:"#aaa",marginTop:4 }}>
            {isAr ? "تظهر هذه البيانات في صفحة حجز المواعيد" : "This info appears on the patient booking page"}
          </p>
        </div>
        <div style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:16 }}>
          <div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
              {isAr ? "اسم العيادة *" : "Clinic Name *"}
            </label>
            <input value={form.clinic_name}
              onChange={e=>setForm({...form,clinic_name:e.target.value})}
              placeholder={isAr?"مثال: عيادة نور":"e.g. Nour Clinic"}
              style={inputSt}
            />
          </div>
          <div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
              {isAr ? "اسم الطبيب" : "Doctor Name"}
            </label>
            <input value={form.doctor_name}
              onChange={e=>setForm({...form,doctor_name:e.target.value})}
              placeholder={isAr?"د. محمد الأحمد":"Dr. Mohammad Al-Ahmad"}
              style={inputSt}
            />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
                {isAr ? "رقم الهاتف" : "Phone"}
              </label>
              <input value={form.phone}
                onChange={e=>setForm({...form,phone:e.target.value})}
                placeholder="0501234567" style={{ ...inputSt,direction:"ltr" }}
              />
            </div>
            <div>
              <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
                {isAr ? "العنوان" : "Address"}
              </label>
              <input value={form.address}
                onChange={e=>setForm({...form,address:e.target.value})}
                placeholder={isAr?"الرياض، حي النزهة":"Riyadh, Al-Nuzha"}
                style={inputSt}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ساعات ومدة العمل */}
      <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",marginBottom:16 }}>
        <div style={{ padding:"18px 22px",borderBottom:"1.5px solid #eef0f3",background:"#f9fafb" }}>
          <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>
            {isAr ? "🕐 أوقات العمل" : "🕐 Working Hours"}
          </h3>
        </div>
        <div style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:16 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
            <div>
              <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
                {isAr ? "من" : "From"}
              </label>
              <input type="time" value={form.working_hours_start}
                onChange={e=>setForm({...form,working_hours_start:e.target.value})}
                style={{ ...inputSt,direction:"ltr" }}
              />
            </div>
            <div>
              <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
                {isAr ? "إلى" : "To"}
              </label>
              <input type="time" value={form.working_hours_end}
                onChange={e=>setForm({...form,working_hours_end:e.target.value})}
                style={{ ...inputSt,direction:"ltr" }}
              />
            </div>
            <div>
              <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>
                {isAr ? "مدة الموعد (دقيقة)" : "Appt Duration (min)"}
              </label>
              <select value={form.appointment_duration}
                onChange={e=>setForm({...form,appointment_duration:Number(e.target.value)})}
                style={{ ...inputSt,cursor:"pointer" }}
              >
                {[15,20,30,45,60,90].map(d=>(
                  <option key={d} value={d}>{d} {isAr?"دقيقة":"min"}</option>
                ))}
              </select>
            </div>
          </div>

          {/* أيام العمل */}
          <div>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:10 }}>
              {isAr ? "أيام العمل" : "Working Days"}
            </label>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {DAYS.map(d => {
                const active = form.working_days.includes(d.key);
                return (
                  <button key={d.key} type="button" onClick={()=>toggleDay(d.key)}
                    style={{ padding:"8px 14px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",
                      border: active?"2px solid #0863ba":"1.5px solid #e0e0e0",
                      background: active?"#0863ba":"#fff",
                      color: active?"#fff":"#888",
                    }}
                  >
                    {isAr ? d.ar : d.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* زر الحفظ */}
      <button onClick={handleSave} disabled={saving || !form.clinic_name.trim()}
        style={{ width:"100%",padding:"14px",background:saved?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all .3s",boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}
      >
        {saved ? (isAr?"✓ تم الحفظ!":"✓ Saved!") : saving ? (isAr?"جاري الحفظ...":"Saving...") : (isAr?"حفظ الإعدادات":"Save Settings")}
      </button>
    </div>
  );
}
