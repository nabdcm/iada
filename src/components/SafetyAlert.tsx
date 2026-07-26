"use client";

// ============================================================
// SafetyAlert — تنبيه الحساسية والتعارض الدوائي داخل نموذج الوصفة
// يستدعي /api/clinic/safety-check عند تغيّر المريض أو قائمة الأدوية.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "en";

interface SafetyResult {
  allergies: { medicine: string; allergen: string }[];
  interactions: { drug_a: string; drug_b: string; severity: string; description: string; med_a: string; med_b: string }[];
  chronic: { medicine: string; condition: string; note: string }[];
}

const T = {
  ar: {
    allergyTitle: "تحذير حساسية",
    allergyBody: (m: string, a: string) => `المريض مسجّل لديه حساسية تجاه «${a}» — والدواء «${m}» قد يتضمّنها.`,
    interTitle: "تعارض دوائي",
    chronicTitle: "تنبيه حالة مزمنة",
    checking: "جاري فحص السلامة الدوائية...",
    safe: "لا توجد تنبيهات حساسية أو تعارض للأدوية المضافة.",
    disclaimer: "تنبيه مساعد فقط ولا يُغني عن المرجع الدوائي والحكم السريري.",
    severity: { high: "شديد", moderate: "متوسط", low: "خفيف" } as Record<string, string>,
  },
  en: {
    allergyTitle: "Allergy warning",
    allergyBody: (m: string, a: string) => `Patient has a recorded allergy to "${a}" — the drug "${m}" may contain it.`,
    interTitle: "Drug interaction",
    chronicTitle: "Chronic condition alert",
    checking: "Running safety check...",
    safe: "No allergy or interaction alerts for the listed medications.",
    disclaimer: "Advisory aid only — does not replace a drug reference or clinical judgement.",
    severity: { high: "High", moderate: "Moderate", low: "Low" } as Record<string, string>,
  },
};

interface Props {
  lang: Lang;
  patientId: number | string | null;
  medicines: string[];
  /** يُستدعى عند تغيّر عدد التنبيهات — مفيد لتعطيل زر الحفظ أو إظهار تأكيد */
  onResult?: (count: number) => void;
}

export default function SafetyAlert({ lang, patientId, medicines, onResult }: Props) {
  const isAr = lang === "ar";
  const tr = T[isAr ? "ar" : "en"];

  const [res, setRes] = useState<SafetyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  const names = medicines.map(m => (m || "").trim()).filter(Boolean);
  const key = `${patientId ?? ""}|${names.join("§")}`;

  useEffect(() => {
    let cancelled = false;
    const id = ++reqId.current;

    if (names.length === 0) { setRes(null); onResult?.(0); return; }

    const run = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const r = await fetch("/api/clinic/safety-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ medicines: names, patient_id: patientId || null }),
        });
        if (!r.ok) throw new Error("safety-check failed");
        const json = (await r.json()) as SafetyResult;
        if (cancelled || id !== reqId.current) return;
        setRes(json);
        onResult?.(json.allergies.length + json.interactions.length + json.chronic.length);
      } catch {
        if (!cancelled && id === reqId.current) { setRes(null); onResult?.(0); }
      } finally {
        if (!cancelled && id === reqId.current) setLoading(false);
      }
    };

    const t = setTimeout(run, 450); // تهدئة أثناء الكتابة
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (names.length === 0) return null;

  const total = res ? res.allergies.length + res.interactions.length + res.chronic.length : 0;

  const Box = ({ color, bg, title, children }: { color: string; bg: string; title: string; children: React.ReactNode }) => (
    <div style={{
      background: bg, border: `1.5px solid ${color}35`, borderRadius: 12,
      padding: "11px 13px", marginBottom: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#4a5560", lineHeight: 1.75 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr", fontFamily: "Rubik,sans-serif", marginBottom: 14 }}>
      {loading && (
        <div style={{ fontSize: 11.5, color: "#8a97a6", marginBottom: 8 }}>{tr.checking}</div>
      )}

      {res && total === 0 && !loading && (
        <div style={{
          background: "rgba(46,125,50,.06)", border: "1.5px solid rgba(46,125,50,.22)",
          borderRadius: 12, padding: "10px 13px", fontSize: 12, color: "#2e7d32", fontWeight: 600,
        }}>✓ {tr.safe}</div>
      )}

      {res?.allergies.map((a, i) => (
        <Box key={`a${i}`} color="#c0392b" bg="rgba(192,57,43,.06)" title={`⚠ ${tr.allergyTitle}`}>
          {tr.allergyBody(a.medicine, a.allergen)}
        </Box>
      ))}

      {res?.interactions.map((it, i) => (
        <Box key={`i${i}`} color="#e67e22" bg="rgba(230,126,34,.06)"
          title={`⚠ ${tr.interTitle}${it.severity ? ` — ${tr.severity[it.severity] ?? it.severity}` : ""}`}>
          <b>{it.med_a}</b> + <b>{it.med_b}</b>
          {it.description ? <> — {it.description}</> : null}
        </Box>
      ))}

      {res?.chronic.map((c, i) => (
        <Box key={`c${i}`} color="#7b2d8b" bg="rgba(123,45,139,.06)" title={`⚠ ${tr.chronicTitle} — ${c.condition}`}>
          <b>{c.medicine}</b> — {c.note}
        </Box>
      ))}

      {res && total > 0 && (
        <div style={{ fontSize: 10.5, color: "#8a97a6", marginTop: 4, lineHeight: 1.7 }}>{tr.disclaimer}</div>
      )}
    </div>
  );
}
