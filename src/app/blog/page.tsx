import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "مدونة نبض — مقالات عن إدارة العيادات والصيدليات والمخابر",
  description:
    "مقالات عملية لأصحاب العيادات والصيدليات والمخابر الطبية: نصائح إدارة، أنظمة حجز مواعيد، وإدارة مخزون الأدوية.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <main dir="rtl" style={{ fontFamily: "Rubik, sans-serif", background: "#f7f9fc", minHeight: "100vh", color: "#1a2332" }}>
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 16px" }}>
        <p style={{ color: "#0863ba", fontWeight: 700, marginBottom: 8 }}>مدونة نبض</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>مقالات لأصحاب العيادات والصيدليات والمخابر</h1>
        <p style={{ fontSize: 16, color: "#4b5768", lineHeight: 1.9 }}>
          نصائح عملية وواقعية لإدارة أفضل ليومك الطبي.
        </p>
      </section>

      <section style={{ maxWidth: 760, margin: "0 auto", padding: "16px 24px 64px", display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            style={{
              background: "#fff", border: "1px solid #eef0f3", borderRadius: 14, padding: 22,
              textDecoration: "none", color: "inherit", display: "block",
            }}
          >
            <p style={{ fontSize: 13, color: "#8a94a3", margin: "0 0 6px" }}>
              {new Date(p.date).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })} · {p.readMinutes} دقائق قراءة
            </p>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 8px" }}>{p.title}</h2>
            <p style={{ fontSize: 14.5, color: "#5a6577", lineHeight: 1.8, margin: 0 }}>{p.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
