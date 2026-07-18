"use client";
import AppIcon from "@/components/AppIcon";
import React from "react";

// ═══════════════════════════════════════════════════════════════
// أيقونات SVG موحّدة (stroke-based، خط 1.8) — احترافية على كل الأحجام
// ═══════════════════════════════════════════════════════════════
type IconProps = { size?: number; className?: string };
const S = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const Icons = {
  inventory: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>),
  prescriptions: ({ size = 22 }: IconProps) => (<svg {...S(size)}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>),
  sales: ({ size = 22 }: IconProps) => (<svg {...S(size)}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 001.5 1.2h8.2a1.5 1.5 0 001.5-1.2L22 7H6"/></svg>),
  suppliers: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M3 9l1-5h16l1 5M4 9v11h16V9M9 13h6"/></svg>),
  reorder: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M21 12a9 9 0 11-3-6.7M21 4v4h-4"/></svg>),
  reports: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/></svg>),
  alerts: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M12 3a6 6 0 00-6 6c0 5-2.5 6-2.5 6h17S18 14 18 9a6 6 0 00-6-6zM10.5 20a2 2 0 003 0"/></svg>),
  scan: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8" strokeWidth="1.5"/></svg>),
  camera: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M3 8a2 2 0 012-2h2l1.5-2h7L18 6h1a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/><circle cx="12" cy="12.5" r="3.2"/></svg>),
  logout: ({ size = 20 }: IconProps) => (<svg {...S(size)}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>),
  menu: ({ size = 22 }: IconProps) => (<svg {...S(size)}><path d="M4 6h16M4 12h16M4 18h16"/></svg>),
  plus: ({ size = 20 }: IconProps) => (<svg {...S(size)}><path d="M12 5v14M5 12h14"/></svg>),
  edit: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>),
  trash: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>),
  stockIn: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M12 3v10M8 9l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>),
  stockOut: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M12 13V3M8 7l4-4 4 4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>),
  log: ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>),
  search: ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>),
  close: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M18 6L6 18M6 6l12 12"/></svg>),
  print: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="7"/></svg>),
  filter: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M4 5h16M7 12h10M10 19h4"/></svg>),
  box: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>),
  cart: ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 001.5 1.2h8.2a1.5 1.5 0 001.5-1.2L22 7H6"/></svg>),
  cash: ({ size = 18 }: IconProps) => (<svg {...S(size)}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5h.01M18.5 14.5h.01"/></svg>),
  card: ({ size = 18 }: IconProps) => (<svg {...S(size)}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>),
  shield: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M12 3l8 3v6c0 4.6-3.2 7.8-8 9-4.8-1.2-8-4.4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>),
  receipt: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22V2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>),
  undo: ({ size = 18 }: IconProps) => (<svg {...S(size)}><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>),
  money: ({ size = 18 }: IconProps) => (<svg {...S(size)}><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 .9-3 2.2c0 2.9 6 1.7 6 4.6 0 1.3-1.3 2.2-3 2.2s-3-1.1-3-2.5"/></svg>),
};

export type TabKey = "inventory" | "prescriptions" | "sales" | "suppliers" | "reorder" | "reports" | "alerts";

export const TAB_META: Record<TabKey, { ar: string; en: string; Icon: (p: IconProps) => React.JSX.Element }> = {
  inventory:     { ar: "المخزون",     en: "Inventory",  Icon: Icons.inventory },
  sales:         { ar: "البيع",        en: "Sales",      Icon: Icons.sales },
  prescriptions: { ar: "الوصفات",     en: "Rx",         Icon: Icons.prescriptions },
  reorder:       { ar: "إعادة الطلب", en: "Reorder",    Icon: Icons.reorder },
  suppliers:     { ar: "الموردون",    en: "Suppliers",  Icon: Icons.suppliers },
  reports:       { ar: "التقارير",    en: "Reports",    Icon: Icons.reports },
  alerts:        { ar: "التنبيهات",   en: "Alerts",     Icon: Icons.alerts },
};

// ترتيب أولوية عرض التبويبات في شريط الموبايل (الأهم أولاً؛ الباقي في "المزيد")
const MOBILE_PRIMARY: TabKey[] = ["inventory", "sales", "prescriptions", "alerts"];

// ═══════════════════════════════════════════════════════════════
// Sidebar (سطح المكتب)
// ═══════════════════════════════════════════════════════════════
export function DesktopSidebar({
  tabs, active, onSelect, badges, isAr,
}: {
  tabs: TabKey[]; active: string; onSelect: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>; isAr: boolean;
}) {
  return (
    <aside className="nabd-sidebar" style={{
      position: "fixed", insetInlineStart: 0, top: 0, bottom: 0, width: 236, zIndex: 40,
      background: "#fff", borderInlineEnd: "1px solid #eef0f3", padding: "18px 14px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "6px 8px 18px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "linear-gradient(135deg,#0863ba,#1a8fe3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 6px 16px rgba(8,99,186,.28)", flexShrink: 0 }}><AppIcon glyph="💊" /></div>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "#1a2840", letterSpacing: "-.3px" }}>{isAr ? "صيدلية نبض" : "NABD Rx"}</div>
          <div style={{ fontSize: 10, color: "#9aa2ab", fontWeight: 500 }}>{isAr ? "نظام إدارة متكامل" : "Pharmacy System"}</div>
        </div>
      </div>
      {tabs.map((k) => {
        const meta = TAB_META[k]; const on = active === k; const badge = badges[k];
        return (
          <button key={k} onClick={() => onSelect(k)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12,
            border: "none", cursor: "pointer", fontFamily: "'Rubik',sans-serif", fontSize: 13.5, fontWeight: on ? 700 : 600,
            background: on ? "linear-gradient(135deg,#0863ba,#0a63bf)" : "transparent",
            color: on ? "#fff" : "#5a6472", position: "relative", transition: "all .18s",
            boxShadow: on ? "0 6px 16px rgba(8,99,186,.26)" : "none",
          }}
          onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "#f2f6fb"; }}
          onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <meta.Icon size={21} />
            <span style={{ flex: 1, textAlign: isAr ? "right" : "left" }}>{isAr ? meta.ar : meta.en}</span>
            {badge ? <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: on ? "rgba(255,255,255,.25)" : "#e74c3c", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
          </button>
        );
      })}
      <div style={{ marginTop: "auto", padding: "12px 8px 4px", borderTop: "1px solid #f0f2f5", fontSize: 10, color: "#c2c8d0", textAlign: "center" }}>
        {isAr ? "نبض · نظام الصيدلة" : "NABD Pharmacy"}
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// Pill Navigation Bar (الموبايل) — مع زر مسح مركزي بارز
// ═══════════════════════════════════════════════════════════════
export function MobilePillNav({
  tabs, active, onSelect, badges, isAr, onScan, onMore,
}: {
  tabs: TabKey[]; active: string; onSelect: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>; isAr: boolean; onScan: () => void; onMore: () => void;
}) {
  // التبويبات الأساسية المتاحة لهذا الدور (بحد أقصى 4، اثنان يمين واثنان يسار الزر المركزي)
  const primaryTabs = MOBILE_PRIMARY.filter((t) => tabs.includes(t)).slice(0, 4);
  const left = primaryTabs.slice(0, 2);
  const right = primaryTabs.slice(2, 4);
  const hasMore = tabs.some((t) => !primaryTabs.includes(t));

  const NavBtn = ({ k }: { k: TabKey }) => {
    const meta = TAB_META[k]; const on = active === k; const badge = badges[k];
    return (
      <button onClick={() => onSelect(k)} style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        border: "none", background: "none", cursor: "pointer", padding: "6px 2px",
        color: on ? "#0863ba" : "#9aa2ab", position: "relative", transition: "color .15s",
      }}>
        <div style={{ position: "relative" }}>
          <meta.Icon size={23} />
          {badge ? <span style={{ position: "absolute", top: -5, insetInlineEnd: -8, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 8, background: "#e74c3c", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
        </div>
        <span style={{ fontSize: 10, fontWeight: on ? 700 : 600 }}>{isAr ? meta.ar : meta.en}</span>
        {on && <span style={{ position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: "50%", background: "#0863ba" }} />}
      </button>
    );
  };

  return (
    <nav className="nabd-pillnav" style={{
      position: "fixed", insetInline: 12, bottom: 12, zIndex: 120, height: 66,
      background: "rgba(255,255,255,.86)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      borderRadius: 22, boxShadow: "0 10px 34px rgba(16,42,80,.16), 0 2px 8px rgba(16,42,80,.08)",
      border: "1px solid rgba(255,255,255,.7)", display: "flex", alignItems: "center", padding: "0 8px",
    }}>
      {left.map((k) => <NavBtn key={k} k={k} />)}

      {/* زر المسح المركزي البارز */}
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(-18px)", margin: "0 4px" }}>
        <button onClick={onScan} aria-label={isAr ? "مسح الباركود" : "Scan"} style={{
          width: 58, height: 58, borderRadius: "50%", border: "4px solid #f7f9fc",
          background: "linear-gradient(135deg,#0863ba,#0a56a0)", color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 22px rgba(8,99,186,.5)",
        }}>
          <Icons.scan size={27} />
        </button>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#0863ba", marginTop: 1 }}>{isAr ? "مسح" : "Scan"}</span>
      </div>

      {right.map((k) => <NavBtn key={k} k={k} />)}
      {hasMore && right.length < 2 && (
        <button onClick={onMore} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, border: "none", background: "none", cursor: "pointer", padding: "6px 2px", color: "#9aa2ab" }}>
          <Icons.menu size={23} /><span style={{ fontSize: 10, fontWeight: 600 }}>{isAr ? "المزيد" : "More"}</span>
        </button>
      )}
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════
// ورقة "المزيد" (الموبايل) — بقية التبويبات غير الظاهرة في الـ pill
// ═══════════════════════════════════════════════════════════════
export function MoreSheet({
  tabs, active, onSelect, badges, isAr, onClose,
}: {
  tabs: TabKey[]; active: string; onSelect: (t: TabKey) => void;
  badges: Partial<Record<TabKey, number>>; isAr: boolean; onClose: () => void;
}) {
  const extra = tabs.filter((t) => !MOBILE_PRIMARY.slice(0, 4).includes(t));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(16,42,80,.35)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", background: "#fff", borderRadius: "24px 24px 0 0", padding: "20px 16px calc(24px + env(safe-area-inset-bottom))", boxShadow: "0 -10px 40px rgba(0,0,0,.2)", animation: "sheetUp .28s ease" }}>
        <div style={{ width: 40, height: 4, borderRadius: 3, background: "#e0e7ef", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 13, fontWeight: 800, color: "#1a2840", marginBottom: 12, textAlign: isAr ? "right" : "left" }}>{isAr ? "المزيد" : "More"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {extra.map((k) => {
            const meta = TAB_META[k]; const on = active === k; const badge = badges[k];
            return (
              <button key={k} onClick={() => { onSelect(k); onClose(); }} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "16px 8px", borderRadius: 15,
                border: `1.5px solid ${on ? "#0863ba" : "#eef0f3"}`, background: on ? "rgba(8,99,186,.06)" : "#fff",
                cursor: "pointer", color: on ? "#0863ba" : "#5a6472", position: "relative", fontFamily: "'Rubik',sans-serif",
              }}>
                <meta.Icon size={24} />
                <span style={{ fontSize: 11.5, fontWeight: 700 }}>{isAr ? meta.ar : meta.en}</span>
                {badge ? <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, minWidth: 17, height: 17, padding: "0 5px", borderRadius: 9, background: "#e74c3c", color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
