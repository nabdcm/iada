"use client";

// ============================================================
// OfflineWidget — زر عائم صغير لإدارة وضع العمل دون اتصال
// يظهر فقط داخل صفحات التطبيق المحمية (ليس في الصفحة العامة)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import {
  isOfflineFeatureEnabled, setOfflineFeatureEnabled,
  pendingCount, syncOutbox, wipeOfflineData,
} from "@/lib/offline";
import { supabase } from "@/lib/supabase";
import { isDemoActive } from "@/lib/demo";

const APP_PATHS = ["/dashboard", "/patients", "/appointments", "/payments", "/prescriptions", "/messages", "/referrals", "/waiting-room", "/clinic-management", "/patient-tracking", "/secretary"];

export default function OfflineWidget() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncMsg, setSyncMsg] = useState("");

  const refresh = useCallback(() => {
    setEnabled(isOfflineFeatureEnabled());
    setPending(pendingCount());
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (!APP_PATHS.some(p => path.startsWith(p))) return;
    if (isDemoActive()) return; // لا حاجة له في وضع التجربة
    setVisible(true);
    refresh();
    const onChange = () => refresh();
    window.addEventListener("nabd-offline-change", onChange);
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("nabd-offline-change", onChange);
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  }, [refresh]);

  if (!visible) return null;

  const statusColor = !enabled ? "#94a3b8" : online ? "#2e7d32" : "#e67e22";
  const statusLabel = !enabled ? "معطّل" : online ? "متصل" : "دون اتصال";

  async function handleSyncNow() {
    setSyncMsg("جارٍ الإرسال...");
    const { sent, failed } = await syncOutbox(supabase);
    setSyncMsg(failed > 0 ? `أُرسل ${sent} — تعذّر ${failed}` : `✓ أُرسل ${sent}`);
    refresh();
    setTimeout(() => setSyncMsg(""), 3000);
  }

  return (
    <div dir="rtl" style={{ position: "fixed", bottom: 84, insetInlineEnd: 14, zIndex: 9998, fontFamily: "'Rubik',sans-serif" }}>
      {open && (
        <div style={{ position: "absolute", bottom: 52, insetInlineEnd: 0, width: 270, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 18px 50px rgba(15,40,80,.2)", padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#2c3e50" }}>العمل دون اتصال</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: statusColor }}>● {statusLabel}</span>
          </div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#4b5563" }}>تفعيل الميزة</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setOfflineFeatureEnabled(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: "#0863ba", cursor: "pointer" }}
            />
          </label>

          {enabled && (
            <>
              <div style={{ fontSize: 12, color: "#6b7684", lineHeight: 1.8, background: "#f6f9fd", borderRadius: 10, padding: "9px 12px", marginBottom: 12 }}>
                عند انقطاع الإنترنت: تُعرض آخر بياناتك المحفوظة، وتُحفظ <b>الإضافات الجديدة</b> وتُرسل تلقائياً عند عودة الاتصال. التعديل والحذف يتطلبان اتصالاً.
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "#4b5563" }}>بانتظار الإرسال</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: pending > 0 ? "#e67e22" : "#2e7d32" }}>{pending}</span>
              </div>

              {pending > 0 && online && (
                <button onClick={handleSyncNow} style={{ width: "100%", background: "#0863ba", color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
                  إرسال الآن
                </button>
              )}
              {syncMsg && <div style={{ fontSize: 12, color: "#0863ba", textAlign: "center", marginBottom: 8 }}>{syncMsg}</div>}

              <button
                onClick={() => { if (confirm("سيتم حذف النسخة المحلية والطابور غير المُرسل. متابعة؟")) { wipeOfflineData(); refresh(); } }}
                style={{ width: "100%", background: "#fff", color: "#c0392b", border: "1px solid #f1c7c2", borderRadius: 10, padding: "9px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
              >
                مسح البيانات المحلية
              </button>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => { setOpen(v => !v); refresh(); }}
        aria-label="offline mode"
        style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#fff", border: `2px solid ${statusColor}`,
          boxShadow: "0 6px 20px rgba(15,40,80,.18)",
          cursor: "pointer", fontSize: 19, position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {enabled && !online ? "📴" : "☁️"}
        {pending > 0 && (
          <span style={{ position: "absolute", top: -4, insetInlineEnd: -4, background: "#e67e22", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 800, padding: "1px 6px" }}>
            {pending}
          </span>
        )}
      </button>
    </div>
  );
}
