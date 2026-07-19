"use client";

import AppIcon from "@/components/AppIcon";
import { use, useEffect, useState, useCallback, useRef } from "react";

// ─── Types ──────────────────────────────────────────────────────
interface ApiAppointment {
  id: number;
  patient_id: number;
  date: string;
  time: string;
  duration: number;
  status: string;
  queue_status: "waiting" | "called" | "done" | "skipped";
  doctor_id: number | null;
  patientName: string;
}

interface ApiDoctor { id: number; name: string; color?: string; }

interface DisplayAppt {
  id: number;
  maskedName: string;
  time: string;
  status: string;
  isCurrent: boolean;
}

interface DisplayColumn {
  doctorId: number | null;
  doctorName: string | null;
  color: string;
  current: DisplayAppt | null;
  upcoming: DisplayAppt[];
}

interface ClinicInfo {
  name: string;
  owner: string;
}

// ─── Helpers ────────────────────────────────────────────────────
function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts
    .slice(1)
    .map((p, i) => {
      if (i === 0) {
        const visible = p.slice(0, 2);
        const stars = "*".repeat(Math.max(0, p.length - 2));
        return visible + stars;
      }
      return "*".repeat(p.length);
    })
    .join(" ");
  return `${first} ${rest}`;
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "م" : "ص";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Main Component ─────────────────────────────────────────────
export default function DisplayPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = use(params);

  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [columns, setColumns] = useState<DisplayColumn[]>([]);
  const [clock, setClock] = useState<string>("");
  const [dateLabel, setDateLabel] = useState<string>("");
  const [callFlash, setCallFlash] = useState<DisplayAppt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevCurrentRef = useRef<Record<string, number | null>>({});

  // ─── Clock ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClock(`${h}:${m}:${s}`);

      const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      setDateLabel(
        `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const DOCTOR_COLORS = ["#0863ba", "#05a0c4", "#0d9488", "#7c3aed", "#be185d", "#b45309"];

  // ─── Fetch via API route (bypasses RLS) — يعكس اختيار الطبيب اليدوي ─
  const fetchData = useCallback(async () => {
    try {
      const today = todayISO();
      const res = await fetch(`/api/display-data?clinicId=${encodeURIComponent(clinicId)}&date=${today}`, { cache: "no-store" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("display-data error:", res.status, json);
        setError(res.status === 404 ? "العيادة غير موجودة" : `تعذّر تحميل البيانات (${res.status})`);
        return;
      }
      setError(null);

      const data = await res.json();
      setClinicInfo({ name: data.clinic.name, owner: data.clinic.owner });

      const appts: ApiAppointment[] = data.appointments ?? [];
      const doctorsList: ApiDoctor[] = data.doctors ?? [];
      const isShared = !!data.clinic?.plan?.toString().startsWith("shared_");

      const toDisplay = (a: ApiAppointment, isCurrent: boolean): DisplayAppt => ({
        id: a.id,
        maskedName: maskName(a.patientName),
        time: formatTime12(a.time),
        status: a.status,
        isCurrent,
      });

      const buildColumn = (doctorId: number | null, doctorName: string | null, color: string, list: ApiAppointment[]): DisplayColumn => {
        const current = list.find(a => a.queue_status === "called") || null;
        const upcoming = list
          .filter(a => a.queue_status === "waiting")
          .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
          .slice(0, 5);
        return {
          doctorId, doctorName, color,
          current: current ? toDisplay(current, true) : null,
          upcoming: upcoming.map(a => toDisplay(a, false)),
        };
      };

      let newColumns: DisplayColumn[];
      if (isShared && doctorsList.length > 0) {
        newColumns = doctorsList
          .map((d, i) => buildColumn(d.id, d.name, d.color || DOCTOR_COLORS[i % DOCTOR_COLORS.length], appts.filter(a => a.doctor_id === d.id)))
          .filter(c => c.current || c.upcoming.length > 0 || appts.some(a => a.doctor_id === c.doctorId));
      } else {
        newColumns = [buildColumn(null, null, "#0863ba", appts)];
      }

      // ─── Flash عند تغيير المريض الحالي بأي عمود ───────────────
      newColumns.forEach(col => {
        const key = String(col.doctorId ?? "single");
        const prevId = prevCurrentRef.current[key] ?? null;
        const curId = col.current?.id ?? null;
        if (curId !== null && curId !== prevId) {
          if (prevId !== null) {
            setCallFlash(col.current);
            setTimeout(() => setCallFlash(null), 8000);
          }
        }
        prevCurrentRef.current[key] = curId;
      });

      setColumns(newColumns);
    } catch (err) {
      console.error("fetchData error:", err);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  // ─── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.errorPage}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: 56, color: "#0863ba", marginBottom: 14 }}><AppIcon glyph="🏥" /></div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#16324f", margin: 0 }}>{error}</h1>
        </div>
      </div>
    );
  }

  const multi = columns.length > 1;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={styles.page} dir="rtl">
      {/* ── Flash overlay ── */}
      {callFlash && (
        <div style={styles.flashOverlay}>
          <div style={styles.flashBox}>
            <div style={styles.flashIcon}><AppIcon glyph="🔔" /></div>
            <div style={styles.flashLabel}>يُرجى التفضل للداخل</div>
            <div style={styles.flashName}>{callFlash.maskedName}</div>
            <div style={styles.flashTime}>{callFlash.time}</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerRight}>
          <div style={styles.logo}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
            </svg>
          </div>
          <div>
            <div style={styles.clinicName}>{clinicInfo?.name ?? "..."}</div>
            <div style={styles.clinicSub}>{clinicInfo?.owner ?? ""}</div>
          </div>
        </div>
        <div style={styles.clockBox}>
          <div style={styles.clockTime}>{clock}</div>
          <div style={styles.clockDate}>{dateLabel}</div>
        </div>
      </header>

      {/* ── خط النبض — توقيع الهوية ── */}
      <div style={styles.pulseStrip} aria-hidden>
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: "200%", height: 40, display: "block" }} className="nabd-ecg">
          <path
            d="M0 20 H80 L95 20 L105 6 L118 34 L130 20 H230 L245 20 L255 6 L268 34 L280 20 H380 L395 20 L405 6 L418 34 L430 20 H530 L545 20 L555 6 L568 34 L580 20 H680 L695 20 L705 6 L718 34 L730 20 H830 L845 20 L855 6 L868 34 L880 20 H980 L995 20 L1005 6 L1018 34 L1030 20 H1130 L1145 20 L1155 6 L1168 34 L1180 20 H1200"
            fill="none" stroke="url(#nabdGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="nabdGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#0863ba" />
              <stop offset="1" stopColor="#05a0c4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Body ── */}
      <main style={multi ? { ...styles.body, gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)` } : styles.body}>
        {columns.map((col) => (
          <div key={String(col.doctorId ?? "single")} style={multi ? styles.doctorColumn : styles.singleColumnWrap}>
            {col.doctorName && (
              <div style={styles.doctorHeader}>
                <span style={{ ...styles.doctorDot, background: col.color }} />
                {"د. " + col.doctorName}
              </div>
            )}

            {/* Current patient */}
            <section style={styles.currentSection}>
              <div style={styles.sectionLabel}>الدور الحالي</div>
              {col.current ? (
                <div style={styles.currentCard} className="nabd-current">
                  <div style={styles.currentBadge}>
                    <span className="nabd-dot" style={styles.liveDot} />
                    جارٍ الآن
                  </div>
                  <div style={multi ? styles.currentNameMulti : styles.currentName}>{col.current.maskedName}</div>
                  <div style={styles.currentTime}>{col.current.time}</div>
                </div>
              ) : (
                <div style={styles.emptyCard}>
                  <span style={{ fontSize: 40, color: "#b9c8d9" }}><AppIcon glyph="🕐" /></span>
                  <span style={{ marginTop: 12, fontSize: 18, color: "#8aa0b6", fontWeight: 500 }}>
                    لا يوجد مريض قيد الاستقبال
                  </span>
                </div>
              )}
            </section>

            {/* Upcoming list */}
            <section style={styles.upcomingSection}>
              <div style={styles.sectionLabel}>قائمة الانتظار</div>
              {col.upcoming.length === 0 ? (
                <div style={styles.emptyUpcoming}>لا يوجد مرضى بقائمة الانتظار</div>
              ) : (
                <div style={styles.upcomingList}>
                  {col.upcoming.map((a, i) => (
                    <div key={a.id} style={{ ...styles.upcomingCard, animationDelay: `${i * 0.07}s` }} className="nabd-row">
                      <div style={styles.upcomingRank}>{i + 1}</div>
                      <div style={styles.upcomingName}>{a.maskedName}</div>
                      <div style={styles.upcomingTime}>{a.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ))}
      </main>

      {/* ── Footer ── */}
      <footer style={styles.footer}>
        <span style={styles.footerBrand}>نبض — نظام إدارة العيادات</span>
        <span style={styles.footerNote}>تُحدَّث الشاشة تلقائياً كل ٣٠ ثانية</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f7f9fc; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nabd-row { animation: fadeSlideIn .35s ease both; }
        @keyframes flashIn {
          0%   { opacity: 0; transform: scale(.88); }
          12%  { opacity: 1; transform: scale(1.03); }
          20%  { transform: scale(1); }
          88%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(.96); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 24px 60px rgba(8,99,186,.18), 0 0 0 0 rgba(8,99,186,.28); }
          50%      { box-shadow: 0 24px 60px rgba(8,99,186,.18), 0 0 0 18px rgba(8,99,186,0); }
        }
        .nabd-current { animation: ringPulse 2.6s ease-in-out infinite; }
        @keyframes blinkDot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .nabd-dot { animation: blinkDot 1.4s ease infinite; }
        @keyframes ecgScroll { from { transform: translateX(0); } to { transform: translateX(-25%); } }
        .nabd-ecg { animation: ecgScroll 12s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .nabd-ecg, .nabd-current, .nabd-dot, .nabd-row { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles — هوية نبض: أبيض/أزرق #0863ba → #05a0c4 ────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Rubik', sans-serif",
    background: "#f7f9fc",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    color: "#16324f",
    overflow: "hidden",
  },

  // Header
  header: {
    background: "#fff",
    borderBottom: "1.5px solid #e6edf5",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 40px",
    boxShadow: "0 2px 16px rgba(8,99,186,.06)",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 18 },
  logo: {
    width: 58, height: 58, borderRadius: 16,
    background: "linear-gradient(135deg, #0863ba 0%, #05a0c4 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 22px rgba(8,99,186,.28)",
  },
  clinicName: { fontSize: 30, fontWeight: 800, color: "#16324f", lineHeight: 1.2 },
  clinicSub: { fontSize: 16, fontWeight: 500, color: "#8aa0b6", marginTop: 4 },
  clockBox: { textAlign: "left" },
  clockTime: {
    fontSize: 46, fontWeight: 800, letterSpacing: 1,
    fontVariantNumeric: "tabular-nums",
    background: "linear-gradient(135deg, #0863ba, #05a0c4)",
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    lineHeight: 1,
  },
  clockDate: { fontSize: 16, fontWeight: 500, color: "#8aa0b6", marginTop: 6 },

  // ECG strip
  pulseStrip: { overflow: "hidden", background: "#fff", borderBottom: "1.5px solid #e6edf5", opacity: 0.55 },

  // Body
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 28,
    padding: "34px 40px",
    alignContent: "start",
    overflow: "auto",
  },
  singleColumnWrap: { maxWidth: 1000, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 30 },
  doctorColumn: {
    background: "#fff",
    border: "1.5px solid #e6edf5",
    borderRadius: 22,
    padding: 24,
    display: "flex", flexDirection: "column", gap: 22,
    boxShadow: "0 4px 24px rgba(8,99,186,.05)",
    minWidth: 0,
  },
  doctorHeader: {
    display: "flex", alignItems: "center", gap: 10,
    fontSize: 22, fontWeight: 800, color: "#16324f",
    paddingBottom: 14, borderBottom: "1.5px solid #eef3f9",
  },
  doctorDot: { width: 13, height: 13, borderRadius: "50%", flexShrink: 0 },

  sectionLabel: {
    fontSize: 15, fontWeight: 700, color: "#8aa0b6",
    letterSpacing: 0.5, marginBottom: 14,
    display: "flex", alignItems: "center", gap: 8,
  },

  // Current patient
  currentSection: {},
  currentCard: {
    background: "linear-gradient(135deg, #0863ba 0%, #0a7fc7 55%, #05a0c4 100%)",
    borderRadius: 24,
    padding: "38px 34px",
    textAlign: "center",
    color: "#fff",
    position: "relative",
  },
  currentBadge: {
    display: "inline-flex", alignItems: "center", gap: 9,
    background: "rgba(255,255,255,.16)",
    border: "1px solid rgba(255,255,255,.3)",
    borderRadius: 40, padding: "8px 20px",
    fontSize: 16, fontWeight: 700, color: "#fff",
    marginBottom: 20,
  },
  liveDot: { width: 10, height: 10, borderRadius: "50%", background: "#7ef2c0", display: "inline-block" },
  currentName: { fontSize: 74, fontWeight: 900, lineHeight: 1.15, wordBreak: "break-word" },
  currentNameMulti: { fontSize: 44, fontWeight: 900, lineHeight: 1.15, wordBreak: "break-word" },
  currentTime: {
    marginTop: 16, fontSize: 26, fontWeight: 700,
    color: "rgba(255,255,255,.9)", fontVariantNumeric: "tabular-nums",
  },
  emptyCard: {
    background: "#fff",
    border: "2px dashed #d7e3f0",
    borderRadius: 24,
    padding: "46px 30px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },

  // Upcoming
  upcomingSection: {},
  upcomingList: { display: "flex", flexDirection: "column", gap: 12 },
  upcomingCard: {
    display: "flex", alignItems: "center", gap: 18,
    background: "#fff",
    border: "1.5px solid #e6edf5",
    borderRadius: 16,
    padding: "16px 22px",
    boxShadow: "0 2px 10px rgba(8,99,186,.04)",
  },
  upcomingRank: {
    width: 46, height: 46, borderRadius: 13, flexShrink: 0,
    background: "rgba(8,99,186,.08)", color: "#0863ba",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 21, fontWeight: 800, fontVariantNumeric: "tabular-nums",
  },
  upcomingName: { flex: 1, fontSize: 24, fontWeight: 700, color: "#16324f", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  upcomingTime: { fontSize: 19, fontWeight: 700, color: "#05a0c4", fontVariantNumeric: "tabular-nums", flexShrink: 0 },
  emptyUpcoming: {
    background: "#fff", border: "1.5px dashed #d7e3f0", borderRadius: 16,
    padding: "26px 20px", textAlign: "center",
    fontSize: 17, color: "#8aa0b6", fontWeight: 500,
  },

  // Footer
  footer: {
    background: "#fff",
    borderTop: "1.5px solid #e6edf5",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 40px",
  },
  footerBrand: { fontSize: 15, fontWeight: 700, color: "#0863ba" },
  footerNote: { fontSize: 13, fontWeight: 500, color: "#8aa0b6" },

  // Flash overlay
  flashOverlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(10, 35, 66, .55)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  flashBox: {
    background: "#fff",
    borderRadius: 30,
    border: "1.5px solid #e6edf5",
    padding: "56px 90px",
    textAlign: "center",
    boxShadow: "0 40px 100px rgba(4,20,40,.35)",
    animation: "flashIn 8s ease forwards",
    maxWidth: "88vw",
  },
  flashIcon: { fontSize: 60, color: "#0863ba", marginBottom: 14 },
  flashLabel: { fontSize: 26, fontWeight: 700, color: "#8aa0b6", marginBottom: 14 },
  flashName: {
    fontSize: 84, fontWeight: 900, lineHeight: 1.15,
    background: "linear-gradient(135deg, #0863ba, #05a0c4)",
    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
    wordBreak: "break-word",
  },
  flashTime: { marginTop: 18, fontSize: 30, fontWeight: 700, color: "#16324f", fontVariantNumeric: "tabular-nums" },

  // Error
  errorPage: {
    minHeight: "100vh", background: "#f7f9fc",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Rubik', sans-serif",
  },
  errorBox: {
    background: "#fff", border: "1.5px solid #e6edf5", borderRadius: 24,
    padding: "50px 70px", textAlign: "center",
    boxShadow: "0 10px 40px rgba(8,99,186,.08)",
  },
};
