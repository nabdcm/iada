"use client";
// ============================================================
// src/app/admin/_parts/SubscriptionModal.tsx
// نافذة تعديل الاشتراك والأمان — مستخرَجة من page.tsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import AppIcon from "@/components/AppIcon";
import { COUNTRIES } from "@/lib/phone";
import { CLINIC_TYPE_ICONS } from "@/lib/clinic-types";
import { T } from "./translations";
import Field from "./Field";
import { adminFetch } from "./admin-fetch";
import { PLAN_PRICING, PLAN_FEATURES, PLAN_PATIENT_LIMITS, SHARED_PLAN_DEFAULT_DOCTORS, genPass } from "./plans";
import type { Lang, PlanType, AccountType, ClinicType, ClinicData, Doctor } from "./types";

interface SubModalProps {
  lang: Lang;
  clinic: ClinicData;
  onSave: () => void;
  onClose: () => void;
}

export const SubscriptionModal = ({ lang, clinic, onSave, onClose }: SubModalProps) => {
  const tr   = T[lang];
  const sm   = tr.subModal;
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState<"info"|"sub"|"doctors"|"security">("info");
  const [form, setForm] = useState({
    email:  clinic.email  || "",
    owner:  clinic.owner  || "",
    phone:  clinic.phone  || "",
    plan:   clinic.plan   as PlanType,
    expiry: clinic.expiry || "",
    status: clinic.status as "active"|"inactive"|"expired",
    clinic_type: (clinic.clinic_type || "general") as ClinicType,
    max_doctors: clinic.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[clinic.plan] ?? 2,
    payments_lock_enabled:  clinic.payments_lock_enabled  ?? false,
    payments_lock_password: clinic.payments_lock_password ?? "",
    restricted_access_enabled: clinic.restricted_access_enabled ?? false,
    restricted_access_pin:     clinic.restricted_access_pin     ?? "",
    country_code: clinic.country_code || "963",
    telemedicine_enabled: clinic.telemedicine_enabled ?? false,
  });
  const [newPass,       setNewPass]       = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [copiedLink,    setCopiedLink]    = useState(false);
  const [showPin,       setShowPin]       = useState(false);
  // savedRA tracks what's actually persisted in DB — used to gate the copy-link button
  const [savedRA, setSavedRA] = useState({
    enabled: clinic.restricted_access_enabled ?? false,
    pin:     clinic.restricted_access_pin     ?? "",
  });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  // ── Doctors state ─────────────────────────────────────────
  const DOCTOR_COLORS = ["#0863ba","#7b2d8b","#0e7c6a","#b5451b","#e67e22","#4a1480","#c0392b","#2e7d32"];
  const isSharedPlan  = ["shared_basic","shared_pro","shared_enterprise"].includes(form.plan);
  const maxDoctors    = form.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[form.plan] ?? 2;

  const [doctors,        setDoctors]        = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorForm,     setDoctorForm]     = useState<Doctor | null>(null);
  const [doctorSaving,   setDoctorSaving]   = useState(false);
  const [doctorError,    setDoctorError]    = useState("");

  useEffect(() => {
    if (isSharedPlan && clinic.user_id) loadDoctors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.user_id]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await adminFetch(`/api/doctors?user_id=${clinic.user_id}`, { cache:"no-store" });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data as Doctor[]);
      }
    } catch (err) {
      console.error("loadDoctors error:", err);
    }
    setDoctorsLoading(false);
  };

  const openAddDoctor = () => {
    setDoctorError("");
    setDoctorForm({
      user_id:   clinic.user_id!,
      name:      "",
      specialty: "",
      phone:     "",
      email:     "",
      color:     DOCTOR_COLORS[doctors.length % DOCTOR_COLORS.length],
      is_active: true,
    });
  };

  const openEditDoctor = (d: Doctor) => {
    setDoctorError("");
    setDoctorForm({ ...d });
  };

  const handleSaveDoctor = async () => {
    if (!doctorForm?.name.trim()) { setDoctorError(sm.doctors.noName); return; }
    setDoctorSaving(true); setDoctorError("");
    const action = doctorForm.id ? "update" : "add";
    const res = await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        action,
        id:        doctorForm.id,
        user_id:   clinic.user_id,
        name:      doctorForm.name,
        specialty: doctorForm.specialty,
        phone:     doctorForm.phone,
        email:     doctorForm.email,
        color:     doctorForm.color,
        is_active: doctorForm.is_active,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setDoctorError(json.error || (isAr ? "حدث خطأ" : "An error occurred")); setDoctorSaving(false); return; }
    setDoctorSaving(false);
    setDoctorForm(null);
    loadDoctors();
  };

  const handleToggleDoctor = async (d: Doctor) => {
    await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "toggle", id: d.id }),
    });
    loadDoctors();
  };

  const handleRemoveDoctor = async (d: Doctor) => {
    if (!window.confirm(sm.doctors.confirmRemove)) return;
    await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "delete", id: d.id }),
    });
    loadDoctors();
  };

  // ── helpers ──────────────────────────────────────────────
  const genAndSetPass = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    setNewPass(Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join(""));
  }, []);

  const copyPass = async () => {
    await navigator.clipboard.writeText(newPass).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── بناء body مشترك للـ API ──────────────────────────────
  const buildBody = (overrides: Record<string,unknown> = {}): Record<string,unknown> => ({
    userId: clinic.user_id,
    name:   clinic.name,
    owner:  form.owner,
    email:  form.email,
    phone:  form.phone,
    plan:   form.plan,
    expiry: form.expiry,
    status: form.status,
    clinic_type: form.clinic_type,
    account_type: clinic.account_type || "clinic",
    max_doctors: form.max_doctors,
    payments_lock_enabled:  form.payments_lock_enabled,
    payments_lock_password: form.payments_lock_password,
    restricted_access_enabled: form.restricted_access_enabled,
    restricted_access_pin:     form.restricted_access_pin,
    country_code: form.country_code,
    telemedicine_enabled: form.telemedicine_enabled,
    ...overrides,
  });

  const callAPI = async (body: Record<string,unknown>): Promise<{ok:boolean; error?:string}> => {
    try {
      const res  = await adminFetch("/api/update-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok:false, error: json.error || (isAr?"حدث خطأ":"An error occurred") };
      return { ok:true };
    } catch {
      return { ok:false, error: isAr?"خطأ في الاتصال":"Connection error" };
    }
  };

  // ── حفظ التعديلات (بيانات + اشتراك + كلمة مرور) ─────────
  const handleSave = async () => {
    // التحقق من كلمة سر المدفوعات عند تفعيل القفل
    if (form.payments_lock_enabled && !form.payments_lock_password.trim()) {
      setError(sm.paymentsLock.required);
      return;
    }
    // التحقق من PIN الدخول المقيّد
    if (form.restricted_access_enabled) {
      const pin = form.restricted_access_pin.trim();
      if (!pin) { setError(sm.restrictedAccess.required); return; }
      if (!/^\d{4,8}$/.test(pin)) { setError(sm.restrictedAccess.pinInvalid); return; }
    }
    setSaving(true); setError(""); setSuccessMsg("");
    const body = buildBody();
    if (newPass.trim()) body.newPassword = newPass.trim();
    const result = await callAPI(body);
    setSaving(false);
    if (!result.ok) { setError(result.error!); return; }
    setSuccessMsg(isAr?"✓ تم الحفظ بنجاح":"✓ Saved successfully");
    setNewPass("");
    setSavedRA({ enabled: form.restricted_access_enabled, pin: form.restricted_access_pin });
    onSave(); // تحديث القائمة في الخلفية
    setTimeout(() => { setSuccessMsg(""); onClose(); }, 800);
  };

  // ── تجميد / رفع تجميد — عبر service_role ─────────────────
  const handleFreeze = async () => {
    setActionLoading("freeze"); setError("");
    const newStatus = form.status === "inactive" ? "active" : "inactive";
    try {
      const res  = await adminFetch("/api/freeze-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id, status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || (isAr?"حدث خطأ":"An error occurred")); return; }
      setForm(p => ({ ...p, status: newStatus }));
      onSave();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
    } finally {
      setActionLoading("");
    }
  };

  // ── إلغاء الاشتراك — عبر service_role ──────────────────────
  const handleCancelSub = async () => {
    setActionLoading("cancel"); setError("");
    try {
      const res  = await adminFetch("/api/cancel-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || (isAr?"حدث خطأ":"An error occurred")); return; }
      const today = new Date().toISOString().split("T")[0];
      setForm(p => ({ ...p, status: "expired", expiry: today }));
      onSave();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
    } finally {
      setActionLoading("");
    }
  };

  // ── حذف نهائي — عبر service_role ───────────────────────────
  const handleDelete = async () => {
    setActionLoading("delete"); setError("");
    try {
      const res  = await adminFetch("/api/delete-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || (isAr?"حدث خطأ أثناء الحذف":"Error during deletion"));
        setConfirmDelete(false);
        return;
      }
      onSave();
      onClose();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
      setConfirmDelete(false);
    } finally {
      setActionLoading("");
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"10px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:13, color:"#353535", background:"#fafbfc",
    outline:"none", direction: isAr?"rtl":"ltr",
  };

  const PLAN_INFO: { key: PlanType; color: string; emoji: string; isShared?: boolean; defaultDoctors?: number }[] = [
    { key:"basic",             color:"#0863ba", emoji:"🩺" },
    { key:"pro",               color:"#7b2d8b", emoji:"🏥" },
    { key:"enterprise",        color:"#e67e22", emoji:"🚀" },
    { key:"shared_basic",      color:"#0e7c6a", emoji:"👥", isShared:true, defaultDoctors:2 },
    { key:"shared_pro",        color:"#b5451b", emoji:"🏨", isShared:true, defaultDoctors:3 },
    { key:"shared_enterprise", color:"#4a1480", emoji:"🏗️", isShared:true, defaultDoctors:5 },
  ];

  const tabStyle = (t: string): React.CSSProperties => ({
    padding:"9px 18px", border:"none", borderRadius:10, cursor:"pointer",
    fontFamily:"Rubik,sans-serif", fontSize:13, fontWeight: activeTab===t?700:400,
    background: activeTab===t?"#fff":"transparent",
    color: activeTab===t?"#0863ba":"#888",
    boxShadow: activeTab===t?"0 2px 8px rgba(8,99,186,.1)":"none",
    transition:"all .18s",
  });

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }} />
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:24,width:"100%",maxWidth:520,maxHeight:"94vh",overflowY:"auto",boxShadow:"0 32px 100px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>

        {/* Header */}
        <div style={{ padding:"22px 26px 0",background:"linear-gradient(135deg,rgba(8,99,186,.04),transparent)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:44,height:44,background:"rgba(8,99,186,.08)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}><AppIcon glyph="💳" /></div>
              <div>
                <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",lineHeight:1.2 }}>{sm.title}</h2>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{clinic.name}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:16,color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex",gap:4,background:"#f7f9fc",borderRadius:12,padding:4 }}>
            <button style={tabStyle("info")}     onClick={() => setActiveTab("info")}>{sm.tabInfo}</button>
            <button style={tabStyle("sub")}      onClick={() => setActiveTab("sub")}>{sm.tabSub}</button>
            {isSharedPlan && (
              <button style={tabStyle("doctors")} onClick={() => setActiveTab("doctors")}>
                <AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /> {sm.tabDoctors}
              </button>
            )}
            <button style={tabStyle("security")} onClick={() => setActiveTab("security")}>{sm.tabSecurity}</button>
          </div>
          <div style={{ height:1,background:"#eef0f3",marginTop:16 }} />
        </div>

        <div style={{ padding:"20px 26px 0" }}>
          {error && <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}><AppIcon glyph="⚠️" /> {error}</div>}
          {successMsg && <div style={{ background:"rgba(46,125,50,.06)",border:"1.5px solid rgba(46,125,50,.15)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#2e7d32",marginBottom:14 }}>{successMsg}</div>}

          {/* ── TAB: INFO ── */}
          {activeTab === "info" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.username}</label>
                <input value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder={sm.usernamePh} style={inputSt} />
              </div>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.ownerName}</label>
                <input value={form.owner} onChange={e => setForm(p=>({...p,owner:e.target.value}))} placeholder={sm.ownerPh} style={inputSt} />
              </div>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.phone}</label>
                <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder={sm.phonePh} style={inputSt} />
              </div>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{isAr ? "بلد العيادة (رمز واتساب)" : "Clinic Country (WhatsApp)"}</label>
                <select value={form.country_code} onChange={e => setForm(p=>({...p,country_code:e.target.value}))} style={{ ...inputSt, cursor:"pointer" }}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {isAr ? c.ar : c.en} (+{c.code})</option>
                  ))}
                </select>
              </div>

              {/* نوع العيادة */}
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>
                  {tr.modal.clinicType}
                </label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
                  {([
                    "general","dental","dermatology","cosmetic","pediatrics",
                    "physical_therapy","mental_health","nutrition","ophthalmology",
                    "orthopedic","cardiology","gynecology","ent","urology","other"
                  ] as ClinicType[]).map(ct => {
                    const isSelected = form.clinic_type === ct;
                    return (
                      <button key={ct} type="button"
                        onClick={() => setForm(p => ({ ...p, clinic_type: ct }))}
                        style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:`1.5px solid ${isSelected?"#0558a8":"#eef0f3"}`,borderRadius:9,background:isSelected?"rgba(5,88,168,.07)":"#fafbfc",cursor:"pointer",transition:"all .15s",fontFamily:"Rubik,sans-serif",boxShadow:isSelected?"0 2px 8px rgba(5,88,168,.12)":"none" }}>
                        <span style={{ fontSize:18, display:"flex" }}><AppIcon glyph={CLINIC_TYPE_ICONS[ct]} /></span>
                        <span style={{ fontSize:9,fontWeight:isSelected?700:400,color:isSelected?"#0558a8":"#888",textAlign:"center",lineHeight:1.3 }}>
                          {tr.modal.clinicTypes[ct as keyof typeof tr.modal.clinicTypes]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: SUBSCRIPTION ── */}
          {activeTab === "sub" && (
            <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

              {/* Plan selector — الصيدلية لا تملك خيارات خطة */}
              {clinic.account_type === "pharmacy" ? (
                <div style={{ padding:"16px",background:"rgba(39,174,96,.06)",border:"1.5px solid rgba(39,174,96,.2)",borderRadius:14 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:22 }}><AppIcon glyph="💊" /></span>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#27ae60" }}>{isAr?"اشتراك صيدلية":"Pharmacy Subscription"}</div>
                      <div style={{ fontSize:11,color:"#888",marginTop:2 }}>{isAr?"خطة الصيدلية ثابتة ولا يمكن تغييرها":"Pharmacy plan is fixed and cannot be changed"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {(isAr
                      ? ["إدارة المخزون","الوصفات الطبية","نقطة البيع","إدارة الموردين","التقارير","تنبيهات المخزون"]
                      : ["Inventory","Prescriptions","Point of Sale","Suppliers","Reports","Stock Alerts"]
                    ).map((f,i) => (
                      <span key={i} style={{ fontSize:11,color:"#27ae60",background:"rgba(39,174,96,.1)",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>✓ {f}</span>
                    ))}
                  </div>
                </div>
              ) : (
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:10,textTransform:"uppercase",letterSpacing:.4 }}>{sm.changePlan}</label>
                {/* قسم الخطط الفردية */}
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:8,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ background:"rgba(8,99,186,.08)",padding:"2px 10px",borderRadius:20 }}><AppIcon glyph="🩺" /> {isAr?"خطط فردية":"Individual Plans"}</span>
                  <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{isAr?"لطبيب واحد":"Single doctor"}</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
                  {PLAN_INFO.filter(p => !p.isShared).map(p => {
                    const isSelected = form.plan === p.key;
                    const isCurrent  = clinic.plan === p.key;
                    const pricing    = PLAN_PRICING[p.key];
                    const limit      = PLAN_PATIENT_LIMITS[p.key];
                    const limitLabel = limit === Infinity ? (isAr?"غير محدود":"Unlimited") : `${limit}`;
                    const features   = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                    return (
                      <button key={p.key} onClick={() => setForm(prev=>({...prev,plan:p.key}))}
                        style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:"start",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:4,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}><AppIcon glyph={p.emoji} /> {sm.plans[p.key]}</span>
                              {isCurrent && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${p.color}15`,color:p.color }}>{isAr?"الحالية":"Current"}</span>}
                            </div>
                            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                              <span style={{ fontSize:11,fontWeight:700,color:p.color }}>${pricing.monthly}<span style={{ fontSize:9,color:"#aaa",fontWeight:400 }}>{isAr?"/شهر":"/mo"}</span></span>
                              <span style={{ fontSize:10,color:"#2e7d32" }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:4 }}>
                            {features.map((f,i) => (
                              <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:2 }}>
                                <span style={{ color:p.color }}>✓</span> {f}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                            <AppIcon glyph="👥" /> {isAr?"المرضى:":"Patients:"} {limitLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* قسم الخطط المشتركة */}
                <div style={{ fontSize:11,fontWeight:700,color:"#0e7c6a",marginBottom:8,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ background:"rgba(14,124,106,.08)",padding:"2px 10px",borderRadius:20 }}><AppIcon glyph="👥" /> {isAr?"خطط مشتركة":"Shared Plans"}</span>
                  <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{isAr?"لأكثر من طبيب":"Multi-doctor"}</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {PLAN_INFO.filter(p => p.isShared).map(p => {
                    const isSelected = form.plan === p.key;
                    const isCurrent  = clinic.plan === p.key;
                    const pricing    = PLAN_PRICING[p.key];
                    const limit      = PLAN_PATIENT_LIMITS[p.key];
                    const limitLabel = limit === Infinity ? (isAr?"غير محدود":"Unlimited") : `${limit}`;
                    const features   = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                    return (
                      <button key={p.key} onClick={() => setForm(prev=>({...prev,plan:p.key,max_doctors:prev.plan===p.key?prev.max_doctors:(SHARED_PLAN_DEFAULT_DOCTORS[p.key]??p.defaultDoctors??2)}))}
                        style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:"start",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:4,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}><AppIcon glyph={p.emoji} /> {sm.plans[p.key]}</span>
                              {isCurrent && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${p.color}15`,color:p.color }}>{isAr?"الحالية":"Current"}</span>}
                            </div>
                            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                              <span style={{ fontSize:11,fontWeight:700,color:p.color }}>${pricing.monthly}<span style={{ fontSize:9,color:"#aaa",fontWeight:400 }}>{isAr?"/شهر":"/mo"}</span></span>
                              <span style={{ fontSize:10,color:"#2e7d32" }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:4 }}>
                            {features.map((f,i) => (
                              <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:2 }}>
                                <span style={{ color:p.color }}>✓</span> {f}
                              </span>
                            ))}
                          </div>
                          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                              <AppIcon glyph="👥" /> {isAr?"المرضى:":"Patients:"} {limitLabel}
                            </div>
                            <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                              <AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /> {isAr?"افتراضي:":"Default:"} {p.defaultDoctors} {isAr?"أطباء":"doctors"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* حقل تعديل عدد الأطباء — يظهر فقط عند اختيار خطة مشتركة */}
                {["shared_basic","shared_pro","shared_enterprise"].includes(form.plan) && (
                  <div style={{ background:"rgba(14,124,106,.04)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:10,padding:"12px 14px",marginTop:12 }}>
                    <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#0e7c6a",marginBottom:8,textTransform:"uppercase" as const }}>
                      <AppIcon glyph="✏️" /> {sm.maxDoctors} ({sm.maxDoctorsNote})
                    </label>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} max={50} value={form.max_doctors}
                        onChange={e => setForm(prev=>({...prev,max_doctors:parseInt(e.target.value)||1}))}
                        style={{ width:80,padding:"8px 12px",border:"1.5px solid rgba(14,124,106,.3)",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:16,fontWeight:800,color:"#0e7c6a",textAlign:"center",outline:"none",background:"#fff" }}
                      />
                      <span style={{ fontSize:12,color:"#666" }}>{isAr?"طبيب كحد أقصى في الاشتراك":"doctors maximum in subscription"}</span>
                    </div>
                    <p style={{ fontSize:11,color:"#aaa",marginTop:6,lineHeight:1.5 }}>
                      <AppIcon glyph="⚙️" /> {isAr?"هذا الرقم مخصص ويتم الاتفاق عليه مع العميل — يتحكم في الحد الأقصى للأطباء المضافين في العيادة":"This is a custom number agreed with the client — it controls the maximum doctors allowed in the clinic"}
                    </p>
                  </div>
                )}
              </div>
              )} {/* end clinic plan conditional */}

              {/* Expiry */}
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.expiry}</label>
                <input type="date" value={form.expiry} onChange={e => setForm(p=>({...p,expiry:e.target.value}))} style={inputSt} />
              </div>

              {/* Action cards */}
              <div style={{ display:"flex",flexDirection:"column",gap:10,borderTop:"1.5px solid #eef0f3",paddingTop:16,marginTop:4 }}>

                {/* Freeze */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#f7f9fc",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      {form.status==="inactive"?"▶":"⏸"} {sm.freezeTitle}
                    </div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.freezeDesc}</div>
                  </div>
                  <button onClick={handleFreeze} disabled={actionLoading==="freeze"}
                    style={{ padding:"8px 16px",background:form.status==="inactive"?"rgba(46,125,50,.08)":"rgba(230,126,34,.08)",color:form.status==="inactive"?"#2e7d32":"#e67e22",border:`1.5px solid ${form.status==="inactive"?"rgba(46,125,50,.2)":"rgba(230,126,34,.2)"}`,borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {actionLoading==="freeze"?"...":(form.status==="inactive"?sm.unfreeze:sm.freeze)}
                  </button>
                </div>

                {/* Cancel */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#f7f9fc",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:8 }}><AppIcon glyph="🚫" /> {sm.cancelTitle}</div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.cancelDesc}</div>
                  </div>
                  <button onClick={handleCancelSub} disabled={actionLoading==="cancel"||form.status==="expired"}
                    style={{ padding:"8px 16px",background:"rgba(192,57,43,.06)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:form.status==="expired"?"not-allowed":"pointer",opacity:form.status==="expired"?.5:1,whiteSpace:"nowrap" }}>
                    {actionLoading==="cancel"?"...":sm.cancelSub}
                  </button>
                </div>

                {/* Delete */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"rgba(192,57,43,.03)",borderRadius:12,border:"1.5px solid rgba(192,57,43,.12)" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}><AppIcon glyph="🗑️" /> {sm.deleteTitle}</div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.deleteDesc}</div>
                  </div>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ padding:"8px 16px",background:"#c0392b",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {sm.delete}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: DOCTORS ── */}
          {activeTab === "doctors" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

              {/* شريط الطاقة الاستيعابية + تعديل الحد الأقصى مباشرة */}
              <div style={{ background:"rgba(14,124,106,.05)",border:"1.5px solid rgba(14,124,106,.2)",borderRadius:12,padding:"12px 16px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#0e7c6a" }}><AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /> {sm.doctors.capacity}</div>
                    <div style={{ fontSize:11,color:"#888",marginTop:2 }}>
                      {doctors.filter(d=>d.is_active).length} {isAr?"نشط /":"active /"} {doctors.length} {isAr?"مضاف /":"added /"} {maxDoctors} {isAr?"حد أقصى":"max"}
                    </div>
                  </div>
                  <div style={{ width:80 }}>
                    <div style={{ height:6,background:"#e8eaed",borderRadius:20,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${Math.min((doctors.length/maxDoctors)*100,100)}%`,background:doctors.length>=maxDoctors?"#c0392b":"#0e7c6a",borderRadius:20,transition:"width .3s" }} />
                    </div>
                    <div style={{ fontSize:10,color:"#aaa",textAlign:"center",marginTop:3 }}>{doctors.length}/{maxDoctors}</div>
                  </div>
                </div>
                {/* تعديل الحد الأقصى مباشرة من تاب الأطباء */}
                <div style={{ borderTop:"1px solid rgba(14,124,106,.15)",paddingTop:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                  <span style={{ fontSize:11,fontWeight:700,color:"#0e7c6a",whiteSpace:"nowrap" }}>
                    <AppIcon glyph="✏️" /> {sm.maxDoctors}:
                  </span>
                  <input
                    type="number" min={1} max={50}
                    value={form.max_doctors}
                    onChange={e => setForm(prev => ({ ...prev, max_doctors: parseInt(e.target.value) || 1 }))}
                    style={{ width:60,padding:"5px 8px",border:"1.5px solid rgba(14,124,106,.4)",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:800,color:"#0e7c6a",textAlign:"center" as const,outline:"none",background:"#fff" }}
                  />
                  <button
                    onClick={async () => {
                      setSaving(true); setError(""); setSuccessMsg("");
                      const result = await callAPI(buildBody());
                      setSaving(false);
                      if (!result.ok) { setError(result.error!); return; }
                      setSuccessMsg(isAr ? "✓ تم حفظ الحد الأقصى" : "✓ Max doctors saved");
                      onSave();
                      setTimeout(() => setSuccessMsg(""), 2500);
                    }}
                    disabled={saving}
                    style={{ padding:"5px 14px",background:"#0e7c6a",color:"#fff",border:"none",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap" as const }}>
                    {saving ? "..." : (isAr ? "حفظ" : "Save")}
                  </button>
                  <span style={{ fontSize:10,color:"#aaa" }}>{sm.maxDoctorsNote}</span>
                </div>
              </div>

              {/* زر إضافة */}
              {doctors.length < maxDoctors && !doctorForm && (
                <button onClick={openAddDoctor}
                  style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",border:"1.5px dashed rgba(14,124,106,.4)",borderRadius:12,background:"rgba(14,124,106,.03)",color:"#0e7c6a",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                  <AppIcon glyph="➕" /> {sm.doctors.addDoctor}
                </button>
              )}
              {doctors.length >= maxDoctors && !doctorForm && (
                <div style={{ textAlign:"center",fontSize:12,color:"#aaa",padding:"8px",background:"rgba(192,57,43,.04)",border:"1.5px solid rgba(192,57,43,.1)",borderRadius:10 }}>
                  <AppIcon glyph="🔒" /> {sm.doctors.limitReached} ({maxDoctors})
                </div>
              )}

              {/* فورم إضافة / تعديل */}
              {doctorForm && (
                <div style={{ background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:14,padding:"16px" }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
                    {doctorForm.id ? (isAr?"تعديل الطبيب":"Edit Doctor") : (isAr?"طبيب جديد":"New Doctor")}
                  </div>
                  {doctorError && (
                    <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#c0392b",marginBottom:10 }}><AppIcon glyph="⚠️" /> {doctorError}</div>
                  )}
                  <div style={{ display:"flex",gap:10,marginBottom:10 }}>
                    <div style={{ flex:2 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.name}</label>
                      <input value={doctorForm.name} onChange={e=>setDoctorForm(p=>p?{...p,name:e.target.value}:p)}
                        placeholder={sm.doctors.namePh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.specialty}</label>
                      <input value={doctorForm.specialty} onChange={e=>setDoctorForm(p=>p?{...p,specialty:e.target.value}:p)}
                        placeholder={sm.doctors.specialtyPh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:10,marginBottom:10 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.phone}</label>
                      <input value={doctorForm.phone} onChange={e=>setDoctorForm(p=>p?{...p,phone:e.target.value}:p)}
                        placeholder={sm.doctors.phonePh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none",direction:"ltr" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.email}</label>
                      <input value={doctorForm.email} onChange={e=>setDoctorForm(p=>p?{...p,email:e.target.value}:p)}
                        placeholder={sm.doctors.emailPh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none",direction:"ltr" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:7,textTransform:"uppercase" as const }}>{sm.doctors.color}</label>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      {DOCTOR_COLORS.map(c => (
                        <button key={c} type="button" onClick={()=>setDoctorForm(p=>p?{...p,color:c}:p)}
                          style={{ width:28,height:28,borderRadius:"50%",background:c,border:doctorForm.color===c?"3px solid #353535":"2px solid transparent",cursor:"pointer",boxShadow:doctorForm.color===c?"0 0 0 3px rgba(0,0,0,.15)":"none" }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={handleSaveDoctor} disabled={doctorSaving}
                      style={{ flex:1,padding:"10px",background:"#0e7c6a",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:doctorSaving?"not-allowed":"pointer",opacity:doctorSaving?.7:1 }}>
                      {doctorSaving ? sm.doctors.saving : sm.doctors.save}
                    </button>
                    <button onClick={()=>{setDoctorForm(null);setDoctorError("");}}
                      style={{ padding:"10px 18px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
                      {sm.doctors.cancel}
                    </button>
                  </div>
                </div>
              )}

              {/* قائمة الأطباء */}
              {doctorsLoading ? (
                <div style={{ textAlign:"center",padding:"24px",color:"#aaa",fontSize:13 }}>⏳ {isAr?"جاري التحميل...":"Loading..."}</div>
              ) : doctors.length === 0 && !doctorForm ? (
                <div style={{ textAlign:"center",padding:"32px 20px",color:"#bbb" }}>
                  <div style={{ fontSize:40,marginBottom:8 }}><AppIcon glyph="👨" />‍<AppIcon glyph="⚕️" /></div>
                  <div style={{ fontSize:13 }}>{isAr?"لا يوجد أطباء مضافون بعد":"No doctors added yet"}</div>
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {doctors.map(d => (
                    <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fafbfc",border:`1.5px solid ${d.is_active?"#eef0f3":"rgba(192,57,43,.1)"}`,borderRadius:12,opacity:d.is_active?1:.65 }}>
                      <div style={{ width:38,height:38,borderRadius:"50%",background:d.color,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:800 }}>
                        {d.name.trim().charAt(0)}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{d.name}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:2,display:"flex",gap:8,flexWrap:"wrap" }}>
                          {d.specialty && <span><AppIcon glyph="🏥" /> {d.specialty}</span>}
                          {d.phone && <span><AppIcon glyph="📞" /> {d.phone}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:d.is_active?"rgba(46,125,50,.1)":"rgba(192,57,43,.1)",color:d.is_active?"#2e7d32":"#c0392b",flexShrink:0 }}>
                        {d.is_active ? sm.doctors.active : sm.doctors.inactive}
                      </span>
                      <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                        <button onClick={()=>openEditDoctor(d)} title={sm.doctors.edit}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}><AppIcon glyph="✏️" /></button>
                        <button onClick={()=>handleToggleDoctor(d)} title={sm.doctors.toggleActive}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {d.is_active?"⏸":"▶"}
                        </button>
                        <button onClick={()=>handleRemoveDoctor(d)} title={sm.doctors.remove}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.04)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}><AppIcon glyph="🗑️" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── TAB: SECURITY ── */}
          {activeTab === "security" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {/* ── كلمة السر الحالية ── */}
              <div style={{ background:"linear-gradient(135deg,rgba(8,99,186,.06),rgba(8,99,186,.02))",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:800,color:"#0863ba",marginBottom:8,textTransform:"uppercase",letterSpacing:.4,display:"flex",alignItems:"center",gap:6 }}>
                  <AppIcon glyph="🔑" /> {isAr?"كلمة السر الحالية":"Current Password"}
                </div>
                {clinic.plain_password ? (
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <code style={{ flex:1,fontSize:16,color:"#0863ba",fontFamily:"monospace",letterSpacing:1.5,wordBreak:"break-all",fontWeight:700 }}>
                      {showCurrentPw ? clinic.plain_password : "•".repeat(Math.min(clinic.plain_password.length,12))}
                    </code>
                    <button onClick={() => setShowCurrentPw(v => !v)} title={isAr?"إظهار/إخفاء":"Show/Hide"}
                      style={{ padding:"7px 12px",background:"#fff",color:"#666",border:"1.5px solid #e6edf5",borderRadius:8,cursor:"pointer",fontSize:13 }}>
                      <AppIcon glyph={showCurrentPw ? "🙈" : "👁"} />
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(clinic.plain_password!).catch(()=>{}); setCopiedCurrent(true); setTimeout(()=>setCopiedCurrent(false),1500); }} title={isAr?"نسخ":"Copy"}
                      style={{ padding:"7px 12px",background:copiedCurrent?"rgba(46,125,50,.08)":"#fff",color:copiedCurrent?"#2e7d32":"#0863ba",border:`1.5px solid ${copiedCurrent?"rgba(46,125,50,.2)":"#e6edf5"}`,borderRadius:8,cursor:"pointer",fontSize:13 }}>
                      <AppIcon glyph={copiedCurrent ? "✓" : "📋"} />
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize:12.5,color:"#8a97a6",lineHeight:1.7 }}>
                    {isAr
                      ? "غير محفوظة بعد. اضبط كلمة سر جديدة أدناه لتظهر هنا مستقبلاً."
                      : "Not stored yet. Set a new password below and it will appear here from now on."}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.newPassword}</label>
                <div style={{ display:"flex",gap:8 }}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••••••" style={{ ...inputSt, flex:1, fontFamily:"monospace", letterSpacing: newPass ? 2 : 0 }} />
                  <button onClick={genAndSetPass}
                    style={{ padding:"0 14px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                    <AppIcon glyph="🎲" /> {sm.generatePass}
                  </button>
                </div>
              </div>
              {newPass && (
                <div style={{ display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",borderRadius:10,padding:"12px 14px",border:"1.5px solid #eef0f3" }}>
                  <code style={{ flex:1,fontSize:14,color:"#0863ba",fontFamily:"monospace",letterSpacing:1.5,wordBreak:"break-all" }}>{newPass}</code>
                  <button onClick={copyPass}
                    style={{ padding:"6px 14px",background:copied?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {copied?sm.copiedPass:sm.copyPass}
                  </button>
                </div>
              )}
              <div style={{ background:"rgba(8,99,186,.04)",border:"1.5px solid rgba(8,99,186,.1)",borderRadius:10,padding:"12px 14px" }}>
                <p style={{ fontSize:12,color:"#666",lineHeight:1.7,margin:0 }}>
                  {isAr
                    ? "ستُرسَل كلمة المرور الجديدة فوراً. تأكد من إبلاغ صاحب العيادة بها قبل الإغلاق."
                    : "The new password will be applied immediately. Make sure to inform the clinic owner before closing."}
                </p>
              </div>

              {/* ── العيادة الأونلاين (ميزة مدفوعة) ── */}
              <div style={{ marginTop:6,borderTop:"1.5px solid #eef0f3",paddingTop:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                  <span style={{ fontSize:18 }}><AppIcon glyph="🖥️" /></span>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{isAr ? "العيادة الأونلاين (Telemedicine)" : "Online Clinic (Telemedicine)"}</div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{isAr ? "ميزة مدفوعة — كشف بالفيديو داخل نبض" : "Paid add-on — in-app video consultations"}</div>
                  </div>
                </div>
                <div style={{ background:"rgba(123,45,139,.03)",border:"1.5px solid rgba(123,45,139,.14)",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                    background: form.telemedicine_enabled ? "rgba(46,125,50,.1)" : "rgba(150,150,150,.12)",
                    color: form.telemedicine_enabled ? "#2e7d32" : "#888" }}>
                    {form.telemedicine_enabled ? (isAr ? "مفعّلة" : "Enabled") : (isAr ? "غير مفعّلة" : "Disabled")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, telemedicine_enabled: !p.telemedicine_enabled }))}
                    style={{ padding:"7px 16px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",border:"1.5px solid",transition:"all .2s",
                      background: form.telemedicine_enabled ? "rgba(192,57,43,.06)" : "rgba(123,45,139,.08)",
                      color: form.telemedicine_enabled ? "#c0392b" : "#7b2d8b",
                      borderColor: form.telemedicine_enabled ? "rgba(192,57,43,.2)" : "rgba(123,45,139,.25)" }}>
                    {form.telemedicine_enabled ? (isAr ? "إلغاء التفعيل" : "Disable") : (isAr ? "تفعيل" : "Enable")}
                  </button>
                </div>
              </div>

              {/* ── قفل صفحة المدفوعات ── */}
              {(() => {
                const plansWithPayments = ["pro","enterprise","shared_pro","shared_enterprise"];
                const planSupportsPayments = plansWithPayments.includes(form.plan);
                const pl = sm.paymentsLock;
                return (
                  <div style={{ marginTop:6,borderTop:"1.5px solid #eef0f3",paddingTop:16 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <span style={{ fontSize:18 }}><AppIcon glyph="🔐" /></span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{pl.sectionTitle}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{pl.sectionDesc}</div>
                      </div>
                    </div>

                    {!planSupportsPayments ? (
                      <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.05)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontSize:12,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>
                        <AppIcon glyph="🔒" /> {pl.notAvailable}
                      </div>
                    ) : (
                      <div style={{ background:"rgba(8,99,186,.03)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
                        {/* Toggle */}
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                              background: form.payments_lock_enabled ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.08)",
                              color: form.payments_lock_enabled ? "#2e7d32" : "#c0392b" }}>
                              {form.payments_lock_enabled ? pl.enabledBadge : pl.disabledBadge}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, payments_lock_enabled: !p.payments_lock_enabled }))}
                            style={{ padding:"7px 16px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",border:"1.5px solid",transition:"all .2s",
                              background: form.payments_lock_enabled ? "rgba(192,57,43,.06)" : "rgba(46,125,50,.08)",
                              color: form.payments_lock_enabled ? "#c0392b" : "#2e7d32",
                              borderColor: form.payments_lock_enabled ? "rgba(192,57,43,.2)" : "rgba(46,125,50,.2)" }}>
                            {form.payments_lock_enabled ? pl.disable : pl.enable}
                          </button>
                        </div>

                        {/* Password input — يظهر فقط عند تفعيل القفل */}
                        {form.payments_lock_enabled && (
                          <div>
                            <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                              {pl.passwordLabel}
                            </label>
                            <div style={{ display:"flex",gap:8 }}>
                              <input
                                value={form.payments_lock_password}
                                onChange={e => setForm(p => ({ ...p, payments_lock_password: e.target.value }))}
                                placeholder={pl.passwordPh}
                                style={{ ...inputSt, flex:1 }}
                                onFocus={e => e.target.style.borderColor="#0863ba"}
                                onBlur={e => e.target.style.borderColor="#e8eaed"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                                  const p = Array.from({length:10}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
                                  setForm(prev => ({ ...prev, payments_lock_password: p }));
                                }}
                                style={{ padding:"0 12px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                                <AppIcon glyph="🎲" /> {isAr?"توليد":"Generate"}
                              </button>
                            </div>
                            <p style={{ fontSize:11,color:"#aaa",marginTop:5,lineHeight:1.5 }}>
                              <AppIcon glyph="💡" /> {pl.saveNote}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── دخول مقيّد للأطباء ── */}
              {(() => {
                const ra = sm.restrictedAccess;
                const restrictedLink = typeof window !== "undefined"
                  ? `${window.location.origin}/restricted-access/${clinic.user_id}`
                  : `/restricted-access/${clinic.user_id}`;
                const copyRestrictedLink = async () => {
                  await navigator.clipboard.writeText(restrictedLink).catch(()=>{});
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                };
                const genPin = () => {
                  const pin = String(Math.floor(1000 + Math.random() * 9000));
                  setForm(p => ({ ...p, restricted_access_pin: pin }));
                };
                // الرابط يظهر فقط إذا كان الحفظ الفعلي في DB يطابق الحالة الحالية
                const linkReady = savedRA.enabled === form.restricted_access_enabled &&
                  savedRA.pin === form.restricted_access_pin &&
                  savedRA.enabled;
                return (
                  <div style={{ marginTop:6,borderTop:"1.5px solid #eef0f3",paddingTop:16 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <span style={{ fontSize:18 }}><AppIcon glyph="🔗" /></span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{ra.sectionTitle}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{ra.sectionDesc}</div>
                      </div>
                    </div>

                    {!isSharedPlan ? (
                      <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.05)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontSize:12,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>
                        <AppIcon glyph="🔒" /> {ra.onlyShared}
                      </div>
                    ) : (
                      <div style={{ background:"rgba(14,124,106,.03)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>

                        {/* Toggle */}
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                            background: form.restricted_access_enabled ? "rgba(14,124,106,.1)" : "rgba(192,57,43,.08)",
                            color: form.restricted_access_enabled ? "#0e7c6a" : "#c0392b" }}>
                            {form.restricted_access_enabled ? ra.enabledBadge : ra.disabledBadge}
                          </span>
                          <button type="button"
                            onClick={() => setForm(p => ({ ...p, restricted_access_enabled: !p.restricted_access_enabled }))}
                            style={{ padding:"7px 16px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",border:"1.5px solid",transition:"all .2s",
                              background: form.restricted_access_enabled ? "rgba(192,57,43,.06)" : "rgba(14,124,106,.08)",
                              color: form.restricted_access_enabled ? "#c0392b" : "#0e7c6a",
                              borderColor: form.restricted_access_enabled ? "rgba(192,57,43,.2)" : "rgba(14,124,106,.25)" }}>
                            {form.restricted_access_enabled ? ra.disable : ra.enable}
                          </button>
                        </div>

                        {form.restricted_access_enabled && (
                          <>
                            {/* PIN — يظهر كنجوم مع زر إظهار/إخفاء */}
                            <div>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                                {ra.pinLabel}
                              </label>
                              <div style={{ display:"flex",gap:8 }}>
                                <div style={{ flex:1,position:"relative" as const,display:"flex",alignItems:"center" }}>
                                  <input
                                    type={showPin ? "text" : "password"}
                                    value={form.restricted_access_pin}
                                    onChange={e => setForm(p => ({ ...p, restricted_access_pin: e.target.value.replace(/\D/g,"").slice(0,8) }))}
                                    placeholder={ra.pinPh}
                                    inputMode="numeric"
                                    autoComplete="new-password"
                                    name="restricted_access_pin"
                                    maxLength={8}
                                    style={{ ...inputSt, flex:1, fontFamily:"monospace", letterSpacing: showPin ? 6 : 4, fontSize:18, fontWeight:700, paddingLeft:40 }}
                                    onFocus={e => e.target.style.borderColor="#0e7c6a"}
                                    onBlur={e => e.target.style.borderColor="#e8eaed"}
                                  />
                                  {/* زر إظهار/إخفاء */}
                                  <button type="button" onClick={() => setShowPin(v => !v)}
                                    style={{ position:"absolute" as const,left:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0,color:"#aaa",lineHeight:1 }}
                                    title={showPin ? "إخفاء" : "إظهار"}><AppIcon glyph={showPin ? "🙈" : "👁️"} /></button>
                                </div>
                                <button type="button" onClick={genPin}
                                  style={{ padding:"0 14px",background:"rgba(14,124,106,.06)",color:"#0e7c6a",border:"1.5px solid rgba(14,124,106,.2)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" as const }}>
                                  <AppIcon glyph="🎲" /> {ra.generate}
                                </button>
                              </div>
                              <p style={{ fontSize:11,color:"#aaa",marginTop:5,lineHeight:1.5 }}><AppIcon glyph="⚠️" /> {ra.pinNote}</p>
                            </div>

                            {/* رابط الدخول — يظهر فقط بعد الحفظ */}
                            <div>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                                {ra.linkLabel}
                              </label>
                              {linkReady ? (
                                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                                  <code style={{ flex:1,background:"#f7f9fc",padding:"10px 12px",borderRadius:10,fontSize:11,color:"#0e7c6a",fontFamily:"monospace",wordBreak:"break-all" as const,border:"1.5px solid rgba(14,124,106,.2)",lineHeight:1.5 }}>
                                    {restrictedLink}
                                  </code>
                                  <button type="button" onClick={copyRestrictedLink}
                                    style={{ padding:"10px 14px",background:copiedLink?"rgba(46,125,50,.08)":"rgba(14,124,106,.06)",color:copiedLink?"#2e7d32":"#0e7c6a",border:`1.5px solid ${copiedLink?"rgba(46,125,50,.2)":"rgba(14,124,106,.2)"}`,borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" as const,transition:"all .2s" }}>
                                    {copiedLink ? ra.copiedLink : ra.copyLink}
                                  </button>
                                </div>
                              ) : (
                                <div style={{ padding:"10px 14px",background:"rgba(230,126,34,.06)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:10,fontSize:12,color:"#e67e22",display:"flex",alignItems:"center",gap:8 }}>
                                  <AppIcon glyph="💾" /> {isAr ? "احفظ الإعدادات أولاً لتتمكن من نسخ الرابط" : "Save settings first to copy the link"}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"20px 26px",display:"flex",gap:10,marginTop:8,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}>
            {saving?sm.saving:sm.save}
          </button>
          <button onClick={onClose}
            style={{ padding:"12px 20px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
            {sm.cancel}
          </button>
        </div>

        {/* Delete confirmation overlay */}
        {confirmDelete && (
          <div style={{ position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.9)",backdropFilter:"blur(4px)",borderRadius:24 }}>
            <div style={{ textAlign:"center",padding:"40px 32px",maxWidth:340 }}>
              <div style={{ fontSize:48,marginBottom:16 }}><AppIcon glyph="🗑️" /></div>
              <h3 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:10 }}>{sm.deleteConfirmTitle}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6,marginBottom:24 }}>
                {sm.deleteConfirmMsg} <strong style={{ color:"#353535" }}>{clinic.name}</strong>؟<br/>
                <span style={{ color:"#c0392b",fontSize:12 }}>{sm.deleteConfirmWarning}</span>
              </p>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={handleDelete} disabled={actionLoading==="delete"}
                  style={{ flex:1,padding:"12px",background:actionLoading==="delete"?"#e57373":"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:actionLoading==="delete"?"not-allowed":"pointer" }}>
                  {actionLoading==="delete"?(isAr?"جاري الحذف...":"Deleting..."):sm.deleteConfirm}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={actionLoading==="delete"}
                  style={{ flex:1,padding:"12px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
                  {sm.deleteCancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default SubscriptionModal;
