"use client";
// ============================================================
// src/app/admin/_parts/ResetPassModal.tsx
// نافذة إعادة تعيين كلمة المرور — مستخرَجة من page.tsx
// ============================================================

import { useState } from "react";
import AppIcon from "@/components/AppIcon";
import { T } from "./translations";
import { adminFetch } from "./admin-fetch";
import { genPass } from "./plans";
import type { Lang, ClinicData } from "./types";

interface ResetPassModalProps {
  lang: Lang;
  clinic: ClinicData | null;
  onClose: () => void;
}

export const ResetPassModal = ({ lang, clinic, onClose }: ResetPassModalProps) => {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [pass,   setPass]   = useState(genPass());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const copy = async () => {
    await navigator.clipboard.writeText(pass).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!clinic?.user_id) return;
    setSaving(true);
    try {
      const res  = await adminFetch("/api/update-clinic", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId:      clinic.user_id,
          name:        clinic.name,
          owner:       clinic.owner,
          email:       clinic.email,
          phone:       clinic.phone,
          plan:        clinic.plan,
          expiry:      clinic.expiry,
          status:      clinic.status,
          newPassword: pass,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Error"); setSaving(false); return; }
      onClose();
    } catch {
      setError(isAr ? "خطأ في الاتصال" : "Connection error");
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)" }} />
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"28px",boxShadow:"0 24px 80px rgba(0,0,0,.15)",animation:"modalIn .25s ease" }}>
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <div style={{ fontSize:36,marginBottom:12 }}><AppIcon glyph="🔑" /></div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.passModal.title}</h3>
          <p style={{ fontSize:13,color:"#888",marginTop:6 }}>{clinic?.name}</p>
        </div>
        {error && <div style={{ fontSize:13,color:"#c0392b",marginBottom:12,textAlign:"center" }}><AppIcon glyph="⚠️" /> {error}</div>}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>
            {tr.passModal.newPass}
          </label>
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ flex:1,background:"#f7f9fc",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"1.5px solid #eef0f3" }}>
              <code style={{ fontSize:14,color:"#0863ba",fontFamily:"monospace",letterSpacing:1 }}>{pass}</code>
            </div>
            <button onClick={copy} style={{ padding:"0 16px",background:copied?"rgba(46,125,50,.1)":"rgba(8,99,186,.08)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.2)"}`,borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600 }}><AppIcon glyph={copied ? "✓" : "📋"} /></button>
          </div>
        </div>
        <button onClick={() => setPass(genPass())} style={{ width:"100%",marginBottom:12,padding:"10px",background:"#f7f9fc",color:"#666",border:"1.5px dashed #ddd",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
          <AppIcon glyph="🔄" /> {tr.passModal.generate}
        </button>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer" }}>
            {saving ? tr.passModal.saving : tr.passModal.save}
          </button>
          <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.passModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ============================================================
// ─── Data Tools: Export / Import ────────────────────────────
// ============================================================

// ── Export helpers ────────────────────────────────────────────

export default ResetPassModal;
