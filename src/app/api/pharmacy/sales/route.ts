// src/app/api/pharmacy/sales/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { user_id, items, total, discount, payment_method, patient_name, prescription_id, cashier, date } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    // 1. إنشاء السجل الرئيسي
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("pharmacy_sales")
      .insert({ user_id, date: date || new Date().toISOString().slice(0, 10), total, discount: discount || 0, payment_method, patient_name: patient_name || null, prescription_id: prescription_id || null, cashier })
      .select()
      .single();
    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    // 2. إضافة البنود
    const saleItems = items.map((it: { medicine_id: number; medicine_name: string; qty: number; unit_price: number }) => ({
      sale_id: sale.id, medicine_id: it.medicine_id, medicine_name: it.medicine_name, qty: it.qty, unit_price: it.unit_price,
    }));
    const { error: itemsError } = await supabaseAdmin.from("pharmacy_sale_items").insert(saleItems);
    if (itemsError) console.error("sale items error:", itemsError);

    // 3. تخفيض المخزون لكل دواء
    for (const it of items) {
      const { data: med } = await supabaseAdmin.from("pharmacy_medicines").select("stock").eq("id", it.medicine_id).single();
      if (med) {
        await supabaseAdmin.from("pharmacy_medicines").update({ stock: Math.max(0, med.stock - it.qty) }).eq("id", it.medicine_id);
      }
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
