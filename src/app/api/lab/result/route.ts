// src/app/api/lab/result/route.ts — نتيجة عامة عبر share_token (للرابط المشارك)
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }

  const { data: order, error } = await supabaseAdmin
    .from("lab_orders")
    .select("id, mrn, patient_name, patient_gender, patient_age, referring_doctor, status, sample_date, result_date, results, notes, user_id, created_at")
    .eq("share_token", token)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: "not found" }, { status: 404 });

  // اسم المخبر من جدول clinics
  const { data: lab } = await supabaseAdmin
    .from("clinics")
    .select("name, phone, owner")
    .eq("user_id", order.user_id)
    .maybeSingle();

  const { user_id: _omit, ...safeOrder } = order;
  void _omit;
  return NextResponse.json({
    order: safeOrder,
    lab: { name: lab?.name ?? "مخبر", phone: lab?.phone ?? null },
  });
}
