"use client";

// ============================================================
// AdminOfflineToggle — مفتاح تفعيل ميزة العمل دون اتصال
// يظهر في لوحة الأدمن فقط ويتحكم بالميزة لكل العيادات
// ============================================================

import { useEffect, useState } from "react";

export default function AdminOfflineToggle({ isAr }: { isAr: boolean }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin-flags", { credentials: "include" });
        const json = (await res.json()) as { flags?: Record<string, string> };
        setEnabled(json.flags?.offline_enabled === "1");
      } catch { setEnabled(false); }
    })();
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin-flags", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "offline_enabled", value: next ? "1" : "0" }),
      });
      if ((await res.json())?.ok) setEnabled(next);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#555" }}>
          📴 {isAr ? "العمل دون اتصال" : "Offline mode"}
        </span>
        {enabled === null ? (
          <span style={{ fontSize: 10, color: "#aaa" }}>...</span>
        ) : (
          <label style={{ position: "relative", display: "inline-block", width: 36, height: 20, cursor: saving ? "wait" : "pointer", opacity: saving ? .6 : 1 }}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={saving}
              onChange={e => toggle(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: "absolute", inset: 0, borderRadius: 20, transition: "background .2s",
              background: enabled ? "#0863ba" : "#cbd5e1",
            }} />
            <span style={{
              position: "absolute", top: 2, insetInlineStart: enabled ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              transition: "inset-inline-start .2s", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
            }} />
          </label>
        )}
      </div>
      <div style={{ fontSize: 10, color: "#999", marginTop: 6, lineHeight: 1.7 }}>
        {isAr
          ? "عند التفعيل: تُعرض للعيادات آخر بياناتها وتُرسل الإضافات الجديدة تلقائياً عند عودة النت."
          : "When on: clinics see cached data offline and new entries sync when back online."}
      </div>
    </div>
  );
}
