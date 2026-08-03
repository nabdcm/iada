// src/app/api/finance/record-payment/route.ts
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "../../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { clinic_id, amount, billing_cycle, note } = await req.json();
    if (!clinic_id || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "clinic_id and amount required" }, { status: 400 });
    }

    const today = new Date();
    const next = new Date(today);
    if (billing_cycle === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    const nextStr = next.toISOString().slice(0, 10);

    const { data: income, error: incomeErr } = await supabaseAdmin
      .from("finance_income")
      .insert({
        clinic_id,
        source: "subscription",
        amount: Number(amount),
        currency: "USD",
        note: note || null,
        income_date: today.toISOString().slice(0, 10),
      })
      .select()
      .single();
    if (incomeErr) return NextResponse.json({ error: incomeErr.message }, { status: 400 });

    const { data: clinic, error: clinicErr } = await supabaseAdmin
      .from("clinics")
      .update({ payment_status: "paid", next_billing_date: nextStr })
      .eq("id", clinic_id)
      .select()
      .single();
    if (clinicErr) return NextResponse.json({ error: clinicErr.message }, { status: 400 });

    return NextResponse.json({ success: true, income, clinic });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
