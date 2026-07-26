// ============================================================
// /api/portal/doctors — بحث المريض عن طبيب أو عيادة للحجز
// يتطلب جلسة مريض صالحة، ولا يُرجع إلا الحقول العامة اللازمة للحجز
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getPatientFromRequest } from "../../_patientAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** الخطط التي يتوفّر فيها رابط الحجز الإلكتروني */
const BOOKING_PLANS = ["pro", "enterprise", "shared_pro", "shared_enterprise"];

export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();

  try {
    let query = supabaseAdmin
      .from("clinics")
      .select("user_id, name, owner, clinic_type, phone, plan, status, account_type, telemedicine_enabled")
      .eq("status", "active")
      .eq("account_type", "clinic")
      .in("plan", BOOKING_PLANS);

    if (q.length >= 2) {
      // تنظيف الحروف الخاصة بـ PostgREST داخل نمط ilike
      const safe = q.replace(/[%,()]/g, " ").trim();
      query = query.or(`name.ilike.%${safe}%,owner.ilike.%${safe}%`);
    }
    if (type) query = query.eq("clinic_type", type);

    const { data, error } = await query.order("name", { ascending: true }).range(0, 59);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // العيادات التي زارها المريض سابقاً تُرفع لأعلى النتائج
    const { data: visited } = await supabaseAdmin
      .from("patients").select("user_id").eq("phone", session.phone);
    const visitedSet = new Set((visited ?? []).map(v => v.user_id as string));

    const results = (data ?? []).map(c => ({
      user_id: c.user_id as string,
      clinic_name: (c.name as string) ?? "",
      doctor_name: (c.owner as string) ?? "",
      clinic_type: (c.clinic_type as string) ?? "general",
      phone: (c.phone as string) ?? null,
      telemedicine: Boolean(c.telemedicine_enabled),
      visited: visitedSet.has(c.user_id as string),
    })).sort((a, b) => Number(b.visited) - Number(a.visited));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("portal/doctors:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
