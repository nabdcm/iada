// src/app/api/create-clinic/route.ts
// ============================================================
// API Route — إنشاء عيادة جديدة (يعمل من Server مع service_role)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// استخدام service_role key — فقط في Server-side!
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // أضفها في .env.local و Vercel
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { name, owner, email, phone, plan, expiry, status, password } = await req.json();

    // 1. إنشاء المستخدم في Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // لا يحتاج تأكيد بريد
      user_metadata: {
        clinic_name: name,
        owner_name:  owner,
        phone,
        plan,
        expiry,
        status,
        role: "clinic",
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. إضافة سجل في جدول clinic_profiles
    const { error: profileError } = await supabaseAdmin
      .from("clinic_profiles")
      .upsert({
        id:           userId,
        clinic_name:  name,
        doctor_name:  owner,
        phone,
        address:      "",
        working_hours_start:  "09:00",
        working_hours_end:    "17:00",
        working_days:         ["sun","mon","tue","wed","thu"],
        appointment_duration: 30,
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      // لا نوقف العملية — العيادة قادرة على الإعداد بنفسها
    }

    // 3. إضافة سجل في جدول clinics (للأدمن)
    const { error: clinicError } = await supabaseAdmin
      .from("clinics")
      .upsert({
        user_id: userId,
        name,
        owner,
        email,
        phone,
        plan,
        expiry,
        status,
      });

    if (clinicError) {
      console.error("Clinic table error:", clinicError);
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
