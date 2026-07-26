// ============================================================
// /api/patient-login — دخول المريض server-side (هاتف + MRN)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PATIENT_COOKIE, PATIENT_SESSION_MS, signPatientToken } from "../_patientAuth";
import { normalizeMRN } from "@/lib/mrnFormat";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { phone, mrn } = await req.json() as { phone?: string; mrn?: string };
    const cleanPhone = (phone ?? "").trim();
    const raw        = (mrn ?? "").trim().toUpperCase();
    // MRN v2: أرقام فقط. نتسامح مع المسافات والشرطات والأرقام العربية.
    const digits     = normalizeMRN(raw);

    if (!cleanPhone || !raw) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    // مطابقة بالرقم الجديد أولاً، ثم بالرقم القديم (MRN-00001) لمن حفظه
    let data: { name: string; phone: string; mrn: string } | null = null;

    if (digits.length === 12) {
      const { data: byNew } = await supabaseAdmin
        .from("master_patients")
        .select("name, phone, mrn")
        .eq("phone", cleanPhone)
        .eq("mrn", digits)
        .maybeSingle();
      data = byNew;
    }

    if (!data) {
      // الصيغة القديمة: يقبل "MRN-00001" أو "00001" أو "1"
      const legacyCandidates = [raw];
      if (digits.length > 0 && digits.length < 12) {
        legacyCandidates.push(`MRN-${digits.padStart(5, "0")}`);
      }
      const { data: byLegacy } = await supabaseAdmin
        .from("master_patients")
        .select("name, phone, mrn")
        .eq("phone", cleanPhone)
        .in("mrn_legacy", legacyCandidates)
        .maybeSingle();
      data = byLegacy;
    }

    if (!data) {
      await new Promise(r => setTimeout(r, 600)); // إبطاء التخمين
      return NextResponse.json({ error: "invalid" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, patient: data });
    res.cookies.set(PATIENT_COOKIE, signPatientToken(data.phone, data.mrn), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   PATIENT_SESSION_MS / 1000,
      path:     "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
