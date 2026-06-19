// src/app/api/admin-messages/route.ts
// ─── API route لإرسال/جلب رسائل الأدمن بصلاحية service_role ───
// الأدمن لا يملك حساب Supabase Auth حقيقي (يدخل عبر كوكي httpOnly منفصل)
// لذا from_id/to_id = "admin" (نص ثابت) ويتم تجاوز RLS عبر service_role

import { isAdminAuthorized } from "../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_ID = "admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET: جلب تاريخ المحادثة مع عيادة معيّنة ───────────────────
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicUserId = req.nextUrl.searchParams.get("clinicUserId");
  if (!clinicUserId) {
    return NextResponse.json({ error: "clinicUserId required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("clinic_messages")
      .select("*")
      .or(`and(from_id.eq.${ADMIN_ID},to_id.eq.${clinicUserId}),and(from_id.eq.${clinicUserId},to_id.eq.${ADMIN_ID})`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("admin-messages GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // تعليم رسائل الطبيب كمقروءة
    await supabaseAdmin
      .from("clinic_messages")
      .update({ is_read: true })
      .eq("from_id", clinicUserId)
      .eq("to_id", ADMIN_ID)
      .eq("is_read", false);

    return NextResponse.json(data || [], { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("admin-messages GET exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST: إرسال رسالة من الأدمن لعيادة ────────────────────────
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clinicUserId, body } = await req.json() as { clinicUserId?: string; body?: string };
    if (!clinicUserId || !body?.trim()) {
      return NextResponse.json({ error: "clinicUserId and body required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("clinic_messages")
      .insert({
        from_id:   ADMIN_ID,
        to_id:     clinicUserId,
        from_role: "admin",
        body:      body.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("admin-messages POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("admin-messages POST exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── GET unread counts (لعرض النقاط الحمراء على كل بطاقة عيادة) ─
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("clinic_messages")
      .select("from_id")
      .eq("to_id", ADMIN_ID)
      .eq("is_read", false);

    if (error) {
      console.error("admin-messages PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.from_id] = (counts[row.from_id] ?? 0) + 1;
    }
    return NextResponse.json(counts, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("admin-messages PATCH exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
