// src/app/api/admin-login/route.ts
// ─── تسجيل دخول المدير — server-side فقط ───────────────────

import { NextResponse } from "next/server";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
export const ADMIN_COOKIE = "nabd_admin_session";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json() as {
      username?: string;
      password?: string;
    };

    // يقرأ من env أولاً، وإلا يستخدم القيمة الافتراضية
    // لتغيير بيانات الدخول: عدّل NABD_ADMIN_USERNAME / NABD_ADMIN_PASSWORD في Vercel
    const expectedUsername = (process.env.NABD_ADMIN_USERNAME ?? "nabd").toLowerCase();
    const expectedPassword  =  process.env.NABD_ADMIN_PASSWORD ?? "nabd.111";

    const isValid =
      (username?.trim().toLowerCase() ?? "") === expectedUsername &&
      (password ?? "") === expectedPassword;

    if (!isValid) {
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const expiry = Date.now() + SESSION_DURATION_MS;
    const secret = process.env.NABD_ADMIN_SECRET ?? "nabd-admin-secret";
    const token  = Buffer.from(
      JSON.stringify({ auth: "1", expiry, secret })
    ).toString("base64");

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   SESSION_DURATION_MS / 1000,
      path:     "/",
    });

    return res;
  } catch (err) {
    console.error("admin-login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
