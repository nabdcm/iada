"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Appointment, Payment } from "@/lib/supabase";

// ════════════════════════════════════════════════════════════
// NABD - نبض | صفحة السكرتيرة
// ════════════════════════════════════════════════════════════

type Lang = "ar" | "en";
type Tab = "appointments" | "patients" | "finance";
type ApptStatus = "scheduled" | "completed" | "cancelled" | "no-show";
type PayStatus = "paid" | "pending" | "cancelled";
type PayMethod = "cash" | "card" | "transfer";

const SB_BG         = "#0558a8";
const PRIMARY       = "#0863ba";
const AVT_COLORS    = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085"];

const getColor = (id: number) => AVT_COLORS[id % AVT_COLORS.length];
const initials  = (name: string) => name.trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();

const T = {
  ar: {
    appName:"نبض", title:"لوحة السكرتيرة", sub:"إدارة المواعيد والمرضى والمعاملات المالية",
    tabs:{ appointments:"المواعيد", patients:"المرضى", finance:"المالية" },
    loading:"جاري التحميل...", saving:"جاري الحفظ...", deleting:"جاري الحذف...",
    signOut:"تسجيل الخروج",
    today:"اليوم",
    // appointments
    addAppointment:"موعد جديد",
    noAppointments:"لا توجد مواعيد",
    statuses:{ scheduled:"محدد", completed:"مكتمل", cancelled:"ملغي", "no-show":"لم يحضر" },
    statusColors:{ scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" },
    apptModal:{
      addTitle:"موعد جديد", editTitle:"تعديل الموعد",
      patient:"المريض *", selectPatient:"اختر المريض",
      doctor:"الطبيب", selectDoctor:"اختر الطبيب",
      date:"التاريخ *", time:"الوقت *",
      duration:"المدة (دقائق)", type:"نوع الزيارة", typePh:"مثال: متابعة، فحص عام",
      notes:"ملاحظات", notesPh:"أي ملاحظات...",
      save:"حفظ الموعد", update:"تحديث الموعد", cancel:"إلغاء", delete:"حذف",
      required:"المريض والتاريخ والوقت مطلوبة",
      confirmDelete:"هل أنت متأكد من حذف هذا الموعد؟",
      confirm:"نعم، احذف", cancelDel:"لا، تراجع",
    },
    weekDaysFull:["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    // patients
    addPatient:"مريض جديد",
    searchPat:"بحث بالاسم أو الهاتف...",
    noPatients:"لا توجد نتائج",
    patModal:{
      addTitle:"إضافة مريض جديد",
      name:"الاسم الكامل *", namePh:"اسم المريض",
      phone:"رقم الهاتف", phonePh:"05xxxxxxxx",
      gender:"الجنس", male:"ذكر", female:"أنثى",
      dob:"تاريخ الميلاد",
      notes:"ملاحظات", notesPh:"أي ملاحظات...",
      save:"حفظ المريض", cancel:"إلغاء",
      required:"الاسم مطلوب",
    },
    age:"سنة",
    // finance - secretary restricted view
    recordPayment:"تسجيل دفعة",
    withdrawBtn:"سحب",
    expenseBtn:"مصروف",
    exportDailyBtn:"تقرير يومي",
    todayTransactions:"معاملات اليوم",
    noTransactions:"لا توجد معاملات اليوم",
    payModal:{
      addTitle:"تسجيل دفعة",
      patient:"المريض *", selectPatient:"اختر المريض",
      amount:"المبلغ (ل.س) *", amountPh:"0.00",
      description:"الوصف", descPh:"مثال: رسوم استشارة...",
      method:"طريقة الدفع *", date:"التاريخ *", status:"الحالة",
      notes:"ملاحظات", notesPh:"أي ملاحظات...",
      save:"حفظ الدفعة", cancel:"إلغاء",
      required:"المريض والمبلغ مطلوبان",
    },
    withdrawModal:{
      title:"تسجيل سحب",
      amount:"المبلغ (ل.س) *", reason:"سبب السحب *", reasonPh:"مثال: مصروف شخصي، راتب...",
      date:"التاريخ *", notes:"ملاحظات", notesPh:"أي تفاصيل...",
      save:"تأكيد السحب", cancel:"إلغاء", required:"المبلغ وسبب السحب مطلوبان",
    },
    expenseModal:{
      title:"تسجيل مصروف",
      amount:"المبلغ (ل.س) *", category:"التصنيف *",
      categories:{ rent:"إيجار", supplies:"مستلزمات طبية", salary:"رواتب", utilities:"فواتير", maintenance:"صيانة", other:"أخرى" },
      description:"الوصف *", descPh:"مثال: فاتورة الكهرباء...",
      date:"التاريخ *", notes:"ملاحظات", notesPh:"أي تفاصيل...",
      save:"حفظ المصروف", cancel:"إلغاء", required:"المبلغ والتصنيف والوصف مطلوبة",
    },
    methods:{ cash:"نقداً", card:"بطاقة", transfer:"تحويل" },
    statPay:{ paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" },
    txType:{ income:"دخل", withdrawal:"سحب", expense:"مصروف" },
  },
  en: {
    appName:"NABD", title:"Secretary Dashboard", sub:"Manage appointments, patients, and financial records",
    tabs:{ appointments:"Appointments", patients:"Patients", finance:"Finance" },
    loading:"Loading...", saving:"Saving...", deleting:"Deleting...",
    signOut:"Sign Out",
    today:"Today",
    addAppointment:"New Appointment",
    noAppointments:"No appointments",
    statuses:{ scheduled:"Scheduled", completed:"Completed", cancelled:"Cancelled", "no-show":"No Show" },
    statusColors:{ scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" },
    apptModal:{
      addTitle:"New Appointment", editTitle:"Edit Appointment",
      patient:"Patient *", selectPatient:"Select patient",
      doctor:"Doctor", selectDoctor:"Select doctor",
      date:"Date *", time:"Time *",
      duration:"Duration (min)", type:"Visit type", typePh:"e.g. Follow-up, Checkup",
      notes:"Notes", notesPh:"Any notes...",
      save:"Save Appointment", update:"Update Appointment", cancel:"Cancel", delete:"Delete",
      required:"Patient, date and time are required",
      confirmDelete:"Are you sure you want to delete this appointment?",
      confirm:"Yes, delete", cancelDel:"No, cancel",
    },
    weekDaysFull:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    months:["January","February","March","April","May","June","July","August","September","October","November","December"],
    addPatient:"New Patient",
    searchPat:"Search by name or phone...",
    noPatients:"No results",
    patModal:{
      addTitle:"Add New Patient",
      name:"Full Name *", namePh:"Patient name",
      phone:"Phone", phonePh:"05xxxxxxxx",
      gender:"Gender", male:"Male", female:"Female",
      dob:"Date of Birth",
      notes:"Notes", notesPh:"Any notes...",
      save:"Save Patient", cancel:"Cancel",
      required:"Name is required",
    },
    age:"yr",
    recordPayment:"Record Payment",
    withdrawBtn:"Withdraw",
    expenseBtn:"Expense",
    exportDailyBtn:"Daily Report",
    todayTransactions:"Today's Transactions",
    noTransactions:"No transactions today",
    payModal:{
      addTitle:"Record Payment",
      patient:"Patient *", selectPatient:"Select patient",
      amount:"Amount *", amountPh:"0.00",
      description:"Description", descPh:"e.g. Consultation fee...",
      method:"Payment method *", date:"Date *", status:"Status",
      notes:"Notes", notesPh:"Any notes...",
      save:"Save Payment", cancel:"Cancel",
      required:"Patient and amount are required",
    },
    withdrawModal:{
      title:"Record Withdrawal",
      amount:"Amount *", reason:"Reason *", reasonPh:"e.g. Personal expense, salary...",
      date:"Date *", notes:"Notes", notesPh:"Details...",
      save:"Confirm", cancel:"Cancel", required:"Amount and reason are required",
    },
    expenseModal:{
      title:"Record Expense",
      amount:"Amount *", category:"Category *",
      categories:{ rent:"Rent", supplies:"Medical Supplies", salary:"Salary", utilities:"Utilities", maintenance:"Maintenance", other:"Other" },
      description:"Description *", descPh:"e.g. Electricity bill...",
      date:"Date *", notes:"Notes", notesPh:"Details...",
      save:"Save Expense", cancel:"Cancel", required:"Amount, category and description are required",
    },
    methods:{ cash:"Cash", card:"Card", transfer:"Transfer" },
    statPay:{ paid:"Paid", pending:"Pending", cancelled:"Cancelled" },
    txType:{ income:"Income", withdrawal:"Withdrawal", expense:"Expense" },
  },
};

const inputSt = {
  width:"100%", padding:"10px 12px", border:"1.5px solid #e0e6ef", borderRadius:10,
  fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fff",
  outline:"none", boxSizing:"border-box" as const,
};
const labelSt = { fontSize:12, fontWeight:600, color:"#555", marginBottom:4, display:"block" as const };

// ── تقرير يومي HTML ──────────────────────────────────────────
function exportDailyReportHTML(
  payments: Payment[], withdrawals: any[], expenses: any[], patients: Patient[],
  clinicName: string
) {
  const today = new Date().toISOString().slice(0,10);
  const fmt = (d:string) => new Date(d+"T00:00:00").toLocaleDateString("ar-EG-u-ca-gregory",{year:"numeric",month:"long",day:"numeric"});
  const todayP = payments.filter(p=>p.date===today);
  const todayW = withdrawals.filter(w=>w.date===today);
  const todayE = expenses.filter(e=>e.date===today);
  const totalIn  = todayP.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
  const totalW   = todayW.reduce((s,w)=>s+w.amount,0);
  const totalE   = todayE.reduce((s,e)=>s+e.amount,0);
  const net      = totalIn - totalW - totalE;

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
.green{color:#2e7d32}.red{color:#c0392b}.blue{color:#0863ba}.purple{color:#7b2d8b}
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
  <div class="stat"><div class="sv purple">-${totalE.toLocaleString()} ل.س</div><div class="sl">المصروفات</div></div>
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
// MODAL WRAPPER
// ════════════════════════════════════════════════════════════
function Modal({ onClose, children }: { onClose:()=>void; children: React.ReactNode }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(3px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",padding:"24px 20px 32px",animation:"slideUp .28s cubic-bezier(.4,0,.2,1)" }}>
        {children}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// APPOINTMENT MODAL
// ════════════════════════════════════════════════════════════
function AppointmentModal({ appt, patients, doctors, lang, onSave, onDelete, onClose }: {
  appt: Appointment|null; patients: Patient[]; doctors: any[]; lang: Lang;
  onSave:(d:any)=>void; onDelete:(id:number)=>void; onClose:()=>void;
}) {
  const tr = T[lang];
  const isAr = lang==="ar";
  const isEdit = !!appt;
  const today = new Date().toISOString().slice(0,10);

  const [form, setForm] = useState({
    patient_id: appt?.patient_id||0,
    doctor_id:  appt?.doctor_id||null,
    date:       appt?.date||today,
    time:       appt?.time||"09:00",
    duration:   appt?.duration||30,
    type:       appt?.type||"",
    notes:      appt?.notes||"",
    status:     (appt?.status||"scheduled") as ApptStatus,
  });
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);
  const [showDel,setShowDel] = useState(false);
  const [patQ,setPatQ] = useState("");
  const [showPatDrop,setShowPatDrop] = useState(false);

  const filtPat = patients.filter(p=>p.name.includes(patQ)||p.phone?.includes(patQ));
  const selPat  = patients.find(p=>p.id===form.patient_id);

  const save = async() => {
    if (!form.patient_id||!form.date||!form.time){setError(tr.apptModal.required);return;}
    setSaving(true);
    onSave({ ...form, patient_id:form.patient_id, doctor_id:form.doctor_id||null });
    setSaving(false);
  };

  const statusList: ApptStatus[] = ["scheduled","completed","cancelled","no-show"];
  const statusStyleMap: Record<ApptStatus,{color:string;bg:string}> = {
    scheduled:  {color:"#0863ba",bg:"rgba(8,99,186,.08)"},
    completed:  {color:"#2e7d32",bg:"rgba(46,125,50,.08)"},
    cancelled:  {color:"#c0392b",bg:"rgba(192,57,43,.08)"},
    "no-show":  {color:"#888",bg:"rgba(136,136,136,.08)"},
  };

  if (showDel) return (
    <Modal onClose={()=>setShowDel(false)}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px" }}>🗑️</div>
        <p style={{ fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:600,marginBottom:20 }}>{tr.apptModal.confirmDelete}</p>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={()=>onDelete(appt!.id)} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.apptModal.confirm}</button>
          <button onClick={()=>setShowDel(false)} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.apptModal.cancelDel}</button>
        </div>
      </div>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{isEdit?tr.apptModal.editTitle:tr.apptModal.addTitle}</h3>
        <div style={{ display:"flex",gap:8 }}>
          {isEdit&&<button onClick={()=>setShowDel(true)} style={{ width:34,height:34,borderRadius:8,background:"rgba(192,57,43,.08)",border:"1.5px solid rgba(192,57,43,.2)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:"#c0392b" }}>🗑️</button>}
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
        </div>
      </div>
      {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}

      <div style={{ display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        {/* patient search */}
        <div style={{ position:"relative" }}>
          <label style={labelSt}>{tr.apptModal.patient}</label>
          <input value={selPat?selPat.name:patQ} onChange={e=>{setPatQ(e.target.value);setForm({...form,patient_id:0});setShowPatDrop(true);}}
            onFocus={()=>setShowPatDrop(true)}
            placeholder={tr.apptModal.selectPatient} style={inputSt}/>
          {showPatDrop&&filtPat.length>0&&(
            <div style={{ position:"absolute",top:"calc(100% + 4px)",insetInlineStart:0,insetInlineEnd:0,background:"#fff",border:"1.5px solid #e0e6ef",borderRadius:12,boxShadow:"0 8px 32px rgba(8,99,186,.13)",zIndex:999,maxHeight:200,overflowY:"auto" }}>
              {filtPat.slice(0,8).map(p=>(
                <div key={p.id} onClick={()=>{setForm({...form,patient_id:p.id});setPatQ("");setShowPatDrop(false);}}
                  style={{ padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f5f5f5" }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{initials(p.name)}</div>
                  <span style={{ fontSize:14,color:"#353535" }}>{p.name}</span>
                  {form.patient_id===p.id&&<span style={{ marginInlineStart:"auto",color:PRIMARY }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* doctor */}
        {doctors.length>0&&(
          <div>
            <label style={labelSt}>{tr.apptModal.doctor}</label>
            <select value={form.doctor_id||""} onChange={e=>setForm({...form,doctor_id:e.target.value?Number(e.target.value):null})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="">{tr.apptModal.selectDoctor}</option>
              {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {/* date + time */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.apptModal.date}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.apptModal.time}</label>
            <select value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
              {Array.from({length:15*4},(_,i)=>{const t=8*60+i*15;const hh=String(Math.floor(t/60)).padStart(2,"0");const mm=String(t%60).padStart(2,"0");return `${hh}:${mm}`;}).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* duration + type */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.apptModal.duration}</label><input type="number" value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})} min={5} max={180} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.apptModal.type}</label><input value={form.type} onChange={e=>setForm({...form,type:e.target.value})} placeholder={tr.apptModal.typePh} style={inputSt}/></div>
        </div>

        {/* status */}
        {isEdit&&(
          <div>
            <label style={labelSt}>الحالة</label>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {statusList.map(s=>(
                <button key={s} onClick={()=>setForm({...form,status:s})}
                  style={{ padding:"7px 14px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",
                    border:form.status===s?`2px solid ${statusStyleMap[s].color}`:`1.5px solid ${statusStyleMap[s].color}30`,
                    background:form.status===s?statusStyleMap[s].color:statusStyleMap[s].bg,
                    color:form.status===s?"#fff":statusStyleMap[s].color }}>
                  {tr.statuses[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* notes */}
        <div><label style={labelSt}>{tr.apptModal.notes}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.apptModal.notesPh} rows={2} style={{ ...inputSt,resize:"none" }}/></div>

        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"13px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {saving?tr.saving:(isEdit?tr.apptModal.update:tr.apptModal.save)}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.apptModal.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// PATIENT MODAL
// ════════════════════════════════════════════════════════════
function PatientModal({ lang, onSave, onClose }: { lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form,setForm] = useState({ name:"",phone:"",gender:"",date_of_birth:"",notes:"" });
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);

  const save = () => {
    if (!form.name.trim()){setError(tr.patModal.required);return;}
    setSaving(true);
    onSave(form);
    setSaving(false);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{tr.patModal.addTitle}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div><label style={labelSt}>{tr.patModal.name}</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tr.patModal.namePh} style={inputSt}/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.patModal.phone}</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={tr.patModal.phonePh} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.patModal.gender}</label>
            <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="">—</option><option value="male">{tr.patModal.male}</option><option value="female">{tr.patModal.female}</option>
            </select>
          </div>
        </div>
        <div><label style={labelSt}>{tr.patModal.dob}</label><input type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})} style={inputSt}/></div>
        <div><label style={labelSt}>{tr.patModal.notes}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.patModal.notesPh} rows={2} style={{ ...inputSt,resize:"none" }}/></div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"13px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {saving?tr.saving:tr.patModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.patModal.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ════════════════════════════════════════════════════════════
function PaymentModal({ patients, lang, onSave, onClose }: { patients:Patient[]; lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({ patient_id:0,amount:"",description:"",method:"cash" as PayMethod,date:today,status:"paid" as PayStatus,notes:"" });
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);
  const [patQ,setPatQ] = useState("");
  const [showDrop,setShowDrop] = useState(false);
  const filtPat = patients.filter(p=>p.name.includes(patQ)||p.phone?.includes(patQ));
  const selPat  = patients.find(p=>p.id===form.patient_id);

  const save = () => {
    if (!form.patient_id||!form.amount){setError(tr.payModal.required);return;}
    setSaving(true);
    onSave({ ...form, amount:parseFloat(form.amount)||0 });
    setSaving(false);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{tr.payModal.addTitle}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ position:"relative" }}>
          <label style={labelSt}>{tr.payModal.patient}</label>
          <input value={selPat?selPat.name:patQ} onChange={e=>{setPatQ(e.target.value);setForm({...form,patient_id:0});setShowDrop(true);}} onFocus={()=>setShowDrop(true)} placeholder={tr.payModal.selectPatient} style={inputSt}/>
          {showDrop&&filtPat.length>0&&(
            <div style={{ position:"absolute",top:"calc(100% + 4px)",insetInlineStart:0,insetInlineEnd:0,background:"#fff",border:"1.5px solid #e0e6ef",borderRadius:12,boxShadow:"0 8px 32px rgba(8,99,186,.13)",zIndex:999,maxHeight:180,overflowY:"auto" }}>
              {filtPat.slice(0,6).map(p=>(
                <div key={p.id} onClick={()=>{setForm({...form,patient_id:p.id});setPatQ("");setShowDrop(false);}} style={{ padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #f5f5f5" }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700 }}>{initials(p.name)}</div>
                  <span style={{ fontSize:14 }}>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.payModal.amount}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder={tr.payModal.amountPh} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.payModal.date}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{tr.payModal.description}</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.payModal.descPh} style={inputSt}/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.payModal.method}</label>
            <select value={form.method} onChange={e=>setForm({...form,method:e.target.value as PayMethod})} style={{ ...inputSt,cursor:"pointer" }}>
              {(["cash","card","transfer"] as PayMethod[]).map(m=><option key={m} value={m}>{tr.methods[m]}</option>)}
            </select>
          </div>
          <div><label style={labelSt}>{tr.payModal.status}</label>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as PayStatus})} style={{ ...inputSt,cursor:"pointer" }}>
              {(["paid","pending"] as PayStatus[]).map(s=><option key={s} value={s}>{tr.statPay[s]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"13px",background:PRIMARY,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1,boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {saving?tr.saving:tr.payModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.payModal.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// WITHDRAW MODAL
// ════════════════════════════════════════════════════════════
function WithdrawModal({ lang, onSave, onClose }: { lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({ amount:"",reason:"",date:today,notes:"" });
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false);
  const save = () => {
    if (!form.amount||!form.reason){setError(tr.withdrawModal.required);return;}
    setSaving(true); onSave({ ...form,amount:parseFloat(form.amount)||0 }); setSaving(false);
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{tr.withdrawModal.title}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.withdrawModal.amount}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.withdrawModal.date}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{tr.withdrawModal.reason}</label><input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder={tr.withdrawModal.reasonPh} style={inputSt}/></div>
        <div><label style={labelSt}>{tr.withdrawModal.notes}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.withdrawModal.notesPh} rows={2} style={{ ...inputSt,resize:"none" }}/></div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"13px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1 }}>
            {saving?tr.saving:tr.withdrawModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.withdrawModal.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// EXPENSE MODAL
// ════════════════════════════════════════════════════════════
function ExpenseModal({ lang, onSave, onClose }: { lang:Lang; onSave:(d:any)=>void; onClose:()=>void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const today = new Date().toISOString().slice(0,10);
  const [form,setForm] = useState({ amount:"",category:"",description:"",date:today,notes:"" });
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false);
  const save = () => {
    if (!form.amount||!form.category||!form.description){setError(tr.expenseModal.required);return;}
    setSaving(true); onSave({ ...form,amount:parseFloat(form.amount)||0 }); setSaving(false);
  };
  return (
    <Modal onClose={onClose}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,direction:isAr?"rtl":"ltr" }}>
        <h3 style={{ fontFamily:"Rubik,sans-serif",fontSize:17,fontWeight:700,margin:0 }}>{tr.expenseModal.title}</h3>
        <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14 }}>✕</button>
      </div>
      {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:14,direction:isAr?"rtl":"ltr" }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          <div><label style={labelSt}>{tr.expenseModal.amount}</label><input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inputSt}/></div>
          <div><label style={labelSt}>{tr.expenseModal.date}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt}/></div>
        </div>
        <div><label style={labelSt}>{tr.expenseModal.category}</label>
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
            <option value="">—</option>
            {(Object.keys(tr.expenseModal.categories) as (keyof typeof tr.expenseModal.categories)[]).map(k=>(
              <option key={k} value={k}>{tr.expenseModal.categories[k]}</option>
            ))}
          </select>
        </div>
        <div><label style={labelSt}>{tr.expenseModal.description}</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.expenseModal.descPh} style={inputSt}/></div>
        <div><label style={labelSt}>{tr.expenseModal.notes}</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.expenseModal.notesPh} rows={2} style={{ ...inputSt,resize:"none" }}/></div>
        <div style={{ display:"flex",gap:10,marginTop:4 }}>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"13px",background:"#7b2d8b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?.7:1 }}>
            {saving?tr.saving:tr.expenseModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.expenseModal.cancel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════
export default function SecretaryPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang==="ar";
  const tr   = T[lang];
  const today = new Date().toISOString().slice(0,10);

  // data
  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [doctors,    setDoctors]    = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [withdrawals,setWithdrawals]= useState<any[]>([]);
  const [expenses,   setExpenses]   = useState<any[]>([]);
  const [clinicName, setClinicName] = useState("نبض");
  const [loading,    setLoading]    = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("appointments");
  const [selectedDate, setSelectedDate] = useState(today);
  const [patSearch, setPatSearch] = useState("");

  // modals
  const [showApptModal, setShowApptModal] = useState(false);
  const [editAppt,      setEditAppt]      = useState<Appointment|null>(null);
  const [showPatModal,  setShowPatModal]  = useState(false);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showWDModal,   setShowWDModal]   = useState(false);
  const [showExpModal,  setShowExpModal]  = useState(false);

  // swipe for tabs
  const tabsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const tabOrder: Tab[] = ["appointments","patients","finance"];

  // ── load data ────────────────────────────────────────────
  useEffect(()=>{ loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const clinicMeta = user.user_metadata?.clinic_name as string|undefined;
      if (clinicMeta) setClinicName(clinicMeta);
      else {
        const { data:profile } = await supabase.from("clinic_profiles").select("clinic_name").eq("id",user.id).single();
        if (profile?.clinic_name) setClinicName(profile.clinic_name);
      }

      const { data:clinicRow } = await supabase.from("clinics").select("name,plan").eq("user_id",user.id).single();
      if (clinicRow?.name && !clinicMeta) setClinicName(prev=>prev||clinicRow.name);

      const [{ data:apptData },{ data:patData },{ data:payData },{ data:wdData },{ data:exData }] = await Promise.all([
        supabase.from("appointments").select("*").eq("user_id",user.id).order("date",{ascending:true}).order("time",{ascending:true}),
        supabase.from("patients").select("id,name,phone,gender,date_of_birth,is_hidden,created_at").eq("user_id",user.id).eq("is_hidden",false).order("name"),
        supabase.from("payments").select("*").eq("user_id",user.id).order("date",{ascending:false}),
        supabase.from("clinic_withdrawals").select("*").eq("user_id",user.id).order("date",{ascending:false}),
        supabase.from("clinic_expenses").select("*").eq("user_id",user.id).order("date",{ascending:false}),
      ]);

      setAppointments(apptData||[]);
      setPatients((patData||[]) as unknown as Patient[]);
      setPayments(payData||[]);
      setWithdrawals(wdData||[]);
      setExpenses(exData||[]);

      // doctors (shared clinics)
      const plan = clinicRow?.plan||"basic";
      if (["shared_basic","shared_pro","shared_enterprise"].includes(plan)) {
        const { data:drData } = await supabase.from("doctors").select("id,name,color").eq("user_id",user.id).eq("is_active",true).order("id");
        setDoctors(drData||[]);
      }
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  };

  // ── appointment handlers ─────────────────────────────────
  const handleSaveAppt = async (data: any) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      if (editAppt) {
        const { data:updated } = await supabase.from("appointments").update(data).eq("id",editAppt.id).select().single();
        if (updated) setAppointments(prev=>prev.map(a=>a.id===editAppt.id?updated:a));
      } else {
        const { data:inserted } = await supabase.from("appointments").insert({ ...data,user_id:user.id,status:"scheduled" }).select().single();
        if (inserted) setAppointments(prev=>[...prev,inserted]);
      }
      setShowApptModal(false); setEditAppt(null);
    } catch(e){ console.error(e); }
  };

  const handleDeleteAppt = async (id: number) => {
    await supabase.from("appointments").delete().eq("id",id);
    setAppointments(prev=>prev.filter(a=>a.id!==id));
    setShowApptModal(false); setEditAppt(null);
  };

  // ── patient handlers ─────────────────────────────────────
  const handleSavePat = async (data: any) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("patients").insert({ ...data,user_id:user.id,is_hidden:false }).select().single();
      if (inserted) setPatients(prev=>[inserted as unknown as Patient,...prev]);
      setShowPatModal(false);
    } catch(e){ console.error(e); }
  };

  // ── payment handlers ─────────────────────────────────────
  const handleSavePay = async (data: any) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("payments").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setPayments(prev=>[inserted,...prev]);
      setShowPayModal(false);
    } catch(e){ console.error(e); }
  };

  const handleSaveWD = async (data: any) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("clinic_withdrawals").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setWithdrawals(prev=>[inserted,...prev]);
      setShowWDModal(false);
    } catch(e){ console.error(e); }
  };

  const handleSaveExp = async (data: any) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data:inserted } = await supabase.from("clinic_expenses").insert({ ...data,user_id:user.id }).select().single();
      if (inserted) setExpenses(prev=>[inserted,...prev]);
      setShowExpModal(false);
    } catch(e){ console.error(e); }
  };

  // ── computed ─────────────────────────────────────────────
  const dayAppts = useMemo(()=>appointments.filter(a=>a.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),[appointments,selectedDate]);
  const filtPats  = useMemo(()=>patients.filter(p=>p.name.includes(patSearch)||p.phone?.includes(patSearch)),[patients,patSearch]);
  const todayTx   = useMemo(()=>{
    const tp = payments.filter(p=>p.date===today);
    const tw = withdrawals.filter(w=>w.date===today);
    const te = expenses.filter(e=>e.date===today);
    return [...tp.map(p=>({...p,_type:"income"})),...tw.map(w=>({...w,_type:"withdrawal"})),...te.map(e=>({...e,_type:"expense"}))]
      .sort((a,b)=>((b as any).created_at||(b as any).date).localeCompare((a as any).created_at||(a as any).date));
  },[payments,withdrawals,expenses,today]);

  const todayIncome = payments.filter(p=>p.date===today&&p.status==="paid").reduce((s,p)=>s+p.amount,0);

  // ── date strip: 7 days ────────────────────────────────────
  const dateStrip = useMemo(()=>{
    return Array.from({length:7},(_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-3+i);
      return d.toISOString().slice(0,10);
    });
  },[]);

  const fmtTime = (t:string) => { const [h,m]=t.slice(0,5).split(":").map(Number); const ap=h>=12?"م":"ص"; return `${h>12?h-12:h||12}:${String(m).padStart(2,"0")} ${isAr?ap:(h>=12?"PM":"AM")}`; };
  const fmtDateShort = (d:string) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-EG-u-ca-gregory":"en-GB",{month:"short",day:"numeric"});
  const getAge = (dob:string) => { if (!dob) return null; const y=new Date().getFullYear()-new Date(dob).getFullYear(); return y>0?`${y} ${tr.age}`:null; };

  // ── tab scroll handle ────────────────────────────────────
  const scrollToTab = (tab: Tab) => {
    const idx = tabOrder.indexOf(tab);
    if (tabsRef.current) {
      tabsRef.current.scrollTo({ left: idx * tabsRef.current.offsetWidth, behavior:"smooth" });
    }
    setActiveTab(tab);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 60) return;
    const cur = tabOrder.indexOf(activeTab);
    if (isAr) {
      if (dx > 0 && cur < tabOrder.length-1) scrollToTab(tabOrder[cur+1]);
      if (dx < 0 && cur > 0)                  scrollToTab(tabOrder[cur-1]);
    } else {
      if (dx < 0 && cur < tabOrder.length-1) scrollToTab(tabOrder[cur+1]);
      if (dx > 0 && cur > 0)                  scrollToTab(tabOrder[cur-1]);
    }
  };

  const statusBadge = (s: ApptStatus) => {
    const colors: Record<ApptStatus,{bg:string;color:string}> = {
      scheduled:  {bg:"rgba(8,99,186,.1)",   color:"#0863ba"},
      completed:  {bg:"rgba(46,125,50,.1)",   color:"#2e7d32"},
      cancelled:  {bg:"rgba(192,57,43,.1)",  color:"#c0392b"},
      "no-show":  {bg:"rgba(136,136,136,.1)",color:"#888"},
    };
    return colors[s]||colors.scheduled;
  };

  if (loading) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif",background:"#fafbfc",fontSize:14,color:"#888" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:48,height:48,border:"3px solid #e0e6ef",borderTop:`3px solid ${PRIMARY}`,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
        {tr.loading}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════
  return (
    <div dir={isAr?"rtl":"ltr"} style={{ minHeight:"100vh",background:"#fafbfc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .tab-pane{min-width:100%;padding:0 16px 100px}
        .tabs-scroll{display:flex;overflow:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
        .tx-card:active{background:#f0f7ff!important}
        .pat-row:active{background:#f0f7ff!important}
        input,select,textarea{font-family:Rubik,sans-serif;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
      `}</style>

      {/* ── TOP HEADER ─────────────────────────────────── */}
      <div style={{ background:SB_BG,padding:"14px 16px 0",position:"sticky",top:0,zIndex:50 }}>
        {/* logo + actions */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,background:"rgba(255,255,255,.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🏥</div>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:"#fff",lineHeight:1.1 }}>{clinicName}</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,.6)" }}>{tr.title}</div>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")} style={{ padding:"5px 10px",background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,cursor:"pointer",fontSize:12,color:"rgba(255,255,255,.9)",fontFamily:"Rubik,sans-serif" }}>
              {lang==="ar"?"EN":"AR"}
            </button>
            <button onClick={()=>{ supabase.auth.signOut(); window.location.href="/login"; }} style={{ padding:"5px 10px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.3)",borderRadius:8,cursor:"pointer",fontSize:12,color:"#ffb3a7",fontFamily:"Rubik,sans-serif" }}>
              {tr.signOut}
            </button>
          </div>
        </div>

        {/* ── TAB BAR ──────────────────────────────────── */}
        <div style={{ display:"flex",gap:4,borderBottom:"2px solid rgba(255,255,255,.1)" }}>
          {tabOrder.map(tab=>(
            <button key={tab} onClick={()=>scrollToTab(tab)}
              style={{ flex:1,padding:"10px 4px",background:"transparent",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:activeTab===tab?700:400,
                color:activeTab===tab?"#fff":"rgba(255,255,255,.55)",borderBottom:activeTab===tab?"2.5px solid #7dd3fc":"2.5px solid transparent",
                transition:"all .2s",whiteSpace:"nowrap",display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
              {tab==="appointments"?"📅":tab==="patients"?"👤":"💰"}
              {tr.tabs[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────────────── */}
      <div ref={tabsRef} className="tabs-scroll" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ display:"flex",overflowX:"hidden",width:"100%" }}>

        {/* ══ TAB 1: APPOINTMENTS ══════════════════════════ */}
        <div className="tab-pane">
          {/* date strip */}
          <div style={{ display:"flex",gap:6,overflowX:"auto",padding:"14px 0 4px",scrollbarWidth:"none",msOverflowStyle:"none" }}>
            {dateStrip.map(d=>{
              const isSelected = d===selectedDate;
              const isToday    = d===today;
              const dayObj     = new Date(d+"T00:00:00");
              const dayName    = tr.weekDaysFull[dayObj.getDay()].slice(0,3);
              const count      = appointments.filter(a=>a.date===d).length;
              return (
                <button key={d} onClick={()=>setSelectedDate(d)}
                  style={{ minWidth:56,padding:"8px 6px",borderRadius:12,border:isSelected?"2px solid "+PRIMARY:"1.5px solid #e8edf3",background:isSelected?PRIMARY:"#fff",cursor:"pointer",flexShrink:0,textAlign:"center",transition:"all .2s",boxShadow:isSelected?"0 4px 12px rgba(8,99,186,.2)":"none" }}>
                  <div style={{ fontSize:10,fontWeight:600,color:isSelected?"rgba(255,255,255,.8)":(isToday?PRIMARY:"#999"),marginBottom:2 }}>{dayName}</div>
                  <div style={{ fontSize:17,fontWeight:800,color:isSelected?"#fff":(isToday?PRIMARY:"#353535") }}>{dayObj.getDate()}</div>
                  {count>0&&<div style={{ marginTop:4,width:16,height:16,borderRadius:"50%",background:isSelected?"rgba(255,255,255,.3)":"rgba(8,99,186,.1)",color:isSelected?"#fff":PRIMARY,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",margin:"4px auto 0" }}>{count}</div>}
                </button>
              );
            })}
          </div>

          {/* selected date label */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"12px 0 10px" }}>
            <div style={{ fontSize:13,fontWeight:600,color:"#555" }}>{fmtDateShort(selectedDate)} — {dayAppts.length} {isAr?"مواعيد":"appointments"}</div>
            <button onClick={()=>{setEditAppt(null);setShowApptModal(true);}}
              style={{ padding:"7px 14px",background:PRIMARY,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:5,boxShadow:"0 3px 10px rgba(8,99,186,.25)" }}>
              + {tr.addAppointment}
            </button>
          </div>

          {/* appointments list */}
          {dayAppts.length===0?(
            <div style={{ textAlign:"center",padding:"48px 0",color:"#aaa" }}>
              <div style={{ fontSize:36,marginBottom:10 }}>📭</div>
              <div style={{ fontSize:14 }}>{tr.noAppointments}</div>
            </div>
          ):dayAppts.map(appt=>{
            const patient = patients.find(p=>p.id===appt.patient_id);
            const doctor  = doctors.find(d=>d.id===appt.doctor_id);
            const sb      = statusBadge(appt.status as ApptStatus);
            return (
              <div key={appt.id} onClick={()=>{setEditAppt(appt);setShowApptModal(true);}}
                style={{ background:"#fff",borderRadius:14,padding:"14px",marginBottom:10,display:"flex",alignItems:"center",gap:12,border:"1.5px solid #eef0f3",cursor:"pointer",transition:"all .15s",boxShadow:"0 2px 8px rgba(0,0,0,.04)",animation:"fadeIn .25s ease" }}>
                {/* time */}
                <div style={{ textAlign:"center",minWidth:44,flexShrink:0 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:PRIMARY }}>{fmtTime(appt.time)}</div>
                  {appt.duration&&<div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{appt.duration}د</div>}
                </div>
                {/* divider */}
                <div style={{ width:2,alignSelf:"stretch",background:sb.bg,borderRadius:2,flexShrink:0 }}/>
                {/* info */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                    <div style={{ width:28,height:28,borderRadius:8,background:patient?getColor(patient.id):"#ccc",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0 }}>
                      {patient?initials(patient.name):"?"}
                    </div>
                    <span style={{ fontWeight:600,fontSize:14,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{patient?.name||"—"}</span>
                  </div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                    <span style={{ padding:"2px 8px",borderRadius:20,background:sb.bg,color:sb.color,fontSize:11,fontWeight:600 }}>{tr.statuses[appt.status as ApptStatus]||appt.status}</span>
                    {appt.type&&<span style={{ fontSize:11,color:"#888" }}>{appt.type}</span>}
                    {doctor&&<span style={{ fontSize:11,color:doctor.color||PRIMARY }}>• {doctor.name}</span>}
                  </div>
                </div>
                <div style={{ fontSize:18,color:"#ddd",flexShrink:0 }}>{isAr?"‹":"›"}</div>
              </div>
            );
          })}
        </div>

        {/* ══ TAB 2: PATIENTS ══════════════════════════════ */}
        <div className="tab-pane">
          {/* search + add */}
          <div style={{ position:"sticky",top:0,background:"#fafbfc",paddingTop:14,paddingBottom:10,zIndex:10 }}>
            <div style={{ display:"flex",gap:8,marginBottom:10 }}>
              <input value={patSearch} onChange={e=>setPatSearch(e.target.value)}
                placeholder={tr.searchPat}
                style={{ ...inputSt,flex:1,paddingInlineStart:36,background:"#fff" }}/>
              <button onClick={()=>setShowPatModal(true)}
                style={{ padding:"10px 16px",background:PRIMARY,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,flexShrink:0,boxShadow:"0 3px 10px rgba(8,99,186,.25)" }}>
                + {isAr?"جديد":"New"}
              </button>
            </div>
            <div style={{ fontSize:12,color:"#aaa" }}>{filtPats.length} {isAr?"مريض":"patients"}</div>
          </div>

          {filtPats.length===0?(
            <div style={{ textAlign:"center",padding:"48px 0",color:"#aaa" }}>
              <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14 }}>{tr.noPatients}</div>
            </div>
          ):filtPats.map(p=>{
            const age = p.date_of_birth ? getAge(p.date_of_birth as unknown as string) : null;
            const patAppts = appointments.filter(a=>a.patient_id===p.id);
            const lastAppt = patAppts.sort((a,b)=>b.date.localeCompare(a.date))[0];
            return (
              <div key={p.id} className="pat-row"
                style={{ background:"#fff",borderRadius:14,padding:"14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:"1.5px solid #eef0f3",cursor:"default",animation:"fadeIn .2s ease" }}>
                <div style={{ width:40,height:40,borderRadius:12,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0 }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:"#353535",marginBottom:3 }}>{p.name}</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
                    {p.phone&&<span style={{ fontSize:12,color:"#888",direction:"ltr" }}>{p.phone}</span>}
                    {age&&<span style={{ fontSize:11,background:"#f0f7ff",color:PRIMARY,padding:"1px 7px",borderRadius:10,fontWeight:600 }}>{age}</span>}
                    {lastAppt&&<span style={{ fontSize:11,color:"#aaa" }}>• {fmtDateShort(lastAppt.date)}</span>}
                  </div>
                </div>
                {/* quick appointment */}
                <button onClick={()=>{setEditAppt(null);setShowApptModal(true);}}
                  style={{ width:32,height:32,borderRadius:8,background:"rgba(8,99,186,.07)",border:"1.5px solid rgba(8,99,186,.15)",cursor:"pointer",fontSize:14,color:PRIMARY,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}
                  title={tr.addAppointment}>📅</button>
              </div>
            );
          })}
        </div>

        {/* ══ TAB 3: FINANCE (restricted) ══════════════════ */}
        <div className="tab-pane">
          {/* quick stats - today only */}
          <div style={{ paddingTop:14,paddingBottom:4 }}>
            <div style={{ background:"linear-gradient(135deg,#e8f5e9,#f1f8e9)",borderRadius:14,padding:"14px 16px",border:"1.5px solid #c8e6c9",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:11,color:"#666",marginBottom:2 }}>{isAr?"دخل اليوم":"Today's Income"}</div>
                <div style={{ fontSize:22,fontWeight:800,color:"#2e7d32" }}>+{todayIncome.toLocaleString()} {isAr?"ل.س":"SYP"}</div>
              </div>
              <div style={{ fontSize:28 }}>💰</div>
            </div>

            {/* action buttons */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14 }}>
              {[
                { label:tr.recordPayment, icon:"💵", color:PRIMARY,      bg:"rgba(8,99,186,.08)",   border:"rgba(8,99,186,.2)",   fn:()=>setShowPayModal(true) },
                { label:tr.withdrawBtn,   icon:"💸", color:"#c0392b",    bg:"rgba(192,57,43,.08)",  border:"rgba(192,57,43,.2)",  fn:()=>setShowWDModal(true)  },
                { label:tr.expenseBtn,    icon:"🏪", color:"#7b2d8b",    bg:"rgba(123,45,139,.08)", border:"rgba(123,45,139,.2)", fn:()=>setShowExpModal(true) },
              ].map(btn=>(
                <button key={btn.label} onClick={btn.fn}
                  style={{ padding:"12px 6px",background:btn.bg,border:`1.5px solid ${btn.border}`,borderRadius:12,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,color:btn.color,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all .2s" }}>
                  <span style={{ fontSize:20 }}>{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>

            {/* export daily report */}
            <button onClick={()=>exportDailyReportHTML(payments,withdrawals,expenses,patients,clinicName)}
              style={{ width:"100%",padding:"12px",background:"#fff",border:`1.5px solid ${PRIMARY}`,borderRadius:12,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,color:PRIMARY,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16 }}>
              📄 {tr.exportDailyBtn}
            </button>
          </div>

          {/* today's transactions list */}
          <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:10,display:"flex",alignItems:"center",gap:6 }}>
            📋 {tr.todayTransactions}
            <span style={{ background:"#f0f7ff",color:PRIMARY,fontSize:11,padding:"1px 8px",borderRadius:10,fontWeight:600 }}>{todayTx.length}</span>
          </div>

          {todayTx.length===0?(
            <div style={{ textAlign:"center",padding:"40px 0",color:"#aaa" }}>
              <div style={{ fontSize:32,marginBottom:8 }}>🗒️</div>
              <div style={{ fontSize:13 }}>{tr.noTransactions}</div>
            </div>
          ):todayTx.map((tx:any,i)=>{
            const isIn  = tx._type==="income";
            const isWD  = tx._type==="withdrawal";
            const isEx  = tx._type==="expense";
            const color = isIn?"#2e7d32":isWD?"#c0392b":"#7b2d8b";
            const bg    = isIn?"rgba(46,125,50,.08)":isWD?"rgba(192,57,43,.08)":"rgba(123,45,139,.08)";
            const icon  = isIn?"💵":isWD?"💸":"🏪";
            const sign  = isIn?"+":"-";
            const patient = isIn?patients.find(p=>p.id===tx.patient_id):null;
            const label = isIn?tx.description:(tx.reason||tx.description);
            const typeLabel = isIn?tr.txType.income:isWD?tr.txType.withdrawal:tr.txType.expense;

            return (
              <div key={i} className="tx-card"
                style={{ background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12,border:"1.5px solid #eef0f3",animation:"fadeIn .2s ease" }}>
                <div style={{ width:36,height:36,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{icon}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  {patient&&<div style={{ fontSize:13,fontWeight:600,color:"#353535",marginBottom:1 }}>{patient.name}</div>}
                  <div style={{ fontSize:12,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{label||typeLabel}</div>
                  <span style={{ fontSize:10,background:bg,color,padding:"1px 6px",borderRadius:8,fontWeight:600,marginTop:3,display:"inline-block" }}>{typeLabel}</span>
                </div>
                <div style={{ fontSize:15,fontWeight:800,color,flexShrink:0 }}>{sign}{tx.amount?.toLocaleString()} {isAr?"ل.س":"SYP"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────── */}
      {(showApptModal||editAppt)&&(
        <AppointmentModal
          appt={editAppt} patients={patients} doctors={doctors} lang={lang}
          onSave={handleSaveAppt} onDelete={handleDeleteAppt}
          onClose={()=>{setShowApptModal(false);setEditAppt(null);}}
        />
      )}
      {showPatModal&&<PatientModal lang={lang} onSave={handleSavePat} onClose={()=>setShowPatModal(false)}/>}
      {showPayModal&&<PaymentModal patients={patients} lang={lang} onSave={handleSavePay} onClose={()=>setShowPayModal(false)}/>}
      {showWDModal &&<WithdrawModal lang={lang} onSave={handleSaveWD} onClose={()=>setShowWDModal(false)}/>}
      {showExpModal&&<ExpenseModal  lang={lang} onSave={handleSaveExp} onClose={()=>setShowExpModal(false)}/>}
    </div>
  );
}