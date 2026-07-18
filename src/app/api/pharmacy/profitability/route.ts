// src/app/api/pharmacy/profitability/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserId } from "../_pharmacyAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type SaleItemRow = { medicine_id: number; medicine_name: string; qty: number; unit_price: number; unit_cost: number; returned_qty: number; sale_id: number };
type SaleRow = { id: number; date: string };

// تقرير ربحية دقيق مبني على متوسط التكلفة المرجّح (WAC) وقت كل عملية بيع
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const authUid_userId = await getAuthUserId(req);
    if (!authUid_userId || authUid_userId !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    let salesQuery = supabaseAdmin.from("pharmacy_sales").select("id, date").eq("user_id", userId);
    if (from) salesQuery = salesQuery.gte("date", from);
    if (to) salesQuery = salesQuery.lte("date", to);
    const { data: sales } = await salesQuery;
    const saleIds = (sales as SaleRow[] || []).map(s => s.id);
    if (saleIds.length === 0) {
      return NextResponse.json({ byMedicine: [], totals: { revenue: 0, cost: 0, profit: 0, margin: 0 } });
    }

    const { data: items } = await supabaseAdmin
      .from("pharmacy_sale_items")
      .select("medicine_id, medicine_name, qty, unit_price, unit_cost, returned_qty, sale_id")
      .in("sale_id", saleIds);

    const byMed: Record<number, { medicine_name: string; qty_sold: number; revenue: number; cost: number }> = {};
    for (const it of (items as SaleItemRow[] || [])) {
      const netQty = it.qty - (it.returned_qty || 0); // نطرح المرتجع من صافي الكمية المحتسبة بالربح
      if (netQty <= 0) continue;
      if (!byMed[it.medicine_id]) byMed[it.medicine_id] = { medicine_name: it.medicine_name, qty_sold: 0, revenue: 0, cost: 0 };
      byMed[it.medicine_id].qty_sold += netQty;
      byMed[it.medicine_id].revenue += netQty * it.unit_price;
      byMed[it.medicine_id].cost += netQty * it.unit_cost;
    }

    const byMedicine = Object.entries(byMed).map(([medicine_id, v]) => ({
      medicine_id: Number(medicine_id), ...v,
      profit: v.revenue - v.cost,
      margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);

    const totals = byMedicine.reduce((acc, m) => ({ revenue: acc.revenue + m.revenue, cost: acc.cost + m.cost, profit: acc.profit + m.profit }), { revenue: 0, cost: 0, profit: 0 });
    const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

    return NextResponse.json({ byMedicine, totals: { ...totals, margin } });
  } catch (err) {
    console.error("profitability GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
