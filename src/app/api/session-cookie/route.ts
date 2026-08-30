// src/app/api/session-cookie/route.ts
// إصدار cookie جلسة موقّع httpOnly بعد التحقق من توكن Supabase
// يستبدل الكوكي الشكلي "nabd-session=1" القابل للتزوير
//
// التحقق يتم محلياً دون أي اتصال بـ Supabase Auth:
//   • ES256 (مفاتيح Supabase الجديدة): بالمفتاح العام من JWKS (مضمّن + يُحدَّث بمهلة قصيرة)
//   • HS256 (المشاريع القديمة): بـ SUPABASE_JWT_SECRET إن وُجد
// وإن تعذّر التحقق محلياً نعود لـ getUser مع مهلة زمنية — لا يعلّق الطلب أبداً.
import { NextResponse } from "next/server";
import { createHmac, createPublicKey, timingSafeEqual, verify as cryptoVerify, type KeyObject, type JsonWebKey as NodeJwk } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 15;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldqaohjnlxiwvaijcsbm.supabase.co";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_AGE = 400 * 24 * 60 * 60; // 400 يوم — الحفاظ على جلسات العملاء
const REMOTE_TIMEOUT_MS = 8000;
const JWKS_TIMEOUT_MS   = 3000;

// المفتاح العام الحالي للمشروع (من /auth/v1/.well-known/jwks.json) — احتياط إن تعذّر الجلب
const EMBEDDED_JWKS: NodeJwk[] = [
  {
    kty: "EC", crv: "P-256", alg: "ES256", use: "sig",
    kid: "0d194f5b-11b5-400d-a935-763ba7ce5db5",
    x: "mfhEBnLkSZJK4Cv9bQ4bv74-2iLM_b5IbWZr7DL7BHI",
    y: "1cxMkKbO7s1lkIOKlHJPbavtAGBNRCRmJdmJvMUe3iM",
  },
];

type Jwk = NodeJwk & { kid?: string; alg?: string };
let jwksCache: { keys: Jwk[]; fetchedAt: number } = { keys: EMBEDDED_JWKS as Jwk[], fetchedAt: 0 };

async function getJwks(forceRefresh = false): Promise<Jwk[]> {
  const fresh = Date.now() - jwksCache.fetchedAt < 6 * 60 * 60 * 1000;
  if (!forceRefresh && fresh) return jwksCache.keys;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, {
      signal: AbortSignal.timeout(JWKS_TIMEOUT_MS), cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json()) as { keys?: Jwk[] };
      if (Array.isArray(body.keys) && body.keys.length) {
        jwksCache = { keys: body.keys, fetchedAt: Date.now() };
      }
    }
  } catch { /* نبقى على المفاتيح المضمّنة/المخزّنة */ }
  return jwksCache.keys;
}

function sessionSecret(): string {
  return process.env.NABD_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signSession(uid: string, exp: number): string {
  const sig = createHmac("sha256", sessionSecret()).update(`${uid}.${exp}`).digest("hex");
  return `v2.${uid}.${exp}.${sig}`;
}

type Header  = { alg?: string; kid?: string };
type Payload = { sub?: string; exp?: number; role?: string };

function decodeParts(token: string): { h: string; p: string; s: string; header: Header; payload: Payload } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const header  = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as Header;
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Payload;
    return { h, p, s, header, payload };
  } catch {
    return null;
  }
}

function claimsOk(payload: Payload): string | null {
  if (!payload.exp || Date.now() / 1000 >= payload.exp) return null;
  if (payload.role && payload.role !== "authenticated") return null;
  return payload.sub ?? null;
}

// ── التحقق المحلي ─────────────────────────────────────────────
// يعيد user id عند النجاح، null عند فشل التوقيع/الانتهاء،
// و undefined إذا تعذّر التحقق محلياً (خوارزمية غير مدعومة / مفتاح غير متاح).
async function verifyJwtLocally(token: string): Promise<string | null | undefined> {
  const d = decodeParts(token);
  if (!d) return null;
  const data = Buffer.from(`${d.h}.${d.p}`);
  let sig: Buffer;
  try { sig = Buffer.from(d.s, "base64url"); } catch { return null; }

  if (d.header.alg === "HS256") {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) return undefined;
    const expected = createHmac("sha256", secret).update(data).digest();
    if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
    return claimsOk(d.payload);
  }

  if (d.header.alg === "ES256") {
    const tryKeys = (keys: Jwk[]): boolean | undefined => {
      const candidates = keys.filter(k => !d.header.kid || !k.kid || k.kid === d.header.kid);
      if (!candidates.length) return undefined;
      for (const jwk of candidates) {
        let key: KeyObject;
        try { key = createPublicKey({ key: jwk, format: "jwk" }); } catch { continue; }
        try {
          if (cryptoVerify("sha256", data, { key, dsaEncoding: "ieee-p1363" }, sig)) return true;
        } catch { /* جرّب المفتاح التالي */ }
      }
      return false;
    };
    let ok = tryKeys(await getJwks());
    if (ok === undefined) ok = tryKeys(await getJwks(true)); // kid جديد → حدّث JWKS
    if (ok === undefined) return undefined;
    return ok ? claimsOk(d.payload) : null;
  }

  return undefined;
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

  let uid = await verifyJwtLocally(token);
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
