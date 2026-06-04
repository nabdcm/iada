// app/api/create-clinic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase Admin client — يستخدم SERVICE_ROLE_KEY لإنشاء المستخدمين
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      name,
      owner,
      phone,
      plan,
      expiry,
      status,
      clinic_type,
      account_type, // ← المفتاح الحاسم
      max_doctors,
    } = body;

    // ── 1. التحقق من البيانات المطلوبة ──────────────────────
    if (!email || !password || !name || !plan) {
      return NextResponse.json(
        { error: "email, password, name, plan are required" },
        { status: 400 }
      );
    }

    // ── 2. إنشاء المستخدم في Supabase Auth ──────────────────
    // user_metadata يُستخدم لاحقاً للتحقق من نوع الحساب في صفحة login
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:          email.trim().toLowerCase(),
      password,
      email_confirm:  true, // لا نريد تأكيد البريد
      user_metadata: {
        name,
        owner,
        phone,
        plan,
        account_type: account_type || "clinic", // ← يُحفظ هنا للتحقق في login
        clinic_type:  account_type === "pharmacy" ? null : (clinic_type || "general"),
      },
    });

    if (authError || !authData?.user) {
      console.error("Auth create error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // ── 3. إدراج السجل في جدول clinics ──────────────────────
    const { error: dbError } = await supabaseAdmin
      .from("clinics")
      .insert({
        user_id:      userId,
        name,
        owner:        owner || "",
        email:        email.trim().toLowerCase(),
        phone:        phone || "",
        plan,
        expiry:       expiry || null,
        status:       status || "active",
        clinic_type:  account_type === "pharmacy" ? null : (clinic_type || "general"),
        account_type: account_type || "clinic", // ← يُحفظ هنا للقراءة من الأدمن
        max_doctors:  max_doctors || null,
      });

    if (dbError) {
      console.error("DB insert error:", dbError);
      // نحذف المستخدم من Auth لو فشل الإدراج في DB
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json(
        { error: dbError.message || "Failed to save clinic data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("create-clinic error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}