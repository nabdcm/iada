"use client";
// ============================================================
// NABD LAB — نبض مخبر v2
// روح تصميم نبض · موبايل-أولاً · مرحلتان (طلب+ملصقات QR → نتائج)
// إدارة مالية كاملة (إيرادات، ديون، مصاريف، صافي)
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "qrcode";
import { LabSidebar, LabPillNav, Icons, type TabKey } from "./nav";
import { CameraScanner } from "../pharmacy/scanner";

// ─── BRAND (مطابق للداشبورد) ─────────────────────────────────
const BRAND = {
  primary: "#0863ba", primaryLight: "#3d8fd6", sky: "#eaf3fc",
  green: "#2e7d32", purple: "#7b2d8b", orange: "#e67e22", teal: "#16a085",
  red: "#c0392b", ink: "#1c2b3a", muted: "#8a97a6", border: "#e6edf5", bg: "#f4f8fc",
};

// ─── Types ───────────────────────────────────────────────────
type CatalogTest = {
  id: number; user_id: string | null; name_ar: string; name_en: string | null;
  category: string; unit: string | null; ref_low: number | null; ref_high: number | null;
  ref_text: string | null; price: number;
};
type ResultRow = {
  catalog_id: number | null; test_name: string; test_name_en?: string | null;
  value: string; unit?: string | null; ref_low?: number | null; ref_high?: number | null; ref_text?: string | null;
};
type LabOrder = {
  id: number; share_token: string; mrn: string | null; patient_name: string;
  patient_phone: string | null; patient_gender: string | null; patient_age: string | null;
  referring_doctor: string | null; status: "pending" | "completed";
  sample_date: string | null; result_date: string | null; results: ResultRow[];
  price: number; paid: number; notes: string | null; created_at: string;
};
type Expense = {
  id: number; title: string; amount: number; category: string;
  expense_date: string; notes: string | null;
};

const CATS: Record<string, { ar: string }> = {
  hematology: { ar: "دمويات" }, chemistry: { ar: "كيمياء" }, lipids: { ar: "شحوم" },
  liver: { ar: "كبد" }, hormones: { ar: "هرمونات" }, vitamins: { ar: "فيتامينات" },
  immunology: { ar: "مناعة" }, urine: { ar: "بول" }, general: { ar: "عام" },
};
const catLabel = (c: string) => CATS[c]?.ar ?? c;

const EXP_CATS: Record<string, string> = {
  supplies: "مستلزمات وكواشف", salaries: "رواتب", rent: "إيجار",
  maintenance: "صيانة أجهزة", general: "عام",
};

const flagOf = (r: ResultRow): "high" | "low" | "normal" | "empty" => {
  if (!r.value.trim()) return "empty";
  const v = parseFloat(r.value);
  if (!isNaN(v)) {
    if (r.ref_high != null && v > r.ref_high) return "high";
    if (r.ref_low != null && v < r.ref_low) return "low";
  }
  return "normal";
};

const fmt = (n: number) => Number(n || 0).toLocaleString();

// ═══════════════════════════════════════════════════════════════
// الصفحة الرئيسية
// ═══════════════════════════════════════════════════════════════
export default function LabPage() {
  const [loading, setLoading] = useState(true);
  const [labName, setLabName] = useState("المخبر");
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [catalog, setCatalog] = useState<CatalogTest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notif, setNotif] = useState<{ msg: string; ok: boolean } | null>(null);

  // modals
  const [showNew, setShowNew] = useState(false);
  const [resultsOrder, setResultsOrder] = useState<LabOrder | null>(null);
  const [shareOrder, setShareOrder] = useState<LabOrder | null>(null);
  const [labelsOrder, setLabelsOrder] = useState<LabOrder | null>(null);
  const [payOrder, setPayOrder] = useState<LabOrder | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [focusTest, setFocusTest] = useState<number | null>(null);

  const showNotif = useCallback((msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 2600);
  }, []);

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const doReq = async (token: string) => fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const { data: { session } } = await supabase.auth.getSession();
    let res = await doReq(session?.access_token ?? "");
    if (res.status === 401) {
      // التوكن منتهٍ — نجدد الجلسة ونعيد المحاولة مرة واحدة (بدون تسجيل خروج المستخدم)
      const { data: refreshed } = await supabase.auth.refreshSession();
      const newToken = refreshed?.session?.access_token;
      if (newToken) res = await doReq(newToken);
    }
    return res;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [oRes, cRes, eRes] = await Promise.all([
        apiFetch("/api/lab/orders"),
        apiFetch("/api/lab/catalog"),
        apiFetch("/api/lab/expenses"),
      ]);
      if (oRes.ok) setOrders(await oRes.json());
      if (cRes.ok) setCatalog(await cRes.json());
      if (eRes.ok) setExpenses(await eRes.json());
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

  const saveOrder = async (id: number, payload: Record<string, unknown>) => {
    const res = await apiFetch("/api/lab/orders", { method: "POST", body: JSON.stringify({ action: "update", id, ...payload }) });
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
  };

  // مسح ملصق QR لعبوة عينة — يفتح طلبها مباشرة على التحليل المقصود
  const handleScan = useCallback((code: string) => {
    // الصيغة: NABD-LAB|O:{orderId}|T:{testNo}|{mrn}|{testName}
    const m = code.match(/^NABD-LAB\|O:(\d+)\|T:(\d+)\|/);
    if (!m) { showNotif("هذا الكود ليس ملصق عينة من نبض مخبر", false); return; }
    const orderId = Number(m[1]);
    const testIdx = Number(m[2]) - 1;
    const order = orders.find(o => o.id === orderId);
    if (!order) { showNotif(`الطلب #${orderId} غير موجود في هذا المخبر`, false); return; }
    setFocusTest(testIdx >= 0 && testIdx < order.results.length ? testIdx : null);
    setResultsOrder(order);
    showNotif(`✓ ${order.patient_name} — ${order.results[testIdx]?.test_name ?? "الطلب #" + orderId}`);
  }, [orders, showNotif]);

  const logout = async () => {
    if (!confirm("تسجيل الخروج من حساب المخبر؟")) return;
    await supabase.auth.signOut();
    document.cookie = "nabd-session=; path=/; max-age=0";
    window.location.href = "/portal?type=lab";
  };

  // stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const mOrders = orders.filter(o => (o.created_at ?? "").slice(0, 7) === month);
    const mExp = expenses.filter(e => (e.expense_date ?? "").slice(0, 7) === month);
    return {
      today: orders.filter(o => (o.created_at ?? "").slice(0, 10) === today).length,
      pending: orders.filter(o => o.status === "pending").length,
      monthOrders: mOrders.length,
      monthRev: mOrders.reduce((s, o) => s + Number(o.paid || 0), 0),
      monthExp: mExp.reduce((s, e) => s + Number(e.amount || 0), 0),
      unpaid: orders.reduce((s, o) => s + Math.max(0, Number(o.price || 0) - Number(o.paid || 0)), 0),
    };
  }, [orders, expenses]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.bg, fontFamily: "'Rubik',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e0e0e0", borderTopColor: BRAND.primary, borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 13, color: "#aaa" }}>جاري التحميل...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const badges: Partial<Record<TabKey, number>> = { orders: stats.pending > 0 ? stats.pending : undefined };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: BRAND.bg, fontFamily: "'Rubik',sans-serif", color: BRAND.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:${BRAND.bg}}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .lab-main{margin-inline-start:236px;padding:22px 24px 40px}
        .lab-sidebar{display:flex!important}
        .lab-pillnav{display:none!important}
        @media(max-width:900px){
          .lab-sidebar{display:none!important}
          .lab-main{margin-inline-start:0;padding:16px 14px 110px}
          .lab-pillnav{display:flex!important}
        }
        .card{background:#fff;border-radius:20px;border:1px solid ${BRAND.border};box-shadow:0 2px 12px rgba(20,40,70,.05)}
        .lab-inp{width:100%;padding:12px 14px;border:1.5px solid ${BRAND.border};border-radius:12px;font-family:'Rubik',sans-serif;font-size:14px;background:#fff;outline:none;transition:border .15s;color:${BRAND.ink}}
        .lab-inp:focus{border-color:${BRAND.primary}}
        .lab-lbl{font-size:11px;font-weight:700;color:#5a6a7a;display:block;margin-bottom:6px}
        .lab-btn{padding:12px 20px;border:none;border-radius:12px;font-family:'Rubik',sans-serif;font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .lab-btn-p{background:linear-gradient(135deg,${BRAND.primary},#0a63bf);color:#fff;box-shadow:0 5px 16px rgba(8,99,186,.3)}
        .lab-btn-s{background:#fff;color:#5a6472;border:1.5px solid ${BRAND.border}}
        .lab-btn:disabled{opacity:.55;cursor:default}
        .chip{padding:8px 15px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:1.5px solid ${BRAND.border};background:#fff;color:#5a6472;font-family:'Rubik',sans-serif}
        .chip.on{background:${BRAND.primary};color:#fff;border-color:${BRAND.primary}}
        .res-inp{width:104px;padding:11px 10px;border:2px solid ${BRAND.border};border-radius:11px;font-family:'Rubik',sans-serif;font-size:16px;font-weight:800;text-align:center;outline:none;direction:ltr}
        .res-inp:focus{border-color:${BRAND.primary}}
        .res-inp.high{border-color:#e74c3c;color:#c0392b;background:rgba(231,76,60,.05)}
        .res-inp.low{border-color:#3498db;color:#1f6fd6;background:rgba(52,152,219,.05)}
        .res-inp.normal{border-color:#2ecc71;color:#1f8a4c;background:rgba(46,204,113,.05)}
        .stat-accent{position:absolute;inset-inline:0;top:0;height:4px;border-radius:20px 20px 0 0}
        .order-row:active{transform:scale(.995)}
        .sheet-wrap{position:fixed;inset:0;background:rgba(16,42,80,.45);backdrop-filter:blur(4px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px}
        .sheet-box{width:min(96vw,680px);max-height:90vh;overflow-y:auto;background:#f4f8fc;border-radius:22px;animation:modalIn .3s both;font-family:'Rubik',sans-serif;overscroll-behavior:contain}
        .sheet-box.white{background:#fff}
        .sheet-head{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e6edf5;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:22px 22px 0 0}
        @media(max-width:900px){
          .sheet-wrap{align-items:flex-end;padding:0}
          .sheet-box{width:100vw;max-height:94vh;border-radius:24px 24px 0 0}
          .sheet-head{border-radius:24px 24px 0 0}
        }
        @media print{.lab-sidebar,.lab-pillnav,.no-print{display:none!important}.lab-main{margin:0;padding:0}}
      `}</style>

      <LabSidebar active={tab} onSelect={setTab} badges={badges} labName={labName} onNew={() => setShowNew(true)} onScan={() => setShowScanner(true)} onLogout={logout} />
      <LabPillNav active={tab} onSelect={setTab} badges={badges} onNew={() => setShowNew(true)} onScan={() => setShowScanner(true)} />

      <main className="lab-main">
        {/* Header موبايل */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 10 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: BRAND.ink }}>
              {tab === "dashboard" ? `مرحباً 👋` : tab === "orders" ? "طلبات التحاليل" : tab === "finance" ? "الإدارة المالية" : "كتالوج التحاليل"}
            </div>
            <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}>
              {tab === "dashboard" ? `إليك ملخص نشاط ${labName} اليوم` :
               tab === "orders" ? "مرحلتان: طلب وملصقات ← ثم إدخال النتائج" :
               tab === "finance" ? "الإيرادات والديون والمصاريف" : "التحاليل والمجالات الطبيعية والأسعار"}
            </div>
          </div>
        </div>

        {tab === "dashboard" && (
          <DashboardTab stats={stats} orders={orders} onOpenOrder={setResultsOrder} onNew={() => setShowNew(true)} onGoOrders={() => setTab("orders")} />
        )}
        {tab === "orders" && (
          <OrdersTab
            orders={orders}
            onResults={setResultsOrder}
            onShare={setShareOrder}
            onLabels={setLabelsOrder}
            onPay={setPayOrder}
            onDelete={deleteOrder}
          />
        )}
        {tab === "finance" && (
          <FinanceTab orders={orders} expenses={expenses} setExpenses={setExpenses} apiFetch={apiFetch} showNotif={showNotif} onPay={setPayOrder} />
        )}
        {tab === "catalog" && (
          <CatalogTab catalog={catalog} setCatalog={setCatalog} apiFetch={apiFetch} showNotif={showNotif} />
        )}
      </main>

      {/* ══ المرحلة الأولى: طلب جديد ══ */}
      {showNew && (
        <NewOrderModal
          catalog={catalog}
          onClose={() => setShowNew(false)}
          apiFetch={apiFetch}
          showNotif={showNotif}
          onSaved={(order) => {
            setOrders(prev => [order, ...prev]);
            setShowNew(false);
            showNotif("✓ تم إنشاء الطلب" + (order.mrn ? ` — MRN: ${order.mrn}` : ""));
            setLabelsOrder(order); // مباشرة لطباعة الملصقات
          }}
        />
      )}

      {/* ══ ملصقات QR ══ */}
      {labelsOrder && <LabelsModal order={labelsOrder} labName={labName} onClose={() => setLabelsOrder(null)} />}

      {/* ══ المرحلة الثانية: إدخال النتائج ══ */}
      {resultsOrder && (
        <ResultsModal
          order={resultsOrder}
          focusIndex={focusTest}
          onClose={() => { setResultsOrder(null); setFocusTest(null); }}
          onLabels={() => setLabelsOrder(resultsOrder)}
          onSave={async (results, complete) => {
            const updated = await saveOrder(resultsOrder.id, { results, ...(complete ? { status: "completed" } : {}) });
            if (updated) {
              showNotif(complete ? "✓ اكتمل الطلب — جاهز للمشاركة" : "✓ تم الحفظ");
              setResultsOrder(null);
              if (complete) setShareOrder(updated);
            }
          }}
        />
      )}

      {/* ══ مشاركة ══ */}
      {shareOrder && <ShareModal order={shareOrder} labName={labName} onClose={() => setShareOrder(null)} />}

      {/* ══ تحصيل دفعة ══ */}
      {payOrder && (
        <PayModal
          order={payOrder}
          onClose={() => setPayOrder(null)}
          onPay={async (amount) => {
            const updated = await saveOrder(payOrder.id, { paid: Number(payOrder.paid || 0) + amount });
            if (updated) { showNotif("✓ تم تسجيل الدفعة"); setPayOrder(null); }
          }}
        />
      )}

      {showScanner && (
        <CameraScanner
          lang="ar"
          title="مسح ملصق العينة"
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {notif && (
        <div style={{
          position: "fixed", bottom: 90, right: "50%", transform: "translateX(50%)",
          background: notif.ok ? BRAND.ink : BRAND.red, color: "#fff",
          padding: "13px 26px", borderRadius: 30, fontSize: 13, fontWeight: 700,
          boxShadow: "0 10px 30px rgba(0,0,0,.25)", zIndex: 400, fontFamily: "'Rubik',sans-serif",
          animation: "fadeUp .25s both", maxWidth: "90vw",
        }}>{notif.msg}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// بطاقة إحصائية بروح داشبورد نبض (شريط علوي متدرج)
// ═══════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, accent, sub }: {
  icon: React.ReactNode; label: string; value: string; accent: string; sub?: string;
}) {
  return (
    <div className="card" style={{ position: "relative", padding: "18px 20px", overflow: "hidden" }}>
      <div className="stat-accent" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${accent}14`, color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: BRAND.ink, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 11, color: BRAND.muted, fontWeight: 700, marginTop: 3 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: accent, fontWeight: 700, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// تبويب الرئيسية
// ═══════════════════════════════════════════════════════════════
function DashboardTab({ stats, orders, onOpenOrder, onNew, onGoOrders }: {
  stats: { today: number; pending: number; monthOrders: number; monthRev: number; monthExp: number; unpaid: number };
  orders: LabOrder[]; onOpenOrder: (o: LabOrder) => void; onNew: () => void; onGoOrders: () => void;
}) {
  const pendingList = orders.filter(o => o.status === "pending").slice(0, 6);
  const net = stats.monthRev - stats.monthExp;

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 13 }}>
        <StatCard icon={<Icons.flask size={22} />} label="طلبات اليوم" value={String(stats.today)} accent={BRAND.primary} />
        <StatCard icon={<Icons.clock size={22} />} label="بانتظار النتائج" value={String(stats.pending)} accent={BRAND.orange} />
        <StatCard icon={<Icons.money size={22} />} label="صافي هذا الشهر" value={fmt(net)} accent={net >= 0 ? BRAND.green : BRAND.red} sub={`إيراد ${fmt(stats.monthRev)} − مصاريف ${fmt(stats.monthExp)}`} />
        <StatCard icon={<Icons.finance size={22} />} label="ديون غير محصّلة" value={fmt(stats.unpaid)} accent={BRAND.red} />
      </div>

      {/* إجراءات سريعة */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <button onClick={onNew} className="lab-btn" style={{ background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`, color: "#fff", padding: "18px", borderRadius: 16, boxShadow: "0 6px 18px rgba(8,99,186,.3)", flexDirection: "column", gap: 6 }}>
          <Icons.plus size={22} /><span>طلب تحاليل جديد</span>
        </button>
        <button onClick={onGoOrders} className="lab-btn" style={{ background: `linear-gradient(135deg,${BRAND.teal},#2ecc9a)`, color: "#fff", padding: "18px", borderRadius: 16, boxShadow: "0 6px 18px rgba(22,160,133,.3)", flexDirection: "column", gap: 6 }}>
          <Icons.orders size={22} /><span>إدارة الطلبات</span>
        </button>
      </div>

      {/* بانتظار النتائج */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: BRAND.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: BRAND.orange }}><Icons.clock size={18} /></span> بانتظار إدخال النتائج
          </div>
          <button onClick={onGoOrders} style={{ fontSize: 12, fontWeight: 700, color: BRAND.primary, background: BRAND.sky, border: "none", padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "'Rubik',sans-serif" }}>عرض الكل</button>
        </div>
        {pendingList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 0", color: BRAND.muted, fontSize: 13 }}>لا توجد طلبات معلّقة ✨</div>
        ) : (
          <div style={{ display: "grid", gap: 9 }}>
            {pendingList.map(o => (
              <button key={o.id} onClick={() => onOpenOrder(o)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14,
                border: `1.5px solid ${BRAND.border}`, background: "#fff", cursor: "pointer",
                fontFamily: "'Rubik',sans-serif", textAlign: "start", width: "100%",
              }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${BRAND.orange}18`, color: BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                  {o.patient_name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: BRAND.ink }}>{o.patient_name}</div>
                  <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>{o.results.length} تحليل · {o.sample_date}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: BRAND.primary, background: BRAND.sky, padding: "6px 13px", borderRadius: 18, flexShrink: 0 }}>إدخال النتائج ←</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// تبويب الطلبات
// ═══════════════════════════════════════════════════════════════
function OrdersTab({ orders, onResults, onShare, onLabels, onPay, onDelete }: {
  orders: LabOrder[];
  onResults: (o: LabOrder) => void; onShare: (o: LabOrder) => void;
  onLabels: (o: LabOrder) => void; onPay: (o: LabOrder) => void;
  onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "unpaid">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (q && !o.patient_name.toLowerCase().includes(q) && !(o.patient_phone ?? "").includes(q) && !(o.mrn ?? "").toLowerCase().includes(q)) return false;
      if (filter === "pending" && o.status !== "pending") return false;
      if (filter === "completed" && o.status !== "completed") return false;
      if (filter === "unpaid" && Number(o.paid) >= Number(o.price)) return false;
      return true;
    });
  }, [orders, search, filter]);

  return (
    <div style={{ animation: "fadeUp .3s both" }}>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 340 }}>
          <span style={{ position: "absolute", insetInlineStart: 13, top: "50%", transform: "translateY(-50%)", color: BRAND.muted }}><Icons.search size={16} /></span>
          <input className="lab-inp" style={{ paddingInlineStart: 38 }} placeholder="بحث بالاسم أو الهاتف أو MRN..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {([["all", "الكل"], ["pending", "معلّق"], ["completed", "مكتمل"], ["unpaid", "غير مدفوع"]] as const).map(([k, l]) => (
          <button key={k} className={`chip${filter === k ? " on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 50, textAlign: "center", color: BRAND.muted }}>
          <div style={{ marginBottom: 10, color: BRAND.primary, display: "flex", justifyContent: "center" }}><Icons.flask size={40} /></div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>لا توجد طلبات مطابقة</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 11 }}>
          {filtered.map(o => {
            const due = Math.max(0, Number(o.price) - Number(o.paid));
            const done = o.results.filter(r => r.value.trim()).length;
            const completed = o.status === "completed";
            return (
              <div key={o.id} className="card order-row" style={{ padding: "16px 18px", position: "relative", overflow: "hidden" }}>
                <div className="stat-accent" style={{ background: completed ? `linear-gradient(90deg,${BRAND.green},${BRAND.green}44)` : `linear-gradient(90deg,${BRAND.orange},${BRAND.orange}44)` }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 13, flexWrap: "wrap" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: completed ? `${BRAND.green}15` : `${BRAND.orange}15`, color: completed ? BRAND.green : BRAND.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {completed ? <Icons.check size={20} /> : <Icons.clock size={20} />}
                  </div>
                  <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: BRAND.ink }}>{o.patient_name}</div>
                    <div style={{ fontSize: 11, color: BRAND.muted, display: "flex", gap: 9, flexWrap: "wrap", marginTop: 4 }}>
                      {o.mrn && <span style={{ fontWeight: 800, color: BRAND.primary, background: BRAND.sky, padding: "2px 8px", borderRadius: 8 }}>{o.mrn}</span>}
                      <span>#{o.id}</span>
                      <span>{o.sample_date}</span>
                      <span>{done}/{o.results.length} نتيجة</span>
                      <span style={{ fontWeight: 800, color: due > 0 ? BRAND.red : BRAND.green }}>
                        {due > 0 ? `متبقٍ ${fmt(due)}` : "مدفوع ✓"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", width: "100%", marginTop: 4 }}>
                    <button className="lab-btn lab-btn-p" style={{ padding: "10px 14px", fontSize: 12, flex: "1 1 auto" }} onClick={() => onResults(o)}>
                      {completed ? <><Icons.doc size={15} /> النتائج</> : <><Icons.edit size={15} /> إدخال النتائج</>}
                    </button>
                    <button className="lab-btn lab-btn-s" style={{ padding: "10px 13px", fontSize: 12 }} onClick={() => onLabels(o)}>
                      <Icons.qr size={15} /> ملصقات
                    </button>
                    {completed && (
                      <button className="lab-btn" style={{ padding: "10px 13px", fontSize: 12, background: "rgba(37,211,102,.12)", color: "#128c4b", border: "1.5px solid rgba(37,211,102,.4)" }} onClick={() => onShare(o)}>
                        <Icons.whatsapp size={15} /> مشاركة
                      </button>
                    )}
                    {due > 0 && (
                      <button className="lab-btn" style={{ padding: "10px 13px", fontSize: 12, background: `${BRAND.green}12`, color: BRAND.green, border: `1.5px solid ${BRAND.green}44` }} onClick={() => onPay(o)}>
                        <Icons.money size={15} /> تحصيل
                      </button>
                    )}
                    <button className="lab-btn lab-btn-s" style={{ padding: "10px 12px", fontSize: 12, color: BRAND.red }} onClick={() => onDelete(o.id)}>
                      <Icons.trash size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// المرحلة الأولى — طلب جديد (Modal كامل الشاشة على الموبايل)
// ═══════════════════════════════════════════════════════════════
function NewOrderModal({ catalog, onClose, onSaved, apiFetch, showNotif }: {
  catalog: CatalogTest[]; onClose: () => void;
  onSaved: (o: LabOrder) => void;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  showNotif: (m: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [age, setAge] = useState("");
  const [doctor, setDoctor] = useState("");
  const [selected, setSelected] = useState<CatalogTest[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [paid, setPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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

  const toggle = (t: CatalogTest) =>
    setSelected(prev => prev.some(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t]);

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
          action: "add", patient_name: name.trim(), patient_phone: phone.trim(),
          patient_gender: gender || null, patient_age: age.trim() || null,
          referring_doctor: doctor.trim() || null,
          results, price: total, paid: Number(paid) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      const { order } = await res.json();
      onSaved(order);
    } catch { showNotif("فشل إنشاء الطلب", false); setSaving(false); }
  };

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} className="sheet-box">
        {/* Header sticky */}
        <div className="sheet-head">
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: BRAND.ink, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: BRAND.primary }}><Icons.plus size={19} /></span> طلب تحاليل جديد
            </div>
            <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>المرحلة 1: تسجيل المريض والتحاليل — ثم طباعة ملصقات QR للعبوات</div>
          </div>
          <button onClick={onClose} style={{ background: BRAND.bg, border: "none", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15, color: BRAND.muted }}>✕</button>
        </div>

        <div style={{ padding: "16px 18px 24px", display: "grid", gap: 14 }}>
          {/* بيانات المريض */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 900, color: BRAND.ink, marginBottom: 14 }}>بيانات المريض</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <div>
                <label className="lab-lbl">الاسم الكامل *</label>
                <input className="lab-inp" value={name} onChange={e => setName(e.target.value)} placeholder="اسم المريض" />
              </div>
              <div>
                <label className="lab-lbl">رقم الهاتف — لإنشاء MRN وربط النتائج</label>
                <input className="lab-inp" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="tel" style={{ direction: "ltr", textAlign: "right" }} />
              </div>
              <div>
                <label className="lab-lbl">العمر</label>
                <input className="lab-inp" value={age} onChange={e => setAge(e.target.value)} placeholder="34 سنة" />
              </div>
              <div>
                <label className="lab-lbl">الجنس</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className={`chip${gender === "male" ? " on" : ""}`} style={{ flex: 1, padding: "12px" }} onClick={() => setGender(gender === "male" ? "" : "male")}>ذكر</button>
                  <button className={`chip${gender === "female" ? " on" : ""}`} style={{ flex: 1, padding: "12px" }} onClick={() => setGender(gender === "female" ? "" : "female")}>أنثى</button>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="lab-lbl">الطبيب المُحيل (اختياري)</label>
                <input className="lab-inp" value={doctor} onChange={e => setDoctor(e.target.value)} placeholder="د. ..." />
              </div>
            </div>
          </div>

          {/* اختيار التحاليل */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: BRAND.ink }}>التحاليل المطلوبة</div>
              {selected.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 800, background: BRAND.sky, color: BRAND.primary, padding: "6px 14px", borderRadius: 20 }}>
                  {selected.length} تحليل · {fmt(total)}
                </span>
              )}
            </div>
            <input className="lab-inp" style={{ marginBottom: 10 }} placeholder="ابحث عن تحليل..." value={testSearch} onChange={e => setTestSearch(e.target.value)} />
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
              <button className={`chip${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>الكل</button>
              {cats.map(c => <button key={c} className={`chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{catLabel(c)}</button>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
              {visible.map(t => {
                const on = selected.some(x => x.id === t.id);
                return (
                  <button key={t.id} onClick={() => toggle(t)} style={{
                    textAlign: "right", padding: "11px 13px", borderRadius: 13, cursor: "pointer",
                    fontFamily: "'Rubik',sans-serif",
                    border: on ? `2px solid ${BRAND.primary}` : `1.5px solid ${BRAND.border}`,
                    background: on ? BRAND.sky : "#fff",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: BRAND.ink }}>{t.name_ar}</div>
                      <div style={{ fontSize: 10, color: BRAND.muted, marginTop: 2 }}>
                        {t.name_en}{Number(t.price) > 0 ? ` · ${fmt(t.price)}` : ""}
                      </div>
                    </div>
                    <div style={{ color: on ? BRAND.primary : BRAND.muted, flexShrink: 0 }}>{on ? <Icons.check size={18} /> : <Icons.plus size={16} />}</div>
                  </button>
                );
              })}
              {visible.length === 0 && <div style={{ color: BRAND.muted, fontSize: 12, padding: 16 }}>لا نتائج — أضف التحليل من الكتالوج</div>}
            </div>
          </div>

          {/* الدفع */}
          <div className="card" style={{ padding: 18, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 150px" }}>
              <label className="lab-lbl">المبلغ المدفوع الآن — الإجمالي {fmt(total)}</label>
              <input className="lab-inp" value={paid} onChange={e => setPaid(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" inputMode="decimal" style={{ direction: "ltr", textAlign: "right" }} />
            </div>
            <button className="chip" style={{ padding: "12px 16px" }} onClick={() => setPaid(String(total))}>دفع كامل ✓</button>
          </div>

          {err && <div style={{ color: BRAND.red, fontSize: 12.5, fontWeight: 700 }}>⚠️ {err}</div>}

          <button className="lab-btn lab-btn-p" style={{ padding: "16px", fontSize: 15, width: "100%" }} disabled={saving} onClick={save}>
            {saving ? "جارٍ الحفظ..." : <><Icons.qr size={18} /> إنشاء الطلب وتوليد ملصقات QR</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ملصقات QR للعبوات — طباعة
// ═══════════════════════════════════════════════════════════════
function LabelsModal({ order, labName, onClose }: { order: LabOrder; labName: string; onClose: () => void }) {
  const [qrs, setQrs] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const list = await Promise.all(
        order.results.map((r, i) =>
          QRCode.toDataURL(
            `NABD-LAB|O:${order.id}|T:${i + 1}|${order.mrn ?? "NO-MRN"}|${r.test_name_en ?? r.test_name}`,
            { width: 160, margin: 1, errorCorrectionLevel: "M" }
          ).catch(() => "")
        )
      );
      setQrs(list);
    })();
  }, [order]);

  const printLabels = () => window.print();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,42,80,.45)", zIndex: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
      <style>{`
        @media print{
          body *{visibility:hidden}
          #nabd-labels-sheet,#nabd-labels-sheet *{visibility:visible}
          #nabd-labels-sheet{position:fixed;inset:0;background:#fff;overflow:visible;max-height:none;border-radius:0;box-shadow:none}
          .labels-head,.labels-foot{display:none!important}
        }
      `}</style>
      <div id="nabd-labels-sheet" dir="rtl" onClick={e => e.stopPropagation()} style={{
        width: "min(96vw,640px)", maxHeight: "92vh", overflowY: "auto", background: "#fff",
        borderRadius: 20, animation: "modalIn .3s both", fontFamily: "'Rubik',sans-serif",
      }}>
        <div className="labels-head" style={{ position: "sticky", top: 0, background: "#fff", zIndex: 3, borderBottom: `1px solid ${BRAND.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "20px 20px 0 0" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: BRAND.ink, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: BRAND.primary }}><Icons.qr size={18} /></span> ملصقات العبوات — طلب #{order.id}
            </div>
            <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>الصقها على أنابيب/عبوات العينات لكل تحليل</div>
          </div>
          <button onClick={onClose} style={{ background: BRAND.bg, border: "none", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15, color: BRAND.muted }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 12 }}>
          {order.results.map((r, i) => (
            <div key={i} style={{
              border: "1.5px dashed #b9c6d6", borderRadius: 12, padding: "12px 10px",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6,
              background: "#fff", pageBreakInside: "avoid",
            }}>
              {qrs[i]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={qrs[i]} alt="QR" style={{ width: 92, height: 92 }} />
                : <div style={{ width: 92, height: 92, background: BRAND.bg, borderRadius: 8 }} />}
              <div style={{ fontSize: 12, fontWeight: 900, color: BRAND.ink, lineHeight: 1.25 }}>{r.test_name}</div>
              <div style={{ fontSize: 10, color: "#333", fontWeight: 700 }}>{order.patient_name}</div>
              <div style={{ fontSize: 9.5, color: "#555", direction: "ltr" }}>
                {order.mrn ?? ""} · #{order.id}-{i + 1}
              </div>
              <div style={{ fontSize: 8.5, color: "#888" }}>{labName} · {order.sample_date}</div>
            </div>
          ))}
        </div>

        <div className="labels-foot" style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: `1px solid ${BRAND.border}`, padding: "14px 20px", display: "flex", gap: 10 }}>
          <button className="lab-btn lab-btn-p" style={{ flex: 1, padding: "14px" }} onClick={printLabels}>
            <Icons.print size={17} /> طباعة الملصقات
          </button>
          <button className="lab-btn lab-btn-s" style={{ padding: "14px 20px" }} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// المرحلة الثانية — إدخال النتائج
// ═══════════════════════════════════════════════════════════════
function ResultsModal({ order, onClose, onSave, onLabels, focusIndex }: {
  order: LabOrder; onClose: () => void;
  onSave: (results: ResultRow[], complete: boolean) => Promise<void>;
  onLabels: () => void;
  focusIndex?: number | null;
}) {
  const [rows, setRows] = useState<ResultRow[]>(order.results.map(r => ({ ...r })));
  const [saving, setSaving] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // عند الفتح من ماسح QR: ركّز على حقل التحليل الممسوح مباشرة
  useEffect(() => {
    if (focusIndex != null) {
      const t = setTimeout(() => {
        const el = inputsRef.current[focusIndex];
        el?.focus();
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 350);
      return () => clearTimeout(t);
    }
  }, [focusIndex]);

  const setVal = (i: number, v: string) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, value: v } : r)));

  const filled = rows.filter(r => r.value.trim()).length;
  const allFilled = filled === rows.length && rows.length > 0;

  const doSave = async (complete: boolean) => {
    setSaving(true);
    await onSave(rows, complete);
    setSaving(false);
  };

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} className="sheet-box white" style={{ width: "min(96vw,620px)" }}>
        <div className="sheet-head">
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: BRAND.ink, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: BRAND.primary }}><Icons.edit size={17} /></span> المرحلة 2: نتائج {order.patient_name}
            </div>
            <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>
              {order.mrn ? `${order.mrn} · ` : ""}طلب #{order.id} · {filled}/{rows.length} نتيجة
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <button onClick={onLabels} title="ملصقات QR" style={{ background: BRAND.sky, border: "none", height: 34, borderRadius: 10, cursor: "pointer", color: BRAND.primary, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", fontFamily: "'Rubik',sans-serif", fontSize: 12, fontWeight: 800 }}>
              <Icons.qr size={16} /> الملصقات
            </button>
            <button onClick={onClose} style={{ background: BRAND.bg, border: "none", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15, color: BRAND.muted }}>✕</button>
          </div>
        </div>

        {/* progress */}
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ height: 5, borderRadius: 3, background: BRAND.bg, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${rows.length ? (filled / rows.length) * 100 : 0}%`, background: `linear-gradient(90deg,${BRAND.primary},${BRAND.primaryLight})`, borderRadius: 3, transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ padding: "10px 20px" }}>
          {rows.map((r, i) => {
            const f = flagOf(r);
            const ref = r.ref_text ? r.ref_text
              : r.ref_low != null || r.ref_high != null
                ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""} ${r.unit ?? ""}` : "";
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "12px 8px",
                borderBottom: i < rows.length - 1 ? `1px solid ${BRAND.bg}` : "none",
                background: i === focusIndex ? BRAND.sky : "transparent",
                borderRadius: i === focusIndex ? 12 : 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: BRAND.ink }}>{r.test_name}</div>
                  <div style={{ fontSize: 10.5, color: BRAND.muted, marginTop: 2 }}>
                    {r.test_name_en}{ref ? ` · الطبيعي: ${ref}` : ""}
                  </div>
                </div>
                {f === "high" && <span style={{ fontSize: 10, fontWeight: 900, color: BRAND.red, flexShrink: 0 }}>مرتفع ↑</span>}
                {f === "low" && <span style={{ fontSize: 10, fontWeight: 900, color: "#1f6fd6", flexShrink: 0 }}>منخفض ↓</span>}
                {f === "normal" && <span style={{ color: BRAND.green, flexShrink: 0 }}><Icons.check size={15} /></span>}
                <input
                  ref={el => { inputsRef.current[i] = el; }}
                  className={`res-inp ${f !== "empty" ? f : ""}`}
                  value={r.value}
                  placeholder="—"
                  onChange={e => setVal(i, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); inputsRef.current[i + 1]?.focus(); } }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: `1px solid ${BRAND.border}`, padding: "14px 20px calc(14px + env(safe-area-inset-bottom))", display: "flex", gap: 10 }}>
          <button className="lab-btn lab-btn-s" style={{ flex: 1, padding: "14px" }} disabled={saving} onClick={() => doSave(false)}>حفظ مسودة</button>
          <button className="lab-btn lab-btn-p" style={{ flex: 1.6, padding: "14px" }} disabled={saving || !allFilled} onClick={() => doSave(true)}>
            {saving ? "جارٍ الحفظ..." : <><Icons.check size={17} /> إكمال وإصدار النتيجة</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// مشاركة (واتساب / PDF / رابط)
// ═══════════════════════════════════════════════════════════════
function ShareModal({ order, labName, onClose }: { order: LabOrder; labName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/lab-result/${order.share_token}` : "";
  const waText = encodeURIComponent(
    `مرحباً ${order.patient_name} 👋\nنتائج تحاليلك من ${labName} جاهزة ✅\nيمكنك الاطلاع عليها وحفظها PDF من الرابط:\n${link}`
  );
  const waPhone = (order.patient_phone ?? "").replace(/[^\d]/g, "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,42,80,.45)", zIndex: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} style={{
        width: "min(94vw,420px)", background: "#fff", borderRadius: 20,
        animation: "modalIn .3s both", fontFamily: "'Rubik',sans-serif", overflow: "hidden",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${BRAND.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: BRAND.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#128c4b" }}><Icons.whatsapp size={18} /></span> مشاركة نتيجة {order.patient_name}
          </div>
          <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 3 }}>رابط آمن يفتح صفحة النتيجة مع زر حفظ PDF</div>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 10 }}>
          <a href={waPhone ? `https://wa.me/${waPhone}?text=${waText}` : `https://wa.me/?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="lab-btn" style={{ background: "linear-gradient(135deg,#25d366,#128c4b)", color: "#fff", textDecoration: "none", padding: "15px", fontSize: 14 }}>
            <Icons.whatsapp size={17} /> إرسال عبر واتساب{waPhone ? " للمريض" : ""}
          </a>
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="lab-btn lab-btn-s" style={{ textDecoration: "none", padding: "14px" }}>
            <Icons.doc size={16} /> فتح صفحة النتيجة / PDF
          </a>
          <button className="lab-btn lab-btn-s" style={{ padding: "14px" }}
            onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}>
            {copied ? "✓ تم النسخ" : "🔗 نسخ الرابط"}
          </button>
          <button className="lab-btn" style={{ background: "transparent", color: BRAND.muted, padding: "8px" }} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// تحصيل دفعة
// ═══════════════════════════════════════════════════════════════
function PayModal({ order, onClose, onPay }: {
  order: LabOrder; onClose: () => void; onPay: (amount: number) => Promise<void>;
}) {
  const due = Math.max(0, Number(order.price) - Number(order.paid));
  const [amount, setAmount] = useState(String(due));
  const [saving, setSaving] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,42,80,.45)", zIndex: 330, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div dir="rtl" onClick={e => e.stopPropagation()} style={{
        width: "min(94vw,380px)", background: "#fff", borderRadius: 20,
        animation: "modalIn .3s both", fontFamily: "'Rubik',sans-serif", padding: 20,
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: BRAND.ink, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: BRAND.green }}><Icons.money size={18} /></span> تحصيل دفعة — {order.patient_name}
        </div>
        <div style={{ fontSize: 12, color: BRAND.muted, marginBottom: 14 }}>
          الإجمالي {fmt(order.price)} · المدفوع {fmt(order.paid)} · <b style={{ color: BRAND.red }}>المتبقي {fmt(due)}</b>
        </div>
        <label className="lab-lbl">المبلغ المُحصَّل الآن</label>
        <input className="lab-inp" style={{ fontSize: 18, fontWeight: 800, textAlign: "center", direction: "ltr" }} value={amount} inputMode="decimal"
          onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="lab-btn lab-btn-s" style={{ flex: 1 }} onClick={onClose}>إلغاء</button>
          <button className="lab-btn lab-btn-p" style={{ flex: 1.5 }} disabled={saving || !(Number(amount) > 0)}
            onClick={async () => { setSaving(true); await onPay(Number(amount)); setSaving(false); }}>
            {saving ? "..." : "✓ تسجيل الدفعة"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// المالية — إيرادات · ديون · مصاريف · صافي
// ═══════════════════════════════════════════════════════════════
function FinanceTab({ orders, expenses, setExpenses, apiFetch, showNotif, onPay }: {
  orders: LabOrder[]; expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  showNotif: (m: string, ok?: boolean) => void;
  onPay: (o: LabOrder) => void;
}) {
  const [view, setView] = useState<"summary" | "debts" | "expenses">("summary");
  const month = new Date().toISOString().slice(0, 7);

  const mOrders = orders.filter(o => (o.created_at ?? "").slice(0, 7) === month);
  const mExpenses = expenses.filter(e => (e.expense_date ?? "").slice(0, 7) === month);
  const rev = mOrders.reduce((s, o) => s + Number(o.paid || 0), 0);
  const exp = mExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const debts = orders.filter(o => Number(o.paid) < Number(o.price));
  const totalDebt = debts.reduce((s, o) => s + (Number(o.price) - Number(o.paid)), 0);

  // إيراد آخر 7 أيام
  const last7 = useMemo(() => {
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const total = orders.filter(o => (o.created_at ?? "").slice(0, 10) === key).reduce((s, o) => s + Number(o.paid || 0), 0);
      days.push({ label: key.slice(5), total });
    }
    return days;
  }, [orders]);
  const maxDay = Math.max(1, ...last7.map(d => d.total));

  // نموذج مصروف
  const [expForm, setExpForm] = useState({ title: "", amount: "", category: "supplies", notes: "" });
  const [showExpForm, setShowExpForm] = useState(false);
  const [savingExp, setSavingExp] = useState(false);

  const addExpense = async () => {
    if (!expForm.title.trim() || !(Number(expForm.amount) > 0)) { showNotif("أدخل البيان والمبلغ", false); return; }
    setSavingExp(true);
    const res = await apiFetch("/api/lab/expenses", {
      method: "POST",
      body: JSON.stringify({ action: "add", title: expForm.title.trim(), amount: Number(expForm.amount), category: expForm.category, notes: expForm.notes.trim() || null }),
    });
    if (res.ok) {
      const { expense } = await res.json();
      setExpenses(prev => [expense, ...prev]);
      setExpForm({ title: "", amount: "", category: "supplies", notes: "" });
      setShowExpForm(false);
      showNotif("✓ تم تسجيل المصروف");
    } else showNotif("فشل الحفظ", false);
    setSavingExp(false);
  };

  const delExpense = async (id: number) => {
    if (!confirm("حذف هذا المصروف؟")) return;
    const res = await apiFetch("/api/lab/expenses", { method: "POST", body: JSON.stringify({ action: "delete", id }) });
    if (res.ok) { setExpenses(prev => prev.filter(e => e.id !== id)); showNotif("تم الحذف"); }
  };

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([["summary", "الملخص"], ["debts", `الديون${debts.length ? ` (${debts.length})` : ""}`], ["expenses", "المصاريف"]] as const).map(([k, l]) => (
          <button key={k} className={`chip${view === k ? " on" : ""}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {view === "summary" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13 }}>
            <StatCard icon={<Icons.money size={22} />} label="إيراد هذا الشهر" value={fmt(rev)} accent={BRAND.green} />
            <StatCard icon={<Icons.finance size={22} />} label="مصاريف هذا الشهر" value={fmt(exp)} accent={BRAND.orange} />
            <StatCard icon={<Icons.check size={22} />} label="الصافي" value={fmt(rev - exp)} accent={rev - exp >= 0 ? BRAND.primary : BRAND.red} />
            <StatCard icon={<Icons.clock size={22} />} label="إجمالي الديون" value={fmt(totalDebt)} accent={BRAND.red} />
          </div>

          <div className="card" style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: BRAND.ink, marginBottom: 16 }}>الإيراد — آخر 7 أيام</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
              {last7.map((d, i) => {
                const isToday = i === 6;
                return (
                  <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: d.total > 0 ? BRAND.primary : BRAND.muted }}>{d.total > 0 ? fmt(d.total) : ""}</div>
                    <div style={{
                      width: "100%", maxWidth: 40, borderRadius: 8,
                      height: `${Math.max(6, (d.total / maxDay) * 100)}%`,
                      background: isToday ? `linear-gradient(180deg,${BRAND.primary},${BRAND.primaryLight})` : `${BRAND.primary}22`,
                      transition: "height .5s",
                    }} />
                    <div style={{ fontSize: 9.5, color: BRAND.muted, fontWeight: 700, direction: "ltr" }}>{d.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {view === "debts" && (
        debts.length === 0 ? (
          <div className="card" style={{ padding: 44, textAlign: "center", color: BRAND.muted }}>
            <div style={{ color: BRAND.green, display: "flex", justifyContent: "center", marginBottom: 10 }}><Icons.check size={38} /></div>
            <div style={{ fontWeight: 700 }}>لا توجد ديون — كل المدفوعات محصّلة ✨</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {debts.map(o => {
              const due = Number(o.price) - Number(o.paid);
              return (
                <div key={o.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${BRAND.red}12`, color: BRAND.red, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}>
                    {o.patient_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: BRAND.ink }}>{o.patient_name}</div>
                    <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2 }}>
                      طلب #{o.id} · {o.sample_date} · دفع {fmt(o.paid)} من {fmt(o.price)}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: BRAND.red }}>{fmt(due)}</div>
                  <button className="lab-btn" style={{ padding: "10px 16px", fontSize: 12, background: `${BRAND.green}12`, color: BRAND.green, border: `1.5px solid ${BRAND.green}44` }} onClick={() => onPay(o)}>
                    <Icons.money size={15} /> تحصيل
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === "expenses" && (
        <>
          <button className="lab-btn lab-btn-p" style={{ justifySelf: "start" }} onClick={() => setShowExpForm(v => !v)}>
            <Icons.plus size={17} /> تسجيل مصروف
          </button>

          {showExpForm && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <div>
                  <label className="lab-lbl">البيان *</label>
                  <input className="lab-inp" value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} placeholder="مثال: كواشف CBC" />
                </div>
                <div>
                  <label className="lab-lbl">المبلغ *</label>
                  <input className="lab-inp" value={expForm.amount} inputMode="decimal" style={{ direction: "ltr", textAlign: "right" }} onChange={e => setExpForm({ ...expForm, amount: e.target.value.replace(/[^\d.]/g, "") })} />
                </div>
                <div>
                  <label className="lab-lbl">التصنيف</label>
                  <select className="lab-inp" value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                    {Object.entries(EXP_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lab-lbl">ملاحظة</label>
                  <input className="lab-inp" value={expForm.notes} onChange={e => setExpForm({ ...expForm, notes: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="lab-btn lab-btn-p" disabled={savingExp} onClick={addExpense}>{savingExp ? "..." : "حفظ"}</button>
                <button className="lab-btn lab-btn-s" onClick={() => setShowExpForm(false)}>إلغاء</button>
              </div>
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: BRAND.muted, fontSize: 13 }}>لا مصاريف مسجّلة</div>
          ) : (
            <div style={{ display: "grid", gap: 9 }}>
              {expenses.map(e => (
                <div key={e.id} className="card" style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.ink }}>{e.title}</div>
                    <div style={{ fontSize: 10.5, color: BRAND.muted, marginTop: 2 }}>
                      {EXP_CATS[e.category] ?? e.category} · {e.expense_date}{e.notes ? ` · ${e.notes}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: BRAND.orange, flexShrink: 0 }}>−{fmt(e.amount)}</div>
                  <button className="lab-btn lab-btn-s" style={{ padding: "8px 10px", color: BRAND.red }} onClick={() => delExpense(e.id)}><Icons.trash size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// الكتالوج
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ catalog, setCatalog, apiFetch, showNotif }: {
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
    const res = await apiFetch("/api/lab/catalog", {
      method: "POST",
      body: JSON.stringify({
        action: editId ? "update" : "add", id: editId ?? undefined,
        name_ar: form.name_ar.trim(), name_en: form.name_en.trim() || null,
        category: form.category, unit: form.unit.trim() || null,
        ref_low: form.ref_low !== "" ? Number(form.ref_low) : null,
        ref_high: form.ref_high !== "" ? Number(form.ref_high) : null,
        ref_text: form.ref_text.trim() || null,
        price: Number(form.price) || 0,
      }),
    });
    if (res.ok) {
      const { test } = await res.json();
      setCatalog(prev => editId ? prev.map(t => (t.id === editId ? test : t)) : [...prev, test]);
      showNotif("✓ تم الحفظ");
      setForm(empty); setEditId(null); setShowForm(false);
    } else showNotif("فشل الحفظ", false);
    setSaving(false);
  };

  const del = async (t: CatalogTest) => {
    if (!t.user_id) { showNotif("لا يمكن حذف تحليل عام", false); return; }
    if (!confirm(`حذف "${t.name_ar}"؟`)) return;
    const res = await apiFetch("/api/lab/catalog", { method: "POST", body: JSON.stringify({ action: "delete", id: t.id }) });
    if (res.ok) { setCatalog(prev => prev.filter(x => x.id !== t.id)); showNotif("تم الحذف"); }
  };

  return (
    <div style={{ animation: "fadeUp .3s both", display: "grid", gap: 13 }}>
      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
          <span style={{ position: "absolute", insetInlineStart: 13, top: "50%", transform: "translateY(-50%)", color: BRAND.muted }}><Icons.search size={16} /></span>
          <input className="lab-inp" style={{ paddingInlineStart: 38 }} placeholder="بحث في الكتالوج..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button className="lab-btn lab-btn-p" onClick={() => { setForm(empty); setEditId(null); setShowForm(v => !v); }}>
          <Icons.plus size={17} /> تحليل جديد
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: BRAND.ink, marginBottom: 13 }}>{editId ? "تعديل تحليل" : "تحليل جديد"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 11 }}>
            <div><label className="lab-lbl">الاسم بالعربية *</label><input className="lab-inp" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></div>
            <div><label className="lab-lbl">الاسم بالإنجليزية</label><input className="lab-inp" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div>
              <label className="lab-lbl">التصنيف</label>
              <select className="lab-inp" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v.ar}</option>)}
              </select>
            </div>
            <div><label className="lab-lbl">الوحدة</label><input className="lab-inp" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="mg/dL" /></div>
            <div><label className="lab-lbl">الحد الأدنى</label><input className="lab-inp" value={form.ref_low} inputMode="decimal" onChange={e => setForm({ ...form, ref_low: e.target.value.replace(/[^\d.-]/g, "") })} /></div>
            <div><label className="lab-lbl">الحد الأعلى</label><input className="lab-inp" value={form.ref_high} inputMode="decimal" onChange={e => setForm({ ...form, ref_high: e.target.value.replace(/[^\d.-]/g, "") })} /></div>
            <div><label className="lab-lbl">مجال نصي (وصفي)</label><input className="lab-inp" value={form.ref_text} onChange={e => setForm({ ...form, ref_text: e.target.value })} placeholder="سلبي" /></div>
            <div><label className="lab-lbl">السعر</label><input className="lab-inp" value={form.price} inputMode="decimal" onChange={e => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="lab-btn lab-btn-p" disabled={saving} onClick={save}>{saving ? "..." : "حفظ"}</button>
            <button className="lab-btn lab-btn-s" onClick={() => { setShowForm(false); setEditId(null); }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 11 }}>
        {visible.map(t => (
          <div key={t.id} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.ink }}>{t.name_ar}</div>
                <div style={{ fontSize: 10.5, color: BRAND.muted, marginTop: 3 }}>
                  {t.name_en}
                  {(t.ref_low != null || t.ref_high != null) && ` · ${t.ref_low ?? ""}–${t.ref_high ?? ""} ${t.unit ?? ""}`}
                  {t.ref_text && ` · ${t.ref_text}`}
                </div>
              </div>
              <span style={{ fontSize: 9, background: t.user_id ? BRAND.sky : "#eef2f7", color: t.user_id ? BRAND.primary : BRAND.muted, borderRadius: 10, padding: "3px 9px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                {t.user_id ? "خاص" : "عام"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11 }}>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: BRAND.primary }}>{Number(t.price) > 0 ? fmt(t.price) : "—"}</div>
              {t.user_id && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="chip" style={{ padding: "6px 10px" }} onClick={() => {
                    setForm({
                      name_ar: t.name_ar, name_en: t.name_en ?? "", category: t.category,
                      unit: t.unit ?? "", ref_low: t.ref_low != null ? String(t.ref_low) : "",
                      ref_high: t.ref_high != null ? String(t.ref_high) : "",
                      ref_text: t.ref_text ?? "", price: String(t.price ?? ""),
                    });
                    setEditId(t.id); setShowForm(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}><Icons.edit size={13} /></button>
                  <button className="chip" style={{ padding: "6px 10px", color: BRAND.red }} onClick={() => del(t)}><Icons.trash size={13} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
