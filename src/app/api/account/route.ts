// ============================================================
// /api/account — تحديث الطبيب لمعلومات حسابه (الاسم، الهاتف)
// يتحقق من الجلسة، ويحدّث Auth metadata + جدول clinics. لا logout.
// GET: يعيد معلومات الحساب الحالية
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getUser(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data?.user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: clinic } = await supabaseAdmin
    .from("clinics")
    .select("name, owner, email, phone, plan, status, expiry, clinic_type, account_type")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    account: {
      email: user.email ?? clinic?.email ?? "",
      clinic_name: clinic?.name ?? "",
      owner: clinic?.owner ?? "",
      phone: clinic?.phone ?? "",
      plan: clinic?.plan ?? "",
      status: clinic?.status ?? "",
      expiry: clinic?.expiry ?? "",
      clinic_type: clinic?.clinic_type ?? "",
      account_type: clinic?.account_type ?? "clinic",
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { owner, phone, clinic_name, currency, settings } = (await req.json()) as {
      owner?: string; phone?: string; clinic_name?: string;
      currency?: string; settings?: Record<string, unknown>;
    };

    const clinicUpdate: Record<string, unknown> = {};
    if (owner !== undefined)       clinicUpdate.owner = String(owner).trim();
    if (phone !== undefined)       clinicUpdate.phone = String(phone).trim();
    if (clinic_name !== undefined) clinicUpdate.name = String(clinic_name).trim();
    if (currency !== undefined && currency) clinicUpdate.currency = String(currency).toUpperCase();
    if (settings !== undefined)    clinicUpdate.settings = settings;

    if (Object.keys(clinicUpdate).length === 0) {
      return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
    }

    const { error: cErr } = await supabaseAdmin
      .from("clinics").update(clinicUpdate).eq("user_id", user.id);
    if (cErr) return NextResponse.json({ error: "update_failed" }, { status: 500 });

    // مزامنة metadata (غير حرجة — نتجاهل خطأها)
    const meta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
    if (owner !== undefined)       meta.owner_name = String(owner).trim();
    if (phone !== undefined)       meta.phone = String(phone).trim();
    if (clinic_name !== undefined) meta.clinic_name = String(clinic_name).trim();
    await supabaseAdmin.auth.admin.updateUserById(user.id, { user_metadata: meta }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
