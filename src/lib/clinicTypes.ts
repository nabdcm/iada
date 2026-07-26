// ============================================================
// src/lib/clinicTypes.ts
// المصدر الوحيد لأنواع العيادات — كان معرّفاً يدوياً في 7 ملفات
// بتعريفات غير متطابقة. أي نوع جديد يُضاف هنا فقط.
// ============================================================

export const CLINIC_TYPES = [
  "general",
  "internal_medicine",
  "dental",
  "dermatology",
  "cosmetic",
  "pediatrics",
  "gynecology",
  "cardiology",
  "neurology",
  "endocrinology",
  "pulmonology",
  "gastroenterology",
  "nephrology",
  "hematology",
  "oncology",
  "rheumatology",
  "general_surgery",
  "orthopedic",
  "ophthalmology",
  "ent",
  "urology",
  "physical_therapy",
  "mental_health",
  "nutrition",
  "other",
] as const;

export type ClinicType = (typeof CLINIC_TYPES)[number];

export type ClinicTypeMeta = { icon: string; color: string; ar: string; en: string };

export const CLINIC_TYPE_META: Record<ClinicType, ClinicTypeMeta> = {
  general:           { icon: "🏥", color: "#16a085", ar: "طب عام",             en: "General Medicine"   },
  internal_medicine: { icon: "🩺", color: "#0d7f6f", ar: "باطنية",             en: "Internal Medicine"  },
  dental:            { icon: "🦷", color: "#0863ba", ar: "أسنان",              en: "Dental"             },
  dermatology:       { icon: "🧴", color: "#e67e22", ar: "جلدية",              en: "Dermatology"        },
  cosmetic:          { icon: "💆", color: "#8e44ad", ar: "تجميلية",            en: "Cosmetic"           },
  pediatrics:        { icon: "👶", color: "#27ae60", ar: "أطفال",              en: "Pediatrics"         },
  gynecology:        { icon: "🌸", color: "#e91e63", ar: "نساء وتوليد",        en: "Gynecology"         },
  cardiology:        { icon: "❤️", color: "#e74c3c", ar: "قلب وشرايين",        en: "Cardiology"         },
  neurology:         { icon: "🧠", color: "#5b4bc4", ar: "عصبية",              en: "Neurology"          },
  endocrinology:     { icon: "🧬", color: "#00897b", ar: "غدد صم وسكري",       en: "Endocrinology"      },
  pulmonology:       { icon: "🫁", color: "#0288d1", ar: "صدرية",              en: "Pulmonology"        },
  gastroenterology:  { icon: "🩻", color: "#a0522d", ar: "هضمية وتنظير",       en: "Gastroenterology"   },
  nephrology:        { icon: "💧", color: "#1565c0", ar: "كلية",               en: "Nephrology"         },
  hematology:        { icon: "🩸", color: "#b71c1c", ar: "أمراض دم",           en: "Hematology"         },
  oncology:          { icon: "🎗️", color: "#6a1b9a", ar: "أورام",              en: "Oncology"           },
  rheumatology:      { icon: "🦿", color: "#d35400", ar: "روماتيزم",           en: "Rheumatology"       },
  general_surgery:   { icon: "🔪", color: "#455a64", ar: "جراحة عامة",         en: "General Surgery"    },
  orthopedic:        { icon: "🦴", color: "#c0392b", ar: "عظام ومفاصل",        en: "Orthopedics"        },
  ophthalmology:     { icon: "👁️", color: "#2980b9", ar: "عيون",               en: "Ophthalmology"      },
  ent:               { icon: "👂", color: "#795548", ar: "أنف وأذن وحنجرة",    en: "ENT"                },
  urology:           { icon: "💧", color: "#2196f3", ar: "مسالك بولية",        en: "Urology"            },
  physical_therapy:  { icon: "🏃", color: "#2e7d32", ar: "علاج فيزيائي",       en: "Physical Therapy"   },
  mental_health:     { icon: "🧠", color: "#6c3fc5", ar: "صحة نفسية",          en: "Mental Health"      },
  nutrition:         { icon: "🥗", color: "#27ae60", ar: "تغذية",              en: "Nutrition"          },
  other:             { icon: "🏨", color: "#607d8b", ar: "أخرى",               en: "Other"              },
};

/** ميتاداتا آمنة لأي قيمة قادمة من قاعدة البيانات (بما فيها القديمة أو غير المعروفة) */
export function clinicTypeMeta(t?: string | null): ClinicTypeMeta {
  return CLINIC_TYPE_META[(t || "general") as ClinicType] ?? CLINIC_TYPE_META.general;
}

export function isClinicType(t?: string | null): t is ClinicType {
  return !!t && (CLINIC_TYPES as readonly string[]).includes(t);
}

/** ربط نوع العيادة بنمط متابعة المرضى (النماذج اليومية) */
export const CLINIC_TYPE_TO_TRACKING: Record<string, string> = {
  general: "general",
  internal_medicine: "general",
  dental: "dental",
  dermatology: "skin_care",
  cosmetic: "cosmetic",
  pediatrics: "general",
  gynecology: "general",
  cardiology: "general",
  neurology: "general",
  endocrinology: "nutrition",
  pulmonology: "general",
  gastroenterology: "nutrition",
  nephrology: "general",
  hematology: "general",
  oncology: "general",
  rheumatology: "physical_therapy",
  general_surgery: "general",
  orthopedic: "orthopedic",
  ophthalmology: "ophthalmology",
  ent: "general",
  urology: "general",
  physical_therapy: "physical_therapy",
  mental_health: "mental_health",
  nutrition: "nutrition",
  other: "general",
  skin_care: "skin_care",
};

export type MedicalField = {
  key: string;
  label_ar: string;
  label_en: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  icon: string;
};

const NOTES: MedicalField = { key: "extended_notes", label_ar: "ملاحظات الطبيب", label_en: "Doctor Notes", type: "textarea", icon: "📝" };
const MEDS: MedicalField = { key: "medications", label_ar: "الأدوية الحالية", label_en: "Current Medications", type: "textarea", icon: "💊" };
const ALLERGIES: MedicalField = { key: "allergies", label_ar: "الحساسية", label_en: "Allergies", type: "textarea", icon: "🤧" };
const FAMILY: MedicalField = { key: "family_history", label_ar: "التاريخ العائلي", label_en: "Family History", type: "textarea", icon: "👪" };

/** حقول السجل الطبي للأنواع الجديدة — تُدمج مع الخرائط الموجودة في الصفحات */
export const NEW_TYPE_MEDICAL_FIELDS: Partial<Record<ClinicType, MedicalField[]>> = {
  internal_medicine: [
    ALLERGIES, MEDS,
    { key: "chronic_diseases", label_ar: "الأمراض المزمنة", label_en: "Chronic Diseases", type: "textarea", icon: "🏥" },
    { key: "surgeries", label_ar: "العمليات السابقة", label_en: "Past Surgeries", type: "textarea", icon: "🔪" },
    FAMILY, NOTES,
  ],
  endocrinology: [
    ALLERGIES, MEDS,
    { key: "diabetes_type", label_ar: "نوع السكري ومدته", label_en: "Diabetes Type & Duration", type: "textarea", icon: "🧬" },
    { key: "hba1c_history", label_ar: "قراءات السكر التراكمي", label_en: "HbA1c History", type: "textarea", icon: "📊" },
    { key: "thyroid_status", label_ar: "حالة الغدة الدرقية", label_en: "Thyroid Status", type: "textarea", icon: "🦋" },
    { key: "weight_history", label_ar: "تاريخ الوزن", label_en: "Weight History", type: "textarea", icon: "⚖️" },
    FAMILY, NOTES,
  ],
  pulmonology: [
    ALLERGIES, MEDS,
    { key: "smoking_history", label_ar: "التدخين", label_en: "Smoking History", type: "textarea", icon: "🚬" },
    { key: "respiratory_history", label_ar: "التاريخ التنفسي", label_en: "Respiratory History", type: "textarea", icon: "🫁" },
    { key: "spirometry", label_ar: "وظائف الرئة", label_en: "Spirometry / PFT", type: "textarea", icon: "📈" },
    { key: "occupational_exposure", label_ar: "التعرض المهني والبيئي", label_en: "Occupational Exposure", type: "textarea", icon: "🏭" },
    NOTES,
  ],
  gastroenterology: [
    ALLERGIES, MEDS,
    { key: "gi_symptoms", label_ar: "الأعراض الهضمية", label_en: "GI Symptoms", type: "textarea", icon: "🩻" },
    { key: "endoscopy_history", label_ar: "تنظيرات سابقة", label_en: "Endoscopy History", type: "textarea", icon: "🔬" },
    { key: "liver_status", label_ar: "حالة الكبد", label_en: "Liver Status", type: "textarea", icon: "🫀" },
    { key: "diet_habits", label_ar: "العادات الغذائية", label_en: "Dietary Habits", type: "textarea", icon: "🍽️" },
    NOTES,
  ],
  neurology: [
    ALLERGIES, MEDS,
    { key: "neuro_symptoms", label_ar: "الأعراض العصبية", label_en: "Neurological Symptoms", type: "textarea", icon: "⚡" },
    { key: "seizure_history", label_ar: "تاريخ النوبات", label_en: "Seizure History", type: "textarea", icon: "🧠" },
    { key: "imaging_history", label_ar: "التصوير الشعاعي السابق", label_en: "Prior Imaging", type: "textarea", icon: "🖼️" },
    FAMILY, NOTES,
  ],
  nephrology: [
    ALLERGIES, MEDS,
    { key: "kidney_function", label_ar: "وظائف الكلية", label_en: "Kidney Function", type: "textarea", icon: "💧" },
    { key: "dialysis_status", label_ar: "الغسيل الكلوي", label_en: "Dialysis Status", type: "textarea", icon: "🔄" },
    { key: "blood_pressure_history", label_ar: "تاريخ ضغط الدم", label_en: "Blood Pressure History", type: "textarea", icon: "🩺" },
    { key: "fluid_diet", label_ar: "الحمية والسوائل", label_en: "Fluid & Diet Plan", type: "textarea", icon: "🥤" },
    NOTES,
  ],
  hematology: [
    ALLERGIES, MEDS,
    { key: "cbc_history", label_ar: "تعداد الدم", label_en: "CBC History", type: "textarea", icon: "🩸" },
    { key: "transfusion_history", label_ar: "نقل الدم", label_en: "Transfusion History", type: "textarea", icon: "💉" },
    { key: "coagulation", label_ar: "اضطرابات التخثر", label_en: "Coagulation Disorders", type: "textarea", icon: "🧪" },
    FAMILY, NOTES,
  ],
  oncology: [
    ALLERGIES, MEDS,
    { key: "diagnosis_staging", label_ar: "التشخيص والمرحلة", label_en: "Diagnosis & Staging", type: "textarea", icon: "🎗️" },
    { key: "treatment_protocol", label_ar: "البروتوكول العلاجي", label_en: "Treatment Protocol", type: "textarea", icon: "💊" },
    { key: "cycles_done", label_ar: "الجلسات المنجزة", label_en: "Cycles Completed", type: "textarea", icon: "🔁" },
    { key: "side_effects", label_ar: "الآثار الجانبية", label_en: "Side Effects", type: "textarea", icon: "⚠️" },
    FAMILY, NOTES,
  ],
  rheumatology: [
    ALLERGIES, MEDS,
    { key: "joint_involvement", label_ar: "المفاصل المصابة", label_en: "Joints Involved", type: "textarea", icon: "🦿" },
    { key: "morning_stiffness", label_ar: "التيبس الصباحي", label_en: "Morning Stiffness", type: "textarea", icon: "🌅" },
    { key: "inflammatory_markers", label_ar: "واسمات الالتهاب", label_en: "Inflammatory Markers", type: "textarea", icon: "🧪" },
    { key: "functional_status", label_ar: "الحالة الوظيفية", label_en: "Functional Status", type: "textarea", icon: "🎯" },
    NOTES,
  ],
  general_surgery: [
    ALLERGIES, MEDS,
    { key: "surgeries", label_ar: "العمليات السابقة", label_en: "Past Surgeries", type: "textarea", icon: "🔪" },
    { key: "anesthesia_history", label_ar: "التخدير السابق ومضاعفاته", label_en: "Anesthesia History", type: "textarea", icon: "😴" },
    { key: "planned_procedure", label_ar: "الإجراء المخطط", label_en: "Planned Procedure", type: "textarea", icon: "📋" },
    { key: "bleeding_risk", label_ar: "مميعات الدم وخطر النزف", label_en: "Anticoagulants / Bleeding Risk", type: "textarea", icon: "🩸" },
    NOTES,
  ],
};
