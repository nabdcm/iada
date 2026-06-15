/**
 * schedule-utils.ts — نبض
 * أدوات التحقق من توفر الطبيب بناءً على جداول الدوام والإجازات
 * يدعم: العيادات 24 ساعة، والدوام عبر منتصف الليل (مثل 22:00→06:00)
 */

import { supabase } from "@/lib/supabase";

// ─── Types ─────────────────────────────────────────────────────
export type WorkDay = {
  enabled: boolean;
  start: string;        // "09:00" أو "00:00" للـ 24 ساعة
  end: string;          // "17:00" أو "23:59" للـ 24 ساعة
  break_start?: string;
  break_end?: string;
};

export type DoctorSchedule = {
  id?: number;
  doctor_id: number;
  user_id: string;
  days: Record<number, WorkDay>; // 0=أحد .. 6=سبت
  vacations: string[];
  appointment_duration: number;
  max_daily_appointments: number;
  notes: string;
};

export type AvailabilityResult = {
  available: boolean;
  reason?: "vacation" | "day_off" | "before_hours" | "after_hours" | "break_time" | "max_reached";
  reasonText?: { ar: string; en: string };
};

// ─── هل الدوام 24 ساعة؟ ────────────────────────────────────────
export function is24Hours(workDay: WorkDay): boolean {
  return workDay.start === "00:00" && workDay.end === "23:59";
}

// ─── تحويل الوقت إلى دقائق ─────────────────────────────────────
function toMin(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

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
    days:      typeof data.days      === "string" ? JSON.parse(data.days)      : (data.days ?? {}),
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
    days:      typeof row.days      === "string" ? JSON.parse(row.days)      : (row.days ?? {}),
    vacations: typeof row.vacations === "string" ? JSON.parse(row.vacations) : (row.vacations ?? []),
  }));
}

// ─── التحقق من توفر طبيب في وقت محدد ──────────────────────────
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

  // 2. فحص اليوم
  const dayIdx  = new Date(dateStr + "T00:00:00").getDay();
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

  // 3. دوام 24 ساعة — متاح دائماً بدون فحص الوقت
  if (is24Hours(workDay)) {
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

  const apptStart = toMin(timeStr);
  const apptEnd   = apptStart + duration;
  const dayStart  = toMin(workDay.start);
  const dayEnd    = toMin(workDay.end);

  // 4. دعم الدوام عبر منتصف الليل (مثل 22:00 → 06:00)
  const crossesMidnight = dayEnd < dayStart;

  if (crossesMidnight) {
    // الموعد صالح إذا كان بعد بداية الدوام أو قبل نهايته
    const withinShift = apptStart >= dayStart || apptEnd <= dayEnd;
    if (!withinShift) {
      return {
        available: false,
        reason: "after_hours",
        reasonText: {
          ar: `الموعد خارج ساعات الدوام (${workDay.start} - ${workDay.end})`,
          en: `Appointment is outside working hours (${workDay.start} - ${workDay.end})`,
        },
      };
    }
  } else {
    // دوام عادي
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
  }

  // 5. فحص وقت الاستراحة
  if (workDay.break_start && workDay.break_end) {
    const breakStart = toMin(workDay.break_start);
    const breakEnd   = toMin(workDay.break_end);
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
export function getAvailableSlots(
  schedule: DoctorSchedule,
  dateStr: string,
  bookedTimes: Array<{ time: string; duration: number }>
): string[] {
  if (schedule.vacations.includes(dateStr)) return [];

  const dayIdx  = new Date(dateStr + "T00:00:00").getDay();
  const workDay = schedule.days[dayIdx];
  if (!workDay || !workDay.enabled) return [];

  const slotDuration = schedule.appointment_duration || 30;
  const breakStart   = workDay.break_start ? toMin(workDay.break_start) : null;
  const breakEnd     = workDay.break_end   ? toMin(workDay.break_end)   : null;

  let dayStart: number;
  let dayEnd: number;

  if (is24Hours(workDay)) {
    dayStart = 0;
    dayEnd   = 24 * 60; // 1440 دقيقة
  } else {
    dayStart = toMin(workDay.start);
    dayEnd   = toMin(workDay.end);
    // دعم الدوام عبر منتصف الليل
    if (dayEnd < dayStart) dayEnd += 24 * 60;
  }

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

    // تحويل إلى HH:MM (مع دعم تجاوز 24 ساعة)
    const actualMin = t % (24 * 60);
    const hh = String(Math.floor(actualMin / 60)).padStart(2, "0");
    const mm = String(actualMin % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

// ─── هل التاريخ إجازة للطبيب ───────────────────────────────────
export function isVacationDay(schedule: DoctorSchedule, dateStr: string): boolean {
  return schedule.vacations.includes(dateStr);
}

// ─── هل اليوم عطلة أسبوعية للطبيب ────────────────────────────
export function isDayOff(schedule: DoctorSchedule, dateStr: string): boolean {
  const dayIdx  = new Date(dateStr + "T00:00:00").getDay();
  const workDay = schedule.days[dayIdx];
  return !workDay || !workDay.enabled;
}

// ─── الأطباء غير المتاحين في يوم معين ─────────────────────────
export function getUnavailableDoctors(
  schedules: DoctorSchedule[],
  dateStr: string
): number[] {
  const dayIdx = new Date(dateStr + "T00:00:00").getDay();
  return schedules
    .filter(s => {
      if (s.vacations.includes(dateStr)) return true;
      const workDay = s.days[dayIdx];
      return !workDay || !workDay.enabled;
    })
    .map(s => s.doctor_id);
}

// ─── تنسيق ساعات الدوام للعرض ──────────────────────────────────
export function formatWorkHours(workDay: WorkDay): string {
  if (!workDay.enabled) return "—";
  if (is24Hours(workDay)) return "24 ساعة / 24h";
  let result = `${workDay.start} - ${workDay.end}`;
  if (workDay.break_start && workDay.break_end) {
    result += ` (break: ${workDay.break_start}-${workDay.break_end})`;
  }
  return result;
}
