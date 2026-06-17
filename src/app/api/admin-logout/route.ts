// src/app/api/admin-logout/route.ts
// ─── تسجيل خروج المدير — يمسح الـ httpOnly cookie ───────────

import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../admin-login/route";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge:   0, // يُحذَف فوراً
    path:     "/",
  });
  return res;
}
