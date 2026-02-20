"use client";

import { useState, useEffect } from "react";

// ============================================================
// TypeScript Types
// ============================================================

type Lang = "ar" | "en";

interface ClinicData {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: "basic" | "pro" | "enterprise";
  expiry: string;
  status: "active" | "inactive" | "expired";
  creds?: { username: string; password: string };
}

interface ModalProps {
  lang: Lang;
  clinic?: ClinicData | null;
  onSave: (data: ClinicData) => void;
  onClose: () => void;
}

interface ResetPassModalProps {
  lang: Lang;
  clinic: ClinicData | null;
  onClose: () => void;
}

// ============================================================
// NABD - نبض | Admin Panel
// لوحة المدير الخاصة — إدارة العيادات + المستخدمين + الاشتراكات
// هذه الصفحة خاصة بك أنت فقط، غير مرتبطة بـ Sidebar العيادة
// ============================================================

const T = {
  ar: {
    appName: "نبض", adminBadge: "لوحة المدير",
    nav: { clinics:"العيادات", users:"المستخدمون", subscriptions:"الاشتراكات", settings:"الإعدادات" },
    stats: {
      totalClinics:"إجمالي العيادات", activeClinics:"عيادات نشطة",
      totalUsers:"المستخدمون", monthRevenue:"إيرادات الشهر",
      activeNow:"نشطة الآن", expiringSoon:"تنتهي قريباً",
    },
    clinics: {
      title:"إدارة العيادات", addClinic:"إضافة عيادة",
      search:"ابحث باسم العيادة...",
      table:{ name:"العيادة", owner:"المالك", email:"البريد الإلكتروني", status:"الحالة", plan:"الخطة", expiry:"انتهاء الاشتراك", actions:"الإجراءات" },
      statuses:{ active:"نشط", inactive:"موقوف", expired:"منتهي" },
      plans:{ basic:"أساسي", pro:"احترافي", enterprise:"مؤسسي" },
      actions:{ edit:"تعديل", suspend:"تعليق", activate:"تفعيل", resetPass:"إعادة كلمة المرور", delete:"حذف", viewDetails:"التفاصيل" },
    },
    modal: {
      addTitle:"إضافة عيادة جديدة",
      editTitle:"تعديل بيانات العيادة",
      clinicName:"اسم العيادة *", clinicNamePh:"مثال: عيادة الأمل",
      ownerName:"اسم الطبيب / المالك *", ownerPh:"الدكتور ...",
      email:"البريد الإلكتروني *", emailPh:"clinic@example.com",
      phone:"رقم الهاتف", phonePh:"05xxxxxxxx",
      plan:"خطة الاشتراك *",
      expiry:"تاريخ انتهاء الاشتراك *",
      generateCredentials:"توليد بيانات الدخول",
      username:"اسم المستخدم", password:"كلمة المرور",
      copyBtn:"نسخ", copiedBtn:"✓ تم النسخ",
      save:"حفظ العيادة", update:"تحديث", cancel:"إلغاء",
      required:"الاسم والبريد والخطة مطلوبة",
      credNote:"احفظ بيانات الدخول قبل الإغلاق — لن تظهر مجدداً",
    },
    passModal: {
      title:"إعادة تعيين كلمة المرور",
      newPass:"كلمة المرور الجديدة",
      generate:"توليد تلقائي",
      save:"حفظ كلمة المرور",
      cancel:"إلغاء",
    },
    deleteModal: { title:"تأكيد الحذف", msg:"هل تريد حذف عيادة", warning:"سيتم حذف جميع بيانات هذه العيادة نهائياً.", confirm:"نعم، احذف", cancel:"إلغاء" },
    noResults:"لا توجد نتائج",
    signOut:"تسجيل خروج المدير",
    systemInfo:"معلومات النظام",
    version:"الإصدار",
    lastBackup:"آخر نسخة احتياطية",
    uptime:"وقت التشغيل",
    filterAll:"الكل", filterActive:"نشط", filterInactive:"موقوف",
  },
  en: {
    appName: "NABD", adminBadge: "Admin Panel",
    nav: { clinics:"Clinics", users:"Users", subscriptions:"Subscriptions", settings:"Settings" },
    stats: {
      totalClinics:"Total Clinics", activeClinics:"Active Clinics",
      totalUsers:"Total Users", monthRevenue:"Monthly Revenue",
      activeNow:"Active Now", expiringSoon:"Expiring Soon",
    },
    clinics: {
      title:"Clinic Management", addClinic:"Add Clinic",
      search:"Search by clinic name...",
      table:{ name:"Clinic", owner:"Owner", email:"Email", status:"Status", plan:"Plan", expiry:"Expiry", actions:"Actions" },
      statuses:{ active:"Active", inactive:"Suspended", expired:"Expired" },
      plans:{ basic:"Basic", pro:"Pro", enterprise:"Enterprise" },
      actions:{ edit:"Edit", suspend:"Suspend", activate:"Activate", resetPass:"Reset Password", delete:"Delete", viewDetails:"Details" },
    },
    modal: {
      addTitle:"Add New Clinic",
      editTitle:"Edit Clinic",
      clinicName:"Clinic Name *", clinicNamePh:"e.g. Al-Amal Clinic",
      ownerName:"Doctor / Owner Name *", ownerPh:"Dr. ...",
      email:"Email *", emailPh:"clinic@example.com",
      phone:"Phone", phonePh:"05xxxxxxxx",
      plan:"Subscription Plan *",
      expiry:"Subscription Expiry *",
      generateCredentials:"Generate Login Credentials",
      username:"Username", password:"Password",
      copyBtn:"Copy", copiedBtn:"✓ Copied",
      save:"Save Clinic", update:"Update", cancel:"Cancel",
      required:"Name, email and plan are required",
      credNote:"Save these credentials before closing — they won't be shown again",
    },
    passModal: {
      title:"Reset Password",
      newPass:"New Password",
      generate:"Auto Generate",
      save:"Save Password",
      cancel:"Cancel",
    },
    deleteModal: { title:"Confirm Delete", msg:"Delete clinic", warning:"All data for this clinic will be permanently deleted.", confirm:"Yes, Delete", cancel:"Cancel" },
    noResults:"No results found",
    signOut:"Admin Sign Out",
    systemInfo:"System Info",
    version:"Version",
    lastBackup:"Last Backup",
    uptime:"Uptime",
    filterAll:"All", filterActive:"Active", filterInactive:"Suspended",
  },
};

// ─── بيانات تجريبية ───────────────────────────────────────
const INIT_CLINICS = [
  { id:1, name:"عيادة النور / Al-Nour Clinic",   owner:"د. خالد عثمان",   email:"khalid@alnour.com",   phone:"0543210987", plan:"pro",        status:"active",   expiry:"2026-12-31" },
  { id:2, name:"عيادة الأمل / Al-Amal Clinic",   owner:"د. فاطمة حسن",   email:"fatima@alamal.com",  phone:"0559876543", plan:"basic",       status:"active",   expiry:"2026-06-15" },
  { id:3, name:"مركز الشفاء / Al-Shifa Center",  owner:"د. أحمد علي",    email:"ahmed@shifa.com",    phone:"0501234567", plan:"enterprise",  status:"active",   expiry:"2027-03-01" },
  { id:4, name:"عيادة سالم / Salem Clinic",      owner:"د. مريم سالم",   email:"mariam@salem.com",   phone:"0567890123", plan:"basic",       status:"inactive", expiry:"2025-11-30" },
  { id:5, name:"مركز يوسف / Yousef Medical",     owner:"د. يوسف ناصر",  email:"yousef@medical.com", phone:"0512345678", plan:"pro",         status:"expired",  expiry:"2025-12-01" },
];

const PLAN_COLORS = { basic:"#0863ba", pro:"#7b2d8b", enterprise:"#e67e22" };
const STATUS_COLORS = {
  active:   { bg:"rgba(46,125,50,.1)",   color:"#2e7d32" },
  inactive: { bg:"rgba(230,126,34,.1)",  color:"#e67e22" },
  expired:  { bg:"rgba(192,57,43,.1)",  color:"#c0392b" },
};

const genPass = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};
const genUser = (name: string): string => name.toLowerCase().replace(/[^a-z]/g,"").slice(0,8) + Math.floor(Math.random()*99);

// ─── Clinic Modal ──────────────────────────────────────────
function ClinicModal({
  lang,
  clinic,
  onSave,
  onClose
}: {
  lang: string;
  clinic: any;
  onSave: any;
  onClose: any;
}) {

  const tr = T[lang as Lang]; const isAr = lang==="ar";
  const isEdit = !!clinic?.id;
  const [form, setForm] = useState({
    name: clinic?.name||"", owner: clinic?.owner||"",
    email: clinic?.email||"", phone: clinic?.phone||"",
    plan: clinic?.plan||"basic", expiry: clinic?.expiry||"",
    status: clinic?.status||"active",
  });
  const [creds, setCreds] = useState<{
  username: string;
  password: string;
}>({
  username: "",
  password: ""
});

  const [copied, setCopied] = useState({u:false,p:false});
  const [error, setError] = useState("");

  const handleGenCreds = () => {
    const u = genUser(form.owner||"clinic");
    const p = genPass();
    setCreds({username:u, password:p});
  };

  const handleSave = () => {
    if (!form.name.trim()||!form.email.trim()||!form.plan) { setError(tr.modal.required); return; }
    onSave({ ...clinic, ...form, id:clinic?.id, creds });
  };

  const copy = async (text: string, key: string): Promise<void> => {
    await navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(p=>({...p,[key]:true}));
    setTimeout(()=>setCopied(p=>({...p,[key]:false})),2000);
  };

  const inputSt = { width:"100%",padding:"10px 14px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fafbfc",outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr" };
  const F = ({label,children,half})=>(<div style={{ marginBottom:14,flex:half?"1":undefined }}><label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{label}</label>{children}</div>);

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 32px 100px rgba(8,99,186,.2)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,rgba(8,99,186,.03),transparent)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(8,99,186,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🏥</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isEdit?tr.modal.editTitle:tr.modal.addTitle}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}

          <F label={tr.modal.clinicName}>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tr.modal.clinicNamePh} style={inputSt} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.ownerName} half>
              <input value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})} placeholder={tr.modal.ownerPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.modal.phone} half>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={tr.modal.phonePh} style={inputSt} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.modal.email}>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder={tr.modal.emailPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.plan} half>
              <select value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})} style={{ ...inputSt,cursor:"pointer" }}>
                <option value="basic">{tr.clinics.plans.basic}</option>
                <option value="pro">{tr.clinics.plans.pro}</option>
                <option value="enterprise">{tr.clinics.plans.enterprise}</option>
              </select>
            </F>
            <F label={tr.modal.expiry} half>
              <input type="date" value={form.expiry} onChange={e=>setForm({...form,expiry:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>

          {/* Credentials Section */}
          <div style={{ borderTop:"1.5px dashed #eee",paddingTop:16,marginTop:4 }}>
            <button onClick={handleGenCreds} style={{ width:"100%",padding:"11px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px dashed rgba(8,99,186,.3)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
              onMouseEnter={e=>e.target.style.background="rgba(8,99,186,.1)"} onMouseLeave={e=>e.target.style.background="rgba(8,99,186,.06)"}>
              🔑 {tr.modal.generateCredentials}
            </button>

            {creds&&(
              <div style={{ marginTop:14,background:"#1a1a2e",borderRadius:12,padding:"16px",animation:"modalIn .2s ease" }}>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                  ⚠️ {tr.modal.credNote}
                </div>
                {[
                  {label:tr.modal.username, value:creds.username, key:"u"},
                  {label:tr.modal.password, value:creds.password, key:"p"},
                ].map(c=>(
                  <div key={c.key} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,.4)",width:90,flexShrink:0 }}>{c.label}:</span>
                    <code style={{ flex:1,background:"rgba(255,255,255,.08)",padding:"6px 10px",borderRadius:8,fontSize:13,color:"#a4c4e4",fontFamily:"monospace",letterSpacing:.5 }}>{c.value}</code>
                    <button onClick={()=>copy(c.value,c.key)} style={{ padding:"5px 12px",background:copied[c.key]?"rgba(46,125,50,.3)":"rgba(255,255,255,.1)",color:copied[c.key]?"#66bb6a":"rgba(255,255,255,.7)",border:"none",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .2s",whiteSpace:"nowrap" }}>
                      {copied[c.key]?tr.modal.copiedBtn:tr.modal.copyBtn}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} style={{ flex:1,padding:"12px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }} onMouseEnter={e=>e.target.style.background="#054a8c"} onMouseLeave={e=>e.target.style.background="#0863ba"}>
            {isEdit?tr.modal.update:tr.modal.save}
          </button>
          <button onClick={onClose} style={{ padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────
function ResetPassModal({ lang, clinic, onClose }: ResetPassModalProps) {
  const tr = T[lang as Lang];
  const [pass, setPass] = useState(genPass());
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(pass).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"28px",boxShadow:"0 24px 80px rgba(0,0,0,.15)",animation:"modalIn .25s ease" }}>
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <div style={{ fontSize:36,marginBottom:12 }}>🔑</div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.passModal.title}</h3>
          <p style={{ fontSize:13,color:"#888",marginTop:6 }}>{clinic?.name}</p>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>{tr.passModal.newPass}</label>
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ flex:1,background:"#1a1a2e",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <code style={{ fontSize:14,color:"#a4c4e4",fontFamily:"monospace",letterSpacing:1 }}>{pass}</code>
            </div>
            <button onClick={copy} style={{ padding:"0 16px",background:copied?"rgba(46,125,50,.1)":"rgba(8,99,186,.08)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.2)"}`,borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600 }}>
              {copied?"✓":"📋"}
            </button>
          </div>
        </div>
        <button onClick={()=>setPass(genPass())} style={{ width:"100%",marginBottom:12,padding:"10px",background:"#f7f9fc",color:"#666",border:"1.5px dashed #ddd",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
          🔄 {tr.passModal.generate}
        </button>
        <div style={{ display:"flex",gap:10 }}>
          <button style={{ flex:1,padding:"12px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
            {tr.passModal.save}
          </button>
          <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.passModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AdminPage() {
  const [lang, setLang]         = useState("ar");
  const isAr = lang==="ar";
  const tr = T[lang];

  const [activeTab, setActiveTab] = useState("clinics");
  const [clinics, setClinics]   = useState(INIT_CLINICS);
  const [nextId, setNextId]     = useState(INIT_CLINICS.length+1);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [addModal,  setAddModal]  = useState(false);
  const [editClinic,setEditClinic]= useState(null);
  const [deleteClinic,setDeleteClinic] = useState(null);
  const [resetClinic,setResetClinic]   = useState(null);
  const [openMenuId, setOpenMenuId]    = useState(null);

  useEffect(()=>{
    const h = ()=>setOpenMenuId(null);
    window.addEventListener("click",h);
    return ()=>window.removeEventListener("click",h);
  },[]);

  const filtered = clinics.filter(c=>{
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter==="active"   && c.status!=="active")   return false;
    if (filter==="inactive" && c.status!=="inactive") return false;
    return true;
  });

  const stats = {
    total:   clinics.length,
    active:  clinics.filter(c=>c.status==="active").length,
    users:   clinics.length,
    expiring: clinics.filter(c=>{ const d=new Date(c.expiry); const n=new Date(); return (d-n)<30*24*60*60*1000&&d>n; }).length,
  };

  const handleSave = (data) => {
    if (data.id) { setClinics(prev=>prev.map(c=>c.id===data.id?{...c,...data}:c)); }
    else { const id=nextId; setClinics(prev=>[{...data,id},...prev]); setNextId(id+1); }
    setAddModal(false); setEditClinic(null);
  };

  const toggleStatus = (id) => {
    setClinics(prev=>prev.map(c=>c.id===id?{...c,status:c.status==="active"?"inactive":"active"}:c));
  };

  const handleDelete = () => {
    setClinics(prev=>prev.filter(c=>c.id!==deleteClinic.id));
    setDeleteClinic(null);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString(isAr?"ar-SA":"en-US",{year:"numeric",month:"short",day:"numeric"});
  const isExpiringSoon = (d) => { const diff=new Date(d)-new Date(); return diff>0&&diff<30*24*60*60*1000; };
  const isExpired = (d) => new Date(d)<new Date();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#0d1117;color:#c9d1d9}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#30363d;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .page-anim{animation:fadeUp .4s ease both}
        .admin-row{border-bottom:1px solid #21262d;transition:background .15s}
        .admin-row:last-child{border-bottom:none}
        .admin-row:hover{background:rgba(255,255,255,.02)}
        .tab-btn{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;transition:all .2s}
        .tab-btn.active{background:rgba(8,99,186,.2);color:#a4c4e4;font-weight:700}
        .tab-btn:not(.active){background:transparent;color:#666}
        .tab-btn:not(.active):hover{background:rgba(255,255,255,.05);color:#aaa}
        .icon-btn-dark{width:30px;height:30px;border-radius:8px;border:1px solid #30363d;background:transparent;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#888}
        .icon-btn-dark:hover{border-color:#a4c4e4;background:rgba(164,196,228,.08);color:#a4c4e4}
        .filter-chip-dark{padding:6px 14px;border-radius:20px;border:1px solid #30363d;background:transparent;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;color:#666;transition:all .2s}
        .filter-chip-dark.active{background:rgba(8,99,186,.2);color:#a4c4e4;border-color:rgba(8,99,186,.4)}
        .filter-chip-dark:hover:not(.active){border-color:#555;color:#aaa}
        .stat-dark{background:#161b22;border-radius:16px;padding:20px;border:1px solid #21262d;position:relative;overflow:hidden}
        .dropdown-dark{position:absolute;top:calc(100% + 4px);right:0;background:#161b22;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.4);border:1px solid #30363d;min-width:170px;z-index:100;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-dark-item{padding:10px 16px;font-size:13px;color:#aaa;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-dark-item:hover{background:rgba(255,255,255,.05);color:#fff}
        .dropdown-dark-item.danger:hover{background:rgba(192,57,43,.15);color:#ff7b7b}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#0d1117",display:"flex" }}>

        {/* ── DARK ADMIN SIDEBAR ── */}
        <aside style={{ width:220,minHeight:"100vh",background:"#161b22",borderRight:isAr?"none":"1px solid #21262d",borderLeft:isAr?"1px solid #21262d":"none",display:"flex",flexDirection:"column",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50 }}>
          {/* Logo */}
          <div style={{ padding:"24px 20px",borderBottom:"1px solid #21262d" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 12px rgba(8,99,186,.4)" }}>💗</div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#fff",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:9,color:"#444",fontWeight:400,letterSpacing:.5,textTransform:"uppercase" }}>{tr.adminBadge}</div>
              </div>
            </div>
            <div style={{ background:"rgba(8,99,186,.15)",border:"1px solid rgba(8,99,186,.3)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11,color:"#a4c4e4",fontWeight:600 }}>Admin Access</span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1,padding:"16px 12px" }}>
            {Object.entries(tr.nav).map(([k,v])=>{
              const icons = { clinics:"🏥", users:"👥", subscriptions:"💳", settings:"⚙️" };
              const isActive = activeTab===k;
              return (
                <button key={k} onClick={()=>setActiveTab(k)} style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,marginBottom:4,border:"none",cursor:"pointer",background:isActive?"rgba(8,99,186,.15)":"transparent",color:isActive?"#a4c4e4":"#555",fontWeight:isActive?600:400,fontSize:13,fontFamily:"Rubik,sans-serif",transition:"all .18s",textAlign:isAr?"right":"left" }}>
                  <span style={{ fontSize:16 }}>{icons[k]}</span>
                  <span style={{ flex:1 }}>{v}</span>
                  {k==="clinics"&&<span style={{ fontSize:11,background:"rgba(8,99,186,.2)",color:"#a4c4e4",padding:"2px 8px",borderRadius:20 }}>{clinics.length}</span>}
                </button>
              );
            })}
          </nav>

          {/* System Info */}
          <div style={{ padding:"16px",borderTop:"1px solid #21262d" }}>
            <div style={{ fontSize:11,color:"#444",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:12 }}>{tr.systemInfo}</div>
            {[
              {l:tr.version,v:"1.0.0"},
              {l:tr.lastBackup,v:isAr?"منذ ساعة":"1h ago"},
              {l:tr.uptime,v:"99.9%"},
            ].map(s=>(
              <div key={s.l} style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:11,color:"#444" }}>{s.l}</span>
                <span style={{ fontSize:11,color:"#a4c4e4",fontWeight:600 }}>{s.v}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"7px",background:"rgba(255,255,255,.04)",border:"1px solid #30363d",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#666",transition:"all .2s",marginBottom:8 }}>
                🌐 {lang==="ar"?"English":"العربية"}
              </button>
              <button style={{ width:"100%",padding:"7px",background:"rgba(192,57,43,.1)",border:"1px solid rgba(192,57,43,.2)",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#ff7b7b" }}>
                → {tr.signOut}
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="page-anim" style={{ [isAr?"marginRight":"marginLeft"]:220,flex:1,padding:"0 32px 48px",minHeight:"100vh" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(13,17,23,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1px solid #21262d" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:20,fontWeight:800,color:"#fff" }}>{tr.clinics.title}</h1>
                <p style={{ fontSize:12,color:"#555",marginTop:2 }}>
                  {isAr?`${stats.active} عيادة نشطة من ${stats.total}`:`${stats.active} active of ${stats.total} total`}
                </p>
              </div>
              <button onClick={()=>setAddModal(true)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.35)",transition:"all .2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#054a8c"}}
                onMouseLeave={e=>{e.currentTarget.style.background="#0863ba"}}
              ><span>＋</span> {tr.clinics.addClinic}</button>
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* STATS */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
              {[
                {label:tr.stats.totalClinics, value:stats.total,   icon:"🏥",  color:"#a4c4e4", accent:"#0863ba"},
                {label:tr.stats.activeClinics,value:stats.active,  icon:"✅",  color:"#66bb6a", accent:"#2e7d32"},
                {label:tr.stats.totalUsers,   value:stats.users,   icon:"👥",  color:"#c792ea", accent:"#7b2d8b"},
                {label:tr.stats.expiringSoon, value:stats.expiring,icon:"⏰",  color:"#f0a500", accent:"#e67e22"},
              ].map((s,i)=>(
                <div key={i} className="stat-dark" style={{ animation:`fadeUp .4s ${i*60}ms ease both` }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:s.accent,borderRadius:"16px 16px 0 0" }}/>
                  <div style={{ width:38,height:38,background:`${s.accent}18`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:12 }}>{s.icon}</div>
                  <div style={{ fontSize:28,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11,color:"#555",marginTop:6,fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* SEARCH + FILTER */}
            <div style={{ background:"#161b22",borderRadius:12,padding:"14px 16px",border:"1px solid #21262d",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
              <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,.04)",border:"1px solid #30363d",borderRadius:10,padding:"9px 14px" }}>
                <span style={{ color:"#444",fontSize:14 }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr.clinics.search}
                  style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#ccc",width:"100%",direction:isAr?"rtl":"ltr" }}/>
                {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#555" }}>✕</button>}
              </div>
              <div style={{ display:"flex",gap:8 }}>
                {[["all",tr.filterAll],["active",tr.filterActive],["inactive",tr.filterInactive]].map(([k,v])=>(
                  <button key={k} className={`filter-chip-dark${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                ))}
              </div>
            </div>

            {/* TABLE */}
            <div style={{ background:"#161b22",borderRadius:16,border:"1px solid #21262d",overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,.3)" }}>
              {/* Header */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 130px 180px 90px 100px 120px 50px",padding:"11px 20px",background:"#0d1117",borderBottom:"1px solid #21262d",gap:0 }}>
                {[tr.clinics.table.name,tr.clinics.table.owner,tr.clinics.table.email,tr.clinics.table.status,tr.clinics.table.plan,tr.clinics.table.expiry,tr.clinics.table.actions].map((h,i)=>(
                  <div key={i} style={{ fontSize:10,fontWeight:700,color:"#444",textTransform:"uppercase",letterSpacing:.6,paddingLeft:i>0&&i<6?8:0,textAlign:i===6?"center":"start" }}>{h}</div>
                ))}
              </div>

              {filtered.length===0?(
                <div style={{ textAlign:"center",padding:"50px",color:"#333" }}>
                  <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                  <div style={{ fontSize:14 }}>{tr.noResults}</div>
                </div>
              ):(
                filtered.map(c=>{
                  const ss = STATUS_COLORS[c.status]||STATUS_COLORS.active;
                  const pc = PLAN_COLORS[c.plan];
                  const expSoon = isExpiringSoon(c.expiry);
                  const exp = isExpired(c.expiry);
                  return (
                    <div key={c.id} className="admin-row" style={{ display:"grid",gridTemplateColumns:"1fr 130px 180px 90px 100px 120px 50px",padding:"14px 20px",alignItems:"center",gap:0 }}>
                      {/* Name */}
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:"#e0e0e0" }}>{c.name}</div>
                        <div style={{ fontSize:11,color:"#444",marginTop:2 }}>ID: #{c.id}</div>
                      </div>
                      {/* Owner */}
                      <div style={{ fontSize:12,color:"#888",paddingLeft:8 }}>{c.owner}</div>
                      {/* Email */}
                      <div style={{ fontSize:11,color:"#555",paddingLeft:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{c.email}</div>
                      {/* Status */}
                      <div style={{ paddingLeft:8 }}>
                        <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color }}>
                          {tr.clinics.statuses[c.status]}
                        </span>
                      </div>
                      {/* Plan */}
                      <div style={{ paddingLeft:8 }}>
                        <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${pc}20`,color:pc }}>
                          {tr.clinics.plans[c.plan]}
                        </span>
                      </div>
                      {/* Expiry */}
                      <div style={{ paddingLeft:8 }}>
                        <div style={{ fontSize:11,color: exp?"#ff7b7b": expSoon?"#f0a500":"#555",fontWeight:exp||expSoon?700:400 }}>
                          {fmtDate(c.expiry)}
                        </div>
                        {expSoon&&!exp&&<div style={{ fontSize:9,color:"#f0a500",fontWeight:600,marginTop:2,animation:"pulse 2s infinite" }}>⚠ {isAr?"تنتهي قريباً":"Expiring soon"}</div>}
                        {exp&&<div style={{ fontSize:9,color:"#ff7b7b",fontWeight:600,marginTop:2 }}>✗ {isAr?"منتهية":"Expired"}</div>}
                      </div>
                      {/* Actions */}
                      <div style={{ display:"flex",justifyContent:"center",position:"relative" }} onClick={e=>e.stopPropagation()}>
                        <button className="icon-btn-dark" onClick={e=>{e.stopPropagation();setOpenMenuId(openMenuId===c.id?null:c.id)}}>⋯</button>
                        {openMenuId===c.id&&(
                          <div className="dropdown-dark">
                            <div className="dropdown-dark-item" onClick={()=>{setEditClinic(c);setOpenMenuId(null)}}>✏️ {tr.clinics.actions.edit}</div>
                            <div className="dropdown-dark-item" onClick={()=>{setResetClinic(c);setOpenMenuId(null)}}>🔑 {tr.clinics.actions.resetPass}</div>
                            <div className="dropdown-dark-item" onClick={()=>{toggleStatus(c.id);setOpenMenuId(null)}}>
                              {c.status==="active"?"⏸ "+tr.clinics.actions.suspend:"▶ "+tr.clinics.actions.activate}
                            </div>
                            <div style={{ height:1,background:"#21262d",margin:"4px 0" }}/>
                            <div className="dropdown-dark-item danger" onClick={()=>{setDeleteClinic(c);setOpenMenuId(null)}}>🗑️ {tr.clinics.actions.delete}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </main>

        {/* Modals */}
        {(addModal||editClinic)&&<ClinicModal lang={lang} clinic={editClinic} onSave={handleSave} onClose={()=>{setAddModal(false);setEditClinic(null)}}/>}
        {resetClinic&&<ResetPassModal lang={lang} clinic={resetClinic} onClose={()=>setResetClinic(null)}/>}

        {deleteClinic&&(
          <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={()=>setDeleteClinic(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)" }}/>
            <div style={{ position:"relative",zIndex:1,background:"#161b22",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.5)",border:"1px solid #21262d",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:17,fontWeight:800,color:"#fff",marginBottom:8 }}>{tr.deleteModal.title}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6 }}>
                {tr.deleteModal.msg} <strong style={{ color:"#e0e0e0" }}>{deleteClinic.name}</strong>؟<br/>
                <span style={{ color:"#ff7b7b",fontSize:12 }}>{tr.deleteModal.warning}</span>
              </p>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={handleDelete} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.deleteModal.confirm}</button>
                <button onClick={()=>setDeleteClinic(null)} style={{ flex:1,padding:"12px",background:"rgba(255,255,255,.06)",color:"#aaa",border:"1px solid #30363d",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.deleteModal.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
