"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────
interface ClinicInfo {
  user_id: string;
  name: string;
  clinic_type: string;
  restricted_access_enabled: boolean;
  restricted_access_pin: string;
  plan?: PlanType;
}

interface Patient {
  id: number;
  name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  notes?: string;
  has_diabetes?: boolean;
  has_hypertension?: boolean;
  created_at?: string;
}

interface PatientProfile {
  medical_fields: Record<string, string>;
  extra_form_fields: Record<string, string | boolean>;
}

interface Appointment {
  id: number;
  user_id: string;
  patient_id: number;
  doctor_id?: number | null;
  date: string;
  time: string;
  duration?: number;
  type?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending_approval";
}

interface Doctor {
  id: number;
  name: string;
  specialty?: string;
  user_id: string;
}

// ─── الخطط المشتركة ────────────────────────────────────────
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
const isSharedPlan = (plan?: string) => !!plan && plan.startsWith("shared_");

const APPT_MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const APPT_STATUS_LABEL: Record<string,string> = { scheduled:"محدد", completed:"مكتمل", cancelled:"ملغي", "no-show":"لم يحضر" };
const APPT_STATUS_COLOR: Record<string,string> = { scheduled:"#0863ba", completed:"#2e7d32", cancelled:"#c0392b", "no-show":"#888" };
const APPT_DOC_COLORS = ["#6d28d9","#0863ba","#2e7d32","#c0392b","#e67e22","#0891b2"];

const toKeyAppt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

// ─── نفس حقول السجل الطبي الموجودة في النظام الأصلي ──────────
type ClinicType = "general"|"dental"|"dermatology"|"cosmetic"|"pediatrics"|"physical_therapy"|"mental_health"|"nutrition"|"ophthalmology"|"orthopedic"|"cardiology"|"gynecology"|"ent"|"urology"|"other";

type MedicalField = { key:string; label_ar:string; icon:string };

const MEDICAL_FIELDS_BY_TYPE: Record<string, MedicalField[]> = {
  general:          [ {key:"allergies",icon:"🤧",label_ar:"الحساسية"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات السابقة"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي"}, {key:"chronic_diseases",icon:"🏥",label_ar:"الأمراض المزمنة"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  dental:           [ {key:"allergies",icon:"💊",label_ar:"حساسية الأدوية"}, {key:"medications",icon:"💉",label_ar:"الأدوية الحالية"}, {key:"dental_history",icon:"🦷",label_ar:"التاريخ الطبي السني"}, {key:"tmj_issues",icon:"🦴",label_ar:"مشاكل مفصل الفك"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  dermatology:      [ {key:"allergies",icon:"🤧",label_ar:"الحساسية الجلدية"}, {key:"medications",icon:"💊",label_ar:"الأدوية والكريمات"}, {key:"skin_history",icon:"🧴",label_ar:"التاريخ الجلدي"}, {key:"sun_exposure",icon:"☀️",label_ar:"التعرض للشمس"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  cosmetic:         [ {key:"allergies",icon:"🤧",label_ar:"الحساسية"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"prev_procedures",icon:"✨",label_ar:"الإجراءات التجميلية السابقة"}, {key:"expectations",icon:"🎯",label_ar:"التوقعات والأهداف"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  pediatrics:       [ {key:"allergies",icon:"🤧",label_ar:"الحساسية"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"birth_history",icon:"👶",label_ar:"تاريخ الولادة"}, {key:"developmental",icon:"📈",label_ar:"مراحل النمو والتطور"}, {key:"vaccinations",icon:"💉",label_ar:"جدول التطعيمات"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  physical_therapy: [ {key:"injury_details",icon:"🦴",label_ar:"تفاصيل الإصابة"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"pain_scale",icon:"😣",label_ar:"وصف الألم"}, {key:"functional_goals",icon:"🎯",label_ar:"الأهداف الوظيفية"}, {key:"exercise_history",icon:"🏋️",label_ar:"تاريخ التمارين"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  mental_health:    [ {key:"chief_complaint",icon:"💭",label_ar:"الشكوى الرئيسية"}, {key:"medications",icon:"💊",label_ar:"الأدوية النفسية الحالية"}, {key:"therapy_history",icon:"🧠",label_ar:"تاريخ العلاج النفسي"}, {key:"sleep_pattern",icon:"🌙",label_ar:"نمط النوم"}, {key:"social_support",icon:"🤝",label_ar:"الدعم الاجتماعي"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات المعالج"} ],
  nutrition:        [ {key:"dietary_restrictions",icon:"🚫",label_ar:"القيود الغذائية"}, {key:"food_allergies",icon:"🤧",label_ar:"حساسية الطعام"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"weight_history",icon:"⚖️",label_ar:"تاريخ الوزن"}, {key:"eating_habits",icon:"🍽️",label_ar:"العادات الغذائية"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الأخصائي"} ],
  ophthalmology:    [ {key:"eye_history",icon:"👁️",label_ar:"التاريخ البصري"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"glasses_history",icon:"👓",label_ar:"تاريخ النظارات"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي البصري"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  orthopedic:       [ {key:"injury_details",icon:"🦴",label_ar:"تفاصيل الإصابة"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"fracture_history",icon:"🩺",label_ar:"تاريخ الكسور"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات الجراحية"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  cardiology:       [ {key:"cardiac_history",icon:"❤️",label_ar:"التاريخ القلبي"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"risk_factors",icon:"⚠️",label_ar:"عوامل الخطر"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات القلبية"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  gynecology:       [ {key:"ob_history",icon:"🌸",label_ar:"التاريخ التوليدي"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"menstrual_history",icon:"📅",label_ar:"تاريخ الدورة الشهرية"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات الجراحية"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيبة"} ],
  ent:              [ {key:"ent_history",icon:"👂",label_ar:"التاريخ الطبي للأذن والأنف والحنجرة"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"allergies",icon:"🤧",label_ar:"الحساسية"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات الجراحية"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  urology:          [ {key:"urological_history",icon:"💧",label_ar:"التاريخ المسالكي"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات الجراحية"}, {key:"family_history",icon:"👨‍👩‍👧",label_ar:"التاريخ العائلي"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
  other:            [ {key:"allergies",icon:"🤧",label_ar:"الحساسية"}, {key:"medications",icon:"💊",label_ar:"الأدوية الحالية"}, {key:"surgeries",icon:"🔪",label_ar:"العمليات السابقة"}, {key:"extended_notes",icon:"📝",label_ar:"ملاحظات الطبيب"} ],
};

const CLINIC_TYPE_ICONS: Record<string, string> = {
  general:"🏥", dental:"🦷", dermatology:"🧴", cosmetic:"💆", pediatrics:"👶",
  physical_therapy:"🏃", mental_health:"🧠", nutrition:"🥗", ophthalmology:"👁️",
  orthopedic:"🦴", cardiology:"❤️", gynecology:"🌸", ent:"👂", urology:"💧", other:"🏨",
};

const CLINIC_TYPE_COLORS: Record<string, string> = {
  general:"#16a085", dental:"#0863ba", dermatology:"#e67e22", cosmetic:"#8e44ad",
  pediatrics:"#27ae60", physical_therapy:"#2e7d32", mental_health:"#6c3fc5",
  nutrition:"#27ae60", ophthalmology:"#2980b9", orthopedic:"#c0392b",
  cardiology:"#e74c3c", gynecology:"#e91e63", ent:"#795548", urology:"#2196f3", other:"#607d8b",
};

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id:number) => AVATAR_COLORS[(id-1) % AVATAR_COLORS.length];
const getInitials = (name:string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
const calcAge = (dob?:string|null) => {
  if (!dob) return null;
  return Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));
};

// ════════════════════════════════════════════════════════════
export default function RestrictedAccessPage() {
  const params   = useParams();
  const router   = useRouter();
  const clinicId = params?.clinicId as string;

  const [stage,           setStage]          = useState<"loading"|"pin"|"patients"|"error">("loading");
  const [clinicInfo,      setClinicInfo]      = useState<ClinicInfo | null>(null);
  const [pinInput,        setPinInput]        = useState("");
  const [pinError,        setPinError]        = useState("");
  const [patients,        setPatients]        = useState<Patient[]>([]);
  const [search,          setSearch]          = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // ── تبويب القسم: المرضى / المواعيد ────────────────────────
  const [activeTab,       setActiveTab]       = useState<"patients"|"appointments">("patients");
  const [isMobile,        setIsMobile]        = useState(false);
  const [appointments,    setAppointments]    = useState<Appointment[]>([]);
  const [doctors,         setDoctors]         = useState<Doctor[]>([]);
  const [apptLoading,     setApptLoading]     = useState(false);
  const [selectedDoctorId,setSelectedDoctorId]= useState<number | "all">("all");
  const now = new Date();
  const [viewMonth,       setViewMonth]       = useState(now.getMonth());
  const [viewYear,        setViewYear]        = useState(now.getFullYear());
  const todayKey = toKeyAppt(now);
  const [selectedKey,     setSelectedKey]     = useState(todayKey);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Profile drawer state ──────────────────────────────────
  const [profilePatient,  setProfilePatient]  = useState<Patient | null>(null);
  const [profile,         setProfile]         = useState<PatientProfile | null>(null);
  const [profileLoading,  setProfileLoading]  = useState(false);
  const [profileTab,      setProfileTab]      = useState<"info"|"medical">("info");

  useEffect(() => {
    const session = sessionStorage.getItem(`ra_${clinicId}`);
    if (session === "granted") fetchClinicAndPatients(true);
    else fetchClinicInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const fetchClinicInfo = async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("user_id, name, clinic_type, restricted_access_enabled, restricted_access_pin, plan")
      .eq("user_id", clinicId)
      .single();
    if (error || !data || !data.restricted_access_enabled) { setStage("error"); return; }
    setClinicInfo(data as ClinicInfo);
    setStage("pin");
  };

  const fetchClinicAndPatients = async (skipPinCheck = false) => {
    setPatientsLoading(true);
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("user_id, name, clinic_type, restricted_access_enabled, restricted_access_pin, plan")
      .eq("user_id", clinicId)
      .single();
    if (error || !clinic) { setStage("error"); setPatientsLoading(false); return; }
    if (!skipPinCheck && !clinic.restricted_access_enabled) { setStage("error"); setPatientsLoading(false); return; }
    setClinicInfo(clinic as ClinicInfo);
    const { data: pts } = await supabase
      .from("patients")
      .select("id, name, phone, date_of_birth, gender, notes, has_diabetes, has_hypertension, created_at")
      .eq("user_id", clinicId)
      .eq("is_hidden", false)
      .order("name", { ascending: true });
    setPatients((pts as Patient[]) || []);
    setPatientsLoading(false);
    setStage("patients");

    // ── جلب الأطباء (للخطط المشتركة) ──
    if (isSharedPlan((clinic as ClinicInfo).plan)) {
      const { data: docs } = await supabase
        .from("doctors")
        .select("id, name, specialty, user_id")
        .eq("user_id", clinicId)
        .order("name");
      setDoctors((docs as Doctor[]) || []);
    }
  };

  // ── جلب مواعيد العيادة ─────────────────────────────────────
  const loadAppointments = async () => {
    setApptLoading(true);
    try {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", clinicId)
        .neq("status", "pending_approval")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      setAppointments((data as Appointment[]) || []);
    } catch (err) { console.error(err); }
    finally { setApptLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "appointments" && stage === "patients" && appointments.length === 0 && !apptLoading) {
      loadAppointments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, stage]);

  const handlePinSubmit = () => {
    if (!clinicInfo) return;
    if (pinInput.trim() === String(clinicInfo.restricted_access_pin).trim()) {
      sessionStorage.setItem(`ra_${clinicId}`, "granted");
      fetchClinicAndPatients(true);
    } else {
      setPinError("PIN غير صحيح — تحقق من الرقم وأعد المحاولة");
      setPinInput("");
    }
  };

  const openProfile = async (p: Patient) => {
    setProfilePatient(p);
    setProfileTab("info");
    setProfile(null);
    setProfileLoading(true);
    const { data } = await supabase
      .from("patient_profiles")
      .select("medical_fields, extra_form_fields")
      .eq("patient_id", p.id)
      .maybeSingle();
    setProfile(data ? { medical_fields: data.medical_fields ?? {}, extra_form_fields: data.extra_form_fields ?? {} } : { medical_fields:{}, extra_form_fields:{} });
    setProfileLoading(false);
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || "").includes(search)
  );

  const clinicColor = CLINIC_TYPE_COLORS[clinicInfo?.clinic_type || "general"] || "#0863ba";
  const medFields   = MEDICAL_FIELDS_BY_TYPE[clinicInfo?.clinic_type || "general"] || MEDICAL_FIELDS_BY_TYPE.general;

  if (stage === "loading") return <LoadingScreen />;
  if (stage === "error")   return <ErrorScreen />;

  // ── PIN Screen ───────────────────────────────────────────────
  if (stage === "pin" && clinicInfo) {
    const pinDisplay = Array.from({ length: Math.max(4, pinInput.length) }, (_, i) => pinInput[i]);
    return (
      <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0863ba 0%,#0e7c6a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif",padding:16 }}>
        <div style={{ background:"#fff",borderRadius:24,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 32px 80px rgba(0,0,0,.18)",textAlign:"center" }}>
          <div style={{ width:70,height:70,borderRadius:20,background:"linear-gradient(135deg,#0863ba,#0e7c6a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(8,99,186,.25)" }}>🔗</div>
          <h1 style={{ fontSize:20,fontWeight:800,color:"#353535",marginBottom:4 }}>دخول مقيّد</h1>
          <p style={{ fontSize:13,color:"#888",marginBottom:6 }}>{CLINIC_TYPE_ICONS[clinicInfo.clinic_type||"general"]} {clinicInfo.name}</p>
          <p style={{ fontSize:12,color:"#aaa",marginBottom:28,lineHeight:1.6 }}>أدخل الـ PIN للوصول إلى ملفات المرضى</p>
          <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:20 }}>
            {pinDisplay.map((ch, i) => (
              <div key={i} style={{ width:52,height:60,borderRadius:12,border:`2px solid ${ch?"#0863ba":"#e8eaed"}`,background:ch?"rgba(8,99,186,.05)":"#fafbfc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#0863ba",transition:"all .15s" }}>
                {ch ? "●" : ""}
              </div>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16 }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
              <button key={i} onClick={() => { setPinError(""); if(d==="⌫") setPinInput(p=>p.slice(0,-1)); else if(d!=="") setPinInput(p=>p.length<8?p+d:p); }}
                style={{ padding:"16px",borderRadius:12,border:"1.5px solid",fontSize:d==="⌫"?18:20,fontWeight:700,cursor:d===""?"default":"pointer",background:d===""?"transparent":"#fafbfc",borderColor:d===""?"transparent":"#e8eaed",color:"#353535",fontFamily:"Rubik,sans-serif" }}>
                {d}
              </button>
            ))}
          </div>
          {pinError && <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.2)",borderRadius:10,fontSize:12,color:"#c0392b",marginBottom:14 }}>⚠️ {pinError}</div>}
          <button onClick={handlePinSubmit} disabled={pinInput.length<4}
            style={{ width:"100%",padding:"14px",background:pinInput.length>=4?"#0863ba":"#e8eaed",color:pinInput.length>=4?"#fff":"#aaa",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:pinInput.length>=4?"pointer":"not-allowed",transition:"all .2s",boxShadow:pinInput.length>=4?"0 4px 16px rgba(8,99,186,.25)":"none" }}>
            دخول
          </button>

        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap');`}</style>
      </div>
    );
  }

  // ── Patients Screen ──────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",direction:"rtl" }}>

      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1.5px solid #eef0f3",padding:"0 20px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(8,99,186,.06)",position:"sticky",top:0,zIndex:10 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${clinicColor},#0863ba)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
            {CLINIC_TYPE_ICONS[clinicInfo?.clinic_type||"general"]}
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{clinicInfo?.name}</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>

          <button onClick={() => { sessionStorage.removeItem(`ra_${clinicId}`); router.push(`/restricted-access/${clinicId}`); }}
            style={{ padding:"6px 14px",border:"1.5px solid #eef0f3",borderRadius:8,background:"#f7f9fc",fontSize:12,color:"#888",cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
            خروج
          </button>
        </div>
      </div>

      {/* ── تبويبات: المرضى / المواعيد ── */}
      <div style={{ background:"#fff",borderBottom:"1.5px solid #eef0f3",position:"sticky",top:60,zIndex:9 }}>
        <div style={{ maxWidth:isMobile?"100%":(activeTab==="appointments"?1100:700),margin:"0 auto",padding:"0 16px",display:"flex",gap:4 }}>
          {([
            { key:"patients" as const,     label:"👥 المرضى" },
            { key:"appointments" as const, label:"📅 المواعيد" },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding:"12px 18px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,color:activeTab===tab.key?clinicColor:"#aaa",borderBottom:activeTab===tab.key?`2.5px solid ${clinicColor}`:"2.5px solid transparent",transition:"all .18s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "patients" && (
      <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
        {/* Search */}
        <div style={{ position:"relative",marginBottom:16 }}>
          <span style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#aaa",pointerEvents:"none" }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم المريض أو رقم الهاتف..."
            style={{ width:"100%",padding:"12px 42px 12px 14px",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,background:"#fff",color:"#353535",outline:"none",boxSizing:"border-box" }} />
        </div>

        {/* Stats */}
        <div style={{ display:"flex",gap:10,marginBottom:16 }}>
          <div style={{ flex:1,background:"#fff",borderRadius:12,padding:"12px 16px",border:"1.5px solid #eef0f3",display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:20 }}>👥</span>
            <div><div style={{ fontSize:18,fontWeight:800,color:"#0863ba" }}>{patients.length}</div><div style={{ fontSize:10,color:"#aaa" }}>إجمالي المرضى</div></div>
          </div>
          {search && (
            <div style={{ flex:1,background:"#fff",borderRadius:12,padding:"12px 16px",border:"1.5px solid #eef0f3",display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:20 }}>🔎</span>
              <div><div style={{ fontSize:18,fontWeight:800,color:"#0e7c6a" }}>{filteredPatients.length}</div><div style={{ fontSize:10,color:"#aaa" }}>نتائج البحث</div></div>
            </div>
          )}
        </div>



        {/* Patients List */}
        {patientsLoading ? (
          <div style={{ textAlign:"center",padding:60,color:"#aaa" }}><div style={{ fontSize:32,marginBottom:12 }}>⏳</div><div>جاري التحميل...</div></div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ textAlign:"center",padding:60,color:"#ccc" }}><div style={{ fontSize:40,marginBottom:12 }}>🔍</div><div>{search?"لا توجد نتائج":"لا يوجد مرضى"}</div></div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {filteredPatients.map(p => (
              <div key={p.id} style={{ background:"#fff",border:`1.5px solid ${selectedPatient?.id===p.id?"#0863ba":"#eef0f3"}`,borderRadius:14,padding:"14px 18px",transition:"all .15s",boxShadow:selectedPatient?.id===p.id?"0 4px 16px rgba(8,99,186,.1)":"none" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  {/* Avatar */}
                  <div style={{ width:42,height:42,borderRadius:12,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0,boxShadow:`0 3px 10px ${getColor(p.id)}55` }}>
                    {getInitials(p.name)}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:11,color:"#aaa",display:"flex",gap:12,flexWrap:"wrap" }}>
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.date_of_birth && calcAge(p.date_of_birth) !== null && <span>🎂 {calcAge(p.date_of_birth)} سنة</span>}
                      {p.has_diabetes && <span style={{ color:"#e67e22",fontWeight:600 }}>🩸 سكري</span>}
                      {p.has_hypertension && <span style={{ color:"#c0392b",fontWeight:600 }}>❤️ ضغط</span>}
                    </div>
                  </div>
                  {/* زر الملف الطبي */}
                  <button onClick={() => openProfile(p)}
                    style={{ padding:"7px 14px",border:`1.5px solid ${clinicColor}30`,borderRadius:10,background:`${clinicColor}08`,color:clinicColor,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .15s" }}>
                    📋 الملف الطبي
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {activeTab === "appointments" && (
        <AppointmentsTab
          clinicColor={clinicColor}
          isMobile={isMobile}
          appointments={appointments}
          doctors={doctors}
          isShared={isSharedPlan(clinicInfo?.plan)}
          loading={apptLoading}
          patients={patients}
          selectedDoctorId={selectedDoctorId}
          setSelectedDoctorId={setSelectedDoctorId}
          viewMonth={viewMonth} setViewMonth={setViewMonth}
          viewYear={viewYear} setViewYear={setViewYear}
          selectedKey={selectedKey} setSelectedKey={setSelectedKey}
          todayKey={todayKey}
        />
      )}

      {/* ── Profile Drawer ────────────────────────────────────── */}
      {profilePatient && (
        <>
          {/* Backdrop */}
          <div onClick={() => setProfilePatient(null)} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.45)",backdropFilter:"blur(5px)" }} />
          {/* Modal */}
          <div style={{ position:"fixed",inset:0,zIndex:201,display:"flex",alignItems:"center",justifyContent:"center",padding:16,pointerEvents:"none" }}>
            <div onClick={e=>e.stopPropagation()} style={{ pointerEvents:"all",background:"#fff",borderRadius:20,width:"100%",maxWidth:580,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(8,99,186,.2)",direction:"rtl",overflow:"hidden",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>

              {/* Header */}
              <div style={{ padding:"18px 22px 0",borderBottom:"1.5px solid #eef0f3",flexShrink:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:getColor(profilePatient.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0 }}>
                    {getInitials(profilePatient.name)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16,fontWeight:800,color:"#353535" }}>{profilePatient.name}</div>
                    <div style={{ fontSize:11,color:"#aaa",display:"flex",gap:8,flexWrap:"wrap",marginTop:2 }}>
                      {profilePatient.gender && <span>{profilePatient.gender==="male"?"ذكر":"أنثى"}</span>}
                      {calcAge(profilePatient.date_of_birth) !== null && <span>• {calcAge(profilePatient.date_of_birth)} سنة</span>}
                      <span style={{ padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,background:`${clinicColor}15`,color:clinicColor }}>
                        {CLINIC_TYPE_ICONS[clinicInfo?.clinic_type||"general"]} {clinicInfo?.clinic_type||""}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setProfilePatient(null)} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14,color:"#888",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                </div>
                {/* Tabs */}
                <div style={{ display:"flex" }}>
                  {([{key:"info",label:"👤 المعلومات"},{key:"medical",label:"🏥 السجل الطبي"}] as const).map(tab => (
                    <button key={tab.key} onClick={() => setProfileTab(tab.key)}
                      style={{ flex:1,padding:"10px 4px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,color:profileTab===tab.key?"#0863ba":"#aaa",borderBottom:profileTab===tab.key?"2.5px solid #0863ba":"2.5px solid transparent",transition:"all .18s" }}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex:1,overflowY:"auto",padding:"18px 22px" }}>
                {profileLoading ? (
                  <div style={{ textAlign:"center",padding:"48px 0",color:"#ccc" }}>
                    <div style={{ fontSize:28,marginBottom:10 }}>⏳</div>
                    <div style={{ fontSize:13 }}>جاري تحميل الملف الطبي...</div>
                  </div>
                ) : (
                  <>
                    {/* ── INFO TAB ── */}
                    {profileTab === "info" && (
                      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                          {[
                            { label:"الاسم",         value:profilePatient.name,                                icon:"👤" },
                            { label:"الهاتف",        value:profilePatient.phone||"—",                         icon:"📞" },
                            { label:"الجنس",         value:profilePatient.gender?(profilePatient.gender==="male"?"ذكر":"أنثى"):"—", icon:"⚧" },
                            { label:"تاريخ الميلاد", value:profilePatient.date_of_birth||"—",                icon:"🎂" },
                          ].map(item => (
                            <div key={item.label} style={{ background:"#f7f9fc",borderRadius:12,padding:"12px 14px",border:"1.5px solid #eef0f3" }}>
                              <div style={{ fontSize:10,fontWeight:700,color:"#aaa",marginBottom:4,textTransform:"uppercase" as const }}>{item.icon} {item.label}</div>
                              <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                        {/* الحالات المزمنة */}
                        {(profilePatient.has_diabetes || profilePatient.has_hypertension) && (
                          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                            {profilePatient.has_diabetes && <span style={{ padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.2)" }}>🩸 يعاني من السكري</span>}
                            {profilePatient.has_hypertension && <span style={{ padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:"rgba(192,57,43,.1)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.2)" }}>❤️ يعاني من ضغط الدم</span>}
                          </div>
                        )}
                        {profilePatient.notes && (
                          <div style={{ background:"#fffbf0",borderRadius:10,padding:"12px 14px",border:"1.5px solid #ffe58f" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:"#aaa",marginBottom:5 }}>📝 ملاحظات</div>
                            <div style={{ fontSize:13,color:"#555",lineHeight:1.7 }}>{profilePatient.notes}</div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* ── MEDICAL TAB ── */}
                    {profileTab === "medical" && (
                      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"9px 12px",background:`${clinicColor}08`,borderRadius:10,border:`1px solid ${clinicColor}20` }}>
                          <span style={{ fontSize:16 }}>{CLINIC_TYPE_ICONS[clinicInfo?.clinic_type||"general"]}</span>
                          <span style={{ fontSize:12,fontWeight:700,color:clinicColor }}>السجل الطبي — {clinicInfo?.name}</span>
                        </div>

                        {medFields.map(field => {
                          const val = profile?.medical_fields?.[field.key] || "";
                          return (
                            <div key={field.key} style={{ borderRadius:12,border:`1.5px solid ${val?"#e0eaff":"#eef0f3"}`,background:val?"#f5f8ff":"#fafbfc",overflow:"hidden" }}>
                              <div style={{ padding:"11px 14px",display:"flex",alignItems:"center",gap:8 }}>
                                <span style={{ fontSize:16,flexShrink:0 }}>{field.icon}</span>
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ fontSize:11,fontWeight:700,color:"#666",marginBottom:val?4:0 }}>{field.label_ar}</div>
                                  {val ? (
                                    <div style={{ fontSize:13,color:"#353535",lineHeight:1.7,whiteSpace:"pre-wrap" }}>{val}</div>
                                  ) : (
                                    <div style={{ fontSize:11,color:"#ccc",fontStyle:"italic" }}>لم يُسجَّل بعد</div>
                                  )}
                                </div>
                                {val && <span style={{ fontSize:10,background:"rgba(8,99,186,.1)",color:"#0863ba",fontWeight:700,padding:"2px 7px",borderRadius:20,flexShrink:0 }}>مُعبَّأ</span>}
                              </div>
                            </div>
                          );
                        })}


                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes modalIn { from { opacity:0; transform:scale(.96) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc",fontFamily:"Rubik,sans-serif" }}>
      <div style={{ textAlign:"center",color:"#aaa" }}><div style={{ fontSize:40,marginBottom:16 }}>⏳</div><div>جاري التحقق...</div></div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",direction:"rtl" }}>
      <div style={{ textAlign:"center",padding:40,maxWidth:360 }}>
        <div style={{ fontSize:56,marginBottom:16 }}>🔒</div>
        <h2 style={{ fontSize:20,fontWeight:800,color:"#353535",marginBottom:8 }}>رابط غير صالح</h2>
        <p style={{ fontSize:13,color:"#888",lineHeight:1.7 }}>هذا الرابط غير موجود أو لم يتم تفعيل الدخول المقيّد لهذه العيادة. تواصل مع الطبيب المسؤول للحصول على رابط صحيح.</p>
      </div>
    </div>
  );
}
// ════════════════════════════════════════════════════════════
// ─── تبويب المواعيد ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function AppointmentsTab({
  clinicColor, isMobile, appointments, doctors, isShared, loading, patients,
  selectedDoctorId, setSelectedDoctorId,
  viewMonth, setViewMonth, viewYear, setViewYear,
  selectedKey, setSelectedKey, todayKey,
}: {
  clinicColor: string; isMobile: boolean; appointments: Appointment[]; doctors: Doctor[];
  isShared: boolean; loading: boolean; patients: Patient[];
  selectedDoctorId: number | "all"; setSelectedDoctorId: (v: number | "all") => void;
  viewMonth: number; setViewMonth: (n: number) => void;
  viewYear: number; setViewYear: (n: number) => void;
  selectedKey: string; setSelectedKey: (k: string) => void; todayKey: string;
}) {
  const getPatientName = (pid: number) => patients.find(p => p.id === pid)?.name ?? "—";

  const countByKey: Record<string,number> = {};
  appointments.forEach(a => { countByKey[a.date] = (countByKey[a.date]||0)+1; });

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const calDays: (number|null)[] = [];
  for (let i=0;i<firstDay;i++) calDays.push(null);
  for (let d=1;d<=daysInMonth;d++) calDays.push(d);

  const weekDays = ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];

  const dayAppointments = appointments
    .filter(a => a.date === selectedKey)
    .filter(a => {
      if (!isShared) return true;
      if (selectedDoctorId === "all") return true;
      return (a as any).doctor_id === selectedDoctorId;
    })
    .sort((a,b)=>a.time.localeCompare(b.time));

  const selDate  = selectedKey.split("-");
  const selLabel = selDate.length===3 ? `${parseInt(selDate[2])} ${APPT_MONTHS_AR[parseInt(selDate[1])-1]} ${selDate[0]}` : selectedKey;

  return (
    <div style={{ maxWidth:isMobile?"100%":1100,margin:"0 auto",padding:isMobile?"16px 12px 40px":"24px 16px 40px" }}>
      <div style={{ display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:18 }}>

        {/* ── التقويم ── */}
        <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
          <div style={{ padding:"14px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <button onClick={()=>{ let m=viewMonth-1,y=viewYear; if(m<0){m=11;y--;} setViewMonth(m);setViewYear(y); }} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
            <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{APPT_MONTHS_AR[viewMonth]} {viewYear}</div>
            <button onClick={()=>{ let m=viewMonth+1,y=viewYear; if(m>11){m=0;y++;} setViewMonth(m);setViewYear(y); }} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
          </div>
          <div style={{ padding:"10px 12px" }}>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4 }}>
              {weekDays.map(d=><div key={d} style={{ textAlign:"center",fontSize:9,fontWeight:700,color:"#bbb",padding:"3px 0" }}>{d}</div>)}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
              {calDays.map((d,i)=>{
                if(!d) return <div key={i}/>;
                const k = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const cnt = countByKey[k]||0;
                const isSel=k===selectedKey, isTod=k===todayKey;
                return (
                  <div key={i} onClick={()=>setSelectedKey(k)}
                    style={{ borderRadius:8,cursor:"pointer",transition:"all .15s",aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,background:isSel?"#0863ba":isTod?"rgba(8,99,186,.08)":"transparent",color:isSel?"#fff":isTod?"#0863ba":"#353535",border:isTod&&!isSel?"1.5px solid rgba(8,99,186,.2)":"1.5px solid transparent" }}>
                    <span style={{ fontSize:12,fontWeight:isSel||isTod?700:400 }}>{d}</span>
                    {cnt>0&&<div style={{ width:14,height:4,borderRadius:3,background:isSel?"rgba(255,255,255,.6)":"#0863ba" }}/>}
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setSelectedKey(todayKey)} style={{ width:"100%",marginTop:10,padding:"7px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer" }}>
              📅 اليوم
            </button>
          </div>
        </div>

        {/* ── مواعيد اليوم المحدد ── */}
        <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
          <div style={{ padding:"16px 20px 12px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
            <div>
              <h3 style={{ fontSize:15,fontWeight:800,color:"#353535" }}>{selLabel}</h3>
              <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{dayAppointments.length} مواعيد</p>
            </div>
            {isShared && doctors.length > 0 && (
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value === "all" ? "all" : Number(e.target.value))}
                style={{ padding:"6px 10px",border:"1.5px solid rgba(8,99,186,.18)",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,color:"#0863ba",background:"rgba(8,99,186,.05)",cursor:"pointer",outline:"none",maxWidth:isMobile?140:200 }}
              >
                <option value="all">جميع الأطباء</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
          </div>

          <div style={{ padding:"12px 16px 16px" }}>
            {loading ? (
              <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px" }}/>
                <div style={{ fontSize:14,fontWeight:600 }}>جاري التحميل...</div>
              </div>
            ) : dayAppointments.length === 0 ? (
              <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                <div style={{ fontSize:44,marginBottom:14 }}>📅</div>
                <div style={{ fontSize:15,fontWeight:600 }}>لا توجد مواعيد في هذا اليوم</div>
              </div>
            ) : isShared ? (
              /* ══ جدول مشترك — حسب الطبيب (كما في صفحة المواعيد) ══ */
              (() => {
                const docIdsOrdered: (number | null)[] = [];
                [...dayAppointments].sort((a,b)=>a.time.localeCompare(b.time)).forEach(appt => {
                  const docId = (appt as any).doctor_id ?? null;
                  if (!docIdsOrdered.includes(docId)) docIdsOrdered.push(docId);
                });
                const tableDocList = docIdsOrdered.map(docId => ({
                  id: docId,
                  doc: docId ? doctors.find(d => d.id === docId) ?? null : null,
                }));

                const uniqueTimes = [...new Set(dayAppointments.map(a => a.time.slice(0,5)))].sort();

                const apptMap: Record<string, Record<string, Appointment>> = {};
                dayAppointments.forEach(appt => {
                  const t = appt.time.slice(0,5);
                  const d = String((appt as any).doctor_id ?? "null");
                  if (!apptMap[t]) apptMap[t] = {};
                  apptMap[t][d] = appt;
                });

                const colW = Math.max(140, Math.floor(420 / tableDocList.length));

                return (
                  <div style={{ overflowX:"auto", borderRadius:16, border:"1.5px solid #e8edf5", boxShadow:"0 4px 20px rgba(8,99,186,.07)" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", minWidth: 60 + tableDocList.length * colW }}>
                      <thead>
                        <tr>
                          <th style={{
                            width:64, minWidth:64,
                            background:"linear-gradient(135deg,#0863ba,#054a8c)",
                            padding:"14px 10px", textAlign:"center", color:"#fff",
                            fontSize:11, fontWeight:700, letterSpacing:.5,
                            borderInlineEnd:"2px solid rgba(255,255,255,.15)",
                            position:"sticky", right:0, zIndex:2,
                          }}>
                            الساعة
                          </th>
                          {tableDocList.map((d, i) => {
                            const dc = APPT_DOC_COLORS[i % APPT_DOC_COLORS.length];
                            return (
                              <th key={i} style={{
                                background:`linear-gradient(135deg,${dc}18,${dc}08)`,
                                borderBottom:`3px solid ${dc}`,
                                borderInlineEnd: i < tableDocList.length-1 ? `1.5px solid ${dc}18` : "none",
                                padding:"12px 10px", textAlign:"center", minWidth:colW,
                              }}>
                                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                                  <div style={{ width:38,height:38,borderRadius:10,background:dc,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,boxShadow:`0 3px 10px ${dc}50` }}>
                                    {d.doc ? getInitials(d.doc.name) : "?"}
                                  </div>
                                  <div style={{ fontSize:12,fontWeight:800,color:dc,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:colW-16 }}>
                                    {d.doc ? d.doc.name : "غير محدد"}
                                  </div>
                                  {d.doc?.specialty && (
                                    <div style={{ fontSize:10,color:"#aaa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:colW-16 }}>
                                      {d.doc.specialty}
                                    </div>
                                  )}
                                  <div style={{ background:`${dc}15`,border:`1px solid ${dc}30`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,color:dc }}>
                                    {dayAppointments.filter(a=>(a as any).doctor_id===d.id).length} مواعيد
                                  </div>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueTimes.map((time, ri) => {
                          const isEven = ri % 2 === 0;
                          const rowHasMultiple = Object.keys(apptMap[time] ?? {}).length > 1;
                          return (
                            <tr key={time} style={{ background: rowHasMultiple ? "rgba(8,99,186,.03)" : (isEven ? "#fff" : "#fafbfc") }}>
                              <td style={{
                                padding:"10px 8px", textAlign:"center",
                                background:"linear-gradient(135deg,#f0f6ff,#e8f0fb)",
                                borderInlineEnd:"2px solid #e0eaf6",
                                borderBottom:"1px solid #eef0f3",
                                position:"sticky", right:0, zIndex:1, verticalAlign:"middle",
                              }}>
                                <div style={{ fontSize:15,fontWeight:900,color:"#0863ba",lineHeight:1 }}>{time}</div>
                                {rowHasMultiple && <div style={{ fontSize:9,color:"#0863ba",opacity:.6,marginTop:2,fontWeight:600 }}>تعارض</div>}
                              </td>
                              {tableDocList.map((d, ci) => {
                                const dc = APPT_DOC_COLORS[ci % APPT_DOC_COLORS.length];
                                const appt = apptMap[time]?.[String(d.id ?? "null")];
                                return (
                                  <td key={ci} style={{ padding:"7px 8px", borderInlineEnd: ci < tableDocList.length-1 ? `1.5px solid ${dc}15` : "none", borderBottom:"1px solid #eef0f3", verticalAlign:"middle" }}>
                                    {appt ? (() => {
                                      const pName = getPatientName(appt.patient_id);
                                      const bColor = APPT_STATUS_COLOR[appt.status] ?? "#888";
                                      return (
                                        <div style={{ background:`linear-gradient(135deg,${bColor}10,${bColor}05)`, border:`1.5px solid ${bColor}35`, borderRadius:10, padding:"8px 10px", display:"flex", flexDirection:"column", gap:5, boxShadow:`0 2px 8px ${bColor}15` }}>
                                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                                            <div style={{ width:26,height:26,borderRadius:7,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0 }}>
                                              {pName!=="—"?getInitials(pName):"?"}
                                            </div>
                                            <div style={{ fontSize:11,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>
                                              {pName}
                                            </div>
                                          </div>
                                          <div style={{ display:"flex",alignItems:"center",gap:4,flexWrap:"wrap" }}>
                                            <span style={{ fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20,background:bColor,color:"#fff" }}>
                                              {APPT_STATUS_LABEL[appt.status] ?? appt.status}
                                            </span>
                                            <span style={{ fontSize:9,color:"#aaa" }}>{appt.duration ?? 30}د</span>
                                            {appt.type && <span style={{ fontSize:9,color:"#999",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:70 }}>{appt.type}</span>}
                                          </div>
                                        </div>
                                      );
                                    })() : (
                                      <div style={{ height:36,borderRadius:8,background:`${dc}06`,border:`1.5px dashed ${dc}25` }}/>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              /* ══ عرض عادي — للخطط الفردية ══ */
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {dayAppointments.map(appt => {
                  const name = getPatientName(appt.patient_id);
                  const bColor = APPT_STATUS_COLOR[appt.status] ?? "#888";
                  return (
                    <div key={appt.id} style={{ background:`${bColor}08`, border:`1.5px solid ${bColor}30`, borderInlineStartWidth:4, borderInlineStartColor:bColor, borderRadius:14, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}>
                      <div style={{ flexShrink:0,textAlign:"center",minWidth:48,background:"rgba(255,255,255,.7)",borderRadius:10,padding:"6px 8px",border:`1px solid ${bColor}20` }}>
                        <div style={{ fontSize:15,fontWeight:800,color:bColor,lineHeight:1 }}>{appt.time.slice(0,5)}</div>
                        <div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{appt.duration ?? 30} دقيقة</div>
                      </div>
                      <div style={{ width:38,height:38,borderRadius:10,background:getColor(appt.patient_id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>
                        {name!=="—"?getInitials(name):"?"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
                        <div style={{ fontSize:11,color:"#999",marginTop:2 }}>
                          {appt.type && <span>{appt.type} · </span>}
                          <span style={{ fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20,background:"#fff",color:bColor,border:`1px solid ${bColor}30` }}>
                            {APPT_STATUS_LABEL[appt.status] ?? appt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}