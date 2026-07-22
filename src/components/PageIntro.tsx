"use client";

// ============================================================
// PageIntro — بطاقة تعريفية تظهر مرة واحدة لكل صفحة
// تُخزَّن الموافقة في localStorage حتى لا تتكرر بعد "قرأت وفهمت"
// النصوص مركزية هنا حسب مفتاح الصفحة (pageKey)
// ============================================================

import { useState, useEffect } from "react";

const VERSION = "v1"; // زد الرقم لإعادة عرض كل البطاقات بعد تحديث كبير

const BRAND = { primary: "#0863ba", primaryDark: "#054a8c", primaryLight: "#3d8fd6", ink: "#1c2b3a", muted: "#8a97a6" };

type IntroContent = { icon: string; title: { ar: string; en: string }; body: { ar: string; en: string }; points?: { ar: string; en: string }[] };

const INTROS: Record<string, IntroContent> = {
  dashboard: {
    icon: "🏠",
    title: { ar: "لوحة التحكم", en: "Dashboard" },
    body: {
      ar: "نظرة سريعة على يومك: مواعيد اليوم، إجمالي المرضى، وزياراتك الشهرية. من هنا تبدأ إجراءاتك السريعة.",
      en: "A quick view of your day: today's appointments, total patients, and monthly visits. Your quick actions start here.",
    },
    points: [
      { ar: "بطاقات الإحصائيات قابلة لإعادة الترتيب بالسحب.", en: "Stat cards can be reordered by dragging." },
      { ar: "الإجراءات السريعة تنقلك مباشرة لأهم المهام.", en: "Quick actions jump you to key tasks." },
    ],
  },
  patients: {
    icon: "👥",
    title: { ar: "المرضى", en: "Patients" },
    body: {
      ar: "سجل مرضاك الكامل. أضف مريضاً جديداً، ابحث، وافتح ملف أي مريض لعرض بياناته وزياراته.",
      en: "Your full patient registry. Add a new patient, search, and open any file to view data and visits.",
    },
    points: [
      { ar: "السجل الطبي: لكل مريض ملف يجمع تاريخه المرضي، أدويته، حساسياته، وملاحظاتك عبر الزيارات.", en: "Medical record: each patient has a file gathering history, medications, allergies, and your notes across visits." },
      { ar: "متابعة التحاليل المخبرية: سجّل نتائج تحاليل المريض وتابع تطورها زيارة بعد زيارة.", en: "Lab tracking: record the patient's test results and follow their progress visit after visit." },
    ],
  },
  appointments: {
    icon: "📅",
    title: { ar: "المواعيد", en: "Appointments" },
    body: {
      ar: "نظّم مواعيد عيادتك على التقويم. أضف موعداً، حدّد حالته (مكتمل/غياب)، وذكّر مرضاك عبر واتساب.",
      en: "Organize your clinic calendar. Add appointments, set status (done/no-show), and remind patients via WhatsApp.",
    },
    points: [
      { ar: "رابط الحجز: شارك رابطاً خاصاً بعيادتك ليحجز المرضى مواعيدهم بأنفسهم دون اتصال.", en: "Booking link: share your clinic's link so patients book their own appointments without calling." },
      { ar: "شاشة الانتظار: اعرض دور المرضى على شاشة في صالة الانتظار بشكل احترافي.", en: "Waiting screen: display the patient queue on a screen in your waiting room, professionally." },
    ],
  },
  payments: {
    icon: "💰",
    title: { ar: "المدفوعات", en: "Payments" },
    body: {
      ar: "تابع إيرادات عيادتك ومصاريفها لحظياً. سجّل الدفعات، أضف المصاريف، واعرف صافي دخلك بسهولة.",
      en: "Track your clinic's revenue and expenses in real time. Log payments, add expenses, and see net income easily.",
    },
  },
  prescriptions: {
    icon: "💊",
    title: { ar: "الوصفات", en: "Prescriptions" },
    body: {
      ar: "أنشئ وصفات طبية أنيقة لمرضاك واحفظها في ملفاتهم، ويمكن طباعتها أو مشاركتها بسهولة.",
      en: "Create clean prescriptions for your patients, save them to their files, and print or share easily.",
    },
  },
  "patient-tracking": {
    icon: "📈",
    title: { ar: "متابعة المرضى", en: "Patient Tracking" },
    body: {
      ar: "خطط متابعة للحالات المزمنة أو العلاجات الطويلة، مع جدولة الزيارات ومتابعة تطور كل مريض.",
      en: "Follow-up plans for chronic cases or long treatments, with scheduled visits and progress tracking.",
    },
  },
  referrals: {
    icon: "🔄",
    title: { ar: "تحويل المرضى", en: "Patient Referrals" },
    body: {
      ar: "حوّل مريضاً إلى طبيب آخر على نبض بضغطة. تُنقل نسخة آمنة من بياناته مع ملخص الحالة، ويقبلها الطبيب الآخر أو يرفضها.",
      en: "Refer a patient to another NABD doctor in one click. A safe copy of their data and a case summary is sent for the other doctor to accept or reject.",
    },
    points: [
      { ar: "ابحث عن الطبيب بالاسم واختصاصه.", en: "Search the doctor by name and specialty." },
      { ar: "القبول يضيف المريض تلقائياً لقائمة الطبيب المستقبِل.", en: "Accepting adds the patient to the receiver's list automatically." },
    ],
  },
  messages: {
    icon: "💬",
    title: { ar: "الرسائل", en: "Messages" },
    body: {
      ar: "تواصل مباشر مع إدارة نبض للدعم والاستفسارات. ستصلك ردودهم هنا مع إشعار عند وصول رسالة جديدة.",
      en: "Direct line with NABD support for questions. Their replies arrive here with a notification for each new message.",
    },
  },
  clinicManagement: {
    icon: "🏥",
    title: { ar: "إدارة العيادة", en: "Clinic Management" },
    body: {
      ar: "اضبط أوقات دوام عيادتك، أيام العطل، وإعدادات الحجز. ومن تبويب الإعدادات يمكنك تغيير كلمة سر حسابك.",
      en: "Set your working hours, vacation days, and booking settings. From the settings tab you can also change your password.",
    },
  },
  account: {
    icon: "👤",
    title: { ar: "حسابي", en: "My Account" },
    body: {
      ar: "مركز التحكم بحسابك: عدّل معلوماتك، غيّر كلمة السر، وافتح إدارة العيادة والتفضيلات من مكان واحد.",
      en: "Your account hub: edit your info, change your password, and access clinic management and preferences in one place.",
    },
  },
};

export default function PageIntro({ pageKey, lang = "ar" }: { pageKey: string; lang?: "ar" | "en" }) {
  const [show, setShow] = useState(false);
  const content = INTROS[pageKey];
  const storageKey = `nabd_intro_${VERSION}_${pageKey}`;

  useEffect(() => {
    if (!content) return;
    try {
      if (!localStorage.getItem(storageKey)) setShow(true);
    } catch { /* ignore */ }
  }, [content, storageKey]);

  if (!content || !show) return null;

  const isAr = lang === "ar";
  const dismiss = () => {
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(15,30,55,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "'Rubik',sans-serif",
        animation: "introFade .25s ease",
      }}
    >
      <style>{`
        @keyframes introFade{from{opacity:0}to{opacity:1}}
        @keyframes introPop{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420, background: "#fff", borderRadius: 22,
          overflow: "hidden", boxShadow: "0 24px 70px rgba(15,40,80,.35)",
          animation: "introPop .3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* رأس متدرّج */}
        <div style={{
          background: `linear-gradient(120deg, ${BRAND.primaryDark}, ${BRAND.primary} 60%, ${BRAND.primaryLight})`,
          padding: "26px 24px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, insetInlineEnd: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,.18)", border: "1.5px solid rgba(255,255,255,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
              {content.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", fontWeight: 600, marginBottom: 3 }}>
                {isAr ? "تعريف بالصفحة" : "Page guide"}
              </div>
              <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#fff" }}>{content.title[isAr ? "ar" : "en"]}</h2>
            </div>
          </div>
        </div>

        {/* المحتوى */}
        <div style={{ padding: "22px 24px 24px" }}>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 2, color: "#3d4a5c" }}>
            {content.body[isAr ? "ar" : "en"]}
          </p>

          {content.points && (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {content.points.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: BRAND.primary, fontWeight: 800, fontSize: 15, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 13.5, color: "#5a6b80", lineHeight: 1.7 }}>{p[isAr ? "ar" : "en"]}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={dismiss}
            style={{
              width: "100%", marginTop: 22,
              background: `linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight})`,
              color: "#fff", border: "none", borderRadius: 14, padding: "14px",
              fontFamily: "'Rubik',sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 8px 22px rgba(8,99,186,.3)",
            }}
          >
            {isAr ? "قرأت وفهمت ✓" : "I understand ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
