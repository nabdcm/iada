"use client";
// ============================================================
// NABD LAB — نبض مخبر | نظام إدارة المخابر الطبية
// طلبات · إدخال نتائج سهل ودقيق · PDF/واتساب · كتالوج · تقارير
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────
type CatalogTest = {
  id: number;
  user_id: string | null;
  name_ar: string;
  name_en: string | null;
  category: string;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  price: number;
};

type ResultRow = {
  catalog_id: number | null;
  test_name: string;
  test_name_en?: string | null;
  value: string;
  unit?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_text?: string | null;
};

type LabOrder = {
  id: number;
  share_token: string;
  mrn: string | null;
  patient_name: string;
  patient_phone: string | null;
  patient_gender: string | null;
  patient_age: string | null;
  referring_doctor: string | null;
  status: "pending" | "completed";
  sample_date: string | null;
  result_date: string | null;
  results: ResultRow[];
  price: number;
  paid: number;
  notes: string | null;
  created_at: string;
};

type Tab = "orders" | "new" | "catalog" | "reports";

const CATS: Record<string, { ar: string; icon: string }> = {
  hematology: { ar: "دمويات", icon: "🩸" },
  chemistry:  { ar: "كيمياء", icon: "⚗️" },
  lipids:     { ar: "شحوم", icon: "🫀" },
  liver:      { ar: "كبد", icon: "🟤" },
  hormones:   { ar: "هرمونات", icon: "🧬" },
  vitamins:   { ar: "فيتامينات", icon: "💊" },
  immunology: { ar: "مناعة", icon: "🛡️" },
  urine:      { ar: "بول", icon: "🧪" },
  general:    { ar: "عام", icon: "🔬" },
};
const catLabel = (c: string) => CATS[c]?.ar ?? c;
const catIcon  = (c: string) => CATS[c]?.icon ?? "🔬";

const flagOf = (r: ResultRow): "high" | "low" | "normal" | "empty" => {
  if (!r.value.trim()) return "empty";
  const v = parseFloat(r.value);
  if (!isNaN(v)) {
    if (r.ref_high != null && v > r.ref_high) return "high";
    if (r.ref_low != null && v < r.ref_low) return "low";
  }
  return "normal";
};

// ── Main page ────────────────────────────────────────────────
export default function LabPage() {
  const [loading, setLoading]   = useState(true);
  const [labName, setLabName]   = useState("المخبر");
  const [tab, setTab]           = useState<Tab>("orders");
  const [orders, setOrders]     = useState<LabOrder[]>([]);
  const [catalog, setCatalog]   = useState<CatalogTest[]>([]);
  const [notif, setNotif]       = useState<{ msg: string; ok: boolean } | null>(null);

  const showNotif = useCallback((msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 2600);
  }, []);

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    return fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [oRes, cRes] = await Promise.all([
        apiFetch("/api/lab/orders"),
        apiFetch("/api/lab/catalog"),
      ]);
      if (oRes.ok) setOrders(await oRes.json());
      if (cRes.ok) setCatalog(await cRes.json());
    } catch { showNotif("فشل تحميل البيانات", false); }
    setLoading(false);
  }, [apiFetch, showNotif]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return; }
      const meta = session.user.user_metadata as Record<string, string | undefined>;
      setLabName(meta?.clinic_name || meta?.owner_name || "المخبر");
      loadAll();
    });
  }, [loadAll]);

  // ── Orders state ───────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<"all" | "pending" | "completed" | "unpaid">("all");
  const [resultsOrder, setResultsOrder] = useState<LabOrder | null>(null); // modal إدخال النتائج
  const [shareOrder, setShareOrder]     = useState<LabOrder | null>(null); // modal مشاركة

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (q && !o.patient_name.toLowerCase().includes(q)
        && !(o.patient_phone ?? "").includes(q)
        && !(o.mrn ?? "").toLowerCase().includes(q)) return false;
      if (filter === "pending"   && o.status !== "pending")   return false;
      if (filter === "completed" && o.status !== "completed") return false;
      if (filter === "unpaid"    && o.paid >= o.price)        return false;
      return true;
    });
  }, [orders, search, filter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    return {
      today:     orders.filter(o => (o.created_at ?? "").slice(0, 10) === today).length,
      pending:   orders.filter(o => o.status === "pending").length,
      monthRev:  orders.filter(o => (o.created_at ?? "").slice(0, 7) === month).reduce((s, o) => s + Number(o.paid || 0), 0),
      unpaid:    orders.reduce((s, o) => s + Math.max(0, Number(o.price || 0) - Number(o.paid || 0)), 0),
    };
  }, [orders]);

  // ── حفظ نتائج طلب ─────────────────────────────────────────
  const saveOrder = async (id: number, payload: Partial<LabOrder>) => {
    const res = await apiFetch("/api/lab/orders", {
      method: "POST",
      body: JSON.stringify({ action: "update", id, ...payload }),
    });
    if (res.ok) {
      const { order } = await res.json();
      setOrders(prev => prev.map(o => (o.id === id ? order : o)));
      return order as LabOrder;
    }
    showNotif("فشل الحفظ", false);
    return null;
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
    const res = await apiFetch("/api/lab/orders", { method: "POST", body: JSON.stringify({ action: "delete", id }) });
    if (res.ok) { setOrders(prev => prev.filter(o => o.id !== id)); showNotif("تم الحذف"); }
    else showNotif("فشل الحذف", false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f9fc", fontFamily: "'Rubik',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e0e0e0", borderTopColor: "#f5a623", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#aaa" }}>جاري التحميل...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const tabs: [Tab, string, number | null][] = [
    ["orders",  "📋 الطلبات", stats.pending > 0 ? stats.pending : null],
    ["new",     "➕ طلب جديد", null],
    ["catalog", "🧪 كتالوج التحاليل", null],
    ["reports", "📊 التقارير", null],
  ];

  return (
    <div dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .lab-inp{width:100%;padding:11px 14px;border:1.5px solid #e3e9f0;border-radius:11px;font-family:'Rubik',sans-serif;font-size:13px;background:#fff;outline:none;transition:border .15s}
        .lab-inp:focus{border-color:#f5a623}
        .lab-lbl{font-size:11px;font-weight:700;color:#5a6a7a;display:block;margin-bottom:6px}
        .lab-btn{padding:12px 22px;border:none;border-radius:12px;font-family:'Rubik',sans-serif;font-size:13px;font-weight:800;cursor:pointer}
        .lab-btn-p{background:linear-gradient(135deg,#f5a623,#e08c00);color:#fff;box-shadow:0 5px 16px rgba(245,166,35,.35)}
        .lab-btn-s{background:#fff;color:#5a6a7a;border:1.5px solid #e3e9f0}
        .chip{padding:7px 14px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid #e3e9f0;background:#fff;color:#5a6a7a;font-family:'Rubik',sans-serif}
        .chip.on{background:#0b2540;color:#fff;border-color:#0b2540}
        .card{background:#fff;border:1px solid #eef1f5;border-radius:16px;box-shadow:0 2px 10px rgba(20,40,70,.04)}
        .res-inp{width:110px;padding:10px 12px;border:2px solid #e3e9f0;border-radius:10px;font-family:'Rubik',sans-serif;font-size:15px;font-weight:800;text-align:center;outline:none;direction:ltr}
        .res-inp:focus{border-color:#f5a623}
        .res-inp.high{border-color:#e74c3c;color:#c0392b;background:rgba(231,76,60,.05)}
        .res-inp.low{border-color:#3498db;color:#1f6fd6;background:rgba(52,152,219,.05)}
        .res-inp.normal{border-color:#2ecc71;color:#1f8a4c;background:rgba(46,204,113,.05)}
        @media(max-width:640px){.hide-sm{display:none}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: "linear-gradient(135deg,#0b2540,#123a63)", color: "#fff", padding: "18px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(245,166,35,.18)", border: "1px solid rgba(245,166,35,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>🧪</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{labName}</div>
              <div style={{ fontSize: 10, opacity: .7 }}>نبض مخبر — نظام إدارة المخابر الطبية</div>
            </div>
          </div>
          <button
            className="lab-btn"
            style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", padding: "9px 16px", fontSize: 12 }}
            onClick={async () => {
              if (!confirm("تسجيل الخروج من حساب المخبر؟")) return;
              await supabase.auth.signOut();
              document.cookie = "nabd-session=; path=/; max-age=0";
              window.location.href = "/portal?type=lab";
            }}
          >🚪 خروج</button>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 1100, margin: "14px auto 0", display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map(([k, label, badge]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "10px 18px", borderRadius: "12px 12px 0 0", border: "none", cursor: "pointer",
              fontFamily: "'Rubik',sans-serif", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
              background: tab === k ? "#f7f9fc" : "rgba(255,255,255,.08)",
              color: tab === k ? "#0b2540" : "rgba(255,255,255,.85)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              {label}
              {badge != null && <span style={{ background: "#e74c3c", color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 7px" }}>{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 16px 60px" }}>

        {/* ════════ الطلبات ════════ */}
        {tab === "orders" && (
          <div style={{ animation: "fadeUp .3s both" }}>
            {/* stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
              {[
                ["🧪", "طلبات اليوم", String(stats.today), "#f5a623"],
                ["⏳", "بانتظار النتائج", String(stats.pending), "#e67e22"],
                ["💰", "إيراد هذا الشهر", `${stats.monthRev.toLocaleString()}`, "#2ecc71"],
                ["📌", "مبالغ غير محصّلة", `${stats.unpaid.toLocaleString()}`, "#e74c3c"],
              ].map(([ic, lbl, val, col]) => (
                <div key={lbl} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 22 }}>{ic}</div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 900, color: col }}>{val}</div>
                    <div style={{ fontSize: 10, color: "#8296a8", fontWeight: 700 }}>{lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* search + filters */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
              <input className="lab-inp" style={{ maxWidth: 320 }} placeholder="🔍 بحث بالاسم أو الهاتف أو MRN..." value={search} onChange={e => setSearch(e.target.value)} />
              {([["all", "الكل"], ["pending", "⏳ معلّق"], ["completed", "✓ مكتمل"], ["unpaid", "💸 غير مدفوع"]] as const).map(([k, l]) => (
                <button key={k} className={`chip${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="card" style={{ padding: 50, textAlign: "center", color: "#8296a8" }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🧪</div>
                <div style={{ fontWeight: 700 }}>لا توجد طلبات</div>
                <button className="lab-btn lab-btn-p" style={{ marginTop: 16 }} onClick={() => setTab("new")}>➕ طلب جديد</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map(o => {
                  const due = Math.max(0, Number(o.price) - Number(o.paid));
                  const done = o.results.filter(r => r.value.trim()).length;
                  return (
                    <div key={o.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: o.status === "completed" ? "rgba(46,204,113,.12)" : "rgba(245,166,35,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                        {o.status === "completed" ? "✅" : "⏳"}
                      </div>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{o.patient_name}</div>
                        <div style={{ fontSize: 11, color: "#8296a8", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3 }}>
                          {o.mrn && <span style={{ fontWeight: 700, color: "#0b6db8" }}>🆔 {o.mrn}</span>}
                          {o.patient_phone && <span>📞 {o.patient_phone}</span>}
                          <span>📅 {o.sample_date}</span>
                          <span>🧪 {done}/{o.results.length} نتيجة</span>
                        </div>
                      </div>
                      <div className="hide-sm" style={{ textAlign: "center", minWidth: 80 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: due > 0 ? "#e74c3c" : "#1f8a4c" }}>{due > 0 ? `${due.toLocaleString()} 💸` : "مدفوع ✓"}</div>
                        <div style={{ fontSize: 10, color: "#8296a8" }}>الإجمالي {Number(o.price).toLocaleString()}</div>
                      </div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <button className="lab-btn lab-btn-p" style={{ padding: "9px 15px", fontSize: 12 }} onClick={() => setResultsOrder(o)}>
                          {o.status === "completed" ? "📄 النتائج" : "✏️ إدخال النتائج"}
                        </button>
                        {o.status === "completed" && (
                          <button className="lab-btn" style={{ padding: "9px 15px", fontSize: 12, background: "rgba(37,211,102,.12)", color: "#128c4b", border: "1.5px solid rgba(37,211,102,.4)" }} onClick={() => setShareOrder(o)}>
                            💬 مشاركة
                          </button>
                        )}
                        <button className="lab-btn lab-btn-s" style={{ padding: "9px 12px", fontSize: 12, color: "#c0392b" }} onClick={() => deleteOrder(o.id)}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════ طلب جديد ════════ */}
        {tab === "new" && (
          <NewOrderForm
            catalog={catalog}
            onSaved={(order) => {
              setOrders(prev => [order, ...prev]);
              showNotif("✓ تم إنشاء الطلب" + (order.mrn ? ` — MRN: ${order.mrn}` : ""));
              setTab("orders");
              setResultsOrder(order);
            }}
            apiFetch={apiFetch}
            showNotif={showNotif}
          />
        )}

        {/* ════════ الكتالوج ════════ */}
        {tab === "catalog" && (
          <CatalogManager catalog={catalog} setCatalog={setCatalog} apiFetch={apiFetch} showNotif={showNotif} />
        )}

        {/* ════════ التقارير ════════ */}
        {tab === "reports" && <ReportsView orders={orders} />}
      </div>

      {/* ── Modal إدخال النتائج ── */}
      {resultsOrder && (
        <ResultsModal
          order={resultsOrder}
          onClose={() => setResultsOrder(null)}
          onSave={async (results, complete, paid) => {
            const updated = await saveOrder(resultsOrder.id, {
              results,
              paid,
              ...(complete ? { status: "completed" as const } : {}),
            });
            if (updated) {
              showNotif(complete ? "✓ اكتمل الطلب — جاهز للمشاركة" : "✓ تم الحفظ");
              setResultsOrder(null);
              if (complete) setShareOrder(updated);
            }
          }}
        />
      )}

      {/* ── Modal المشاركة ── */}
      {shareOrder && <ShareModal order={shareOrder} labName={labName} onClose={() => setShareOrder(null)} />}

      {/* ── Notification ── */}
      {notif && (
        <div style={{
          position: "fixed", bottom: 24, right: "50%", transform: "translateX(50%)",
          background: notif.ok ? "#0b2540" : "#c0392b", color: "#fff",
          padding: "13px 26px", borderRadius: 30, fontSize: 13, fontWeight: 700,
          boxShadow: "0 10px 30px rgba(0,0,0,.25)", zIndex: 300, fontFamily: "'Rubik',sans-serif",
          animation: "fadeUp .25s both", maxWidth: "90vw",
        }}>{notif.msg}</div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// نموذج طلب جديد — مصمم لسهولة الإدخال ودقته
// ════════════════════════════════════════════════════════════
function NewOrderForm({ catalog, onSaved, apiFetch, showNotif }: {
  catalog: CatalogTest[];
  onSaved: (o: LabOrder) => void;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  showNotif: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [gender, setGender]   = useState<"" | "male" | "female">("");
  const [age, setAge]         = useState("");
  const [doctor, setDoctor]   = useState("");
  const [selected, setSelected] = useState<CatalogTest[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [cat, setCat]         = useState("all");
  const [paid, setPaid]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const cats = useMemo(() => Array.from(new Set(catalog.map(t => t.category))), [catalog]);
  const total = selected.reduce((s, t) => s + Number(t.price || 0), 0);

  const visible = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    return catalog.filter(t => {
      if (cat !== "all" && t.category !== cat) return false;
      if (q && !t.name_ar.toLowerCase().includes(q) && !(t.name_en ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog, testSearch, cat]);

  const toggle = (t: CatalogTest) => {
    setSelected(prev => prev.some(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t]);
  };

  const save = async () => {
    if (!name.trim()) { setErr("اسم المريض مطلوب"); return; }
    if (selected.length === 0) { setErr("اختر تحليلاً واحداً على الأقل"); return; }
    setErr(""); setSaving(true);
    const results: ResultRow[] = selected.map(t => ({
      catalog_id: t.id, test_name: t.name_ar, test_name_en: t.name_en,
      value: "", unit: t.unit, ref_low: t.ref_low, ref_high: t.ref_high, ref_text: t.ref_text,
    }));
    try {
      const res = await apiFetch("/api/lab/orders", {
        method: "POST",
        body: JSON.stringify({
          action: "add",
          patient_name: name.trim(), patient_phone: phone.trim(),
          patient_gender: gender || null, patient_age: age.trim() || null,
          referring_doctor: doctor.trim() || null,
          results, price: total, paid: Number(paid) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      onSaved(order);
    } catch { showNotif("فشل إنشاء الطلب", false); }
    setSaving(false);
  };

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 16 }}>
      {/* بيانات المريض */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 16, color: "#0b2540" }}>👤 بيانات المريض</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <div>
            <label className="lab-lbl">الاسم الكامل *</label>
            <input className="lab-inp" value={name} onChange={e => setName(e.target.value)} placeholder="اسم المريض" />
          </div>
          <div>
            <label className="lab-lbl">رقم الهاتف (لإنشاء MRN وربط النتيجة بالمريض)</label>
            <input className="lab-inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="tel" style={{ direction: "ltr", textAlign: "right" }} />
          </div>
          <div>
            <label className="lab-lbl">العمر</label>
            <input className="lab-inp" value={age} onChange={e => setAge(e.target.value)} placeholder="مثال: 34 سنة" />
          </div>
          <div>
            <label className="lab-lbl">الجنس</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`chip${gender === "male" ? " on" : ""}`} style={{ flex: 1, padding: "11px" }} onClick={() => setGender(gender === "male" ? "" : "male")}>👨 ذكر</button>
              <button className={`chip${gender === "female" ? " on" : ""}`} style={{ flex: 1, padding: "11px" }} onClick={() => setGender(gender === "female" ? "" : "female")}>👩 أنثى</button>
            </div>
          </div>
          <div>
            <label className="lab-lbl">الطبيب المُحيل (اختياري)</label>
            <input className="lab-inp" value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="د. ..." />
          </div>
        </div>
      </div>

      {/* اختيار التحاليل */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#0b2540" }}>🧪 التحاليل المطلوبة</div>
          {selected.length > 0 && (
            <div style={{ fontSize: 12, fontWeight: 800, background: "rgba(245,166,35,.12)", color: "#c47c00", padding: "6px 14px", borderRadius: 20 }}>
              {selected.length} تحليل · الإجمالي {total.toLocaleString()}
            </div>
          )}
        </div>

        <input className="lab-inp" style={{ marginBottom: 10 }} placeholder="🔍 ابحث عن تحليل..." value={testSearch} onChange={e => setTestSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
          <button className={`chip${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>الكل</button>
          {cats.map(c => (
            <button key={c} className={`chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{catIcon(c)} {catLabel(c)}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 9, maxHeight: 320, overflowY: "auto", paddingLeft: 4 }}>
          {visible.map(t => {
            const on = selected.some(x => x.id === t.id);
            return (
              <button key={t.id} onClick={() => toggle(t)} style={{
                textAlign: "right", padding: "11px 14px", borderRadius: 12, cursor: "pointer",
                fontFamily: "'Rubik',sans-serif",
                border: on ? "2px solid #f5a623" : "1.5px solid #e3e9f0",
                background: on ? "rgba(245,166,35,.08)" : "#fff",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#233240" }}>{t.name_ar}</div>
                  <div style={{ fontSize: 10, color: "#8296a8", marginTop: 2 }}>
                    {t.name_en}{Number(t.price) > 0 ? ` · ${Number(t.price).toLocaleString()}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 16 }}>{on ? "✅" : "＋"}</div>
              </button>
            );
          })}
          {visible.length === 0 && <div style={{ color: "#8296a8", fontSize: 12, padding: 20 }}>لا نتائج — أضف التحليل من تبويب الكتالوج</div>}
        </div>
      </div>

      {/* الدفع + حفظ */}
      <div className="card" style={{ padding: 20, display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label className="lab-lbl">💰 المبلغ المدفوع الآن (الإجمالي: {total.toLocaleString()})</label>
          <input className="lab-inp" value={paid} onChange={e => setPaid(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" inputMode="decimal" style={{ direction: "ltr", textAlign: "right" }} />
        </div>
        <button className="lab-btn lab-btn-s" style={{ padding: "12px 16px", fontSize: 12 }} onClick={() => setPaid(String(total))}>دفع كامل ✓</button>
        <button className="lab-btn lab-btn-p" style={{ padding: "13px 34px", fontSize: 14 }} disabled={saving} onClick={save}>
          {saving ? "جارٍ الحفظ..." : "💾 إنشاء الطلب والانتقال لإدخال النتائج"}
        </button>
        {err && <div style={{ width: "100%", color: "#c0392b", fontSize: 12, fontWeight: 700 }}>⚠️ {err}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Modal إدخال النتائج — الأهم: سهل وواضح وبدون أخطاء
// تلوين فوري (مرتفع/منخفض/طبيعي) · Enter للانتقال للحقل التالي
// ════════════════════════════════════════════════════════════
function ResultsModal({ order, onClose, onSave }: {
  order: LabOrder;
  onClose: () => void;
  onSave: (results: ResultRow[], complete: boolean, paid: number) => Promise<void>;
}) {
  const [rows, setRows]   = useState<ResultRow[]>(order.results.map(r => ({ ...r })));
  const [paid, setPaid]   = useState(String(order.paid ?? 0));
  const [saving, setSaving] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const setVal = (i: number, v: string) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, value: v } : r)));
  };

  const filled = rows.filter(r => r.value.trim()).length;
  const allFilled = filled === rows.length && rows.length > 0;

  const doSave = async (complete: boolean) => {
    setSaving(true);
    await onSave(rows, complete, Number(paid) || 0);
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,18,36,.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} style={{
        width: "min(96vw,620px)", maxHeight: "92vh", overflowY: "auto", background: "#fff",
        borderRadius: 20, animation: "modalIn .28s both", fontFamily: "'Rubik',sans-serif",
      }}>
        <div style={{ background: "linear-gradient(135deg,#0b2540,#123a63)", color: "#fff", padding: "16px 22px", position: "sticky", top: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>✏️ نتائج: {order.patient_name}</div>
            <div style={{ fontSize: 10, opacity: .75, marginTop: 2 }}>
              {order.mrn ? `MRN: ${order.mrn} · ` : ""}{filled}/{rows.length} نتيجة مُدخلة
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 9, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {rows.map((r, i) => {
            const f = flagOf(r);
            const ref = r.ref_text
              ? r.ref_text
              : r.ref_low != null || r.ref_high != null
                ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""} ${r.unit ?? ""}`
                : "";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 4px",
                borderBottom: i < rows.length - 1 ? "1px solid #f0f4f8" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{r.test_name}</div>
                  <div style={{ fontSize: 10.5, color: "#8296a8", marginTop: 2 }}>
                    {r.test_name_en}{ref ? ` · الطبيعي: ${ref}` : ""}
                  </div>
                </div>
                {f === "high" && <span style={{ fontSize: 10, fontWeight: 900, color: "#c0392b" }}>مرتفع ↑</span>}
                {f === "low" && <span style={{ fontSize: 10, fontWeight: 900, color: "#1f6fd6" }}>منخفض ↓</span>}
                {f === "normal" && <span style={{ fontSize: 10, fontWeight: 900, color: "#1f8a4c" }}>✓</span>}
                <input
                  ref={el => { inputsRef.current[i] = el; }}
                  className={`res-inp ${f !== "empty" ? f : ""}`}
                  value={r.value}
                  placeholder="—"
                  onChange={e => setVal(i, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); inputsRef.current[i + 1]?.focus(); }
                  }}
                />
              </div>
            );
          })}

          {/* الدفع */}
          <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lab-lbl">💰 المدفوع (الإجمالي: {Number(order.price).toLocaleString()})</label>
              <input className="lab-inp" value={paid} onChange={e => setPaid(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" style={{ direction: "ltr", textAlign: "right" }} />
            </div>
            <button className="chip" onClick={() => setPaid(String(order.price))}>دفع كامل ✓</button>
          </div>
        </div>

        <div style={{ padding: "14px 20px 20px", display: "flex", gap: 10, position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid #f0f4f8" }}>
          <button className="lab-btn lab-btn-s" style={{ flex: 1 }} disabled={saving} onClick={() => doSave(false)}>💾 حفظ مسودة</button>
          <button className="lab-btn lab-btn-p" style={{ flex: 1.6, opacity: allFilled ? 1 : .55 }} disabled={saving || !allFilled} onClick={() => doSave(true)}>
            {saving ? "جارٍ الحفظ..." : "✅ إكمال وإصدار النتيجة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Modal المشاركة — رابط + واتساب + PDF
// ════════════════════════════════════════════════════════════
function ShareModal({ order, labName, onClose }: { order: LabOrder; labName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/lab-result/${order.share_token}` : "";
  const waText = encodeURIComponent(
    `مرحباً ${order.patient_name} 👋\nنتائج تحاليلك من ${labName} جاهزة ✅\nيمكنك الاطلاع عليها وحفظها PDF من الرابط:\n${link}`
  );
  const waPhone = (order.patient_phone ?? "").replace(/[^\d]/g, "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,18,36,.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} style={{
        width: "min(94vw,440px)", background: "#fff", borderRadius: 20,
        animation: "modalIn .28s both", fontFamily: "'Rubik',sans-serif", overflow: "hidden",
      }}>
        <div style={{ background: "linear-gradient(135deg,#0b2540,#123a63)", color: "#fff", padding: "18px 22px" }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>💬 مشاركة نتيجة {order.patient_name}</div>
          <div style={{ fontSize: 10, opacity: .75, marginTop: 3 }}>رابط آمن — يفتح صفحة النتيجة مع زر حفظ PDF</div>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 11 }}>
          <a
            href={waPhone ? `https://wa.me/${waPhone}?text=${waText}` : `https://wa.me/?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="lab-btn" style={{ background: "linear-gradient(135deg,#25d366,#128c4b)", color: "#fff", textAlign: "center", textDecoration: "none", padding: "14px", fontSize: 14 }}
          >💬 إرسال عبر واتساب {waPhone ? "للمريض" : ""}</a>
          <a
            href={link} target="_blank" rel="noopener noreferrer"
            className="lab-btn lab-btn-s" style={{ textAlign: "center", textDecoration: "none", padding: "13px" }}
          >📄 فتح صفحة النتيجة / PDF</a>
          <button
            className="lab-btn lab-btn-s" style={{ padding: "13px" }}
            onClick={async () => {
              try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
            }}
          >{copied ? "✓ تم النسخ" : "🔗 نسخ الرابط"}</button>
          <button className="lab-btn" style={{ background: "transparent", color: "#8296a8", padding: "8px" }} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// إدارة كتالوج التحاليل والأسعار
// ════════════════════════════════════════════════════════════
function CatalogManager({ catalog, setCatalog, apiFetch, showNotif }: {
  catalog: CatalogTest[];
  setCatalog: React.Dispatch<React.SetStateAction<CatalogTest[]>>;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  showNotif: (m: string, ok?: boolean) => void;
}) {
  const empty = { name_ar: "", name_en: "", category: "general", unit: "", ref_low: "", ref_high: "", ref_text: "", price: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = catalog.filter(t =>
    !q.trim() || t.name_ar.includes(q) || (t.name_en ?? "").toLowerCase().includes(q.toLowerCase())
  );

  const save = async () => {
    if (!form.name_ar.trim()) { showNotif("اسم التحليل مطلوب", false); return; }
    setSaving(true);
    const payload = {
      action: editId ? "update" : "add", id: editId ?? undefined,
      name_ar: form.name_ar.trim(), name_en: form.name_en.trim() || null,
      category: form.category, unit: form.unit.trim() || null,
      ref_low: form.ref_low !== "" ? Number(form.ref_low) : null,
      ref_high: form.ref_high !== "" ? Number(form.ref_high) : null,
      ref_text: form.ref_text.trim() || null,
      price: Number(form.price) || 0,
    };
    const res = await apiFetch("/api/lab/catalog", { method: "POST", body: JSON.stringify(payload) });
    if (res.ok) {
      const { test } = await res.json();
      setCatalog(prev => editId ? prev.map(t => (t.id === editId ? test : t)) : [...prev, test]);
      showNotif("✓ تم الحفظ");
      setForm(empty); setEditId(null); setShowForm(false);
    } else showNotif("فشل الحفظ", false);
    setSaving(false);
  };

  const del = async (t: CatalogTest) => {
    if (!t.user_id) { showNotif("لا يمكن حذف تحليل عام — يمكنك إضافة نسختك الخاصة", false); return; }
    if (!confirm(`حذف "${t.name_ar}"؟`)) return;
    const res = await apiFetch("/api/lab/catalog", { method: "POST", body: JSON.stringify({ action: "delete", id: t.id }) });
    if (res.ok) { setCatalog(prev => prev.filter(x => x.id !== t.id)); showNotif("تم الحذف"); }
  };

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input className="lab-inp" style={{ maxWidth: 300 }} placeholder="🔍 بحث في الكتالوج..." value={q} onChange={e => setQ(e.target.value)} />
        <button className="lab-btn lab-btn-p" onClick={() => { setForm(empty); setEditId(null); setShowForm(v => !v); }}>➕ تحليل جديد</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 14, color: "#0b2540" }}>{editId ? "✏️ تعديل تحليل" : "➕ تحليل جديد"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
            <div><label className="lab-lbl">الاسم بالعربية *</label><input className="lab-inp" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div><label className="lab-lbl">الاسم بالإنجليزية</label><input className="lab-inp" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div>
              <label className="lab-lbl">التصنيف</label>
              <select className="lab-inp" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.ar}</option>)}
              </select>
            </div>
            <div><label className="lab-lbl">الوحدة</label><input className="lab-inp" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="mg/dL" /></div>
            <div><label className="lab-lbl">الحد الأدنى الطبيعي</label><input className="lab-inp" value={form.ref_low} onChange={e => setForm({ ...form, ref_low: e.target.value.replace(/[^\d.-]/g, "") })} inputMode="decimal" /></div>
            <div><label className="lab-lbl">الحد الأعلى الطبيعي</label><input className="lab-inp" value={form.ref_high} onChange={e => setForm({ ...form, ref_high: e.target.value.replace(/[^\d.-]/g, "") })} inputMode="decimal" /></div>
            <div><label className="lab-lbl">مجال نصي (للتحاليل الوصفية)</label><input className="lab-inp" value={form.ref_text} onChange={e => setForm({ ...form, ref_text: e.target.value })} placeholder="مثال: سلبي" /></div>
            <div><label className="lab-lbl">السعر</label><input className="lab-inp" value={form.price} onChange={e => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="lab-btn lab-btn-p" disabled={saving} onClick={save}>{saving ? "جارٍ الحفظ..." : "💾 حفظ"}</button>
            <button className="lab-btn lab-btn-s" onClick={() => { setShowForm(false); setEditId(null); }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
        {visible.map(t => (
          <div key={t.id} className="card" style={{ padding: "13px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{catIcon(t.category)} {t.name_ar}</div>
                <div style={{ fontSize: 10.5, color: "#8296a8", marginTop: 3 }}>
                  {t.name_en}
                  {(t.ref_low != null || t.ref_high != null) && ` · ${t.ref_low ?? ""}–${t.ref_high ?? ""} ${t.unit ?? ""}`}
                  {t.ref_text && ` · ${t.ref_text}`}
                </div>
              </div>
              {!t.user_id && <span style={{ fontSize: 9, background: "#eef2f7", color: "#8296a8", borderRadius: 10, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" }}>عام</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#c47c00" }}>{Number(t.price) > 0 ? Number(t.price).toLocaleString() : "—"}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {t.user_id && (
                  <button className="chip" onClick={() => {
                    setForm({
                      name_ar: t.name_ar, name_en: t.name_en ?? "", category: t.category,
                      unit: t.unit ?? "", ref_low: t.ref_low != null ? String(t.ref_low) : "",
                      ref_high: t.ref_high != null ? String(t.ref_high) : "",
                      ref_text: t.ref_text ?? "", price: String(t.price ?? ""),
                    });
                    setEditId(t.id); setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}>✏️</button>
                )}
                {t.user_id && <button className="chip" style={{ color: "#c0392b" }} onClick={() => del(t)}>🗑️</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// التقارير
// ════════════════════════════════════════════════════════════
function ReportsView({ orders }: { orders: LabOrder[] }) {
  const month = new Date().toISOString().slice(0, 7);
  const monthOrders = orders.filter(o => (o.created_at ?? "").slice(0, 7) === month);
  const rev = monthOrders.reduce((s, o) => s + Number(o.paid || 0), 0);
  const due = orders.reduce((s, o) => s + Math.max(0, Number(o.price || 0) - Number(o.paid || 0)), 0);

  // أكثر التحاليل طلباً
  const counts: Record<string, number> = {};
  monthOrders.forEach(o => o.results.forEach(r => { counts[r.test_name] = (counts[r.test_name] ?? 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = top[0]?.[1] ?? 1;

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
        {[
          ["🧪", "طلبات هذا الشهر", String(monthOrders.length), "#f5a623"],
          ["✅", "مكتملة", String(monthOrders.filter(o => o.status === "completed").length), "#2ecc71"],
          ["💰", "إيراد الشهر", rev.toLocaleString(), "#0b6db8"],
          ["📌", "ديون غير محصّلة", due.toLocaleString(), "#e74c3c"],
        ].map(([ic, lbl, val, col]) => (
          <div key={lbl} className="card" style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{ic}</div>
            <div style={{ fontSize: 21, fontWeight: 900, color: col }}>{val}</div>
            <div style={{ fontSize: 10.5, color: "#8296a8", fontWeight: 700, marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 14, color: "#0b2540" }}>📈 الأكثر طلباً هذا الشهر</div>
        {top.length === 0 ? (
          <div style={{ color: "#8296a8", fontSize: 12 }}>لا بيانات بعد</div>
        ) : top.map(([name, c]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <div style={{ width: 150, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ flex: 1, background: "#f0f4f8", borderRadius: 8, height: 20, overflow: "hidden" }}>
              <div style={{ width: `${(c / max) * 100}%`, height: "100%", background: "linear-gradient(90deg,#f5a623,#e08c00)", borderRadius: 8 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#c47c00", width: 26, textAlign: "center" }}>{c}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
