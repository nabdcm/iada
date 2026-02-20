"use client";

import { useState, useEffect } from "react";

// ============================================================
// NABD - نبض | Dashboard Page
// يشمل: Sidebar مشتركة + لوحة الإحصائيات + النشاطات + المواعيد
// ============================================================

const t = {
  ar: {
    appName: "نبض",
    appSub: "إدارة العيادة",
    nav: {
      dashboard: "الرئيسية",
      patients: "المرضى",
      appointments: "المواعيد",
      payments: "المدفوعات",
      settings: "الإعدادات",
      admin: "لوحة المدير",
    },
    header: {
      greeting_morning: "صباح الخير",
      greeting_afternoon: "مساء الخير",
      greeting_evening: "مساء النور",
      subtitle: "إليك ملخص نشاط العيادة اليوم",
      search: "بحث...",
    },
    stats: {
      todayAppointments: "مواعيد اليوم",
      totalPatients: "إجمالي المرضى",
      monthRevenue: "إيرادات الشهر",
      pendingPayments: "مدفوعات معلّقة",
      completed: "مكتمل",
      remaining: "متبقي",
      newThisMonth: "جديد هذا الشهر",
      vs_last: "مقارنةً بالشهر الماضي",
      unpaid: "غير مسدّد",
    },
    quickActions: {
      title: "إجراءات سريعة",
      newAppointment: "موعد جديد",
      addPatient: "إضافة مريض",
      recordPayment: "تسجيل دفعة",
      viewReports: "عرض التقارير",
    },
    todaySchedule: {
      title: "مواعيد اليوم",
      viewAll: "عرض الكل",
      noAppointments: "لا توجد مواعيد اليوم",
      statuses: {
        scheduled: "محدد",
        completed: "مكتمل",
        cancelled: "ملغي",
        "no-show": "لم يحضر",
      },
    },
    recentActivity: {
      title: "النشاط الأخير",
      viewAll: "عرض الكل",
    },
    topPatients: {
      title: "أكثر المرضى زيارةً",
      visits: "زيارة",
    },
    weekChart: {
      title: "المواعيد هذا الأسبوع",
      days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    },
    signOut: "تسجيل الخروج",
    clinic: "العيادة",
  },
  en: {
    appName: "NABD",
    appSub: "Clinic Manager",
    nav: {
      dashboard: "Dashboard",
      patients: "Patients",
      appointments: "Appointments",
      payments: "Payments",
      settings: "Settings",
      admin: "Admin Panel",
    },
    header: {
      greeting_morning: "Good Morning",
      greeting_afternoon: "Good Afternoon",
      greeting_evening: "Good Evening",
      subtitle: "Here's your clinic activity summary for today",
      search: "Search...",
    },
    stats: {
      todayAppointments: "Today's Appointments",
      totalPatients: "Total Patients",
      monthRevenue: "Monthly Revenue",
      pendingPayments: "Pending Payments",
      completed: "Completed",
      remaining: "Remaining",
      newThisMonth: "New this month",
      vs_last: "vs last month",
      unpaid: "Unpaid",
    },
    quickActions: {
      title: "Quick Actions",
      newAppointment: "New Appointment",
      addPatient: "Add Patient",
      recordPayment: "Record Payment",
      viewReports: "View Reports",
    },
    todaySchedule: {
      title: "Today's Schedule",
      viewAll: "View All",
      noAppointments: "No appointments today",
      statuses: {
        scheduled: "Scheduled",
        completed: "Completed",
        cancelled: "Cancelled",
        "no-show": "No Show",
      },
    },
    recentActivity: {
      title: "Recent Activity",
      viewAll: "View All",
    },
    topPatients: {
      title: "Most Visited Patients",
      visits: "visits",
    },
    weekChart: {
      title: "Appointments This Week",
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    signOut: "Sign Out",
    clinic: "Clinic",
  },
};

// ── بيانات تجريبية ──
const MOCK_APPOINTMENTS = [
  { id: 1, patientName: "خالد عثمان / Khalid Othman", patientInitials: "KO", color: "#0863ba", time: "09:00", duration: 30, type: "متابعة / Follow-up", status: "completed" },
  { id: 2, patientName: "فاطمة حسن / Fatima Hassan", patientInitials: "FH", color: "#2e7d32", time: "10:30", duration: 45, type: "فحص عام / General", status: "completed" },
  { id: 3, patientName: "أحمد علي / Ahmed Ali", patientInitials: "AA", color: "#c0392b", time: "12:00", duration: 30, type: "سكري / Diabetes", status: "scheduled" },
  { id: 4, patientName: "مريم سالم / Mariam Salem", patientInitials: "MS", color: "#7b2d8b", time: "14:00", duration: 60, type: "استشارة / Consultation", status: "scheduled" },
  { id: 5, patientName: "يوسف ناصر / Yousef Nasser", patientInitials: "YN", color: "#e67e22", time: "15:30", duration: 30, type: "متابعة / Follow-up", status: "scheduled" },
];

const MOCK_ACTIVITY = [
  { id: 1, icon: "👤", textAr: "تم إضافة مريض جديد: فاطمة حسن", textEn: "New patient added: Fatima Hassan", time: "منذ ١٠ دقائق / 10 min ago", color: "#0863ba" },
  { id: 2, icon: "💳", textAr: "تم استلام دفعة ٢٠٠$ من خالد عثمان", textEn: "Payment of $200 received from Khalid Othman", time: "منذ ٣٥ دقيقة / 35 min ago", color: "#2e7d32" },
  { id: 3, icon: "📅", textAr: "تم تأكيد موعد أحمد علي - ١٢:٠٠", textEn: "Appointment confirmed for Ahmed Ali - 12:00", time: "منذ ساعة / 1 hour ago", color: "#e67e22" },
  { id: 4, icon: "✅", textAr: "اكتمل موعد فاطمة حسن", textEn: "Fatima Hassan's appointment completed", time: "منذ ساعتين / 2 hours ago", color: "#2e7d32" },
  { id: 5, icon: "❌", textAr: "تم إلغاء موعد مريم سالم", textEn: "Mariam Salem's appointment cancelled", time: "أمس / Yesterday", color: "#c0392b" },
];

const MOCK_TOP_PATIENTS = [
  { name: "خالد عثمان / Khalid Othman", initials: "KO", color: "#0863ba", visits: 12 },
  { name: "أحمد علي / Ahmed Ali", initials: "AA", color: "#c0392b", visits: 9 },
  { name: "فاطمة حسن / Fatima Hassan", initials: "FH", color: "#2e7d32", visits: 7 },
  { name: "مريم سالم / Mariam Salem", initials: "MS", color: "#7b2d8b", visits: 5 },
];

const WEEK_DATA = [3, 7, 5, 9, 6, 4, 2];

// ── Helper: تحديد التحية حسب الوقت ──
function getGreetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "greeting_morning";
  if (h < 17) return "greeting_afternoon";
  return "greeting_evening";
}

// ── مكوّن: Sidebar ──
function Sidebar({ lang, setLang, activePage = "dashboard" }) {
  const tr = t[lang];
  const isAr = lang === "ar";
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { key: "dashboard", icon: "⊞", label: tr.nav.dashboard, href: "/dashboard" },
    { key: "patients", icon: "👥", label: tr.nav.patients, href: "/patients" },
    { key: "appointments", icon: "📅", label: tr.nav.appointments, href: "/appointments" },
    { key: "payments", icon: "💳", label: tr.nav.payments, href: "/payments" },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 70 : 240,
        minHeight: "100vh",
        background: "#fff",
        borderRight: isAr ? "none" : "1.5px solid #eef0f3",
        borderLeft: isAr ? "1.5px solid #eef0f3" : "none",
        display: "flex", flexDirection: "column",
        transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
        position: "fixed", top: 0,
        [isAr ? "right" : "left"]: 0,
        zIndex: 50,
        boxShadow: "4px 0 24px rgba(8,99,186,0.06)",
      }}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? "24px 0" : "24px 20px",
        borderBottom: "1.5px solid #eef0f3",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        minHeight: 72,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, background: "#0863ba",
              borderRadius: 10, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18,
              boxShadow: "0 4px 12px rgba(8,99,186,0.25)",
            }}>💗</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0863ba", lineHeight: 1.1 }}>{tr.appName}</div>
              <div style={{ fontSize: 10, color: "#aaa", fontWeight: 400 }}>{tr.appSub}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{
            width: 38, height: 38, background: "#0863ba",
            borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18,
          }}>💗</div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 16, color: "#aaa", padding: 4,
            display: collapsed ? "none" : "flex",
          }}
        >
          {isAr ? "›" : "‹"}
        </button>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map((item) => {
          const isActive = item.key === activePage;
          return (
            <a
              key={item.key}
              href={item.href}
              style={{
                display: "flex", alignItems: "center",
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "12px 0" : "11px 14px",
                borderRadius: 10, marginBottom: 4,
                textDecoration: "none",
                background: isActive ? "rgba(8,99,186,0.08)" : "transparent",
                color: isActive ? "#0863ba" : "#666",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: "all 0.18s",
                position: "relative",
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute",
                  [isAr ? "right" : "left"]: -12,
                  top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 24,
                  background: "#0863ba", borderRadius: 10,
                }} />
              )}
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}

        <div style={{ height: 1, background: "#eef0f3", margin: "12px 0" }} />

        {/* Admin */}
        <a href="/admin" style={{
          display: "flex", alignItems: "center",
          gap: collapsed ? 0 : 12,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "12px 0" : "11px 14px",
          borderRadius: 10, marginBottom: 4,
          textDecoration: "none", color: "#888", fontSize: 14,
        }}>
          <span style={{ fontSize: 18 }}>⚙️</span>
          {!collapsed && <span>{tr.nav.admin}</span>}
        </a>
      </nav>

      {/* Bottom: User + Lang */}
      <div style={{ padding: "16px 12px", borderTop: "1.5px solid #eef0f3" }}>
        {/* Language Toggle */}
        {!collapsed && (
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{
              width: "100%", padding: "8px", marginBottom: 10,
              background: "#f7f9fc", border: "1.5px solid #eef0f3",
              borderRadius: 8, cursor: "pointer", fontSize: 12,
              fontFamily: "Rubik, sans-serif", color: "#666",
              fontWeight: 600, transition: "all 0.2s",
            }}
          >
            🌐 {lang === "ar" ? "English" : "العربية"}
          </button>
        )}

        {/* User */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? 8 : "10px 12px",
          borderRadius: 10, background: "#f7f9fc",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #0863ba, #a4c4e4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "#fff", fontWeight: 700, flexShrink: 0,
          }}>د</div>
          {!collapsed && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#353535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lang === "ar" ? "الدكتور / العيادة" : "Dr. / Clinic"}
              </div>
              <button style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11, color: "#c0392b", fontFamily: "Rubik, sans-serif",
                padding: 0, fontWeight: 500,
              }}>
                {tr.signOut} →
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── مكوّن: بطاقة إحصائية ──
function StatCard({ icon, label, value, sub, subColor, accent, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "24px",
      boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
      border: "1.5px solid #eef0f3",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.5s cubic-bezier(.4,0,.2,1)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 3, background: accent, borderRadius: "16px 16px 0 0",
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#353535", lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 12, color: subColor || "#2e7d32", fontWeight: 600 }}>{sub}</div>
      )}
    </div>
  );
}

// ── مكوّن: شريط الأسبوع ──
function WeekChart({ lang }) {
  const tr = t[lang];
  const max = Math.max(...WEEK_DATA);
  const today = new Date().getDay();

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 24,
      boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
      border: "1.5px solid #eef0f3",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#353535" }}>{tr.weekChart.title}</h3>
        <span style={{ fontSize: 12, color: "#aaa" }}>
          {lang === "ar" ? "هذا الأسبوع" : "This week"}
        </span>
      </div>
      <div style={{
        display: "flex", alignItems: "flex-end", gap: 8, height: 100,
        justifyContent: "space-between",
      }}>
        {WEEK_DATA.map((val, i) => {
          const isToday = i === today;
          const height = (val / max) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                fontSize: 10, color: isToday ? "#0863ba" : "#ccc",
                fontWeight: isToday ? 700 : 400,
              }}>{val}</div>
              <div style={{ width: "100%", position: "relative", height: 80, display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%", borderRadius: 6,
                  height: `${height}%`,
                  background: isToday
                    ? "linear-gradient(180deg, #0863ba, #a4c4e4)"
                    : "#eef0f3",
                  transition: "height 0.8s cubic-bezier(.4,0,.2,1)",
                  minHeight: 4,
                }} />
              </div>
              <div style={{
                fontSize: 10, color: isToday ? "#0863ba" : "#bbb",
                fontWeight: isToday ? 700 : 400, whiteSpace: "nowrap",
              }}>{tr.weekChart.days[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── المكوّن الرئيسي ──
export default function DashboardPage() {
  const [lang, setLang] = useState("ar");
  const isAr = lang === "ar";
  const tr = t[lang];

  const greetingKey = getGreetingKey();
  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const statusColors = {
    scheduled: { bg: "rgba(8,99,186,0.1)", color: "#0863ba" },
    completed: { bg: "rgba(46,125,50,0.1)", color: "#2e7d32" },
    cancelled: { bg: "rgba(192,57,43,0.1)", color: "#c0392b" },
    "no-show": { bg: "rgba(120,120,120,0.1)", color: "#888" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; color: #353535; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f0f0f0; }
        ::-webkit-scrollbar-thumb { background: #d0d8e4; border-radius: 10px; }

        .main-fade { animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        .action-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 16px 12px; border-radius: 14px;
          border: 1.5px solid #eef0f3; background: #fff;
          cursor: pointer; transition: all 0.2s; text-decoration: none;
          font-family: 'Rubik', sans-serif;
        }
        .action-btn:hover { border-color: #a4c4e4; background: rgba(8,99,186,0.04); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(8,99,186,0.1); }
        .action-btn-icon { font-size: 22px; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .action-btn-label { font-size: 12px; font-weight: 600; color: #555; text-align: center; }

        .appt-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 0; border-bottom: 1px solid #f0f2f5;
          transition: background 0.15s;
        }
        .appt-row:last-child { border-bottom: none; }
        .appt-row:hover { background: #fafbfc; border-radius: 10px; padding-left: 8px; padding-right: 8px; }

        .activity-item {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid #f0f2f5;
        }
        .activity-item:last-child { border-bottom: none; }

        .top-patient-row {
          display: flex; align-items: center; gap: 12px; padding: 10px 0;
          border-bottom: 1px solid #f0f2f5;
        }
        .top-patient-row:last-child { border-bottom: none; }

        @media (max-width: 768px) {
          .sidebar-push { margin-left: 0 !important; margin-right: 0 !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ fontFamily: "'Rubik', sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: "#f7f9fc" }}>

        {/* Sidebar */}
        <Sidebar lang={lang} setLang={setLang} activePage="dashboard" />

        {/* Main Content */}
        <main
          className="main-fade"
          style={{
            [isAr ? "marginRight" : "marginLeft"]: 240,
            padding: "0 32px 40px",
            minHeight: "100vh",
            transition: "margin 0.3s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {/* ── TOP BAR ── */}
          <div style={{
            position: "sticky", top: 0, zIndex: 40,
            background: "rgba(247,249,252,0.95)",
            backdropFilter: "blur(12px)",
            padding: "16px 0",
            marginBottom: 0,
            borderBottom: "1.5px solid #eef0f3",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#353535", marginBottom: 2 }}>
                  {tr.header[greetingKey]} 👋
                </h1>
                <p style={{ fontSize: 13, color: "#aaa", fontWeight: 400 }}>{dateStr}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Search */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "#fff", border: "1.5px solid #eef0f3",
                  borderRadius: 10, padding: "9px 14px",
                }}>
                  <span style={{ color: "#aaa", fontSize: 14 }}>🔍</span>
                  <input
                    placeholder={tr.header.search}
                    style={{
                      border: "none", outline: "none", background: "none",
                      fontFamily: "Rubik, sans-serif", fontSize: 13, color: "#353535",
                      width: 160, direction: isAr ? "rtl" : "ltr",
                    }}
                  />
                </div>
                {/* Notifications */}
                <button style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "#fff", border: "1.5px solid #eef0f3",
                  cursor: "pointer", fontSize: 16, position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  🔔
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#ffb5b5", border: "2px solid #fff",
                  }} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 28 }}>
            {/* ── STATS GRID ── */}
            <div
              className="stats-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginBottom: 28 }}
            >
              <StatCard
                icon="📅"
                label={tr.stats.todayAppointments}
                value="5"
                sub={`2 ${tr.stats.completed} · 3 ${tr.stats.remaining}`}
                subColor="#0863ba"
                accent="#0863ba"
                delay={0}
              />
              <StatCard
                icon="👥"
                label={tr.stats.totalPatients}
                value="142"
                sub={`+8 ${tr.stats.newThisMonth}`}
                subColor="#2e7d32"
                accent="#2e7d32"
                delay={80}
              />
              <StatCard
                icon="💰"
                label={tr.stats.monthRevenue}
                value="$3,200"
                sub={`↑ 12% ${tr.stats.vs_last}`}
                subColor="#2e7d32"
                accent="#e67e22"
                delay={160}
              />
              <StatCard
                icon="⏳"
                label={tr.stats.pendingPayments}
                value="$450"
                sub={`3 ${tr.stats.unpaid}`}
                subColor="#c0392b"
                accent="#ffb5b5"
                delay={240}
              />
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: "20px 24px",
              boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
              border: "1.5px solid #eef0f3", marginBottom: 28,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#353535", marginBottom: 16 }}>
                {tr.quickActions.title}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { icon: "📅", label: tr.quickActions.newAppointment, color: "#0863ba", bg: "rgba(8,99,186,0.08)", href: "/appointments" },
                  { icon: "👤", label: tr.quickActions.addPatient, color: "#2e7d32", bg: "rgba(46,125,50,0.08)", href: "/patients" },
                  { icon: "💳", label: tr.quickActions.recordPayment, color: "#e67e22", bg: "rgba(230,126,34,0.08)", href: "/payments" },
                  { icon: "📊", label: tr.quickActions.viewReports, color: "#7b2d8b", bg: "rgba(123,45,139,0.08)", href: "/reports" },
                ].map((a) => (
                  <a key={a.label} href={a.href} className="action-btn">
                    <div className="action-btn-icon" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                    <span className="action-btn-label" style={{ color: a.color }}>{a.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* ── MIDDLE ROW: Today's Schedule + Week Chart ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, marginBottom: 28 }}>

              {/* Today's Schedule */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24,
                boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
                border: "1.5px solid #eef0f3",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#353535" }}>{tr.todaySchedule.title}</h3>
                  <a href="/appointments" style={{ fontSize: 12, color: "#0863ba", textDecoration: "none", fontWeight: 600 }}>
                    {tr.todaySchedule.viewAll} →
                  </a>
                </div>
                {MOCK_APPOINTMENTS.map((appt) => {
                  const sc = statusColors[appt.status] || statusColors.scheduled;
                  return (
                    <div key={appt.id} className="appt-row">
                      {/* Time */}
                      <div style={{ width: 52, textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0863ba" }}>{appt.time}</div>
                        <div style={{ fontSize: 10, color: "#bbb" }}>{appt.duration}m</div>
                      </div>
                      {/* Divider */}
                      <div style={{ width: 2, height: 40, background: sc.color, borderRadius: 4, flexShrink: 0, opacity: 0.4 }} />
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: appt.color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700,
                      }}>{appt.patientInitials}</div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#353535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {appt.patientName}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{appt.type}</div>
                      </div>
                      {/* Status */}
                      <div style={{
                        padding: "4px 10px", borderRadius: 20,
                        background: sc.bg, color: sc.color,
                        fontSize: 11, fontWeight: 600, flexShrink: 0,
                      }}>
                        {tr.todaySchedule.statuses[appt.status]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Week Chart */}
              <WeekChart lang={lang} />
            </div>

            {/* ── BOTTOM ROW: Activity + Top Patients ── */}
            <div className="bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>

              {/* Recent Activity */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24,
                boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
                border: "1.5px solid #eef0f3",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#353535" }}>{tr.recentActivity.title}</h3>
                  <a href="#" style={{ fontSize: 12, color: "#0863ba", textDecoration: "none", fontWeight: 600 }}>
                    {tr.recentActivity.viewAll} →
                  </a>
                </div>
                {MOCK_ACTIVITY.map((act) => (
                  <div key={act.id} className="activity-item">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${act.color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>{act.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#353535", lineHeight: 1.4, fontWeight: 500 }}>
                        {lang === "ar" ? act.textAr : act.textEn}
                      </div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{act.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top Patients */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24,
                boxShadow: "0 2px 16px rgba(8,99,186,0.07)",
                border: "1.5px solid #eef0f3",
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#353535", marginBottom: 20 }}>
                  {tr.topPatients.title}
                </h3>
                {MOCK_TOP_PATIENTS.map((p, i) => {
                  const maxVisits = MOCK_TOP_PATIENTS[0].visits;
                  return (
                    <div key={i} className="top-patient-row">
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: i === 0 ? "#e67e22" : i === 1 ? "#888" : "#a4c4e4",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, color: "#fff", fontWeight: 700, flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: p.color, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                      }}>{p.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#353535", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                        {/* Bar */}
                        <div style={{ marginTop: 5, height: 4, background: "#f0f2f5", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${(p.visits / maxVisits) * 100}%`,
                            background: p.color, borderRadius: 10,
                            transition: "width 1s ease",
                          }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: 600, flexShrink: 0 }}>
                        {p.visits} {tr.topPatients.visits}
                      </div>
                    </div>
                  );
                })}

                {/* Mini summary */}
                <div style={{
                  marginTop: 20, padding: 14,
                  background: "rgba(8,99,186,0.04)", borderRadius: 10,
                  border: "1px dashed rgba(8,99,186,0.2)",
                }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: 500 }}>
                    {lang === "ar" ? "ملخص الشهر" : "Monthly Summary"}
                  </div>
                  {[
                    { label: lang === "ar" ? "إجمالي الزيارات" : "Total Visits", value: "33" },
                    { label: lang === "ar" ? "متوسط يومي" : "Daily Average", value: "4.7" },
                  ].map((s) => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#aaa" }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0863ba" }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
