"use client";

// ============================================================
// DemoBanner — شريط علوي يظهر فقط في وضع التجربة
// ============================================================

import { useEffect, useState } from "react";
import { isDemoActive, exitDemo } from "@/lib/demo";

const WA_LINK = "https://wa.me/963998285483";

export default function DemoBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => { setShow(isDemoActive()); }, []);

  if (!show) return null;

  return (
    <div dir="rtl" style={{
      position: "sticky", top: 0, zIndex: 9999,
      background: "linear-gradient(90deg,#0863ba,#5694cf)",
      color: "#fff", padding: "8px 14px",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 12, flexWrap: "wrap",
      fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 600,
    }}>
      <span>🧪 أنت في وضع التجربة — البيانات وهمية ولن تُحفظ</span>
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" style={{
        background: "#25D366", color: "#fff", textDecoration: "none",
        padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
      }}>
        اشترك الآن 💬
      </a>
      <button onClick={exitDemo} style={{
        background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.4)",
        padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
      }}>
        خروج من التجربة
      </button>
    </div>
  );
}
