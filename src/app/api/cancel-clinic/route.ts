// src/app/api/cancel-clinic/route.ts
// ─── إلغاء اشتراك العيادة (status = expired) ──────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId مطلوب" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. تحديث جدول clinics
    const { error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .update({ status: "expired", expiry: today })
      .eq("user_id", userId);

    if (clinicErr) {
      console.error("cancel-clinic clinics error:", clinicErr);
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // 2. تحديث clinic_profiles إن وُجد
    await supabaseAdmin
      .from("clinic_profiles")
      .update({ status: "expired" })
      .eq("id", userId);

    return NextResponse.json({ ok: true, expiry: today });
  } catch (err) {
    console.error("cancel-clinic exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
