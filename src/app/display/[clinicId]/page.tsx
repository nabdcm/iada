"use client";

import { useEffect, useState, useCallback, useRef } from "react";

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
  params: { clinicId: string };
}) {
  const clinicId = params.clinicId;

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

  const DOCTOR_COLORS = ["#38bdf8", "#4ade80", "#f472b6", "#fbbf24", "#a78bfa", "#fb923c"];

  // ─── Fetch via API route (bypasses RLS) — يعكس اختيار الطبيب اليدوي ─
  const fetchData = useCallback(async () => {
    try {
      const today = todayISO();
      const res = await fetch(`/api/display-data?clinicId=${encodeURIComponent(clinicId)}&date=${today}`);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("display-data error:", json);
        setError("العيادة غير موجودة");
        return;
      }

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
        newColumns = [buildColumn(null, null, "#38bdf8", appts)];
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
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏥</div>
          <h1 style={{ fontSize: 24, color: "#fff", margin: 0 }}>{error}</h1>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={styles.page} dir="rtl">
      {/* ── Flash overlay ── */}
      {callFlash && (
        <div style={styles.flashOverlay}>
          <div style={styles.flashBox}>
            <div style={styles.flashIcon}>🔔</div>
            <div style={styles.flashLabel}>يُرجى التفضل للداخل</div>
            <div style={styles.flashName}>{callFlash.maskedName}</div>
            <div style={styles.flashTime}>{callFlash.time}</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerRight}>
          <div style={styles.logo}>💙</div>
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

      {/* ── Body ── */}
      <main style={columns.length > 1 ? { ...styles.body, gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)` } : styles.body}>
        {columns.map((col) => (
          <div key={String(col.doctorId ?? "single")} style={columns.length > 1 ? styles.doctorColumn : styles.singleColumnWrap}>
            {col.doctorName && (
              <div style={{ ...styles.doctorHeader, color: col.color }}>{"د. " + col.doctorName}</div>
            )}
            {/* Current patient */}
            <section style={styles.currentSection}>
              <div style={styles.sectionLabel}>المريض الحالي</div>
              {col.current ? (
                <div style={{ ...styles.currentCard, borderColor: `${col.color}59`, background: `linear-gradient(135deg, ${col.color}1f 0%, ${col.color}0f 100%)` }}>
                  <div style={styles.currentBadge}>🟢 جارٍ الآن</div>
                  <div style={styles.currentName}>{col.current.maskedName}</div>
                  <div style={{ ...styles.currentTime, color: col.color }}>{col.current.time}</div>
                </div>
              ) : (
                <div style={styles.emptyCard}>
                  <span style={{ fontSize: 40 }}>🕐</span>
                  <span style={{ marginTop: 12, fontSize: 18, color: "rgba(255,255,255,.5)" }}>
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
                    <div key={a.id} style={{ ...styles.upcomingCard, animationDelay: `${i * 0.08}s` }}>
                      <div style={{ ...styles.upcomingRank, color: col.color, background: `${col.color}1f` }}>{i + 1}</div>
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
        <span style={styles.footerNote}>يتجدد تلقائياً كل 30 ثانية</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020b18; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes flashIn {
          0%   { opacity: 0; transform: scale(.85); }
          15%  { opacity: 1; transform: scale(1.04); }
          25%  { transform: scale(1); }
          85%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(.95); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,.4); }
          50%       { box-shadow: 0 0 0 20px rgba(56,189,248,0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Rubik', sans-serif",
    background: "linear-gradient(160deg, #020b18 0%, #031428 50%, #050e1f 100%)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
    overflow: "hidden",
    position: "relative",
  },
  flashOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    background: "rgba(2,11,24,.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "flashIn 8s ease forwards",
    backdropFilter: "blur(6px)",
  },
  flashBox: {
    background: "linear-gradient(135deg, #0f3460 0%, #16213e 100%)",
    border: "3px solid #38bdf8",
    borderRadius: 32,
    padding: "60px 80px",
    textAlign: "center",
    boxShadow: "0 0 80px rgba(56,189,248,.35), 0 0 0 1px rgba(56,189,248,.15)",
    animation: "pulse 1.5s ease-in-out infinite",
    maxWidth: 700,
    width: "90vw",
  },
  flashIcon: { fontSize: 72, marginBottom: 16, animation: "blink 1s ease infinite" },
  flashLabel: { fontSize: 22, color: "#94d2ff", fontWeight: 600, marginBottom: 12 },
  flashName: { fontSize: 64, fontWeight: 900, color: "#fff", letterSpacing: 2, marginBottom: 8 },
  flashTime: { fontSize: 28, color: "#38bdf8", fontWeight: 700 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 48px",
    borderBottom: "1px solid rgba(56,189,248,.12)",
    background: "rgba(3,20,40,.6)",
    backdropFilter: "blur(10px)",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 18 },
  logo: { fontSize: 48 },
  clinicName: { fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.2 },
  clinicSub: { fontSize: 14, color: "rgba(255,255,255,.45)", marginTop: 4 },
  clockBox: { textAlign: "left" as const },
  clockTime: { fontSize: 52, fontWeight: 900, color: "#38bdf8", lineHeight: 1, fontVariantNumeric: "tabular-nums" },
  clockDate: { fontSize: 14, color: "rgba(255,255,255,.4)", marginTop: 4, textAlign: "right" as const },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 32,
    padding: "40px 48px",
    alignItems: "start",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 3,
    color: "rgba(56,189,248,.6)",
    textTransform: "uppercase" as const,
    marginBottom: 20,
  },
  currentSection: { display: "flex", flexDirection: "column" },
  doctorColumn: { display: "flex", flexDirection: "column", gap: 0, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 20, padding: 20 },
  singleColumnWrap: { display: "contents" },
  doctorHeader: { fontSize: 20, fontWeight: 800, marginBottom: 16, textAlign: "center" as const },
  currentCard: {
    background: "linear-gradient(135deg, rgba(56,189,248,.12) 0%, rgba(14,165,233,.06) 100%)",
    border: "2px solid rgba(56,189,248,.35)",
    borderRadius: 24,
    padding: "40px 36px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 8px 40px rgba(56,189,248,.1)",
    animation: "fadeSlideIn .4s ease",
  },
  currentBadge: {
    fontSize: 14,
    fontWeight: 700,
    color: "#4ade80",
    background: "rgba(74,222,128,.1)",
    border: "1px solid rgba(74,222,128,.25)",
    borderRadius: 20,
    padding: "4px 14px",
    display: "inline-flex",
    alignSelf: "flex-start",
    gap: 6,
  },
  currentName: {
    fontSize: 56,
    fontWeight: 900,
    color: "#fff",
    lineHeight: 1.1,
    letterSpacing: 1,
  },
  currentTime: {
    fontSize: 28,
    fontWeight: 700,
    color: "#38bdf8",
  },
  emptyCard: {
    background: "rgba(255,255,255,.03)",
    border: "2px dashed rgba(255,255,255,.1)",
    borderRadius: 24,
    padding: "60px 36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingSection: { display: "flex", flexDirection: "column" },
  emptyUpcoming: {
    fontSize: 16,
    color: "rgba(255,255,255,.3)",
    padding: "40px 0",
    textAlign: "center" as const,
  },
  upcomingList: { display: "flex", flexDirection: "column", gap: 14 },
  upcomingCard: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    padding: "18px 24px",
    animation: "fadeSlideIn .35s ease both",
    transition: "background .2s",
  },
  upcomingRank: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "rgba(56,189,248,.12)",
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  upcomingName: { flex: 1, fontSize: 22, fontWeight: 700, color: "#e2e8f0" },
  upcomingTime: { fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,.45)" },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 48px",
    borderTop: "1px solid rgba(255,255,255,.06)",
    background: "rgba(3,20,40,.4)",
  },
  footerBrand: { fontSize: 12, color: "rgba(255,255,255,.25)", fontWeight: 600 },
  footerNote: { fontSize: 11, color: "rgba(255,255,255,.15)" },
  errorPage: {
    fontFamily: "'Rubik', sans-serif",
    background: "#020b18",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: { textAlign: "center" },
};
