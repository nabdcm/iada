// src/app/api/update-clinic/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const {
      userId, name, owner, email, phone,
      plan, expiry, status, newPassword,
      clinic_type,                       // ← الجديد
    } = await req.json();

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    // ─── 1. تحديث Auth metadata ───────────────────────────
    const updatePayload: Record<string, unknown> = {
      user_metadata: {
        clinic_name: name, owner_name: owner,
        phone, plan, expiry, status,
        ...(clinic_type ? { clinic_type } : {}),  // ← الجديد
        role: "clinic",
      },
    };
    if (newPassword) updatePayload.password = newPassword;

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (authError)
      return NextResponse.json({ error: authError.message }, { status: 400 });

    // ─── 2. تحديث جدول clinics ───────────────────────────
    const clinicUpdate: Record<string, unknown> = {
      name, owner, email, phone, plan, expiry, status,
    };
    // نحدّث clinic_type فقط إذا أُرسل (لا نمسح قيمة موجودة)
    if (clinic_type) clinicUpdate.clinic_type = clinic_type;

    const { error: clinicError } = await supabaseAdmin
      .from("clinics")
      .update(clinicUpdate)
      .eq("user_id", userId);

    if (clinicError) console.error("❌ clinics update error:", clinicError);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}