// ============================================================
// /api/patient-login — دخول المريض server-side (هاتف + MRN)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { PATIENT_COOKIE, PATIENT_SESSION_MS, signPatientToken } from "../_patientAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { phone, mrn } = await req.json() as { phone?: string; mrn?: string };
    const cleanPhone = (phone ?? "").trim();
    const cleanMrn   = (mrn ?? "").trim().toUpperCase();

    if (!cleanPhone || !cleanMrn) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const { data } = await supabaseAdmin
      .from("master_patients")
      .select("name, phone, mrn")
      .eq("phone", cleanPhone)
      .eq("mrn", cleanMrn)
      .maybeSingle();

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
