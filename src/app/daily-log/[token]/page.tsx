"use client";

// ============================================================
// NABD - نبض | Daily Log Page — Patient Self-Reporting
// Route: /daily-log/[token]
// Public page — no login required
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

// ── Types ──────────────────────────────────────────────────
type ClinicType =
  | "skin_care"
  | "cosmetic"
  | "physical_therapy"
  | "dental"
  | "general"
  | "nutrition"
  | "ophthalmology"
  | "orthopedic";

interface TrackingLink {
  id: string;
  token: string;
  patient_id: number;
  patient_name: string;
  clinic_type: ClinicType;
  doctor_name: string;
  clinic_name: string;
  notes_for_patient: string;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface DailyLogEntry {
  token: string;
  patient_id: number;
  clinic_type: ClinicType;
  log_date: string;
  fields: Record<string, string | number | boolean>;
  general_notes: string;
  submitted_at: string;
}

// ── Clinic Forms Config ─────────────────────────────────────
const CLINIC_CONFIG: Record<
  ClinicType,
  {
    label_ar: string;
    label_en: string;
    icon: string;
    color: string;
    fields: {
      key: string;
      label_ar: string;
      label_en: string;
      type: "scale" | "yesno" | "number" | "select" | "text";
      options_ar?: string[];
      options_en?: string[];
      min?: number;
      max?: number;
      unit?: string;
      unit_ar?: string;
    }[];
  }
> = {
  skin_care: {
    label_ar: "عناية بالبشرة",
    label_en: "Skin Care",
    icon: "✨",
    color: "#e67e22",
    fields: [
      { key: "applied_medication", label_ar: "هل طبّقت الكريم/الدواء الموصوف؟", label_en: "Did you apply the prescribed cream/medication?", type: "yesno" },
      { key: "skin_condition", label_ar: "حالة بشرتك اليوم", label_en: "Skin condition today", type: "scale", min: 1, max: 5 },
      { key: "new_pimples", label_ar: "هل ظهرت حبوب أو بثور جديدة؟", label_en: "Any new pimples or breakouts?", type: "yesno" },
      { key: "redness_level", label_ar: "مستوى الاحمرار", label_en: "Redness level", type: "scale", min: 0, max: 5 },
      { key: "moisturizer_used", label_ar: "هل استخدمت المرطّب؟", label_en: "Did you use moisturizer?", type: "yesno" },
      { key: "sun_exposure", label_ar: "مدة التعرض للشمس (دقيقة)", label_en: "Sun exposure duration (min)", type: "number", unit: "min", unit_ar: "دقيقة" },
      { key: "water_intake", label_ar: "كمية الماء المشروبة (لتر)", label_en: "Water intake (liters)", type: "number", unit: "L", unit_ar: "لتر" },
    ],
  },
  cosmetic: {
    label_ar: "التجميل",
    label_en: "Cosmetic",
    icon: "💎",
    color: "#8e44ad",
    fields: [
      { key: "followed_instructions", label_ar: "هل اتبعت تعليمات ما بعد الجلسة؟", label_en: "Did you follow post-session instructions?", type: "yesno" },
      { key: "swelling_level", label_ar: "مستوى التورم", label_en: "Swelling level", type: "scale", min: 0, max: 5 },
      { key: "redness_level", label_ar: "مستوى الاحمرار", label_en: "Redness level", type: "scale", min: 0, max: 5 },
      { key: "pain_level", label_ar: "مستوى الألم", label_en: "Pain level", type: "scale", min: 0, max: 10 },
      { key: "result_satisfaction", label_ar: "رضاك عن نتيجة المنطقة المعالجة", label_en: "Satisfaction with treated area", type: "scale", min: 1, max: 5 },
      { key: "bruising", label_ar: "هل يوجد كدمات؟", label_en: "Any bruising?", type: "yesno" },
    ],
  },
  physical_therapy: {
    label_ar: "العلاج الفيزيائي",
    label_en: "Physical Therapy",
    icon: "🏃",
    color: "#2e7d32",
    fields: [
      { key: "did_exercises", label_ar: "هل أجريت تمارين اليوم؟", label_en: "Did you do today's exercises?", type: "yesno" },
      { key: "exercise_reps", label_ar: "عدد التكرارات", label_en: "Number of repetitions", type: "number", unit: "reps", unit_ar: "تكرار" },
      { key: "pain_before", label_ar: "مستوى الألم قبل التمارين", label_en: "Pain level before exercises", type: "scale", min: 0, max: 10 },
      { key: "pain_after", label_ar: "مستوى الألم بعد التمارين", label_en: "Pain level after exercises", type: "scale", min: 0, max: 10 },
      { key: "mobility", label_ar: "مستوى الحركة مقارنةً بالأمس", label_en: "Mobility compared to yesterday", type: "select", options_ar: ["أفضل", "نفس", "أسوأ"], options_en: ["Better", "Same", "Worse"] },
      { key: "swelling", label_ar: "هل يوجد تورم؟", label_en: "Any swelling?", type: "yesno" },
      { key: "applied_ice_heat", label_ar: "هل طبّقت كمادات (ثلج/حرارة)؟", label_en: "Did you apply ice/heat?", type: "yesno" },
    ],
  },
  dental: {
    label_ar: "الأسنان",
    label_en: "Dental",
    icon: "🦷",
    color: "#0863ba",
    fields: [
      { key: "brushing_times", label_ar: "عدد مرات تنظيف الأسنان", label_en: "Number of brushing times", type: "number", unit: "times", unit_ar: "مرة" },
      { key: "flossed", label_ar: "هل استخدمت خيط الأسنان؟", label_en: "Did you floss?", type: "yesno" },
      { key: "pain_level", label_ar: "مستوى الألم (0 = بدون ألم)", label_en: "Pain level (0 = no pain)", type: "scale", min: 0, max: 10 },
      { key: "avoided_restricted_foods", label_ar: "هل تجنبت الأطعمة الممنوعة؟", label_en: "Did you avoid restricted foods?", type: "yesno" },
      { key: "bleeding_gums", label_ar: "هل نزفت اللثة؟", label_en: "Any gum bleeding?", type: "yesno" },
      { key: "sensitivity", label_ar: "هل هناك حساسية للبارد/الساخن؟", label_en: "Sensitivity to cold/hot?", type: "yesno" },
    ],
  },
  general: {
    label_ar: "الطب العام",
    label_en: "General Medicine",
    icon: "🩺",
    color: "#16a085",
    fields: [
      { key: "temperature", label_ar: "درجة الحرارة", label_en: "Temperature", type: "number", unit: "°C", unit_ar: "°م" },
      { key: "blood_pressure_sys", label_ar: "ضغط الدم الانقباضي", label_en: "Systolic blood pressure", type: "number", unit: "mmHg", unit_ar: "مم زئبق" },
      { key: "blood_pressure_dia", label_ar: "ضغط الدم الانبساطي", label_en: "Diastolic blood pressure", type: "number", unit: "mmHg", unit_ar: "مم زئبق" },
      { key: "took_medication", label_ar: "هل تناولت الدواء في وقته؟", label_en: "Did you take your medication on time?", type: "yesno" },
      { key: "energy_level", label_ar: "مستوى طاقتك العامة", label_en: "Overall energy level", type: "scale", min: 1, max: 5 },
      { key: "symptoms", label_ar: "الأعراض الحالية", label_en: "Current symptoms", type: "select", options_ar: ["بدون أعراض", "حمى", "صداع", "تعب", "ألم", "أخرى"], options_en: ["No symptoms", "Fever", "Headache", "Fatigue", "Pain", "Other"] },
      { key: "heart_rate", label_ar: "معدل ضربات القلب (إن وجد)", label_en: "Heart rate (if available)", type: "number", unit: "bpm", unit_ar: "نبضة/دقيقة" },
    ],
  },
  nutrition: {
    label_ar: "التغذية",
    label_en: "Nutrition",
    icon: "🥗",
    color: "#27ae60",
    fields: [
      { key: "followed_diet", label_ar: "هل اتبعت النظام الغذائي؟", label_en: "Did you follow your diet plan?", type: "yesno" },
      { key: "water_intake", label_ar: "كمية الماء المشروبة (لتر)", label_en: "Water intake (liters)", type: "number", unit: "L", unit_ar: "لتر" },
      { key: "weight", label_ar: "الوزن اليوم (كغ)", label_en: "Today's weight (kg)", type: "number", unit: "kg", unit_ar: "كغ" },
      { key: "meals_count", label_ar: "عدد الوجبات", label_en: "Number of meals", type: "number", unit: "meals", unit_ar: "وجبة" },
      { key: "exercise_done", label_ar: "هل مارست رياضة؟", label_en: "Did you exercise?", type: "yesno" },
      { key: "hunger_level", label_ar: "مستوى الجوع العام", label_en: "Overall hunger level", type: "scale", min: 1, max: 5 },
      { key: "mood", label_ar: "مزاجك العام", label_en: "Overall mood", type: "scale", min: 1, max: 5 },
    ],
  },
  ophthalmology: {
    label_ar: "طب العيون",
    label_en: "Ophthalmology",
    icon: "👁",
    color: "#2980b9",
    fields: [
      { key: "used_drops", label_ar: "هل استخدمت قطرات العين؟", label_en: "Did you use eye drops?", type: "yesno" },
      { key: "drops_times", label_ar: "عدد مرات استخدام القطرات", label_en: "Number of times drops used", type: "number", unit: "times", unit_ar: "مرة" },
      { key: "vision_clarity", label_ar: "وضوح الرؤية اليوم", label_en: "Vision clarity today", type: "scale", min: 1, max: 5 },
      { key: "eye_redness", label_ar: "احمرار العين", label_en: "Eye redness", type: "scale", min: 0, max: 5 },
      { key: "pain_discomfort", label_ar: "ألم أو انزعاج في العين", label_en: "Eye pain/discomfort", type: "scale", min: 0, max: 5 },
      { key: "avoided_screen", label_ar: "هل قلّلت استخدام الشاشات؟", label_en: "Did you reduce screen time?", type: "yesno" },
    ],
  },
  orthopedic: {
    label_ar: "العظام والمفاصل",
    label_en: "Orthopedics",
    icon: "🦴",
    color: "#c0392b",
    fields: [
      { key: "pain_level", label_ar: "مستوى الألم اليوم", label_en: "Today's pain level", type: "scale", min: 0, max: 10 },
      { key: "took_medication", label_ar: "هل تناولت المسكّنات/الدواء؟", label_en: "Did you take your medication/painkillers?", type: "yesno" },
      { key: "mobility", label_ar: "مستوى الحركة مقارنةً بالأمس", label_en: "Mobility compared to yesterday", type: "select", options_ar: ["أفضل", "نفس", "أسوأ"], options_en: ["Better", "Same", "Worse"] },
      { key: "did_exercises", label_ar: "هل أجريت التمارين المطلوبة؟", label_en: "Did you do the prescribed exercises?", type: "yesno" },
      { key: "swelling", label_ar: "هل يوجد تورم؟", label_en: "Any swelling?", type: "yesno" },
      { key: "applied_ice_heat", label_ar: "هل طبّقت كمادات (ثلج/حرارة)؟", label_en: "Did you apply ice/heat?", type: "yesno" },
    ],
  },
};

// ── Scale Labels ─────────────────────────────────────────────
const SCALE_LABELS_AR: Record<string, Record<number, string>> = {
  "1-5": { 1: "سيء جداً", 2: "سيء", 3: "متوسط", 4: "جيد", 5: "ممتاز" },
  "0-5": { 0: "لا شيء", 1: "خفيف جداً", 2: "خفيف", 3: "متوسط", 4: "شديد", 5: "شديد جداً" },
  "0-10": { 0: "بدون ألم", 5: "متوسط", 10: "ألم شديد جداً" },
};

// ── Helpers ─────────────────────────────────────────────────
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function DailyLogPage() {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const isAr = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingLink, setTrackingLink] = useState<TrackingLink | null>(null);
  const [fields, setFields] = useState<Record<string, string | number | boolean>>({});
  const [generalNotes, setGeneralNotes] = useState("");

  // Load tracking link
  useEffect(() => {
    if (!token) return;
    loadTrackingLink();
  }, [token]);

  async function loadTrackingLink() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tracking_links")
        .select("*")
        .eq("token", token)
        .eq("active", true)
        .single();

      if (error || !data) {
        setError(isAr ? "الرابط غير صالح أو منتهي الصلاحية" : "Invalid or expired link");
        setLoading(false);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError(isAr ? "انتهت صلاحية هذا الرابط" : "This link has expired");
        setLoading(false);
        return;
      }

      setTrackingLink(data);

      // Check if already submitted today
      const { data: existing } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("token", token)
        .eq("log_date", todayISO())
        .single();

      if (existing) setAlreadySubmitted(true);
    } catch {
      setError(isAr ? "حدث خطأ في تحميل البيانات" : "Error loading data");
    }
    setLoading(false);
  }

  function updateField(key: string, value: string | number | boolean) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!trackingLink) return;
    setSubmitting(true);

    const entry: DailyLogEntry = {
      token,
      patient_id: trackingLink.patient_id,
      clinic_type: trackingLink.clinic_type,
      log_date: todayISO(),
      fields,
      general_notes: generalNotes,
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("daily_logs").insert([entry]);

    if (error) {
      if (error.code === "23505") setAlreadySubmitted(true);
      else alert(isAr ? "حدث خطأ، يرجى المحاولة مجدداً" : "An error occurred. Please try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  const config = trackingLink ? CLINIC_CONFIG[trackingLink.clinic_type] : null;

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; min-height: 100vh; }
        .daily-log-root { direction: ${isAr ? "rtl" : "ltr"}; min-height: 100vh; background: #f7f9fc; }

        .field-card {
          background: #fff;
          border-radius: 14px;
          padding: 18px 20px;
          border: 1.5px solid #eef0f3;
          box-shadow: 0 2px 12px rgba(8,99,186,.05);
          margin-bottom: 12px;
          transition: border-color .2s;
        }
        .field-card:focus-within { border-color: rgba(8,99,186,.35); }

        .field-label {
          font-size: 14px;
          font-weight: 600;
          color: #353535;
          margin-bottom: 14px;
          line-height: 1.4;
        }

        .yesno-wrap { display: flex; gap: 10px; }
        .yesno-btn {
          flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 14px;
          font-weight: 600; cursor: pointer; transition: all .18s; color: #666;
        }
        .yesno-btn.yes.active  { background: rgba(46,125,50,.08);  border-color: #2e7d32; color: #2e7d32; }
        .yesno-btn.no.active   { background: rgba(192,57,43,.08);  border-color: #c0392b; color: #c0392b; }
        .yesno-btn:hover { border-color: #aaa; }

        .scale-wrap { display: flex; gap: 6px; flex-wrap: wrap; }
        .scale-btn {
          width: 42px; height: 42px; border-radius: 10px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 15px;
          font-weight: 700; cursor: pointer; transition: all .18s; color: #888;
          display: flex; align-items: center; justify-content: center;
        }
        .scale-btn.active {
          border-color: var(--accent);
          background: var(--accent-bg);
          color: var(--accent);
          transform: scale(1.08);
        }

        .select-wrap select {
          width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 14px;
          color: #353535; cursor: pointer; outline: none; transition: border-color .18s;
          appearance: none; -webkit-appearance: none;
        }
        .select-wrap select:focus { border-color: rgba(8,99,186,.35); }

        .number-input-wrap { position: relative; }
        .number-input-wrap input {
          width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 15px; font-weight: 600;
          color: #353535; outline: none; transition: border-color .18s;
        }
        .number-input-wrap input:focus { border-color: rgba(8,99,186,.35); }
        .number-input-wrap .unit-badge {
          position: absolute; top: 50%; transform: translateY(-50%);
          ${isAr ? "left: 14px;" : "right: 14px;"}
          font-size: 11px; color: #aaa; font-weight: 600;
        }

        .submit-btn {
          width: 100%; padding: 15px; border-radius: 12px; border: none;
          background: #0863ba; color: #fff; font-family: 'Rubik', sans-serif;
          font-size: 16px; font-weight: 700; cursor: pointer; transition: all .2s;
          box-shadow: 0 4px 16px rgba(8,99,186,.3);
          margin-top: 8px;
        }
        .submit-btn:hover { background: #0752a0; transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { background: #bbb; box-shadow: none; cursor: not-allowed; transform: none; }

        .notes-textarea {
          width: 100%; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #eef0f3;
          background: #f7f9fc; font-family: 'Rubik', sans-serif; font-size: 14px;
          color: #353535; outline: none; resize: vertical; min-height: 90px;
          transition: border-color .18s; line-height: 1.6;
        }
        .notes-textarea:focus { border-color: rgba(8,99,186,.35); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .5s cubic-bezier(.4,0,.2,1) forwards; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        .pulse { animation: pulse 1.5s ease infinite; }
        @keyframes successPop { 0%{transform:scale(0.7);opacity:0} 80%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
        .success-pop { animation: successPop .5s cubic-bezier(.4,0,.2,1) forwards; }
      `}</style>

      <div className="daily-log-root">
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 40px" }}>

          {/* Lang Switch */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button
              onClick={() => setLang(isAr ? "en" : "ar")}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1.5px solid #eef0f3",
                background: "#fff", fontFamily: "Rubik, sans-serif", fontSize: 12,
                fontWeight: 600, cursor: "pointer", color: "#666"
              }}
            >
              🌐 {isAr ? "English" : "العربية"}
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }} className="pulse">💊</div>
              <div style={{ fontSize: 14, color: "#aaa" }}>
                {isAr ? "جاري التحميل..." : "Loading..."}
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: 16, border: "1.5px solid #eef0f3"
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#c0392b", marginBottom: 8 }}>
                {isAr ? "خطأ" : "Error"}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>{error}</div>
            </div>
          )}

          {/* Already Submitted */}
          {!loading && !error && alreadySubmitted && !submitted && (
            <div className="fade-in" style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: 16, border: "1.5px solid #eef0f3"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32", marginBottom: 8 }}>
                {isAr ? "تم التسجيل اليوم" : "Already Submitted Today"}
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                {isAr
                  ? "لقد سجّلت بياناتك اليومية بالفعل. يمكنك العودة غداً."
                  : "You've already submitted your daily log. Please come back tomorrow."}
              </div>
            </div>
          )}

          {/* Success */}
          {submitted && (
            <div className="fade-in" style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: 16, border: "1.5px solid #eef0f3"
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }} className="success-pop">🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#2e7d32", marginBottom: 10 }}>
                {isAr ? "شكراً لك!" : "Thank You!"}
              </div>
              <div style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>
                {isAr
                  ? "تم تسجيل بياناتك اليومية بنجاح.\nسيراجعها طبيبك قريباً."
                  : "Your daily log has been submitted successfully.\nYour doctor will review it soon."}
              </div>
              <div style={{
                marginTop: 20, padding: "12px 16px", background: "rgba(46,125,50,.07)",
                borderRadius: 10, border: "1px solid rgba(46,125,50,.15)"
              }}>
                <div style={{ fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                  {isAr ? `📅 تاريخ التسجيل: ${todayISO()}` : `📅 Submitted for: ${todayISO()}`}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!loading && !error && !alreadySubmitted && !submitted && trackingLink && config && (
            <div className="fade-in">
              {/* Header */}
              <div style={{
                background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16,
                border: "1.5px solid #eef0f3", boxShadow: "0 2px 16px rgba(8,99,186,.07)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <img src="/Logo_Nabd.svg" alt="نبض" style={{ width: 36, height: 36, borderRadius: 8 }} />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0863ba" }}>نبض</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>{trackingLink.clinic_name}</div>
                  </div>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px", borderRadius: 12,
                  background: `${config.color}10`, border: `1.5px solid ${config.color}25`,
                  marginBottom: 14
                }}>
                  <span style={{ fontSize: 24 }}>{config.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: config.color }}>
                      {isAr ? config.label_ar : config.label_en}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>
                      {isAr ? "متابعة يومية" : "Daily Tracking"}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: "#353535", marginBottom: 4 }}>
                  {isAr ? `مرحباً، ${trackingLink.patient_name}` : `Hello, ${trackingLink.patient_name}`}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  {isAr
                    ? `د. ${trackingLink.doctor_name} • ${todayISO()}`
                    : `Dr. ${trackingLink.doctor_name} • ${todayISO()}`}
                </div>

                {trackingLink.notes_for_patient && (
                  <div style={{
                    marginTop: 14, padding: "10px 14px", background: "rgba(8,99,186,.05)",
                    borderRadius: 10, border: "1px solid rgba(8,99,186,.1)",
                    fontSize: 13, color: "#0863ba", lineHeight: 1.5
                  }}>
                    💬 {trackingLink.notes_for_patient}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 10, letterSpacing: 0.5 }}>
                  {isAr ? "📋 أجب على الأسئلة التالية:" : "📋 Please answer the following:"}
                </div>
                {config.fields.map((field, idx) => (
                  <div
                    key={field.key}
                    className="field-card fade-in"
                    style={{
                      animationDelay: `${idx * 0.06}s`,
                      "--accent": config.color,
                      "--accent-bg": `${config.color}15`,
                    } as React.CSSProperties}
                  >
                    <div className="field-label">
                      {isAr ? field.label_ar : field.label_en}
                    </div>

                    {/* Yes/No */}
                    {field.type === "yesno" && (
                      <div className="yesno-wrap">
                        <button
                          className={`yesno-btn yes${fields[field.key] === true ? " active" : ""}`}
                          onClick={() => updateField(field.key, true)}
                        >
                          {isAr ? "✓ نعم" : "✓ Yes"}
                        </button>
                        <button
                          className={`yesno-btn no${fields[field.key] === false ? " active" : ""}`}
                          onClick={() => updateField(field.key, false)}
                        >
                          {isAr ? "✗ لا" : "✗ No"}
                        </button>
                      </div>
                    )}

                    {/* Scale */}
                    {field.type === "scale" && (
                      <>
                        <div className="scale-wrap">
                          {Array.from({ length: (field.max ?? 5) - (field.min ?? 0) + 1 }, (_, i) => i + (field.min ?? 0)).map(num => (
                            <button
                              key={num}
                              className={`scale-btn${fields[field.key] === num ? " active" : ""}`}
                              onClick={() => updateField(field.key, num)}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        {fields[field.key] !== undefined && (
                          <div style={{ fontSize: 11, color: config.color, fontWeight: 600, marginTop: 8 }}>
                            {(() => {
                              const v = Number(fields[field.key]);
                              const rangeKey = `${field.min ?? 0}-${field.max ?? 5}`;
                              const labels = isAr ? SCALE_LABELS_AR[rangeKey] : null;
                              if (!labels) return null;
                              // find closest label
                              const keys = Object.keys(labels).map(Number).sort((a, b) => a - b);
                              const closest = keys.reduce((prev, curr) => Math.abs(curr - v) < Math.abs(prev - v) ? curr : prev);
                              return labels[closest] || null;
                            })()}
                          </div>
                        )}
                      </>
                    )}

                    {/* Select */}
                    {field.type === "select" && (
                      <div className="select-wrap">
                        <select
                          value={String(fields[field.key] ?? "")}
                          onChange={e => updateField(field.key, e.target.value)}
                        >
                          <option value="">{isAr ? "-- اختر --" : "-- Select --"}</option>
                          {(isAr ? field.options_ar : field.options_en)?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Number */}
                    {field.type === "number" && (
                      <div className="number-input-wrap">
                        <input
                          type="number"
                          value={String(fields[field.key] ?? "")}
                          onChange={e => updateField(field.key, parseFloat(e.target.value))}
                          placeholder="0"
                        />
                        <span className="unit-badge">
                          {isAr ? field.unit_ar : field.unit}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* General Notes */}
                <div className="field-card">
                  <div className="field-label">
                    {isAr ? "ملاحظات إضافية (اختياري)" : "Additional notes (optional)"}
                  </div>
                  <textarea
                    className="notes-textarea"
                    value={generalNotes}
                    onChange={e => setGeneralNotes(e.target.value)}
                    placeholder={isAr ? "أي ملاحظات تريد إخبار طبيبك بها..." : "Any notes you want to share with your doctor..."}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? (isAr ? "جاري الإرسال..." : "Submitting...")
                  : (isAr ? "إرسال التقرير اليومي ✓" : "Submit Daily Report ✓")}
              </button>

              <div style={{ textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 12 }}>
                {isAr ? "بياناتك محمية وخاصة بطبيبك فقط" : "Your data is private and only visible to your doctor"}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
