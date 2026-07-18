// src/app/api/pharmacy/supplier-payments/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// كشف حساب مورد: كل الفواتير + كل الدفعات + الرصيد المتبقي
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const supplierId = searchParams.get("supplier_id");
  if (!userId || !supplierId) return NextResponse.json({ error: "user_id and supplier_id required" }, { status: 400 });
  try {
    const [invoices, payments] = await Promise.all([
      supabaseAdmin.from("pharmacy_purchase_invoices").select("*").eq("user_id", userId).eq("supplier_id", supplierId).order("date"),
      supabaseAdmin.from("pharmacy_supplier_payments").select("*").eq("user_id", userId).eq("supplier_id", supplierId).order("date"),
    ]);
    const totalInvoiced = (invoices.data || []).reduce((s, i) => s + i.total, 0);
    const totalPaid = (payments.data || []).reduce((s, p) => s + p.amount, 0);
    return NextResponse.json({
      invoices: invoices.data || [], payments: payments.data || [],
      totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid,
    });
  } catch (err) {
    console.error("supplier-payments GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user_id, supplier_id, invoice_id, amount, method, notes, created_by } = await req.json();
    if (!user_id || !supplier_id) return NextResponse.json({ error: "user_id and supplier_id required" }, { status: 400 });
    if (typeof amount !== "number" || amount <= 0) return NextResponse.json({ error: "amount must be positive" }, { status: 400 });

    const { data: payment, error } = await supabaseAdmin
      .from("pharmacy_supplier_payments")
      .insert({ user_id, supplier_id, invoice_id: invoice_id || null, amount, method: method || "cash", notes: notes || null, created_by: created_by || "" })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // تحديث حالة الفاتورة المرتبطة (لو حُدّدت)
    if (invoice_id) {
      const { data: inv } = await supabaseAdmin.from("pharmacy_purchase_invoices").select("total, paid").eq("id", invoice_id).eq("user_id", user_id).single();
      if (inv) {
        const newPaid = (inv.paid || 0) + amount;
        const status = newPaid >= inv.total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        await supabaseAdmin.from("pharmacy_purchase_invoices").update({ paid: newPaid, status }).eq("id", invoice_id).eq("user_id", user_id);
      }
    }

    return NextResponse.json({ success: true, payment });
  } catch (err) {
    console.error("supplier-payments POST error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
