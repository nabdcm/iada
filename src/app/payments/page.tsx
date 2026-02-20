"use client";

import { useState, useEffect } from "react";

// ============================================================
// NABD - نبض | Payments Page
// داشبورد المدفوعات + الجدول + إضافة دفعة + المستحقات
// ============================================================

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"الرئيسية", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", admin:"لوحة المدير" },
    page:{ title:"المدفوعات", sub:"سجل المعاملات المالية وإدارة الفواتير" },
    recordPayment:"تسجيل دفعة",
    stats:{
      totalMonth:"إيرادات الشهر", totalYear:"إيرادات السنة",
      paid:"مدفوعات مكتملة", pending:"مستحقات معلّقة",
      transactions:"معاملة", vsLast:"مقارنةً بالشهر الماضي",
      unpaidCount:"فاتورة غير مسدّدة",
    },
    table:{
      title:"سجل المعاملات", date:"التاريخ", patient:"المريض",
      description:"الوصف", method:"طريقة الدفع", status:"الحالة", amount:"المبلغ", actions:"",
    },
    methods:{ cash:"نقداً", card:"بطاقة", transfer:"تحويل" },
    statuses:{ paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" },
    filter:{ all:"الكل", paid:"مدفوع", pending:"معلّق", cash:"نقداً", card:"بطاقة" },
    search:"بحث بالمريض أو الوصف...",
    pendingSection:{ title:"المستحقات المعلّقة", markPaid:"تحديد كمدفوع", empty:"لا توجد مستحقات معلّقة 🎉" },
    modal:{
      addTitle:"تسجيل دفعة جديدة",
      patient:"المريض *", selectPatient:"اختر المريض",
      amount:"المبلغ ($) *", amountPh:"0.00",
      description:"الوصف *", descPh:"مثال: رسوم استشارة، تحاليل...",
      method:"طريقة الدفع *",
      date:"التاريخ *",
      status:"الحالة",
      notes:"ملاحظات", notesPh:"أي ملاحظات إضافية...",
      save:"حفظ الدفعة",
      cancel:"إلغاء",
      required:"المريض والمبلغ والوصف مطلوبة",
      addPending:"إضافة كمستحق",
    },
    months:["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    noResults:"لا توجد نتائج",
    signOut:"تسجيل الخروج",
    revenueChart:"إيرادات آخر 6 أشهر",
    exportBtn:"تصدير",
    deleteConfirm:"هل تريد حذف هذه المعاملة؟",
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", admin:"Admin Panel" },
    page:{ title:"Payments", sub:"Financial transaction records and billing management" },
    recordPayment:"Record Payment",
    stats:{
      totalMonth:"Monthly Revenue", totalYear:"Annual Revenue",
      paid:"Completed Payments", pending:"Pending Dues",
      transactions:"transactions", vsLast:"vs last month",
      unpaidCount:"unpaid invoice",
    },
    table:{
      title:"Transaction History", date:"Date", patient:"Patient",
      description:"Description", method:"Method", status:"Status", amount:"Amount", actions:"",
    },
    methods:{ cash:"Cash", card:"Card", transfer:"Transfer" },
    statuses:{ paid:"Paid", pending:"Pending", cancelled:"Cancelled" },
    filter:{ all:"All", paid:"Paid", pending:"Pending", cash:"Cash", card:"Card" },
    search:"Search by patient or description...",
    pendingSection:{ title:"Pending Dues", markPaid:"Mark as Paid", empty:"No pending dues 🎉" },
    modal:{
      addTitle:"Record New Payment",
      patient:"Patient *", selectPatient:"Select patient",
      amount:"Amount ($) *", amountPh:"0.00",
      description:"Description *", descPh:"e.g. Consultation fee, Lab tests...",
      method:"Payment Method *",
      date:"Date *",
      status:"Status",
      notes:"Notes", notesPh:"Any additional notes...",
      save:"Save Payment",
      cancel:"Cancel",
      required:"Patient, amount and description are required",
      addPending:"Add as Pending",
    },
    months:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    noResults:"No results found",
    signOut:"Sign Out",
    revenueChart:"Revenue — Last 6 Months",
    exportBtn:"Export",
    deleteConfirm:"Delete this transaction?",
  },
};

const PATIENTS_LIST = [
  { id:1, name:"Ahmed Ali / أحمد علي" },
  { id:2, name:"Fatima Hassan / فاطمة حسن" },
  { id:3, name:"Khalid Othman / خالد عثمان" },
  { id:4, name:"Mariam Salem / مريم سالم" },
  { id:5, name:"Yousef Nasser / يوسف ناصر" },
];

const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22"];
const getColor = (id) => AVT_COLORS[(id-1) % AVT_COLORS.length];
const getInitials = (name) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();

const nowD = new Date();
const fmt = (d) => d.toISOString().split("T")[0];

const INIT_PAYMENTS = [
  { id:1, patientId:1, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),15)), description:"Consultation Fee",  method:"cash",     status:"paid",      amount:150,  notes:"" },
  { id:2, patientId:3, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),1)),  description:"Lab Tests",         method:"card",     status:"paid",      amount:200,  notes:"تحاليل سكر" },
  { id:3, patientId:2, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),10)), description:"Follow-up Visit",   method:"cash",     status:"paid",      amount:80,   notes:"" },
  { id:4, patientId:4, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),12)), description:"X-Ray",             method:"transfer", status:"pending",   amount:120,  notes:"" },
  { id:5, patientId:5, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),8)),  description:"Consultation Fee",  method:"card",     status:"paid",      amount:150,  notes:"" },
  { id:6, patientId:1, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth()-1,20)),"description":"Lab Tests",      method:"cash",     status:"paid",      amount:90,   notes:"" },
  { id:7, patientId:3, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth()-1,5)), description:"MRI Scan",         method:"card",     status:"paid",      amount:350,  notes:"" },
  { id:8, patientId:2, date:fmt(new Date(nowD.getFullYear(),nowD.getMonth(),14)), description:"Medication",        method:"cash",     status:"pending",   amount:60,   notes:"" },
];

// مخطط الإيرادات الشهرية (تجريبي)
const REVENUE_DATA = [1200, 1850, 1400, 2100, 1750, 3200];

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [col, setCol] = useState(false);
  const navItems = [
    {key:"dashboard",icon:"⊞",href:"/dashboard"},
    {key:"patients",icon:"👥",href:"/patients"},
    {key:"appointments",icon:"📅",href:"/appointments"},
    {key:"payments",icon:"💳",href:"/payments"},
  ];
  return (
    <aside style={{ width:col?70:240,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",transition:"width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50,boxShadow:"4px 0 24px rgba(8,99,186,.06)" }}>
      <div style={{ padding:col?"24px 0":"24px 20px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72 }}>
        {!col&&<div style={{ display:"flex",alignItems:"center",gap:10 }}><div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }}>💗</div><div><div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div><div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div></div></div>}
        {col&&<div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💗</div>}
        {!col&&<button onClick={()=>setCol(!col)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>{isAr?"›":"‹"}</button>}
      </div>
      <nav style={{ flex:1,padding:"16px 12px" }}>
        {navItems.map(item=>{
          const isActive = item.key==="payments";
          return(<a key={item.key} href={item.href} style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
            {isActive&&<div style={{ position:"absolute",[isAr?"right":"left"]:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }}/>}
            <span style={{ fontSize:18,flexShrink:0 }}>{item.icon}</span>
            {!col&&<span>{tr.nav[item.key]}</span>}
          </a>);
        })}
        <div style={{ height:1,background:"#eef0f3",margin:"12px 0" }}/>
        <a href="/admin" style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,textDecoration:"none",color:"#888",fontSize:14 }}><span style={{ fontSize:18 }}>⚙️</span>{!col&&<span>{tr.nav.admin}</span>}</a>
      </nav>
      <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
        {!col&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
        <div style={{ display:"flex",alignItems:"center",gap:col?0:10,justifyContent:col?"center":"flex-start",padding:col?8:"10px 12px",borderRadius:10,background:"#f7f9fc" }}>
          <div style={{ width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#0863ba,#a4c4e4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:700,flexShrink:0 }}>د</div>
          {!col&&<div style={{ flex:1,overflow:"hidden" }}><div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lang==="ar"?"الدكتور / العيادة":"Dr. / Clinic"}</div><button style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#c0392b",fontFamily:"Rubik,sans-serif",padding:0,fontWeight:500 }}>{tr.signOut} →</button></div>}
        </div>
      </div>
    </aside>
  );
}

// ─── Modal إضافة دفعة ─────────────────────────────────────
function PaymentModal({ lang, onSave, onClose }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({
    patientId:"", amount:"", description:"", method:"cash",
    date:fmt(new Date()), status:"paid", notes:"",
  });
  const [error, setError] = useState("");

  const handleSave = (asPending=false) => {
    if (!form.patientId||!form.amount||!form.description.trim()) { setError(tr.modal.required); return; }
    onSave({ ...form, patientId:Number(form.patientId), amount:parseFloat(form.amount), status: asPending?"pending":"paid" });
  };

  const inputSt = { width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr" };
  const F = ({label,children,half})=>(<div style={{ marginBottom:16,flex:half?"1":undefined }}><label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>{children}</div>);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>💳</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.addTitle}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}>⚠️ {error}</div>}
          <F label={tr.modal.patient}>
            <select value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
              <option value="">{tr.modal.selectPatient}</option>
              {PATIENTS_LIST.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.amount} half>
              <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder={tr.modal.amountPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.modal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.modal.description}>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.modal.descPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          {/* Method */}
          <F label={tr.modal.method}>
            <div style={{ display:"flex",gap:10 }}>
              {[
                { k:"cash",     icon:"💵", label:tr.methods.cash     },
                { k:"card",     icon:"💳", label:tr.methods.card     },
                { k:"transfer", icon:"🏦", label:tr.methods.transfer },
              ].map(m=>(
                <label key={m.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.method===m.k?"1.5px solid #2e7d32":"1.5px solid #eee",background:form.method===m.k?"rgba(46,125,50,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.method===m.k?700:400,color:form.method===m.k?"#2e7d32":"#888" }}>
                  <span>{m.icon}</span>{m.label}
                  <input type="radio" name="method" value={m.k} checked={form.method===m.k} onChange={e=>setForm({...form,method:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
          </F>
          <F label={tr.modal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.modal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        {/* Footer */}
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={()=>handleSave(false)} style={{ flex:1,padding:"13px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(46,125,50,.25)",transition:"all .2s" }} onMouseEnter={e=>e.target.style.background="#1b5e20"} onMouseLeave={e=>e.target.style.background="#2e7d32"}>
            {tr.modal.save}
          </button>
          <button onClick={()=>handleSave(true)} style={{ padding:"13px 16px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
            {tr.modal.addPending}
          </button>
          <button onClick={onClose} style={{ padding:"13px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── مخطط الإيرادات ───────────────────────────────────────
function RevenueChart({ lang, months }) {
  const tr = T[lang];
  const max = Math.max(...REVENUE_DATA);
  const now = new Date();
  const lastSixMonths = Array.from({length:6},(_,i)=>{
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    return tr.months[d.getMonth()];
  });

  return (
    <div style={{ background:"#fff",borderRadius:16,padding:"22px 24px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.revenueChart}</h3>
        <span style={{ fontSize:12,color:"#aaa",background:"#f7f9fc",padding:"4px 12px",borderRadius:20 }}>
          {tr.months[now.getMonth()]} {now.getFullYear()}
        </span>
      </div>
      {/* Bars */}
      <div style={{ display:"flex",alignItems:"flex-end",gap:10,height:120,marginBottom:12 }}>
        {REVENUE_DATA.map((v,i)=>{
          const isLast = i===5;
          const h = Math.round((v/max)*100);
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isLast?"#2e7d32":"#ccc",fontWeight:isLast?700:400 }}>${v>=1000?(v/1000).toFixed(1)+"k":v}</div>
              <div style={{ width:"100%",position:"relative",height:100,display:"flex",alignItems:"flex-end" }}>
                <div style={{
                  width:"100%",borderRadius:"6px 6px 0 0",
                  height:`${h}%`,minHeight:6,
                  background: isLast
                    ? "linear-gradient(180deg,#2e7d32,#66bb6a)"
                    : "linear-gradient(180deg,#a4c4e4,#d0e8f4)",
                  transition:"height .8s cubic-bezier(.4,0,.2,1)",
                  boxShadow: isLast?"0 4px 12px rgba(46,125,50,.2)":undefined,
                }}/>
              </div>
            </div>
          );
        })}
      </div>
      {/* Month labels */}
      <div style={{ display:"flex",gap:10 }}>
        {lastSixMonths.map((m,i)=>(
          <div key={i} style={{ flex:1,textAlign:"center",fontSize:11,color:i===5?"#2e7d32":"#bbb",fontWeight:i===5?700:400 }}>{m}</div>
        ))}
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function PaymentsPage() {
  const [lang, setLang] = useState("ar");
  const isAr = lang==="ar";
  const tr = T[lang];

  const [payments, setPayments] = useState(INIT_PAYMENTS);
  const [nextId, setNextId]     = useState(INIT_PAYMENTS.length+1);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId]  = useState(null);
  const [animIds, setAnimIds]    = useState([]);

  // فلترة
  const filtered = payments.filter(p=>{
    const patient = PATIENTS_LIST.find(x=>x.id===p.patientId);
    const q = search.toLowerCase();
    if (q && !patient?.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    if (filter==="paid"    && p.status!=="paid")    return false;
    if (filter==="pending" && p.status!=="pending") return false;
    if (filter==="cash"    && p.method!=="cash")    return false;
    if (filter==="card"    && p.method!=="card")    return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const pendingPayments = payments.filter(p=>p.status==="pending");

  // إحصائيات
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthPayments = payments.filter(p=>p.date.startsWith(thisMonth));
  const stats = {
    totalMonth: monthPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount, 0),
    totalYear:  payments.filter(p=>p.status==="paid" && p.date.startsWith(new Date().getFullYear())).reduce((s,p)=>s+p.amount, 0),
    paidCount:  payments.filter(p=>p.status==="paid").length,
    pendingAmt: pendingPayments.reduce((s,p)=>s+p.amount, 0),
    pendingCount: pendingPayments.length,
  };

  const handleSave = (data) => {
    const id = nextId;
    const newP = { ...data, id };
    setPayments(prev=>[newP,...prev]);
    setNextId(id+1);
    setAnimIds(prev=>[...prev,id]);
    setTimeout(()=>setAnimIds(prev=>prev.filter(x=>x!==id)),600);
    setShowModal(false);
  };

  const markPaid = (id) => {
    setPayments(prev=>prev.map(p=>p.id===id?{...p,status:"paid"}:p));
  };

  const deletePayment = (id) => {
    setPayments(prev=>prev.filter(p=>p.id!==id));
    setDeleteId(null);
  };

  const statusStyle = {
    paid:      { bg:"rgba(46,125,50,.1)",    color:"#2e7d32", label:tr.statuses.paid      },
    pending:   { bg:"rgba(230,126,34,.1)",   color:"#e67e22", label:tr.statuses.pending   },
    cancelled: { bg:"rgba(192,57,43,.1)",   color:"#c0392b", label:tr.statuses.cancelled },
  };

  const methodIcon = { cash:"💵", card:"💳", transfer:"🏦" };

  const fmtDate = (d) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-SA":"en-US",{ year:"numeric",month:"short",day:"numeric" });

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
        @keyframes rowPop{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:scale(1)}}
        .page-anim{animation:fadeUp .4s ease both}
        .tx-row{transition:background .15s;border-bottom:1px solid #f0f2f5}
        .tx-row:last-child{border-bottom:none}
        .tx-row:hover{background:#fafbff}
        .filter-chip{padding:7px 16px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .icon-btn{width:30px;height:30px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .stat-big{background:#fff;border-radius:18px;padding:22px 24px;border:1.5px solid #eef0f3;box-shadow:0 2px 16px rgba(8,99,186,.06);position:relative;overflow:hidden}
        .pending-row{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:#fff;border:1.5px solid #eef0f3;margin-bottom:10px;transition:all .2s}
        .pending-row:hover{border-color:rgba(230,126,34,.3);box-shadow:0 4px 12px rgba(230,126,34,.08)}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang}/>

        <main className="page-anim" style={{ [isAr?"marginRight":"marginLeft"]:240,padding:"0 32px 48px",transition:"margin .3s" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                <p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button style={{ padding:"10px 18px",background:"#fff",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                  📤 {tr.exportBtn}
                </button>
                <button onClick={()=>setShowModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(46,125,50,.25)",transition:"all .2s" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#1b5e20";e.currentTarget.style.transform="translateY(-1px)"}}
                  onMouseLeave={e=>{e.currentTarget.style.background="#2e7d32";e.currentTarget.style.transform="translateY(0)"}}
                ><span style={{ fontSize:18 }}>＋</span> {tr.recordPayment}</button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* ── STATS ── */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16,marginBottom:24 }}>
              {/* Monthly Revenue - big card */}
              <div className="stat-big" style={{ gridColumn:"span 1",animation:"fadeUp .4s 0ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#2e7d32,#66bb6a)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>💰</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#2e7d32",lineHeight:1 }}>
                  ${stats.totalMonth.toLocaleString()}
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalMonth}</div>
                <div style={{ fontSize:11,color:"#2e7d32",marginTop:4,fontWeight:600 }}>↑ 12% {tr.stats.vsLast}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 60ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#0863ba,#a4c4e4)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(8,99,186,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>📊</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#0863ba",lineHeight:1 }}>
                  ${stats.totalYear.toLocaleString()}
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalYear}</div>
                <div style={{ fontSize:11,color:"#888",marginTop:4 }}>{stats.paidCount} {tr.stats.transactions}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 120ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#e67e22,#f39c12)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(230,126,34,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>⏳</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#e67e22",lineHeight:1 }}>
                  ${stats.pendingAmt.toLocaleString()}
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.pending}</div>
                <div style={{ fontSize:11,color:"#e67e22",marginTop:4,fontWeight:600 }}>{stats.pendingCount} {tr.stats.unpaidCount}</div>
              </div>

              {/* Donut-style payment methods */}
              <div className="stat-big" style={{ animation:"fadeUp .4s 180ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#7b2d8b,#a855f7)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
                  {isAr?"طرق الدفع":"Payment Methods"}
                </div>
                {[
                  { k:"cash",     pct:55, color:"#0863ba" },
                  { k:"card",     pct:35, color:"#2e7d32" },
                  { k:"transfer", pct:10, color:"#e67e22" },
                ].map(m=>(
                  <div key={m.k} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:12,color:"#666" }}>{methodIcon[m.k]} {tr.methods[m.k]}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:m.color }}>{m.pct}%</span>
                    </div>
                    <div style={{ height:5,background:"#f0f0f0",borderRadius:10,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${m.pct}%`,background:m.color,borderRadius:10,transition:"width .8s" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20 }}>

              {/* LEFT: Table */}
              <div>
                {/* Search + Filter */}
                <div style={{ background:"#fff",borderRadius:14,padding:"16px 18px",border:"1.5px solid #eef0f3",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#bbb",fontSize:14 }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}/>
                    {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb" }}>✕</button>}
                  </div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {Object.entries(tr.filter).map(([k,v])=>(
                      <button key={k} className={`filter-chip${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.table.title}</h3>
                    <span style={{ fontSize:12,color:"#aaa" }}>{filtered.length} {tr.stats.transactions}</span>
                  </div>

                  {/* Header row */}
                  <div style={{ display:"grid",gridTemplateColumns:"110px 1fr 130px 90px 90px 90px 40px",padding:"10px 20px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3",gap:0 }}>
                    {[tr.table.date,tr.table.patient,tr.table.description,tr.table.method,tr.table.status,tr.table.amount,""].map((h,i)=>(
                      <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.4,textAlign:i===5||i===6?"center":"start",paddingLeft:i>0&&i<6?8:0 }}>{h}</div>
                    ))}
                  </div>

                  {filtered.length===0?(
                    <div style={{ textAlign:"center",padding:"50px 20px",color:"#ccc" }}>
                      <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                      <div style={{ fontSize:14,fontWeight:600 }}>{tr.noResults}</div>
                    </div>
                  ):(
                    filtered.map(p=>{
                      const patient = PATIENTS_LIST.find(x=>x.id===p.patientId);
                      const ss = statusStyle[p.status]||statusStyle.paid;
                      const isNew = animIds.includes(p.id);
                      return (
                        <div key={p.id} className="tx-row" style={{ display:"grid",gridTemplateColumns:"110px 1fr 130px 90px 90px 90px 40px",padding:"13px 20px",alignItems:"center",animation:isNew?"rowPop .4s ease":undefined }}>
                          {/* Date */}
                          <div style={{ fontSize:12,color:"#888" }}>{fmtDate(p.date)}</div>
                          {/* Patient */}
                          <div style={{ display:"flex",alignItems:"center",gap:10,paddingLeft:8 }}>
                            <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.patientId),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                              {patient?getInitials(patient.name):"?"}
                            </div>
                            <div style={{ fontSize:13,fontWeight:500,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:120 }}>
                              {patient?.name||"—"}
                            </div>
                          </div>
                          {/* Description */}
                          <div style={{ fontSize:12,color:"#666",paddingLeft:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.description}</div>
                          {/* Method */}
                          <div style={{ paddingLeft:8,fontSize:12,color:"#888",display:"flex",alignItems:"center",gap:6 }}>
                            <span>{methodIcon[p.method]}</span>
                            <span>{tr.methods[p.method]}</span>
                          </div>
                          {/* Status */}
                          <div style={{ paddingLeft:8 }}>
                            <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color }}>
                              {ss.label}
                            </span>
                          </div>
                          {/* Amount */}
                          <div style={{ textAlign:"center",fontSize:15,fontWeight:800,color:p.status==="pending"?"#e67e22":p.status==="cancelled"?"#ccc":"#2e7d32" }}>
                            ${p.amount.toFixed(2)}
                          </div>
                          {/* Delete */}
                          <div style={{ display:"flex",justifyContent:"center" }}>
                            <button className="icon-btn" onClick={()=>setDeleteId(p.id)} title={tr.deleteConfirm}>🗑️</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total */}
                {filtered.length>0&&(
                  <div style={{ display:"flex",justifyContent:"flex-end",alignItems:"center",gap:16,marginTop:14,padding:"12px 20px",background:"#fff",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                    <span style={{ fontSize:13,color:"#888" }}>{isAr?"المجموع:":"Total:"}</span>
                    <span style={{ fontSize:18,fontWeight:900,color:"#2e7d32" }}>
                      ${filtered.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* RIGHT: Revenue Chart + Pending */}
              <div>
                {/* Chart */}
                <div style={{ marginBottom:16 }}>
                  <RevenueChart lang={lang}/>
                </div>

                {/* Pending Dues */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",padding:"18px 18px",boxShadow:"0 2px 16px rgba(8,99,186,.06)" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                    <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:"#e67e22",display:"inline-block",animation:"pulse 2s infinite" }}/>
                      {tr.pendingSection.title}
                    </h3>
                    <span style={{ fontSize:12,background:"rgba(230,126,34,.1)",color:"#e67e22",padding:"3px 10px",borderRadius:20,fontWeight:700 }}>
                      {pendingPayments.length}
                    </span>
                  </div>

                  {pendingPayments.length===0?(
                    <div style={{ textAlign:"center",padding:"24px 0",color:"#ccc",fontSize:13 }}>{tr.pendingSection.empty}</div>
                  ):(
                    pendingPayments.map(p=>{
                      const patient = PATIENTS_LIST.find(x=>x.id===p.patientId);
                      return (
                        <div key={p.id} className="pending-row">
                          <div style={{ width:34,height:34,borderRadius:8,background:getColor(p.patientId),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                            {patient?getInitials(patient.name):"?"}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{patient?.name}</div>
                            <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{p.description}</div>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                            <span style={{ fontSize:14,fontWeight:800,color:"#e67e22" }}>${p.amount}</span>
                            <button onClick={()=>markPaid(p.id)}
                              style={{ padding:"4px 10px",background:"rgba(46,125,50,.1)",color:"#2e7d32",border:"1px solid rgba(46,125,50,.2)",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Rubik,sans-serif",whiteSpace:"nowrap" }}>
                              ✓ {tr.pendingSection.markPaid}
                            </button>
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

        {/* Add Modal */}
        {showModal&&<PaymentModal lang={lang} onSave={handleSave} onClose={()=>setShowModal(false)}/>}

        {/* Delete Confirm */}
        {deleteId&&(
          <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={()=>setDeleteId(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }}/>
            <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:360,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.15)",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:16,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteConfirm}</h3>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={()=>deletePayment(deleteId)} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
                  {isAr?"نعم، احذف":"Yes, Delete"}
                </button>
                <button onClick={()=>setDeleteId(null)} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
                  {isAr?"إلغاء":"Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
