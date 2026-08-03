"use client";

// ============================================================
// FinancePanel — النظام المالي المتكامل في لوحة الأدمن
// نظرة عامة | الاشتراكات (تسعير + دفعات) | سجل المداخيل | المصروفات
// ============================================================

import { useEffect, useState, useCallback, useMemo } from "react";

type ClinicRow = {
  id: number;
  user_id: string;
  name: string;
  owner: string | null;
  plan: string;
  status: string;
  account_type: string | null;
  currency: string | null;
  price_override: number | null;
  discount_percent: number | null;
  billing_cycle: "monthly" | "yearly" | null;
  next_billing_date: string | null;
  payment_status: "paid" | "due" | "overdue" | null;
};

type Expense = {
  id: number;
  category: string;
  amount: number;
  currency: string;
  note: string | null;
  expense_date: string;
  created_at: string;
};

type IncomeEntry = {
  id: number;
  clinic_id: number | null;
  source: "subscription" | "other";
  category: string | null;
  amount: number;
  currency: string;
  note: string | null;
  income_date: string;
  created_at: string;
  clinics?: { name: string } | null;
};

const PLAN_PRICING: Record<string, { monthly: number; yearly: number }> = {
  basic:             { monthly: 5.99,  yearly: 59  },
  pro:               { monthly: 7.99,  yearly: 79  },
  enterprise:        { monthly: 14.99, yearly: 149 },
  shared_basic:      { monthly: 7.99,  yearly: 79  },
  shared_pro:        { monthly: 13.99, yearly: 139 },
  shared_enterprise: { monthly: 21.99, yearly: 219 },
  pharmacy:          { monthly: 49,    yearly: 490 },
  lab:               { monthly: 49,    yearly: 490 },
};

const PLAN_LABELS_AR: Record<string, string> = {
  basic: "أساسية", pro: "احترافية", enterprise: "شاملة",
  shared_basic: "مشتركة أساسية", shared_pro: "مشتركة احترافية", shared_enterprise: "مشتركة شاملة",
  pharmacy: "صيدلية", lab: "مختبر",
};
const PLAN_LABELS_EN: Record<string, string> = {
  basic: "Basic", pro: "Pro", enterprise: "Enterprise",
  shared_basic: "Shared Basic", shared_pro: "Shared Pro", shared_enterprise: "Shared Enterprise",
  pharmacy: "Pharmacy", lab: "Lab",
};

const EXPENSE_CATEGORIES: { key: string; ar: string; en: string }[] = [
  { key: "salaries", ar: "رواتب", en: "Salaries" },
  { key: "servers", ar: "سيرفرات", en: "Servers" },
  { key: "marketing", ar: "تسويق", en: "Marketing" },
  { key: "other", ar: "أخرى", en: "Other" },
];

function effectivePrice(c: ClinicRow): { amount: number; cycle: "monthly" | "yearly" } {
  const cycle = c.billing_cycle === "monthly" ? "monthly" : "yearly";
  const base = PLAN_PRICING[c.plan]?.[cycle] ?? 0;
  if (c.price_override !== undefined && c.price_override !== null) return { amount: c.price_override, cycle };
  if (c.discount_percent) return { amount: +(base * (1 - c.discount_percent / 100)).toFixed(2), cycle };
  return { amount: base, cycle };
}

function monthlyEquivalent(c: ClinicRow): number {
  const { amount, cycle } = effectivePrice(c);
  return cycle === "yearly" ? amount / 12 : amount;
}

// حالة الدفع الفعلية محسوبة من next_billing_date (وليس فقط من الحقل المخزّن)
function billingStatus(c: ClinicRow): "none" | "ok" | "soon" | "overdue" {
  if (!c.next_billing_date) return "none";
  const days = Math.floor((new Date(c.next_billing_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  return "ok";
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

const T = {
  ar: {
    tabs: { overview: "نظرة عامة", subs: "الاشتراكات", income: "سجل المداخيل", expenses: "المصروفات" },
    // overview
    mrr: "الدخل المتوقع شهرياً", collected: "المحصّل هذا الشهر", expensesMonth: "المصروفات هذا الشهر", net: "الصافي الفعلي",
    overdueTitle: "حسابات متأخرة الدفع", soonTitle: "مستحقة خلال أسبوع", noAlerts: "لا توجد تنبيهات — كل شيء منتظم",
    // subscriptions
    activeAccounts: "الحسابات النشطة", account: "الحساب", plan: "الخطة", price: "السعر الفعلي",
    cycle: "الدورة", monthly: "شهري", yearly: "سنوي", nextDue: "الاستحقاق القادم",
    statusOk: "منتظم", statusSoon: "قريب", statusOverdue: "متأخر", statusNone: "غير محدد",
    editTitle: "تعديل الاشتراك", editSubtitle: "الخطة الافتراضية",
    discount: "خصم % (اختياري)", manualPrice: "سعر يدوي (اختياري — 0 يعني مجاني)",
    save: "حفظ", cancel: "إلغاء", edit: "تعديل", recordPayment: "تسجيل دفعة",
    recordPaymentTitle: "تسجيل دفعة", recordPaymentDesc: "سيُسجَّل كمدخول ويُحدَّث تاريخ الاستحقاق التالي تلقائياً",
    amountPaid: "المبلغ المدفوع", confirm: "تأكيد", noAccounts: "لا توجد حسابات نشطة",
    // income
    incomeLog: "سجل المداخيل", addIncome: "+ إضافة دخل يدوي", source: "المصدر", subscription: "اشتراك", other: "أخرى",
    noIncome: "لا توجد مداخيل مسجلة",
    // expenses
    addExpense: "+ إضافة مصروف", category: "التصنيف", amount: "المبلغ",
    note: "ملاحظة (اختياري)", date: "التاريخ", add: "إضافة", delete: "حذف",
    noExpenses: "لا توجد مصروفات مسجلة",
    confirmDelete: "حذف هذا العنصر؟", saveError: "تعذّر الحفظ — حاول مجدداً",
  },
  en: {
    tabs: { overview: "Overview", subs: "Subscriptions", income: "Income Log", expenses: "Expenses" },
    mrr: "Expected Monthly Revenue", collected: "Collected This Month", expensesMonth: "This Month's Expenses", net: "Actual Net",
    overdueTitle: "Overdue Accounts", soonTitle: "Due Within a Week", noAlerts: "No alerts — everything's on track",
    activeAccounts: "Active Accounts", account: "Account", plan: "Plan", price: "Effective Price",
    cycle: "Cycle", monthly: "Monthly", yearly: "Yearly", nextDue: "Next Due",
    statusOk: "On track", statusSoon: "Due soon", statusOverdue: "Overdue", statusNone: "Not set",
    editTitle: "Edit Subscription", editSubtitle: "Default plan price",
    discount: "Discount % (optional)", manualPrice: "Manual Price (optional — 0 means free)",
    save: "Save", cancel: "Cancel", edit: "Edit", recordPayment: "Record Payment",
    recordPaymentTitle: "Record Payment", recordPaymentDesc: "Logged as income and next due date updates automatically",
    amountPaid: "Amount Paid", confirm: "Confirm", noAccounts: "No active accounts",
    incomeLog: "Income Log", addIncome: "+ Add Manual Income", source: "Source", subscription: "Subscription", other: "Other",
    noIncome: "No income recorded",
    addExpense: "+ Add Expense", category: "Category", amount: "Amount",
    note: "Note (optional)", date: "Date", add: "Add", delete: "Delete",
    noExpenses: "No expenses recorded",
    confirmDelete: "Delete this item?", saveError: "Save failed — try again",
  },
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 10px", border: "1.5px solid #eef0f3", borderRadius: 8,
  fontFamily: "Rubik,sans-serif", fontSize: 13, color: "#353535", boxSizing: "border-box",
};
const cardStyle: React.CSSProperties = { background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 16, padding: 20 };

export default function FinancePanel({ isAr }: { isAr: boolean }) {
  const lang = isAr ? "ar" : "en";
  const tr = T[lang];
  const planLabels = isAr ? PLAN_LABELS_AR : PLAN_LABELS_EN;

  const [tab, setTab] = useState<"overview" | "subs" | "income" | "expenses">("overview");
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cRes = await fetch("/api/get-clinics", { credentials: "include" });
      const cData = await cRes.json();
      setClinics(Array.isArray(cData) ? cData : []);
      const eRes = await fetch("/api/finance/expenses", { credentials: "include" });
      const eData = await eRes.json();
      setExpenses(eData?.expenses ?? []);
      const iRes = await fetch("/api/finance/income", { credentials: "include" });
      const iData = await iRes.json();
      setIncome(iData?.income ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeClinics = useMemo(() => clinics.filter(c => c.status === "active"), [clinics]);
  const mrr = useMemo(() => activeClinics.reduce((s, c) => s + monthlyEquivalent(c), 0), [activeClinics]);
  const overdueAccounts = useMemo(() => activeClinics.filter(c => billingStatus(c) === "overdue"), [activeClinics]);
  const soonAccounts = useMemo(() => activeClinics.filter(c => billingStatus(c) === "soon"), [activeClinics]);

  const thisMonthExpenses = useMemo(() => expenses.filter(e => e.expense_date?.startsWith(ymNow())), [expenses]);
  const expensesTotal = useMemo(() => thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0), [thisMonthExpenses]);
  const thisMonthIncome = useMemo(() => income.filter(i => i.income_date?.startsWith(ymNow())), [income]);
  const incomeTotal = useMemo(() => thisMonthIncome.reduce((s, i) => s + Number(i.amount), 0), [thisMonthIncome]);

  // ── Edit subscription modal ──
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [editForm, setEditForm] = useState({ billing_cycle: "yearly" as "monthly" | "yearly", discount_percent: "", price_override: "", next_billing_date: "" });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);

  const openEdit = (c: ClinicRow) => {
    setSaveErr(false);
    setEditingClinic(c);
    setEditForm({
      billing_cycle: c.billing_cycle === "monthly" ? "monthly" : "yearly",
      discount_percent: c.discount_percent != null ? String(c.discount_percent) : "",
      price_override: c.price_override != null ? String(c.price_override) : "",
      next_billing_date: c.next_billing_date || "",
    });
  };

  const saveSubscription = async () => {
    if (!editingClinic) return;
    setSaving(true); setSaveErr(false);
    try {
      const res = await fetch("/api/finance/clinic-price", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          id: editingClinic.id,
          billing_cycle: editForm.billing_cycle,
          discount_percent: editForm.discount_percent === "" ? null : Number(editForm.discount_percent),
          price_override: editForm.price_override === "" ? null : Number(editForm.price_override),
          next_billing_date: editForm.next_billing_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(true); return; }
      setClinics(prev => prev.map(x => x.id === editingClinic.id ? { ...x, ...data.clinic } : x));
      setEditingClinic(null);
    } catch (e) { console.error(e); setSaveErr(true); } finally { setSaving(false); }
  };

  // ── Record payment modal ──
  const [payingClinic, setPayingClinic] = useState<ClinicRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState(false);

  const openPay = (c: ClinicRow) => {
    setPayErr(false);
    setPayingClinic(c);
    setPayAmount(String(effectivePrice(c).amount));
  };

  const confirmPayment = async () => {
    if (!payingClinic || !payAmount || isNaN(Number(payAmount))) return;
    setPaying(true); setPayErr(false);
    try {
      const res = await fetch("/api/finance/record-payment", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ clinic_id: payingClinic.id, amount: Number(payAmount), billing_cycle: payingClinic.billing_cycle === "monthly" ? "monthly" : "yearly" }),
      });
      const data = await res.json();
      if (!res.ok) { setPayErr(true); return; }
      setClinics(prev => prev.map(x => x.id === payingClinic.id ? { ...x, ...data.clinic } : x));
      setIncome(prev => [data.income, ...prev]);
      setPayingClinic(null);
    } catch (e) { console.error(e); setPayErr(true); } finally { setPaying(false); }
  };

  // ── Expenses ──
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "salaries", amount: "", note: "", expense_date: todayStr() });
  const [addingExpense, setAddingExpense] = useState(false);

  const addExpense = async () => {
    if (!newExpense.amount || isNaN(Number(newExpense.amount))) return;
    setAddingExpense(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(newExpense),
      });
      const data = await res.json();
      if (res.ok && data.expense) {
        setExpenses(prev => [data.expense, ...prev]);
        setNewExpense({ category: "salaries", amount: "", note: "", expense_date: todayStr() });
        setShowAddExpense(false);
      }
    } catch (e) { console.error(e); } finally { setAddingExpense(false); }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm(tr.confirmDelete)) return;
    const res = await fetch(`/api/finance/expenses?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ── Manual income ──
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncome, setNewIncome] = useState({ amount: "", category: "", note: "", income_date: todayStr() });
  const [addingIncome, setAddingIncome] = useState(false);

  const addIncome = async () => {
    if (!newIncome.amount || isNaN(Number(newIncome.amount))) return;
    setAddingIncome(true);
    try {
      const res = await fetch("/api/finance/income", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ ...newIncome, source: "other" }),
      });
      const data = await res.json();
      if (res.ok && data.income) {
        setIncome(prev => [data.income, ...prev]);
        setNewIncome({ amount: "", category: "", note: "", income_date: todayStr() });
        setShowAddIncome(false);
      }
    } catch (e) { console.error(e); } finally { setAddingIncome(false); }
  };

  const deleteIncome = async (id: number) => {
    if (!confirm(tr.confirmDelete)) return;
    const res = await fetch(`/api/finance/income?id=${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setIncome(prev => prev.filter(i => i.id !== id));
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>...</div>;

  const statusColor = { ok: "#27ae60", soon: "#e67e22", overdue: "#c0392b", none: "#aaa" };
  const statusLabel = { ok: tr.statusOk, soon: tr.statusSoon, overdue: tr.statusOverdue, none: tr.statusNone };

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr" }}>
      <style>{`
        .fin-tabs{display:flex;gap:6px;margin-bottom:20px;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .fin-tab{padding:9px 16px;border:1.5px solid #eef0f3;border-radius:10px;background:#fff;color:#888;font-size:13px;font-weight:600;cursor:pointer;font-family:Rubik,sans-serif;white-space:nowrap;flex-shrink:0}
        .fin-tab.active{background:#0863ba;border-color:#0863ba;color:#fff}
        .fin-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
        .fin-table-row{display:grid;grid-template-columns:1.8fr 1fr .9fr 1fr 1.1fr auto auto;gap:8px;align-items:center;padding:12px 0;border-bottom:1px solid #f2f4f7}
        .fin-table-head{display:grid;grid-template-columns:1.8fr 1fr .9fr 1fr 1.1fr auto auto;gap:8px;padding:0 0 10px;font-size:11px;color:#aaa;font-weight:700;border-bottom:1.5px solid #eef0f3}
        .fin-list-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f2f4f7;gap:10px}
        .fin-modal-backdrop{position:fixed;inset:0;background:rgba(20,25,35,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
        .fin-modal{background:#fff;border-radius:18px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto}
        @media(max-width:768px){
          .fin-grid{grid-template-columns:1fr 1fr;gap:10px}
          .fin-table-head{display:none}
          .fin-table-row{grid-template-columns:1fr;gap:6px;padding:14px 12px;background:#f7f9fc;border-radius:12px;margin-bottom:8px}
          .fin-list-row{flex-direction:column;align-items:stretch;background:#f7f9fc;border-radius:12px;padding:12px;margin-bottom:8px}
          .fin-modal{align-self:flex-end;max-width:none;border-radius:18px 18px 0 0}
        }
      `}</style>

      <div className="fin-tabs">
        {(["overview", "subs", "income", "expenses"] as const).map(k => (
          <button key={k} className={`fin-tab${tab === k ? " active" : ""}`} onClick={() => setTab(k)}>{tr.tabs[k]}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="fin-grid">
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.mrr}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#0863ba" }}>${mrr.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.collected}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#27ae60" }}>${incomeTotal.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.expensesMonth}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#c0392b" }}>${expensesTotal.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.net}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#353535" }}>${(incomeTotal - expensesTotal).toFixed(2)}</div>
            </div>
          </div>

          {(overdueAccounts.length > 0 || soonAccounts.length > 0) ? (
            <div style={{ display: "grid", gap: 14 }}>
              {overdueAccounts.length > 0 && (
                <div style={{ ...cardStyle, borderColor: "rgba(192,57,43,.25)" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#c0392b", marginBottom: 10 }}>⚠ {tr.overdueTitle} ({overdueAccounts.length})</div>
                  {overdueAccounts.map(c => (
                    <div key={c.id} className="fin-list-row">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <button onClick={() => openPay(c)} style={{ padding: "6px 12px", fontSize: 11, background: "#c0392b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.recordPayment}</button>
                    </div>
                  ))}
                </div>
              )}
              {soonAccounts.length > 0 && (
                <div style={{ ...cardStyle, borderColor: "rgba(230,126,34,.25)" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#e67e22", marginBottom: 10 }}>⏱ {tr.soonTitle} ({soonAccounts.length})</div>
                  {soonAccounts.map(c => (
                    <div key={c.id} className="fin-list-row">
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name} <span style={{ color: "#aaa", fontWeight: 400 }}>· {c.next_billing_date}</span></div>
                      <button onClick={() => openPay(c)} style={{ padding: "6px 12px", fontSize: 11, background: "#e67e22", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.recordPayment}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, textAlign: "center", color: "#aaa", fontSize: 13 }}>✓ {tr.noAlerts}</div>
          )}
        </>
      )}

      {tab === "subs" && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#353535", marginBottom: 14 }}>
            {tr.activeAccounts} <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400 }}>({activeClinics.length})</span>
          </div>
          <div className="fin-table-head">
            <div>{tr.account}</div><div>{tr.plan}</div><div>{tr.cycle}</div><div>{tr.price}</div><div>{tr.nextDue}</div><div></div><div></div>
          </div>
          {activeClinics.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>{tr.noAccounts}</div>}
          {activeClinics.map(c => {
            const { amount, cycle } = effectivePrice(c);
            const isCustom = (c.price_override !== null && c.price_override !== undefined) || !!c.discount_percent;
            const st = billingStatus(c);
            return (
              <div className="fin-table-row" key={c.id}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#353535" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{planLabels[c.plan] || c.plan}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{cycle === "yearly" ? tr.yearly : tr.monthly}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isCustom ? "#7b2d8b" : "#27ae60" }}>
                  ${amount.toFixed(2)}{isCustom && <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}> ●</span>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#888" }}>{c.next_billing_date || "—"}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: statusColor[st] }}>{statusLabel[st]}</div>
                </div>
                <button onClick={() => openEdit(c)} style={{ padding: "6px 10px", fontSize: 11, background: "transparent", color: "#0863ba", border: "1.5px solid rgba(8,99,186,.2)", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif", whiteSpace: "nowrap" }}>{tr.edit}</button>
                <button onClick={() => openPay(c)} style={{ padding: "6px 10px", fontSize: 11, background: "#27ae60", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif", whiteSpace: "nowrap" }}>{tr.recordPayment}</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "income" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#353535" }}>{tr.incomeLog}</div>
            <button onClick={() => setShowAddIncome(v => !v)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#27ae60", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.addIncome}</button>
          </div>
          {showAddIncome && (
            <div style={{ background: "#f7f9fc", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
              <input style={inputStyle} placeholder={tr.category} value={newIncome.category} onChange={e => setNewIncome(p => ({ ...p, category: e.target.value }))} />
              <input style={inputStyle} type="number" placeholder={tr.amount} value={newIncome.amount} onChange={e => setNewIncome(p => ({ ...p, amount: e.target.value }))} />
              <input style={inputStyle} type="date" value={newIncome.income_date} onChange={e => setNewIncome(p => ({ ...p, income_date: e.target.value }))} />
              <button onClick={addIncome} disabled={addingIncome} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "#0863ba", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{addingIncome ? "..." : tr.add}</button>
              <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder={tr.note} value={newIncome.note} onChange={e => setNewIncome(p => ({ ...p, note: e.target.value }))} />
            </div>
          )}
          {income.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>{tr.noIncome}</div>}
          {income.map(i => (
            <div className="fin-list-row" key={i.id}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#353535" }}>
                  {i.clinics?.name || i.category || (i.source === "subscription" ? tr.subscription : tr.other)}
                  <span style={{ marginInlineStart: 6, fontSize: 10, fontWeight: 700, color: i.source === "subscription" ? "#0863ba" : "#888", background: i.source === "subscription" ? "rgba(8,99,186,.08)" : "#f2f4f7", padding: "2px 6px", borderRadius: 5 }}>
                    {i.source === "subscription" ? tr.subscription : tr.other}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{i.income_date}{i.note ? ` · ${i.note}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#27ae60" }}>${Number(i.amount).toFixed(2)}</span>
                <button onClick={() => deleteIncome(i.id)} style={{ padding: "5px 10px", fontSize: 11, background: "rgba(192,57,43,.06)", color: "#c0392b", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.delete}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "expenses" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#353535" }}>{tr.tabs.expenses}</div>
            <button onClick={() => setShowAddExpense(v => !v)} style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#0863ba", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.addExpense}</button>
          </div>
          {showAddExpense && (
            <div style={{ background: "#f7f9fc", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
              <select style={inputStyle} value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{isAr ? c.ar : c.en}</option>)}
              </select>
              <input style={inputStyle} type="number" placeholder={tr.amount} value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} />
              <input style={inputStyle} type="date" value={newExpense.expense_date} onChange={e => setNewExpense(p => ({ ...p, expense_date: e.target.value }))} />
              <button onClick={addExpense} disabled={addingExpense} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "#27ae60", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{addingExpense ? "..." : tr.add}</button>
              <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder={tr.note} value={newExpense.note} onChange={e => setNewExpense(p => ({ ...p, note: e.target.value }))} />
            </div>
          )}
          {expenses.length === 0 && <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>{tr.noExpenses}</div>}
          {expenses.map(e => {
            const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
            return (
              <div className="fin-list-row" key={e.id}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#353535" }}>{cat ? (isAr ? cat.ar : cat.en) : e.category}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{e.expense_date}{e.note ? ` · ${e.note}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#c0392b" }}>${Number(e.amount).toFixed(2)}</span>
                  <button onClick={() => deleteExpense(e.id)} style={{ padding: "5px 10px", fontSize: 11, background: "rgba(192,57,43,.06)", color: "#c0392b", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>{tr.delete}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit subscription modal */}
      {editingClinic && (
        <div className="fin-modal-backdrop" onClick={() => !saving && setEditingClinic(null)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#353535", marginBottom: 2 }}>{tr.editTitle}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 18 }}>{editingClinic.name} — {planLabels[editingClinic.plan] || editingClinic.plan}</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.cycle}</div>
              <div style={{ display: "flex", background: "#f7f9fc", borderRadius: 10, padding: 4, gap: 4 }}>
                {(["monthly", "yearly"] as const).map(cyc => (
                  <button key={cyc} type="button" onClick={() => setEditForm(f => ({ ...f, billing_cycle: cyc }))}
                    style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 12, fontWeight: editForm.billing_cycle === cyc ? 700 : 400, background: editForm.billing_cycle === cyc ? "#fff" : "transparent", color: editForm.billing_cycle === cyc ? "#0863ba" : "#888", boxShadow: editForm.billing_cycle === cyc ? "0 2px 6px rgba(8,99,186,.1)" : "none" }}>
                    {cyc === "monthly" ? tr.monthly : tr.yearly}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{tr.editSubtitle}: ${PLAN_PRICING[editingClinic.plan]?.[editForm.billing_cycle] ?? 0}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.discount}</div>
              <input style={inputStyle} type="number" placeholder="0" value={editForm.discount_percent} onChange={e => setEditForm(f => ({ ...f, discount_percent: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.manualPrice}</div>
              <input style={inputStyle} type="number" step="0.01" placeholder={String(PLAN_PRICING[editingClinic.plan]?.[editForm.billing_cycle] ?? 0)} value={editForm.price_override} onChange={e => setEditForm(f => ({ ...f, price_override: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.nextDue}</div>
              <input style={inputStyle} type="date" value={editForm.next_billing_date} onChange={e => setEditForm(f => ({ ...f, next_billing_date: e.target.value }))} />
            </div>

            {saveErr && <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 12 }}>{tr.saveError}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingClinic(null)} disabled={saving} style={{ flex: 1, padding: "11px", background: "#f7f9fc", color: "#666", border: "1.5px solid #eef0f3", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 600 }}>{tr.cancel}</button>
              <button onClick={saveSubscription} disabled={saving} style={{ flex: 1, padding: "11px", background: "#0863ba", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700 }}>{saving ? "..." : tr.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {payingClinic && (
        <div className="fin-modal-backdrop" onClick={() => !paying && setPayingClinic(null)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#353535", marginBottom: 2 }}>{tr.recordPaymentTitle}</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{payingClinic.name}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 18 }}>{tr.recordPaymentDesc}</div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.amountPaid}</div>
              <input style={inputStyle} type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>

            {payErr && <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 12 }}>{tr.saveError}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setPayingClinic(null)} disabled={paying} style={{ flex: 1, padding: "11px", background: "#f7f9fc", color: "#666", border: "1.5px solid #eef0f3", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 600 }}>{tr.cancel}</button>
              <button onClick={confirmPayment} disabled={paying} style={{ flex: 1, padding: "11px", background: "#27ae60", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700 }}>{paying ? "..." : tr.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
