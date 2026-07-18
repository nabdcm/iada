// src/app/api/pharmacy/sales/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getLockedUntil } from "../period-lock/route";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { user_id, items, total, discount, payment_method, patient_name, prescription_id, cashier, date } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "items required" }, { status: 400 });

    const saleDate = date || new Date().toISOString().slice(0, 10);
    const lockedUntil = await getLockedUntil(user_id);
    if (saleDate <= lockedUntil) {
      return NextResponse.json({ error: `هذه الفترة مقفلة محاسبيًا حتى ${lockedUntil}، لا يمكن إضافة عمليات بيع بتاريخ سابق أو مساوٍ` }, { status: 403 });
    }

    // 0. التحقق من كفاية المخزون قبل أي إدخال
    for (const it of items) {
      const { data: med, error: medError } = await supabaseAdmin
        .from("pharmacy_medicines")
        .select("stock, name_ar")
        .eq("id", it.medicine_id)
        .eq("user_id", user_id)
        .single();
      if (medError || !med) {
        return NextResponse.json({ error: `الدواء غير موجود: ${it.medicine_name || it.medicine_id}` }, { status: 400 });
      }
      if (med.stock < it.qty) {
        return NextResponse.json({ error: `المخزون غير كافٍ لـ ${med.name_ar}: المتوفر ${med.stock} والمطلوب ${it.qty}` }, { status: 400 });
      }
    }

    // 1. إنشاء السجل الرئيسي
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("pharmacy_sales")
      .insert({ user_id, date: date || new Date().toISOString().slice(0, 10), total, discount: discount || 0, payment_method, patient_name: patient_name || null, prescription_id: prescription_id || null, cashier })
      .select()
      .single();
    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    // 2. إضافة البنود (unit_cost يُحدّث لاحقًا بالتكلفة الفعلية للدفعات المصروفة حسب FEFO)
    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from("pharmacy_sale_items")
      .insert(items.map((it: { medicine_id: number; medicine_name: string; qty: number; unit_price: number }) => ({
        sale_id: sale.id, medicine_id: it.medicine_id, medicine_name: it.medicine_name,
        qty: it.qty, unit_price: it.unit_price, unit_cost: 0,
      })))
      .select();
    if (itemsError || !insertedItems) {
      await supabaseAdmin.from("pharmacy_sales").delete().eq("id", sale.id);
      return NextResponse.json({ error: `فشل حفظ بنود البيع: ${itemsError?.message}` }, { status: 400 });
    }

    // 3. صرف كل بند حسب FEFO (الأقرب انتهاءً أولاً) عبر دالة ذرية، وتحديث التكلفة الفعلية للربح
    const stockErrors: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const si = insertedItems[i];
      const { data: fefo, error: rpcError } = await supabaseAdmin.rpc("dispense_fefo", {
        p_medicine_id: it.medicine_id, p_user_id: user_id, p_qty: it.qty, p_sale_item_id: si.id,
      });
      if (rpcError) {
        stockErrors.push(it.medicine_name || String(it.medicine_id));
      } else {
        const unitCost = fefo?.[0]?.avg_unit_cost ?? 0;
        await supabaseAdmin.from("pharmacy_sale_items").update({ unit_cost: unitCost }).eq("id", si.id);
      }
    }
    if (stockErrors.length > 0) {
      // تراجع عن عملية البيع لأن المخزون لم يعد كافيًا وقت التنفيذ الفعلي
      await supabaseAdmin.from("pharmacy_sale_items").delete().eq("sale_id", sale.id);
      await supabaseAdmin.from("pharmacy_sales").delete().eq("id", sale.id);
      return NextResponse.json({ error: `تعذر إتمام البيع، المخزون تغيّر لـ: ${stockErrors.join("، ")}` }, { status: 409 });
    }

    // 4. تسجيل حركة المخزون
    const logs = items.map((it: { medicine_id: number; medicine_name: string; qty: number }) => ({
      user_id, medicine_id: it.medicine_id, medicine_name: it.medicine_name, type: "sale",
      qty: it.qty, date: date || new Date().toISOString().slice(0, 10),
      user: cashier, ref: `SALE-${sale.id}`,
    }));
    await supabaseAdmin.from("pharmacy_stock_logs").insert(logs);

    return NextResponse.json({ success: true, sale: { ...sale, items } });
  } catch (err) {
    console.error("pharmacy/sales error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
