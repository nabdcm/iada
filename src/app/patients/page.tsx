"use client";

// ============================================================
// NABD - نبض | Patient Profile & Dental Components
// Add these components to your existing page.tsx
// ============================================================

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/supabase";

type Lang = "ar" | "en";

// ─── Translations for new components ─────────────────────
const PT = {
  ar: {
    profile: {
      title: "ملف المريض الكامل",
      tabs: {
        info: "المعلومات",
        medical: "السجل الطبي",
        xrays: "الأشعة",
        dental: "خريطة الأسنان",
      },
      // Info tab
      personalInfo: "المعلومات الشخصية",
      name: "الاسم الكامل",
      phone: "رقم الهاتف",
      gender: "الجنس",
      dob: "تاريخ الميلاد",
      age: "العمر",
      years: "سنة",
      bloodType: "فصيلة الدم",
      address: "العنوان",
      emergency: "جهة الاتصال الطارئة",
      emergencyPhone: "هاتف الطوارئ",
      // Medical tab
      conditions: "الحالات المزمنة",
      allergies: "الحساسية",
      medications: "الأدوية الحالية",
      surgeries: "العمليات السابقة",
      familyHistory: "التاريخ العائلي",
      notes: "ملاحظات الطبيب",
      visitHistory: "سجل الزيارات",
      // Xray tab
      xrays: "صور الأشعة",
      uploadXray: "رفع صورة أشعة",
      xrayDate: "التاريخ",
      xrayType: "نوع الأشعة",
      xrayNote: "ملاحظة",
      xrayTypes: { panoramic: "بانورامك", periapical: "بيريابيكال", bitewing: "بيت وينغ", chest: "صدر", hand: "يد", spine: "عمود فقري", other: "أخرى" },
      noXrays: "لا توجد صور أشعة",
      dropzone: "اسحب الصورة هنا أو انقر للرفع",
      // Dental tab
      dentalChart: "خريطة الأسنان",
      selectTooth: "انقر على السن للتعديل",
      toothStatus: "حالة السن",
      toothNotes: "ملاحظات",
      statuses: {
        healthy: "سليم",
        filled: "حشوة",
        crown: "تاج",
        missing: "مفقود",
        extraction: "خلع",
        root_canal: "معالجة عصب",
        bridge: "جسر",
        implant: "زرعة",
        fractured: "مكسور",
        decayed: "تسوس",
      },
      upper: "الفك العلوي",
      lower: "الفك السفلي",
      right: "يمين",
      left: "يسار",
      adult: "دائم",
      baby: "لبني",
      close: "إغلاق",
      save: "حفظ",
      edit: "تعديل",
      clinicType: "نوع العيادة",
      dental: "أسنان",
      general: "عامة",
    },
  },
  en: {
    profile: {
      title: "Patient Full Profile",
      tabs: {
        info: "Info",
        medical: "Medical",
        xrays: "X-Rays",
        dental: "Dental Chart",
      },
      personalInfo: "Personal Information",
      name: "Full Name",
      phone: "Phone",
      gender: "Gender",
      dob: "Date of Birth",
      age: "Age",
      years: "yrs",
      bloodType: "Blood Type",
      address: "Address",
      emergency: "Emergency Contact",
      emergencyPhone: "Emergency Phone",
      conditions: "Chronic Conditions",
      allergies: "Allergies",
      medications: "Current Medications",
      surgeries: "Past Surgeries",
      familyHistory: "Family History",
      notes: "Doctor Notes",
      visitHistory: "Visit History",
      xrays: "X-Ray Images",
      uploadXray: "Upload X-Ray",
      xrayDate: "Date",
      xrayType: "Type",
      xrayNote: "Note",
      xrayTypes: { panoramic: "Panoramic", periapical: "Periapical", bitewing: "Bitewing", chest: "Chest", hand: "Hand", spine: "Spine", other: "Other" },
      noXrays: "No X-rays uploaded",
      dropzone: "Drag image here or click to upload",
      dentalChart: "Dental Chart",
      selectTooth: "Click a tooth to edit",
      toothStatus: "Tooth Status",
      toothNotes: "Notes",
      statuses: {
        healthy: "Healthy",
        filled: "Filled",
        crown: "Crown",
        missing: "Missing",
        extraction: "Extraction",
        root_canal: "Root Canal",
        bridge: "Bridge",
        implant: "Implant",
        fractured: "Fractured",
        decayed: "Decayed",
      },
      upper: "Upper Jaw",
      lower: "Lower Jaw",
      right: "Right",
      left: "Left",
      adult: "Adult",
      baby: "Baby",
      close: "Close",
      save: "Save",
      edit: "Edit",
      clinicType: "Clinic Type",
      dental: "Dental",
      general: "General",
    },
  },
} as const;

// ─── Tooth Status Colors ──────────────────────────────────
const TOOTH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  healthy:     { bg: "#e8f5e9", border: "#4caf50", text: "#2e7d32" },
  filled:      { bg: "#e3f2fd", border: "#2196f3", text: "#1565c0" },
  crown:       { bg: "#fff3e0", border: "#ff9800", text: "#e65100" },
  missing:     { bg: "#f5f5f5", border: "#9e9e9e", text: "#616161" },
  extraction:  { bg: "#fce4ec", border: "#e91e63", text: "#880e4f" },
  root_canal:  { bg: "#f3e5f5", border: "#9c27b0", text: "#4a148c" },
  bridge:      { bg: "#e0f2f1", border: "#009688", text: "#00695c" },
  implant:     { bg: "#e8eaf6", border: "#3f51b5", text: "#1a237e" },
  fractured:   { bg: "#fff8e1", border: "#ffc107", text: "#f57f17" },
  decayed:     { bg: "#fbe9e7", border: "#ff5722", text: "#bf360c" },
};

type ToothStatus = keyof typeof TOOTH_COLORS;

type ToothData = {
  status: ToothStatus;
  notes: string;
};

type DentalChart = Record<number, ToothData>;

// Adult teeth numbers (FDI notation)
// Upper: 18,17,16,15,14,13,12,11 | 21,22,23,24,25,26,27,28
// Lower: 48,47,46,45,44,43,42,41 | 31,32,33,34,35,36,37,38
const UPPER_RIGHT = [18,17,16,15,14,13,12,11];
const UPPER_LEFT  = [21,22,23,24,25,26,27,28];
const LOWER_RIGHT = [48,47,46,45,44,43,42,41];
const LOWER_LEFT  = [31,32,33,34,35,36,37,38];

// Baby teeth
const UPPER_RIGHT_BABY = [55,54,53,52,51];
const UPPER_LEFT_BABY  = [61,62,63,64,65];
const LOWER_RIGHT_BABY = [85,84,83,82,81];
const LOWER_LEFT_BABY  = [71,72,73,74,75];

type XRayImage = {
  id: string;
  url: string;
  type: string;
  date: string;
  note: string;
  name: string;
};

// ─── Dental Chart Component ───────────────────────────────
function DentalChartSection({ lang, patientId }: { lang: Lang; patientId: number }) {
  const t = PT[lang].profile;
  const isAr = lang === "ar";
  const [chart, setChart] = useState<DentalChart>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<ToothStatus>("healthy");
  const [editNote, setEditNote] = useState("");
  const [showBaby, setShowBaby] = useState(false);

  const storageKey = `dental_chart_${patientId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setChart(JSON.parse(saved)); } catch {}
    }
  }, [patientId]);

  const saveTooth = () => {
    if (selected === null) return;
    const updated = { ...chart, [selected]: { status: editStatus, notes: editNote } };
    setChart(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSelected(null);
  };

  const openTooth = (num: number) => {
    setSelected(num);
    const existing = chart[num];
    setEditStatus(existing?.status ?? "healthy");
    setEditNote(existing?.notes ?? "");
  };

  const ToothBtn = ({ num }: { num: number }) => {
    const data = chart[num];
    const colors = data ? TOOTH_COLORS[data.status] : { bg: "#fff", border: "#dde3ea", text: "#aaa" };
    const isSelected = selected === num;
    return (
      <button
        onClick={() => openTooth(num)}
        title={`${num}${data ? ` — ${t.statuses[data.status]}` : ""}`}
        style={{
          width: 34, height: 38,
          borderRadius: 8,
          border: `2px solid ${isSelected ? "#0863ba" : colors.border}`,
          background: isSelected ? "rgba(8,99,186,.12)" : colors.bg,
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 2,
          transition: "all .15s",
          flexShrink: 0,
          boxShadow: isSelected ? "0 0 0 3px rgba(8,99,186,.2)" : "0 1px 3px rgba(0,0,0,.06)",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 7, color: "#aaa", fontWeight: 700, lineHeight: 1 }}>{num}</span>
        <svg viewBox="0 0 20 24" width="14" height="16" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 1C7 1 4 3 4 7c0 2 .5 4 1 6 .5 2 1 5 1 7 0 1 .5 2 1 2s1-.5 1-2c0-1 .5-2 2-2s2 1 2 2c0 1.5.5 2 1 2s1-1 1-2c0-2 .5-5 1-7 .5-2 1-4 1-6 0-4-3-6-6-6z"
            fill={data ? colors.border : "#dde3ea"}
            opacity={data ? 1 : 0.5}
          />
        </svg>
        {data?.status === "missing" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:16, color:"#9e9e9e", fontWeight:900 }}>×</span>
          </div>
        )}
      </button>
    );
  };

  const ToothRow = ({ nums, label }: { nums: number[]; label: string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:9, color:"#bbb", fontWeight:700, textAlign:"center", textTransform:"uppercase" }}>{label}</div>
      <div style={{ display:"flex", gap:3 }}>
        {nums.map(n => <ToothBtn key={n} num={n} />)}
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Toggle Baby/Adult */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button
          onClick={() => setShowBaby(false)}
          style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600,
            background: !showBaby ? "#0863ba" : "#f0f4f8", color: !showBaby ? "#fff" : "#888" }}
        >{t.adult}</button>
        <button
          onClick={() => setShowBaby(true)}
          style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600,
            background: showBaby ? "#0863ba" : "#f0f4f8", color: showBaby ? "#fff" : "#888" }}
        >{t.baby}</button>
      </div>

      {/* Chart */}
      <div style={{ background:"#fafbfc", borderRadius:14, padding:16, border:"1.5px solid #eef0f3", overflowX:"auto" }}>
        {!showBaby ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12, minWidth:600 }}>
            {/* Upper jaw */}
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#0863ba", marginBottom:4 }}>🦷 {t.upper}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16 }}>
              <ToothRow nums={UPPER_RIGHT} label={isAr ? t.left : t.right} />
              <div style={{ width:2, background:"#e0e6ed", borderRadius:2, alignSelf:"stretch", margin:"16px 0 0" }} />
              <ToothRow nums={UPPER_LEFT} label={isAr ? t.right : t.left} />
            </div>
            {/* Divider */}
            <div style={{ height:2, background:"#eef0f3", borderRadius:2, margin:"4px 0" }} />
            {/* Lower jaw */}
            <div style={{ display:"flex", justifyContent:"center", gap:16 }}>
              <ToothRow nums={LOWER_RIGHT} label={isAr ? t.left : t.right} />
              <div style={{ width:2, background:"#e0e6ed", borderRadius:2, alignSelf:"stretch", margin:"0 0 16px" }} />
              <ToothRow nums={LOWER_LEFT} label={isAr ? t.right : t.left} />
            </div>
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#0863ba", marginTop:4 }}>🦷 {t.lower}</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12, minWidth:400 }}>
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#0863ba", marginBottom:4 }}>🦷 {t.upper}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:16 }}>
              <ToothRow nums={UPPER_RIGHT_BABY} label={isAr ? t.left : t.right} />
              <div style={{ width:2, background:"#e0e6ed", borderRadius:2, alignSelf:"stretch", margin:"16px 0 0" }} />
              <ToothRow nums={UPPER_LEFT_BABY} label={isAr ? t.right : t.left} />
            </div>
            <div style={{ height:2, background:"#eef0f3", borderRadius:2, margin:"4px 0" }} />
            <div style={{ display:"flex", justifyContent:"center", gap:16 }}>
              <ToothRow nums={LOWER_RIGHT_BABY} label={isAr ? t.left : t.right} />
              <div style={{ width:2, background:"#e0e6ed", borderRadius:2, alignSelf:"stretch", margin:"0 0 16px" }} />
              <ToothRow nums={LOWER_LEFT_BABY} label={isAr ? t.right : t.left} />
            </div>
            <div style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#0863ba", marginTop:4 }}>🦷 {t.lower}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {Object.entries(TOOTH_COLORS).map(([key, c]) => (
          <span key={key} style={{ fontSize:10, padding:"3px 9px", borderRadius:20, background:c.bg, border:`1.5px solid ${c.border}`, color:c.text, fontWeight:600 }}>
            {t.statuses[key as ToothStatus]}
          </span>
        ))}
      </div>

      {/* Editor Panel */}
      {selected !== null && (
        <div style={{ background:"#fff", borderRadius:14, padding:16, border:"2px solid #0863ba", boxShadow:"0 4px 20px rgba(8,99,186,.12)" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#0863ba", marginBottom:12 }}>
            🦷 {isAr ? `السن رقم` : `Tooth #`}{selected}
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"block", marginBottom:6 }}>{t.toothStatus}</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {Object.keys(TOOTH_COLORS).map(s => {
                const c = TOOTH_COLORS[s];
                const active = editStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s as ToothStatus)}
                    style={{
                      padding:"5px 12px", borderRadius:20, cursor:"pointer", fontSize:11, fontWeight:600,
                      fontFamily:"Rubik,sans-serif",
                      background: active ? c.border : c.bg,
                      border:`1.5px solid ${c.border}`,
                      color: active ? "#fff" : c.text,
                      transition:"all .15s",
                    }}
                  >{t.statuses[s as ToothStatus]}</button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"block", marginBottom:6 }}>{t.toothNotes}</label>
            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              rows={2}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e8eaed", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, resize:"none", outline:"none", direction:isAr?"rtl":"ltr" }}
            />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={saveTooth}
              style={{ flex:1, padding:"10px", background:"#0863ba", color:"#fff", border:"none", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}
            >{t.save}</button>
            <button
              onClick={() => setSelected(null)}
              style={{ padding:"10px 16px", background:"#f5f5f5", color:"#666", border:"none", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, cursor:"pointer" }}
            >{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── X-Ray Upload Component ───────────────────────────────
function XRaySection({ lang, patientId }: { lang: Lang; patientId: number }) {
  const t = PT[lang].profile;
  const isAr = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<XRayImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newType, setNewType] = useState("panoramic");
  const [newNote, setNewNote] = useState("");
  const [preview, setPreview] = useState<XRayImage | null>(null);

  const storageKey = `xrays_${patientId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setImages(JSON.parse(saved)); } catch {}
    }
  }, [patientId]);

  const saveImages = (imgs: XRayImage[]) => {
    setImages(imgs);
    localStorage.setItem(storageKey, JSON.stringify(imgs));
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const newImg: XRayImage = {
        id: Date.now().toString(),
        url,
        type: newType,
        date: new Date().toISOString().slice(0, 10),
        note: newNote,
        name: file.name,
      };
      saveImages([newImg, ...images]);
      setNewNote("");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (id: string) => {
    saveImages(images.filter(img => img.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Upload area */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"block", marginBottom:5 }}>{t.xrayType}</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e8eaed", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, outline:"none", background:"#fafbfc" }}
            >
              {Object.entries(t.xrayTypes).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"block", marginBottom:5 }}>{t.xrayNote}</label>
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e8eaed", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13, outline:"none", background:"#fafbfc", direction:isAr?"rtl":"ltr" }}
            />
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          style={{
            border: `2px dashed ${dragging ? "#0863ba" : "#c8d4e0"}`,
            borderRadius:14, padding:"24px 16px", textAlign:"center", cursor:"pointer",
            background: dragging ? "rgba(8,99,186,.05)" : "#fafbfc",
            transition:"all .2s",
          }}
        >
          {uploading ? (
            <div style={{ fontSize:13, color:"#0863ba" }}>⏳ {isAr ? "جاري الرفع..." : "Uploading..."}</div>
          ) : (
            <>
              <div style={{ fontSize:32, marginBottom:8 }}>🩻</div>
              <div style={{ fontSize:13, color:"#888", fontWeight:500 }}>{t.dropzone}</div>
              <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>JPG, PNG, WEBP</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* Images grid */}
      {images.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 0", color:"#ccc" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🩻</div>
          <div style={{ fontSize:13 }}>{t.noXrays}</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:10 }}>
          {images.map(img => (
            <div
              key={img.id}
              style={{ borderRadius:12, overflow:"hidden", border:"1.5px solid #eef0f3", background:"#fff", boxShadow:"0 2px 8px rgba(0,0,0,.06)", cursor:"pointer" }}
              onClick={() => setPreview(img)}
            >
              <div style={{ position:"relative", aspectRatio:"4/3", overflow:"hidden", background:"#f0f2f5" }}>
                <img src={img.url} alt={img.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <button
                  onClick={e => { e.stopPropagation(); deleteImage(img.id); }}
                  style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,.5)", border:"none", cursor:"pointer", color:"#fff", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}
                >✕</button>
              </div>
              <div style={{ padding:"8px 10px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#0863ba" }}>{(t.xrayTypes as any)[img.type] || img.type}</div>
                <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>{img.date}</div>
                {img.note && <div style={{ fontSize:10, color:"#888", marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{img.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={() => setPreview(null)}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.8)", backdropFilter:"blur(6px)" }} />
          <div style={{ position:"relative", zIndex:1, maxWidth:"90vw", maxHeight:"90vh", display:"flex", flexDirection:"column", gap:12 }}
            onClick={e => e.stopPropagation()}>
            <img src={preview.url} alt={preview.name} style={{ maxWidth:"100%", maxHeight:"80vh", borderRadius:12, objectFit:"contain" }} />
            <div style={{ background:"rgba(255,255,255,.1)", backdropFilter:"blur(10px)", borderRadius:10, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{(t.xrayTypes as any)[preview.type]}</div>
                <div style={{ color:"rgba(255,255,255,.6)", fontSize:11 }}>{preview.date}{preview.note && ` — ${preview.note}`}</div>
              </div>
              <button onClick={() => setPreview(null)} style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:8, cursor:"pointer", color:"#fff", fontSize:16, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Medical History Section ──────────────────────────────
function MedicalSection({ lang, patient }: { lang: Lang; patient: Patient }) {
  const t = PT[lang].profile;
  const isAr = lang === "ar";
  const storageKey = `medical_${patient.id}`;
  const [data, setData] = useState({
    allergies: "",
    medications: "",
    surgeries: "",
    familyHistory: "",
    notes: patient.notes ?? "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setData(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
    }
  }, [patient.id]);

  const save = () => localStorage.setItem(storageKey, JSON.stringify(data));

  const inputSt: CSSProperties = {
    width:"100%", padding:"10px 14px",
    border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:13,
    color:"#353535", background:"#fafbfc",
    outline:"none", resize:"vertical" as const,
    direction: isAr ? "rtl" : "ltr",
    lineHeight: 1.6,
  };

  const Section = ({ icon, label, field }: { icon: string; label: string; field: keyof typeof data }) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
        <span>{icon}</span>{label}
      </label>
      <textarea
        value={data[field]}
        onChange={e => setData(prev => ({ ...prev, [field]: e.target.value }))}
        onBlur={save}
        rows={2}
        style={inputSt}
      />
    </div>
  );

  return (
    <div>
      {/* Chronic conditions (from patient data) */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:8 }}>⚕️ {t.conditions}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
            background: patient.has_diabetes ? "rgba(192,57,43,.1)" : "#f5f5f5",
            color: patient.has_diabetes ? "#c0392b" : "#bbb",
            border: `1.5px solid ${patient.has_diabetes ? "rgba(192,57,43,.3)" : "#eee"}`,
          }}>🩸 {isAr ? "السكري" : "Diabetes"}: {patient.has_diabetes ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</span>
          <span style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600,
            background: patient.has_hypertension ? "rgba(230,126,34,.1)" : "#f5f5f5",
            color: patient.has_hypertension ? "#e67e22" : "#bbb",
            border: `1.5px solid ${patient.has_hypertension ? "rgba(230,126,34,.3)" : "#eee"}`,
          }}>💊 {isAr ? "ضغط الدم" : "Hypertension"}: {patient.has_hypertension ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</span>
        </div>
      </div>

      <Section icon="🤧" label={t.allergies}      field="allergies" />
      <Section icon="💊" label={t.medications}     field="medications" />
      <Section icon="🔪" label={t.surgeries}       field="surgeries" />
      <Section icon="👨‍👩‍👧" label={t.familyHistory}  field="familyHistory" />
      <Section icon="📝" label={t.notes}           field="notes" />
    </div>
  );
}

// ─── Patient Profile Drawer ───────────────────────────────
export function PatientProfileDrawer({
  lang,
  patient,
  clinicType,
  onClose,
}: {
  lang: Lang;
  patient: Patient;
  clinicType: "general" | "dental";
  onClose: () => void;
}) {
  const t = PT[lang].profile;
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"info" | "medical" | "xrays" | "dental">("info");

  const calcAge = (dob?: string | null) => {
    if (!dob) return "—";
    return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25));
  };

  const tabs = [
    { key: "info",    label: t.tabs.info,    icon: "👤" },
    { key: "medical", label: t.tabs.medical, icon: "🏥" },
    { key: "xrays",   label: t.tabs.xrays,   icon: "🩻" },
    ...(clinicType === "dental" ? [{ key: "dental", label: t.tabs.dental, icon: "🦷" }] : []),
  ] as { key: typeof activeTab; label: string; icon: string }[];

  return (
    <>
      <style>{`
        @keyframes drawerIn { from { opacity:0; transform:translateX(${isAr ? "-100%" : "100%"}) } to { opacity:1; transform:translateX(0) } }
        .profile-tab { transition: all .18s; }
        .profile-tab:hover { background: rgba(8,99,186,.06) !important; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,.4)", backdropFilter:"blur(4px)" }}
      />

      {/* Drawer */}
      <div style={{
        position:"fixed", top:0, bottom:0,
        [isAr ? "left" : "right"]: 0,
        width: "min(520px, 100vw)",
        zIndex:301,
        background:"#fff",
        display:"flex", flexDirection:"column",
        boxShadow: isAr ? "6px 0 40px rgba(0,0,0,.15)" : "-6px 0 40px rgba(0,0,0,.15)",
        animation:"drawerIn .3s cubic-bezier(.4,0,.2,1)",
        direction: isAr ? "rtl" : "ltr",
      }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1.5px solid #eef0f3", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:"#0863ba", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>
            {patient.name.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#353535", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{patient.name}</div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:2, display:"flex", alignItems:"center", gap:8 }}>
              {patient.gender && <span>{isAr ? (patient.gender === "male" ? "ذكر" : "أنثى") : (patient.gender === "male" ? "Male" : "Female")}</span>}
              {calcAge(patient.date_of_birth) !== "—" && <span>• {calcAge(patient.date_of_birth)} {t.years}</span>}
              <span style={{ padding:"1px 8px", borderRadius:10, fontSize:10, fontWeight:600, background: clinicType === "dental" ? "rgba(8,99,186,.1)" : "rgba(22,160,133,.1)", color: clinicType === "dental" ? "#0863ba" : "#16a085" }}>
                {clinicType === "dental" ? `🦷 ${t.dental}` : `🏥 ${t.general}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:8, background:"#f5f5f5", border:"none", cursor:"pointer", fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:"1.5px solid #eef0f3", padding:"0 8px" }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              className="profile-tab"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex:1, padding:"12px 8px", border:"none", cursor:"pointer",
                fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600,
                background: activeTab === tab.key ? "transparent" : "transparent",
                color: activeTab === tab.key ? "#0863ba" : "#aaa",
                borderBottom: activeTab === tab.key ? "2.5px solid #0863ba" : "2.5px solid transparent",
                display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                transition:"all .18s",
              }}
            >
              <span style={{ fontSize:16 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* Info Tab */}
          {activeTab === "info" && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>{t.personalInfo}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {[
                  { label: t.name,   value: patient.name,   icon: "👤" },
                  { label: t.phone,  value: patient.phone || "—", icon: "📞" },
                  { label: t.gender, value: patient.gender ? (isAr ? (patient.gender === "male" ? "ذكر" : "أنثى") : (patient.gender === "male" ? "Male" : "Female")) : "—", icon: "⚧" },
                  { label: t.dob,    value: patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString(isAr ? "ar-SA" : "en-US", { year:"numeric", month:"long", day:"numeric" }) : "—", icon: "🎂" },
                  { label: t.age,    value: calcAge(patient.date_of_birth) !== "—" ? `${calcAge(patient.date_of_birth)} ${t.years}` : "—", icon: "🎯" },
                ].map(f => (
                  <div key={f.label} style={{ background:"#f7f9fc", borderRadius:10, padding:"12px 14px", border:"1.5px solid #eef0f3" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#bbb", marginBottom:5 }}>{f.icon} {f.label}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#353535" }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {patient.notes && (
                <div style={{ marginTop:16, background:"#fffbf0", borderRadius:10, padding:"12px 14px", border:"1.5px solid #ffe58f" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#bbb", marginBottom:5 }}>📝 {t.notes}</div>
                  <div style={{ fontSize:13, color:"#555", lineHeight:1.6 }}>{patient.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Medical Tab */}
          {activeTab === "medical" && (
            <MedicalSection lang={lang} patient={patient} />
          )}

          {/* X-Rays Tab */}
          {activeTab === "xrays" && (
            <XRaySection lang={lang} patientId={patient.id} />
          )}

          {/* Dental Tab */}
          {activeTab === "dental" && clinicType === "dental" && (
            <DentalChartSection lang={lang} patientId={patient.id} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Clinic Type Selector ─────────────────────────────────
// Add this to your admin settings or top of patients page
export function ClinicTypeSelector({ lang, value, onChange }: {
  lang: Lang;
  value: "general" | "dental";
  onChange: (v: "general" | "dental") => void;
}) {
  const t = PT[lang].profile;
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <span style={{ fontSize:12, color:"#888", fontWeight:600 }}>{t.clinicType}:</span>
      {(["general", "dental"] as const).map(type => (
        <button
          key={type}
          onClick={() => onChange(type)}
          style={{
            padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer",
            fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:600,
            background: value === type ? (type === "dental" ? "#0863ba" : "#16a085") : "#f0f4f8",
            color: value === type ? "#fff" : "#888",
            transition:"all .2s",
          }}
        >{type === "dental" ? `🦷 ${t.dental}` : `🏥 ${t.general}`}</button>
      ))}
    </div>
  );
}
