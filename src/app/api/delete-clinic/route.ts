// src/app/api/delete-clinic/route.ts
// ─── حذف العيادة نهائياً من كل الجداول + Auth ─────────────────

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

    // 1. حذف من جدول clinics
    const { error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .delete()
      .eq("user_id", userId);

    if (clinicErr) {
      console.error("delete-clinic clinics error:", clinicErr);
      return NextResponse.json({ error: clinicErr.message }, { status: 500 });
    }

    // 2. حذف من جدول clinic_profiles
    const { error: profileErr } = await supabaseAdmin
      .from("clinic_profiles")
      .delete()
      .eq("id", userId);

    if (profileErr) {
      console.error("delete-clinic profiles error:", profileErr);
      // لا نوقف — ربما لا يوجد profile
    }

    // 3. حذف المستخدم من Supabase Auth نهائياً
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authErr) {
      console.error("delete-clinic auth error:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("delete-clinic exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
