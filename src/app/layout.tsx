// ============================================================
// src/app/layout.tsx — PWA + إشعارات نبض
// ============================================================

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nabd.clinic"),
  title: {
    default: "نبض | NABD — نظام إدارة العيادات والصيدليات",
    template: "%s | نبض NABD",
  },
  description: "نبض — نظام سحابي لإدارة العيادات الطبية والصيدليات: حجز المواعيد، ملفات المرضى، الوصفات، المدفوعات، وإشعارات لحظية. متوافق مع الموبايل والكمبيوتر.",
  keywords: ["نبض", "NABD", "إدارة عيادات", "نظام طبي", "حجز مواعيد طبية", "إدارة صيدليات", "clinic management system", "medical software"],
  authors: [{ name: "NABD" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    url: "https://nabd.clinic",
    siteName: "نبض NABD",
    title: "نبض | NABD — نظام إدارة العيادات والصيدليات",
    description: "نظام سحابي لإدارة العيادات الطبية والصيدليات: حجز المواعيد، ملفات المرضى، الوصفات، والمدفوعات.",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "نبض | NABD — نظام إدارة العيادات والصيدليات",
    description: "نظام سحابي لإدارة العيادات الطبية والصيدليات.",
    images: ["/icon-512.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0863ba" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="نبض" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body style={{ fontFamily: "'Rubik', sans-serif", margin: 0, padding: 0, background: "#f7f9fc" }}>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW:', reg.scope); })
                .catch(function(e) { console.warn('SW error:', e); });
            });
          }
        `}} />
      </body>
    </html>
  );
}
