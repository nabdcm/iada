"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────
interface ClinicInfo {
  id: number;
  name: string;
  clinic_type: string;
  restricted_access_enabled: boolean;
  restricted_access_pin: string;
}

interface Patient {
  id: number;
  name: string;
  phone?: string;
  dob?: string;
  gender?: string;
  notes?: string;
  created_at?: string;
}

const CLINIC_TYPE_ICONS: Record<string, string> = {
  general: "🏥", dental: "🦷", dermatology: "🧴", cosmetic: "💆",
  pediatrics: "👶", physical_therapy: "🏃", mental_health: "🧠",
  nutrition: "🥗", ophthalmology: "👁️", orthopedic: "🦴",
  cardiology: "❤️", gynecology: "🌸", ent: "👂", urology: "💧", other: "🏨",
};

// ─── Main Page ────────────────────────────────────────────────
export default function RestrictedAccessPage() {
  const params   = useParams();
  const router   = useRouter();
  const clinicId = params?.clinicId as string;

  const [stage,        setStage]        = useState<"loading"|"pin"|"patients"|"error">("loading");
  const [clinicInfo,   setClinicInfo]   = useState<ClinicInfo | null>(null);
  const [pinInput,     setPinInput]     = useState("");
  const [pinError,     setPinError]     = useState("");
  const [patients,     setPatients]     = useState<Patient[]>([]);
  const [search,       setSearch]       = useState("");
  const [selected,     setSelected]     = useState<Patient | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(false);

  // ── 1. تحقق من الـ session الموجود ──────────────────────────
  useEffect(() => {
    const session = sessionStorage.getItem(`ra_${clinicId}`);
    if (session === "granted") {
      fetchClinicAndPatients(true);
    } else {
      fetchClinicInfo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  // ── 2. جلب معلومات العيادة فقط (بدون مرضى) ─────────────────
  const fetchClinicInfo = async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("id, name, clinic_type, restricted_access_enabled, restricted_access_pin")
      .eq("id", clinicId)
      .single();

    if (error || !data) { setStage("error"); return; }
    if (!data.restricted_access_enabled) { setStage("error"); return; }
    setClinicInfo(data as ClinicInfo);
    setStage("pin");
  };

  // ── 3. جلب العيادة + المرضى معاً (بعد المصادقة) ────────────
  const fetchClinicAndPatients = async (skipPinCheck = false) => {
    setPatientsLoading(true);
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, clinic_type, restricted_access_enabled, restricted_access_pin")
      .eq("id", clinicId)
      .single();

    if (!clinic || (!skipPinCheck && !clinic.restricted_access_enabled)) {
      setStage("error");
      return;
    }
    setClinicInfo(clinic as ClinicInfo);

    const { data: pts } = await supabase
      .from("patients")
      .select("id, name, phone, dob, gender, notes, created_at")
      .eq("user_id", clinic.id)
      .order("name", { ascending: true });

    setPatients((pts as Patient[]) || []);
    setStage("patients");
    setPatientsLoading(false);
  };

  // ── 4. التحقق من PIN ─────────────────────────────────────────
  const handlePinSubmit = () => {
    if (!clinicInfo) return;
    if (pinInput.trim() === clinicInfo.restricted_access_pin.trim()) {
      sessionStorage.setItem(`ra_${clinicId}`, "granted");
      fetchClinicAndPatients(true);
    } else {
      setPinError("PIN غير صحيح — تحقق من الرقم وأعد المحاولة");
      setPinInput("");
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || "").includes(search)
  );

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  if (stage === "loading") return <LoadingScreen />;
  if (stage === "error")   return <ErrorScreen />;

  // ── PIN Screen ───────────────────────────────────────────────
  if (stage === "pin" && clinicInfo) {
    return (
      <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0863ba 0%,#0e7c6a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif",padding:16 }}>
        <div style={{ background:"#fff",borderRadius:24,padding:"40px 36px",width:"100%",maxWidth:380,boxShadow:"0 32px 80px rgba(0,0,0,.18)",textAlign:"center",animation:"fadeUp .3s ease" }}>

          {/* Logo */}
          <div style={{ width:70,height:70,borderRadius:20,background:"linear-gradient(135deg,#0863ba,#0e7c6a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 20px",boxShadow:"0 8px 24px rgba(8,99,186,.25)" }}>
            🔗
          </div>

          <h1 style={{ fontSize:20,fontWeight:800,color:"#353535",marginBottom:4 }}>دخول مقيّد</h1>
          <p style={{ fontSize:13,color:"#888",marginBottom:6 }}>
            {CLINIC_TYPE_ICONS[clinicInfo.clinic_type || "general"]} {clinicInfo.name}
          </p>
          <p style={{ fontSize:12,color:"#aaa",marginBottom:28,lineHeight:1.6 }}>
            أدخل الـ PIN الذي أرسله لك الطبيب المسؤول للوصول إلى ملفات المرضى
          </p>

          {/* PIN Input */}
          <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:16 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:52,height:60,borderRadius:12,border:`2px solid ${pinInput[i]?"#0863ba":"#e8eaed"}`,background:pinInput[i]?"rgba(8,99,186,.05)":"#fafbfc",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#0863ba",transition:"all .15s" }}>
                {pinInput[i] ? "●" : ""}
              </div>
            ))}
          </div>

          {/* Hidden real input */}
          <input
            autoFocus
            type="tel"
            inputMode="numeric"
            maxLength={8}
            value={pinInput}
            onChange={e => { setPinError(""); setPinInput(e.target.value.replace(/\D/g,"")); }}
            onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
            style={{ position:"absolute",opacity:0,width:1,height:1,pointerEvents:"none" }}
          />

          {/* Numpad */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16 }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i) => (
              <button key={i}
                onClick={() => {
                  setPinError("");
                  if (d === "⌫") setPinInput(p => p.slice(0,-1));
                  else if (d !== "") setPinInput(p => p.length < 8 ? p + d : p);
                }}
                style={{ padding:"16px",borderRadius:12,border:"1.5px solid",fontSize:d==="⌫"?18:20,fontWeight:700,cursor:d===""?"default":"pointer",transition:"all .15s",
                  background: d===""?"transparent":"#fafbfc",
                  borderColor: d===""?"transparent":"#e8eaed",
                  color:"#353535",
                  fontFamily:"Rubik,sans-serif"
                }}
              >{d}</button>
            ))}
          </div>

          {pinError && (
            <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.2)",borderRadius:10,fontSize:12,color:"#c0392b",marginBottom:14 }}>
              ⚠️ {pinError}
            </div>
          )}

          <button
            onClick={handlePinSubmit}
            disabled={pinInput.length < 4}
            style={{ width:"100%",padding:"14px",background:pinInput.length>=4?"#0863ba":"#e8eaed",color:pinInput.length>=4?"#fff":"#aaa",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:pinInput.length>=4?"pointer":"not-allowed",transition:"all .2s",boxShadow:pinInput.length>=4?"0 4px 16px rgba(8,99,186,.25)":"none" }}>
            دخول
          </button>

          <p style={{ fontSize:11,color:"#ccc",marginTop:18 }}>
            🔒 هذا الرابط يمنح صلاحية عرض المرضى فقط
          </p>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap');
          @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
      </div>
    );
  }

  // ── Patients Screen ──────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",direction:"rtl" }}>

      {/* Header */}
      <div style={{ background:"#fff",borderBottom:"1.5px solid #eef0f3",padding:"0 20px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 2px 12px rgba(8,99,186,.06)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0863ba,#0e7c6a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
            {CLINIC_TYPE_ICONS[clinicInfo?.clinic_type || "general"]}
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:700,color:"#353535" }}>{clinicInfo?.name}</div>
            <div style={{ fontSize:10,color:"#aaa" }}>ملفات المرضى — وصول مقيّد</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:11,padding:"4px 12px",borderRadius:20,background:"rgba(14,124,106,.1)",color:"#0e7c6a",fontWeight:700 }}>
            🔗 دخول مقيّد
          </span>
          <button
            onClick={() => { sessionStorage.removeItem(`ra_${clinicId}`); router.push(`/restricted-access/${clinicId}`); }}
            style={{ padding:"6px 14px",border:"1.5px solid #eef0f3",borderRadius:8,background:"#f7f9fc",fontSize:12,color:"#888",cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
            خروج
          </button>
        </div>
      </div>

      <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>

        {/* Search */}
        <div style={{ position:"relative",marginBottom:20 }}>
          <span style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:16,color:"#aaa",pointerEvents:"none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم المريض أو رقم الهاتف..."
            style={{ width:"100%",padding:"12px 42px 12px 14px",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,background:"#fff",color:"#353535",outline:"none",boxSizing:"border-box" }}
          />
        </div>

        {/* Stats bar */}
        <div style={{ display:"flex",gap:10,marginBottom:20 }}>
          <div style={{ flex:1,background:"#fff",borderRadius:12,padding:"12px 16px",border:"1.5px solid #eef0f3",display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:20 }}>👥</span>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:"#0863ba" }}>{patients.length}</div>
              <div style={{ fontSize:10,color:"#aaa" }}>إجمالي المرضى</div>
            </div>
          </div>
          {search && (
            <div style={{ flex:1,background:"#fff",borderRadius:12,padding:"12px 16px",border:"1.5px solid #eef0f3",display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontSize:20 }}>🔎</span>
              <div>
                <div style={{ fontSize:18,fontWeight:800,color:"#0e7c6a" }}>{filteredPatients.length}</div>
                <div style={{ fontSize:10,color:"#aaa" }}>نتائج البحث</div>
              </div>
            </div>
          )}
        </div>

        {/* Notice */}
        <div style={{ background:"rgba(8,99,186,.04)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:12,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:16 }}>ℹ️</span>
          <p style={{ fontSize:12,color:"#555",margin:0,lineHeight:1.6 }}>
            أنت في وضع الدخول المقيّد — يمكنك الاطلاع على ملفات المرضى فقط. المدفوعات والإعدادات غير متاحة.
          </p>
        </div>

        {/* Patients List */}
        {patientsLoading ? (
          <div style={{ textAlign:"center",padding:60,color:"#aaa" }}>
            <div style={{ fontSize:32,marginBottom:12,animation:"spin 1s linear infinite",display:"inline-block" }}>⏳</div>
            <div>جاري التحميل...</div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ textAlign:"center",padding:60,color:"#ccc" }}>
            <div style={{ fontSize:40,marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:14 }}>{search ? "لا توجد نتائج" : "لا يوجد مرضى"}</div>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {filteredPatients.map(p => (
              <div key={p.id}
                onClick={() => setSelected(selected?.id === p.id ? null : p)}
                style={{ background:"#fff",border:`1.5px solid ${selected?.id===p.id?"#0863ba":"#eef0f3"}`,borderRadius:14,padding:"14px 18px",cursor:"pointer",transition:"all .15s",boxShadow:selected?.id===p.id?"0 4px 16px rgba(8,99,186,.1)":"none" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:12,background:`${selected?.id===p.id?"rgba(8,99,186,.12)":"#f0f4f8"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>
                    {p.gender === "female" ? "👩" : "👨"}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:14,fontWeight:700,color:"#353535",marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:11,color:"#aaa",display:"flex",gap:12,flexWrap:"wrap" }}>
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.dob   && <span>🎂 {p.dob}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:14,color:selected?.id===p.id?"#0863ba":"#ccc",transition:"all .15s" }}>
                    {selected?.id===p.id?"▲":"▼"}
                  </div>
                </div>

                {/* Expanded view */}
                {selected?.id === p.id && (
                  <div style={{ marginTop:14,paddingTop:14,borderTop:"1.5px solid #eef0f3",display:"flex",flexDirection:"column",gap:8 }}>
                    {p.notes ? (
                      <div>
                        <div style={{ fontSize:10,fontWeight:700,color:"#aaa",marginBottom:4,textTransform:"uppercase",letterSpacing:.5 }}>ملاحظات</div>
                        <div style={{ fontSize:13,color:"#555",lineHeight:1.7,background:"#fafbfc",borderRadius:10,padding:"10px 12px",border:"1.5px solid #eef0f3" }}>{p.notes}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize:12,color:"#ccc",textAlign:"center",padding:"8px 0" }}>لا توجد ملاحظات مسجّلة</div>
                    )}
                    {p.created_at && (
                      <div style={{ fontSize:10,color:"#ccc",textAlign:"left" }}>
                        تاريخ الإضافة: {new Date(p.created_at).toLocaleDateString("ar-SA")}
                      </div>
                    )}

                    {/* Restricted notice */}
                    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"rgba(192,57,43,.04)",borderRadius:8,border:"1.5px solid rgba(192,57,43,.1)" }}>
                      <span style={{ fontSize:13 }}>🔒</span>
                      <span style={{ fontSize:11,color:"#c0392b" }}>السجل الطبي والمدفوعات غير متاحة في الدخول المقيّد</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc",fontFamily:"Rubik,sans-serif" }}>
      <div style={{ textAlign:"center",color:"#aaa" }}>
        <div style={{ fontSize:40,marginBottom:16 }}>⏳</div>
        <div>جاري التحقق...</div>
      </div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc",fontFamily:"Rubik,sans-serif",direction:"rtl" }}>
      <div style={{ textAlign:"center",padding:40,maxWidth:360 }}>
        <div style={{ fontSize:56,marginBottom:16 }}>🔒</div>
        <h2 style={{ fontSize:20,fontWeight:800,color:"#353535",marginBottom:8 }}>رابط غير صالح</h2>
        <p style={{ fontSize:13,color:"#888",lineHeight:1.7 }}>
          هذا الرابط غير موجود أو لم يتم تفعيل الدخول المقيّد لهذه العيادة.
          تواصل مع الطبيب المسؤول للحصول على رابط صحيح.
        </p>
      </div>
    </div>
  );
}
