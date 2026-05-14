"use client";

// ============================================================
// NABD - نبض | Patient Tracking Dashboard — Doctor View
// التغيير الجوهري: clinic_type يُقرأ تلقائياً من جدول clinics
// المريض يُرسَل له رابط بنوع عيادة محدد مسبقاً بدون خيار للطبيب
// ============================================================

import { useState, useEffect, type JSX } from "react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "en";

// أنواع العيادات الكاملة (مطابقة لما في صفحة الأدمن)
type ClinicType =
  | "general" | "dental" | "dermatology" | "cosmetic" | "pediatrics"
  | "physical_therapy" | "mental_health" | "nutrition" | "ophthalmology"
  | "orthopedic" | "cardiology" | "gynecology" | "ent" | "urology" | "other";

// Mapping من clinic_type (الأدمن) إلى tracking_clinic_type (نظام المتابعة)
// بعض الأنواع تُوحَّد إلى نوع قريب منها إذا لم يكن لها نموذج متابعة خاص
type TrackingType =
  | "general" | "dental" | "dermatology" | "cosmetic" | "pediatrics"
  | "physical_therapy" | "mental_health" | "nutrition" | "ophthalmology"
  | "orthopedic" | "cardiology" | "gynecology" | "ent" | "urology";

const CLINIC_TO_TRACKING: Record<ClinicType, TrackingType> = {
  general:          "general",
  dental:           "dental",
  dermatology:      "dermatology",
  cosmetic:         "cosmetic",
  pediatrics:       "pediatrics",
  physical_therapy: "physical_therapy",
  mental_health:    "mental_health",
  nutrition:        "nutrition",
  ophthalmology:    "ophthalmology",
  orthopedic:       "orthopedic",
  cardiology:       "cardiology",
  gynecology:       "gynecology",
  ent:              "ent",
  urology:          "urology",
  other:            "general", // fallback
};

interface CustomQuestion {
  key: string;
  label_ar: string;
  label_en: string;
  type: "scale" | "yesno" | "number" | "text";
  min?: number;
  max?: number;
  unit?: string;
  unit_ar?: string;
}

interface TrackingLink {
  id: string;
  token: string;
  patient_id: number;
  patient_name: string;
  clinic_type: TrackingType;
  doctor_name: string;
  clinic_name: string;
  notes_for_patient: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
  custom_questions?: CustomQuestion[] | null;
}

interface DailyLog {
  id: string;
  token: string;
  patient_id: number;
  clinic_type: TrackingType;
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

// ── خصائص كل نوع عيادة في نظام المتابعة ───────────────────
const CLINIC_LABELS: Record<TrackingType, { ar: string; en: string; icon: string; color: string }> = {
  general:          { ar:"طب عام",            en:"General Medicine",  icon:"🩺", color:"#16a085" },
  dental:           { ar:"الأسنان",           en:"Dental",            icon:"🦷", color:"#0863ba" },
  dermatology:      { ar:"جلدية",             en:"Dermatology",       icon:"🧴", color:"#e67e22" },
  cosmetic:         { ar:"التجميل",           en:"Cosmetic",          icon:"💎", color:"#8e44ad" },
  pediatrics:       { ar:"أطفال",             en:"Pediatrics",        icon:"👶", color:"#27ae60" },
  physical_therapy: { ar:"علاج فيزيائي",      en:"Physical Therapy",  icon:"🏃", color:"#2e7d32" },
  mental_health:    { ar:"الصحة النفسية",    en:"Mental Health",     icon:"🧠", color:"#6c3fc5" },
  nutrition:        { ar:"التغذية",           en:"Nutrition",         icon:"🥗", color:"#27ae60" },
  ophthalmology:    { ar:"طب العيون",         en:"Ophthalmology",     icon:"👁", color:"#2980b9" },
  orthopedic:       { ar:"العظام والمفاصل",   en:"Orthopedics",       icon:"🦴", color:"#c0392b" },
  cardiology:       { ar:"قلب وشرايين",      en:"Cardiology",        icon:"❤️", color:"#e74c3c" },
  gynecology:       { ar:"نساء وتوليد",      en:"Gynecology",        icon:"🌸", color:"#e91e63" },
  ent:              { ar:"أنف وأذن وحنجرة", en:"ENT",               icon:"👂", color:"#795548" },
  urology:          { ar:"مسالك بولية",      en:"Urology",           icon:"💧", color:"#2196f3" },
};

// ── تسميات الحقول لعرضها في لوحة الطبيب ──────────────────
const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  // عام
  took_medication:          { ar:"تناول الدواء",          en:"Took medication"        },
  energy_level:             { ar:"مستوى الطاقة",         en:"Energy level"           },
  symptoms:                 { ar:"الأعراض",               en:"Symptoms"               },
  heart_rate:               { ar:"ضربات القلب",           en:"Heart rate"             },
  temperature:              { ar:"الحرارة",               en:"Temperature"            },
  blood_pressure_sys:       { ar:"الضغط الانقباضي",      en:"Systolic BP"            },
  blood_pressure_dia:       { ar:"الضغط الانبساطي",      en:"Diastolic BP"           },
  // أسنان
  brushing_times:           { ar:"مرات التنظيف",          en:"Brushing times"         },
  flossed:                  { ar:"خيط الأسنان",           en:"Flossed"               },
  pain_level:               { ar:"الألم",                 en:"Pain level"             },
  avoided_restricted_foods: { ar:"تجنّب الممنوعات",      en:"Avoided restricted foods"},
  bleeding_gums:            { ar:"نزف اللثة",             en:"Gum bleeding"           },
  sensitivity:              { ar:"الحساسية",              en:"Sensitivity"            },
  // جلدية / تجميل
  applied_medication:       { ar:"طبّق الدواء",           en:"Applied medication"     },
  skin_condition:           { ar:"حالة البشرة",           en:"Skin condition"         },
  new_pimples:              { ar:"حبوب جديدة",            en:"New pimples"            },
  redness_level:            { ar:"الاحمرار",              en:"Redness level"          },
  moisturizer_used:         { ar:"استخدم المرطّب",        en:"Used moisturizer"       },
  sun_exposure:             { ar:"تعرض الشمس",            en:"Sun exposure"           },
  water_intake:             { ar:"الماء (لتر)",           en:"Water (L)"              },
  followed_instructions:    { ar:"اتبع التعليمات",        en:"Followed instructions"  },
  swelling_level:           { ar:"التورم",                en:"Swelling"               },
  result_satisfaction:      { ar:"الرضا عن النتيجة",     en:"Result satisfaction"    },
  bruising:                 { ar:"كدمات",                 en:"Bruising"               },
  // علاج فيزيائي / عظام
  did_exercises:            { ar:"أجرى التمارين",         en:"Did exercises"          },
  exercise_reps:            { ar:"التكرارات",             en:"Repetitions"            },
  pain_before:              { ar:"الألم قبل",             en:"Pain before"            },
  pain_after:               { ar:"الألم بعد",             en:"Pain after"             },
  mobility:                 { ar:"الحركة",                en:"Mobility"               },
  swelling:                 { ar:"تورم",                  en:"Swelling"               },
  applied_ice_heat:         { ar:"كمادات",                en:"Ice/Heat applied"       },
  // تغذية
  followed_diet:            { ar:"اتبع الحمية",           en:"Followed diet"          },
  weight:                   { ar:"الوزن",                 en:"Weight"                 },
  meals_count:              { ar:"عدد الوجبات",           en:"Meals count"            },
  exercise_done:            { ar:"رياضة",                 en:"Exercise"               },
  hunger_level:             { ar:"مستوى الجوع",          en:"Hunger level"           },
  mood:                     { ar:"المزاج",                en:"Mood"                   },
  // عيون
  used_drops:               { ar:"استخدم القطرات",       en:"Used drops"             },
  drops_times:              { ar:"مرات القطرات",          en:"Drop times"             },
  vision_clarity:           { ar:"وضوح الرؤية",          en:"Vision clarity"         },
  eye_redness:              { ar:"احمرار العين",          en:"Eye redness"            },
  pain_discomfort:          { ar:"ألم العين",             en:"Eye pain"               },
  avoided_screen:           { ar:"قلّل الشاشات",         en:"Reduced screen time"    },
  // نفسية
  mood_level:               { ar:"المزاج العام",          en:"Mood level"             },
  anxiety_level:            { ar:"مستوى القلق",           en:"Anxiety level"          },
  sleep_hours:              { ar:"ساعات النوم",           en:"Sleep hours"            },
  sleep_quality:            { ar:"جودة النوم",            en:"Sleep quality"          },
  negative_thoughts:        { ar:"أفكار سلبية",          en:"Negative thoughts"      },
  social_interaction:       { ar:"التفاعل الاجتماعي",    en:"Social interaction"     },
  did_activity:             { ar:"نشاط ممتع",             en:"Enjoyable activity"     },
  overall_wellbeing:        { ar:"الصحة النفسية العامة", en:"Overall wellbeing"      },
  // قلب
  chest_pain:               { ar:"ألم صدري",             en:"Chest pain"             },
  shortness_breath:         { ar:"ضيق تنفس",             en:"Shortness of breath"    },
  pulse_rate:               { ar:"معدل النبض",            en:"Pulse rate"             },
  // أطفال
  appetite:                 { ar:"الشهية",                en:"Appetite"               },
  activity_level:           { ar:"مستوى النشاط",         en:"Activity level"         },
  // نساء
  pain_level_lower:         { ar:"ألم أسفل البطن",       en:"Lower abdominal pain"   },
  // أذن وأنف
  nasal_congestion:         { ar:"احتقان أنفي",          en:"Nasal congestion"       },
  hearing_clarity:          { ar:"وضوح السمع",           en:"Hearing clarity"        },
  // مسالك
  urination_frequency:      { ar:"تكرار التبول",         en:"Urination frequency"    },
  pain_urination:           { ar:"ألم عند التبول",       en:"Pain during urination"  },
};

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id:number) => AVATAR_COLORS[(id-1)%AVATAR_COLORS.length];
const getInitials = (name:string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();

const todayISO = () => {
  const n=new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
};

function formatValue(key:string, val:string|number|boolean, lang:Lang):string {
  if (typeof val==="boolean") return lang==="ar"?(val?"✓ نعم":"✗ لا"):(val?"✓ Yes":"✗ No");
  return String(val);
}

// ── Sidebar colors ─────────────────────────────────────────
const SB_BG          = "#0558a8";
const SB_BG_HEADER   = "#044d96";
const SB_BG_FOOTER   = "#044d96";
const SB_ACTIVE_BG   = "rgba(255,255,255,0.15)";
const SB_ACTIVE_TEXT = "#ffffff";
const SB_IDLE_TEXT   = "rgba(255,255,255,0.62)";
const SB_BORDER      = "rgba(255,255,255,0.1)";
const SB_INDICATOR   = "#7dd3fc";

const PillIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>;
const TrackingIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang }: { lang:Lang; setLang:(l:Lang)=>void }) {
  const isAr = lang==="ar";
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<=768);
    check(); window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);
  useEffect(()=>{
    if (isMobile&&mobileOpen) document.body.style.overflow="hidden";
    else document.body.style.overflow="";
    return ()=>{ document.body.style.overflow=""; };
  },[isMobile,mobileOpen]);

  const NAV_ICONS: Record<string,JSX.Element> = {
    dashboard:        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    patients:         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    appointments:     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    payments:         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    prescriptions:    <PillIcon/>,
    "patient-tracking":<TrackingIcon/>,
  };

  const navItems = [
    { key:"dashboard",          label:isAr?"لوحة المعلومات":"Dashboard",       href:"/dashboard"         },
    { key:"patients",           label:isAr?"المرضى":"Patients",                href:"/patients"          },
    { key:"appointments",       label:isAr?"المواعيد":"Appointments",           href:"/appointments"      },
    { key:"payments",           label:isAr?"المدفوعات":"Payments",              href:"/payments"          },
    { key:"prescriptions",      label:isAr?"الوصفات الطبية":"Prescriptions",   href:"/prescriptions"     },
    { key:"patient-tracking",   label:isAr?"متابعة المرضى":"Patient Tracking", href:"/patient-tracking"  },
  ];

  const sidebarTransform = isMobile?(mobileOpen?"translateX(0)":isAr?"translateX(100%)":"translateX(-100%)"):"translateX(0)";

  return (
    <>
      {isMobile&&mobileOpen&&<div onClick={()=>setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:55,WebkitTapHighlightColor:"transparent" }}/>}
      {isMobile&&(
        <button onClick={()=>setMobileOpen(!mobileOpen)} style={{ position:"fixed",top:14,zIndex:70,right:isAr?16:undefined,left:isAr?undefined:16,width:40,height:40,borderRadius:10,background:SB_BG,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(5,88,168,.4)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen?<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      )}
      <aside style={{ width:isMobile?260:collapsed?70:240,minHeight:"100vh",background:SB_BG,display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,right:isAr?0:undefined,left:isAr?undefined:0,zIndex:60,transform:sidebarTransform,boxShadow:isMobile&&mobileOpen?(isAr?"-8px 0 32px rgba(0,0,0,.15)":"8px 0 32px rgba(0,0,0,.15)"):(isAr?"-4px 0 32px rgba(5,88,168,.45)":"4px 0 32px rgba(5,88,168,.45)") }}>
        <div style={{ padding:collapsed?"18px 0":"18px 20px",background:SB_BG_HEADER,borderBottom:`1px solid ${SB_BORDER}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",minHeight:72 }}>
          {!collapsed&&<div style={{ display:"flex",alignItems:"center",gap:10 }}><img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,.25)" }}/><div><div style={{ fontSize:18,fontWeight:800,color:"#ffffff",lineHeight:1.1 }}>{isAr?"نبض":"NABD"}</div><div style={{ fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:400 }}>{isAr?"إدارة العيادة":"Clinic Manager"}</div></div></div>}
          {collapsed&&<img src="/Logo_Nabd.svg" alt="NABD" style={{ width:38,height:38,borderRadius:10 }}/>}
          {!isMobile&&<button onClick={()=>setCollapsed(!collapsed)} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.22)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)";}} style={{ width:28,height:28,background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.22)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:1,transition:"background .15s",flexShrink:0,marginTop:collapsed?8:0 }}>{collapsed?(isAr?"‹":"›"):(isAr?"›":"‹")}</button>}
        </div>
        <nav style={{ flex:1,padding:"12px 10px",overflowY:"auto" }}>
          {navItems.map(item=>{
            const isActive=item.key==="patient-tracking";
            return (
              <a key={item.key} href={item.href} onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)";}} onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="transparent";}}
                style={{ display:"flex",alignItems:"center",gap:collapsed?0:12,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"13px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?SB_ACTIVE_BG:"transparent",color:isActive?SB_ACTIVE_TEXT:SB_IDLE_TEXT,fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
                {isActive&&<div style={{ position:"absolute",right:isAr?-10:undefined,left:isAr?undefined:-10,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:SB_INDICATOR,borderRadius:10 }}/>}
                <span style={{ display:"flex",alignItems:"center",flexShrink:0 }}>{NAV_ICONS[item.key]}</span>
                {!collapsed&&<span>{item.label}</span>}
              </a>
            );
          })}
        </nav>
        <div style={{ padding:collapsed?"14px 10px":"14px 12px",background:SB_BG_FOOTER,borderTop:`1px solid ${SB_BORDER}` }}>
          {!collapsed&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";}} style={{ width:"100%",padding:"8px",marginBottom:10,background:"rgba(255,255,255,0.06)",border:`1px solid ${SB_BORDER}`,borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"rgba(255,255,255,0.8)",fontWeight:600,transition:"background .15s" }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
          <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href="/login"; }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.3)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.15)";}} style={{ width:"100%",padding:collapsed?"10px 0":"10px 14px",background:"rgba(192,57,43,.15)",border:"1.5px solid rgba(192,57,43,.3)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#ffb3a7",fontWeight:600,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"flex-start",gap:8,transition:"all .2s" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed&&<span style={{ fontFamily:"Rubik,sans-serif" }}>{isAr?"تسجيل الخروج":"Sign Out"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Create Link Modal (بدون اختيار نوع العيادة — تلقائي) ──
function CreateLinkModal({ lang, patients, doctorName, clinicName, userId, clinicTrackingType, onClose, onCreated }: {
  lang:Lang; patients:Patient[]; doctorName:string; clinicName:string;
  userId:string; clinicTrackingType:TrackingType;
  onClose:()=>void; onCreated:(link:TrackingLink)=>void;
}) {
  const isAr = lang==="ar";
  const clinicInfo = CLINIC_LABELS[clinicTrackingType];
  const [patientId,       setPatientId]       = useState("");
  const [notes,           setNotes]           = useState("");
  const [expiryDays,      setExpiryDays]      = useState("30");
  const [creating,        setCreating]        = useState(false);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [showCustomQ,     setShowCustomQ]     = useState(false);
  const [newQ,            setNewQ]            = useState<Partial<CustomQuestion>>({ type:"yesno" });

  function addCustomQuestion() {
    if (!newQ.label_ar) return;
    const q:CustomQuestion = {
      key:`custom_${Date.now()}`, label_ar:newQ.label_ar??"", label_en:newQ.label_en??newQ.label_ar??"",
      type:newQ.type as CustomQuestion["type"]??"yesno", min:newQ.min, max:newQ.max, unit:newQ.unit, unit_ar:newQ.unit_ar,
    };
    setCustomQuestions(prev=>[...prev,q]);
    setNewQ({ type:"yesno" });
  }

  async function handleCreate() {
    if (!patientId) return;
    setCreating(true);
    const token = crypto.randomUUID().replace(/-/g,"").slice(0,20);
    const patient = patients.find(p=>p.id===Number(patientId));
    const expiresAt = expiryDays ? new Date(Date.now()+Number(expiryDays)*86400000).toISOString() : null;
    const newLink = {
      token, patient_id:Number(patientId), patient_name:patient?.name??"",
      clinic_type:clinicTrackingType, // ← مُجبَر تلقائياً
      doctor_name:doctorName, clinic_name:clinicName,
      notes_for_patient:notes, active:true, expires_at:expiresAt,
      user_id:userId,
      custom_questions:customQuestions.length>0?customQuestions:null,
    };
    const { data,error } = await supabase.from("tracking_links").insert([newLink]).select().single();
    if (error) console.error("Error creating link:",error);
    if (!error&&data) onCreated(data);
    setCreating(false);
  }

  const inputSt = { width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",outline:"none" };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto" }}>
      <div style={{ background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",fontFamily:"Rubik,sans-serif",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22 }}>
          <div style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isAr?"🔗 إنشاء رابط متابعة":"🔗 Create Tracking Link"}</div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#aaa",lineHeight:1 }}>×</button>
        </div>

        {/* نوع العيادة — معلومة فقط، غير قابل للتغيير */}
        <div style={{ marginBottom:18,padding:"12px 16px",background:`${clinicInfo.color}10`,borderRadius:12,border:`1.5px solid ${clinicInfo.color}30`,display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:22 }}>{clinicInfo.icon}</span>
          <div>
            <div style={{ fontSize:12,fontWeight:700,color:clinicInfo.color }}>{isAr?"نوع العيادة المحدد تلقائياً":"Auto-detected Clinic Type"}</div>
            <div style={{ fontSize:14,fontWeight:600,color:"#353535",marginTop:2 }}>{isAr?clinicInfo.ar:clinicInfo.en}</div>
          </div>
        </div>

        {/* المريض */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>{isAr?"المريض":"Patient"}</label>
          <select value={patientId} onChange={e=>setPatientId(e.target.value)} style={inputSt}>
            <option value="">{isAr?"-- اختر مريضاً --":"-- Select a patient --"}</option>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* مدة الصلاحية */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>{isAr?"مدة الصلاحية":"Validity period"}</label>
          <select value={expiryDays} onChange={e=>setExpiryDays(e.target.value)} style={inputSt}>
            <option value="7">{isAr?"أسبوع واحد":"1 week"}</option>
            <option value="14">{isAr?"أسبوعان":"2 weeks"}</option>
            <option value="30">{isAr?"شهر واحد":"1 month"}</option>
            <option value="90">{isAr?"3 أشهر":"3 months"}</option>
            <option value="">{isAr?"بلا انتهاء":"No expiry"}</option>
          </select>
        </div>

        {/* ملاحظة للمريض */}
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6 }}>{isAr?"ملاحظة للمريض (اختياري)":"Note for patient (optional)"}</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={isAr?"مثال: يرجى تسجيل البيانات في الصباح...":"E.g.: Please submit your data in the morning..."} style={{ ...inputSt,resize:"vertical" as const,minHeight:70,lineHeight:1.6 }}/>
        </div>

        {/* أسئلة مخصصة */}
        <div style={{ marginBottom:22 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
            <label style={{ fontSize:12,fontWeight:600,color:"#888" }}>{isAr?"أسئلة مخصصة إضافية (اختياري)":"Additional Custom Questions (optional)"}</label>
            <button onClick={()=>setShowCustomQ(!showCustomQ)} style={{ fontSize:11,padding:"4px 10px",borderRadius:8,border:"1.5px solid rgba(8,99,186,.2)",background:"rgba(8,99,186,.06)",color:"#0863ba",fontFamily:"Rubik,sans-serif",fontWeight:600,cursor:"pointer" }}>
              {showCustomQ?(isAr?"إخفاء":"Hide"):(isAr?"+ إضافة":"+ Add")}
            </button>
          </div>
          {customQuestions.map((q,i)=>(
            <div key={q.key} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(8,99,186,.04)",borderRadius:8,border:"1px solid rgba(8,99,186,.1)",marginBottom:6 }}>
              <span style={{ fontSize:12,color:"#353535",fontWeight:600 }}>{i+1}. {q.label_ar} <span style={{ fontSize:10,color:"#aaa" }}>({q.type})</span></span>
              <button onClick={()=>setCustomQuestions(prev=>prev.filter(x=>x.key!==q.key))} style={{ background:"none",border:"none",cursor:"pointer",color:"#c0392b",fontSize:16,lineHeight:1 }}>×</button>
            </div>
          ))}
          {showCustomQ&&(
            <div style={{ padding:14,background:"#f7f9fc",borderRadius:10,border:"1.5px solid #eef0f3",marginTop:6 }}>
              <div style={{ marginBottom:10 }}>
                <input placeholder={isAr?"نص السؤال بالعربية *":"Question text (Arabic) *"} value={newQ.label_ar??""} onChange={e=>setNewQ(p=>({...p,label_ar:e.target.value}))} style={{ ...inputSt,marginBottom:6 }}/>
                <input placeholder={isAr?"نص السؤال بالإنجليزية (اختياري)":"Question text (English, optional)"} value={newQ.label_en??""} onChange={e=>setNewQ(p=>({...p,label_en:e.target.value}))} style={inputSt}/>
              </div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:10 }}>
                {(["yesno","scale","number","text"] as const).map(tp=>(
                  <button key={tp} onClick={()=>setNewQ(p=>({...p,type:tp}))} style={{ padding:"5px 12px",borderRadius:8,border:`1.5px solid ${newQ.type===tp?"#0863ba":"#eef0f3"}`,background:newQ.type===tp?"rgba(8,99,186,.08)":"#fff",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",color:newQ.type===tp?"#0863ba":"#888" }}>{tp}</button>
                ))}
              </div>
              {newQ.type==="scale"&&(
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <input type="number" placeholder="Min" value={newQ.min??""} onChange={e=>setNewQ(p=>({...p,min:Number(e.target.value)}))} style={{ ...inputSt,flex:1 }}/>
                  <input type="number" placeholder="Max" value={newQ.max??""} onChange={e=>setNewQ(p=>({...p,max:Number(e.target.value)}))} style={{ ...inputSt,flex:1 }}/>
                </div>
              )}
              {(newQ.type==="number")&&(
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <input placeholder={isAr?"الوحدة (عربي)":"Unit (Arabic)"} value={newQ.unit_ar??""} onChange={e=>setNewQ(p=>({...p,unit_ar:e.target.value}))} style={{ ...inputSt,flex:1 }}/>
                  <input placeholder={isAr?"الوحدة (إنجليزي)":"Unit (English)"} value={newQ.unit??""} onChange={e=>setNewQ(p=>({...p,unit:e.target.value}))} style={{ ...inputSt,flex:1 }}/>
                </div>
              )}
              <button onClick={addCustomQuestion} disabled={!newQ.label_ar} style={{ padding:"8px 16px",borderRadius:8,border:"none",background:newQ.label_ar?"#0863ba":"#ddd",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:newQ.label_ar?"pointer":"not-allowed" }}>
                {isAr?"إضافة السؤال":"Add Question"}
              </button>
            </div>
          )}
        </div>

        <button onClick={handleCreate} disabled={!patientId||creating} style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:patientId?"#0863ba":"#ddd",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:patientId?"pointer":"not-allowed",boxShadow:patientId?"0 4px 16px rgba(8,99,186,.3)":"none",transition:"all .2s" }}>
          {creating?(isAr?"جاري الإنشاء...":"Creating..."):(isAr?"إنشاء الرابط":"Create Link")}
        </button>
      </div>
    </div>
  );
}

// ─── Log Detail Modal ─────────────────────────────────────
function LogDetailModal({ log, lang, patientName, onClose, onSaveComment }: {
  log:DailyLog; lang:Lang; patientName:string; onClose:()=>void; onSaveComment:(logId:string,comment:string)=>void;
}) {
  const isAr = lang==="ar";
  const config = CLINIC_LABELS[log.clinic_type]??CLINIC_LABELS.general;
  const [comment, setComment] = useState(log.doctor_comment??"");
  const [saving,  setSaving]  = useState(false);

  async function handleSaveComment() {
    setSaving(true);
    await supabase.from("daily_logs").update({ doctor_comment:comment }).eq("id",log.id);
    onSaveComment(log.id,comment);
    setSaving(false);
  }

  const fieldEntries = Object.entries(log.fields??{});

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto" }}>
      <div style={{ background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",fontFamily:"Rubik,sans-serif",maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16,fontWeight:800,color:"#353535" }}>{patientName}</div>
            <div style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{log.log_date}</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#aaa" }}>×</button>
        </div>
        <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,background:`${config.color}12`,border:`1px solid ${config.color}25`,marginBottom:18 }}>
          <span style={{ fontSize:14 }}>{config.icon}</span>
          <span style={{ fontSize:12,fontWeight:600,color:config.color }}>{isAr?config.ar:config.en}</span>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18 }}>
          {fieldEntries.map(([key,val])=>{
            const label = FIELD_LABELS[key];
            const isBool = typeof val==="boolean";
            const isPos  = isBool&&val===true;
            const isNeg  = isBool&&val===false;
            return (
              <div key={key} style={{ padding:"10px 12px",borderRadius:10,background:isPos?"rgba(46,125,50,.06)":isNeg?"rgba(192,57,43,.06)":"rgba(8,99,186,.04)",border:`1px solid ${isPos?"rgba(46,125,50,.15)":isNeg?"rgba(192,57,43,.15)":"rgba(8,99,186,.1)"}` }}>
                <div style={{ fontSize:10,color:"#aaa",fontWeight:600,marginBottom:4 }}>{label?(isAr?label.ar:label.en):key}</div>
                <div style={{ fontSize:14,fontWeight:700,color:isPos?"#2e7d32":isNeg?"#c0392b":config.color }}>{formatValue(key,val,lang)}</div>
              </div>
            );
          })}
        </div>
        {log.general_notes&&(
          <div style={{ padding:"12px 14px",background:"rgba(8,99,186,.04)",borderRadius:10,border:"1px solid rgba(8,99,186,.1)",marginBottom:18 }}>
            <div style={{ fontSize:11,color:"#888",fontWeight:600,marginBottom:4 }}>{isAr?"ملاحظات المريض":"Patient Notes"}</div>
            <div style={{ fontSize:13,color:"#353535",lineHeight:1.6 }}>{log.general_notes}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:8 }}>{isAr?"تعليق الطبيب":"Doctor Comment"}</div>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder={isAr?"أضف تعليقك أو توجيهاتك...":"Add your comment or instructions..."} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none",resize:"vertical" as const,minHeight:80,lineHeight:1.6 }}/>
          <button onClick={handleSaveComment} disabled={saving} style={{ marginTop:10,padding:"10px 20px",borderRadius:10,border:"none",background:"#0863ba",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 10px rgba(8,99,186,.25)",transition:"all .2s" }}>
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
  const isAr = lang==="ar";

  const [loading,           setLoading]           = useState(true);
  const [userId,            setUserId]            = useState("");
  const [doctorName,        setDoctorName]        = useState("");
  const [clinicName,        setClinicName]        = useState("");
  const [clinicType,        setClinicType]        = useState<ClinicType>("general");
  const [clinicTrackingType,setClinicTrackingType]= useState<TrackingType>("general");
  const [patients,          setPatients]          = useState<Patient[]>([]);
  const [trackingLinks,     setTrackingLinks]     = useState<TrackingLink[]>([]);
  const [dailyLogs,         setDailyLogs]         = useState<DailyLog[]>([]);
  const [showCreateModal,   setShowCreateModal]   = useState(false);
  const [selectedLog,       setSelectedLog]       = useState<DailyLog|null>(null);
  const [selectedLink,      setSelectedLink]      = useState<string|"all">("all");
  const [filterDate,        setFilterDate]        = useState(todayISO());
  const [copiedToken,       setCopiedToken]       = useState<string|null>(null);
  const [activeTab,         setActiveTab]         = useState<"logs"|"links">("logs");

  useEffect(()=>{ loadData(); },[]);

  // Realtime subscription
  useEffect(()=>{
    if (!userId) return;
    const channel = supabase.channel("daily_logs_realtime")
      .on("postgres_changes",{ event:"INSERT",schema:"public",table:"daily_logs" },(payload)=>{
        const newLog = payload.new as DailyLog;
        setTrackingLinks(links=>{
          const myTokens = links.map(l=>l.token);
          if (myTokens.includes(newLog.token)) {
            setDailyLogs(prev=>{
              const exists = prev.some(l=>l.id===newLog.id);
              if (exists) return prev;
              return [newLog,...prev];
            });
          }
          return links;
        });
      }).subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[userId]);

  async function loadData() {
    setLoading(true);
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // ── قراءة نوع العيادة من جدول clinics ──────────────────
    const { data:clinicData } = await supabase.from("clinics").select("clinic_type,name").eq("user_id",user.id).maybeSingle();
    if (clinicData?.clinic_type) {
      const ct = clinicData.clinic_type as ClinicType;
      setClinicType(ct);
      setClinicTrackingType(CLINIC_TO_TRACKING[ct]??"general");
      if (clinicData.name) setClinicName(clinicData.name);
    }

    // ── قراءة اسم الطبيب ───────────────────────────────────
    const { data:profile } = await supabase.from("profiles").select("full_name,clinic_name").eq("id",user.id).single();
    if (profile) {
      setDoctorName(profile.full_name??"");
      if (!clinicData?.name&&profile.clinic_name) setClinicName(profile.clinic_name);
    }

    const { data:pats } = await supabase.from("patients").select("id, name").eq("user_id",user.id).eq("is_hidden",false);
    setPatients(pats??[]);

    const { data:links,error:linksError } = await supabase.from("tracking_links").select("*").eq("user_id",user.id).order("created_at",{ ascending:false });
    if (linksError) console.error("Error loading links:",linksError);
    setTrackingLinks(links??[]);

    const tokens = (links??[]).map(l=>l.token);
    if (tokens.length>0) {
      const { data:logs,error:logsError } = await supabase.from("daily_logs").select("*").in("token",tokens).order("log_date",{ ascending:false });
      if (logsError) console.error("Error loading logs:",logsError);
      setDailyLogs(logs??[]);
    }
    setLoading(false);
  }

  function handleLinkCreated(link:TrackingLink) {
    setTrackingLinks(prev=>[link,...prev]);
    setShowCreateModal(false);
    setActiveTab("links");
  }

  function copyLink(token:string) {
    const url=`${window.location.origin}/daily-log/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(()=>setCopiedToken(null),2500);
  }

  function shareWhatsApp(token:string, patientName:string) {
    const url=`${window.location.origin}/daily-log/${token}`;
    const text=isAr
      ?`مرحباً ${patientName} 👋\nهذا رابط متابعتك اليومية من عيادة ${clinicName}.\nيرجى تسجيل بياناتك يومياً:\n${url}`
      :`Hello ${patientName} 👋\nHere is your daily tracking link from ${clinicName}:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  }

  async function toggleLinkActive(linkId:string, current:boolean) {
    await supabase.from("tracking_links").update({ active:!current }).eq("id",linkId);
    setTrackingLinks(prev=>prev.map(l=>l.id===linkId?{...l,active:!current}:l));
  }

  function handleSaveComment(logId:string, comment:string) {
    setDailyLogs(prev=>prev.map(l=>l.id===logId?{...l,doctor_comment:comment}:l));
    setSelectedLog(prev=>prev?{...prev,doctor_comment:comment}:prev);
  }

  const filteredLogs = dailyLogs.filter(log=>{
    const matchesLink = selectedLink==="all"||log.token===selectedLink;
    const matchesDate = !filterDate||log.log_date===filterDate;
    return matchesLink&&matchesDate;
  });

  const todayLogs   = dailyLogs.filter(l=>l.log_date===todayISO()).length;
  const activeLinks = trackingLinks.filter(l=>l.active).length;
  const missedToday = activeLinks-todayLogs;
  const sidebarW    = 240;
  const clinicMeta  = CLINIC_LABELS[clinicTrackingType]??CLINIC_LABELS.general;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Rubik',sans-serif; background:#f7f9fc; }
        .pt-root { direction:${isAr?"rtl":"ltr"}; min-height:100vh; background:#f7f9fc; }
        .log-row { background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #eef0f3;margin-bottom:10px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .18s;box-shadow:0 2px 10px rgba(8,99,186,.04); }
        .log-row:hover { border-color:rgba(8,99,186,.3);box-shadow:0 4px 18px rgba(8,99,186,.1);transform:translateY(-1px); }
        .link-row { background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #eef0f3;margin-bottom:10px;box-shadow:0 2px 10px rgba(8,99,186,.04);transition:border-color .18s; }
        .tab-btn { padding:8px 20px;border-radius:20px;border:1.5px solid #eef0f3;background:#f7f9fc;font-family:'Rubik',sans-serif;font-size:13px;font-weight:600;cursor:pointer;color:#888;transition:all .18s; }
        .tab-btn.active { background:rgba(8,99,186,.08);border-color:rgba(8,99,186,.3);color:#0863ba; }
        .wa-btn { display:flex;align-items:center;gap:6px;padding:7px 14px;border:none;background:#25D366;color:#fff;font-family:'Rubik',sans-serif;font-size:12px;font-weight:700;cursor:pointer;border-radius:8px;transition:all .18s; }
        .wa-btn:hover { background:#1eb858; }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeInUp .4s cubic-bezier(.4,0,.2,1) both; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .pulse { animation:pulse 1.5s ease infinite; }
        @media(max-width:768px){
          .pt-main{margin-left:0!important;margin-right:0!important;padding:70px 16px 40px!important}
          .pt-header{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
          .pt-stats{grid-template-columns:1fr 1fr!important}
        }
      `}</style>

      <div className="pt-root">
        <Sidebar lang={lang} setLang={setLang}/>

        <main className="pt-main" style={{ [isAr?"marginRight":"marginLeft"]:sidebarW,padding:"32px 28px",transition:"margin .3s cubic-bezier(.4,0,.2,1)",minHeight:"100vh" }}>

          {loading&&(
            <div style={{ textAlign:"center",padding:"80px 0" }}>
              <div style={{ fontSize:36,marginBottom:12 }} className="pulse">📊</div>
              <div style={{ fontSize:13,color:"#aaa" }}>{isAr?"جاري التحميل...":"Loading..."}</div>
            </div>
          )}

          {!loading&&(
            <>
              {/* Header */}
              <div className="fade-up pt-header" style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28,flexWrap:"wrap",gap:12 }}>
                <div>
                  <h1 style={{ fontSize:24,fontWeight:800,color:"#353535",marginBottom:6 }}>📊 {isAr?"متابعة المرضى":"Patient Tracking"}</h1>
                  {/* شارة نوع العيادة */}
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:20,background:`${clinicMeta.color}12`,border:`1.5px solid ${clinicMeta.color}30` }}>
                    <span style={{ fontSize:16 }}>{clinicMeta.icon}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:clinicMeta.color }}>{isAr?clinicMeta.ar:clinicMeta.en}</span>
                    <span style={{ fontSize:11,color:"#aaa" }}>— {isAr?"نوع العيادة":"Clinic Type"}</span>
                  </div>
                </div>
                <button onClick={()=>setShowCreateModal(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 20px",borderRadius:12,border:"none",background:clinicMeta.color,color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${clinicMeta.color}40`,transition:"all .2s" }}>
                  <span style={{ fontSize:16 }}>🔗</span>
                  {isAr?"إنشاء رابط متابعة":"Create Tracking Link"}
                </button>
              </div>

              {/* Stats */}
              <div className="fade-up pt-stats" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:26 }}>
                {[
                  { icon:"📋", label:isAr?"تقارير اليوم":"Today's Reports",    value:todayLogs,              color:"#0863ba" },
                  { icon:"🔗", label:isAr?"روابط نشطة":"Active Links",          value:activeLinks,            color:"#2e7d32" },
                  { icon:"⚠️", label:isAr?"لم يسجّلوا اليوم":"Not Logged Yet",  value:Math.max(missedToday,0),color:"#e67e22" },
                  { icon:"📝", label:isAr?"إجمالي التقارير":"Total Reports",    value:dailyLogs.length,       color:"#8e44ad" },
                ].map((s,i)=>(
                  <div key={i} style={{ background:"#fff",borderRadius:14,padding:"18px 20px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)",position:"relative",overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:s.color,borderRadius:"14px 14px 0 0" }}/>
                    <div style={{ fontSize:22,marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontSize:26,fontWeight:800,color:s.color,lineHeight:1,marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:12,color:"#888",fontWeight:500 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="fade-up" style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>
                <button className={`tab-btn${activeTab==="logs"?" active":""}`} onClick={()=>setActiveTab("logs")}>{isAr?"التقارير اليومية":"Daily Reports"}</button>
                <button className={`tab-btn${activeTab==="links"?" active":""}`} onClick={()=>setActiveTab("links")}>{isAr?"روابط المتابعة":"Tracking Links"}</button>
              </div>

              {/* ── Tab: Logs ── */}
              {activeTab==="logs"&&(
                <div className="fade-up">
                  <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
                    <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ padding:"8px 12px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none" }}/>
                    <select value={selectedLink} onChange={e=>setSelectedLink(e.target.value)} style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none" }}>
                      <option value="all">{isAr?"كل المرضى":"All Patients"}</option>
                      {trackingLinks.map(l=><option key={l.token} value={l.token}>{l.patient_name}</option>)}
                    </select>
                    {(filterDate||selectedLink!=="all")&&(
                      <button onClick={()=>{ setFilterDate(""); setSelectedLink("all"); }} style={{ padding:"8px 14px",borderRadius:10,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.06)",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,color:"#c0392b",cursor:"pointer" }}>
                        {isAr?"مسح الفلتر":"Clear Filter"}
                      </button>
                    )}
                  </div>

                  {filteredLogs.length===0?(
                    <div style={{ textAlign:"center",padding:"60px 0",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3" }}>
                      <div style={{ fontSize:36,marginBottom:12 }}>📭</div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#888" }}>{isAr?"لا توجد تقارير لهذا التاريخ":"No reports for this date"}</div>
                    </div>
                  ):filteredLogs.map((log,idx)=>{
                    const link    = trackingLinks.find(l=>l.token===log.token);
                    const clinic  = CLINIC_LABELS[log.clinic_type]??CLINIC_LABELS.general;
                    const hasComment = !!log.doctor_comment;
                    return (
                      <div key={log.id} className="log-row fade-up" style={{ animationDelay:`${idx*0.05}s` }} onClick={()=>setSelectedLog(log)}>
                        <div style={{ width:42,height:42,borderRadius:12,flexShrink:0,background:getColor(log.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700 }}>
                          {getInitials(link?.patient_name??"?")}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:2 }}>{link?.patient_name??"—"}</div>
                          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                            <span style={{ fontSize:11,padding:"2px 8px",borderRadius:10,background:`${clinic.color}12`,color:clinic.color,fontWeight:600 }}>{clinic.icon} {isAr?clinic.ar:clinic.en}</span>
                            <span style={{ fontSize:11,color:"#aaa" }}>📅 {log.log_date}</span>
                            {hasComment&&<span style={{ fontSize:11,color:"#2e7d32",fontWeight:600 }}>💬 {isAr?"مُعلَّق":"Commented"}</span>}
                          </div>
                        </div>
                        <div style={{ display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end" }}>
                          {Object.entries(log.fields??{}).slice(0,3).map(([k,v])=>(
                            <div key={k} style={{ padding:"4px 8px",borderRadius:8,background:"rgba(8,99,186,.06)",fontSize:11,fontWeight:600,color:"#0863ba" }}>{formatValue(k,v,lang)}</div>
                          ))}
                        </div>
                        <div style={{ color:"#bbb",fontSize:18,flexShrink:0 }}>{isAr?"‹":"›"}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Tab: Links ── */}
              {activeTab==="links"&&(
                <div className="fade-up">
                  {trackingLinks.length===0?(
                    <div style={{ textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3" }}>
                      <div style={{ fontSize:36,marginBottom:12 }}>🔗</div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#888",marginBottom:8 }}>{isAr?"لا توجد روابط بعد":"No links yet"}</div>
                    </div>
                  ):trackingLinks.map((link,idx)=>{
                    const clinic    = CLINIC_LABELS[link.clinic_type]??CLINIC_LABELS.general;
                    const logsCount = dailyLogs.filter(l=>l.token===link.token).length;
                    const lastLog   = dailyLogs.find(l=>l.token===link.token);
                    const loggedToday = dailyLogs.some(l=>l.token===link.token&&l.log_date===todayISO());
                    const url = typeof window!=="undefined"?`${window.location.origin}/daily-log/${link.token}`:"";
                    return (
                      <div key={link.id} className="link-row fade-up" style={{ animationDelay:`${idx*0.06}s`,opacity:link.active?1:0.6 }}>
                        <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:12 }}>
                          <div style={{ width:40,height:40,borderRadius:10,flexShrink:0,background:getColor(link.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700 }}>
                            {getInitials(link.patient_name)}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4 }}>
                              <span style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{link.patient_name}</span>
                              <span style={{ fontSize:10,padding:"2px 8px",borderRadius:10,background:link.active?"rgba(46,125,50,.1)":"rgba(120,120,120,.1)",color:link.active?"#2e7d32":"#888",fontWeight:600 }}>
                                {link.active?(isAr?"نشط":"Active"):(isAr?"متوقف":"Inactive")}
                              </span>
                              <span style={{ fontSize:10,padding:"2px 8px",borderRadius:10,background:`${clinic.color}12`,color:clinic.color,fontWeight:600 }}>
                                {clinic.icon} {isAr?clinic.ar:clinic.en}
                              </span>
                            </div>
                            <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
                              <span style={{ fontSize:11,color:"#aaa" }}>{isAr?"تقارير:":"Reports:"} <b style={{ color:"#0863ba" }}>{logsCount}</b></span>
                              {lastLog&&<span style={{ fontSize:11,color:"#aaa" }}>{isAr?"آخر تسجيل:":"Last log:"} <b style={{ color:"#353535" }}>{lastLog.log_date}</b></span>}
                              {!loggedToday&&link.active&&<span style={{ fontSize:11,color:"#e67e22",fontWeight:600 }}>⚠️ {isAr?"لم يسجّل اليوم":"Not submitted today"}</span>}
                              {loggedToday&&<span style={{ fontSize:11,color:"#2e7d32",fontWeight:600 }}>✓ {isAr?"سجّل اليوم":"Logged today"}</span>}
                            </div>
                          </div>
                          <button onClick={()=>toggleLinkActive(link.id,link.active)} style={{ padding:"5px 10px",borderRadius:8,border:`1px solid ${link.active?"rgba(192,57,43,.2)":"rgba(46,125,50,.2)"}`,background:link.active?"rgba(192,57,43,.06)":"rgba(46,125,50,.06)",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",color:link.active?"#c0392b":"#2e7d32",flexShrink:0 }}>
                            {link.active?(isAr?"إيقاف":"Deactivate"):(isAr?"تفعيل":"Activate")}
                          </button>
                        </div>
                        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                          <div style={{ flex:1,padding:"7px 12px",background:"#f7f9fc",borderRadius:8,border:"1px solid #eef0f3",fontSize:11,color:"#888",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"ltr",textAlign:"left" }}>{url}</div>
                          <button onClick={()=>copyLink(link.token)} style={{ padding:"7px 12px",borderRadius:8,border:"1.5px solid #eef0f3",background:copiedToken===link.token?"rgba(46,125,50,.06)":"#fff",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",color:copiedToken===link.token?"#2e7d32":"#666",transition:"all .2s",flexShrink:0 }}>
                            {copiedToken===link.token?(isAr?"✓ تم النسخ":"✓ Copied"):(isAr?"نسخ":"Copy")}
                          </button>
                          <button className="wa-btn" onClick={()=>shareWhatsApp(link.token,link.patient_name)}>
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

      {showCreateModal&&(
        <CreateLinkModal lang={lang} patients={patients} doctorName={doctorName} clinicName={clinicName} userId={userId} clinicTrackingType={clinicTrackingType} onClose={()=>setShowCreateModal(false)} onCreated={handleLinkCreated}/>
      )}
      {selectedLog&&(
        <LogDetailModal log={selectedLog} lang={lang} patientName={trackingLinks.find(l=>l.token===selectedLog.token)?.patient_name??"—"} onClose={()=>setSelectedLog(null)} onSaveComment={handleSaveComment}/>
      )}
    </>
  );
}