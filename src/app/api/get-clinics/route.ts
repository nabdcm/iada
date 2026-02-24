// src/app/api/get-clinics/route.ts
// ─── API route لجلب العيادات بصلاحية service_role (يتجاوز RLS) ───

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// يجب تعريف SUPABASE_SERVICE_ROLE_KEY في .env.local
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("get-clinics error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("get-clinics exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
