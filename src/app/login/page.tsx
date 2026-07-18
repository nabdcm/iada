// ============================================================
// /login — تم توحيد الدخول في /portal
// هذه الصفحة تحوّل فقط مع الحفاظ على باراميتر redirect
// ============================================================
import { redirect } from "next/navigation";

export default async function LoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const target = params.redirect
    ? `/portal?type=clinic&redirect=${encodeURIComponent(params.redirect)}`
    : "/portal?type=clinic";
  redirect(target);
}
