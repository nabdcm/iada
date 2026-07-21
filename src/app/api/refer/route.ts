// ============================================================
// /api/refer — إرسال تحويل مريض من عيادة إلى عيادة أخرى
// يتحقق من هوية المرسل عبر توكن Supabase ثم يحلّ بريد العيادة
// المستقبِلة بصلاحية service_role ويُدرج التحويل
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type Body = {
  targetEmail?: string;
  targetUserId?: string;
  patientId?: number;
  reason?: string;
};

export async function POST(req: NextRequest) {
  try {
    // ── التحقق من المرسل ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    const sender = userData?.user;
    if (userErr || !sender) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { targetEmail, targetUserId, patientId, reason } = (await req.json()) as Body;
    if ((!targetEmail?.trim() && !targetUserId) || !patientId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // ── حلّ العيادة المستقبلة (بالمعرّف أو بالبريد) ──
    let targetQuery = supabaseAdmin.from("clinics").select("user_id, name, status");
    targetQuery = targetUserId
      ? targetQuery.eq("user_id", targetUserId)
      : targetQuery.eq("email", (targetEmail ?? "").trim().toLowerCase());
    const { data: target } = await targetQuery.maybeSingle();

    if (!target) return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });
    if (target.user_id === sender.id) {
      return NextResponse.json({ error: "self_referral" }, { status: 400 });
    }

    // ── التحقق من ملكية المريض + أخذ لقطة من بياناته ──
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("id, name, phone, gender, date_of_birth, has_diabetes, has_hypertension, notes")
      .eq("id", patientId)
      .eq("user_id", sender.id)
      .maybeSingle();

    if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });

    // ── اسم العيادة المرسلة ──
    const { data: senderClinic } = await supabaseAdmin
      .from("clinics")
      .select("name")
      .eq("user_id", sender.id)
      .maybeSingle();

    const { error: insertErr } = await supabaseAdmin.from("referrals").insert({
      from_user_id: sender.id,
      to_user_id: target.user_id,
      from_clinic_name: senderClinic?.name ?? null,
      to_clinic_name: target.name ?? null,
      patient_id: patient.id,
      patient_snapshot: patient,
      reason: reason?.trim() || null,
      status: "pending",
    });

    if (insertErr) {
      console.error("refer insert:", insertErr);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, toClinic: target.name ?? targetEmail });
  } catch (e) {
    console.error("refer:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
