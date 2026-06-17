// src/app/api/_adminAuth.ts
// ─── مساعد مشترك للتحقق من صلاحية المدير ────────────────────
// يقبل: httpOnly cookie (الطريقة الجديدة) أو x-admin-secret header (للتوافق)

import { type NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest | Request): boolean {
  // ── الطريقة الجديدة: httpOnly cookie ─────────────────────
  const cookieHeader = (req as NextRequest).cookies?.get?.("nabd_admin_session")?.value
    ?? req.headers.get?.("cookie")
      ?.split(";")
      .find(c => c.trim().startsWith("nabd_admin_session="))
      ?.split("=").slice(1).join("=");

  if (cookieHeader) {
    try {
      const payload = JSON.parse(Buffer.from(cookieHeader, "base64").toString("utf8")) as {
        auth: string; expiry: number; secret: string;
      };
      if (
        payload.auth === "1" &&
        Date.now() < payload.expiry &&
        payload.secret === (process.env.NABD_ADMIN_SECRET ?? "")
      ) {
        return true;
      }
    } catch { /* invalid cookie */ }
  }

  // ── الطريقة القديمة: x-admin-secret header (للتوافق مع أي استخدام مباشر) ─
  const secret = req.headers.get("x-admin-secret");
  if (secret && secret === process.env.NABD_ADMIN_SECRET) {
    return true;
  }

  return false;
}
