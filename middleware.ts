// ============================================================
// middleware.ts — حماية الصفحات
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl     = "https://ldqaohjnlxiwvaijcsbm.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcWFvaGpubHhpd3ZhaWpjc2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1Nzk3MDUsImV4cCI6MjA4NzE1NTcwNX0.2vo-DqFGbJqa8MEgotfujz23QjU2bfMEDIDDnbDQ1Jo";

// ─── حُذف "/admin" من هنا — يملك نظام مصادقة خاصاً به ───────
const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments"];

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo_Nabd.svg).*)"],
};
