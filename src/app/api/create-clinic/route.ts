// src/app/api/create-clinic/route.ts
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "../_adminAuth";
import { withTimeout, AUTH_TIMEOUT_MS, DB_TIMEOUT_MS } from "../_withTimeout";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
  // ── التحقق من صلاحية الأدمن ─────────────────────────────────
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const {
      name, owner, email, phone,
      plan, expiry, status, password,
      clinic_type = "general",
      currency = "SYP",
      account_type = "clinic",
      country_code = "963",
    } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "البريد وكلمة المرور مطلوبان" }, { status: 400 });
    }

    // ─── 0. هل العيادة موجودة أصلاً؟ (إعادة محاولة بعد فشل سابق) ──
    const { data: existingClinic } = await withTimeout(
      supabaseAdmin.from("clinics").select("user_id").ilike("email", email).maybeSingle(),
      DB_TIMEOUT_MS, "clinics.select"
    );
    if (existingClinic?.user_id) {
      return NextResponse.json(
        { error: "هذا البريد مسجّل لعيادة موجودة بالفعل — ابحث عنها في القائمة بدل إنشائها من جديد." },
        { status: 409 }
      );
    }

    const userMeta = {
      clinic_name: name, owner_name: owner,
      phone, plan, expiry, status,
      clinic_type, account_type, role: "clinic",
    };

    // ─── 1. إنشاء المستخدم في Auth (بمهلة) ───────────────
    let userId: string | undefined;
    try {
      const { data: authData, error: authError } = await withTimeout(
        supabaseAdmin.auth.admin.createUser({
          email, password, email_confirm: true, user_metadata: userMeta,
        }),
        AUTH_TIMEOUT_MS, "auth.createUser"
      );

      if (authError) {
        const code = (authError as { code?: string }).code;
        const msg  = (authError.message || "").toLowerCase();
        const exists = code === "email_exists" || msg.includes("already") || msg.includes("exists");
        if (!exists) {
          console.error("Auth error:", authError);
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        // الحساب أُنشئ في محاولة سابقة انقطعت قبل الرد — نكمل بنفس المستخدم
        const { data: foundId, error: rpcErr } = await withTimeout(
          supabaseAdmin.rpc("auth_user_id_by_email", { p_email: email }), DB_TIMEOUT_MS, "auth_user_id_by_email"
        );
        if (rpcErr || !foundId) {
          console.error("lookup by email failed:", rpcErr);
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        userId = String(foundId);
        // نضبط كلمة المرور والبيانات على ما أدخله الأدمن الآن
        await withTimeout(
          supabaseAdmin.auth.admin.updateUserById(userId, { password, user_metadata: userMeta, email_confirm: true }),
          AUTH_TIMEOUT_MS, "auth.updateUserById"
        ).catch(e => console.error("updateUserById (non-fatal):", e));
      } else {
        userId = authData.user.id;
      }
    } catch (e) {
      console.error("createUser timeout/exception:", e);
      return NextResponse.json(
        { error: "خدمة المصادقة لم تستجب في الوقت المحدد. أعد المحاولة بعد قليل — إعادة المحاولة آمنة ولن تُنشئ حساباً مكرراً." },
        { status: 504 }
      );
    }

    // ─── 2. إضافة في جدول clinics ────────────────────────
    // plan: الصيدلية تأخذ "pharmacy" — العمود نوعه text ويقبل أي قيمة
    // clinic_type: الصيدلية تأخذ "general" لأن العمود NOT NULL
    const planForDb        = account_type === "pharmacy" ? "pharmacy" : account_type === "lab" ? "lab" : plan;
    const clinicTypeForDb  = (account_type === "pharmacy" || account_type === "lab") ? "general" : (clinic_type || "general");

    const { error: clinicError } = await withTimeout(supabaseAdmin
      .from("clinics")
      .insert({
        user_id: userId,
        name,
        owner,
        email,
        phone,
        plan:        planForDb,
        expiry,
        status,
        clinic_type: clinicTypeForDb,
        currency,
        account_type,
        country_code: country_code || "963",
        plain_password: password ?? null,
      }), DB_TIMEOUT_MS, "clinics.insert");

    if (clinicError) {
      console.error("❌ clinics insert error:", JSON.stringify(clinicError));
      // لا نحذف حساب Auth: إعادة المحاولة ستلتقطه وتكمل الإدراج
      return NextResponse.json(
        { error: `تعذّر حفظ سجل العيادة: ${clinicError.message}. أعد المحاولة — لن يُنشأ حساب مكرر.` },
        { status: 500 }
      );
    }

    // ─── 3. clinic_profiles للعيادات فقط ─────────────────
    if (account_type !== "pharmacy" && account_type !== "lab") {
      const { error: profileError } = await supabaseAdmin
        .from("clinic_profiles")
        .upsert({
          id:                   userId,
          clinic_name:          name,
          doctor_name:          owner,
          phone:                phone || "",
          address:              "",
          working_hours_start:  "09:00",
          working_hours_end:    "17:00",
          working_days:         ["sun","mon","tue","wed","thu"],
          appointment_duration: 30,
        });

      if (profileError) console.error("❌ clinic_profiles error:", profileError);
    }

    return NextResponse.json({
      success: true,
      userId,
      bookingUrl: (account_type === "pharmacy" || account_type === "lab") ? null : `/book/${userId}`,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}