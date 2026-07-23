// ============================================================
// src/lib/clinic-types.ts
// المصدر الوحيد لأنواع العيادات وبياناتها (الأيقونة/اللون/الاسم).
// عند إضافة تخصص جديد: أضفه هنا فقط.
//
// ملاحظة مهمة: هذا الملف لا يحتوي على الحقول الطبية.
// الحقول الطبية مجموعتان مختلفتان عن قصد:
//   - src/app/patients/page.tsx    → خلفية المريض الدائمة
//   - src/app/secretary/page.tsx   → بيانات الزيارة الحالية
// كلتاهما تُحفظان في patient_profiles.medical_fields بالدمج،
// ولا تدوس إحداهما على الأخرى. لا توحّدهما.
// ============================================================

export type ClinicType =
  | "general" | "dental" | "dermatology" | "cosmetic" | "pediatrics"
  | "physical_therapy" | "mental_health" | "nutrition" | "ophthalmology"
  | "orthopedic" | "cardiology" | "gynecology" | "ent" | "urology" | "other";

export type ClinicTypeMeta = { icon: string; color: string; ar: string; en: string };

export const CLINIC_TYPE_META: Record<ClinicType, ClinicTypeMeta> = {
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

/** ترتيب العرض الموحّد في القوائم المنسدلة. */
export const CLINIC_TYPE_KEYS = Object.keys(CLINIC_TYPE_META) as ClinicType[];

/** الأيقونات فقط — للأماكن التي لا تحتاج اللون أو الاسم. */
export const CLINIC_TYPE_ICONS: Record<string, string> = Object.fromEntries(
  CLINIC_TYPE_KEYS.map(k => [k, CLINIC_TYPE_META[k].icon])
);
