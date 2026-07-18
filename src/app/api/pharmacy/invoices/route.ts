// src/app/api/pharmacy/invoices/route.ts
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
    const { action, user_id, id, items, ...fields } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    if (action === "add") {
      if (items !== undefined && !Array.isArray(items)) {
        return NextResponse.json({ error: "items يجب أن تكون مصفوفة" }, { status: 400 });
      }
      const invDate = fields.date || new Date().toISOString().slice(0, 10);
      const lockedUntil = await getLockedUntil(user_id);
      if (invDate <= lockedUntil) {
        return NextResponse.json({ error: `هذه الفترة مقفلة محاسبيًا حتى ${lockedUntil}` }, { status: 403 });
      }

      // 1. الرأس
      const { data: inv, error } = await supabaseAdmin
        .from("pharmacy_purchase_invoices")
        .insert({ user_id, ...fields })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // 2. البنود
      if (items?.length) {
        const { error: itemsError } = await supabaseAdmin.from("pharmacy_purchase_invoice_items").insert(
          items.map((it: { medicine_id: number; medicine_name: string; qty: number; unit_price: number }) => ({ invoice_id: inv.id, ...it }))
        );
        if (itemsError) {
          // تراجع عن الفاتورة الرئيسية لتفادي فاتورة بدون بنود
          await supabaseAdmin.from("pharmacy_purchase_invoices").delete().eq("id", inv.id);
          return NextResponse.json({ error: `فشل حفظ بنود الفاتورة: ${itemsError.message}` }, { status: 400 });
        }
        // 3. إنشاء دفعة لكل بند (صلاحية وتكلفة منفصلة) — يرفع المخزون + يعيد حساب WAC ذريًا
        for (const it of items as { medicine_id: number; qty: number; unit_price: number; expiry_date?: string | null; batch_no?: string | null }[]) {
          await supabaseAdmin.rpc("add_medicine_batch", {
            p_medicine_id: it.medicine_id, p_user_id: user_id, p_qty: it.qty,
            p_unit_cost: it.unit_price, p_expiry_date: it.expiry_date || null,
            p_batch_no: it.batch_no || null, p_invoice_id: inv.id,
          });
        }
        // 4. سجل الحركة
        await supabaseAdmin.from("pharmacy_stock_logs").insert(
          items.map((it: { medicine_id: number; medicine_name: string; qty: number }) => ({
            user_id, medicine_id: it.medicine_id, medicine_name: it.medicine_name, type: "purchase",
            qty: it.qty, date: fields.date || new Date().toISOString().slice(0, 10),
            user: fields.created_by || "", ref: `INV-${inv.id}`,
          }))
        );
      }
      return NextResponse.json({ success: true, invoice: { ...inv, items: items || [] } });
    }

    if (action === "update_payment") {
      const { error } = await supabaseAdmin
        .from("pharmacy_purchase_invoices")
        .update({ paid: fields.paid, status: fields.status })
        .eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { data: existing } = await supabaseAdmin.from("pharmacy_purchase_invoices").select("date").eq("id", id).eq("user_id", user_id).single();
      if (existing) {
        const lockedUntil = await getLockedUntil(user_id);
        if (existing.date <= lockedUntil) {
          return NextResponse.json({ error: `لا يمكن حذف فاتورة بفترة مقفلة (حتى ${lockedUntil})` }, { status: 403 });
        }
      }
      const { error } = await supabaseAdmin.from("pharmacy_purchase_invoices").delete().eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/invoices error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
