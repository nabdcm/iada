// src/app/api/pharmacy/sync-prescriptions/route.ts
// ميزة 14: الربط التلقائي بين وصفات الطبيب (العيادة) وقائمة صرف الصيدلية
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ClinicMed = { name?: string; medicine_name?: string; dose?: string; dosage?: string; duration?: string; instructions?: string; qty?: number };

// POST: يسحب وصفات العيادة الحديثة غير المزامنة إلى pharmacy_prescriptions
export async function POST(req: Request) {
  try {
    const { user_id, days } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const lookback = Math.min(90, Math.max(1, Number(days) || 30));
    const since = new Date();
    since.setDate(since.getDate() - lookback);
    const sinceStr = since.toISOString().slice(0, 10);

    // 1) وصفات العيادة الحديثة
    const { data: clinicRx, error: rxErr } = await supabaseAdmin
      .from("prescriptions")
      .select("id, patient_id, date, diagnosis, notes, medications, doctor_name, clinic_name")
      .eq("user_id", user_id)
      .gte("date", sinceStr)
      .order("date", { ascending: false });
    if (rxErr) return NextResponse.json({ error: rxErr.message }, { status: 400 });
    if (!clinicRx || clinicRx.length === 0) return NextResponse.json({ synced: 0, prescriptions: [] });

    // 2) الوصفات المزامنة مسبقًا (لتفادي التكرار) — نستخدم id بصيغة CLINIC-<id>
    const clinicIds = clinicRx.map(r => `CLINIC-${r.id}`);
    const { data: existing } = await supabaseAdmin
      .from("pharmacy_prescriptions").select("id").eq("user_id", user_id).in("id", clinicIds);
    const existingSet = new Set((existing || []).map(e => e.id));

    // 3) جلب أسماء/MRN المرضى دفعة واحدة
    const patientIds = [...new Set(clinicRx.map(r => r.patient_id).filter(Boolean))];
    const patientsMap: Record<number, { name: string; mrn: string }> = {};
    if (patientIds.length) {
      const { data: pats } = await supabaseAdmin
        .from("patients").select("id, name, mrn").in("id", patientIds).eq("user_id", user_id);
      for (const p of (pats || [])) patientsMap[p.id] = { name: p.name || "", mrn: p.mrn || "" };
    }

    let synced = 0;
    const created: string[] = [];
    for (const rx of clinicRx) {
      const rxId = `CLINIC-${rx.id}`;
      if (existingSet.has(rxId)) continue;

      const meds: ClinicMed[] = Array.isArray(rx.medications) ? rx.medications : [];
      if (meds.length === 0) continue;

      const pat = rx.patient_id ? patientsMap[rx.patient_id] : null;
      const { error: insErr } = await supabaseAdmin.from("pharmacy_prescriptions").insert({
        id: rxId, user_id,
        mrn: pat?.mrn || "",
        patient_name: pat?.name || "—",
        doctor_name: rx.doctor_name || "",
        doctor_id: 0,
        patient_id: rx.patient_id || null,
        notes: rx.diagnosis || rx.notes || null,
        status: "waiting", priority: "normal", source: "clinic",
        dispensed: false,
      });
      if (insErr) continue;

      // بنود الوصفة
      const items = meds.map(m => ({
        prescription_id: rxId,
        medicine_name: m.name || m.medicine_name || "—",
        dosage: m.dose || m.dosage || "",
        duration: m.duration || "",
        instructions: m.instructions || "",
        qty: Number(m.qty) || 1,
        dispensed_qty: 0,
      }));
      if (items.length) await supabaseAdmin.from("pharmacy_prescription_items").insert(items);
      synced++;
      created.push(rxId);
    }

    return NextResponse.json({ synced, created });
  } catch (err) {
    console.error("pharmacy/sync-prescriptions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
