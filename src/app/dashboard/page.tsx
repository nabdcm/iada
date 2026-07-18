"use client";

import { useState, useEffect, useCallback, type JSX, type DragEvent } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Dashboard v2 — إعادة تصميم كاملة
// بطاقات قابلة للسحب · بدون أي بيانات مالية · هوية لونية أقوى
// ============================================================

const BRAND = {
  primary: "#0863ba",
  primaryDark: "#054a8c",
  primaryLight: "#3d8fd6",
  sky: "#eaf3fc",
  green: "#2e7d32",
  purple: "#7b2d8b",
  orange: "#e67e22",
  teal: "#16a085",
  ink: "#1c2b3a",
  muted: "#8a97a6",
  border: "#e6edf5",
  bg: "#f4f8fc",
};

const t = {
  ar: {
    header: {
      greeting_morning: "صباح الخير", greeting_afternoon: "مساء الخير",
      greeting_evening: "مساء النور", subtitle: "إليك ملخص نشاط العيادة اليوم",
      search: "بحث...",
      dragHint: "اسحب البطاقات لإعادة ترتيبها",
      resetLayout: "استعادة الترتيب الافتراضي",
    },
    stats: {
      todayAppointments: "مواعيد اليوم", totalPatients: "إجمالي المرضى",
      monthVisits: "زيارات هذا الشهر", newPatients: "مرضى جدد",
      completed: "مكتمل", remaining: "متبقي",
      thisMonth: "هذا الشهر", dailyAvg: "متوسط يومي",
    },
    quickActions: {
      title: "إجراءات سريعة",
      newAppointment: "موعد جديد", newAppointmentSub: "حجز موعد لمريض",
      addPatient: "إضافة مريض", addPatientSub: "تسجيل ملف جديد",
      prescriptions: "وصفة طبية", prescriptionsSub: "إنشاء وصفة",
      tracking: "متابعة مريض", trackingSub: "خطط المتابعة",
    },
    todaySchedule: {
      title: "مواعيد اليوم", viewAll: "عرض الكل",
      noAppointments: "لا توجد مواعيد اليوم", relax: "يوم هادئ ✨",
      statuses: { scheduled: "محدد", completed: "مكتمل", cancelled: "ملغي", "no-show": "لم يحضر" } as Record<string, string>,
      now: "الآن",
    },
    topPatients: { title: "أكثر المرضى زيارةً", visits: "زيارة", empty: "لا توجد بيانات" },
    weekChart: { title: "المواعيد هذا الأسبوع", days: ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"], total: "الإجمالي" },
    patientStats: {
      title: "إحصائيات المرضى",
      apptThisMonth: "مواعيد هذا الشهر", dailyAvgLabel: "متوسط يومي",
      newPatientsMonth: "مرضى جدد هذا الشهر", totalPatientsLabel: "إجمالي المرضى",
      activeDoctors: "الأطباء النشطون",
    },
    filterByDoctor: "تصفية حسب الطبيب", allDoctors: "كل الأطباء",
    loading: "جاري التحميل...", noData: "لا توجد بيانات",
  },
  en: {
    header: {
      greeting_morning: "Good Morning", greeting_afternoon: "Good Afternoon",
      greeting_evening: "Good Evening", subtitle: "Here's your clinic activity summary for today",
      search: "Search...",
      dragHint: "Drag cards to reorder",
      resetLayout: "Reset default layout",
    },
    stats: {
      todayAppointments: "Today's Appointments", totalPatients: "Total Patients",
      monthVisits: "Visits This Month", newPatients: "New Patients",
      completed: "Completed", remaining: "Remaining",
      thisMonth: "this month", dailyAvg: "daily avg",
    },
    quickActions: {
      title: "Quick Actions",
      newAppointment: "New Appointment", newAppointmentSub: "Book a patient slot",
      addPatient: "Add Patient", addPatientSub: "Register new record",
      prescriptions: "Prescription", prescriptionsSub: "Create prescription",
      tracking: "Track Patient", trackingSub: "Follow-up plans",
    },
    todaySchedule: {
      title: "Today's Schedule", viewAll: "View All",
      noAppointments: "No appointments today", relax: "Quiet day ✨",
      statuses: { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", "no-show": "No Show" } as Record<string, string>,
      now: "Now",
    },
    topPatients: { title: "Most Visited Patients", visits: "visits", empty: "No data yet" },
    weekChart: { title: "Appointments This Week", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], total: "Total" },
    patientStats: {
      title: "Patient Stats",
      apptThisMonth: "Appointments this month", dailyAvgLabel: "Daily average",
      newPatientsMonth: "New patients this month", totalPatientsLabel: "Total patients",
      activeDoctors: "Active Doctors",
    },
    filterByDoctor: "Filter by Doctor", allDoctors: "All Doctors",
    loading: "Loading...", noData: "No data yet",
  },
} as const;

type Lang = "ar" | "en";
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

const isSharedPlan = (plan: PlanType) =>
  ["shared_basic", "shared_pro", "shared_enterprise"].includes(plan);

const PLAN_ACCESS: Record<string, string[]> = {
  prescriptions: ["enterprise", "shared_enterprise"],
  tracking:      ["enterprise", "shared_enterprise"],
};
const canAccess = (feature: string, plan: PlanType) =>
  PLAN_ACCESS[feature] ? (PLAN_ACCESS[feature] ?? []).includes(plan) : true;

const SHARED_PLAN_DEFAULT_MAX: Record<string, number> = {
  shared_basic: 2, shared_pro: 3, shared_enterprise: 5,
};

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor = (id: number) => AVATAR_COLORS[Math.abs(id ?? 0) % AVATAR_COLORS.length] ?? BRAND.primary;
const getInitials = (name: string) =>
  (name || "?").split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase() || "?";

const toWestern = (val: string | number): string =>
  String(val).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

function getGreetingKey(): "greeting_morning" | "greeting_afternoon" | "greeting_evening" {
  const h = new Date().getHours();
  if (h < 12) return "greeting_morning";
  if (h < 17) return "greeting_afternoon";
  return "greeting_evening";
}

// ─── SVG Icons (بدل الإيموجي — مظهر أنظف) ─────────────────
const Ico = {
  calendar: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  users: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  activity: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  userPlus: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
    </svg>
  ),
  rx: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>
    </svg>
  ),
  heart: (c: string, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>
    </svg>
  ),
  grip: (c: string, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}>
      <circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>
      <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
      <circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>
    </svg>
  ),
  arrow: (c: string, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
};

// ─── Types ────────────────────────────────────────────────
type Appt = {
  id: number; patient_id: number; date: string; time: string;
  duration?: number; type?: string; status: string; doctor_id?: string | null;
  patientName: string; doctorName: string;
};
type TopPatient = { id: number; name: string; count: number };
type Doctor = { id: string; name: string; name_en?: string; color?: string };
type PatientRow = { id: number; name: string; created_at?: string | null; doctor_id?: string | null };
type ApptRow = { id: number; patient_id: number; date: string | null; time: string | null; duration?: number | null; type?: string | null; status: string; doctor_id?: string | null };

// ─── StatCard v2 — تدرج لوني وشريط تقدم ──────────────────
function StatCard({ icon, label, value, sub, accent, accentSoft, delay, loading, progress }: {
  icon: JSX.Element; label: string; value: string; sub?: string;
  accent: string; accentSoft: string; delay: number; loading: boolean; progress?: number;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShow(true), delay); return () => clearTimeout(id); }, [delay]);
  return (
    <div className="stat-card-v2" style={{
      background: "#fff", borderRadius: 20, padding: "20px 22px",
      border: `1.5px solid ${BRAND.border}`,
      boxShadow: "0 4px 20px rgba(8,99,186,.06)",
      opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)",
      transition: "opacity .5s ease, transform .5s cubic-bezier(.4,0,.2,1)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, insetInlineStart: 0, width: "100%", height: 4,
        background: `linear-gradient(90deg, ${accent}, ${accent}55)`,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 14, background: accentSoft,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
        {typeof progress === "number" && (
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: accentSoft, padding: "4px 10px", borderRadius: 20 }}>
            {toWestern(Math.round(progress))}%
          </span>
        )}
      </div>
      <div className="stat-card-v2-value" style={{ fontSize: 30, fontWeight: 800, color: BRAND.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums", marginBottom: 6 }}>
        {loading ? <span style={{ color: BRAND.border }}>—</span> : toWestern(value)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: BRAND.muted, marginBottom: sub ? 8 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, fontWeight: 600, color: accent }}>{toWestern(sub)}</div>}
      {typeof progress === "number" && (
        <div style={{ marginTop: 10, height: 5, borderRadius: 3, background: BRAND.bg, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${accent}, ${accent}99)`, borderRadius: 3, transition: "width .9s cubic-bezier(.4,0,.2,1)" }} />
        </div>
      )}
    </div>
  );
}

// ─── WeekChart v2 ─────────────────────────────────────────
function WeekChart({ lang, data }: { lang: Lang; data: number[] }) {
  const tr = t[lang];
  const max = Math.max(...data, 1);
  const today = new Date().getDay();
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: BRAND.muted, fontWeight: 600 }}>
          {tr.weekChart.total}: <span style={{ color: BRAND.primary, fontWeight: 800 }}>{toWestern(total)}</span>
        </span>
      </div>
      <div className="week-chart-bar-area" style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
        {data.map((val, i) => {
          const isToday = i === today;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 10.5, color: isToday ? BRAND.primary : "#c3ccd6", fontWeight: isToday ? 800 : 500, fontVariantNumeric: "tabular-nums" }}>
                {toWestern(val)}
              </div>
              <div style={{ width: "100%", height: 82, display: "flex", alignItems: "flex-end" }}>
                <div style={{
                  width: "100%", borderRadius: 8,
                  height: `${Math.max((val / max) * 100, val > 0 ? 10 : 3)}%`,
                  background: isToday
                    ? `linear-gradient(180deg, ${BRAND.primary}, ${BRAND.primaryLight})`
                    : "#e9eff7",
                  boxShadow: isToday ? "0 4px 12px rgba(8,99,186,.35)" : "none",
                  transition: "height .8s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
              <div className="week-chart-day" style={{ fontSize: 10, color: isToday ? BRAND.primary : "#b3bdc9", fontWeight: isToday ? 800 : 500, whiteSpace: "nowrap" }}>
                {tr.weekChart.days[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Draggable Section wrapper ────────────────────────────
function DraggableCard({ id, title, children, onDragStart, onDragOver, onDrop, dragging, dragOver, badge }: {
  id: string; title: string; children: JSX.Element | JSX.Element[];
  onDragStart: (id: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (id: string) => void;
  dragging: boolean; dragOver: boolean;
  badge?: JSX.Element | null;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={e => onDragOver(e, id)}
      onDrop={() => onDrop(id)}
      className="section-card-v2"
      style={{
        background: "#fff", borderRadius: 20, padding: 24,
        border: dragOver ? `2px dashed ${BRAND.primary}` : `1.5px solid ${BRAND.border}`,
        boxShadow: dragging ? "0 16px 40px rgba(8,99,186,.22)" : "0 4px 20px rgba(8,99,186,.06)",
        opacity: dragging ? 0.55 : 1,
        transform: dragging ? "scale(.985)" : "scale(1)",
        transition: "box-shadow .25s ease, opacity .25s ease, transform .25s ease, border .15s ease",
        cursor: "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="drag-grip" style={{ cursor: "grab", display: "flex", opacity: .45 }} title="اسحب">
            {Ico.grip(BRAND.muted)}
          </span>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: BRAND.ink }}>{title}</h3>
        </div>
        {badge ?? null}
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────
const DEFAULT_ORDER = ["today", "week", "stats", "top"];

export default function DashboardPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const isAr = lang === "ar";
  const tr = t[lang];

  // data
  const [plan, setPlan] = useState<PlanType>("basic");
  const [loadingStats, setLoadingStats] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  const [newThisMonth, setNewThisMonth] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<Appt[]>([]);
  const [weekData, setWeekData] = useState<number[]>([0,0,0,0,0,0,0]);
  const [monthTotalVisits, setMonthTotalVisits] = useState(0);
  const [topPatients, setTopPatients] = useState<TopPatient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [activeDoctorCount, setActiveDoctorCount] = useState(0);
  const [maxDoctors, setMaxDoctors] = useState(0);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // drag & drop order
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nabd_dash_order_v2");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(x => typeof x === "string")
            && DEFAULT_ORDER.every(k => (parsed as string[]).includes(k))) {
          setOrder(parsed as string[]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const saveOrder = (next: string[]) => {
    setOrder(next);
    try { localStorage.setItem("nabd_dash_order_v2", JSON.stringify(next)); } catch { /* ignore */ }
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (id !== overId) setOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    if (from < 0 || to < 0) { setDragId(null); setOverId(null); return; }
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    saveOrder(next);
    setDragId(null); setOverId(null);
  };
  const resetLayout = () => saveOrder([...DEFAULT_ORDER]);

  // ─── Load data (نفس منطق الجلب السابق — بدون أي مالية) ──
  const loadData = useCallback(async () => {
    setLoadingStats(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setLoadingStats(false); return; }
    const userId = user.id;
    setCurrentUserId(userId);

    // plan
    const { data: profileData } = await supabase
      .from("clinics").select("plan, max_doctors").eq("user_id", userId).maybeSingle();
    const fetchedPlan = ((profileData?.plan as PlanType | undefined) ?? "basic");
    setPlan(fetchedPlan);
    const fetchedMax: number =
      (profileData?.max_doctors as number | null | undefined) ??
      SHARED_PLAN_DEFAULT_MAX[fetchedPlan] ?? 0;
    setMaxDoctors(fetchedMax);

    let doctorList: Doctor[] = [];
    if (isSharedPlan(fetchedPlan)) {
      const { data: doctorsData } = await supabase
        .from("clinic_doctors")
        .select("id, name, name_en, color")
        .eq("user_id", userId).eq("is_active", true)
        .order("created_at", { ascending: true });
      doctorList = (doctorsData ?? []) as Doctor[];
      setDoctors(doctorList);
      setActiveDoctorCount(doctorList.length);
    }

    const localNow = new Date();
    const yyyy = localNow.getFullYear();
    const mm = String(localNow.getMonth() + 1).padStart(2, "0");
    const dd = String(localNow.getDate()).padStart(2, "0");
    const todayISO = `${yyyy}-${mm}-${dd}`;
    const monthStart = `${yyyy}-${mm}-01`;

    // patients
    const { data: patientsData } = await supabase
      .from("patients").select("id, name, created_at, doctor_id")
      .eq("user_id", userId).eq("is_hidden", false);
    const patients: PatientRow[] = (patientsData ?? []) as PatientRow[];
    setTotalPatients(patients.length);
    setNewThisMonth(patients.filter(p => (p.created_at ?? "") >= monthStart).length);
    const patientMap: Record<number, string> = {};
    patients.forEach(p => { patientMap[p.id as number] = p.name as string; });

    // appointments
    const { data: apptsData } = await supabase
      .from("appointments")
      .select("id, patient_id, date, time, duration, type, status, doctor_id")
      .eq("user_id", userId);
    const appts: ApptRow[] = (apptsData ?? []) as ApptRow[];

    const doctorMap: Record<string, string> = {};
    doctorList.forEach(d => { doctorMap[String(d.id)] = d.name; });

    const filtered = selectedDoctorId
      ? appts.filter(a => String(a.doctor_id ?? "") === selectedDoctorId)
      : appts;

    const todayAppts = filtered
      .filter(a => a.date === todayISO)
      .sort((a, b) => ((a.time as string) ?? "").localeCompare((b.time as string) ?? ""));

    setTodayTotal(todayAppts.length);
    setTodayCompleted(todayAppts.filter(a => a.status === "completed").length);
    setTodayAppointments(todayAppts.map(a => ({
      id: a.id as number,
      patient_id: a.patient_id as number,
      date: a.date as string,
      time: (a.time as string) ?? "",
      duration: (a.duration as number | undefined) ?? undefined,
      type: (a.type as string | undefined) ?? undefined,
      status: a.status as string,
      doctor_id: (a.doctor_id as string | null | undefined) ?? null,
      patientName: patientMap[a.patient_id as number] ?? (isAr ? "مريض" : "Patient"),
      doctorName: a.doctor_id ? (doctorMap[String(a.doctor_id)] ?? "") : "",
    })));

    // week
    const weekStart = new Date(localNow);
    weekStart.setDate(localNow.getDate() - localNow.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const wc = [0,0,0,0,0,0,0];
    filtered.forEach(a => {
      if (!a.date) return;
      const d = new Date((a.date as string) + "T00:00:00");
      const diff = Math.round((d.getTime() - weekStart.getTime()) / 86400000);
      if (diff >= 0 && diff <= 6) wc[diff] = (wc[diff] ?? 0) + 1;
    });
    setWeekData(wc);
    setMonthTotalVisits(filtered.filter(a => ((a.date as string) ?? "") >= monthStart).length);

    // top patients
    const counts: Record<number, number> = {};
    filtered.forEach(a => {
      const pid = a.patient_id as number;
      counts[pid] = (counts[pid] ?? 0) + 1;
    });
    const top = Object.entries(counts)
      .map(([pid, count]) => ({ id: Number(pid), name: patientMap[Number(pid)] ?? "?", count }))
      .filter(p => p.name !== "?")
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setTopPatients(top);

    setLoadingStats(false);
  }, [selectedDoctorId, isAr]);

  useEffect(() => { void loadData(); }, [loadData]);

  const greetingKey = getGreetingKey();
  const dateStr = new Date().toLocaleDateString(isAr ? "ar-SY" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const dailyAvg = (monthTotalVisits / Math.max(new Date().getDate(), 1)).toFixed(1);
  const todayProgress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  const statusStyle = (s: string): { bg: string; color: string } => {
    switch (s) {
      case "completed": return { bg: "rgba(46,125,50,.1)", color: BRAND.green };
      case "cancelled": return { bg: "rgba(192,57,43,.1)", color: "#c0392b" };
      case "no-show":   return { bg: "rgba(0,0,0,.06)", color: "#777" };
      default:          return { bg: "rgba(8,99,186,.1)", color: BRAND.primary };
    }
  };

  // ─── Sections (draggable) ───────────────────────────────
  const sections: Record<string, JSX.Element> = {
    today: (
      <DraggableCard
        key="today" id="today" title={tr.todaySchedule.title}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
        dragging={dragId === "today"} dragOver={overId === "today" && dragId !== "today"}
        badge={
          <a href="/appointments" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: BRAND.primary, textDecoration: "none", background: BRAND.sky, padding: "6px 14px", borderRadius: 20 }}>
            {tr.todaySchedule.viewAll}
            <span style={{ transform: isAr ? "scaleX(-1)" : "none", display: "flex" }}>{Ico.arrow(BRAND.primary)}</span>
          </a>
        }
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loadingStats ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: BRAND.muted, fontSize: 13 }}>{tr.loading}</div>
          ) : todayAppointments.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>🌤️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.ink, marginBottom: 2 }}>{tr.todaySchedule.noAppointments}</div>
              <div style={{ fontSize: 12, color: BRAND.muted }}>{tr.todaySchedule.relax}</div>
            </div>
          ) : todayAppointments.slice(0, 6).map((appt, idx) => {
            const sc = statusStyle(appt.status);
            return (
              <div key={appt.id} className="appt-row-v2" style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 10px",
                borderRadius: 14,
                borderBottom: idx < Math.min(todayAppointments.length, 6) - 1 ? `1px solid ${BRAND.bg}` : "none",
              }}>
                <div style={{
                  minWidth: 52, textAlign: "center", background: BRAND.sky, borderRadius: 10,
                  padding: "7px 4px", fontSize: 12.5, fontWeight: 800, color: BRAND.primary, fontVariantNumeric: "tabular-nums",
                }}>
                  {toWestern(appt.time.slice(0, 5))}
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  background: `${getColor(appt.patient_id)}18`, color: getColor(appt.patient_id),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                }}>{getInitials(appt.patientName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {appt.patientName}
                  </div>
                  <div style={{ fontSize: 11, color: BRAND.muted, marginTop: 2, display: "flex", gap: 8 }}>
                    {appt.type ? <span>{appt.type}</span> : null}
                    {appt.doctorName ? <span style={{ color: BRAND.purple }}>· {appt.doctorName}</span> : null}
                  </div>
                </div>
                <div style={{ padding: "5px 12px", borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {tr.todaySchedule.statuses[appt.status] ?? appt.status}
                </div>
              </div>
            );
          })}
        </div>
      </DraggableCard>
    ),

    week: (
      <DraggableCard
        key="week" id="week" title={tr.weekChart.title}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
        dragging={dragId === "week"} dragOver={overId === "week" && dragId !== "week"}
      >
        <WeekChart lang={lang} data={weekData} />
      </DraggableCard>
    ),

    stats: (
      <DraggableCard
        key="stats" id="stats" title={tr.patientStats.title}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
        dragging={dragId === "stats"} dragOver={overId === "stats" && dragId !== "stats"}
      >
        <div className="patient-stats-grid-v2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {(isSharedPlan(plan) ? [
            { label: tr.patientStats.apptThisMonth, value: String(monthTotalVisits), color: BRAND.primary },
            { label: tr.patientStats.dailyAvgLabel, value: dailyAvg, color: BRAND.green },
            { label: tr.patientStats.activeDoctors, value: `${activeDoctorCount}/${maxDoctors}`, color: BRAND.purple },
            { label: tr.patientStats.totalPatientsLabel, value: String(totalPatients), color: BRAND.orange },
          ] : [
            { label: tr.patientStats.apptThisMonth, value: String(monthTotalVisits), color: BRAND.primary },
            { label: tr.patientStats.dailyAvgLabel, value: dailyAvg, color: BRAND.green },
            { label: tr.patientStats.newPatientsMonth, value: String(newThisMonth), color: BRAND.purple },
            { label: tr.patientStats.totalPatientsLabel, value: String(totalPatients), color: BRAND.orange },
          ]).map((s, i) => (
            <div key={i} style={{
              background: `linear-gradient(135deg, ${s.color}0d, ${s.color}05)`,
              borderRadius: 14, padding: "16px 18px", border: `1.5px solid ${s.color}22`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {loadingStats ? "—" : toWestern(s.value)}
              </div>
              <div style={{ fontSize: 11.5, color: BRAND.muted, fontWeight: 600, marginTop: 7 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </DraggableCard>
    ),

    top: (
      <DraggableCard
        key="top" id="top" title={tr.topPatients.title}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
        dragging={dragId === "top"} dragOver={overId === "top" && dragId !== "top"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {loadingStats ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: BRAND.muted, fontSize: 13 }}>{tr.loading}</div>
          ) : topPatients.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: BRAND.muted, fontSize: 13 }}>{tr.topPatients.empty}</div>
          ) : topPatients.map((p, i) => {
            const maxCount = topPatients[0]?.count ?? 1;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? BRAND.orange : "#c3ccd6", minWidth: 18, fontVariantNumeric: "tabular-nums" }}>
                  {toWestern(i + 1)}
                </span>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `${getColor(p.id)}18`, color: getColor(p.id),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{getInitials(p.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ height: 4, borderRadius: 2, background: BRAND.bg, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(p.count / maxCount) * 100}%`, background: `linear-gradient(90deg, ${getColor(p.id)}, ${getColor(p.id)}88)`, borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: BRAND.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {toWestern(p.count)} {tr.topPatients.visits}
                </span>
              </div>
            );
          })}
        </div>
      </DraggableCard>
    ),
  };

  // ─── Quick actions (بدون أي إجراء مالي) ─────────────────
  const quickActions = [
    { icon: Ico.calendar("#fff", 20), label: tr.quickActions.newAppointment, sub: tr.quickActions.newAppointmentSub, grad: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight})`, href: "/appointments", feature: null as string | null },
    { icon: Ico.userPlus("#fff", 20), label: tr.quickActions.addPatient, sub: tr.quickActions.addPatientSub, grad: "linear-gradient(135deg, #2e7d32, #4caf50)", href: "/patients", feature: null as string | null },
    { icon: Ico.rx("#fff", 20), label: tr.quickActions.prescriptions, sub: tr.quickActions.prescriptionsSub, grad: "linear-gradient(135deg, #7b2d8b, #a855c7)", href: "/prescriptions", feature: "prescriptions" as string | null },
    { icon: Ico.heart("#fff", 20), label: tr.quickActions.tracking, sub: tr.quickActions.trackingSub, grad: "linear-gradient(135deg, #16a085, #2ecc9a)", href: "/patient-tracking", feature: "tracking" as string | null },
  ].filter(a => !a.feature || canAccess(a.feature, plan));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        .main-fade{animation:fadeIn .4s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .qa-btn{transition:transform .22s cubic-bezier(.4,0,.2,1),box-shadow .22s ease}
        .qa-btn:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(8,99,186,.18)!important}
        .qa-btn:active{transform:translateY(-1px)}
        .appt-row-v2{transition:background .18s ease}
        .appt-row-v2:hover{background:${BRAND.bg}}
        .drag-grip:active{cursor:grabbing}
        .main-content{margin-${isAr?"right":"left"}:${sidebarWidth}px}
        @media(max-width:860px){
          .main-content{margin-right:0!important;margin-left:0!important;padding:0 14px 110px!important}
          .hero-card{margin:14px 0 18px!important;padding:18px 18px!important;border-radius:18px!important}
          .hero-inner{gap:10px!important}
          .stats-grid-v2{margin-bottom:18px!important}
          .qa-grid{margin-bottom:0!important}
          .sections-grid{gap:14px!important}
          .doctor-filter-bar{padding:12px 14px!important;border-radius:14px!important}
          .qa-btn div div:last-child{display:none!important}
          .qa-btn{padding:12px 14px!important;gap:10px!important;border-radius:14px!important}
          .qa-btn > div:first-child{width:40px!important;height:40px!important;border-radius:12px!important}
          .stats-grid-v2{grid-template-columns:repeat(2,1fr)!important;gap:12px!important}
          .stat-card-v2{padding:16px!important;border-radius:16px!important}
          .stat-card-v2-value{font-size:24px!important}
          .qa-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important}
          .qa-btn{padding:14px!important}
          .sections-grid{grid-template-columns:1fr!important}
          .section-card-v2{padding:18px!important;border-radius:16px!important}
          .hero-inner h1{font-size:19px!important}
          .hero-inner p{font-size:11.5px!important}
          .week-chart-bar-area{height:88px!important}
          .week-chart-day{font-size:9px!important}
          .patient-stats-grid-v2{gap:10px!important}
        }
      `}</style>

      <div style={{ fontFamily: "'Rubik',sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", background: BRAND.bg }}>
        <SharedSidebar
          lang={lang} setLang={setLang} activePage="dashboard"
          plan={plan} planLoading={loadingStats}
          onCollapse={(c: boolean) => setSidebarWidth(c ? 70 : 240)}
        />

        <main className="main-fade main-content" style={{
          padding: "0 28px 40px", minHeight: "100vh",
          transition: "margin .3s cubic-bezier(.4,0,.2,1)",
        }}>

          {/* ─── HERO HEADER بتدرج الهوية ─── */}
          <div className="hero-card" style={{
            margin: "20px 0 24px",
            background: `linear-gradient(120deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 100%)`,
            borderRadius: 24, padding: "26px 30px",
            position: "relative", overflow: "hidden",
            boxShadow: "0 12px 36px rgba(8,99,186,.28)",
          }}>
            {/* زخارف */}
            <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
            <div style={{ position: "absolute", bottom: -80, insetInlineEnd: 120, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />

            <div className="hero-inner" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 5 }}>
                  {tr.header[greetingKey]} 👋
                </h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontWeight: 500 }}>
                  {toWestern(dateStr)} · {tr.header.subtitle}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              </div>
            </div>
          </div>

          {/* ─── STAT CARDS (بدون مالية) ─── */}
          <div className="stats-grid-v2" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard
              icon={Ico.calendar(BRAND.primary)} accent={BRAND.primary} accentSoft={BRAND.sky}
              delay={0} loading={loadingStats}
              label={tr.stats.todayAppointments} value={String(todayTotal)}
              sub={`${toWestern(todayCompleted)} ${tr.stats.completed} · ${toWestern(todayTotal - todayCompleted)} ${tr.stats.remaining}`}
              progress={todayProgress}
            />
            <StatCard
              icon={Ico.users(BRAND.green)} accent={BRAND.green} accentSoft="rgba(46,125,50,.09)"
              delay={80} loading={loadingStats}
              label={tr.stats.totalPatients} value={String(totalPatients)}
              sub={newThisMonth > 0 ? `+${toWestern(newThisMonth)} ${tr.stats.thisMonth}` : undefined}
            />
            <StatCard
              icon={Ico.activity(BRAND.purple)} accent={BRAND.purple} accentSoft="rgba(123,45,139,.09)"
              delay={160} loading={loadingStats}
              label={tr.stats.monthVisits} value={String(monthTotalVisits)}
              sub={`${toWestern(dailyAvg)} ${tr.stats.dailyAvg}`}
            />
            <StatCard
              icon={Ico.userPlus(BRAND.teal)} accent={BRAND.teal} accentSoft="rgba(22,160,133,.09)"
              delay={240} loading={loadingStats}
              label={tr.stats.newPatients} value={String(newThisMonth)}
              sub={tr.stats.thisMonth}
            />
          </div>

          {/* ─── QUICK ACTIONS ─── */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: BRAND.ink, marginBottom: 12, paddingInlineStart: 4 }}>
              {tr.quickActions.title}
            </h3>
            <div className="qa-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${quickActions.length},1fr)`, gap: 14 }}>
              {quickActions.map(a => (
                <a key={a.label} href={a.href} className="qa-btn" style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: "#fff", borderRadius: 18, padding: "16px 18px",
                  border: `1.5px solid ${BRAND.border}`,
                  boxShadow: "0 4px 16px rgba(8,99,186,.05)",
                  textDecoration: "none",
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, background: a.grad,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    boxShadow: "0 6px 14px rgba(0,0,0,.14)",
                  }}>{a.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: BRAND.ink, whiteSpace: "nowrap" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: BRAND.muted, fontWeight: 500, marginTop: 2, whiteSpace: "nowrap" }}>{a.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* ─── DOCTOR FILTER (خطط مشتركة) ─── */}
          {isSharedPlan(plan) && doctors.length > 0 && (
            <div className="doctor-filter-bar" style={{
              background: "#fff", borderRadius: 18, padding: "14px 20px",
              border: `1.5px solid ${BRAND.border}`, boxShadow: "0 4px 16px rgba(8,99,186,.05)",
              marginBottom: 24, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: BRAND.ink, marginInlineEnd: 4 }}>
                {tr.filterByDoctor}
                <span style={{ fontSize: 10.5, color: BRAND.muted, fontWeight: 500, marginInlineStart: 6 }}>
                  ({toWestern(activeDoctorCount)}/{toWestern(maxDoctors)})
                </span>
              </span>
              <button onClick={() => setSelectedDoctorId(null)} style={{
                padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Rubik,sans-serif",
                background: selectedDoctorId === null ? BRAND.primary : BRAND.bg,
                color: selectedDoctorId === null ? "#fff" : BRAND.muted,
                border: "none", transition: "all .2s ease",
              }}>{tr.allDoctors}</button>
              {doctors.map((d, i) => {
                const active = selectedDoctorId === String(d.id);
                const c = d.color ?? AVATAR_COLORS[i % AVATAR_COLORS.length] ?? BRAND.primary;
                return (
                  <button key={d.id} onClick={() => setSelectedDoctorId(String(d.id))} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "Rubik,sans-serif",
                    background: active ? c : BRAND.bg,
                    color: active ? "#fff" : BRAND.muted,
                    border: "none", transition: "all .2s ease",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? "#fff" : c }} />
                    {isAr ? d.name : (d.name_en || d.name)}
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── DRAGGABLE SECTIONS ─── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingInline: 4 }}>
            <span style={{ fontSize: 11.5, color: BRAND.muted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {Ico.grip(BRAND.muted, 14)} {tr.header.dragHint}
            </span>
            {JSON.stringify(order) !== JSON.stringify(DEFAULT_ORDER) && (
              <button onClick={resetLayout} style={{
                fontSize: 11, fontWeight: 700, color: BRAND.primary, background: "none",
                border: "none", cursor: "pointer", fontFamily: "Rubik,sans-serif",
                textDecoration: "underline",
              }}>{tr.header.resetLayout}</button>
            )}
          </div>
          <div className="sections-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            {order.map(id => sections[id] ?? null)}
          </div>

        </main>
      </div>
    </>
  );
}
