// src/app/api/_adminAuth.ts
import { createHash } from "crypto";
import { type NextRequest } from "next/server";

// السر إلزامي — لا قيمة افتراضية مكشوفة في الكود
export function getAdminSecret(): string {
  return process.env.NABD_ADMIN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function isAdminAuthorized(req: NextRequest | Request): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  const expectedHash = hashSecret(secret);

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
        auth: string; expiry: number; secret?: string; sig?: string;
      };
      const sigOk = p.sig === expectedHash || p.secret === secret; // secret القديم مقبول مؤقتاً للجلسات الحالية
      if (p.auth === "1" && Date.now() < p.expiry && sigOk) return true;
    } catch { /* invalid */ }
  }

  // ── 2. x-admin-secret header (توافق) ─────────────────────
  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret && headerSecret === secret) return true;

  return false;
}
