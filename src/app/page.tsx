"use client";

import AppIcon from "@/components/AppIcon";
import { useState, useEffect } from "react";
import { startDemo } from "@/lib/demo";

// ============================================================
// NABD - نبض | Landing Page
// Bilingual (AR/EN) | Light Mode | Rubik Font
// ============================================================

const LOGO_SVG = (
  <svg viewBox="0 0 337.74 393.31" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id="lg-nl1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse">
        <stop offset=".3" stopColor="#0863ba" /><stop offset=".69" stopColor="#5694cf" />
      </linearGradient>
      <linearGradient id="lg-nl2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#5694cf" /><stop offset=".68" stopColor="#a4c4e4" />
      </linearGradient>
    </defs>
    <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
    <path fill="url(#lg-nl1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
    <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
    <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
    <path fill="url(#lg-nl2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
  </svg>
);

function PulseDivider() {
  return (
    <div className="pulse-divider" aria-hidden="true">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
        <path
          className="pulse-path"
          d="M0,30 L440,30 L470,30 L490,8 L510,52 L530,18 L545,38 L560,30 L760,30 L1200,30"
          fill="none" stroke="url(#pulseGrad)" strokeWidth="2.5" strokeLinecap="round"
        />
        <defs>
          <linearGradient id="pulseGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#0863ba" stopOpacity="0" />
            <stop offset=".35" stopColor="#0863ba" />
            <stop offset=".5" stopColor="#5694cf" />
            <stop offset=".65" stopColor="#0863ba" />
            <stop offset="1" stopColor="#0863ba" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

const WA_LINK = "https://wa.me/963998285483";
const YT_LINK = "https://www.youtube.com/watch?v=ayeaWKZr_ZA";

const translations = {
  ar: {
    nav: {
      features: "المميزات",
      pricing: "الأسعار",
      about: "عن التطبيق",
      contact: "تواصل معنا",
      login: "تسجيل الدخول",
    },
    hero: {
      badge: "نظام إدارة العيادات",
      title1: "إدارة عيادتك",
      title2: "بكل سهولة واحترافية",
      subtitle: "نبض هو نظام متكامل لإدارة العيادات الطبية — مرضى، مواعيد، ومدفوعات في مكان واحد.",
      cta: "ابدأ الآن",
      demo: "مشاهدة العرض",
    },
    stats: [
      { value: "99%", label: "رضا العملاء" },
      { value: "+50", label: "عيادة تثق بنا" },
      { value: "24/7", label: "دعم مستمر" },
      { value: "3s", label: "ثوانٍ للإعداد" },
    ],
    features: {
      title: "كل ما تحتاجه في مكان",
      titleHighlight: "واحد",
      subtitle: "تم تصميم نبض خصيصاً لتبسيط العمل اليومي في العيادة",
      items: [
        {
          icon: "👥",
          title: "تسجيل المرضى وإدارة السجلات الطبية",
          desc: "سجلات مرضى منظمة وكاملة مع تاريخ طبي لكل مريض، إمكانية البحث والتعديل بسهولة.",
        },
        {
          icon: "📅",
          title: "إدارة المواعيد",
          desc: "تقويم ذكي لإدارة المواعيد مع تنبيهات تلقائية قبل ربع ساعة من كل موعد.",
        },
        {
          icon: "🔗",
          title: "رابط مخصص لحجز المواعيد لعيادتك",
          desc: "احصل على رابط حجز خاص بعيادتك يتيح للمرضى حجز مواعيدهم مباشرة بسهولة ويسر.",
        },
        {
          icon: "💳",
          title: "إدارة مالية متكاملة للعيادة",
          desc: "تتبع كامل للمدفوعات والفواتير مع لوحة إحصائيات توضح الأرقام المالية بوضوح.",
        },
        {
          icon: "💬",
          title: "تذكير المرضى بمواعيدهم عبر واتساب",
          desc: "أرسل تذكيراً تلقائياً للمريض على واتساب قبل موعده مباشرةً من التطبيق بضغطة واحدة.",
          whatsapp: true,
        },
        {
          icon: "🩺",
          title: "رابط مخصص للمريض لمتابعة حالته",
          desc: "يحصل كل مريض على رابط خاص لمتابعة حالته والاطلاع على تقرير يومي عن صحته.",
        },
        {
          icon: "📋",
          title: "إدارة الوصفات الطبية",
          desc: "سجّل الوصفات الطبية لكل مريض بسهولة واحتفظ بتاريخ كامل لأدويته وعلاجاته.",
        },
        {
          icon: "📊",
          title: "إحصائيات وتحليلات شاملة",
          desc: "نظرة شاملة على نشاط العيادة من إحصائيات ومؤشرات أداء يومية وشهرية تسهّل مهامك اليومية.",
        },
      ],
    },
    pricing: {
      title: "خطط الأسعار",
      titleHighlight: "المرنة",
      subtitle: "اختر الخطة التي تناسب احتياجات عيادتك",
      individualTab: "فردي",
      sharedTab: "مشترك",
      monthly: "شهرياً",
      annual: "سنوياً",
      save: "شهران مجاناً ",
      per_month: "$ / شهر",
      per_year: "$ / سنة",
      cta: "ابدأ الآن",
      individualPlans: [
        {
          icon: "🩺",
          name: "الأساسية",
          monthlyPrice: "5.99",
          annualPrice: "59",
          annualMonthly: "4.92",
          features: ["إدارة المرضى", "السجلات الطبية", "إدارة المواعيد", "حتى 100 مريض"],
        },
        {
          icon: "🏥",
          name: "الاحترافية",
          popular: true,
          monthlyPrice: "7.99",
          annualPrice: "79",
          annualMonthly: "6.58",
          features: [
            "جميع ميزات الأساسية",
            "رابط حجز المواعيد",
            "إدارة المدفوعات",
            "مراسلة المرضى عبر واتساب",
            "تذكير المواعيد",
            "حتى 400 مريض",
          ],
        },
        {
          icon: "🚀",
          name: "الشاملة",
          monthlyPrice: "14.99",
          annualPrice: "149",
          annualMonthly: "12.42",
          features: [
            "جميع ميزات الاحترافية",
            "متابعة المرضى برابط خاص",
            "تقارير يومية للمريض",
            "بوابة خاصة بالمريض",
            "تسجيل الوصفات الطبية",
            "عدد مرضى غير محدود",
            "أولوية في الدعم الفني",
          ],
        },
      ],
      sharedPlans: [
        {
          icon: "🩺",
          name: "مشتركة أساسية",
          monthlyPrice: "7.99",
          annualPrice: "79",
          annualMonthly: "6.58",
          features: [
            "إدارة المرضى",
            "السجلات الطبية",
            "إدارة المواعيد",
            "حتى 100 مريض",
            "حتى طبيبين",
            "تخصيص المرضى لكل طبيب",
          ],
        },
        {
          icon: "🏥",
          name: "مشتركة احترافية",
          popular: true,
          monthlyPrice: "13.99",
          annualPrice: "139",
          annualMonthly: "11.58",
          features: [
            "جميع ميزات الأساسية المشتركة",
            "رابط حجز المواعيد",
            "إدارة المدفوعات",
            "مراسلة المرضى عبر واتساب",
            "تذكير المواعيد",
            "حتى 400 مريض",
            "حتى 3 أطباء",
          ],
        },
        {
          icon: "🚀",
          name: "مشتركة شاملة",
          monthlyPrice: "21.99",
          annualPrice: "219",
          annualMonthly: "18.25",
          features: [
            "جميع ميزات الاحترافية المشتركة",
            "متابعة المرضى",
            "تقارير يومية",
            "بوابة المريض",
            "وصفات طبية",
            "عدد مرضى غير محدود",
            "حتى 5 أطباء",
            "أولوية في الدعم",
            "عدد أطباء مخصص",
          ],
        },
      ],
    },
    howItWorks: {
      title: "كيف يعمل نبض؟",
      subtitle: "أربع خطوات بسيطة لبدء إدارة عيادتك",
      steps: [
        {
          num: "1",
          title: "تسجيل الدخول",
          desc: "احصل على بيانات دخولك من المزود وسجّل الدخول بأمان.",
        },
        {
          num: "2",
          title: "أضف مرضاك",
          desc: "أدخل بيانات المرضى بسهولة وابدأ في إدارة سجلاتهم.",
        },
        {
          num: "3",
          title: "نظّم مواعيدك",
          desc: "حدد المواعيد واستقبل التنبيهات واتبع المدفوعات.",
        },
        {
          num: "4",
          title: "ذكّر مرضاك عبر واتساب",
          desc: "أرسل تذكيراً فورياً للمريض على واتساب قبل موعده مباشرةً من التطبيق.",
          whatsapp: true,
        },
      ],
    },
    cta: {
      title: "هل أنت مستعد لتطوير عيادتك؟",
      subtitle: "انضم إلى العيادات التي تثق بنبض لإدارة عملها اليومي",
      btn: "تواصل معنا عبر واتساب",
    },
    why: {
      title: "لماذا",
      titleHighlight: "نبض؟",
      subtitle: "الفرق بين الدفاتر الورقية ونظام يعمل معك",
      paper: "الطريقة التقليدية",
      nabd: "مع نبض",
      rows: [
        { paper: "دفاتر ورقية تضيع وتتلف", nabd: "سجلات رقمية آمنة تبقى للأبد" },
        { paper: "مواعيد متضاربة ومرضى ينتظرون", nabd: "تقويم ذكي وتنبيهات تلقائية" },
        { paper: "اتصالات هاتفية لتذكير كل مريض", nabd: "تذكير واتساب بضغطة واحدة" },
        { paper: "حسابات نهاية الشهر على الآلة الحاسبة", nabd: "إيرادات ومصاريف محسوبة لحظياً" },
        { paper: "المريض لا يعرف شيئاً عن حالته", nabd: "بوابة خاصة لكل مريض لمتابعة صحته" },
      ],
    },
    security: {
      title: "بيانات مرضاك",
      titleHighlight: "أمانة",
      subtitle: "نتعامل مع البيانات الطبية بأعلى معايير الحماية",
      items: [
        { icon: "🔐", title: "اتصال مشفّر بالكامل", desc: "كل البيانات تنتقل عبر HTTPS مشفّرة من جهازك حتى الخادم." },
        { icon: "🗄️", title: "نسخ احتياطي دائم", desc: "بياناتك محفوظة على بنية سحابية موثوقة مع نسخ احتياطية مستمرة." },
        { icon: "👤", title: "صلاحيات محكمة", desc: "كل عيادة معزولة تماماً — لا يمكن لأي طرف الاطلاع على بيانات غيره." },
        { icon: "📤", title: "بياناتك ملكك", desc: "يمكنك تصدير كامل بياناتك في أي وقت بصيغة قابلة للنقل." },
      ],
    },
    testimonials: {
      title: "ماذا يقول",
      titleHighlight: "الأطباء؟",
      subtitle: "آراء من عيادات تستخدم نبض يومياً",
      items: [
        { quote: "قبل نبض كنت أضيّع وقتاً طويلاً في تنظيم المواعيد. الآن كل شيء أمامي في شاشة واحدة، وتذكير الواتساب قلّل حالات الغياب بشكل ملحوظ.", name: "د. م. الخطيب", role: "طب أسنان" },
        { quote: "أكثر ما أعجبني هو متابعة المدفوعات — أعرف إيرادات عيادتي أولاً بأول بدون دفاتر ولا حسابات آخر الشهر.", name: "د. ر. سليمان", role: "طب عام" },
        { quote: "بوابة المريض وفّرت عليّ عشرات المكالمات. المريض يتابع حالته ووصفته بنفسه من رابط خاص به.", name: "د. أ. حداد", role: "أمراض جلدية" },
      ],
    },
    faq: {
      title: "أسئلة",
      titleHighlight: "شائعة",
      subtitle: "كل ما تريد معرفته قبل البدء",
      items: [
        { q: "هل بيانات مرضاي آمنة؟", a: "نعم. البيانات مشفّرة أثناء النقل ومخزّنة على بنية سحابية موثوقة، وكل عيادة معزولة تماماً عن غيرها بصلاحيات صارمة." },
        { q: "هل أحتاج خبرة تقنية لاستخدام نبض؟", a: "إطلاقاً. النظام مصمم ليكون بسيطاً — إن كنت تستخدم واتساب فستستخدم نبض بسهولة. كما نوفّر شرحاً ودعماً مباشراً عند البدء." },
        { q: "هل يعمل على الموبايل؟", a: "نعم، نبض يعمل على الموبايل والكمبيوتر والتابلت من المتصفح مباشرة، ويمكن تثبيته كتطبيق على شاشتك الرئيسية." },
        { q: "ماذا يحدث لبياناتي إذا ألغيت الاشتراك؟", a: "بياناتك تبقى ملكك — يمكنك تصديرها كاملة قبل الإلغاء، ولا نحذف شيئاً دون علمك." },
        { q: "هل يمكن لأكثر من طبيب استخدام نفس الحساب؟", a: "نعم، الخطط المشتركة تدعم حتى 5 أطباء في العيادة الواحدة مع تخصيص المرضى لكل طبيب." },
        { q: "كيف أبدأ؟", a: "جرّب النظام مجاناً من زر التجربة، وعندما تكون جاهزاً تواصل معنا عبر واتساب لتفعيل حسابك خلال دقائق." },
      ],
    },
    cookie: {
      text: "نستخدم ملفات تعريف ارتباط (كوكيز) ضرورية لتشغيل الموقع وتسجيل الدخول فقط — لا إعلانات ولا تتبّع.",
      link: "سياسة الخصوصية",
      btn: "حسناً، فهمت",
    },
    footer: {
      tagline: "نبض عيادتك في يدك",
      copy: "© 2026 نبض. جميع الحقوق محفوظة.",
      links: { features: "المميزات", pricing: "الأسعار", faq: "الأسئلة الشائعة", privacy: "سياسة الخصوصية", contact: "تواصل معنا" },
    },
  },
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      about: "About",
      contact: "Contact",
      login: "Login",
    },
    hero: {
      badge: "Clinic Management System",
      title1: "Manage Your Clinic",
      title2: "Effortlessly & Professionally",
      subtitle: "NABD is a complete clinic management system — patients, appointments, and payments all in one place.",
      cta: "Get Started",
      demo: "Watch Demo",
    },
    stats: [
      { value: "99%", label: "Client Satisfaction" },
      { value: "50+", label: "Clinics Trust Us" },
      { value: "24/7", label: "Continuous Support" },
      { value: "3s", label: "Setup Time" },
    ],
    features: {
      title: "Everything You Need in One",
      titleHighlight: "Place",
      subtitle: "NABD is designed specifically to simplify daily clinic operations",
      items: [
        {
          icon: "👥",
          title: "Patient Registration & Medical Records",
          desc: "Organized patient records with complete medical history, easy search and editing capabilities.",
        },
        {
          icon: "📅",
          title: "Appointment Management",
          desc: "Smart calendar for managing appointments with automatic alerts 15 minutes before each visit.",
        },
        {
          icon: "🔗",
          title: "Custom Booking Link for Your Clinic",
          desc: "Get a dedicated booking link for your clinic so patients can easily schedule appointments online.",
        },
        {
          icon: "💳",
          title: "Integrated Financial Management",
          desc: "Complete payment and invoice tracking with a statistics dashboard showing financial figures clearly.",
        },
        {
          icon: "💬",
          title: "WhatsApp Appointment Reminders",
          desc: "Send automatic WhatsApp reminders to patients before their appointment — directly from the app in one click.",
          whatsapp: true,
        },
        {
          icon: "🩺",
          title: "Patient Follow-up Link",
          desc: "Each patient gets a personal link to track their health status and receive daily progress reports.",
        },
        {
          icon: "📋",
          title: "Prescription Management",
          desc: "Record prescriptions for each patient and maintain a complete history of their medications and treatments.",
        },
        {
          icon: "📊",
          title: "Analytics & Comprehensive Insights",
          desc: "Comprehensive view of clinic activity with daily and monthly statistics and performance indicators to simplify your daily tasks.",
        },
      ],
    },
    pricing: {
      title: "Flexible Pricing",
      titleHighlight: "Plans",
      subtitle: "Choose the plan that fits your clinic's needs",
      individualTab: "Individual",
      sharedTab: "Shared",
      monthly: "Monthly",
      annual: "Annual",
      save: "2 months free ",
      per_month: "$ / mo",
      per_year: "$ / yr",
      cta: "Get Started",
      individualPlans: [
        {
          icon: "🩺",
          name: "Basic",
          monthlyPrice: "5.99",
          annualPrice: "59",
          annualMonthly: "4.92",
          features: ["Patient management", "Medical records", "Appointments management", "Up to 100 patients"],
        },
        {
          icon: "🏥",
          name: "Professional",
          popular: true,
          monthlyPrice: "7.99",
          annualPrice: "79",
          annualMonthly: "6.58",
          features: [
            "All Basic features",
            "Clinic booking link",
            "Payments management",
            "WhatsApp patient messaging",
            "Appointment reminders",
            "Up to 400 patients",
          ],
        },
        {
          icon: "🚀",
          name: "Comprehensive",
          monthlyPrice: "14.99",
          annualPrice: "149",
          annualMonthly: "12.42",
          features: [
            "All Professional features",
            "Patient follow-up link",
            "Daily patient reports",
            "Patient portal",
            "Prescription records",
            "Unlimited patients",
            "Priority support",
          ],
        },
      ],
      sharedPlans: [
        {
          icon: "🩺",
          name: "Shared Basic",
          monthlyPrice: "7.99",
          annualPrice: "79",
          annualMonthly: "6.58",
          features: [
            "Patient management",
            "Medical records",
            "Appointments management",
            "Up to 100 patients",
            "Up to 2 doctors",
            "Patients assigned per doctor",
          ],
        },
        {
          icon: "🏥",
          name: "Shared Professional",
          popular: true,
          monthlyPrice: "13.99",
          annualPrice: "139",
          annualMonthly: "11.58",
          features: [
            "All Shared Basic features",
            "Clinic booking link",
            "Payments management",
            "WhatsApp messaging",
            "Appointment reminders",
            "Up to 400 patients",
            "Up to 3 doctors",
          ],
        },
        {
          icon: "🚀",
          name: "Shared Comprehensive",
          monthlyPrice: "21.99",
          annualPrice: "219",
          annualMonthly: "18.25",
          features: [
            "All Shared Professional features",
            "Patient follow-up",
            "Daily reports",
            "Patient portal",
            "Prescriptions",
            "Unlimited patients",
            "Up to 5 doctors",
            "Priority support",
            "Custom doctor count",
          ],
        },
      ],
    },
    howItWorks: {
      title: "How Does NABD Work?",
      subtitle: "Four simple steps to start managing your clinic",
      steps: [
        {
          num: "1",
          title: "Login",
          desc: "Get your credentials from the provider and log in securely.",
        },
        {
          num: "2",
          title: "Add Your Patients",
          desc: "Easily enter patient information and start managing their records.",
        },
        {
          num: "3",
          title: "Organize Appointments",
          desc: "Schedule appointments, receive alerts, and track payments.",
        },
        {
          num: "4",
          title: "Remind via WhatsApp",
          desc: "Send an instant WhatsApp reminder to patients before their appointment — right from the app.",
          whatsapp: true,
        },
      ],
    },
    cta: {
      title: "Ready to Upgrade Your Clinic?",
      subtitle: "Join the clinics that trust NABD for daily management",
      btn: "Contact Us on WhatsApp",
    },
    why: {
      title: "Why",
      titleHighlight: "NABD?",
      subtitle: "The difference between paper records and a system that works with you",
      paper: "The old way",
      nabd: "With NABD",
      rows: [
        { paper: "Paper records get lost and damaged", nabd: "Secure digital records that last forever" },
        { paper: "Conflicting appointments, waiting patients", nabd: "Smart calendar with automatic alerts" },
        { paper: "Phone calls to remind every patient", nabd: "One-tap WhatsApp reminders" },
        { paper: "End-of-month math on a calculator", nabd: "Live revenue & expense tracking" },
        { paper: "Patients know nothing about their status", nabd: "A personal portal for every patient" },
      ],
    },
    security: {
      title: "Your Patients' Data is a",
      titleHighlight: "Trust",
      subtitle: "We handle medical data with the highest protection standards",
      items: [
        { icon: "🔐", title: "Fully encrypted connection", desc: "All data travels over encrypted HTTPS from your device to the server." },
        { icon: "🗄️", title: "Continuous backups", desc: "Your data lives on trusted cloud infrastructure with ongoing backups." },
        { icon: "👤", title: "Strict access control", desc: "Every clinic is fully isolated — no one can see anyone else's data." },
        { icon: "📤", title: "Your data is yours", desc: "Export your complete data anytime in a portable format." },
      ],
    },
    testimonials: {
      title: "What Do",
      titleHighlight: "Doctors Say?",
      subtitle: "From clinics using NABD every day",
      items: [
        { quote: "Before NABD I wasted so much time organizing appointments. Now everything is on one screen, and WhatsApp reminders noticeably reduced no-shows.", name: "Dr. M. Alkhatib", role: "Dentistry" },
        { quote: "What I love most is payment tracking — I know my clinic's revenue in real time, no notebooks, no end-of-month math.", name: "Dr. R. Suleiman", role: "General Medicine" },
        { quote: "The patient portal saved me dozens of calls. Patients follow their status and prescriptions from their own link.", name: "Dr. A. Haddad", role: "Dermatology" },
      ],
    },
    faq: {
      title: "Frequently Asked",
      titleHighlight: "Questions",
      subtitle: "Everything you want to know before starting",
      items: [
        { q: "Is my patients' data safe?", a: "Yes. Data is encrypted in transit and stored on trusted cloud infrastructure, with every clinic fully isolated under strict access rules." },
        { q: "Do I need technical skills to use NABD?", a: "Not at all. If you can use WhatsApp, you can use NABD. We also provide onboarding help and direct support." },
        { q: "Does it work on mobile?", a: "Yes — NABD works on mobile, desktop, and tablet right from the browser, and can be installed as an app on your home screen." },
        { q: "What happens to my data if I cancel?", a: "Your data stays yours — you can export everything before canceling, and nothing is deleted without your knowledge." },
        { q: "Can multiple doctors share one clinic?", a: "Yes, shared plans support up to 5 doctors per clinic with patients assigned to each doctor." },
        { q: "How do I start?", a: "Try the free demo, and when you're ready, contact us on WhatsApp to activate your account within minutes." },
      ],
    },
    cookie: {
      text: "We use only essential cookies to run the site and keep you signed in — no ads, no tracking.",
      link: "Privacy Policy",
      btn: "Got it",
    },
    footer: {
      tagline: "Your Clinic's Pulse in Your Hands",
      copy: "© 2026 NABD. All rights reserved.",
      links: { features: "Features", pricing: "Pricing", faq: "FAQ", privacy: "Privacy Policy", contact: "Contact Us" },
    },
  },
};

export default function LandingPage() {
  const [lang, setLang] = useState("ar");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showCookie, setShowCookie] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("nabd_cookie_ok")) setShowCookie(true); } catch { /* ignore */ }
  }, []);
  const acceptCookies = () => {
    try { localStorage.setItem("nabd_cookie_ok", "1"); } catch { /* ignore */ }
    setShowCookie(false);
  };
  const [scrolled, setScrolled] = useState(false);
  const [pricingAnnual, setPricingAnnual] = useState(false);
  const [planTab, setPlanTab] = useState<"individual" | "shared">("individual");
  const t = translations[lang];
  const isAr = lang === "ar";

  // تحويل تلقائي للـ dashboard إذا كانت هناك جلسة محفوظة (مهم للـ PWA)
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        const meta = session.user?.user_metadata;
        if (meta?.account_type === "pharmacy") {
          window.location.replace("/pharmacy");
        } else {
          window.location.replace("/dashboard");
        }
      });
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --primary: #0863ba;
          --primary-light: #a4c4e4;
          --bg: #f2f2f2;
          --dark: #353535;
          --accent: #ffb5b5;
          --white: #ffffff;
          --wa: #25D366;
          --shadow: 0 4px 24px rgba(8,99,186,0.10);
          --shadow-lg: 0 8px 48px rgba(8,99,186,0.16);
        }

        body {
          font-family: 'Rubik', sans-serif;
          background: var(--bg);
          color: var(--dark);
          direction: ${isAr ? "rtl" : "ltr"};
        }

        /* ── NAVBAR ── */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 16px 40px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
        }
        .nav.scrolled {
          background: rgba(242,242,242,0.95);
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 20px rgba(8,99,186,0.08);
          padding: 12px 40px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 40px; height: 40px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .nav-logo-text {
          font-size: 22px; font-weight: 700; color: var(--primary);
          letter-spacing: -0.5px;
        }
        .nav-logo-sub {
          font-size: 11px; color: #888; font-weight: 400;
          display: block; line-height: 1;
        }
        .nav-links {
          display: flex; align-items: center; gap: 8px;
          list-style: none;
        }
        .nav-links a {
          text-decoration: none; color: var(--dark);
          font-size: 15px; font-weight: 500;
          padding: 8px 16px; border-radius: 8px;
          transition: all 0.2s;
        }
        .nav-links a:hover { background: var(--primary-light); color: var(--primary); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .lang-toggle {
          background: var(--white); border: 1.5px solid var(--primary-light);
          color: var(--primary); border-radius: 8px;
          padding: 7px 14px; font-family: 'Rubik', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s;
        }
        .lang-toggle:hover { background: var(--primary); color: var(--white); }
        .nav-cta {
          background: var(--primary); color: var(--white) !important;
          border-radius: 10px; padding: 9px 22px !important;
          font-weight: 600; box-shadow: 0 4px 12px rgba(8,99,186,0.25);
          transition: all 0.2s !important;
        }
        .nav-cta:hover {
          background: #054a8c !important; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(8,99,186,0.35) !important;
        }

        /* ── HERO ── */
        .hero {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 120px 40px 80px;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 80% 60% at 60% -10%, rgba(8,99,186,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 10% 80%, rgba(164,196,228,0.15) 0%, transparent 60%);
        }
        .hero-blob {
          position: absolute;
          border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: 0;
          animation: floatBlob 8s ease-in-out infinite;
        }
        .hero-blob-1 { width: 500px; height: 500px; background: var(--primary); top: -100px; right: -100px; }
        .hero-blob-2 { width: 300px; height: 300px; background: var(--accent); bottom: 0; left: 10%; animation-delay: -4s; }
        @keyframes floatBlob {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.05); }
        }
        .hero-content {
          position: relative; z-index: 1;
          text-align: center; max-width: 760px;
          animation: heroFadeIn 0.8s ease both;
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(8,99,186,0.08); border: 1.5px solid rgba(8,99,186,0.15);
          color: var(--primary); padding: 8px 20px; border-radius: 100px;
          font-size: 13px; font-weight: 600; margin-bottom: 28px;
          animation: heroFadeIn 0.8s 0.1s ease both;
        }
        .hero-badge::before { content: ''; width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        .hero-title {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800; line-height: 1.15;
          color: var(--dark); margin-bottom: 20px;
          animation: heroFadeIn 0.8s 0.2s ease both;
        }
        .hero-title span { color: var(--primary); }
        .hero-subtitle {
          font-size: clamp(15px, 2vw, 18px); color: #666;
          line-height: 1.7; max-width: 560px; margin: 0 auto 40px;
          font-weight: 400;
          animation: heroFadeIn 0.8s 0.3s ease both;
        }
        .hero-btns {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          flex-wrap: wrap;
          animation: heroFadeIn 0.8s 0.4s ease both;
        }
        .btn-primary {
          background: var(--primary); color: var(--white);
          padding: 14px 36px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 600; border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(8,99,186,0.3);
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-primary:hover { background: #054a8c; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(8,99,186,0.4); }
        .btn-wa {
          background: var(--wa); color: var(--white);
          padding: 14px 36px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 600; border: none; cursor: pointer;
          box-shadow: 0 6px 24px rgba(37,211,102,0.35);
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 10px;
        }
        .btn-wa:hover { background: #1da851; transform: translateY(-2px); box-shadow: 0 10px 32px rgba(37,211,102,0.45); }
        /* ── Pulse divider (signature) ── */
        .pulse-divider { max-width: 900px; margin: 0 auto; padding: 10px 20px; }
        .pulse-divider svg { width: 100%; height: 44px; display: block; }
        .pulse-path { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: pulseDraw 3.2s ease-out forwards; }
        @keyframes pulseDraw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .pulse-path { animation: none; stroke-dashoffset: 0; } }

        /* ── Why NABD comparison ── */
        .why-section { padding: 90px 20px; background: var(--white); }
        .why-table { max-width: 860px; margin: 48px auto 0; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 44px rgba(8,99,186,.08); border: 1px solid #e8eef6; }
        .why-head { display: grid; grid-template-columns: 1fr 1fr; }
        .why-head > div { padding: 18px; text-align: center; font-weight: 800; font-size: 16px; }
        .why-head .wh-paper { background: #f4f6f9; color: #8a94a3; }
        .why-head .wh-nabd { background: linear-gradient(135deg,#0863ba,#5694cf); color: #fff; }
        .why-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #eef2f7; }
        .why-cell { padding: 18px 22px; font-size: 14.5px; line-height: 1.7; display: flex; align-items: center; gap: 10px; }
        .why-cell.paper { color: #98a1ae; background: #fbfcfe; }
        .why-cell.nabd { color: #2c3e50; font-weight: 600; }
        .why-cell .mark { flex-shrink: 0; font-size: 15px; }

        /* ── Security ── */
        .security-section { padding: 90px 20px; background: linear-gradient(180deg,#f4f8fd,#fff); }
        .security-grid { max-width: 1000px; margin: 48px auto 0; display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 20px; }
        .security-card { background: var(--white); border: 1px solid #e6eef8; border-radius: 18px; padding: 28px 22px; text-align: center; transition: all .25s; }
        .security-card:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(8,99,186,.1); border-color: #cfe0f3; }
        .security-icon { font-size: 34px; margin-bottom: 14px; }
        .security-title { font-size: 15.5px; font-weight: 800; color: #2c3e50; margin-bottom: 8px; }
        .security-desc { font-size: 13.5px; color: #7d8896; line-height: 1.8; }

        /* ── Testimonials ── */
        .testi-section { padding: 90px 20px; background: var(--white); }
        .testi-grid { max-width: 1080px; margin: 48px auto 0; display: grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap: 22px; }
        .testi-card { background: #f8fafd; border: 1px solid #e8eef6; border-radius: 20px; padding: 28px 24px; position: relative; }
        .testi-card::before { content: "“"; position: absolute; top: 8px; inset-inline-start: 18px; font-size: 64px; color: rgba(8,99,186,.12); font-family: Georgia, serif; line-height: 1; }
        .testi-quote { font-size: 14.5px; color: #3d4a5c; line-height: 2; margin: 18px 0 20px; position: relative; }
        .testi-person { display: flex; align-items: center; gap: 12px; }
        .testi-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,#0863ba,#5694cf); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
        .testi-name { font-size: 14px; font-weight: 800; color: #2c3e50; }
        .testi-role { font-size: 12.5px; color: #8a94a3; }

        /* ── FAQ ── */
        .faq-section { padding: 90px 20px; background: linear-gradient(180deg,#fff,#f4f8fd); }
        .faq-list { max-width: 760px; margin: 44px auto 0; display: flex; flex-direction: column; gap: 12px; }
        .faq-item { background: var(--white); border: 1px solid #e6eef8; border-radius: 16px; overflow: hidden; transition: border-color .2s; }
        .faq-item.open { border-color: #9dc0e8; box-shadow: 0 8px 26px rgba(8,99,186,.08); }
        .faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 22px; background: none; border: none; cursor: pointer; font-family: 'Rubik',sans-serif; font-size: 15px; font-weight: 700; color: #2c3e50; text-align: start; }
        .faq-q:focus-visible { outline: 2px solid #0863ba; outline-offset: -2px; }
        .faq-chev { flex-shrink: 0; transition: transform .25s; color: #0863ba; }
        .faq-item.open .faq-chev { transform: rotate(180deg); }
        .faq-a { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
        .faq-item.open .faq-a { max-height: 260px; }
        .faq-a p { margin: 0; padding: 0 22px 20px; font-size: 14px; color: #6b7684; line-height: 2; }

        /* ── Cookie bar ── */
        .cookie-bar { position: fixed; bottom: 16px; inset-inline: 16px; z-index: 10000; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dfe8f4; border-radius: 16px; box-shadow: 0 16px 48px rgba(15,40,80,.18); padding: 16px 20px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; animation: cookieUp .4s ease; }
        @keyframes cookieUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        .cookie-text { flex: 1 1 300px; font-size: 13px; color: #4b5563; line-height: 1.8; }
        .cookie-text a { color: #0863ba; font-weight: 700; text-decoration: none; }
        .cookie-btn { background: linear-gradient(135deg,#0863ba,#5694cf); color: #fff; border: none; border-radius: 10px; padding: 10px 22px; font-family: 'Rubik',sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }

        /* ── Footer links ── */
        .footer-links { display: flex; justify-content: center; gap: 22px; flex-wrap: wrap; margin: 6px 0 22px; }
        .footer-links a { color: rgba(255,255,255,.65); font-size: 13.5px; text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: #fff; }

        @media (max-width: 640px) {
          .why-cell { padding: 14px; font-size: 13px; }
          .why-head > div { font-size: 14px; padding: 14px; }
        }

        .btn-demo {
          background: linear-gradient(135deg,#0863ba,#5694cf); color: #fff;
          padding: 14px 32px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 700; border: none; cursor: pointer;
          transition: all 0.25s; display: inline-flex; align-items: center; gap: 8px;
          box-shadow: 0 6px 20px rgba(8,99,186,.3);
        }
        .btn-demo:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(8,99,186,.4); }

        .btn-secondary {
          background: var(--white); color: var(--dark);
          padding: 14px 32px; border-radius: 12px; font-family: 'Rubik',sans-serif;
          font-size: 16px; font-weight: 500; border: 1.5px solid #ddd; cursor: pointer;
          transition: all 0.25s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-secondary:hover { border-color: var(--primary-light); color: var(--primary); background: rgba(8,99,186,0.04); }

        /* Hero mockup */
        .hero-visual {
          position: relative; z-index: 1; margin-top: 60px;
          animation: heroFadeIn 0.8s 0.5s ease both;
        }
        .mockup-window {
          background: var(--white); border-radius: 20px;
          box-shadow: 0 20px 80px rgba(8,99,186,0.15), 0 4px 20px rgba(0,0,0,0.06);
          overflow: hidden; max-width: 700px; margin: 0 auto;
          border: 1px solid rgba(8,99,186,0.08);
        }
        .mockup-bar {
          background: #f7f9fc; padding: 12px 20px;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid #eee;
        }
        .mockup-dot { width: 12px; height: 12px; border-radius: 50%; }
        .mockup-body { padding: 24px; background: var(--bg); }
        .mockup-card {
          background: var(--white); border-radius: 12px; padding: 16px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .mockup-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; color: var(--white); flex-shrink: 0;
        }
        .mockup-info { flex: 1; }
        .mockup-name { font-size: 14px; font-weight: 600; color: var(--dark); }
        .mockup-detail { font-size: 12px; color: #999; margin-top: 2px; }
        .mockup-badge-green {
          background: #e6f4ea; color: #2e7d32; padding: 4px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .mockup-badge-blue {
          background: rgba(8,99,186,0.1); color: var(--primary); padding: 4px 10px;
          border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .mockup-stats-row { display: flex; gap: 12px; margin-bottom: 12px; }
        .mockup-stat {
          flex: 1; background: var(--white); border-radius: 12px; padding: 14px;
          text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .mockup-stat-val { font-size: 22px; font-weight: 800; color: var(--primary); }
        .mockup-stat-lbl { font-size: 11px; color: #999; margin-top: 2px; }

        /* ── STATS ── */
        .stats-section { padding: 0 40px 80px; position: relative; z-index: 1; }
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
          max-width: 900px; margin: 0 auto;
          background: var(--white); border-radius: 20px; padding: 10px;
          box-shadow: var(--shadow);
        }
        .stat-item {
          text-align: center; padding: 28px 20px;
          border-radius: 14px; transition: all 0.2s;
        }
        .stat-item:hover { background: rgba(8,99,186,0.04); }
        .stat-val { font-size: 36px; font-weight: 800; color: var(--primary); line-height: 1; font-variant-numeric: tabular-nums; }
        .stat-lbl { font-size: 14px; color: #888; margin-top: 8px; font-weight: 500; }

        /* ── FEATURES ── */
        .features-section { padding: 80px 40px; max-width: 1100px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 56px; }
        .section-title {
          font-size: clamp(28px, 4vw, 40px); font-weight: 800;
          color: var(--dark); margin-bottom: 14px;
        }
        .section-title span { color: var(--primary); }
        .section-sub { font-size: 16px; color: #888; max-width: 500px; margin: 0 auto; line-height: 1.6; }
        .features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .feature-card {
          background: var(--white); border-radius: 20px; padding: 32px 28px;
          box-shadow: var(--shadow); border: 1.5px solid transparent;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .feature-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 20px;
          background: linear-gradient(135deg, rgba(8,99,186,0.04), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .feature-card:hover { border-color: var(--primary-light); transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .feature-card:hover::before { opacity: 1; }
        .feature-card.wa-card { border-color: rgba(37,211,102,0.25); background: linear-gradient(135deg, #f0fff6, #fff); }
        .feature-card.wa-card:hover { border-color: var(--wa); box-shadow: 0 8px 40px rgba(37,211,102,0.15); }
        .feature-icon {
          font-size: 36px; margin-bottom: 20px;
          width: 64px; height: 64px; border-radius: 16px;
          background: rgba(8,99,186,0.08); display: flex; align-items: center; justify-content: center;
        }
        .feature-icon.wa-icon { background: rgba(37,211,102,0.12); }
        .feature-title { font-size: 18px; font-weight: 700; color: var(--dark); margin-bottom: 10px; }
        .feature-desc { font-size: 14px; color: #888; line-height: 1.7; }
        .wa-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(37,211,102,0.12); color: #1a9e4a;
          font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;
          margin-top: 12px;
        }

        /* ── PRICING ── */
        .pricing-section { padding: 80px 40px; max-width: 1100px; margin: 0 auto; }
        /* ── PRICING TOGGLE ── */
        .pricing-toggle {
          display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 48px;
        }
        .toggle-pill {
          display: flex; align-items: center;
          background: #eef2f8; border-radius: 40px; padding: 4px;
          gap: 2px; cursor: pointer; user-select: none;
        }
        .toggle-pill-option {
          padding: 8px 22px; border-radius: 32px;
          font-size: 14px; font-weight: 600; color: #888;
          transition: all 0.25s ease; white-space: nowrap;
        }
        .toggle-pill-option.active {
          background: var(--primary); color: #fff;
          box-shadow: 0 4px 14px rgba(8,99,186,0.28);
        }
        .pricing-save-badge {
          background: #e8f5e9; color: #2e7d32;
          font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 20px;
          margin-inline-start: 4px;
        }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .pricing-card {
          background: var(--white); border-radius: 24px; padding: 36px 28px;
          box-shadow: var(--shadow); border: 2px solid transparent;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
        .pricing-card.popular {
          border-color: var(--primary);
          background: linear-gradient(160deg, #fff 60%, rgba(8,99,186,0.04) 100%);
        }
        .popular-badge {
          position: absolute; top: 20px;
          ${isAr ? "left" : "right"}: 20px;
          background: var(--primary); color: #fff;
          font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px;
        }
        .pricing-icon { font-size: 32px; margin-bottom: 12px; }
        .pricing-name { font-size: 20px; font-weight: 800; color: var(--dark); margin-bottom: 8px; }
        .pricing-price { margin-bottom: 24px; }
        .pricing-amount { font-size: 38px; font-weight: 800; color: var(--primary); line-height: 1; }
        .pricing-period { font-size: 14px; color: #999; margin-top: 4px; }
        .pricing-annual { font-size: 13px; color: #aaa; margin-top: 4px; text-decoration: line-through; }
        .pricing-annual-save { font-size: 13px; color: #2e7d32; font-weight: 600; margin-top: 2px; }
        .pricing-divider { height: 1px; background: #f0f0f0; margin-bottom: 20px; }
        .pricing-features { list-style: none; margin-bottom: 28px; }
        .pricing-features li {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: #555; margin-bottom: 10px; line-height: 1.5;
        }
        .pricing-check {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(8,99,186,0.1); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; flex-shrink: 0; margin-top: 1px;
        }
        .pricing-card.popular .pricing-check { background: rgba(8,99,186,0.15); }
        .pricing-btn {
          width: 100%; padding: 13px; border-radius: 12px;
          font-family: 'Rubik', sans-serif; font-size: 15px; font-weight: 700;
          cursor: pointer; border: none; transition: all 0.25s;
          text-decoration: none; display: block; text-align: center;
        }
        .pricing-btn-outline {
          background: transparent; color: var(--primary);
          border: 2px solid var(--primary-light);
        }
        .pricing-btn-outline:hover { background: rgba(8,99,186,0.06); border-color: var(--primary); }
        .pricing-btn-primary {
          background: var(--primary); color: #fff;
          box-shadow: 0 6px 20px rgba(8,99,186,0.3);
        }
        .pricing-btn-primary:hover { background: #054a8c; transform: translateY(-1px); box-shadow: 0 10px 28px rgba(8,99,186,0.4); }

        /* ── HOW IT WORKS ── */
        .hiw-section { padding: 80px 40px; background: var(--white); }
        .hiw-inner { max-width: 1000px; margin: 0 auto; }
        .hiw-steps {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px;
          margin-top: 56px;
        }
        .hiw-step { text-align: center; position: relative; }
        .hiw-step:not(:last-child)::after {
          content: '→';
          position: absolute; top: 30px;
          ${isAr ? "left" : "right"}: -20px;
          font-size: 20px; color: var(--primary-light);
        }
        .hiw-num {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--primary); color: var(--white);
          font-size: 24px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px; box-shadow: 0 8px 24px rgba(8,99,186,0.25);
        }
        .hiw-num.wa-num {
          background: var(--wa); box-shadow: 0 8px 24px rgba(37,211,102,0.3);
        }
        .hiw-title { font-size: 16px; font-weight: 700; color: var(--dark); margin-bottom: 10px; }
        .hiw-desc { font-size: 13px; color: #888; line-height: 1.7; }
        .hiw-wa-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(37,211,102,0.1); color: #1a9e4a;
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
          margin-top: 10px;
        }

        /* ── CTA ── */
        .cta-section {
          padding: 100px 40px;
          background: linear-gradient(135deg, var(--primary) 0%, #054a8c 100%);
          text-align: center; position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: ''; position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .cta-content { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
        .cta-title { font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: var(--white); margin-bottom: 16px; }
        .cta-sub { font-size: 17px; color: rgba(255,255,255,0.8); margin-bottom: 40px; line-height: 1.6; }

        /* ── FOOTER ── */
        .footer {
          background: var(--dark); color: rgba(255,255,255,0.7);
          padding: 40px; text-align: center;
        }
        .footer-logo { font-size: 24px; font-weight: 800; color: var(--white); margin-bottom: 8px; display:flex; align-items:center; justify-content:center; gap:10px; }
        .footer-tagline { font-size: 14px; margin-bottom: 20px; }
        .footer-copy { font-size: 13px; color: rgba(255,255,255,0.4); }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .hiw-steps { grid-template-columns: repeat(2, 1fr); }
          .hiw-step:nth-child(2)::after { display: none; }
          .hiw-step:nth-child(4)::after { display: none; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
          .pricing-grid { grid-template-columns: 1fr; max-width: 420px; margin: 0 auto; }
        }
        @media (max-width: 768px) {
          .nav { padding: 14px 20px; }
          .nav.scrolled { padding: 10px 20px; }
          .nav-links { display: none; }
          .hero { padding: 100px 20px 60px; }
          .stats-grid { grid-template-columns: repeat(2,1fr); }
          .features-grid { grid-template-columns: 1fr; }
          .hiw-steps { grid-template-columns: 1fr; gap: 24px; }
          .hiw-step::after { display: none !important; }
          .stats-section { padding: 0 20px 60px; }
          .features-section { padding: 60px 20px; }
          .pricing-section { padding: 60px 20px; }
          .mockup-stats-row { flex-direction: column; }
        }
      `}</style>

      <div style={{ fontFamily: "'Rubik', sans-serif", direction: isAr ? "rtl" : "ltr" }}>

        {/* ── NAVBAR ── */}
        <nav className={`nav${scrolled ? " scrolled" : ""}`}>
          {/* Fix 4: SVG Logo */}
          <a href="#" className="nav-logo">
            <div className="nav-logo-icon">{LOGO_SVG}</div>
            <div>
              <span className="nav-logo-text">{isAr ? "نبض" : "NABD"}</span>
              <span className="nav-logo-sub">Clinic Manager</span>
            </div>
          </a>
          <ul className="nav-links">
            <li><a href="#features">{t.nav.features}</a></li>
            <li><a href="#pricing">{t.nav.pricing}</a></li>
            <li><a href="#how">{t.nav.about}</a></li>
            <li><a href="#cta">{t.nav.contact}</a></li>
          </ul>
          <div className="nav-right">
            <button className="lang-toggle" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              {lang === "ar" ? "EN" : "عر"}
            </button>
            <a href="/login" style={{ textDecoration: "none" }}>
              <span className="nav-cta" style={{
                background: "var(--primary)", color: "#fff", borderRadius: "10px",
                padding: "9px 22px", fontWeight: 600, fontSize: 15,
                boxShadow: "0 4px 12px rgba(8,99,186,0.25)", display: "inline-block"
              }}>
                {t.nav.login}
              </span>
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-blob hero-blob-1" />
          <div className="hero-blob hero-blob-2" />
          <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="hero-content">
              <div className="hero-badge">
                <span></span>
                {t.hero.badge}
              </div>
              <h1 className="hero-title">
                {t.hero.title1}<br />
                <span>{t.hero.title2}</span>
              </h1>
              <p className="hero-subtitle">{t.hero.subtitle}</p>
              <div className="hero-btns">
                {/* Fix 5: WhatsApp link for "ابدأ الآن" */}
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-wa">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  {t.hero.cta}
                </a>
                <button
                  className="btn-demo"
                  onClick={() => { startDemo(); window.location.href = "/dashboard"; }}
                >
                  🧪 {lang === "ar" ? "جرّب نبض الآن مجاناً" : "Try NABD Now — Free"}
                </button>
                {/* Fix 6: YouTube placeholder link */}
                <a href={YT_LINK} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>
                  </svg>
                  {t.hero.demo}
                </a>
              </div>
            </div>

            {/* Mockup */}
            <div className="hero-visual">
              <div className="mockup-window">
                <div className="mockup-bar">
                  <div className="mockup-dot" style={{ background: "#ff5f57" }} />
                  <div className="mockup-dot" style={{ background: "#ffbd2e" }} />
                  <div className="mockup-dot" style={{ background: "#28c840" }} />
                  <div style={{ flex: 1, height: 20, background: "#eee", borderRadius: 6, marginLeft: 12, marginRight: 12 }} />
                </div>
                <div className="mockup-body">
                  <div className="mockup-stats-row">
                    <div className="mockup-stat">
                      <div className="mockup-stat-val">24</div>
                      <div className="mockup-stat-lbl">{isAr ? "موعد اليوم" : "Today's Appts"}</div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-val">142</div>
                      <div className="mockup-stat-lbl">{isAr ? "مريض مسجل" : "Patients"}</div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-val" style={{ color: "#2e7d32" }}>3,200</div>
                      <div className="mockup-stat-lbl">{isAr ? "إيرادات الشهر" : "Monthly Revenue"}</div>
                    </div>
                  </div>
                  {[
                    { initials: "KO", color: "#0863ba", name: isAr ? "خالد عثمان" : "Khalid Othman",   detail: isAr ? "10:00 صباحاً • متابعة"   : "10:00 AM • Follow-up", badge: "scheduled" },
                    { initials: "FH", color: "#2e7d32", name: isAr ? "فاطمة حسن" : "Fatima Hassan",    detail: isAr ? "11:30 صباحاً • فحص عام"  : "11:30 AM • General",   badge: "paid" },
                    { initials: "AA", color: "#c0392b", name: isAr ? "أحمد علي"   : "Ahmed Ali",        detail: isAr ? "2:00 مساءً • سكري"       : "2:00 PM • Diabetes",   badge: "scheduled" },
                  ].map((p) => (
                    <div className="mockup-card" key={p.initials}>
                      <div className="mockup-avatar" style={{ background: p.color }}>{p.initials}</div>
                      <div className="mockup-info">
                        <div className="mockup-name">{p.name}</div>
                        <div className="mockup-detail">{p.detail}</div>
                      </div>
                      <div className={p.badge === "paid" ? "mockup-badge-green" : "mockup-badge-blue"}>
                        {p.badge === "paid" ? (isAr ? "مدفوع" : "Paid") : (isAr ? "محدد" : "Scheduled")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS — Fix 2: English numbers ── */}
        <div className="stats-section">
          <div className="stats-grid">
            {t.stats.map((s, i) => (
              <div className="stat-item" key={i}>
                <div className="stat-val">{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES — Fix 1: span bug fixed | Fix 7: WhatsApp card ── */}
        <section className="features-section" id="features">
          <div className="section-header">
            {/* Fix 1: title split into plain text + highlighted word — no dangerouslySetInnerHTML */}
            <h2 className="section-title">
              {t.features.title} <span>{t.features.titleHighlight}</span>
            </h2>
            <p className="section-sub">{t.features.subtitle}</p>
          </div>
          <div className="features-grid">
            {t.features.items.map((f: any, i) => (
              <div className={`feature-card${f.whatsapp ? " wa-card" : ""}`} key={i}>
                <div className={`feature-icon${f.whatsapp ? " wa-icon" : ""}`}><AppIcon glyph={f.icon} /></div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                {f.whatsapp && (
                  <div className="wa-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                    WhatsApp
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <PulseDivider />

        {/* ── WHY NABD ── */}
        <section className="why-section" id="why">
          <div className="section-header">
            <h2 className="section-title">{t.why.title} <span>{t.why.titleHighlight}</span></h2>
            <p className="section-subtitle">{t.why.subtitle}</p>
          </div>
          <div className="why-table">
            <div className="why-head">
              <div className="wh-paper">{t.why.paper}</div>
              <div className="wh-nabd">{t.why.nabd}</div>
            </div>
            {t.why.rows.map((r, i) => (
              <div className="why-row" key={i}>
                <div className="why-cell paper"><span className="mark">✕</span>{r.paper}</div>
                <div className="why-cell nabd"><span className="mark">✓</span>{r.nabd}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECURITY ── */}
        <section className="security-section" id="security">
          <div className="section-header">
            <h2 className="section-title">{t.security.title} <span>{t.security.titleHighlight}</span></h2>
            <p className="section-subtitle">{t.security.subtitle}</p>
          </div>
          <div className="security-grid">
            {t.security.items.map((it, i) => (
              <div className="security-card" key={i}>
                <div className="security-icon">{it.icon}</div>
                <div className="security-title">{it.title}</div>
                <div className="security-desc">{it.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <PulseDivider />

        <section className="pricing-section" id="pricing">
          <div className="section-header">
            <h2 className="section-title">
              {t.pricing.title} <span>{t.pricing.titleHighlight}</span>
            </h2>
            <p className="section-sub">{t.pricing.subtitle}</p>
          </div>
          <div className="pricing-toggle">
            <div className="toggle-pill">
              <div
                className={`toggle-pill-option${planTab === "individual" ? " active" : ""}`}
                onClick={() => setPlanTab("individual")}
              >
                {t.pricing.individualTab}
              </div>
              <div
                className={`toggle-pill-option${planTab === "shared" ? " active" : ""}`}
                onClick={() => setPlanTab("shared")}
              >
                {t.pricing.sharedTab}
              </div>
            </div>
          </div>
          <div className="pricing-toggle">
            <div className="toggle-pill">
              <div
                className={`toggle-pill-option${!pricingAnnual ? " active" : ""}`}
                onClick={() => setPricingAnnual(false)}
              >
                {t.pricing.monthly}
              </div>
              <div
                className={`toggle-pill-option${pricingAnnual ? " active" : ""}`}
                onClick={() => setPricingAnnual(true)}
              >
                {t.pricing.annual}
              </div>
            </div>
            {pricingAnnual && <span className="pricing-save-badge">{t.pricing.save}</span>}
          </div>
          <div className="pricing-grid">
            {(planTab === "individual" ? t.pricing.individualPlans : t.pricing.sharedPlans).map((plan: any, i: number) => (
              <div className={`pricing-card${plan.popular ? " popular" : ""}`} key={i}>
                {plan.popular && <div className="popular-badge"><AppIcon glyph="⭐" /> {isAr ? "الأكثر طلباً" : "Most Popular"}</div>}
                <div className="pricing-icon"><AppIcon glyph={plan.icon} /></div>
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  <div className="pricing-amount">
                    {pricingAnnual ? plan.annualPrice : plan.monthlyPrice}
                    <span style={{ fontSize: 16, fontWeight: 500, color: "#999" }}>
                      {pricingAnnual
                        ? (isAr ? " $ / سنة" : " $ / yr")
                        : (isAr ? " $ / شهر" : " $ / mo")}
                    </span>
                  </div>
                  {pricingAnnual ? (
                    <div className="pricing-annual-save">
                      {isAr ? "شهران مجاناً مقارنةً بالاشتراك الشهري" : "2 months free vs monthly billing"}
                    </div>
                  ) : (
                    <div className="pricing-period">
                      {isAr ? "اشترك سنوياً وادفع أقل — شهران مجاناً" : "Go annual and save — 2 months free"}
                    </div>
                  )}
                </div>
                <div className="pricing-divider" />
                <ul className="pricing-features">
                  {plan.features.map((f: string, j: number) => (
                    <li key={j}>
                      <div className="pricing-check">✓</div>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className={`pricing-btn${plan.popular ? " pricing-btn-primary" : " pricing-btn-outline"}`}>
                  {t.pricing.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS — Fix 3: 4th WhatsApp step ── */}
        {/* ── TESTIMONIALS ── */}
        <section className="testi-section" id="testimonials">
          <div className="section-header">
            <h2 className="section-title">{t.testimonials.title} <span>{t.testimonials.titleHighlight}</span></h2>
            <p className="section-subtitle">{t.testimonials.subtitle}</p>
          </div>
          <div className="testi-grid">
            {t.testimonials.items.map((it, i) => (
              <div className="testi-card" key={i}>
                <p className="testi-quote">{it.quote}</p>
                <div className="testi-person">
                  <div className="testi-avatar">{it.name.replace(/^(د\.|Dr\.)\s*/, "").charAt(0)}</div>
                  <div>
                    <div className="testi-name">{it.name}</div>
                    <div className="testi-role">{it.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hiw-section" id="how">
          <div className="hiw-inner">
            <div className="section-header">
              <h2 className="section-title">{t.howItWorks.title}</h2>
              <p className="section-sub">{t.howItWorks.subtitle}</p>
            </div>
            <div className="hiw-steps">
              {t.howItWorks.steps.map((s: any, i) => (
                <div className="hiw-step" key={i}>
                  <div className={`hiw-num${s.whatsapp ? " wa-num" : ""}`}>{s.num}</div>
                  <h3 className="hiw-title">{s.title}</h3>
                  <p className="hiw-desc">{s.desc}</p>
                  {s.whatsapp && (
                    <div className="hiw-wa-tag">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                      </svg>
                      WhatsApp
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <PulseDivider />

        {/* ── FAQ ── */}
        <section className="faq-section" id="faq">
          <div className="section-header">
            <h2 className="section-title">{t.faq.title} <span>{t.faq.titleHighlight}</span></h2>
            <p className="section-subtitle">{t.faq.subtitle}</p>
          </div>
          <div className="faq-list">
            {t.faq.items.map((it, i) => (
              <div className={openFaq === i ? "faq-item open" : "faq-item"} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {it.q}
                  <svg className="faq-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div className="faq-a"><p>{it.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-section" id="cta">
          <div className="cta-content">
            <h2 className="cta-title">{t.cta.title}</h2>
            <p className="cta-sub">{t.cta.subtitle}</p>
            {/* Fix 5: WhatsApp CTA */}
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="btn-wa">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.093.542 4.063 1.497 5.774L0 24l6.414-1.493A11.928 11.928 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.192-1.424l-.374-.22-3.808.887.906-3.719-.243-.388A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              {t.cta.btn}
            </a>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-logo">
            <div style={{ width: 32, height: 32 }}>{LOGO_SVG}</div>
            {isAr ? "نبض" : "NABD"}
          </div>
          <p className="footer-tagline">{t.footer.tagline}</p>
          <div className="footer-links">
            <a href="#features">{t.footer.links.features}</a>
            <a href="#pricing">{t.footer.links.pricing}</a>
            <a href="#faq">{t.footer.links.faq}</a>
            <a href="/privacy-policy">{t.footer.links.privacy}</a>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer">{t.footer.links.contact}</a>
          </div>
          <p className="footer-copy">{t.footer.copy}</p>
        </footer>

        {/* ── Cookie consent ── */}
        {showCookie && (
          <div className="cookie-bar" role="dialog" aria-label="cookies">
            <div className="cookie-text">
              🍪 {t.cookie.text}{" "}
              <a href="/privacy-policy">{t.cookie.link}</a>
            </div>
            <button className="cookie-btn" onClick={acceptCookies}>{t.cookie.btn}</button>
          </div>
        )}

      </div>
    </>
  );
}