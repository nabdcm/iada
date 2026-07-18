// src/app/api/pharmacy/_pharmacyAuth.ts
// التحقق من هوية المستخدم عبر JWT — لا نثق أبداً بـ user_id القادم من العميل
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * يتحقق من Authorization: Bearer <token> ويعيد user_id الحقيقي.
 * يعيد null إذا كان التوكن مفقوداً أو غير صالح.
 */
export async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}
