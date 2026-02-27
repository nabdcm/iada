"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient, Payment } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Payments Page
// داشبورد المدفوعات + الجدول + إضافة دفعة + المستحقات
// ============================================================

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"لوحة المعلومات", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", admin:"لوحة المدير" },
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
      amount:"المبلغ (ل.س) *", amountPh:"0.00",
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
      amount:"Amount (SYP) *", amountPh:"0.00",
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

const AVT_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22"];
const getColor = (id: number) => AVT_COLORS[(id - 1) % AVT_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const fmt = (d: Date) => d.toISOString().split("T")[0];

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [col, setCol] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sidebarTransform = isMobile
    ? mobileOpen ? "translateX(0)" : isAr ? "translateX(100%)" : "translateX(-100%)"
    : "translateX(0)";

  const GRID_ICON = <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
  const navItems = [
    {key:"dashboard",icon:GRID_ICON,href:"/dashboard"},
    {key:"patients",icon:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,href:"/patients"},
    {key:"appointments",icon:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,href:"/appointments"},
    {key:"payments",icon:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,href:"/payments"},
  ];

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:49 }} />
      )}
      {isMobile && (
        <button onClick={()=>setMobileOpen(!mobileOpen)} style={{
          position:"fixed", top:14, zIndex:60,
          right: isAr ? 16 : undefined,
          left:  isAr ? undefined : 16,
          width:40, height:40, borderRadius:10, background:"#0863ba",
          border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 12px rgba(8,99,186,.3)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      )}
    <aside style={{ width:isMobile?260:col?70:240,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50,transform:sidebarTransform,boxShadow:isMobile&&mobileOpen?"8px 0 32px rgba(0,0,0,.15)":"4px 0 24px rgba(8,99,186,.06)" }}>
      <div style={{ padding:col?"24px 0":"24px 20px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72 }}>
        {!col&&<div style={{ display:"flex",alignItems:"center",gap:10 }}><svg viewBox="0 0 337.74 393.31" style={{width:28,height:28,flexShrink:0}} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="py-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
                  <stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/>
                </linearGradient>
                <linearGradient id="py-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/>
                </linearGradient>
              </defs>
              <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
              <path fill="url(#py-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
              <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
              <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
              <path fill="url(#py-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
            </svg><div><div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div><div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div></div></div>}
        {col&&<div style={{ width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center" }}><svg viewBox="0 0 337.74 393.31" style={{width:28,height:28,flexShrink:0}} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="py-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
                  <stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/>
                </linearGradient>
                <linearGradient id="py-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/>
                </linearGradient>
              </defs>
              <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
              <path fill="url(#py-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
              <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
              <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
              <path fill="url(#py-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
            </svg></div>}
        {!col&&<button onClick={()=>setCol(!col)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>{isAr?"›":"‹"}</button>}
      </div>
      <nav style={{ flex:1,padding:"16px 12px" }}>
        {navItems.map(item=>{
          const isActive = item.key==="payments";
          return(<a key={item.key} href={item.href} style={{ display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"12px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
            {isActive&&<div style={{ position:"absolute",[isAr?"right":"left"]:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }}/>}
            <span style={{ display:"flex",alignItems:"center",flexShrink:0 }}>{item.icon}</span>
            {!col&&<span>{tr.nav[item.key]}</span>}
          </a>);
        })}

      </nav>
      <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
        {!col&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
        <button
          onClick={async () => { const { supabase: sb } = await import("@/lib/supabase"); await sb.auth.signOut(); window.location.href = "/login"; }}
          style={{ width:"100%",padding:col?"10px 0":"10px 14px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#c0392b",fontWeight:600,display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:8,transition:"all .2s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(192,57,43,.12)"}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(192,57,43,.06)"}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          {!col && <span>{tr.signOut}</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

// ─── Field wrapper — خارج كل المكونات لتجنب مشكلة focus ────
// المشكلة: تعريف F داخل Modal يُعيد إنشاءها عند كل render → فقدان الـ focus
function F({ label, children, half }: { label: any; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom:16, flex: half ? "1" : undefined }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#555", marginBottom:7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Modal إضافة دفعة ─────────────────────────────────────
function PaymentModal({ lang, patients, onSave, onClose }: { lang: string; patients: Patient[]; onSave: (data: Omit<Payment,'id'|'user_id'|'created_at'>) => Promise<void>; onClose: () => void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({
    patientId:"", amount:"", description:"", method:"cash",
    date:fmt(new Date()), status:"paid", notes:"",
  });
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSave = async (asPending=false) => {
    if (!form.patientId||!form.amount||!form.description.trim()) { setError(tr.modal.required); return; }
    setSaving(true);
    try {
      await onSave({
        patient_id: form.patientId ? Number(form.patientId) : undefined,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        method: form.method as "cash"|"card"|"transfer",
        date: form.date,
        status: (asPending ? "pending" : "paid") as "paid"|"pending"|"cancelled",
        notes: form.notes || undefined,
      } as any);
    } catch(e) {
      setError(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving payment");
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
    outline:"none", transition:"border .2s", direction: isAr ? "rtl" : "ltr",
  };

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
              {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
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
          <button
  onClick={() => handleSave(false)}
  disabled={saving}
  style={{
    flex: 1,
    padding: "13px",
    background: saving ? "#81c784" : "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontFamily: "Rubik,sans-serif",
    fontSize: 15,
    fontWeight: 700,
    cursor: saving ? "not-allowed" : "pointer",
    boxShadow: "0 4px 16px rgba(46,125,50,.25)",
    transition: "all .2s"
  }}
>
            {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : tr.modal.save}
          </button>
          <button onClick={()=>handleSave(true)} disabled={saving} style={{ padding:"13px 16px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:saving?.6:1 }}>
            {tr.modal.addPending}
          </button>
          <button onClick={onClose} style={{ padding:"13px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── مخطط الإيرادات ───────────────────────────────────────
function RevenueChart({ lang, months, revenueData }: { lang: string; months: string[]; revenueData: number[] }) {
  const tr = T[lang];
  const max = Math.max(...revenueData, 1);
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
        {revenueData.map((v,i)=>{
          const isLast = i===5;
          const h = Math.round((v/max)*100);
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isLast?"#2e7d32":"#ccc",fontWeight:isLast?700:400 }}>{v>=1000?(v/1000).toFixed(0)+"k":v} ل.س</div>
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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── State ──────────────────────────────────────────────────
  const [payments,  setPayments]  = useState<Payment[]>([]);
  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [clinicName, setClinicName] = useState<string>("");
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteId,  setDeleteId]  = useState<number|null>(null);
  const [animIds,   setAnimIds]   = useState<number[]>([]);

  // ── جلب البيانات من Supabase ────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // جلب اسم العيادة من user_metadata أو clinic_profiles
      const clinicMeta = user.user_metadata?.clinic_name as string | undefined;
      if (clinicMeta) {
        setClinicName(clinicMeta);
      } else {
        // fallback: جلب من clinic_profiles
        const { data: profile } = await supabase
          .from("clinic_profiles")
          .select("clinic_name")
          .eq("id", user.id)
          .single();
        if (profile?.clinic_name) setClinicName(profile.clinic_name);
        else {
          // fallback ثاني: جدول clinics
          const { data: clinicRow } = await supabase
            .from("clinics")
            .select("name")
            .eq("user_id", user.id)
            .single();
          if (clinicRow?.name) setClinicName(clinicRow.name);
        }
      }

      const [{ data: paymentsData }, { data: patientsData }] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("patients")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_hidden", false)
          .order("name"),
      ]);

      setPayments(paymentsData || []);
      setPatients((patientsData ?? []) as unknown as Patient[]);
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── فلترة وترتيب ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const patient = patients.find(x => x.id === p.patient_id);
      const q = search.toLowerCase();
      if (q && !patient?.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      if (filter === "paid"    && p.status !== "paid")    return false;
      if (filter === "pending" && p.status !== "pending") return false;
      if (filter === "cash"    && p.method !== "cash")    return false;
      if (filter === "card"    && p.method !== "card")    return false;
      return true;
    }).sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [payments, patients, search, filter]);

  const pendingPayments = useMemo(() => payments.filter(p => p.status === "pending"), [payments]);

  // ── إحصائيات ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthPayments = payments.filter(p => p.date.startsWith(thisMonth));
    const pending = payments.filter(p => p.status === "pending");
    return {
      totalMonth:   monthPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0),
      totalYear:    payments.filter(p => p.status === "paid" && p.date.startsWith(String(new Date().getFullYear()))).reduce((s, p) => s + p.amount, 0),
      paidCount:    payments.filter(p => p.status === "paid").length,
      pendingAmt:   pending.reduce((s, p) => s + p.amount, 0),
      pendingCount: pending.length,
    };
  }, [payments]);

  // ── إحصائيات طرق الدفع الحقيقية ────────────────────────────
  const methodStats = useMemo(() => {
    const total = payments.filter(p => p.status === "paid").length;
    if (total === 0) return [
      { k:"cash",     pct:0, color:"#0863ba" },
      { k:"card",     pct:0, color:"#2e7d32" },
      { k:"transfer", pct:0, color:"#e67e22" },
    ];
    const cash     = payments.filter(p => p.status === "paid" && p.method === "cash").length;
    const card     = payments.filter(p => p.status === "paid" && p.method === "card").length;
    const transfer = payments.filter(p => p.status === "paid" && p.method === "transfer").length;
    return [
      { k:"cash",     pct: Math.round((cash     / total) * 100), color:"#0863ba" },
      { k:"card",     pct: Math.round((card     / total) * 100), color:"#2e7d32" },
      { k:"transfer", pct: Math.round((transfer / total) * 100), color:"#e67e22" },
    ];
  }, [payments]);

  // ── بيانات مخطط الإيرادات (آخر 6 أشهر) ─────────────────────
  const revenueData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return payments
        .filter(p => p.status === "paid" && p.date.startsWith(key))
        .reduce((s, p) => s + p.amount, 0);
    });
  }, [payments]);

  // ── إضافة دفعة جديدة ────────────────────────────────────────
  const handleSave = async (data: Omit<Payment,'id'|'user_id'|'created_at'>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: inserted, error } = await supabase
        .from("payments")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();

      if (error) { console.error("insert payment error:", error); return; }

      setPayments(prev => [inserted, ...prev]);
      setAnimIds(prev => [...prev, inserted.id]);
      setTimeout(() => setAnimIds(prev => prev.filter(x => x !== inserted.id)), 600);
      setShowModal(false);
    } catch (err) {
      console.error("handleSave error:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── تحديد كمدفوع ────────────────────────────────────────────
  const markPaid = async (id: number) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", id);

    if (!error) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "paid" } : p));
    }
  };

  // ── حذف دفعة ────────────────────────────────────────────────
  const deletePayment = async (id: number) => {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (!error) {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
    setDeleteId(null);
  };

  const statusStyle = {
    paid:      { bg:"rgba(46,125,50,.1)",    color:"#2e7d32", label:tr.statuses.paid      },
    pending:   { bg:"rgba(230,126,34,.1)",   color:"#e67e22", label:tr.statuses.pending   },
    cancelled: { bg:"rgba(192,57,43,.1)",   color:"#c0392b", label:tr.statuses.cancelled },
  };

  const methodIcon = { cash:"💵", card:"💳", transfer:"🏦" };

  const fmtDate = (d) => new Date(d+"T00:00:00").toLocaleDateString(isAr?"ar-SA":"en-US",{ year:"numeric",month:"short",day:"numeric" });

  // ── تصدير تقرير PDF شهري ─────────────────────────────────
  const exportPDF = () => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0,7);
    const monthPayments = payments
      .filter(p => p.date.startsWith(thisMonth))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const monthName = now.toLocaleDateString("ar-SA", { year:"numeric", month:"long" });
    const totalPaid = monthPayments.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0);
    const totalPending = monthPayments.filter(p=>p.status==="pending").reduce((s,p)=>s+p.amount,0);

    const rows = monthPayments.map(p => {
      const patient = patients.find(x=>x.id===p.patient_id);
      const statusMap: Record<string,string> = { paid:"مدفوع", pending:"معلّق", cancelled:"ملغي" };
      const methodMap: Record<string,string> = { cash:"نقداً", card:"بطاقة", transfer:"تحويل" };
      return `<tr>
        <td>${fmtDate(p.date)}</td>
        <td>${patient?.name || "—"}</td>
        <td>${p.description}</td>
        <td>${methodMap[p.method] || p.method}</td>
        <td class="status-${p.status}">${statusMap[p.status] || p.status}</td>
        <td class="amount">${p.amount.toLocaleString()} ل.س</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>تقرير المدفوعات - ${monthName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Rubik', 'Arial', sans-serif; direction: rtl; background: #fff; color: #222; padding: 32px; font-size: 13px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0863ba; padding-bottom: 18px; margin-bottom: 24px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-text { font-size: 26px; font-weight: 800; color: #0863ba; }
  .logo-sub { font-size: 12px; color: #888; }
  .report-title { text-align: left; }
  .report-title h1 { font-size: 18px; font-weight: 800; color: #353535; }
  .report-title p { font-size: 12px; color: #888; margin-top: 4px; }
  .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 24px; }
  .stat { background: #f7f9fc; border-radius: 10px; padding: 14px 18px; border: 1.5px solid #eef0f3; }
  .stat-val { font-size: 20px; font-weight: 800; }
  .stat-label { font-size: 11px; color: #888; margin-top: 4px; }
  .green { color: #2e7d32; } .orange { color: #e67e22; } .blue { color: #0863ba; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #0863ba; color: #fff; }
  th { padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 700; }
  td { padding: 9px 12px; border-bottom: 1px solid #eef0f3; font-size: 12px; }
  tr:nth-child(even) td { background: #fafbfc; }
  .amount { font-weight: 700; color: #2e7d32; }
  .status-paid { color: #2e7d32; font-weight: 600; }
  .status-pending { color: #e67e22; font-weight: 600; }
  .status-cancelled { color: #c0392b; font-weight: 600; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #eef0f3; display: flex; justify-content: space-between; font-size: 11px; color: #aaa; }
  .total-row td { font-weight: 800; background: #f0f7ff !important; color: #0863ba; border-top: 2px solid #0863ba; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <svg viewBox="0 0 337.74 393.31" style="width:44px;height:44px" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
            <stop offset=".3" stop-color="#0863ba"/><stop offset=".69" stop-color="#5694cf"/>
          </linearGradient>
          <linearGradient id="g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#5694cf"/><stop offset=".68" stop-color="#a4c4e4"/>
          </linearGradient>
        </defs>
        <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
        <path fill="url(#g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
        <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
        <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
        <path fill="url(#g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
      </svg>
      <div>
        <div class="logo-text">نبض</div>
        <div class="logo-sub">${clinicName || "نظام إدارة العيادة"}</div>
      </div>
    </div>
    <div class="report-title">
      <h1>تقرير المدفوعات الشهري</h1>
      ${clinicName ? `<p style="font-size:14px;font-weight:700;color:#353535;margin-bottom:2px">${clinicName}</p>` : ""}
      <p>${monthName}</p>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-val green">${totalPaid.toLocaleString()} ل.س</div>
      <div class="stat-label">إجمالي المدفوع</div>
    </div>
    <div class="stat">
      <div class="stat-val orange">${totalPending.toLocaleString()} ل.س</div>
      <div class="stat-label">إجمالي المعلّق</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${monthPayments.length}</div>
      <div class="stat-label">إجمالي المعاملات</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>المريض</th>
        <th>الوصف</th>
        <th>طريقة الدفع</th>
        <th>الحالة</th>
        <th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="5">الإجمالي المدفوع</td>
        <td>${totalPaid.toLocaleString()} ل.س</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>نبض${clinicName ? " — " + clinicName : " — نظام إدارة العيادة"}</span>
    <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA", { year:"numeric", month:"long", day:"numeric" })}</span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 500);
    }
  };

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
        @keyframes spin{to{transform:rotate(360deg)}}
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
        @media(max-width:768px){
          .stat-big{padding:14px 16px!important;border-radius:14px!important}
          .stat-big .stat-big-icon{width:32px!important;height:32px!important;font-size:14px!important;margin-bottom:10px!important}
          .stat-big .stat-big-val{font-size:20px!important}
        }
        .pending-row{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;background:#fff;border:1.5px solid #eef0f3;margin-bottom:10px;transition:all .2s}
        .pending-row:hover{border-color:rgba(230,126,34,.3);box-shadow:0 4px 12px rgba(230,126,34,.08)}
        @media(max-width:768px){
          .pay-stats-grid{grid-template-columns:1fr 1fr!important}
          .pay-main-grid{grid-template-columns:1fr!important}
          .pay-tx-row{grid-template-columns:1fr!important}
          .pay-tx-header{display:none!important}
          .filter-chip{padding:6px 12px!important;font-size:12px!important}
        }
      \`}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang}/>

        <main className="page-anim" style={{
          [isAr?"marginRight":"marginLeft"]: isMobile ? 0 : 240,
          padding: isMobile ? "0 14px 48px" : "0 32px 48px",
          transition:"margin .3s",
        }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between", paddingLeft:isMobile?(isAr?0:52):0, paddingRight:isMobile?(isAr?52:0):0 }}>
              <div>
                <h1 style={{ fontSize:isMobile?17:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                {!isMobile&&<p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>}
              </div>
              <div style={{ display:"flex",gap:isMobile?6:10 }}>
                {!isMobile&&(
                  <button onClick={exportPDF} style={{ padding:"10px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid #d0e4f7",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all .2s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background="#f0f7ff"}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {tr.exportBtn} PDF
                  </button>
                )}
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
            <div className="pay-stats-grid" style={{ display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:isMobile?10:16,marginBottom:24 }}>
              {/* Monthly Revenue - big card */}
              <div className="stat-big" style={{ gridColumn:"span 1",animation:"fadeUp .4s 0ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#2e7d32,#66bb6a)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>💰</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#2e7d32",lineHeight:1 }}>
                  {stats.totalMonth.toLocaleString()} ل.س
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalMonth}</div>
                <div style={{ fontSize:11,color:"#2e7d32",marginTop:4,fontWeight:600 }}>↑ 12% {tr.stats.vsLast}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 60ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#0863ba,#a4c4e4)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(8,99,186,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>📊</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#0863ba",lineHeight:1 }}>
                  {stats.totalYear.toLocaleString()} ل.س
                </div>
                <div style={{ fontSize:12,color:"#aaa",marginTop:8,fontWeight:500 }}>{tr.stats.totalYear}</div>
                <div style={{ fontSize:11,color:"#888",marginTop:4 }}>{stats.paidCount} {tr.stats.transactions}</div>
              </div>

              <div className="stat-big" style={{ animation:"fadeUp .4s 120ms ease both" }}>
                <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#e67e22,#f39c12)",borderRadius:"18px 18px 0 0" }}/>
                <div style={{ width:40,height:40,background:"rgba(230,126,34,.08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14 }}>⏳</div>
                <div style={{ fontSize:30,fontWeight:900,color:"#e67e22",lineHeight:1 }}>
                  {stats.pendingAmt.toLocaleString()} ل.س
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
                  ...methodStats,
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
            <div className="pay-main-grid" style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 300px",gap:20 }}>

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
                    {Object.entries(tr.filter as Record<string, string>).map(([k, v]) => (
  <button
    key={k}
    className={`filter-chip${filter===k ? " active" : ""}`}
    onClick={() => setFilter(k)}
  >
    {v}
  </button>
))}
                  </div>
                </div>

                {/* Table */}
                <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>
                  <div style={{ padding:"16px 20px",borderBottom:"1.5px solid #f5f7fa",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.table.title}</h3>
                    <span style={{ fontSize:12,color:"#aaa" }}>{filtered.length} {tr.stats.transactions}</span>
                  </div>

                  {/* Header row — desktop only */}
                  {!isMobile && (
                    <div style={{ display:"grid",gridTemplateColumns:"110px 1fr 130px 90px 90px 90px 40px",padding:"10px 20px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3",gap:0 }}>
                      {[tr.table.date,tr.table.patient,tr.table.description,tr.table.method,tr.table.status,tr.table.amount,""].map((h,i)=>(
                        <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.4,textAlign:i===5||i===6?"center":"start",paddingLeft:i>0&&i<6?8:0 }}>{h}</div>
                      ))}
                    </div>
                  )}

                  {filtered.length===0?(
                    <div style={{ textAlign:"center",padding:"50px 20px",color:"#ccc" }}>
                      <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                      <div style={{ fontSize:14,fontWeight:600 }}>{tr.noResults}</div>
                    </div>
                  ):loading?(
                    <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                      <div style={{ width:32,height:32,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 12px" }}/>
                      <div style={{ fontSize:13 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
                    </div>
                  ):(
                    filtered.map(p=>{
                      const patient = patients.find(x=>x.id===p.patient_id);
                      const ss = statusStyle[p.status]||statusStyle.paid;
                      const isNew = animIds.includes(p.id);
                      if (isMobile) {
                        // Mobile card view
                        return (
                          <div key={p.id} className="tx-row" style={{ padding:"14px 16px", animation:isNew?"rowPop .4s ease":undefined }}>
                            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div style={{ width:36,height:36,borderRadius:10,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>
                                  {patient?getInitials(patient.name):"?"}
                                </div>
                                <div>
                                  <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{patient?.name||"—"}</div>
                                  <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{p.description}</div>
                                </div>
                              </div>
                              <div style={{ textAlign:"end" }}>
                                <div style={{ fontSize:16,fontWeight:800,color:p.status==="pending"?"#e67e22":p.status==="cancelled"?"#ccc":"#2e7d32" }}>
                                  {p.amount.toLocaleString()} ل.س
                                </div>
                                <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:ss.bg,color:ss.color,marginTop:4,display:"inline-block" }}>
                                  {ss.label}
                                </span>
                              </div>
                            </div>
                            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                                <span style={{ fontSize:11,color:"#aaa" }}>{fmtDate(p.date)}</span>
                                <span style={{ fontSize:11,color:"#aaa",display:"flex",alignItems:"center",gap:4 }}>
                                  {methodIcon[p.method]} {tr.methods[p.method]}
                                </span>
                              </div>
                              <button className="icon-btn" onClick={()=>setDeleteId(p.id)} title={tr.deleteConfirm}>🗑️</button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={p.id} className="tx-row" style={{ display:"grid",gridTemplateColumns:"110px 1fr 130px 90px 90px 90px 40px",padding:"13px 20px",alignItems:"center",animation:isNew?"rowPop .4s ease":undefined }}>
                          {/* Date */}
                          <div style={{ fontSize:12,color:"#888" }}>{fmtDate(p.date)}</div>
                          {/* Patient */}
                          <div style={{ display:"flex",alignItems:"center",gap:10,paddingLeft:8 }}>
                            <div style={{ width:32,height:32,borderRadius:8,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
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
                            {p.amount.toLocaleString()} ل.س
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
                      {filtered.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()} ل.س
                    </span>
                  </div>
                )}
              </div>

              {/* RIGHT: Revenue Chart + Pending */}
              <div>
                {/* Chart */}
                <div style={{ marginBottom:16 }}>
                  <RevenueChart lang={lang} months={tr.months} revenueData={revenueData} />
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
                      const patient = patients.find(x=>x.id===p.patient_id);
                      return (
                        <div key={p.id} className="pending-row">
                          <div style={{ width:34,height:34,borderRadius:8,background:getColor(p.patient_id||0),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>
                            {patient?getInitials(patient.name):"?"}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{patient?.name}</div>
                            <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{p.description}</div>
                          </div>
                          <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6 }}>
                            <span style={{ fontSize:14,fontWeight:800,color:"#e67e22" }}>{p.amount.toLocaleString()} ل.س</span>
                            <button onClick={()=>markPaid(p.id)}
                              style={{ padding:"7px 14px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(46,125,50,.25)",transition:"all .15s" }}
                              onMouseEnter={e=>{e.currentTarget.style.background="#1b5e20";e.currentTarget.style.transform="translateY(-1px)"}}
                              onMouseLeave={e=>{e.currentTarget.style.background="#2e7d32";e.currentTarget.style.transform="translateY(0)"}}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              {tr.pendingSection.markPaid}
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
        {showModal&&<PaymentModal lang={lang} patients={patients} onSave={handleSave} onClose={()=>setShowModal(false)}/>}

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
