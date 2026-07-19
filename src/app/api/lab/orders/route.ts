// src/app/api/lab/orders/route.ts — طلبات التحاليل
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// جلب/إنشاء MRN مركزي عبر الهاتف — نفس منطق العيادات
async function getOrCreateMRN(phone: string, name: string): Promise<string | null> {
  const cleanPhone = phone.trim();
  if (!cleanPhone) return null;
  const { data: existing } = await supabaseAdmin
    .from("master_patients").select("mrn").eq("phone", cleanPhone).maybeSingle();
  if (existing?.mrn) return existing.mrn;
  const { data: inserted } = await supabaseAdmin
    .from("master_patients").insert({ phone: cleanPhone, name: name.trim() })
    .select("mrn").single();
  if (inserted?.mrn) return inserted.mrn;
  const { data: retry } = await supabaseAdmin
    .from("master_patients").select("mrn").eq("phone", cleanPhone).maybeSingle();
  return retry?.mrn ?? null;
}

export async function GET(req: Request) {
  const userId = await getAuthUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("lab_orders").select("*").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const { action, id, ...fields } = body;

    if (action === "add") {
      const mrn = fields.patient_phone
        ? await getOrCreateMRN(fields.patient_phone, fields.patient_name ?? "")
        : null;
      const { data, error } = await supabaseAdmin
        .from("lab_orders")
        .insert({
          user_id: userId,
          mrn,
          patient_name: fields.patient_name,
          patient_phone: fields.patient_phone || null,
          patient_gender: fields.patient_gender || null,
          patient_age: fields.patient_age || null,
          referring_doctor: fields.referring_doctor || null,
          sample_date: fields.sample_date || new Date().toISOString().slice(0, 10),
          results: fields.results ?? [],
          price: fields.price ?? 0,
          paid: fields.paid ?? 0,
          notes: fields.notes || null,
          status: fields.status ?? "pending",
          result_date: fields.status === "completed" ? new Date().toISOString().slice(0, 10) : null,
        })
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, order: data });
    }

    if (action === "update") {
      const upd: Record<string, unknown> = {};
      for (const k of ["patient_name","patient_phone","patient_gender","patient_age","referring_doctor","sample_date","results","price","paid","notes","status"] as const) {
        if (k in fields) upd[k] = fields[k];
      }
      if (fields.status === "completed") upd.result_date = new Date().toISOString().slice(0, 10);
      if ("patient_phone" in fields && fields.patient_phone) {
        const mrn = await getOrCreateMRN(fields.patient_phone, fields.patient_name ?? "");
        if (mrn) upd.mrn = mrn;
      }
      const { data, error } = await supabaseAdmin
        .from("lab_orders").update(upd).eq("id", id).eq("user_id", userId)
        .select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, order: data });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("lab_orders").delete().eq("id", id).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
