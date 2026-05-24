// src/app/api/doctors/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET: جلب أطباء عيادة معينة ──────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("doctors")
      .select("*")
      .eq("user_id", userId)
      .order("id");

    if (error) {
      console.error("❌ doctors GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST: إضافة / تعديل / حذف / تبديل حالة طبيب ────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, user_id, id, name, specialty, phone, email, color, is_active } = body;

    // ── إضافة طبيب جديد ──────────────────────────────────
    if (action === "add") {
      if (!user_id || !name?.trim()) {
        return NextResponse.json({ error: "user_id and name required" }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from("doctors")
        .insert({ user_id, name, specialty: specialty ?? "", phone: phone ?? "", email: email ?? "", color: color ?? "#0863ba", is_active: is_active ?? true })
        .select()
        .single();

      if (error) {
        console.error("❌ doctors INSERT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, doctor: data });
    }

    // ── تعديل طبيب ───────────────────────────────────────
    if (action === "update") {
      if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("doctors")
        .update({ name, specialty, phone, email, color, is_active })
        .eq("id", id);

      if (error) {
        console.error("❌ doctors UPDATE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ── تبديل حالة نشط / موقوف ───────────────────────────
    if (action === "toggle") {
      if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      // نجلب الحالة الحالية أولاً
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from("doctors")
        .select("is_active")
        .eq("id", id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
      }

      const { error } = await supabaseAdmin
        .from("doctors")
        .update({ is_active: !existing.is_active })
        .eq("id", id);

      if (error) {
        console.error("❌ doctors TOGGLE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, is_active: !existing.is_active });
    }

    // ── حذف طبيب ─────────────────────────────────────────
    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("doctors")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("❌ doctors DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
