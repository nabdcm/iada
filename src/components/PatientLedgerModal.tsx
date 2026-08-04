"use client";
// مكوّن مستقل تماماً — رصيد تراكمي ودفعات جزئية للمريض
// لا يتشارك أي منطق أو حالة مع صفحة المالية (payments)
import { useState, useEffect, useCallback } from "react";
import { currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";

type LedgerEntry = {
  id: number;
  entry_type: "debit" | "credit";
  amount: number;
  note: string | null;
  created_at: string;
};

export default function PatientLedgerModal({
  userId,
  patientId,
  patientName,
  currency = DEFAULT_CURRENCY,
  onClose,
}: {
  userId: string;
  patientId: number;
  patientName: string;
  currency?: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"debit" | "credit">("credit");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const CUR = currencySymbol(currency);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patient-ledger?user_id=${userId}&patient_id=${patientId}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setBalance(data.balance ?? 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [userId, patientId]);

  useEffect(() => { load(); }, [load]);

  async function addEntry() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/patient-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, patient_id: patientId, entry_type: type, amount: amt, note }),
      });
      setAmount("");
      setNote("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: 420, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>الرصيد التراكمي — {patientName}</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ background: balance > 0 ? "#fdecea" : "#eafaf1", borderRadius: 14, padding: 16, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#666" }}>المستحق الحالي</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: balance > 0 ? "#c0392b" : "#2e7d32" }}>
            {loading ? "..." : `${balance.toLocaleString()} ${CUR}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select value={type} onChange={e => setType(e.target.value as any)} style={{ flex: "0 0 110px", borderRadius: 10, border: "1px solid #ddd", padding: 8 }}>
            <option value="credit">دفعة</option>
            <option value="debit">مستحق جديد</option>
          </select>
          <input type="number" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1, borderRadius: 10, border: "1px solid #ddd", padding: 8 }} />
        </div>
        <input placeholder="ملاحظة (اختياري)" value={note} onChange={e => setNote(e.target.value)} style={{ width: "100%", borderRadius: 10, border: "1px solid #ddd", padding: 8, marginBottom: 8, boxSizing: "border-box" }} />
        <button onClick={addEntry} disabled={saving || !amount} style={{ width: "100%", background: "#0863ba", color: "#fff", border: "none", borderRadius: 12, padding: 10, fontWeight: 700, cursor: "pointer", opacity: saving ? .6 : 1 }}>
          {saving ? "جارٍ الحفظ..." : "إضافة"}
        </button>

        <div style={{ marginTop: 16 }}>
          {entries.map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0", fontSize: 14 }}>
              <span>{e.entry_type === "credit" ? "دفعة" : "مستحق"}{e.note ? ` — ${e.note}` : ""}</span>
              <span style={{ fontWeight: 700, color: e.entry_type === "credit" ? "#2e7d32" : "#c0392b" }}>
                {e.entry_type === "credit" ? "-" : "+"}{Number(e.amount).toLocaleString()} {CUR}
              </span>
            </div>
          ))}
          {!loading && entries.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: 12 }}>لا يوجد سجل بعد</div>}
        </div>
      </div>
    </div>
  );
}
