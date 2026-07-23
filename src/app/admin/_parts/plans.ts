// ============================================================
// src/app/admin/_parts/plans.ts
// ثوابت الخطط والأسعار والميزات — مستخرَجة من page.tsx
// ============================================================

export const PLAN_COLORS: Record<string, string> = {
  basic:"#0863ba", pro:"#7b2d8b", enterprise:"#e67e22",
  shared_basic:"#0e7c6a", shared_pro:"#b5451b", shared_enterprise:"#4a1480",
  pharmacy:"#27ae60",
};

// Plan pricing config
export const PLAN_PRICING: Record<string, { monthly: number; yearly: number }> = {
  basic:             { monthly:5.99,  yearly:59  },
  pro:               { monthly:7.99,  yearly:79  },
  enterprise:        { monthly:14.99, yearly:149 },
  // الخطط المشتركة
  shared_basic:      { monthly:7.99,  yearly:79  },   // حتى 2 أطباء
  shared_pro:        { monthly:13.99, yearly:139 },   // حتى 3 أطباء
  shared_enterprise: { monthly:21.99, yearly:219 },   // حتى 5 أطباء (مخصص)
};

// Default max doctors per shared plan
export const SHARED_PLAN_DEFAULT_DOCTORS: Record<string, number> = {
  shared_basic:      2,
  shared_pro:        3,
  shared_enterprise: 5,
};

// Patient limits per plan
export const PLAN_PATIENT_LIMITS: Record<string, number> = {
  basic:             300,
  pro:               1000,
  enterprise:        Infinity,
  // الخطط المشتركة — نفس قوانين الخطط الفردية
  shared_basic:      300,
  shared_pro:        1000,
  shared_enterprise: Infinity,
};

// Features per plan
export const PLAN_FEATURES: Record<string, { ar: string[]; en: string[] }> = {
  basic: {
    ar: ["إدارة المرضى","السجلات الطبية","إدارة المواعيد","حتى 100 مريض"],
    en: ["Patient management","Medical records","Appointments management","Up to 100 patients"],
  },
  pro: {
    ar: ["جميع ميزات الأساسية","رابط حجز المواعيد","إدارة المدفوعات","مراسلة المرضى عبر واتساب","تذكير المواعيد","حتى 400 مريض"],
    en: ["All Basic features","Clinic booking link","Payments management","WhatsApp patient messaging","Appointment reminders","Up to 400 patients"],
  },
  enterprise: {
    ar: ["جميع ميزات الاحترافية","متابعة المرضى برابط خاص","تقارير يومية للمريض","بوابة خاصة بالمريض","تسجيل الوصفات الطبية","عدد مرضى غير محدود","أولوية في الدعم الفني"],
    en: ["All Professional features","Patient follow-up link","Daily patient reports","Patient portal","Prescription records","Unlimited patients","Priority support"],
  },
  // ── الخطط المشتركة (نفس ميزات الفردية + إدارة متعددة الأطباء) ──
  shared_basic: {
    ar: ["إدارة المرضى","السجلات الطبية","إدارة المواعيد","حتى 100 مريض","حتى طبيبين","تخصيص المرضى لكل طبيب"],
    en: ["Patient management","Medical records","Appointments management","Up to 100 patients","Up to 2 doctors","Patients assigned per doctor"],
  },
  shared_pro: {
    ar: ["جميع ميزات الأساسية المشتركة","رابط حجز المواعيد","إدارة المدفوعات","مراسلة المرضى عبر واتساب","تذكير المواعيد","حتى 400 مريض","حتى 3 أطباء"],
    en: ["All Shared Basic features","Clinic booking link","Payments management","WhatsApp messaging","Appointment reminders","Up to 400 patients","Up to 3 doctors"],
  },
  shared_enterprise: {
    ar: ["جميع ميزات الاحترافية المشتركة","متابعة المرضى","تقارير يومية","بوابة المريض","وصفات طبية","عدد مرضى غير محدود","حتى 5 أطباء","أولوية في الدعم","عدد أطباء مخصص"],
    en: ["All Shared Pro features","Patient follow-up","Daily reports","Patient portal","Prescriptions","Unlimited patients","Up to 5 doctors","Priority support","Custom doctor count"],
  },
};

/** توليد كلمة مرور عشوائية قوية. */
export const genPass = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};
