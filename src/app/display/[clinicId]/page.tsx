"use client";

// ============================================================
// NABD - نبض | شاشة الدور العامة (Queue Board) — بهوية الداشبورد
// لوحة دور رسمية: Hero متدرّج، بطاقة "يُخدَم الآن" بنمط تذكرة،
// قائمة انتظار بأرقام دور، شريط إحصائيات، ونداء ملء الشاشة.
// ============================================================

import { use, useEffect, useState, useCallback, useRef } from "react";

// ─── هوية العلامة (مطابقة للداشبورد) ────────────────────────────
const BRAND = {
  primary: "#0863ba",
  primaryDark: "#054a8c",
  primaryLight: "#3d8fd6",
  sky: "#eaf3fc",
  green: "#2e7d32",
  orange: "#e67e22",
  ink: "#1c2b3a",
  muted: "#8a97a6",
  border: "#e6edf5",
  bg: "#f4f8fc",
};
const HERO_GRAD = `linear-gradient(120deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 100%)`;
const DOCTOR_COLORS = ["#0863ba", "#16a085", "#7b2d8b", "#e67e22", "#be185d", "#0d9488"];

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
  ticket: number;           // رقم الدور
  maskedName: string;
  time: string;
}
interface DisplayColumn {
  doctorId: number | null;
  doctorName: string | null;
  color: string;
  current: DisplayAppt | null;
  next: DisplayAppt | null;
  upcoming: DisplayAppt[];
  waitingCount: number;
  doneCount: number;
}
interface ClinicInfo { name: string; owner: string; }

// ─── Helpers ────────────────────────────────────────────────────
function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts.slice(1).map((p, i) => {
    if (i === 0) return p.slice(0, 2) + "*".repeat(Math.max(0, p.length - 2));
    return "*".repeat(p.length);
  }).join(" ");
  return `${first} ${rest}`;
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "م" : "ص"}`;
}
const pad2 = (n: number) => String(n).padStart(2, "0");

// ─── SVG Icons (نمط الداشبورد — outline أحادية) ─────────────────
const Icon = {
  pulse: (c = "#fff", s = 26) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h4l2.5-6 4 12 2.5-6H22" />
    </svg>
  ),
  clock: (c = BRAND.muted, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
  users: (c = BRAND.primary, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  check: (c = BRAND.green, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  bell: (c = "#fff", s = 54) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  door: (c = "rgba(255,255,255,.85)", s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M3 12h11" /><path d="m9 8 4 4-4 4" />
    </svg>
  ),
  stetho: (c = "#fff", s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" />
    </svg>
  ),
};

// ─── المكوّن الرئيسي ────────────────────────────────────────────
export default function DisplayPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = use(params);

  const [clinicInfo, setClinicInfo] = useState<ClinicInfo | null>(null);
  const [columns, setColumns] = useState<DisplayColumn[]>([]);
  const [clock, setClock] = useState({ h: "--", m: "--", s: "--" });
  const [dateLabel, setDateLabel] = useState("");
  const [callFlash, setCallFlash] = useState<{ appt: DisplayAppt; color: string; doctorName: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevCurrentRef = useRef<Record<string, number | null>>({});

  // ─── الساعة ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({ h: pad2(now.getHours()), m: pad2(now.getMinutes()), s: pad2(now.getSeconds()) });
      const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      setDateLabel(`${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── جلب البيانات ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/display-data?clinicId=${encodeURIComponent(clinicId)}&date=${todayISO()}`, { cache: "no-store" });
      if (!res.ok) {
        setError(res.status === 404 ? "العيادة غير موجودة" : `تعذّر تحميل البيانات (${res.status})`);
        return;
      }
      setError(null);

      const data = await res.json();
      setClinicInfo({ name: data.clinic.name, owner: data.clinic.owner });

      const appts: ApiAppointment[] = data.appointments ?? [];
      const doctorsList: ApiDoctor[] = data.doctors ?? [];
      const isShared = !!data.clinic?.plan?.toString().startsWith("shared_");

      const buildColumn = (doctorId: number | null, doctorName: string | null, color: string, list: ApiAppointment[]): DisplayColumn => {
        const ordered = [...list].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        const ticketOf = new Map<number, number>();
        ordered.forEach((a, i) => ticketOf.set(a.id, i + 1));
        const toDisplay = (a: ApiAppointment): DisplayAppt => ({
          id: a.id, ticket: ticketOf.get(a.id) ?? 0,
          maskedName: maskName(a.patientName), time: formatTime12(a.time),
        });
        const currentRaw = ordered.find(a => a.queue_status === "called") || null;
        const waiting = ordered.filter(a => a.queue_status === "waiting");
        return {
          doctorId, doctorName, color,
          current: currentRaw ? toDisplay(currentRaw) : null,
          next: waiting[0] ? toDisplay(waiting[0]) : null,
          upcoming: waiting.slice(0, 6).map(toDisplay),
          waitingCount: waiting.length,
          doneCount: ordered.filter(a => a.queue_status === "done").length,
        };
      };

      let newColumns: DisplayColumn[];
      if (isShared && doctorsList.length > 0) {
        newColumns = doctorsList
          .map((d, i) => buildColumn(d.id, d.name, d.color || DOCTOR_COLORS[i % DOCTOR_COLORS.length], appts.filter(a => a.doctor_id === d.id)))
          .filter(c => c.current || c.upcoming.length > 0 || c.doneCount > 0);
      } else {
        newColumns = [buildColumn(null, null, BRAND.primary, appts)];
      }

      // ─── نداء ملء الشاشة عند تغيّر المريض الحالي ───────────────
      newColumns.forEach(col => {
        const key = String(col.doctorId ?? "single");
        const prevId = prevCurrentRef.current[key] ?? null;
        const curId = col.current?.id ?? null;
        if (curId !== null && curId !== prevId && prevId !== null) {
          setCallFlash({ appt: col.current!, color: col.color, doctorName: col.doctorName });
          setTimeout(() => setCallFlash(null), 8000);
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

  // ─── حالة الخطأ ───────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: BRAND.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rubik',sans-serif" }} dir="rtl">
        <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 24, padding: "50px 70px", textAlign: "center", boxShadow: "0 12px 40px rgba(8,99,186,.1)" }}>
          <div style={{ width: 74, height: 74, borderRadius: 20, background: HERO_GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 10px 26px rgba(8,99,186,.3)" }}>
            {Icon.pulse("#fff", 34)}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: BRAND.ink, margin: 0 }}>{error}</h1>
        </div>
      </div>
    );
  }

  const multi = columns.length > 1;
  const totals = columns.reduce((s, c) => ({ w: s.w + c.waitingCount, d: s.d + c.doneCount }), { w: 0, d: 0 });

  // ─── مكوّنات فرعية ───────────────────────────────────────────

  // لوحة "يُخدَم الآن" بنمط تذكرة رسمية
  const NowServing = ({ col, compact }: { col: DisplayColumn; compact: boolean }) => (
    <div style={{
      background: "#fff", borderRadius: 24, border: `1.5px solid ${BRAND.border}`,
      boxShadow: "0 12px 36px rgba(8,99,186,.1)", overflow: "hidden",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      {/* شريط التمييز العلوي */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${col.color}, ${col.color}55)` }} />
      <div style={{ padding: compact ? "22px 24px 26px" : "30px 36px 36px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "inline-flex", alignSelf: "center", alignItems: "center", gap: 8, background: BRAND.sky, color: BRAND.primary, borderRadius: 40, padding: "7px 18px", fontSize: compact ? 13 : 15, fontWeight: 800, letterSpacing: 1 }}>
          يُخدَم الآن
        </div>

        {col.current ? (
          <>
            {/* رقم الدور — تذكرة */}
            <div className="nb-ticket" style={{
              width: compact ? 118 : 172, height: compact ? 118 : 172, margin: compact ? "18px auto 14px" : "26px auto 18px",
              borderRadius: compact ? 26 : 36, background: `linear-gradient(135deg, ${col.color}, ${col.color}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 18px 44px ${col.color}4d`, position: "relative",
            }}>
              <span style={{ fontSize: compact ? 58 : 92, fontWeight: 900, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                {col.current.ticket}
              </span>
              <span className="nb-ring" style={{ position: "absolute", inset: 0, borderRadius: "inherit", border: `3px solid ${col.color}66` }} />
            </div>
            <div style={{ fontSize: compact ? 26 : 44, fontWeight: 900, color: BRAND.ink, lineHeight: 1.25, wordBreak: "break-word" }}>
              {col.current.maskedName}
            </div>
            <div style={{ marginTop: 10, display: "inline-flex", alignSelf: "center", alignItems: "center", gap: 7, color: BRAND.muted, fontSize: compact ? 14 : 17, fontWeight: 600 }}>
              {Icon.clock(BRAND.muted, compact ? 16 : 19)} موعد {col.current.time}
            </div>
          </>
        ) : (
          <div style={{ padding: compact ? "34px 0" : "56px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: compact ? 86 : 110, height: compact ? 86 : 110, borderRadius: "50%", border: `2.5px dashed ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#c3d2e2", fontSize: compact ? 34 : 44, fontWeight: 900 }}>
              —
            </div>
            <span style={{ fontSize: compact ? 15 : 18, color: BRAND.muted, fontWeight: 600 }}>بانتظار الاستدعاء التالي</span>
          </div>
        )}
      </div>

      {/* شريط "التالي" — فاصل منقّط بنمط التذاكر */}
      <div style={{ borderTop: `2px dashed ${BRAND.border}`, background: "#fbfdff", padding: compact ? "12px 20px" : "16px 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: compact ? 12 : 13, fontWeight: 800, color: BRAND.muted, letterSpacing: 1 }}>التالي بالدور</span>
        {col.next ? (
          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 10, background: BRAND.sky, color: BRAND.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 14 : 16, fontWeight: 900, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{col.next.ticket}</span>
            <span style={{ fontSize: compact ? 14 : 17, fontWeight: 700, color: BRAND.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.next.maskedName}</span>
            <span style={{ fontSize: compact ? 12 : 14, fontWeight: 700, color: BRAND.primaryLight, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{col.next.time}</span>
          </span>
        ) : (
          <span style={{ fontSize: compact ? 13 : 14, color: "#b6c4d4", fontWeight: 600 }}>لا يوجد</span>
        )}
      </div>
    </div>
  );

  // قائمة الانتظار
  const QueueList = ({ col, compact }: { col: DisplayColumn; compact: boolean }) => (
    <div style={{ background: "#fff", borderRadius: 20, border: `1.5px solid ${BRAND.border}`, boxShadow: "0 4px 20px rgba(8,99,186,.06)", padding: compact ? 16 : 22, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: compact ? 12 : 16 }}>
        <span style={{ fontSize: compact ? 14 : 16, fontWeight: 800, color: BRAND.ink }}>قائمة الانتظار</span>
        <span style={{ background: BRAND.sky, color: BRAND.primary, borderRadius: 20, padding: "3px 12px", fontSize: compact ? 12 : 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{col.waitingCount}</span>
      </div>
      {col.upcoming.length === 0 ? (
        <div style={{ border: `2px dashed ${BRAND.border}`, borderRadius: 14, padding: compact ? "22px 14px" : "30px 18px", textAlign: "center", fontSize: compact ? 13 : 15, color: BRAND.muted, fontWeight: 600 }}>
          لا يوجد مرضى بالانتظار حالياً
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10, overflow: "hidden" }}>
          {col.upcoming.map((a, i) => (
            <div key={a.id} className="nb-row" style={{
              display: "flex", alignItems: "center", gap: compact ? 12 : 16,
              background: i === 0 ? BRAND.sky : "#fbfdff",
              border: `1.5px solid ${i === 0 ? `${BRAND.primary}33` : BRAND.border}`,
              borderRadius: 14, padding: compact ? "10px 14px" : "13px 18px",
              animationDelay: `${i * 0.06}s`,
            }}>
              <div style={{ width: compact ? 40 : 48, height: compact ? 40 : 48, borderRadius: 12, flexShrink: 0, background: i === 0 ? `linear-gradient(135deg, ${col.color}, ${col.color}cc)` : "#fff", border: i === 0 ? "none" : `1.5px solid ${BRAND.border}`, color: i === 0 ? "#fff" : col.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: compact ? 17 : 20, fontWeight: 900, fontVariantNumeric: "tabular-nums", boxShadow: i === 0 ? `0 6px 14px ${col.color}40` : "none" }}>
                {a.ticket}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: compact ? 15 : 18, fontWeight: 700, color: BRAND.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.maskedName}</div>
                {i === 0 && <div style={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 800, color: BRAND.primary, marginTop: 2, letterSpacing: 0.5 }}>استعد — دورك التالي</div>}
              </div>
              <div style={{ fontSize: compact ? 13 : 15, fontWeight: 700, color: BRAND.muted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{a.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // بطاقة إحصائية صغيرة (نمط StatCard في الداشبورد)
  const Stat = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) => (
    <div style={{ background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 18, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 20px rgba(8,99,186,.06)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${accent}, ${accent}55)` }} />
      <div style={{ width: 44, height: 44, borderRadius: 13, background: `${accent}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 900, color: BRAND.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: BRAND.muted, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Rubik',sans-serif", background: BRAND.bg, minHeight: "100vh", display: "flex", flexDirection: "column", color: BRAND.ink, padding: "22px 26px", gap: 18 }} dir="rtl">

      {/* ════ نداء ملء الشاشة ════ */}
      {callFlash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: HERO_GRAD, display: "flex", alignItems: "center", justifyContent: "center", animation: "nbFlashPage 8s ease forwards", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -120, insetInlineEnd: -80, width: 420, height: 420, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
          <div style={{ position: "absolute", bottom: -140, insetInlineStart: -60, width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
          <div style={{ textAlign: "center", position: "relative", padding: 24 }}>
            <div className="nb-bell" style={{ display: "inline-flex", width: 108, height: 108, borderRadius: 30, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.3)", alignItems: "center", justifyContent: "center", marginBottom: 26 }}>
              {Icon.bell("#fff", 54)}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,.85)", letterSpacing: 2, marginBottom: 22 }}>نداء — رقم الدور</div>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 190, height: 190, borderRadius: 44, background: "#fff", boxShadow: "0 30px 80px rgba(2,20,45,.4)", marginBottom: 26, padding: "0 30px" }}>
              <span style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", background: HERO_GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {callFlash.appt.ticket}
              </span>
            </div>
            <div style={{ fontSize: 62, fontWeight: 900, color: "#fff", lineHeight: 1.2, wordBreak: "break-word", maxWidth: "85vw", margin: "0 auto" }}>
              {callFlash.appt.maskedName}
            </div>
            <div style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,.14)", border: "1.5px solid rgba(255,255,255,.3)", borderRadius: 40, padding: "12px 30px", fontSize: 24, fontWeight: 700, color: "#fff" }}>
              {Icon.door()} يُرجى التفضل إلى {callFlash.doctorName ? `عيادة د. ${callFlash.doctorName}` : "غرفة الطبيب"}
            </div>
          </div>
        </div>
      )}

      {/* ════ Hero header (نمط الداشبورد) ════ */}
      <header style={{ background: HERO_GRAD, borderRadius: 24, padding: "22px 30px", position: "relative", overflow: "hidden", boxShadow: "0 12px 36px rgba(8,99,186,.26)", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <div style={{ position: "absolute", bottom: -80, insetInlineEnd: 120, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 58, height: 58, borderRadius: 17, background: "rgba(255,255,255,.16)", border: "1.5px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {Icon.pulse("#fff", 30)}
            </div>
            <div>
              <h1 style={{ fontSize: 27, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{clinicInfo?.name ?? "..."}</h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,.85)", fontWeight: 500, marginTop: 3, display: "flex", alignItems: "center", gap: 7 }}>
                {Icon.stetho("rgba(255,255,255,.85)", 15)} {clinicInfo?.owner ?? ""}
              </p>
            </div>
          </div>
          {/* الساعة — أرقام مقسّمة بنمط لوحات المشافي */}
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, direction: "ltr" }}>
              {[clock.h, clock.m, clock.s].map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {i > 0 && <span className="nb-colon" style={{ fontSize: 34, fontWeight: 900, color: "rgba(255,255,255,.7)" }}>:</span>}
                  <span style={{ background: "rgba(255,255,255,.16)", border: "1.5px solid rgba(255,255,255,.28)", borderRadius: 13, padding: "8px 13px", fontSize: 36, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1, minWidth: 62, textAlign: "center" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,.85)", marginTop: 8 }}>{dateLabel}</div>
          </div>
        </div>
      </header>

      {/* ════ شريط الإحصائيات ════ */}
      <div style={{ display: "grid", gridTemplateColumns: multi ? "repeat(2, minmax(180px, 260px))" : "repeat(2, minmax(200px, 300px))", gap: 14, flexShrink: 0 }}>
        <Stat icon={Icon.users(BRAND.primary, 22)} label="بالانتظار الآن" value={totals.w} accent={BRAND.primary} />
        <Stat icon={Icon.check(BRAND.green, 22)} label="تمت خدمتهم اليوم" value={totals.d} accent={BRAND.green} />
      </div>

      {/* ════ اللوحة الرئيسية ════ */}
      {multi ? (
        // عيادة مشتركة: عمود لكل طبيب
        <main style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, 1fr)`, gap: 18, alignItems: "start", minHeight: 0 }}>
          {columns.map(col => (
            <div key={String(col.doctorId ?? "single")} style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1.5px solid ${BRAND.border}`, borderRadius: 16, padding: "11px 16px", boxShadow: "0 4px 16px rgba(8,99,186,.05)" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${col.color}, ${col.color}cc)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.stetho("#fff", 17)}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: BRAND.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>د. {col.doctorName}</span>
              </div>
              <NowServing col={col} compact />
              <QueueList col={col} compact />
            </div>
          ))}
        </main>
      ) : (
        // عيادة فردية: تذكرة كبيرة + قائمة جانبية
        columns.map(col => (
          <main key="single" style={{ flex: 1, display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 18, alignItems: "stretch", minHeight: 0 }}>
            <NowServing col={col} compact={false} />
            <QueueList col={col} compact={false} />
          </main>
        ))
      )}

      {/* ════ Footer ════ */}
      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, padding: "2px 6px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: BRAND.primary }}>
          {Icon.pulse(BRAND.primary, 17)} نبض — نظام إدارة العيادات
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: BRAND.muted }}>تُحدَّث الشاشة تلقائياً كل ٣٠ ثانية</span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${BRAND.bg}; }
        @keyframes nbRowIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .nb-row { animation: nbRowIn .35s ease both; }
        @keyframes nbRing { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(1.28); opacity: 0; } }
        .nb-ring { animation: nbRing 2.2s ease-out infinite; }
        @keyframes nbColon { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        .nb-colon { animation: nbColon 1s step-end infinite; }
        @keyframes nbBell { 0%,100% { transform: rotate(0); } 8% { transform: rotate(-14deg); } 16% { transform: rotate(12deg); } 24% { transform: rotate(-8deg); } 32% { transform: rotate(0); } }
        .nb-bell { animation: nbBell 1.6s ease infinite; transform-origin: top center; }
        @keyframes nbFlashPage { 0% { opacity: 0; } 5% { opacity: 1; } 92% { opacity: 1; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .nb-row, .nb-ring, .nb-colon, .nb-bell { animation: none !important; } }
      `}</style>
    </div>
  );
}
