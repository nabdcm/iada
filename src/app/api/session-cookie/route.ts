// src/app/api/session-cookie/route.ts
// إصدار cookie جلسة موقّع httpOnly بعد التحقق من توكن Supabase
// يستبدل الكوكي الشكلي "nabd-session=1" القابل للتزوير
import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_AGE = 400 * 24 * 60 * 60; // 400 يوم — الحفاظ على جلسات العملاء

function sessionSecret(): string {
  return process.env.NABD_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function signSession(uid: string, exp: number): string {
  const sig = createHmac("sha256", sessionSecret()).update(`${uid}.${exp}`).digest("hex");
  return `v2.${uid}.${exp}.${sig}`;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const exp = Date.now() + MAX_AGE * 1000;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nabd-session", signSession(data.user.id, exp), {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: MAX_AGE, path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("nabd-session", "", { maxAge: 0, path: "/" });
  return res;
}
