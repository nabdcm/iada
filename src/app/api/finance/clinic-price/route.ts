// src/app/api/finance/clinic-price/route.ts
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
    const { id, price_override, discount_percent, billing_cycle } = await req.json();

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (billing_cycle && !["monthly", "yearly"].includes(billing_cycle)) {
      return NextResponse.json({ error: "invalid billing_cycle" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      price_override: price_override === "" || price_override === undefined ? null : Number(price_override),
      discount_percent: discount_percent === "" || discount_percent === undefined ? null : Number(discount_percent),
    };
    if (billing_cycle) update.billing_cycle = billing_cycle;

    const { data, error } = await supabaseAdmin
      .from("clinics")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, clinic: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
