// ============================================================
// middleware.ts — حماية الصفحات (مبسّط)
// الحماية الحقيقية تتم في AuthGuard (client-side) باستخدام localStorage
// الـ middleware يكتفي بالتحقق من cookie خفيف كطبقة أولى سريعة
// ============================================================

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments", "/secretary", "/messages", "/prescriptions", "/waiting-room"];
const PHARMACY_PROTECTED = ["/pharmacy"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── استثناء الملفات الثابتة والـ API ───────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")   ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/blocked")) return NextResponse.next();

  // ── /admin محمي بـ httpOnly cookie خاص ─────────────────────
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("nabd_admin_session")?.value;
    if (!token) return NextResponse.next();
    try {
      const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as {
        auth: string; expiry: number; secret: string;
      };
      const isValid =
        payload.auth === "1" &&
        Date.now() < payload.expiry &&
        payload.secret === (process.env.NABD_ADMIN_SECRET ?? "");
      if (!isValid) {
        const res = NextResponse.next();
        res.cookies.set("nabd_admin_session", "", { maxAge: 0, path: "/" });
        return res;
      }
    } catch {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  const isPharmacyProtected =
    PHARMACY_PROTECTED.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith("/pharmacy/login");

  if (!isProtected && !isPharmacyProtected) {
    return NextResponse.next();
  }

  // ── التحقق من الجلسة ──────────────────────────────────────
  // نقبل إمّا cookie الـ nabd-session أو أي cookie جلسة من Supabase
  // (sb-*-auth-token) — لأن سفاري/iOS يحذف الكوكيز المكتوبة من JS
  // بعد 7 أيام، بينما كوكيز Supabase تتجدد تلقائياً.
  const sessionCookie = request.cookies.get("nabd-session")?.value;
  const hasSupabaseSession = request.cookies
    .getAll()
    .some(c => c.name.startsWith("sb-") && c.name.includes("auth-token") && c.value);

  if (!sessionCookie && !hasSupabaseSession) {
    const loginUrl = new URL("/portal", request.url);
    loginUrl.searchParams.set("type", isPharmacyProtected ? "pharmacy" : "clinic");
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo_Nabd.svg).*)"],
};
