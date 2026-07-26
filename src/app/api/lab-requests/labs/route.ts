// src/app/api/lab-requests/labs/route.ts — قائمة المخابر المتاحة للإرسال إليها
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

  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("user_id, name, phone, status")
    .eq("account_type", "lab")
    .eq("status", "active")
    .order("name", { ascending: true })
    .range(0, 499);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // دليل التحاليل العام (المشترك بين كل المخابر) لاقتراح الأسماء والوحدات
  const { data: catalog } = await supabaseAdmin
    .from("lab_tests_catalog")
    .select("id, name_ar, name_en, category, unit, ref_low, ref_high, ref_text, price")
    .is("user_id", null)
    .order("name_ar", { ascending: true })
    .range(0, 999);

  return NextResponse.json({ labs: data ?? [], catalog: catalog ?? [] });
}
