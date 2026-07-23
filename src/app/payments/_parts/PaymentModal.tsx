"use client";
// ============================================================
// src/app/payments/_parts/PaymentModal.tsx
// نافذة إضافة/تعديل دفعة — مستخرَجة من page.tsx
// ============================================================

import { type CSSProperties, useState, useEffect, useRef } from "react";
import AppIcon from "@/components/AppIcon";
import type { Patient, Payment } from "@/lib/supabase";
import { T } from "./translations";
import { getColor, getInitials, fmt } from "./helpers";
import F from "./F";

export function PaymentModal({ lang, patients, doctors, isSharedClinic, onSave, onClose }: {
  lang: string;
  patients: Patient[];
  doctors?: {id: number; name: string}[];
  isSharedClinic?: boolean;
  onSave: (data: Omit<Payment,'id'|'user_id'|'created_at'>) => Promise<void>;
  onClose: () => void
}) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({
    patientId:"", amount:"", description:"", method:"cash",
    date:fmt(new Date()), status:"paid", notes:"",
    doctorId:"", // للخطط المشتركة فقط
    doctorSharePercentage:"", // نسبة الطبيب من الدفعة — للخطط المشتركة فقط
    sessionType:"session", // معاينة | جلسة | مراجعة | أخرى
    sessionTypeOther:"", // السبب عند اختيار "أخرى"
    isPrepayment:false,    // دفع مسبق
    prepaymentSessions:1,  // عدد الجلسات المدفوعة مسبقاً
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDropOpen, setPatientDropOpen] = useState(false);
  const patientDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropRef.current && !patientDropRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false);
        if (!form.patientId) setPatientSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [form.patientId]);

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleSave = async (asPending=false) => {
    if (!form.patientId||!form.amount) { setError(tr.modal.required); return; }
    if (form.sessionType==="other" && !form.sessionTypeOther.trim()) { setError(tr.sessionType.otherReason); return; }
    // تخصيص الطبيب اختياري في الخطط المشتركة — لا validation إلزامي
    setSaving(true);
    try {
      await onSave({
        patient_id: form.patientId ? Number(form.patientId) : undefined,
        amount: parseFloat(form.amount),
        description: form.description.trim(),
        method: form.method as "cash"|"card"|"transfer",
        date: form.date,
        status: (asPending ? "pending" : "paid") as "paid"|"pending"|"cancelled",
        notes: form.notes || undefined,
        session_type: form.sessionType,
        session_type_other: form.sessionType==="other" ? form.sessionTypeOther.trim() : undefined,
        is_prepayment: form.isPrepayment,
        prepayment_sessions: form.isPrepayment ? form.prepaymentSessions : undefined,
        ...(isSharedClinic && form.doctorId ? { doctor_id: Number(form.doctorId) } : {}),
        ...(() => {
          if (!isSharedClinic || !form.doctorId || !form.doctorSharePercentage) return {};
          const parsed = parseFloat(form.doctorSharePercentage);
          if (isNaN(parsed)) return {}; // قيمة غير صالحة — تُعامل كأنها غير محددة
          return { doctor_share_percentage: Math.min(100, Math.max(0, parsed)) };
        })(),
      } as any);
    } catch(e) {
      setError(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving payment");
      setSaving(false);
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"11px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:14, color:"#353535", background:"#fafbfc",
    outline:"none", transition:"border .2s", direction: isAr ? "rtl" : "ltr",
  };

  return (
    <div className="modal-sheet" style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div className="modal-inner" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          {/* Drag handle — mobile only */}
          <div style={{ position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",width:40,height:4,borderRadius:4,background:"#e0e0e0" }}/>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(46,125,50,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph="💳" /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.modal.addTitle}</h2>
          </div>
          <button onClick={onClose} style={{ width:36,height:36,borderRadius:10,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}><AppIcon glyph="⚠️" /> {error}</div>}
          <F label={tr.modal.patient}>
            <div ref={patientDropRef} style={{ position:"relative" }}>
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setPatientDropOpen(true);
                    if (!e.target.value) setForm({ ...form, patientId: "" });
                  }}
                  onFocus={() => setPatientDropOpen(true)}
                  placeholder={tr.modal.selectPatient}
                  style={{ ...inputSt, paddingInlineEnd: 36, cursor:"text" }}
                  autoComplete="off"
                  onBlur={e => { e.currentTarget.style.borderColor="#e8eaed"; }}
                />
                <span style={{
                  position:"absolute", insetInlineEnd:12, top:"50%", transform:"translateY(-50%)",
                  pointerEvents:"none", color:"#aaa", fontSize:12,
                }}>{"▾"}</span>
              </div>
              {patientDropOpen && (
                <div style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:300,
                  background:"#fff", border:"1.5px solid #e8eaed", borderRadius:12,
                  boxShadow:"0 8px 32px rgba(46,125,50,.13)", maxHeight:220, overflowY:"auto",
                }}>
                  {filteredPatients.length === 0 ? (
                    <div style={{ padding:"14px 16px", fontSize:13, color:"#aaa", textAlign:"center" }}>
                      {isAr ? "لا توجد نتائج" : "No results found"}
                    </div>
                  ) : (
                    filteredPatients.map(p => (
                      <div
                        key={p.id}
                        onMouseDown={() => {
                          setForm({ ...form, patientId: String(p.id) });
                          setPatientSearch(p.name);
                          setPatientDropOpen(false);
                        }}
                        style={{
                          padding:"11px 16px", fontSize:14, color:"#353535", cursor:"pointer",
                          background: form.patientId === String(p.id) ? "rgba(46,125,50,.07)" : "transparent",
                          fontWeight: form.patientId === String(p.id) ? 600 : 400,
                          borderBottom:"1px solid #f4f6f9",
                          display:"flex", alignItems:"center", gap:10,
                          transition:"background .12s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(46,125,50,.06)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = form.patientId === String(p.id) ? "rgba(46,125,50,.07)" : "transparent"; }}
                      >
                        <div style={{
                          width:28, height:28, borderRadius:8, background:getColor(p.id),
                          color:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:700, flexShrink:0,
                        }}>
                          {getInitials(p.name)}
                        </div>
                        {p.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </F>

          {/* حقل الطبيب — للخطط المشتركة فقط — اختياري */}
          {isSharedClinic && doctors && doctors.length > 0 && (
            <F label={tr.modal.doctorOptional}>
              <div style={{ marginBottom:8,fontSize:12,color:"#aaa",lineHeight:1.6 }}>
                {tr.modal.doctorOptionalHint}
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {/* زر "إيراد مشترك" */}
                <button key="none" onClick={() => setForm({...form, doctorId: ""})}
                  style={{
                    padding:"9px 16px", borderRadius:10, cursor:"pointer",
                    border: form.doctorId==="" ? "1.5px solid #888" : "1.5px solid #eee",
                    background: form.doctorId==="" ? "rgba(100,100,100,.08)" : "#fafbfc",
                    fontFamily:"Rubik,sans-serif", fontSize:13,
                    fontWeight: form.doctorId==="" ? 700 : 400,
                    color: form.doctorId==="" ? "#555" : "#aaa",
                    transition:"all .2s", display:"flex", alignItems:"center", gap:7,
                  }}>
                  <div style={{ width:22,height:22,borderRadius:6,background:form.doctorId===""?"#888":"#ddd",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>
                    <AppIcon glyph="🏥" />
                  </div>
                  {tr.modal.sharedRevenue}
                </button>
                {doctors.map(doc => (
                  <button key={doc.id} onClick={() => setForm({...form, doctorId: String(doc.id)})}
                    style={{
                      padding:"9px 16px", borderRadius:10, cursor:"pointer",
                      border: form.doctorId===String(doc.id) ? "1.5px solid #0891b2" : "1.5px solid #eee",
                      background: form.doctorId===String(doc.id) ? "rgba(8,145,178,.08)" : "#fafbfc",
                      fontFamily:"Rubik,sans-serif", fontSize:13,
                      fontWeight: form.doctorId===String(doc.id) ? 700 : 400,
                      color: form.doctorId===String(doc.id) ? "#0891b2" : "#666",
                      transition:"all .2s", display:"flex", alignItems:"center", gap:7,
                    }}>
                    <div style={{ width:22,height:22,borderRadius:6,background:form.doctorId===String(doc.id)?"#0891b2":"#ccc",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700 }}>
                      {getInitials(doc.name)}
                    </div>
                    {isAr ? "د. " : "Dr. "}{doc.name}
                  </button>
                ))}
              </div>
              {form.doctorId && (
                <div style={{ marginTop:12 }}>
                  <label style={{ fontSize:12,fontWeight:600,color:"#888",marginBottom:6,display:"block" }}>{tr.modal.doctorShare}</label>
                  <input
                    type="text" inputMode="decimal"
                    value={form.doctorSharePercentage}
                    onChange={e=>{
                      // يسمح فقط بأرقام إنجليزية وفاصلة عشرية واحدة، ويحوّل الأرقام العربية/الفارسية تلقائياً
                      let v = e.target.value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, ch => String(ch.charCodeAt(0) % 16 % 10));
                      v = v.replace(/[^0-9.]/g, "");
                      const firstDot = v.indexOf(".");
                      if (firstDot !== -1) v = v.slice(0, firstDot+1) + v.slice(firstDot+1).replace(/\./g, "");
                      if (v !== "") {
                        const num = parseFloat(v);
                        if (!isNaN(num) && num > 100) v = "100";
                      }
                      setForm({...form,doctorSharePercentage:v});
                    }}
                    placeholder={tr.modal.doctorSharePh}
                    style={inputSt}
                    onFocus={e=>(e.target.style.borderColor="#0891b2")}
                    onBlur={e=>(e.target.style.borderColor="#e8eaed")}
                  />
                  <div style={{ marginTop:6,fontSize:11,color:"#aaa",lineHeight:1.6 }}>{tr.modal.doctorShareHint}</div>
                </div>
              )}
            </F>
          )}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.modal.amount} half>
              <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder={tr.modal.amountPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.modal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.modal.description}>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={tr.modal.descPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>

          {/* نوع الجلسة */}
          <F label={tr.sessionType.label}>
            <div style={{ display:"flex",gap:8 }}>
              {[
                { k:"consultation", icon:"🩺", label:tr.sessionType.consultation },
                { k:"session",      icon:"🛋️", label:tr.sessionType.session      },
                { k:"followup",     icon:"🔄", label:tr.sessionType.followup     },
                { k:"other",        icon:"📝", label:tr.sessionType.other        },
              ].map(s=>(
                <label key={s.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.sessionType===s.k?"1.5px solid #0863ba":"1.5px solid #eee",background:form.sessionType===s.k?"rgba(8,99,186,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.sessionType===s.k?700:400,color:form.sessionType===s.k?"#0863ba":"#888" }}>
                  <span><AppIcon glyph={s.icon} /></span>{s.label}
                  <input type="radio" name="sessionType" value={s.k} checked={form.sessionType===s.k} onChange={e=>setForm({...form,sessionType:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
            {form.sessionType==="other" && (
              <input
                value={form.sessionTypeOther}
                onChange={e=>setForm({...form,sessionTypeOther:e.target.value})}
                placeholder={tr.sessionType.otherReasonPh}
                style={{ ...inputSt, marginTop:8 }}
                onFocus={e=>(e.target.style.borderColor="#0863ba")}
                onBlur={e=>(e.target.style.borderColor="#e8eaed")}
              />
            )}
          </F>

          {/* دفع مسبق */}
          <F label={tr.prepayment.label}>
            <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",borderRadius:10,border:form.isPrepayment?"1.5px solid #7b2d8b":"1.5px solid #eee",background:form.isPrepayment?"rgba(123,45,139,.06)":"#fafbfc",transition:"all .2s" }}>
              <div style={{ width:20,height:20,borderRadius:6,border:form.isPrepayment?"2px solid #7b2d8b":"2px solid #ddd",background:form.isPrepayment?"#7b2d8b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",flexShrink:0 }}>
                {form.isPrepayment&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <input type="checkbox" checked={form.isPrepayment} onChange={e=>setForm({...form,isPrepayment:e.target.checked,prepaymentSessions:e.target.checked?form.prepaymentSessions:1})} style={{ display:"none" }}/>
              <span style={{ fontSize:13,fontWeight:600,color:form.isPrepayment?"#7b2d8b":"#666" }}>
                <AppIcon glyph="💳" /> {tr.prepayment.toggle}
              </span>
            </label>
            {form.isPrepayment && (
              <div style={{ marginTop:10,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(123,45,139,.04)",borderRadius:10,border:"1.5px solid rgba(123,45,139,.15)" }}>
                <span style={{ fontSize:12,color:"#7b2d8b",fontWeight:600,flex:1 }}>
                  {tr.prepayment.sessionsHint}
                </span>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <button onClick={()=>setForm({...form,prepaymentSessions:Math.max(1,form.prepaymentSessions-1)})} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid rgba(123,45,139,.3)",background:"#fff",cursor:"pointer",fontSize:16,color:"#7b2d8b",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif" }}>−</button>
                  <span style={{ fontSize:18,fontWeight:900,color:"#7b2d8b",minWidth:28,textAlign:"center" }}>{form.prepaymentSessions}</span>
                  <button onClick={()=>setForm({...form,prepaymentSessions:Math.min(50,form.prepaymentSessions+1)})} style={{ width:28,height:28,borderRadius:8,border:"1.5px solid rgba(123,45,139,.3)",background:"#fff",cursor:"pointer",fontSize:16,color:"#7b2d8b",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Rubik,sans-serif" }}>+</button>
                </div>
                <span style={{ fontSize:12,color:"#7b2d8b",fontWeight:600 }}>{tr.prepayment.sessionsUnit}</span>
              </div>
            )}
          </F>
          <F label={tr.modal.method}>
            <div style={{ display:"flex",gap:10 }}>
              {[
                { k:"cash",     icon:"💵", label:tr.methods.cash     },
                { k:"card",     icon:"💳", label:tr.methods.card     },
                { k:"transfer", icon:"🏦", label:tr.methods.transfer },
              ].map(m=>(
                <label key={m.k} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px",borderRadius:10,cursor:"pointer",border:form.method===m.k?"1.5px solid #2e7d32":"1.5px solid #eee",background:form.method===m.k?"rgba(46,125,50,.08)":"#fafbfc",transition:"all .2s",fontSize:12,fontWeight:form.method===m.k?700:400,color:form.method===m.k?"#2e7d32":"#888" }}>
                  <span><AppIcon glyph={m.icon} /></span>{m.label}
                  <input type="radio" name="method" value={m.k} checked={form.method===m.k} onChange={e=>setForm({...form,method:e.target.value})} style={{ display:"none" }}/>
                </label>
              ))}
            </div>
          </F>
          <F label={tr.modal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.modal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#2e7d32"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        {/* Footer */}
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button
  onClick={() => handleSave(false)}
  disabled={saving}
  style={{
    flex: 1,
    padding: "13px",
    background: saving ? "#81c784" : "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontFamily: "Rubik,sans-serif",
    fontSize: 15,
    fontWeight: 700,
    cursor: saving ? "not-allowed" : "pointer",
    boxShadow: "0 4px 16px rgba(46,125,50,.25)",
    transition: "all .2s"
  }}
>
            {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : tr.modal.save}
          </button>
          <button onClick={()=>handleSave(true)} disabled={saving} style={{ padding:"13px 16px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:saving?.6:1 }}>
            {tr.modal.addPending}
          </button>
          <button onClick={onClose} style={{ padding:"13px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.modal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── سلايدر البطاقات للموبايل ─────────────────────────────


export default PaymentModal;
