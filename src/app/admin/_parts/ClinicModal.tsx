"use client";
// ============================================================
// src/app/admin/_parts/ClinicModal.tsx
// نافذة إضافة/تعديل عيادة — مستخرَجة من page.tsx
// ============================================================

import { useState, useMemo, useCallback } from "react";
import AppIcon from "@/components/AppIcon";
import { COUNTRIES } from "@/lib/phone";
import { CLINIC_TYPE_ICONS } from "@/lib/clinic-types";
import { T } from "./translations";
import Field from "./Field";
import { adminFetch } from "./admin-fetch";
import { PLAN_PRICING, PLAN_FEATURES, SHARED_PLAN_DEFAULT_DOCTORS, genPass } from "./plans";
import type { Lang, PlanType, AccountType, ClinicType, ClinicData } from "./types";

interface ModalProps {
  lang: Lang;
  clinic?: ClinicData | null;
  onSave: () => void;  // نستدعي فقط reload بعد الحفظ
  onClose: () => void;
}

export const ClinicModal = ({ lang, clinic, onSave, onClose }: ModalProps) => {
  const tr   = T[lang];
  const isAr = lang === "ar";
  const isEdit = !!clinic?.id;

  const [form, setForm] = useState({
    name:         clinic?.name        || "",
    owner:        clinic?.owner       || "",
    email:        clinic?.email       || "",
    phone:        clinic?.phone       || "",
    plan:         (clinic?.plan       || "basic") as PlanType,
    expiry:       clinic?.expiry      || "",
    status:       (clinic?.status     || "active") as "active" | "inactive" | "expired",
    clinic_type:  (clinic?.clinic_type || "general") as ClinicType,
    max_doctors:  clinic?.max_doctors ?? 2,
    account_type: (clinic?.account_type || "clinic") as AccountType,
    country_code: clinic?.country_code || "963",
  });

  const [creds,    setCreds]    = useState<{ password: string } | null>(null);
  const [copied,   setCopied]   = useState({ e: false, p: false });
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [planTab,  setPlanTab]  = useState<"individual"|"shared">(
    ["shared_basic","shared_pro","shared_enterprise"].includes(clinic?.plan||"") ? "shared" : "individual"
  );

  // inputSt ثابت ومعرّف خارج render
  const inputSt: React.CSSProperties = useMemo(() => ({
    width: "100%", padding: "10px 14px",
    border: "1.5px solid #e8eaed", borderRadius: 10,
    fontFamily: "Rubik, sans-serif", fontSize: 13,
    color: "#353535", background: "#fafbfc",
    outline: "none", transition: "border .2s",
    direction: isAr ? "rtl" : "ltr",
  }), [isAr]);



  const handleGenCreds = useCallback(() => {
    setCreds({ password: genPass() });
  }, []);

  const copy = useCallback(async (text: string, key: "e" | "p") => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.plan) {
      setError(tr.modal.required);
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (!isEdit) {
        // ─── إنشاء عيادة جديدة ───────────────────────────────
        if (!creds) {
          setError(isAr ? "يرجى توليد بيانات الدخول أولاً" : "Please generate credentials first");
          setSaving(false);
          return;
        }

        const res  = await adminFetch("/api/create-clinic", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            ...form,
            password:     creds.password,
            account_type: form.account_type, // صريح لضمان الحفظ في user_metadata
          }),
        });        const json = await res.json();

        if (!res.ok) {
          setError(json.error || (isAr ? "حدث خطأ" : "An error occurred"));
          setSaving(false);
          return;
        }

        setSavedUserId(json.userId);
        onSave(); // ← تحديث القائمة فوراً بعد الإنشاء
        // لا نغلق — نعرض الرابط والبيانات النهائية
      } else {
        // ─── تحديث عيادة موجودة ──────────────────────────────
        const res  = await adminFetch("/api/update-clinic", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userId: clinic?.user_id, ...form }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || (isAr ? "حدث خطأ" : "An error occurred"));
          setSaving(false);
          return;
        }
        onSave();
        onClose();
      }
    } catch {
      setError(isAr ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = savedUserId
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.nabd.clinic"}/book/${savedUserId}`
    : "";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }} />
      <div style={{
        position:"relative", zIndex:1, background:"#fff", borderRadius:20,
        width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 32px 100px rgba(8,99,186,.2)",
        animation:"modalIn .25s cubic-bezier(.4,0,.2,1)"
      }}>
        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,rgba(8,99,186,.03),transparent)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:form.account_type==="pharmacy"?"rgba(39,174,96,.12)":"rgba(8,99,186,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph={form.account_type === "pharmacy" ? "💊" : "🏥"} /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>
              {isEdit
                ? (form.account_type === "pharmacy" ? tr.pharmacy.editTitle : tr.modal.editTitle)
                : (form.account_type === "pharmacy" ? tr.pharmacy.addTitle  : tr.modal.addTitle)}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {error && (
            <div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>
              <AppIcon glyph="⚠️" /> {error}
            </div>
          )}

          {/* ─── بعد الحفظ الناجح: عرض الرابط والبيانات ─── */}
          {savedUserId ? (
            <div>
              <div style={{ textAlign:"center",marginBottom:24 }}>
                <div style={{ fontSize:48,marginBottom:8 }}><AppIcon glyph="🎉" /></div>
                <h3 style={{ fontSize:16,fontWeight:800,color:"#2e7d32" }}>
                  {form.account_type === "pharmacy"
                    ? (isAr ? tr.pharmacy.successMsg : tr.pharmacy.successMsg)
                    : (isAr ? "تم إنشاء العيادة بنجاح!" : "Clinic Created Successfully!")}
                </h3>
              </div>

              {/* بيانات الدخول */}
              <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px",marginBottom:16,border:"1.5px solid #eef0f3" }}>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                  <AppIcon glyph="⚠️" /> {tr.modal.credNote}
                </div>
                {[
                  { label: tr.modal.username,       value: form.email,          key: "e" as const },
                  { label: tr.modal.password_label, value: creds?.password || "", key: "p" as const },
                ].map(c => (
                  <div key={c.key} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:11,color:"#aaa",width:90,flexShrink:0 }}>{c.label}:</span>
                    <code style={{ flex:1,background:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,color:"#0863ba",fontFamily:"monospace",letterSpacing:.5,wordBreak:"break-all",border:"1.5px solid #eef0f3" }}>
                      {c.value}
                    </code>
                    <button onClick={() => copy(c.value, c.key)}
                      style={{ padding:"5px 12px",background:copied[c.key]?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied[c.key]?"#2e7d32":"#0863ba",border:`1.5px solid ${copied[c.key]?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .2s",whiteSpace:"nowrap" }}>
                      {copied[c.key] ? tr.modal.copiedBtn : tr.modal.copyBtn}
                    </button>
                  </div>
                ))}
              </div>

              {/* رابط الحجز — فقط للاحترافية والشاملة (فردية ومشتركة) */}
              {(form.plan === "pro" || form.plan === "enterprise" || form.plan === "shared_pro" || form.plan === "shared_enterprise") && (
              <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>
                  <AppIcon glyph="🔗" /> {tr.modal.bookLink}
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <span style={{ flex:1,fontSize:12,color:"#888",direction:"ltr",wordBreak:"break-all" }}>{bookingUrl}</span>
                  <button onClick={() => { navigator.clipboard.writeText(bookingUrl); }}
                    style={{ flexShrink:0,padding:"7px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                    {isAr ? "نسخ" : "Copy"}
                  </button>
                </div>
              </div>
              )}
            </div>
          ) : (
            /* ─── فورم الإضافة / التعديل ─── */
            <>
              {/* ── اختيار نوع الحساب (عيادة / صيدلية) — فقط عند الإضافة ── */}
              {!isEdit && (
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                    {tr.accountType.label}
                  </label>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
                    {(["clinic","pharmacy","lab"] as AccountType[]).map(type => {
                      const isSelected = form.account_type === type;
                      const isPharmacy = type === "pharmacy";
                      const isLab = type === "lab";
                      const color = isLab ? "#e08c00" : isPharmacy ? "#27ae60" : "#0863ba";
                      return (
                        <button key={type} type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            account_type: type,
                            plan: (isPharmacy ? "pharmacy" : isLab ? "lab" : "basic") as PlanType,
                          }))}
                          style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"16px 12px",border:`2px solid ${isSelected?color:"#eef0f3"}`,borderRadius:14,background:isSelected?`${color}08`:"#fafbfc",cursor:"pointer",transition:"all .18s",fontFamily:"Rubik,sans-serif",boxShadow:isSelected?`0 4px 16px ${color}18`:"none" }}>
                          <span style={{ fontSize:28 }}><AppIcon glyph={isLab?"🧪":isPharmacy?"💊":"🏥"} /></span>
                          <span style={{ fontSize:13,fontWeight:isSelected?700:500,color:isSelected?color:"#666" }}>
                            {isLab ? (isAr?"مخبر":"Lab") : isPharmacy ? tr.accountType.pharmacy : tr.accountType.clinic}
                          </span>
                          <span style={{ fontSize:10,color:"#aaa",textAlign:"center",lineHeight:1.4 }}>
                            {isLab ? (isAr?"نظام إدارة المخابر":"Lab management system") : isPharmacy ? tr.accountType.pharmacyDesc : tr.accountType.clinicDesc}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize:10,fontWeight:700,color:color,background:`${color}12`,padding:"2px 10px",borderRadius:20 }}>✓ {isAr?"محدد":"Selected"}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Field label={form.account_type === "pharmacy" ? (isAr?"اسم الصيدلية *":"Pharmacy Name *") : form.account_type === "lab" ? (isAr?"اسم المخبر *":"Lab Name *") : tr.modal.clinicName}>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={form.account_type === "pharmacy" ? tr.pharmacy.namePh : tr.modal.clinicNamePh}
                  style={inputSt}
                />
              </Field>

              <div style={{ display:"flex", gap:12 }}>
                <Field label={(form.account_type === "pharmacy" || form.account_type === "lab") ? (isAr?"اسم المدير / المالك *":"Owner / Manager *") : tr.modal.ownerName} half>
                  <input
                    value={form.owner}
                    onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder={form.account_type === "pharmacy" ? tr.pharmacy.ownerPh : tr.modal.ownerPh}
                    style={inputSt}
                  />
                </Field>
                <Field label={tr.modal.phone} half>
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={tr.modal.phonePh}
                    style={inputSt}
                  />
                </Field>
              </div>

              <Field label={isAr ? "بلد العيادة (رمز واتساب الدولي)" : "Clinic Country (WhatsApp code)"}>
                <select
                  value={form.country_code}
                  onChange={e => setForm(prev => ({ ...prev, country_code: e.target.value }))}
                  style={{ ...inputSt, cursor: "pointer" }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {isAr ? c.ar : c.en} (+{c.code})</option>
                  ))}
                </select>
              </Field>

              <Field label={tr.modal.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={tr.modal.emailPh}
                  style={inputSt}
                />
              </Field>

              {/* نوع العيادة — فقط للعيادات */}
              {form.account_type !== "pharmacy" && form.account_type !== "lab" && (
              <Field label={tr.modal.clinicType}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {([
                    "general","dental","dermatology","cosmetic","pediatrics",
                    "physical_therapy","mental_health","nutrition","ophthalmology",
                    "orthopedic","cardiology","gynecology","ent","urology","other"
                  ] as ClinicType[]).map(ct => {
                    const isSelected = form.clinic_type === ct;
                    return (
                      <button key={ct} type="button"
                        onClick={() => setForm(prev => ({ ...prev, clinic_type: ct }))}
                        style={{
                          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                          padding:"10px 6px",
                          border:`1.5px solid ${isSelected?"#0558a8":"#eef0f3"}`,
                          borderRadius:10,
                          background:isSelected?"rgba(5,88,168,.07)":"#fafbfc",
                          cursor:"pointer", transition:"all .15s",
                          fontFamily:"Rubik,sans-serif",
                          boxShadow:isSelected?"0 2px 8px rgba(5,88,168,.12)":"none",
                        }}>
                        <span style={{ fontSize:22, display:"flex" }}><AppIcon glyph={CLINIC_TYPE_ICONS[ct]} /></span>
                        <span style={{ fontSize:10, fontWeight:isSelected?700:400, color:isSelected?"#0558a8":"#666", textAlign:"center", lineHeight:1.3 }}>
                          {tr.modal.clinicTypes[ct as keyof typeof tr.modal.clinicTypes]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              )}

              {/* الخطة — عيادة: خيارات متعددة | صيدلية: بطاقة ثابتة */}
              {form.account_type === "lab" ? (
                <Field label={isAr?"اشتراك مخبر":"Lab Subscription"}>
                  <div style={{ padding:"16px",background:"rgba(224,140,0,.06)",border:"2px solid rgba(224,140,0,.25)",borderRadius:14 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                      <span style={{ fontSize:22 }}><AppIcon glyph="🧪" /></span>
                      <span style={{ fontSize:14,fontWeight:700,color:"#e08c00" }}>{isAr?"اشتراك مخبر":"Lab Subscription"}</span>
                    </div>
                    <p style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>{isAr?"جميع ميزات نظام المخبر (طلبات التحاليل، إدخال النتائج، مشاركة PDF وواتساب، كتالوج التحاليل، التقارير)":"All lab system features (orders, results entry, PDF/WhatsApp sharing, tests catalog, reports)"}</p>
                  </div>
                </Field>
              ) : form.account_type === "pharmacy" ? (
                <Field label={tr.pharmacy.plan}>
                  <div style={{ padding:"16px",background:"rgba(39,174,96,.06)",border:"2px solid rgba(39,174,96,.25)",borderRadius:14 }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:22 }}><AppIcon glyph="💊" /></span>
                        <span style={{ fontSize:14,fontWeight:700,color:"#27ae60" }}>{tr.pharmacy.plan}</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"baseline",gap:2 }}>
                        <span style={{ fontSize:22,fontWeight:900,color:"#27ae60" }}>{tr.pharmacy.price}</span>
                        <span style={{ fontSize:11,color:"#aaa" }}>{tr.pharmacy.period}</span>
                      </div>
                    </div>
                    <p style={{ fontSize:12,color:"#555",lineHeight:1.6,marginBottom:10 }}>{tr.pharmacy.planDesc}</p>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {(isAr
                        ? ["إدارة المخزون","الوصفات الطبية","نقطة البيع","إدارة الموردين","سجل الحركة","التقارير","تنبيهات المخزون","باركود"]
                        : ["Inventory","Prescriptions","Point of Sale","Suppliers","Stock Logs","Reports","Alerts","Barcode"]
                      ).map((f,i) => (
                        <span key={i} style={{ fontSize:11,color:"#27ae60",background:"rgba(39,174,96,.1)",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>✓ {f}</span>
                      ))}
                    </div>
                  </div>
                </Field>
              ) : (
              <Field label={tr.modal.plan}>
                {/* تبويب الخطط الفردية / المشتركة */}
                {(() => {
                  const isSharedSelected = ["shared_basic","shared_pro","shared_enterprise"].includes(form.plan);
                  const individualPlans: { key: PlanType; color: string; emoji: string }[] = [
                    { key:"basic",      color:"#0863ba", emoji:"🩺" },
                    { key:"pro",        color:"#7b2d8b", emoji:"🏥" },
                    { key:"enterprise", color:"#e67e22", emoji:"🚀" },
                  ];
                  const sharedPlans: { key: PlanType; color: string; emoji: string; defaultDoctors: number }[] = [
                    { key:"shared_basic",      color:"#0e7c6a", emoji:"👥", defaultDoctors:2 },
                    { key:"shared_pro",        color:"#b5451b", emoji:"🏨", defaultDoctors:3 },
                    { key:"shared_enterprise", color:"#4a1480", emoji:"🏗️", defaultDoctors:5 },
                  ];
                  return (
                    <div>
                      {/* تبويب */}
                      <div style={{ display:"flex",gap:4,background:"#f7f9fc",borderRadius:10,padding:4,marginBottom:12 }}>
                        <button type="button" onClick={() => { setPlanTab("individual"); if(isSharedSelected) setForm(prev=>({...prev,plan:"basic"})); }}
                          style={{ flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:planTab==="individual"?700:400,background:planTab==="individual"?"#fff":"transparent",color:planTab==="individual"?"#0863ba":"#888",boxShadow:planTab==="individual"?"0 2px 6px rgba(8,99,186,.1)":"none",transition:"all .15s" }}>
                          <AppIcon glyph="🩺" /> {isAr?"خطط فردية":"Individual"}
                        </button>
                        <button type="button" onClick={() => { setPlanTab("shared"); if(!isSharedSelected) setForm(prev=>({...prev,plan:"shared_basic",max_doctors:2})); }}
                          style={{ flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:planTab==="shared"?700:400,background:planTab==="shared"?"#fff":"transparent",color:planTab==="shared"?"#0e7c6a":"#888",boxShadow:planTab==="shared"?"0 2px 6px rgba(14,124,106,.1)":"none",transition:"all .15s" }}>
                          <AppIcon glyph="👥" /> {isAr?"خطط مشتركة":"Shared"}
                        </button>
                      </div>
                      {/* الخطط الفردية */}
                      {planTab === "individual" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          {individualPlans.map(p => {
                            const isSelected = form.plan === p.key;
                            const pricing = PLAN_PRICING[p.key];
                            const features = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                            return (
                              <button key={p.key} type="button"
                                onClick={() => setForm(prev => ({ ...prev, plan: p.key }))}
                                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:isAr?"right":"left",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                                <div style={{ width:12,height:12,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:3,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                                    <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>
                                      <AppIcon glyph={p.emoji} /> {tr.clinics.plans[p.key]}
                                    </span>
                                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:`${p.color}15`,color:p.color,fontWeight:700 }}>${pricing.monthly}{isAr?"/شهر":"/mo"}</span>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(46,125,50,.08)",color:"#2e7d32",fontWeight:600 }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                                    {features.map((f,i) => (
                                      <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:3 }}>
                                        <span style={{ color:p.color }}>✓</span> {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* الخطط المشتركة */}
                      {planTab === "shared" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          <div style={{ background:"rgba(14,124,106,.05)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#0e7c6a",marginBottom:4 }}>
                            <AppIcon glyph="👥" /> {isAr?"للعيادات التي تضم أكثر من طبيب واحد — يتم تخصيص المرضى لكل طبيب بشكل مستقل":"For clinics with multiple doctors — patients are assigned per doctor"}
                          </div>
                          {sharedPlans.map(p => {
                            const isSelected = form.plan === p.key;
                            const pricing = PLAN_PRICING[p.key];
                            const features = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                            return (
                              <button key={p.key} type="button"
                                onClick={() => setForm(prev => ({ ...prev, plan: p.key, max_doctors: SHARED_PLAN_DEFAULT_DOCTORS[p.key] ?? p.defaultDoctors }))}
                                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:isAr?"right":"left",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                                <div style={{ width:12,height:12,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:3,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                                    <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>
                                      <AppIcon glyph={p.emoji} /> {tr.clinics.plans[p.key]}
                                    </span>
                                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:`${p.color}15`,color:p.color,fontWeight:700 }}>${pricing.monthly}{isAr?"/شهر":"/mo"}</span>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(46,125,50,.08)",color:"#2e7d32",fontWeight:600 }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:6 }}>
                                    {features.map((f,i) => (
                                      <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:3 }}>
                                        <span style={{ color:p.color }}>✓</span> {f}
                                      </span>
                                    ))}
                                  </div>
                                  <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                                    <AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /> {isAr?"الأطباء:":"Doctors:"} {isAr?`حتى ${p.defaultDoctors}`:`Up to ${p.defaultDoctors}`}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {/* تعديل عدد الأطباء للخطة المشتركة المختارة */}
                          {isSharedSelected && (
                            <div style={{ background:"#f7f9fc",borderRadius:10,padding:"12px 14px",border:"1.5px solid #eef0f3",marginTop:4 }}>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase" as const }}>
                                <AppIcon glyph="✏️" /> {isAr?"الحد الأقصى للأطباء (قابل للتخصيص)":"Max Doctors (Customizable)"}
                              </label>
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} max={50} value={form.max_doctors}
                                  onChange={e => setForm(prev => ({ ...prev, max_doctors: parseInt(e.target.value)||1 }))}
                                  style={{ width:80,padding:"8px 12px",border:"1.5px solid #e8eaed",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,color:"#353535",textAlign:"center",outline:"none" }}
                                />
                                <span style={{ fontSize:12,color:"#888" }}>{isAr?"طبيب (الحد الافتراضي حسب الخطة)":"doctors (default by plan)"}</span>
                              </div>
                              <p style={{ fontSize:11,color:"#aaa",marginTop:6 }}><AppIcon glyph="⚙️" /> {isAr?tr.subModal.maxDoctorsNote:tr.subModal.maxDoctorsNote}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Field>
              )} {/* end clinic plan conditional */}

              <Field label={tr.modal.expiry} half>
                  <input
                    type="date"
                    value={form.expiry}
                    onChange={e => setForm(prev => ({ ...prev, expiry: e.target.value }))}
                    style={inputSt}
                  />
              </Field>

              {/* توليد بيانات الدخول — فقط عند الإضافة */}
              {!isEdit && (
                <div style={{ borderTop:"1.5px dashed #eee", paddingTop:16, marginTop:4 }}>
                  <button
                    type="button"
                    onClick={handleGenCreds}
                    style={{ width:"100%",padding:"11px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px dashed rgba(8,99,186,.3)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
                  >
                    <AppIcon glyph="🔑" /> {tr.modal.generateCredentials}
                  </button>

                  {creds && (
                    <div style={{ marginTop:14,background:"#f7f9fc",borderRadius:12,padding:"16px",border:"1.5px solid #eef0f3",animation:"modalIn .2s ease" }}>
                      <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                        <AppIcon glyph="⚠️" /> {tr.modal.credNote}
                      </div>
                      {[
                        { label: tr.modal.username,       value: form.email || (isAr ? "أدخل البريد أولاً" : "Enter email first"), key: "e" as const },
                        { label: tr.modal.password_label, value: creds.password, key: "p" as const },
                      ].map(c => (
                        <div key={c.key} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                          <span style={{ fontSize:11,color:"#aaa",width:90,flexShrink:0 }}>{c.label}:</span>
                          <code style={{ flex:1,background:"#fff",padding:"6px 10px",borderRadius:8,fontSize:12,color:"#0863ba",fontFamily:"monospace",letterSpacing:.5,wordBreak:"break-all",border:"1.5px solid #eef0f3" }}>
                            {c.value}
                          </code>
                          <button
                            type="button"
                            onClick={() => copy(c.value, c.key)}
                            style={{ padding:"5px 12px",background:copied[c.key]?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied[c.key]?"#2e7d32":"#0863ba",border:`1.5px solid ${copied[c.key]?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .2s",whiteSpace:"nowrap" }}
                          >
                            {copied[c.key] ? tr.modal.copiedBtn : tr.modal.copyBtn}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          {savedUserId ? (
            <button
              onClick={() => { onSave(); onClose(); }}
              style={{ flex:1,padding:"12px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}
            >
              ✓ {isAr ? "إغلاق" : "Close"}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
              >
                {saving ? tr.modal.creating : (isEdit ? tr.modal.update : tr.modal.save)}
              </button>
              <button
                onClick={onClose}
                style={{ padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}
              >
                {tr.modal.cancel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


export default ClinicModal;
