"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Appointments Page — مربوط مع Supabase
// ============================================================

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
      markCompleted:"تمت الزيارة ✓", markCancelled:"إلغاء الموعد", markNoShow:"لم يحضر",
    },
    stats:{ total:"مواعيد الشهر", today:"مواعيد اليوم", completed:"مكتملة", pending:"قادمة" },
    signOut:"تسجيل الخروج", selectedDay:"المحدد", appointments:"مواعيد", appt:"موعد",
    notification:{ title:"تذكير بموعد", msg:"سيحين موعد المريض", in:"خلال ١٥ دقيقة", dismiss:"تجاهل" },
    errorSave:"حدث خطأ أثناء الحفظ", errorLoad:"حدث خطأ أثناء التحميل",
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
      markCompleted:"Mark Completed ✓", markCancelled:"Cancel Appointment", markNoShow:"Mark No-Show",
    },
    stats:{ total:"Monthly Appts", today:"Today's Appts", completed:"Completed", pending:"Upcoming" },
    signOut:"Sign Out", selectedDay:"Selected", appointments:"Appointments", appt:"appt",
    notification:{ title:"Appointment Reminder", msg:"Upcoming appointment for", in:"in 15 minutes", dismiss:"Dismiss" },
    errorSave:"Error saving appointment", errorLoad:"Error loading data",
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────
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

// ─── Field component (خارج أي modal لمنع إعادة الإنشاء) ──
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div style={{ marginBottom:16, flex:half?"1":undefined }}>
    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
    {children}
  </div>
);

// ─── نوع الفورم ───────────────────────────────────────────
type ApptForm = {
  patient_id: number | "";
  date: string;
  time: string;
  duration: number;
  type: string;
  notes: string;
  status: Status;
};

// ─── Modal إضافة/تعديل موعد ──────────────────────────────
function AppointmentModal({ lang, appt, defaultDate, patients, onSave, onClose, onStatusChange, saving }: {
  lang: Lang;
  appt: Appointment | null;
  defaultDate: string;
  patients: Patient[];
  onSave: (form: ApptForm, id?: number) => void;
  onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
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
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!form.patient_id || !form.date || !form.time) { setError(tr.modal.required); return; }
    onSave(form, appt?.id);
  };

  const inputSt = useMemo((): React.CSSProperties => ({
    width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
    outline:"none", transition:"border .2s", direction:isAr?"rtl":"ltr",
  }), [isAr]);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isEdit?tr.modal.editTitle:tr.modal.addTitle}</h2>
            {isEdit&&<p style={{ fontSize:11,color:"#aaa",marginTop:2 }}>ID: #{appt!.id}</p>}
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}

          {/* اختيار المريض — من Supabase */}
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
                style={inputSt}
                className="appt-input"
              />
            </Field>
            <Field label={tr.modal.time} half>
              <input type="time" value={form.time}
                onChange={e=>setForm({...form,time:e.target.value})}
                style={inputSt}
                className="appt-input"
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
                placeholder={tr.modal.typePh} style={inputSt}
                className="appt-input"
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

          {/* أزرار تغيير الحالة عند التعديل */}
          {isEdit && appt!.status==="scheduled" && (
            <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:8 }}>
              {([
                { status:"completed" as Status, label:tr.modal.markCompleted, color:"#2e7d32", bg:"rgba(46,125,50,.08)"   },
                { status:"cancelled" as Status, label:tr.modal.markCancelled, color:"#c0392b", bg:"rgba(192,57,43,.08)"  },
                { status:"no-show"  as Status,  label:tr.modal.markNoShow,   color:"#888",   bg:"rgba(136,136,136,.08)" },
              ]).map(s=>(
                <button key={s.status}
                  onClick={()=>onStatusChange(appt!.id, s.status)}
                  style={{ padding:"8px 14px",borderRadius:10,border:`1.5px solid ${s.color}30`,background:s.bg,color:s.color,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

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

  // ── State ──────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [viewMonth,    setViewMonth]    = useState(now.getMonth());
  const [viewYear,     setViewYear]     = useState(now.getFullYear());
  const [selectedKey,  setSelectedKey]  = useState(todayKey);
  const [addModal,     setAddModal]     = useState(false);
  const [editAppt,     setEditAppt]     = useState<Appointment | null>(null);
  const [notification, setNotification] = useState<Appointment | null>(null);

  // ── جلب المرضى ────────────────────────────────────────
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

  // ── جلب المواعيد ──────────────────────────────────────
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
  }, []);

  // تنبيه تلقائي لأول موعد اليوم
  useEffect(() => {
    if (appointments.length === 0) return;
    const timer = setTimeout(() => {
      const next = appointments.find(a => a.date === todayKey && a.status === "scheduled");
      if (next) setNotification(next);
    }, 3000);
    return () => clearTimeout(timer);
  }, [appointments]);

  // ── حفظ موعد (إضافة أو تعديل) ───────────────────────
  const handleSave = async (form: ApptForm, id?: number) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      if (id) {
        // تعديل
        const { error } = await supabase
          .from("appointments")
          .update({
            patient_id: form.patient_id,
            date:       form.date,
            time:       form.time,
            duration:   form.duration,
            type:       form.type   || null,
            notes:      form.notes  || null,
            status:     form.status,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        // إضافة
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
      alert(isAr ? tr.errorSave : tr.errorSave);
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

  // ── Computed ──────────────────────────────────────────
  // مواعيد اليوم المحدد (date يُخزّن كـ YYYY-MM-DD في Supabase)
  const dayAppointments = appointments
    .filter(a => a.date === selectedKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  // عدد المواعيد لكل يوم
  const countByKey: Record<string, number> = {};
  appointments.forEach(a => { countByKey[a.date] = (countByKey[a.date] || 0) + 1; });

  // بناء أيام التقويم
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  // إحصائيات
  const monthKey   = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthAppts = appointments.filter(a => a.date.startsWith(monthKey));
  const stats = {
    total:     monthAppts.length,
    today:     appointments.filter(a => a.date === todayKey).length,
    completed: monthAppts.filter(a => a.status === "completed").length,
    pending:   monthAppts.filter(a => a.status === "scheduled").length,
  };

  const statusStyle = (status: string) => ({
    scheduled: { bg:"rgba(8,99,186,.08)",    color:"#0863ba" },
    completed: { bg:"rgba(46,125,50,.08)",   color:"#2e7d32" },
    cancelled: { bg:"rgba(192,57,43,.08)",   color:"#c0392b" },
    "no-show": { bg:"rgba(136,136,136,.08)", color:"#888"    },
  }[status] ?? { bg:"#f0f0f0", color:"#888" });

  const prevMonth = () => { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const selDateObj = new Date(selectedKey + "T00:00:00");
  const selLabel   = `${tr.weekDaysFull[selDateObj.getDay()]}، ${selDateObj.getDate()} ${tr.months[selDateObj.getMonth()]} ${selDateObj.getFullYear()}`;

  // إيجاد اسم المريض
  const getPatientName = (patientId: number) =>
    patients.find(p => p.id === patientId)?.name ?? "—";

  // ── Render ─────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-anim{animation:fadeUp .4s ease both}
        .cal-day{border-radius:10px;cursor:pointer;transition:all .15s;position:relative;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
        .cal-day:hover{background:#f0f6ff}
        .cal-day.selected{background:#0863ba !important;color:#fff !important}
        .cal-day.today-cell{font-weight:800}
        .appt-block{border-radius:10px;padding:12px 14px;margin-bottom:10px;border-style:solid;border-width:0;transition:all .2s;cursor:pointer}
        .appt-block:hover{transform:translateX(${isAr?"2px":"-2px"});box-shadow:0 4px 16px rgba(0,0,0,.08)}
        .stat-card{background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #eef0f3;box-shadow:0 2px 10px rgba(8,99,186,.05)}
        .appt-input:focus{border-color:#0863ba !important;box-shadow:0 0 0 3px rgba(8,99,186,.08)}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="appointments"/>

        <main className="page-anim" style={{ marginRight:isAr?240:undefined,marginLeft:isAr?undefined:240,padding:"0 32px 48px",transition:"margin .3s" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                <p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <button onClick={()=>setAddModal(true)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#054a8c";e.currentTarget.style.transform="translateY(-1px)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="#0863ba";e.currentTarget.style.transform="translateY(0)"}}
              ><span style={{ fontSize:18,lineHeight:1 }}>＋</span> {tr.addAppointment}</button>
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* STATS */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
              {[
                {label:tr.stats.total,    value:stats.total,    icon:"📅",color:"#0863ba",bg:"rgba(8,99,186,.08)"},
                {label:tr.stats.today,    value:stats.today,    icon:"🗓️",color:"#2980b9",bg:"rgba(41,128,185,.08)"},
                {label:tr.stats.completed,value:stats.completed,icon:"✅",color:"#2e7d32",bg:"rgba(46,125,50,.08)"},
                {label:tr.stats.pending,  value:stats.pending,  icon:"⏳",color:"#e67e22",bg:"rgba(230,126,34,.08)"},
              ].map((s,i)=>(
                <div key={i} className="stat-card" style={{ animation:`fadeUp .4s ${i*60}ms ease both` }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:10 }}>{s.icon}</div>
                  <div style={{ fontSize:26,fontWeight:800,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12,color:"#aaa",marginTop:5,fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* MAIN GRID */}
            <div style={{ display:"grid",gridTemplateColumns:"340px 1fr",gap:20 }}>

              {/* ── CALENDAR ── */}
              <div>
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden",marginBottom:16 }}>
                  <div style={{ padding:"18px 20px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <button onClick={prevMonth} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f9fafb",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
                    <span style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.months[viewMonth]} {viewYear}</span>
                    <button onClick={nextMonth} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f9fafb",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 14px 4px",gap:4 }}>
                    {tr.weekDays.map(d=>(
                      <div key={d} style={{ textAlign:"center",fontSize:11,fontWeight:700,color:"#bbb",padding:"4px 0" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 14px 18px",gap:4 }}>
                    {calDays.map((d,i)=>{
                      if (!d) return <div key={`e-${i}`}/>;
                      const key     = toKey(viewYear,viewMonth,d);
                      const count   = countByKey[key] || 0;
                      const isFull  = count >= MAX_PER_DAY;
                      const isToday = key === todayKey;
                      const isSel   = key === selectedKey;
                      return (
                        <div key={key}
                          className={`cal-day${isSel?" selected":""}${isToday&&!isSel?" today-cell":""}`}
                          onClick={()=>setSelectedKey(key)}
                          style={{ background:isSel?"#0863ba":isToday?"rgba(8,99,186,.08)":"transparent", color:isSel?"#fff":isToday?"#0863ba":"#353535" }}
                        >
                          <span style={{ fontSize:13,fontWeight:isToday?800:400 }}>{d}</span>
                          {count>0&&<div style={{ width:6,height:6,borderRadius:"50%",background:isSel?"rgba(255,255,255,.8)":isFull?"#c0392b":"#0863ba" }}/>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={()=>{ setSelectedKey(todayKey); setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); }}
                  style={{ width:"100%",padding:"11px",background:"#fff",color:"#0863ba",border:"1.5px solid #a4c4e4",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",marginBottom:16 }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#0863ba";e.currentTarget.style.color="#fff"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color="#0863ba"}}
                >
                  🗓 {tr.today}
                </button>

                <div style={{ background:"#fff",borderRadius:14,padding:"14px 16px",border:"1.5px solid #eef0f3" }}>
                  {(Object.entries(tr.statuses) as [Status, string][]).map(([k,v])=>(
                    <div key={k} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                      <div style={{ width:12,height:12,borderRadius:3,background:tr.statusColors[k],flexShrink:0 }}/>
                      <span style={{ fontSize:12,color:"#666" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── DAY VIEW ── */}
              <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>
                <div style={{ padding:"18px 22px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between",background:selectedKey===todayKey?"rgba(8,99,186,.03)":"#fff" }}>
                  <div>
                    <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>{selLabel}</h3>
                    <p style={{ fontSize:12,color:"#aaa",marginTop:3 }}>
                      {dayAppointments.length} {tr.appointments}
                      {dayAppointments.length>=MAX_PER_DAY&&<span style={{ marginRight:8,marginLeft:8,color:"#c0392b",fontWeight:600 }}>• {tr.fullDay}</span>}
                    </p>
                  </div>
                  <button onClick={()=>setAddModal(true)}
                    style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}
                  >＋ {tr.appt}</button>
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
                      const hStr    = String(h).padStart(2,"0") + ":";
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
                                  style={{
                                    background: ss.bg,
                                    borderColor: bColor,
                                    borderLeftWidth:  isAr ? 0 : 4,
                                    borderRightWidth: isAr ? 4 : 0,
                                  }}
                                >
                                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                    <div style={{ width:32,height:32,borderRadius:8,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                                      {name !== "—" ? getInitials(name) : "?"}
                                    </div>
                                    <div style={{ flex:1,minWidth:0 }}>
                                      <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                                        {name}
                                      </div>
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
            saving={saving}
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
