// src/app/api/pharmacy/cash-closing/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserId } from "../_pharmacyAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function computeTotals(userId: string, date: string) {
  const { data: sales } = await supabaseAdmin
    .from("pharmacy_sales").select("total, payment_method").eq("user_id", userId).eq("date", date);
  const { data: returns } = await supabaseAdmin
    .from("pharmacy_returns").select("total_refund, pharmacy_sales!inner(payment_method)")
    .eq("user_id", userId).eq("date", date);

  const cash_sales = (sales || []).filter(s => s.payment_method === "cash").reduce((s, x) => s + x.total, 0);
  const card_sales = (sales || []).filter(s => s.payment_method === "card").reduce((s, x) => s + x.total, 0);
  const insurance_sales = (sales || []).filter(s => s.payment_method === "insurance").reduce((s, x) => s + x.total, 0);
  // نطرح من النقدي فقط المرتجعات التي كانت أصلًا مبيعات نقدية (الكارت/التأمين ما بيرجّعوا كاش من الدرج)
  type RetRow = { total_refund: number; pharmacy_sales: { payment_method: string } | { payment_method: string }[] };
  const cash_returns = ((returns || []) as RetRow[])
    .filter(r => { const pm = Array.isArray(r.pharmacy_sales) ? r.pharmacy_sales[0]?.payment_method : r.pharmacy_sales?.payment_method; return pm === "cash"; })
    .reduce((s, x) => s + x.total_refund, 0);

  const expected_cash = cash_sales - cash_returns;
  return { cash_sales, card_sales, insurance_sales, cash_returns, expected_cash };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const date = searchParams.get("date");
  if (!userId || !date) return NextResponse.json({ error: "user_id and date required" }, { status: 400 });
    const authUid_userId = await getAuthUserId(req);
    if (!authUid_userId || authUid_userId !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { data: existing } = await supabaseAdmin.from("pharmacy_cash_closings").select("*").eq("user_id", userId).eq("date", date).maybeSingle();
    if (existing) return NextResponse.json({ closed: true, closing: existing });
    const totals = await computeTotals(userId, date);
    return NextResponse.json({ closed: false, preview: totals });
  } catch (err) {
    console.error("cash-closing GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user_id, date, counted_cash, notes, closed_by } = await req.json();
    if (!user_id || !date) return NextResponse.json({ error: "user_id and date required" }, { status: 400 });
    const authUid_user_id = await getAuthUserId(req);
    if (!authUid_user_id || authUid_user_id !== user_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (typeof counted_cash !== "number") return NextResponse.json({ error: "counted_cash required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("pharmacy_cash_closings").select("id").eq("user_id", user_id).eq("date", date).maybeSingle();
    if (existing) return NextResponse.json({ error: "هذا اليوم مقفل بالفعل" }, { status: 409 });

    const totals = await computeTotals(user_id, date);
    const difference = counted_cash - totals.expected_cash;

    const { data, error } = await supabaseAdmin.from("pharmacy_cash_closings").insert({
      user_id, date, cash_sales: totals.cash_sales, card_sales: totals.card_sales,
      insurance_sales: totals.insurance_sales, cash_returns: totals.cash_returns,
      expected_cash: totals.expected_cash, counted_cash, difference,
      notes: notes || null, closed_by: closed_by || "",
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, closing: data });
  } catch (err) {
    console.error("cash-closing POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
