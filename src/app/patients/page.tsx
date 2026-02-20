"use client";

import { useState, useEffect, useRef } from "react";

// ============================================================
// NABD - نبض | Patients Page
// إدارة المرضى — إضافة، تعديل، حذف، إخفاء، بحث، فلترة
// ============================================================

// ─── ترجمات ───────────────────────────────────────────────
const T = {
  ar: {
    appName: "نبض", appSub: "إدارة العيادة",
    nav: { dashboard:"الرئيسية", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", admin:"لوحة المدير" },
    page: { title:"إدارة المرضى", sub:"سجلات وملفات المرضى المسجلين" },
    addPatient: "إضافة مريض",
    search: "ابحث بالاسم أو رقم الهاتف...",
    filters: { all:"الكل", male:"ذكر", female:"أنثى", diabetic:"مرضى السكري", hypertension:"مرضى الضغط" },
    table: { name:"الاسم", phone:"الهاتف", gender:"الجنس", dob:"تاريخ الميلاد", conditions:"الحالات", actions:"الإجراءات" },
    gender: { male:"ذكر", female:"أنثى" },
    conditions: { diabetes:"سكري", hypertension:"ضغط" },
    actions: { edit:"تعديل", delete:"حذف", hide:"إخفاء", show:"إظهار", viewAppointments:"المواعيد" },
    noPatients: "لا يوجد مرضى مسجلون",
    noResults: "لا توجد نتائج مطابقة",
    hiddenBadge: "مخفي",
    showHidden: "إظهار المخفيين",
    hideHidden: "إخفاء المخفيين",
    modal: {
      addTitle: "إضافة مريض جديد",
      editTitle: "تعديل بيانات المريض",
      name: "الاسم الكامل *",
      namePh: "أدخل الاسم الكامل",
      phone: "رقم الهاتف",
      phonePh: "مثال: 0501234567",
      gender: "الجنس *",
      selectGender: "اختر الجنس",
      male: "ذكر", female: "أنثى",
      dob: "تاريخ الميلاد",
      diabetes: "يعاني من السكري",
      hypertension: "يعاني من ضغط الدم",
      notes: "ملاحظات",
      notesPh: "أي ملاحظات إضافية...",
      save: "حفظ المريض",
      update: "تحديث البيانات",
      cancel: "إلغاء",
      required: "الاسم والجنس مطلوبان",
    },
    deleteModal: {
      title: "تأكيد الحذف",
      msg: "هل أنت متأكد من حذف بيانات",
      warning: "لا يمكن التراجع عن هذا الإجراء.",
      confirm: "نعم، احذف",
      cancel: "إلغاء",
    },
    stats: { total:"إجمالي المرضى", male:"ذكور", female:"إناث", diabetic:"مرضى السكري" },
    signOut: "تسجيل الخروج",
    id: "رقم",
  },
  en: {
    appName: "NABD", appSub: "Clinic Manager",
    nav: { dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", admin:"Admin Panel" },
    page: { title:"Patients", sub:"Records and files of registered patients" },
    addPatient: "Add Patient",
    search: "Search by name or phone...",
    filters: { all:"All", male:"Male", female:"Female", diabetic:"Diabetic", hypertension:"Hypertension" },
    table: { name:"Name", phone:"Phone", gender:"Gender", dob:"Date of Birth", conditions:"Conditions", actions:"Actions" },
    gender: { male:"Male", female:"Female" },
    conditions: { diabetes:"Diabetes", hypertension:"Hypertension" },
    actions: { edit:"Edit", delete:"Delete", hide:"Hide", show:"Show", viewAppointments:"Appointments" },
    noPatients: "No patients registered",
    noResults: "No matching results",
    hiddenBadge: "Hidden",
    showHidden: "Show Hidden",
    hideHidden: "Hide Hidden",
    modal: {
      addTitle: "Add New Patient",
      editTitle: "Edit Patient",
      name: "Full Name *",
      namePh: "Enter full name",
      phone: "Phone Number",
      phonePh: "e.g. 0501234567",
      gender: "Gender *",
      selectGender: "Select gender",
      male: "Male", female: "Female",
      dob: "Date of Birth",
      diabetes: "Has Diabetes",
      hypertension: "Has Hypertension",
      notes: "Notes",
      notesPh: "Any additional notes...",
      save: "Save Patient",
      update: "Update Patient",
      cancel: "Cancel",
      required: "Name and gender are required",
    },
    deleteModal: {
      title: "Confirm Delete",
      msg: "Are you sure you want to delete",
      warning: "This action cannot be undone.",
      confirm: "Yes, Delete",
      cancel: "Cancel",
    },
    stats: { total:"Total Patients", male:"Male", female:"Female", diabetic:"Diabetic" },
    signOut: "Sign Out",
    id: "ID",
  },
};

// ─── بيانات تجريبية ───────────────────────────────────────
const INITIAL_PATIENTS = [
  { id: 1, name: "Ahmed Ali / أحمد علي",      phone: "0501234567", gender: "male",   dob: "1985-05-15", diabetes: false, hypertension: false, notes: "", hidden: false },
  { id: 2, name: "Fatima Hassan / فاطمة حسن", phone: "0559876543", gender: "female", dob: "1992-11-20", diabetes: true,  hypertension: false, notes: "متابعة دورية", hidden: false },
  { id: 3, name: "Khalid Othman / خالد عثمان",phone: "0543210987", gender: "male",   dob: "1978-03-10", diabetes: true,  hypertension: true,  notes: "", hidden: false },
  { id: 4, name: "Mariam Salem / مريم سالم",  phone: "0567890123", gender: "female", dob: "2000-07-04", diabetes: false, hypertension: false, notes: "", hidden: false },
  { id: 5, name: "Yousef Nasser / يوسف ناصر", phone: "0512345678", gender: "male",   dob: "1970-01-30", diabetes: false, hypertension: true,  notes: "حساسية من البنسلين", hidden: true  },
];

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor = (id) => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
const getInitials = (name) => name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

// ─── Sidebar (مشتركة) ─────────────────────────────────────
function Sidebar({ lang, setLang, activePage = "patients" }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [collapsed, setCollapsed] = useState(false);
  const navItems = [
    { key:"dashboard",    icon:"⊞", href:"/dashboard" },
    { key:"patients",     icon:"👥", href:"/patients"  },
    { key:"appointments", icon:"📅", href:"/appointments" },
    { key:"payments",     icon:"💳", href:"/payments"  },
  ];
  return (
    <aside style={{
      width: collapsed ? 70 : 240, minHeight:"100vh",
      background:"#fff",
      borderRight: isAr ? "none" : "1.5px solid #eef0f3",
      borderLeft:  isAr ? "1.5px solid #eef0f3" : "none",
      display:"flex", flexDirection:"column",
      transition:"width .3s cubic-bezier(.4,0,.2,1)",
      position:"fixed", top:0, [isAr?"right":"left"]:0,
      zIndex:50, boxShadow:"4px 0 24px rgba(8,99,186,.06)",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "24px 0" : "24px 20px",
        borderBottom:"1.5px solid #eef0f3",
        display:"flex", alignItems:"center",
        justifyContent: collapsed ? "center" : "space-between",
        minHeight:72,
      }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }}>💗</div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
              <div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div>
            </div>
          </div>
        )}
        {collapsed && <div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💗</div>}
        {!collapsed && (
          <button onClick={()=>setCollapsed(!collapsed)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>
            {isAr ? "›" : "‹"}
          </button>
        )}
      </div>
      {/* Nav */}
      <nav style={{ flex:1, padding:"16px 12px" }}>
        {navItems.map(item => {
          const isActive = item.key === activePage;
          return (
            <a key={item.key} href={item.href} style={{
              display:"flex", alignItems:"center",
              gap: collapsed ? 0 : 12,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "12px 0" : "11px 14px",
              borderRadius:10, marginBottom:4, textDecoration:"none",
              background: isActive ? "rgba(8,99,186,.08)" : "transparent",
              color: isActive ? "#0863ba" : "#666",
              fontWeight: isActive ? 600 : 400, fontSize:14,
              transition:"all .18s", position:"relative",
            }}>
              {isActive && <div style={{ position:"absolute",[isAr?"right":"left"]:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }} />}
              <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
              {!collapsed && <span>{tr.nav[item.key]}</span>}
            </a>
          );
        })}
        <div style={{ height:1, background:"#eef0f3", margin:"12px 0" }} />
        <a href="/admin" style={{ display:"flex",alignItems:"center",gap:collapsed?0:12,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"12px 0":"11px 14px",borderRadius:10,textDecoration:"none",color:"#888",fontSize:14 }}>
          <span style={{ fontSize:18 }}>⚙️</span>
          {!collapsed && <span>{tr.nav.admin}</span>}
        </a>
      </nav>
      {/* Bottom */}
      <div style={{ padding:"16px 12px", borderTop:"1.5px solid #eef0f3" }}>
        {!collapsed && (
          <button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>
            🌐 {lang==="ar" ? "English" : "العربية"}
          </button>
        )}
        <div style={{ display:"flex",alignItems:"center",gap:collapsed?0:10,justifyContent:collapsed?"center":"flex-start",padding:collapsed?8:"10px 12px",borderRadius:10,background:"#f7f9fc" }}>
          <div style={{ width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#0863ba,#a4c4e4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:700,flexShrink:0 }}>د</div>
          {!collapsed && (
            <div style={{ flex:1,overflow:"hidden" }}>
              <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lang==="ar"?"الدكتور / العيادة":"Dr. / Clinic"}</div>
              <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#c0392b",fontFamily:"Rubik,sans-serif",padding:0,fontWeight:500 }}>{tr.signOut} →</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Modal إضافة/تعديل ───────────────────────────────────
function PatientModal({ lang, patient, onSave, onClose }) {
  const tr = T[lang];
  const isAr = lang === "ar";
  const isEdit = !!patient?.id;
  const [form, setForm] = useState({
    name: patient?.name || "",
    phone: patient?.phone || "",
    gender: patient?.gender || "",
    dob: patient?.dob || "",
    diabetes: patient?.diabetes || false,
    hypertension: patient?.hypertension || false,
    notes: patient?.notes || "",
  });
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!form.name.trim() || !form.gender) { setError(tr.modal.required); return; }
    onSave({ ...patient, ...form, id: patient?.id });
  };

  const Field = ({ label, children }) => (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );

  const inputStyle = {
    width:"100%", padding:"11px 14px",
    border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535",
    background:"#fafbfc", outline:"none", transition:"border .2s",
    direction: isAr ? "rtl" : "ltr",
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      {/* Overlay */}
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)" }} />
      {/* Modal */}
      <div style={{
        position:"relative",zIndex:1,
        background:"#fff", borderRadius:20, width:"100%", maxWidth:480,
        maxHeight:"90vh", overflowY:"auto",
        boxShadow:"0 24px 80px rgba(8,99,186,.18)",
        animation:"modalIn .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding:"24px 28px 20px", borderBottom:"1.5px solid #eef0f3", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:18,fontWeight:800,color:"#353535" }}>{isEdit ? tr.modal.editTitle : tr.modal.addTitle}</h2>
            {isEdit && <p style={{ fontSize:12,color:"#aaa",marginTop:3 }}>{tr.id}: #{patient.id}</p>}
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"24px 28px" }}>
          {error && (
            <div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:18,display:"flex",alignItems:"center",gap:8 }}>
              ⚠️ {error}
            </div>
          )}
          <Field label={tr.modal.name}>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={tr.modal.namePh} style={inputStyle} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"} />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Field label={tr.modal.phone}>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={tr.modal.phonePh} style={inputStyle} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"} />
            </Field>
            <Field label={tr.modal.gender}>
              <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} style={{ ...inputStyle, cursor:"pointer" }}>
                <option value="">{tr.modal.selectGender}</option>
                <option value="male">{tr.modal.male}</option>
                <option value="female">{tr.modal.female}</option>
              </select>
            </Field>
          </div>
          <Field label={tr.modal.dob}>
            <input type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})} style={inputStyle} onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"} />
          </Field>
          {/* Checkboxes */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:18 }}>
            {[
              { key:"diabetes",     label:tr.modal.diabetes,     icon:"🩸", color:"#c0392b" },
              { key:"hypertension", label:tr.modal.hypertension, icon:"💊", color:"#e67e22" },
            ].map(c => (
              <label key={c.key} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"12px 14px", borderRadius:10, cursor:"pointer",
                border: form[c.key] ? `1.5px solid ${c.color}40` : "1.5px solid #eef0f3",
                background: form[c.key] ? `${c.color}08` : "#fafbfc",
                transition:"all .2s",
              }}>
                <span style={{ fontSize:18 }}>{c.icon}</span>
                <span style={{ fontSize:13, fontWeight:form[c.key]?700:400, color:form[c.key]?c.color:"#666", flex:1 }}>{c.label}</span>
                <div style={{
                  width:18,height:18,borderRadius:5,
                  background:form[c.key]?c.color:"transparent",
                  border:`2px solid ${form[c.key]?c.color:"#ccc"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0, transition:"all .2s",
                }}>
                  {form[c.key] && <span style={{ color:"#fff",fontSize:10,fontWeight:900 }}>✓</span>}
                </div>
                <input type="checkbox" checked={form[c.key]} onChange={e=>setForm({...form,[c.key]:e.target.checked})} style={{ display:"none" }} />
              </label>
            ))}
          </div>
          <Field label={tr.modal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.modal.notesPh} rows={3}
              style={{ ...inputStyle, resize:"vertical", lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor="#0863ba"} onBlur={e=>e.target.style.borderColor="#e8eaed"}
            />
          </Field>
        </div>
        {/* Footer */}
        <div style={{ padding:"16px 28px 24px", display:"flex", gap:12, borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} style={{
            flex:1, padding:"13px", background:"#0863ba", color:"#fff",
            border:"none", borderRadius:12, fontFamily:"Rubik,sans-serif",
            fontSize:15, fontWeight:700, cursor:"pointer",
            boxShadow:"0 4px 16px rgba(8,99,186,.25)", transition:"all .2s",
          }}
            onMouseEnter={e=>{ e.target.style.background="#054a8c"; e.target.style.transform="translateY(-1px)"; }}
            onMouseLeave={e=>{ e.target.style.background="#0863ba"; e.target.style.transform="translateY(0)"; }}
          >
            {isEdit ? tr.modal.update : tr.modal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 20px", background:"#f5f5f5", color:"#666", border:"none", borderRadius:12, fontFamily:"Rubik,sans-serif", fontSize:14, cursor:"pointer" }}>
            {tr.modal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal حذف ───────────────────────────────────────────
function DeleteModal({ lang, patient, onConfirm, onClose }) {
  const tr = T[lang];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)" }} />
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:380,padding:"32px",boxShadow:"0 24px 80px rgba(0,0,0,.15)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ textAlign:"center",marginBottom:24 }}>
          <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px" }}>🗑️</div>
          <h2 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteModal.title}</h2>
          <p style={{ fontSize:14,color:"#888",lineHeight:1.6 }}>
            {tr.deleteModal.msg} <strong style={{ color:"#353535" }}>{patient?.name}</strong>؟<br/>
            <span style={{ color:"#c0392b",fontSize:12 }}>{tr.deleteModal.warning}</span>
          </p>
        </div>
        <div style={{ display:"flex",gap:12 }}>
          <button onClick={onConfirm} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>
            {tr.deleteModal.confirm}
          </button>
          <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.deleteModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function PatientsPage() {
  const [lang, setLang] = useState("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showHidden, setShowHidden] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [deletePatient, setDeletePatient] = useState(null);
  const [nextId, setNextId] = useState(INITIAL_PATIENTS.length + 1);
  const [animIds, setAnimIds] = useState([]);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // تصفية
  const filtered = patients.filter(p => {
    if (!showHidden && p.hidden) return false;
    const q = search.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.phone.includes(q)) return false;
    if (filter === "male"        && p.gender !== "male")   return false;
    if (filter === "female"      && p.gender !== "female") return false;
    if (filter === "diabetic"    && !p.diabetes)           return false;
    if (filter === "hypertension"&& !p.hypertension)       return false;
    return true;
  });

  // إحصائيات
  const visibleAll = patients.filter(p => !p.hidden);
  const stats = {
    total:      visibleAll.length,
    male:       visibleAll.filter(p=>p.gender==="male").length,
    female:     visibleAll.filter(p=>p.gender==="female").length,
    diabetic:   visibleAll.filter(p=>p.diabetes).length,
  };

  // حفظ (إضافة / تعديل)
  const handleSave = (data) => {
    if (data.id) {
      setPatients(prev => prev.map(p => p.id===data.id ? { ...p, ...data } : p));
    } else {
      const id = nextId;
      const newP = { ...data, id, hidden:false };
      setPatients(prev => [newP, ...prev]);
      setNextId(id + 1);
      setAnimIds(prev => [...prev, id]);
      setTimeout(() => setAnimIds(prev => prev.filter(x => x !== id)), 600);
    }
    setAddModal(false);
    setEditPatient(null);
  };

  // حذف
  const handleDelete = () => {
    setPatients(prev => prev.filter(p => p.id !== deletePatient.id));
    setDeletePatient(null);
  };

  // إخفاء / إظهار
  const toggleHide = (id) => {
    setPatients(prev => prev.map(p => p.id===id ? { ...p, hidden:!p.hidden } : p));
  };

  // عمر المريض
  const calcAge = (dob) => {
    if (!dob) return "—";
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000*60*60*24*365.25));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes rowIn{from{opacity:0;transform:translateX(${isAr?"-":"+"}16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .main-anim{animation:fadeUp .4s ease both}
        .patient-row{transition:background .15s;border-bottom:1px solid #f0f2f5}
        .patient-row:last-child{border-bottom:none}
        .patient-row:hover{background:#fafbff}
        .action-icon-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .filter-chip{padding:7px 16px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .dropdown-menu{position:absolute;top:calc(100% + 6px);${isAr?"left:0":"right:0"};background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1.5px solid #eef0f3;min-width:160px;z-index:100;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-item{padding:10px 16px;font-size:13px;color:#555;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-item:hover{background:#f7f9fc}
        .dropdown-item.danger:hover{background:rgba(192,57,43,.06);color:#c0392b}
        .stat-mini{background:#fff;border-radius:14px;padding:18px 20px;border:1.5px solid #eef0f3;box-shadow:0 2px 10px rgba(8,99,186,.05)}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif", direction:isAr?"rtl":"ltr", minHeight:"100vh", background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="patients" />

        <main className="main-anim" style={{ [isAr?"marginRight":"marginLeft"]:240, padding:"0 32px 48px", transition:"margin .3s" }}>

          {/* ── TOP BAR ── */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                <p style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <button
                onClick={()=>setAddModal(true)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#054a8c";e.currentTarget.style.transform="translateY(-1px)"}}
                onMouseLeave={e=>{e.currentTarget.style.background="#0863ba";e.currentTarget.style.transform="translateY(0)"}}
              >
                <span style={{ fontSize:18,lineHeight:1 }}>＋</span> {tr.addPatient}
              </button>
            </div>
          </div>

          <div style={{ paddingTop:28 }}>

            {/* ── STATS ── */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
              {[
                { label:tr.stats.total,    value:stats.total,    icon:"👥", color:"#0863ba", bg:"rgba(8,99,186,.08)"  },
                { label:tr.stats.male,     value:stats.male,     icon:"👨", color:"#2980b9", bg:"rgba(41,128,185,.08)"},
                { label:tr.stats.female,   value:stats.female,   icon:"👩", color:"#8e44ad", bg:"rgba(142,68,173,.08)"},
                { label:tr.stats.diabetic, value:stats.diabetic, icon:"🩸", color:"#c0392b", bg:"rgba(192,57,43,.08)" },
              ].map((s,i)=>(
                <div key={i} className="stat-mini" style={{ animationDelay:`${i*60}ms`,animation:"fadeUp .4s ease both" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize:28,fontWeight:800,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:12,color:"#aaa",marginTop:6,fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── SEARCH + FILTERS ── */}
            <div style={{ background:"#fff",borderRadius:16,padding:"18px 20px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)",marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
                {/* Search */}
                <div style={{ flex:1,minWidth:200,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"10px 14px" }}>
                  <span style={{ color:"#bbb",fontSize:15 }}>🔍</span>
                  <input
                    value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder={tr.search}
                    style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}
                  />
                  {search && <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:14 }}>✕</button>}
                </div>
                {/* Filter chips */}
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {Object.entries(tr.filters).map(([k,v])=>(
                    <button key={k} className={`filter-chip${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                  ))}
                </div>
                {/* Toggle hidden */}
                <button
                  onClick={()=>setShowHidden(!showHidden)}
                  style={{ padding:"7px 14px",borderRadius:10,border:"1.5px dashed #d0d0d0",background:"transparent",cursor:"pointer",fontSize:12,color:"#999",fontFamily:"Rubik,sans-serif",transition:"all .2s" }}
                >
                  {showHidden ? `🙈 ${tr.hideHidden}` : `👁 ${tr.showHidden}`}
                </button>
              </div>
            </div>

            {/* ── TABLE ── */}
            <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>

              {/* Table Header */}
              <div style={{ display:"grid",gridTemplateColumns:"60px 1fr 130px 90px 120px 120px 110px",gap:0,padding:"12px 20px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3" }}>
                {[tr.id, tr.table.name, tr.table.phone, tr.table.gender, tr.table.dob, tr.table.conditions, tr.table.actions].map((h,i)=>(
                  <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.5,textAlign:i===0||i===6?"center":"start",paddingLeft:i>0&&i<6?8:0 }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15,fontWeight:600 }}>{search ? tr.noResults : tr.noPatients}</div>
                </div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="patient-row"
                    style={{
                      display:"grid", gridTemplateColumns:"60px 1fr 130px 90px 120px 120px 110px",
                      gap:0, padding:"14px 20px", alignItems:"center",
                      opacity: p.hidden ? 0.5 : 1,
                      animation: animIds.includes(p.id) ? "rowIn .4s ease" : undefined,
                    }}
                  >
                    {/* ID */}
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontSize:11,fontWeight:700,color:"#aaa" }}>#{p.id}</span>
                    </div>

                    {/* Name + Avatar */}
                    <div style={{ display:"flex",alignItems:"center",gap:12,paddingLeft:8 }}>
                      <div style={{ width:38,height:38,borderRadius:10,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0 }}>
                        {getInitials(p.name)}
                      </div>
                      <div>
                        <div style={{ fontSize:14,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:6 }}>
                          {p.name}
                          {p.hidden && (
                            <span style={{ fontSize:10,background:"#f0f0f0",color:"#999",padding:"2px 7px",borderRadius:10,fontWeight:500 }}>{tr.hiddenBadge}</span>
                          )}
                        </div>
                        <div style={{ fontSize:11,color:"#bbb",marginTop:2 }}>
                          {calcAge(p.dob) !== "—" ? `${calcAge(p.dob)} ${isAr?"سنة":"yrs"}` : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Phone */}
                    <div style={{ fontSize:13,color:"#555",paddingLeft:8 }}>{p.phone||"—"}</div>

                    {/* Gender */}
                    <div style={{ paddingLeft:8 }}>
                      <span style={{
                        fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,
                        background:p.gender==="male"?"rgba(41,128,185,.1)":"rgba(142,68,173,.1)",
                        color:p.gender==="male"?"#2980b9":"#8e44ad",
                      }}>
                        {tr.gender[p.gender] || "—"}
                      </span>
                    </div>

                    {/* DOB */}
                    <div style={{ fontSize:12,color:"#888",paddingLeft:8 }}>
                      {p.dob ? new Date(p.dob).toLocaleDateString(lang==="ar"?"ar-SA":"en-US",{year:"numeric",month:"short",day:"numeric"}) : "—"}
                    </div>

                    {/* Conditions */}
                    <div style={{ display:"flex",gap:5,flexWrap:"wrap",paddingLeft:8 }}>
                      {p.diabetes && (
                        <span style={{ fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"rgba(192,57,43,.1)",color:"#c0392b" }}>🩸 {tr.conditions.diabetes}</span>
                      )}
                      {p.hypertension && (
                        <span style={{ fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,background:"rgba(230,126,34,.1)",color:"#e67e22" }}>💊 {tr.conditions.hypertension}</span>
                      )}
                      {!p.diabetes && !p.hypertension && <span style={{ fontSize:12,color:"#ddd" }}>—</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex",alignItems:"center",gap:6,justifyContent:"center",position:"relative" }}
                      onClick={e=>e.stopPropagation()}
                    >
                      {/* Edit */}
                      <button className="action-icon-btn" title={tr.actions.edit} onClick={()=>setEditPatient(p)}>✏️</button>
                      {/* Hide/Show */}
                      <button className="action-icon-btn" title={p.hidden?tr.actions.show:tr.actions.hide} onClick={()=>toggleHide(p.id)}>
                        {p.hidden?"👁":"🙈"}
                      </button>
                      {/* More */}
                      <div style={{ position:"relative" }}>
                        <button className="action-icon-btn" onClick={e=>{e.stopPropagation();setOpenMenuId(openMenuId===p.id?null:p.id)}}>⋯</button>
                        {openMenuId===p.id && (
                          <div className="dropdown-menu">
                            <div className="dropdown-item" onClick={()=>{setOpenMenuId(null)}}>
                              📅 {tr.actions.viewAppointments}
                            </div>
                            <div style={{ height:1,background:"#f0f0f0",margin:"4px 0" }} />
                            <div className="dropdown-item danger" onClick={()=>{setDeletePatient(p);setOpenMenuId(null)}}>
                              🗑️ {tr.actions.delete}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Count */}
            <div style={{ textAlign:"center",marginTop:14,fontSize:12,color:"#bbb" }}>
              {isAr ? `عرض ${filtered.length} من ${patients.filter(p=>showHidden||!p.hidden).length} مريض` : `Showing ${filtered.length} of ${patients.filter(p=>showHidden||!p.hidden).length} patients`}
            </div>

          </div>
        </main>

        {/* Modals */}
        {(addModal||editPatient) && (
          <PatientModal
            lang={lang}
            patient={editPatient}
            onSave={handleSave}
            onClose={()=>{setAddModal(false);setEditPatient(null)}}
          />
        )}
        {deletePatient && (
          <DeleteModal
            lang={lang}
            patient={deletePatient}
            onConfirm={handleDelete}
            onClose={()=>setDeletePatient(null)}
          />
        )}
      </div>
    </>
  );
}
