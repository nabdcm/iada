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
        .select("medical_fields, extra_form_fields, xrays")
        .eq("patient_id", patientId)
        .maybeSingle();

      // توقيع روابط الأشعة المخزّنة في Storage (bucket خاص)
      type XrayEntry = { id?:string; url?:string|null; storage_path?:string|null } & Record<string, unknown>;
      const rawXrays = (Array.isArray(profile?.xrays) ? profile!.xrays : []) as XrayEntry[];
      const signedXrays = await Promise.all(rawXrays.map(async (x) => {
        if (x?.storage_path) {
          const { data } = await supabaseAdmin.storage.from("xrays").createSignedUrl(x.storage_path, 3600);
          return { ...x, url: data?.signedUrl ?? x.url ?? null };
        }
        return x;
      }));

      return NextResponse.json({
        profile: profile
          ? { medical_fields: profile.medical_fields ?? {}, extra_form_fields: profile.extra_form_fields ?? {}, xrays: signedXrays }
          : { medical_fields: {}, extra_form_fields: {}, xrays: [] },
      });
    }

    // ─────────────────────────────────────────────────────
    // action: "save_medical_field" — حفظ حقل واحد من السجل الطبي
    // ─────────────────────────────────────────────────────
    if (action === "save_medical_field") {
      const patientId = body?.patientId;
      const key        = body?.key as string | undefined;
      const value      = (body?.value as string | undefined) ?? "";
      if (!patientId || !key) return BAD_REQUEST;

      // تأكد أن المريض ينتمي لهذه العيادة
      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("id")
        .eq("id", patientId)
        .eq("user_id", clinicId)
        .maybeSingle();
      if (!patient) return BAD_REQUEST;

      const { data: existing } = await supabaseAdmin
        .from("patient_profiles")
        .select("medical_fields")
        .eq("patient_id", patientId)
        .maybeSingle();

      const updatedFields = { ...(existing?.medical_fields ?? {}), [key]: value };

      const { error: upsertError } = await supabaseAdmin
        .from("patient_profiles")
        .upsert({
          patient_id: patientId,
          user_id: clinicId,
          medical_fields: updatedFields,
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" });

      if (upsertError) {
        console.error("[restricted-access] save_medical_field upsert error:", upsertError);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    // ─────────────────────────────────────────────────────
    // action: "save_xrays" — حفظ مصفوفة صور الأشعة كاملة
    // ─────────────────────────────────────────────────────
    if (action === "save_xrays") {
      const patientId = body?.patientId;
      const xrays      = body?.xrays;
      if (!patientId || !Array.isArray(xrays)) return BAD_REQUEST;

      // الأشعة متاحة فقط للخطط الشاملة
      if (clinic.plan !== "enterprise" && clinic.plan !== "shared_enterprise") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }

      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("id")
        .eq("id", patientId)
        .eq("user_id", clinicId)
        .maybeSingle();
      if (!patient) return BAD_REQUEST;

      // تحويل أي صورة base64 جديدة إلى Storage — مع حد أقصى 1MB لكل صورة
      const MAX_XRAY_BYTES = 1024 * 1024;
      type XraySaveEntry = { id?:string; url?:string|null; storage_path?:string|null } & Record<string, unknown>;
      const processedXrays: XraySaveEntry[] = [];
      for (const raw of xrays as XraySaveEntry[]) {
        if (typeof raw?.url === "string" && raw.url.startsWith("data:image")) {
          const [meta, b64] = raw.url.split(",");
          if (!b64) return BAD_REQUEST;
          const buf = Buffer.from(b64, "base64");
          if (buf.length > MAX_XRAY_BYTES) {
            return NextResponse.json({ error: "file_too_large" }, { status: 413 });
          }
          const mime = meta.match(/data:(image\/[a-z+]+)/)?.[1] ?? "image/jpeg";
          const ext  = mime.split("/")[1].replace("jpeg", "jpg");
          const path = `ra/${patientId}/${raw.id ?? Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
          const { error: upErr } = await supabaseAdmin.storage.from("xrays")
            .upload(path, buf, { contentType: mime, upsert: true });
          if (upErr) {
            console.error("[restricted-access] xray upload error:", upErr);
            return NextResponse.json({ error: "server_error" }, { status: 500 });
          }
          processedXrays.push({ ...raw, url: null, storage_path: path });
        } else {
          // إزالة أي روابط موقّتة موقّعة قبل الحفظ — نحتفظ بمسار التخزين فقط
          if (raw?.storage_path) processedXrays.push({ ...raw, url: null });
          else processedXrays.push(raw);
        }
      }

      const { error: upsertError } = await supabaseAdmin
        .from("patient_profiles")
        .upsert({
          patient_id: patientId,
          user_id: clinicId,
          xrays: processedXrays,
          updated_at: new Date().toISOString(),
        }, { onConflict: "patient_id" });

      if (upsertError) {
        console.error("[restricted-access] save_xrays upsert error:", upsertError);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return BAD_REQUEST;
  } catch (err) {
    console.error("[restricted-access API]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
