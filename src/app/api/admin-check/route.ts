// src/app/api/admin-check/route.ts
// ─── التحقق من جلسة المدير — يقرأ الـ httpOnly cookie ──────────
// الـ client يستدعيه عند تحميل الصفحة بدلاً من قراءة sessionStorage

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "../admin-login/route";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // فك تشفير الـ token
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as {
      auth: string;
      expiry: number;
      secret: string;
    };

    // التحقق من: الـ auth flag + الوقت + الـ secret
    const isValid =
      payload.auth === "1" &&
      Date.now() < payload.expiry &&
      payload.secret === (process.env.NABD_ADMIN_SECRET ?? "");

    if (!isValid) {
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      // مسح الـ cookie المنتهي أو المزيّف
      res.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
