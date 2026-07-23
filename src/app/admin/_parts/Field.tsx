"use client";
// ============================================================
// src/app/admin/_parts/Field.tsx
// غلاف حقل نموذج. معرّف خارج المكوّنات عمداً
// حتى لا يُعاد إنشاؤه في كل render فيفقد الحقل الـ focus.
// ============================================================

import React from "react";

interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  half?: boolean;
}

export const Field = ({ label, children, half }: FieldProps) => (
  <div style={{ marginBottom: 14, flex: half ? "1" : undefined }}>
    <label style={{
      display: "block", fontSize: 11, fontWeight: 700, color: "#555",
      marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.4
    }}>
      {label}
    </label>
    {children}
  </div>
);

export default Field;
