// src/app/api/restricted-access/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const isSharedPlan = (plan?: string | null) => !!plan && plan.startsWith("shared_");

// ─── شاشات الأخطاء العامة (لا نكشف تفاصيل داخلية) ─────────
const INVALID_LINK = NextResponse.json({ error: "invalid_link" }, { status: 404 });
const INVALID_PIN  = NextResponse.json({ error: "invalid_pin" },  { status: 401 });
const BAD_REQUEST  = NextResponse.json({ error: "bad_request" },  { status: 400 });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action   = body?.action as string | undefined;
    const clinicId = (body?.clinicId as string | undefined)?.trim();
    const pin      = (body?.pin as string | undefined)?.trim();

    if (!clinicId) return BAD_REQUEST;

    // ── جلب بيانات العيادة (دائماً عبر service role) ──────
    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .select("user_id, name, clinic_type, restricted_access_enabled, restricted_access_pin, plan")
      .eq("user_id", clinicId)
      .maybeSingle();

    if (clinicError || !clinic || !clinic.restricted_access_enabled) {
      return INVALID_LINK;
    }

    // ─────────────────────────────────────────────────────
    // action: "check" — فقط للتحقق من أن الرابط مفعّل
    // (لا تُكشف أي بيانات حساسة، فقط اسم العيادة ونوعها)
    // ─────────────────────────────────────────────────────
    if (action === "check") {
      return NextResponse.json({
        valid: true,
        clinic: {
          user_id: clinic.user_id,
          name: clinic.name,
          clinic_type: clinic.clinic_type,
          plan: clinic.plan,
        },
      });
    }

    // كل الإجراءات التالية تتطلب PIN صحيح
    if (!pin) return BAD_REQUEST;
    if (String(clinic.restricted_access_pin).trim() !== pin) {
      return INVALID_PIN;
    }

    // ─────────────────────────────────────────────────────
    // action: "data" — جلب المرضى + الأطباء + المواعيد
    // ─────────────────────────────────────────────────────
    if (action === "data") {
      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("id, name, phone, date_of_birth, gender, notes, has_diabetes, has_hypertension, created_at")
        .eq("user_id", clinicId)
        .eq("is_hidden", false)
        .order("name", { ascending: true });

      let doctors: unknown[] = [];
      if (isSharedPlan(clinic.plan)) {
        const { data: docs } = await supabaseAdmin
          .from("doctors")
          .select("id, name, specialty, user_id")
          .eq("user_id", clinicId)
          .order("name");
        doctors = docs || [];
      }

      return NextResponse.json({
        clinic: {
          user_id: clinic.user_id,
          name: clinic.name,
          clinic_type: clinic.clinic_type,
          plan: clinic.plan,
        },
        patients: patients || [],
        doctors,
      });
    }

    // ─────────────────────────────────────────────────────
    // action: "appointments" — جلب مواعيد العيادة
    // ─────────────────────────────────────────────────────
    if (action === "appointments") {
      const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("*")
        .eq("user_id", clinicId)
        .neq("status", "pending_approval")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      return NextResponse.json({ appointments: appointments || [] });
    }

    // ─────────────────────────────────────────────────────
    // action: "profile" — جلب الملف الطبي لمريض معيّن
    // ─────────────────────────────────────────────────────
    if (action === "profile") {
      const patientId = body?.patientId;
      if (!patientId) return BAD_REQUEST;

      // تأكد أن المريض ينتمي لهذه العيادة قبل إرجاع ملفه
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("id")
        .eq("id", patientId)
        .eq("user_id", clinicId)
        .maybeSingle();

      if (!patient) return BAD_REQUEST;

      const { data: profile } = await supabaseAdmin
        .from("patient_profiles")
        .select("medical_fields, extra_form_fields")
        .eq("patient_id", patientId)
        .maybeSingle();

      return NextResponse.json({
        profile: profile
          ? { medical_fields: profile.medical_fields ?? {}, extra_form_fields: profile.extra_form_fields ?? {} }
          : { medical_fields: {}, extra_form_fields: {} },
      });
    }

    return BAD_REQUEST;
  } catch (err) {
    console.error("[restricted-access API]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
