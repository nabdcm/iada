// ============================================================
// /api/book-check — تحقق صفحة الحجز العامة من مريض مسجل
// (بديل آمن عن سياسة anon SELECT المفتوحة على patients)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { clinicId, phone } = await req.json() as { clinicId?: string; phone?: string };
    if (!clinicId || !phone?.trim()) {
      return NextResponse.json({ id: null });
    }
    const { data } = await supabaseAdmin
      .from("patients")
      .select("id")
      .eq("user_id", clinicId)
      .eq("phone", phone.trim())
      .maybeSingle();
    return NextResponse.json({ id: data?.id ?? null });
  } catch {
    return NextResponse.json({ id: null });
  }
}
