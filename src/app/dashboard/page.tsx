"use client";

import { useState, useEffect, type JSX } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Dashboard Page — Real Data from Supabase
// ============================================================

const t = {
  ar: {
    appName: "نبض", appSub: "إدارة العيادة",
    nav: {
      dashboard: "لوحة المعلومات", patients: "المرضى",
      appointments: "المواعيد", payments: "المدفوعات",
      prescriptions: "الوصفات الطبية", tracking: "متابعة المرضى",
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
    loading: "جاري التحميل...", currency: "ل.س",
    monthlyVisits: "إجمالي الزيارات", dailyAvg: "متوسط يومي",
    monthlySummary: "ملخص الشهر",
    patientStats: "إحصائيات المرضى",
    apptThisMonth: "مواعيد هذا الشهر",
    dailyAvgLabel: "متوسط يومي",
    newPatientsMonth: "مرضى جدد هذا الشهر",
    totalPatientsLabel: "إجمالي المرضى",
    todayBreakdown: "توزيع مواعيد اليوم",
    noData: "لا توجد بيانات",
    collapseMenu: "طي القائمة",
    expandMenu: "توسيع القائمة",
    sharedClinicPlan: "خطة عيادة مشتركة",
    doctorsCount: "عدد الأطباء",
    maxDoctors: "الحد الأقصى للأطباء",
    activeDoctors: "الأطباء النشطون",
    filterByDoctor: "تصفية حسب الطبيب",
    allDoctors: "كل الأطباء",
    doctorLabel: "الطبيب",
    sharedBadge: "مشتركة",
    todayByDoctor: "مواعيد اليوم حسب الطبيب",
    patientsAssigned: "المرضى المخصصون",
  },
  en: {
    appName: "NABD", appSub: "Clinic Manager",
    nav: {
      dashboard: "Dashboard", patients: "Patients",
      appointments: "Appointments", payments: "Payments",
      prescriptions: "Prescriptions", tracking: "Patient Tracking",
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
    loading: "Loading...", currency: "SYP",
    monthlyVisits: "Total Visits", dailyAvg: "Daily Average",
    monthlySummary: "Monthly Summary",
    patientStats: "Patient Stats",
    apptThisMonth: "Appointments this month",
    dailyAvgLabel: "Daily average",
    newPatientsMonth: "New patients this month",
    totalPatientsLabel: "Total patients",
    todayBreakdown: "Today's appointment breakdown",
    noData: "No data yet",
    collapseMenu: "Collapse",
    expandMenu: "Expand",
    sharedClinicPlan: "Shared Clinic Plan",
    doctorsCount: "Doctors Count",
    maxDoctors: "Max Doctors",
    activeDoctors: "Active Doctors",
    filterByDoctor: "Filter by Doctor",
    allDoctors: "All Doctors",
    doctorLabel: "Doctor",
    sharedBadge: "Shared",
    todayByDoctor: "Today's Appointments by Doctor",
    patientsAssigned: "Assigned Patients",
  },
} as const;

type Lang = "ar" | "en";

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id: number) => AVATAR_COLORS[Math.abs(id ?? 0) % AVATAR_COLORS.length] ?? "#0863ba";
const getInitials = (name: string) => (name || "?").split(" ").slice(0,2).map(w => w[0] ?? "").join("").toUpperCase() || "?";

// ── Force Western (Latin) numerals regardless of locale ─────
const toWestern = (val: string | number): string => {
  return String(val).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
};

function getGreetingKey(): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  const h = new Date().getHours();
  if (h < 12) return "greeting_morning";
  if (h < 17) return "greeting_afternoon";
  return "greeting_evening";
}

// ─── Plan access rules ────────────────────────────────────
const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

// خطط فردية: basic | pro | enterprise
// خطط مشتركة: shared_basic (2 أطباء) | shared_pro (3 أطباء) | shared_enterprise (5 أطباء+)
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

const isSharedPlan = (plan: PlanType) =>
  ["shared_basic", "shared_pro", "shared_enterprise"].includes(plan);

// الحد الافتراضي للأطباء — الأدمن يستطيع تعديله لكل عيادة
const SHARED_PLAN_DEFAULT_MAX: Record<string, number> = {
  shared_basic:      2,
  shared_pro:        3,
  shared_enterprise: 5,
};

const canAccess = (feature: string, plan: PlanType) =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;

// Safe accessor — falls back to "basic" badge if plan value is unexpected
const getPlanBadge = (plan: PlanType) => PLAN_BADGE[plan] ?? PLAN_BADGE["basic"];

const PLAN_BADGE: Record<PlanType, { label: { ar: string; en: string }; color: string; isShared?: boolean }> = {
  basic:             { label:{ ar:"الأساسية",           en:"Basic"           }, color:"#0863ba" },
  pro:               { label:{ ar:"الاحترافية",         en:"Professional"    }, color:"#7b2d8b" },
  enterprise:        { label:{ ar:"الشاملة",            en:"Comprehensive"   }, color:"#e67e22" },
  shared_basic:      { label:{ ar:"مشتركة - أساسية",   en:"Shared Basic"    }, color:"#0e7c6a", isShared:true },
  shared_pro:        { label:{ ar:"مشتركة - احترافية", en:"Shared Pro"      }, color:"#b5451b", isShared:true },
  shared_enterprise: { label:{ ar:"مشتركة - شاملة",    en:"Shared Enterprise"}, color:"#4a1480", isShared:true },
};

// ─── Sidebar ──────────────────────────────────────────────

// ─── StatCard ─────────────────────────────────────────────
function StatCard({ icon, label, value, sub, subColor, accent, delay = 0, loading = false }: {
  icon: string; label: string; value: string; sub?: string;
  subColor?: string; accent: string; delay?: number; loading?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="stat-card-inner" style={{
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
        <div
          className="stat-card-value"
          style={{ fontSize:28,fontWeight:800,color:accent,lineHeight:1,marginBottom:6,fontVariantNumeric:"tabular-nums" }}
        >
          {toWestern(value)}
        </div>
      )}
      <div style={{ fontSize:13,color:"#888",marginBottom:6,fontWeight:500 }}>{label}</div>
      {sub && !loading && (
        <div style={{ fontSize:12,color:subColor||"#2e7d32",fontWeight:600 }}>
          {toWestern(sub)}
        </div>
      )}
    </div>
  );
}

// ─── WeekChart ────────────────────────────────────────────
function WeekChart({ lang, data }: { lang: Lang; data: number[] }) {
  const tr    = t[lang];
  const max   = Math.max(...data, 1);
  const today = new Date().getDay();

  return (
    <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{tr.weekChart.title}</h3>
        <span style={{ fontSize:12,color:"#aaa" }}>{lang==="ar"?"هذا الأسبوع":"This week"}</span>
      </div>
      <div className="week-chart-bar-area" style={{ display:"flex",alignItems:"flex-end",gap:8,height:100,justifyContent:"space-between" }}>
        {data.map((val, i) => {
          const isToday = i === today;
          return (
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
              <div style={{ fontSize:10,color:isToday?"#0863ba":"#ccc",fontWeight:isToday?700:400,fontVariantNumeric:"tabular-nums" }}>
                {toWestern(val)}
              </div>
              <div style={{ width:"100%",position:"relative",height:80,display:"flex",alignItems:"flex-end" }}>
                <div style={{
                  width:"100%", borderRadius:6,
                  height:`${Math.max((val/max)*100, val>0?8:2)}%`,
                  background:isToday?"linear-gradient(180deg,#0863ba,#a4c4e4)":"#eef0f3",
                  transition:"height .8s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
              <div className="week-chart-day" style={{ fontSize:10,color:isToday?"#0863ba":"#bbb",fontWeight:isToday?700:400,whiteSpace:"nowrap" }}>
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
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const isAr = lang === "ar";

  // ── popup الإشعارات — يظهر مرة واحدة فقط ────────────────
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission !== "default") return; // تم الرد مسبقاً
    const shown = localStorage.getItem("nabd_push_prompt");
    if (shown) return;
    const timer = setTimeout(() => setShowPushPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePushPromptAccept = async () => {
    setShowPushPrompt(false);
    localStorage.setItem("nabd_push_prompt", "1");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
      const b64 = (s: string) => { const p = "=".repeat((4-s.length%4)%4); const b = (s+p).replace(/-/g,"+").replace(/_/g,"/"); return Uint8Array.from(window.atob(b), c => c.charCodeAt(0)); };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) });
      const j = sub.toJSON(); const k = j.keys as {p256dh:string;auth:string};
      if (currentUserId) {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await sb.from("push_subscriptions").upsert({ user_id: currentUserId, endpoint: j.endpoint!, p256dh: k.p256dh, auth: k.auth }, { onConflict: "user_id,endpoint" });
      }
    } catch(e) { console.warn("push:", e); }
  };

  const handlePushPromptDismiss = () => {
    setShowPushPrompt(false);
    localStorage.setItem("nabd_push_prompt", "1");
  };
  const tr   = t[lang];

  const [loadingStats, setLoadingStats] = useState(true);
  const [plan, setPlan] = useState<PlanType>("basic");

  // Fix hydration mismatch (React error #418): date/time computed client-side only
  const [greetingKey, setGreetingKey] = useState<"greeting_morning"|"greeting_afternoon"|"greeting_evening">("greeting_morning");
  const [dateStr, setDateStr]         = useState("");
  const [daysElapsed, setDaysElapsed] = useState(1);

  useEffect(() => {
    const now = new Date();
    setGreetingKey(getGreetingKey());
    setDateStr(now.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }));
    setDaysElapsed(now.getDate());
  }, [lang]);

  // Shared clinic plan: doctors
  const [doctors, setDoctors] = useState<{ id: string; name: string; name_en?: string; color?: string }[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [activeDoctorCount, setActiveDoctorCount] = useState(0);
  const [maxDoctors, setMaxDoctors] = useState(0);

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
      setCurrentUserId(userId);

      // ── Clinic plan ──
      const { data: clinicData } = await supabase
        .from("clinics").select("plan, max_doctors").eq("user_id", userId).single();
      const fetchedPlan = (clinicData?.plan ?? "basic") as PlanType;
      if (clinicData?.plan) setPlan(fetchedPlan);
      // max_doctors: يُقرأ من قاعدة البيانات (الأدمن يضبطه) مع fallback للافتراضي
      const fetchedMax = clinicData?.max_doctors ?? SHARED_PLAN_DEFAULT_MAX[fetchedPlan] ?? 0;
      setMaxDoctors(fetchedMax);

      // ── Doctors (only for shared clinic plans) ──
      let doctorList: { id: string; name: string; name_en?: string; color?: string }[] = [];
      if (isSharedPlan(fetchedPlan)) {
        const { data: doctorsData } = await supabase
          .from("clinic_doctors")
          .select("id, name, name_en, color")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        doctorList = doctorsData ?? [];
        setDoctors(doctorList);
        setActiveDoctorCount(doctorList.length);
      }

      const localNow   = new Date();
      const yyyy       = localNow.getFullYear();
      const mm         = String(localNow.getMonth() + 1).padStart(2, "0");
      const dd         = String(localNow.getDate()).padStart(2, "0");
      const todayISO   = `${yyyy}-${mm}-${dd}`;
      const monthStart = `${yyyy}-${mm}-01`;

      // ── Patients ──
      const { data: patientsData } = await supabase
        .from("patients").select("id, name, created_at, doctor_id")
        .eq("user_id", userId).eq("is_hidden", false);
      const patients = patientsData ?? [];
      setTotalPatients(patients.length);
      setNewThisMonth(patients.filter(p => (p.created_at ?? "") >= monthStart).length);

      const patientMap: Record<number, string> = {};
      patients.forEach(p => { patientMap[p.id] = p.name; });

      // ── Appointments ──
      const { data: apptsData } = await supabase
        .from("appointments")
        .select("id, patient_id, date, time, duration, type, status, doctor_id")
        .eq("user_id", userId);
      const appts = apptsData ?? [];

      const todayAppts = appts
        .filter(a => a.date === todayISO)
        .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

      const doctorMap: Record<string, string> = {};
      doctorList.forEach(d => { doctorMap[String(d.id)] = d.name; });

      setTodayTotal(todayAppts.length);
      setTodayCompleted(todayAppts.filter(a => a.status === "completed").length);
      setTodayAppointments(todayAppts.map(a => ({
        ...a,
        patientName: patientMap[a.patient_id] ?? (lang === "ar" ? "مريض" : "Patient"),
        doctorName:  a.doctor_id ? (doctorMap[String(a.doctor_id)] ?? "") : "",
      })));

      const weekStart = new Date(localNow);
      weekStart.setDate(localNow.getDate() - localNow.getDay());
      weekStart.setHours(0,0,0,0);
      const wc = [0,0,0,0,0,0,0];
      appts.forEach(a => {
        if (!a.date) return;
        const d = new Date(a.date + "T00:00:00");
        const diff = Math.round((d.getTime() - weekStart.getTime()) / 86400000);
        if (diff >= 0 && diff <= 6) wc[diff]++;
      });
      setWeekData(wc);
      setMonthTotalVisits(appts.filter(a => (a.date ?? "") >= monthStart).length);

      // ── Payments ──
      const { data: paymentsData } = await supabase
        .from("payments").select("id, amount, status, date")
        .eq("user_id", userId);
      const payments = paymentsData ?? [];

      setMonthRevenue(
        payments
          .filter(p => p.status === "paid" && (p.date ?? "") >= monthStart)
          .reduce((s, p) => s + (Number(p.amount) || 0), 0)
      );
      const pending = payments.filter(p => p.status === "pending");
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
          name:   patientMap[Number(pid)] ?? (lang === "ar" ? "مريض" : "Patient"),
          visits: count as number,
        }));
      setTopPatients(sorted);

    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  // Always format currency/numbers with Western digits
  const fmtCurrency = (n: number) => {
    const formatted = n.toLocaleString("en-US");
    return lang === "ar" ? `${formatted} ${tr.currency}` : `${formatted} ${tr.currency}`;
  };

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
          .stats-grid{grid-template-columns:1fr 1fr!important;gap:12px!important}
          .middle-grid{grid-template-columns:1fr!important;gap:16px!important}
          .bottom-grid{grid-template-columns:1fr!important;gap:16px!important}
          .main-content{margin-left:0!important;margin-right:0!important;padding:0 12px 60px!important}
          .topbar-inner{padding-left:56px!important;padding-right:8px!important}
          .topbar-inner[dir="rtl"]{padding-right:56px!important;padding-left:8px!important;direction:rtl}
          .stat-card-value{font-size:20px!important}
          .stat-card-inner{padding:16px!important}
          .quick-actions-grid{grid-template-columns:repeat(3,1fr)!important;gap:8px!important}
          .action-btn{padding:12px 6px!important;border-radius:12px!important}
          .action-btn-icon{width:40px!important;height:40px!important;font-size:18px!important;border-radius:10px!important}
          .action-btn-label{font-size:11px!important}
          .week-chart-bar-area{height:70px!important}
          .week-chart-day{font-size:9px!important}
          .appt-row{gap:10px!important;padding:12px 0!important}
          .search-input-wrap{display:none!important}
          .topbar-notification{margin-left:auto!important}
          .topbar-greeting h1{font-size:17px!important}
          .topbar-greeting p{font-size:11px!important}
          .section-card{padding:16px!important;border-radius:14px!important}
          .patient-stats-grid{grid-template-columns:1fr 1fr!important;gap:10px!important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <SharedSidebar lang={lang} setLang={setLang} activePage="dashboard" plan={plan} onCollapse={(c) => setSidebarWidth(c ? 70 : 240)} />

        <main
          className="main-fade main-content"
          style={{
            [isAr?"marginRight":"marginLeft"]: sidebarWidth,
            padding:"0 32px 40px", minHeight:"100vh",
            transition:"margin .3s cubic-bezier(.4,0,.2,1)",
          }}
        >

          {/* TOP BAR */}
          <div style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div className="topbar-inner" dir={isAr?"rtl":"ltr"} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div className="topbar-greeting">
                <h1 style={{ fontSize:22,fontWeight:800,color:"#353535",marginBottom:2 }}>
                  {tr.header[greetingKey]} 👋
                </h1>
                <p style={{ fontSize:13,color:"#aaa",fontWeight:400 }}>
                  {toWestern(dateStr)}
                </p>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div className="search-input-wrap" style={{ display:"flex",alignItems:"center",gap:8,background:"#fff",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                  <span style={{ color:"#aaa",fontSize:14 }}>🔍</span>
                  <input
                    placeholder={tr.header.search}
                    style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:160,direction:isAr?"rtl":"ltr" }}
                  />
                </div>
                <button className="topbar-notification" style={{ width:40,height:40,borderRadius:10,background:"#fff",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center" }}>
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
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:18,marginBottom:28 }}>
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
            </div>

            {/* QUICK ACTIONS */}
            <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:"20px 24px",boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3",marginBottom:28 }}>
              <h3 style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:16 }}>{tr.quickActions.title}</h3>
              <div className="quick-actions-grid" style={{ display:"grid",gridTemplateColumns:`repeat(${canAccess("payments",plan)?3:2},1fr)`,gap:12 }}>
                {[
                  { icon:"📅", label:tr.quickActions.newAppointment, color:"#0863ba", bg:"rgba(8,99,186,.08)",   href:"/appointments",  feature: null },
                  { icon:"👤", label:tr.quickActions.addPatient,      color:"#2e7d32", bg:"rgba(46,125,50,.08)",  href:"/patients",      feature: null },
                  { icon:"💳", label:tr.quickActions.recordPayment,   color:"#e67e22", bg:"rgba(230,126,34,.08)", href:"/payments",      feature: "payments" },
                ].filter(a => !a.feature || canAccess(a.feature, plan)).map(a => (
                  <a key={a.label} href={a.href} className="action-btn">
                    <div className="action-btn-icon" style={{ background:a.bg,color:a.color }}>{a.icon}</div>
                    <span className="action-btn-label" style={{ color:a.color }}>{a.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* SHARED PLAN: Doctor filter bar */}
            {isSharedPlan(plan) && doctors.length > 0 && (
              <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:"16px 24px",boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3",marginBottom:28 }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginInlineEnd:8 }}>
                    <span style={{ fontSize:18 }}>👨‍⚕️</span>
                    <span style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{tr.filterByDoctor}</span>
                    <span style={{ fontSize:11,color:"#aaa",marginInlineStart:4 }}>
                      ({toWestern(activeDoctorCount)}/{toWestern(maxDoctors)} {isAr?"طبيب":"drs"})
                    </span>
                  </div>
                  {/* All doctors button */}
                  <button
                    onClick={() => setSelectedDoctorId(null)}
                    style={{
                      padding:"6px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                      background: selectedDoctorId === null ? "#353535" : "#f0f4fa",
                      color: selectedDoctorId === null ? "#fff" : "#555",
                      border: selectedDoctorId === null ? "none" : "1.5px solid #eef0f3",
                      transition:"all .18s",
                    }}
                  >
                    {tr.allDoctors} ({toWestern(todayAppointments.length)})
                  </button>
                  {/* Per-doctor buttons — كل طبيب بلونه الخاص */}
                  {doctors.map(doc => {
                    const docColor = doc.color || getPlanBadge(plan).color;
                    const docAppts = todayAppointments.filter(a => String(a.doctor_id) === String(doc.id));
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        style={{
                          padding:"6px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                          background: isSelected ? docColor : "#f0f4fa",
                          color: isSelected ? "#fff" : "#555",
                          border: isSelected ? `1.5px solid ${docColor}` : "1.5px solid #eef0f3",
                          transition:"all .18s",
                          display:"flex",alignItems:"center",gap:6,
                        }}
                      >
                        <span style={{ width:8,height:8,borderRadius:"50%",background:isSelected?"rgba(255,255,255,.7)":docColor,display:"inline-block",flexShrink:0 }}/>
                        <span>{isAr ? doc.name : (doc.name_en || doc.name)}</span>
                        <span style={{
                          background: isSelected ? "rgba(255,255,255,0.25)" : `${docColor}20`,
                          color: isSelected ? "#fff" : docColor,
                          borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700,
                        }}>
                          {toWestern(docAppts.length)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MIDDLE: Schedule + Week Chart */}
            <div className="middle-grid" style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:20,marginBottom:28 }}>

              {/* Today's Schedule */}
              <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
                  <h3 style={{ fontSize:15,fontWeight:700,color:"#353535" }}>
                    {tr.todaySchedule.title}
                    {isSharedPlan(plan) && selectedDoctorId !== null && (
                      <span style={{ fontSize:12,color:getPlanBadge(plan).color,marginInlineStart:8,fontWeight:500 }}>
                        — {doctors.find(d=>d.id===selectedDoctorId)?.name}
                      </span>
                    )}
                  </h3>
                  <a href="/appointments" style={{ fontSize:12,color:"#0863ba",textDecoration:"none",fontWeight:600 }}>{tr.todaySchedule.viewAll} →</a>
                </div>

                {loadingStats ? (
                  <div style={{ padding:"40px 0",textAlign:"center",color:"#ccc" }}>
                    <div style={{ fontSize:32,marginBottom:10,animation:"pulse 1.5s ease infinite" }}>📅</div>
                    <div style={{ fontSize:13 }}>{tr.loading}</div>
                  </div>
                ) : (() => {
                  const filteredAppts = isSharedPlan(plan) && selectedDoctorId !== null
                    ? todayAppointments.filter(a => String(a.doctor_id) === String(selectedDoctorId))
                    : todayAppointments;
                  if (filteredAppts.length === 0) return (
                    <div style={{ textAlign:"center",padding:"40px 20px",color:"#ccc" }}>
                      <div style={{ fontSize:36,marginBottom:10 }}>📭</div>
                      <div style={{ fontSize:13,fontWeight:600 }}>{tr.todaySchedule.noAppointments}</div>
                    </div>
                  );
                  return filteredAppts.map((appt, idx) => {
                    const sc = statusColors[appt.status] ?? statusColors.scheduled;
                    return (
                      <div key={appt.id ?? idx} className="appt-row">
                        <div style={{ width:52,textAlign:"center",flexShrink:0 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:"#0863ba",fontVariantNumeric:"tabular-nums" }}>
                            {appt.time?.slice(0,5) ?? "—"}
                          </div>
                          {appt.duration && (
                            <div style={{ fontSize:10,color:"#bbb",fontVariantNumeric:"tabular-nums" }}>
                              {toWestern(appt.duration)}m
                            </div>
                          )}
                        </div>
                        <div style={{ width:2,height:40,background:sc.color,borderRadius:4,flexShrink:0,opacity:.4 }} />
                        <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:getColor(appt.patient_id??idx+1),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700 }}>
                          {getInitials(appt.patientName)}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{appt.patientName}</div>
                          {/* Show doctor name only in clinic plans when viewing all doctors */}
                          {isSharedPlan(plan) && selectedDoctorId === null && appt.doctorName ? (
                            <div style={{ fontSize:11,color:getPlanBadge(plan).color,marginTop:2,fontWeight:500 }}>
                              👨‍⚕️ {appt.doctorName}
                            </div>
                          ) : appt.type ? (
                            <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>{appt.type}</div>
                          ) : null}
                        </div>
                        <div style={{ padding:"4px 10px",borderRadius:20,background:sc.bg,color:sc.color,fontSize:11,fontWeight:600,flexShrink:0 }}>
                          {tr.todaySchedule.statuses[appt.status as keyof typeof tr.todaySchedule.statuses] ?? appt.status}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Week Chart */}
              <WeekChart lang={lang} data={weekData} />
            </div>

            {/* BOTTOM: Patient Stats + Top Patients */}
            <div className="bottom-grid" style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20 }}>

              {/* Patient Stats */}
              <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
                <h3 style={{ fontSize:15,fontWeight:700,color:"#353535",marginBottom:20 }}>{tr.patientStats}</h3>

                <div className="patient-stats-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                  {(isSharedPlan(plan) ? [
                    { label:tr.apptThisMonth,     value:String(monthTotalVisits), color:getPlanBadge(plan).color, bg:`${getPlanBadge(plan).color}10`, icon:"📅" },
                    { label:tr.dailyAvgLabel,      value:dailyAvg,                color:"#2e7d32", bg:"rgba(46,125,50,.06)",  icon:"📊" },
                    { label:tr.activeDoctors,      value:String(activeDoctorCount), color:"#7b2d8b", bg:"rgba(123,45,139,.06)", icon:"👨‍⚕️" },
                    { label:tr.totalPatientsLabel, value:String(totalPatients),   color:"#e67e22", bg:"rgba(230,126,34,.06)", icon:"👥" },
                  ] : [
                    { label:tr.apptThisMonth,     value:String(monthTotalVisits), color:"#0863ba", bg:"rgba(8,99,186,.06)",   icon:"📅" },
                    { label:tr.dailyAvgLabel,      value:dailyAvg,                color:"#2e7d32", bg:"rgba(46,125,50,.06)",  icon:"📊" },
                    { label:tr.newPatientsMonth,   value:String(newThisMonth),    color:"#7b2d8b", bg:"rgba(123,45,139,.06)", icon:"👤" },
                    { label:tr.totalPatientsLabel, value:String(totalPatients),   color:"#e67e22", bg:"rgba(230,126,34,.06)", icon:"👥" },
                  ]).map((s,i) => (
                    <div key={i} style={{ background:s.bg,borderRadius:12,padding:"14px 16px",border:`1.5px solid ${s.color}20` }}>
                      <div style={{ fontSize:18,marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:22,fontWeight:800,color:s.color,lineHeight:1,fontVariantNumeric:"tabular-nums" }}>
                        {loadingStats ? "—" : toWestern(s.value)}
                      </div>
                      <div style={{ fontSize:11,color:"#888",marginTop:4,fontWeight:500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* إحصائية خاصة بالعيادات المشتركة: مواعيد اليوم لكل طبيب */}
                {isSharedPlan(plan) && !loadingStats && doctors.length > 0 && (
                  <div style={{ padding:14,background:`${getPlanBadge(plan).color}08`,borderRadius:12,border:`1px solid ${getPlanBadge(plan).color}20`,marginBottom:12 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:10 }}>
                      {isAr ? "مواعيد اليوم لكل طبيب" : "Today's Appointments per Doctor"}
                    </div>
                    {doctors.map((doc, di) => {
                      const docColor = doc.color || AVATAR_COLORS[di % AVATAR_COLORS.length];
                      const cnt = todayAppointments.filter(a => String(a.doctor_id) === String(doc.id)).length;
                      const pct = todayTotal > 0 ? Math.round((cnt / todayTotal) * 100) : 0;
                      return (
                        <div key={doc.id} style={{ marginBottom:10 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <span style={{ width:8,height:8,borderRadius:"50%",background:docColor,display:"inline-block",flexShrink:0 }}/>
                              <span style={{ fontSize:12,fontWeight:600,color:"#353535" }}>{isAr ? doc.name : (doc.name_en || doc.name)}</span>
                            </div>
                            <span style={{ fontSize:12,fontWeight:700,color:docColor,fontVariantNumeric:"tabular-nums" }}>
                              {toWestern(cnt)} {isAr?"موعد":"appts"} · {toWestern(pct)}%
                            </span>
                          </div>
                          <div style={{ height:5,background:"#eef0f3",borderRadius:10,overflow:"hidden" }}>
                            <div style={{ height:"100%",width:`${pct}%`,background:docColor,borderRadius:10,transition:"width .8s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Today breakdown */}
                {!loadingStats && todayAppointments.length > 0 && (
                  <div style={{ padding:16,background:"#f9fafb",borderRadius:12,border:"1px solid #eef0f3" }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#888",marginBottom:12 }}>{tr.todayBreakdown}</div>
                    {Object.entries(
                      todayAppointments.reduce((acc: Record<string,number>, a) => {
                        acc[a.status] = (acc[a.status]||0) + 1;
                        return acc;
                      }, {})
                    ).map(([status, countVal]) => {
                      const count = countVal as number;
                      const sc    = statusColors[status] ?? statusColors.scheduled;
                      const pct   = Math.round((count / todayTotal) * 100);
                      return (
                        <div key={status} style={{ marginBottom:8 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                            <span style={{ fontSize:11,color:sc.color,fontWeight:600 }}>
                              {tr.todaySchedule.statuses[status as keyof typeof tr.todaySchedule.statuses] ?? status}
                            </span>
                            <span style={{ fontSize:11,color:"#888",fontVariantNumeric:"tabular-nums" }}>
                              {toWestern(count)} ({toWestern(pct)}%)
                            </span>
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
              <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:"1.5px solid #eef0f3" }}>
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
                          <div style={{ width:18,height:18,borderRadius:"50%",background:i===0?"#e67e22":i===1?"#888":"#a4c4e4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700,flexShrink:0 }}>
                            {toWestern(i+1)}
                          </div>
                          <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700 }}>
                            {getInitials(p.name)}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:12,fontWeight:600,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{p.name}</div>
                            <div style={{ marginTop:5,height:4,background:"#f0f2f5",borderRadius:10,overflow:"hidden" }}>
                              <div style={{ height:"100%",width:`${(p.visits/maxV)*100}%`,background:getColor(p.id),borderRadius:10,transition:"width 1s ease" }} />
                            </div>
                          </div>
                          <div style={{ fontSize:11,color:"#888",fontWeight:600,flexShrink:0,fontVariantNumeric:"tabular-nums" }}>
                            {toWestern(p.visits)} {tr.topPatients.visits}
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ marginTop:20,padding:14,background:"rgba(8,99,186,.04)",borderRadius:10,border:"1px dashed rgba(8,99,186,.2)" }}>
                      <div style={{ fontSize:11,color:"#888",marginBottom:8,fontWeight:500 }}>{tr.monthlySummary}</div>
                      {[
                        { label:tr.monthlyVisits, value:toWestern(monthTotalVisits) },
                        { label:tr.dailyAvg,      value:toWestern(dailyAvg)         },
                      ].map(s => (
                        <div key={s.label} style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:12,color:"#aaa" }}>{s.label}</span>
                          <span style={{ fontSize:12,fontWeight:700,color:"#0863ba",fontVariantNumeric:"tabular-nums" }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* SHARED PLAN: ملخص أداء كل طبيب اليوم */}
            {isSharedPlan(plan) && doctors.length > 0 && !loadingStats && (
              <div className="section-card" style={{ background:"#fff",borderRadius:16,padding:24,boxShadow:"0 2px 16px rgba(8,99,186,.07)",border:`1.5px solid ${getPlanBadge(plan).color}30`,marginTop:20 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}>
                  <span style={{ fontSize:20 }}>👨‍⚕️</span>
                  <div>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#353535",margin:0 }}>{tr.todayByDoctor}</h3>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                      {isAr ? `${activeDoctorCount} أطباء نشطون · حد أقصى ${maxDoctors}` : `${activeDoctorCount} active doctors · max ${maxDoctors}`}
                    </div>
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12 }}>
                  {doctors.map((doc, di) => {
                    const docColor   = doc.color || AVATAR_COLORS[di % AVATAR_COLORS.length];
                    const docAppts   = todayAppointments.filter(a => String(a.doctor_id) === String(doc.id));
                    const docDone    = docAppts.filter(a => a.status === "completed").length;
                    const docPending = docAppts.filter(a => a.status === "scheduled").length;
                    const pct        = docAppts.length > 0 ? Math.round((docDone / docAppts.length) * 100) : 0;
                    const isSelected = selectedDoctorId === doc.id;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(isSelected ? null : doc.id)}
                        style={{
                          padding:16,borderRadius:14,cursor:"pointer",
                          border: isSelected ? `2px solid ${docColor}` : `1.5px solid ${docColor}25`,
                          background: isSelected ? `${docColor}08` : "#fafbfc",
                          transition:"all .18s",
                          boxShadow: isSelected ? `0 4px 16px ${docColor}20` : "none",
                        }}
                      >
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
                          <div style={{ width:40,height:40,borderRadius:12,background:docColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0,boxShadow:`0 3px 10px ${docColor}40` }}>
                            {getInitials(doc.name)}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13,fontWeight:700,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                              {isAr ? doc.name : (doc.name_en || doc.name)}
                            </div>
                            <div style={{ fontSize:10,color:docColor,fontWeight:600,marginTop:2 }}>{tr.doctorLabel}</div>
                          </div>
                          {isSelected && <span style={{ fontSize:16 }}>✓</span>}
                        </div>
                        {/* إجمالي المواعيد */}
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                          <span style={{ fontSize:11,color:"#888" }}>{tr.stats.todayAppointments}</span>
                          <span style={{ fontSize:18,fontWeight:800,color:docColor,fontVariantNumeric:"tabular-nums" }}>{toWestern(docAppts.length)}</span>
                        </div>
                        {/* شريط التقدم */}
                        <div style={{ height:6,background:"#eef0f3",borderRadius:10,overflow:"hidden",marginBottom:8 }}>
                          <div style={{ height:"100%",width:`${pct}%`,background:docColor,borderRadius:10,transition:"width .8s ease" }} />
                        </div>
                        {/* تفاصيل */}
                        <div style={{ display:"flex",justifyContent:"space-between" }}>
                          <span style={{ fontSize:10,color:"#2e7d32",fontWeight:600,fontVariantNumeric:"tabular-nums" }}>
                            ✓ {toWestern(docDone)} {isAr?"مكتمل":"done"}
                          </span>
                          <span style={{ fontSize:10,color:"#0863ba",fontWeight:600,fontVariantNumeric:"tabular-nums" }}>
                            ⏳ {toWestern(docPending)} {isAr?"متبقي":"pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Popup الإشعارات ─────────────────────────────────── */}
      {showPushPrompt && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,.45)",
          zIndex: 200,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "0 0 32px",
          animation: "fadeIn .25s ease",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 20,
            padding: "24px 24px 20px",
            width: "100%",
            maxWidth: 400,
            boxShadow: "0 -4px 40px rgba(0,0,0,.15)",
            direction: isAr ? "rtl" : "ltr",
            fontFamily: "Rubik, sans-serif",
            animation: "slideUp .3s cubic-bezier(.4,0,.2,1)",
          }}>
            {/* أيقونة وعنوان */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: "linear-gradient(135deg,#0863ba,#0558a8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, flexShrink: 0,
                boxShadow: "0 4px 12px rgba(8,99,186,.3)",
              }}>🔔</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2840", lineHeight: 1.2 }}>
                  {isAr ? "فعّل الإشعارات" : "Enable Notifications"}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>
                  {isAr ? "نبض · إدارة العيادة" : "NABD · Clinic Manager"}
                </div>
              </div>
            </div>

            {/* النص */}
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.65, margin: "0 0 20px" }}>
              {isAr
                ? "فعّل الإشعارات لتلقي تنبيه فوري عند كل حجز موعد جديد أو طلب يحتاج موافقتك. 📅"
                : "Enable notifications to get instant alerts for new appointments and approval requests. 📅"}
            </p>

            {/* الأزرار */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handlePushPromptAccept}
                style={{
                  flex: 1, padding: "13px 0", borderRadius: 12,
                  background: "linear-gradient(135deg,#0863ba,#0558a8)",
                  color: "#fff", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 700, fontFamily: "Rubik,sans-serif",
                  boxShadow: "0 4px 14px rgba(8,99,186,.35)",
                  transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                {isAr ? "تفعيل الآن" : "Enable Now"}
              </button>
              <button
                onClick={handlePushPromptDismiss}
                style={{
                  padding: "13px 20px", borderRadius: 12,
                  background: "#f5f7fa", color: "#888",
                  border: "1.5px solid #eef0f3", cursor: "pointer",
                  fontSize: 14, fontWeight: 500, fontFamily: "Rubik,sans-serif",
                }}
              >
                {isAr ? "لاحقاً" : "Later"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
