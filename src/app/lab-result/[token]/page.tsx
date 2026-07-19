"use client";
// ============================================================
// /lab-result/[token] — صفحة نتيجة تحاليل عامة قابلة للمشاركة
// تصميم تقرير رسمي · اسم المخبر في الترويسة · زر تحميل PDF (طباعة)
// ============================================================

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ResultRow = {
  test_name: string;
  test_name_en?: string;
  value: string;
  unit?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  ref_text?: string | null;
  flag?: "high" | "low" | "normal" | null;
};

type OrderData = {
  order: {
    id: number; mrn: string | null; patient_name: string;
    patient_gender: string | null; patient_age: string | null;
    referring_doctor: string | null; status: string;
    sample_date: string | null; result_date: string | null;
    results: ResultRow[]; notes: string | null; created_at: string;
  };
  lab: { name: string; phone: string | null };
};

const flagOf = (r: ResultRow): "high" | "low" | "normal" => {
  if (r.flag === "high" || r.flag === "low") return r.flag;
  const v = parseFloat(r.value);
  if (!isNaN(v)) {
    if (r.ref_high != null && v > r.ref_high) return "high";
    if (r.ref_low != null && v < r.ref_low) return "low";
  }
  return "normal";
};

export default function LabResultPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<OrderData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!params?.token) return;
    fetch(`/api/lab/result?token=${params.token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, [params?.token]);

  if (err) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8", fontFamily: "'Rubik',sans-serif", direction: "rtl" }}>
        <div style={{ textAlign: "center", color: "#5a6a7a" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700 }}>النتيجة غير موجودة أو الرابط غير صحيح</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f8", fontFamily: "'Rubik',sans-serif" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #dde3ea", borderTopColor: "#f5a623", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const { order, lab } = data;
  const abnormal = order.results.filter(r => flagOf(r) !== "normal").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#eef2f7;color:#233240}
        .sheet{max-width:820px;margin:0 auto;background:#fff;min-height:100vh}
        .rep-head{background:linear-gradient(135deg,#0b2540,#123a63);color:#fff;padding:26px 34px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
        .lab-name{font-size:22px;font-weight:800}
        .lab-sub{font-size:11px;opacity:.75;margin-top:3px}
        .badge-nabd{font-size:10px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:20px;padding:5px 12px;font-weight:600}
        .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:20px 34px;border-bottom:2px solid #eef2f7}
        .meta-item{background:#f7fafd;border:1px solid #e5ecf3;border-radius:10px;padding:10px 14px}
        .meta-lbl{font-size:10px;color:#8296a8;font-weight:700;margin-bottom:3px}
        .meta-val{font-size:13px;font-weight:700;color:#233240}
        table{width:100%;border-collapse:collapse}
        th{background:#f2f6fa;color:#5a6a7a;font-size:11px;font-weight:800;padding:11px 14px;text-align:right;border-bottom:2px solid #e5ecf3}
        td{padding:11px 14px;font-size:13px;border-bottom:1px solid #f0f4f8}
        .val{font-weight:800;font-size:14px}
        .f-high{color:#c0392b}.f-low{color:#1f6fd6}.f-normal{color:#1f8a4c}
        .flag-pill{display:inline-block;font-size:10px;font-weight:800;border-radius:14px;padding:3px 10px}
        .p-high{background:rgba(192,57,43,.1);color:#c0392b}
        .p-low{background:rgba(31,111,214,.1);color:#1f6fd6}
        .p-normal{background:rgba(31,138,76,.1);color:#1f8a4c}
        .foot{padding:22px 34px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-top:2px solid #eef2f7;font-size:11px;color:#8296a8}
        .print-btn{position:fixed;bottom:22px;inset-inline-start:50%;transform:translateX(50%);background:#0b2540;color:#fff;border:0;border-radius:30px;padding:13px 30px;font-family:'Rubik',sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(11,37,64,.35);display:flex;align-items:center;gap:8px}
        @media print{.print-btn{display:none}body{background:#fff}.sheet{max-width:100%}}
      `}</style>

      <div className="sheet" dir="rtl">
        <div className="rep-head">
          <div>
            <div className="lab-name">🧪 {lab.name}</div>
            <div className="lab-sub">
              تقرير نتائج تحاليل مخبرية
              {lab.phone ? ` · ${lab.phone}` : ""}
            </div>
          </div>
          <div className="badge-nabd">نظام نبض NABD</div>
        </div>

        <div className="meta">
          <div className="meta-item"><div className="meta-lbl">اسم المريض</div><div className="meta-val">{order.patient_name}</div></div>
          {order.mrn && <div className="meta-item"><div className="meta-lbl">رقم السجل الطبي (MRN)</div><div className="meta-val">{order.mrn}</div></div>}
          {order.patient_gender && <div className="meta-item"><div className="meta-lbl">الجنس</div><div className="meta-val">{order.patient_gender === "male" ? "ذكر" : "أنثى"}</div></div>}
          {order.patient_age && <div className="meta-item"><div className="meta-lbl">العمر</div><div className="meta-val">{order.patient_age}</div></div>}
          {order.referring_doctor && <div className="meta-item"><div className="meta-lbl">الطبيب المُحيل</div><div className="meta-val">{order.referring_doctor}</div></div>}
          <div className="meta-item"><div className="meta-lbl">تاريخ العينة</div><div className="meta-val">{order.sample_date ?? "—"}</div></div>
          <div className="meta-item"><div className="meta-lbl">تاريخ النتيجة</div><div className="meta-val">{order.result_date ?? "—"}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>التحليل</th>
              <th>النتيجة</th>
              <th>الوحدة</th>
              <th>المجال الطبيعي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {order.results.map((r, i) => {
              const f = flagOf(r);
              const ref = r.ref_text
                ? r.ref_text
                : r.ref_low != null || r.ref_high != null
                  ? `${r.ref_low ?? ""} – ${r.ref_high ?? ""}`
                  : "—";
              return (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.test_name}</div>
                    {r.test_name_en && <div style={{ fontSize: 10, color: "#8296a8" }}>{r.test_name_en}</div>}
                  </td>
                  <td className={`val f-${f}`}>{r.value || "—"}</td>
                  <td style={{ color: "#5a6a7a" }}>{r.unit ?? "—"}</td>
                  <td style={{ color: "#5a6a7a" }}>{ref}</td>
                  <td>
                    <span className={`flag-pill p-${f}`}>
                      {f === "high" ? "مرتفع ↑" : f === "low" ? "منخفض ↓" : "طبيعي ✓"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {order.notes && (
          <div style={{ padding: "18px 34px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#8296a8", marginBottom: 6 }}>📝 ملاحظات المخبر</div>
            <div style={{ background: "#f7fafd", border: "1px solid #e5ecf3", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>{order.notes}</div>
          </div>
        )}

        <div className="foot">
          <div>
            {abnormal > 0
              ? `⚠️ ${abnormal} نتيجة خارج المجال الطبيعي — يُنصح بمراجعة الطبيب`
              : "✓ جميع النتائج ضمن المجال الطبيعي"}
          </div>
          <div>صادر عن {lab.name} — عبر منصة نبض</div>
        </div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>
        🖨️ حفظ / طباعة PDF
      </button>
    </>
  );
}
