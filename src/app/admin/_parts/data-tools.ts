// ============================================================
// src/app/admin/_parts/data-tools.ts
// تصدير واستيراد بيانات العيادات — دوال خالصة بلا واجهة.
// ============================================================

import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/lib/database.types";
import type { ClinicData } from "./types";

export async function exportClinicData(clinic: ClinicData): Promise<Record<string, unknown>> {
  const userId = clinic.user_id!;

  const [{ data: patients }, { data: appointments }, { data: payments }] = await Promise.all([
    supabase.from("patients").select("*").eq("user_id", userId),
    supabase.from("appointments").select("*").eq("user_id", userId),
    supabase.from("payments").select("*").eq("user_id", userId),
  ]);

  return {
    _meta: {
      exported_at: new Date().toISOString(),
      clinic_name: clinic.name,
      clinic_id: userId,
      version: "1.0",
      source: "NABD",
    },
    clinic,
    patients: patients ?? [],
    appointments: appointments ?? [],
    payments: payments ?? [],
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(patients: Record<string, unknown>[], filename: string) {
  if (!patients.length) return;
  const headers = ["mrn","name","phone","gender","date_of_birth","has_diabetes","has_hypertension","notes","created_at"];
  const rows = patients.map(p =>
    headers.map(h => {
      const v = p[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Import helpers ────────────────────────────────────────────
export interface ImportResult {
  patients: { new: number; updated: number; skipped: number };
  appointments: { new: number; skipped: number };
  payments: { new: number; skipped: number };
  errors: string[];
}

export async function importClinicData(
  targetUserId: string,
  data: Record<string, unknown>
): Promise<ImportResult> {
  const result: ImportResult = {
    patients:     { new: 0, updated: 0, skipped: 0 },
    appointments: { new: 0, skipped: 0 },
    payments:     { new: 0, skipped: 0 },
    errors: [],
  };

  const patients     = (data.patients     as Record<string, unknown>[]) ?? [];
  const appointments = (data.appointments as Record<string, unknown>[]) ?? [];
  const payments     = (data.payments     as Record<string, unknown>[]) ?? [];

  // خريطة: old patient_id → new patient_id
  const patientIdMap: Record<number, number> = {};

  // ── استيراد المرضى ──────────────────────────────────────────
  for (const p of patients) {
    try {
      const phone = (p.phone as string | undefined)?.trim();
      if (!phone) { result.patients.skipped++; continue; }

      // جلب/إنشاء MRN مركزي
      let mrn: string = (p.mrn as string) || "";
      const { data: masterEx } = await supabase
        .from("master_patients")
        .select("mrn")
        .eq("phone", phone)
        .maybeSingle();

      if (masterEx?.mrn) {
        mrn = masterEx.mrn;
      } else if (!mrn) {
        const { data: masterIns } = await supabase
          .from("master_patients")
          .insert({ phone, name: p.name as string })
          .select("mrn")
          .single();
        mrn = masterIns?.mrn ?? null;
      }

      // هل يوجد مريض بنفس الهاتف في العيادة المستهدفة؟
      const { data: existingP } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("phone", phone)
        .maybeSingle();

      if (existingP) {
        patientIdMap[p.id as number] = existingP.id;
        result.patients.updated++;
      } else {
        const { data: inserted, error } = await supabase
          .from("patients")
          .insert({
            user_id:          targetUserId,
            name:             p.name as string,
            phone,
            gender:           (p.gender as string | null) || null,
            date_of_birth:    (p.date_of_birth as string | null) || null,
            has_diabetes:     (p.has_diabetes as boolean | null) ?? false,
            has_hypertension: (p.has_hypertension as boolean | null) ?? false,
            notes:            (p.notes as string | null) || null,
            is_hidden:        false,
            mrn,
          } satisfies TablesInsert<"patients">)
          .select("id")
          .single();

        if (error) { result.errors.push(`Patient ${p.name}: ${error.message}`); continue; }
        patientIdMap[p.id as number] = inserted.id;
        result.patients.new++;
      }
    } catch (e: unknown) {
      result.errors.push(`Patient error: ${e}`);
    }
  }

  // ── استيراد المواعيد ────────────────────────────────────────
  for (const a of appointments) {
    try {
      const newPatientId = patientIdMap[a.patient_id as number];
      if (!newPatientId) { result.appointments.skipped++; continue; }

      // تحقق من التكرار: نفس المريض + التاريخ + الوقت
      const { data: existingA } = await supabase
        .from("appointments")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("patient_id", newPatientId)
        .eq("date", a.date as string)
        .eq("time", a.time as string)
        .maybeSingle();

      if (existingA) { result.appointments.skipped++; continue; }

      const { error } = await supabase.from("appointments").insert({
        user_id:    targetUserId,
        patient_id: newPatientId,
        date:       a.date as string,
        time:       a.time as string,
        duration:   (a.duration as number | null) ?? 30,
        type:       (a.type as string | null) || null,
        notes:      (a.notes as string | null) || null,
        status:     (a.status as string | null) ?? "scheduled",
      } satisfies TablesInsert<"appointments">);

      if (error) { result.errors.push(`Appointment error: ${error.message}`); continue; }
      result.appointments.new++;
    } catch (e: unknown) {
      result.errors.push(`Appointment error: ${e}`);
    }
  }

  // ── استيراد المدفوعات ────────────────────────────────────────
  for (const pay of payments) {
    try {
      const newPatientId = patientIdMap[pay.patient_id as number];
      if (!newPatientId) { result.payments.skipped++; continue; }

      const { error } = await supabase.from("payments").insert({
        user_id:     targetUserId,
        patient_id:  newPatientId,
        amount:      pay.amount as number,
        description: (pay.description as string | null) ?? null,
        method:      (pay.method as string | null) ?? "cash",
        date:        pay.date as string,
        status:      (pay.status as string | null) ?? "paid",
        notes:       (pay.notes as string | null) || null,
      } satisfies TablesInsert<"payments">);

      if (error) { result.errors.push(`Payment error: ${error.message}`); continue; }
      result.payments.new++;
    } catch (e: unknown) {
      result.errors.push(`Payment error: ${e}`);
    }
  }

  return result;
}

