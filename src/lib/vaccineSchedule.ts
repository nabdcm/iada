// ============================================================
// vaccineSchedule.ts — جدول التطعيم الوطني الافتراضي (قابل للتعديل)
// المرجع: البرنامج الموسّع للتمنيع (EPI) — يُستخدم كقالب فقط،
// ويستطيع الطبيب تعديل أي جرعة أو تاريخ داخل ملف المريض.
// ============================================================

export type VaccineStatus = "scheduled" | "given" | "skipped" | "overdue";

export interface VaccineRow {
  id?: number;
  user_id?: string;
  patient_id: number;
  vaccine_key: string | null;
  vaccine_name: string;
  dose_label: string | null;
  due_date: string | null;   // YYYY-MM-DD
  given_date: string | null;
  status: VaccineStatus;
  batch_no: string | null;
  notes: string | null;
  created_at?: string;
}

export interface ScheduleItem {
  key: string;
  name: string;
  dose: string;
  /** العمر المستحق بالأيام من تاريخ الميلاد */
  ageDays: number;
  ageLabel: string;
  protects: string;
}

const M = 30.4375; // متوسط طول الشهر بالأيام
const Y = 365.25;

export const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { key: "bcg",    name: "BCG — عصيّة كالميت غيران", dose: "جرعة واحدة", ageDays: 0,            ageLabel: "عند الولادة", protects: "السل" },
  { key: "hepb0",  name: "التهاب الكبد B",           dose: "الجرعة صفر",  ageDays: 0,            ageLabel: "عند الولادة", protects: "التهاب الكبد B" },
  { key: "opv0",   name: "شلل الأطفال الفموي (OPV)", dose: "الجرعة صفر",  ageDays: 0,            ageLabel: "عند الولادة", protects: "شلل الأطفال" },

  { key: "penta1", name: "الخماسي (DTP-HepB-Hib)",   dose: "الجرعة 1",   ageDays: Math.round(2 * M),  ageLabel: "شهران",     protects: "خناق، شاهوق، كزاز، كبد B، مستدمية" },
  { key: "opv1",   name: "شلل الأطفال الفموي (OPV)", dose: "الجرعة 1",   ageDays: Math.round(2 * M),  ageLabel: "شهران",     protects: "شلل الأطفال" },
  { key: "pcv1",   name: "المكوّرات الرئوية (PCV)",  dose: "الجرعة 1",   ageDays: Math.round(2 * M),  ageLabel: "شهران",     protects: "التهاب الرئة والسحايا" },

  { key: "penta2", name: "الخماسي (DTP-HepB-Hib)",   dose: "الجرعة 2",   ageDays: Math.round(4 * M),  ageLabel: "4 أشهر",    protects: "خناق، شاهوق، كزاز، كبد B، مستدمية" },
  { key: "opv2",   name: "شلل الأطفال الفموي (OPV)", dose: "الجرعة 2",   ageDays: Math.round(4 * M),  ageLabel: "4 أشهر",    protects: "شلل الأطفال" },
  { key: "pcv2",   name: "المكوّرات الرئوية (PCV)",  dose: "الجرعة 2",   ageDays: Math.round(4 * M),  ageLabel: "4 أشهر",    protects: "التهاب الرئة والسحايا" },
  { key: "ipv",    name: "شلل الأطفال الحقني (IPV)", dose: "جرعة واحدة", ageDays: Math.round(4 * M),  ageLabel: "4 أشهر",    protects: "شلل الأطفال" },

  { key: "penta3", name: "الخماسي (DTP-HepB-Hib)",   dose: "الجرعة 3",   ageDays: Math.round(6 * M),  ageLabel: "6 أشهر",    protects: "خناق، شاهوق، كزاز، كبد B، مستدمية" },
  { key: "opv3",   name: "شلل الأطفال الفموي (OPV)", dose: "الجرعة 3",   ageDays: Math.round(6 * M),  ageLabel: "6 أشهر",    protects: "شلل الأطفال" },
  { key: "pcv3",   name: "المكوّرات الرئوية (PCV)",  dose: "الجرعة 3",   ageDays: Math.round(6 * M),  ageLabel: "6 أشهر",    protects: "التهاب الرئة والسحايا" },

  { key: "mmr1",   name: "الثلاثي الفيروسي (MMR)",   dose: "الجرعة 1",   ageDays: Math.round(9 * M),  ageLabel: "9 أشهر",    protects: "حصبة، نكاف، حميراء" },

  { key: "mmr2",   name: "الثلاثي الفيروسي (MMR)",   dose: "الجرعة 2",   ageDays: Math.round(18 * M), ageLabel: "18 شهراً",  protects: "حصبة، نكاف، حميراء" },
  { key: "dtp4",   name: "الثلاثي البكتيري (DTP)",   dose: "جرعة معززة", ageDays: Math.round(18 * M), ageLabel: "18 شهراً",  protects: "خناق، شاهوق، كزاز" },
  { key: "opv4",   name: "شلل الأطفال الفموي (OPV)", dose: "جرعة معززة", ageDays: Math.round(18 * M), ageLabel: "18 شهراً",  protects: "شلل الأطفال" },

  { key: "dt5",    name: "الثنائي (DT)",             dose: "جرعة معززة", ageDays: Math.round(6 * Y),  ageLabel: "6 سنوات",   protects: "خناق، كزاز" },
  { key: "opv5",   name: "شلل الأطفال الفموي (OPV)", dose: "جرعة معززة", ageDays: Math.round(6 * Y),  ageLabel: "6 سنوات",   protects: "شلل الأطفال" },

  { key: "td12",   name: "الثنائي البالغ (Td)",      dose: "جرعة معززة", ageDays: Math.round(12 * Y), ageLabel: "12 سنة",    protects: "كزاز، خناق" },
];

/** يضيف عدداً من الأيام إلى تاريخ ISO ويعيد YYYY-MM-DD */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** يولّد صفوف الجدول الافتراضي انطلاقاً من تاريخ ميلاد المريض */
export function buildScheduleRows(patientId: number, dob: string): Omit<VaccineRow, "id" | "user_id">[] {
  return DEFAULT_SCHEDULE.map((s) => ({
    patient_id: patientId,
    vaccine_key: s.key,
    vaccine_name: s.name,
    dose_label: s.dose,
    due_date: addDays(dob, s.ageDays),
    given_date: null,
    status: "scheduled" as VaccineStatus,
    batch_no: null,
    notes: null,
  }));
}

/** الحالة الفعلية للصف بعد أخذ التاريخ الحالي بالحسبان */
export function effectiveStatus(row: VaccineRow): VaccineStatus {
  if (row.status === "given" || row.status === "skipped") return row.status;
  if (row.due_date && row.due_date < new Date().toISOString().slice(0, 10)) return "overdue";
  return "scheduled";
}

export const VACC_STATUS_META: Record<VaccineStatus, { ar: string; color: string; bg: string }> = {
  given:     { ar: "أُعطي",   color: "#2e7d32", bg: "rgba(46,125,50,.1)" },
  scheduled: { ar: "قادم",    color: "#0863ba", bg: "rgba(8,99,186,.08)" },
  overdue:   { ar: "متأخر",   color: "#c0392b", bg: "rgba(192,57,43,.1)" },
  skipped:   { ar: "متجاوَز", color: "#8a97a6", bg: "rgba(138,151,166,.12)" },
};
