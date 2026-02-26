"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Dashboard Page — Real Data from Supabase
// ============================================================

const t = {
  ar: {
    appName: "نبض", appSub: "إدارة العيادة",
    nav: {
      dashboard: "الرئيسية", patients: "المرضى",
      appointments: "المواعيد", payments: "المدفوعات",
      settings: "الإعدادات", admin: "لوحة المدير",
    },
    header: {
      greeting_morning: "صباح الخير", greeting_afternoon: "مساء الخير",
      greeting_evening: "مساء النور", subtitle: "إليك ملخص نشاط العيادة اليوم",
      search: "بحث...",
    },
    stats: {
      todayAppointments: "مواعيد اليوم", totalPatients: "إجمالي المرضى",
      monthRevenue: "إيرادات الشهر", pendingPayments: "مدفوعات معلّقة",
      completed: "مكتمل", remaining: "متبقي",
      newThisMonth: "جديد هذا الشهر", vs_last: "مقارنةً بالشهر الماضي",
      unpaid: "غير مسدّد",
    },
    quickActions: {
      title: "إجراءات سريعة", newAppointment: "موعد جديد",
      addPatient: "إضافة مريض", recordPayment: "تسجيل دفعة",
      viewReports: "عرض التقارير",
    },
    todaySchedule: {
      title: "مواعيد اليوم", viewAll: "عرض الكل",
      noAppointments: "لا توجد مواعيد اليوم",
      statuses: { scheduled: "محدد", completed: "مكتمل", cancelled: "ملغي", "no-show": "لم يحضر" },
    },
    topPatients: { title: "أكثر المرضى زيارةً", visits: "زيارة" },
    weekChart: {
      title: "المواعيد هذا الأسبوع",
      days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    },
    signOut: "تسجيل الخروج", clinic: "العيادة",
    loading: "جاري التحميل...", currency: "ر.س",
    monthlyVisits: "إجمالي الزيارات", dailyAvg: "متوسط يومي",
    monthlySummary: "ملخص الشهر",
    patientStats: "إحصائيات المرضى",
    apptThisMonth: "مواعيد هذا الشهر",
    dailyAvgLabel: "متوسط يومي",
    newPatientsMonth: "مرضى جدد هذا الشهر",
    totalPatientsLabel: "إجمالي المرضى",
    todayBreakdown: "توزيع مواعيد اليوم",
    noData: "لا توجد بيانات",
  },
  en: {
    appName: "NABD", appSub: "Clinic Manager",
    nav: {
      dashboard: "Dashboard", patients: "Patients",
      appointments: "Appointments", payments: "Payments",
      settings: "Settings", admin: "Admin Panel",
    },
    header: {
      greeting_morning: "Good Morning", greeting_afternoon: "Good Afternoon",
      greeting_evening: "Good Evening", subtitle: "Here's your clinic activity summary for today",
      search: "Search...",
    },
    stats: {
      todayAppointments: "Today's Appointments", totalPatients: "Total Patients",
      monthRevenue: "Monthly Revenue", pendingPayments: "Pending Payments",
      completed: "Completed", remaining: "Remaining",
      newThisMonth: "New this month", vs_last: "vs last month",
      unpaid: "Unpaid",
    },
    quickActions: {
      title: "Quick Actions", newAppointment: "New Appointment",
      addPatient: "Add Patient", recordPayment: "Record Payment",
      viewReports: "View Reports",
    },
    todaySchedule: {
      title: "Today's Schedule", viewAll: "View All",
      noAppointments: "No appointments today",
      statuses: { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", "no-show": "No Show" },
    },
    topPatients: { title: "Most Visited Patients", visits: "visits" },
    weekChart: {
      title: "Appointments This Week",
      days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    signOut: "Sign Out", clinic: "Clinic",
    loading: "Loading...", currency: "$",
    monthlyVisits: "Total Visits", dailyAvg: "Daily Average",
    monthlySummary: "Monthly Summary",
    patientStats: "Patient Stats",
    apptThisMonth: "Appointments this month",
    dailyAvgLabel: "Daily average",
    newPatientsMonth: "New patients this month",
    totalPatientsLabel: "Total patients",
    todayBreakdown: "Today's appointment breakdown",
    noData: "No data yet",
  },
} as const;

type Lang = "ar" | "en";

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id: number) => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();

function getGreetingKey(): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  const h = new Date().getHours();
  if (h < 12) return "greeting_morning";
  if (h < 17) return "greeting_afternoon";
  return "greeting_evening";
}

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang, activePage = "dashboard" }: {
  lang: Lang; setLang: (l: Lang) => void; activePage?: string;
}) {
  const tr = t[lang];
  const isAr = lang === "ar";
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navItems: { key: string; icon: string; label: string; href: string }[] = [
    { key:"dashboard",    icon:"⊞", label:tr.nav.dashboard,    href:"/dashboard"    },
    { key:"patients",     icon:"👥", label:tr.nav.patients,     href:"/patients"     },
    { key:"appointments", icon:"📅", label:tr.nav.appointments, href:"/appointments" },
    { key:"payments",     icon:"💳", label:tr.nav.payments,     href:"/payments"     },
  ];

  const sidebarTransform = isMobile
    ? mobileOpen ? "translateX(0)" : isAr ? "translateX(100%)" : "translateX(-100%)"
    : "translateX(0)";

  return (
    <>
      {isMobile && mobileOpen && (
        <div onClick={()=>setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:49 }} />
      )}
      {isMobile && (
        <button onClick={()=>setMobileOpen(!mobileOpen)} style={{
          position:"fixed", top:14, zIndex:60,
          right:isAr?16:undefined, left:isAr?undefined:16,
          width:40, height:40, borderRadius:10, background:"#0863ba",
          border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 12px rgba(8,99,186,.3)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen
              ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
      )}
      <aside style={{
        width: isMobile ? 260 : collapsed ? 70 : 240,
        minHeight:"100vh", background:"#fff",
        borderRight: isAr ? "none" : "1.5px solid #eef0f3",
        borderLeft:  isAr ? "1.5px solid #eef0f3" : "none",
        display:"flex", flexDirection:"column",
        transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",
        position:"fixed", top:0,
        right:isAr?0:undefined, left:isAr?undefined:0,
        zIndex:50, transform:sidebarTransform,
        boxShadow:"4px 0 24px rgba(8,99,186,.06)",
      }}>
        <div style={{ padding:collapsed?"24px 0":"24px 20px", borderBottom:"1.5px solid #eef0f3", display:"flex", alignItems:"center", justifyContent:collapsed?"center":"space-between", minHeight:72 }}>
          {!collapsed && (
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 12px rgba(8,99,186,.25)" }}>💗</div>
              <div>
                <div style={{ fontSize:18,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{tr.appSub}</div>
              </div>
            </div>
          )}
          {collapsed && <div style={{ width:38,height:38,background:"#0863ba",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💗</div>}
          {!collapsed && (
            <button onClick={()=>setCollapsed(!collapsed)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa",padding:4 }}>
              {isAr?"›":"‹"}
            </button>
          )}
        </div>
        <nav style={{ flex:1, padding:"16px 12px" }}>
          {navItems.map(item => {
            const isActive = item.key === activePage;
            return (
              <a key={item.key} href={item.href} style={{
                display:"flex", alignItems:"center", gap:collapsed?0:12,
                justifyContent:collapsed?"center":"flex-start",
                padding:collapsed?"12px 0":"11px 14px",
                borderRadius:10, marginBottom:4, textDecoration:"none",
                background:isActive?"rgba(8,99,186,.08)":"transparent",
                color:isActive?"#0863ba":"#666",
                fontWeight:isActive?600:400, fontSize:14,
                transition:"all .18s", position:"relative",
              }}>
                {isActive && <div style={{ position:"absolute",[isAr?"right":"left"]:-12,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:"#0863ba",borderRadius:10 }} />}
                <span style={{ fontSize:18,flexShrink:0 }}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          })}
          <div style={{ height:1,background:"#eef0f3",margin:"12px 0" }} />
          <a href="/admin" style={{ display:"flex",alignItems:"center",gap:collapsed?0:12,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"12px 0":"11px 14px",borderRadius:10,textDecoration:"none",color:"#888",fontSize:14 }}>
            <span style={{ fontSize:18 }}>⚙️</span>
            {!collapsed && <span>{tr.nav.admin}</span>}
          </a>
        </nav>
        <div style={{ padding:"16px 12px",borderTop:"1.5px solid #eef0f3" }}>
          {!collapsed && (
            <button onClick={()=>setLang(lang==="ar"?"en":"ar")} style={{ width:"100%",padding:"8px",marginBottom:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"#666",fontWeight:600 }}>
              🌐 {lang==="ar"?"English":"العربية"}
            </button>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:collapsed?0:10,justifyContent:collapsed?"center":"flex-start",padding:collapsed?8:"10px 12px",borderRadius:10,background:"#f7f9fc" }}>
            <div style={{ width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#0863ba,#a4c4e4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:700,flexShrink:0 }}>د</div>
            {!collapsed && (
              <div style={{ flex:1,overflow:"hidden" }}>
                <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lang==="ar"?"الدكتور / العيادة":"Dr. / Clinic"}</div>
                <button style={{ background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#c0392b",fontFamily:"Rubik,sans-serif",padding:0,fontWeight:500 }}>{tr.signOut} →</button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── StatCard ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor, accent, delay = 0, loading = false }: {
  icon: string; label: string; value: string; sub?: string;
  subColor?: string; accent: string; delay?: number; loading?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      background:"#fff", borderRadius:16, padding:24,
      boxShadow:"0 2px 16px rgba(8,99,186,.07)", border:"1.5px solid #eef0f3",
      opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(16px)",
      transition:"all .5s cubic-bezier(.4,0,.2,1)", position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:accent,borderRadius:"16px 16px 0 0" }} />
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16 }}>
        <div style={{ width:44,height:44,borderRadius:12,background:`${accent}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{icon}</div>
      </div>
      {loading ? (
        <div style={{ width:70,height:30,borderRadius:8,background:"#f0f2f5",animation:"pulse 1.5s ease infinite",marginBottom:6 }} />
      ) : (
        <div style={{ fontSize:28,fontWeight:800,color:"#353535",lineHeight:1,marginBottom:6 }}>{value}</div>
      )}
      <div style={{ fontSize:13,color:"#888",marginBottom:6,fontWeight:500 }}>{label}</div>
      {sub && !loading && <div style={{ fontSize:12,color:subColor||"#2e7d32",fontWeight:600 }}>{sub}</div>}
    </div>
  );
}

// ─── WeekChart ────────────────────────────────────────────
function WeekChart({ lang, data }: { lang: Lang; data: number[] }) {
  const tr    = t[lang];
  const max   = Math.max(...data, 1);
  const today = new Date().getDay();

  return (
    <div style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.weekChart.title}</h3>
        <span style={{ fontSize:12,color:"#aaa" }}>{lang==="ar"?"هذا الأسبوع":"This week"}</span>
      </div>
      <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:100,justifyContent:"space-between" }}>
        {data.map((val, i) => {
          const isToday = i === today;
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isToday?"#0863ba":"#ccc",fontWeight:isToday?700:400 }}>{val}</div>
              <div style={{ width:"100%",position:"relative",height:80,display:"flex",alignItems:"flex-end" }}>
                <div style={{
                  width:"100%", borderRadius:6,
                  height:`${Math.max((val/max)*100, val>0?8:2)}%`,
                  background:isToday?"linear-gradient(180deg,#0863ba,#a4c4e4)":"#eef0f3",
                  transition:"height .8s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
              <div style={{ fontSize:10,color:isToday?"#0863ba":"#bbb",fontWeight:isToday?700:400,whiteSpace:"nowrap" }}>
                {tr.weekChart.days[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────
export default function DashboardPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = t[lang];

  const [loadingStats, setLoadingStats] = useState(true);

  // Patients
  const [totalPatients, setTotalPatients] = useState(0);
  const [newThisMonth,  setNewThisMonth]  = useState(0);

  // Appointments
  const [todayTotal,        setTodayTotal]        = useState(0);
  const [todayCompleted,    setTodayCompleted]    = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [weekData,          setWeekData]          = useState<number[]>([0,0,0,0,0,0,0]);
  const [monthTotalVisits,  setMonthTotalVisits]  = useState(0);

  // Payments
  const [monthRevenue,  setMonthRevenue]  = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingCount,  setPendingCount]  = useState(0);

  // Top patients
  const [topPatients, setTopPatients] = useState<{ id:number; name:string; visits:number }[]>([]);

  const now        = new Date();
  const greetingKey = getGreetingKey();
  const dateStr    = now.toLocaleDateString(lang==="ar"?"ar-SA":"en-US", {
    weekday:"long", year:"numeric", month:"long", day:"numeric",
  });

  const statusColors: Record<string, { bg:string; color:string }> = {
    scheduled: { bg:"rgba(8,99,186,.1)",    color:"#0863ba" },
    completed:  { bg:"rgba(46,125,50,.1)",   color:"#2e7d32" },
    cancelled:  { bg:"rgba(192,57,43,.1)",   color:"#c0392b" },
    "no-show":  { bg:"rgba(120,120,120,.1)", color:"#888"    },
  };

  // ── Load ──────────────────────────────────────────────
  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoadingStats(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      const todayISO   = now.toISOString().slice(0, 10);
      const monthStart = todayISO.slice(0, 7) + "-01";

      // ── Patients ──
      const { data: patientsData } = await supabase
        .from("patients").select("id, name, created_at")
        .eq("user_id", userId).eq("is_hidden", false);
      const patients = patientsData ?? [];
      setTotalPatients(patients.length);
      setNewThisMonth(patients.filter(p => (p.created_at ?? "") >= monthStart).length);

      const patientMap: Record<number, string> = {};
      patients.forEach(p => { patientMap[p.id] = p.name; });

      // ── Appointments ──
      const { data: apptsData } = await supabase
        .from("appointments")
        .select("id, patient_id, appointment_date, appointment_time, duration, type, status")
        .eq("user_id", userId);
      const appts = apptsData ?? [];

      // Today
      const todayAppts = appts
        .filter(a => a.appointment_date === todayISO)
        .sort((a, b) => (a.appointment_time ?? "").localeCompare(b.appointment_time ?? ""));
      setTodayTotal(todayAppts.length);
      setTodayCompleted(todayAppts.filter(a => a.status === "completed").length);
      setTodayAppointments(todayAppts.map(a => ({
        ...a,
        patientName: patientMap[a.patient_id] ?? (isAr ? "مريض" : "Patient"),
      })));

      // Week counts
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0,0,0,0);
      const wc = [0,0,0,0,0,0,0];
      appts.forEach(a => {
        if (!a.appointment_date) return;
        const d   = new Date(a.appointment_date + "T00:00:00");
        const diff = Math.round((d.getTime() - weekStart.getTime()) / 86400000);
        if (diff >= 0 && diff <= 6) wc[diff]++;
      });
      setWeekData(wc);

      // Month total
      setMonthTotalVisits(appts.filter(a => (a.appointment_date ?? "") >= monthStart).length);

      // ── Payments ──
      const { data: paymentsData } = await supabase
        .from("payments").select("id, amount, status, payment_date")
        .eq("user_id", userId);
      const payments = paymentsData ?? [];

      setMonthRevenue(
        payments
          .filter(p => p.status === "paid" && (p.payment_date ?? "") >= monthStart)
          .reduce((s, p) => s + (Number(p.amount) || 0), 0)
      );
      const pending = payments.filter(p => p.status === "pending" || p.status === "unpaid");
      setPendingCount(pending.length);
      setPendingAmount(pending.reduce((s, p) => s + (Number(p.amount) || 0), 0));

      // ── Top patients ──
      const visitCount: Record<number, number> = {};
      appts.forEach(a => {
        if (!a.patient_id) return;
        visitCount[a.patient_id] = (visitCount[a.patient_id] || 0) + 1;
      });
      const sorted = Object.entries(visitCount)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 4)
        .map(([pid, count]) => ({
          id:     Number(pid),
          name:   patientMap[Number(pid)] ?? (isAr ? "مريض" : "Patient"),
          visits: count as number,
        }));
      setTopPatients(sorted);

    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  const fmtCurrency = (n: number) =>
    lang === "ar" ? `${n.toLocaleString("ar")} ${tr.currency}` : `${tr.currency}${n.toLocaleString()}`;

  const daysElapsed = now.getDate();
  const dailyAvg    = daysElapsed > 0 ? (monthTotalVisits / daysElapsed).toFixed(1) : "0";

  // ── Render ────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#f0f0f0}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        .main-fade{animation:fadeUp .5s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .action-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px 12px;border-radius:14px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;transition:all .2s;text-decoration:none;font-family:'Rubik',sans-serif}
        .action-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.04);transform:translateY(-2px);box-shadow:0 6px 20px rgba(8,99,186,.1)}
        .action-btn-icon{font-size:22px;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center}
        .action-btn-label{font-size:12px;font-weight:600;color:#555;text-align:center}
        .appt-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f0f2f5;transition:background .15s}
        .appt-row:last-child{border-bottom:none}
        .appt-row:hover{background:#fafbfc;border-radius:10px;padding-left:8px;padding-right:8px}
        .top-patient-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f0f2f5}
        .top-patient-row:last-child{border-bottom:none}
        @media(max-width:768px){
          .stats-grid{grid-template-columns:1fr 1fr!important}
          .middle-grid{grid-template-columns:1fr!important}
          .bottom-grid{grid-template-columns:1fr!important}
          .main-content{margin-left:0!important;margin-right:0!important;padding:0 14px 40px!important}
          .topbar-inner{padding-left:52px!important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="dashboard" />

        <main className="main-fade main-content" style={{
          [isAr?"marginRight":"marginLeft"]: 240,
          padding:"0 32px 40px", minHeight:"100vh",
          transition:"margin .3s cubic-bezier(.4,0,.2,1)",
        }}>

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div className="topbar-inner" style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535",marginBottom:2 }}>
                  {tr.header[greetingKey]} 👋
                </h1>
                <p style={{ fontSize:13,color:"#aaa",fontWeight:400 }}>{dateStr}</p>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                  <span style={{ color:"#aaa",fontSize:14 }}>🔍</span>
                  <input placeholder={tr.header.search} style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:160,direction:isAr?"rtl":"ltr" }} />
                </div>
                <button style={{ width:40,height:40,borderRadius:10,background:"#fff",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  🔔
                  {todayTotal > 0 && (
                    <div style={{ position:"absolute",top:8,right:8,width:8,height:8,borderRadius:"50%",background:"#ffb5b5",border:"2px solid #fff" }} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div style={{ paddingTop:28 }}>

            {/* STATS */}
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:18,marginBottom:28 }}>
              <StatCard
                icon="📅" accent="#0863ba" delay={0} loading={loadingStats}
                label={tr.stats.todayAppointments}
                value={String(todayTotal)}
                sub={`${todayCompleted} ${tr.stats.completed} · ${todayTotal - todayCompleted} ${tr.stats.remaining}`}
                subColor="#0863ba"
              />
              <StatCard
                icon="👥" accent="#2e7d32" delay={80} loading={loadingStats}
                label={tr.stats.totalPatients}
                value={String(totalPatients)}
                sub={newThisMonth > 0 ? `+${newThisMonth} ${tr.stats.newThisMonth}` : undefined}
                subColor="#2e7d32"
              />
              <StatCard
                icon="💰" accent="#e67e22" delay={160} loading={loadingStats}
                label={tr.stats.monthRevenue}
                value={fmtCurrency(monthRevenue)}
                subColor="#2e7d32"
              />
              <StatCard
                icon="⏳" accent="#ffb5b5" delay={240} loading={loadingStats}
                label={tr.stats.pendingPayments}
                value={fmtCurrency(pendingAmount)}
                sub={pendingCount > 0 ? `${pendingCount} ${tr.stats.unpaid}` : undefined}
                subColor="#c0392b"
              />
            </div>

            {/* QUICK ACTIONS */}
            <div style={{ background:"#fff",borderRadius:16,padding:"20px 24px",boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3",marginBottom:28 }}>
              <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:16 }}>{tr.quickActions.title}</h3>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                {[
                  { icon:"📅", label:tr.quickActions.newAppointment, color:"#0863ba", bg:"rgba(8,99,186,.08)",   href:"/appointments" },
                  { icon:"👤", label:tr.quickActions.addPatient,      color:"#2e7d32", bg:"rgba(46,125,50,.08)",  href:"/patients"     },
                  { icon:"💳", label:tr.quickActions.recordPayment,   color:"#e67e22", bg:"rgba(230,126,34,.08)", href:"/payments"     },
                  { icon:"📊", label:tr.quickActions.viewReports,     color:"#7b2d8b", bg:"rgba(123,45,139,.08)", href:"/reports"      },
                ].map(a => (
                  <a key={a.label} href={a.href} className="action-btn">
                    <div className="action-btn-icon" style={{ background:a.bg,color:a.color }}>{a.icon}</div>
                    <span className="action-btn-label" style={{ color:a.color }}>{a.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* MIDDLE: Schedule + Week Chart */}
            <div className="middle-grid" style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:20,marginBottom:28 }}>

              {/* Today's Schedule */}
              <div style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                  <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.todaySchedule.title}</h3>
                  <a href="/appointments" style={{ fontSize:12,color:"#0863ba",textDecoration:"none",fontWeight:600 }}>{tr.todaySchedule.viewAll} →</a>
                </div>

                {loadingStats ? (
                  <div style={{ padding:"40px 0",textAlign:"center",color:"#ccc" }}>
                    <div style={{ fontSize:32,marginBottom:10,animation:"pulse 1.5s ease infinite" }}>📅</div>
                    <div style={{ fontSize:13 }}>{tr.loading}</div>
                  </div>
                ) : todayAppointments.length === 0 ? (
                  <div style={{ textAlign:"center",padding:"40px 20px",color:"#ccc" }}>
                    <div style={{ fontSize:36,marginBottom:10 }}>📭</div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{tr.todaySchedule.noAppointments}</div>
                  </div>
                ) : todayAppointments.map((appt, idx) => {
                  const sc = statusColors[appt.status] ?? statusColors.scheduled;
                  return (
                    <div key={appt.id ?? idx} className="appt-row">
                      <div style={{ width:52,textAlign:"center",flexShrink:0 }}>
                        <div style={{ fontSize:14,fontWeight:700,color:"#0863ba" }}>{appt.appointment_time?.slice(0,5) ?? "—"}</div>
                        {appt.duration && <div style={{ fontSize:10,color:"#bbb" }}>{appt.duration}m</div>}
                      </div>
                      <div style={{ width:2,height:40,background:sc.color,borderRadius:4,flexShrink:0,opacity:.4 }} />
                      <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:getColor(appt.patient_id??idx+1),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700 }}>
                        {getInitials(appt.patientName)}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{appt.patientName}</div>
                        {appt.type && <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{appt.type}</div>}
                      </div>
                      <div style={{ padding:"4px 10px",borderRadius:20,background:sc.bg,color:sc.color,fontSize:11,fontWeight:600,flexShrink:0 }}>
                        {tr.todaySchedule.statuses[appt.status as keyof typeof tr.todaySchedule.statuses] ?? appt.status}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Week Chart */}
              <WeekChart lang={lang} data={weekData} />
            </div>

            {/* BOTTOM: Patient Stats + Top Patients */}
            <div className="bottom-grid" style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20 }}>

              {/* Patient Stats */}
              <div style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:"#353535",marginBottom:20 }}>{tr.patientStats}</h3>

                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                  {[
                    { label:tr.apptThisMonth,      value:String(monthTotalVisits), color:"#0863ba", bg:"rgba(8,99,186,.06)",    icon:"📅" },
                    { label:tr.dailyAvgLabel,       value:dailyAvg,                 color:"#2e7d32", bg:"rgba(46,125,50,.06)",   icon:"📊" },
                    { label:tr.newPatientsMonth,    value:String(newThisMonth),     color:"#7b2d8b", bg:"rgba(123,45,139,.06)",  icon:"👤" },
                    { label:tr.totalPatientsLabel,  value:String(totalPatients),    color:"#e67e22", bg:"rgba(230,126,34,.06)",  icon:"👥" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:s.bg,borderRadius:12,padding:"14px 16px",border:`1.5px solid ${s.color}20` }}>
                      <div style={{ fontSize:18,marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:22,fontWeight:800,color:s.color,lineHeight:1 }}>
                        {loadingStats ? "—" : s.value}
                      </div>
                      <div style={{ fontSize:11,color:"#888",marginTop:4,fontWeight:500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Today breakdown */}
                {!loadingStats && todayAppointments.length > 0 && (
                  <div style={{ padding:16,background:"#f9fafb",borderRadius:12,border:"1px solid #eef0f3" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:12 }}>{tr.todayBreakdown}</div>
                    {Object.entries(
                      todayAppointments.reduce((acc: Record<string,number>, a) => {
                        acc[a.status] = (acc[a.status]||0) + 1;
                        return acc;
                      }, {})
                    ).map(([status, count]) => {
                      const sc  = statusColors[status] ?? statusColors.scheduled;
                      const pct = Math.round((count / todayTotal) * 100);
                      return (
                        <div key={status} style={{ marginBottom:8 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                            <span style={{ fontSize:11,color:sc.color,fontWeight:600 }}>
                              {tr.todaySchedule.statuses[status as keyof typeof tr.todaySchedule.statuses] ?? status}
                            </span>
                            <span style={{ fontSize:11,color:"#888" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height:5,background:"#eef0f3",borderRadius:10,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:sc.color,borderRadius:10,transition:"width .8s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Patients */}
              <div style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:"#353535",marginBottom:20 }}>{tr.topPatients.title}</h3>

                {loadingStats ? (
                  <div style={{ padding:"30px 0",textAlign:"center",color:"#ccc",fontSize:13 }}>{tr.loading}</div>
                ) : topPatients.length === 0 ? (
                  <div style={{ padding:"30px 0",textAlign:"center",color:"#ccc",fontSize:13 }}>{tr.noData}</div>
                ) : (
                  <>
                    {topPatients.map((p, i) => {
                      const maxV = topPatients[0]?.visits || 1;
                      return (
                        <div key={p.id} className="top-patient-row">
                          <div style={{ width:18,height:18,borderRadius:"50%",background:i===0?"#e67e22":i===1?"#888":"#a4c4e4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700,flexShrink:0 }}>{i+1}</div>
                          <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700 }}>
                            {getInitials(p.name)}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</div>
                            <div style={{ marginTop:5,height:4,background:"#f0f2f5",borderRadius:10,overflow:"hidden" }}>
                              <div style={{ height:"100%",width:`${(p.visits/maxV)*100}%`,background:getColor(p.id),borderRadius:10,transition:"width 1s ease" }} />
                            </div>
                          </div>
                          <div style={{ fontSize:11,color:"#888",fontWeight:600,flexShrink:0 }}>{p.visits} {tr.topPatients.visits}</div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop:20,padding:14,background:"rgba(8,99,186,.04)",borderRadius:10,border:"1px dashed rgba(8,99,186,.2)" }}>
                      <div style={{ fontSize:11,color:"#888",marginBottom:8,fontWeight:500 }}>{tr.monthlySummary}</div>
                      {[
                        { label:tr.monthlyVisits, value:String(monthTotalVisits) },
                        { label:tr.dailyAvg,       value:dailyAvg               },
                      ].map(s => (
                        <div key={s.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:12,color:"#aaa" }}>{s.label}</span>
                          <span style={{ fontSize:12,fontWeight:700,color:"#0863ba" }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
