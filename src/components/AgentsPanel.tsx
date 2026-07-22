"use client";

// ============================================================
// AgentsPanel — تبويب الوكلاء في لوحة الأدمن
// إضافة وكلاء، أكواد إحالة، ربط العيادات، وإحصائيات العمولة
// ============================================================

import { useEffect, useState, useCallback } from "react";

type Agent = {
  id: number; name: string; phone: string | null; code: string;
  commission_pct: number; notes: string | null; active: boolean; created_at: string;
};
type ClinicRow = {
  id: number; name: string; owner: string | null; plan: string;
  status: string; agent_id: number | null; account_type: string | null;
};

const PLAN_PRICES: Record<string, number> = {
  basic: 5.99, pro: 7.99, enterprise: 14.99,
  shared_basic: 7.99, shared_pro: 13.99, shared_enterprise: 21.99,
  pharmacy: 39, lab: 39,
};

const T = {
  ar: {
    title: "الوكلاء",
    subtitle: "شبكة مبيعات نبض — كل وكيل بكوده وعمولته وعياداته",
    add: "+ إضافة وكيل",
    name: "اسم الوكيل", namePh: "مثال: أحمد من حلب",
    phone: "رقم الهاتف", phonePh: "09xxxxxxxx",
    commission: "العمولة %",
    notes: "ملاحظات", notesPh: "منطقة العمل، اتفاق خاص...",
    save: "حفظ", cancel: "إلغاء", saving: "جارٍ الحفظ...",
    code: "كود الإحالة",
    copied: "✓ نُسخ",
    clinics: "عيادة", activeClinics: "نشطة",
    estCommission: "العمولة (مرة واحدة)",
    assignTitle: "عيادات هذا الوكيل",
    assignAdd: "ربط عيادة...",
    unassign: "فك الربط",
    noAgents: "لا يوجد وكلاء بعد — أضف أول وكيل وابدأ بتوسيع شبكة مبيعاتك",
    noClinics: "لا عيادات مرتبطة بعد",
    frozen: "موقوف", activate: "تفعيل", deactivate: "إيقاف",
    delete: "حذف",
    confirmDelete: "حذف الوكيل؟ سيُفك ربط عياداته (لن تُحذف العيادات).",
    err: "حدث خطأ، حاول مجدداً.",
  },
  en: {
    title: "Agents",
    subtitle: "NABD sales network — each agent with a code, commission, and clinics",
    add: "+ Add Agent",
    name: "Agent name", namePh: "e.g. Ahmad from Aleppo",
    phone: "Phone", phonePh: "09xxxxxxxx",
    commission: "Commission %",
    notes: "Notes", notesPh: "Territory, special deal...",
    save: "Save", cancel: "Cancel", saving: "Saving...",
    code: "Referral code",
    copied: "✓ Copied",
    clinics: "clinics", activeClinics: "active",
    estCommission: "Commission (one-time)",
    assignTitle: "This agent's clinics",
    assignAdd: "Link a clinic...",
    unassign: "Unlink",
    noAgents: "No agents yet — add your first agent and grow your sales network",
    noClinics: "No clinics linked yet",
    frozen: "Inactive", activate: "Activate", deactivate: "Deactivate",
    delete: "Delete",
    confirmDelete: "Delete agent? Their clinics will be unlinked (clinics are not deleted).",
    err: "Something went wrong, try again.",
  },
};

export default function AgentsPanel({ isAr }: { isAr: boolean }) {
  const t = T[isAr ? "ar" : "en"];
  const [agents, setAgents] = useState<Agent[]>([]);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", commission_pct: "10", notes: "" });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { credentials: "include" });
      const json = (await res.json()) as { agents?: Agent[]; clinics?: ClinicRow[] };
      setAgents(json.agents ?? []);
      setClinics(json.clinics ?? []);
    } catch { setErr(t.err); }
    setLoading(false);
  }, [t.err]);

  useEffect(() => { void load(); }, [load]);

  async function post(body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch("/api/agents", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return !!(await res.json())?.ok;
    } catch { return false; }
  }

  async function createAgent() {
    if (!form.name.trim()) return;
    setSaving(true); setErr("");
    const ok = await post({ action: "create", ...form });
    if (ok) { setForm({ name: "", phone: "", commission_pct: "10", notes: "" }); setShowForm(false); await load(); }
    else setErr(t.err);
    setSaving(false);
  }

  async function toggleActive(a: Agent) {
    if (await post({ action: "update", id: a.id, active: !a.active })) await load();
  }

  async function deleteAgent(a: Agent) {
    if (!confirm(t.confirmDelete)) return;
    if (await post({ action: "delete", id: a.id })) await load();
  }

  async function assign(clinicId: number, agentId: number | null) {
    if (await post({ action: "assign", clinic_id: clinicId, agent_id: agentId })) await load();
  }

  function copyCode(a: Agent) {
    try { void navigator.clipboard.writeText(a.code); } catch { /* ignore */ }
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 1600);
  }

  const agentClinics = (id: number) => clinics.filter(c => c.agent_id === id);
  const unassigned   = clinics.filter(c => c.agent_id === null);

  // عمولة لمرة واحدة عن كل عيادة: القيمة السنوية للخطة (شهري × 12) × نسبة الوكيل
  const estOneTime = (a: Agent) =>
    agentClinics(a.id)
      .reduce((sum, c) => sum + (PLAN_PRICES[c.plan] ?? 0) * 12, 0) * (a.commission_pct / 100);

  const card: React.CSSProperties = { background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 14, padding: "18px 20px" };
  const inp: React.CSSProperties  = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #eef0f3", fontFamily: "Rubik,sans-serif", fontSize: 13, background: "#f7f9fc", outline: "none" };
  const lbl: React.CSSProperties  = { display: "block", fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 6 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#353535" }}>🤝 {t.title}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#999" }}>{t.subtitle}</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: "linear-gradient(135deg,#0863ba,#5694cf)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {t.add}
        </button>
      </div>

      {err && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(192,57,43,.08)", color: "#c0392b", fontSize: 13 }}>{err}</div>}

      {showForm && (
        <div style={{ ...card, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
            <div><label style={lbl}>{t.name}</label><input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t.namePh} /></div>
            <div><label style={lbl}>{t.phone}</label><input style={inp} dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={t.phonePh} /></div>
            <div><label style={lbl}>{t.commission}</label><input style={inp} dir="ltr" type="number" min={0} max={100} value={form.commission_pct} onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={lbl}>{t.notes}</label><input style={inp} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t.notesPh} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={createAgent} disabled={saving || !form.name.trim()}
              style={{ background: "#0863ba", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: saving ? .7 : 1 }}>
              {saving ? t.saving : t.save}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background: "#f7f9fc", color: "#666", border: "1.5px solid #eef0f3", borderRadius: 10, padding: "10px 20px", fontFamily: "Rubik,sans-serif", fontSize: 13, cursor: "pointer" }}>
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>...</div>
      ) : agents.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "56px 20px", color: "#999", fontSize: 14, border: "1.5px dashed #dfe5ec" }}>
          🤝 {t.noAgents}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {agents.map(a => {
            const list = agentClinics(a.id);
            const activeCount = list.filter(c => c.status === "active").length;
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} style={{ ...card, opacity: a.active ? 1 : .65 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#0863ba,#5694cf)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17 }}>
                    {a.name.charAt(0)}
                  </div>
                  <div style={{ flex: "1 1 160px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#353535", display: "flex", alignItems: "center", gap: 8 }}>
                      {a.name}
                      {!a.active && <span style={{ fontSize: 10.5, background: "rgba(230,126,34,.12)", color: "#c96a12", borderRadius: 12, padding: "2px 10px" }}>{t.frozen}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#999" }} dir="ltr">{a.phone ?? "—"}</div>
                  </div>

                  <button onClick={() => copyCode(a)} title={t.code}
                    style={{ background: "rgba(8,99,186,.06)", border: "1.5px dashed rgba(8,99,186,.3)", borderRadius: 10, padding: "7px 14px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#0863ba", cursor: "pointer" }}>
                    {copiedId === a.id ? t.copied : a.code}
                  </button>

                  <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: "#666" }}>
                    <span><b style={{ color: "#0863ba", fontSize: 15 }}>{list.length}</b> {t.clinics}</span>
                    <span><b style={{ color: "#2e7d32", fontSize: 15 }}>{activeCount}</b> {t.activeClinics}</span>
                    <span>{t.estCommission}: <b style={{ color: "#353535" }}>${estOneTime(a).toFixed(2)}</b> <span style={{ color: "#aaa" }}>({a.commission_pct}%)</span></span>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
                    <button onClick={() => setExpanded(isOpen ? null : a.id)}
                      style={{ background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 8, padding: "7px 14px", fontFamily: "Rubik,sans-serif", fontSize: 12, color: "#0863ba", fontWeight: 700, cursor: "pointer" }}>
                      {isOpen ? "▲" : "▼"} {t.assignTitle}
                    </button>
                    <button onClick={() => toggleActive(a)}
                      style={{ background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 8, padding: "7px 12px", fontFamily: "Rubik,sans-serif", fontSize: 12, color: "#666", cursor: "pointer" }}>
                      {a.active ? t.deactivate : t.activate}
                    </button>
                    <button onClick={() => deleteAgent(a)}
                      style={{ background: "rgba(192,57,43,.05)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 8, padding: "7px 12px", fontFamily: "Rubik,sans-serif", fontSize: 12, color: "#c0392b", cursor: "pointer" }}>
                      {t.delete}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 16, borderTop: "1.5px solid #f2f4f7", paddingTop: 14 }}>
                    {list.length === 0 && <div style={{ fontSize: 12.5, color: "#aaa", marginBottom: 10 }}>{t.noClinics}</div>}
                    {list.map(c => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f6f8fb", fontSize: 13 }}>
                        <span style={{ flex: 1, color: "#353535", fontWeight: 600 }}>
                          {c.name} <span style={{ color: "#aaa", fontWeight: 400 }}>• {c.owner ?? ""} • {c.plan}</span>
                        </span>
                        <span style={{ fontSize: 11, borderRadius: 12, padding: "2px 10px", background: c.status === "active" ? "rgba(46,125,50,.1)" : "rgba(230,126,34,.1)", color: c.status === "active" ? "#2e7d32" : "#c96a12" }}>
                          {c.status}
                        </span>
                        <button onClick={() => assign(c.id, null)}
                          style={{ background: "none", border: "none", color: "#c0392b", fontSize: 12, cursor: "pointer", fontFamily: "Rubik,sans-serif" }}>
                          ✕ {t.unassign}
                        </button>
                      </div>
                    ))}
                    {unassigned.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={e => { if (e.target.value) { void assign(Number(e.target.value), a.id); e.target.value = ""; } }}
                        style={{ ...inp, marginTop: 12, maxWidth: 340 }}
                      >
                        <option value="">{t.assignAdd}</option>
                        {unassigned.map(c => (
                          <option key={c.id} value={c.id}>{c.name} — {c.owner ?? ""}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
