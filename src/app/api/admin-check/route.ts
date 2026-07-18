// src/app/api/admin-check/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "../_adminAuth";
import { ADMIN_COOKIE } from "../admin-login/route";

export async function GET(req: NextRequest) {
  if (isAdminAuthorized(req)) return NextResponse.json({ authenticated: true });
  const res = NextResponse.json({ authenticated: false }, { status: 401 });
  res.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
