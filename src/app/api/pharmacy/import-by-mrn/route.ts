// ============================================================
// /api/pharmacy/import-by-mrn — جسر الوصفات الحقيقي
// الصيدلية تبحث بالـ MRN → تُستورد وصفات المريض من كل العيادات
// إلى قائمة صرف الصيدلية (pharmacy_prescriptions)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ClinicMed = { name?: string; medicine_name?: string; dose?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string; qty?: number };

export async function POST(req: Request) {
  try {
    // ── التحقق: الطالب حساب صيدلية موثق ─────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const pharmacyUserId = userData.user.id;

    let accountType: string | undefined = userData.user.user_metadata?.account_type;
    if (!accountType) {
      const { data: clinicRow } = await supabaseAdmin
        .from("clinics").select("account_type, plan").eq("user_id", pharmacyUserId).maybeSingle();
      accountType = clinicRow?.account_type ?? (clinicRow?.plan === "pharmacy" ? "pharmacy" : "clinic");
    }
    if (accountType !== "pharmacy") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { mrn } = await req.json() as { mrn?: string };
    const cleanMrn = (mrn ?? "").trim().toUpperCase();
    if (!cleanMrn) return NextResponse.json({ error: "mrn required" }, { status: 400 });

    // ── 1) المريض المركزي بالـ MRN ──────────────────────────
    const { data: master } = await supabaseAdmin
      .from("master_patients").select("name, phone, mrn").eq("mrn", cleanMrn).maybeSingle();

    // ── 2) سجلات المريض في كل العيادات (بالهاتف أو بالـ MRN المحلي) ──
    let patientsQuery = supabaseAdmin.from("patients").select("id, user_id, name, mrn, phone");
    if (master?.phone) {
      patientsQuery = patientsQuery.or(`phone.eq.${master.phone},mrn.eq.${cleanMrn}`);
    } else {
      patientsQuery = patientsQuery.eq("mrn", cleanMrn);
    }
    const { data: pats } = await patientsQuery;
    const patients = pats ?? [];
    if (patients.length === 0) return NextResponse.json({ imported: 0 });

    const patientIds = patients.map(p => p.id);
    const patientsMap: Record<number, { name: string }> = {};
    patients.forEach(p => { patientsMap[p.id] = { name: p.name || "—" }; });

    // ── 3) وصفات العيادات لهؤلاء المرضى (كل العيادات) ────────
    const { data: clinicRx } = await supabaseAdmin
      .from("prescriptions")
      .select("id, user_id, patient_id, date, diagnosis, notes, medications, doctor_name, clinic_name")
      .in("patient_id", patientIds)
      .order("date", { ascending: false })
      .limit(100);
    if (!clinicRx || clinicRx.length === 0) return NextResponse.json({ imported: 0 });

    // ── 4) تفادي التكرار — معرّف فريد لكل صيدلية ─────────────
    const shortPharm = pharmacyUserId.slice(0, 8);
    const idFor = (rxId: number) => `CLINIC-${rxId}-${shortPharm}`;
    const candidateIds = clinicRx.map(r => idFor(r.id));
    const { data: existing } = await supabaseAdmin
      .from("pharmacy_prescriptions").select("id").eq("user_id", pharmacyUserId).in("id", candidateIds);
    const existingSet = new Set((existing ?? []).map(e => e.id));

    let imported = 0;
    for (const rx of clinicRx) {
      const rxId = idFor(rx.id);
      if (existingSet.has(rxId)) continue;

      let meds: ClinicMed[] = [];
      try {
        meds = Array.isArray(rx.medications) ? rx.medications
             : typeof rx.medications === "string" ? JSON.parse(rx.medications) : [];
      } catch { meds = []; }
      if (meds.length === 0) continue;

      const noteParts = [
        rx.clinic_name ? `🏥 ${rx.clinic_name}` : "",
        rx.diagnosis ? `التشخيص: ${rx.diagnosis}` : "",
        rx.notes || "",
      ].filter(Boolean);

      const { error: insErr } = await supabaseAdmin.from("pharmacy_prescriptions").insert({
        id: rxId,
        user_id: pharmacyUserId,
        mrn: cleanMrn,
        patient_name: (rx.patient_id && patientsMap[rx.patient_id]?.name) || master?.name || "—",
        doctor_name: rx.doctor_name || "",
        doctor_id: 0,
        patient_id: rx.patient_id ?? null,
        notes: noteParts.join(" — ") || null,
        status: "waiting", priority: "normal", source: "clinic",
        dispensed: false,
        created_at: rx.date ?? undefined,
      });
      if (insErr) continue;

      const items = meds.map(m => ({
        prescription_id: rxId,
        medicine_name: m.name || m.medicine_name || "—",
        dosage: [m.dose || m.dosage || "", m.frequency || ""].filter(Boolean).join(" · "),
        duration: m.duration || "",
        instructions: m.instructions || "",
        qty: Number(m.qty) || 1,
        dispensed_qty: 0,
      }));
      if (items.length) await supabaseAdmin.from("pharmacy_prescription_items").insert(items);
      imported++;
    }

    return NextResponse.json({ imported });
  } catch (err) {
    console.error("import-by-mrn error:", err);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
