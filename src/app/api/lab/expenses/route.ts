// src/app/api/lab/expenses/route.ts — مصاريف المخبر
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
  const { data, error } = await supabaseAdmin
    .from("lab_expenses").select("*").eq("user_id", userId)
    .order("expense_date", { ascending: false }).limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { action, id, ...f } = await req.json();

    if (action === "add") {
      const { data, error } = await supabaseAdmin
        .from("lab_expenses")
        .insert({
          user_id: userId, title: f.title, amount: Number(f.amount) || 0,
          category: f.category || "general",
          expense_date: f.expense_date || new Date().toISOString().slice(0, 10),
          notes: f.notes || null,
        })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, expense: data });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("lab_expenses").delete().eq("id", id).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
