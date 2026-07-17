// src/app/api/display-data/route.ts
// ─── API عام لشاشة قاعة الانتظار — يتجاوز RLS بـ service_role ───

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get("clinicId");
  const date     = searchParams.get("date"); // YYYY-MM-DD

  if (!clinicId || !date) {
    return NextResponse.json({ error: "missing params" }, { status: 400, headers: NO_STORE });
  }

  // ── 1. جلب معلومات العيادة ─────────────────────────────────
  const { data: clinic, error: clinicErr } = await supabaseAdmin
    .from("clinics")
    .select("name, owner, plan")
    .eq("user_id", clinicId)
    .maybeSingle();

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: "clinic not found" }, { status: 404, headers: NO_STORE });
  }

  // ── 2. جلب مواعيد اليوم ───────────────────────────────────
  const { data: appointments, error: apptErr } = await supabaseAdmin
    .from("appointments")
    .select("id, patient_id, date, time, duration, status, queue_status, doctor_id")
    .eq("user_id", clinicId)
    .eq("date", date)
    .neq("status", "cancelled")
    .neq("status", "no-show")
    .neq("status", "pending_approval")
    .order("time", { ascending: true });

  if (apptErr) {
    return NextResponse.json({ error: "appointments fetch failed" }, { status: 500, headers: NO_STORE });
  }

  const appts = appointments ?? [];

  // ── 3. جلب أسماء المرضى ───────────────────────────────────
  let patientMap: Record<number, string> = {};
  if (appts.length > 0) {
    const patientIds = [...new Set(appts.map((a) => a.patient_id))];
    const { data: patients } = await supabaseAdmin
      .from("patients")
      .select("id, name")
      .in("id", patientIds);

    (patients ?? []).forEach((p: { id: number; name: string }) => {
      patientMap[p.id] = p.name;
    });
  }

  // ── 4. جلب الأطباء (للعيادات المشتركة) ─────────────────────
  const { data: doctors } = await supabaseAdmin
    .from("doctors")
    .select("id, name, color")
    .eq("user_id", clinicId);

  return NextResponse.json({
    clinic,
    doctors: doctors ?? [],
    appointments: appts.map((a) => ({
      ...a,
      patientName: patientMap[a.patient_id] ?? "مريض",
    })),
  }, { headers: NO_STORE });
}
