// src/app/api/lab-requests/route.ts
// ميزة 8 — طلب تحليل من العيادة يصل إلى المخبر عبر MRN
// ميزة 9 — إشعار الطبيب فور صدور النتيجة
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

type AccountRow = { name: string | null; account_type: string | null; status: string | null };

async function getAccount(userId: string): Promise<AccountRow | null> {
  const { data } = await supabaseAdmin
    .from("clinics").select("name, account_type, status").eq("user_id", userId).maybeSingle();
  return (data as AccountRow) ?? null;
}

/** إشعار داخل التطبيق + دفع للمتصفح (الدفع اختياري ولا يُفشل العملية) */
async function notify(userId: string, title: string, body: string, url: string, tag: string) {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, url, tag, read: false });
  try {
    await supabaseAdmin.functions.invoke("send-push", { body: { user_id: userId, title, body, url, tag } });
  } catch {
    // الدفع غير مُهيّأ — الإشعار الداخلي كافٍ
  }
}

// ═══════════════════════ GET ═══════════════════════
// ?role=clinic  → الطلبات التي أرسلتها العيادة
// ?role=lab     → الطلبات الواردة إلى المخبر
export async function GET(req: Request) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") === "lab" ? "lab" : "clinic";
  const col = role === "lab" ? "lab_user_id" : "clinic_user_id";

  const { data, error } = await supabaseAdmin
    .from("clinic_lab_requests")
    .select("*")
    .eq(col, userId)
    .order("created_at", { ascending: false })
    .range(0, 499);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ requests: data ?? [] });
}

// ═══════════════════════ POST ═══════════════════════
export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const body = await req.json();
    const action: string = body.action;

    // ── إنشاء طلب من العيادة ──
    if (action === "create") {
      const acc = await getAccount(userId);
      if (!acc || acc.account_type === "lab") {
        return NextResponse.json({ error: "هذا الإجراء متاح لحسابات العيادات فقط" }, { status: 403 });
      }
      const {
        lab_user_id, patient_id, patient_name, patient_phone,
        patient_gender, patient_age, referring_doctor, tests, notes, urgency,
      } = body;

      if (!lab_user_id) return NextResponse.json({ error: "اختر المخبر أولاً" }, { status: 400 });
      if (!patient_name?.trim()) return NextResponse.json({ error: "اسم المريض مطلوب" }, { status: 400 });
      if (!Array.isArray(tests) || tests.length === 0) {
        return NextResponse.json({ error: "أضف تحليلاً واحداً على الأقل" }, { status: 400 });
      }

      // تحقّق أن الوجهة مخبر فعّال
      const { data: lab } = await supabaseAdmin
        .from("clinics").select("user_id, name, account_type, status")
        .eq("user_id", lab_user_id).maybeSingle();
      if (!lab || lab.account_type !== "lab") {
        return NextResponse.json({ error: "المخبر المحدّد غير موجود" }, { status: 400 });
      }

      // MRN من سجل المريض إن توفّر
      let mrn: string | null = null;
      if (patient_id) {
        const { data: pat } = await supabaseAdmin
          .from("patients").select("mrn").eq("id", Number(patient_id)).eq("user_id", userId).maybeSingle();
        mrn = pat?.mrn ?? null;
      }

      const { data, error } = await supabaseAdmin
        .from("clinic_lab_requests")
        .insert({
          clinic_user_id: userId,
          lab_user_id,
          clinic_name: acc.name ?? null,
          patient_id: patient_id ? Number(patient_id) : null,
          mrn,
          patient_name: String(patient_name).trim(),
          patient_phone: patient_phone || null,
          patient_gender: patient_gender || null,
          patient_age: patient_age || null,
          referring_doctor: referring_doctor || null,
          tests,
          notes: notes || null,
          urgency: urgency === "urgent" ? "urgent" : "normal",
          status: "pending",
        })
        .select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      await notify(
        lab_user_id,
        urgency === "urgent" ? "طلب تحليل عاجل" : "طلب تحليل جديد",
        `${acc.name ?? "عيادة"} — ${patient_name}${mrn ? ` (${mrn})` : ""}`,
        "/lab?tab=requests",
        `labreq-${data.id}`
      );

      return NextResponse.json({ success: true, request: data });
    }

    // ── إلغاء الطلب من العيادة ──
    if (action === "cancel") {
      const { data, error } = await supabaseAdmin
        .from("clinic_lab_requests")
        .update({ status: "cancelled", responded_at: new Date().toISOString() })
        .eq("id", body.id).eq("clinic_user_id", userId).eq("status", "pending")
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, request: data });
    }

    // ── قبول / رفض من المخبر ──
    if (action === "accept" || action === "reject") {
      const patch: Record<string, unknown> = {
        status: action === "accept" ? "accepted" : "rejected",
        responded_at: new Date().toISOString(),
      };
      if (action === "reject") patch.reject_reason = body.reason || null;

      const { data, error } = await supabaseAdmin
        .from("clinic_lab_requests").update(patch)
        .eq("id", body.id).eq("lab_user_id", userId)
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const lab = await getAccount(userId);
      await notify(
        data.clinic_user_id,
        action === "accept" ? "قُبل طلب التحليل" : "رُفض طلب التحليل",
        `${lab?.name ?? "المخبر"} — ${data.patient_name}${action === "reject" && body.reason ? ` · ${body.reason}` : ""}`,
        "/lab-requests",
        `labreq-${data.id}`
      );
      return NextResponse.json({ success: true, request: data });
    }

    // ── إنشاء طلب مخبري فعلي من الطلب الوارد ──
    if (action === "convert") {
      const { data: reqRow, error: rErr } = await supabaseAdmin
        .from("clinic_lab_requests").select("*")
        .eq("id", body.id).eq("lab_user_id", userId).maybeSingle();
      if (rErr || !reqRow) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
      if (reqRow.lab_order_id) {
        return NextResponse.json({ success: true, order_id: reqRow.lab_order_id, already: true });
      }

      const tests = Array.isArray(reqRow.tests) ? reqRow.tests : [];
      const results = tests.map((t: { catalog_id?: number | null; name?: string; unit?: string | null; ref_low?: number | null; ref_high?: number | null; ref_text?: string | null }) => ({
        catalog_id: t.catalog_id ?? null,
        test_name: t.name ?? "",
        value: "",
        unit: t.unit ?? null,
        ref_low: t.ref_low ?? null,
        ref_high: t.ref_high ?? null,
        ref_text: t.ref_text ?? null,
      }));
      const price = tests.reduce((s: number, t: { price?: number }) => s + Number(t.price ?? 0), 0);

      const { data: order, error: oErr } = await supabaseAdmin
        .from("lab_orders").insert({
          user_id: userId,
          mrn: reqRow.mrn,
          patient_name: reqRow.patient_name,
          patient_phone: reqRow.patient_phone,
          patient_gender: reqRow.patient_gender,
          patient_age: reqRow.patient_age,
          referring_doctor: reqRow.referring_doctor ?? reqRow.clinic_name,
          sample_date: new Date().toISOString().slice(0, 10),
          results, price, paid: 0,
          notes: reqRow.notes,
          status: "pending",
          clinic_request_id: reqRow.id,
        })
        .select().single();
      if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 });

      await supabaseAdmin.from("clinic_lab_requests")
        .update({ status: "accepted", lab_order_id: order.id, responded_at: new Date().toISOString() })
        .eq("id", reqRow.id);

      return NextResponse.json({ success: true, order_id: order.id });
    }

    // ── إعلام العيادة بصدور النتيجة (ميزة 9) ──
    if (action === "notify_result") {
      const { data: reqRow, error: rErr } = await supabaseAdmin
        .from("clinic_lab_requests").select("*")
        .eq("id", body.id).eq("lab_user_id", userId).maybeSingle();
      if (rErr || !reqRow) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

      const { error: uErr } = await supabaseAdmin.from("clinic_lab_requests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", reqRow.id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

      const lab = await getAccount(userId);
      await notify(
        reqRow.clinic_user_id,
        "صدرت نتيجة التحليل",
        `${reqRow.patient_name}${reqRow.mrn ? ` (${reqRow.mrn})` : ""} — ${lab?.name ?? "المخبر"}`,
        "/lab-requests",
        `labres-${reqRow.id}`
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err) {
    console.error("lab-requests error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
