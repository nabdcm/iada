// src/app/api/pharmacy/suppliers/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { action, user_id, id, ...fields } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    if (action === "add") {
      const { data, error } = await supabaseAdmin.from("pharmacy_suppliers").insert({ user_id, ...fields }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, supplier: data });
    }

    if (action === "update") {
      const { error } = await supabaseAdmin.from("pharmacy_suppliers").update(fields).eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin.from("pharmacy_suppliers").delete().eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/suppliers error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
