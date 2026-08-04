// src/app/api/patient-ledger/route.ts
// نظام رصيد تراكمي منفصل تماماً عن جدول payments — لا يلمس منطقه أو تقاريره
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET: جلب سجل الرصيد + المجموع لمريض معين ──────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const patientId = searchParams.get("patient_id");

    if (!userId || !patientId) {
      return NextResponse.json({ error: "user_id and patient_id required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("patient_ledger")
      .select("*")
      .eq("user_id", userId)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ patient-ledger GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries = data ?? [];
    const balance = entries.reduce(
      (s, e) => s + (e.entry_type === "debit" ? Number(e.amount) : -Number(e.amount)),
      0
    );

    return NextResponse.json({ entries, balance });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ── POST: إضافة قيد (مستحق جديد أو دفعة جزئية/كاملة) ──────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, patient_id, entry_type, amount, note, payment_id } = body;

    if (!user_id || !patient_id || !entry_type || !amount) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    if (!["debit", "credit"].includes(entry_type)) {
      return NextResponse.json({ error: "invalid entry_type" }, { status: 400 });
    }
    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("patient_ledger")
      .insert({
        user_id,
        patient_id,
        entry_type,
        amount,
        note: note ?? null,
        payment_id: payment_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ patient-ledger POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
