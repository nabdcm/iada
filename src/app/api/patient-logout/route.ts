// /api/patient-logout — مسح جلسة المريض
import { NextResponse } from "next/server";
import { PATIENT_COOKIE } from "../_patientAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PATIENT_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
