"use client";
import React from "react";

// ═══════════════════════════════════════════════════════════════
// nav.tsx — نبض مخبر: القائمة الجانبية + شريط الموبايل (Pill)
// نفس روح تصميم نبض: أبيض/أزرق #0863ba، أيقونات stroke
// ═══════════════════════════════════════════════════════════════
type IconProps = { size?: number };
const S = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const Icons = {
  dashboard: ({ size = 22 }: IconProps) => (<svg {...S(size)}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  orders:    ({ size = 22 }: IconProps) => (<svg {...S(size)}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>),
  flask:     ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M9 3h6M10 3v6l-5.2 8.7A2 2 0 006.5 21h11a2 2 0 001.7-3.3L14 9V3"/><path d="M7.5 15h9"/></svg>),
  finance:   ({ size = 22 }: IconProps) => (<svg {...S(size)}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5h.01M18.5 14.5h.01"/></svg>),
  catalog:   ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>),
  plus:      ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M12 5v14M5 12h14"/></svg>),
  qr:        ({ size = 20 }: IconProps) => (<svg {...S(size)}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M18 18h3v3h-3z"/></svg>),
  print:     ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>),
  whatsapp:  ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M21 11.5a8.5 8.5 0 01-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1121 11.5z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1-1.5 2.5 1"/></svg>),
  edit:      ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>),
  trash:     ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>),
  search:    ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>),
  logout:    ({ size = 20 }: IconProps) => (<svg {...S(size)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>),
  menu:      ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M4 6h16M4 12h16M4 18h16"/></svg>),
  scan:      ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><rect x="8" y="8" width="8" height="8" rx="1.5" strokeWidth="1.6"/></svg>),
  money:     ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 .9-3 2.2c0 2.9 6 1.7 6 4.6 0 1.3-1.3 2.2-3 2.2s-3-1.1-3-2.5"/></svg>),
  doc:       ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>),
  clock:     ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>),
  check:     ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/></svg>),
};

export type TabKey = "dashboard" | "orders" | "finance" | "catalog";

export const TAB_META: Record<TabKey, { ar: string; Icon: (p: IconProps) => React.JSX.Element }> = {
  dashboard: { ar: "الرئيسية", Icon: Icons.dashboard },
  orders:    { ar: "الطلبات",  Icon: Icons.orders },
  finance:   { ar: "المالية",  Icon: Icons.finance },
  catalog:   { ar: "الكتالوج", Icon: Icons.catalog },
};

const TABS: TabKey[] = ["dashboard", "orders", "finance", "catalog"];

// ═══ Sidebar (سطح المكتب) ═══
export function LabSidebar({ active, onSelect, badges, labName, onNew, onScan, onLogout }: {
  active: TabKey; onSelect: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>; labName: string;
  onNew: () => void; onScan: () => void; onLogout: () => void;
}) {
  return (
    <aside className="lab-sidebar" style={{
      position: "fixed", insetInlineStart: 0, top: 0, bottom: 0, width: 236, zIndex: 40,
      background: "#fff", borderInlineEnd: "1px solid #e6edf5", padding: "18px 14px",
      flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "6px 8px 16px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(135deg,#0863ba,#1a8fe3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 6px 16px rgba(8,99,186,.28)", flexShrink: 0 }}>
          <Icons.flask size={21} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1c2b3a", letterSpacing: "-.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{labName}</div>
          <div style={{ fontSize: 10, color: "#8a97a6", fontWeight: 500 }}>نبض مخبر</div>
        </div>
      </div>

      <button onClick={onNew} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px",
        borderRadius: 13, border: "none", cursor: "pointer", fontFamily: "'Rubik',sans-serif",
        fontSize: 13.5, fontWeight: 800, marginBottom: 10,
        background: "linear-gradient(135deg,#0863ba,#0a63bf)", color: "#fff",
        boxShadow: "0 6px 16px rgba(8,99,186,.3)",
      }}>
        <Icons.plus size={19} /> طلب تحاليل جديد
      </button>

      <button onClick={onScan} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px",
        borderRadius: 13, border: "1.5px solid #e6edf5", cursor: "pointer", fontFamily: "'Rubik',sans-serif",
        fontSize: 13, fontWeight: 800, marginBottom: 10, background: "#fff", color: "#0863ba",
      }}>
        <Icons.scan size={18} /> مسح ملصق عينة
      </button>

      {TABS.map((k) => {
        const meta = TAB_META[k]; const on = active === k; const badge = badges[k];
        return (
          <button key={k} onClick={() => onSelect(k)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12,
            border: "none", cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: on ? 700 : 600,
            background: on ? "linear-gradient(135deg,#0863ba,#0a63bf)" : "transparent",
            color: on ? "#fff" : "#5a6472", transition: "all .18s",
            boxShadow: on ? "0 6px 16px rgba(8,99,186,.26)" : "none",
          }}
            onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "#f2f6fb"; }}
            onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <meta.Icon size={21} />
            <span style={{ flex: 1, textAlign: "right" }}>{meta.ar}</span>
            {badge ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: on ? "rgba(255,255,255,.25)" : "#e74c3c", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
          </button>
        );
      })}

      <button onClick={onLogout} style={{
        marginTop: "auto", display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
        borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "'Rubik',sans-serif",
        fontSize: 13, fontWeight: 600, background: "transparent", color: "#c0392b",
      }}>
        <Icons.logout size={19} /> تسجيل الخروج
      </button>
      <div style={{ padding: "10px 8px 2px", borderTop: "1px solid #f0f2f5", fontSize: 10, color: "#c2c8d0", textAlign: "center" }}>
        نبض · نظام المخابر
      </div>
    </aside>
  );
}

// ═══ Pill Nav (الموبايل) — زر مركزي "طلب جديد" ═══
export function LabPillNav({ active, onSelect, badges, onNew, onScan }: {
  active: TabKey; onSelect: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>; onNew: () => void; onScan: () => void;
}) {
  const left: TabKey[] = ["dashboard", "orders"];
  const right: TabKey[] = ["finance", "catalog"];

  const NavBtn = ({ k }: { k: TabKey }) => {
    const meta = TAB_META[k]; const on = active === k; const badge = badges[k];
    return (
      <button onClick={() => onSelect(k)} style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        border: "none", background: "none", cursor: "pointer", padding: "6px 2px",
        color: on ? "#0863ba" : "#9aa2ab", position: "relative", transition: "color .15s",
        fontFamily: "'Rubik',sans-serif",
      }}>
        <div style={{ position: "relative" }}>
          <meta.Icon size={23} />
          {badge ? <span style={{ position: "absolute", top: -5, insetInlineEnd: -8, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 8, background: "#e74c3c", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
        </div>
        <span style={{ fontSize: 10, fontWeight: on ? 700 : 600 }}>{meta.ar}</span>
        {on && <span style={{ position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: "50%", background: "#0863ba" }} />}
      </button>
    );
  };

  return (
    <nav className="lab-pillnav" style={{
      position: "fixed", insetInline: 12, bottom: 12, zIndex: 120, height: 66,
      background: "rgba(255,255,255,.88)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      borderRadius: 22, boxShadow: "0 10px 34px rgba(16,42,80,.16), 0 2px 8px rgba(16,42,80,.08)",
      border: "1px solid rgba(255,255,255,.7)", alignItems: "center", padding: "0 8px",
    }}>
      {left.map((k) => <NavBtn key={k} k={k} />)}
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(-18px)", margin: "0 4px" }}>
        <button onClick={onNew} aria-label="طلب جديد" style={{
          width: 58, height: 58, borderRadius: "50%", border: "4px solid #f4f8fc",
          background: "linear-gradient(135deg,#0863ba,#0a56a0)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 22px rgba(8,99,186,.5)",
        }}>
          <Icons.plus size={27} />
        </button>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#0863ba", marginTop: 1, fontFamily: "'Rubik',sans-serif" }}>طلب جديد</span>
      </div>
      {right.map((k) => <NavBtn key={k} k={k} />)}
      <button onClick={onScan} aria-label="مسح" style={{
        flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        border: "none", background: "none", cursor: "pointer", padding: "6px 6px",
        color: "#9aa2ab", fontFamily: "'Rubik',sans-serif",
      }}>
        <Icons.scan size={23} />
        <span style={{ fontSize: 10, fontWeight: 600 }}>مسح</span>
      </button>
    </nav>
  );
}
