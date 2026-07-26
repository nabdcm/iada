// ============================================================
// /api/clinic/patient-vitals — اطّلاع الطبيب على القراءات الذاتية
// لا يُسمح بالوصول إلا إذا كان المريض مسجّلاً فعلاً في عيادة الطبيب
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientId = Number(searchParams.get("patient_id"));
  if (!patientId) return NextResponse.json({ error: "patient_id مطلوب" }, { status: 400 });

  // المريض يجب أن يكون ضمن مرضى هذه العيادة
  const { data: patient } = await supabaseAdmin
    .from("patients")
    .select("id, mrn, phone")
    .eq("id", patientId).eq("user_id", userId).maybeSingle();

  if (!patient) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!patient.mrn) return NextResponse.json({ vitals: [] });

  const { data, error } = await supabaseAdmin
    .from("patient_vitals")
    .select("*")
    .eq("mrn", patient.mrn)
    .order("measured_at", { ascending: false })
    .range(0, 299);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ vitals: data ?? [] });
}
