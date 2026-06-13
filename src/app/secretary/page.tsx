"use client";
import { useState, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment, Payment } from "@/lib/supabase";

// ════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════
type Lang = "ar" | "en";
type Tab  = "appointments" | "patients" | "finance";
type ApptStatus = "scheduled"|"completed"|"cancelled"|"no-show";
type PayStatus  = "paid"|"pending"|"cancelled";
type PayMethod  = "cash"|"card"|"transfer";
type ClinicType = "general"|"dental"|"dermatology"|"cosmetic"|"pediatrics"|
  "physical_therapy"|"mental_health"|"nutrition"|"ophthalmology"|
  "orthopedic"|"cardiology"|"gynecology"|"ent"|"urology"|"other";

type PatientForm = {
  name:string; phone:string; gender:string; date_of_birth:string;
  has_diabetes:boolean; has_hypertension:boolean; notes:string;
  extra_fields: Record<string,string|boolean>;
};
type PatientProfile = {
  medical_fields: Record<string,string>;
  dental_chart: Record<number,{status:string;notes:string}>;
  xrays: any[];
  extra_form_fields: Record<string,string|boolean>;
};
type MedicalField = { key:string; label_ar:string; label_en:string; type:"textarea"|"text"|"yesno"; icon:string; };

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════
const PRIMARY = "#0863ba";
const SB_BG   = "#0558a8";
const AVT     = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id:number) => AVT[(id-1)%AVT.length];
const getInitials = (name:string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();

const CLINIC_TYPE_META: Record<ClinicType,{icon:string;color:string;ar:string;en:string}> = {
  general:{icon:"🏥",color:"#16a085",ar:"طب عام",en:"General Medicine"},
  dental:{icon:"🦷",color:"#0863ba",ar:"أسنان",en:"Dental"},
  dermatology:{icon:"🧴",color:"#e67e22",ar:"جلدية",en:"Dermatology"},
  cosmetic:{icon:"💆",color:"#8e44ad",ar:"تجميلية",en:"Cosmetic"},
  pediatrics:{icon:"👶",color:"#27ae60",ar:"أطفال",en:"Pediatrics"},
  physical_therapy:{icon:"🏃",color:"#2e7d32",ar:"علاج فيزيائي",en:"Physical Therapy"},
  mental_health:{icon:"🧠",color:"#6c3fc5",ar:"صحة نفسية",en:"Mental Health"},
  nutrition:{icon:"🥗",color:"#27ae60",ar:"تغذية",en:"Nutrition"},
  ophthalmology:{icon:"👁️",color:"#2980b9",ar:"عيون",en:"Ophthalmology"},
  orthopedic:{icon:"🦴",color:"#c0392b",ar:"عظام ومفاصل",en:"Orthopedics"},
  cardiology:{icon:"❤️",color:"#e74c3c",ar:"قلب وشرايين",en:"Cardiology"},
  gynecology:{icon:"🌸",color:"#e91e63",ar:"نساء وتوليد",en:"Gynecology"},
  ent:{icon:"👂",color:"#795548",ar:"أنف وأذن وحنجرة",en:"ENT"},
  urology:{icon:"💧",color:"#2196f3",ar:"مسالك بولية",en:"Urology"},
  other:{icon:"🏨",color:"#607d8b",ar:"أخرى",en:"Other"},
};

const MEDICAL_FIELDS_BY_TYPE: Record<ClinicType,MedicalField[]> = {
  general:[
    {key:"chief_complaint",label_ar:"الشكوى الرئيسية",label_en:"Chief Complaint",type:"textarea",icon:"🩺"},
    {key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"📋"},
    {key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},
    {key:"medications",label_ar:"الأدوية الموصوفة",label_en:"Prescribed Medications",type:"textarea",icon:"💉"},
    {key:"allergies",label_ar:"الحساسية",label_en:"Allergies",type:"text",icon:"⚠️"},
    {key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"},
  ],
  dental:[
    {key:"chief_complaint",label_ar:"الشكوى الرئيسية",label_en:"Chief Complaint",type:"textarea",icon:"🦷"},
    {key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"📋"},
    {key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},
    {key:"medications",label_ar:"الأدوية الموصوفة",label_en:"Prescribed Medications",type:"textarea",icon:"💉"},
    {key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"},
  ],
  dermatology:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"📋"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  cosmetic:[{key:"procedure",label_ar:"الإجراء",label_en:"Procedure",type:"textarea",icon:"💆"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  pediatrics:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"📋"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  physical_therapy:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"📋"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  mental_health:[{key:"session_notes",label_ar:"ملاحظات الجلسة",label_en:"Session Notes",type:"textarea",icon:"🧠"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  nutrition:[{key:"diet_plan",label_ar:"الخطة الغذائية",label_en:"Diet Plan",type:"textarea",icon:"🥗"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  ophthalmology:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"👁️"},{key:"prescription",label_ar:"الوصفة الطبية",label_en:"Prescription",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  orthopedic:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"🦴"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  cardiology:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"❤️"},{key:"medications",label_ar:"الأدوية",label_en:"Medications",type:"textarea",icon:"💉"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  gynecology:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"🌸"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  ent:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"👂"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  urology:[{key:"diagnosis",label_ar:"التشخيص",label_en:"Diagnosis",type:"textarea",icon:"💧"},{key:"treatment_plan",label_ar:"خطة العلاج",label_en:"Treatment Plan",type:"textarea",icon:"💊"},{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
  other:[{key:"notes",label_ar:"ملاحظات",label_en:"Notes",type:"textarea",icon:"📝"}],
};

// ════════════════════════════════════════════════════════════
// DB HELPERS
// ════════════════════════════════════════════════════════════
async function loadProfileFromDB(patientId:number): Promise<PatientProfile|null> {
  try {
    const { data, error } = await supabase.from("patient_profiles").select("*").eq("patient_id",patientId).maybeSingle();
    if (error||!data) return null;
    return {
      medical_fields:    data.medical_fields    ?? {},
      dental_chart:      data.dental_chart      ?? {},
      xrays:             data.xrays             ?? [],
      extra_form_fields: data.extra_form_fields ?? {},
    };
  } catch { return null; }
}

async function saveProfileToDB(patientId:number, userId:string, profile:PatientProfile) {
  await supabase.from("patient_profiles").upsert({
    patient_id:patientId, user_id:userId,
    medical_fields:profile.medical_fields,
    dental_chart:profile.dental_chart,
    xrays:profile.xrays,
    extra_form_fields:profile.extra_form_fields,
    updated_at:new Date().toISOString(),
  },{ onConflict:"patient_id" });
}

// ════════════════════════════════════════════════════════════
// DAILY REPORT EXPORT
// ════════════════════════════════════════════════════════════
function exportDailyReportHTML(payments:Payment[], withdrawals:any[], expenses:any[], patients:Patient[], clinicName:string) {
  const today = new Date().toISOString().slice(0,10);
  const fmt = (d:string) => new Date(d+"T00:00:00").toLocaleDateString("ar-EG-u-ca-gregory",{year:"numeric",month:"long",day:"numeric"});
  const todayP = payments.filter(p=>p.date===today);
  const todayW = withdrawals.filter(w=>w.date===today);
  const todayE = expenses.filter(e=>e.date===today);
  const totalIn = todayP.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
  const totalW  = todayW.reduce((s,w)=>s+w.amount,0);
  const totalE  = todayE.reduce((s,e)=>s+e.amount,0);
  const net     = totalIn - totalW - totalE;

  const pRows = todayP.length ? todayP.map(p=>{
    const pat = patients.find(x=>x.id===p.patient_id);
    const sm:Record<string,string>={paid:"مدفوع",pending:"معلّق",cancelled:"ملغي"};
    const mm:Record<string,string>={cash:"نقداً",card:"بطاقة",transfer:"تحويل"};
    return `<tr><td>${fmt(p.date)}</td><td>${pat?.name||"—"}</td><td>${p.description}</td><td>${mm[p.method]||p.method}</td><td>${sm[p.status]||p.status}</td><td style="color:#2e7d32;font-weight:700">+${p.amount.toLocaleString()} ل.س</td></tr>`;
  }).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa">لا توجد مدفوعات اليوم</td></tr>`;

  const wRows = todayW.length ? todayW.map(w=>`<tr><td>${fmt(w.date)}</td><td colspan="3">${w.reason}</td><td>سحب</td><td style="color:#c0392b;font-weight:700">-${w.amount.toLocaleString()} ل.س</td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa">لا توجد سحوبات</td></tr>`;
  const eRows = todayE.length ? todayE.map(e=>`<tr><td>${fmt(e.date)}</td><td colspan="2">${e.description}</td><td>${e.category}</td><td>مصروف</td><td style="color:#7b2d8b;font-weight:700">-${e.amount.toLocaleString()} ل.س</td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#aaa">لا توجد مصروفات</td></tr>`;

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>تقرير يومي</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Rubik',sans-serif;direction:rtl;background:#fff;color:#222;padding:28px;font-size:13px}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0863ba;padding-bottom:16px;margin-bottom:20px}
.logo{font-size:24px;font-weight:800;color:#0863ba}.sub{font-size:11px;color:#888}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.stat{background:#f7f9fc;border-radius:10px;padding:12px 14px;border:1.5px solid #eef0f3}
.sv{font-size:16px;font-weight:800}.sl{font-size:10px;color:#888;margin-top:3px}
.green{color:#2e7d32}.red{color:#c0392b}
.sec{font-size:13px;font-weight:700;margin:16px 0 8px;padding-bottom:5px;border-bottom:2px solid #eee}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#0863ba;color:#fff;padding:8px 10px;text-align:right;font-size:11px;font-weight:700}
td{padding:7px 10px;border-bottom:1px solid #eef0f3;font-size:11px}
tr:nth-child(even) td{background:#fafbfc}
.net{margin-top:18px;padding:14px 18px;border-radius:10px;display:flex;justify-content:space-between;align-items:center}
.net-pos{background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border:2px solid #2e7d32}
.net-neg{background:linear-gradient(135deg,#ffebee,#fce4ec);border:2px solid #c0392b}
</style></head><body>
<div class="header"><div><div class="logo">نبض</div><div class="sub">${clinicName}</div></div><div style="text-align:left"><div style="font-size:16px;font-weight:800">التقرير اليومي</div><div class="sub">${fmt(today)}</div></div></div>
<div class="stats">
  <div class="stat"><div class="sv green">+${totalIn.toLocaleString()} ل.س</div><div class="sl">إجمالي الدخل</div></div>
  <div class="stat"><div class="sv red">-${totalW.toLocaleString()} ل.س</div><div class="sl">السحوبات</div></div>
  <div class="stat"><div class="sv" style="color:#7b2d8b">-${totalE.toLocaleString()} ل.س</div><div class="sl">المصروفات</div></div>
  <div class="stat"><div class="sv ${net>=0?"green":"red"}">${net>=0?"+":""}${net.toLocaleString()} ل.س</div><div class="sl">الرصيد الصافي</div></div>
</div>
<div class="sec">💰 المدفوعات</div>
<table><thead><tr><th>التاريخ</th><th>المريض</th><th>الوصف</th><th>الطريقة</th><th>الحالة</th><th>المبلغ</th></tr></thead><tbody>${pRows}</tbody></table>
<div class="sec">💸 السحوبات</div>
<table><thead><tr><th>التاريخ</th><th colspan="3">السبب</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>${wRows}</tbody></table>
<div class="sec">🏪 المصروفات</div>
<table><thead><tr><th>التاريخ</th><th colspan="2">الوصف</th><th>التصنيف</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>${eRows}</tbody></table>
<div class="net ${net>=0?"net-pos":"net-neg"}"><div style="font-size:13px;font-weight:700">الرصيد الصافي لهذا اليوم</div><div style="font-size:20px;font-weight:800;color:${net>=0?"#2e7d32":"#c0392b"}">${net>=0?"+":""}${net.toLocaleString()} ل.س</div></div>
</body></html>`;

  const w = window.open("","_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); }
}

// ════════════════════════════════════════════════════════════
// SHARED STYLES
// ════════════════════════════════════════════════════════════
const inputSt: CSSProperties = {
  width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
  fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
  outline:"none", boxSizing:"border-box",
};
const labelSt: CSSProperties = { fontSize:12, fontWeight:600, color:"#555", marginBottom:6, display:"block" };

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BOTTOM SHEET WRAPPER
// ════════════════════════════════════════════════════════════
function Sheet({ onClose, children }: { onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(8,99,186,.18)",animation:"slideUp .28s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ width:40,height:4,background:"#e0e0e0",borderRadius:4,margin:"12px auto 0",flexShrink:0 }}/>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// APPOINTMENT MODAL  (مطابق لصفحة المواعيد)
// ════════════════════════════════════════════════════════════
function AppointmentModal({ lang, appt, defaultDate, patients, appointments, doctors, onSave, onClose, onDelete, onStatusChange, saving }: {
  lang:Lang; appt:Appointment|null; defaultDate:string; patients:Patient[];
  appointments:Appointment[]; doctors:any[];
  onSave:(form:any,id?:number)=>void; onClose:()=>void;
  onDelete:(id:number)=>void; onStatusChange:(id:number,status:string)=>void; saving:boolean;
}) {
  const isAr   = lang==="ar";
  const isEdit = !!(appt as any)?.id;
  const apptA  = appt as any;

  const [form, setForm] = useState({
    patient_id: apptA?.patient_id ?? "",
    doctor_id:  apptA?.doctor_id ?? "",
    date:       apptA?.date ?? defaultDate,
    time:       apptA?.time ?? "09:00",
    duration:   apptA?.duration ?? 30,
    type:       apptA?.type ?? "",
    notes:      apptA?.notes ?? "",
    status:     apptA?.status ?? "scheduled",
  });
  const [error, setError] = useState("");
  const [showDel, setShowDel] = useState(false);
  const [patientSearch, setPatientSearch] = useState(() => appt?.patient_id ? patients.find(p=>p.id===appt.patient_id)?.name??"" : "");
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e:MouseEvent) => { if (patRef.current && !patRef.current.contains(e.target as Node)) setPatientDropOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || (p.phone && p.phone.includes(patientSearch))
  );

  const handleSave = () => {
    if (!form.patient_id || !form.date || !form.time) {
      setError(isAr ? "المريض والتاريخ والوقت مطلوبة" : "Patient, date and time are required"); return;
    }
    const toMin = (t:string) => { const [h,m]=t.slice(0,5).split(":").map(Number); return h*60+m; };
    const nS = toMin(form.time); const nE = nS+(form.duration||30);
    const conflict = appointments.find(a => {
      if (a.date!==form.date||a.status==="cancelled") return false;
      if (isEdit && a.id===(appt as any).id) return false;
      const aS=toMin(a.time); const aE=aS+(a.duration||30);
      return nS<aE && nE>aS;
    });
    if (conflict) { setError(isAr?`تعارض مع موعد الساعة ${conflict.time.slice(0,5)}`:`Conflict with appointment at ${conflict.time.slice(0,5)}`); return; }
    onSave(form, (appt as any)?.id);
  };

  const statusList = [
    {s:"scheduled", label:isAr?"✓ محدد":"✓ Scheduled",   color:"#0863ba", bg:"rgba(8,99,186,.08)"},
    {s:"completed", label:isAr?"✓ مكتمل":"✓ Completed",  color:"#2e7d32", bg:"rgba(46,125,50,.08)"},
    {s:"cancelled", label:isAr?"✕ ملغي":"✕ Cancelled",   color:"#c0392b", bg:"rgba(192,57,43,.08)"},
    {s:"no-show",   label:isAr?"⊘ لم يحضر":"⊘ No-Show", color:"#888",   bg:"rgba(136,136,136,.08)"},
  ];

  if (showDel) return (
    <div style={{ position:"fixed",inset:0,zIndex:201,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={()=>setShowDel(false)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"calc(100% - 40px)",maxWidth:380,padding:32,textAlign:"center",boxShadow:"0 24px 80px rgba(192,57,43,.15)",direction:isAr?"rtl":"ltr" }}>
        <div style={{ width:72,height:72,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px" }}>🗑️</div>
        <h3 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:10,fontFamily:"Rubik,sans-serif" }}>{isAr?"حذف الموعد":"Delete Appointment"}</h3>
        <p style={{ fontSize:14,color:"#888",lineHeight:1.7,marginBottom:28,fontFamily:"Rubik,sans-serif" }}>{isAr?"هل أنت متأكد من حذف هذا الموعد؟":"Are you sure you want to delete this appointment?"}</p>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={()=>onDelete((appt as any).id)} style={{ flex:1,padding:"13px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{isAr?"نعم، احذف":"Yes, Delete"}</button>
          <button onClick={()=>setShowDel(false)} style={{ flex:1,padding:"13px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"تراجع":"Cancel"}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"calc(100% - 32px)",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)",direction:isAr?"rtl":"ltr" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",fontFamily:"Rubik,sans-serif" }}>{isEdit?(isAr?"تعديل الموعد":"Edit Appointment"):(isAr?"موعد جديد":"New Appointment")}</h2>
            {isEdit&&<p style={{ fontSize:11,color:"#aaa",marginTop:2 }}>ID: #{(appt as any).id}</p>}
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {isEdit&&<button onClick={()=>setShowDel(true)} style={{ width:36,height:36,borderRadius:8,background:"rgba(192,57,43,.08)",border:"1.5px solid rgba(192,57,43,.2)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:"#c0392b" }}>🗑️</button>}
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          <Field label={isAr?"المريض *":"Patient *"}>
            <div ref={patRef} style={{ position:"relative" }}>
              <input type="text" value={patientSearch}
                onChange={e=>{ setPatientSearch(e.target.value); setPatientDropOpen(true); if (!e.target.value) setForm({...form,patient_id:""}); }}
                onFocus={()=>setPatientDropOpen(true)}
                placeholder={isAr?"ابحث عن مريض...":"Search patient..."}
                style={{ ...inputSt, paddingInlineEnd:36 }} autoComplete="off"/>
              <span style={{ position:"absolute",top:"50%",insetInlineEnd:12,transform:"translateY(-50%)",pointerEvents:"none",fontSize:14,color:"#aaa" }}>{form.patient_id?"✓":"🔍"}</span>
              {patientDropOpen&&(
                <div style={{ position:"absolute",top:"calc(100% + 4px)",insetInlineStart:0,insetInlineEnd:0,background:"#fff",border:"1.5px solid #e0e6ef",borderRadius:12,boxShadow:"0 8px 32px rgba(8,99,186,.13)",zIndex:999,maxHeight:220,overflowY:"auto" }}>
                  {filteredPatients.length===0?(
                    <div style={{ padding:"14px 16px",fontSize:13,color:"#aaa",textAlign:"center" }}>{isAr?"لا توجد نتائج":"No results"}</div>
                  ):filteredPatients.map(p=>(
                    <div key={p.id} onMouseDown={e=>{ e.preventDefault(); setForm({...form,patient_id:p.id}); setPatientSearch(p.name); setPatientDropOpen(false); }}
                      style={{ padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f4f6f9" }}>
                      <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{getInitials(p.name)}</div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{p.name}</div>
                        {p.phone&&<div style={{ fontSize:11,color:"#aaa",direction:"ltr",textAlign:"start" }}>{p.phone}</div>}
                      </div>
                      {form.patient_id===p.id&&<span style={{ marginInlineStart:"auto",color:"#0863ba",fontWeight:700 }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          {doctors.length>0&&(
            <Field label={isAr?"الطبيب":"Doctor"}>
              <select value={form.doctor_id} onChange={e=>setForm({...form,doctor_id:e.target.value?Number(e.target.value):""})} style={{ ...inputSt,cursor:"pointer" }}>
                <option value="">{isAr?"اختر الطبيب":"Select doctor"}</option>
                {doctors.map(d=><option key={d.id} value={d.id}>{d.name}{d.specialty?` — ${d.specialty}`:""}</option>)}
              </select>
            </Field>
          )}
          <div style={{ display:"flex",gap:12 }}>
            <div style={{ flex:1 }}><Field label={isAr?"التاريخ *":"Date *"}><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></Field></div>
            <div style={{ flex:1 }}><Field label={isAr?"الوقت *":"Time *"}>
              <select value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
                {Array.from({length:15*4},(_,i)=>{const t=8*60+i*15;const hh=String(Math.floor(t/60)).padStart(2,"0");const mm=String(t%60).padStart(2,"0");return `${hh}:${mm}`;}).map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </Field></div>
          </div>
          <div style={{ display:"flex",gap:12 }}>
            <div style={{ flex:1 }}><Field label={isAr?"المدة":"Duration"}>
              <select value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})} style={{ ...inputSt,cursor:"pointer" }}>
                {[15,20,30,45,60,90,120].map(d=><option key={d} value={d}>{d} {isAr?"د":"min"}</option>)}
              </select>
            </Field></div>
            <div style={{ flex:1 }}><Field label={isAr?"نوع الزيارة":"Visit Type"}><input value={form.type} onChange={e=>setForm({...form,type:e.target.value})} placeholder={isAr?"مثال: متابعة":"e.g. Follow-up"} style={inputSt}/></Field></div>
          </div>
          <Field label={isAr?"ملاحظات":"Notes"}><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={isAr?"أي ملاحظات...":"Any notes..."} rows={3} style={{ ...inputSt,resize:"vertical" as const,lineHeight:1.6 }}/></Field>
          {isEdit&&(
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#aaa",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>{isAr?"تغيير الحالة":"Update Status"}</div>
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {statusList.map(s=>{
                  const isCur = (appt as any).status===s.s;
                  return <button key={s.s} onClick={()=>{if(!isCur)onStatusChange((appt as any).id,s.s);}} style={{ padding:"8px 14px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:isCur?"default":"pointer",border:isCur?`2px solid ${s.color}`:`1.5px solid ${s.color}30`,background:isCur?s.color:s.bg,color:isCur?"#fff":s.color,transition:"all .2s" }}>{s.label}</button>;
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"13px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {saving?(isAr?"جاري الحفظ...":"Saving..."):isEdit?(isAr?"تحديث":"Update"):(isAr?"حفظ الموعد":"Save")}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PATIENT MODAL  (مطابق لصفحة المرضى)
// ════════════════════════════════════════════════════════════
function PatientModal({ lang, patient, clinicType, onSave, onClose }: {
  lang:Lang; patient:Patient|null; clinicType:ClinicType; onSave:(form:PatientForm,id?:number)=>void; onClose:()=>void;
}) {
  const isAr   = lang==="ar";
  const isEdit = !!patient?.id;
  const meta   = CLINIC_TYPE_META[clinicType]??CLINIC_TYPE_META.general;

  const [form, setForm] = useState<PatientForm>({
    name:patient?.name??"", phone:patient?.phone??"",
    gender:patient?.gender??"", date_of_birth:patient?.date_of_birth??"",
    has_diabetes:(patient as any)?.has_diabetes??false,
    has_hypertension:(patient as any)?.has_hypertension??false,
    notes:(patient as any)?.notes??"", extra_fields:{},
  });
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!form.name.trim()) { setError(isAr?"الاسم مطلوب":"Name is required"); return; }
    if (!form.phone.trim()) { setError(isAr?"رقم الهاتف مطلوب":"Phone is required"); return; }
    onSave(form, patient?.id);
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"16px 24px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",direction:isAr?"rtl":"ltr" }}>
        <div>
          <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",fontFamily:"Rubik,sans-serif" }}>{isEdit?(isAr?"تعديل بيانات المريض":"Edit Patient"):(isAr?"إضافة مريض جديد":"Add New Patient")}</h2>
          <div style={{ fontSize:11,color:meta.color,marginTop:3,fontWeight:600 }}>{meta.icon} {isAr?meta.ar:meta.en}</div>
        </div>
        <button onClick={onClose} style={{ width:34,height:34,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16 }}>✕</button>
      </div>
      <div style={{ padding:"20px 24px",direction:isAr?"rtl":"ltr" }}>
        {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:18 }}>⚠️ {error}</div>}
        <Field label={isAr?"الاسم الكامل *":"Full Name *"}>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder={isAr?"اسم المريض":"Patient name"} style={inputSt}/>
        </Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <Field label={isAr?"رقم الهاتف *":"Phone *"}>
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="05xxxxxxxx" style={inputSt}/>
          </Field>
          <Field label={isAr?"الجنس":"Gender"}>
            <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="">—</option>
              <option value="male">{isAr?"ذكر":"Male"}</option>
              <option value="female">{isAr?"أنثى":"Female"}</option>
            </select>
          </Field>
        </div>
        <Field label={isAr?"تاريخ الميلاد":"Date of Birth"}>
          <input type="date" value={form.date_of_birth} onChange={e=>setForm(p=>({...p,date_of_birth:e.target.value}))} style={inputSt}/>
        </Field>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18 }}>
          {([{key:"has_diabetes" as const,label:isAr?"مريض سكري":"Diabetic",icon:"🩸",color:"#c0392b"},{key:"has_hypertension" as const,label:isAr?"ضغط الدم":"Hypertension",icon:"💊",color:"#e67e22"}]).map(c=>{
            const checked = form[c.key];
            return (
              <label key={c.key} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,cursor:"pointer",border:checked?`1.5px solid ${c.color}40`:"1.5px solid #eef0f3",background:checked?`${c.color}08`:"#fafbfc",transition:"all .2s" }}>
                <span style={{ fontSize:18 }}>{c.icon}</span>
                <span style={{ fontSize:13,fontWeight:checked?700:400,color:checked?c.color:"#666",flex:1 }}>{c.label}</span>
                <div style={{ width:18,height:18,borderRadius:5,background:checked?c.color:"transparent",border:`2px solid ${checked?c.color:"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  {checked&&<span style={{ color:"#fff",fontSize:10,fontWeight:900 }}>✓</span>}
                </div>
                <input type="checkbox" checked={checked} onChange={e=>setForm(p=>({...p,[c.key]:e.target.checked}))} style={{ display:"none" }}/>
              </label>
            );
          })}
        </div>
        <Field label={isAr?"ملاحظات":"Notes"}>
          <textarea value={form.notes??""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder={isAr?"أي ملاحظات...":"Any notes..."} rows={3} style={{ ...inputSt,resize:"vertical" as const,lineHeight:1.6 }}/>
        </Field>
      </div>
      <div style={{ padding:"12px 24px 32px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3",direction:isAr?"rtl":"ltr" }}>
        <button onClick={handleSave} style={{ flex:1,padding:"14px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
          {isEdit?(isAr?"حفظ التعديلات":"Save Changes"):(isAr?"حفظ المريض":"Save Patient")}
        </button>
        <button onClick={onClose} style={{ padding:"14px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
      </div>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// PATIENT PROFILE DRAWER (السجل الطبي)
// ════════════════════════════════════════════════════════════
function PatientProfileDrawer({ lang, patient, clinicType, onClose }: {
  lang:Lang; patient:Patient; clinicType:ClinicType; onClose:()=>void;
}) {
  const isAr    = lang==="ar";
  const meta    = CLINIC_TYPE_META[clinicType]??CLINIC_TYPE_META.general;
  const fields  = MEDICAL_FIELDS_BY_TYPE[clinicType]??MEDICAL_FIELDS_BY_TYPE.general;
  const calcAge = (dob?:string|null) => !dob?"—":Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));

  const [profile, setProfile]   = useState<PatientProfile>({medical_fields:{},dental_chart:{},xrays:[],extra_form_fields:{}});
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [userId,  setUserId]    = useState("");
  const [drafts,  setDrafts]    = useState<Record<string,string>>({});
  const [fSaving, setFSaving]   = useState<string|null>(null);
  const [fSaved,  setFSaved]    = useState<string|null>(null);
  const [expanded,setExpanded]  = useState<string|null>(null);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const { data:{user} } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const saved = await loadProfileFromDB(patient.id);
      if (saved) { setProfile(saved); setDrafts(saved.medical_fields??{}); }
      setLoading(false);
    })();
  },[patient.id]);

  const saveField = async (key:string) => {
    const value = drafts[key]??"";
    const updated:PatientProfile = { ...profile, medical_fields:{...profile.medical_fields,[key]:value} };
    setFSaving(key); setProfile(updated);
    if (userId) await saveProfileToDB(patient.id,userId,updated);
    setFSaving(null); setFSaved(key); setExpanded(null);
    setTimeout(()=>setFSaved(prev=>prev===key?null:prev),2000);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-start",justifyContent:"center",overflow:"auto" }}>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"calc(100% - 32px)",maxWidth:560,margin:"20px auto",boxShadow:"0 24px 64px rgba(8,99,186,.2)",animation:"modalIn .28s cubic-bezier(.4,0,.2,1)",direction:isAr?"rtl":"ltr" }}>
        {/* header */}
        <div style={{ padding:"20px 24px 16px",borderBottom:"1.5px solid #eef0f3" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:48,height:48,borderRadius:14,background:getColor(patient.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0 }}>{getInitials(patient.name)}</div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#353535" }}>{patient.name}</div>
                <div style={{ fontSize:12,color:"#888",marginTop:2 }}>{patient.phone} {calcAge(patient.date_of_birth)!=="—"?`· ${calcAge(patient.date_of_birth)} ${isAr?"سنة":"yr"}`:""}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ width:34,height:34,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16,flexShrink:0 }}>✕</button>
          </div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",background:`${meta.color}10`,borderRadius:8,border:`1px solid ${meta.color}25` }}>
            <span>{meta.icon}</span>
            <span style={{ fontSize:12,fontWeight:600,color:meta.color }}>{isAr?meta.ar:meta.en}</span>
          </div>
        </div>
        {/* content */}
        <div style={{ padding:"20px 24px 32px",maxHeight:"60vh",overflowY:"auto" }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>{isAr?"📋 السجل الطبي":"📋 Medical Record"}</div>
          {loading?(
            <div style={{ textAlign:"center",padding:"32px 0",color:"#aaa",fontSize:13 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
          ):fields.map(f=>{
            const isExp  = expanded===f.key;
            const val    = profile.medical_fields[f.key]??"";
            const draft  = drafts[f.key]??"";
            const isSav  = fSaving===f.key;
            const isDone = fSaved===f.key;
            return (
              <div key={f.key} style={{ border:"1.5px solid #eef0f3",borderRadius:12,marginBottom:10,overflow:"hidden",transition:"all .2s" }}>
                <div onClick={()=>setExpanded(isExp?null:f.key)} style={{ padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",background:isExp?"#f7f9ff":"#fff" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:18 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{isAr?f.label_ar:f.label_en}</div>
                      {!isExp&&val&&<div style={{ fontSize:11,color:"#888",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220 }}>{val}</div>}
                      {!isExp&&!val&&<div style={{ fontSize:11,color:"#ccc",marginTop:2 }}>{isAr?"لم يُسجَّل بعد":"Not recorded yet"}</div>}
                    </div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    {isDone&&<span style={{ fontSize:11,color:"#2e7d32",fontWeight:700 }}>✓ {isAr?"تم الحفظ":"Saved"}</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" style={{ transform:isExp?"rotate(180deg)":"none",transition:"transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                {isExp&&(
                  <div style={{ padding:"0 16px 16px",background:"#f7f9ff",borderTop:"1px solid #eef0f3" }}>
                    {f.type==="textarea"?(
                      <textarea value={draft} onChange={e=>setDrafts(d=>({...d,[f.key]:e.target.value}))} rows={4} placeholder={isAr?"اكتب هنا...":"Write here..."} style={{ ...inputSt,resize:"vertical" as const,lineHeight:1.6,marginTop:12,background:"#fff" }}/>
                    ):(
                      <input value={draft} onChange={e=>setDrafts(d=>({...d,[f.key]:e.target.value}))} placeholder={isAr?"اكتب هنا...":"Write here..."} style={{ ...inputSt,marginTop:12,background:"#fff" }}/>
                    )}
                    <div style={{ display:"flex",gap:8,marginTop:10 }}>
                      <button onClick={()=>saveField(f.key)} disabled={isSav} style={{ flex:1,padding:"10px",background:PRIMARY,color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:isSav?"not-allowed":"pointer",opacity:isSav?0.7:1 }}>
                        {isSav?(isAr?"جاري الحفظ...":"Saving..."):(isAr?"حفظ":"Save")}
                      </button>
                      <button onClick={()=>setExpanded(null)} style={{ padding:"10px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DELETE PATIENT MODAL
// ════════════════════════════════════════════════════════════
function DeletePatientModal({ lang, patient, onConfirm, onClose }: { lang:Lang; patient:Patient; onConfirm:()=>void; onClose:()=>void }) {
  const isAr = lang==="ar";
  return (
    <div style={{ position:"fixed",inset:0,zIndex:201,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:420,padding:"0 0 32px",boxShadow:"0 -8px 40px rgba(0,0,0,.15)",animation:"slideUp .3s cubic-bezier(.4,0,.2,1)",direction:isAr?"rtl":"ltr" }}>
        <div style={{ width:40,height:4,background:"#e0e0e0",borderRadius:4,margin:"12px auto 0" }}/>
        <div style={{ textAlign:"center",padding:"24px 32px 20px" }}>
          <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px" }}>🗑️</div>
          <h2 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:8,fontFamily:"Rubik,sans-serif" }}>{isAr?"حذف المريض":"Delete Patient"}</h2>
          <p style={{ fontSize:14,color:"#888",lineHeight:1.6,fontFamily:"Rubik,sans-serif" }}>{isAr?"هل أنت متأكد من حذف":"Are you sure you want to delete"} <strong style={{ color:"#353535" }}>{patient.name}</strong>؟<br/><span style={{ color:"#c0392b",fontSize:12 }}>{isAr?"لا يمكن التراجع عن هذا الإجراء":"This action cannot be undone"}</span></p>
        </div>
        <div style={{ display:"flex",gap:12,padding:"0 24px" }}>
          <button onClick={onConfirm} style={{ flex:1,padding:"14px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{isAr?"نعم، احذف":"Yes, Delete"}</button>
          <button onClick={onClose} style={{ flex:1,padding:"14px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"تراجع":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ════════════════════════════════════════════════════════════
function PaymentModal({ patients, lang, onSave, onClose }: { patients:Patient[]; lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({ patient_id:0,amount:"",description:"",method:"cash" as PayMethod,date:today,status:"paid" as PayStatus,notes:"" });
  const [error,setError] = useState("");
  const [patQ,setPatQ] = useState("");
  const [showDrop,setShowDrop] = useState(false);
  const filtPat = patients.filter(p=>p.name.includes(patQ)||p.phone?.includes(patQ));
  const selPat  = patients.find(p=>p.id===form.patient_id);

  const save = () => {
    if (!form.patient_id||!form.amount){setError(isAr?"المريض والمبلغ مطلوبان":"Patient and amount are required");return;}
    onSave({ ...form, amount:parseFloat(form.amount)||0 });
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"16px 24px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{isAr?"تسجيل دفعة":"Record Payment"}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ margin:"12px 24px 0",background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b" }}>⚠️ {error}</div>}
      <div style={{ padding:"16px 24px",display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ position:"relative" }}>
          <label style={labelSt}>{isAr?"المريض *":"Patient *"}</label>
          <input value={selPat?selPat.name:patQ} onChange={e=>{setPatQ(e.target.value);setForm({...form,patient_id:0});setShowDrop(true);}} onFocus={()=>setShowDrop(true)} placeholder={isAr?"ابحث عن مريض...":"Search patient..."} style={inputSt}/>
          {showDrop&&filtPat.length>0&&(
            <div style={{ position:"absolute",top:"calc(100% + 4px)",insetInlineStart:0,insetInlineEnd:0,background:"#fff",border:"1.5px solid #e0e6ef",borderRadius:12,boxShadow:"0 8px 32px rgba(8,99,186,.13)",zIndex:999,maxHeight:180,overflowY:"auto" }}>
              {filtPat.slice(0,6).map(p=>(
                <div key={p.id} onMouseDown={e=>{e.preventDefault();setForm({...form,patient_id:p.id});setPatQ("");setShowDrop(false);}} style={{ padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f5f5f5" }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700 }}>{getInitials(p.name)}</div>
                  <span style={{ fontSize:14 }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{isAr?"المبلغ (ل.س) *":"Amount *"}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt}/></div>
          <div><label style={labelSt}>{isAr?"التاريخ *":"Date *"}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{isAr?"الوصف":"Description"}</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={isAr?"مثال: رسوم استشارة...":"e.g. Consultation fee..."} style={inputSt}/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{isAr?"طريقة الدفع":"Method"}</label>
            <select value={form.method} onChange={e=>setForm({...form,method:e.target.value as PayMethod})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="cash">{isAr?"نقداً":"Cash"}</option>
              <option value="card">{isAr?"بطاقة":"Card"}</option>
              <option value="transfer">{isAr?"تحويل":"Transfer"}</option>
            </select>
          </div>
          <div><label style={labelSt}>{isAr?"الحالة":"Status"}</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as PayStatus})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="paid">{isAr?"مدفوع":"Paid"}</option>
              <option value="pending">{isAr?"معلّق":"Pending"}</option>
            </select>
          </div>
        </div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} style={{ flex:1,padding:"13px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>{isAr?"حفظ الدفعة":"Save Payment"}</button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// WITHDRAW MODAL
// ════════════════════════════════════════════════════════════
function WithdrawModal({ lang, onSave, onClose }: { lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({ amount:"",reason:"",date:today,notes:"" });
  const [error,setError] = useState("");
  const save = () => {
    if (!form.amount||!form.reason){setError(isAr?"المبلغ والسبب مطلوبان":"Amount and reason are required");return;}
    onSave({ ...form,amount:parseFloat(form.amount)||0 });
  };
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"16px 24px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{isAr?"تسجيل سحب":"Record Withdrawal"}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ margin:"12px 24px 0",background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b" }}>⚠️ {error}</div>}
      <div style={{ padding:"16px 24px",display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{isAr?"المبلغ (ل.س) *":"Amount *"}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inputSt}/></div>
          <div><label style={labelSt}>{isAr?"التاريخ *":"Date *"}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{isAr?"سبب السحب *":"Reason *"}</label><input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder={isAr?"مثال: مصروف شخصي...":"e.g. Personal expense..."} style={inputSt}/></div>
        <div><label style={labelSt}>{isAr?"ملاحظات":"Notes"}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inputSt,resize:"none" as const }}/></div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} style={{ flex:1,padding:"13px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer" }}>{isAr?"تأكيد السحب":"Confirm"}</button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// EXPENSE MODAL
// ════════════════════════════════════════════════════════════
function ExpenseModal({ lang, onSave, onClose }: { lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const cats = isAr
    ? {rent:"إيجار",supplies:"مستلزمات طبية",salary:"رواتب",utilities:"فواتير",maintenance:"صيانة",other:"أخرى"}
    : {rent:"Rent",supplies:"Medical Supplies",salary:"Salary",utilities:"Utilities",maintenance:"Maintenance",other:"Other"};
  const [form,setForm] = useState({ amount:"",category:"",description:"",date:today,notes:"" });
  const [error,setError] = useState("");
  const save = () => {
    if (!form.amount||!form.category||!form.description){setError(isAr?"جميع الحقول المطلوبة يجب ملؤها":"All required fields must be filled");return;}
    onSave({ ...form,amount:parseFloat(form.amount)||0 });
  };
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"16px 24px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{isAr?"تسجيل مصروف":"Record Expense"}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ margin:"12px 24px 0",background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b" }}>⚠️ {error}</div>}
      <div style={{ padding:"16px 24px",display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{isAr?"المبلغ (ل.س) *":"Amount *"}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inputSt}/></div>
          <div><label style={labelSt}>{isAr?"التاريخ *":"Date *"}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{isAr?"التصنيف *":"Category *"}</label>
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
            <option value="">—</option>
            {Object.entries(cats).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label style={labelSt}>{isAr?"الوصف *":"Description *"}</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={isAr?"مثال: فاتورة الكهرباء...":"e.g. Electricity bill..."} style={inputSt}/></div>
        <div><label style={labelSt}>{isAr?"ملاحظات":"Notes"}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} style={{ ...inputSt,resize:"none" as const }}/></div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} style={{ flex:1,padding:"13px",background:"#7b2d8b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer" }}>{isAr?"حفظ المصروف":"Save Expense"}</button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </Sheet>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function SecretaryPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);

  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [doctors,      setDoctors]      = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments,     setPayments]     = useState<Payment[]>([]);
  const [withdrawals,  setWithdrawals]  = useState<any[]>([]);
  const [expenses,     setExpenses]     = useState<any[]>([]);
  const [clinicName,   setClinicName]   = useState("نبض");
  const [clinicType,   setClinicType]   = useState<ClinicType>("general");
  const [loading,      setLoading]      = useState(true);

  const [activeTab,     setActiveTab]     = useState<Tab>("appointments");
  const [selectedDate,  setSelectedDate]  = useState(today);
  const [patSearch,     setPatSearch]     = useState("");

  const [showApptModal, setShowApptModal] = useState(false);
  const [editAppt,      setEditAppt]      = useState<Appointment|null>(null);
  const [apptSaving,    setApptSaving]    = useState(false);
  const [showPatModal,  setShowPatModal]  = useState(false);
  const [editPat,       setEditPat]       = useState<Patient|null>(null);
  const [delPat,        setDelPat]        = useState<Patient|null>(null);
  const [profilePat,    setProfilePat]    = useState<Patient|null>(null);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showWDModal,   setShowWDModal]   = useState(false);
  const [showExpModal,  setShowExpModal]  = useState(false);

  useEffect(()=>{ loadData(); },[]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data:clinicRow } = await supabase.from("clinics").select("name,plan,clinic_type").eq("user_id",user.id).single();
      if (clinicRow?.name) setClinicName(clinicRow.name);
      if (clinicRow?.clinic_type) setClinicType(clinicRow.clinic_type as ClinicType);

      const [{ data:apptData },{ data:patData },{ data:payData },{ data:wdData },{ data:exData }] = await Promise.all([
        supabase.from("appointments").select("*").eq("user_id",user.id).order("date",{ascending:true}).order("time",{ascending:true}),
        supabase.from("patients").select("*").eq("user_id",user.id).eq("is_hidden",false).order("name"),
        supabase.from("payments").select("*").eq("user_id",user.id).order("date",{ascending:false}),
        supabase.from("clinic_withdrawals").select("*").eq("user_id",user.id).order("date",{ascending:false}),
        supabase.from("clinic_expenses").select("*").eq("user_id",user.id).order("date",{ascending:false}),
      ]);

      setAppointments(apptData||[]);
      setPatients((patData||[]) as unknown as Patient[]);
      setPayments(payData||[]);
      setWithdrawals(wdData||[]);
      setExpenses(exData||[]);

      const plan = clinicRow?.plan||"basic";
      if (["shared_basic","shared_pro","shared_enterprise"].includes(plan)) {
        const { data:drData } = await supabase.from("doctors").select("id,name,color,specialty").eq("user_id",user.id).eq("is_active",true).order("id");
        setDoctors(drData||[]);
      }
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  // ── Appointments ────────────────────────────────────────
  const handleSaveAppt = async (data:any, id?:number) => {
    setApptSaving(true);
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) return;
      if (id) {
        const { data:updated } = await supabase.from("appointments").update(data).eq("id",id).select().single();
        if (updated) setAppointments(prev=>prev.map(a=>a.id===id?updated:a));
      } else {
        const { data:inserted } = await supabase.from("appointments").insert({ ...data,user_id:user.id,status:"scheduled" }).select().single();
        if (inserted) setAppointments(prev=>[...prev,inserted]);
      }
      setShowApptModal(false); setEditAppt(null);
    } catch(e){ console.error(e); }
    finally { setApptSaving(false); }
  };

  const handleDeleteAppt = async (id:number) => {
    await supabase.from("appointments").delete().eq("id",id);
    setAppointments(prev=>prev.filter(a=>a.id!==id));
    setShowApptModal(false); setEditAppt(null);
  };

  const handleStatusChange = async (id:number, status:string) => {
    const { data:updated } = await supabase.from("appointments").update({status}).eq("id",id).select().single();
    if (updated) setAppointments(prev=>prev.map(a=>a.id===id?updated:a));
  };

  // ── Patients ────────────────────────────────────────────
  const handleSavePat = async (form:PatientForm, id?:number) => {
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) return;
      if (id) {
        const { data:updated } = await supabase.from("patients").update(form).eq("id",id).select().single();
        if (updated) setPatients(prev=>prev.map(p=>p.id===id?updated as unknown as Patient:p));
      } else {
        const { data:inserted } = await supabase.from("patients").insert({ ...form,user_id:user.id,is_hidden:false }).select().single();
        if (inserted) setPatients(prev=>[inserted as unknown as Patient,...prev]);
      }
      setShowPatModal(false); setEditPat(null);
    } catch(e){ console.error(e); }
  };

  const handleDeletePat = async () => {
    if (!delPat) return;
    await supabase.from("patients").update({ is_hidden:true }).eq("id",delPat.id);
    setPatients(prev=>prev.filter(p=>p.id!==delPat.id));
    setDelPat(null);
  };

  // ── Finance ─────────────────────────────────────────────
  const handleSavePay = async (data:any) => {
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("payments").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setPayments(prev=>[inserted,...prev]);
      setShowPayModal(false);
    } catch(e){ console.error(e); }
  };

  const handleCancelPayment = async (id:number) => {
    const { data:updated } = await supabase.from("payments").update({status:"cancelled"}).eq("id",id).select().single();
    if (updated) setPayments(prev=>prev.map(p=>p.id===id?updated:p));
  };

  const handleSaveWD = async (data:any) => {
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("clinic_withdrawals").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setWithdrawals(prev=>[inserted,...prev]);
      setShowWDModal(false);
    } catch(e){ console.error(e); }
  };

  const handleDeleteWD = async (id:number) => {
    await supabase.from("clinic_withdrawals").delete().eq("id",id);
    setWithdrawals(prev=>prev.filter(w=>w.id!==id));
  };

  const handleSaveExp = async (data:any) => {
    try {
      const { data:{user} } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("clinic_expenses").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setExpenses(prev=>[inserted,...prev]);
      setShowExpModal(false);
    } catch(e){ console.error(e); }
  };

  const handleDeleteExp = async (id:number) => {
    await supabase.from("clinic_expenses").delete().eq("id",id);
    setExpenses(prev=>prev.filter(e=>e.id!==id));
  };

  // ── Computed ────────────────────────────────────────────
  const dayAppts = useMemo(()=>appointments.filter(a=>a.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),[appointments,selectedDate]);
  const filtPats  = useMemo(()=>patients.filter(p=>p.name.includes(patSearch)||p.phone?.includes(patSearch)),[patients,patSearch]);

  const todayTx = useMemo(()=>{
    const tp = payments.filter(p=>p.date===today).map(p=>({...p,_type:"income"}));
    const tw = withdrawals.filter(w=>w.date===today).map(w=>({...w,_type:"withdrawal"}));
    const te = expenses.filter(e=>e.date===today).map(e=>({...e,_type:"expense"}));
    return [...tp,...tw,...te].sort((a:any,b:any)=>(b.created_at||b.date).localeCompare(a.created_at||a.date));
  },[payments,withdrawals,expenses,today]);

  const dateStrip = useMemo(()=>Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-3+i); return d.toISOString().slice(0,10); }),[]);

  const fmtTime = (t:string) => { const [h,m]=t.slice(0,5).split(":").map(Number); const ap=h>=12?"م":"ص"; return `${h>12?h-12:h||12}:${String(m).padStart(2,"0")} ${isAr?ap:(h>=12?"PM":"AM")}`; };
  const fmtShort = (d:string) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory":"en-GB",{month:"short",day:"numeric"});
  const calcAge  = (dob?:string|null) => !dob?null:Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));
  const weekDay  = (d:string) => ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][new Date(d+"T00:00:00").getDay()];

  const sBadge = (s:string) => ({
    scheduled:  {bg:"rgba(8,99,186,.1)",   color:"#0863ba"},
    completed:  {bg:"rgba(46,125,50,.1)",   color:"#2e7d32"},
    cancelled:  {bg:"rgba(192,57,43,.1)",  color:"#c0392b"},
    "no-show":  {bg:"rgba(136,136,136,.1)",color:"#888"},
  }[s]||{bg:"rgba(8,99,186,.1)",color:"#0863ba"});

  const sLabel = (s:string) => (isAr
    ? {scheduled:"محدد",completed:"مكتمل",cancelled:"ملغي","no-show":"لم يحضر"}
    : {scheduled:"Scheduled",completed:"Completed",cancelled:"Cancelled","no-show":"No Show"}
  )[s]||s;

  if (loading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif",background:"#fafbfc" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48,height:48,border:"3px solid #e0e6ef",borderTop:`3px solid ${PRIMARY}`,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
        <div style={{ color:"#888",fontSize:14 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
      </div>
    </div>
  );

  return (
    <div dir={isAr?"rtl":"ltr"} style={{ minHeight:"100vh",background:"#fafbfc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .tab-pane{width:100%;padding:0 16px 100px}
        input,select,textarea{font-family:Rubik,sans-serif;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
        .card-hover:active{background:#f0f7ff!important;transform:scale(.99)}
        .date-btn:active{transform:scale(.95)}
        .act-btn:active{opacity:.75;transform:scale(.97)}
      `}</style>

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div style={{ background:SB_BG,position:"sticky",top:0,zIndex:50,paddingBottom:0 }}>
        <div style={{ padding:"14px 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,background:"rgba(255,255,255,.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🏥</div>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:"#fff",lineHeight:1.1 }}>{clinicName}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.6)" }}>{isAr?"لوحة السكرتيرة":"Secretary Dashboard"}</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")} style={{ padding:"5px 10px",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,cursor:"pointer",fontSize:12,color:"rgba(255,255,255,.9)",fontFamily:"Rubik,sans-serif" }}>{lang==="ar"?"EN":"AR"}</button>
            <button onClick={()=>{supabase.auth.signOut();window.location.href="/login";}} style={{ padding:"5px 10px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.3)",borderRadius:8,cursor:"pointer",fontSize:12,color:"#ffb3a7",fontFamily:"Rubik,sans-serif" }}>{isAr?"خروج":"Sign Out"}</button>
          </div>
        </div>
        {/* TAB BAR */}
        <div style={{ display:"flex",borderBottom:"2px solid rgba(255,255,255,.1)" }}>
          {(["appointments","patients","finance"] as Tab[]).map(tab=>{
            const labels = isAr ? {appointments:"المواعيد",patients:"المرضى",finance:"المالية"} : {appointments:"Appointments",patients:"Patients",finance:"Finance"};
            const icons  = {appointments:"📅",patients:"👤",finance:"💰"};
            const active = activeTab===tab;
            return (
              <button key={tab} onClick={()=>setActiveTab(tab)}
                style={{ flex:1,padding:"10px 4px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:active?700:400,color:active?"#fff":"rgba(255,255,255,.55)",borderBottom:active?"2.5px solid #7dd3fc":"2.5px solid transparent",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap" }}>
                {icons[tab]} {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TAB: APPOINTMENTS ═══════════════════════════════ */}
      <div className="tab-pane" style={{ display:activeTab==="appointments"?"block":"none" }}>
        {/* date strip */}
        <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"14px 0 4px",scrollbarWidth:"none" }}>
          {dateStrip.map(d=>{
            const isSel   = d===selectedDate;
            const isTdy   = d===today;
            const cnt     = appointments.filter(a=>a.date===d).length;
            const dayObj  = new Date(d+"T00:00:00");
            return (
              <button key={d} className="date-btn" onClick={()=>setSelectedDate(d)}
                style={{ minWidth:54,padding:"8px 6px",borderRadius:12,border:isSel?"2px solid "+PRIMARY:"1.5px solid #e8edf3",background:isSel?PRIMARY:"#fff",cursor:"pointer",flexShrink:0,textAlign:"center",transition:"all .2s",boxShadow:isSel?"0 4px 12px rgba(8,99,186,.2)":"none" }}>
                <div style={{ fontSize:10,fontWeight:600,color:isSel?"rgba(255,255,255,.8)":(isTdy?PRIMARY:"#999"),marginBottom:2 }}>{weekDay(d).slice(0,3)}</div>
                <div style={{ fontSize:17,fontWeight:800,color:isSel?"#fff":(isTdy?PRIMARY:"#353535") }}>{dayObj.getDate()}</div>
                {cnt>0&&<div style={{ width:16,height:16,borderRadius:"50%",background:isSel?"rgba(255,255,255,.3)":"rgba(8,99,186,.1)",color:isSel?"#fff":PRIMARY,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",margin:"4px auto 0" }}>{cnt}</div>}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"12px 0 10px" }}>
          <div style={{ fontSize:13,fontWeight:600,color:"#555" }}>{fmtShort(selectedDate)} — {dayAppts.length} {isAr?"مواعيد":"appts"}</div>
          <button className="act-btn" onClick={()=>{setEditAppt(null);setShowApptModal(true);}} style={{ padding:"7px 14px",background:PRIMARY,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:5,boxShadow:"0 3px 10px rgba(8,99,186,.25)" }}>
            + {isAr?"موعد":"Appointment"}
          </button>
        </div>
        {dayAppts.length===0?(
          <div style={{ textAlign:"center",padding:"48px 0",color:"#aaa" }}>
            <div style={{ fontSize:36,marginBottom:10 }}>📭</div>
            <div style={{ fontSize:14 }}>{isAr?"لا توجد مواعيد":"No appointments"}</div>
          </div>
        ):dayAppts.map(appt=>{
          const patient = patients.find(p=>p.id===appt.patient_id);
          const doctor  = doctors.find(d=>d.id===(appt as any).doctor_id);
          const sb      = sBadge(appt.status);
          return (
            <div key={appt.id} className="card-hover" onClick={()=>{setEditAppt(appt);setShowApptModal(true);}}
              style={{ background:"#fff",borderRadius:14,padding:"14px",marginBottom:10,display:"flex",alignItems:"center",gap:12,border:"1.5px solid #eef0f3",cursor:"pointer",transition:"all .15s",boxShadow:"0 2px 8px rgba(0,0,0,.04)",animation:"fadeIn .25s ease" }}>
              <div style={{ textAlign:"center",minWidth:44,flexShrink:0 }}>
                <div style={{ fontSize:14,fontWeight:800,color:PRIMARY }}>{fmtTime(appt.time)}</div>
                {(appt as any).duration&&<div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{(appt as any).duration}{isAr?"د":"m"}</div>}
              </div>
              <div style={{ width:2,alignSelf:"stretch",background:sb.bg,borderRadius:2,flexShrink:0 }}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:patient?getColor(patient.id):"#ccc",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>{patient?getInitials(patient.name):"?"}</div>
                  <span style={{ fontWeight:600,fontSize:14,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{patient?.name||"—"}</span>
                </div>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                  <span style={{ padding:"2px 8px",borderRadius:20,background:sb.bg,color:sb.color,fontSize:11,fontWeight:600 }}>{sLabel(appt.status)}</span>
                  {(appt as any).type&&<span style={{ fontSize:11,color:"#888" }}>{(appt as any).type}</span>}
                  {doctor&&<span style={{ fontSize:11,color:doctor.color||PRIMARY }}>• {doctor.name}</span>}
                </div>
              </div>
              <div style={{ fontSize:18,color:"#ddd",flexShrink:0 }}>›</div>
            </div>
          );
        })}
      </div>

      {/* ══ TAB: PATIENTS ═══════════════════════════════════ */}
      <div className="tab-pane" style={{ display:activeTab==="patients"?"block":"none" }}>
        <div style={{ position:"sticky",top:0,background:"#fafbfc",paddingTop:14,paddingBottom:10,zIndex:10 }}>
          <div style={{ display:"flex",gap:8,marginBottom:8 }}>
            <div style={{ flex:1,position:"relative" }}>
              <span style={{ position:"absolute",top:"50%",insetInlineStart:12,transform:"translateY(-50%)",fontSize:14,color:"#aaa",pointerEvents:"none" }}>🔍</span>
              <input value={patSearch} onChange={e=>setPatSearch(e.target.value)}
                placeholder={isAr?"بحث بالاسم أو الهاتف...":"Search by name or phone..."}
                style={{ ...inputSt,paddingInlineStart:36 }}/>
            </div>
            <button className="act-btn" onClick={()=>{setEditPat(null);setShowPatModal(true);}}
              style={{ padding:"10px 16px",background:PRIMARY,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,flexShrink:0,boxShadow:"0 3px 10px rgba(8,99,186,.25)" }}>
              + {isAr?"جديد":"New"}
            </button>
          </div>
          <div style={{ fontSize:12,color:"#aaa" }}>{filtPats.length} {isAr?"مريض":"patients"}</div>
        </div>
        {filtPats.length===0?(
          <div style={{ textAlign:"center",padding:"48px 0",color:"#aaa" }}>
            <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
            <div style={{ fontSize:14 }}>{isAr?"لا توجد نتائج":"No results"}</div>
          </div>
        ):filtPats.map(p=>{
          const age = calcAge(p.date_of_birth as unknown as string);
          return (
            <div key={p.id} style={{ background:"#fff",borderRadius:14,padding:"0",marginBottom:8,border:"1.5px solid #eef0f3",overflow:"hidden",animation:"fadeIn .2s ease" }}>
              <div style={{ padding:"14px",display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:42,height:42,borderRadius:12,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0 }}>{getInitials(p.name)}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:"#353535",marginBottom:3 }}>{p.name}</div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                    {p.phone&&<span style={{ fontSize:12,color:"#888",direction:"ltr" }}>{p.phone}</span>}
                    {age&&<span style={{ fontSize:11,background:"#f0f7ff",color:PRIMARY,padding:"1px 7px",borderRadius:10,fontWeight:600 }}>{age} {isAr?"سنة":"yr"}</span>}
                    {p.gender&&<span style={{ fontSize:11,color:(p.gender==="male")?"#2980b9":"#8e44ad",background:(p.gender==="male")?"rgba(41,128,185,.08)":"rgba(142,68,173,.08)",padding:"1px 7px",borderRadius:10,fontWeight:600 }}>{isAr?(p.gender==="male"?"ذكر":"أنثى"):(p.gender==="male"?"Male":"Female")}</span>}
                  </div>
                </div>
              </div>
              {/* action bar */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0,borderTop:"1px solid #f0f2f5" }}>
                {[
                  { icon:"📋", label:isAr?"السجل":"Record", fn:()=>setProfilePat(p), color:PRIMARY, bg:"rgba(8,99,186,.04)" },
                  { icon:"✏️", label:isAr?"تعديل":"Edit",  fn:()=>{setEditPat(p);setShowPatModal(true);}, color:"#2e7d32", bg:"rgba(46,125,50,.04)" },
                  { icon:"📅", label:isAr?"موعد":"Appt",   fn:()=>{setEditAppt(null);setShowApptModal(true);}, color:"#e67e22", bg:"rgba(230,126,34,.04)" },
                  { icon:"🗑️", label:isAr?"حذف":"Delete", fn:()=>setDelPat(p), color:"#c0392b", bg:"rgba(192,57,43,.04)" },
                ].map((btn,i)=>(
                  <button key={i} onClick={btn.fn} style={{ padding:"10px 4px",background:btn.bg,border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,color:btn.color,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderInlineEnd:i<3?"1px solid #f0f2f5":"none" }}>
                    <span style={{ fontSize:16 }}>{btn.icon}</span>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ TAB: FINANCE ════════════════════════════════════ */}
      <div className="tab-pane" style={{ display:activeTab==="finance"?"block":"none" }}>
        <div style={{ paddingTop:14 }}>
          {/* تقرير يومي */}
          <button className="act-btn" onClick={()=>exportDailyReportHTML(payments,withdrawals,expenses,patients,clinicName)}
            style={{ width:"100%",padding:"14px",background:PRIMARY,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:14,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            📄 {isAr?"تصدير التقرير اليومي":"Export Daily Report"}
          </button>

          {/* action buttons */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
            {[
              { label:isAr?"دفعة":"Payment",   icon:"💵", color:PRIMARY,    bg:"rgba(8,99,186,.06)",   border:"rgba(8,99,186,.15)",   fn:()=>setShowPayModal(true) },
              { label:isAr?"سحب":"Withdraw",   icon:"💸", color:"#c0392b",  bg:"rgba(192,57,43,.06)",  border:"rgba(192,57,43,.15)",  fn:()=>setShowWDModal(true)  },
              { label:isAr?"مصروف":"Expense",  icon:"🏪", color:"#7b2d8b",  bg:"rgba(123,45,139,.06)", border:"rgba(123,45,139,.15)", fn:()=>setShowExpModal(true) },
            ].map(btn=>(
              <button key={btn.label} className="act-btn" onClick={btn.fn}
                style={{ padding:"14px 6px",background:btn.bg,border:`1.5px solid ${btn.border}`,borderRadius:14,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,color:btn.color,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                <span style={{ fontSize:22 }}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* today's transactions */}
          <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:10,display:"flex",alignItems:"center",gap:8 }}>
            📋 {isAr?"معاملات اليوم":"Today's Transactions"}
            <span style={{ background:"#f0f7ff",color:PRIMARY,fontSize:11,padding:"2px 8px",borderRadius:10,fontWeight:600 }}>{todayTx.length}</span>
          </div>

          {todayTx.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0",color:"#aaa" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🗒️</div>
              <div style={{ fontSize:13 }}>{isAr?"لا توجد معاملات اليوم":"No transactions today"}</div>
            </div>
          ):todayTx.map((tx:any,i)=>{
            const isIn  = tx._type==="income";
            const isWD  = tx._type==="withdrawal";
            const color = isIn?"#2e7d32":isWD?"#c0392b":"#7b2d8b";
            const bg    = isIn?"rgba(46,125,50,.08)":isWD?"rgba(192,57,43,.08)":"rgba(123,45,139,.08)";
            const icon  = isIn?"💵":isWD?"💸":"🏪";
            const sign  = isIn?"+":"-";
            const patient = isIn?patients.find(p=>p.id===tx.patient_id):null;
            const label = isIn?tx.description:(tx.reason||tx.description);
            const typeLabel = isIn?(isAr?"دفعة":"Payment"):isWD?(isAr?"سحب":"Withdrawal"):(isAr?"مصروف":"Expense");
            const isCancelled = isIn&&tx.status==="cancelled";

            return (
              <div key={i} style={{ background:"#fff",borderRadius:12,marginBottom:8,border:"1.5px solid #eef0f3",overflow:"hidden",animation:"fadeIn .2s ease",opacity:isCancelled?0.5:1 }}>
                <div style={{ padding:"12px 14px",display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    {patient&&<div style={{ fontSize:13,fontWeight:600,color:"#353535",marginBottom:1 }}>{patient.name}</div>}
                    <div style={{ fontSize:12,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{label||typeLabel}</div>
                    <div style={{ display:"flex",gap:6,marginTop:3,alignItems:"center" }}>
                      <span style={{ fontSize:10,background:bg,color,padding:"1px 6px",borderRadius:8,fontWeight:600 }}>{typeLabel}</span>
                      {isCancelled&&<span style={{ fontSize:10,background:"rgba(136,136,136,.1)",color:"#888",padding:"1px 6px",borderRadius:8,fontWeight:600 }}>{isAr?"ملغي":"Cancelled"}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:"end",flexShrink:0 }}>
                    <div style={{ fontSize:15,fontWeight:800,color }}>{sign}{tx.amount?.toLocaleString()} {isAr?"ل.س":"SYP"}</div>
                  </div>
                </div>
                {/* cancel/delete action */}
                {!isCancelled&&(
                  <div style={{ borderTop:"1px solid #f5f5f5",display:"flex",justifyContent:"flex-end" }}>
                    <button onClick={()=>{
                      if (isIn) handleCancelPayment(tx.id);
                      else if (isWD) handleDeleteWD(tx.id);
                      else handleDeleteExp(tx.id);
                    }} style={{ padding:"8px 14px",background:"rgba(192,57,43,.04)",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,color:"#c0392b",display:"flex",alignItems:"center",gap:4 }}>
                      {isIn?(isAr?"↩ تراجع":"↩ Reverse"):(isAr?"🗑️ حذف":"🗑️ Delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ MODALS ══════════════════════════════════════════ */}
      {(showApptModal||editAppt)&&(
        <AppointmentModal
          lang={lang} appt={editAppt} defaultDate={selectedDate}
          patients={patients} appointments={appointments} doctors={doctors}
          onSave={handleSaveAppt} onClose={()=>{setShowApptModal(false);setEditAppt(null);}}
          onDelete={handleDeleteAppt} onStatusChange={handleStatusChange} saving={apptSaving}
        />
      )}
      {(showPatModal)&&(
        <PatientModal lang={lang} patient={editPat} clinicType={clinicType} onSave={handleSavePat} onClose={()=>{setShowPatModal(false);setEditPat(null);}}/>
      )}
      {delPat&&<DeletePatientModal lang={lang} patient={delPat} onConfirm={handleDeletePat} onClose={()=>setDelPat(null)}/>}
      {profilePat&&<PatientProfileDrawer lang={lang} patient={profilePat} clinicType={clinicType} onClose={()=>setProfilePat(null)}/>}
      {showPayModal&&<PaymentModal patients={patients} lang={lang} onSave={handleSavePay} onClose={()=>setShowPayModal(false)}/>}
      {showWDModal &&<WithdrawModal lang={lang} onSave={handleSaveWD} onClose={()=>setShowWDModal(false)}/>}
      {showExpModal&&<ExpenseModal  lang={lang} onSave={handleSaveExp} onClose={()=>setShowExpModal(false)}/>}
    </div>
  );
}