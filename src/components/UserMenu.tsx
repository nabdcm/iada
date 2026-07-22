"use client";

// ============================================================
// UserMenu — زر المستخدم (User) + قائمة "حسابي"
// desktop: قائمة منسدلة أسفل الأيقونة
// mobile: شيت ينزلق من الأسفل
// ============================================================

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const BRAND = { primary: "#0863ba", primaryLight: "#3d8fd6", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", sky: "#eaf3fc" };

type Props = { lang?: "ar" | "en"; variant?: "light" | "dark"; isMobile?: boolean };

const T = {
  ar: {
    account: "حسابي", profile: "الملف الشخصي", password: "كلمة السر",
    clinic: "إدارة العيادة", prefs: "التفضيلات", signOut: "تسجيل الخروج",
  },
  en: {
    account: "My Account", profile: "Profile", password: "Password",
    clinic: "Clinic", prefs: "Preferences", signOut: "Sign Out",
  },
};

const ITEMS = (t: typeof T["ar"]) => [
  { icon: "👤", label: t.profile, href: "/account?t=profile" },
  { icon: "🔑", label: t.password, href: "/account?t=password" },
  { icon: "🏥", label: t.clinic, href: "/clinic-management" },
  { icon: "⚙️", label: t.prefs, href: "/account?t=prefs" },
];

export default function UserMenu({ lang = "ar", variant = "light", isMobile = false }: Props) {
  const t = T[lang];
  const isAr = lang === "ar";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: clinic } = await supabase.from("clinics").select("owner, name").eq("user_id", user.id).maybeSingle();
      setName((clinic?.owner as string) || (clinic?.name as string) || (user.email ?? "").split("@")[0]);
    })();
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isMobile]);

  const initial = (name || "؟").charAt(0).toUpperCase();
  const btnBorder = variant === "light" ? "rgba(255,255,255,.35)" : BRAND.border;
  const btnBg = variant === "light" ? "rgba(255,255,255,.16)" : "#fff";
  const btnColor = variant === "light" ? "#fff" : BRAND.primary;

  const UserIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );

  const MenuList = (
    <>
      <a href="/account" onClick={() => setOpen(false)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderBottom: `1px solid ${BRAND.border}` }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, flexShrink: 0 }}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontSize: 11.5, color: BRAND.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} dir="ltr">{email}</div>
        </div>
      </a>
      <div style={{ padding: 6 }}>
        {ITEMS(t).map(it => (
          <a key={it.label} href={it.href} onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, textDecoration: "none", color: BRAND.ink, fontSize: 13.5, fontWeight: 600, fontFamily: "'Rubik',sans-serif" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = BRAND.sky}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = "transparent"}>
            <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{it.icon}</span>{it.label}
          </a>
        ))}
      </div>
      <div style={{ padding: 6, borderTop: `1px solid ${BRAND.border}` }}>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", color: "#c0392b", fontSize: 13.5, fontWeight: 700, fontFamily: "'Rubik',sans-serif", textAlign: "start" }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(192,57,43,.06)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
          <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>🚪</span>{t.signOut}
        </button>
      </div>
    </>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={t.account}
        style={{
          width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: "50%",
          background: btnBg, border: `1.5px solid ${btnBorder}`, color: btnColor,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {UserIcon}
      </button>

      {/* DESKTOP dropdown */}
      {open && !isMobile && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", insetInlineEnd: 0,
          width: 260, background: "#fff", borderRadius: 16, border: `1px solid ${BRAND.border}`,
          boxShadow: "0 18px 50px rgba(15,40,80,.2)", zIndex: 200, overflow: "hidden",
          direction: isAr ? "rtl" : "ltr",
        }}>
          {MenuList}
        </div>
      )}

      {/* MOBILE sheet */}
      {open && isMobile && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 998 }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: "#fff", borderRadius: "20px 20px 0 0", zIndex: 999,
            paddingBottom: "calc(16px + env(safe-area-inset-bottom,0px))",
            boxShadow: "0 -8px 32px rgba(15,40,80,.25)", direction: isAr ? "rtl" : "ltr",
            animation: "userSheetUp .28s ease",
          }}>
            <style>{`@keyframes userSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "#d5dce6" }} />
            </div>
            {MenuList}
          </div>
        </>
      )}
    </div>
  );
}
