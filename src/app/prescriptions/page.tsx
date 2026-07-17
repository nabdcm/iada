"use client";

import { useState, useEffect, useRef, type JSX } from "react";
import SharedSidebar from "@/components/SharedSidebar";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Prescriptions Page — الوصفات الطبية
// ============================================================

const t = {
  ar: {
    appName: "نبض", appSub: "إدارة العيادة",
    nav: {
      dashboard: "لوحة المعلومات", patients: "المرضى",
      appointments: "المواعيد", payments: "المدفوعات",
      prescriptions: "الوصفات الطبية", tracking: "متابعة المرضى", settings: "الإعدادات",
    },
    title: "الوصفات الطبية",
    subtitle: "إدارة وطباعة الوصفات للمرضى",
    search: "ابحث باسم المريض...",
    newPrescription: "وصفة جديدة",
    addPrescription: "إضافة وصفة طبية",
    editPrescription: "تعديل الوصفة",
    printPrescription: "طباعة الوصفة",
    deletePrescription: "حذف الوصفة",
    confirmDelete: "هل أنت متأكد من حذف هذه الوصفة؟",
    cancel: "إلغاء",
    save: "حفظ",
    close: "إغلاق",
    patient: "المريض",
    selectPatient: "اختر المريض",
    date: "التاريخ",
    diagnosis: "التشخيص",
    diagnosisPlaceholder: "أدخل التشخيص الطبي...",
    notes: "ملاحظات إضافية",
    notesPlaceholder: "ملاحظات للمريض أو للصيدلاني...",
    medications: "الأدوية",
    addMedication: "إضافة دواء",
    medicationName: "اسم الدواء",
    medicationNamePlaceholder: "مثال: أموكسيسيلين 500mg",
    dosage: "الجرعة",
    dosagePlaceholder: "مثال: حبة واحدة",
    frequency: "التكرار",
    frequencyPlaceholder: "مثال: ثلاث مرات يومياً",
    duration: "المدة",
    durationPlaceholder: "مثال: 7 أيام",
    instructions: "تعليمات إضافية",
    instructionsPlaceholder: "مثال: بعد الأكل",
    removeMedication: "حذف",
    noMedications: "لم تُضَف أدوية بعد",
    noPrescriptions: "لا توجد وصفات طبية",
    noPrescriptionsDesc: "ابدأ بإنشاء أول وصفة طبية",
    noSearchResults: "لا توجد نتائج للبحث",
    loading: "جاري التحميل...",
    prescriptionCount: "وصفة",
    medications_count: "دواء",
    clinic: "العيادة",
    doctor: "الطبيب",
    signOut: "تسجيل الخروج",
    printTitle: "وصفة طبية",
    printDate: "التاريخ",
    printPatient: "المريض",
    printDiagnosis: "التشخيص",
    printMedications: "الأدوية الموصوفة",
    printNotes: "ملاحظات",
    printDosage: "الجرعة",
    printFrequency: "التكرار",
    printDuration: "المدة",
    printInstructions: "التعليمات",
    printSignature: "توقيع الطبيب",
    printStamp: "الختم",
    required: "مطلوب",
    allPatients: "جميع المرضى",
    filterByDate: "تصفية حسب التاريخ",
    currency: "ل.س",
  },
  en: {
    appName: "NABD", appSub: "Clinic Manager",
    nav: {
      dashboard: "Dashboard", patients: "Patients",
      appointments: "Appointments", payments: "Payments",
      prescriptions: "Prescriptions", tracking: "Patient Tracking", settings: "Settings",
    },
    title: "Prescriptions",
    subtitle: "Manage and print patient prescriptions",
    search: "Search by patient name...",
    newPrescription: "New Prescription",
    addPrescription: "Add Prescription",
    editPrescription: "Edit Prescription",
    printPrescription: "Print Prescription",
    deletePrescription: "Delete Prescription",
    confirmDelete: "Are you sure you want to delete this prescription?",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    patient: "Patient",
    selectPatient: "Select Patient",
    date: "Date",
    diagnosis: "Diagnosis",
    diagnosisPlaceholder: "Enter medical diagnosis...",
    notes: "Additional Notes",
    notesPlaceholder: "Notes for patient or pharmacist...",
    medications: "Medications",
    addMedication: "Add Medication",
    medicationName: "Medication Name",
    medicationNamePlaceholder: "e.g. Amoxicillin 500mg",
    dosage: "Dosage",
    dosagePlaceholder: "e.g. One tablet",
    frequency: "Frequency",
    frequencyPlaceholder: "e.g. Three times daily",
    duration: "Duration",
    durationPlaceholder: "e.g. 7 days",
    instructions: "Additional Instructions",
    instructionsPlaceholder: "e.g. After meals",
    removeMedication: "Remove",
    noMedications: "No medications added yet",
    noPrescriptions: "No prescriptions yet",
    noPrescriptionsDesc: "Start by creating your first prescription",
    noSearchResults: "No search results found",
    loading: "Loading...",
    prescriptionCount: "prescription",
    medications_count: "medication",
    clinic: "Clinic",
    doctor: "Doctor",
    signOut: "Sign Out",
    printTitle: "Medical Prescription",
    printDate: "Date",
    printPatient: "Patient",
    printDiagnosis: "Diagnosis",
    printMedications: "Prescribed Medications",
    printNotes: "Notes",
    printDosage: "Dosage",
    printFrequency: "Frequency",
    printDuration: "Duration",
    printInstructions: "Instructions",
    printSignature: "Doctor's Signature",
    printStamp: "Stamp",
    required: "Required",
    allPatients: "All Patients",
    filterByDate: "Filter by date",
    currency: "SYP",
  },
} as const;

type Lang = "ar" | "en";

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor = (id: number) => AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: number;
  patient_id: number;
  patient_name?: string;
  date: string;
  diagnosis: string;
  notes: string;
  medications: Medication[];
  doctor_name?: string;
  doctor_id?: string;   // للخطط المشتركة — معرّف الطبيب المُصدِر
  clinic_name?: string;
  created_at?: string;
  user_id?: string;
}

// ─── Sidebar ──────────────────────────────────────────────
const SB_BG          = "#0558a8";
const SB_BG_HEADER   = "#044d96";
const SB_BG_FOOTER   = "#044d96";
const SB_ACTIVE_BG   = "rgba(255,255,255,0.15)";
const SB_ACTIVE_TEXT = "#ffffff";
const SB_IDLE_TEXT   = "rgba(255,255,255,0.62)";
const SB_BORDER      = "rgba(255,255,255,0.1)";
const SB_INDICATOR   = "#7dd3fc";

const PillIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.5 20.5 3.5 13.5a5 5 0 1 1 7-7l7 7a5 5 0 1 1-7 7z"/>
    <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
  </svg>
);

const TrackingIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

// ─── Plan access rules ────────────────────────────────────
// individual: basic | pro | enterprise
// shared clinic: shared_basic (2 drs) | shared_pro (3 drs) | shared_enterprise (5 drs)
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";

const isSharedPlan = (plan: PlanType): boolean =>
  plan === "shared_basic" || plan === "shared_pro" || plan === "shared_enterprise";

const SHARED_PLAN_MAX_DOCTORS: Record<PlanType, number> = {
  basic: 1, pro: 1, enterprise: 1,
  shared_basic: 2, shared_pro: 3, shared_enterprise: 5,
};

const PLAN_ACCESS: Record<string, string[]> = {
  payments:         ["pro", "enterprise", "shared_pro", "shared_enterprise"],
  prescriptions:    ["enterprise", "shared_enterprise"],
  tracking:         ["enterprise", "shared_enterprise"],
  xrays:            ["enterprise", "shared_enterprise"],
  clinicManagement: ["shared_basic", "shared_pro", "shared_enterprise"],
};

const canAccess = (feature: string, plan: PlanType): boolean =>
  PLAN_ACCESS[feature] ? PLAN_ACCESS[feature].includes(plan) : true;
const PLAN_BADGE: Record<PlanType,{label:{ar:string;en:string};color:string}> = {
  basic:             {label:{ar:"الأساسية",          en:"Basic"},           color:"#0863ba"},
  pro:               {label:{ar:"الاحترافية",        en:"Professional"},    color:"#7b2d8b"},
  enterprise:        {label:{ar:"الشاملة",           en:"Comprehensive"},   color:"#e67e22"},
  shared_basic:      {label:{ar:"مشتركة - أساسية",  en:"Shared - Basic"},  color:"#0e8a6e"},
  shared_pro:        {label:{ar:"مشتركة - احترافية",en:"Shared - Pro"},    color:"#6a1fa8"},
  shared_enterprise: {label:{ar:"مشتركة - شاملة",   en:"Shared - Full"},   color:"#c0620a"},
};


// ─── Print Prescription ────────────────────────────────────
function printPrescription(prescription: Prescription, lang: Lang, clinicName: string, doctorName: string) {
  const tr = t[lang];
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const medicationsHTML = prescription.medications.map((med, i) => `
    <tr style="border-bottom: 1px solid #e8edf5;">
      <td style="padding: 10px 14px; font-weight: 700; color: #1a1a2e; font-size: 13px;">${i + 1}. ${med.name}</td>
      <td style="padding: 10px 14px; color: #555; font-size: 12px;">${med.dosage}</td>
      <td style="padding: 10px 14px; color: #555; font-size: 12px;">${med.frequency}</td>
      <td style="padding: 10px 14px; color: #555; font-size: 12px;">${med.duration}</td>
      <td style="padding: 10px 14px; color: #888; font-size: 11px; font-style: italic;">${med.instructions}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      <meta charset="UTF-8" />
      <title>${tr.printTitle}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${isAr ? "'Noto Naskh Arabic', serif" : "'Noto Sans', sans-serif"};
          direction: ${dir};
          background: #fff;
          color: #1a1a2e;
          font-size: 13px;
          line-height: 1.6;
        }
        .page {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 24px;
          border-bottom: 3px solid #0863ba;
          margin-bottom: 28px;
        }
        .clinic-info h1 {
          font-size: 24px;
          font-weight: 800;
          color: #0863ba;
          margin-bottom: 4px;
        }
        .clinic-info p { font-size: 13px; color: #666; margin-bottom: 2px; }
        .rx-badge {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #0863ba, #1a7fd4);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 900; color: white;
          box-shadow: 0 4px 16px rgba(8,99,186,.3);
          font-family: serif;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .meta-card {
          background: #f7f9fc;
          border: 1.5px solid #eef0f3;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .meta-card .label { font-size: 10px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
        .meta-card .value { font-size: 15px; font-weight: 700; color: #1a1a2e; }
        .section-title {
          font-size: 13px; font-weight: 700; color: #0863ba;
          text-transform: uppercase; letter-spacing: .5px;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-title::after {
          content: "";
          flex: 1;
          height: 1.5px;
          background: linear-gradient(90deg, #0863ba20, transparent);
        }
        .diagnosis-box {
          background: rgba(8,99,186,.04);
          border: 1.5px solid rgba(8,99,186,.12);
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #333;
          line-height: 1.7;
        }
        .medications-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          border-radius: 12px;
          overflow: hidden;
          border: 1.5px solid #eef0f3;
          box-shadow: 0 2px 8px rgba(8,99,186,.05);
        }
        .medications-table thead tr {
          background: linear-gradient(135deg, #0863ba, #1a7fd4);
        }
        .medications-table thead th {
          padding: 12px 14px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          text-align: ${isAr ? "right" : "left"};
        }
        .medications-table tbody tr:nth-child(even) { background: #f7f9fc; }
        .notes-box {
          background: #fffdf0;
          border: 1.5px solid #f0e06a40;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 32px;
          font-size: 13px;
          color: #555;
        }
        .footer {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          padding-top: 24px;
          border-top: 1.5px solid #eef0f3;
          margin-top: 20px;
        }
        .signature-area {
          text-align: center;
        }
        .signature-line {
          border-bottom: 1.5px dashed #ccc;
          margin-bottom: 8px;
          height: 60px;
        }
        .signature-label { font-size: 11px; color: #888; }
        .footer-note {
          text-align: center;
          font-size: 10px;
          color: #bbb;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f0f2f5;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="clinic-info">
            <h1>${clinicName}</h1>
            <p>👨‍⚕️ ${doctorName}</p>
            <p style="font-size:11px; color:#999; margin-top:6px;">${tr.printTitle}</p>
          </div>
          <div class="rx-badge">℞</div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="label">${tr.printPatient}</div>
            <div class="value">${prescription.patient_name ?? "—"}</div>
          </div>
          <div class="meta-card">
            <div class="label">${tr.printDate}</div>
            <div class="value">${new Date(prescription.date).toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
        </div>

        ${prescription.diagnosis ? `
          <div class="section-title">🔍 ${tr.printDiagnosis}</div>
          <div class="diagnosis-box">${prescription.diagnosis}</div>
        ` : ""}

        <div class="section-title">💊 ${tr.printMedications}</div>
        <table class="medications-table">
          <thead>
            <tr>
              <th>${tr.medicationName}</th>
              <th>${tr.printDosage}</th>
              <th>${tr.printFrequency}</th>
              <th>${tr.printDuration}</th>
              <th>${tr.printInstructions}</th>
            </tr>
          </thead>
          <tbody>${medicationsHTML}</tbody>
        </table>

        ${prescription.notes ? `
          <div class="section-title">📝 ${tr.printNotes}</div>
          <div class="notes-box">${prescription.notes}</div>
        ` : ""}

        <div class="footer">
          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">${tr.printSignature}</div>
          </div>
          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">${tr.printStamp}</div>
          </div>
        </div>

        <div class="footer-note">نبض — نظام إدارة العيادة | NABD Clinic Management System</div>
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// ─── Medication Row ────────────────────────────────────────
function MedicationRow({ med, onChange, onRemove, lang, index }: {
  med: Medication; onChange: (m: Medication) => void;
  onRemove: () => void; lang: Lang; index: number;
}) {
  const tr = t[lang];
  const isAr = lang === "ar";
  const inp = (field: keyof Medication) => ({
    value: med[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...med, [field]: e.target.value }),
    style: {
      width: "100%", padding: "8px 12px", border: "1.5px solid #eef0f3",
      borderRadius: 8, fontSize: 13, fontFamily: "Rubik,sans-serif",
      outline: "none", background: "#fafbfc", color: "#353535",
      direction: isAr ? "rtl" as const : "ltr" as const,
    },
  });

  return (
    <div style={{ background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0863ba", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{index + 1}</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0863ba" }}>💊 {tr.medications}</span>
        </div>
        <button onClick={onRemove} style={{ padding: "4px 10px", background: "rgba(192,57,43,.08)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c0392b", fontFamily: "Rubik,sans-serif" }}>
          ✕ {tr.removeMedication}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 4 }}>{tr.medicationName} *</label>
          <input {...inp("name")} placeholder={tr.medicationNamePlaceholder} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 4 }}>{tr.dosage}</label>
          <input {...inp("dosage")} placeholder={tr.dosagePlaceholder} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 4 }}>{tr.frequency}</label>
          <input {...inp("frequency")} placeholder={tr.frequencyPlaceholder} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 4 }}>{tr.duration}</label>
          <input {...inp("duration")} placeholder={tr.durationPlaceholder} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#888", fontWeight: 600, display: "block", marginBottom: 4 }}>{tr.instructions}</label>
          <input {...inp("instructions")} placeholder={tr.instructionsPlaceholder} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function PrescriptionsPage() {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr = t[lang];

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<{ id: number; name: string }[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [clinicName, setClinicName] = useState("عيادة نبض");
  const [doctorName, setDoctorName] = useState("الطبيب");
  const [isMobile, setIsMobile] = useState(false);
  const [plan, setPlan] = useState<PlanType>("basic");
  // للخطط المشتركة: قائمة الأطباء + الطبيب المحدد لإصدار الوصفة
  const [doctors, setDoctors] = useState<{id:string; name:string}[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>("all");

  // Form state
  const [form, setForm] = useState<Omit<Prescription, "id" | "created_at">>({
    patient_id: 0,
    patient_name: "",
    date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    notes: "",
    medications: [],
    doctor_name: "",
    doctor_id: "",
    clinic_name: "",
    user_id: "",
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      // Load patients
      const { data: patientsData } = await supabase
        .from("patients").select("id, name")
        .eq("user_id", userId).eq("is_hidden", false)
        .order("name");
      setPatients(patientsData ?? []);

      // Load clinic/doctor settings + plan
      const { data: settingsData } = await supabase
        .from("settings").select("clinic_name, doctor_name")
        .eq("user_id", userId).single();
      if (settingsData) {
        setClinicName(settingsData.clinic_name ?? "عيادة نبض");
        setDoctorName(settingsData.doctor_name ?? "الطبيب");
      }
      const { data: clinicData } = await supabase
        .from("clinics").select("plan").eq("user_id", userId).maybeSingle();
      if (clinicData?.plan) {
        const p = clinicData.plan as PlanType;
        setPlan(p);
        // تحميل قائمة الأطباء للخطط المشتركة
        if (isSharedPlan(p)) {
          const { data: drs } = await supabase
            .from("doctors")
            .select("id, name")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("id", { ascending: true });
          if (drs) setDoctors(drs.map(d => ({ id: String(d.id), name: d.name })));
        }
      }

      // Load prescriptions
      const { data: rxData } = await supabase
        .from("prescriptions").select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      // Enrich with patient names
      const patientMap: Record<number, string> = {};
      (patientsData ?? []).forEach((p: any) => { patientMap[p.id] = p.name; });
      const enriched = (rxData ?? []).map((rx: any) => ({
        ...rx,
        patient_name: patientMap[rx.patient_id] ?? "—",
        medications: typeof rx.medications === "string" ? JSON.parse(rx.medications) : (rx.medications ?? []),
      }));
      setPrescriptions(enriched);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function openNew() {
    setEditingId(null);
    setForm({
      patient_id: 0, patient_name: "",
      date: new Date().toISOString().split("T")[0],
      diagnosis: "", notes: "", medications: [],
      doctor_name: doctorName, doctor_id: "",
      clinic_name: clinicName,
      user_id: "",
    });
    setShowModal(true);
  }

  function openEdit(rx: Prescription) {
    setEditingId(rx.id);
    setForm({ ...rx });
    setShowModal(true);
  }

  function addMedication() {
    setForm(f => ({
      ...f,
      medications: [...f.medications, {
        id: Date.now().toString(),
        name: "", dosage: "", frequency: "", duration: "", instructions: "",
      }]
    }));
  }

  function updateMedication(idx: number, med: Medication) {
    setForm(f => ({ ...f, medications: f.medications.map((m, i) => i === idx ? med : m) }));
  }

  function removeMedication(idx: number) {
    setForm(f => ({ ...f, medications: f.medications.filter((_, i) => i !== idx) }));
  }

  async function savePrescription() {
    if (!form.patient_id || form.medications.length === 0) return;
    // للخطط المشتركة: الطبيب مطلوب
    if (isSharedPlan(plan) && !form.doctor_id) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

      // استخرج اسم الطبيب بناءً على الخطة
      let resolvedDoctorName = doctorName;
      if (isSharedPlan(plan) && form.doctor_id) {
        const dr = doctors.find(d => d.id === form.doctor_id);
        if (dr) resolvedDoctorName = dr.name;
      }

      const payload: Record<string, unknown> = {
        patient_id: form.patient_id,
        date: form.date,
        diagnosis: form.diagnosis,
        notes: form.notes,
        medications: JSON.stringify(form.medications),
        doctor_name: resolvedDoctorName,
        clinic_name: clinicName,
        user_id: userId,
        ...(isSharedPlan(plan) && form.doctor_id ? { doctor_id: form.doctor_id } : {}),
      };

      if (editingId) {
        await supabase.from("prescriptions").update(payload).eq("id", editingId);
      } else {
        await supabase.from("prescriptions").insert(payload);
      }
      setShowModal(false);
      await loadData();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function deletePrescription(id: number) {
    await supabase.from("prescriptions").delete().eq("id", id);
    setDeleteConfirm(null);
    await loadData();
  }

  const filtered = prescriptions.filter(rx => {
    if (search && !rx.patient_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (isSharedPlan(plan) && selectedDoctorFilter !== "all" && rx.doctor_id !== selectedDoctorFilter) return false;
    return true;
  });

  // sidebarWidth managed via onCollapse

  const inputStyle = (isAr: boolean) => ({
    width: "100%", padding: "10px 14px", border: "1.5px solid #eef0f3",
    borderRadius: 10, fontSize: 14, fontFamily: "Rubik,sans-serif",
    outline: "none", background: "#fafbfc", color: "#353535",
    direction: isAr ? "rtl" as const : "ltr" as const,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Rubik', sans-serif; background: #f7f9fc; margin: 0; }
        .rx-card { transition: all .2s; cursor: pointer; }
        .rx-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(8,99,186,.12) !important; }
        .icon-btn:hover { background: rgba(8,99,186,.12) !important; }
        .modal-overlay { animation: fadeIn .2s ease; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .modal-inner { animation: slideUp .25s cubic-bezier(.4,0,.2,1); }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        input:focus { border-color: #0863ba !important; box-shadow: 0 0 0 3px rgba(8,99,186,.1) !important; }
        textarea:focus { border-color: #0863ba !important; box-shadow: 0 0 0 3px rgba(8,99,186,.1) !important; }
        select:focus { border-color: #0863ba !important; box-shadow: 0 0 0 3px rgba(8,99,186,.1) !important; }
        @media (max-width: 768px) {
          .rx-grid { grid-template-columns: 1fr !important; }
          .modal-inner { width: calc(100vw - 24px) !important; max-height: 92vh !important; }
          .modal-grid { grid-template-columns: 1fr !important; }
          .med-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SharedSidebar lang={lang as "ar"|"en"} setLang={setLang as (l:"ar"|"en")=>void} activePage="prescriptions" plan={plan} planLoading={loading} onCollapse={(c) => setSidebarWidth(isMobile ? 0 : (c ? 70 : 240))} />

      <main style={{
        marginRight: isAr ? sidebarWidth : 0,
        marginLeft: isAr ? 0 : sidebarWidth,
        minHeight: "100vh",
        padding: isMobile ? "70px 16px 32px" : "32px",
        background: "#f7f9fc",
        direction: isAr ? "rtl" : "ltr",
        fontFamily: "Rubik, sans-serif",
      }}>

        {/* ── شاشة "غير متاح في خطتك" ── */}
        {!loading && !canAccess("prescriptions", plan) && (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center",gap:16 }}>
            <div style={{ fontSize:64 }}>🔒</div>
            <h2 style={{ fontSize:22,fontWeight:800,color:"#353535" }}>
              {isAr ? "الوصفات الطبية غير متاحة في خطتك الحالية" : "Prescriptions Not Available in Your Plan"}
            </h2>
            <p style={{ fontSize:14,color:"#888",maxWidth:420,lineHeight:1.8 }}>
              {isAr
                ? "الخطة الأساسية والاحترافية (فردية أو مشتركة) لا تتضمن ميزة الوصفات الطبية. هذه الميزة متاحة حصراً في الخطة الشاملة."
                : "The Basic and Professional plans (individual or shared) do not include prescriptions. This feature is exclusively available in the Comprehensive plan."}
            </p>
            <div style={{ display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center",marginTop:4 }}>
              <div style={{ padding:"10px 20px",background:"rgba(230,126,34,.08)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontSize:13,color:"#e67e22",fontWeight:600 }}>
                ✅ {isAr?"الشاملة — فردي":"Comprehensive — Individual"}
              </div>
              <div style={{ padding:"10px 20px",background:"rgba(74,20,128,.08)",border:"1.5px solid rgba(74,20,128,.2)",borderRadius:12,fontSize:13,color:"#4a1480",fontWeight:600 }}>
                ✅ {isAr?"الشاملة — مشترك":"Comprehensive — Shared"}
              </div>
            </div>
            <a href="https://wa.me/963998285483" target="_blank" rel="noopener noreferrer"
              style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"12px 28px",background:"#25D366",color:"#fff",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,textDecoration:"none",boxShadow:"0 4px 16px rgba(37,211,102,.35)",marginTop:8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.535 5.847L.057 23.882l6.196-1.447A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.371l-.36-.214-3.68.859.925-3.585-.234-.369A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
              {isAr ? "تواصل معنا للترقية" : "Contact Us to Upgrade"}
            </a>
          </div>
        )}

        {/* ── المحتوى الرئيسي — للشاملة فقط ── */}
        {canAccess("prescriptions", plan) && (<>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#1a1a2e", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: isMobile ? 22 : 28 }}>💊</span> {tr.title}
            </h1>
            <p style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>{tr.subtitle}</p>
          </div>
          <button onClick={openNew} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            background: "linear-gradient(135deg, #0863ba, #1a7fd4)",
            border: "none", borderRadius: 12, cursor: "pointer",
            color: "#fff", fontSize: 14, fontWeight: 700,
            fontFamily: "Rubik,sans-serif",
            boxShadow: "0 4px 14px rgba(8,99,186,.35)",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 18 }}>+</span> {tr.newPrescription}
          </button>
        </div>

        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: 24, maxWidth: 480 }}>
          <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [isAr ? "right" : "left"]: 14, fontSize: 16, color: "#aaa" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tr.search}
            style={{
              width: "100%", padding: isAr ? "11px 44px 11px 16px" : "11px 16px 11px 44px",
              border: "1.5px solid #eef0f3", borderRadius: 12,
              fontSize: 14, fontFamily: "Rubik,sans-serif",
              background: "#fff", color: "#353535", outline: "none",
              direction: isAr ? "rtl" : "ltr",
              boxShadow: "0 2px 8px rgba(8,99,186,.06)",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)",
              [isAr ? "left" : "right"]: 14, background: "none", border: "none",
              cursor: "pointer", fontSize: 16, color: "#aaa", padding: 2,
            }}>✕</button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { icon: "📋", value: String(prescriptions.length), label: tr.prescriptionCount, color: "#0863ba", bg: "rgba(8,99,186,.08)" },
            { icon: "👥", value: String(new Set(prescriptions.map(r => r.patient_id)).size), label: tr.patient, color: "#2e7d32", bg: "rgba(46,125,50,.08)" },
            { icon: "💊", value: String(prescriptions.reduce((s, r) => s + r.medications.length, 0)), label: tr.medications_count, color: "#7b2d8b", bg: "rgba(123,45,139,.08)" },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "#fff", borderRadius: 12, border: "1.5px solid #eef0f3", boxShadow: "0 2px 8px rgba(8,99,186,.05)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
                <div style={{ fontSize: 11, color: "#aaa", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── شريط تصفية الأطباء — للخطط المشتركة فقط ── */}
        {isSharedPlan(plan) && doctors.length > 0 && (
          <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", border:"1.5px solid rgba(14,138,110,.2)", boxShadow:"0 2px 8px rgba(14,138,110,.07)", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>👨‍⚕️</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#0e8a6e" }}>{isAr ? "عرض حسب الطبيب" : "Filter by Doctor"}</span>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={()=>setSelectedDoctorFilter("all")}
                style={{ padding:"6px 16px", borderRadius:20, fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${selectedDoctorFilter==="all"?"#0e8a6e":"#eef0f3"}`,
                  background:selectedDoctorFilter==="all"?"rgba(14,138,110,.1)":"#fafbfc",
                  color:selectedDoctorFilter==="all"?"#0e8a6e":"#888", transition:"all .15s" }}>
                {isAr ? "الكل" : "All"}
                <span style={{ marginRight:isAr?6:0, marginLeft:isAr?0:6, fontSize:11, background:"rgba(14,138,110,.15)", color:"#0e8a6e", padding:"1px 7px", borderRadius:10, fontWeight:700 }}>
                  {prescriptions.length}
                </span>
              </button>
              {doctors.map(dr => {
                const count = prescriptions.filter(rx => rx.doctor_id === dr.id).length;
                const isActive = selectedDoctorFilter === dr.id;
                return (
                  <button key={dr.id} onClick={()=>setSelectedDoctorFilter(dr.id)}
                    style={{ padding:"6px 16px", borderRadius:20, fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600, cursor:"pointer",
                      border:`1.5px solid ${isActive?"#0e8a6e":"#eef0f3"}`,
                      background:isActive?"rgba(14,138,110,.1)":"#fafbfc",
                      color:isActive?"#0e8a6e":"#888", transition:"all .15s",
                      display:"flex", alignItems:"center", gap:6 }}>
                    {dr.name}
                    <span style={{ fontSize:11, background:isActive?"rgba(14,138,110,.2)":"#f0f0f0", color:isActive?"#0e8a6e":"#aaa", padding:"1px 7px", borderRadius:10, fontWeight:700 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Prescriptions Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 1.5s ease infinite" }}>💊</div>
            <div style={{ fontSize: 14 }}>{tr.loading}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{search ? "🔍" : "💊"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#888", marginBottom: 8 }}>
              {search ? tr.noSearchResults : tr.noPrescriptions}
            </div>
            {!search && <div style={{ fontSize: 13, color: "#bbb" }}>{tr.noPrescriptionsDesc}</div>}
          </div>
        ) : (
          <div className="rx-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filtered.map(rx => {
              const patientId = rx.patient_id ?? 1;
              return (
                <div key={rx.id} className="rx-card" style={{
                  background: "#fff", borderRadius: 16, padding: 20,
                  boxShadow: "0 2px 12px rgba(8,99,186,.07)", border: "1.5px solid #eef0f3",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #0863ba, #1a7fd4)" }} />

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: getColor(patientId), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(rx.patient_name ?? "م")}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{rx.patient_name}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          📅 {new Date(rx.date).toLocaleDateString(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-US", { year: "numeric", month: "short", day: "numeric" })}
                          {/* شارة الطبيب — للخطط المشتركة فقط */}
                          {isSharedPlan(plan) && rx.doctor_id && (() => {
                            const dr = doctors.find(d => d.id === rx.doctor_id);
                            return dr ? (
                              <span style={{ fontSize:10, background:"rgba(14,138,110,.1)", color:"#0e8a6e", padding:"1px 7px", borderRadius:8, fontWeight:700 }}>
                                👨‍⚕️ {dr.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="icon-btn" onClick={() => {
                        const drName = isSharedPlan(plan) && rx.doctor_id
                          ? (doctors.find(d=>d.id===rx.doctor_id)?.name ?? doctorName)
                          : doctorName;
                        printPrescription({ ...rx, doctor_name: drName, clinic_name: clinicName }, lang, clinicName, drName);
                      }} title={tr.printPrescription} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(46,125,50,.08)", border: "1.5px solid rgba(46,125,50,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🖨️</button>
                      <button className="icon-btn" onClick={() => openEdit(rx)} title={tr.editPrescription} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(8,99,186,.08)", border: "1.5px solid rgba(8,99,186,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✏️</button>
                      <button className="icon-btn" onClick={() => setDeleteConfirm(rx.id)} title={tr.deletePrescription} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(192,57,43,.06)", border: "1.5px solid rgba(192,57,43,.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑️</button>
                    </div>
                  </div>

                  {rx.diagnosis && (
                    <div style={{ background: "rgba(8,99,186,.04)", border: "1.5px solid rgba(8,99,186,.1)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                      🔍 {rx.diagnosis.length > 80 ? rx.diagnosis.slice(0, 80) + "..." : rx.diagnosis}
                    </div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {rx.medications.slice(0, 3).map((med, i) => (
                      <div key={i} style={{ padding: "4px 10px", background: "#f0f7ff", border: "1.5px solid #d0e4f7", borderRadius: 20, fontSize: 11, color: "#0863ba", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        💊 {med.name}
                      </div>
                    ))}
                    {rx.medications.length > 3 && (
                      <div style={{ padding: "4px 10px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 20, fontSize: 11, color: "#888", fontWeight: 600 }}>
                        +{rx.medications.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>)}
      </main>

      {/* ─── Add/Edit Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
          direction: isAr ? "rtl" : "ltr",
        }}>
          <div className="modal-inner" style={{
            background: "#fff", borderRadius: 20, width: "min(680px, 100%)",
            maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 80px rgba(0,0,0,.2)",
          }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1.5px solid #eef0f3", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0863ba, #1a7fd4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💊</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{editingId ? tr.editPrescription : tr.addPrescription}</div>
                  <div style={{ fontSize: 11, color: "#aaa" }}>
                    {clinicName}
                    {isSharedPlan(plan) && form.doctor_id
                      ? ` — 👨‍⚕️ ${doctors.find(d=>d.id===form.doctor_id)?.name || doctorName}`
                      : ` — ${doctorName}`}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: 36, height: 36, borderRadius: 10, background: "#f7f9fc", border: "1.5px solid #eef0f3", cursor: "pointer", fontSize: 18, color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

              {/* Patient + Date */}
              <div className="modal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{tr.patient} *</label>
                  <select
                    value={form.patient_id}
                    onChange={e => {
                      const id = Number(e.target.value);
                      const p = patients.find(x => x.id === id);
                      setForm(f => ({ ...f, patient_id: id, patient_name: p?.name ?? "" }));
                    }}
                    style={{ ...inputStyle(isAr), appearance: "none" as any }}
                  >
                    <option value={0}>{tr.selectPatient}</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{tr.date}</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={inputStyle(isAr)}
                  />
                </div>
              </div>

              {/* ── تحديد الطبيب — للخطط المشتركة فقط ── */}
              {isSharedPlan(plan) && doctors.length > 0 && (
                <div style={{ marginBottom:16, padding:"14px 16px", background:"rgba(14,138,110,.05)", border:"1.5px solid rgba(14,138,110,.2)", borderRadius:12 }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#0e8a6e", display:"block", marginBottom:8 }}>
                    👨‍⚕️ {isAr ? "الطبيب المُصدِر للوصفة *" : "Issuing Doctor *"}
                  </label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {doctors.map(dr => {
                      const isSelected = form.doctor_id === dr.id;
                      return (
                        <button key={dr.id} type="button"
                          onClick={() => setForm(f => ({ ...f, doctor_id: dr.id }))}
                          style={{ padding:"8px 16px", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .15s",
                            border:`1.5px solid ${isSelected?"#0e8a6e":"#eef0f3"}`,
                            background:isSelected?"rgba(14,138,110,.1)":"#fafbfc",
                            color:isSelected?"#0e8a6e":"#888" }}>
                          {dr.name}
                          {isSelected && <span style={{ marginRight:isAr?6:0, marginLeft:isAr?0:6 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {!form.doctor_id && <div style={{ fontSize:11, color:"#c0392b", marginTop:8, fontWeight:600 }}>
                    {isAr ? "⚠️ يرجى تحديد الطبيب المُصدِر للوصفة" : "⚠️ Please select the issuing doctor"}
                  </div>}
                </div>
              )}

              {/* Diagnosis */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{tr.diagnosis}</label>
                <textarea
                  value={form.diagnosis}
                  onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder={tr.diagnosisPlaceholder}
                  rows={2}
                  style={{ ...inputStyle(isAr), resize: "vertical" as any, minHeight: 60 }}
                />
              </div>

              {/* Medications section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
                    💊 {tr.medications}
                    <span style={{ padding: "2px 8px", background: "rgba(8,99,186,.1)", borderRadius: 20, fontSize: 11, color: "#0863ba", fontWeight: 700 }}>{form.medications.length}</span>
                  </label>
                  <button onClick={addMedication} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "linear-gradient(135deg, #0863ba, #1a7fd4)", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "Rubik,sans-serif" }}>
                    + {tr.addMedication}
                  </button>
                </div>

                {form.medications.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px", background: "#f7f9fc", borderRadius: 12, border: "1.5px dashed #dde3ed", color: "#bbb", fontSize: 13 }}>
                    💊 {tr.noMedications}
                  </div>
                ) : (
                  form.medications.map((med, i) => (
                    <MedicationRow
                      key={med.id}
                      med={med}
                      index={i}
                      lang={lang}
                      onChange={m => updateMedication(i, m)}
                      onRemove={() => removeMedication(i)}
                    />
                  ))
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>{tr.notes}</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={tr.notesPlaceholder}
                  rows={3}
                  style={{ ...inputStyle(isAr), resize: "vertical" as any, minHeight: 72 }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 24px", borderTop: "1.5px solid #eef0f3", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0, background: "#fafbfc" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "10px 24px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#666", fontFamily: "Rubik,sans-serif" }}>
                {tr.cancel}
              </button>
              <button
                onClick={savePrescription}
                disabled={saving || !form.patient_id || form.medications.length === 0 || (isSharedPlan(plan) && !form.doctor_id)}
                style={{
                  padding: "10px 28px",
                  background: (form.patient_id && form.medications.length > 0 && (!isSharedPlan(plan) || form.doctor_id))
                    ? "linear-gradient(135deg, #0863ba, #1a7fd4)" : "#ccc",
                  border: "none", borderRadius: 10,
                  cursor: (form.patient_id && form.medications.length > 0 && (!isSharedPlan(plan) || form.doctor_id))
                    ? "pointer" : "not-allowed",
                  color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "Rubik,sans-serif",
                  boxShadow: (form.patient_id && form.medications.length > 0 && (!isSharedPlan(plan) || form.doctor_id))
                    ? "0 4px 14px rgba(8,99,186,.3)" : "none",
                  opacity: saving ? .7 : 1,
                }}
              >
                {saving ? "⏳" : "✓"} {tr.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deleteConfirm !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
          direction: isAr ? "rtl" : "ltr",
        }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "min(400px, 90vw)", boxShadow: "0 24px 80px rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>{tr.deletePrescription}</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>{tr.confirmDelete}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "10px 24px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "Rubik,sans-serif", color: "#666" }}>
                {tr.cancel}
              </button>
              <button onClick={() => deletePrescription(deleteConfirm)} style={{ padding: "10px 24px", background: "#c0392b", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "Rubik,sans-serif" }}>
                🗑️ {tr.deletePrescription}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
