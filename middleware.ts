// ============================================================
// middleware.ts — حماية الصفحات
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl     = "https://ldqaohjnlxiwvaijcsbm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";

// ─── حُذف "/admin" من هنا — يملك نظام مصادقة خاصاً به ───────
const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments", "/secretary", "/admin"];
// ── مسارات الصيدلية محمية بشكل منفصل — تتحقق من account_type ──
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

  // ── /blocked مسموح دائماً (حتى لا يحدث redirect loop) ──────
  if (pathname.startsWith("/blocked")) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // ── /admin محمي بـ httpOnly cookie من server-side ────────────
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("nabd_admin_session")?.value;
    if (!token) {
      // لا cookie → أكمل (ستعرض شاشة دخول المدير client-side)
      return NextResponse.next();
    }
    try {
      const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as {
        auth: string; expiry: number; secret: string;
      };
      const isValid =
        payload.auth === "1" &&
        Date.now() < payload.expiry &&
        payload.secret === (process.env.NABD_ADMIN_SECRET ?? "");
      if (!isValid) {
        // cookie منتهي أو مزيّف — امسحه
        const res = NextResponse.next();
        res.cookies.set("nabd_admin_session", "", { maxAge: 0, path: "/" });
        return res;
      }
    } catch {
      return NextResponse.next();
    }
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

  // ── 1. هل المستخدم مسجّل دخول؟ ────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. جلب بيانات الاشتراك من جدول clinics ─────────────────
  const { data: clinic } = await supabase
    .from("clinics")
    .select("status, expiry")
    .eq("user_id", user.id)
    .single();

  if (clinic) {
    const status = clinic.status as string;
    const expiry = clinic.expiry as string | null;

    // تحقق من الحالة: موقوف (تجميد)
    if (status === "inactive") {
      const blockedUrl = new URL("/blocked", request.url);
      blockedUrl.searchParams.set("reason", "frozen");
      return NextResponse.redirect(blockedUrl);
    }

    // تحقق من الحالة: ملغى
    if (status === "expired") {
      const blockedUrl = new URL("/blocked", request.url);
      blockedUrl.searchParams.set("reason", "cancelled");
      return NextResponse.redirect(blockedUrl);
    }

    // تحقق من تاريخ الانتهاء
    if (expiry) {
      const expiryDate = new Date(expiry);
      expiryDate.setHours(23, 59, 59, 999); // نهاية يوم الانتهاء
      if (expiryDate < new Date()) {
        const blockedUrl = new URL("/blocked", request.url);
        blockedUrl.searchParams.set("reason", "expired");
        return NextResponse.redirect(blockedUrl);
      }
    }
  }

  // ── حماية مسارات الصيدلية (/pharmacy و/pharmacy/*) ────────────
  // /pharmacy/login مستثنى (صفحة دخول)
  const isPharmacyProtected =
    PHARMACY_PROTECTED.some(p => pathname.startsWith(p)) &&
    !pathname.startsWith("/pharmacy/login");

  if (isPharmacyProtected) {
    if (!user) {
      return NextResponse.redirect(new URL("/pharmacy/login", request.url));
    }
    // التحقق أن الحساب نوعه صيدلية
    const { data: pharmacyClinic } = await supabase
      .from("clinics")
      .select("account_type, status")
      .eq("user_id", user.id)
      .single();

    if (pharmacyClinic?.account_type !== "pharmacy") {
      // حساب عيادة حاول الدخول لصفحة الصيدلية → أعده للـ dashboard
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