"use client";

// ============================================================
// ChangePasswordCard — تغيير الطبيب لكلمة سر حسابه
// الجلسة تبقى صالحة بعد التغيير (لا logout)
// ============================================================

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BRAND = { primary: "#0863ba", primaryLight: "#3d8fd6", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", green: "#2e7d32" };

const T = {
  ar: {
    title: "كلمة سر الحساب",
    subtitle: "غيّر كلمة سر دخولك للتطبيق",
    current: "كلمة السر الحالية",
    next: "كلمة السر الجديدة",
    confirm: "تأكيد كلمة السر الجديدة",
    show: "إظهار", hide: "إخفاء",
    save: "تغيير كلمة السر", saving: "جارٍ الحفظ...",
    ok: "✓ تم تغيير كلمة السر بنجاح",
    errs: {
      missing_fields: "املأ جميع الحقول.",
      mismatch: "كلمتا السر الجديدتان غير متطابقتين.",
      too_short: "كلمة السر يجب أن تكون 6 أحرف على الأقل.",
      wrong_current: "كلمة السر الحالية غير صحيحة.",
      generic: "حدث خطأ، حاول مجدداً.",
    },
  },
  en: {
    title: "Account Password",
    subtitle: "Change your app login password",
    current: "Current password",
    next: "New password",
    confirm: "Confirm new password",
    show: "Show", hide: "Hide",
    save: "Change Password", saving: "Saving...",
    ok: "✓ Password changed successfully",
    errs: {
      missing_fields: "Fill in all fields.",
      mismatch: "New passwords don't match.",
      too_short: "Password must be at least 6 characters.",
      wrong_current: "Current password is incorrect.",
      generic: "Something went wrong, try again.",
    },
  },
};

export default function ChangePasswordCard({ lang = "ar" }: { lang?: "ar" | "en" }) {
  const t = T[lang];
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!cur || !next || !conf) { setMsg({ kind: "err", text: t.errs.missing_fields }); return; }
    if (next !== conf) { setMsg({ kind: "err", text: t.errs.mismatch }); return; }
    if (next.length < 6) { setMsg({ kind: "err", text: t.errs.too_short }); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        setMsg({ kind: "ok", text: t.ok });
        setCur(""); setNext(""); setConf("");
      } else {
        const key = (json.error ?? "generic") as keyof typeof t.errs;
        setMsg({ kind: "err", text: t.errs[key] ?? t.errs.generic });
      }
    } catch { setMsg({ kind: "err", text: t.errs.generic }); }
    setSaving(false);
  }

  const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${BRAND.border}`, fontFamily: "'Rubik',sans-serif", fontSize: 14, color: BRAND.ink, background: "#fbfdff", outline: "none" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 700, color: "#4b5563", marginBottom: 7 };

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: 24, maxWidth: 460, boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: BRAND.ink }}>🔑 {t.title}</h3>
        <p style={{ margin: "5px 0 0", fontSize: 12.5, color: BRAND.muted }}>{t.subtitle}</p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label style={lbl}>{t.current}</label>
          <input type={show ? "text" : "password"} value={cur} onChange={e => setCur(e.target.value)} style={inp} autoComplete="current-password" />
        </div>
        <div>
          <label style={lbl}>{t.next}</label>
          <input type={show ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} style={inp} autoComplete="new-password" />
        </div>
        <div>
          <label style={lbl}>{t.confirm}</label>
          <input type={show ? "text" : "password"} value={conf} onChange={e => setConf(e.target.value)} style={inp} autoComplete="new-password" />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: BRAND.muted, cursor: "pointer" }}>
          <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} style={{ accentColor: BRAND.primary, width: 16, height: 16 }} />
          {show ? t.hide : t.show}
        </label>

        {msg && (
          <div style={{ padding: "11px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: msg.kind === "ok" ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.1)", color: msg.kind === "ok" ? BRAND.green : "#c0392b" }}>
            {msg.text}
          </div>
        )}

        <button onClick={submit} disabled={saving}
          style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontFamily: "'Rubik',sans-serif", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? .7 : 1, boxShadow: "0 6px 18px rgba(8,99,186,.22)" }}>
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  );
}
