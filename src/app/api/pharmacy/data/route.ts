// src/app/api/pharmacy/data/route.ts
// جلب كل بيانات الصيدلية دفعة واحدة
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  try {
    const [medicines, sales, saleItems, suppliers, invoices, invoiceItems, prescriptions, rxItems, stockLogs, returns] =
      await Promise.all([
        supabaseAdmin.from("pharmacy_medicines").select("*").eq("user_id", userId).order("name_ar"),
        supabaseAdmin.from("pharmacy_sales").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("pharmacy_sale_items").select("*, pharmacy_sales!inner(user_id)").eq("pharmacy_sales.user_id", userId),
        supabaseAdmin.from("pharmacy_suppliers").select("*").eq("user_id", userId).order("name"),
        supabaseAdmin.from("pharmacy_purchase_invoices").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("pharmacy_purchase_invoice_items").select("*, pharmacy_purchase_invoices!inner(user_id)").eq("pharmacy_purchase_invoices.user_id", userId),
        supabaseAdmin.from("pharmacy_prescriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("pharmacy_prescription_items").select("*, pharmacy_prescriptions!inner(user_id)").eq("pharmacy_prescriptions.user_id", userId),
        supabaseAdmin.from("pharmacy_stock_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
        supabaseAdmin.from("pharmacy_returns").select("*, pharmacy_return_items(*)").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);

    // دمج الـ items مع الـ parents
    const salesData = (sales.data || []).map(s => ({
      ...s,
      items: (saleItems.data || []).filter(i => i.sale_id === s.id),
      returns: (returns.data || []).filter(r => r.sale_id === s.id),
    }));

    const invoicesData = (invoices.data || []).map(inv => ({
      ...inv,
      items: (invoiceItems.data || []).filter(i => i.invoice_id === inv.id),
    }));

    const prescriptionsData = (prescriptions.data || []).map(rx => ({
      ...rx,
      items: (rxItems.data || []).filter(i => i.prescription_id === rx.id),
    }));

    return NextResponse.json({
      medicines:     medicines.data     || [],
      sales:         salesData,
      suppliers:     suppliers.data     || [],
      invoices:      invoicesData,
      prescriptions: prescriptionsData,
      stockLogs:     stockLogs.data     || [],
    });
  } catch (err) {
    console.error("pharmacy/data error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
