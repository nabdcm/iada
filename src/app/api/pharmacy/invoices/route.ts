// src/app/api/pharmacy/invoices/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
      // 1. الرأس
      const { data: inv, error } = await supabaseAdmin
        .from("pharmacy_purchase_invoices")
        .insert({ user_id, ...fields })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // 2. البنود
      if (items?.length) {
        await supabaseAdmin.from("pharmacy_purchase_invoice_items").insert(
          items.map((it: { medicine_id: number; medicine_name: string; qty: number; unit_price: number }) => ({ invoice_id: inv.id, ...it }))
        );
        // 3. رفع المخزون
        for (const it of items) {
          const { data: med } = await supabaseAdmin.from("pharmacy_medicines").select("stock").eq("id", it.medicine_id).single();
          if (med) await supabaseAdmin.from("pharmacy_medicines").update({ stock: med.stock + it.qty }).eq("id", it.medicine_id);
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
