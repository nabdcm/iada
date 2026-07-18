// ============================================================
// _patientAuth.ts — توقيع/تحقق جلسة المريض (httpOnly cookie)
// ============================================================
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const PATIENT_COOKIE = "nabd_patient_session";
export const PATIENT_SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوم

const secret = () => process.env.NABD_ADMIN_SECRET ?? "nabd-patient-secret";

type PatientPayload = { phone: string; mrn: string; exp: number };

export function signPatientToken(phone: string, mrn: string): string {
  const payload: PatientPayload = { phone, mrn, exp: Date.now() + PATIENT_SESSION_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig  = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPatientToken(token: string | undefined): PatientPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as PatientPayload;
    if (!payload.phone || !payload.mrn || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getPatientFromRequest(req: NextRequest): PatientPayload | null {
  return verifyPatientToken(req.cookies.get(PATIENT_COOKIE)?.value);
}
