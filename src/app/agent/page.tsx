"use client";

// ============================================================
// NABD - نبض | بوابة الوكيل — قراءة فقط عبر كود الإحالة
// Route: /agent
// ============================================================

import { useState, useEffect, useCallback } from "react";

type ClinicRow = { name: string; owner: string; plan: string; status: string; created_at: string };
type PortalData = {
  agent: { name: string; code: string; commission_pct: number };
  stats: { total: number; active: number; est_monthly: number };
  clinics: ClinicRow[];
};

const PLAN_AR: Record<string, string> = {
  basic: "الأساسية", pro: "الاحترافية", enterprise: "الشاملة",
  shared_basic: "مشتركة أساسية", shared_pro: "مشتركة احترافية", shared_enterprise: "مشتركة شاملة",
  pharmacy: "صيدلية", lab: "مخبر",
};

export default function AgentPortalPage() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchData = useCallback(async (c: string) => {
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/agent-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const json = (await res.json()) as PortalData & { ok?: boolean; error?: string };
      if (json.ok) {
        setData(json);
        try { sessionStorage.setItem("nabd_agent_code", c); } catch { /* ignore */ }
      } else {
        setErr(json.error === "not_found" ? "الكود غير صحيح أو الوكيل موقوف." : "حدث خطأ، حاول مجدداً.");
      }
    } catch { setErr("تعذّر الاتصال. تحقق من الإنترنت."); }
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("nabd_agent_code");
      if (saved) { setCode(saved); void fetchData(saved); }
    } catch { /* ignore */ }
  }, [fetchData]);

  function logout() {
    try { sessionStorage.removeItem("nabd_agent_code"); } catch { /* ignore */ }
    setData(null); setCode("");
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#f4f8fd", fontFamily: "'Rubik',sans-serif", padding: "0 16px 60px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800&display=swap');`}</style>

      {/* الرأس */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "34px 0 26px", textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0863ba" }}>نبض</div>
        <div style={{ fontSize: 13, color: "#8a94a3", marginTop: 4 }}>بوابة الوكلاء</div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {!data ? (
          /* ── الدخول بالكود ── */
          <div style={{ background: "#fff", border: "1px solid #e6eef8", borderRadius: 20, padding: "34px 28px", maxWidth: 420, margin: "0 auto", boxShadow: "0 10px 40px rgba(8,99,186,.07)" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "#2c3e50", textAlign: "center" }}>أدخل كود الإحالة</h1>
            <p style={{ margin: "0 0 22px", fontSize: 13, color: "#8a94a3", textAlign: "center", lineHeight: 1.8 }}>
              الكود الذي حصلت عليه من إدارة نبض لعرض عياداتك وعمولتك
            </p>
            <input
              dir="ltr"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter" && code.trim()) void fetchData(code.trim()); }}
              placeholder="XXXX-XXXX"
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 16px", borderRadius: 12, border: "1.5px solid #dbe4ef", fontFamily: "monospace", fontSize: 17, fontWeight: 700, textAlign: "center", letterSpacing: 2, color: "#0863ba", background: "#fbfdff", outline: "none", marginBottom: 14 }}
            />
            {err && <div style={{ marginBottom: 14, fontSize: 13, color: "#c0392b", textAlign: "center" }}>{err}</div>}
            <button
              onClick={() => code.trim() && fetchData(code.trim())}
              disabled={loading || !code.trim()}
              style={{ width: "100%", background: "linear-gradient(135deg,#0863ba,#5694cf)", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontFamily: "'Rubik',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? .7 : 1 }}
            >
              {loading ? "جارٍ التحقق..." : "عرض لوحتي"}
            </button>
          </div>
        ) : (
          /* ── اللوحة ── */
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#2c3e50" }}>أهلاً، {data.agent.name} 👋</h1>
                <div style={{ fontSize: 12.5, color: "#8a94a3", marginTop: 4 }}>
                  كودك: <span dir="ltr" style={{ fontFamily: "monospace", fontWeight: 700, color: "#0863ba" }}>{data.agent.code}</span> • عمولتك {data.agent.commission_pct}%
                </div>
              </div>
              <button onClick={logout} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 18px", fontFamily: "'Rubik',sans-serif", fontSize: 12.5, color: "#7d8896", cursor: "pointer" }}>
                خروج
              </button>
            </div>

            {/* الإحصائيات */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
              {[
                { label: "إجمالي عياداتك", value: String(data.stats.total), color: "#0863ba" },
                { label: "النشطة حالياً", value: String(data.stats.active), color: "#2e7d32" },
                { label: "عمولتك التقديرية/شهر", value: `$${data.stats.est_monthly}`, color: "#7b2d8b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e6eef8", borderRadius: 16, padding: "20px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#8a94a3", marginTop: 6 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* العيادات */}
            <div style={{ background: "#fff", border: "1px solid #e6eef8", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f7", fontSize: 14.5, fontWeight: 800, color: "#2c3e50" }}>
                🏥 العيادات المسجّلة باسمك
              </div>
              {data.clinics.length === 0 ? (
                <div style={{ padding: "44px 20px", textAlign: "center", color: "#8a94a3", fontSize: 13.5 }}>
                  لا عيادات مسجّلة بعد — عند اشتراك أول عيادة عبرك ستظهر هنا
                </div>
              ) : (
                data.clinics.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: i < data.clinics.length - 1 ? "1px solid #f4f7fb" : "none", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 180px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#2c3e50" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#8a94a3" }}>{c.owner} • {PLAN_AR[c.plan] ?? c.plan} • انضمت {fmtDate(c.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: "4px 14px", background: c.status === "active" ? "rgba(46,125,50,.1)" : "rgba(230,126,34,.1)", color: c.status === "active" ? "#2e7d32" : "#c96a12" }}>
                      {c.status === "active" ? "نشطة" : "موقوفة"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <p style={{ fontSize: 11.5, color: "#a8b2bf", textAlign: "center", marginTop: 22, lineHeight: 1.8 }}>
              العمولة التقديرية تُحسب من العيادات النشطة × نسبتك، والتسوية النهائية مع إدارة نبض.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
