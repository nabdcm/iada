"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// TypeScript Types
// ============================================================

type Lang = "ar" | "en";

interface ClinicData {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: "basic" | "pro" | "enterprise";
  expiry: string;
  status: "active" | "inactive" | "expired";
  user_id?: string;
}

// ============================================================
// NABD - نبض | Admin Panel
// ============================================================

const T = {
  ar: {
    appName: "نبض", adminBadge: "لوحة المدير",
    nav: { clinics:"العيادات", users:"المستخدمون", subscriptions:"الاشتراكات", settings:"الإعدادات" },
    stats: {
      totalClinics:"إجمالي العيادات", activeClinics:"عيادات نشطة",
      totalUsers:"المستخدمون", monthRevenue:"إيرادات الشهر",
      activeNow:"نشطة الآن", expiringSoon:"تنتهي قريباً",
    },
    clinics: {
      title:"إدارة العيادات", addClinic:"إضافة عيادة",
      search:"ابحث باسم العيادة...",
      table:{ name:"العيادة", owner:"المالك", email:"البريد الإلكتروني", status:"الحالة", plan:"الخطة", expiry:"انتهاء الاشتراك", actions:"الإجراءات" },
      statuses:{ active:"نشط", inactive:"موقوف", expired:"منتهي" },
      plans:{ basic:"أساسي", pro:"احترافي", enterprise:"مؤسسي" },
      actions:{ edit:"تعديل", suspend:"تعليق", activate:"تفعيل", resetPass:"إعادة كلمة المرور", delete:"حذف", viewDetails:"التفاصيل" },
    },
    modal: {
      addTitle:"إضافة عيادة جديدة",
      editTitle:"تعديل بيانات العيادة",
      clinicName:"اسم العيادة *", clinicNamePh:"مثال: عيادة الأمل",
      ownerName:"اسم الطبيب / المالك *", ownerPh:"الدكتور ...",
      email:"البريد الإلكتروني *", emailPh:"clinic@example.com",
      phone:"رقم الهاتف", phonePh:"05xxxxxxxx",
      plan:"خطة الاشتراك *",
      expiry:"تاريخ انتهاء الاشتراك *",
      generateCredentials:"توليد بيانات الدخول",
      username:"البريد الإلكتروني", password:"كلمة المرور",
      copyBtn:"نسخ", copiedBtn:"✓ تم النسخ",
      save:"حفظ العيادة", update:"تحديث", cancel:"إلغاء",
      required:"الاسم والبريد والخطة مطلوبة",
      credNote:"احفظ بيانات الدخول قبل الإغلاق — لن تظهر مجدداً",
      password_label:"كلمة المرور",
      bookLink:"رابط الحجز",
      creating:"جاري الإنشاء...",
    },
    passModal: {
      title:"إعادة تعيين كلمة المرور",
      newPass:"كلمة المرور الجديدة",
      generate:"توليد تلقائي",
      save:"حفظ كلمة المرور",
      cancel:"إلغاء",
      saving:"جاري الحفظ...",
    },
    deleteModal: { title:"تأكيد الحذف", msg:"هل تريد حذف عيادة", warning:"سيتم حذف جميع بيانات هذه العيادة نهائياً.", confirm:"نعم، احذف", cancel:"إلغاء" },
    noResults:"لا توجد نتائج",
    signOut:"تسجيل خروج المدير",
    systemInfo:"معلومات النظام",
    version:"الإصدار",
    lastBackup:"آخر نسخة احتياطية",
    uptime:"وقت التشغيل",
    filterAll:"الكل", filterActive:"نشط", filterInactive:"موقوف",
    loading:"جاري التحميل...",
    comingSoon:"قريباً",
    subModal: {
      title:"تعديل الاشتراك",
      tabInfo:"البيانات",
      tabSub:"الاشتراك",
      tabSecurity:"الأمان",
      username:"البريد الإلكتروني",
      usernamePh:"clinic@example.com",
      ownerName:"اسم المالك",
      ownerPh:"الدكتور ...",
      phone:"رقم الهاتف",
      phonePh:"05xxxxxxxx",
      plan:"الخطة",
      expiry:"تاريخ الانتهاء",
      status:"الحالة",
      newPassword:"كلمة المرور الجديدة",
      generatePass:"توليد تلقائي",
      copyPass:"نسخ",
      copiedPass:"✓ تم",
      freezeTitle:"تجميد الاشتراك",
      freezeDesc:"سيتم إيقاف وصول العيادة مؤقتاً مع الحفاظ على البيانات.",
      freeze:"تجميد",
      unfreeze:"رفع التجميد",
      cancelTitle:"إلغاء الاشتراك",
      cancelDesc:"سيتم إنهاء الاشتراك. يمكن إعادة تفعيله لاحقاً.",
      cancelSub:"إلغاء الاشتراك",
      deleteTitle:"حذف العيادة",
      deleteDesc:"سيتم حذف جميع البيانات نهائياً ولا يمكن التراجع.",
      delete:"حذف نهائي",
      save:"حفظ التغييرات",
      saving:"جاري الحفظ...",
      cancel:"إلغاء",
      changePlan:"تغيير الخطة إلى",
      plans:{ basic:"أساسي", pro:"احترافي", enterprise:"مؤسسي" },
      planDesc:{ basic:"للعيادات الصغيرة", pro:"للعيادات المتوسطة", enterprise:"للمستشفيات والمجمعات" },
      deleteConfirmTitle:"تأكيد الحذف النهائي",
      deleteConfirmMsg:"هل أنت متأكد من حذف عيادة",
      deleteConfirmWarning:"سيتم حذف جميع البيانات نهائياً ولا يمكن التراجع.",
      deleteConfirm:"نعم، احذف نهائياً",
      deleteCancel:"لا، تراجع",
    },
  },
  en: {
    appName: "NABD", adminBadge: "Admin Panel",
    nav: { clinics:"Clinics", users:"Users", subscriptions:"Subscriptions", settings:"Settings" },
    stats: {
      totalClinics:"Total Clinics", activeClinics:"Active Clinics",
      totalUsers:"Total Users", monthRevenue:"Monthly Revenue",
      activeNow:"Active Now", expiringSoon:"Expiring Soon",
    },
    clinics: {
      title:"Clinic Management", addClinic:"Add Clinic",
      search:"Search by clinic name...",
      table:{ name:"Clinic", owner:"Owner", email:"Email", status:"Status", plan:"Plan", expiry:"Expiry", actions:"Actions" },
      statuses:{ active:"Active", inactive:"Suspended", expired:"Expired" },
      plans:{ basic:"Basic", pro:"Pro", enterprise:"Enterprise" },
      actions:{ edit:"Edit", suspend:"Suspend", activate:"Activate", resetPass:"Reset Password", delete:"Delete", viewDetails:"Details" },
    },
    modal: {
      addTitle:"Add New Clinic",
      editTitle:"Edit Clinic",
      clinicName:"Clinic Name *", clinicNamePh:"e.g. Al-Amal Clinic",
      ownerName:"Doctor / Owner Name *", ownerPh:"Dr. ...",
      email:"Email *", emailPh:"clinic@example.com",
      phone:"Phone", phonePh:"05xxxxxxxx",
      plan:"Subscription Plan *",
      expiry:"Subscription Expiry *",
      generateCredentials:"Generate Login Credentials",
      username:"Email", password:"Password",
      copyBtn:"Copy", copiedBtn:"✓ Copied",
      save:"Save Clinic", update:"Update", cancel:"Cancel",
      required:"Name, email and plan are required",
      credNote:"Save these credentials before closing — they won't be shown again",
      password_label:"Password",
      bookLink:"Booking Link",
      creating:"Creating...",
    },
    passModal: {
      title:"Reset Password",
      newPass:"New Password",
      generate:"Auto Generate",
      save:"Save Password",
      cancel:"Cancel",
      saving:"Saving...",
    },
    deleteModal: { title:"Confirm Delete", msg:"Delete clinic", warning:"All data for this clinic will be permanently deleted.", confirm:"Yes, Delete", cancel:"Cancel" },
    noResults:"No results found",
    signOut:"Admin Sign Out",
    systemInfo:"System Info",
    version:"Version",
    lastBackup:"Last Backup",
    uptime:"Uptime",
    filterAll:"All", filterActive:"Active", filterInactive:"Suspended",
    loading:"Loading...",
    comingSoon:"Coming Soon",
    subModal: {
      title:"Edit Subscription",
      tabInfo:"Info",
      tabSub:"Subscription",
      tabSecurity:"Security",
      username:"Email",
      usernamePh:"clinic@example.com",
      ownerName:"Owner Name",
      ownerPh:"Dr. ...",
      phone:"Phone",
      phonePh:"05xxxxxxxx",
      plan:"Plan",
      expiry:"Expiry Date",
      status:"Status",
      newPassword:"New Password",
      generatePass:"Auto Generate",
      copyPass:"Copy",
      copiedPass:"✓ Copied",
      freezeTitle:"Freeze Subscription",
      freezeDesc:"Temporarily suspend clinic access while keeping data intact.",
      freeze:"Freeze",
      unfreeze:"Unfreeze",
      cancelTitle:"Cancel Subscription",
      cancelDesc:"End the subscription. Can be reactivated later.",
      cancelSub:"Cancel Subscription",
      deleteTitle:"Delete Clinic",
      deleteDesc:"Permanently delete all data. This cannot be undone.",
      delete:"Permanent Delete",
      save:"Save Changes",
      saving:"Saving...",
      cancel:"Cancel",
      changePlan:"Change Plan To",
      plans:{ basic:"Basic", pro:"Pro", enterprise:"Enterprise" },
      planDesc:{ basic:"For small clinics", pro:"For medium clinics", enterprise:"For hospitals & complexes" },
      deleteConfirmTitle:"Confirm Permanent Delete",
      deleteConfirmMsg:"Are you sure you want to delete clinic",
      deleteConfirmWarning:"All data will be permanently deleted and cannot be recovered.",
      deleteConfirm:"Yes, Delete Permanently",
      deleteCancel:"No, Cancel",
    },
  },
};

const PLAN_COLORS = { basic:"#0863ba", pro:"#7b2d8b", enterprise:"#e67e22" };
const STATUS_COLORS = {
  active:   { bg:"rgba(46,125,50,.1)",   color:"#2e7d32" },
  inactive: { bg:"rgba(230,126,34,.1)",  color:"#e67e22" },
  expired:  { bg:"rgba(192,57,43,.1)",  color:"#c0392b" },
};

const genPass = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};

// ─── Field Wrapper — خارج كل المكونات لتجنب فقدان الـ focus ──
// ⚠️ تعريف هذا المكون هنا خارج ClinicModal هو المفتاح لحل مشكلة الـ focus
interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  half?: boolean;
}
const Field = ({ label, children, half }: FieldProps) => (
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

// ─── Clinic Modal ──────────────────────────────────────────
interface ModalProps {
  lang: Lang;
  clinic?: ClinicData | null;
  onSave: () => void;  // نستدعي فقط reload بعد الحفظ
  onClose: () => void;
}

const ClinicModal = ({ lang, clinic, onSave, onClose }: ModalProps) => {
  const tr   = T[lang];
  const isAr = lang === "ar";
  const isEdit = !!clinic?.id;

  const [form, setForm] = useState({
    name:   clinic?.name   || "",
    owner:  clinic?.owner  || "",
    email:  clinic?.email  || "",
    phone:  clinic?.phone  || "",
    plan:   (clinic?.plan  || "basic") as "basic" | "pro" | "enterprise",
    expiry: clinic?.expiry || "",
    status: (clinic?.status || "active") as "active" | "inactive" | "expired",
  });

  const [creds,    setCreds]    = useState<{ password: string } | null>(null);
  const [copied,   setCopied]   = useState({ e: false, p: false });
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

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

        const res  = await fetch("/api/create-clinic", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...form, password: creds.password }),
        });
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || (isAr ? "حدث خطأ" : "An error occurred"));
          setSaving(false);
          return;
        }

        setSavedUserId(json.userId);
        // لا نغلق — نعرض الرابط والبيانات النهائية
      } else {
        // ─── تحديث عيادة موجودة ──────────────────────────────
        const res  = await fetch("/api/update-clinic", {
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
            <div style={{ width:40,height:40,background:"rgba(8,99,186,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🏥</div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>
              {isEdit ? tr.modal.editTitle : tr.modal.addTitle}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {error && (
            <div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ─── بعد الحفظ الناجح: عرض الرابط والبيانات ─── */}
          {savedUserId ? (
            <div>
              <div style={{ textAlign:"center",marginBottom:24 }}>
                <div style={{ fontSize:48,marginBottom:8 }}>🎉</div>
                <h3 style={{ fontSize:16,fontWeight:800,color:"#2e7d32" }}>
                  {isAr ? "تم إنشاء العيادة بنجاح!" : "Clinic Created Successfully!"}
                </h3>
              </div>

              {/* بيانات الدخول */}
              <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px",marginBottom:16,border:"1.5px solid #eef0f3" }}>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                  ⚠️ {tr.modal.credNote}
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

              {/* رابط الحجز */}
              <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>
                  🔗 {tr.modal.bookLink}
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <span style={{ flex:1,fontSize:12,color:"#888",direction:"ltr",wordBreak:"break-all" }}>{bookingUrl}</span>
                  <button onClick={() => { navigator.clipboard.writeText(bookingUrl); }}
                    style={{ flexShrink:0,padding:"7px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                    {isAr ? "نسخ" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── فورم الإضافة / التعديل ─── */
            <>
              <Field label={tr.modal.clinicName}>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={tr.modal.clinicNamePh}
                  style={inputSt}
                />
              </Field>

              <div style={{ display:"flex", gap:12 }}>
                <Field label={tr.modal.ownerName} half>
                  <input
                    value={form.owner}
                    onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder={tr.modal.ownerPh}
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

              <Field label={tr.modal.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={tr.modal.emailPh}
                  style={inputSt}
                />
              </Field>

              <div style={{ display:"flex", gap:12 }}>
                <Field label={tr.modal.plan} half>
                  <select
                    value={form.plan}
                    onChange={e => setForm(prev => ({ ...prev, plan: e.target.value as "basic"|"pro"|"enterprise" }))}
                    style={{ ...inputSt, cursor:"pointer" }}
                  >
                    <option value="basic">{tr.clinics.plans.basic}</option>
                    <option value="pro">{tr.clinics.plans.pro}</option>
                    <option value="enterprise">{tr.clinics.plans.enterprise}</option>
                  </select>
                </Field>
                <Field label={tr.modal.expiry} half>
                  <input
                    type="date"
                    value={form.expiry}
                    onChange={e => setForm(prev => ({ ...prev, expiry: e.target.value }))}
                    style={inputSt}
                  />
                </Field>
              </div>

              {/* توليد بيانات الدخول — فقط عند الإضافة */}
              {!isEdit && (
                <div style={{ borderTop:"1.5px dashed #eee", paddingTop:16, marginTop:4 }}>
                  <button
                    type="button"
                    onClick={handleGenCreds}
                    style={{ width:"100%",padding:"11px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px dashed rgba(8,99,186,.3)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
                  >
                    🔑 {tr.modal.generateCredentials}
                  </button>

                  {creds && (
                    <div style={{ marginTop:14,background:"#f7f9fc",borderRadius:12,padding:"16px",border:"1.5px solid #eef0f3",animation:"modalIn .2s ease" }}>
                      <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                        ⚠️ {tr.modal.credNote}
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

// ─── Subscription Modal ────────────────────────────────────
interface SubModalProps {
  lang: Lang;
  clinic: ClinicData;
  onSave: () => void;
  onClose: () => void;
}

const SubscriptionModal = ({ lang, clinic, onSave, onClose }: SubModalProps) => {
  const tr   = T[lang];
  const sm   = tr.subModal;
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState<"info"|"sub"|"security">("info");
  const [form, setForm] = useState({
    email:  clinic.email  || "",
    owner:  clinic.owner  || "",
    phone:  clinic.phone  || "",
    plan:   clinic.plan   as "basic"|"pro"|"enterprise",
    expiry: clinic.expiry || "",
    status: clinic.status as "active"|"inactive"|"expired",
  });
  const [newPass,       setNewPass]       = useState("");
  const [copied,        setCopied]        = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

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
    ...overrides,
  });

  const callAPI = async (body: Record<string,unknown>): Promise<{ok:boolean; error?:string}> => {
    try {
      const res  = await fetch("/api/update-clinic", {
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
    setSaving(true); setError(""); setSuccessMsg("");
    const body = buildBody();
    if (newPass.trim()) body.newPassword = newPass.trim();
    const result = await callAPI(body);
    setSaving(false);
    if (!result.ok) { setError(result.error!); return; }
    setSuccessMsg(isAr?"✓ تم الحفظ بنجاح":"✓ Saved successfully");
    setNewPass("");
    onSave(); // تحديث القائمة في الخلفية
    setTimeout(() => { setSuccessMsg(""); onClose(); }, 800);
  };

  // ── تجميد / رفع تجميد ──────────────────────────────────
  const handleFreeze = async () => {
    setActionLoading("freeze"); setError("");
    const newStatus = form.status === "inactive" ? "active" : "inactive";
    const result = await callAPI(buildBody({ status: newStatus }));
    setActionLoading("");
    if (!result.ok) { setError(result.error!); return; }
    setForm(p => ({ ...p, status: newStatus }));
    onSave();
  };

  // ── إلغاء الاشتراك (تعيين الحالة expired + تاريخ اليوم) ─
  const handleCancelSub = async () => {
    setActionLoading("cancel"); setError("");
    const today = new Date().toISOString().split("T")[0];
    const result = await callAPI(buildBody({ status: "expired", expiry: today }));
    setActionLoading("");
    if (!result.ok) { setError(result.error!); return; }
    setForm(p => ({ ...p, status: "expired", expiry: today }));
    onSave();
  };

  // ── حذف نهائي: clinics + clinic_profiles + auth user ─────
  const handleDelete = async () => {
    setActionLoading("delete"); setError("");
    try {
      // 1. حذف من جدول clinics
      const { error: e1 } = await supabase
        .from("clinics")
        .delete()
        .eq("user_id", clinic.user_id!);
      if (e1) throw new Error(e1.message);

      // 2. حذف من جدول clinic_profiles
      await supabase
        .from("clinic_profiles")
        .delete()
        .eq("id", clinic.user_id!);

      // 3. حذف مستخدم Auth عبر API
      await fetch("/api/update-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id, delete: true }),
      });

      onSave();   // إعادة تحميل القائمة
      onClose();  // إغلاق المودال — الصف اختفى نهائياً
    } catch (err: unknown) {
      setActionLoading("");
      setError(err instanceof Error ? err.message : (isAr?"حدث خطأ أثناء الحذف":"Error during deletion"));
      setConfirmDelete(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"10px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:13, color:"#353535", background:"#fafbfc",
    outline:"none", direction: isAr?"rtl":"ltr",
  };

  const PLAN_INFO: { key:"basic"|"pro"|"enterprise"; color:string }[] = [
    { key:"basic",      color:"#0863ba" },
    { key:"pro",        color:"#7b2d8b" },
    { key:"enterprise", color:"#e67e22" },
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
              <div style={{ width:44,height:44,background:"rgba(8,99,186,.08)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>💳</div>
              <div>
                <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",lineHeight:1.2 }}>{sm.title}</h2>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{clinic.name}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:16,color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex",gap:4,background:"#f7f9fc",borderRadius:12,padding:4 }}>
            <button style={tabStyle("info")}    onClick={() => setActiveTab("info")}>{sm.tabInfo}</button>
            <button style={tabStyle("sub")}     onClick={() => setActiveTab("sub")}>{sm.tabSub}</button>
            <button style={tabStyle("security")} onClick={() => setActiveTab("security")}>{sm.tabSecurity}</button>
          </div>
          <div style={{ height:1,background:"#eef0f3",marginTop:16 }} />
        </div>

        <div style={{ padding:"20px 26px 0" }}>
          {error && <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
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
            </div>
          )}

          {/* ── TAB: SUBSCRIPTION ── */}
          {activeTab === "sub" && (
            <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

              {/* Plan selector */}
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:10,textTransform:"uppercase",letterSpacing:.4 }}>{sm.changePlan}</label>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {PLAN_INFO.map(p => {
                    const isSelected = form.plan === p.key;
                    const isCurrent  = clinic.plan === p.key;
                    return (
                      <button key={p.key} onClick={() => setForm(prev=>({...prev,plan:p.key}))}
                        style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 16px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:"start",transition:"all .18s",fontFamily:"Rubik,sans-serif" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>{sm.plans[p.key]}</div>
                          <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{sm.planDesc[p.key]}</div>
                        </div>
                        {isCurrent && <span style={{ fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,background:`${p.color}15`,color:p.color }}>{isAr?"الحالية":"Current"}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>🚫 {sm.cancelTitle}</div>
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
                    <div style={{ fontSize:13,fontWeight:600,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>🗑️ {sm.deleteTitle}</div>
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

          {/* ── TAB: SECURITY ── */}
          {activeTab === "security" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.newPassword}</label>
                <div style={{ display:"flex",gap:8 }}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••••••" style={{ ...inputSt, flex:1, fontFamily:"monospace", letterSpacing: newPass ? 2 : 0 }} />
                  <button onClick={genAndSetPass}
                    style={{ padding:"0 14px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                    🎲 {sm.generatePass}
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
                    ? "⚠️ ستُرسَل كلمة المرور الجديدة فوراً. تأكد من إبلاغ صاحب العيادة بها قبل الإغلاق."
                    : "⚠️ The new password will be applied immediately. Make sure to inform the clinic owner before closing."}
                </p>
              </div>
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
              <div style={{ fontSize:48,marginBottom:16 }}>🗑️</div>
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

// ─── Reset Password Modal ──────────────────────────────────
interface ResetPassModalProps {
  lang: Lang;
  clinic: ClinicData | null;
  onClose: () => void;
}

const ResetPassModal = ({ lang, clinic, onClose }: ResetPassModalProps) => {
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
      const res  = await fetch("/api/update-clinic", {
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
          <div style={{ fontSize:36,marginBottom:12 }}>🔑</div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.passModal.title}</h3>
          <p style={{ fontSize:13,color:"#888",marginTop:6 }}>{clinic?.name}</p>
        </div>
        {error && <div style={{ fontSize:13,color:"#c0392b",marginBottom:12,textAlign:"center" }}>⚠️ {error}</div>}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>
            {tr.passModal.newPass}
          </label>
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ flex:1,background:"#f7f9fc",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"1.5px solid #eef0f3" }}>
              <code style={{ fontSize:14,color:"#0863ba",fontFamily:"monospace",letterSpacing:1 }}>{pass}</code>
            </div>
            <button onClick={copy} style={{ padding:"0 16px",background:copied?"rgba(46,125,50,.1)":"rgba(8,99,186,.08)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.2)"}`,borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600 }}>
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>
        <button onClick={() => setPass(genPass())} style={{ width:"100%",marginBottom:12,padding:"10px",background:"#f7f9fc",color:"#666",border:"1.5px dashed #ddd",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
          🔄 {tr.passModal.generate}
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
// ─── بيانات دخول المدير — مستقلة تماماً عن Supabase ────────
// ============================================================
const ADMIN_USERNAME = "nabd";
const ADMIN_PASSWORD = "nabd.111";
const SESSION_KEY    = "__nabd_admin_auth__";

// ─── شاشة تسجيل دخول المدير ──────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // تأخير بسيط لمنع brute-force وإعطاء تجربة أفضل
    setTimeout(() => {
      if (
        username.trim().toLowerCase() === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
      ) {
        // حفظ الجلسة في sessionStorage (تنتهي عند إغلاق التبويب)
        sessionStorage.setItem(SESSION_KEY, "1");
        onSuccess();
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        setLoading(false);
        setPassword("");
      }
    }, 600);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f0f4ff}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        .login-card{animation:fadeUp .5s cubic-bezier(.4,0,.2,1) both}
        .login-input{
          width:100%;padding:12px 16px;
          border:1.5px solid #e8eaed;border-radius:12px;
          font-family:'Rubik',sans-serif;font-size:14px;
          color:#353535;background:#fff;outline:none;
          transition:border .2s,box-shadow .2s;
        }
        .login-input:focus{border-color:#0863ba;box-shadow:0 0 0 3px rgba(8,99,186,.08)}
        .login-btn{
          width:100%;padding:13px;background:#0863ba;color:#fff;
          border:none;border-radius:12px;font-family:'Rubik',sans-serif;
          font-size:15px;font-weight:700;cursor:pointer;
          transition:all .2s;box-shadow:0 4px 16px rgba(8,99,186,.3);
        }
        .login-btn:hover:not(:disabled){background:#0752a0;box-shadow:0 6px 20px rgba(8,99,186,.4);transform:translateY(-1px)}
        .login-btn:active:not(:disabled){transform:translateY(0)}
        .login-btn:disabled{background:#93b8dc;cursor:not-allowed;box-shadow:none}
        .error-box{animation:shake .4s ease}
      `}</style>

      <div style={{
        minHeight:"100vh", background:"linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 50%,#f5f0ff 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Rubik',sans-serif", padding:"20px",
      }}>
        {/* خلفية زخرفية */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"rgba(8,99,186,.06)",filter:"blur(60px)" }}/>
          <div style={{ position:"absolute",bottom:"-10%",left:"-5%",width:500,height:500,borderRadius:"50%",background:"rgba(123,45,139,.04)",filter:"blur(80px)" }}/>
        </div>

        <div className="login-card" style={{
          background:"#fff", borderRadius:24, width:"100%", maxWidth:400,
          padding:"40px 36px", boxShadow:"0 24px 80px rgba(8,99,186,.12)",
          border:"1.5px solid rgba(8,99,186,.08)", position:"relative",
        }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{
              width:64, height:64, background:"linear-gradient(135deg,#0863ba,#1a7ad4)",
              borderRadius:18, display:"inline-flex", alignItems:"center",
              justifyContent:"center", fontSize:28, marginBottom:14,
              boxShadow:"0 8px 24px rgba(8,99,186,.3)",
            }}>💗</div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#353535", marginBottom:4 }}>نبض</h1>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background:"rgba(8,99,186,.06)", border:"1.5px solid rgba(8,99,186,.12)",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#0863ba", letterSpacing:.5 }}>ADMIN ACCESS</span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* خطأ */}
            {error && (
              <div className="error-box" style={{
                background:"rgba(192,57,43,.06)", border:"1.5px solid rgba(192,57,43,.2)",
                borderRadius:10, padding:"10px 14px", fontSize:13, color:"#c0392b",
                textAlign:"center", fontWeight:500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* اسم المستخدم */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                اسم المستخدم
              </label>
              <input
                className="login-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                autoFocus
                required
                style={{ direction:"ltr" }}
              />
            </div>

            {/* كلمة المرور */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                كلمة المرور
              </label>
              <div style={{ position:"relative" }}>
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                  style={{ direction:"ltr", paddingRight:44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16,
                    color:"#aaa", display:"flex", alignItems:"center",
                  }}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* زر الدخول */}
            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop:6 }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/>
                  جاري التحقق...
                </span>
              ) : "دخول لوحة المدير →"}
            </button>
          </form>

          <p style={{ textAlign:"center", fontSize:11, color:"#ccc", marginTop:24 }}>
            هذه الصفحة مخصصة للمدير فقط
          </p>
        </div>
      </div>
    </>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AdminPage() {
  // ── التحقق من جلسة المدير — يجب أن يكون أول شيء ──────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setIsAuthenticated(ok);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // ── كل الـ state الخاص بصفحة الأدمن (دائماً في نفس الترتيب) ─
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = T[lang];

  const [activeTab,    setActiveTab]    = useState("clinics");
  const [clinics,      setClinics]      = useState<ClinicData[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("all");
  const [addModal,     setAddModal]     = useState(false);
  const [editClinic,   setEditClinic]   = useState<ClinicData | null>(null);
  const [deleteClinic, setDeleteClinic] = useState<ClinicData | null>(null);
  const [resetClinic,  setResetClinic]  = useState<ClinicData | null>(null);
  const [subClinic,    setSubClinic]    = useState<ClinicData | null>(null);
  const [openMenuId,   setOpenMenuId]   = useState<number | null>(null);

  useEffect(() => { loadClinics(); }, []);

  const loadClinics = async () => {
    setLoading(true);
    try {
      // نجلب من جدول clinics بدلاً من auth.admin (يحتاج service_role)
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clinicsData: ClinicData[] = (data || []).map((row: Record<string, unknown>, index: number) => ({
        id:      (row.id as number) || index + 1,
        user_id: row.user_id as string,
        name:    (row.name as string)   || `عيادة ${index + 1}`,
        owner:   (row.owner as string)  || "—",
        email:   (row.email as string)  || "",
        phone:   (row.phone as string)  || "",
        plan:    (row.plan as "basic"|"pro"|"enterprise") || "basic",
        expiry:  (row.expiry as string) || "",
        status:  (row.status as "active"|"inactive"|"expired") || "active",
      }));

      setClinics(clinicsData);
    } catch (err) {
      console.error("Error loading clinics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const filtered = useMemo(() => clinics.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active"   && c.status !== "active")   return false;
    if (filter === "inactive" && c.status !== "inactive") return false;
    return true;
  }), [clinics, search, filter]);

  const stats = useMemo(() => ({
    total:    clinics.length,
    active:   clinics.filter(c => c.status === "active").length,
    users:    clinics.length,
    expiring: clinics.filter(c => {
      const d = new Date(c.expiry);
      const n = new Date();
      return (d.getTime() - n.getTime()) < 30 * 24 * 60 * 60 * 1000 && d > n;
    }).length,
  }), [clinics]);

  const toggleStatus = async (clinic: ClinicData) => {
    if (!clinic.user_id) return;
    const newStatus = clinic.status === "active" ? "inactive" : "active";
    await fetch("/api/update-clinic", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: clinic.user_id, ...clinic, status: newStatus }),
    });
    loadClinics();
  };

  const handleDelete = async () => {
    if (!deleteClinic?.user_id) return;
    // حذف من جدول clinics
    await supabase.from("clinics").delete().eq("user_id", deleteClinic.user_id);
    // حذف من clinic_profiles
    await supabase.from("clinic_profiles").delete().eq("id", deleteClinic.user_id);
    // حذف المستخدم عبر API
    await fetch("/api/update-clinic", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: deleteClinic.user_id, delete: true }),
    });
    setDeleteClinic(null);
    loadClinics();
  };

  const fmtDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year:"numeric", month:"short", day:"numeric" });
  };
  const isExpiringSoon = (d: string) => {
    const diff = new Date(d).getTime() - new Date().getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (d: string) => d && new Date(d) < new Date();

  // ── بوابة المصادقة — بعد كل الـ hooks ─────────────────────
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc" }}>
        <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-anim{animation:fadeUp .4s ease both}
        .admin-row{border-bottom:1px solid #eef0f3;transition:background .15s}
        .admin-row:last-child{border-bottom:none}
        .admin-row:hover{background:#f7f9fc}
        .tab-btn{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;transition:all .2s}
        .tab-btn.active{background:rgba(8,99,186,.08);color:#0863ba;font-weight:700}
        .tab-btn:not(.active){background:transparent;color:#888}
        .tab-btn:not(.active):hover{background:rgba(8,99,186,.04);color:#666}
        .icon-btn-dark{width:30px;height:30px;border-radius:8px;border:1.5px solid #eef0f3;background:transparent;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#aaa}
        .icon-btn-dark:hover{border-color:#0863ba;background:rgba(8,99,186,.06);color:#0863ba}
        .filter-chip-dark{padding:6px 14px;border-radius:20px;border:1.5px solid #eef0f3;background:transparent;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;color:#888;transition:all .2s}
        .filter-chip-dark.active{background:rgba(8,99,186,.08);color:#0863ba;border-color:rgba(8,99,186,.2)}
        .filter-chip-dark:hover:not(.active){border-color:#ccc;color:#666}
        .stat-dark{background:#fff;border-radius:16px;padding:20px;border:1.5px solid #eef0f3;position:relative;overflow:hidden;box-shadow:0 2px 12px rgba(8,99,186,.05)}
        .dropdown-dark{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(8,99,186,.12);border:1.5px solid #eef0f3;min-width:170px;z-index:100;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-dark-item{padding:10px 16px;font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-dark-item:hover{background:#f7f9fc;color:#353535}
        .dropdown-dark-item.danger:hover{background:rgba(192,57,43,.06);color:#c0392b}
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc",display:"flex" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:220,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50,boxShadow:"4px 0 24px rgba(8,99,186,.06)" }}>
          <div style={{ padding:"24px 20px",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }}>💗</div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:9,color:"#aaa",fontWeight:400,letterSpacing:.5,textTransform:"uppercase" }}>{tr.adminBadge}</div>
              </div>
            </div>
            <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>Admin Access</span>
            </div>
          </div>

          <nav style={{ flex:1,padding:"16px 12px" }}>
            {Object.entries(tr.nav).map(([k, v]) => {
              const icons = { clinics:"🏥", users:"👥", subscriptions:"💳", settings:"⚙️" };
              const isActive = activeTab === k;
              return (
                <button key={k} onClick={() => setActiveTab(k)}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,marginBottom:4,border:"none",cursor:"pointer",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:13,fontFamily:"Rubik,sans-serif",transition:"all .18s",textAlign:isAr?"right":"left" }}>
                  <span style={{ fontSize:16 }}>{icons[k as keyof typeof icons]}</span>
                  <span style={{ flex:1 }}>{v}</span>
                  {k === "clinics" && <span style={{ fontSize:11,background:"rgba(8,99,186,.08)",color:"#0863ba",padding:"2px 8px",borderRadius:20 }}>{clinics.length}</span>}
                </button>
              );
            })}
          </nav>

          <div style={{ padding:"16px",borderTop:"1.5px solid #eef0f3" }}>
            <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:12 }}>{tr.systemInfo}</div>
            {[
              { l: tr.version,    v: "1.0.0" },
              { l: tr.lastBackup, v: isAr ? "منذ ساعة" : "1h ago" },
              { l: tr.uptime,     v: "99.9%" },
            ].map(s => (
              <div key={s.l} style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:11,color:"#aaa" }}>{s.l}</span>
                <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>{s.v}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                style={{ width:"100%",padding:"7px",background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#666",transition:"all .2s",marginBottom:8 }}>
                🌐 {lang === "ar" ? "English" : "العربية"}
              </button>
              <button onClick={handleLogout}
                style={{ width:"100%",padding:"7px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#c0392b" }}>
                → {tr.signOut}
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="page-anim" style={{ [isAr?"marginRight":"marginLeft"]:220,flex:1,padding:"0 32px 48px",minHeight:"100vh" }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:20,fontWeight:800,color:"#353535" }}>
                  {activeTab === "clinics" && tr.clinics.title}
                  {activeTab !== "clinics" && tr.nav[activeTab as keyof typeof tr.nav]}
                </h1>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
                  {activeTab === "clinics"
                    ? `${stats.active} ${isAr?"عيادة نشطة من":"active of"} ${stats.total} ${isAr?"":"total"}`
                    : tr.comingSoon}
                </p>
              </div>
              {activeTab === "clinics" && (
                <button onClick={() => setAddModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.35)",transition:"all .2s" }}>
                  <span>＋</span> {tr.clinics.addClinic}
                </button>
              )}
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* STATS */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
              {[
                { label:tr.stats.totalClinics,  value:stats.total,    icon:"🏥", color:"#0863ba", accent:"#0863ba" },
                { label:tr.stats.activeClinics, value:stats.active,   icon:"✅", color:"#2e7d32", accent:"#2e7d32" },
                { label:tr.stats.totalUsers,    value:stats.users,    icon:"👥", color:"#7b2d8b", accent:"#7b2d8b" },
                { label:tr.stats.expiringSoon,  value:stats.expiring, icon:"⏰", color:"#e67e22", accent:"#e67e22" },
              ].map((s, i) => (
                <div key={i} className="stat-dark" style={{ animation:`fadeUp .4s ${i*60}ms ease both` }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:s.accent,borderRadius:"16px 16px 0 0" }} />
                  <div style={{ width:38,height:38,background:`${s.accent}18`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:12 }}>{s.icon}</div>
                  <div style={{ fontSize:28,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11,color:"#aaa",marginTop:6,fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* CLINICS TAB */}
            {activeTab === "clinics" && (
              <>
                {/* SEARCH + FILTER */}
                <div style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #eef0f3",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#ccc",fontSize:14 }}>🔍</span>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={tr.clinics.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}
                    />
                    {search && <button onClick={() => setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa" }}>✕</button>}
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    {[["all",tr.filterAll],["active",tr.filterActive],["inactive",tr.filterInactive]].map(([k,v]) => (
                      <button key={k} className={`filter-chip-dark${filter===k?" active":""}`} onClick={() => setFilter(k)}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* TABLE */}
                {loading ? (
                  <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                    <div style={{ fontSize:36,marginBottom:10,display:"inline-block",animation:"spin 1s linear infinite" }}>⚙️</div>
                    <div style={{ fontSize:14 }}>{tr.loading}</div>
                  </div>
                ) : (
                  <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 130px 180px 90px 100px 120px 160px",padding:"11px 20px",background:"#f7f9fc",borderBottom:"1.5px solid #eef0f3",gap:0 }}>
                      {[tr.clinics.table.name,tr.clinics.table.owner,tr.clinics.table.email,tr.clinics.table.status,tr.clinics.table.plan,tr.clinics.table.expiry,tr.clinics.table.actions].map((h,i) => (
                        <div key={i} style={{ fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.6,paddingLeft:i>0&&i<6?8:0,textAlign:i===6?"center":"start" }}>{h}</div>
                      ))}
                    </div>

                    {filtered.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                        <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                        <div style={{ fontSize:14 }}>{tr.noResults}</div>
                      </div>
                    ) : (
                      filtered.map(c => {
                        const ss      = STATUS_COLORS[c.status] || STATUS_COLORS.active;
                        const pc      = PLAN_COLORS[c.plan];
                        const expSoon = isExpiringSoon(c.expiry);
                        const exp     = isExpired(c.expiry);
                        return (
                          <div key={c.id} className="admin-row" style={{ display:"grid",gridTemplateColumns:"1fr 130px 180px 90px 100px 120px 160px",padding:"14px 20px",alignItems:"center",gap:0 }}>
                            <div>
                              <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{c.name}</div>
                              <div style={{ fontSize:11,color:"#ccc",marginTop:2 }}>ID: #{c.id}</div>
                            </div>
                            <div style={{ fontSize:12,color:"#666",paddingLeft:8 }}>{c.owner}</div>
                            <div style={{ fontSize:11,color:"#aaa",paddingLeft:8,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{c.email}</div>
                            <div style={{ paddingLeft:8 }}>
                              <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color }}>
                                {tr.clinics.statuses[c.status]}
                              </span>
                            </div>
                            <div style={{ paddingLeft:8 }}>
                              <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${pc}20`,color:pc }}>
                                {tr.clinics.plans[c.plan]}
                              </span>
                            </div>
                            <div style={{ paddingLeft:8 }}>
                              <div style={{ fontSize:11,color:exp?"#c0392b":expSoon?"#e67e22":"#aaa",fontWeight:exp||expSoon?700:400 }}>{fmtDate(c.expiry)}</div>
                              {expSoon && !exp && <div style={{ fontSize:9,color:"#e67e22",fontWeight:600,marginTop:2,animation:"pulse 2s infinite" }}>⚠ {isAr?"تنتهي قريباً":"Expiring soon"}</div>}
                              {exp      && <div style={{ fontSize:9,color:"#c0392b",fontWeight:600,marginTop:2 }}>✗ {isAr?"منتهية":"Expired"}</div>}
                            </div>
                            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,position:"relative" }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={e => { e.stopPropagation(); setSubClinic(c); }}
                                style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"all .18s" }}>
                                💳 {isAr?"تعديل الاشتراك":"Edit Sub"}
                              </button>
                              <button className="icon-btn-dark" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId===c.id?null:(c.id||null)); }}>⋯</button>
                              {openMenuId === c.id && (
                                <div className="dropdown-dark">
                                  <div className="dropdown-dark-item" onClick={() => { setEditClinic(c); setOpenMenuId(null); }}>✏️ {tr.clinics.actions.edit}</div>
                                  <div className="dropdown-dark-item" onClick={() => { setResetClinic(c); setOpenMenuId(null); }}>🔑 {tr.clinics.actions.resetPass}</div>
                                  <div className="dropdown-dark-item" onClick={() => { toggleStatus(c); setOpenMenuId(null); }}>
                                    {c.status==="active"?"⏸ "+tr.clinics.actions.suspend:"▶ "+tr.clinics.actions.activate}
                                  </div>
                                  <div style={{ height:1,background:"#eef0f3",margin:"4px 0" }} />
                                  <div className="dropdown-dark-item danger" onClick={() => { setDeleteClinic(c); setOpenMenuId(null); }}>🗑️ {tr.clinics.actions.delete}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab !== "clinics" && (
              <div style={{ textAlign:"center",padding:"80px 20px",color:"#ccc" }}>
                <div style={{ fontSize:64,marginBottom:20 }}>🚧</div>
                <h2 style={{ fontSize:24,fontWeight:800,color:"#353535",marginBottom:10 }}>{tr.comingSoon}</h2>
                <p style={{ fontSize:14,color:"#aaa" }}>{isAr?"هذا القسم قيد التطوير":"This section is under development"}</p>
              </div>
            )}

          </div>
        </main>

        {/* Modals */}
        {(addModal || editClinic) && (
          <ClinicModal
            lang={lang}
            clinic={editClinic}
            onSave={loadClinics}
            onClose={() => { setAddModal(false); setEditClinic(null); }}
          />
        )}
        {resetClinic && <ResetPassModal lang={lang} clinic={resetClinic} onClose={() => { setResetClinic(null); loadClinics(); }} />}

        {subClinic && (
          <SubscriptionModal
            lang={lang}
            clinic={subClinic}
            onSave={loadClinics}
            onClose={() => { setSubClinic(null); loadClinics(); }}
          />
        )}

        {deleteClinic && (
          <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={() => setDeleteClinic(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)" }} />
            <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(8,99,186,.15)",border:"1.5px solid #eef0f3",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:17,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteModal.title}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6 }}>
                {tr.deleteModal.msg} <strong style={{ color:"#353535" }}>{deleteClinic.name}</strong>؟<br/>
                <span style={{ color:"#c0392b",fontSize:12 }}>{tr.deleteModal.warning}</span>
              </p>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={handleDelete} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.deleteModal.confirm}</button>
                <button onClick={() => setDeleteClinic(null)} style={{ flex:1,padding:"12px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.deleteModal.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
