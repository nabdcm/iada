// ============================================================
// /api/admin-flags — قراءة/تعديل مفاتيح النظام (للأدمن فقط)
// حالياً: offline_enabled — تفعيل ميزة العمل دون اتصال للعيادات
// ============================================================
import { isAdminAuthorized } from "../_adminAuth";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_KEYS = ["offline_enabled"];

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin.from("app_flags").select("key, value").in("key", ALLOWED_KEYS);
  const flags: Record<string, string> = {};
  (data ?? []).forEach(r => { flags[r.key as string] = r.value as string; });
  return NextResponse.json({ flags });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { key, value } = (await req.json()) as { key?: string; value?: string };
    if (!key || !ALLOWED_KEYS.includes(key) || (value !== "0" && value !== "1")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("app_flags")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
