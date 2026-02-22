// ============================================================
// middleware.ts — حماية الصفحات وإدارة الجلسة
// ============================================================
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// الصفحات المحمية التي تتطلب تسجيل دخول
const PROTECTED = ["/dashboard", "/patients", "/appointments", "/payments", "/admin"];

// الصفحات العامة (لا تحتاج تسجيل دخول)
const PUBLIC = ["/login", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // تجاهل الملفات الثابتة
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // إنشاء Supabase client للـ middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  // التحقق من الجلسة
  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some(path => pathname.startsWith(path));
  const isPublic    = PUBLIC.includes(pathname);

  // إذا الصفحة محمية والمستخدم غير مسجل → redirect للـ login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // إذا المستخدم مسجل وحاول الوصول للـ login → redirect للـ dashboard
  if (isPublic && user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo_Nabd.svg).*)"],
};
