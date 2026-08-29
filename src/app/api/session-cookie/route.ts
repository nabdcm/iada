// src/app/api/session-cookie/route.ts
// إصدار cookie جلسة موقّع httpOnly بعد التحقق من توكن Supabase
// يستبدل الكوكي الشكلي "nabd-session=1" القابل للتزوير
//
// التحقق يتم محلياً (HS256 عبر SUPABASE_JWT_SECRET) دون أي اتصال بـ Supabase —
// حتى لا يتعطّل الدخول عند بطء/انقطاع الاتصال بين Vercel وSupabase Auth.
// إن لم يتوفر السر (أو كان التوكن بخوارزمية أخرى) نعود لـ getUser مع مهلة زمنية.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 15;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_AGE = 400 * 24 * 60 * 60; // 400 يوم — الحفاظ على جلسات العملاء
const REMOTE_TIMEOUT_MS = 8000;

function sessionSecret(): string {
  return process.env.NABD_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signSession(uid: string, exp: number): string {
  const sig = createHmac("sha256", sessionSecret()).update(`${uid}.${exp}`).digest("hex");
  return `v2.${uid}.${exp}.${sig}`;
}

// ── التحقق المحلي من JWT (HS256) ────────────────────────────
// يعيد user id عند النجاح، null عند فشل التوقيع/الانتهاء،
// و undefined إذا تعذّر التحقق محلياً (لا سر، أو خوارزمية غير HS256).
function verifyJwtLocally(token: string): string | null | undefined {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return undefined;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;

  let header: { alg?: string };
  let payload: { sub?: string; exp?: number; role?: string };
  try {
    header  = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (header.alg !== "HS256") return undefined;

  const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  let given: Buffer;
  try { given = Buffer.from(s, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  if (!payload.exp || Date.now() / 1000 >= payload.exp) return null;
  if (payload.role && payload.role !== "authenticated") return null;
  if (!payload.sub) return null;

  return payload.sub;
}

// ── احتياط: getUser مع مهلة زمنية حتى لا يعلّق الطلب ─────────
async function verifyRemotely(token: string): Promise<string | null> {
  const timeout = new Promise<null>(r => setTimeout(() => r(null), REMOTE_TIMEOUT_MS));
  const check = supabaseAdmin.auth.getUser(token)
    .then(({ data, error }) => (error || !data?.user ? null : data.user.id))
    .catch(() => null);
  return Promise.race([check, timeout]);
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let uid = verifyJwtLocally(token);
  if (uid === undefined) uid = await verifyRemotely(token);
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const exp = Date.now() + MAX_AGE * 1000;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nabd-session", signSession(uid, exp), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: MAX_AGE, path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nabd-session", "", { maxAge: 0, path: "/" });
  return res;
}
