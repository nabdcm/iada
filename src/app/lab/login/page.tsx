// ============================================================
// /lab/login — تم توحيد الدخول في /portal
// ============================================================
import { redirect } from "next/navigation";

export default function LabLoginRedirect() {
  redirect("/portal?type=lab");
}
