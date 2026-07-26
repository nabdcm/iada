// src/app/api/lab-requests/result/route.ts
// ميزة 9 — العيادة تفتح نتيجة التحليل الخاصة بطلبها فقط
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: auth, error: aErr } = await supabaseAdmin.auth.getUser(token);
  if (aErr || !auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = auth.user.id;

  const { searchParams } = new URL(req.url);
  const requestId = Number(searchParams.get("request_id"));
  if (!requestId) return NextResponse.json({ error: "request_id مطلوب" }, { status: 400 });

  // الطلب يخصّ هذه العيادة أو هذا المخبر فقط
  const { data: reqRow } = await supabaseAdmin
    .from("clinic_lab_requests")
    .select("id, clinic_user_id, lab_user_id, lab_order_id, patient_name, mrn")
    .eq("id", requestId).maybeSingle();

  if (!reqRow || (reqRow.clinic_user_id !== userId && reqRow.lab_user_id !== userId)) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }
  if (!reqRow.lab_order_id) return NextResponse.json({ order: null });

  const { data: order, error } = await supabaseAdmin
    .from("lab_orders")
    .select("id, share_token, status, sample_date, result_date, results, notes, referring_doctor")
    .eq("id", reqRow.lab_order_id).maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: order ?? null });
}
