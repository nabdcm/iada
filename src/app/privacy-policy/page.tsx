"use client";

import AppIcon from "@/components/AppIcon";
import { useState } from "react";

// ============================================================
// NABD — نبض | Privacy Policy Page
// سياسة الخصوصية — متوافقة مع Google Play & Google Search
// ============================================================

type Lang = "ar" | "en";

const LAST_UPDATED_AR = "1 يناير 2026";
const LAST_UPDATED_EN = "January 1, 2026";
const APP_NAME_AR = "نبض";
const APP_NAME_EN = "NABD";
const COMPANY_AR = "فريق نبض";
const COMPANY_EN = "NABD Team";
const CONTACT_EMAIL = "support@nabd.clinic";
const CONTACT_WHATSAPP = "https://wa.me/963998285483";
const WEBSITE = "https://www.nabd.clinic";

const T = {
  ar: {
    title: "سياسة الخصوصية",
    subtitle: `آخر تحديث: ${LAST_UPDATED_AR}`,
    backHome: "العودة للرئيسية",
    intro: `تصف سياسة الخصوصية هذه كيفية قيام ${APP_NAME_AR} ("نحن"، "لنا"، "التطبيق") بجمع واستخدام وحماية معلوماتك عند استخدام تطبيق ${APP_NAME_AR} لإدارة العيادات والصيدليات. باستخدام التطبيق، فإنك توافق على الشروط الواردة في هذه السياسة.`,
    sections: [
      {
        icon: "📋",
        title: "المعلومات التي نجمعها",
        content: [
          {
            subtitle: "أ) معلومات الحساب",
            text: "عند تسجيلك، نجمع: الاسم الكامل، عنوان البريد الإلكتروني، كلمة المرور (مشفّرة)، رقم الهاتف، واسم العيادة أو الصيدلية.",
          },
          {
            subtitle: "ب) بيانات المرضى",
            text: "يدخل الأطباء والصيادلة بيانات المرضى بما فيها: الاسم، رقم الهاتف، الجنس، التاريخ الطبي، الوصفات، والمدفوعات. هذه البيانات تُخزَّن بشكل آمن وتبقى تحت تحكم مزود الخدمة الصحية.",
          },
          {
            subtitle: "ج) بيانات الاستخدام",
            text: "نجمع تلقائياً بيانات تقنية مثل: نوع الجهاز، نظام التشغيل، عنوان IP، وسجلات الأخطاء بهدف تحسين الخدمة.",
          },
          {
            subtitle: "د) بيانات المريض في بوابة المريض",
            text: "عند استخدام بوابة المريض لحجز موعد، نجمع: الاسم، رقم الهاتف، الجنس، ووجود أمراض مزمنة كالسكري وضغط الدم.",
          },
        ],
      },
      {
        icon: "🎯",
        title: "كيف نستخدم معلوماتك",
        content: [
          {
            subtitle: null,
            text: "• تقديم خدمات إدارة العيادة والصيدلية\n• إرسال تذكيرات المواعيد عبر واتساب\n• تحسين أداء التطبيق وتجربة المستخدم\n• الرد على استفسارات الدعم الفني\n• الامتثال للمتطلبات القانونية والتنظيمية\n• إرسال إشعارات مهمة متعلقة بالحساب أو التطبيق",
          },
        ],
      },
      {
        icon: "🔒",
        title: "كيف نحمي معلوماتك",
        content: [
          {
            subtitle: null,
            text: "نتخذ إجراءات أمنية صارمة لحماية بياناتك:\n• تشفير البيانات أثناء النقل باستخدام HTTPS/TLS\n• تخزين كلمات المرور بصيغة مشفّرة باستخدام خوارزميات آمنة\n• استخدام Supabase كبنية تحتية آمنة للبيانات\n• تقييد الوصول إلى البيانات للموظفين المخوّلين فقط\n• مراجعة دورية لإجراءات الأمان",
          },
        ],
      },
      {
        icon: "🤝",
        title: "مشاركة المعلومات مع أطراف ثالثة",
        content: [
          {
            subtitle: null,
            text: "لا نبيع معلوماتك الشخصية لأطراف ثالثة. قد نشارك بياناتك فقط في الحالات التالية:\n• مزودو الخدمة الضروريون لتشغيل التطبيق (مثل Supabase للتخزين، وخدمة واتساب للإشعارات)\n• عند وجود التزام قانوني أو أمر قضائي\n• لحماية حقوق المستخدمين والتطبيق في حالات الاحتيال\n\nجميع مزودي الخدمة ملزمون بسياسات خصوصية صارمة.",
          },
        ],
      },
      {
        icon: "🍪",
        title: "ملفات تعريف الارتباط والتتبع",
        content: [
          {
            subtitle: null,
            text: "يستخدم التطبيق ملفات تعريف الارتباط (Cookies) وجلسات المصادقة بهدف الحفاظ على تسجيل الدخول وتحسين الأداء. لا نستخدم أدوات تتبع إعلانية أو نشارك بيانات التصفح مع أطراف إعلانية.",
          },
        ],
      },
      {
        icon: "🧒",
        title: "خصوصية الأطفال",
        content: [
          {
            subtitle: null,
            text: `لا يستهدف ${APP_NAME_AR} الأطفال دون سن 18 عاماً ولا يجمع بياناتهم الشخصية عن قصد. إذا اكتشفنا أننا جمعنا بيانات طفل دون موافقة والديه، سنحذفها فوراً. إن كنتَ وليّ أمر وتعتقد أن طفلك قدّم بيانات، تواصل معنا على ${CONTACT_EMAIL}.`,
          },
        ],
      },
      {
        icon: "📍",
        title: "بيانات الموقع الجغرافي",
        content: [
          {
            subtitle: null,
            text: `لا يطلب ${APP_NAME_AR} الوصول إلى موقعك الجغرافي ولا يجمعه.`,
          },
        ],
      },
      {
        icon: "⚙️",
        title: "حقوقك وخياراتك",
        content: [
          {
            subtitle: null,
            text: "لديك الحق في:\n• الوصول إلى بياناتك الشخصية المخزّنة لدينا\n• تصحيح أي معلومات غير دقيقة\n• طلب حذف حسابك وبياناتك\n• سحب موافقتك على معالجة البيانات\n• الاعتراض على معالجة معينة لبياناتك\n\nللاستفسار عن أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني أدناه.",
          },
        ],
      },
      {
        icon: "🗓️",
        title: "مدة الاحتفاظ بالبيانات",
        content: [
          {
            subtitle: null,
            text: "نحتفظ ببياناتك طوال فترة اشتراكك في الخدمة. عند إلغاء الحساب، يمكنك طلب حذف بياناتك خلال 30 يوماً من الإلغاء. قد تُحتفظ ببعض البيانات لفترة أطول إذا اقتضى ذلك التزام قانوني.",
          },
        ],
      },
      {
        icon: "🔄",
        title: "التحديثات على هذه السياسة",
        content: [
          {
            subtitle: null,
            text: "قد نُحدّث سياسة الخصوصية هذه من وقت لآخر. سنُعلمك بالتغييرات الجوهرية عبر إشعار داخل التطبيق أو البريد الإلكتروني. استمرارك في استخدام التطبيق بعد التحديث يعني موافقتك على السياسة الجديدة.",
          },
        ],
      },
      {
        icon: "📬",
        title: "تواصل معنا",
        content: [
          {
            subtitle: null,
            text: `إذا كان لديك أي استفسار أو طلب يتعلق بخصوصيتك، لا تتردد في التواصل معنا:\n\nالبريد الإلكتروني: ${CONTACT_EMAIL}\nالموقع الإلكتروني: ${WEBSITE}\nواتساب: يمكنك التواصل معنا عبر رابط واتساب في الموقع`,
          },
        ],
      },
    ],
    copyright: "© 2026 نبض — جميع الحقوق محفوظة",
  },
  en: {
    title: "Privacy Policy",
    subtitle: `Last updated: ${LAST_UPDATED_EN}`,
    backHome: "Back to Home",
    intro: `This Privacy Policy describes how ${APP_NAME_EN} ("we," "us," "the App") collects, uses, and protects your information when you use the ${APP_NAME_EN} clinic and pharmacy management application. By using the App, you agree to the terms described in this policy.`,
    sections: [
      {
        icon: "📋",
        title: "Information We Collect",
        content: [
          {
            subtitle: "a) Account Information",
            text: "When you register, we collect: full name, email address, password (encrypted), phone number, and clinic or pharmacy name.",
          },
          {
            subtitle: "b) Patient Data",
            text: "Doctors and pharmacists enter patient data including: name, phone number, gender, medical history, prescriptions, and payments. This data is stored securely and remains under the control of the healthcare provider.",
          },
          {
            subtitle: "c) Usage Data",
            text: "We automatically collect technical data such as: device type, operating system, IP address, and error logs to improve the service.",
          },
          {
            subtitle: "d) Patient Portal Data",
            text: "When using the patient portal to book an appointment, we collect: name, phone number, gender, and presence of chronic conditions such as diabetes and blood pressure.",
          },
        ],
      },
      {
        icon: "🎯",
        title: "How We Use Your Information",
        content: [
          {
            subtitle: null,
            text: "• Providing clinic and pharmacy management services\n• Sending appointment reminders via WhatsApp\n• Improving app performance and user experience\n• Responding to technical support inquiries\n• Complying with legal and regulatory requirements\n• Sending important notifications related to your account or the app",
          },
        ],
      },
      {
        icon: "🔒",
        title: "How We Protect Your Information",
        content: [
          {
            subtitle: null,
            text: "We take strict security measures to protect your data:\n• Data encryption in transit using HTTPS/TLS\n• Passwords stored in encrypted form using secure algorithms\n• Using Supabase as a secure data infrastructure\n• Restricting data access to authorized personnel only\n• Regular review of security procedures",
          },
        ],
      },
      {
        icon: "🤝",
        title: "Sharing Information with Third Parties",
        content: [
          {
            subtitle: null,
            text: "We do not sell your personal information to third parties. We may share your data only in the following cases:\n• Service providers necessary to operate the app (such as Supabase for storage, and WhatsApp for notifications)\n• When there is a legal obligation or court order\n• To protect user and app rights in cases of fraud\n\nAll service providers are bound by strict privacy policies.",
          },
        ],
      },
      {
        icon: "🍪",
        title: "Cookies and Tracking",
        content: [
          {
            subtitle: null,
            text: "The app uses cookies and authentication sessions to maintain login sessions and improve performance. We do not use advertising tracking tools or share browsing data with advertising parties.",
          },
        ],
      },
      {
        icon: "🧒",
        title: "Children's Privacy",
        content: [
          {
            subtitle: null,
            text: `${APP_NAME_EN} does not target children under 18 years of age and does not intentionally collect their personal data. If we discover that we have collected data from a child without parental consent, we will delete it immediately. If you are a guardian and believe your child has submitted data, contact us at ${CONTACT_EMAIL}.`,
          },
        ],
      },
      {
        icon: "📍",
        title: "Location Data",
        content: [
          {
            subtitle: null,
            text: `${APP_NAME_EN} does not request or collect your geographic location.`,
          },
        ],
      },
      {
        icon: "⚙️",
        title: "Your Rights and Choices",
        content: [
          {
            subtitle: null,
            text: "You have the right to:\n• Access your personal data stored with us\n• Correct any inaccurate information\n• Request deletion of your account and data\n• Withdraw your consent to data processing\n• Object to certain processing of your data\n\nTo inquire about any of these rights, contact us via the email below.",
          },
        ],
      },
      {
        icon: "🗓️",
        title: "Data Retention Period",
        content: [
          {
            subtitle: null,
            text: "We retain your data for the duration of your subscription. Upon account cancellation, you can request data deletion within 30 days of cancellation. Some data may be retained longer if required by legal obligation.",
          },
        ],
      },
      {
        icon: "🔄",
        title: "Updates to This Policy",
        content: [
          {
            subtitle: null,
            text: "We may update this Privacy Policy from time to time. We will notify you of significant changes via an in-app notification or email. Continued use of the app after the update constitutes your acceptance of the new policy.",
          },
        ],
      },
      {
        icon: "📬",
        title: "Contact Us",
        content: [
          {
            subtitle: null,
            text: `If you have any inquiry or request related to your privacy, please contact us:\n\nEmail: ${CONTACT_EMAIL}\nWebsite: ${WEBSITE}\nWhatsApp: Available through the link on our website`,
          },
        ],
      },
    ],
    copyright: "© 2026 NABD — All rights reserved",
  },
} as const;

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Rubik', sans-serif;
          background: #f0f4fa;
          min-height: 100vh;
          direction: ${isAr ? "rtl" : "ltr"};
        }

        .pp-root {
          min-height: 100vh;
          background: #f0f4fa;
          font-family: 'Rubik', sans-serif;
          direction: ${isAr ? "rtl" : "ltr"};
        }

        /* ── Header ── */
        .pp-header {
          background: linear-gradient(155deg, #0863ba 0%, #054a8c 55%, #03346e 100%);
          padding: 48px 20px 36px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .pp-header::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          pointer-events: none;
        }
        .pp-header-inner { position: relative; z-index: 1; max-width: 420px; width: 100%; }

        .pp-logo {
          width: 64px; height: 64px;
          background: rgba(255,255,255,0.14);
          border-radius: 18px;
          border: 1.5px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          backdrop-filter: blur(10px);
        }
        .pp-app-name {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          margin-bottom: 6px;
        }
        .pp-title {
          font-size: 28px;
          font-weight: 900;
          color: #fff;
          margin-bottom: 8px;
        }
        .pp-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }

        /* ── Top bar ── */
        .pp-topbar {
          position: absolute;
          top: 14px;
          ${isAr ? "left" : "right"}: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          z-index: 10;
        }
        .lang-btn {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          border-radius: 8px;
          padding: 5px 13px;
          font-family: 'Rubik', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .back-link {
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 5px 12px;
          backdrop-filter: blur(8px);
        }

        /* ── Content ── */
        .pp-content {
          max-width: 520px;
          margin: 0 auto;
          padding: 24px 16px 60px;
        }

        /* ── Intro ── */
        .pp-intro {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #e8edf5;
          padding: 20px;
          margin-bottom: 16px;
          font-size: 14px;
          color: #444;
          line-height: 1.8;
        }

        /* ── Section card ── */
        .pp-section {
          background: #fff;
          border-radius: 16px;
          border: 1.5px solid #e8edf5;
          padding: 20px;
          margin-bottom: 12px;
        }
        .pp-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f4fa;
        }
        .pp-section-icon {
          width: 36px; height: 36px;
          background: #f0f4fa;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .pp-section-title {
          font-size: 15px;
          font-weight: 800;
          color: #1a1a2e;
        }

        .pp-subsection { margin-bottom: 12px; }
        .pp-subsection:last-child { margin-bottom: 0; }
        .pp-subtitle-text {
          font-size: 13px;
          font-weight: 700;
          color: #0863ba;
          margin-bottom: 5px;
        }
        .pp-text {
          font-size: 13.5px;
          color: #555;
          line-height: 1.8;
          white-space: pre-line;
        }

        /* ── Footer ── */
        .pp-footer {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 16px 40px;
          text-align: center;
        }
        .pp-footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .pp-footer-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 10px;
        }
        .pp-footer-link {
          font-size: 13px;
          color: #0863ba;
          text-decoration: none;
          font-weight: 600;
        }
        .pp-footer-copy {
          font-size: 12px;
          color: #bbb;
        }
      `}</style>

      <div className="pp-root">
        {/* ── Header ── */}
        <div className="pp-header">
          <div className="pp-topbar">
            <a href="/" className="back-link">
              {isAr ? "→" : "←"} {tr.backHome}
            </a>
            <button
              className="lang-btn"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              {lang === "ar" ? "EN" : "عر"}
            </button>
          </div>

          <div className="pp-header-inner">
            <div className="pp-logo">
              <img
                src="/Logo_Nabd.svg"
                alt="NABD"
                style={{ width: 42, height: 42, borderRadius: 10 }}
              />
            </div>
            <div className="pp-app-name">
              {isAr ? APP_NAME_AR : APP_NAME_EN}
            </div>
            <div className="pp-title">{tr.title}</div>
            <div className="pp-subtitle">{tr.subtitle}</div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="pp-content">
          {/* Intro */}
          <div className="pp-intro">{tr.intro}</div>

          {/* Sections */}
          {tr.sections.map((section, i) => (
            <div key={i} className="pp-section">
              <div className="pp-section-header">
                <div className="pp-section-icon"><AppIcon glyph={section.icon} /></div>
                <div className="pp-section-title">{section.title}</div>
              </div>
              {section.content.map((block, j) => (
                <div key={j} className="pp-subsection">
                  {block.subtitle && (
                    <div className="pp-subtitle-text">{block.subtitle}</div>
                  )}
                  <div className="pp-text">{block.text}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="pp-footer">
          <div className="pp-footer-logo">
            <img
              src="/Logo_Nabd.svg"
              alt="NABD"
              style={{ width: 20, height: 20, borderRadius: 5 }}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>
              {isAr ? APP_NAME_AR : APP_NAME_EN}
            </span>
          </div>
          <div className="pp-footer-links">
            <a href="/" className="pp-footer-link">
              {isAr ? "الرئيسية" : "Home"}
            </a>
            <a
              href={CONTACT_WHATSAPP}
              className="pp-footer-link"
              target="_blank"
              rel="noreferrer"
            >
              {isAr ? "تواصل معنا" : "Contact Us"}
            </a>
          </div>
          <div className="pp-footer-copy">{tr.copyright}</div>
        </div>
      </div>
    </>
  );
}