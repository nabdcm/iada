// ============================================================
// src/app/layout.tsx — PWA + إشعارات نبض
// ============================================================

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نبض | NABD — Clinic Manager",
  description: "نظام إدارة العيادات الطبية — مرضى، مواعيد، مدفوعات",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💗</text></svg>',
    apple: "/Logo_Nabd.svg",
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
