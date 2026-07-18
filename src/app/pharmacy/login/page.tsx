// ============================================================
// /pharmacy/login — تم توحيد الدخول في /portal
// ============================================================
import { redirect } from "next/navigation";

export default function PharmacyLoginRedirect() {
  redirect("/portal?type=pharmacy");
}
