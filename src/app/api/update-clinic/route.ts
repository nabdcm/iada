// src/app/api/update-clinic/route.ts
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  // ── التحقق من صلاحية الأدمن ─────────────────────────────────
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      userId, name, owner, email, phone,
      plan, expiry, status, newPassword,
      clinic_type,
      account_type,
      max_doctors,
      country_code,
      payments_lock_enabled,
      payments_lock_password,
      restricted_access_enabled,
      restricted_access_pin,
      telemedicine_enabled,
    } = await req.json();

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    // ─── 1. تحديث Auth metadata ───────────────────────────
    const updatePayload: Record<string, unknown> = {
      user_metadata: {
        clinic_name: name, owner_name: owner,
        phone, plan, expiry, status,
        ...(clinic_type   ? { clinic_type }   : {}),
        ...(account_type  ? { account_type }  : {}),
        role: "clinic",
      },
    };
    if (newPassword) updatePayload.password = newPassword;

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (authError)
      return NextResponse.json({ error: authError.message }, { status: 400 });

    // ─── 2. تحديث جدول clinics ───────────────────────────
    // الصيدلية: plan يبقى "pharmacy" دائماً بغض النظر عما أُرسل
    const resolvedPlan = account_type === "pharmacy" ? "pharmacy" : plan;
    const clinicUpdate: Record<string, unknown> = {
      name, owner, email, phone, plan: resolvedPlan, expiry, status,
    };

    if (clinic_type)   clinicUpdate.clinic_type   = clinic_type;
    if (account_type)  clinicUpdate.account_type  = account_type;
    if (country_code)  clinicUpdate.country_code  = country_code;
    // حفظ كلمة السر نصاً عند إعادة التعيين (تُملأ القديمة تدريجياً)
    if (newPassword)   clinicUpdate.plain_password = newPassword;
    if (max_doctors !== undefined && max_doctors !== null)   clinicUpdate.max_doctors   = max_doctors;
    if (telemedicine_enabled !== undefined) clinicUpdate.telemedicine_enabled = telemedicine_enabled;

    // قفل المدفوعات — نحدّث دائماً (حتى عند إلغاء التفعيل)
    if (payments_lock_enabled !== undefined) {
      clinicUpdate.payments_lock_enabled  = payments_lock_enabled;
      clinicUpdate.payments_lock_password = payments_lock_password ?? "";
    }

    // الدخول المقيّد — نحدّث دائماً (حتى عند إلغاء التفعيل)
    if (restricted_access_enabled !== undefined) {
      clinicUpdate.restricted_access_enabled = restricted_access_enabled;
      clinicUpdate.restricted_access_pin     = restricted_access_pin ?? "";
    }

    const { error: clinicError } = await supabaseAdmin
      .from("clinics")
      .update(clinicUpdate)
      .eq("user_id", userId);

    if (clinicError) {
      console.error("❌ clinics update error:", clinicError);
      return NextResponse.json({ error: clinicError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}