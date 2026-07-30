import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/blog-posts";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — مدونة نبض`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://nabd.clinic/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);
  if (!post) return notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    inLanguage: "ar",
    author: { "@type": "Organization", name: "نبض NABD" },
    publisher: { "@type": "Organization", name: "نبض NABD" },
  };

  return (
    <main dir="rtl" style={{ fontFamily: "Rubik, sans-serif", background: "#f7f9fc", minHeight: "100vh", color: "#1a2332" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 72px" }}>
        <Link href="/blog" style={{ color: "#0863ba", fontSize: 14, textDecoration: "none", fontWeight: 600 }}>
          ← كل المقالات
        </Link>
        <p style={{ fontSize: 13, color: "#8a94a3", margin: "18px 0 6px" }}>
          {new Date(post.date).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })} · {post.readMinutes} دقائق قراءة
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.4, margin: "0 0 24px" }}>{post.title}</h1>

        {post.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 22 }}>
            {s.heading && <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 10px" }}>{s.heading}</h2>}
            {s.paragraphs.map((p, j) => (
              <p key={j} style={{ fontSize: 16, lineHeight: 2, color: "#37414f", margin: "0 0 12px" }}>{p}</p>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 36, padding: 20, background: "#fff", border: "1px solid #eef0f3", borderRadius: 14, textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", fontWeight: 600 }}>جاهز تجرّب نبض في عيادتك أو صيدليتك؟</p>
          <a
            href="https://wa.me/963998285483"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", background: "#0863ba", color: "#fff", padding: "11px 24px", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}
          >
            تواصل معنا عبر واتساب
          </a>
        </div>
      </article>
    </main>
  );
}
