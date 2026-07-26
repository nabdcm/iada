// ============================================================
// /api/portal/vitals — المقاييس الحيوية التي يسجّلها المريض بنفسه
// كل العمليات مربوطة بجلسة المريض (هاتف + MRN) ولا تتجاوزها
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getPatientFromRequest } from "../../_patientAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** حدود فيزيولوجية معقولة — ترفض الإدخال الخاطئ قبل تخزينه */
const RANGES: Record<string, [number, number]> = {
  weight:      [1, 400],
  height:      [30, 250],
  bp_sys:      [50, 300],
  bp_dia:      [30, 200],
  pulse:       [25, 250],
  temperature: [30, 45],
  glucose:     [20, 800],
  spo2:        [50, 100],
};

function clean(body: Record<string, unknown>) {
  const out: Record<string, number | string | null> = {};
  for (const key of Object.keys(RANGES)) {
    const raw = body[key];
    if (raw === null || raw === undefined || raw === "") { out[key] = null; continue; }
    const n = Number(raw);
    if (!isFinite(n)) { out[key] = null; continue; }
    const [lo, hi] = RANGES[key];
    if (n < lo || n > hi) return { error: `القيمة المدخلة في «${key}» خارج المجال المعقول` };
    out[key] = n;
  }
  const gs = body.glucose_state;
  out.glucose_state = (gs === "fasting" || gs === "postprandial" || gs === "random") ? gs : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  out.notes = notes ? notes.slice(0, 500) : null;
  return { values: out };
}

export async function GET(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("patient_vitals")
    .select("*")
    .eq("mrn", session.mrn)
    .eq("phone", session.phone)
    .order("measured_at", { ascending: false })
    .range(0, 499);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ vitals: data ?? [] });
}

export async function POST(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = clean(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const values = parsed.values!;
    const hasAny = Object.keys(RANGES).some(k => values[k] !== null);
    if (!hasAny) return NextResponse.json({ error: "أدخل قياساً واحداً على الأقل" }, { status: 400 });

    // الضغط يُسجَّل كاملاً أو لا يُسجَّل — قراءة نصفية لا معنى لها سريرياً
    if ((values.bp_sys === null) !== (values.bp_dia === null)) {
      return NextResponse.json({ error: "أدخل رقمَي الضغط معاً (الانقباضي والانبساطي)" }, { status: 400 });
    }

    const measuredAt = typeof body.measured_at === "string" && body.measured_at
      ? new Date(body.measured_at).toISOString()
      : new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("patient_vitals")
      .insert({
        mrn: session.mrn, phone: session.phone,
        measured_at: measuredAt, source: "patient", ...values,
      })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, vital: data });
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = getPatientFromRequest(req);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("patient_vitals").delete()
    .eq("id", id).eq("mrn", session.mrn).eq("phone", session.phone);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
