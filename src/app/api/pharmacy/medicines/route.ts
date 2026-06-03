// src/app/api/pharmacy/medicines/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, user_id, id, ...fields } = body;

    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    if (action === "add") {
      const { data, error } = await supabaseAdmin
        .from("pharmacy_medicines")
        .insert({ user_id, ...fields })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, medicine: data });
    }

    if (action === "update") {
      const { error } = await supabaseAdmin
        .from("pharmacy_medicines")
        .update(fields)
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("pharmacy_medicines")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "adjust_stock") {
      // تعديل المخزون (إضافة أو خصم)
      const { data: med } = await supabaseAdmin
        .from("pharmacy_medicines")
        .select("stock")
        .eq("id", id)
        .single();
      if (!med) return NextResponse.json({ error: "Medicine not found" }, { status: 404 });

      const newStock = Math.max(0, (med.stock || 0) + (fields.delta || 0));
      const { error } = await supabaseAdmin
        .from("pharmacy_medicines")
        .update({ stock: newStock })
        .eq("id", id)
        .eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, newStock });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/medicines error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
