// src/app/api/lab/catalog/route.ts — كتالوج التحاليل
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // العامة (user_id null) + الخاصة بالمخبر
  const { data, error } = await supabaseAdmin
    .from("lab_tests_catalog").select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("category").order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { action, id, ...fields } = await req.json();

    if (action === "add") {
      const { data, error } = await supabaseAdmin
        .from("lab_tests_catalog")
        .insert({
          user_id: userId,
          name_ar: fields.name_ar,
          name_en: fields.name_en || null,
          category: fields.category || "general",
          unit: fields.unit || null,
          ref_low: fields.ref_low ?? null,
          ref_high: fields.ref_high ?? null,
          ref_text: fields.ref_text || null,
          price: fields.price ?? 0,
        })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, test: data });
    }

    if (action === "update") {
      const { data, error } = await supabaseAdmin
        .from("lab_tests_catalog")
        .update({
          name_ar: fields.name_ar, name_en: fields.name_en || null,
          category: fields.category || "general", unit: fields.unit || null,
          ref_low: fields.ref_low ?? null, ref_high: fields.ref_high ?? null,
          ref_text: fields.ref_text || null, price: fields.price ?? 0,
        })
        .eq("id", id).eq("user_id", userId)
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, test: data });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("lab_tests_catalog").delete().eq("id", id).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
