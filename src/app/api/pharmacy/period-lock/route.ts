// src/app/api/pharmacy/period-lock/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// يُستخدم من باقي الراوتات (sales, invoices, returns) للتحقق أن تاريخ العملية بعد آخر إقفال فترة
export async function getLockedUntil(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from("pharmacy_period_locks").select("locked_until").eq("user_id", userId).maybeSingle();
  return data?.locked_until || "1900-01-01";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  try {
    const { data } = await supabaseAdmin.from("pharmacy_period_locks").select("*").eq("user_id", userId).maybeSingle();
    return NextResponse.json({ lock: data || { locked_until: "1900-01-01" } });
  } catch (err) {
    console.error("period-lock GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user_id, locked_until, closed_by } = await req.json();
    if (!user_id || !locked_until) return NextResponse.json({ error: "user_id and locked_until required" }, { status: 400 });

    const current = await getLockedUntil(user_id);
    if (locked_until <= current) {
      return NextResponse.json({ error: "تاريخ الإقفال يجب أن يكون بعد آخر إقفال سابق" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (locked_until > today) {
      return NextResponse.json({ error: "لا يمكن إقفال فترة مستقبلية" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("pharmacy_period_locks").upsert({
      user_id, locked_until, closed_by: closed_by || "", closed_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, locked_until });
  } catch (err) {
    console.error("period-lock POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
