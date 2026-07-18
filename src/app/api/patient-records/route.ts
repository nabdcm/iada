// ============================================================
// /api/patient-records — سجلات المريض عبر كل العيادات (server-side)
// يتحقق من cookie الجلسة ثم يجمع البيانات بـ service role
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getPatientFromRequest } from "../_patientAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { data: master } = await supabaseAdmin
      .from("master_patients")
      .select("name, phone, mrn")
      .eq("phone", session.phone)
      .eq("mrn", session.mrn)
      .maybeSingle();

    if (!master) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // 1) جميع سجلات المريض في العيادات بالهاتف
    const { data: patientsData } = await supabaseAdmin
      .from("patients")
      .select("id, user_id, name, phone, gender, date_of_birth, has_diabetes, has_hypertension, notes")
      .eq("phone", master.phone);

    const patients = patientsData ?? [];
    if (patients.length === 0) {
      return NextResponse.json({ ok: true, patient: master, records: [] });
    }

    // 2) بيانات العيادات
    const userIds = [...new Set(patients.map(p => p.user_id).filter(Boolean))];
    const { data: clinicsData } = await supabaseAdmin
      .from("clinics")
      .select("user_id, name, clinic_type, owner")
      .in("user_id", userIds);
    const clinicsMap: Record<string, { name?: string; clinic_type?: string; owner?: string }> = {};
    (clinicsData ?? []).forEach(c => { clinicsMap[c.user_id] = c; });

    // 3) الملفات الطبية
    // توقيع روابط الأشعة المخزّنة في Storage (bucket خاص)
    type XrayEntry = { id?:string; url?:string|null; storage_path?:string|null } & Record<string, unknown>;
    const signXrays = async (xr: unknown[]): Promise<XrayEntry[]> => {
      const arr = (Array.isArray(xr) ? xr : []) as XrayEntry[];
      return Promise.all(arr.map(async (x) => {
        if (x?.storage_path) {
          const { data } = await supabaseAdmin.storage.from("xrays").createSignedUrl(x.storage_path, 3600);
          return { ...x, url: data?.signedUrl ?? x.url ?? null };
        }
        return x;
      }));
    };
    const patientIds = patients.map(p => p.id);
    const { data: profilesData } = await supabaseAdmin
      .from("patient_profiles")
      .select("patient_id, medical_fields, xrays")
      .in("patient_id", patientIds);
    const profilesMap: Record<number, { medical_fields?: Record<string, string>; xrays?: unknown[] }> = {};
    (profilesData ?? []).forEach(pr => { profilesMap[pr.patient_id] = pr; });

    const records = await Promise.all(patients.map(async p => {
      const clinic = clinicsMap[p.user_id] ?? {};
      const prof   = profilesMap[p.id] ?? {};
      return {
        clinic_name: clinic.name ?? "—",
        clinic_type: clinic.clinic_type || "other",
        doctor_name: clinic.owner ?? "—",
        patient_id:  p.id,
        mrn:         master.mrn,
        medical_fields: prof.medical_fields ?? {},
        xrays:          await signXrays(prof.xrays ?? []),
        patient_info: {
          name: p.name, phone: p.phone, gender: p.gender,
          date_of_birth: p.date_of_birth,
          has_diabetes: p.has_diabetes, has_hypertension: p.has_hypertension,
          notes: p.notes,
        },
      };
    }));

    return NextResponse.json({ ok: true, patient: master, records });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
