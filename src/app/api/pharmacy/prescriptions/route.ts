// src/app/api/pharmacy/prescriptions/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { action, user_id, id, items, ...fields } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    if (action === "add") {
      const { rx_id, ...rest } = fields;
      const { data: rx, error } = await supabaseAdmin
        .from("pharmacy_prescriptions")
        .insert({ user_id, id: rx_id || `RX-${Date.now()}`, ...rest })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (items?.length) {
        await supabaseAdmin.from("pharmacy_prescription_items").insert(
          items.map((it: Record<string, unknown>) => ({ prescription_id: rx.id, ...it }))
        );
      }
      return NextResponse.json({ success: true, prescription: { ...rx, items: items || [] } });
    }

    if (action === "dispense") {
      const { error } = await supabaseAdmin
        .from("pharmacy_prescriptions")
        .update({ dispensed: true, dispensed_at: new Date().toISOString().slice(0, 10), dispensed_by: fields.dispensed_by })
        .eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("pharmacy_prescriptions").delete().eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/prescriptions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
