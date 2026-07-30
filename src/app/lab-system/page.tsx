import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نظام إدارة مخابر طبية — نبض كير NABD",
  description:
    "نبض مخبر: نظام إدارة مخابر بمرحلتين (استقبال العينة والنتائج)، طباعة ملصقات QR، وربط نتائج التحاليل مباشرة بالسجل الطبي للمريض عبر رقم MRN الموحّد.",
  alternates: { canonical: "/lab-system" },
  openGraph: {
    title: "نظام إدارة مخابر طبية — نبض كير NABD",
    description: "استقبال عينات، ملصقات QR، ونتائج مرتبطة بالسجل الطبي للمريض.",
    url: "https://nabd.clinic/lab-system",
  },
};

const features = [
  { title: "سير عمل بمرحلتين", desc: "استقبال الطلب والعينة أولاً، ثم إدخال واعتماد النتائج في مرحلة منفصلة لضبط الجودة." },
  { title: "ملصقات QR للعينات", desc: "توليد وطباعة ملصقات QR لكل عينة لتتبعها بدقة وتفادي الخلط بين عينات المرضى." },
  { title: "ربط تلقائي بالسجل الطبي", desc: "نتائج التحاليل تُحفظ مباشرة ضمن ملف المريض عبر رقم السجل الطبي الموحّد MRN." },
  { title: "تبويب مالي مستقل", desc: "متابعة فواتير التحاليل والمستحقات المالية للمخبر بشكل منفصل ودقيق." },
];

export default function LabSystemPage() {
  return (
    <main dir="rtl" style={{ fontFamily: "Rubik, sans-serif", background: "#f7f9fc", minHeight: "100vh", color: "#1a2332" }}>
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px 32px" }}>
        <p style={{ color: "#0863ba", fontWeight: 700, marginBottom: 8 }}>نبض مخبر | نبض كير</p>
        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.35, margin: "0 0 16px" }}>
          نظام إدارة مخابر طبية مرتبط بالسجل الطبي
        </h1>
        <p style={{ fontSize: 17, color: "#4b5768", lineHeight: 1.9, maxWidth: 680 }}>
          نبض مخبر يبسّط عمل المختبر الطبي من استقبال العينة إلى اعتماد النتيجة، مع ربط مباشر بسجل المريض الطبي
          الموحّد بين العيادة والمخبر والصيدلية.
        </p>
        <a
          href="https://wa.me/963998285483"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block", marginTop: 24, background: "#0863ba", color: "#fff",
            padding: "13px 28px", borderRadius: 10, fontWeight: 700, textDecoration: "none",
          }}
        >
          تواصل معنا لتفعيل مخبرك
        </a>
      </section>

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "16px 24px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: "#fff", border: "1px solid #eef0f3", borderRadius: 14, padding: 22 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h2>
              <p style={{ fontSize: 14.5, color: "#5a6577", lineHeight: 1.8, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, textAlign: "center" }}>
          <a href="/" style={{ color: "#0863ba", fontWeight: 600, textDecoration: "none" }}>
            ← تعرّف على منصة نبض الكاملة للعيادات والمخابر والصيدليات
          </a>
        </p>
      </section>
    </main>
  );
}
