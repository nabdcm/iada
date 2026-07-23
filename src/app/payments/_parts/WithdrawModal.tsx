"use client";
// ============================================================
// src/app/payments/_parts/WithdrawModal.tsx
// نافذة تسجيل سحب من الصندوق.
// ============================================================

import { type CSSProperties, useState } from "react";
import AppIcon from "@/components/AppIcon";
import { T } from "./translations";
import { fmt } from "./helpers";
import F from "./F";

export function WithdrawModal({ lang, onSave, onClose }: { lang: string; onSave: (data: any) => Promise<void>; onClose: () => void }) {
  const tr = T[lang]; const isAr = lang==="ar";
  const [form, setForm] = useState({ amount:"", reason:"", date:fmt(new Date()), notes:"" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputSt: React.CSSProperties = { width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr" };

  const handleSave = async () => {
    if (!form.amount || !form.reason.trim()) { setError(tr.withdrawModal.required); return; }
    setSaving(true);
    try {
      await onSave({ amount: parseFloat(form.amount), reason: form.reason.trim(), date: form.date, notes: form.notes||undefined });
    } catch { setError(isAr?"حدث خطأ":"Error saving"); setSaving(false); }
  };

  return (
    <div className="modal-sheet" style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div className="modal-inner" style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(192,57,43,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"rgba(192,57,43,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}><AppIcon glyph="💸" /></div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.withdrawModal.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>
        <div style={{ padding:"20px 26px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:16 }}><AppIcon glyph="⚠️" /> {error}</div>}
          <div style={{ display:"flex",gap:12 }}>
            <F label={tr.withdrawModal.amount} half>
              <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00" style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
            <F label={tr.withdrawModal.date} half>
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
            </F>
          </div>
          <F label={tr.withdrawModal.reason}>
            <input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder={tr.withdrawModal.reasonPh} style={inputSt} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
          <F label={tr.withdrawModal.notes}>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder={tr.withdrawModal.notesPh} rows={2} style={{ ...inputSt,resize:"vertical",lineHeight:1.6 }} onFocus={e=>e.target.style.borderColor="#c0392b"} onBlur={e=>e.target.style.borderColor="#e8eaed"}/>
          </F>
        </div>
        <div style={{ padding:"14px 26px 22px",display:"flex",gap:10,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"13px",background:saving?"#e57373":"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(192,57,43,.25)",transition:"all .2s" }}>
            {saving?(isAr?"جاري الحفظ...":"Saving..."):tr.withdrawModal.save}
          </button>
          <button onClick={onClose} style={{ padding:"13px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.withdrawModal.cancel}</button>
        </div>
      </div>
    </div>
  );
}


export default WithdrawModal;
