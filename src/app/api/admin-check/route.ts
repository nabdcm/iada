// src/app/api/admin-check/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "../admin-login/route";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf8")) as {
      auth: string; expiry: number; secret: string;
    };

    const expectedSecret = process.env.NABD_ADMIN_SECRET ?? "nabd-admin-secret";

    const isValid =
      payload.auth === "1" &&
      Date.now() < payload.expiry &&
      payload.secret === expectedSecret;

    if (!isValid) {
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      res.cookies.set(ADMIN_COOKIE, "", { maxAge: 0, path: "/" });
      return res;
    }

    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
