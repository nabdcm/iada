// ============================================================
// /api/agent-portal — بوابة الوكيل (قراءة فقط عبر كود الإحالة)
// لا تسجيل دخول ولا صلاحيات تعديل — عرض إحصائيات الوكيل وعياداته
// ============================================================
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PLAN_PRICES: Record<string, number> = {
  basic: 5.99, pro: 7.99, enterprise: 14.99,
  shared_basic: 7.99, shared_pro: 13.99, shared_enterprise: 21.99,
  pharmacy: 39, lab: 39,
};

export async function POST(req: NextRequest) {
  try {
    const { code } = (await req.json()) as { code?: string };
    const clean = (code ?? "").trim().toUpperCase();
    if (clean.length < 6) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

    const { data: agent } = await supabaseAdmin
      .from("agents")
      .select("id, name, code, commission_pct, active")
      .eq("code", clean)
      .maybeSingle();

    if (!agent || !agent.active) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: clinics } = await supabaseAdmin
      .from("clinics")
      .select("name, owner, plan, status, created_at")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false });

    const list = (clinics ?? []).map(c => ({
      name: c.name as string,
      owner: (c.owner as string) ?? "",
      plan: c.plan as string,
      status: c.status as string,
      created_at: c.created_at as string,
    }));

    const activeCount = list.filter(c => c.status === "active").length;
    // عمولة لمرة واحدة عن كل عيادة: القيمة السنوية للخطة (شهري × 12) × نسبة الوكيل
    const estOneTime = list
      .reduce((sum, c) => sum + (PLAN_PRICES[c.plan] ?? 0) * 12, 0) * (Number(agent.commission_pct) / 100);

    return NextResponse.json({
      ok: true,
      agent: { name: agent.name, code: agent.code, commission_pct: agent.commission_pct },
      stats: { total: list.length, active: activeCount, est_total: Number(estOneTime.toFixed(2)) },
      clinics: list,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
