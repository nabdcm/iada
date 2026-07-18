// src/app/api/pharmacy/returns/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getLockedUntil } from "../period-lock/route";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ReturnItemInput = { sale_item_id: number; medicine_id: number; medicine_name: string; qty: number; unit_price: number };

export async function POST(req: Request) {
  try {
    const { action, user_id, sale_id, items, reason, created_by } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    if (action === "add") {
      if (!sale_id) return NextResponse.json({ error: "sale_id required" }, { status: 400 });
      if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "items required" }, { status: 400 });

      // 1. التحقق أن البيعة تخص هذا المستخدم
      const { data: sale, error: saleError } = await supabaseAdmin
        .from("pharmacy_sales").select("id, date").eq("id", sale_id).eq("user_id", user_id).single();
      if (saleError || !sale) return NextResponse.json({ error: "البيعة غير موجودة" }, { status: 404 });

      const lockedUntil = await getLockedUntil(user_id);
      if (sale.date <= lockedUntil) {
        return NextResponse.json({ error: `لا يمكن إرجاع بيعة من فترة مقفلة محاسبيًا (حتى ${lockedUntil})` }, { status: 403 });
      }

      // 2. التحقق من كل بند: الكمية المرتجعة لا تتجاوز (المباع - المرتجع سابقًا)
      for (const it of items as ReturnItemInput[]) {
        const { data: si, error: siError } = await supabaseAdmin
          .from("pharmacy_sale_items").select("qty, returned_qty, medicine_name")
          .eq("id", it.sale_item_id).eq("sale_id", sale_id).single();
        if (siError || !si) return NextResponse.json({ error: `بند البيع غير موجود: ${it.medicine_name}` }, { status: 400 });
        const remaining = si.qty - (si.returned_qty || 0);
        if (it.qty <= 0 || it.qty > remaining) {
          return NextResponse.json({ error: `الكمية المطلوب إرجاعها لـ ${si.medicine_name} تتجاوز المتاح للإرجاع (${remaining})` }, { status: 400 });
        }
      }

      // 3. إنشاء رأس المرتجع
      const totalRefund = (items as ReturnItemInput[]).reduce((s, it) => s + it.qty * it.unit_price, 0);
      const { data: ret, error: retError } = await supabaseAdmin
        .from("pharmacy_returns")
        .insert({ user_id, sale_id, reason: reason || null, total_refund: totalRefund, created_by: created_by || "" })
        .select().single();
      if (retError) return NextResponse.json({ error: retError.message }, { status: 400 });

      // 4. بنود المرتجع
      const { error: itemsError } = await supabaseAdmin.from("pharmacy_return_items").insert(
        (items as ReturnItemInput[]).map(it => ({
          return_id: ret.id, sale_item_id: it.sale_item_id, medicine_id: it.medicine_id,
          medicine_name: it.medicine_name, qty: it.qty, unit_price: it.unit_price,
        }))
      );
      if (itemsError) {
        await supabaseAdmin.from("pharmacy_returns").delete().eq("id", ret.id);
        return NextResponse.json({ error: `فشل حفظ بنود المرتجع: ${itemsError.message}` }, { status: 400 });
      }

      // 5. تحديث الكمية المرتجعة على بنود البيع الأصلية + إرجاع الكمية إلى نفس الدفعات المصروفة (عكس FEFO) + سجل حركة
      for (const it of items as ReturnItemInput[]) {
        const { data: si } = await supabaseAdmin.from("pharmacy_sale_items").select("returned_qty").eq("id", it.sale_item_id).single();
        await supabaseAdmin.from("pharmacy_sale_items").update({ returned_qty: (si?.returned_qty || 0) + it.qty }).eq("id", it.sale_item_id);

        // اجلب الدفعات التي صُرف منها هذا البند لإعادة الكمية إليها بالترتيب
        const { data: dispensedBatches } = await supabaseAdmin
          .from("pharmacy_sale_item_batches")
          .select("batch_id, qty, unit_cost")
          .eq("sale_item_id", it.sale_item_id)
          .order("id", { ascending: true });

        let remaining = it.qty;
        for (const b of (dispensedBatches || [])) {
          if (remaining <= 0) break;
          const restoreQty = Math.min(b.qty, remaining);
          await supabaseAdmin.rpc("return_to_batch", {
            p_medicine_id: it.medicine_id, p_user_id: user_id,
            p_batch_id: b.batch_id, p_qty: restoreQty, p_unit_cost: b.unit_cost,
          });
          remaining -= restoreQty;
        }
        // احتياط: لو لم توجد بيانات دفعات مصروفة، أعد لدفعة إرجاع جديدة
        if (remaining > 0) {
          await supabaseAdmin.rpc("return_to_batch", {
            p_medicine_id: it.medicine_id, p_user_id: user_id,
            p_batch_id: null, p_qty: remaining, p_unit_cost: it.unit_price,
          });
        }
      }
      await supabaseAdmin.from("pharmacy_stock_logs").insert(
        (items as ReturnItemInput[]).map(it => ({
          user_id, medicine_id: it.medicine_id, medicine_name: it.medicine_name, type: "return",
          qty: it.qty, date: new Date().toISOString().slice(0, 10), user: created_by || "", ref: `RET-${ret.id}`,
        }))
      );

      return NextResponse.json({ success: true, return: { ...ret, items } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/returns error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  const saleId = searchParams.get("sale_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
  try {
    let query = supabaseAdmin.from("pharmacy_returns").select("*, pharmacy_return_items(*)").eq("user_id", userId).order("created_at", { ascending: false });
    if (saleId) query = query.eq("sale_id", saleId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ returns: data || [] });
  } catch (err) {
    console.error("pharmacy/returns GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
