"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Patient Portal — بوابة المريض
// تسجيل الدخول عبر رقم الهاتف + رقم السجل الطبي (MRN)
// يعرض سجلات المريض من جميع العيادات المسجل فيها
// ============================================================

type ClinicType =
  | "general" | "dental" | "dermatology" | "cosmetic" | "pediatrics"
  | "physical_therapy" | "mental_health" | "nutrition" | "ophthalmology"
  | "orthopedic" | "cardiology" | "gynecology" | "ent" | "urology" | "other";

const CLINIC_TYPE_META: Record<ClinicType, { icon: string; color: string; ar: string; en: string }> = {
  general:          { icon: "🏥", color: "#16a085", ar: "طب عام",           en: "General Medicine"   },
  dental:           { icon: "🦷", color: "#0863ba", ar: "أسنان",            en: "Dental"             },
  dermatology:      { icon: "🧴", color: "#e67e22", ar: "جلدية",            en: "Dermatology"        },
  cosmetic:         { icon: "💆", color: "#8e44ad", ar: "تجميلية",          en: "Cosmetic"           },
  pediatrics:       { icon: "👶", color: "#27ae60", ar: "أطفال",            en: "Pediatrics"         },
  physical_therapy: { icon: "🏃", color: "#2e7d32", ar: "علاج فيزيائي",    en: "Physical Therapy"   },
  mental_health:    { icon: "🧠", color: "#6c3fc5", ar: "صحة نفسية",       en: "Mental Health"      },
  nutrition:        { icon: "🥗", color: "#27ae60", ar: "تغذية",            en: "Nutrition"          },
  ophthalmology:    { icon: "👁️", color: "#2980b9", ar: "عيون",            en: "Ophthalmology"      },
  orthopedic:       { icon: "🦴", color: "#c0392b", ar: "عظام ومفاصل",     en: "Orthopedics"        },
  cardiology:       { icon: "❤️", color: "#e74c3c", ar: "قلب وشرايين",     en: "Cardiology"         },
  gynecology:       { icon: "🌸", color: "#e91e63", ar: "نساء وتوليد",     en: "Gynecology"         },
  ent:              { icon: "👂", color: "#795548", ar: "أنف وأذن وحنجرة", en: "ENT"                },
  urology:          { icon: "💧", color: "#2196f3", ar: "مسالك بولية",     en: "Urology"            },
  other:            { icon: "🏨", color: "#607d8b", ar: "أخرى",            en: "Other"              },
};

const MEDICAL_FIELDS_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  allergies:           { ar: "الحساسية",                  en: "Allergies",                icon: "🤧" },
  medications:         { ar: "الأدوية الحالية",            en: "Current Medications",       icon: "💊" },
  surgeries:           { ar: "العمليات السابقة",           en: "Past Surgeries",            icon: "🔪" },
  family_history:      { ar: "التاريخ العائلي",            en: "Family History",            icon: "👨‍👩‍👧" },
  chronic_diseases:    { ar: "الأمراض المزمنة",           en: "Chronic Diseases",          icon: "🏥" },
  extended_notes:      { ar: "ملاحظات الطبيب",            en: "Doctor Notes",              icon: "📝" },
  dental_history:      { ar: "التاريخ الطبي السني",        en: "Dental History",            icon: "🦷" },
  tmj_issues:          { ar: "مشاكل مفصل الفك",           en: "TMJ Issues",                icon: "🦴" },
  skin_history:        { ar: "التاريخ الجلدي",            en: "Dermatological History",    icon: "🧴" },
  sun_exposure:        { ar: "التعرض للشمس",              en: "Sun Exposure",              icon: "☀️" },
  prev_procedures:     { ar: "الإجراءات التجميلية السابقة", en: "Previous Cosmetic Procedures", icon: "✨" },
  expectations:        { ar: "التوقعات والأهداف",         en: "Goals & Expectations",     icon: "🎯" },
  birth_history:       { ar: "تاريخ الولادة",             en: "Birth History",             icon: "👶" },
  developmental:       { ar: "مراحل النمو والتطور",       en: "Developmental Milestones", icon: "📈" },
  vaccinations:        { ar: "جدول التطعيمات",            en: "Vaccination Schedule",      icon: "💉" },
  injury_details:      { ar: "تفاصيل الإصابة",            en: "Injury Details",            icon: "🦴" },
  pain_scale:          { ar: "وصف الألم",                 en: "Pain Description",          icon: "😣" },
  functional_goals:    { ar: "الأهداف الوظيفية",          en: "Functional Goals",          icon: "🎯" },
  exercise_history:    { ar: "تاريخ التمارين",            en: "Exercise History",          icon: "🏋️" },
  chief_complaint:     { ar: "الشكوى الرئيسية",           en: "Chief Complaint",           icon: "💭" },
  therapy_history:     { ar: "تاريخ العلاج النفسي",       en: "Therapy History",           icon: "🧠" },
  sleep_pattern:       { ar: "نمط النوم",                 en: "Sleep Pattern",             icon: "🌙" },
  social_support:      { ar: "الدعم الاجتماعي",          en: "Social Support",            icon: "🤝" },
  dietary_restrictions:{ ar: "القيود الغذائية",           en: "Dietary Restrictions",     icon: "🚫" },
  food_allergies:      { ar: "حساسية الطعام",             en: "Food Allergies",            icon: "🤧" },
  weight_history:      { ar: "تاريخ الوزن",               en: "Weight History",            icon: "⚖️" },
  eating_habits:       { ar: "العادات الغذائية",          en: "Eating Habits",             icon: "🍽️" },
  eye_history:         { ar: "التاريخ البصري",             en: "Eye History",               icon: "👁️" },
  glasses_history:     { ar: "تاريخ النظارات",            en: "Glasses/Lens History",      icon: "👓" },
  fracture_history:    { ar: "تاريخ الكسور",              en: "Fracture History",          icon: "🦴" },
  joint_replacement:   { ar: "تركيب مفصل صناعي",         en: "Joint Replacement",         icon: "🔩" },
  chest_pain:          { ar: "وصف ألم الصدر",             en: "Chest Pain Description",    icon: "💔" },
  cardiac_history:     { ar: "التاريخ القلبي",            en: "Cardiac History",           icon: "❤️" },
  pregnancy_info:      { ar: "معلومات الحمل",             en: "Pregnancy Info",            icon: "🌸" },
  menstrual_history:   { ar: "تاريخ الدورة الشهرية",     en: "Menstrual History",         icon: "📅" },
  hearing_history:     { ar: "التاريخ السمعي",            en: "Hearing History",           icon: "👂" },
  sinus_history:       { ar: "تاريخ الجيوب الأنفية",      en: "Sinus History",             icon: "👃" },
  urinary_history:     { ar: "التاريخ البولي",            en: "Urinary History",           icon: "💧" },
  kidney_history:      { ar: "تاريخ الكلى",               en: "Kidney History",            icon: "🫘" },
};

type Lang = "ar" | "en";

type ClinicRecord = {
  clinic_name: string;
  clinic_type: ClinicType;
  doctor_name: string;
  patient_id: number;
  mrn: string;
  medical_fields: Record<string, string>;
  xrays: { id: string; url: string; type: string; date: string; note: string; name: string }[];
  patient_info: {
    name: string;
    phone: string;
    gender: string;
    date_of_birth: string | null;
    has_diabetes: boolean;
    has_hypertension: boolean;
    notes: string;
  };
};

type MasterPatient = {
  name: string;
  phone: string;
  mrn: string;
};

// ── ترجمات بوابة المريض ─────────────────────────────────────
const T = {
  ar: {
    appName: "نبض",
    appSub: "بوابة المريض",
    login: {
      title: "مرحباً بك في بوابة المريض",
      subtitle: "سجّل دخولك للاطلاع على ملفك الطبي في جميع عياداتك",
      phone: "رقم الهاتف",
      phonePh: "05xxxxxxxx",
      mrn: "رقم السجل الطبي (MRN)",
      mrnPh: "مثال: NABD-00001",
      login: "دخول",
      logging: "جارٍ التحقق...",
      error: "رقم الهاتف أو رقم السجل الطبي غير صحيح، يرجى المحاولة مجدداً",
      helpText: "رقم السجل الطبي يُعطى لك من قِبَل الطبيب عند تسجيلك",
    },
    portal: {
      hello: "مرحباً،",
      mrn: "رقم السجل الطبي",
      clinics: "عياداتي",
      noClinics: "لا توجد سجلات طبية حتى الآن",
      noRecords: "لا توجد بيانات مسجلة في هذا الملف",
      medical: "السجل الطبي",
      xrays: "الأشعة",
      noXrays: "لا توجد صور أشعة",
      personalInfo: "معلوماتي الشخصية",
      name: "الاسم",
      phone: "الهاتف",
      gender: "الجنس",
      dob: "تاريخ الميلاد",
      age: "العمر",
      years: "سنة",
      conditions: "حالات مزمنة",
      diabetes: "السكري",
      hypertension: "ضغط الدم",
      male: "ذكر",
      female: "أنثى",
      logout: "تسجيل الخروج",
      lastUpdated: "آخر تحديث",
      clinic: "العيادة",
      doctor: "الطبيب",
      patientId: "رقم المريض في العيادة",
      noContent: "لم يُضَف محتوى لهذا الحقل بعد",
    },
  },
  en: {
    appName: "NABD",
    appSub: "Patient Portal",
    login: {
      title: "Welcome to Patient Portal",
      subtitle: "Sign in to view your medical records across all your clinics",
      phone: "Phone Number",
      phonePh: "05xxxxxxxx",
      mrn: "Medical Record Number (MRN)",
      mrnPh: "e.g. NABD-00001",
      login: "Sign In",
      logging: "Verifying...",
      error: "Phone number or MRN is incorrect. Please try again.",
      helpText: "Your MRN is provided by your doctor upon registration",
    },
    portal: {
      hello: "Hello,",
      mrn: "Medical Record Number",
      clinics: "My Clinics",
      noClinics: "No medical records found",
      noRecords: "No data recorded in this file",
      medical: "Medical Record",
      xrays: "X-Rays",
      noXrays: "No X-ray images",
      personalInfo: "My Personal Info",
      name: "Name",
      phone: "Phone",
      gender: "Gender",
      dob: "Date of Birth",
      age: "Age",
      years: "yrs",
      conditions: "Chronic Conditions",
      diabetes: "Diabetes",
      hypertension: "Hypertension",
      male: "Male",
      female: "Female",
      logout: "Sign Out",
      lastUpdated: "Last Updated",
      clinic: "Clinic",
      doctor: "Doctor",
      patientId: "Patient ID at Clinic",
      noContent: "No content added to this field yet",
    },
  },
} as const;

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Clinic Card ─────────────────────────────────────────────
function ClinicCard({ record, lang, isExpanded, onToggle }: {
  record: ClinicRecord;
  lang: Lang;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = T[lang].portal;
  const isAr = lang === "ar";
  const meta = CLINIC_TYPE_META[record.clinic_type] ?? CLINIC_TYPE_META.other;
  const [activeTab, setActiveTab] = useState<"medical" | "xrays">("medical");

  const medEntries = Object.entries(record.medical_fields ?? {}).filter(([, v]) => v && v.trim());
  const xrays = record.xrays ?? [];

  return (
    <div style={{
      borderRadius: 20, overflow: "hidden",
      border: `1.5px solid ${isExpanded ? meta.color + "40" : "#eef0f3"}`,
      background: "#fff",
      boxShadow: isExpanded
        ? `0 8px 24px rgba(8,99,186,0.10)`
        : "0 4px 24px rgba(8,99,186,0.06)",
      transition: "all .25s",
      marginBottom: 0,
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          gap: 14, padding: "18px 20px",
          background: isExpanded
            ? `linear-gradient(135deg, ${meta.color}12, ${meta.color}06)`
            : "transparent",
          border: "none", cursor: "pointer",
          fontFamily: "Rubik, sans-serif",
          direction: isAr ? "rtl" : "ltr",
          textAlign: isAr ? "right" : "left",
        }}
      >
        {/* Clinic icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: meta.color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
          border: `1.5px solid ${meta.color}30`,
        }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 800, color: "#1a1a2e",
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          }}>
            {record.clinic_name}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 8px",
              borderRadius: 20, background: meta.color + "18",
              color: meta.color, flexShrink: 0,
            }}>
              {isAr ? meta.ar : meta.en}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
            {isAr ? "د." : "Dr."} {record.doctor_name}
          </div>
        </div>

        <div style={{
          fontSize: 18, color: meta.color, flexShrink: 0,
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform .25s",
        }}>
          ⌄
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div style={{
          borderTop: `1.5px solid ${meta.color}20`,
          animation: "fadeIn .2s ease",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex",
            borderBottom: "1.5px solid #f0f2f5",
            padding: "0 20px",
            direction: isAr ? "rtl" : "ltr",
          }}>
            {(["medical", "xrays"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 16px", border: "none", cursor: "pointer",
                  fontFamily: "Rubik, sans-serif", fontSize: 13, fontWeight: 700,
                  color: activeTab === tab ? meta.color : "#aaa",
                  borderBottom: activeTab === tab ? `2.5px solid ${meta.color}` : "2.5px solid transparent",
                  background: "transparent", marginBottom: -1.5,
                  transition: "all .15s",
                }}
              >
                {tab === "medical"
                  ? (isAr ? "📋 " + t.medical : "📋 " + t.medical)
                  : (isAr ? "🩻 " + t.xrays : "🩻 " + t.xrays)}
              </button>
            ))}
          </div>

          <div style={{ padding: "20px" }}>
            {activeTab === "medical" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {medEntries.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "32px 0",
                    color: "#ccc", fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    {t.noRecords}
                  </div>
                ) : medEntries.map(([key, value]) => {
                  const fieldMeta = MEDICAL_FIELDS_LABELS[key];
                  const label = fieldMeta
                    ? (isAr ? fieldMeta.ar : fieldMeta.en)
                    : key;
                  const icon = fieldMeta?.icon ?? "📌";
                  return (
                    <div key={key} style={{
                      background: "#fafbfc",
                      borderRadius: 12,
                      padding: "14px 16px",
                      border: "1.5px solid #f0f2f5",
                      direction: isAr ? "rtl" : "ltr",
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: "#888",
                        marginBottom: 6, display: "flex", alignItems: "center", gap: 5,
                      }}>
                        <span>{icon}</span>
                        <span style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {label}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 14, color: "#2d3748", lineHeight: 1.6,
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "xrays" && (
              <div>
                {xrays.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "32px 0",
                    color: "#ccc", fontSize: 13,
                  }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🩻</div>
                    {t.noXrays}
                  </div>
                ) : (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: 10,
                  }}>
                    {xrays.map(img => (
                      <div key={img.id} style={{
                        borderRadius: 12, overflow: "hidden",
                        border: "1.5px solid #eef0f3",
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
                      }}>
                        <div style={{
                          position: "relative", aspectRatio: "4/3",
                          overflow: "hidden", background: "#f0f2f5",
                        }}>
                          <img
                            src={img.url} alt={img.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>
                            {img.type}
                          </div>
                          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{img.date}</div>
                          {img.note && (
                            <div style={{
                              fontSize: 10, color: "#888", marginTop: 3,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {img.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Portal Dashboard ─────────────────────────────────────────
function PatientDashboard({ master, lang, onLogout }: {
  master: MasterPatient;
  lang: Lang;
  onLogout: () => void;
}) {
  const t = T[lang].portal;
  const isAr = lang === "ar";
  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [patientInfo, setPatientInfo] = useState<ClinicRecord["patient_info"] | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) جلب جميع سجلات هذا المريض من patients بالهاتف
        const { data: patientsData, error: pErr } = await supabase
          .from("patients")
          .select("*")
          .eq("phone", master.phone);

        if (pErr) console.error("patients fetch error:", pErr);
        if (!patientsData || patientsData.length === 0) {
          setLoading(false);
          return;
        }

        // 2) جلب بيانات العيادات بـ user_id
        const userIds = [...new Set((patientsData as any[]).map((p: any) => p.user_id).filter(Boolean))];
        const clinicsMap: Record<string, any> = {};

        if (userIds.length > 0) {
          const { data: clinicsData } = await supabase
            .from("clinics")
            .select("user_id, name, clinic_type, owner")
            .in("user_id", userIds);

          (clinicsData ?? []).forEach((c: any) => {
            clinicsMap[c.user_id] = c;
          });
        }

        // 3) جلب الملفات الطبية من patient_profiles
        const patientIds = (patientsData as any[]).map((p: any) => p.id);
        const { data: profilesData } = await supabase
          .from("patient_profiles")
          .select("patient_id, medical_fields, xrays")
          .in("patient_id", patientIds);

        const profilesMap: Record<number, any> = {};
        (profilesData ?? []).forEach((pr: any) => {
          profilesMap[pr.patient_id] = pr;
        });

        // 4) بناء قائمة السجلات النهائية
        const built: ClinicRecord[] = (patientsData as any[]).map((p: any) => {
          const clinic = clinicsMap[p.user_id] ?? {};
          const prof = profilesMap[p.id] ?? {};

          return {
            clinic_name: clinic?.name ?? "—",
            clinic_type: (clinic?.clinic_type || "other") as ClinicType,
            doctor_name: clinic?.owner ?? "—",
            patient_id: p.id,
            mrn: master.mrn,
            medical_fields: prof.medical_fields ?? {},
            xrays: prof.xrays ?? [],
            patient_info: {
              name: p.name,
              phone: p.phone,
              gender: p.gender,
              date_of_birth: p.date_of_birth,
              has_diabetes: p.has_diabetes,
              has_hypertension: p.has_hypertension,
              notes: p.notes,
            },
          } satisfies ClinicRecord;
        });

        setRecords(built);
        if (built.length > 0) setPatientInfo(built[0].patient_info);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [master.phone, master.mrn]);

  const age = calcAge(patientInfo?.date_of_birth ?? null);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#f7f9fc",
      fontFamily: "Rubik, sans-serif",
      direction: isAr ? "rtl" : "ltr",
    }}>
      {/* Top bar */}
      <div style={{
        background: "linear-gradient(135deg, #0863ba 0%, #054a8c 100%)",
        padding: "0 20px",
        position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 4px 20px rgba(8,99,186,0.25)",
      }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 60,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)" }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                {isAr ? "نبض | NABD" : "NABD | نبض"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)" }}>
                {T[lang].appSub}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 20,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              color: "#fff", cursor: "pointer",
              fontFamily: "Rubik, sans-serif", fontSize: 12, fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {t.logout}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* Welcome card */}
        <div style={{
          background: "linear-gradient(135deg, #0863ba, #05a0c4)",
          borderRadius: 20, padding: "22px 24px", marginBottom: 20,
          color: "#fff", boxShadow: "0 8px 32px rgba(8,99,186,0.3)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -40, right: isAr ? undefined : -40,
            left: isAr ? -40 : undefined,
            width: 150, height: 150, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)",
          }} />
          <div style={{
            position: "absolute", bottom: -30, left: isAr ? undefined : -30,
            right: isAr ? -30 : undefined,
            width: 100, height: 100, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>
              {t.hello}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
              {patientInfo?.name ?? master.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.18)",
                borderRadius: 20, padding: "6px 14px",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.5px" }}>
                  {t.mrn}: {master.mrn}
                </span>
              </div>
              {age !== null && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 20, padding: "6px 14px",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}>
                  <span style={{ fontSize: 13 }}>🎂</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {age} {t.years}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Personal Info */}
        {patientInfo && (
          <div style={{
            background: "#fff", borderRadius: 20, padding: "18px 20px",
            marginBottom: 20, border: "1.5px solid #eef0f3",
            boxShadow: "0 4px 24px rgba(8,99,186,0.08)",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#888",
              marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.6px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>👤</span> {t.personalInfo}
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "12px 20px",
            }}>
              {[
                { label: t.name, value: patientInfo.name, icon: "🏷️" },
                { label: t.phone, value: patientInfo.phone, icon: "📱" },
                {
                  label: t.gender,
                  value: patientInfo.gender === "male" ? t.male : patientInfo.gender === "female" ? t.female : "—",
                  icon: patientInfo.gender === "male" ? "👨" : "👩",
                },
                {
                  label: t.age,
                  value: age !== null ? `${age} ${t.years}` : patientInfo.date_of_birth ?? "—",
                  icon: "🎂",
                },
              ].map(({ label, value, icon }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "#aaa", fontWeight: 700, marginBottom: 4 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2d3748" }}>
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Conditions */}
            {(patientInfo.has_diabetes || patientInfo.has_hypertension) && (
              <div style={{
                marginTop: 14, paddingTop: 14,
                borderTop: "1.5px solid #f0f2f5",
                display: "flex", gap: 8, flexWrap: "wrap",
              }}>
                {patientInfo.has_diabetes && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "5px 12px",
                    borderRadius: 20, background: "#fef3c7", color: "#d97706",
                    border: "1.5px solid #fde68a",
                  }}>
                    💉 {t.diabetes}
                  </span>
                )}
                {patientInfo.has_hypertension && (
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "5px 12px",
                    borderRadius: 20, background: "#fce7f3", color: "#be185d",
                    border: "1.5px solid #fbcfe8",
                  }}>
                    ❤️ {t.hypertension}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clinics Section */}
        <div style={{
          fontSize: 12, fontWeight: 700, color: "#888",
          marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.6px",
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 4px",
        }}>
          <span>🏥</span>
          {t.clinics}
          {records.length > 0 && (
            <span style={{
              background: "#0863ba", color: "#fff",
              fontSize: 10, fontWeight: 800, padding: "2px 7px",
              borderRadius: 20, marginInlineStart: 4,
            }}>
              {records.length}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid #e8eaed",
              borderTop: "3px solid #0863ba",
              margin: "0 auto 12px",
              animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 13, color: "#bbb" }}>
              {isAr ? "جارٍ تحميل سجلاتك الطبية..." : "Loading your medical records..."}
            </div>
          </div>
        ) : records.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 18, padding: "48px 20px",
            textAlign: "center", border: "1.5px dashed #e8eaed",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#888" }}>
              {t.noClinics}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {records.map((record, idx) => (
              <ClinicCard
                key={record.patient_id}
                record={record}
                lang={lang}
                isExpanded={expandedIdx === idx}
                onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "8px 0 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
        <img src="/Logo_Nabd.svg" alt="NABD" style={{ width: 18, height: 18, borderRadius: 4 }} />
        <span style={{ fontSize: 12, color: "#bbb" }}>{isAr ? "مدعوم بواسطة نبض" : "Powered by NABD"}</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap');
        *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────
export default function PatientPortalPage() {
  const [lang] = useState<Lang>("ar");
  const [master, setMaster] = useState<MasterPatient | null>(null);

  // استعادة الجلسة عند تحديث الصفحة — وإلا التوجيه لبوابة الدخول الموحدة
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("nabd_patient");
      if (saved) {
        setMaster(JSON.parse(saved));
        return;
      }
    } catch { /* ignore */ }
    window.location.href = "/portal?type=patient";
  }, []);

  const handleLogout = () => {
    try { sessionStorage.removeItem("nabd_patient"); } catch { /* ignore */ }
    setMaster(null);
    window.location.href = "/portal?type=patient";
  };

  return master ? (
    <PatientDashboard
      master={master}
      lang={lang}
      onLogout={handleLogout}
    />
  ) : (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f8fafc", fontFamily: "'Rubik', sans-serif",
    }}>
      <div style={{
        width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#0863ba",
        borderRadius: "50%", animation: "spin .7s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}