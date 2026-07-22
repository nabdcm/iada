// ============================================================
// /api/change-password — تغيير الطبيب لكلمة سر حسابه بنفسه
// - يتحقق من هوية الطبيب عبر توكن جلسته
// - يتحقق من كلمة السر الحالية قبل التغيير
// - يحدّث Supabase Auth + عمود plain_password (ليراها الأدمن)
// - لا يُسجّل الخروج: الجلسة الحالية تبقى صالحة
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { currentPassword, newPassword } = (await req.json()) as {
      currentPassword?: string; newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "too_short" }, { status: 400 });
    }

    // ── التحقق من كلمة السر الحالية عبر تسجيل دخول مؤقت (بعميل معزول) ──
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";
    const verifier = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInErr } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInErr) {
      return NextResponse.json({ error: "wrong_current" }, { status: 400 });
    }
    // لا نُبقي أي جلسة من عميل التحقق
    await verifier.auth.signOut().catch(() => {});

    // ── تحديث كلمة السر في Auth ──
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updErr) return NextResponse.json({ error: "update_failed" }, { status: 500 });

    // ── مزامنة النسخة النصية لجدول clinics (لعرضها في لوحة الأدمن) ──
    await supabaseAdmin.from("clinics")
      .update({ plain_password: newPassword })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("change-password:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
