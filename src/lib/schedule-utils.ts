/**
 * schedule-utils.ts
 * ─────────────────
 * أدوات التحقق من توفر الطبيب بناءً على جداول الدوام والإجازات
 * مسار الملف المقترح: /lib/schedule-utils.ts
 *
 * الاستخدام في صفحة المواعيد (appointments/page.tsx):
 *   import { isDoctorAvailable, getUnavailableSlots, getDoctorSchedule } from "@/lib/schedule-utils";
 */

import { supabase } from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────
export type WorkDay = {
  enabled: boolean;
  start: string;        // "09:00"
  end: string;          // "17:00"
  break_start?: string; // "13:00" اختياري
  break_end?: string;   // "14:00" اختياري
};

export type DoctorSchedule = {
  id?: number;
  doctor_id: number;
  user_id: string;
  days: Record<number, WorkDay>; // 0=أحد .. 6=سبت
  vacations: string[];           // ["2025-12-25", ...]
  appointment_duration: number;
  max_daily_appointments: number;
  notes: string;
};

export type AvailabilityResult = {
  available: boolean;
  reason?: "vacation" | "day_off" | "before_hours" | "after_hours" | "break_time" | "max_reached";
  reasonText?: { ar: string; en: string };
};

// ─── جلب جدول طبيب واحد ────────────────────────────────────────
export async function getDoctorSchedule(
  doctorId: number,
  userId: string
): Promise<DoctorSchedule | null> {
  const { data, error } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    days:      typeof data.days      === "string" ? JSON.parse(data.days)      : data.days,
    vacations: typeof data.vacations === "string" ? JSON.parse(data.vacations) : (data.vacations ?? []),
  };
}

// ─── جلب جداول جميع أطباء عيادة ───────────────────────────────
export async function getAllSchedules(userId: string): Promise<DoctorSchedule[]> {
  const { data } = await supabase
    .from("doctor_schedules")
    .select("*")
    .eq("user_id", userId);

  return (data ?? []).map(row => ({
    ...row,
    days:      typeof row.days      === "string" ? JSON.parse(row.days)      : row.days,
    vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
  }));
}

// ─── تحويل الوقت إلى دقائق ─────────────────────────────────────
function toMin(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// ─── التحقق من توفر طبيب في وقت محدد ──────────────────────────
/**
 * @param schedule   - جدول الطبيب (من getDoctorSchedule)
 * @param dateStr    - التاريخ بصيغة "YYYY-MM-DD"
 * @param timeStr    - الوقت بصيغة "HH:MM"
 * @param duration   - مدة الموعد بالدقائق
 * @param dailyCount - عدد المواعيد المحجوزة لهذا الطبيب في هذا اليوم
 */
export function isDoctorAvailable(
  schedule: DoctorSchedule,
  dateStr: string,
  timeStr: string,
  duration: number,
  dailyCount: number = 0
): AvailabilityResult {

  // 1. فحص الإجازة
  if (schedule.vacations.includes(dateStr)) {
    return {
      available: false,
      reason: "vacation",
      reasonText: {
        ar: "الطبيب في إجازة في هذا اليوم",
        en: "Doctor is on vacation on this day",
      },
    };
  }

  // 2. فحص اليوم (0=أحد .. 6=سبت)
  const dayIdx = new Date(dateStr).getDay();
  const workDay = schedule.days[dayIdx];

  if (!workDay || !workDay.enabled) {
    return {
      available: false,
      reason: "day_off",
      reasonText: {
        ar: "الطبيب لا يعمل في هذا اليوم",
        en: "Doctor does not work on this day",
      },
    };
  }

  const apptStart = toMin(timeStr);
  const apptEnd   = apptStart + duration;
  const dayStart  = toMin(workDay.start);
  const dayEnd    = toMin(workDay.end);

  // 3. فحص ما قبل الدوام
  if (apptStart < dayStart) {
    return {
      available: false,
      reason: "before_hours",
      reasonText: {
        ar: `الموعد قبل بداية دوام الطبيب (${workDay.start})`,
        en: `Appointment is before doctor's start time (${workDay.start})`,
      },
    };
  }

  // 4. فحص ما بعد الدوام
  if (apptEnd > dayEnd) {
    return {
      available: false,
      reason: "after_hours",
      reasonText: {
        ar: `الموعد يتجاوز نهاية دوام الطبيب (${workDay.end})`,
        en: `Appointment exceeds doctor's end time (${workDay.end})`,
      },
    };
  }

  // 5. فحص وقت الاستراحة
  if (workDay.break_start && workDay.break_end) {
    const breakStart = toMin(workDay.break_start);
    const breakEnd   = toMin(workDay.break_end);
    // تداخل بين الموعد والاستراحة
    if (apptStart < breakEnd && apptEnd > breakStart) {
      return {
        available: false,
        reason: "break_time",
        reasonText: {
          ar: `هذا الوقت يتزامن مع استراحة الطبيب (${workDay.break_start} - ${workDay.break_end})`,
          en: `This time overlaps with doctor's break (${workDay.break_start} - ${workDay.break_end})`,
        },
      };
    }
  }

  // 6. فحص الحد الأقصى اليومي
  if (dailyCount >= schedule.max_daily_appointments) {
    return {
      available: false,
      reason: "max_reached",
      reasonText: {
        ar: `وصل الطبيب للحد الأقصى من المواعيد اليومية (${schedule.max_daily_appointments})`,
        en: `Doctor reached daily appointment limit (${schedule.max_daily_appointments})`,
      },
    };
  }

  return { available: true };
}

// ─── الحصول على الأوقات المتاحة لطبيب في يوم ────────────────────
/**
 * يُرجع قائمة بالأوقات المتاحة (slots) لطبيب في يوم معين
 * مع مراعاة الدوام والاستراحة والمواعيد المحجوزة مسبقاً
 */
export function getAvailableSlots(
  schedule: DoctorSchedule,
  dateStr: string,
  bookedTimes: Array<{ time: string; duration: number }> // المواعيد المحجوزة مسبقاً
): string[] {
  // فحص الإجازة واليوم أولاً
  if (schedule.vacations.includes(dateStr)) return [];

  const dayIdx  = new Date(dateStr).getDay();
  const workDay = schedule.days[dayIdx];
  if (!workDay || !workDay.enabled) return [];

  const slotDuration = schedule.appointment_duration || 30;
  const dayStart     = toMin(workDay.start);
  const dayEnd       = toMin(workDay.end);
  const breakStart   = workDay.break_start ? toMin(workDay.break_start) : null;
  const breakEnd     = workDay.break_end   ? toMin(workDay.break_end)   : null;

  const slots: string[] = [];

  for (let t = dayStart; t + slotDuration <= dayEnd; t += slotDuration) {
    const slotEnd = t + slotDuration;

    // تخطي وقت الاستراحة
    if (breakStart !== null && breakEnd !== null) {
      if (t < breakEnd && slotEnd > breakStart) continue;
    }

    // فحص التعارض مع المواعيد المحجوزة
    const hasConflict = bookedTimes.some(b => {
      const bStart = toMin(b.time);
      const bEnd   = bStart + (b.duration || slotDuration);
      return t < bEnd && slotEnd > bStart;
    });
    if (hasConflict) continue;

    // تحويل الدقائق إلى HH:MM
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

// ─── هل اليوم إجازة أو عطلة لأي طبيب ──────────────────────────
/**
 * يُرجع قائمة doctor_ids الذين لا يعملون في يوم معين
 * (بسبب إجازة شخصية أو يوم عطلة)
 */
export function getUnavailableDoctors(
  schedules: DoctorSchedule[],
  dateStr: string
): number[] {
  const dayIdx = new Date(dateStr).getDay();
  return schedules
    .filter(s => {
      if (s.vacations.includes(dateStr)) return true;
      const workDay = s.days[dayIdx];
      return !workDay || !workDay.enabled;
    })
    .map(s => s.doctor_id);
}

// ─── عرض ساعات الدوام بشكل قابل للقراءة ──────────────────────
export function formatWorkHours(workDay: WorkDay): string {
  if (!workDay.enabled) return "—";
  let result = `${workDay.start} - ${workDay.end}`;
  if (workDay.break_start && workDay.break_end) {
    result += ` (break: ${workDay.break_start}-${workDay.break_end})`;
  }
  return result;
}

// ─── التحقق السريع: هل التاريخ إجازة للطبيب ───────────────────
export function isVacationDay(schedule: DoctorSchedule, dateStr: string): boolean {
  return schedule.vacations.includes(dateStr);
}

// ─── التحقق السريع: هل اليوم عطلة أسبوعية للطبيب ─────────────
export function isDayOff(schedule: DoctorSchedule, dateStr: string): boolean {
  const dayIdx  = new Date(dateStr).getDay();
  const workDay = schedule.days[dayIdx];
  return !workDay || !workDay.enabled;
}
