"use client";

import AppIcon from "@/components/AppIcon";
import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "en";

type ClinicProfile = {
  id: string;
  clinic_name: string;
  doctor_name?: string;
  phone?: string;
  address?: string;
};

type Package = {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  features: string[];
  payment_type: "link" | "whatsapp";
  payment_value: string;
  button_label: string;
  is_featured: boolean;
};

const T = {
  ar: {
    loading: "جاري التحميل...",
    notFound: "العيادة غير موجودة",
    notFoundSub: "تحقق من الرابط وحاول مجدداً",
    subtitle: "الباقات والخطط المتوفرة",
    noPackages: "لا توجد باقات متاحة حالياً",
    noPackagesSub: "يرجى التواصل مباشرة مع العيادة",
    contactUs: "تواصل معنا",
    choose: "اشترك الآن",
    poweredBy: "مدعوم بواسطة",
    featured: "الأكثر طلباً",
    perMonth: "شهرياً",
    perYear: "سنوياً",
    onetime: "دفعة واحدة",
  },
  en: {
    loading: "Loading...",
    notFound: "Clinic Not Found",
    notFoundSub: "Please check the link and try again",
    subtitle: "Available Packages & Plans",
    noPackages: "No packages available right now",
    noPackagesSub: "Please contact the clinic directly",
    contactUs: "Contact Us",
    choose: "Subscribe Now",
    poweredBy: "Powered by",
    featured: "Most Popular",
    perMonth: "/ month",
    perYear: "/ year",
    onetime: "one-time",
  },
} as const;

const BILLING_LABEL: Record<Lang, Record<string, string>> = {
  ar: { monthly: "شهرياً", yearly: "سنوياً", onetime: "دفعة واحدة", "": "" },
  en: { monthly: "/ month", yearly: "/ year", onetime: "one-time", "": "" },
};

export default function ClinicPlansPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = use(params);
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      const { data: profile } = await supabase
        .from("clinic_profiles")
        .select("id,clinic_name,doctor_name,phone,address")
        .eq("id", clinicId)
        .single();

      if (!profile) { setNotFound(true); setLoading(false); return; }
      setClinic(profile as ClinicProfile);

      const { data: pkgs } = await supabase
        .from("clinic_packages")
        .select("*")
        .eq("user_id", clinicId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      setPackages(
        (pkgs ?? []).map((p: any) => ({
          ...p,
          features: Array.isArray(p.features) ? p.features : (typeof p.features === "string" ? JSON.parse(p.features) : []),
        }))
      );
      setLoading(false);
    })();
  }, [clinicId]);

  const buildPaymentHref = (pkg: Package) => {
    if (pkg.payment_type === "whatsapp") {
      const digits = (pkg.payment_value || "").replace(/[^\d]/g, "");
      const msg = encodeURIComponent(
        isAr
          ? `مرحباً، أرغب بالاشتراك في باقة "${pkg.title}"`
          : `Hello, I'd like to subscribe to the "${pkg.title}" package`
      );
      return `https://wa.me/${digits}?text=${msg}`;
    }
    return pkg.payment_value || "#";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Rubik,sans-serif", color: "#0863ba", fontSize: 16 }}>
        {tr.loading}
      </div>
    );
  }

  if (notFound || !clinic) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Rubik,sans-serif", gap: 8 }}>
        <div style={{ fontSize: 40 }}><AppIcon glyph="🏥" /></div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#353535" }}>{tr.notFound}</div>
        <div style={{ fontSize: 13, color: "#999" }}>{tr.notFoundSub}</div>
      </div>
    );
  }

  const displayName = clinic.clinic_name || clinic.doctor_name || "Nabd Clinic";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .npk-card { transition: transform .2s ease, box-shadow .2s ease; }
        .npk-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(8,99,186,.14); }
        .npk-btn:hover { filter: brightness(1.08); }
      `}</style>
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#f4f8fd 0%,#eef3fb 100%)",
        fontFamily: "Rubik, sans-serif",
        direction: isAr ? "rtl" : "ltr",
      }}>
        {/* Language toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px 0" }}>
          <button
            onClick={() => setLang(isAr ? "en" : "ar")}
            style={{ background: "#fff", border: "1.5px solid #e3e8f0", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#0863ba", cursor: "pointer" }}
          >
            {isAr ? "EN" : "عربي"}
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "24px 20px 32px" }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#0863ba,#0a7bd6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, boxShadow: "0 8px 24px rgba(8,99,186,.25)", color: "#fff",
          }}>
            <AppIcon glyph="🩺" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1c2b3a", margin: 0 }}>{displayName}</h1>
          {clinic.doctor_name && clinic.clinic_name && (
            <div style={{ fontSize: 13, color: "#7a8a9a", marginTop: 4, fontWeight: 600 }}>{clinic.doctor_name}</div>
          )}
          <p style={{ fontSize: 14, color: "#5c7089", marginTop: 10, fontWeight: 600 }}>{tr.subtitle}</p>
        </div>

        {/* Packages */}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 60px" }}>
          {packages.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #eef1f6", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}><AppIcon glyph="📋" /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#353535" }}>{tr.noPackages}</div>
              <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>{tr.noPackagesSub}</div>
              {clinic.phone && (
                <a href={`tel:${clinic.phone}`} style={{ display: "inline-block", marginTop: 18, background: "#0863ba", color: "#fff", padding: "10px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  {tr.contactUs}
                </a>
              )}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 20,
            }}>
              {packages.map(pkg => (
                <div key={pkg.id} className="npk-card" style={{
                  background: "#fff",
                  borderRadius: 22,
                  border: pkg.is_featured ? "2px solid #0863ba" : "1.5px solid #eef1f6",
                  padding: "28px 22px",
                  position: "relative",
                  boxShadow: pkg.is_featured ? "0 10px 30px rgba(8,99,186,.15)" : "0 4px 16px rgba(0,0,0,.04)",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  {pkg.is_featured && (
                    <div style={{
                      position: "absolute", top: -12, insetInlineStart: 22,
                      background: "#0863ba", color: "#fff", fontSize: 11, fontWeight: 800,
                      padding: "4px 12px", borderRadius: 20,
                    }}>
                      <AppIcon glyph="⭐" /> {tr.featured}
                    </div>
                  )}
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1c2b3a", marginTop: pkg.is_featured ? 6 : 0 }}>{pkg.title}</div>
                  {pkg.description && (
                    <div style={{ fontSize: 13, color: "#8a97a8", marginTop: 6, lineHeight: 1.6 }}>{pkg.description}</div>
                  )}

                  <div style={{ margin: "18px 0", display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 30, fontWeight: 900, color: "#0863ba" }}>
                      {pkg.price} {pkg.currency}
                    </span>
                    {pkg.billing_period && (
                      <span style={{ fontSize: 12, color: "#9aa6b3", fontWeight: 600 }}>
                        {BILLING_LABEL[lang][pkg.billing_period] ?? pkg.billing_period}
                      </span>
                    )}
                  </div>

                  {pkg.features?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22, flex: 1 }}>
                      {pkg.features.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#455163" }}>
                          <span style={{ color: "#1fa876", fontWeight: 800 }}>✓</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <a
                    href={buildPaymentHref(pkg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="npk-btn"
                    style={{
                      marginTop: "auto",
                      textAlign: "center",
                      background: pkg.is_featured ? "linear-gradient(135deg,#0863ba,#0a7bd6)" : "#eef3fb",
                      color: pkg.is_featured ? "#fff" : "#0863ba",
                      padding: "12px 18px",
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: 800,
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    {pkg.button_label || tr.choose}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "0 20px 32px", fontSize: 12, color: "#aab5c2", fontWeight: 600 }}>
          {tr.poweredBy} نبض · NABD
        </div>
      </div>
    </>
  );
}
