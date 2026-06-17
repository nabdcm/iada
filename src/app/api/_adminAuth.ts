// src/app/api/_adminAuth.ts
import { type NextRequest } from "next/server";

export function isAdminAuthorized(req: NextRequest | Request): boolean {
  const expectedSecret = process.env.NABD_ADMIN_SECRET ?? "nabd-admin-secret";

  // ── 1. httpOnly cookie ────────────────────────────────────
  const cookieVal =
    (req as NextRequest).cookies?.get?.("nabd_admin_session")?.value ??
    req.headers.get("cookie")
      ?.split(";")
      .find(c => c.trim().startsWith("nabd_admin_session="))
      ?.split("=").slice(1).join("=");

  if (cookieVal) {
    try {
      const p = JSON.parse(Buffer.from(cookieVal, "base64").toString("utf8")) as {
        auth: string; expiry: number; secret: string;
      };
      if (p.auth === "1" && Date.now() < p.expiry && p.secret === expectedSecret) {
        return true;
      }
    } catch { /* invalid */ }
  }

  // ── 2. x-admin-secret header (توافق مع الطريقة القديمة) ──
  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret && headerSecret === expectedSecret) return true;

  return false;
}
