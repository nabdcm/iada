"use client";

// ============================================================
// NABD - نبض | Patient Tracking — clinic_type تلقائي من الأدمن
// التغيير الجذري: لا يختار الطبيب نوع العيادة يدوياً
// يُقرأ تلقائياً من جدول clinics ← أدمن
// ============================================================

import { useState, useEffect, type JSX } from "react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "en";

const CLINIC_TYPE_TO_TRACKING: Record<string, string> = {
  general:"general", dental:"dental", dermatology:"skin_care",
  cosmetic:"cosmetic", pediatrics:"general", physical_therapy:"physical_therapy",
  mental_health:"mental_health", nutrition:"nutrition", ophthalmology:"ophthalmology",
  orthopedic:"orthopedic", cardiology:"general", gynecology:"general",
  ent:"general", urology:"general", other:"general", skin_care:"skin_care",
};

const CLINIC_LABELS: Record<string, { ar:string; en:string; icon:string; color:string }> = {
  skin_care:        { ar:"عناية بالبشرة",   en:"Skin Care",        icon:"✨", color:"#e67e22" },
  cosmetic:         { ar:"التجميل",          en:"Cosmetic",         icon:"💎", color:"#8e44ad" },
  physical_therapy: { ar:"علاج فيزيائي",     en:"Physical Therapy", icon:"🏃", color:"#2e7d32" },
  dental:           { ar:"الأسنان",          en:"Dental",           icon:"🦷", color:"#0863ba" },
  general:          { ar:"طب عام",           en:"General Medicine", icon:"🩺", color:"#16a085" },
  nutrition:        { ar:"التغذية",          en:"Nutrition",        icon:"🥗", color:"#27ae60" },
  ophthalmology:    { ar:"طب العيون",        en:"Ophthalmology",    icon:"👁", color:"#2980b9" },
  orthopedic:       { ar:"العظام والمفاصل",  en:"Orthopedics",      icon:"🦴", color:"#c0392b" },
  mental_health:    { ar:"الصحة النفسية",   en:"Mental Health",    icon:"🧠", color:"#6c3fc5" },
};

const ADMIN_META: Record<string, { ar:string; en:string; icon:string; color:string }> = {
  general:          { icon:"🏥", color:"#16a085", ar:"طب عام",           en:"General Medicine"   },
  dental:           { icon:"🦷", color:"#0863ba", ar:"أسنان",            en:"Dental"             },
  dermatology:      { icon:"🧴", color:"#e67e22", ar:"جلدية",            en:"Dermatology"        },
  cosmetic:         { icon:"💆", color:"#8e44ad", ar:"تجميلية",          en:"Cosmetic"           },
  pediatrics:       { icon:"👶", color:"#27ae60", ar:"أطفال",            en:"Pediatrics"         },
  physical_therapy: { icon:"🏃", color:"#2e7d32", ar:"علاج فيزيائي",    en:"Physical Therapy"   },
  mental_health:    { icon:"🧠", color:"#6c3fc5", ar:"صحة نفسية",       en:"Mental Health"      },
  nutrition:        { icon:"🥗", color:"#27ae60", ar:"تغذية",            en:"Nutrition"          },
  ophthalmology:    { icon:"👁", color:"#2980b9", ar:"عيون",             en:"Ophthalmology"      },
  orthopedic:       { icon:"🦴", color:"#c0392b", ar:"عظام ومفاصل",     en:"Orthopedics"        },
  cardiology:       { icon:"❤️", color:"#e74c3c", ar:"قلب وشرايين",     en:"Cardiology"         },
  gynecology:       { icon:"🌸", color:"#e91e63", ar:"نساء وتوليد",     en:"Gynecology"         },
  ent:              { icon:"👂", color:"#795548", ar:"أنف وأذن وحنجرة", en:"ENT"                },
  urology:          { icon:"💧", color:"#2196f3", ar:"مسالك بولية",     en:"Urology"            },
  other:            { icon:"🏨", color:"#607d8b", ar:"أخرى",            en:"Other"              },
};

const FIELD_LABELS: Record<string,{ar:string;en:string}> = {
  applied_medication:{ar:"طبّق الدواء",en:"Applied medication"},
  skin_condition:{ar:"حالة البشرة",en:"Skin condition"},
  new_pimples:{ar:"حبوب جديدة",en:"New pimples"},
  redness_level:{ar:"الاحمرار",en:"Redness"},
  moisturizer_used:{ar:"استخدم المرطّب",en:"Moisturizer"},
  water_intake:{ar:"الماء",en:"Water"},
  followed_instructions:{ar:"اتبع التعليمات",en:"Instructions"},
  swelling_level:{ar:"التورم",en:"Swelling"},
  pain_level:{ar:"الألم",en:"Pain"},
  result_satisfaction:{ar:"الرضا",en:"Satisfaction"},
  bruising:{ar:"كدمات",en:"Bruising"},
  did_exercises:{ar:"التمارين",en:"Exercises"},
  exercise_reps:{ar:"التكرارات",en:"Reps"},
  pain_before:{ar:"الألم قبل",en:"Pain before"},
  pain_after:{ar:"الألم بعد",en:"Pain after"},
  mobility:{ar:"الحركة",en:"Mobility"},
  swelling:{ar:"تورم",en:"Swelling"},
  applied_ice_heat:{ar:"كمادات",en:"Ice/Heat"},
  brushing_times:{ar:"مرات التنظيف",en:"Brushing"},
  flossed:{ar:"خيط الأسنان",en:"Flossed"},
  avoided_restricted_foods:{ar:"تجنّب الممنوعات",en:"Restricted foods"},
  bleeding_gums:{ar:"نزف اللثة",en:"Gum bleeding"},
  sensitivity:{ar:"الحساسية",en:"Sensitivity"},
  temperature:{ar:"الحرارة",en:"Temperature"},
  blood_pressure_sys:{ar:"الضغط الانقباضي",en:"Systolic BP"},
  blood_pressure_dia:{ar:"الضغط الانبساطي",en:"Diastolic BP"},
  took_medication:{ar:"تناول الدواء",en:"Medication"},
  energy_level:{ar:"الطاقة",en:"Energy"},
  symptoms:{ar:"الأعراض",en:"Symptoms"},
  followed_diet:{ar:"اتبع الحمية",en:"Diet"},
  weight:{ar:"الوزن",en:"Weight"},
  meals_count:{ar:"الوجبات",en:"Meals"},
  exercise_done:{ar:"رياضة",en:"Exercise"},
  hunger_level:{ar:"الجوع",en:"Hunger"},
  mood:{ar:"المزاج",en:"Mood"},
  used_drops:{ar:"القطرات",en:"Eye drops"},
  drops_times:{ar:"مرات القطرات",en:"Drop times"},
  vision_clarity:{ar:"وضوح الرؤية",en:"Vision"},
  eye_redness:{ar:"احمرار العين",en:"Eye redness"},
  pain_discomfort:{ar:"ألم العين",en:"Eye pain"},
  avoided_screen:{ar:"قلّل الشاشات",en:"Screen time"},
  mood_level:{ar:"مستوى المزاج",en:"Mood level"},
  anxiety_level:{ar:"القلق",en:"Anxiety"},
  sleep_hours:{ar:"ساعات النوم",en:"Sleep hours"},
  sleep_quality:{ar:"جودة النوم",en:"Sleep quality"},
  negative_thoughts:{ar:"أفكار سلبية",en:"Neg. thoughts"},
  social_interaction:{ar:"التفاعل الاجتماعي",en:"Social interact."},
  did_activity:{ar:"نشاط ممتع",en:"Activity"},
  overall_wellbeing:{ar:"الصحة النفسية",en:"Wellbeing"},
};

interface CustomQuestion { key:string; label_ar:string; label_en:string; type:"scale"|"yesno"|"number"|"text"; min?:number; max?:number; }
interface TrackingLink { id:string; token:string; patient_id:number; patient_name:string; clinic_type:string; doctor_name:string; clinic_name:string; notes_for_patient:string; active:boolean; created_at:string; expires_at:string|null; custom_questions?:CustomQuestion[]|null; }
interface DailyLog { id:string; token:string; patient_id:number; clinic_type:string; log_date:string; fields:Record<string,string|number|boolean>; general_notes:string; submitted_at:string; doctor_comment?:string; }
interface Patient { id:number; name:string; }

const AVT=["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const gc=(id:number)=>AVT[(id-1)%AVT.length];
const gi=(n:string)=>n.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const tISO=()=>{ const n=new Date(); return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0"); };
const fmtV=(v:string|number|boolean,l:Lang):string=>{ if(typeof v==="boolean")return l==="ar"?(v?"✓ نعم":"✗ لا"):(v?"✓ Yes":"✗ No"); return String(v); };

const SB="#0558a8";const SH="#044d96";const SABG="rgba(255,255,255,0.15)";const SAT="#fff";const SIT="rgba(255,255,255,0.62)";const SBD="rgba(255,255,255,0.1)";const SIND="#7dd3fc";

// ─── Plan access rules ────────────────────────────────────
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

const isSharedPlan = (plan: PlanType): boolean =>
  plan === "shared_basic" || plan === "shared_pro" || plan === "shared_enterprise";

const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;
const PLAN_BADGE: Record<PlanType,{label:{ar:string;en:string};color:string}> = {
  basic:             {label:{ar:"الأساسية",           en:"Basic"},           color:"#0863ba"},
  pro:               {label:{ar:"الاحترافية",         en:"Professional"},    color:"#7b2d8b"},
  enterprise:        {label:{ar:"الشاملة",            en:"Comprehensive"},   color:"#e67e22"},
  shared_basic:      {label:{ar:"مشتركة - أساسية",   en:"Shared - Basic"},  color:"#0e7c6a"},
  shared_pro:        {label:{ar:"مشتركة - احترافية", en:"Shared - Pro"},    color:"#b5451b"},
  shared_enterprise: {label:{ar:"مشتركة - شاملة",   en:"Shared - Full"},   color:"#4a1480"},
};

function Sidebar({lang,setLang,plan="basic"}:{lang:Lang;setLang:(l:Lang)=>void;plan?:PlanType}) {
  const isAr=lang==="ar";
  const [col,setCol]=useState(false);
  const [mob,setMob]=useState(false);
  const [mO,setMO]=useState(false);
  useEffect(()=>{const c=()=>setMob(window.innerWidth<=768);c();window.addEventListener("resize",c);return()=>window.removeEventListener("resize",c);},[]);
  useEffect(()=>{if(mob&&mO)document.body.style.overflow="hidden";else document.body.style.overflow="";return()=>{document.body.style.overflow="";};},[mob,mO]);
  const nav=[
    {k:"dashboard",l:isAr?"لوحة المعلومات":"Dashboard",href:"/dashboard"},
    {k:"patients",l:isAr?"المرضى":"Patients",href:"/patients"},
    {k:"appointments",l:isAr?"المواعيد":"Appointments",href:"/appointments"},
    {k:"payments",l:isAr?"المدفوعات":"Payments",href:"/payments"},
    {k:"prescriptions",l:isAr?"الوصفات الطبية":"Prescriptions",href:"/prescriptions"},
    {k:"tracking",l:isAr?"متابعة المرضى":"Patient Tracking",href:"/patient-tracking"},
  ];
  const sT=mob?(mO?"translateX(0)":isAr?"translateX(100%)":"translateX(-100%)"):"translateX(0)";
  return (
    <>
      {mob&&mO&&<div onClick={()=>setMO(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:55}}/>}
      {mob&&<button onClick={()=>setMO(!mO)} style={{position:"fixed",top:14,zIndex:70,right:isAr?16:undefined,left:isAr?undefined:16,width:40,height:40,borderRadius:10,background:SB,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(5,88,168,.4)"}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">{mO?<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}</svg>
      </button>}
      <aside style={{width:mob?260:col?70:240,minHeight:"100vh",background:SB,display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1),width .3s",position:"fixed",top:0,right:isAr?0:undefined,left:isAr?undefined:0,zIndex:60,transform:sT,boxShadow:isAr?"-4px 0 32px rgba(5,88,168,.45)":"4px 0 32px rgba(5,88,168,.45)"}}>
        <div style={{padding:col?"18px 0":"18px 20px",background:SH,borderBottom:"1px solid "+SBD,display:"flex",alignItems:"center",justifyContent:col?"center":"space-between",minHeight:72}}>
          {!col&&<div style={{display:"flex",alignItems:"center",gap:10}}><img src="/Logo_Nabd.svg" alt="NABD" style={{width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}/><div><div style={{fontSize:18,fontWeight:800,color:"#fff",lineHeight:1.1}}>{isAr?"نبض":"NABD"}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.55)"}}>{isAr?"إدارة العيادة":"Clinic Manager"}</div></div></div>}
          {col&&<img src="/Logo_Nabd.svg" alt="NABD" style={{width:38,height:38,borderRadius:10}}/>}
          {!mob&&<button onClick={()=>setCol(!col)} style={{width:28,height:28,background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.22)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.9)",fontSize:14,flexShrink:0,marginTop:col?8:0}}>{col?(isAr?"‹":"›"):(isAr?"›":"‹")}</button>}
        </div>
        <nav style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>
          {nav.map(item=>{
            const act=item.k==="tracking";
            const locked=!canAccess(item.k,plan);
            const lockLabel=isAr?"غير متاح في خطتك":"Not available in your plan";
            return <a key={item.k}
              href={locked?undefined:item.href}
              title={col?(locked?lockLabel:item.l):(locked?lockLabel:undefined)}
              onClick={locked?(e)=>e.preventDefault():undefined}
              style={{display:"flex",alignItems:"center",gap:col?0:12,justifyContent:col?"center":"flex-start",padding:col?"13px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:act?SABG:"transparent",color:locked?"rgba(255,255,255,0.28)":(act?SAT:SIT),fontWeight:act?600:400,fontSize:14,transition:"all .18s",position:"relative",cursor:locked?"not-allowed":"pointer",opacity:locked?0.5:1}}>
              {act&&<div style={{position:"absolute",right:isAr?-10:undefined,left:isAr?undefined:-10,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:SIND,borderRadius:10}}/>}
              {!col&&<span style={{flex:1}}>{item.l}</span>}
              {locked&&!col&&<span style={{fontSize:11,opacity:0.7}}>🔒</span>}
            </a>;
          })}
        </nav>
        <div style={{padding:col?"14px 10px":"14px 12px",background:SH,borderTop:"1px solid "+SBD}}>
          {!col&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",marginBottom:8,background:"rgba(255,255,255,0.08)",border:`1.5px solid ${PLAN_BADGE[plan].color}50`,borderRadius:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:PLAN_BADGE[plan].color,flexShrink:0}}/>
                <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",flex:1}}>{isAr?"خطة":"Plan"}</span>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
                  <span style={{fontSize:11,fontWeight:700,color:PLAN_BADGE[plan].color}}>{PLAN_BADGE[plan].label[lang]}</span>
                  {isSharedPlan(plan)&&<span style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>{isAr?"👥 عيادة مشتركة":"👥 Shared clinic"}</span>}
                </div>
              </div>
              <button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{width:"100%",padding:"8px",marginBottom:10,background:"rgba(255,255,255,0.06)",border:"1px solid "+SBD,borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"rgba(255,255,255,0.8)",fontWeight:600}}>🌐 {lang==="ar"?"English":"العربية"}</button>
            </>
          )}
          <button onClick={async()=>{await supabase.auth.signOut();window.location.href="/login";}} style={{width:"100%",padding:col?"10px 0":"10px 14px",background:"rgba(192,57,43,.15)",border:"1.5px solid rgba(192,57,43,.3)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#ffb3a7",fontWeight:600,display:"flex",alignItems:"center",justifyContent:col?"center":"flex-start",gap:8}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!col&&<span style={{fontFamily:"Rubik,sans-serif"}}>{isAr?"تسجيل الخروج":"Sign Out"}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function CreateLinkModal({lang,patients,doctorName,clinicName,userId,clinicTrackingType,adminClinicType,onClose,onCreated}:{lang:Lang;patients:Patient[];doctorName:string;clinicName:string;userId:string;clinicTrackingType:string;adminClinicType:string;onClose:()=>void;onCreated:(l:TrackingLink)=>void;}) {
  const isAr=lang==="ar";
  const [pid,setPid]=useState("");
  const [notes,setNotes]=useState("");
  const [exp,setExp]=useState("30");
  const [creating,setCreating]=useState(false);
  const [cqs,setCqs]=useState<CustomQuestion[]>([]);
  const [showCQ,setShowCQ]=useState(false);
  const [nq,setNq]=useState({label_ar:"",type:"yesno"});
  const am=ADMIN_META[adminClinicType]??ADMIN_META.general;
  const tm=CLINIC_LABELS[clinicTrackingType]??CLINIC_LABELS.general;
  const IS:React.CSSProperties={width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",outline:"none"};
  function addCQ(){if(!nq.label_ar.trim())return;setCqs(p=>[...p,{key:"cq_"+Date.now(),label_ar:nq.label_ar,label_en:nq.label_ar,type:nq.type as "yesno"|"scale"|"number"|"text"}]);setNq({label_ar:"",type:"yesno"});}
  async function create(){
    if(!pid)return;setCreating(true);
    const tok=crypto.randomUUID().replace(/-/g,"").slice(0,20);
    const p=patients.find(x=>x.id===Number(pid));
    const ea=exp?new Date(Date.now()+Number(exp)*86400000).toISOString():null;
    const {data,error}=await supabase.from("tracking_links").insert([{token:tok,patient_id:Number(pid),patient_name:p?.name??"",clinic_type:clinicTrackingType,doctor_name:doctorName,clinic_name:clinicName,notes_for_patient:notes,active:true,expires_at:ea,user_id:userId,custom_questions:cqs.length>0?cqs:null}]).select().single();
    if(!error&&data)onCreated(data);
    setCreating(false);
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",fontFamily:"Rubik,sans-serif",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{fontSize:17,fontWeight:800,color:"#353535"}}>🔗 {isAr?"إنشاء رابط متابعة":"Create Tracking Link"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#aaa",lineHeight:1}}>×</button>
        </div>
        <div style={{marginBottom:14,padding:"12px 16px",background:am.color+"10",border:"1.5px solid "+am.color+"30",borderRadius:12,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>{am.icon}</span>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:am.color}}>{isAr?am.ar:am.en}</div><div style={{fontSize:11,color:"#aaa"}}>{isAr?"نوع العيادة — محدد تلقائياً":"Clinic type — auto-set"}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:12,background:tm.color+"12",border:"1px solid "+tm.color+"25"}}><span style={{fontSize:14}}>{tm.icon}</span><span style={{fontSize:11,fontWeight:600,color:tm.color}}>{isAr?tm.ar:tm.en}</span></div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6}}>{isAr?"المريض *":"Patient *"}</label>
          <select value={pid} onChange={e=>setPid(e.target.value)} style={IS}>
            <option value="">{isAr?"-- اختر مريضاً --":"-- Select patient --"}</option>
            {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6}}>{isAr?"مدة الصلاحية":"Validity"}</label>
          <select value={exp} onChange={e=>setExp(e.target.value)} style={IS}>
            <option value="7">{isAr?"أسبوع":"1 week"}</option>
            <option value="14">{isAr?"أسبوعان":"2 weeks"}</option>
            <option value="30">{isAr?"شهر":"1 month"}</option>
            <option value="90">{isAr?"3 أشهر":"3 months"}</option>
            <option value="">{isAr?"بلا انتهاء":"No expiry"}</option>
          </select>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#888",display:"block",marginBottom:6}}>{isAr?"ملاحظة للمريض":"Patient Note"}</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder={isAr?"ملاحظة اختيارية...":"Optional note..."} style={{...IS,resize:"vertical",minHeight:60} as React.CSSProperties}/>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <label style={{fontSize:12,fontWeight:600,color:"#888"}}>{isAr?"أسئلة إضافية (اختياري)":"Custom Questions (optional)"}</label>
            <button onClick={()=>setShowCQ(!showCQ)} style={{fontSize:11,padding:"4px 10px",borderRadius:8,border:"1.5px solid rgba(8,99,186,.2)",background:"rgba(8,99,186,.06)",color:"#0863ba",fontFamily:"Rubik,sans-serif",fontWeight:600,cursor:"pointer"}}>{showCQ?(isAr?"إغلاق":"Close"):(isAr?"+ إضافة":"+ Add")}</button>
          </div>
          {cqs.map((q,i)=><div key={q.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 12px",background:"rgba(8,99,186,.04)",borderRadius:8,border:"1px solid rgba(8,99,186,.1)",marginBottom:5}}><span style={{fontSize:12,color:"#353535",fontWeight:600}}>{i+1}. {q.label_ar} <span style={{fontSize:10,color:"#aaa"}}>({q.type})</span></span><button onClick={()=>setCqs(p=>p.filter(x=>x.key!==q.key))} style={{background:"none",border:"none",cursor:"pointer",color:"#c0392b",fontSize:16}}>×</button></div>)}
          {showCQ&&<div style={{padding:14,background:"#f7f9fc",borderRadius:10,border:"1.5px solid #eef0f3",marginTop:6}}>
            <input placeholder={isAr?"نص السؤال *":"Question text *"} value={nq.label_ar} onChange={e=>setNq(p=>({...p,label_ar:e.target.value}))} style={{width:"100%",padding:"8px 12px",borderRadius:8,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",marginBottom:8}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{(["yesno","scale","number","text"]).map(t=><button key={t} onClick={()=>setNq(p=>({...p,type:t}))} style={{padding:"5px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,background:nq.type===t?"#0863ba":"#eef0f3",color:nq.type===t?"#fff":"#666"}}>{isAr?(t==="yesno"?"نعم/لا":t==="scale"?"مقياس":t==="number"?"رقم":"نص"):(t==="yesno"?"Yes/No":t==="scale"?"Scale":t==="number"?"Number":"Text")}</button>)}</div>
            <button onClick={addCQ} disabled={!nq.label_ar.trim()} style={{padding:"8px 18px",borderRadius:8,border:"none",background:nq.label_ar.trim()?"#0863ba":"#ddd",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:nq.label_ar.trim()?"pointer":"not-allowed"}}>{isAr?"إضافة":"Add"}</button>
          </div>}
        </div>
        <button onClick={create} disabled={!pid||creating} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:pid?"#0863ba":"#ddd",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:pid?"pointer":"not-allowed",boxShadow:pid?"0 4px 16px rgba(8,99,186,.3)":"none"}}>
          {creating?(isAr?"جاري الإنشاء...":"Creating..."):(isAr?"إنشاء الرابط":"Create Link")}
        </button>
      </div>
    </div>
  );
}

function LogDetailModal({log,lang,patientName,clinicTrackingType,onClose,onSaveComment}:{log:DailyLog;lang:Lang;patientName:string;clinicTrackingType:string;onClose:()=>void;onSaveComment:(id:string,c:string)=>void;}) {
  const isAr=lang==="ar";
  const cfg=CLINIC_LABELS[log.clinic_type]??CLINIC_LABELS[clinicTrackingType]??CLINIC_LABELS.general;
  const [comment,setComment]=useState(log.doctor_comment??"");
  const [saving,setSaving]=useState(false);
  async function save(){setSaving(true);await supabase.from("daily_logs").update({doctor_comment:comment}).eq("id",log.id);onSaveComment(log.id,comment);setSaving(false);}
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:18,padding:28,width:"100%",maxWidth:520,boxShadow:"0 20px 60px rgba(0,0,0,.2)",direction:isAr?"rtl":"ltr",fontFamily:"Rubik,sans-serif",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}><div><div style={{fontSize:16,fontWeight:800,color:"#353535"}}>{patientName}</div><div style={{fontSize:12,color:"#aaa",marginTop:2}}>{log.log_date}</div></div><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#aaa",lineHeight:1}}>×</button></div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:cfg.color+"12",border:"1px solid "+cfg.color+"25",marginBottom:16}}><span style={{fontSize:13}}>{cfg.icon}</span><span style={{fontSize:11,fontWeight:600,color:cfg.color}}>{isAr?cfg.ar:cfg.en}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {Object.entries(log.fields??{}).map(([k,v])=>{
            const lbl=FIELD_LABELS[k];const isBool=typeof v==="boolean";const isP=isBool&&v===true;const isN=isBool&&v===false;
            return <div key={k} style={{padding:"9px 12px",borderRadius:10,background:isP?"rgba(46,125,50,.06)":isN?"rgba(192,57,43,.06)":"rgba(8,99,186,.04)",border:"1px solid "+(isP?"rgba(46,125,50,.15)":isN?"rgba(192,57,43,.15)":"rgba(8,99,186,.1)")}}>
              <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:3}}>{lbl?(isAr?lbl.ar:lbl.en):k}</div>
              <div style={{fontSize:14,fontWeight:700,color:isP?"#2e7d32":isN?"#c0392b":cfg.color}}>{fmtV(v,lang)}</div>
            </div>;
          })}
        </div>
        {log.general_notes&&<div style={{padding:"10px 14px",background:"rgba(8,99,186,.04)",borderRadius:10,border:"1px solid rgba(8,99,186,.1)",marginBottom:14}}><div style={{fontSize:10,color:"#888",fontWeight:600,marginBottom:4}}>{isAr?"ملاحظات المريض":"Patient Notes"}</div><div style={{fontSize:13,color:"#353535",lineHeight:1.6}}>{log.general_notes}</div></div>}
        <div><div style={{fontSize:12,fontWeight:600,color:"#888",marginBottom:7}}>{isAr?"تعليق الطبيب":"Doctor Comment"}</div>
          <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder={isAr?"أضف تعليقك...":"Add your comment..."} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none",resize:"vertical",minHeight:70,lineHeight:1.6}}/>
          <button onClick={save} disabled={saving} style={{marginTop:10,padding:"10px 20px",borderRadius:10,border:"none",background:"#0863ba",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 10px rgba(8,99,186,.25)"}}>{saving?(isAr?"جاري الحفظ...":"Saving..."):(isAr?"حفظ التعليق":"Save Comment")}</button>
        </div>
      </div>
    </div>
  );
}

export default function PatientTrackingPage() {
  const [lang,setLang]=useState<Lang>("ar");
  const isAr=lang==="ar";
  const [loading,setLoading]=useState(true);
  const [userId,setUserId]=useState("");
  const [doctorName,setDoctorName]=useState("");
  const [clinicName,setClinicName]=useState("");
  const [adminType,setAdminType]=useState("general");
  const [trackType,setTrackType]=useState("general");
  const [patients,setPatients]=useState<Patient[]>([]);
  const [links,setLinks]=useState<TrackingLink[]>([]);
  const [dailyLogs,setDailyLogs]=useState<DailyLog[]>([]);
  const [showCreate,setShowCreate]=useState(false);
  const [selLog,setSelLog]=useState<DailyLog|null>(null);
  const [selLink,setSelLink]=useState<string>("all");
  const [filterDate,setFilterDate]=useState(tISO());
  const [copiedTok,setCopiedTok]=useState<string|null>(null);
  const [tab,setTab]=useState<"logs"|"links">("logs");
  const [plan,setPlan]=useState<PlanType>("basic");

  useEffect(()=>{loadData();},[]);
  useEffect(()=>{
    if(!userId)return;
    const ch=supabase.channel("track_rt").on("postgres_changes",{event:"INSERT",schema:"public",table:"daily_logs"},p=>{
      const nl=p.new as DailyLog;
      setLinks(ls=>{const toks=ls.map(l=>l.token);if(toks.includes(nl.token))setDailyLogs(prev=>prev.some(x=>x.id===nl.id)?prev:[nl,...prev]);return ls;});
    }).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[userId]);

  async function loadData(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return;}
    setUserId(user.id);
    const {data:cd}=await supabase.from("clinics").select("clinic_type,name,owner,plan").eq("user_id",user.id).maybeSingle();
    if(cd?.clinic_type){const at=cd.clinic_type as string;setAdminType(at);setTrackType(CLINIC_TYPE_TO_TRACKING[at]??"general");}
    if(cd?.name)setClinicName(cd.name);
    if(cd?.owner)setDoctorName(cd.owner);
    if(cd?.plan)setPlan(cd.plan as PlanType);
    const {data:prof}=await supabase.from("profiles").select("full_name,clinic_name").eq("id",user.id).maybeSingle();
    if(prof){if(!cd?.owner&&prof.full_name)setDoctorName(prof.full_name);if(!cd?.name&&prof.clinic_name)setClinicName(prof.clinic_name);}
    const {data:pats}=await supabase.from("patients").select("id,name").eq("user_id",user.id).eq("is_hidden",false);
    setPatients(pats??[]);
    const {data:lks}=await supabase.from("tracking_links").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
    setLinks(lks??[]);
    const toks=(lks??[]).map(l=>l.token);
    if(toks.length>0){const {data:logs}=await supabase.from("daily_logs").select("*").in("token",toks).order("log_date",{ascending:false});setDailyLogs(logs??[]);}
    setLoading(false);
  }

  const handleCreated=(l:TrackingLink)=>{setLinks(p=>[l,...p]);setShowCreate(false);setTab("links");};
  const copyLink=(tok:string)=>{navigator.clipboard.writeText(window.location.origin+"/daily-log/"+tok);setCopiedTok(tok);setTimeout(()=>setCopiedTok(null),2500);};
  const shareWA=(tok:string,name:string)=>{const u=window.location.origin+"/daily-log/"+tok;const tx=isAr?"مرحباً "+name+" 👋\nرابط متابعتك اليومية من "+clinicName+":\n"+u:"Hello "+name+" 👋\nYour daily tracking link from "+clinicName+":\n"+u;window.open("https://wa.me/?text="+encodeURIComponent(tx),"_blank");};
  const toggleActive=async(id:string,cur:boolean)=>{await supabase.from("tracking_links").update({active:!cur}).eq("id",id);setLinks(p=>p.map(l=>l.id===id?{...l,active:!cur}:l));};
  const saveComment=(id:string,c:string)=>{setDailyLogs(p=>p.map(l=>l.id===id?{...l,doctor_comment:c}:l));setSelLog(p=>p?{...p,doctor_comment:c}:p);};

  const filtLogs=dailyLogs.filter(l=>(selLink==="all"||l.token===selLink)&&(!filterDate||l.log_date===filterDate));
  const todayN=dailyLogs.filter(l=>l.log_date===tISO()).length;
  const actN=links.filter(l=>l.active).length;
  const am=ADMIN_META[adminType]??ADMIN_META.general;
  const tm=CLINIC_LABELS[trackType]??CLINIC_LABELS.general;

  return (
    <>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Rubik',sans-serif;background:#f7f9fc}.pt-root{direction:"+(isAr?"rtl":"ltr")+";min-height:100vh;background:#f7f9fc}.log-row{background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #eef0f3;margin-bottom:10px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .18s;box-shadow:0 2px 10px rgba(8,99,186,.04)}.log-row:hover{border-color:rgba(8,99,186,.3);box-shadow:0 4px 18px rgba(8,99,186,.1);transform:translateY(-1px)}.link-card{background:#fff;border-radius:14px;padding:16px 18px;border:1.5px solid #eef0f3;margin-bottom:10px;box-shadow:0 2px 10px rgba(8,99,186,.04)}.tb{padding:8px 20px;border-radius:20px;border:1.5px solid #eef0f3;background:#f7f9fc;font-family:'Rubik',sans-serif;font-size:13px;font-weight:600;cursor:pointer;color:#888;transition:all .18s}.tb.act{background:rgba(8,99,186,.08);border-color:rgba(8,99,186,.3);color:#0863ba}.wab{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:none;background:#25D366;color:#fff;font-family:'Rubik',sans-serif;font-size:12px;font-weight:700;cursor:pointer;border-radius:8px}.wab:hover{background:#1eb858}@keyframes fiu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fiu .4s cubic-bezier(.4,0,.2,1) both}@keyframes pls{0%,100%{opacity:1}50%{opacity:.5}}.pls{animation:pls 1.5s ease infinite}@media(max-width:768px){.mpt{margin-left:0!important;margin-right:0!important;padding:70px 14px 40px!important}}"}</style>
      <div className="pt-root">
        <Sidebar lang={lang} setLang={setLang} plan={plan}/>
        <main className="mpt" style={{[isAr?"marginRight":"marginLeft"]:240,padding:"32px 28px",minHeight:"100vh"}}>
          {loading&&<div style={{textAlign:"center",padding:"80px 0"}}><div style={{fontSize:36,marginBottom:12}} className="pls">📊</div><div style={{fontSize:13,color:"#aaa"}}>{isAr?"جاري التحميل...":"Loading..."}</div></div>}

          {/* ── شاشة "غير متاح في خطتك" للأساسية ── */}
          {!loading&&!canAccess("tracking",plan)&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center",gap:16}}>
              <div style={{fontSize:64}}>🔒</div>
              <h2 style={{fontSize:22,fontWeight:800,color:"#353535"}}>
                {isAr?"متابعة المرضى غير متاحة في خطتك الحالية":"Patient Tracking Not Available in Your Plan"}
              </h2>
              <p style={{fontSize:14,color:"#888",maxWidth:420,lineHeight:1.8}}>
                {isAr
                  ?"الخطة الأساسية والاحترافية (فردية أو مشتركة) لا تتضمن ميزة متابعة المرضى. هذه الميزة متاحة حصراً في الخطة الشاملة."
                  :"The Basic and Professional plans (individual or shared) do not include patient tracking. This feature is exclusively available in the Comprehensive plan."}
              </p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:4}}>
                <div style={{padding:"10px 20px",background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontSize:13,color:"#e67e22",fontWeight:600}}>
                  ✅ {isAr?"الشاملة — فردي":"Comprehensive — Individual"}
                </div>
                <div style={{padding:"10px 20px",background:"rgba(74,20,128,.08)",border:"1.5px solid rgba(74,20,128,.2)",borderRadius:12,fontSize:13,color:"#4a1480",fontWeight:600}}>
                  ✅ {isAr?"الشاملة — مشترك":"Comprehensive — Shared"}
                </div>
              </div>
              <a href="https://wa.me/963998285483" target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",background:"#25D366",color:"#fff",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:"0 4px 16px rgba(37,211,102,.35)",marginTop:8}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.535 5.847L.057 23.882l6.196-1.447A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.214-3.68.859.925-3.585-.234-.369A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
                {isAr?"تواصل معنا للترقية":"Contact Us to Upgrade"}
              </a>
            </div>
          )}

          {!loading&&canAccess("tracking",plan)&&(<>
            <div className="fu" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <h1 style={{fontSize:24,fontWeight:800,color:"#353535"}}>{isAr?"📊 متابعة المرضى":"📊 Patient Tracking"}</h1>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 12px",borderRadius:20,background:am.color+"15",border:"1.5px solid "+am.color+"30",fontSize:12,fontWeight:700,color:am.color}}>{am.icon} {isAr?am.ar:am.en}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#888"}}>
                  <span>{isAr?"نظام التتبع:":"Tracking:"}</span>
                  <span style={{fontWeight:700,color:tm.color}}>{tm.icon} {isAr?tm.ar:tm.en}</span>
                  <span style={{color:"#ccc"}}>—</span>
                  <span>{isAr?"محدد تلقائياً":"Auto-set"}</span>
                </div>
              </div>
              <button onClick={()=>setShowCreate(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"11px 20px",borderRadius:12,border:"none",background:"#0863ba",color:"#fff",fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.3)"}}>
                <span style={{fontSize:16}}>🔗</span>{isAr?"إنشاء رابط متابعة":"Create Tracking Link"}
              </button>
            </div>
            <div className="fu" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:26}}>
              {[{icon:"📋",l:isAr?"تقارير اليوم":"Today's Reports",v:todayN,c:"#0863ba"},{icon:"🔗",l:isAr?"روابط نشطة":"Active Links",v:actN,c:"#2e7d32"},{icon:"⚠️",l:isAr?"لم يسجّلوا":"Not Logged",v:Math.max(actN-todayN,0),c:"#e67e22"},{icon:"📝",l:isAr?"إجمالي التقارير":"Total Reports",v:dailyLogs.length,c:"#8e44ad"}].map((s,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 12px rgba(8,99,186,.05)",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:s.c,borderRadius:"14px 14px 0 0"}}/>
                  <div style={{fontSize:22,marginBottom:8}}>{s.icon}</div>
                  <div style={{fontSize:26,fontWeight:800,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:12,color:"#888",fontWeight:500}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div className="fu" style={{display:"flex",gap:8,marginBottom:20}}>
              <button className={"tb"+(tab==="logs"?" act":"")} onClick={()=>setTab("logs")}>{isAr?"التقارير اليومية":"Daily Reports"}</button>
              <button className={"tb"+(tab==="links"?" act":"")} onClick={()=>setTab("links")}>{isAr?"روابط المتابعة":"Tracking Links"}</button>
            </div>
            {tab==="logs"&&(<div className="fu">
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
                <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none"}}/>
                <select value={selLink} onChange={e=>setSelLink(e.target.value)} style={{padding:"8px 14px",borderRadius:10,border:"1.5px solid #eef0f3",background:"#fff",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",outline:"none"}}>
                  <option value="all">{isAr?"كل المرضى":"All Patients"}</option>
                  {links.map(l=><option key={l.token} value={l.token}>{l.patient_name}</option>)}
                </select>
                {(filterDate||selLink!=="all")&&<button onClick={()=>{setFilterDate("");setSelLink("all");}} style={{padding:"8px 14px",borderRadius:10,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.06)",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,color:"#c0392b",cursor:"pointer"}}>{isAr?"مسح":"Clear"}</button>}
              </div>
              {filtLogs.length===0?<div style={{textAlign:"center",padding:"60px 0",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3"}}><div style={{fontSize:36,marginBottom:12}}>📭</div><div style={{fontSize:14,fontWeight:700,color:"#888"}}>{isAr?"لا توجد تقارير":"No reports"}</div></div>:filtLogs.map((log,idx)=>{
                const lnk=links.find(l=>l.token===log.token);
                const cfg=CLINIC_LABELS[log.clinic_type]??CLINIC_LABELS[trackType]??CLINIC_LABELS.general;
                return <div key={log.id} className="log-row fu" style={{animationDelay:idx*0.05+"s"}} onClick={()=>setSelLog(log)}>
                  <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:gc(log.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{gi(lnk?.patient_name??"?")}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#353535",marginBottom:2}}>{lnk?.patient_name??"—"}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:cfg.color+"12",color:cfg.color,fontWeight:600}}>{cfg.icon} {isAr?cfg.ar:cfg.en}</span>
                      <span style={{fontSize:11,color:"#aaa"}}>📅 {log.log_date}</span>
                      {log.doctor_comment&&<span style={{fontSize:11,color:"#2e7d32",fontWeight:600}}>💬 {isAr?"مُعلَّق":"Commented"}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {Object.entries(log.fields??{}).slice(0,2).map(([k,v])=><div key={k} style={{padding:"4px 8px",borderRadius:8,background:"rgba(8,99,186,.06)",fontSize:11,fontWeight:600,color:"#0863ba"}}>{fmtV(v,lang)}</div>)}
                  </div>
                  <div style={{color:"#bbb",fontSize:18,flexShrink:0}}>{isAr?"‹":"›"}</div>
                </div>;
              })}
            </div>)}
            {tab==="links"&&(<div className="fu">
              {links.length===0?<div style={{textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:14,border:"1.5px solid #eef0f3"}}><div style={{fontSize:36,marginBottom:12}}>🔗</div><div style={{fontSize:14,fontWeight:700,color:"#888",marginBottom:8}}>{isAr?"لا توجد روابط بعد":"No links yet"}</div><div style={{fontSize:12,color:"#bbb"}}>{isAr?"أنشئ رابطاً لمريضك للبدء":"Create a link to get started"}</div></div>:links.map((link,idx)=>{
                const cfg=CLINIC_LABELS[link.clinic_type]??CLINIC_LABELS[trackType]??CLINIC_LABELS.general;
                const lc=dailyLogs.filter(l=>l.token===link.token).length;
                const last=dailyLogs.find(l=>l.token===link.token);
                const loggedT=dailyLogs.some(l=>l.token===link.token&&l.log_date===tISO());
                const url=(typeof window!=="undefined"?window.location.origin:"")+"/daily-log/"+link.token;
                return <div key={link.id} className="link-card fu" style={{animationDelay:idx*0.06+"s",opacity:link.active?1:0.55}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                    <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:gc(link.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{gi(link.patient_name)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:14,fontWeight:700,color:"#353535"}}>{link.patient_name}</span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:link.active?"rgba(46,125,50,.1)":"rgba(120,120,120,.1)",color:link.active?"#2e7d32":"#888",fontWeight:600}}>{link.active?(isAr?"نشط":"Active"):(isAr?"متوقف":"Inactive")}</span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:cfg.color+"12",color:cfg.color,fontWeight:600}}>{cfg.icon} {isAr?cfg.ar:cfg.en}</span>
                      </div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:"#aaa"}}>{isAr?"تقارير:":"Reports:"} <b style={{color:"#0863ba"}}>{lc}</b></span>
                        {last&&<span style={{fontSize:11,color:"#aaa"}}>{isAr?"آخر:":"Last:"} <b style={{color:"#353535"}}>{last.log_date}</b></span>}
                        {!loggedT&&link.active&&<span style={{fontSize:11,color:"#e67e22",fontWeight:600}}>⚠️ {isAr?"لم يسجّل اليوم":"Not logged today"}</span>}
                        {loggedT&&<span style={{fontSize:11,color:"#2e7d32",fontWeight:600}}>✓ {isAr?"سجّل اليوم":"Logged today"}</span>}
                      </div>
                    </div>
                    <button onClick={()=>toggleActive(link.id,link.active)} style={{padding:"5px 10px",borderRadius:8,border:"1px solid "+(link.active?"rgba(192,57,43,.2)":"rgba(46,125,50,.2)"),background:link.active?"rgba(192,57,43,.06)":"rgba(46,125,50,.06)",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,cursor:"pointer",color:link.active?"#c0392b":"#2e7d32",flexShrink:0}}>{link.active?(isAr?"إيقاف":"Deactivate"):(isAr?"تفعيل":"Activate")}</button>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{flex:1,padding:"7px 12px",background:"#f7f9fc",borderRadius:8,border:"1px solid #eef0f3",fontSize:11,color:"#888",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",direction:"ltr",textAlign:"left",minWidth:0}}>{url}</div>
                    <button onClick={()=>copyLink(link.token)} style={{padding:"7px 12px",borderRadius:8,border:"1.5px solid #eef0f3",background:copiedTok===link.token?"rgba(46,125,50,.06)":"#fff",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",color:copiedTok===link.token?"#2e7d32":"#666",flexShrink:0}}>{copiedTok===link.token?(isAr?"✓ تم":"✓ Copied"):(isAr?"نسخ":"Copy")}</button>
                    <button className="wab" onClick={()=>shareWA(link.token,link.patient_name)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </button>
                  </div>
                </div>;
              })}
            </div>)}
          </>)}
        </main>
      </div>
      {showCreate&&<CreateLinkModal lang={lang} patients={patients} doctorName={doctorName} clinicName={clinicName} userId={userId} clinicTrackingType={trackType} adminClinicType={adminType} onClose={()=>setShowCreate(false)} onCreated={handleCreated}/>}
      {selLog&&<LogDetailModal log={selLog} lang={lang} patientName={links.find(l=>l.token===selLog.token)?.patient_name??"—"} clinicTrackingType={trackType} onClose={()=>setSelLog(null)} onSaveComment={saveComment}/>}
    </>
  );
}