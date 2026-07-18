// src/app/api/pharmacy/reorder/route.ts
// ميزات 9 (توقع النفاد) + 10 (أوامر الشراء المقترحة) + 11 (أفضل مورد سعرًا)
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserId } from "../_pharmacyAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const LEAD_TIME_DAYS = 7;   // مهلة التوريد الافتراضية
const COVER_DAYS = 60;      // الكمية المقترحة تغطي 60 يوم استهلاك

type SupplierPrice = { supplier_id: number; supplier_name: string; unit_price: number; last_date: string };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const window = Math.min(365, Math.max(7, Number(searchParams.get("window")) || 90)); // 30/60/90
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const authUid_userId = await getAuthUserId(req);
    if (!authUid_userId || authUid_userId !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - window);
    const since = sinceDate.toISOString().slice(0, 10);

    const [medsRes, logsRes, invItemsRes, invoicesRes, suppliersRes] = await Promise.all([
      supabaseAdmin.from("pharmacy_medicines").select("id, name_ar, name_en, stock, min_stock, unit, avg_cost").eq("user_id", userId),
      supabaseAdmin.from("pharmacy_stock_logs").select("medicine_id, qty, type, date").eq("user_id", userId).eq("type", "sale").gte("date", since),
      supabaseAdmin.from("pharmacy_purchase_invoice_items").select("medicine_id, unit_price, invoice_id, pharmacy_purchase_invoices!inner(user_id, supplier_id, supplier_name, date)").eq("pharmacy_purchase_invoices.user_id", userId),
      supabaseAdmin.from("pharmacy_purchase_invoices").select("id, supplier_id, supplier_name, date").eq("user_id", userId),
      supabaseAdmin.from("pharmacy_suppliers").select("id, name").eq("user_id", userId),
    ]);

    const meds = medsRes.data || [];
    const logs = logsRes.data || [];
    const invItems = (invItemsRes.data || []) as unknown as {
      medicine_id: number; unit_price: number; invoice_id: number;
      pharmacy_purchase_invoices: { supplier_id: number; supplier_name: string; date: string } | null;
    }[];

    // 1) معدل الاستهلاك اليومي لكل دواء (إجمالي المصروف ÷ عدد أيام النافذة)
    const soldByMed: Record<number, number> = {};
    for (const l of logs) soldByMed[l.medicine_id] = (soldByMed[l.medicine_id] || 0) + Math.abs(l.qty || 0);

    // 2) أسعار الموردين لكل دواء (من فواتير الشراء الفعلية) — أحدث سعر لكل مورد
    const pricesByMed: Record<number, Record<number, SupplierPrice>> = {};
    for (const it of invItems) {
      const inv = it.pharmacy_purchase_invoices;
      if (!inv || !inv.supplier_id) continue;
      const medMap = (pricesByMed[it.medicine_id] ||= {});
      const prev = medMap[inv.supplier_id];
      // احتفظ بأحدث سعر لكل مورد
      if (!prev || (inv.date > prev.last_date)) {
        medMap[inv.supplier_id] = {
          supplier_id: inv.supplier_id, supplier_name: inv.supplier_name || "",
          unit_price: Number(it.unit_price) || 0, last_date: inv.date,
        };
      }
    }

    // 3) بناء تحليل لكل دواء
    const analysis = meds.map(m => {
      const totalSold = soldByMed[m.id] || 0;
      const dailyRate = totalSold / window;                         // متوسط الاستهلاك اليومي
      const daysLeft = dailyRate > 0 ? Math.floor(m.stock / dailyRate) : null; // أيام حتى النفاد
      // نقطة إعادة الطلب = استهلاك مهلة التوريد + مخزون أمان (نصف مهلة التوريد) أو min_stock (أيهما أكبر)
      const safetyStock = Math.ceil(dailyRate * (LEAD_TIME_DAYS / 2));
      const reorderPoint = Math.max(m.min_stock || 0, Math.ceil(dailyRate * LEAD_TIME_DAYS) + safetyStock);
      const needsReorder = m.stock <= reorderPoint;
      // الكمية المقترحة: تغطية COVER_DAYS ناقص المتوفر، وبحد أدنى يرفع المخزون فوق نقطة الطلب
      let suggestedQty = 0;
      if (needsReorder) {
        const target = dailyRate > 0 ? Math.ceil(dailyRate * COVER_DAYS) : Math.max((m.min_stock || 0) * 2, 10);
        suggestedQty = Math.max(target - m.stock, reorderPoint - m.stock, 1);
      }

      const supplierPrices = Object.values(pricesByMed[m.id] || {}).sort((a, b) => a.unit_price - b.unit_price);
      const bestSupplier = supplierPrices[0] || null;

      return {
        medicine_id: m.id, name_ar: m.name_ar, name_en: m.name_en, unit: m.unit,
        stock: m.stock, min_stock: m.min_stock, avg_cost: Number(m.avg_cost) || 0,
        daily_rate: Number(dailyRate.toFixed(2)),
        days_left: daysLeft,
        reorder_point: reorderPoint,
        needs_reorder: needsReorder,
        suggested_qty: suggestedQty,
        best_supplier: bestSupplier,
        supplier_prices: supplierPrices,
        est_cost: bestSupplier ? Number((bestSupplier.unit_price * suggestedQty).toFixed(2)) : null,
      };
    });

    // ترتيب: الأكثر إلحاحًا أولاً (أقل أيام متبقية، ثم يحتاج إعادة طلب)
    analysis.sort((a, b) => {
      if (a.needs_reorder !== b.needs_reorder) return a.needs_reorder ? -1 : 1;
      const ad = a.days_left ?? 99999, bd = b.days_left ?? 99999;
      return ad - bd;
    });

    return NextResponse.json({
      window,
      lead_time_days: LEAD_TIME_DAYS,
      cover_days: COVER_DAYS,
      analysis,
      reorder_count: analysis.filter(a => a.needs_reorder).length,
    });
  } catch (err) {
    console.error("pharmacy/reorder error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
