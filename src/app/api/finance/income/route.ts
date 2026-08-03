// src/app/api/finance/income/route.ts
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthorized } from "../../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("finance_income")
    .select("*, clinics(name)")
    .order("income_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ income: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { clinic_id, source, category, amount, currency, note, income_date } = await req.json();

    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "amount required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("finance_income")
      .insert({
        clinic_id: clinic_id || null,
        source: source === "subscription" ? "subscription" : "other",
        category: category || null,
        amount: Number(amount),
        currency: currency || "USD",
        note: note || null,
        income_date: income_date || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, income: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin.from("finance_income").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
