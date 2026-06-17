// ============================================================
// middleware.ts — حماية الصفحات
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl     = "https://ldqaohjnlxiwvaijcsbm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";

// ─── مسارات محمية ────────────────────────────────────────
const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments", "/secretary", "/admin"];
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

  // ── /blocked مسموح دائماً ───────────────────────────────────
  if (pathname.startsWith("/blocked")) {
    return NextResponse.next();
  }

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

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // ── التحقق من الجلسة مع السماح بتجديد الـ token التلقائي ──
  // getUser() يجدد الـ access token تلقائياً عبر refresh token إذا انتهى
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // تحقق ثانوي: هل هناك refresh token في cookies؟
    // إذا وُجد، اسمح بالمرور وسيتولى الـ client-side التجديد
    const allCookies = request.cookies.getAll();
    const hasRefreshToken = allCookies.some(
      c => c.name.includes("auth-token") || c.name.includes("refresh")
    );

    if (hasRefreshToken) {
      // يوجد refresh token → اسمح بالمرور، الـ browser سيجدد الجلسة
      return response;
    }

    // لا جلسة ولا refresh token → وجّه لتسجيل الدخول
    if (isPharmacyProtected) {
      return NextResponse.redirect(new URL("/pharmacy/login", request.url));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── تحقق من حالة الاشتراك ─────────────────────────────────
  const { data: clinic } = await supabase
    .from("clinics")
    .select("status, expiry")
    .eq("user_id", user.id)
    .single();

  if (clinic) {
    const status = clinic.status as string;
    const expiry = clinic.expiry as string | null;

    if (status === "inactive") {
      return NextResponse.redirect(new URL("/blocked?reason=frozen", request.url));
    }
    if (status === "expired") {
      return NextResponse.redirect(new URL("/blocked?reason=cancelled", request.url));
    }
    if (expiry) {
      const expiryDate = new Date(expiry);
      expiryDate.setHours(23, 59, 59, 999);
      if (expiryDate < new Date()) {
        return NextResponse.redirect(new URL("/blocked?reason=expired", request.url));
      }
    }
  }

  // ── حماية مسارات الصيدلية ──────────────────────────────────
  if (isPharmacyProtected) {
    const { data: pharmacyClinic } = await supabase
      .from("clinics")
      .select("account_type, status")
      .eq("user_id", user.id)
      .single();

    if (pharmacyClinic?.account_type !== "pharmacy") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pharmacyClinic?.status === "inactive") {
      return NextResponse.redirect(new URL("/blocked?reason=frozen", request.url));
    }
    if (pharmacyClinic?.status === "expired") {
      return NextResponse.redirect(new URL("/blocked?reason=cancelled", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo_Nabd.svg).*)"],
};
