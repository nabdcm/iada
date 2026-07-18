// src/app/api/pharmacy/prescriptions/route.ts
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserId } from "../_pharmacyAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { action, user_id, id, items, ...fields } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const authUid_user_id = await getAuthUserId(req);
    if (!authUid_user_id || authUid_user_id !== user_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    if (action === "add") {
      if (items !== undefined && !Array.isArray(items)) {
        return NextResponse.json({ error: "items يجب أن تكون مصفوفة" }, { status: 400 });
      }
      const { rx_id, ...rest } = fields;
      // إدراج مقاوم للتصادم: إن كان الرقم المقترح مستخدماً (تزامن) نولّد رقماً فريداً
      let rx: Record<string, unknown> | null = null;
      let insErr: { message: string; code?: string } | null = null;
      for (const candidate of [rx_id || `RX-${Date.now()}`, `RX-${new Date().getFullYear()}-${Date.now()}`]) {
        const { data, error } = await supabaseAdmin
          .from("pharmacy_prescriptions")
          .insert({ user_id, id: candidate, ...rest })
          .select().single();
        if (!error) { rx = data; insErr = null; break; }
        insErr = error;
        if (error.code !== "23505") break; // ليس تصادم مفتاح — لا داعي لإعادة المحاولة
      }
      if (!rx) return NextResponse.json({ error: insErr?.message || "insert failed" }, { status: 400 });

      if (items?.length) {
        await supabaseAdmin.from("pharmacy_prescription_items").insert(
          items.map((it: Record<string, unknown>) => ({ prescription_id: rx.id, ...it }))
        );
      }
      return NextResponse.json({ success: true, prescription: { ...rx, items: items || [] } });
    }

    if (action === "dispense") {
      // صرف كامل: تحديث الحالة + الحقل القديم للتوافق
      // نجلب البنود أولاً (مع الكمية المصروفة سابقاً) لخصم المخزون الفعلي
      const { data: rxItems } = await supabaseAdmin
        .from("pharmacy_prescription_items")
        .select("id, qty, dispensed_qty, medicine_id, medicine_name")
        .eq("prescription_id", id);

      const { error } = await supabaseAdmin
        .from("pharmacy_prescriptions")
        .update({ dispensed: true, status: "dispensed", dispensed_at: new Date().toISOString().slice(0, 10), dispensed_by: fields.dispensed_by })
        .eq("id", id).eq("user_id", user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      const today = new Date().toISOString().slice(0, 10);
      const stockWarnings: string[] = [];
      for (const it of (rxItems || [])) {
        const delta = (it.qty || 1) - (it.dispensed_qty || 0);
        await supabaseAdmin.from("pharmacy_prescription_items").update({ dispensed_qty: it.qty }).eq("id", it.id);
        // خصم المخزون فعلياً (atomic) + تسجيل الحركة — للبنود المرتبطة بدواء
        if (it.medicine_id && delta > 0) {
          const { error: rpcError } = await supabaseAdmin.rpc("adjust_medicine_stock", {
            p_id: it.medicine_id, p_user_id: user_id, p_delta: -delta,
          });
          if (rpcError) { stockWarnings.push(it.medicine_name || String(it.medicine_id)); continue; }
          await supabaseAdmin.from("pharmacy_stock_logs").insert({
            user_id, medicine_id: it.medicine_id, medicine_name: it.medicine_name || "",
            type: "out", qty: delta, date: today, user: fields.dispensed_by || "", ref: id, notes: "صرف وصفة",
          });
        }
      }
      return NextResponse.json({ success: true, stock_warnings: stockWarnings });
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
      const today2 = new Date().toISOString().slice(0, 10);
      for (const p of partialItems) {
        // جلب الحالة السابقة لحساب فرق الخصم من المخزون
        const { data: prev } = await supabaseAdmin
          .from("pharmacy_prescription_items")
          .select("dispensed_qty, medicine_id, medicine_name")
          .eq("id", p.item_id).eq("prescription_id", id).maybeSingle();
        await supabaseAdmin.from("pharmacy_prescription_items").update({ dispensed_qty: p.dispensed_qty }).eq("id", p.item_id).eq("prescription_id", id);
        const delta = (p.dispensed_qty || 0) - (prev?.dispensed_qty || 0);
        if (prev?.medicine_id && delta !== 0) {
          const { error: rpcError } = await supabaseAdmin.rpc("adjust_medicine_stock", {
            p_id: prev.medicine_id, p_user_id: user_id, p_delta: -delta,
          });
          if (!rpcError) {
            await supabaseAdmin.from("pharmacy_stock_logs").insert({
              user_id, medicine_id: prev.medicine_id, medicine_name: prev.medicine_name || "",
              type: delta > 0 ? "out" : "in", qty: Math.abs(delta), date: today2,
              user: fields.dispensed_by || "", ref: id, notes: "صرف جزئي",
            });
          }
        }
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
