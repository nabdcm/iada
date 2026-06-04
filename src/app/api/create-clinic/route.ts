// src/app/api/create-clinic/route.ts
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
      name, owner, email, phone,
      plan, expiry, status, password,
      clinic_type = "general",
      account_type = "clinic",
    } = await req.json();

    // ─── 1. إنشاء المستخدم في Auth ───────────────────────
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          clinic_name: name, owner_name: owner,
          phone, plan, expiry, status,
          clinic_type,
          account_type,
          role: "clinic",
        },
      });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // ─── 2. إضافة في جدول clinics ────────────────────────
    // plan: الصيدلية تأخذ "basic" لأن DB لا يقبل "pharmacy"
    // clinic_type: الصيدلية تأخذ "general" لأن العمود NOT NULL
    const planForDb        = account_type === "pharmacy" ? "basic"   : plan;
    const clinicTypeForDb  = account_type === "pharmacy" ? "general" : (clinic_type || "general");

    const { error: clinicError } = await supabaseAdmin
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
        account_type,
      });

    if (clinicError) {
      console.error("❌ clinics insert error:", JSON.stringify(clinicError));
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: clinicError.message }, { status: 500 });
    }

    // ─── 3. clinic_profiles للعيادات فقط ─────────────────
    if (account_type !== "pharmacy") {
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
      bookingUrl: account_type === "pharmacy" ? null : `/book/${userId}`,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}