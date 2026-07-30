import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "نظام إدارة صيدليات سحابي — نبض NABD",
  description:
    "نظام نبض لإدارة الصيدليات: نقطة بيع (POS)، صرف دوائي مرتبط بالوصفات الطبية، إدارة مخزون بنظام FEFO، فوترة، وتقارير مالية فورية. مصمم للصيدليات في سوريا والوطن العربي.",
  alternates: { canonical: "/pharmacy-system" },
  openGraph: {
    title: "نظام إدارة صيدليات سحابي — نبض NABD",
    description: "نقطة بيع، صرف دوائي، إدارة مخزون FEFO، وتقارير مالية للصيدليات.",
    url: "https://nabd.clinic/pharmacy-system",
  },
};

const features = [
  { title: "نقطة بيع (POS) متكاملة", desc: "بيع سريع بالباركود، دفع مقسّم (نقدي/بطاقة)، وطباعة فواتير فورية." },
  { title: "صرف مرتبط بالوصفة الطبية", desc: "ربط مباشر بوصفات الأطباء عبر رقم السجل الطبي (MRN) لتقليل الأخطاء الدوائية." },
  { title: "إدارة مخزون بنظام FEFO", desc: "صرف الأدوية الأقرب لتاريخ الانتهاء أولاً، مع تنبيهات تلقائية لإعادة الطلب." },
  { title: "مسح الباركود بدقة عالية", desc: "قارئ باركود يدعم EAN/UPC بدقة عالية حتى بكاميرا الموبايل العادية." },
  { title: "المرتجعات والمدفوعات للموردين", desc: "تسجيل مرتجعات الزبائن ومتابعة حسابات ودفعات الموردين بشكل منظم." },
  { title: "تقارير مالية وربحية فورية", desc: "تقفيل صندوق يومي، تقارير ربحية لكل صنف، وتصدير Excel لكل التقارير." },
];

export default function PharmacySystemPage() {
  return (
    <main dir="rtl" style={{ fontFamily: "Rubik, sans-serif", background: "#f7f9fc", minHeight: "100vh", color: "#1a2332" }}>
      <section style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px 32px" }}>
        <p style={{ color: "#0863ba", fontWeight: 700, marginBottom: 8 }}>نبض | وحدة الصيدلية</p>
        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.35, margin: "0 0 16px" }}>
          نظام إدارة صيدليات سحابي متكامل
        </h1>
        <p style={{ fontSize: 17, color: "#4b5768", lineHeight: 1.9, maxWidth: 680 }}>
          نبض لإدارة الصيدليات يجمع بين نقطة البيع، إدارة المخزون، والربط المباشر مع وصفات الأطباء عبر رقم السجل
          الطبي الموحّد (MRN)، ليقلل الأخطاء ويسرّع العمل اليومي في الصيدلية.
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
          تواصل معنا لتفعيل صيدليتك
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
