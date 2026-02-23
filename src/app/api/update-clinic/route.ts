// src/app/api/update-clinic/route.ts
// ============================================================
// API Route — تحديث بيانات العيادة (يعمل من Server)
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
    const { userId, name, owner, email, phone, plan, expiry, status, newPassword } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // تحديث metadata في Auth
    const updatePayload: Record<string, unknown> = {
      user_metadata: { clinic_name: name, owner_name: owner, phone, plan, expiry, status, role: "clinic" },
    };
    if (newPassword) updatePayload.password = newPassword;

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // تحديث جدول clinics
    await supabaseAdmin.from("clinics").update({ name, owner, email, phone, plan, expiry, status }).eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
