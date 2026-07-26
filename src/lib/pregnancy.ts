// ============================================================
// pregnancy.ts — حسابات متابعة الحمل (قاعدة ناغيله)
// ============================================================

export type PregStatus = "active" | "delivered" | "ended";
export type RiskLevel = "normal" | "moderate" | "high";

export interface Pregnancy {
  id?: number;
  user_id?: string;
  patient_id: number;
  lmp: string | null;          // آخر دورة طمثية YYYY-MM-DD
  edd: string | null;          // التاريخ المتوقع للولادة
  gravida: number | null;
  para: number | null;
  blood_type: string | null;
  risk_level: RiskLevel;
  status: PregStatus;
  delivery_date: string | null;
  outcome: string | null;
  notes: string | null;
  created_at?: string;
}

export interface PregnancyVisit {
  id?: number;
  user_id?: string;
  pregnancy_id: number;
  visit_date: string;
  gest_weeks: number | null;
  weight: number | null;
  bp_sys: number | null;
  bp_dia: number | null;
  fundal_height: number | null;
  fetal_hr: number | null;
  hb: number | null;
  ultrasound: string | null;
  complaints: string | null;
  notes: string | null;
  next_visit: string | null;
  created_at?: string;
}

/** التاريخ المتوقع للولادة = آخر دورة + 280 يوماً */
export function calcEDD(lmp: string): string {
  const d = new Date(lmp + "T00:00:00");
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
}

/** عمر الحمل بالأيام حتى تاريخ مرجعي */
export function gestDays(lmp: string, ref?: string): number {
  const a = new Date(lmp + "T00:00:00").getTime();
  const b = new Date((ref ?? new Date().toISOString().slice(0, 10)) + "T00:00:00").getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

/** عمر الحمل بصيغة "أسبوع + يوم" */
export function gestAge(lmp: string, ref?: string): { weeks: number; days: number; label: string } {
  const total = gestDays(lmp, ref);
  const weeks = Math.floor(total / 7);
  const days = total % 7;
  return { weeks, days, label: `${weeks} أسبوع${days ? ` و${days} يوم` : ""}` };
}

/** الثلث الحملي */
export function trimester(weeks: number): 1 | 2 | 3 {
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

export const TRIMESTER_LABEL: Record<1 | 2 | 3, string> = {
  1: "الثلث الأول",
  2: "الثلث الثاني",
  3: "الثلث الثالث",
};

/** الأيام المتبقية حتى الولادة المتوقعة (سالبة إن تجاوزت) */
export function daysToEDD(edd: string): number {
  const a = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  const b = new Date(edd + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
}

/** فحوص ومواعيد موصى بها حسب عمر الحمل (قالب إرشادي) */
export const ANC_MILESTONES: { week: number; label: string; detail: string }[] = [
  { week: 8,  label: "الزيارة الأولى",        detail: "تأكيد الحمل، تحاليل أساسية، زمرة الدم، حديد" },
  { week: 12, label: "إيكو الثلث الأول",      detail: "الشفافية القفوية وتحديد عمر الحمل" },
  { week: 16, label: "متابعة",                detail: "ضغط، وزن، تحليل بول، فحص فقر الدم" },
  { week: 20, label: "إيكو التشريح الجنيني",  detail: "مسح تفصيلي لأعضاء الجنين" },
  { week: 24, label: "اختبار تحمّل السكر",    detail: "فحص سكري الحمل" },
  { week: 28, label: "متابعة + كزاز",         detail: "لقاح الكزاز، فحص فقر الدم، Anti-D عند الحاجة" },
  { week: 32, label: "إيكو النمو",            detail: "تقييم نمو الجنين والسائل الأمنيوسي" },
  { week: 36, label: "متابعة أسبوعية",        detail: "وضعية الجنين، تحضير خطة الولادة" },
  { week: 38, label: "متابعة",                detail: "مراقبة علامات المخاض" },
  { week: 40, label: "الموعد المتوقع",        detail: "تقييم الحاجة للتحريض" },
];

/** تنبيهات سريرية بسيطة من قراءات الزيارة (أداة مساعدة لا تُغني عن التقييم الطبي) */
export function visitFlags(v: PregnancyVisit): string[] {
  const out: string[] = [];
  if (v.bp_sys != null && v.bp_dia != null && (v.bp_sys >= 140 || v.bp_dia >= 90))
    out.push("ارتفاع ضغط — يستدعي تقييم ما قبل الإرجاج");
  if (v.hb != null && v.hb < 11) out.push("خضاب منخفض — فقر دم حملي محتمل");
  if (v.fetal_hr != null && (v.fetal_hr < 110 || v.fetal_hr > 160))
    out.push("نبض جنيني خارج المجال الطبيعي (110–160)");
  return out;
}

export const RISK_META: Record<RiskLevel, { ar: string; color: string; bg: string }> = {
  normal:   { ar: "طبيعي",  color: "#2e7d32", bg: "rgba(46,125,50,.1)" },
  moderate: { ar: "متوسط",  color: "#e67e22", bg: "rgba(230,126,34,.1)" },
  high:     { ar: "مرتفع",  color: "#c0392b", bg: "rgba(192,57,43,.1)" },
};
