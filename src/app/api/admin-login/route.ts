// src/app/api/admin-login/route.ts
// ─── تسجيل دخول المدير — يتحقق من credentials في env vars ───
// بيانات الدخول لا تظهر أبداً في الكود أو الـ bundle

import { NextResponse } from "next/server";

// مدة الجلسة: ساعة واحدة
const SESSION_DURATION_MS = 60 * 60 * 1000;

// اسم الـ cookie
export const ADMIN_COOKIE = "nabd_admin_session";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json() as {
      username?: string;
      password?: string;
    };

    const expectedUsername = process.env.NABD_ADMIN_USERNAME;
    const expectedPassword = process.env.NABD_ADMIN_PASSWORD;

    // إذا لم تُضبَط المتغيرات في البيئة → خطأ صريح
    if (!expectedUsername || !expectedPassword) {
      console.error("admin-login: NABD_ADMIN_USERNAME or NABD_ADMIN_PASSWORD not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const isValid =
      username?.trim().toLowerCase() === expectedUsername.toLowerCase() &&
      password === expectedPassword;

    if (!isValid) {
      // تأخير 500ms لمنع brute-force timing attacks
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // بناء قيمة الـ cookie: token بسيط مع وقت الانتهاء
    const expiry = Date.now() + SESSION_DURATION_MS;
    // الـ token يحتوي على الـ secret + الوقت لمنع التلاعب
    const token = Buffer.from(
      JSON.stringify({ auth: "1", expiry, secret: process.env.NABD_ADMIN_SECRET ?? "" })
    ).toString("base64");

    const res = NextResponse.json({ ok: true });

    // httpOnly + Secure + SameSite=Strict = لا يمكن قراءته من JS
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   SESSION_DURATION_MS / 1000, // بالثواني
      path:     "/",
    });

    return res;
  } catch (err) {
    console.error("admin-login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
