// ============================================================
// middleware.ts — حماية الصفحات
// cookie موقّع HMAC (v2) يُصدره /api/session-cookie بعد تحقق Supabase
// القيمة القديمة "1" مقبولة مؤقتاً حفاظاً على جلسات العملاء الحالية
// (AuthGuard يستبدلها تلقائياً بكوكي موقّع عند أول زيارة)
// ============================================================

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments", "/secretary", "/messages", "/prescriptions", "/waiting-room", "/referrals", "/account", "/call"];
const PHARMACY_PROTECTED = ["/pharmacy"];
const LAB_PROTECTED = ["/lab"];

async function verifySignedSession(value: string): Promise<boolean> {
  // v2.<uid>.<exp>.<sig>
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return false;
  const [, uid, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return false;
  const secret = process.env.NABD_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!secret) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${uid}.${exp}`));
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === sig;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")   ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/blocked")) return NextResponse.next();

  // ── /admin: التحقق الفعلي server-side في isAdminAuthorized ──
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isPharmacyProtected =
    PHARMACY_PROTECTED.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith("/pharmacy/login");
  const isLabProtected =
    LAB_PROTECTED.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith("/lab/login") &&
    !pathname.startsWith("/lab-result");

  if (!isProtected && !isPharmacyProtected && !isLabProtected) {
    return NextResponse.next();
  }

  // ── وضع التجربة: يسمح بدخول صفحات العيادة فقط ببيانات وهمية ──
  if (isProtected && request.cookies.get("nabd-demo")?.value === "1") {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("nabd-session")?.value;

  // مقبول: كوكي موقّع v2، أو القيمة القديمة "1" (انتقالياً — لا نُخرج أحداً)
  const valid =
    !!sessionCookie &&
    (sessionCookie === "1" || (await verifySignedSession(sessionCookie)));

  if (!valid) {
    if (isPharmacyProtected) {
      return NextResponse.redirect(new URL("/pharmacy/login", request.url));
    }
    if (isLabProtected) {
      return NextResponse.redirect(new URL("/lab/login", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo_Nabd.svg).*)"],
};
