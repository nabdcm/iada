"use client";

// ============================================================
// FinancePanel — تبويب المالية في لوحة الأدمن
// الدخل التلقائي من الاشتراكات النشطة (قابل للتعديل يدوياً/خصم)
// + دورة الفوترة شهري/سنوي + المصروفات اليدوية بتصنيفات ثابتة
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

// السعر الفعلي بدورة الفوترة الخاصة بالعيادة (يدوي > خصم > افتراضي الخطة)
function effectivePrice(c: ClinicRow): { amount: number; cycle: "monthly" | "yearly" } {
  const cycle = c.billing_cycle === "yearly" ? "yearly" : "monthly";
  const base = PLAN_PRICING[c.plan]?.[cycle] ?? 0;
  if (c.price_override !== undefined && c.price_override !== null) {
    return { amount: c.price_override, cycle };
  }
  if (c.discount_percent) return { amount: +(base * (1 - c.discount_percent / 100)).toFixed(2), cycle };
  return { amount: base, cycle };
}

// المعادل الشهري (لتجميع الدخل الشهري المتكرر بغض النظر عن دورة كل عيادة)
function monthlyEquivalent(c: ClinicRow): number {
  const { amount, cycle } = effectivePrice(c);
  return cycle === "yearly" ? amount / 12 : amount;
}

const T = {
  ar: {
    title: "المالية", subtitle: "الدخل من الاشتراكات النشطة والمصروفات اليدوية",
    mrr: "الدخل الشهري المتكرر", expensesMonth: "مصروفات هذا الشهر", net: "الصافي الشهري",
    activeAccounts: "الحسابات النشطة", account: "الحساب", plan: "الخطة", price: "السعر الفعلي",
    cycle: "الدورة", monthly: "شهري", yearly: "سنوي",
    editTitle: "تعديل التسعير", editSubtitle: "الخطة الافتراضية",
    discount: "خصم % (اختياري)", manualPrice: "سعر يدوي (اختياري — يتجاوز الخصم)",
    save: "حفظ", saved: "✓ تم الحفظ", cancel: "إلغاء", edit: "تعديل",
    expenses: "المصروفات", addExpense: "+ إضافة مصروف", category: "التصنيف", amount: "المبلغ",
    note: "ملاحظة (اختياري)", date: "التاريخ", add: "إضافة", delete: "حذف",
    noExpenses: "لا توجد مصروفات مسجلة", noAccounts: "لا توجد حسابات نشطة",
    confirmDelete: "حذف هذا المصروف؟", saveError: "تعذّر الحفظ — حاول مجدداً",
  },
  en: {
    title: "Finance", subtitle: "Income from active subscriptions and manual expenses",
    mrr: "Monthly Recurring Revenue", expensesMonth: "This Month's Expenses", net: "Net Monthly",
    activeAccounts: "Active Accounts", account: "Account", plan: "Plan", price: "Effective Price",
    cycle: "Cycle", monthly: "Monthly", yearly: "Yearly",
    editTitle: "Edit Pricing", editSubtitle: "Default plan price",
    discount: "Discount % (optional)", manualPrice: "Manual Price (optional — overrides discount)",
    save: "Save", saved: "✓ Saved", cancel: "Cancel", edit: "Edit",
    expenses: "Expenses", addExpense: "+ Add Expense", category: "Category", amount: "Amount",
    note: "Note (optional)", date: "Date", add: "Add", delete: "Delete",
    noExpenses: "No expenses recorded", noAccounts: "No active accounts",
    confirmDelete: "Delete this expense?", saveError: "Save failed — try again",
  },
};

export default function FinancePanel({ isAr }: { isAr: boolean }) {
  const lang = isAr ? "ar" : "en";
  const tr = T[lang];
  const planLabels = isAr ? PLAN_LABELS_AR : PLAN_LABELS_EN;

  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Edit modal state ──
  const [editingClinic, setEditingClinic] = useState<ClinicRow | null>(null);
  const [editForm, setEditForm] = useState({ billing_cycle: "monthly" as "monthly" | "yearly", discount_percent: "", price_override: "" });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: "salaries", amount: "", note: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [addingExpense, setAddingExpense] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        fetch("/api/get-clinics", { credentials: "include" }),
        fetch("/api/finance/expenses", { credentials: "include" }),
      ]);
      const cData = await cRes.json();
      const eData = await eRes.json();
      setClinics(Array.isArray(cData) ? cData : []);
      setExpenses(eData?.expenses ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeClinics = useMemo(() => clinics.filter(c => c.status === "active"), [clinics]);
  const mrr = useMemo(() => activeClinics.reduce((sum, c) => sum + monthlyEquivalent(c), 0), [activeClinics]);

  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return expenses.filter(e => e.expense_date?.startsWith(ym));
  }, [expenses]);
  const expensesTotal = useMemo(() => thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0), [thisMonthExpenses]);

  const openEdit = (c: ClinicRow) => {
    setSaveErr(false);
    setEditingClinic(c);
    setEditForm({
      billing_cycle: c.billing_cycle === "yearly" ? "yearly" : "monthly",
      discount_percent: c.discount_percent != null ? String(c.discount_percent) : "",
      price_override: c.price_override != null ? String(c.price_override) : "",
    });
  };

  const savePrice = async () => {
    if (!editingClinic) return;
    setSaving(true);
    setSaveErr(false);
    try {
      const res = await fetch("/api/finance/clinic-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingClinic.id,
          billing_cycle: editForm.billing_cycle,
          discount_percent: editForm.discount_percent === "" ? null : Number(editForm.discount_percent),
          price_override: editForm.price_override === "" ? null : Number(editForm.price_override),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(true); return; }
      setClinics(prev => prev.map(x => x.id === editingClinic.id ? { ...x, ...data.clinic } : x));
      setEditingClinic(null);
    } catch (e) {
      console.error(e);
      setSaveErr(true);
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async () => {
    if (!newExpense.amount || isNaN(Number(newExpense.amount))) return;
    setAddingExpense(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newExpense),
      });
      const data = await res.json();
      if (res.ok && data.expense) {
        setExpenses(prev => [data.expense, ...prev]);
        setNewExpense({ category: "salaries", amount: "", note: "", expense_date: new Date().toISOString().slice(0, 10) });
        setShowAddExpense(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingExpense(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm(tr.confirmDelete)) return;
    try {
      const res = await fetch(`/api/finance/expenses?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 10px", border: "1.5px solid #eef0f3", borderRadius: 8,
    fontFamily: "Rubik,sans-serif", fontSize: 13, color: "#353535", boxSizing: "border-box",
  };
  const cardStyle: React.CSSProperties = {
    background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 16, padding: 20,
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#aaa", fontSize: 13 }}>...</div>;
  }

  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr" }}>
      <style>{`
        .fin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:22px}
        .fin-table-row{display:grid;grid-template-columns:2fr 1.3fr 1fr 1.3fr auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #f2f4f7}
        .fin-table-head{display:grid;grid-template-columns:2fr 1.3fr 1fr 1.3fr auto;gap:10px;padding:0 0 10px;font-size:11px;color:#aaa;font-weight:700;border-bottom:1.5px solid #eef0f3}
        .fin-exp-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f2f4f7;gap:10px}
        .fin-modal-backdrop{position:fixed;inset:0;background:rgba(20,25,35,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:200;padding:16px}
        .fin-modal{background:#fff;border-radius:18px;padding:24px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
        @media(max-width:768px){
          .fin-grid{grid-template-columns:1fr;gap:10px}
          .fin-table-head{display:none}
          .fin-table-row{grid-template-columns:1fr;gap:6px;padding:14px 12px;background:#f7f9fc;border-radius:12px;margin-bottom:8px}
          .fin-exp-row{flex-direction:column;align-items:stretch;background:#f7f9fc;border-radius:12px;padding:12px;margin-bottom:8px}
          .fin-modal{align-self:flex-end;max-width:none;border-radius:18px 18px 0 0}
        }
      `}</style>

      {/* Summary cards */}
      <div className="fin-grid">
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.mrr}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#27ae60" }}>${mrr.toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.expensesMonth}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#c0392b" }}>${expensesTotal.toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: "#aaa", fontWeight: 700, marginBottom: 8 }}>{tr.net}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0863ba" }}>${(mrr - expensesTotal).toFixed(2)}</div>
        </div>
      </div>

      {/* Active accounts */}
      <div style={{ ...cardStyle, marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#353535", marginBottom: 14 }}>
          {tr.activeAccounts} <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400 }}>({activeClinics.length})</span>
        </div>

        <div className="fin-table-head">
          <div>{tr.account}</div><div>{tr.plan}</div><div>{tr.cycle}</div><div>{tr.price}</div><div></div>
        </div>

        {activeClinics.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>{tr.noAccounts}</div>
        )}

        {activeClinics.map(c => {
          const { amount, cycle } = effectivePrice(c);
          const isCustom = (c.price_override !== null && c.price_override !== undefined) || !!c.discount_percent;
          return (
            <div className="fin-table-row" key={c.id}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#353535" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{planLabels[c.plan] || c.plan}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{cycle === "yearly" ? tr.yearly : tr.monthly}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isCustom ? "#7b2d8b" : "#27ae60" }}>
                ${amount.toFixed(2)}{isCustom && <span style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}> ●</span>}
              </div>
              <button onClick={() => openEdit(c)}
                style={{ padding: "6px 12px", fontSize: 11, background: "transparent", color: "#0863ba", border: "1.5px solid rgba(8,99,186,.2)", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif", whiteSpace: "nowrap" }}>
                {tr.edit}
              </button>
            </div>
          );
        })}
      </div>

      {/* Expenses */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#353535" }}>{tr.expenses}</div>
          <button onClick={() => setShowAddExpense(v => !v)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#0863ba", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>
            {tr.addExpense}
          </button>
        </div>

        {showAddExpense && (
          <div style={{ background: "#f7f9fc", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10 }}>
            <select style={inputStyle} value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{isAr ? c.ar : c.en}</option>)}
            </select>
            <input style={inputStyle} type="number" placeholder={tr.amount} value={newExpense.amount}
              onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} />
            <input style={inputStyle} type="date" value={newExpense.expense_date}
              onChange={e => setNewExpense(p => ({ ...p, expense_date: e.target.value }))} />
            <button onClick={addExpense} disabled={addingExpense}
              style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, background: "#27ae60", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>
              {addingExpense ? "..." : tr.add}
            </button>
            <input style={{ ...inputStyle, gridColumn: "1 / -1" }} placeholder={tr.note} value={newExpense.note}
              onChange={e => setNewExpense(p => ({ ...p, note: e.target.value }))} />
          </div>
        )}

        {expenses.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#aaa", fontSize: 13 }}>{tr.noExpenses}</div>
        )}

        {expenses.map(e => {
          const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
          return (
            <div className="fin-exp-row" key={e.id}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#353535" }}>{cat ? (isAr ? cat.ar : cat.en) : e.category}</div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{e.expense_date}{e.note ? ` · ${e.note}` : ""}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#c0392b" }}>${Number(e.amount).toFixed(2)}</span>
                <button onClick={() => deleteExpense(e.id)}
                  style={{ padding: "5px 10px", fontSize: 11, background: "rgba(192,57,43,.06)", color: "#c0392b", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 6, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>
                  {tr.delete}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit pricing modal */}
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
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>
                {tr.editSubtitle}: ${PLAN_PRICING[editingClinic.plan]?.[editForm.billing_cycle] ?? 0}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.discount}</div>
              <input style={inputStyle} type="number" placeholder="0" value={editForm.discount_percent}
                onChange={e => setEditForm(f => ({ ...f, discount_percent: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 6 }}>{tr.manualPrice}</div>
              <input style={inputStyle} type="number" step="0.01" placeholder={String(PLAN_PRICING[editingClinic.plan]?.[editForm.billing_cycle] ?? 0)} value={editForm.price_override}
                onChange={e => setEditForm(f => ({ ...f, price_override: e.target.value }))} />
            </div>

            {saveErr && <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 12 }}>{tr.saveError}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditingClinic(null)} disabled={saving}
                style={{ flex: 1, padding: "11px", background: "#f7f9fc", color: "#666", border: "1.5px solid #eef0f3", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 600 }}>
                {tr.cancel}
              </button>
              <button onClick={savePrice} disabled={saving}
                style={{ flex: 1, padding: "11px", background: "#0863ba", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700 }}>
                {saving ? "..." : tr.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
