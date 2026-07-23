"use client";
// ============================================================
// src/app/admin/_parts/ClinicInfoModal.tsx
// نافذة تفاصيل العيادة — مستخرَجة من page.tsx
// ============================================================

import AppIcon from "@/components/AppIcon";
import { CLINIC_TYPE_ICONS } from "@/lib/clinic-types";
import { PLAN_COLORS, SHARED_PLAN_DEFAULT_DOCTORS } from "./plans";
import type { ClinicData } from "./types";

export default function ClinicInfoModal({ clinic, onClose, isAr }: { clinic: ClinicData; onClose: () => void; isAr: boolean }) {
  const dot = (() => {
    const now = new Date();
    const exp = new Date(clinic.expiry);
    const diff = exp.getTime() - now.getTime();
    if (exp < now)          return { color:"#c0392b", label: isAr?"منتهية":"Expired" };
    if (diff < 30*24*3600*1000) return { color:"#aaa",    label: isAr?"قاربت على الانتهاء":"Expiring soon" };
    if (clinic.status === "inactive") return { color:"#e67e22", label: isAr?"معلّق":"Suspended" };
    if (diff > 30*24*3600*1000) return { color:"#27ae60", label: isAr?"نشط":"Active" };
    return { color:"#f1c40f", label: isAr?"نشط":"Active" };
  })();

  const planColor = PLAN_COLORS[clinic.plan] || "#0863ba";

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtEn = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const Row = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f0f2f5" }}>
      <span style={{ fontSize:12, color:"#aaa", fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color: accent || "#353535", direction:"ltr", textAlign:"end" }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:440, fontFamily:"Rubik,sans-serif", direction: isAr?"rtl":"ltr", overflow:"hidden", boxShadow:"0 24px 60px rgba(8,99,186,.18)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0863ba,#0558a8)", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, background:"rgba(255,255,255,.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              <AppIcon glyph={clinic.account_type === "lab" ? "🧪" : clinic.account_type === "pharmacy" ? "💊" : CLINIC_TYPE_ICONS[clinic.clinic_type||"general"]} />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{clinic.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", marginTop:2 }}>
                {clinic.account_type === "lab" ? (isAr?"مخبر":"Lab") : clinic.account_type === "pharmacy" ? (isAr?"صيدلية":"Pharmacy") : (isAr?"عيادة":"Clinic")} · ID #{clinic.id}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:"#fff", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Status bar */}
        <div style={{ background:`${dot.color}12`, borderBottom:`2px solid ${dot.color}30`, padding:"8px 24px", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:dot.color, boxShadow:`0 0 0 2px ${dot.color}30` }} />
          <span style={{ fontSize:12, fontWeight:700, color:dot.color }}>{dot.label}</span>
        </div>

        {/* Body */}
        <div style={{ padding:"4px 24px 20px" }}>
          <Row label={isAr?"المالك":"Owner"}        value={clinic.owner} />
          <Row label={isAr?"البريد":"Email"}         value={
            <span
              onClick={() => navigator.clipboard.writeText(clinic.email).catch(()=>{})}
              title={isAr?"اضغط لنسخ":"Click to copy"}
              style={{ cursor:"pointer", color:"#0863ba", textDecoration:"underline dotted" }}
            >{clinic.email}</span>
          } />
          {clinic.phone && <Row label={isAr?"الهاتف":"Phone"} value={clinic.phone} />}
          <Row label={isAr?"الخطة":"Plan"} value={
            <span style={{ background:`${planColor}15`, color:planColor, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
              {clinic.plan}
            </span>
          } />
          {["shared_basic","shared_pro","shared_enterprise"].includes(clinic.plan) && (
            <Row label={isAr?"الأطباء":"Doctors"} value={
              `${clinic.doctors_count ?? 0} / ${clinic.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[clinic.plan] ?? 2}`
            } accent="#0863ba" />
          )}
          <Row label={isAr?"تاريخ الانتهاء":"Expiry"} value={fmtEn(clinic.expiry)} accent={new Date(clinic.expiry) < new Date() ? "#c0392b" : "#353535"} />
          {clinic.payments_lock_enabled && (
            <Row label={isAr?"قفل المدفوعات":"Payments Lock"} value={isAr?"مفعّل ":"Enabled "} accent="#e67e22" />
          )}
          {clinic.restricted_access_enabled && (
            <Row label={isAr?"الوصول المقيّد":"Restricted Access"} value={isAr?"مفعّل ":"Enabled "} accent="#8e44ad" />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"0 24px 20px", display:"flex", gap:10 }}>
          <button
            onClick={onClose}
            style={{ flex:1, padding:"11px 0", borderRadius:12, background:"#f5f7fa", color:"#888", border:"1.5px solid #eef0f3", cursor:"pointer", fontSize:13, fontFamily:"Rubik,sans-serif", fontWeight:600 }}
          >{isAr?"إغلاق":"Close"}</button>
        </div>
      </div>
    </div>
  );
}
