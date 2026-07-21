// ============================================================
// /api/refer-search — البحث عن طبيب/عيادة بالاسم لأغراض التحويل
// يتطلب جلسة صحيحة، ويعيد حقولاً محدودة فقط (اسم، اختصاص)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (!userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { q } = (await req.json()) as { q?: string };
    const query = (q ?? "").trim();
    if (query.length < 2) return NextResponse.json({ results: [] });

    const { data } = await supabaseAdmin
      .from("clinics")
      .select("user_id, name, owner, clinic_type, status, account_type")
      .or(`name.ilike.%${query}%,owner.ilike.%${query}%`)
      .limit(10);

    const results = (data ?? [])
      .filter(c =>
        c.user_id !== userData.user!.id &&
        c.status === "active" &&
        (c.account_type ?? "clinic") === "clinic"
      )
      .slice(0, 8)
      .map(c => ({
        user_id: c.user_id as string,
        clinic_name: (c.name as string) ?? "",
        doctor_name: (c.owner as string) ?? "",
        clinic_type: (c.clinic_type as string) ?? "general",
      }));

    return NextResponse.json({ results });
  } catch (e) {
    console.error("refer-search:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
