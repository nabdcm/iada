// src/app/api/freeze-clinic/route.ts
// ─── تجميد / رفع تجميد العيادة ───────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return NextResponse.json({ error: "userId و status مطلوبان" }, { status: 400 });
    }

    if (!["active", "inactive"].includes(status)) {
      return NextResponse.json({ error: "قيمة status غير صالحة" }, { status: 400 });
    }

    // 1. تحديث جدول clinics
    const { error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .update({ status })
      .eq("user_id", userId);

    if (clinicErr) {
      console.error("freeze-clinic clinics error:", clinicErr);
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // 2. تحديث clinic_profiles إن وُجد
    await supabaseAdmin
      .from("clinic_profiles")
      .update({ status })
      .eq("id", userId);

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("freeze-clinic exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
