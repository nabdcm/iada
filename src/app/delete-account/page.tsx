"use client";
// ============================================================
// NABD - نبض | طلب حذف الحساب
// صفحة عامة لا تتطلب تسجيل دخول — لتلبية متطلبات متاجر التطبيقات
// Route: /delete-account
// ============================================================

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BRAND = { primary: "#0863ba", primaryDark: "#054a8c", bg: "#f7f9fc", ink: "#1c2b3a", muted: "#8a97a6", border: "#eef0f3" };

export default function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState("clinic");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const res = await fetch("/api/account-deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), account_type: accountType, reason: reason.trim(), user_id: user?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل الإرسال");
      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "حدث خطأ، حاول لاحقاً");
    }
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "Rubik, sans-serif", display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/Logo_Nabd.svg" alt="نبض" style={{ height: 48, margin: "0 auto 12px" }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: BRAND.ink, margin: 0 }}>طلب حذف الحساب</h1>
          <p style={{ color: BRAND.muted, marginTop: 8, fontSize: 14, lineHeight: 1.7 }}>
            عبّئ النموذج التالي لطلب حذف حسابك وبياناتك من منصة نبض.
            سيتم التواصل معك عبر البريد المُدخل للتأكيد قبل تنفيذ الحذف نهائياً.
          </p>
        </div>

        {status === "done" ? (
          <div style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 14, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: BRAND.ink, margin: "0 0 8px" }}>تم استلام طلبك</h2>
            <p style={{ color: BRAND.muted, fontSize: 14, lineHeight: 1.7 }}>
              سنراجع طلبك ونتواصل معك على البريد الإلكتروني المُدخل خلال أيام قليلة لإتمام عملية الحذف.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: "#fff", border: `1px solid ${BRAND.border}`, borderRadius: 14, padding: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: BRAND.ink, marginBottom: 6 }}>البريد الإلكتروني لحسابك *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${BRAND.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }}
            />

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: BRAND.ink, marginBottom: 6 }}>نوع الحساب</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${BRAND.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box", background: "#fff" }}
            >
              <option value="clinic">عيادة / طبيب</option>
              <option value="pharmacy">صيدلية</option>
              <option value="lab">مخبر</option>
              <option value="patient">مريض</option>
            </select>

            <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: BRAND.ink, marginBottom: 6 }}>سبب الحذف (اختياري)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${BRAND.border}`, marginBottom: 20, fontSize: 14, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />

            {status === "error" && (
              <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: BRAND.primary, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: status === "loading" ? 0.7 : 1 }}
            >
              {status === "loading" ? "جارٍ الإرسال..." : "إرسال طلب الحذف"}
            </button>

            <p style={{ fontSize: 12, color: BRAND.muted, marginTop: 16, lineHeight: 1.6, textAlign: "center" }}>
              للاستفسار المباشر: <a href="mailto:support@nabd.clinic" style={{ color: BRAND.primary }}>support@nabd.clinic</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
