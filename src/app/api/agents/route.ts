// ============================================================
// /api/agents — إدارة الوكلاء (للأدمن فقط عبر service_role)
// GET: قائمة الوكلاء + إحصائيات عياداتهم
// POST: { action: "create" | "update" | "delete" | "assign", ... }
// ============================================================
import { isAdminAuthorized } from "../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function genCode(name: string): string {
  const base = name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 4).toUpperCase() || "NABD";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${rand}`;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: agents }, { data: clinics }] = await Promise.all([
    supabaseAdmin.from("agents").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("clinics")
      .select("id, name, owner, plan, status, agent_id, account_type")
      .order("name", { ascending: true }),
  ]);

  return NextResponse.json({ agents: agents ?? [], clinics: clinics ?? [] });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action as string;

    if (action === "create") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
      const { data, error } = await supabaseAdmin.from("agents").insert({
        name,
        phone: String(body.phone ?? "").trim() || null,
        commission_pct: Number(body.commission_pct ?? 10) || 10,
        notes: String(body.notes ?? "").trim() || null,
        code: genCode(name),
        active: true,
      }).select().single();
      if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });
      return NextResponse.json({ ok: true, agent: data });
    }

    if (action === "update") {
      const id = Number(body.id);
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined)           patch.name = String(body.name).trim();
      if (body.phone !== undefined)          patch.phone = String(body.phone).trim() || null;
      if (body.commission_pct !== undefined) patch.commission_pct = Number(body.commission_pct) || 0;
      if (body.notes !== undefined)          patch.notes = String(body.notes).trim() || null;
      if (body.active !== undefined)         patch.active = !!body.active;
      const { error } = await supabaseAdmin.from("agents").update(patch).eq("id", id);
      if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const id = Number(body.id);
      if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
      // agent_id في العيادات يصبح NULL تلقائياً (on delete set null)
      const { error } = await supabaseAdmin.from("agents").delete().eq("id", id);
      if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "assign") {
      const clinicId = Number(body.clinic_id);
      const agentId = body.agent_id === null ? null : Number(body.agent_id);
      if (!clinicId) return NextResponse.json({ error: "missing_clinic" }, { status: 400 });
      const { error } = await supabaseAdmin.from("clinics")
        .update({ agent_id: agentId }).eq("id", clinicId);
      if (error) return NextResponse.json({ error: "assign_failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "bad_action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
