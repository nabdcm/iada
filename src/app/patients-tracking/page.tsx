"use client";

// ============================================================
// NABD - نبض | Patient Tracking Dashboard — Doctor View
// Route: /patient-tracking
// Auth required — doctor only
// ============================================================

import { useState, useEffect, type JSX } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────
type Lang = "ar" | "en";

type ClinicType =
  | "skin_care"
  | "cosmetic"
  | "physical_therapy"
  | "dental"
  | "general"
  | "nutrition"
  | "ophthalmology"
  | "orthopedic";

interface TrackingLink {
  id: string;
  token: string;
  patient_id: number;
  patient_name: string;
  clinic_type: ClinicType;
  doctor_name: string;
  clinic_name: string;
  notes_for_patient: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface DailyLog {
  id: string;
  token: string;
  patient_id: number;
  clinic_type: ClinicType;
  log_date: string;
  fields: Record<string, string | number | boolean>;
  general_notes: string;
  submitted_at: string;
  doctor_comment?: string;
}

interface Patient {
  id: number;
  name: string;
}

// ── Clinic Config ──────────────────────────────────────────
const CLINIC_LABELS: Record<ClinicType, { ar: string; en: string; icon: string; color: string }> = {
  skin_care:        { ar: "عناية بالبشرة",    en: "Skin Care",          icon: "✨", color: "#e67e22" },
  cosmetic:         { ar: "التجميل",           en: "Cosmetic",           icon: "💎", color: "#8e44ad" },
  physical_therapy: { ar: "علاج فيزيائي",      en: "Physical Therapy",   icon: "🏃", color: "#2e7d32" },
  dental:           { ar: "الأسنان",           en: "Dental",             icon: "🦷", color: "#0863ba" },
  general:          { ar: "طب عام",            en: "General Medicine",   icon: "🩺", color: "#16a085" },
  nutrition:        { ar: "التغذية",           en: "Nutrition",          icon: "🥗", color: "#27ae60" },
  ophthalmology:    { ar: "طب العيون",         en: "Ophthalmology",      icon: "👁", color: "#2980b9" },
  orthopedic:       { ar: "العظام والمفاصل",   en: "Orthopedics",        icon: "🦴", color: "#c0392b" },
};

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  applied_medication:       { ar: "طبّق الدواء",          en: "Applied medication" },
  skin_condition:           { ar: "حالة البشرة",           en: "Skin condition" },
  new_pimples:              { ar: "حبوب جديدة",            en: "New pimples" },
  redness_level:            { ar: "الاحمرار",              en: "Redness level" },
  moisturizer_used:         { ar: "استخدم المرطّب",        en: "Used moisturizer" },
  sun_exposure:             { ar: "تعرض الشمس",            en: "Sun exposure" },
  water_intake:             { ar: "الماء (لتر)",           en: "Water (L)" },
  followed_instructions:    { ar: "اتبع التعليمات",        en: "Followed instructions" },
  swelling_level:           { ar: "التورم",                en: "Swelling" },
  pain_level:               { ar: "الألم",                 en: "Pain level" },
  result_satisfaction:      { ar: "الرضا عن النتيجة",     en: "Result satisfaction" },
  bruising:                 { ar: "كدمات",                 en: "Bruising" },
  did_exercises:            { ar: "أجرى التمارين",         en: "Did exercises" },
  exercise_reps:            { ar: "التكرارات",             en: "Repetitions" },
  pain_before:              { ar: "الألم قبل",             en: "Pain before" },
  pain_after:               { ar: "الألم بعد",             en: "Pain after" },
  mobility:                 { ar: "الحركة",                en: "Mobility" },
  swelling:                 { ar: "تورم",                  en: "Swelling" },
  applied_ice_heat:         { ar: "كمادات",                en: "Ice/Heat applied" },
  brushing_times:           { ar: "مرات التنظيف",          en: "Brushing times" },
  flossed:                  { ar: "خيط الأسنان",           en: "Flossed" },
  avoided_restricted_foods: { ar: "تجنّب الممنوعات",      en: "Avoided restricted foods" },
  bleeding_gums:            { ar: "نزف اللثة",             en: "Gum bleeding" },
  sensitivity:              { ar: "الحساسية",              en: "Sensitivity" },
  temperature:              { ar: "الحرارة",               en: "Temperature" },
  blood_pressure_sys:       { ar: "الضغط الانقباضي",      en: "Systolic BP" },
  blood_pressure_dia:       { ar: "الضغط الانبساطي",      en: "Diastolic BP" },
  took_medication:          { ar: "تناول الدواء",          en: "Took medication" },
  energy_level:             { ar: "مستوى الطاقة",         en: "Energy level" },
  symptoms:                 { ar: "الأعراض",               en: "Symptoms" },
  heart_rate:               { ar: "ضربات القلب",           en: "Heart rate" },
  followed_diet:            { ar: "اتبع الحمية",           en: "Followed diet" },
  weight:                   { ar: "الوزن",                 en: "Weight" },
  meals_count:              { ar: "عدد الوجبات",           en: "Meals count" },
  exercise_done:            { ar: "رياضة",                 en: "Exercise" },
  hunger_level:             { ar: "مستوى الجوع",          en: "Hunger level" },
  mood:                     { ar: "المزاج",                en: "Mood" },
  used_drops:               { ar: "استخدم القطرات",       en: "Used drops" },
  drops_times:              { ar: "مرات القطرات",          en: "Drop times" },
  vision_clarity:           { ar: "وضوح الرؤية",          en: "Vision clarity" },
  eye_redness:              { ar: "احمرار العين",          en: "Eye redness" },
  pain_discomfort:          { ar: "ألم العين",             en: "Eye pain" },
  avoided_screen:           { ar: "قلّل الشاشات",         en: "Reduced screen time" },
};

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id: number) => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};

function formatValue(key: string, val: string | number | boolean, lang: Lang): string {
  if (typeof val === "boolean") {
    return lang === "ar" ? (val ? "✓ نعم" : "✗ لا") : (val ? "✓ Yes" : "✗ No");
  }
  return String(val);
}

// ── Sidebar (reuse from app) ─────────────────────────────────
function Sidebar({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const isAr = lang === "ar";
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navItems: { key: string; icon: JSX.Element | string; label: string; href: string }[] = [
    { key:"dashboard",         icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, label: isAr?"لوحة المعلومات":"Dashboard",       href:"/dashboard"         },
    { key:"patients",          icon:"👥", label: isAr?"المرضى":"Patients",             href:"/patients"          },
    { key:"appointments",      icon:"📅", label: isAr?"المواعيد":"Appointments",       href:"/appointments"      },
    { key:"patient-tracking",  icon:"📊", label: isAr?"متابعة المرضى":"Patient Tracking", href:"/patient-tracking" },
    { key:"payments",          icon:"💳", label: isAr?"المدفوعات":"Payments",          href:"/payments"          },
  ];

  const sidebarTransform = isMobile
    ? mobileOpen ? "translateX(0)" : isAr ? "translateX(100%)" : "translateX(-100%)"
    : "translateX(0)";

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:49 }} />
      )}
      {isMobile && (
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          position:"fixed",top:14,zIndex:60,
          right:isAr?16:undefined,left:isAr?undefined:16,
          width:40,height:40,borderRadius:10,background:"#0863ba",
          border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
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
      <aside style={{
        width: isMobile ? 260 : collapsed ? 70 : 240,
        minHeight:"100vh",background:"#fff",
        borderRight:isAr?"none":"1.5px solid #eef0f3",
        borderLeft:isAr?"1.5px solid #eef0f3":"none",
        display:"flex",flexDirection:"column",
        transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",
        position:"fixed",top:0,
        right:isAr?0:undefined,left:isAr?undefined:0,
        zIndex:50,transform:sidebarTransform,
        boxShadow:"4px 0 24px rgba(8,99,186,.06)",
      }}>
        <div style={{ padding:collapsed?"24px 0":"24px 20px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",minHeight:72 }}>
          {!collapsed && (
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }} />
              <div>
                <div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{isAr?"نبض":"NABD"}</div>
                <div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{isAr?"إدارة العيادة":"Clinic Manager"}</div>
              </div>
            </div>
          )}
          {collapsed && <img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10 }} />}
          {!collapsed && (
            <button onClick={() => setCollapsed(!collapsed)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>
              {isAr?"›":"‹"}
            </button>
          )}
        </div>
        <nav style={{ flex:1,padding:"16px 12px" }}>
          {navItems.map(item => {
            const isActive = item.key === "patient-tracking";
            return (
              <a key={item.key} href={item.href} style={{
                display:"flex",alignItems:"center",gap:collapsed?0:12,
                justifyContent:collapsed?"center":"flex-start",
                padding:collapsed?"12px 0":"11px 14px",
                borderRadius:10,marginBottom:4,textDecoration:"none",
                background:isActive?"rgba(8,99,186,.08)":"transparent",
                color:isActive?"#0863ba":"#666",
                fontWeight:isActive?600:400,fontSize:14,
                transition:"all .18s",position:"relative",
              }}>
                {isActive && <div style={{ position:"absolute",[isAr?"right":"left"]:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }} />}
                <span style={{ fontSize:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>
        <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
          {!collapsed && (
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>
              🌐 {lang === "ar" ? "English" : "العربية"}
            </button>
          )}
          <a href="/dashboard" style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"flex-start",gap:8,padding:collapsed?8:"10px 12px",borderRadius:10,background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.12)",textDecoration:"none" }}>
            <span style={{ fontSize:16,flexShrink:0 }}>🏠</span>
            {!collapsed && <span style={{ fontSize:13,fontWeight:600,color:"#0863ba",fontFamily:"Rubik,sans-serif" }}>{isAr?"الرئيسية":"Home"}</span>}
          </a>
        </div>
      </aside>
    </>
  );
}

// ── Create Link Modal ────────────────────────────────────────
function CreateLinkModal({
  lang,
  patients,
  doctorName,
  clinicName,
  userId,
  onClose,
  onCreated,
}: {
  lang: Lang;
  patients: Patient[];
  doctorName: string;
  clinicName: string;
  userId: string;
  onClose: () => void;
  onCreated: (link: TrackingLink) => void;
}) {
  const isAr = lang === "ar";
  const [patientId, setPatientId] = useState("");
  const [clinicType, setClinicType] = useState<ClinicType>("general");
  const [notes, setNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!patientId) return;
    setCreating(true);

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    const patient = patients.find(p => p.id === Number(patientId));
    const expiresAt = expiryDays
      ? new Date(Date.now() + Number(expiryDays) * 86400000).toISOString()
      : null;

    const newLink = {
      token,
      patient_id: Number(patientId),
      patient_name: patient?.name ?? "",
      clinic_type: clinicType,
      doctor_name: doctorName,
      clinic_name: clinicName,
      notes_for_patient: notes,
      active: true,
      expires_at: expiresAt,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from("tracking_links")
      .insert([newLink])
      .select()
      .single();

    if (!error && data) onCreated(data);
    setCreating(false);
  }

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16
    }}>
      <div style={{
        background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:460,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",
        fontFamily:"Rubik,sans-serif"
      }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22 }}>
          <div style={{ fontSize:17,fontWeight:800,color:"#353535" }}>
            {isAr?"🔗 إنشاء رابط متابعة":"🔗 Create Tracking Link"}
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#aaa",lineHeight:1 }}>×</button>
        </div>

        {/* Patient */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>
            {isAr?"المريض":"Patient"}
          </label>
          <select
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",outline:"none" }}
          >
            <option value="">{isAr?"-- اختر مريضاً --":"-- Select a patient --"}</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Clinic Type */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>
            {isAr?"نوع العيادة":"Clinic Type"}
          </label>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
            {(Object.entries(CLINIC_LABELS) as [ClinicType, typeof CLINIC_LABELS[ClinicType]][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setClinicType(key)}
                style={{
                  padding:"8px 10px",borderRadius:10,border:`1.5px solid ${clinicType===key?val.color:"#eef0f3"}`,
                  background:clinicType===key?`${val.color}10`:"#f7f9fc",
                  fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",
                  color:clinicType===key?val.color:"#888",
                  display:"flex",alignItems:"center",gap:6,transition:"all .15s"
                }}
              >
                <span>{val.icon}</span>
                <span>{isAr?val.ar:val.en}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>
            {isAr?"مدة الصلاحية":"Validity period"}
          </label>
          <select
            value={expiryDays}
            onChange={e => setExpiryDays(e.target.value)}
            style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",outline:"none" }}
          >
            <option value="7">{isAr?"أسبوع واحد":"1 week"}</option>
            <option value="14">{isAr?"أسبوعان":"2 weeks"}</option>
            <option value="30">{isAr?"شهر واحد":"1 month"}</option>
            <option value="90">{isAr?"3 أشهر":"3 months"}</option>
            <option value="">{isAr?"بلا انتهاء":"No expiry"}</option>
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom:22 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>
            {isAr?"ملاحظة للمريض (اختياري)":"Note for patient (optional)"}
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={isAr?"مثال: يرجى تسجيل البيانات في الصباح...":"E.g.: Please submit your data in the morning..."}
            style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none",resize:"vertical",minHeight:70,lineHeight:1.6 }}
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!patientId || creating}
          style={{
            width:"100%",padding:"13px",borderRadius:12,border:"none",
            background:patientId?"#0863ba":"#ddd",color:"#fff",
            fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:patientId?"pointer":"not-allowed",
            boxShadow:patientId?"0 4px 16px rgba(8,99,186,.3)":"none",transition:"all .2s"
          }}
        >
          {creating?(isAr?"جاري الإنشاء...":"Creating..."):(isAr?"إنشاء الرابط":"Create Link")}
        </button>
      </div>
    </div>
  );
}

// ── Log Detail Modal ─────────────────────────────────────────
function LogDetailModal({
  log,
  lang,
  patientName,
  onClose,
  onSaveComment,
}: {
  log: DailyLog;
  lang: Lang;
  patientName: string;
  onClose: () => void;
  onSaveComment: (logId: string, comment: string) => void;
}) {
  const isAr = lang === "ar";
  const config = CLINIC_LABELS[log.clinic_type];
  const [comment, setComment] = useState(log.doctor_comment ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSaveComment() {
    setSaving(true);
    await supabase.from("daily_logs").update({ doctor_comment: comment }).eq("id", log.id);
    onSaveComment(log.id, comment);
    setSaving(false);
  }

  const fieldEntries = Object.entries(log.fields ?? {});

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
      overflowY:"auto"
    }}>
      <div style={{
        background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:520,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",
        fontFamily:"Rubik,sans-serif",maxHeight:"90vh",overflowY:"auto"
      }}>
        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#353535" }}>{patientName}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{log.log_date}</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#aaa" }}>×</button>
        </div>

        {/* Clinic Badge */}
        <div style={{
          display:"inline-flex",alignItems:"center",gap:6,
          padding:"6px 12px",borderRadius:20,
          background:`${config.color}12`,border:`1px solid ${config.color}25`,
          marginBottom:18
        }}>
          <span style={{ fontSize:14 }}>{config.icon}</span>
          <span style={{ fontSize:12,fontWeight:600,color:config.color }}>{isAr?config.ar:config.en}</span>
        </div>

        {/* Fields */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18 }}>
          {fieldEntries.map(([key, val]) => {
            const label = FIELD_LABELS[key];
            const isBool = typeof val === "boolean";
            const isPositive = isBool && val === true;
            const isNegative = isBool && val === false;
            return (
              <div key={key} style={{
                padding:"10px 12px",borderRadius:10,
                background:isPositive?"rgba(46,125,50,.06)":isNegative?"rgba(192,57,43,.06)":"rgba(8,99,186,.04)",
                border:`1px solid ${isPositive?"rgba(46,125,50,.15)":isNegative?"rgba(192,57,43,.15)":"rgba(8,99,186,.1)"}`
              }}>
                <div style={{ fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4 }}>
                  {label ? (isAr ? label.ar : label.en) : key}
                </div>
                <div style={{
                  fontSize:14,fontWeight:700,
                  color:isPositive?"#2e7d32":isNegative?"#c0392b":config.color
                }}>
                  {formatValue(key, val, lang)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Patient notes */}
        {log.general_notes && (
          <div style={{
            padding:"12px 14px",background:"rgba(8,99,186,.04)",borderRadius:10,
            border:"1px solid rgba(8,99,186,.1)",marginBottom:18
          }}>
            <div style={{ fontSize:11,color:"#888",fontWeight:600,marginBottom:4 }}>
              {isAr?"ملاحظات المريض":"Patient Notes"}
            </div>
            <div style={{ fontSize:13,color:"#353535",lineHeight:1.6 }}>{log.general_notes}</div>
          </div>
        )}

        {/* Doctor comment */}
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:8 }}>
            {isAr?"تعليق الطبيب":"Doctor Comment"}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={isAr?"أضف تعليقك أو توجيهاتك...":"Add your comment or instructions..."}
            style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none",resize:"vertical",minHeight:80,lineHeight:1.6 }}
          />
          <button
            onClick={handleSaveComment}
            disabled={saving}
            style={{
              marginTop:10,padding:"10px 20px",borderRadius:10,border:"none",
              background:"#0863ba",color:"#fff",fontFamily:"Rubik,sans-serif",
              fontSize:13,fontWeight:700,cursor:"pointer",
              boxShadow:"0 3px 10px rgba(8,99,186,.25)",transition:"all .2s"
            }}
          >
            {saving?(isAr?"جاري الحفظ...":"Saving..."):(isAr?"حفظ التعليق":"Save Comment")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function PatientTrackingPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [dailyLogs, setDailyLogs]         = useState<DailyLog[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLog, setSelectedLog]         = useState<DailyLog | null>(null);
  const [selectedLink, setSelectedLink]       = useState<string | "all">("all");
  const [filterDate, setFilterDate]           = useState(todayISO());
  const [copiedToken, setCopiedToken]         = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<"logs" | "links">("logs");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: profile } = await supabase.from("profiles").select("full_name, clinic_name").eq("id", user.id).single();
    if (profile) {
      setDoctorName(profile.full_name ?? "");
      setClinicName(profile.clinic_name ?? "العيادة");
    }

    const { data: pats } = await supabase.from("patients").select("id, name").eq("user_id", user.id).eq("is_hidden", false);
    setPatients(pats ?? []);

    const { data: links } = await supabase.from("tracking_links").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTrackingLinks(links ?? []);

    const tokens = (links ?? []).map(l => l.token);
    if (tokens.length > 0) {
      const { data: logs } = await supabase.from("daily_logs").select("*").in("token", tokens).order("log_date", { ascending: false });
      setDailyLogs(logs ?? []);
    }

    setLoading(false);
  }

  function handleLinkCreated(link: TrackingLink) {
    setTrackingLinks(prev => [link, ...prev]);
    setShowCreateModal(false);
    setActiveTab("links");
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/daily-log/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  function shareWhatsApp(token: string, patientName: string) {
    const url = `${window.location.origin}/daily-log/${token}`;
    const text = isAr
      ? `مرحباً ${patientName} 👋\nهذا رابط متابعتك اليومية من عيادة ${clinicName}.\nيرجى تسجيل بياناتك يومياً:\n${url}`
      : `Hello ${patientName} 👋\nHere is your daily tracking link from ${clinicName}:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function toggleLinkActive(linkId: string, current: boolean) {
    await supabase.from("tracking_links").update({ active: !current }).eq("id", linkId);
    setTrackingLinks(prev => prev.map(l => l.id === linkId ? { ...l, active: !current } : l));
  }

  function handleSaveComment(logId: string, comment: string) {
    setDailyLogs(prev => prev.map(l => l.id === logId ? { ...l, doctor_comment: comment } : l));
    setSelectedLog(prev => prev ? { ...prev, doctor_comment: comment } : prev);
  }

  // ── Filtered logs ──────────────────────────────────────────
  const filteredLogs = dailyLogs.filter(log => {
    const matchesLink = selectedLink === "all" || log.token === selectedLink;
    const matchesDate = !filterDate || log.log_date === filterDate;
    return matchesLink && matchesDate;
  });

  // ── Stats ──────────────────────────────────────────────────
  const todayLogs   = dailyLogs.filter(l => l.log_date === todayISO()).length;
  const activeLinks = trackingLinks.filter(l => l.active).length;
  const missedToday = activeLinks - todayLogs;

  const sidebarW = 240;

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; }
        .pt-root { direction: ${isAr?"rtl":"ltr"}; min-height: 100vh; background: #f7f9fc; }

        .log-row {
          background: #fff; border-radius: 14px; padding: 16px 18px;
          border: 1.5px solid #eef0f3; margin-bottom: 10px;
          display: flex; align-items: center; gap: 14px;
          cursor: pointer; transition: all .18s;
          box-shadow: 0 2px 10px rgba(8,99,186,.04);
        }
        .log-row:hover { border-color: rgba(8,99,186,.3); box-shadow: 0 4px 18px rgba(8,99,186,.1); transform: translateY(-1px); }

        .link-row {
          background: #fff; border-radius: 14px; padding: 16px 18px;
          border: 1.5px solid #eef0f3; margin-bottom: 10px;
          box-shadow: 0 2px 10px rgba(8,99,186,.04);
          transition: border-color .18s;
        }

        .tab-btn {
          padding: 8px 20px; border-radius: 20px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 13px;
          font-weight: 600; cursor: pointer; color: #888; transition: all .18s;
        }
        .tab-btn.active { background: rgba(8,99,186,.08); border-color: rgba(8,99,186,.3); color: #0863ba; }

        .wa-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; borderRadius: 8px; border: none;
          background: #25D366; color: #fff; font-family: 'Rubik', sans-serif;
          font-size: 12px; font-weight: 700; cursor: pointer; border-radius: 8px;
          transition: all .18s;
        }
        .wa-btn:hover { background: #1eb858; }

        @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeInUp .4s cubic-bezier(.4,0,.2,1) both; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .pulse { animation: pulse 1.5s ease infinite; }
      `}</style>

      <div className="pt-root">
        <Sidebar lang={lang} setLang={setLang} />

        <main style={{
          [isAr?"marginRight":"marginLeft"]: sidebarW,
          padding: "32px 28px",
          transition: "margin .3s cubic-bezier(.4,0,.2,1)",
          minHeight: "100vh",
        }}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:"center",padding:"80px 0" }}>
              <div style={{ fontSize:36,marginBottom:12 }} className="pulse">📊</div>
              <div style={{ fontSize:13,color:"#aaa" }}>{isAr?"جاري التحميل...":"Loading..."}</div>
            </div>
          )}

          {!loading && (
            <>
              {/* Header */}
              <div className="fade-up" style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12 }}>
                <div>
                  <h1 style={{ fontSize:24,fontWeight:800,color:"#353535",marginBottom:4 }}>
                    {isAr?"📊 متابعة المرضى":"📊 Patient Tracking"}
                  </h1>
                  <p style={{ fontSize:13,color:"#aaa" }}>
                    {isAr?"تابع التقارير اليومية لمرضاك":"Monitor your patients' daily reports"}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"11px 20px",borderRadius:12,border:"none",
                    background:"#0863ba",color:"#fff",fontFamily:"Rubik,sans-serif",
                    fontSize:14,fontWeight:700,cursor:"pointer",
                    boxShadow:"0 4px 16px rgba(8,99,186,.3)",transition:"all .2s"
                  }}
                >
                  <span style={{ fontSize:16 }}>🔗</span>
                  {isAr?"إنشاء رابط متابعة":"Create Tracking Link"}
                </button>
              </div>

              {/* Stats Row */}
              <div className="fade-up" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:26 }}>
                {[
                  { icon:"📋", label:isAr?"تقارير اليوم":"Today's Reports",   value:todayLogs,   color:"#0863ba" },
                  { icon:"🔗", label:isAr?"روابط نشطة":"Active Links",        value:activeLinks, color:"#2e7d32" },
                  { icon:"⚠️", label:isAr?"لم يسجّلوا اليوم":"Not Logged Yet",value:Math.max(missedToday,0), color:"#e67e22" },
                  { icon:"📝", label:isAr?"إجمالي التقارير":"Total Reports",  value:dailyLogs.length, color:"#8e44ad" },
                ].map((s,i) => (
                  <div key={i} style={{
                    background:"#fff",borderRadius:14,padding:"18px 20px",
                    border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)",
                    position:"relative",overflow:"hidden"
                  }}>
                    <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:s.color,borderRadius:"14px 14px 0 0" }} />
                    <div style={{ fontSize:22,marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontSize:26,fontWeight:800,color:s.color,lineHeight:1,marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:12,color:"#888",fontWeight:500 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="fade-up" style={{ display:"flex",gap:8,marginBottom:20 }}>
                <button className={`tab-btn${activeTab==="logs"?" active":""}`} onClick={() => setActiveTab("logs")}>
                  {isAr?"التقارير اليومية":"Daily Reports"}
                </button>
                <button className={`tab-btn${activeTab==="links"?" active":""}`} onClick={() => setActiveTab("links")}>
                  {isAr?"روابط المتابعة":"Tracking Links"}
                </button>
              </div>

              {/* ── Tab: Logs ── */}
              {activeTab === "logs" && (
                <div className="fade-up">
                  {/* Filters */}
                  <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={e => setFilterDate(e.target.value)}
                      style={{ padding:"8px 12px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none" }}
                    />
                    <select
                      value={selectedLink}
                      onChange={e => setSelectedLink(e.target.value)}
                      style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none" }}
                    >
                      <option value="all">{isAr?"كل المرضى":"All Patients"}</option>
                      {trackingLinks.map(l => (
                        <option key={l.token} value={l.token}>{l.patient_name} — {isAr?CLINIC_LABELS[l.clinic_type].ar:CLINIC_LABELS[l.clinic_type].en}</option>
                      ))}
                    </select>
                    {(filterDate || selectedLink !== "all") && (
                      <button
                        onClick={() => { setFilterDate(""); setSelectedLink("all"); }}
                        style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.06)",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,color:"#c0392b",cursor:"pointer" }}
                      >
                        {isAr?"مسح الفلتر":"Clear Filter"}
                      </button>
                    )}
                  </div>

                  {/* Log list */}
                  {filteredLogs.length === 0 ? (
                    <div style={{ textAlign:"center",padding:"60px 0",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3" }}>
                      <div style={{ fontSize:36,marginBottom:12 }}>📭</div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#888" }}>
                        {isAr?"لا توجد تقارير لهذا التاريخ":"No reports for this date"}
                      </div>
                    </div>
                  ) : filteredLogs.map((log, idx) => {
                    const link = trackingLinks.find(l => l.token === log.token);
                    const clinic = CLINIC_LABELS[log.clinic_type];
                    const hasComment = !!log.doctor_comment;

                    return (
                      <div
                        key={log.id}
                        className="log-row fade-up"
                        style={{ animationDelay:`${idx*0.05}s` }}
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Avatar */}
                        <div style={{
                          width:42,height:42,borderRadius:12,flexShrink:0,
                          background:getColor(log.patient_id),color:"#fff",
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700
                        }}>
                          {getInitials(link?.patient_name ?? "?")}
                        </div>

                        {/* Info */}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:2 }}>
                            {link?.patient_name ?? "—"}
                          </div>
                          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                            <span style={{
                              fontSize:11,padding:"2px 8px",borderRadius:10,
                              background:`${clinic.color}12`,color:clinic.color,fontWeight:600
                            }}>
                              {clinic.icon} {isAr?clinic.ar:clinic.en}
                            </span>
                            <span style={{ fontSize:11,color:"#aaa" }}>📅 {log.log_date}</span>
                            {hasComment && (
                              <span style={{ fontSize:11,color:"#2e7d32",fontWeight:600 }}>💬 {isAr?"مُعلَّق":"Commented"}</span>
                            )}
                          </div>
                        </div>

                        {/* Quick values */}
                        <div style={{ display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end" }}>
                          {Object.entries(log.fields ?? {}).slice(0,3).map(([k,v]) => (
                            <div key={k} style={{
                              padding:"4px 8px",borderRadius:8,
                              background:"rgba(8,99,186,.06)",
                              fontSize:11,fontWeight:600,color:"#0863ba"
                            }}>
                              {formatValue(k, v, lang)}
                            </div>
                          ))}
                        </div>

                        <div style={{ color:"#bbb",fontSize:18,flexShrink:0 }}>{isAr?"‹":"›"}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Tab: Links ── */}
              {activeTab === "links" && (
                <div className="fade-up">
                  {trackingLinks.length === 0 ? (
                    <div style={{ textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3" }}>
                      <div style={{ fontSize:36,marginBottom:12 }}>🔗</div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#888",marginBottom:8 }}>
                        {isAr?"لا توجد روابط بعد":"No links yet"}
                      </div>
                      <div style={{ fontSize:12,color:"#bbb" }}>
                        {isAr?"أنشئ رابطاً لمريضك للبدء":"Create a link for your patient to start"}
                      </div>
                    </div>
                  ) : trackingLinks.map((link, idx) => {
                    const clinic = CLINIC_LABELS[link.clinic_type];
                    const logsCount = dailyLogs.filter(l => l.token === link.token).length;
                    const lastLog   = dailyLogs.find(l => l.token === link.token);
                    const loggedToday = dailyLogs.some(l => l.token === link.token && l.log_date === todayISO());
                    const url = typeof window !== "undefined" ? `${window.location.origin}/daily-log/${link.token}` : "";

                    return (
                      <div key={link.id} className="link-row fade-up" style={{ animationDelay:`${idx*0.06}s`, opacity:link.active?1:0.6 }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:12 }}>
                          {/* Avatar */}
                          <div style={{
                            width:40,height:40,borderRadius:10,flexShrink:0,
                            background:getColor(link.patient_id),color:"#fff",
                            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700
                          }}>
                            {getInitials(link.patient_name)}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4 }}>
                              <span style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{link.patient_name}</span>
                              <span style={{
                                fontSize:10,padding:"2px 8px",borderRadius:10,
                                background:link.active?"rgba(46,125,50,.1)":"rgba(120,120,120,.1)",
                                color:link.active?"#2e7d32":"#888",fontWeight:600
                              }}>
                                {link.active?(isAr?"نشط":"Active"):(isAr?"متوقف":"Inactive")}
                              </span>
                              <span style={{
                                fontSize:10,padding:"2px 8px",borderRadius:10,
                                background:`${clinic.color}12`,color:clinic.color,fontWeight:600
                              }}>
                                {clinic.icon} {isAr?clinic.ar:clinic.en}
                              </span>
                            </div>
                            <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
                              <span style={{ fontSize:11,color:"#aaa" }}>
                                {isAr?"تقارير:":"Reports:"} <b style={{ color:"#0863ba" }}>{logsCount}</b>
                              </span>
                              {lastLog && (
                                <span style={{ fontSize:11,color:"#aaa" }}>
                                  {isAr?"آخر تسجيل:":"Last log:"} <b style={{ color:"#353535" }}>{lastLog.log_date}</b>
                                </span>
                              )}
                              {!loggedToday && link.active && (
                                <span style={{ fontSize:11,color:"#e67e22",fontWeight:600 }}>
                                  ⚠️ {isAr?"لم يسجّل اليوم":"Not submitted today"}
                                </span>
                              )}
                              {loggedToday && (
                                <span style={{ fontSize:11,color:"#2e7d32",fontWeight:600 }}>
                                  ✓ {isAr?"سجّل اليوم":"Logged today"}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Toggle */}
                          <button
                            onClick={() => toggleLinkActive(link.id, link.active)}
                            style={{
                              padding:"5px 10px",borderRadius:8,border:`1px solid ${link.active?"rgba(192,57,43,.2)":"rgba(46,125,50,.2)"}`,
                              background:link.active?"rgba(192,57,43,.06)":"rgba(46,125,50,.06)",
                              fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",
                              color:link.active?"#c0392b":"#2e7d32",flexShrink:0
                            }}
                          >
                            {link.active?(isAr?"إيقاف":"Deactivate"):(isAr?"تفعيل":"Activate")}
                          </button>
                        </div>

                        {/* URL + actions */}
                        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                          <div style={{
                            flex:1,padding:"7px 12px",background:"#f7f9fc",borderRadius:8,
                            border:"1px solid #eef0f3",fontSize:11,color:"#888",
                            fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                            direction:"ltr",textAlign:"left"
                          }}>
                            {url}
                          </div>
                          <button
                            onClick={() => copyLink(link.token)}
                            style={{
                              padding:"7px 12px",borderRadius:8,border:"1.5px solid #eef0f3",
                              background:copiedToken===link.token?"rgba(46,125,50,.06)":"#fff",
                              fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",
                              color:copiedToken===link.token?"#2e7d32":"#666",transition:"all .2s",flexShrink:0
                            }}
                          >
                            {copiedToken===link.token?(isAr?"✓ تم النسخ":"✓ Copied"):(isAr?"نسخ":"Copy")}
                          </button>
                          <button
                            className="wa-btn"
                            onClick={() => shareWhatsApp(link.token, link.patient_name)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            {isAr?"واتساب":"WhatsApp"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateLinkModal
          lang={lang}
          patients={patients}
          doctorName={doctorName}
          clinicName={clinicName}
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleLinkCreated}
        />
      )}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          lang={lang}
          patientName={trackingLinks.find(l => l.token === selectedLog.token)?.patient_name ?? "—"}
          onClose={() => setSelectedLog(null)}
          onSaveComment={handleSaveComment}
        />
      )}
    </>
  );
}
