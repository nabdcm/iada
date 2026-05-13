"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment } from "@/lib/supabase";

type Lang = "ar" | "en";
type Status = "scheduled" | "completed" | "cancelled" | "no-show";

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"لوحة المعلومات", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات" },
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
      deleteConfirm:"نعم، احذف", deleteCancel:"لا، تراجع",
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
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments" },
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
      deleteConfirm:"Yes, Delete", deleteCancel:"No, Cancel",
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

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang, activePage = "appointments" }: {
  lang: Lang; setLang: (l: Lang) => void; activePage?: string;
}) {
  const tr = T[lang]; const isAr = lang === "ar";
  const [col, setCol] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sidebarRight = isAr ? 0 : undefined;
  const sidebarLeft  = isAr ? undefined : 0;
  const sidebarTransform = isMobile
    ? (mobileOpen ? "translateX(0)" : (isAr ? "translateX(100%)" : "translateX(-100%)"))
    : "translateX(0)";

  const DashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );

  const navItems: { key: keyof typeof tr.nav; icon: React.ReactNode; href: string }[] = [
    { key:"dashboard",    icon:<DashIcon/>, href:"/dashboard"    },
    { key:"patients",     icon:"👥",        href:"/patients"     },
    { key:"appointments", icon:"📅",        href:"/appointments" },
    { key:"payments",     icon:"💳",        href:"/payments"     },
  ];

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:49 }} />
      )}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ position:"fixed",top:14,right:isAr?16:undefined,left:isAr?undefined:16,zIndex:60,width:40,height:40,borderRadius:10,background:"#0863ba",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(8,99,186,.3)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      )}
      <aside style={{ width:isMobile?260:col?70:240,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,right:sidebarRight,left:sidebarLeft,zIndex:50,transform:sidebarTransform,boxShadow:isMobile&&mobileOpen?"8px 0 32px rgba(0,0,0,.15)":"4px 0 24px rgba(8,99,186,.06)" }}>
      <div style={{ padding:col?"24px 0":"24px 20px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72 }}>
        {!col && (
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }} />
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
              <div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div>
            </div>
          </div>
        )}
        {col && <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10 }} />}
        {!col && !isMobile && <button onClick={()=>setCol(!col)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>{isAr?"›":"‹"}</button>}
      </div>
      <nav style={{ flex:1,padding:"16px 12px" }}>
        {navItems.map(item=>{
          const isActive = item.key===activePage;
          const indicatorRight = isAr ? -12 : undefined;
          const indicatorLeft  = isAr ? undefined : -12;
          return (
            <a key={item.key} href={item.href} style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
              {isActive&&<div style={{ position:"absolute",right:indicatorRight,left:indicatorLeft,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }}/>}
              <span style={{ fontSize:18,flexShrink:0,display:"flex",alignItems:"center" }}>{item.icon}</span>
              {!col&&<span>{tr.nav[item.key]}</span>}
            </a>
          );
        })}
      </nav>
      <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
        {!col&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
        <button
          onClick={()=>{ supabase.auth.signOut(); window.location.href="/login"; }}
          style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:8,padding:col?8:"10px 12px",borderRadius:10,background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.12)",cursor:"pointer",fontFamily:"Rubik,sans-serif" }}
        >
          <span style={{ fontSize:16 }}>🚪</span>
          {!col&&<span style={{ fontSize:13,fontWeight:600,color:"#c0392b" }}>{tr.signOut}</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

// ─── Field ────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div style={{ marginBottom:16, flex:half?"1":undefined }}>
    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
    {children}
  </div>
);

type ApptForm = {
  patient_id: number | "";
  date: string; time: string; duration: number;
  type: string; notes: string; status: Status;
};

// ─── Modal موعد ───────────────────────────────────────────
function AppointmentModal({ lang, appt, defaultDate, patients, appointments, onSave, onClose, onStatusChange, onDelete, saving }: {
  lang: Lang; appt: Appointment | null; defaultDate: string; patients: Patient[];
  appointments: Appointment[];
  onSave: (form: ApptForm, id?: number) => void; onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
  onDelete: (id: number) => void; saving: boolean;
}) {
  const tr = T[lang]; const isAr = lang === "ar"; const isEdit = !!appt?.id;
  const [form, setForm] = useState<ApptForm>({
    patient_id: appt?.patient_id ?? "",
    date: appt?.date ?? defaultDate, time: appt?.time ?? "09:00",
    duration: appt?.duration ?? 30, type: appt?.type ?? "",
    notes: appt?.notes ?? "", status: appt?.status ?? "scheduled",
  });
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (!form.patient_id || !form.date || !form.time) { setError(tr.modal.required); return; }
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
            <select value={form.patient_id} onChange={e=>setForm({...form,patient_id:Number(e.target.value)})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="">{tr.modal.selectPatient}</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div style={{ display:"flex",gap:12 }}>
            <Field label={tr.modal.date} half><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} className="appt-input"/></Field>
            <Field label={tr.modal.time} half><input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={inputSt} className="appt-input"/></Field>
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

  const getPatientName = (pid: number) => patients.find(p => p.id === pid)?.name ?? "—";
  const getPatientPhone = (pid: number) => patients.find(p => p.id === pid)?.phone ?? "";

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
          const name  = getPatientName(appt.patient_id);
          const phone = getPatientPhone(appt.patient_id);
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
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [appointments,        setAppointments]        = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [patients,            setPatients]            = useState<Patient[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [saving,              setSaving]              = useState(false);
  const [clinicId,            setClinicId]            = useState("");
  const [shareModal,          setShareModal]          = useState(false);
  const [copied,              setCopied]              = useState(false);
  const [viewMonth,           setViewMonth]           = useState(now.getMonth());
  const [viewYear,            setViewYear]            = useState(now.getFullYear());
  const [selectedKey,         setSelectedKey]         = useState(todayKey);
  const [addModal,            setAddModal]            = useState(false);
  const [editAppt,            setEditAppt]            = useState<Appointment | null>(null);
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
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setClinicId(user.id); });
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
        (payload) => {
          const newAppt = payload.new as Appointment;
          if ((newAppt.status as string) === "pending_approval") {
            // تشغيل صوت تنبيه عند وصول طلب جديد
            playNotificationSound();
            setPendingAppointments(prev => [...prev, newAppt]);
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
      if (id) {
        await supabase.from("appointments").update({ patient_id:form.patient_id, date:form.date, time:form.time, duration:form.duration, type:form.type||null, notes:form.notes||null, status:form.status }).eq("id",id);
      } else {
        await supabase.from("appointments").insert({ user_id:userId, patient_id:form.patient_id, date:form.date, time:form.time, duration:form.duration, type:form.type||null, notes:form.notes||null, status:"scheduled" });
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

  // ── قبول طلب الحجز: تحويل الحالة إلى scheduled ────────────
  const handleApproveBooking = async (appt: Appointment) => {
    try {
      await supabase
        .from("appointments")
        .update({ status: "scheduled" })
        .eq("id", appt.id);
      // نقل الموعد من قائمة المعلقة إلى المواعيد الفعلية
      setPendingAppointments(prev => prev.filter(a => a.id !== appt.id));
      setAppointments(prev => [...prev, { ...appt, status: "scheduled" as Status }]
        .sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      );
      // الانتقال للتاريخ في التقويم
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
  const dayAppointments = appointments.filter(a => a.date === selectedKey).sort((a,b)=>a.time.localeCompare(b.time));
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
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc",display:"flex" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="appointments"/>

        <main style={{ marginRight:isAr&&!isMobile?240:undefined, marginLeft:!isAr&&!isMobile?240:undefined, flex:1, padding:isMobile?"0 14px 48px":"0 28px 48px", minHeight:"100vh", maxWidth:isMobile?"100vw":"calc(100vw - 240px)" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"18px 0 14px",borderBottom:"1.5px solid #eef0f3",marginBottom:20 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between", paddingLeft:isMobile&&!isAr?52:0, paddingRight:isMobile&&isAr?52:0 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div>
                  <h1 style={{ fontSize:isMobile?17:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                  {!isMobile&&<p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>}
                </div>
                {/* بادج عدد الطلبات المعلقة في التوب بار */}
                {pendingAppointments.length > 0 && (
                  <div style={{
                    display:"flex",alignItems:"center",gap:5,
                    background:"rgba(230,126,34,.1)",
                    border:"1.5px solid rgba(230,126,34,.3)",
                    borderRadius:20,padding:"4px 10px",
                    animation:"pendingPulse 2s ease infinite",
                  }}>
                    <span style={{ fontSize:14 }}>🔔</span>
                    <span style={{ fontSize:12,fontWeight:700,color:"#e67e22" }}>
                      {pendingAppointments.length}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display:"flex",gap:isMobile?6:10 }}>
                {!isMobile&&<button onClick={()=>setShareModal(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                  🔗 {isAr?"رابط الحجز":"Booking Link"}
                </button>}
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

          {/* ════ قسم طلبات الحجز المعلقة (يظهر فوق التقويم إذا وُجدت طلبات) ════ */}
          <PendingBookingsSection
            lang={lang}
            pendingAppointments={pendingAppointments}
            patients={patients}
            onApprove={handleApproveBooking}
            onReject={handleRejectBooking}
            isMobile={isMobile}
          />

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
                      return (
                        <div key={i} className="cal-day" onClick={()=>setSelectedKey(k)}
                          style={{ background:isSel?"#0863ba":isTod?"rgba(8,99,186,.08)":"transparent",color:isSel?"#fff":isTod?"#0863ba":"#353535",border:isTod&&!isSel?"1.5px solid rgba(8,99,186,.2)":"1.5px solid transparent" }}>
                          <span style={{ fontSize:12,fontWeight:isSel||isTod?700:400 }}>{d}</span>
                          {cnt>0&&<div style={{ width:14,height:4,borderRadius:3,background:isSel?"rgba(255,255,255,.6)":"#0863ba" }}/>}
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
                <button onClick={()=>setAddModal(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                  ＋ {tr.appt}
                </button>
              </div>

              <div ref={timelineRef} className="timeline-scroll" style={{ padding:"0 0 16px" }}>
                {loading ? (
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
                    <div style={{ fontSize:14,fontWeight:600 }}>{tr.loading}</div>
                  </div>
                ) : (
                  <>
                    {SLOTS.map((slot, idx) => {
                      const slotAppts = dayAppointments.filter(a => {
                        const [ah, am] = a.time.slice(0,5).split(":").map(Number);
                        const apptMinutes = ah * 60 + am;
                        const [sh, sm] = slot.value.split(":").map(Number);
                        const slotStart = sh * 60 + sm;
                        const slotEnd   = slotStart + 14;
                        return apptMinutes >= slotStart && apptMinutes <= slotEnd;
                      });
                      const isNowSlot = idx === nowSlotIdx;
                      const hasAppts  = slotAppts.length > 0;
                      return (
                        <div key={slot.value} className="slot-row"
                          style={{
                            borderBottom: slot.isHour ? "1px solid #e8edf2" : "1px solid #f4f6f9",
                            background: isNowSlot ? "rgba(8,99,186,.04)" : "transparent",
                            minHeight: hasAppts ? "auto" : slot.isHour ? 44 : 32,
                          }}>
                          <div style={{ width:62,flexShrink:0,padding:"8px 0 8px 14px",textAlign:"center",position:"relative",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:10 }}>
                            {slot.isHour ? (
                              <span style={{ fontSize:12,fontWeight:700,color:hasAppts?"#0863ba":isNowSlot?"#0863ba":"#c0c8d4",display:"block",letterSpacing:.3 }}>
                                {slot.label}
                              </span>
                            ) : hasAppts ? (
                              <span style={{ fontSize:10,fontWeight:600,color:"#0863ba",display:"block" }}>
                                {slot.label}
                              </span>
                            ) : (
                              <span style={{ fontSize:9,color:"#e0e4ea",lineHeight:"32px" }}>·</span>
                            )}
                            {isNowSlot && (
                              <div style={{ position:"absolute",top:"50%",insetInlineEnd:-5,transform:"translateY(-50%)",width:9,height:9,borderRadius:"50%",background:"#0863ba",animation:"nowPulse 1.5s ease infinite",boxShadow:"0 0 0 3px rgba(8,99,186,.2)" }}/>
                            )}
                          </div>
                          <div style={{ width: slot.isHour ? 1.5 : 1, background: slot.isHour ? "#d8e2ee" : "#eef0f3", alignSelf:"stretch", flexShrink:0 }}/>
                          <div style={{ flex:1,padding: hasAppts ? "6px 14px 6px" : "0 14px",display:"flex",flexDirection:"column",gap:6 }}>
                            {slotAppts.length === 0 && isNowSlot && (
                              <div style={{ height:2,background:"#0863ba",borderRadius:2,opacity:.25,alignSelf:"stretch",margin:"12px 0" }}/>
                            )}
                            {slotAppts.map(appt => {
                              const name   = getPatientName(appt.patient_id);
                              const ss     = statusStyle(appt.status);
                              const bColor = tr.statusColors[appt.status as Status];
                              return (
                                <div key={appt.id} className="appt-block"
                                  style={{ background:ss.bg, borderColor:bColor, borderInlineStartWidth:4, borderInlineEndWidth:isAr?4:0 }}>
                                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                    <div style={{ width:30,height:30,borderRadius:8,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>
                                      {name!=="—"?getInitials(name):"?"}
                                    </div>
                                    <div style={{ flex:1,minWidth:0 }}>
                                      <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                        <span style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{name}</span>
                                        <button
                                          className="wa-btn"
                                          title="WhatsApp"
                                          onClick={e=>{ e.stopPropagation(); sendWhatsApp(appt); }}
                                        >
                                          <svg width="15" height="15" viewBox="0 0 24 24" fill="#25D366">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                          </svg>
                                        </button>
                                      </div>
                                      <div style={{ fontSize:11,color:"#888",marginTop:1 }}>
                                        {appt.time} · {appt.duration} {tr.duration.min}
                                        {appt.type&&` · ${appt.type}`}
                                      </div>
                                    </div>
                                    <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3 }}>
                                      <span style={{ fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:"#fff",color:bColor,border:`1px solid ${bColor}30`,whiteSpace:"nowrap" }}>
                                        {tr.statuses[appt.status as Status]}
                                      </span>
                                      <button onClick={()=>setEditAppt(appt)} style={{ fontSize:10,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"Rubik,sans-serif" }}>✏️</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {dayAppointments.length === 0 && (
                      <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                        <div style={{ fontSize:44,marginBottom:14 }}>📅</div>
                        <div style={{ fontSize:15,fontWeight:600 }}>{tr.noAppointments}</div>
                        <button onClick={()=>setAddModal(true)} style={{ marginTop:20,padding:"10px 24px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:600,cursor:"pointer" }}>
                          ＋ {tr.addAppointment}
                        </button>
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
          <AppointmentModal lang={lang} appt={editAppt} defaultDate={selectedKey} patients={patients}
            appointments={appointments}
            onSave={handleSave} onClose={()=>{ setAddModal(false); setEditAppt(null); }}
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