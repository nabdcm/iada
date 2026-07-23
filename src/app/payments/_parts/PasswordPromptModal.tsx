"use client";
// ============================================================
// src/app/payments/_parts/PasswordPromptModal.tsx
// نافذة طلب كلمة السر لقفل المدفوعات.
// الحالة داخلية عمداً لمنع إعادة رندر الصفحة الثقيلة مع كل حرف.
// ============================================================

import { type CSSProperties, useState } from "react";

export function PasswordPromptModal({ isAr, icon, title, desc, confirmLabel, expected, onSuccess, onClose }: {
  isAr: boolean; icon: string; title: string; desc: string; confirmLabel: string;
  expected: string; onSuccess: () => void; onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (val.trim() === (expected ?? "").trim()) { onSuccess(); }
    else setErr(true);
  };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:360,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease" }}>
        <div style={{ width:60,height:60,borderRadius:18,background:"linear-gradient(135deg,#0863ba,#3d8fd6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px",boxShadow:"0 8px 20px rgba(8,99,186,.3)" }}>{icon}</div>
        <h3 style={{ fontSize:16,fontWeight:800,color:"#1c2b3a",marginBottom:8 }}>{title}</h3>
        <p style={{ fontSize:13,color:"#8a97a6",marginBottom:20 }}>{desc}</p>
        {/* type="text" مع إخفاء بصري للأحرف — المتصفح لا يملأ حقول النص تلقائياً أبداً */}
        <input
          type="text" value={val}
          autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="off"
          name="npx-code" data-lpignore="true" data-1p-ignore="true"
          onChange={e=>{ setVal(e.target.value); if(err) setErr(false); }}
          onKeyDown={e=>{ if(e.key==="Enter" && !e.nativeEvent.isComposing){ e.preventDefault(); submit(); } }}
          placeholder={isAr?"كلمة السر...":"Password..."}
          style={{ width:"100%",padding:"13px 16px",border:err?"2px solid #c0392b":"1.5px solid #e6edf5",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:err?8:16,textAlign:"center",letterSpacing:3,direction:"ltr",background:"#f8fbfe",WebkitTextSecurity:"disc",textSecurity:"disc" } as CSSProperties}
        />
        {err && <p style={{ color:"#c0392b",fontSize:12,marginBottom:16,fontWeight:600 }}>{isAr?"كلمة السر غير صحيحة":"Incorrect password"}</p>}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={submit} style={{ flex:1,padding:"13px",background:"linear-gradient(135deg,#0863ba,#3d8fd6)",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)" }}>{confirmLabel}</button>
          <button onClick={onClose} style={{ flex:1,padding:"13px",background:"#f4f8fc",color:"#8a97a6",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,cursor:"pointer" }}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

export default PasswordPromptModal;
