// ============================================================
// src/app/layout.tsx
// الملف الجذري — يُطبَّق على جميع الصفحات
// ============================================================

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'نبض | NABD — Clinic Manager',
  description: 'نظام إدارة العيادات الطبية — مرضى، مواعيد، مدفوعات',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💗</text></svg>',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Rubik', sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
