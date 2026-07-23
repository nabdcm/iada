"use client";
// ============================================================
// src/app/payments/_parts/F.tsx
// غلاف حقل نموذج. معرّف خارج المكوّنات عمداً:
// تعريفه داخل Modal يُعيد إنشاءه في كل render فيفقد الحقل الـ focus.
// ============================================================

import React from "react";

export function F({ label, children, half }: { label: any; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ marginBottom:16, flex: half ? "1" : undefined }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#555", marginBottom:7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Modal إضافة دفعة ─────────────────────────────────────

export default F;
