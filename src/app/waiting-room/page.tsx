"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import SharedSidebar from "@/components/SharedSidebar";
import { supabase } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Waiting Room Control (شاشة تحكم الطبيب بقاعة الانتظار)
// نظام دور تسلسلي يشبه أنظمة البنوك: الطبيب يستدعي المريض يدوياً،
// وعند خروجه يضغط "إنهاء" لينتقل الدور للتالي. شاشة العرض العامة
// (/display/[clinicId]) تعكس هذا الاختيار اليدوي مباشرة.
// ============================================================

type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise";
const isSharedPlan = (p: PlanType) => p.startsWith("shared_");

type QueueStatus = "waiting" | "called" | "done" | "skipped";

interface Appt {
  id: number;
  patient_id: number;
  time: string;
  duration: number;
  status: string;
  queue_status: QueueStatus;
  doctor_id?: number | null;
}

interface Doctor { id: number; name: string; color?: string; }
interface PatientLite { id: number; name: string; }

function toMin(t: string) { const [h, m] = t.slice(0,5).split(":").map(Number); return h*60+m; }
function fmt12(t: string, isAr: boolean) {
  const [h, m] = t.slice(0,5).split(":").map(Number);
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,"0")} ${isAr ? (h>=12?"م":"ص") : (h>=12?"PM":"AM")}`;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

const T = {
  ar: {
    title: "شاشة الانتظار", sub: "تحكّم بدور المرضى داخل العيادة",
    current: "المريض الحالي", noCurrent: "لا يوجد مريض قيد الاستقبال الآن",
    callNext: "📞 استدعاء التالي", finish: "✅ إنهاء وخروج",
    queue: "قائمة الانتظار", empty: "لا يوجد مرضى بقائمة الانتظار",
    call: "استدعاء", skip: "تخطي", recall: "إرجاع للقائمة",
    doneSection: "تم اليوم", skippedSection: "لم يحضروا",
    displayLink: "رابط شاشة العرض للمرضى", copy: "نسخ الرابط", copied: "تم النسخ ✓", open: "فتح الشاشة",
    displayHint: "افتح هذا الرابط على شاشة تلفاز/عرض في صالة الانتظار ليرى المرضى دورهم لحظياً.",
    allDoctors: "كل الأطباء",
    noAppts: "لا توجد مواعيد اليوم",
    min: "د",
  },
  en: {
    title: "Waiting Room", sub: "Control the patient queue inside your clinic",
    current: "Current Patient", noCurrent: "No patient is being served right now",
    callNext: "📞 Call Next", finish: "✅ Finish & Checkout",
    queue: "Waiting Queue", empty: "No patients waiting",
    call: "Call", skip: "Skip", recall: "Back to queue",
    doneSection: "Done Today", skippedSection: "No-shows",
    displayLink: "Public Display Link", copy: "Copy Link", copied: "Copied ✓", open: "Open Display",
    displayHint: "Open this link on a TV/monitor in the waiting area so patients can see their turn live.",
    allDoctors: "All Doctors",
    noAppts: "No appointments today",
    min: "min",
  },
};

export default function WaitingRoomPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"ar"|"en">("ar");
  const isAr = lang === "ar";
  const tr = T[lang];

  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState<PlanType>("basic");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const firstLoad = useRef(true);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    if (firstLoad.current) {
      const { data: clinicRow } = await supabase.from("clinics").select("plan").eq("user_id", user.id).single();
      if (clinicRow?.plan) setPlan(clinicRow.plan as PlanType);

      const { data: doctorsData } = await supabase.from("doctors").select("id, name, color").eq("user_id", user.id).order("name");
      setDoctors(doctorsData ?? []);
      if (doctorsData && doctorsData.length > 0) setSelectedDoctorId("all");
    }

    const today = todayISO();
    const { data: apptData } = await supabase
      .from("appointments")
      .select("id, patient_id, time, duration, status, queue_status, doctor_id")
      .eq("user_id", user.id)
      .eq("date", today)
      .not("status", "in", "(cancelled,no-show,pending_approval)")
      .order("time", { ascending: true });
    const list = (apptData ?? []) as Appt[];
    setAppts(list);

    if (list.length > 0) {
      const ids = [...new Set(list.map(a => a.patient_id))];
      const { data: patientsData } = await supabase.from("patients").select("id, name").in("id", ids);
      setPatients(patientsData ?? []);
    } else {
      setPatients([]);
    }

    firstLoad.current = false;
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getPatientName = (pid: number) => patients.find(p => p.id === pid)?.name ?? (isAr ? "مريض" : "Patient");
  const getDoctor = (did?: number | null) => doctors.find(d => d.id === did);

  const shared = isSharedPlan(plan);

  const scopedAppts = useMemo(() => {
    if (!shared || selectedDoctorId === "all") return appts;
    return appts.filter(a => a.doctor_id === selectedDoctorId);
  }, [appts, shared, selectedDoctorId]);

  const current   = scopedAppts.find(a => a.queue_status === "called") || null;
  const waitingList = scopedAppts.filter(a => a.queue_status === "waiting").sort((a,b)=>toMin(a.time)-toMin(b.time));
  const doneList     = scopedAppts.filter(a => a.queue_status === "done");
  const skippedList  = scopedAppts.filter(a => a.queue_status === "skipped");

  // ─── تحديث حالة موعد واحد + إنهاء أي "حالي" سابق لنفس النطاق ─
  const setQueueStatus = async (id: number, status: QueueStatus, alsoFinishCurrentIn?: Appt[]) => {
    setBusyId(id);
    try {
      if (status === "called" && alsoFinishCurrentIn) {
        const others = alsoFinishCurrentIn.filter(a => a.queue_status === "called" && a.id !== id);
        for (const o of others) {
          await supabase.from("appointments").update({ queue_status: "done" }).eq("id", o.id);
        }
      }
      await supabase.from("appointments").update({ queue_status: status }).eq("id", id);
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const callPatient = (appt: Appt) => {
    // عند الاستدعاء اليدوي — أنهِ أي مريض "حالي" آخر بنفس نطاق الطبيب أولاً
    const scope = shared ? appts.filter(a => a.doctor_id === appt.doctor_id) : appts;
    setQueueStatus(appt.id, "called", scope);
  };

  const callNext = () => {
    if (waitingList.length === 0) return;
    callPatient(waitingList[0]);
  };

  const finishCurrent = () => { if (current) setQueueStatus(current.id, "done"); };
  const skipPatient   = (appt: Appt) => setQueueStatus(appt.id, "skipped");
  const recallPatient = (appt: Appt) => setQueueStatus(appt.id, "waiting");

  const displayUrl = typeof window !== "undefined" ? `${window.location.origin}/display/${userId}` : "";
  const handleCopy = () => {
    if (!displayUrl) return;
    navigator.clipboard.writeText(displayUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const card: React.CSSProperties = { background:"#fff", borderRadius:16, border:"1.5px solid #eef0f3", padding:20 };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .wr-row{animation:fadeUp .25s ease both}
      `}</style>
      <div style={{ display:"flex", minHeight:"100vh" }}>
        <SharedSidebar lang={lang} setLang={setLang} activePage="appointments" plan={plan} planLoading={loading} userId={userId} />
        <main style={{ flex:1, padding:"28px 28px 90px", maxWidth:1100, margin:"0 auto", width:"100%" }} dir={isAr?"rtl":"ltr"}>
          <div style={{ marginBottom:22 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#353535" }}>{tr.title}</h1>
            <p style={{ fontSize:13, color:"#888", marginTop:4 }}>{tr.sub}</p>
          </div>

          {/* رابط شاشة العرض */}
          <div style={{ ...card, marginBottom:20, background:"linear-gradient(135deg,rgba(8,99,186,.05),rgba(8,99,186,.02))", borderColor:"rgba(8,99,186,.15)" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#0863ba", marginBottom:6 }}>🖥️ {tr.displayLink}</div>
            <div style={{ fontSize:12, color:"#888", marginBottom:12, lineHeight:1.6 }}>{tr.displayHint}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <code style={{ flex:1, minWidth:220, background:"#fff", border:"1.5px solid #d0e4f7", borderRadius:8, padding:"9px 12px", fontSize:12.5, color:"#353535", overflowX:"auto", whiteSpace:"nowrap" }}>{displayUrl || "..."}</code>
              <button onClick={handleCopy} style={{ padding:"9px 16px", background:copied?"#2e7d32":"#0863ba", color:"#fff", border:"none", borderRadius:8, fontFamily:"Rubik,sans-serif", fontSize:12.5, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{copied?tr.copied:tr.copy}</button>
              <button onClick={()=>window.open(displayUrl,"_blank")} style={{ padding:"9px 16px", background:"#fff", color:"#0863ba", border:"1.5px solid #d0e4f7", borderRadius:8, fontFamily:"Rubik,sans-serif", fontSize:12.5, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{tr.open}</button>
            </div>
          </div>

          {/* تبويب الأطباء — للعيادات المشتركة فقط */}
          {shared && doctors.length > 0 && (
            <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
              <button onClick={()=>setSelectedDoctorId("all")} style={{ padding:"8px 16px", borderRadius:10, border: selectedDoctorId==="all"?"1.5px solid #0863ba":"1.5px solid #eee", background: selectedDoctorId==="all"?"rgba(8,99,186,.08)":"#fff", color: selectedDoctorId==="all"?"#0863ba":"#888", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"Rubik,sans-serif" }}>{tr.allDoctors}</button>
              {doctors.map(d => (
                <button key={d.id} onClick={()=>setSelectedDoctorId(d.id)} style={{ padding:"8px 16px", borderRadius:10, border: selectedDoctorId===d.id?`1.5px solid ${d.color||"#0891b2"}`:"1.5px solid #eee", background: selectedDoctorId===d.id?`${d.color||"#0891b2"}14`:"#fff", color: selectedDoctorId===d.id?(d.color||"#0891b2"):"#888", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"Rubik,sans-serif" }}>{isAr?"د. ":"Dr. "}{d.name}</button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:"#aaa" }}>...</div>
          ) : scopedAppts.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:50, color:"#aaa" }}>{tr.noAppts}</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"340px 1fr", gap:20, alignItems:"start" }}>
              {/* المريض الحالي */}
              <div style={{ ...card, position:"sticky", top:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>{tr.current}</div>
                {current ? (
                  <div>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:"#2e7d32", background:"rgba(46,125,50,.1)", borderRadius:20, padding:"4px 12px", marginBottom:12 }}>🟢 {isAr?"جارٍ الآن":"In Progress"}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:"#353535", marginBottom:6 }}>{getPatientName(current.patient_id)}</div>
                    <div style={{ fontSize:14, color:"#888", marginBottom:4 }}>{fmt12(current.time, isAr)}</div>
                    {shared && current.doctor_id && (
                      <div style={{ fontSize:12.5, color: getDoctor(current.doctor_id)?.color || "#0891b2", fontWeight:700, marginBottom:14 }}>{isAr?"د. ":"Dr. "}{getDoctor(current.doctor_id)?.name}</div>
                    )}
                    <button onClick={finishCurrent} disabled={busyId===current.id} style={{ width:"100%", marginTop:14, padding:"12px", background: busyId===current.id?"#93c5a3":"#2e7d32", color:"#fff", border:"none", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:13.5, fontWeight:700, cursor:busyId===current.id?"not-allowed":"pointer" }}>{tr.finish}</button>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"20px 0", color:"#aaa", fontSize:13 }}>{tr.noCurrent}</div>
                )}
                <button onClick={callNext} disabled={waitingList.length===0} style={{ width:"100%", marginTop:16, padding:"13px", background: waitingList.length===0?"#bcd7ef":"#0863ba", color:"#fff", border:"none", borderRadius:10, fontFamily:"Rubik,sans-serif", fontSize:14, fontWeight:800, cursor:waitingList.length===0?"not-allowed":"pointer", boxShadow: waitingList.length===0?"none":"0 6px 18px rgba(8,99,186,.25)" }}>{tr.callNext}</button>
              </div>

              {/* قائمة الانتظار */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={card}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:.5, marginBottom:14 }}>{tr.queue} ({waitingList.length})</div>
                  {waitingList.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"24px 0", color:"#ccc", fontSize:13 }}>{tr.empty}</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {waitingList.map((a, i) => (
                        <div key={a.id} className="wr-row" style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background:"#fafbfc", border:"1.5px solid #eef0f3" }}>
                          <div style={{ width:26, height:26, borderRadius:8, background:"rgba(8,99,186,.1)", color:"#0863ba", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:"#353535", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{getPatientName(a.patient_id)}</div>
                            <div style={{ fontSize:11.5, color:"#aaa", display:"flex", gap:8 }}>
                              <span>{fmt12(a.time, isAr)}</span>
                              {shared && a.doctor_id && <span style={{ color:getDoctor(a.doctor_id)?.color||"#0891b2" }}>{isAr?"د. ":"Dr. "}{getDoctor(a.doctor_id)?.name}</span>}
                            </div>
                          </div>
                          <button onClick={()=>callPatient(a)} disabled={busyId===a.id} style={{ padding:"7px 14px", background:"#0863ba", color:"#fff", border:"none", borderRadius:8, fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{tr.call}</button>
                          <button onClick={()=>skipPatient(a)} disabled={busyId===a.id} style={{ padding:"7px 12px", background:"#fff", color:"#c0392b", border:"1.5px solid rgba(192,57,43,.2)", borderRadius:8, fontFamily:"Rubik,sans-serif", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>{tr.skip}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(doneList.length > 0 || skippedList.length > 0) && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                    <div style={card}>
                      <div style={{ fontSize:11.5, fontWeight:700, color:"#2e7d32", marginBottom:10 }}>✅ {tr.doneSection} ({doneList.length})</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                        {doneList.map(a => (
                          <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12.5, color:"#666", padding:"6px 0", borderBottom:"1px solid #f4f6f9" }}>
                            <span>{getPatientName(a.patient_id)}</span>
                            <button onClick={()=>recallPatient(a)} style={{ fontSize:10.5, color:"#0863ba", background:"none", border:"none", cursor:"pointer", fontFamily:"Rubik,sans-serif" }}>{tr.recall}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={card}>
                      <div style={{ fontSize:11.5, fontWeight:700, color:"#c0392b", marginBottom:10 }}>⏭️ {tr.skippedSection} ({skippedList.length})</div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:180, overflowY:"auto" }}>
                        {skippedList.map(a => (
                          <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12.5, color:"#666", padding:"6px 0", borderBottom:"1px solid #f4f6f9" }}>
                            <span>{getPatientName(a.patient_id)}</span>
                            <button onClick={()=>recallPatient(a)} style={{ fontSize:10.5, color:"#0863ba", background:"none", border:"none", cursor:"pointer", fontFamily:"Rubik,sans-serif" }}>{tr.recall}</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
