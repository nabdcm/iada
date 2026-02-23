"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment } from "@/lib/supabase";

type Lang = "ar" | "en";
type Status = "scheduled" | "completed" | "cancelled" | "no-show";

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"الرئيسية", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", admin:"لوحة المدير" },
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
      date:"التاريخ *", time:"الوقت *",
      duration:"المدة (بالدقائق) *", type:"نوع الزيارة",
      typePh:"مثال: متابعة، فحص عام", notes:"ملاحظات", notesPh:"أي ملاحظات...",
      save:"حفظ الموعد", update:"تحديث الموعد", cancel:"إلغاء",
      required:"المريض والتاريخ والوقت مطلوبة",
      delete:"حذف الموعد", deleting:"جاري الحذف...",
      deleteConfirmTitle:"تأكيد حذف الموعد",
      deleteConfirmMsg:"هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذه العملية.",
      deleteConfirm:"نعم، احذف",
      deleteCancel:"لا، تراجع",
    },
    stats:{ total:"مواعيد الشهر", today:"مواعيد اليوم", completed:"مكتملة", pending:"قادمة" },
    signOut:"تسجيل الخروج", selectedDay:"المحدد", appointments:"مواعيد", appt:"موعد",
    notification:{ title:"تذكير بموعد", msg:"سيحين موعد المريض", in:"خلال ١٥ دقيقة", dismiss:"تجاهل" },
    errorSave:"حدث خطأ أثناء الحفظ", errorLoad:"حدث خطأ أثناء التحميل",
    errorDelete:"حدث خطأ أثناء الحذف",
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", admin:"Admin Panel" },
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
      date:"Date *", time:"Time *",
      duration:"Duration (minutes) *", type:"Visit Type",
      typePh:"e.g. Follow-up, General", notes:"Notes", notesPh:"Any notes...",
      save:"Save Appointment", update:"Update Appointment", cancel:"Cancel",
      required:"Patient, date and time are required",
      delete:"Delete Appointment", deleting:"Deleting...",
      deleteConfirmTitle:"Confirm Delete",
      deleteConfirmMsg:"Are you sure you want to delete this appointment? This cannot be undone.",
      deleteConfirm:"Yes, Delete",
      deleteCancel:"No, Cancel",
    },
    stats:{ total:"Monthly Appts", today:"Today's Appts", completed:"Completed", pending:"Upcoming" },
    signOut:"Sign Out", selectedDay:"Selected", appointments:"Appointments", appt:"appt",
    notification:{ title:"Appointment Reminder", msg:"Upcoming appointment for", in:"in 15 minutes", dismiss:"Dismiss" },
    errorSave:"Error saving appointment", errorLoad:"Error loading data",
    errorDelete:"Error deleting appointment",
  },
} as const;

const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085"];
const getColor    = (id: number) => AVT_COLORS[(id - 1) % AVT_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
const toKey       = (y: number, m: number, d: number) =>
  `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

const now      = new Date();
const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
const MAX_PER_DAY = 8;
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang, activePage = "appointments" }: {
  lang: Lang; setLang: (l: Lang) => void; activePage?: string;
}) {
  const tr = T[lang]; const isAr = lang === "ar";
  const [col, setCol] = useState(false);
  const navItems: { key: keyof typeof tr.nav; icon: string; href: string }[] = [
    { key:"dashboard",    icon:"⊞", href:"/dashboard"    },
    { key:"patients",     icon:"👥", href:"/patients"     },
    { key:"appointments", icon:"📅", href:"/appointments" },
    { key:"payments",     icon:"💳", href:"/payments"     },
  ];
  return (
    <aside style={{ width:col?70:240,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",transition:"width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,right:isAr?0:undefined,left:isAr?undefined:0,zIndex:50,boxShadow:"4px 0 24px rgba(8,99,186,.06)" }}>
      <div style={{ padding:col?"24px 0":"24px 20px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72 }}>
        {!col&&<div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }}>💗</div><div><div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div><div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div></div></div>}
        {col&&<div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💗</div>}
        {!col&&<button onClick={()=>setCol(!col)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>{isAr?"›":"‹"}</button>}
      </div>
      <nav style={{ flex:1,padding:"16px 12px" }}>
        {navItems.map(item=>{
          const isActive = item.key===activePage;
          return (
            <a key={item.key} href={item.href} style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
              {isActive&&<div style={{ position:"absolute",right:isAr?-12:undefined,left:isAr?undefined:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }}/>}
              <span style={{ fontSize:18,flexShrink:0 }}>{item.icon}</span>
              {!col&&<span>{tr.nav[item.key]}</span>}
            </a>
          );
        })}
        <div style={{ height:1,background:"#eef0f3",margin:"12px 0" }}/>
        <a href="/admin" style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,textDecoration:"none",color:"#888",fontSize:14 }}>
          <span style={{ fontSize:18 }}>⚙️</span>{!col&&<span>{tr.nav.admin}</span>}
        </a>
      </nav>
      <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
        {!col&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
        <div style={{ display:"flex",alignItems:"center",gap:col?0:10,justifyContent:col?"center":"flex-start",padding:col?8:"10px 12px",borderRadius:10,background:"#f7f9fc" }}>
          <div style={{ width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#0863ba,#a4c4e4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:700,flexShrink:0 }}>د</div>
          {!col&&<div style={{ flex:1,overflow:"hidden" }}>
            <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lang==="ar"?"الدكتور / العيادة":"Dr. / Clinic"}</div>
            <button onClick={()=>{ supabase.auth.signOut(); window.location.href="/login"; }} style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#c0392b",fontFamily:"Rubik,sans-serif",padding:0,fontWeight:500 }}>{tr.signOut} →</button>
          </div>}
        </div>
      </div>
    </aside>
  );
}

// ─── Field component ──────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div style={{ marginBottom:16, flex:half?"1":undefined }}>
    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
    {children}
  </div>
);

type ApptForm = {
  patient_id: number | "";
  date: string;
  time: string;
  duration: number;
  type: string;
  notes: string;
  status: Status;
};

// ─── Modal إضافة/تعديل/حذف موعد ─────────────────────────
function AppointmentModal({ lang, appt, defaultDate, patients, onSave, onClose, onStatusChange, onDelete, saving }: {
  lang: Lang;
  appt: Appointment | null;
  defaultDate: string;
  patients: Patient[];
  onSave: (form: ApptForm, id?: number) => void;
  onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void;   // ← جديد
  saving: boolean;
}) {
  const tr   = T[lang];
  const isAr = lang === "ar";
  const isEdit = !!appt?.id;

  const [form, setForm] = useState<ApptForm>({
    patient_id: appt?.patient_id ?? "",
    date:       appt?.date       ?? defaultDate,
    time:       appt?.time       ?? "09:00",
    duration:   appt?.duration   ?? 30,
    type:       appt?.type       ?? "",
    notes:      appt?.notes      ?? "",
    status:     appt?.status     ?? "scheduled",
  });
  const [error,          setError]          = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);  // ← جديد

  const handleSave = () => {
    if (!form.patient_id || !form.date || !form.time) { setError(tr.modal.required); return; }
    onSave(form, appt?.id);
  };

  const inputSt = useMemo((): React.CSSProperties => ({
    width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
    outline:"none", transition:"border .2s", direction:isAr?"rtl":"ltr",
  }), [isAr]);

  // ── شاشة تأكيد الحذف ─────────────────────────────────
  if (showDeleteConfirm) {
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div onClick={()=>setShowDeleteConfirm(false)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
        <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:380,padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(192,57,43,.15)",animation:"modalIn .25s ease",direction:isAr?"rtl":"ltr" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px" }}>🗑️</div>
          <h3 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:10 }}>{tr.modal.deleteConfirmTitle}</h3>
          <p style={{ fontSize:14,color:"#888",lineHeight:1.7,marginBottom:28 }}>{tr.modal.deleteConfirmMsg}</p>
          <div style={{ display:"flex",gap:12 }}>
            <button
              onClick={() => { onDelete(appt!.id); }}
              style={{ flex:1,padding:"13px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(192,57,43,.25)" }}
            >
              {tr.modal.deleteConfirm}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{ flex:1,padding:"13px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}
            >
              {tr.modal.deleteCancel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>

        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isEdit?tr.modal.editTitle:tr.modal.addTitle}</h2>
            {isEdit&&<p style={{ fontSize:11,color:"#aaa",marginTop:2 }}>ID: #{appt!.id}</p>}
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            {/* زر الحذف — يظهر فقط عند التعديل */}
            {isEdit && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                title={tr.modal.delete}
                style={{ width:36,height:36,borderRadius:8,background:"rgba(192,57,43,.08)",border:"1.5px solid rgba(192,57,43,.2)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",color:"#c0392b" }}
                onMouseEnter={e=>{ e.currentTarget.style.background="rgba(192,57,43,.15)"; e.currentTarget.style.borderColor="rgba(192,57,43,.4)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.background="rgba(192,57,43,.08)"; e.currentTarget.style.borderColor="rgba(192,57,43,.2)"; }}
              >
                🗑️
              </button>
            )}
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}

          <Field label={tr.modal.patient}>
            <select
              value={form.patient_id}
              onChange={e => setForm({ ...form, patient_id: Number(e.target.value) })}
              style={{ ...inputSt, cursor:"pointer" }}
            >
              <option value="">{tr.modal.selectPatient}</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>

          <div style={{ display:"flex",gap:12 }}>
            <Field label={tr.modal.date} half>
              <input type="date" value={form.date}
                onChange={e=>setForm({...form,date:e.target.value})}
                style={inputSt} className="appt-input"
              />
            </Field>
            <Field label={tr.modal.time} half>
              <input type="time" value={form.time}
                onChange={e=>setForm({...form,time:e.target.value})}
                style={inputSt} className="appt-input"
              />
            </Field>
          </div>

          <div style={{ display:"flex",gap:12 }}>
            <Field label={tr.modal.duration} half>
              <select value={form.duration}
                onChange={e=>setForm({...form,duration:Number(e.target.value)})}
                style={{ ...inputSt,cursor:"pointer" }}
              >
                {[15,20,30,45,60,90,120].map(d=>(
                  <option key={d} value={d}>{d} {tr.duration.min}</option>
                ))}
              </select>
            </Field>
            <Field label={tr.modal.type} half>
              <input value={form.type}
                onChange={e=>setForm({...form,type:e.target.value})}
                placeholder={tr.modal.typePh} style={inputSt} className="appt-input"
              />
            </Field>
          </div>

          <Field label={tr.modal.notes}>
            <textarea value={form.notes}
              onChange={e=>setForm({...form,notes:e.target.value})}
              placeholder={tr.modal.notesPh} rows={3}
              className="appt-input"
              style={{ ...inputSt,resize:"vertical",lineHeight:1.6 } as React.CSSProperties}
            />
          </Field>

          {/* أزرار تغيير الحالة */}
          {isEdit && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#aaa",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>
                {lang==="ar" ? "تغيير حالة الموعد" : "Update Status"}
              </div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {([
                  { status:"scheduled" as Status, label: lang==="ar"?"✓ جاري (محدد)":"✓ Scheduled",   color:"#0863ba", bg:"rgba(8,99,186,.08)"    },
                  { status:"completed" as Status, label: lang==="ar"?"✓ اكتمل الموعد":"✓ Completed",  color:"#2e7d32", bg:"rgba(46,125,50,.08)"   },
                  { status:"cancelled" as Status, label: lang==="ar"?"✕ تم الإلغاء":"✕ Cancelled",    color:"#c0392b", bg:"rgba(192,57,43,.08)"   },
                  { status:"no-show"  as Status,  label: lang==="ar"?"⊘ لم يحضر":"⊘ No-Show",         color:"#888",    bg:"rgba(136,136,136,.08)" },
                ]).map(s => {
                  const isCurrent = appt!.status === s.status;
                  return (
                    <button key={s.status}
                      onClick={()=>{ if(!isCurrent) onStatusChange(appt!.id, s.status); }}
                      style={{
                        padding:"8px 14px", borderRadius:10, fontFamily:"Rubik,sans-serif",
                        fontSize:12, fontWeight:600, cursor:isCurrent?"default":"pointer",
                        border: isCurrent ? `2px solid ${s.color}` : `1.5px solid ${s.color}30`,
                        background: isCurrent ? s.color : s.bg,
                        color: isCurrent ? "#fff" : s.color,
                        opacity: isCurrent ? 1 : 0.85,
                        transition:"all .2s",
                        boxShadow: isCurrent ? `0 4px 12px ${s.color}40` : "none",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"13px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
            onMouseEnter={e=>{if(!saving)e.currentTarget.style.background="#054a8c"}}
            onMouseLeave={e=>{e.currentTarget.style.background="#0863ba"}}
          >
            {saving ? (lang==="ar" ? "جاري الحفظ..." : "Saving...") : isEdit ? tr.modal.update : tr.modal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.modal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Share Modal ─────────────────────────────────────────
function ShareModal({ lang, clinicId, copied, setCopied, onClose }: {
  lang: Lang; clinicId: string; copied: boolean;
  setCopied: (v: boolean) => void; onClose: () => void;
}) {
  const isAr = lang === "ar";
  const bookingUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${clinicId}`
    : `/book/${clinicId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const msg = isAr
      ? `مرحباً، يمكنك حجز موعد في عيادتنا عبر الرابط التالي:%0A${bookingUrl}`
      : `Hello, you can book an appointment at our clinic via:%0A${bookingUrl}`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)",overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0863ba,#054a8c)",padding:"28px 28px 24px",textAlign:"center",position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute",top:16,left:isAr?16:undefined,right:isAr?undefined:16,width:32,height:32,borderRadius:8,background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",fontSize:15,color:"#fff" }}>✕</button>
          <div style={{ width:60,height:60,borderRadius:16,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 14px",border:"1px solid rgba(255,255,255,.2)" }}>🔗</div>
          <h2 style={{ fontSize:18,fontWeight:800,color:"#fff",marginBottom:6 }}>
            {isAr ? "رابط حجز المواعيد" : "Appointment Booking Link"}
          </h2>
          <p style={{ fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:400 }}>
            {isAr ? "شارك هذا الرابط مع مرضاك ليحجزوا مواعيدهم بأنفسهم" : "Share this link so patients can book appointments themselves"}
          </p>
        </div>
        <div style={{ padding:"24px 28px" }}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:8 }}>
              {isAr ? "رابط الحجز الخاص بعيادتك" : "Your Clinic Booking Link"}
            </label>
            <div style={{ display:"flex",gap:8,alignItems:"center",background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:12,padding:"10px 14px" }}>
              <span style={{ flex:1,fontSize:13,color:"#0863ba",fontWeight:500,wordBreak:"break-all",direction:"ltr",textAlign:"left" }}>{bookingUrl}</span>
              <button onClick={handleCopy}
                style={{ flexShrink:0,padding:"7px 14px",background:copied?"#2e7d32":"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .3s",whiteSpace:"nowrap" }}
              >
                {copied ? (isAr ? "✓ تم النسخ!" : "✓ Copied!") : (isAr ? "نسخ" : "Copy")}
              </button>
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:8 }}>{isAr ? "مشاركة عبر" : "Share via"}</label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button onClick={handleWhatsApp}
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",background:"rgba(37,211,102,.1)",color:"#128c7e",border:"1.5px solid rgba(37,211,102,.25)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                <span style={{ fontSize:18 }}>📱</span> WhatsApp
              </button>
              <button onClick={handleCopy}
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"12px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                <span style={{ fontSize:18 }}>📋</span> {isAr ? "نسخ الرابط" : "Copy Link"}
              </button>
            </div>
          </div>
          <div style={{ background:"rgba(8,99,186,.05)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:12,padding:"12px 16px",display:"flex",gap:10,alignItems:"flex-start" }}>
            <span style={{ fontSize:16,flexShrink:0 }}>💡</span>
            <p style={{ fontSize:12,color:"#555",lineHeight:1.7,margin:0 }}>
              {isAr
                ? "هذا الرابط خاص بعيادتك فقط. المرضى الذين يفتحونه سيرون فورم الحجز ويمكنهم اختيار التاريخ والوقت المناسب."
                : "This link is unique to your clinic. Patients who open it will see a booking form and can choose their preferred date and time."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast تنبيه ─────────────────────────────────────────
function NotificationToast({ lang, appt, patientName, onDismiss }: {
  lang: Lang; appt: Appointment; patientName: string; onDismiss: () => void;
}) {
  const tr = T[lang];
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ setTimeout(()=>setVisible(true),50); },[]);
  return (
    <div style={{ position:"fixed",bottom:24,right:24,zIndex:300,background:"#fff",borderRadius:16,padding:"16px 20px",boxShadow:"0 8px 40px rgba(8,99,186,.2)",border:"1.5px solid rgba(8,99,186,.15)",maxWidth:320,display:"flex",gap:14,alignItems:"flex-start",transform:visible?"translateY(0)":"translateY(80px)",opacity:visible?1:0,transition:"all .35s cubic-bezier(.4,0,.2,1)" }}>
      <div style={{ width:44,height:44,borderRadius:12,background:"rgba(8,99,186,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🔔</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13,fontWeight:700,color:"#0863ba",marginBottom:4 }}>{tr.notification.title}</div>
        <div style={{ fontSize:13,color:"#353535",lineHeight:1.5 }}>
          {tr.notification.msg} <strong>{patientName}</strong><br/>
          <span style={{ fontSize:12,color:"#888" }}>{appt.time} • {tr.notification.in}</span>
        </div>
        <button onClick={onDismiss} style={{ marginTop:10,padding:"6px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
          {tr.notification.dismiss}
        </button>
      </div>
      <button onClick={onDismiss} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:16,padding:2 }}>✕</button>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AppointmentsPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = T[lang];

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [clinicId,     setClinicId]     = useState("");
  const [shareModal,   setShareModal]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [viewMonth,    setViewMonth]    = useState(now.getMonth());
  const [viewYear,     setViewYear]     = useState(now.getFullYear());
  const [selectedKey,  setSelectedKey]  = useState(todayKey);
  const [addModal,     setAddModal]     = useState(false);
  const [editAppt,     setEditAppt]     = useState<Appointment | null>(null);
  const [notification, setNotification] = useState<Appointment | null>(null);

  const loadPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
    const { data } = await supabase
      .from("patients")
      .select("id, name, user_id, has_diabetes, has_hypertension, is_hidden, created_at")
      .eq("user_id", userId)
      .eq("is_hidden", false)
      .order("name");
    setPatients((data ?? []) as Patient[]);
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw error;
      setAppointments((data ?? []) as Appointment[]);
    } catch (err) {
      console.error("Error loading appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    loadAppointments();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setClinicId(user.id);
    });
  }, []);

  useEffect(() => {
    if (appointments.length === 0) return;
    const timer = setTimeout(() => {
      const next = appointments.find(a => a.date === todayKey && a.status === "scheduled");
      if (next) setNotification(next);
    }, 3000);
    return () => clearTimeout(timer);
  }, [appointments]);

  // ── حفظ موعد ─────────────────────────────────────────
  const handleSave = async (form: ApptForm, id?: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      if (id) {
        const { error } = await supabase
          .from("appointments")
          .update({
            patient_id: form.patient_id,
            date:       form.date,
            time:       form.time,
            duration:   form.duration,
            type:       form.type  || null,
            notes:      form.notes || null,
            status:     form.status,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("appointments")
          .insert({
            user_id:    userId,
            patient_id: form.patient_id,
            date:       form.date,
            time:       form.time,
            duration:   form.duration,
            type:       form.type  || null,
            notes:      form.notes || null,
            status:     "scheduled",
          });
        if (error) throw error;
      }

      await loadAppointments();
      setSelectedKey(form.date);
    } catch (err) {
      console.error("Error saving appointment:", err);
    } finally {
      setSaving(false);
      setAddModal(false);
      setEditAppt(null);
    }
  };

  // ── تغيير حالة موعد ──────────────────────────────────
  const handleStatusChange = async (id: number, status: Status) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setEditAppt(null);
    }
  };

  // ── حذف موعد ← جديد ─────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      // إزالة فورية من الـ state بدون reload
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error deleting appointment:", err);
      alert(isAr ? tr.errorDelete : tr.errorDelete);
    } finally {
      setEditAppt(null);
      setAddModal(false);
    }
  };

  // ── Computed ──────────────────────────────────────────
  const dayAppointments = appointments
    .filter(a => a.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  const countByKey: Record<string, number> = {};
  appointments.forEach(a => { countByKey[a.date] = (countByKey[a.date] || 0) + 1; });

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const monthKey   = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthAppts = appointments.filter(a => a.date.startsWith(monthKey));

  const stats = {
    total:     monthAppts.length,
    today:     appointments.filter(a => a.date === todayKey).length,
    completed: monthAppts.filter(a => a.status === "completed").length,
    pending:   appointments.filter(a => a.status === "scheduled" && a.date >= todayKey).length,
  };

  const getPatientName = (pid: number) =>
    patients.find(p => p.id === pid)?.name ?? "—";

  const statusStyle = (s: string) => ({
    scheduled: { bg:"rgba(8,99,186,.06)",  border:"rgba(8,99,186,.2)"  },
    completed: { bg:"rgba(46,125,50,.06)", border:"rgba(46,125,50,.2)" },
    cancelled: { bg:"rgba(192,57,43,.04)", border:"rgba(192,57,43,.15)"},
    "no-show": { bg:"rgba(136,136,136,.04)", border:"rgba(136,136,136,.15)" },
  }[s] ?? { bg:"#f7f9fc", border:"#eef0f3" });

  const selDate = selectedKey.split("-");
  const selLabel = selDate.length === 3
    ? `${parseInt(selDate[2])} ${tr.months[parseInt(selDate[1])-1]} ${selDate[0]}`
    : selectedKey;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; direction: ${isAr ? "rtl" : "ltr"}; }
        @keyframes modalIn { from { opacity: 0; transform: scale(.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin    { to   { transform: rotate(360deg); } }
        .appt-block { border: 1.5px solid; border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: all .18s; }
        .appt-block:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(8,99,186,.12); }
        .appt-input:focus { border-color: #0863ba !important; box-shadow: 0 0 0 3px rgba(8,99,186,.1); }
        .cal-day { border-radius: 8px; cursor: pointer; transition: all .15s; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
        .cal-day:hover { background: rgba(8,99,186,.06); }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc",display:"flex" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="appointments" />

        <main style={{ [isAr?"marginRight":"marginLeft"]:240,flex:1,padding:"0 32px 48px",minHeight:"100vh",maxWidth:"calc(100vw - 240px)" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"20px 0 16px",borderBottom:"1.5px solid #eef0f3",marginBottom:24 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                <p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setShareModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}>
                  🔗 {isAr ? "رابط الحجز" : "Booking Link"}
                </button>
                <button onClick={()=>setAddModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}>
                  ＋ {tr.addAppointment}
                </button>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24,animation:"fadeUp .4s ease" }}>
            {[
              { label:tr.stats.total,     value:stats.total,     icon:"📅", color:"#0863ba" },
              { label:tr.stats.today,     value:stats.today,     icon:"🕐", color:"#e67e22" },
              { label:tr.stats.completed, value:stats.completed, icon:"✅", color:"#2e7d32" },
              { label:tr.stats.pending,   value:stats.pending,   icon:"⏳", color:"#7b2d8b" },
            ].map((s,i) => (
              <div key={i} style={{ background:"#fff",borderRadius:14,padding:"18px 20px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:20 }}>{s.icon}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:s.color,background:`${s.color}14`,padding:"3px 10px",borderRadius:20 }}>{s.label}</span>
                </div>
                <div style={{ fontSize:28,fontWeight:900,color:"#353535",lineHeight:1 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* CALENDAR + DAY VIEW */}
          <div style={{ display:"grid",gridTemplateColumns:"320px 1fr",gap:20 }}>

            {/* التقويم */}
            <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)",alignSelf:"start" }}>
              <div style={{ padding:"16px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <button onClick={()=>{ let m=viewMonth-1,y=viewYear; if(m<0){m=11;y--;} setViewMonth(m); setViewYear(y); }}
                  style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
                <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>
                  {tr.months[viewMonth]} {viewYear}
                </div>
                <button onClick={()=>{ let m=viewMonth+1,y=viewYear; if(m>11){m=0;y++;} setViewMonth(m); setViewYear(y); }}
                  style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
              </div>

              <div style={{ padding:"12px 14px" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6 }}>
                  {tr.weekDays.map(d=>(
                    <div key={d} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:"#bbb",padding:"4px 0" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
                  {calDays.map((d,i) => {
                    if (!d) return <div key={i}/>;
                    const k     = toKey(viewYear, viewMonth, d);
                    const cnt   = countByKey[k] || 0;
                    const isSel = k === selectedKey;
                    const isTod = k === todayKey;
                    return (
                      <div key={i} className="cal-day"
                        onClick={()=>setSelectedKey(k)}
                        style={{ background:isSel?"#0863ba":isTod?"rgba(8,99,186,.08)":"transparent",color:isSel?"#fff":isTod?"#0863ba":"#353535",border:isTod&&!isSel?"1.5px solid rgba(8,99,186,.2)":"1.5px solid transparent" }}
                      >
                        <span style={{ fontSize:13,fontWeight:isSel||isTod?700:400 }}>{d}</span>
                        {cnt>0&&<div style={{ width:16,height:5,borderRadius:3,background:isSel?"rgba(255,255,255,.6)":"#0863ba",fontSize:8,display:"flex",alignItems:"center",justifyContent:"center",color:isSel?"rgba(255,255,255,.9)":"#fff",fontWeight:700 }}>{cnt}</div>}
                      </div>
                    );
                  })}
                </div>

                <button onClick={()=>setSelectedKey(todayKey)}
                  style={{ width:"100%",marginTop:12,padding:"8px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>
                  📅 {tr.today}
                </button>
              </div>
            </div>

            {/* قائمة مواعيد اليوم */}
            <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
              <div style={{ padding:"18px 22px 14px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div>
                  <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>{selLabel}</h3>
                  <p style={{ fontSize:12,color:"#aaa",marginTop:3 }}>
                    {dayAppointments.length} {tr.appointments}
                    {dayAppointments.length>=MAX_PER_DAY&&<span style={{ marginRight:8,marginLeft:8,color:"#c0392b",fontWeight:600 }}>• {tr.fullDay}</span>}
                  </p>
                </div>
                <button onClick={()=>setAddModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                  ＋ {tr.appt}
                </button>
              </div>

              <div style={{ padding:"8px 22px 24px",maxHeight:"calc(100vh - 280px)",overflowY:"auto" }}>
                {loading ? (
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:14,fontWeight:600 }}>{tr.loading}</div>
                  </div>
                ) : dayAppointments.length===0 ? (
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ fontSize:44,marginBottom:14 }}>📅</div>
                    <div style={{ fontSize:15,fontWeight:600 }}>{tr.noAppointments}</div>
                    <button onClick={()=>setAddModal(true)} style={{ marginTop:20,padding:"10px 24px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer" }}>
                      ＋ {tr.addAppointment}
                    </button>
                  </div>
                ) : (
                  HOURS.map(h => {
                    const hStr      = String(h).padStart(2,"0") + ":";
                    const hourAppts = dayAppointments.filter(a => a.time.startsWith(hStr));
                    return (
                      <div key={h} style={{ display:"flex",alignItems:"flex-start",gap:16,padding:"8px 0",borderBottom:"1px solid #f5f7fa",minHeight:52 }}>
                        <div style={{ width:46,flexShrink:0,paddingTop:4,textAlign:"center" }}>
                          <span style={{ fontSize:12,color:hourAppts.length>0?"#0863ba":"#ccc",fontWeight:hourAppts.length>0?700:400 }}>
                            {String(h).padStart(2,"0")}:00
                          </span>
                        </div>
                        <div style={{ flex:1,display:"flex",flexDirection:"column",gap:8,paddingTop:2 }}>
                          {hourAppts.map(appt => {
                            const name   = getPatientName(appt.patient_id);
                            const ss     = statusStyle(appt.status);
                            const bColor = tr.statusColors[appt.status as Status];
                            return (
                              <div key={appt.id}
                                className="appt-block"
                                onClick={()=>setEditAppt(appt)}
                                style={{ background:ss.bg, borderColor:bColor, borderLeftWidth:isAr?0:4, borderRightWidth:isAr?4:0 }}
                              >
                                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                  <div style={{ width:32,height:32,borderRadius:8,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                                    {name !== "—" ? getInitials(name) : "?"}
                                  </div>
                                  <div style={{ flex:1,minWidth:0 }}>
                                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{name}</div>
                                    <div style={{ fontSize:11,color:"#888",marginTop:2 }}>
                                      {appt.time} · {appt.duration} {tr.duration.min}
                                      {appt.type && ` · ${appt.type}`}
                                    </div>
                                  </div>
                                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
                                    <span style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"#fff",color:bColor,border:`1px solid ${bColor}30` }}>
                                      {tr.statuses[appt.status as Status]}
                                    </span>
                                    {appt.notes && <span style={{ fontSize:10,color:"#bbb" }}>📝</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Modals */}
        {(addModal || editAppt) && (
          <AppointmentModal
            lang={lang}
            appt={editAppt}
            defaultDate={selectedKey}
            patients={patients}
            onSave={handleSave}
            onClose={()=>{ setAddModal(false); setEditAppt(null); }}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            saving={saving}
          />
        )}

        {shareModal && (
          <ShareModal
            lang={lang}
            clinicId={clinicId}
            copied={copied}
            setCopied={setCopied}
            onClose={()=>setShareModal(false)}
          />
        )}

        {notification && (
          <NotificationToast
            lang={lang}
            appt={notification}
            patientName={getPatientName(notification.patient_id)}
            onDismiss={()=>setNotification(null)}
          />
        )}
      </div>
    </>
  );
}
