// src/app/api/pharmacy/prescriptions/route.ts
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
      if (items !== undefined && !Array.isArray(items)) {
        return NextResponse.json({ error: "items يجب أن تكون مصفوفة" }, { status: 400 });
      }
      const { rx_id, ...rest } = fields;
      const { data: rx, error } = await supabaseAdmin
        .from("pharmacy_prescriptions")
        .insert({ user_id, id: rx_id || `RX-${Date.now()}`, ...rest })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      if (items?.length) {
        await supabaseAdmin.from("pharmacy_prescription_items").insert(
          items.map((it: Record<string, unknown>) => ({ prescription_id: rx.id, ...it }))
        );
      }
      return NextResponse.json({ success: true, prescription: { ...rx, items: items || [] } });
    }

    if (action === "dispense") {
      // صرف كامل: تحديث الحالة + الحقل القديم للتوافق
      const { error } = await supabaseAdmin
        .from("pharmacy_prescriptions")
        .update({ dispensed: true, status: "dispensed", dispensed_at: new Date().toISOString().slice(0, 10), dispensed_by: fields.dispensed_by })
        .eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      // علّم كل البنود كمصروفة بالكامل
      const { data: rxItems } = await supabaseAdmin.from("pharmacy_prescription_items").select("id, qty").eq("prescription_id", id);
      for (const it of (rxItems || [])) {
        await supabaseAdmin.from("pharmacy_prescription_items").update({ dispensed_qty: it.qty }).eq("id", it.id);
      }
      return NextResponse.json({ success: true });
    }

    // ميزة 15: تحديث حالة/أولوية الوصفة في قائمة الانتظار
    if (action === "update_status") {
      const upd: Record<string, unknown> = {};
      if (fields.status) upd.status = fields.status;
      if (fields.priority) upd.priority = fields.priority;
      if (fields.status === "dispensed") { upd.dispensed = true; upd.dispensed_at = new Date().toISOString().slice(0, 10); upd.dispensed_by = fields.dispensed_by || ""; }
      const { error } = await supabaseAdmin.from("pharmacy_prescriptions").update(upd).eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // ميزة 16: صرف جزئي — تحديث الكمية المصروفة لبنود محددة
    if (action === "dispense_partial") {
      const partialItems = items as { item_id: number; dispensed_qty: number }[];
      if (!Array.isArray(partialItems)) return NextResponse.json({ error: "items required" }, { status: 400 });
      for (const p of partialItems) {
        await supabaseAdmin.from("pharmacy_prescription_items").update({ dispensed_qty: p.dispensed_qty }).eq("id", p.item_id).eq("prescription_id", id);
      }
      // احسب هل اكتمل الصرف لكل البنود
      const { data: allItems } = await supabaseAdmin.from("pharmacy_prescription_items").select("qty, dispensed_qty").eq("prescription_id", id);
      const fullyDispensed = (allItems || []).every(it => (it.dispensed_qty || 0) >= it.qty);
      const anyDispensed = (allItems || []).some(it => (it.dispensed_qty || 0) > 0);
      const newStatus = fullyDispensed ? "dispensed" : anyDispensed ? "preparing" : "waiting";
      await supabaseAdmin.from("pharmacy_prescriptions").update({
        status: newStatus, dispensed: fullyDispensed,
        ...(fullyDispensed ? { dispensed_at: new Date().toISOString().slice(0, 10), dispensed_by: fields.dispensed_by || "" } : {}),
      }).eq("id", id).eq("user_id", user_id);
      return NextResponse.json({ success: true, status: newStatus, fully_dispensed: fullyDispensed });
    }

    // ميزة 12: إضافة تعارض دواء مخصص
    if (action === "add_interaction") {
      const { error } = await supabaseAdmin.from("pharmacy_drug_interactions").insert({
        user_id, drug_a: fields.drug_a, drug_b: fields.drug_b,
        severity: fields.severity || "moderate", description: fields.description || "",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // ميزة 12: حذف تعارض مخصص (المبذّرة العامة محمية)
    if (action === "delete_interaction") {
      const { error } = await supabaseAdmin.from("pharmacy_drug_interactions").delete().eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("pharmacy_prescriptions").delete().eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("pharmacy/prescriptions error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
