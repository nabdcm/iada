"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// NABD - نبض | Pharmacy v3
// 1. تسجيل الدخول والصلاحيات
// 2. نظام الموردين + فواتير الشراء
// 3. طباعة الفاتورة / الإيصال
// 4. مزامنة الوصفات (الطبيب يصدر / الصيدلاني يصرف)
// 5. تنبيهات تلقائية
// + باركود كامل + سجل الحركة
// ============================================================

type Lang = "ar"|"en";
type MedCat = "antibiotics"|"analgesics"|"chronic"|"vitamins"|"topical"|"other";
type BarcodeMode = "inventory"|"stock_in"|"stock_out"|"sale"|null;
type UserRole = "pharmacist"|"manager"|"doctor";

type User = { id:number; name_ar:string; name_en:string; role:UserRole; username:string; password:string; avatar:string };
type Supplier = { id:number; name:string; contact:string; phone:string; email:string; address:string; balance:number };
type PurchItem = { medicine_id:number; medicine_name:string; qty:number; unit_price:number };
type PurchInvoice = { id:number; supplier_id:number; supplier_name:string; date:string; items:PurchItem[]; total:number; paid:number; status:"paid"|"partial"|"pending"; notes?:string; created_by:string };
type StockLog = { id:number; medicine_id:number; medicine_name:string; type:"in"|"out"|"sale"|"purchase"|"adjustment"; qty:number; date:string; user:string; ref?:string; notes?:string };
type Medicine = { id:number; name_ar:string; name_en:string; category:MedCat; barcode:string; unit:string; purchase_price:number; sell_price:number; stock:number; min_stock:number; expiry_date?:string; manufacturer?:string };
type RxItem = { medicine_name:string; dosage:string; duration:string; instructions:string };
type Prescription = { id:string; mrn:string; patient_name:string; doctor_name:string; doctor_id:number; created_at:string; items:RxItem[]; notes?:string; dispensed:boolean; dispensed_at?:string; dispensed_by?:string };
type SaleItem = { medicine_id:number; medicine_name:string; qty:number; unit_price:number };
type Sale = { id:number; date:string; items:SaleItem[]; total:number; payment_method:"cash"|"card"|"insurance"; prescription_id?:string; patient_name?:string; discount:number; cashier:string };
type ScanNotif = { type:"success"|"error"|"info"|"warning"; message:string; sub?:string }|null;
type SysAlert = { id:number; type:"low_stock"|"expiring"|"out_of_stock"; medicine_id:number; medicine_name:string; detail:string; date:string; read:boolean };

const gen = (p:string,n:number) => p+String(n).padStart(10-p.length,"0");

const USERS:User[] = [
  {id:1,name_ar:"أحمد الصيدلاني",name_en:"Ahmed Pharmacist",role:"pharmacist",username:"pharmacist",password:"1234",avatar:"🧑‍⚕️"},
  {id:2,name_ar:"سارة المديرة",  name_en:"Sara Manager",    role:"manager",   username:"manager",   password:"1234",avatar:"👩‍💼"},
  {id:3,name_ar:"د. خالد الطبيب",name_en:"Dr. Khalid",      role:"doctor",    username:"doctor",    password:"1234",avatar:"👨‍⚕️"},
];

const INIT_MEDS:Medicine[] = [
  {id:1, barcode:gen("628",1), name_ar:"أموكسيسيللين 500mg",name_en:"Amoxicillin 500mg", category:"antibiotics",unit:"كبسولة",purchase_price:8, sell_price:15,stock:240,min_stock:50, expiry_date:"2026-08-01",manufacturer:"SPIMACO"},
  {id:2, barcode:gen("628",2), name_ar:"باراسيتامول 500mg", name_en:"Paracetamol 500mg", category:"analgesics", unit:"قرص",   purchase_price:3, sell_price:7, stock:18, min_stock:100,expiry_date:"2027-01-01",manufacturer:"Tabuk Pharma"},
  {id:3, barcode:gen("628",3), name_ar:"ميتفورمين 850mg",   name_en:"Metformin 850mg",   category:"chronic",    unit:"قرص",   purchase_price:12,sell_price:22,stock:320,min_stock:80, expiry_date:"2026-11-15",manufacturer:"Julphar"},
  {id:4, barcode:gen("628",4), name_ar:"أتورفاستاتين 20mg", name_en:"Atorvastatin 20mg", category:"chronic",    unit:"قرص",   purchase_price:25,sell_price:45,stock:150,min_stock:40, expiry_date:"2026-09-30"},
  {id:5, barcode:gen("628",5), name_ar:"فيتامين D3 1000IU", name_en:"Vitamin D3 1000IU", category:"vitamins",   unit:"كبسولة",purchase_price:18,sell_price:35,stock:88, min_stock:30, expiry_date:"2025-06-10"},
  {id:6, barcode:gen("628",6), name_ar:"بيتاديرم كريم",     name_en:"Betaderm Cream",    category:"topical",    unit:"أنبوبة",purchase_price:22,sell_price:38,stock:45, min_stock:20, expiry_date:"2026-12-01"},
  {id:7, barcode:gen("628",7), name_ar:"ليفوفلوكساسين 500mg",name_en:"Levofloxacin 500mg",category:"antibiotics",unit:"قرص",purchase_price:20,sell_price:38,stock:6,  min_stock:30, expiry_date:"2026-07-01",manufacturer:"SPIMACO"},
  {id:8, barcode:gen("628",8), name_ar:"أملوديبين 5mg",     name_en:"Amlodipine 5mg",    category:"chronic",    unit:"قرص",   purchase_price:10,sell_price:20,stock:200,min_stock:50, expiry_date:"2027-02-01"},
  {id:9, barcode:gen("628",9), name_ar:"أوميبرازول 20mg",   name_en:"Omeprazole 20mg",   category:"other",      unit:"كبسولة",purchase_price:15,sell_price:28,stock:0,  min_stock:60, expiry_date:"2026-10-01"},
  {id:10,barcode:gen("628",10),name_ar:"فيتامين C 1000mg",  name_en:"Vitamin C 1000mg",  category:"vitamins",   unit:"قرص",   purchase_price:9, sell_price:18,stock:300,min_stock:50, expiry_date:"2027-06-01"},
];

const INIT_SUPPLIERS:Supplier[] = [
  {id:1,name:"SPIMACO - الشركة السعودية للصناعات الدوائية",contact:"محمد العمري",phone:"0112345678",email:"orders@spimaco.com",address:"الرياض، المملكة العربية السعودية",balance:12500},
  {id:2,name:"Tabuk Pharmaceutical",contact:"فيصل الغامدي",phone:"0144567890",email:"supply@tabukpharma.com",address:"تبوك، المملكة العربية السعودية",balance:4800},
  {id:3,name:"Julphar - Gulf Pharmaceutical",contact:"سعد المطيري",phone:"0556789012",email:"sales@julphar.net",address:"رأس الخيمة، الإمارات",balance:0},
];

const INIT_INVOICES:PurchInvoice[] = [
  {id:1001,supplier_id:1,supplier_name:"SPIMACO",date:"2025-05-20",items:[{medicine_id:1,medicine_name:"أموكسيسيللين 500mg",qty:500,unit_price:8},{medicine_id:7,medicine_name:"ليفوفلوكساسين 500mg",qty:100,unit_price:20}],total:6000,paid:6000,status:"paid",created_by:"أحمد الصيدلاني"},
  {id:1002,supplier_id:2,supplier_name:"Tabuk Pharma",date:"2025-05-22",items:[{medicine_id:2,medicine_name:"باراسيتامول 500mg",qty:200,unit_price:3}],total:600,paid:300,status:"partial",created_by:"سارة المديرة"},
  {id:1003,supplier_id:3,supplier_name:"Julphar",date:"2025-05-25",items:[{medicine_id:3,medicine_name:"ميتفورمين 850mg",qty:400,unit_price:12}],total:4800,paid:0,status:"pending",created_by:"أحمد الصيدلاني"},
];

const INIT_RX:Prescription[] = [
  {id:"RX-2025-001",mrn:"MRN-10001",patient_name:"أحمد محمد السعيد",  doctor_name:"د. سارة العمري", doctor_id:3,created_at:"2025-05-20",dispensed:false,notes:"حساسية للبنسيلين",
   items:[{medicine_name:"أموكسيسيللين 500mg",dosage:"500mg",duration:"7 أيام",instructions:"مرتين يومياً بعد الأكل"},{medicine_name:"باراسيتامول 500mg",dosage:"500mg",duration:"3 أيام",instructions:"عند الحاجة"}]},
  {id:"RX-2025-002",mrn:"MRN-10002",patient_name:"فاطمة علي القحطاني",doctor_name:"د. خالد النعيمي",doctor_id:3,created_at:"2025-05-22",dispensed:true,dispensed_at:"2025-05-22",dispensed_by:"أحمد الصيدلاني",
   items:[{medicine_name:"ميتفورمين 850mg",dosage:"850mg",duration:"مستمر",instructions:"مرة صباحاً ومرة مساءً"},{medicine_name:"أتورفاستاتين 20mg",dosage:"20mg",duration:"مستمر",instructions:"مرة ليلاً"}]},
  {id:"RX-2025-003",mrn:"MRN-10001",patient_name:"أحمد محمد السعيد",  doctor_name:"د. محمد الزهراني",doctor_id:3,created_at:"2025-05-25",dispensed:false,
   items:[{medicine_name:"أملوديبين 5mg",dosage:"5mg",duration:"مستمر",instructions:"مرة يومياً صباحاً"},{medicine_name:"أوميبرازول 20mg",dosage:"20mg",duration:"شهر",instructions:"قبل الإفطار بـ 30 دقيقة"}]},
];

const INIT_SALES:Sale[] = [
  {id:1,date:"2025-05-27",items:[{medicine_id:1,medicine_name:"أموكسيسيللين",qty:2,unit_price:15},{medicine_id:2,medicine_name:"باراسيتامول",qty:1,unit_price:7}],total:37,payment_method:"cash",discount:0,patient_name:"أحمد السعيد",cashier:"أحمد الصيدلاني"},
  {id:2,date:"2025-05-27",items:[{medicine_id:5,medicine_name:"فيتامين D3",qty:1,unit_price:35}],total:35,payment_method:"card",discount:0,cashier:"أحمد الصيدلاني"},
  {id:3,date:"2025-05-26",items:[{medicine_id:3,medicine_name:"ميتفورمين",qty:3,unit_price:22},{medicine_id:4,medicine_name:"أتورفاستاتين",qty:1,unit_price:45}],total:111,payment_method:"insurance",discount:10,patient_name:"فاطمة القحطاني",cashier:"سارة المديرة"},
];

const INIT_LOG:StockLog[] = [
  {id:1,medicine_id:1,medicine_name:"أموكسيسيللين 500mg",type:"purchase",qty:500,date:"2025-05-20",user:"أحمد الصيدلاني",ref:"INV-1001"},
  {id:2,medicine_id:2,medicine_name:"باراسيتامول 500mg", type:"purchase",qty:200,date:"2025-05-22",user:"سارة المديرة",  ref:"INV-1002"},
  {id:3,medicine_id:1,medicine_name:"أموكسيسيللين 500mg",type:"sale",   qty:2,  date:"2025-05-27",user:"أحمد الصيدلاني",ref:"SALE-1"},
  {id:4,medicine_id:9,medicine_name:"أوميبرازول 20mg",   type:"out",    qty:175,date:"2025-05-26",user:"سارة المديرة",  notes:"تلف"},
];

const CAT:{[k:string]:{ar:string;en:string;color:string;icon:string}} = {
  antibiotics:{ar:"مضادات حيوية",en:"Antibiotics",color:"#e74c3c",icon:"🦠"},
  analgesics: {ar:"مسكنات",      en:"Analgesics", color:"#e67e22",icon:"💊"},
  chronic:    {ar:"أمراض مزمنة", en:"Chronic",    color:"#8e44ad",icon:"❤️"},
  vitamins:   {ar:"فيتامينات",   en:"Vitamins",   color:"#27ae60",icon:"🌿"},
  topical:    {ar:"موضعية",      en:"Topical",    color:"#2980b9",icon:"🧴"},
  other:      {ar:"أخرى",       en:"Other",      color:"#7f8c8d",icon:"📦"},
};

const ROLE:{[k:string]:{ar:string;en:string;color:string;tabs:string[]}} = {
  pharmacist:{ar:"صيدلاني",en:"Pharmacist",color:"#0863ba",tabs:["inventory","prescriptions","sales","alerts"]},
  manager:   {ar:"مدير",   en:"Manager",   color:"#8e44ad",tabs:["inventory","prescriptions","sales","suppliers","reports","alerts"]},
  doctor:    {ar:"طبيب",   en:"Doctor",    color:"#27ae60",tabs:["prescriptions","alerts"]},
};

const isSoon = (d?:string) => { if(!d) return false; const x=new Date(); x.setDate(x.getDate()+30); return new Date(d)<=x; };
const isExp  = (d?:string) => { if(!d) return false; return new Date(d)<new Date(); };

// ── مكوّنات مساعدة صغيرة ─────────────────────────────────────
function SBadge({s,m,lang}:{s:number;m:number;lang:Lang}) {
  if(s===0) return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(192,57,43,.12)",color:"#c0392b"}}>{lang==="ar"?"نفد":"Out"}</span>;
  if(s<m)   return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(230,126,34,.12)",color:"#e67e22"}}>{lang==="ar"?"منخفض":"Low"}</span>;
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(39,174,96,.12)",color:"#27ae60"}}>{lang==="ar"?"متوفر":"OK"}</span>;
}

function BarcodeSVG({code,w=150,h=46}:{code:string;w?:number;h?:number}) {
  const bars = useMemo(()=>{ const r:number[]=[]; for(let i=0;i<code.length;i++){const d=parseInt(code[i],10)||0;r.push(1+(d%3));r.push(1);} r.push(3); return r; },[code]);
  const tot=bars.reduce((s,x)=>s+x,0), sc=(w-12)/tot; let x=6;
  const rs:React.ReactElement[]=[];
  bars.forEach((bw,i)=>{ if(i%2===0) rs.push(<rect key={i} x={x} y={3} width={bw*sc} height={h-14} fill="#1a2840" rx={0.4}/>); x+=bw*sc; });
  return <svg width={w} height={h} style={{display:"block"}}>{rs}<text x={w/2} y={h-1} textAnchor="middle" fontSize={8} fill="#555" fontFamily="monospace" letterSpacing={1}>{code}</text></svg>;
}

function BarcodeNotif({n}:{n:ScanNotif}) {
  if(!n) return null;
  const c = {success:{bg:"#e8f8f0",bd:"#27ae60",ic:"✅",tx:"#1a7a45"},error:{bg:"#fef0ee",bd:"#e74c3c",ic:"❌",tx:"#a93226"},info:{bg:"#eaf3fb",bd:"#2980b9",ic:"📡",tx:"#1a5276"},warning:{bg:"#fff8e6",bd:"#e67e22",ic:"⚠️",tx:"#a04000"}}[n.type];
  return <div style={{position:"fixed",top:68,left:"50%",transform:"translateX(-50%)",zIndex:9999,animation:"barcodeIn .35s cubic-bezier(.34,1.56,.64,1) both",background:c.bg,border:`2px solid ${c.bd}`,borderRadius:14,padding:"11px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:`0 8px 32px ${c.bd}30`,minWidth:270,maxWidth:"90vw",pointerEvents:"none"}}><span style={{fontSize:22}}>{c.ic}</span><div><div style={{fontSize:13,fontWeight:800,color:c.tx}}>{n.message}</div>{n.sub&&<div style={{fontSize:11,color:c.tx,opacity:.75,marginTop:2}}>{n.sub}</div>}</div></div>;
}

function BarcodeBar({mode,isAr,onClose}:{mode:BarcodeMode;isAr:boolean;onClose:()=>void}) {
  if(!mode) return null;
  const L:{[k:string]:{ar:string;en:string;c:string;ic:string}} = {inventory:{ar:"وضع البحث",en:"Search",c:"#0863ba",ic:"🔍"},stock_in:{ar:"إضافة مخزون",en:"Stock In",c:"#27ae60",ic:"📥"},stock_out:{ar:"خصم مخزون",en:"Stock Out",c:"#e67e22",ic:"📤"},sale:{ar:"وضع البيع",en:"Sale",c:"#8e44ad",ic:"🛒"}};
  const l = L[mode];
  return <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:400,background:l.c,borderRadius:50,padding:"9px 20px",display:"flex",alignItems:"center",gap:10,boxShadow:`0 6px 24px ${l.c}50`,color:"#fff",fontFamily:"'Rubik',sans-serif"}}><span style={{fontSize:16}}>{l.ic}</span><span style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{isAr?l.ar:l.en}</span><span style={{fontSize:11,opacity:.7}}>— {isAr?"امسح":"Scan"}</span><button onClick={onClose} style={{background:"rgba(255,255,255,.25)",border:"none",borderRadius:"50%",width:20,height:20,cursor:"pointer",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",marginRight:2}}>✕</button></div>;
}

function useBarcode(onScan:(c:string)=>void, enabled=true) {
  const buf=useRef(""), last=useRef(0), tim=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    if(!enabled) return;
    const h=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName?.toLowerCase();
      const isBC=(e.target as HTMLElement)?.getAttribute("data-bc")==="1";
      if((tag==="input"||tag==="textarea")&&!isBC) return;
      const now=Date.now(), delta=now-last.current; last.current=now;
      if(delta>80&&buf.current.length>0) buf.current="";
      if(e.key==="Enter"){const c=buf.current.trim();buf.current="";if(c.length>=4){e.preventDefault();onScan(c);} return;}
      if(e.key.length===1) buf.current+=e.key;
      clearTimeout(tim.current); tim.current=setTimeout(()=>{buf.current="";},150);
    };
    window.addEventListener("keydown",h);
    return()=>{ window.removeEventListener("keydown",h); clearTimeout(tim.current); };
  },[onScan,enabled]);
}

// ══════════════════════════════════════════════════════════════
// 🔐 شاشة تسجيل الدخول
// ══════════════════════════════════════════════════════════════
function LoginScreen({onLogin,lang}:{onLogin:(u:User)=>void;lang:Lang}) {
  const isAr=lang==="ar";
  const [username,setUsername]=useState(""); const [password,setPassword]=useState("");
  const [error,setError]=useState(false); const [loading,setLoading]=useState(false);
  const doLogin=()=>{
    setLoading(true); setError(false);
    setTimeout(()=>{
      const u=USERS.find(u=>u.username===username&&u.password===password);
      if(u) onLogin(u); else setError(true);
      setLoading(false);
    },500);
  };
  const inp = (err:boolean):React.CSSProperties => ({width:"100%",padding:"11px 13px",border:`1.5px solid ${err?"#e74c3c":"#e0e7ef"}`,borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"});
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a1628 0%,#0863ba 60%,#1a8fe3 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr"}}>
      <div style={{width:"min(100%,420px)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:68,height:68,borderRadius:18,background:"rgba(255,255,255,.15)",backdropFilter:"blur(10px)",margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>💊</div>
          <div style={{fontSize:28,fontWeight:900,color:"#fff",letterSpacing:1}}>نبض</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:3}}>{isAr?"نظام إدارة الصيدلية":"Pharmacy Management System"}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.96)",borderRadius:20,padding:"28px 24px",boxShadow:"0 24px 80px rgba(0,0,0,.3)"}}>
          <h2 style={{fontSize:17,fontWeight:800,color:"#1a2840",marginBottom:22,textAlign:"center"}}>{isAr?"تسجيل الدخول":"Sign In"}</h2>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:"#666",display:"block",marginBottom:5}}>{isAr?"اسم المستخدم":"Username"}</label>
            <input value={username} onChange={e=>{setUsername(e.target.value);setError(false);}} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{...inp(error),direction:"ltr",letterSpacing:.5}}/>
          </div>
          <div style={{marginBottom:18}}>
            <label style={{fontSize:11,fontWeight:700,color:"#666",display:"block",marginBottom:5}}>{isAr?"كلمة المرور":"Password"}</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError(false);}} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={inp(error)}/>
          </div>
          {error&&<div style={{background:"rgba(231,76,60,.08)",border:"1.5px solid rgba(231,76,60,.25)",borderRadius:10,padding:"9px 13px",marginBottom:14,fontSize:12,color:"#c0392b",fontWeight:600}}>❌ {isAr?"بيانات غير صحيحة":"Invalid credentials"}</div>}
          <button onClick={doLogin} disabled={loading} style={{width:"100%",padding:"12px",background:loading?"#aaa":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.35)"}}>
            {loading?"⏳ ...":(isAr?"دخول ←":"Sign In →")}
          </button>
          <div style={{marginTop:18,padding:"13px",background:"#f7f9fc",borderRadius:12,border:"1.5px solid #eef0f3"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#aaa",marginBottom:9,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"حسابات تجريبية (1234)":"Demo accounts (1234)"}</div>
            {USERS.map(u=>(
              <button key={u.id} onClick={()=>{setUsername(u.username);setPassword("1234");}}
                style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:username===u.username?"rgba(8,99,186,.08)":"#fff",border:`1.5px solid ${username===u.username?"#0863ba":"#eef0f3"}`,borderRadius:9,cursor:"pointer",fontFamily:"'Rubik',sans-serif",width:"100%",marginBottom:5,textAlign:"start"}}>
                <span style={{fontSize:16}}>{u.avatar}</span>
                <div><div style={{fontSize:12,fontWeight:700,color:"#353535"}}>{isAr?u.name_ar:u.name_en}</div><div style={{fontSize:10,color:ROLE[u.role].color,fontWeight:600}}>{isAr?ROLE[u.role].ar:ROLE[u.role].en} · {u.username}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🖨️ نافذة الطباعة
// ══════════════════════════════════════════════════════════════
function PrintModal({invoice,sale,lang,cashierName,onClose}:{invoice?:PurchInvoice;sale?:Sale;lang:Lang;cashierName?:string;onClose:()=>void}) {
  const isAr=lang==="ar";
  const ref=useRef<HTMLDivElement>(null);
  const doPrint=()=>{
    const w=window.open("","_blank","width=800,height=700"); if(!w||!ref.current) return;
    w.document.write(`<html dir="${isAr?"rtl":"ltr"}"><head><title>Invoice</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Rubik',sans-serif;padding:24px;color:#1a2840;font-size:13px}
    .hdr{text-align:center;border-bottom:2px solid #0863ba;padding-bottom:14px;margin-bottom:18px}
    .logo{font-size:26px;font-weight:900;color:#0863ba;margin-bottom:3px}.ttl{font-size:17px;font-weight:800;margin-top:9px}
    table{width:100%;border-collapse:collapse;margin:14px 0}th{background:#f0f4f8;padding:7px 10px;font-size:11px;text-align:start;color:#888;text-transform:uppercase}
    td{padding:8px 10px;border-bottom:1px solid #f7f9fc;font-size:12px}.tot{background:rgba(8,99,186,.07);font-weight:800}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 18px;margin-bottom:16px}
    .mr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f4f8;font-size:12px}
    .ftr{margin-top:18px;text-align:center;font-size:11px;color:#aaa;border-top:1px solid #eef0f3;padding-top:14px}
    @media print{body{padding:8px}}</style></head><body>${ref.current.innerHTML}</body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  };
  const items  = invoice ? invoice.items : sale?.items||[];
  const total  = invoice ? invoice.total : sale?.total||0;
  const date   = invoice ? invoice.date  : sale?.date||"";
  const refNo  = invoice ? `INV-${invoice.id}` : `SALE-${sale?.id}`;
  const isPurch= !!invoice;
  return (
    <div style={{position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,width:"min(96vw,600px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.25)",animation:"modalIn .25s ease"}}>
        <div style={{padding:"18px 22px",borderBottom:"1.5px solid #eef0f3",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>🖨️ {isAr?"معاينة الطباعة":"Print Preview"}</h2>
          <div style={{display:"flex",gap:10}}>
            <button onClick={doPrint} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 12px rgba(8,99,186,.3)"}}>🖨️ {isAr?"طباعة":"Print"}</button>
            <button onClick={onClose} style={{width:34,height:34,borderRadius:10,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div ref={ref} style={{padding:"26px 30px",direction:isAr?"rtl":"ltr",fontFamily:"'Rubik',sans-serif"}}>
          <div style={{textAlign:"center",borderBottom:"2px solid #0863ba",paddingBottom:14,marginBottom:18}}>
            <div style={{fontSize:24,fontWeight:900,color:"#0863ba",marginBottom:3}}>نبض | NABD</div>
            <div style={{fontSize:11,color:"#888"}}>{isAr?"نظام إدارة الصيدلية":"Pharmacy Management System"}</div>
            <div style={{fontSize:17,fontWeight:800,color:"#353535",marginTop:9}}>{isPurch?(isAr?"فاتورة شراء":"Purchase Invoice"):(isAr?"فاتورة بيع":"Sales Receipt")}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 20px",marginBottom:16}}>
            {[[isAr?"رقم الفاتورة":"Invoice No",refNo],[isAr?"التاريخ":"Date",date],
              isPurch?[isAr?"المورد":"Supplier",(invoice as PurchInvoice).supplier_name]:[isAr?"المريض":"Patient",sale?.patient_name||"—"],
              isPurch?[isAr?"بواسطة":"By",(invoice as PurchInvoice).created_by]:[isAr?"الكاشير":"Cashier",cashierName||sale?.cashier||"—"]
            ].map(([l,v],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0f4f8"}}><span style={{color:"#888",fontSize:12}}>{l}</span><span style={{fontWeight:700,color:"#353535",fontSize:12}}>{v}</span></div>
            ))}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
            <thead><tr style={{background:"#f0f4f8"}}>{[isAr?"الدواء":"Medicine",isAr?"الكمية":"Qty",isAr?"السعر":"Price",isAr?"الإجمالي":"Total"].map((h,i)=>(<th key={i} style={{padding:"7px 10px",fontSize:11,textAlign:i===0?"start":"center",color:"#888",textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
            <tbody>
              {items.map((it,i)=>(<tr key={i} style={{borderBottom:"1px solid #f7f9fc"}}><td style={{padding:"8px 10px",fontSize:12,fontWeight:600}}>{it.medicine_name}</td><td style={{padding:"8px 10px",fontSize:12,textAlign:"center"}}>{it.qty}</td><td style={{padding:"8px 10px",fontSize:12,textAlign:"center"}}>{it.unit_price}</td><td style={{padding:"8px 10px",fontSize:12,textAlign:"center",fontWeight:700,color:"#0863ba"}}>{it.qty*it.unit_price}</td></tr>))}
              {sale?.discount&&sale.discount>0&&<tr style={{background:"rgba(231,76,60,.04)"}}><td colSpan={3} style={{padding:"8px 10px",fontSize:12,color:"#e74c3c"}}>{isAr?"خصم":"Discount"}</td><td style={{padding:"8px 10px",fontSize:12,textAlign:"center",color:"#e74c3c",fontWeight:700}}>-{sale.discount}</td></tr>}
              <tr style={{background:"rgba(8,99,186,.07)"}}><td colSpan={3} style={{padding:"9px 10px",fontSize:14,fontWeight:800,color:"#1a2840"}}>{isAr?"الإجمالي":"Total"}</td><td style={{padding:"9px 10px",fontSize:16,fontWeight:900,textAlign:"center",color:"#0863ba"}}>{total} {isAr?"ر.س":"SAR"}</td></tr>
              {isPurch&&invoice&&invoice.status!=="paid"&&<tr style={{background:"rgba(231,76,60,.04)"}}><td colSpan={3} style={{padding:"7px 10px",fontSize:12,color:"#e74c3c"}}>{isAr?"المتبقي":"Outstanding"}</td><td style={{padding:"7px 10px",fontSize:12,textAlign:"center",color:"#e74c3c",fontWeight:700}}>{invoice.total-invoice.paid} {isAr?"ر.س":"SAR"}</td></tr>}
            </tbody>
          </table>
          <div style={{textAlign:"center",fontSize:11,color:"#aaa",borderTop:"1px solid #eef0f3",paddingTop:14}}>{isAr?"شكراً لتعاملكم معنا — نظام نبض":"Thank you — Powered by NABD Pharmacy System"}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// نافذة الدواء
// ══════════════════════════════════════════════════════════════
function MedModal({lang,medicine,onSave,onClose}:{lang:Lang;medicine:Medicine|null;onSave:(m:Partial<Medicine>)=>void;onClose:()=>void}) {
  const isAr=lang==="ar"; const bRef=useRef<HTMLInputElement>(null);
  const [form,setForm]=useState<Partial<Medicine>>(medicine??{category:"other",unit:"قرص",stock:0,min_stock:20,purchase_price:0,sell_price:0,barcode:""});
  const [flash,setFlash]=useState(false);
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const genBC=()=>{const c="628"+String(Date.now()).slice(-9);set("barcode",c);setFlash(true);setTimeout(()=>setFlash(false),500);};
  const inp:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"};
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(96vw,540px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{fontSize:16,fontWeight:800,color:"#353535"}}>{medicine?(isAr?"تعديل دواء":"Edit"):(isAr?"إضافة دواء":"Add Medicine")} 💊</h2>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button>
        </div>
        <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.07),rgba(8,99,186,.03))",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:13,padding:"13px 15px",marginBottom:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <label style={{fontSize:12,fontWeight:800,color:"#0863ba"}}>▐▌▌▐▌ {isAr?"الباركود":"Barcode"}</label>
            <button onClick={genBC} style={{fontSize:11,fontWeight:700,padding:"3px 11px",borderRadius:20,border:"1.5px solid rgba(8,99,186,.3)",background:flash?"#0863ba":"rgba(8,99,186,.08)",color:flash?"#fff":"#0863ba",cursor:"pointer",transition:"all .2s"}}>{isAr?"توليد تلقائي":"Auto"}</button>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input ref={bRef} data-bc="1" value={form.barcode||""} onChange={e=>set("barcode",e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();bRef.current?.blur();}}} placeholder={isAr?"امسح أو اكتب":"Scan or type"}
              style={{flex:1,padding:"9px 12px",border:"1.5px solid rgba(8,99,186,.25)",borderRadius:9,fontFamily:"monospace",fontSize:13,letterSpacing:1.5,outline:"none",background:"#fff",direction:"ltr",color:"#0863ba",fontWeight:700}}/>
            {form.barcode&&<div style={{flexShrink:0,background:"#fff",borderRadius:9,padding:"3px 7px",border:"1.5px solid #eef0f3",overflow:"hidden"}}><BarcodeSVG code={form.barcode} w={100} h={34}/></div>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"اسم الدواء *":"Name *"}</label><input value={form.name_ar||""} onChange={e=>set("name_ar",e.target.value)} style={{...inp,direction:"rtl"}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الفئة":"Category"}</label><select value={form.category||"other"} onChange={e=>set("category",e.target.value)} style={{...inp,background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>{Object.entries(CAT).map(([k,v])=><option key={k} value={k}>{v.icon} {isAr?v.ar:v.en}</option>)}</select></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الوحدة":"Unit"}</label><input value={form.unit||""} onChange={e=>set("unit",e.target.value)} style={{...inp,direction:"rtl"}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"سعر الشراء":"Buy"}</label><input type="number" min={0} value={form.purchase_price||0} onChange={e=>set("purchase_price",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"سعر البيع":"Sell"}</label><input type="number" min={0} value={form.sell_price||0} onChange={e=>set("sell_price",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المخزون":"Stock"}</label><input type="number" min={0} value={form.stock||0} onChange={e=>set("stock",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الحد الأدنى":"Min"}</label><input type="number" min={0} value={form.min_stock||20} onChange={e=>set("min_stock",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الانتهاء":"Expiry"}</label><input type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)} style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الشركة المصنعة":"Manufacturer"}</label><input value={form.manufacturer||""} onChange={e=>set("manufacturer",e.target.value)} style={{...inp,direction:isAr?"rtl":"ltr"}}/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={()=>onSave(form)} style={{flex:1,padding:"12px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)"}}>{isAr?"حفظ":"Save"}</button>
          <button onClick={onClose} style={{padding:"12px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

// نافذة تعديل المخزون
function AdjModal({lang,medicine,mode,onConfirm,onClose}:{lang:Lang;medicine:Medicine;mode:"in"|"out";onConfirm:(q:number)=>void;onClose:()=>void}) {
  const isAr=lang==="ar"; const [qty,setQty]=useState(1); const isIn=mode==="in"; const c=isIn?"#27ae60":"#e67e22"; const ic=isIn?"📥":"📤";
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(92vw,390px)",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .2s ease"}}>
        <div style={{textAlign:"center",marginBottom:18}}><div style={{fontSize:38,marginBottom:7}}>{ic}</div><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>{isIn?(isAr?"إضافة للمخزون":"Stock In"):(isAr?"خصم من المخزون":"Stock Out")}</h2><p style={{fontSize:12,color:"#888",marginTop:3}}>{isAr?medicine.name_ar:medicine.name_en}</p></div>
        <div style={{background:"#f7f9fc",borderRadius:11,padding:"11px 15px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#888",fontWeight:600}}>{isAr?"المخزون الحالي":"Current"}</span><span style={{fontSize:17,fontWeight:800,color:medicine.stock<medicine.min_stock?"#e67e22":"#353535"}}>{medicine.stock} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{medicine.unit}</span></span></div>
        <div style={{marginBottom:15}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:42,height:42,borderRadius:11,border:`2px solid ${c}40`,background:`${c}10`,cursor:"pointer",fontSize:20,fontWeight:700,color:c,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <input type="number" min={1} value={qty} onChange={e=>setQty(Math.max(1,Number(e.target.value)))} style={{flex:1,padding:"10px",border:`2px solid ${c}40`,borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:20,fontWeight:800,color:c,textAlign:"center",outline:"none"}}/>
            <button onClick={()=>setQty(q=>q+1)} style={{width:42,height:42,borderRadius:11,border:`2px solid ${c}40`,background:`${c}10`,cursor:"pointer",fontSize:20,fontWeight:700,color:c,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
          <div style={{display:"flex",gap:5}}>{[5,10,20,50,100].map(n=>(<button key={n} onClick={()=>setQty(n)} style={{flex:1,padding:"5px",borderRadius:7,border:`1.5px solid ${c}30`,background:qty===n?`${c}15`:"transparent",color:qty===n?c:"#aaa",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{n}</button>))}</div>
        </div>
        <div style={{background:`${c}08`,borderRadius:11,padding:"9px 13px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1.5px solid ${c}25`}}><span style={{fontSize:12,color:"#888"}}>{isAr?"بعد التعديل":"After"}</span><span style={{fontSize:15,fontWeight:800,color:c}}>{isIn?medicine.stock+qty:Math.max(0,medicine.stock-qty)} <span style={{fontSize:10,fontWeight:400,color:"#aaa"}}>{medicine.unit}</span></span></div>
        <div style={{display:"flex",gap:9}}>
          <button onClick={()=>onConfirm(qty)} style={{flex:1,padding:"12px",background:c,color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 13px ${c}40`}}>{ic} {isAr?"تأكيد":"Confirm"}</button>
          <button onClick={onClose} style={{padding:"12px 17px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🏭 تبويب الموردين
// ══════════════════════════════════════════════════════════════
function SuppliersTab({lang,medicines,suppliers,setSuppliers,invoices,setInvoices,setMedicines,currentUser,addLog,userId,onRefresh}:{
  lang:Lang;medicines:Medicine[];suppliers:Supplier[];setSuppliers:React.Dispatch<React.SetStateAction<Supplier[]>>;
  invoices:PurchInvoice[];setInvoices:React.Dispatch<React.SetStateAction<PurchInvoice[]>>;
  setMedicines:React.Dispatch<React.SetStateAction<Medicine[]>>;currentUser:User;addLog:(l:Omit<StockLog,"id">)=>void;
  userId:string|null;onRefresh:()=>void;
}) {
  const isAr=lang==="ar";
  const [view,setView]=useState<"s"|"i">("s");
  const [showSF,setShowSF]=useState(false); const [showIF,setShowIF]=useState(false);
  const [editSup,setEditSup]=useState<Supplier|null>(null);
  const [printInv,setPrintInv]=useState<PurchInvoice|null>(null);
  const [sf,setSF]=useState({name:"",contact:"",phone:"",email:"",address:""});
  const [iItems,setIItems]=useState<PurchItem[]>([]);
  const [iSupId,setISupId]=useState(suppliers[0]?.id||1);
  const [iDate,setIDate]=useState(new Date().toISOString().slice(0,10));
  const [iPaid,setIPaid]=useState(0); const [iNotes,setINotes]=useState(""); const [iMedQ,setIMedQ]=useState("");
  const iMedRes=iMedQ.trim()?medicines.filter(m=>(m.name_ar+m.name_en).toLowerCase().includes(iMedQ.toLowerCase())).slice(0,5):[];
  const iTotal=iItems.reduce((s,x)=>s+x.qty*x.unit_price,0);
  const saveSup=async()=>{
    if(!sf.name.trim()) return;
    if(userId){
      const res=await fetch("/api/pharmacy/suppliers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:editSup?"update":"add",user_id:userId,id:editSup?.id,...sf})});
      const json=await res.json();
      if(json.success){
        if(editSup) setSuppliers(p=>p.map(s=>s.id===editSup.id?{...s,...sf}:s));
        else if(json.supplier) setSuppliers(p=>[...p,json.supplier as Supplier]);
      }
    } else {
      if(editSup) setSuppliers(p=>p.map(s=>s.id===editSup.id?{...s,...sf}:s));
      else { const id=Math.max(0,...suppliers.map(s=>s.id))+1; setSuppliers(p=>[...p,{id,balance:0,...sf}]); }
    }
    setShowSF(false); setEditSup(null); setSF({name:"",contact:"",phone:"",email:"",address:""});
  };
  const addII=(m:Medicine)=>{setIItems(p=>{const ex=p.findIndex(x=>x.medicine_id===m.id);if(ex>=0)return p.map((x,i)=>i===ex?{...x,qty:x.qty+1}:x);return[...p,{medicine_id:m.id,medicine_name:isAr?m.name_ar:m.name_en,qty:1,unit_price:m.purchase_price}];});setIMedQ("");};
  const saveInv=async()=>{
    if(iItems.length===0) return;
    const sup=suppliers.find(s=>s.id===iSupId);
    const status:PurchInvoice["status"]=iPaid>=iTotal?"paid":iPaid>0?"partial":"pending";
    const created_by=isAr?currentUser.name_ar:currentUser.name_en;
    if(userId){
      const res=await fetch("/api/pharmacy/invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",user_id:userId,supplier_id:iSupId,supplier_name:sup?.name||"",date:iDate,items:iItems,total:iTotal,paid:iPaid,status,notes:iNotes||undefined,created_by})});
      const json=await res.json();
      if(json.success){ setInvoices(p=>[json.invoice,...p]); onRefresh(); }
    } else {
      const id=Math.max(0,...invoices.map(i=>i.id))+1;
      const inv:PurchInvoice={id,supplier_id:iSupId,supplier_name:sup?.name||"",date:iDate,items:iItems,total:iTotal,paid:iPaid,status,notes:iNotes||undefined,created_by};
      setInvoices(p=>[inv,...p]);
      iItems.forEach(it=>{setMedicines(prev=>prev.map(m=>m.id===it.medicine_id?{...m,stock:m.stock+it.qty}:m));addLog({medicine_id:it.medicine_id,medicine_name:it.medicine_name,type:"purchase",qty:it.qty,date:iDate,user:created_by,ref:`INV-${id}`});});
    }
    setShowIF(false); setIItems([]); setIPaid(0); setINotes("");
  };
  const stSt:{[k:string]:{bg:string;c:string;ar:string;en:string}}={paid:{bg:"rgba(39,174,96,.1)",c:"#27ae60",ar:"مدفوعة",en:"Paid"},partial:{bg:"rgba(230,126,34,.1)",c:"#e67e22",ar:"جزئي",en:"Partial"},pending:{bg:"rgba(231,76,60,.1)",c:"#e74c3c",ar:"معلقة",en:"Pending"}};
  const card:React.CSSProperties={background:"#fff",borderRadius:14,padding:"15px 17px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)"};
  const inp:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"};
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={()=>setView("s")} className={view==="s"?"tab-btn active":"tab-btn"}>🏭 {isAr?"الموردون":"Suppliers"}</button>
        <button onClick={()=>setView("i")} className={view==="i"?"tab-btn active":"tab-btn"}>🧾 {isAr?"فواتير الشراء":"Invoices"}</button>
        <button onClick={()=>view==="s"?(setShowSF(true),setEditSup(null)):(setShowIF(true))}
          style={{marginRight:"auto",display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 12px rgba(8,99,186,.3)"}}>
          ＋ {view==="s"?(isAr?"مورد جديد":"New Supplier"):(isAr?"فاتورة شراء":"New Invoice")}
        </button>
      </div>

      {view==="s"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {suppliers.map(s=>(
            <div key={s.id} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:800,color:"#1a2840",marginBottom:4}}>{s.name}</div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"#666"}}>👤 {s.contact}</span>
                  <span style={{fontSize:12,color:"#666"}}>📞 {s.phone}</span>
                  <span style={{fontSize:12,color:"#666"}}>✉️ {s.email}</span>
                </div>
                {s.address&&<div style={{fontSize:11,color:"#aaa",marginTop:3}}>📍 {s.address}</div>}
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"الرصيد":"Balance"}</div><div style={{fontSize:15,fontWeight:800,color:s.balance>0?"#e74c3c":"#27ae60"}}>{s.balance} {isAr?"ر.س":"SAR"}</div></div>
                <button onClick={()=>{setEditSup(s);setSF({name:s.name,contact:s.contact,phone:s.phone,email:s.email,address:s.address});setShowSF(true);}} className="action-icon-btn">✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view==="i"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
            {[{l:isAr?"الفواتير":"Invoices",v:invoices.length,ic:"🧾",c:"#0863ba"},{l:isAr?"إجمالي الشراء":"Purchases",v:invoices.reduce((s,i)=>s+i.total,0)+" "+(isAr?"ر.س":"SAR"),ic:"💰",c:"#27ae60"},{l:isAr?"مستحق":"Outstanding",v:invoices.filter(i=>i.status!=="paid").reduce((s,i)=>s+(i.total-i.paid),0)+" "+(isAr?"ر.س":"SAR"),ic:"⏳",c:"#e74c3c"}].map((x,i)=>(
              <div key={i} style={card}><div style={{fontSize:22,marginBottom:4}}>{x.ic}</div><div style={{fontSize:16,fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div><div style={{fontSize:11,color:"#aaa",marginTop:3}}>{x.l}</div></div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {invoices.map(inv=>{
              const ss=stSt[inv.status];
              return (
                <div key={inv.id} style={{...card,padding:0,overflow:"hidden"}}>
                  <div style={{padding:"13px 17px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap",borderBottom:"1px solid #f0f4f8"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:800,color:"#0863ba"}}>INV-{inv.id}</span><span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:ss.bg,color:ss.c}}>{isAr?ss.ar:ss.en}</span></div>
                      <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{inv.supplier_name}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{inv.date} · {inv.created_by}</div>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"الإجمالي":"Total"}</div><div style={{fontSize:15,fontWeight:800,color:"#0863ba"}}>{inv.total} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{isAr?"ر.س":"SAR"}</span></div></div>
                      <button onClick={()=>setPrintInv(inv)} style={{padding:"7px 13px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>🖨️ {isAr?"طباعة":"Print"}</button>
                    </div>
                  </div>
                  <div style={{padding:"11px 17px"}}>
                    {inv.items.map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<inv.items.length-1?"1px solid #f7f9fc":"none"}}><span style={{fontSize:12,color:"#555",fontWeight:600}}>💊 {it.medicine_name}</span><span style={{fontSize:12,color:"#888"}}>{it.qty} × {it.unit_price} = <strong style={{color:"#0863ba"}}>{it.qty*it.unit_price}</strong></span></div>))}
                    {inv.status!=="paid"&&<div style={{marginTop:8,fontSize:11,color:"#e74c3c",fontWeight:600}}>💰 {isAr?"المتبقي":"Remaining"}: {inv.total-inv.paid} {isAr?"ر.س":"SAR"}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showSF&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>{setShowSF(false);setEditSup(null);}}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(96vw,480px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>🏭 {editSup?(isAr?"تعديل مورد":"Edit"):(isAr?"مورد جديد":"New Supplier")}</h2><button onClick={()=>{setShowSF(false);setEditSup(null);}} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {([["name",isAr?"اسم المورد *":"Name *","1/-1"],["contact",isAr?"المسؤول":"Contact",""],["phone",isAr?"الهاتف":"Phone",""],["email","Email",""],["address",isAr?"العنوان":"Address","1/-1"]] as [keyof typeof sf,string,string][]).map(([k,label,gc])=>(
                <div key={k} style={{gridColumn:gc||"auto"}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{label}</label><input value={sf[k]} onChange={e=>setSF(f=>({...f,[k]:e.target.value}))} style={k==="phone"||k==="email"?{...inp,direction:"ltr"}:inp}/></div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={saveSup} style={{flex:1,padding:"12px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)"}}>{isAr?"حفظ":"Save"}</button>
              <button onClick={()=>{setShowSF(false);setEditSup(null);}} style={{padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      {showIF&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setShowIF(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(96vw,560px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>🧾 {isAr?"فاتورة شراء جديدة":"New Purchase Invoice"}</h2><button onClick={()=>setShowIF(false)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المورد":"Supplier"}</label><select value={iSupId} onChange={e=>setISupId(Number(e.target.value))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"التاريخ":"Date"}</label><input type="date" value={iDate} onChange={e=>setIDate(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/></div>
            </div>
            <div style={{position:"relative",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#f7f9fc",border:"1.5px solid #e0e7ef",borderRadius:10,padding:"9px 12px"}}><span>💊</span><input value={iMedQ} onChange={e=>setIMedQ(e.target.value)} placeholder={isAr?"أضف دواء...":"Add medicine..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13,width:"100%",direction:isAr?"rtl":"ltr"}}/></div>
              {iMedRes.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.12)",border:"1.5px solid #eef0f3",overflow:"hidden",marginTop:4}}>{iMedRes.map(m=>(<div key={m.id} onClick={()=>addII(m)} style={{padding:"9px 13px",cursor:"pointer",fontSize:13,display:"flex",justifyContent:"space-between"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f7f9fc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}><span style={{fontWeight:600}}>{isAr?m.name_ar:m.name_en}</span><span style={{color:"#888",fontSize:11}}>{m.purchase_price} {isAr?"ر.س":"SAR"}</span></div>))}</div>}
            </div>
            {iItems.length>0&&<div style={{background:"#f7f9fc",borderRadius:12,padding:"11px",marginBottom:12}}>{iItems.map((it,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<iItems.length-1?7:0}}>
              <div style={{flex:1,fontSize:12,fontWeight:600,color:"#353535"}}>{it.medicine_name}</div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <button onClick={()=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,qty:Math.max(1,x.qty-1)}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
                <span style={{fontSize:13,fontWeight:700,minWidth:28,textAlign:"center"}}>{it.qty}</span>
                <button onClick={()=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,qty:x.qty+1}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
              <input type="number" min={0} value={it.unit_price} onChange={e=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,unit_price:Number(e.target.value)}:x))} style={{width:65,padding:"4px 8px",border:"1.5px solid #e0e7ef",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",textAlign:"center"}}/>
              <span style={{fontSize:11,color:"#27ae60",fontWeight:700,minWidth:55,textAlign:"center"}}>{(it.qty*it.unit_price).toFixed(0)}</span>
              <button onClick={()=>setIItems(p=>p.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:15}}>✕</button>
            </div>))}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المدفوع":"Paid"}</label><input type="number" min={0} max={iTotal} value={iPaid} onChange={e=>setIPaid(Number(e.target.value))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/></div>
              <div style={{display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,padding:"10px 13px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#888"}}>{isAr?"الإجمالي":"Total"}</span><span style={{fontSize:18,fontWeight:800,color:"#0863ba"}}>{iTotal}</span></div></div>
            </div>
            <div style={{marginBottom:14}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"ملاحظات":"Notes"}</label><input value={iNotes} onChange={e=>setINotes(e.target.value)} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveInv} disabled={iItems.length===0} style={{flex:1,padding:"12px",background:iItems.length===0?"#ccc":"#27ae60",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:iItems.length===0?"not-allowed":"pointer",boxShadow:iItems.length===0?"none":"0 4px 14px rgba(39,174,96,.3)"}}>✅ {isAr?"حفظ الفاتورة":"Save Invoice"}</button>
              <button onClick={()=>setShowIF(false)} style={{padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}
      {printInv&&<PrintModal invoice={printInv} lang={lang} onClose={()=>setPrintInv(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🔔 تبويب التنبيهات
// ══════════════════════════════════════════════════════════════
function AlertsTab({lang,medicines,alerts,markAll,markOne}:{lang:Lang;medicines:Medicine[];alerts:SysAlert[];markAll:()=>void;markOne:(id:number)=>void}) {
  const isAr=lang==="ar";
  const unread=alerts.filter(a=>!a.read).length;
  const tSt:{[k:string]:{bg:string;bd:string;ic:string;c:string}}={out_of_stock:{bg:"rgba(192,57,43,.05)",bd:"rgba(192,57,43,.25)",ic:"🚫",c:"#c0392b"},low_stock:{bg:"rgba(230,126,34,.05)",bd:"rgba(230,126,34,.25)",ic:"⚠️",c:"#e67e22"},expiring:{bg:"rgba(142,68,173,.05)",bd:"rgba(142,68,173,.25)",ic:"🗓️",c:"#8e44ad"}};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>{isAr?"التنبيهات الفعّالة":"Active Alerts"}</h2><p style={{fontSize:11,color:"#aaa",marginTop:2}}>{alerts.length} {isAr?"تنبيه":"alerts"}{unread>0&&` — ${unread} ${isAr?"غير مقروء":"unread"}`}</p></div>
        {unread>0&&<button onClick={markAll} style={{padding:"8px 14px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{isAr?"تعليم الكل مقروء":"Mark all read"}</button>}
      </div>
      {alerts.length===0?(<div style={{textAlign:"center",padding:"60px 20px",color:"#ccc",background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3"}}><div style={{fontSize:48,marginBottom:12}}>✅</div><div style={{fontSize:14,fontWeight:700}}>{isAr?"لا توجد تنبيهات":"No alerts"}</div></div>):(
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {alerts.map(a=>{const s=tSt[a.type];const med=medicines.find(m=>m.id===a.medicine_id);return(
            <div key={a.id} onClick={()=>markOne(a.id)} style={{background:a.read?"#fff":s.bg,border:`1.5px solid ${a.read?"#eef0f3":s.bd}`,borderRadius:13,padding:"13px 17px",cursor:"pointer",transition:"all .2s",opacity:a.read?.55:1,display:"flex",gap:13,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0,marginTop:1}}>{s.ic}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                  <div><div style={{fontSize:13,fontWeight:800,color:s.c}}>{isAr?med?.name_ar:med?.name_en}</div><div style={{fontSize:12,color:"#666",marginTop:2}}>{a.detail}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}><span style={{fontSize:10,color:"#aaa"}}>{a.date}</span>{!a.read&&<span style={{width:7,height:7,borderRadius:"50%",background:s.c,display:"inline-block"}}/>}</div>
                </div>
                {med&&<div style={{marginTop:7,display:"flex",gap:7,flexWrap:"wrap"}}><span style={{fontSize:11,background:"#f0f4f8",borderRadius:6,padding:"2px 8px",color:"#666"}}>{isAr?"مخزون":"Stock"}: {med.stock} {med.unit}</span>{med.expiry_date&&<span style={{fontSize:11,background:"#f0f4f8",borderRadius:6,padding:"2px 8px",color:"#666"}}>{isAr?"انتهاء":"Exp"}: {med.expiry_date}</span>}</div>}
              </div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🗄️ تبويب المخزون
// ══════════════════════════════════════════════════════════════
function InventoryTab({lang,medicines,setMedicines,barcodeMode,setBarcodeMode,showNotif,addLog,currentUser,userId}:{
  lang:Lang;medicines:Medicine[];setMedicines:React.Dispatch<React.SetStateAction<Medicine[]>>;
  barcodeMode:BarcodeMode;setBarcodeMode:(m:BarcodeMode)=>void;
  showNotif:(n:ScanNotif,ms?:number)=>void;addLog:(l:Omit<StockLog,"id">)=>void;currentUser:User;
  userId:string|null;
}) {
  const isAr=lang==="ar";
  const [search,setSearch]=useState(""); const [catF,setCatF]=useState<"all"|"low"|MedCat>("all");
  const [showModal,setShowModal]=useState(false); const [editMed,setEditMed]=useState<Medicine|null>(null);
  const [delId,setDelId]=useState<number|null>(null); const [adj,setAdj]=useState<{med:Medicine;mode:"in"|"out"}|null>(null);
  const [litId,setLitId]=useState<number|null>(null); const [showLog,setShowLog]=useState(false);
  const [log,setLog]=useState<StockLog[]>([]);

  const handleScan=useCallback((code:string)=>{
    const med=medicines.find(m=>m.barcode===code);
    if(!med){showNotif({type:"error",message:isAr?"باركود غير موجود":"Not found",sub:code},2500);return;}
    setLitId(med.id); setTimeout(()=>setLitId(null),2000);
    if(barcodeMode==="stock_in") setAdj({med,mode:"in"});
    else if(barcodeMode==="stock_out") setAdj({med,mode:"out"});
    else{setSearch(isAr?med.name_ar:med.name_en);showNotif({type:"success",message:isAr?med.name_ar:med.name_en,sub:`${isAr?"مخزون":"Stock"}: ${med.stock} ${med.unit}`},2000);}
  },[medicines,barcodeMode,isAr,showNotif]);

  useBarcode(handleScan,barcodeMode==="inventory"||barcodeMode==="stock_in"||barcodeMode==="stock_out");

  const filtered=useMemo(()=>{
    let l=medicines;
    if(search.trim()) l=l.filter(m=>m.name_ar.includes(search)||(m.name_en||"").toLowerCase().includes(search.toLowerCase())||m.barcode.includes(search));
    if(catF==="low") l=l.filter(m=>m.stock<m.min_stock);
    else if(catF!=="all") l=l.filter(m=>m.category===catF);
    return l;
  },[medicines,search,catF]);

  const handleSave=async(data:Partial<Medicine>)=>{
    if(!data.name_ar?.trim()) return;
    if(userId){
      const res=await fetch("/api/pharmacy/medicines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:editMed?"update":"add",user_id:userId,id:editMed?.id,...data})});
      const json=await res.json();
      if(json.success){
        if(editMed) setMedicines(prev=>prev.map(m=>m.id===editMed.id?{...m,...data} as Medicine:m));
        else if(json.medicine) setMedicines(prev=>[...prev,json.medicine as Medicine]);
      } else showNotif({type:"error",message:json.error||"Error"},3000);
    } else {
      if(editMed) setMedicines(prev=>prev.map(m=>m.id===editMed.id?{...m,...data} as Medicine:m));
      else{const id=Math.max(0,...medicines.map(m=>m.id))+1;setMedicines(prev=>[...prev,{id,...data} as Medicine]);}
    }
    setShowModal(false); setEditMed(null);
  };

  const handleAdj=async(qty:number)=>{
    if(!adj) return;
    const{med,mode}=adj;
    if(userId){
      const res=await fetch("/api/pharmacy/medicines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"adjust_stock",user_id:userId,id:med.id,delta:mode==="in"?qty:-qty})});
      const json=await res.json();
      if(json.success){
        setMedicines(prev=>prev.map(m=>m.id===med.id?{...m,stock:json.newStock}:m));
      } else { showNotif({type:"error",message:json.error||"Error"},3000); return; }
    } else {
      setMedicines(prev=>prev.map(m=>m.id===med.id?{...m,stock:mode==="in"?m.stock+qty:Math.max(0,m.stock-qty)}:m));
    }
    const logEntry:Omit<StockLog,"id">={medicine_id:med.id,medicine_name:med.name_ar,type:mode,qty,date:new Date().toISOString().slice(0,10),user:isAr?currentUser.name_ar:currentUser.name_en};
    setLog(p=>[{id:Math.max(0,...p.map(x=>x.id))+1,...logEntry},...p]);
    addLog(logEntry);
    showNotif({type:"success",message:mode==="in"?(isAr?`📥 إضافة ${qty} ${med.unit}`:`📥 Added ${qty}`):(isAr?`📤 خصم ${qty} ${med.unit}`:`📤 Removed ${qty}`),sub:isAr?med.name_ar:med.name_en},2500);
    setAdj(null);
  };

  const handleDelete=async(id:number)=>{
    if(userId){
      await fetch("/api/pharmacy/medicines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete",user_id:userId,id})});
    }
    setMedicines(prev=>prev.filter(m=>m.id!==id));
    setDelId(null);
  };

  const lowCount=medicines.filter(m=>m.stock<m.min_stock).length;

  return (
    <div>
      <div style={{background:"#fff",borderRadius:13,padding:"11px 15px",border:"1.5px solid #eef0f3",marginBottom:11,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",boxShadow:"0 2px 8px rgba(8,99,186,.04)"}}>
        <span style={{fontSize:12,fontWeight:700,color:"#888",flexShrink:0}}>{isAr?"الماسح:":"Scanner:"}</span>
        {([["inventory",isAr?"بحث":"Search","🔍","#0863ba"],["stock_in",isAr?"إضافة":"In","📥","#27ae60"],["stock_out",isAr?"خصم":"Out","📤","#e67e22"]] as [BarcodeMode,string,string,string][]).map(([m,label,icon,color])=>(
          <button key={m!} onClick={()=>setBarcodeMode(barcodeMode===m?null:m)}
            style={{padding:"6px 13px",borderRadius:9,border:`2px solid ${barcodeMode===m?color:color+"40"}`,background:barcodeMode===m?color:color+"0a",color:barcodeMode===m?"#fff":color,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all .2s",boxShadow:barcodeMode===m?`0 3px 10px ${color}40`:"none"}}>
            {icon} {label}{barcodeMode===m&&<span style={{fontSize:9,opacity:.8}}>●</span>}
          </button>
        ))}
        <button onClick={()=>setShowLog(true)} style={{marginRight:"auto",padding:"6px 13px",borderRadius:9,border:"1.5px solid #eef0f3",background:"#f7f9fc",color:"#666",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>📜 {isAr?"سجل الحركة":"Movement Log"}</button>
      </div>

      <div style={{background:"#fff",borderRadius:13,padding:"13px 15px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 8px rgba(8,99,186,.04)",marginBottom:11}}>
        <div style={{display:"flex",gap:9,marginBottom:11,alignItems:"center"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:9,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:9,padding:"8px 13px"}}>
            <span style={{color:"#bbb"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"بحث بالاسم أو الباركود...":"Name or barcode..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13,width:"100%",direction:isAr?"rtl":"ltr"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}
          </div>
          <button onClick={()=>{setEditMed(null);setShowModal(true);}} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 17px",background:"#0863ba",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 3px 11px rgba(8,99,186,.3)"}}>＋ {isAr?"إضافة":"Add"}</button>
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={()=>setCatF("all")} className={catF==="all"?"filter-chip active":"filter-chip"}>{isAr?"الكل":"All"}</button>
          <button onClick={()=>setCatF("low")} className={catF==="low"?"filter-chip active":"filter-chip"} style={catF!=="low"&&lowCount>0?{borderColor:"#e67e22",color:"#e67e22"}:{}}>⚠️ {isAr?"منخفض":"Low"}{lowCount>0&&<span style={{background:"#e67e22",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,marginRight:4}}>{lowCount}</span>}</button>
          {Object.entries(CAT).map(([k,v])=>(<button key={k} onClick={()=>setCatF(k as MedCat)} className={catF===k?"filter-chip active":"filter-chip"}>{v.icon} {isAr?v.ar:v.en}</button>))}
        </div>
      </div>

      {/* جدول ديسكتوب */}
      <div className="desktop-table" style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",boxShadow:"0 2px 14px rgba(8,99,186,.05)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr .9fr 130px",padding:"10px 17px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3"}}>
          {[isAr?"الدواء":"Medicine",isAr?"الباركود":"Barcode",isAr?"الفئة":"Cat",isAr?"السعر":"Price",isAr?"المخزون":"Stock","",isAr?"إجراءات":"Actions"].map((h,i)=>(<div key={i} style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.5}}>{h}</div>))}
        </div>
        {filtered.length===0?(<div style={{textAlign:"center",padding:"36px",color:"#ccc"}}><div style={{fontSize:30,marginBottom:7}}>📦</div><div>{isAr?"لا نتائج":"No results"}</div></div>)
        :filtered.map(m=>{
          const cat=CAT[m.category]; const expired=isExp(m.expiry_date); const lit=litId===m.id;
          return (
            <div key={m.id} className="inv-row" style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr 1fr .9fr 130px",padding:"11px 17px",alignItems:"center",borderBottom:"1px solid #f0f2f5",background:lit?"rgba(8,99,186,.07)":expired?"rgba(231,76,60,.025)":"",outline:lit?"2px solid #0863ba":"none",transition:"all .2s"}}>
              <div><div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div>{m.manufacturer&&<div style={{fontSize:10,color:"#bbb",marginTop:1}}>{m.manufacturer}</div>}{expired&&<div style={{fontSize:10,color:"#e74c3c",fontWeight:700}}>🚫 {isAr?"منتهي":"EXPIRED"}</div>}</div>
              <div><div style={{background:"#f7f9fc",borderRadius:7,padding:"2px 7px",border:"1px solid #e8ecf0",display:"inline-flex"}}><span style={{fontSize:10,color:"#0863ba",fontFamily:"monospace",letterSpacing:.7}}>{m.barcode}</span></div></div>
              <div><span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:`${cat.color}15`,color:cat.color}}>{cat.icon} {isAr?cat.ar:cat.en}</span></div>
              <div style={{fontSize:13,fontWeight:700,color:"#2e7d32"}}>{m.sell_price}<span style={{fontSize:10,color:"#aaa",fontWeight:400}}> {isAr?"ر.س":"SAR"}</span></div>
              <div style={{fontSize:13,fontWeight:700,color:m.stock<m.min_stock?"#e67e22":"#353535"}}>{m.stock}<span style={{fontSize:10,color:"#aaa",fontWeight:400}}> {isAr?m.unit:"u"}</span></div>
              <div><SBadge s={m.stock} m={m.min_stock} lang={lang}/></div>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                <button onClick={()=>setAdj({med:m,mode:"in"})} className="action-icon-btn" style={{color:"#27ae60",borderColor:"rgba(39,174,96,.3)"}}>📥</button>
                <button onClick={()=>setAdj({med:m,mode:"out"})} className="action-icon-btn" style={{color:"#e67e22",borderColor:"rgba(230,126,34,.3)"}}>📤</button>
                <button onClick={()=>{setEditMed(m);setShowModal(true);}} className="action-icon-btn">✏️</button>
                <button onClick={()=>setDelId(m.id)} className="action-icon-btn" style={{color:"#e74c3c"}}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* كروت موبايل */}
      <div className="mobile-cards" style={{display:"none"}}>
        {filtered.map(m=>{const cat=CAT[m.category];const lit=litId===m.id;const expired=isExp(m.expiry_date);return(
          <div key={m.id} style={{background:lit?"rgba(8,99,186,.05)":"#fff",borderRadius:14,padding:"14px",border:`1.5px solid ${lit?"#0863ba":expired?"rgba(231,76,60,.3)":"#eef0f3"}`,marginBottom:9,boxShadow:"0 2px 9px rgba(8,99,186,.05)",transition:"all .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontSize:14,fontWeight:700,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div><span style={{fontSize:10,fontWeight:600,padding:"1px 8px",borderRadius:20,background:`${cat.color}15`,color:cat.color}}>{cat.icon} {isAr?cat.ar:cat.en}</span></div><SBadge s={m.stock} m={m.min_stock} lang={lang}/></div>
            <div style={{background:"#f7f9fc",borderRadius:9,padding:"6px 10px",marginBottom:7,display:"flex",alignItems:"center",gap:8}}><BarcodeSVG code={m.barcode} w={90} h={30}/><span style={{fontFamily:"monospace",fontSize:9,color:"#0863ba",letterSpacing:.7}}>{m.barcode}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:9}}>
              <div style={{background:"#f7f9fc",borderRadius:8,padding:"7px",textAlign:"center"}}><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>{isAr?"سعر البيع":"Price"}</div><div style={{fontSize:14,fontWeight:700,color:"#2e7d32"}}>{m.sell_price}</div></div>
              <div style={{background:"#f7f9fc",borderRadius:8,padding:"7px",textAlign:"center"}}><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>{isAr?"المخزون":"Stock"}</div><div style={{fontSize:14,fontWeight:700,color:m.stock<m.min_stock?"#e67e22":"#353535"}}>{m.stock}</div></div>
            </div>
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>setAdj({med:m,mode:"in"})} style={{flex:1,padding:"7px",border:"1.5px solid rgba(39,174,96,.3)",borderRadius:9,background:"rgba(39,174,96,.07)",color:"#27ae60",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>📥</button>
              <button onClick={()=>setAdj({med:m,mode:"out"})} style={{flex:1,padding:"7px",border:"1.5px solid rgba(230,126,34,.3)",borderRadius:9,background:"rgba(230,126,34,.07)",color:"#e67e22",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>📤</button>
              <button onClick={()=>{setEditMed(m);setShowModal(true);}} style={{flex:1,padding:"7px",border:"1.5px solid #d0e4f7",borderRadius:9,background:"rgba(8,99,186,.05)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{isAr?"تعديل":"Edit"}</button>
              <button onClick={()=>setDelId(m.id)} style={{padding:"7px 12px",border:"1.5px solid rgba(231,76,60,.3)",borderRadius:9,background:"rgba(231,76,60,.06)",color:"#e74c3c",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>
        );})}
      </div>

      {(showModal||editMed)&&<MedModal lang={lang} medicine={editMed} onSave={handleSave} onClose={()=>{setShowModal(false);setEditMed(null);}}/>}
      {adj&&<AdjModal lang={lang} medicine={adj.med} mode={adj.mode} onConfirm={handleAdj} onClose={()=>setAdj(null)}/>}
      {delId!==null&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setDelId(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(90vw,380px)",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)"}}>
            <div style={{fontSize:38,marginBottom:12}}>🗑️</div>
            <p style={{fontSize:14,fontWeight:700,color:"#353535",marginBottom:18}}>{isAr?"هل تريد حذف هذا الدواء؟":"Delete this medicine?"}</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{handleDelete(delId);}} style={{flex:1,padding:"11px",background:"#e74c3c",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>{isAr?"احذف":"Delete"}</button>
              <button onClick={()=>setDelId(null)} style={{padding:"11px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}

      {showLog&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setShowLog(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"22px",width:"min(96vw,620px)",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>📜 {isAr?"سجل حركة المخزون":"Stock Movement Log"}</h2><button onClick={()=>setShowLog(false)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {log.sort((a,b)=>b.id-a.id).map(l=>{
                const ts:{[k:string]:{ic:string;c:string;ar:string;en:string}}={in:{ic:"📥",c:"#27ae60",ar:"إدخال",en:"In"},out:{ic:"📤",c:"#e67e22",ar:"إخراج",en:"Out"},sale:{ic:"🛒",c:"#8e44ad",ar:"بيع",en:"Sale"},purchase:{ic:"🏭",c:"#0863ba",ar:"شراء",en:"Purchase"},adjustment:{ic:"⚖️",c:"#7f8c8d",ar:"تعديل",en:"Adj"}};
                const s=ts[l.type]||ts.adjustment;
                return (<div key={l.id} style={{display:"flex",gap:11,alignItems:"flex-start",padding:"9px 12px",background:"#f7f9fc",borderRadius:9,border:"1px solid #eef0f3"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{s.ic}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
                      <div><span style={{fontSize:13,fontWeight:700,color:"#353535"}}>{l.medicine_name}</span><span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:`${s.c}15`,color:s.c,marginRight:5}}>{isAr?s.ar:s.en}</span></div>
                      <div style={{display:"flex",gap:7,alignItems:"center"}}><span style={{fontSize:13,fontWeight:800,color:s.c}}>{l.type==="out"||l.type==="sale"?"-":"+‌"}{l.qty}</span><span style={{fontSize:10,color:"#aaa"}}>{l.date}</span></div>
                    </div>
                    <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{l.user}{l.ref&&` · ${l.ref}`}{l.notes&&` · ${l.notes}`}</div>
                  </div>
                </div>);
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 📋 تبويب الوصفات
// ══════════════════════════════════════════════════════════════
function PrescriptionsTab({lang,prescriptions,setPrescriptions,currentUser,addLog,medicines,userId,onRefresh}:{lang:Lang;prescriptions:Prescription[];setPrescriptions:React.Dispatch<React.SetStateAction<Prescription[]>>;currentUser:User;addLog:(l:Omit<StockLog,"id">)=>void;medicines:Medicine[];userId:string|null;onRefresh:()=>void}) {
  const isAr=lang==="ar";
  const [mrnQ,setMrnQ]=useState(""); const [submitted,setSubmitted]=useState(""); const [pF,setPF]=useState<"all"|"pending"|"dispensed">("all");
  const [showAdd,setShowAdd]=useState(false); const [rxForm,setRxForm]=useState({mrn:"",patient_name:"",notes:""});
  const [rxItems,setRxItems]=useState<RxItem[]>([{medicine_name:"",dosage:"",duration:"",instructions:""}]);

  const displayed=useMemo(()=>{let l=prescriptions;if(submitted.trim())l=l.filter(p=>p.mrn.toLowerCase()===submitted.trim().toLowerCase());if(pF==="pending")l=l.filter(p=>!p.dispensed);if(pF==="dispensed")l=l.filter(p=>p.dispensed);return l;},[prescriptions,submitted,pF]);

  const dispense=async(id:string)=>{
    const rx=prescriptions.find(p=>p.id===id); if(!rx) return;
    const dispensed_by=isAr?currentUser.name_ar:currentUser.name_en;
    if(userId){
      const res=await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dispense",user_id:userId,id,dispensed_by})});
      const json=await res.json();
      if(!json.success) return;
      onRefresh();
    }
    setPrescriptions(prev=>prev.map(p=>p.id===id?{...p,dispensed:true,dispensed_at:new Date().toISOString().slice(0,10),dispensed_by}:p));
    rx.items.forEach(it=>{const med=medicines.find(m=>m.name_ar===it.medicine_name||m.name_en===it.medicine_name);if(med)addLog({medicine_id:med.id,medicine_name:med.name_ar,type:"out",qty:1,date:new Date().toISOString().slice(0,10),user:dispensed_by,ref:id,notes:"صرف وصفة"});});
  };

  const saveRx=async()=>{
    if(!rxForm.mrn.trim()||!rxForm.patient_name.trim()) return;
    const rxId=`RX-${new Date().getFullYear()}-${String(Math.max(0,...prescriptions.map(p=>parseInt(p.id.split("-")[2]||"0")))+1).padStart(3,"0")}`;
    const doctor_name=isAr?currentUser.name_ar:currentUser.name_en;
    const filteredItems=rxItems.filter(i=>i.medicine_name.trim());
    if(userId){
      const res=await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",user_id:userId,rx_id:rxId,mrn:rxForm.mrn,patient_name:rxForm.patient_name,doctor_name,doctor_id:currentUser.id,notes:rxForm.notes||undefined,dispensed:false,items:filteredItems})});
      const json=await res.json();
      if(json.success){ setPrescriptions(prev=>[json.prescription,...prev]); }
    } else {
      setPrescriptions(prev=>[{id:rxId,mrn:rxForm.mrn,patient_name:rxForm.patient_name,doctor_name,doctor_id:currentUser.id,created_at:new Date().toISOString().slice(0,10),items:filteredItems,notes:rxForm.notes||undefined,dispensed:false},...prev]);
    }
    setShowAdd(false); setRxForm({mrn:"",patient_name:"",notes:""}); setRxItems([{medicine_name:"",dosage:"",duration:"",instructions:""}]);
  };

  const canAdd=currentUser.role==="doctor"||currentUser.role==="manager";
  const canDispense=currentUser.role==="pharmacist"||currentUser.role==="manager";

  return (
    <div>
      {canAdd&&<button onClick={()=>setShowAdd(true)} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 17px",background:"#27ae60",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 11px rgba(39,174,96,.3)",marginBottom:13}}>＋ {isAr?"إضافة وصفة طبية":"New Prescription"}</button>}

      <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.03))",borderRadius:15,padding:"17px",border:"1.5px solid rgba(8,99,186,.15)",marginBottom:13}}>
        <div style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}><span style={{fontSize:17}}>🔍</span><span style={{fontSize:13,fontWeight:700,color:"#0863ba"}}>{isAr?"رقم السجل الطبي":"MRN"}</span></div>
        <div style={{display:"flex",gap:9}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:9,background:"#fff",border:"1.5px solid rgba(8,99,186,.25)",borderRadius:11,padding:"9px 13px",boxShadow:"0 2px 7px rgba(8,99,186,.1)"}}>
            <span>🪪</span>
            <input value={mrnQ} onChange={e=>setMrnQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")setSubmitted(mrnQ);}} placeholder={isAr?"ابحث برقم السجل الطبي...":"Search by MRN..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13,width:"100%",letterSpacing:.5,direction:"ltr"}}/>
            {mrnQ&&<button onClick={()=>{setMrnQ("");setSubmitted("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}
          </div>
          <button onClick={()=>setSubmitted(mrnQ)} style={{padding:"9px 19px",background:"#0863ba",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 13px rgba(8,99,186,.3)",whiteSpace:"nowrap"}}>{isAr?"بحث":"Search"}</button>
        </div>
        {submitted&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:11,color:"#0863ba",fontWeight:600}}>MRN:</span><span style={{fontSize:13,fontWeight:800,color:"#0863ba",background:"rgba(8,99,186,.1)",padding:"3px 9px",borderRadius:7,letterSpacing:.5}}>{submitted}</span><span style={{fontSize:11,color:"#aaa"}}>— {displayed.length} {isAr?"وصفة":"rx"}</span></div>}
      </div>

      <div style={{display:"flex",gap:7,marginBottom:13,flexWrap:"wrap"}}>
        {([["all",isAr?"الكل":"All"],["pending",isAr?"بانتظار الصرف":"Pending"],["dispensed",isAr?"مصروفة":"Dispensed"]] as [string,string][]).map(([k,v])=>(<button key={k} onClick={()=>setPF(k as any)} className={pF===k?"filter-chip active":"filter-chip"}>{v}</button>))}
      </div>

      {displayed.length===0?(<div style={{textAlign:"center",padding:"55px 20px",color:"#ccc",background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3"}}><div style={{fontSize:38,marginBottom:10}}>📋</div><div style={{fontSize:13,fontWeight:600}}>{submitted?(isAr?"لم يُعثر على وصفات":"No prescriptions found"):(isAr?"أدخل الرقم الطبي للبحث":"Enter MRN to search")}</div></div>):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {displayed.map(rx=>(
            <div key={rx.id} style={{background:"#fff",borderRadius:15,border:`1.5px solid ${rx.dispensed?"rgba(39,174,96,.25)":"rgba(8,99,186,.2)"}`,boxShadow:"0 2px 12px rgba(8,99,186,.06)",overflow:"hidden"}}>
              <div style={{padding:"13px 17px",background:rx.dispensed?"rgba(39,174,96,.04)":"rgba(8,99,186,.04)",borderBottom:"1px solid #f0f4f8",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:9}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{fontSize:13,fontWeight:800,color:"#0863ba",letterSpacing:.5}}>{rx.id}</span><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:rx.dispensed?"rgba(39,174,96,.15)":"rgba(230,126,34,.12)",color:rx.dispensed?"#27ae60":"#e67e22"}}>{rx.dispensed?"✅ "+(isAr?"صُرِّف":"Dispensed"):"⏳ "+(isAr?"بانتظار":"Pending")}</span></div>
                  <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{rx.patient_name}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{rx.doctor_name} · {rx.created_at}</div>
                  {rx.dispensed_by&&<div style={{fontSize:10,color:"#27ae60",marginTop:1}}>✅ {isAr?"بواسطة":"By"}: {rx.dispensed_by}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0863ba",background:"rgba(8,99,186,.08)",padding:"3px 9px",borderRadius:7,letterSpacing:.4}}>{rx.mrn}</span>
                  {!rx.dispensed&&canDispense&&<button onClick={()=>dispense(rx.id)} style={{padding:"7px 14px",background:"#27ae60",color:"#fff",border:"none",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 9px rgba(39,174,96,.3)",whiteSpace:"nowrap"}}>💊 {isAr?"صرف":"Dispense"}</button>}
                </div>
              </div>
              <div style={{padding:"12px 17px"}}>
                {rx.notes&&<div style={{background:"rgba(231,76,60,.06)",border:"1px solid rgba(231,76,60,.2)",borderRadius:9,padding:"7px 11px",marginBottom:9,fontSize:12,color:"#c0392b",fontWeight:600}}>⚠️ {rx.notes}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {rx.items.map((it,i)=>(<div key={i} style={{background:"#f7f9fc",borderRadius:9,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:9,flexWrap:"wrap"}}><div><div style={{fontSize:13,fontWeight:700,color:"#353535"}}>💊 {it.medicine_name}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{it.instructions}</div></div><div style={{textAlign:isAr?"left":"right",flexShrink:0}}><div style={{fontSize:11,fontWeight:700,color:"#0863ba"}}>{it.dosage}</div><div style={{fontSize:10,color:"#aaa"}}>{it.duration}</div></div></div>))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setShowAdd(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(96vw,540px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .25s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>📋 {isAr?"وصفة طبية جديدة":"New Prescription"}</h2><button onClick={()=>setShowAdd(false)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11,marginBottom:14}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>MRN *</label><input value={rxForm.mrn} onChange={e=>setRxForm(f=>({...f,mrn:e.target.value}))} placeholder="MRN-XXXXX" style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:"ltr",letterSpacing:.5}}/></div>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"اسم المريض *":"Patient *"}</label><input value={rxForm.patient_name} onChange={e=>setRxForm(f=>({...f,patient_name:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:"#555",marginBottom:9}}>{isAr?"الأدوية الموصوفة":"Prescribed Medicines"}</div>
            {rxItems.map((it,i)=>(
              <div key={i} style={{background:"#f7f9fc",borderRadius:11,padding:"11px",marginBottom:7}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:11,fontWeight:700,color:"#0863ba"}}>{isAr?"دواء":"Medicine"} {i+1}</span>{rxItems.length>1&&<button onClick={()=>setRxItems(p=>p.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:14}}>✕</button>}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  {([["medicine_name",isAr?"اسم الدواء":"Name","1/-1"],["dosage",isAr?"الجرعة":"Dosage",""],["duration",isAr?"المدة":"Duration",""],["instructions",isAr?"التعليمات":"Instructions","1/-1"]] as [keyof RxItem,string,string][]).map(([k,label,gc])=>(
                    <div key={k} style={{gridColumn:gc||"auto"}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",display:"block",marginBottom:3}}>{label}</label><input value={it[k]} onChange={e=>setRxItems(p=>p.map((x,xi)=>xi===i?{...x,[k]:e.target.value}:x))} style={{width:"100%",padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>setRxItems(p=>[...p,{medicine_name:"",dosage:"",duration:"",instructions:""}])} style={{width:"100%",padding:"8px",border:"1.5px dashed #d0e4f7",borderRadius:9,background:"rgba(8,99,186,.03)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:12}}>＋ {isAr?"إضافة دواء آخر":"Add Medicine"}</button>
            <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"ملاحظات":"Notes"}</label><input value={rxForm.notes} onChange={e=>setRxForm(f=>({...f,notes:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={saveRx} style={{flex:1,padding:"12px",background:"#27ae60",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 13px rgba(39,174,96,.3)"}}>📋 {isAr?"إصدار الوصفة":"Issue Rx"}</button>
              <button onClick={()=>setShowAdd(false)} style={{padding:"12px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 💰 تبويب المبيعات
// ══════════════════════════════════════════════════════════════
function SalesTab({lang,medicines,sales,setSales,barcodeMode,setBarcodeMode,showNotif,currentUser,addLog,userId,onRefresh}:{lang:Lang;medicines:Medicine[];sales:Sale[];setSales:React.Dispatch<React.SetStateAction<Sale[]>>;barcodeMode:BarcodeMode;setBarcodeMode:(m:BarcodeMode)=>void;showNotif:(n:ScanNotif,ms?:number)=>void;currentUser:User;addLog:(l:Omit<StockLog,"id">)=>void;userId:string|null;onRefresh:()=>void}) {
  const isAr=lang==="ar";
  const [showForm,setShowForm]=useState(false); const [items,setItems]=useState<SaleItem[]>([]);
  const [mQ,setMQ]=useState(""); const [discount,setDiscount]=useState(0); const [payment,setPayment]=useState<"cash"|"card"|"insurance">("cash");
  const [pName,setPName]=useState(""); const [rxId,setRxId]=useState(""); const [flashId,setFlashId]=useState<number|null>(null); const [printSale,setPrintSale]=useState<Sale|null>(null);

  const mRes=mQ.trim()?medicines.filter(m=>(m.name_ar+m.name_en).toLowerCase().includes(mQ.toLowerCase())||m.barcode.includes(mQ)).slice(0,6):[];

  const addToSale=useCallback((m:Medicine)=>{
    setItems(prev=>{const ex=prev.findIndex(i=>i.medicine_id===m.id);if(ex>=0)return prev.map((i,xi)=>xi===ex?{...i,qty:i.qty+1}:i);return[...prev,{medicine_id:m.id,medicine_name:isAr?m.name_ar:m.name_en,qty:1,unit_price:m.sell_price}];});
    setFlashId(m.id); setTimeout(()=>setFlashId(null),900); setMQ(""); if(!showForm) setShowForm(true);
  },[isAr,showForm]);

  const handleScan=useCallback((code:string)=>{
    const med=medicines.find(m=>m.barcode===code);
    if(!med){showNotif({type:"error",message:isAr?"باركود غير موجود":"Not found",sub:code},2500);return;}
    addToSale(med); showNotif({type:"success",message:isAr?`✅ ${med.name_ar}`:`✅ ${med.name_en}`,sub:`${med.sell_price} ${isAr?"ر.س":"SAR"}`},1800);
  },[medicines,isAr,addToSale,showNotif]);

  useBarcode(handleScan,barcodeMode==="sale");

  const subtotal=items.reduce((s,i)=>s+i.qty*i.unit_price,0); const total=Math.max(0,subtotal-discount);

  const complete=async()=>{
    if(items.length===0) return;
    const cashier=isAr?currentUser.name_ar:currentUser.name_en;
    const date=new Date().toISOString().slice(0,10);
    if(userId){
      const res=await fetch("/api/pharmacy/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,items,total,discount,payment_method:payment,patient_name:pName||null,prescription_id:rxId||null,cashier,date})});
      const json=await res.json();
      if(json.success){
        setSales(prev=>[json.sale,...prev]);
        items.forEach(it=>addLog({medicine_id:it.medicine_id,medicine_name:it.medicine_name,type:"sale",qty:it.qty,date,user:cashier,ref:`SALE-${json.sale.id}`}));
        setPrintSale(json.sale);
        onRefresh();
      } else { showNotif({type:"error",message:json.error||"Error"},3000); return; }
    } else {
      const ns:Sale={id:Math.max(0,...sales.map(s=>s.id))+1,date,items,total,payment_method:payment,discount,patient_name:pName||undefined,prescription_id:rxId||undefined,cashier};
      setSales(prev=>[ns,...prev]);
      items.forEach(it=>addLog({medicine_id:it.medicine_id,medicine_name:it.medicine_name,type:"sale",qty:it.qty,date,user:cashier,ref:`SALE-${ns.id}`}));
      setPrintSale(ns);
    }
    setItems([]); setDiscount(0); setPayment("cash"); setPName(""); setRxId(""); setShowForm(false); setBarcodeMode(null);
  };

  const today=new Date().toISOString().slice(0,10); const todaySales=sales.filter(s=>s.date===today); const todayTotal=todaySales.reduce((s,x)=>s+x.total,0);
  const pi:{[k:string]:string}={cash:"💵",card:"💳",insurance:"🏥"};
  const pm={cash:isAr?"نقداً":"Cash",card:isAr?"بطاقة":"Card",insurance:isAr?"تأمين":"Insurance"};

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11,marginBottom:13}}>
        {[{l:isAr?"مبيعات اليوم":"Today",v:todaySales.length,ic:"🛒",c:"#0863ba"},{l:isAr?"إيرادات اليوم":"Revenue",v:`${todayTotal} ${isAr?"ر.س":"SAR"}`,ic:"💰",c:"#27ae60"},{l:isAr?"الإجمالي":"Total",v:sales.length,ic:"📊",c:"#8e44ad"}].map((s,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:13,padding:"13px 15px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 9px rgba(8,99,186,.05)"}}><div style={{fontSize:21,marginBottom:3}}>{s.ic}</div><div style={{fontSize:17,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:11,color:"#aaa",marginTop:3}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{marginBottom:13,display:"flex",gap:9}}>
        <button onClick={()=>{setBarcodeMode(barcodeMode==="sale"?null:"sale");if(barcodeMode!=="sale")setShowForm(true);}}
          style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:barcodeMode==="sale"?"#8e44ad":"rgba(142,68,173,.08)",color:barcodeMode==="sale"?"#fff":"#8e44ad",border:`2px solid ${barcodeMode==="sale"?"#8e44ad":"rgba(142,68,173,.3)"}`,borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:barcodeMode==="sale"?"0 4px 15px rgba(142,68,173,.4)":"none",transition:"all .2s"}}>
          <span style={{fontSize:17}}>▐▌▌▐▌</span>{isAr?"تفعيل الماسح":"Scanner"}{barcodeMode==="sale"&&<span style={{fontSize:10,opacity:.8}}>● {isAr?"نشط":"On"}</span>}
        </button>
        <button onClick={()=>setShowForm(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"10px 18px",background:"#0863ba",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 15px rgba(8,99,186,.3)"}}>🛒 {isAr?"بيع جديد":"New Sale"}</button>
      </div>

      {showForm&&(
        <div style={{background:"#fff",borderRadius:15,border:`2px solid ${barcodeMode==="sale"?"#8e44ad":"rgba(8,99,186,.2)"}`,boxShadow:"0 4px 22px rgba(8,99,186,.1)",padding:"19px",marginBottom:14,animation:"slideUp .3s ease"}}>
          {barcodeMode==="sale"&&<div style={{background:"rgba(142,68,173,.07)",border:"1.5px solid rgba(142,68,173,.25)",borderRadius:9,padding:"9px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:19}}>▐▌▌▐▌</span><div style={{fontSize:12,fontWeight:800,color:"#8e44ad"}}>{isAr?"الماسح نشط — امسح الباركود":"Scanner Active — Scan barcode"}</div><span style={{marginRight:"auto",fontSize:17}}>📡</span></div>}
          <h3 style={{fontSize:14,fontWeight:800,color:"#353535",marginBottom:13}}>🛒 {isAr?"بيع جديد":"New Sale"}</h3>
          <div style={{position:"relative",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:7,background:"#f7f9fc",border:"1.5px solid #e0e7ef",borderRadius:9,padding:"8px 11px"}}><span>💊</span><input value={mQ} onChange={e=>setMQ(e.target.value)} placeholder={isAr?"بحث أو رقم باركود...":"Search or barcode..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13,width:"100%",direction:isAr?"rtl":"ltr"}}/>{mQ&&<button onClick={()=>setMQ("")} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}</div>
            {mRes.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",borderRadius:11,boxShadow:"0 8px 30px rgba(0,0,0,.11)",border:"1.5px solid #eef0f3",overflow:"hidden",marginTop:3}}>{mRes.map(m=>(<div key={m.id} onClick={()=>addToSale(m)} style={{padding:"9px 13px",cursor:"pointer",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f7f9fc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}><div><span style={{fontWeight:600}}>{isAr?m.name_ar:m.name_en}</span><span style={{fontSize:9,color:"#aaa",marginRight:7,fontFamily:"monospace"}}>{m.barcode}</span></div><span style={{color:"#27ae60",fontWeight:700,fontSize:12}}>{m.sell_price} {isAr?"ر.س":"SAR"}</span></div>))}</div>}
          </div>
          {items.length>0&&<div style={{background:"#f7f9fc",borderRadius:11,padding:"11px",marginBottom:12}}>{items.map((it,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<items.length-1?7:0,background:flashId===it.medicine_id?"rgba(8,99,186,.09)":"transparent",borderRadius:7,padding:"3px 5px",transition:"background .35s"}}><div style={{flex:1,fontSize:13,fontWeight:600,color:"#353535"}}>{it.medicine_name}</div><div style={{display:"flex",alignItems:"center",gap:3}}><button onClick={()=>setItems(p=>p.map((x,xi)=>xi===i?{...x,qty:Math.max(1,x.qty-1)}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:5,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>-</button><span style={{fontSize:13,fontWeight:700,minWidth:22,textAlign:"center"}}>{it.qty}</span><button onClick={()=>setItems(p=>p.map((x,xi)=>xi===i?{...x,qty:x.qty+1}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:5,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>+</button></div><div style={{fontSize:12,fontWeight:700,color:"#27ae60",minWidth:50,textAlign:"center"}}>{(it.qty*it.unit_price).toFixed(0)}</div><button onClick={()=>setItems(p=>p.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:15}}>✕</button></div>))}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
            <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:3}}>{isAr?"خصم":"Discount"}</label><input type="number" min={0} value={discount} onChange={e=>setDiscount(Number(e.target.value))} style={{width:"100%",padding:"8px 11px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:3}}>{isAr?"طريقة الدفع":"Payment"}</label><select value={payment} onChange={e=>setPayment(e.target.value as any)} style={{width:"100%",padding:"8px 11px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>{Object.entries(pm).map(([k,v])=><option key={k} value={k}>{pi[k]} {v}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
            <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:3}}>{isAr?"اسم المريض":"Patient"}</label><input value={pName} onChange={e=>setPName(e.target.value)} style={{width:"100%",padding:"8px 11px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
            <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:3}}>{isAr?"رقم الوصفة":"Rx ID"}</label><input value={rxId} onChange={e=>setRxId(e.target.value)} style={{width:"100%",padding:"8px 11px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:"ltr"}}/></div>
          </div>
          <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.03))",borderRadius:11,padding:"12px 15px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:"#353535"}}>{isAr?"المجموع النهائي":"Final Total"}</span><span style={{fontSize:21,fontWeight:800,color:"#0863ba"}}>{total}<span style={{fontSize:12,fontWeight:400,color:"#aaa"}}> {isAr?"ر.س":"SAR"}</span></span></div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={complete} disabled={items.length===0} style={{flex:1,padding:"12px",background:items.length===0?"#ccc":"#27ae60",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:items.length===0?"not-allowed":"pointer",boxShadow:items.length===0?"none":"0 4px 13px rgba(39,174,96,.3)"}}>✅ {isAr?"إتمام البيع":"Complete"}</button>
            <button onClick={()=>{setShowForm(false);setItems([]);setDiscount(0);setPName("");setRxId("");setBarcodeMode(null);}} style={{padding:"12px 17px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
          </div>
        </div>
      )}
      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",boxShadow:"0 2px 13px rgba(8,99,186,.05)",overflow:"hidden"}}>
        <div style={{padding:"13px 17px",borderBottom:"1.5px solid #f0f2f5",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:700,color:"#353535"}}>{isAr?"سجل المبيعات":"Sales History"}</span><span style={{fontSize:11,color:"#aaa"}}>{sales.length} {isAr?"عملية":"tx"}</span></div>
        {sales.length===0?(<div style={{textAlign:"center",padding:"36px",color:"#ccc"}}><div style={{fontSize:30,marginBottom:7}}>🛒</div><div>{isAr?"لا مبيعات":"No sales"}</div></div>)
        :sales.map(s=>(<div key={s.id} style={{padding:"11px 17px",borderBottom:"1px solid #f0f2f5",display:"flex",justifyContent:"space-between",alignItems:"center",gap:9,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:"#353535",marginBottom:1}}>{s.patient_name||`${isAr?"بيع":"Sale"} #${s.id}`}</div><div style={{fontSize:11,color:"#aaa"}}>{s.date} · {s.items.length} {isAr?"أدوية":"items"} · {s.cashier}</div></div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
            <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#f0f4f8",color:"#888",fontWeight:600}}>{pi[s.payment_method]} {pm[s.payment_method]}</span>
            <span style={{fontSize:14,fontWeight:800,color:"#0863ba"}}>{s.total}<span style={{fontSize:10,fontWeight:400,color:"#aaa"}}> {isAr?"ر.س":"SAR"}</span></span>
            <button onClick={()=>setPrintSale(s)} className="action-icon-btn" title={isAr?"طباعة":"Print"}>🖨️</button>
          </div>
        </div>))}
      </div>
      {printSale&&<PrintModal sale={printSale} lang={lang} cashierName={isAr?currentUser.name_ar:currentUser.name_en} onClose={()=>setPrintSale(null)}/>}
    </div>
  );
}

function ReportsTab({lang,medicines,sales}:{lang:Lang;medicines:Medicine[];sales:Sale[]}) {
  const isAr=lang==="ar";
  const totalRev=sales.reduce((s,x)=>s+x.total,0);
  const totalCost=sales.reduce((s,sale)=>s+sale.items.reduce((ss,it)=>{const m=medicines.find(x=>x.id===it.medicine_id);return ss+(m?m.purchase_price*it.qty:0);},0),0);
  const catS:{[k:string]:number}={}; Object.keys(CAT).forEach(k=>{catS[k]=0;});
  sales.forEach(sale=>sale.items.forEach(it=>{const m=medicines.find(x=>x.id===it.medicine_id);if(m)catS[m.category]=(catS[m.category]||0)+it.qty*it.unit_price;}));
  const topCat=Object.entries(catS).sort((a,b)=>b[1]-a[1]); const maxC=topCat[0]?.[1]||1;
  const medS:{[k:number]:number}={}; sales.forEach(s=>s.items.forEach(it=>{medS[it.medicine_id]=(medS[it.medicine_id]||0)+it.qty;}));
  const topMeds=Object.entries(medS).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=>({...medicines.find(m=>m.id===Number(id))!,soldQty:qty})).filter(Boolean);
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11,marginBottom:15}}>
        {[{l:isAr?"إجمالي المبيعات":"Total Sales",v:`${totalRev} ${isAr?"ر.س":"SAR"}`,ic:"💰",c:"#0863ba",bg:"rgba(8,99,186,.08)"},{l:isAr?"الربح التقديري":"Est. Profit",v:`${totalRev-totalCost} ${isAr?"ر.س":"SAR"}`,ic:"📈",c:"#27ae60",bg:"rgba(39,174,96,.08)"},{l:isAr?"مخزون منخفض":"Low Stock",v:medicines.filter(m=>m.stock<m.min_stock).length,ic:"⚠️",c:"#e67e22",bg:"rgba(230,126,34,.08)"},{l:isAr?"منتهية الصلاحية":"Expired",v:medicines.filter(m=>isExp(m.expiry_date)).length,ic:"🚫",c:"#e74c3c",bg:"rgba(231,76,60,.08)"}].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:13,padding:"15px",border:`1.5px solid ${s.c}25`}}><div style={{fontSize:22,marginBottom:5}}>{s.ic}</div><div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:11,color:s.c,opacity:.7,marginTop:3,fontWeight:600}}>{s.l}</div></div>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",marginBottom:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:13,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"المبيعات حسب التصنيف":"By Category"}</h3>
        {topCat.map(([k,v])=>{const cat=CAT[k];const pct=maxC>0?(v/maxC)*100:0;return(<div key={k} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600,color:"#555"}}>{cat.icon} {isAr?cat.ar:cat.en}</span><span style={{fontSize:12,fontWeight:700,color:cat.color}}>{v} {isAr?"ر.س":"SAR"}</span></div><div style={{height:7,background:"#f0f2f5",borderRadius:10,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:cat.color,borderRadius:10,transition:"width .6s ease"}}/></div></div>);})}
      </div>
      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:13,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"الأكثر مبيعاً":"Best Selling"}</h3>
        {topMeds.map((m,i)=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:i<topMeds.length-1?"1px solid #f0f2f5":"none"}}><div style={{width:26,height:26,borderRadius:7,background:"#0863ba",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div><div style={{fontSize:9,color:"#aaa",fontFamily:"monospace"}}>{m.barcode}</div></div><div style={{fontSize:12,fontWeight:700,color:"#0863ba"}}>{m.soldQty} {isAr?"وحدة":"units"}</div></div>))}
        {topMeds.length===0&&<div style={{textAlign:"center",padding:"18px",color:"#ccc",fontSize:12}}>{isAr?"لا بيانات":"No data"}</div>}
      </div>
    </div>
  );
}

export default function PharmacyPage() {
  const [lang,setLang]=useState<Lang>("ar");
  const [currentUser,setCurrentUser]=useState<User|null>(null);
  const [supabaseUserId,setSupabaseUserId]=useState<string|null>(null);
  const [activeTab,setActiveTab]=useState("inventory");
  const [medicines,setMedicines]=useState<Medicine[]>([]);
  const [prescriptions,setPrescriptions]=useState<Prescription[]>([]);
  const [sales,setSales]=useState<Sale[]>([]);
  const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [invoices,setInvoices]=useState<PurchInvoice[]>([]);
  const [stockLog,setStockLog]=useState<StockLog[]>([]);
  const [barcodeMode,setBarcodeMode]=useState<BarcodeMode>(null);
  const [notif,setNotif]=useState<ScanNotif>(null);
  const [alertsRead,setAlertsRead]=useState<Set<number>>(new Set());
  const [loading,setLoading]=useState(false);
  const [dataLoaded,setDataLoaded]=useState(false);
  const notifT=useRef<ReturnType<typeof setTimeout>|null>(null);

  const showNotif=useCallback((n:ScanNotif,ms=2200)=>{setNotif(n);clearTimeout(notifT.current);notifT.current=setTimeout(()=>setNotif(null),ms);},[]);

  // ── جلب البيانات من Supabase ──────────────────────────────
  const loadData=useCallback(async(uid:string)=>{
    setLoading(true);
    try {
      const res=await fetch(`/api/pharmacy/data?user_id=${uid}`);
      if(!res.ok) throw new Error("fetch failed");
      const d=await res.json();
      setMedicines(d.medicines||[]);
      setSales(d.sales||[]);
      setSuppliers(d.suppliers||[]);
      setInvoices(d.invoices||[]);
      setPrescriptions(d.prescriptions||[]);
      setStockLog(d.stockLogs||[]);
      setDataLoaded(true);
    } catch(e){
      console.error("loadData error:",e);
      showNotif({type:"error",message:lang==="ar"?"فشل تحميل البيانات":"Failed to load data"},3000);
    } finally { setLoading(false); }
  },[lang,showNotif]);

  // ── تسجيل الدخول عبر Supabase Auth ───────────────────────
  const handleLogin=useCallback(async(u:User)=>{
    // ابحث عن الجلسة النشطة في Supabase
    const {data:{session}}=await supabase.auth.getSession();
    if(session?.user?.id){
      setSupabaseUserId(session.user.id);
      setCurrentUser(u);
      setActiveTab(ROLE[u.role].tabs[0]);
      await loadData(session.user.id);
    } else {
      // fallback: استخدم email/password من نظام الصيدلية
      const {data,error}=await supabase.auth.signInWithPassword({
        email: u.username.includes("@") ? u.username : `${u.username}@pharmacy.nabd`,
        password: u.password,
      });
      if(!error && data.user){
        setSupabaseUserId(data.user.id);
        setCurrentUser(u);
        setActiveTab(ROLE[u.role].tabs[0]);
        await loadData(data.user.id);
      } else {
        // إذا فشل Auth، استمر بالنظام المحلي مؤقتاً
        setCurrentUser(u);
        setActiveTab(ROLE[u.role].tabs[0]);
        showNotif({type:"warning",message:lang==="ar"?"تسجيل دخول محلي - البيانات غير محفوظة":"Local login - data not saved"},4000);
      }
    }
  },[lang,loadData,showNotif]);

  // ── تحقق من جلسة Supabase عند التحميل ───────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setSupabaseUserId(session.user.id);
        // استعد user من metadata
        const meta=session.user.user_metadata;
        if(meta?.role==="pharmacy"||meta?.account_type==="pharmacy"){
          const role:UserRole=(meta.pharmacy_role as UserRole)||"pharmacist";
          const u:User={id:1,name_ar:meta.owner_name||"مستخدم",name_en:meta.owner_name||"User",role,username:session.user.email||"",password:"",avatar:"💊"};
          setCurrentUser(u);
          setActiveTab(ROLE[role].tabs[0]);
          loadData(session.user.id);
        }
      }
    });
  },[loadData]);

  const addLog=useCallback(async(l:Omit<StockLog,"id">)=>{
    setStockLog(prev=>[{id:Math.max(0,...prev.map(x=>x.id))+1,...l},...prev]);
    // الحفظ في Supabase يتم من خلال API route (sales, invoices)
  },[]);

  const alerts:SysAlert[]=useMemo(()=>{
    const list:SysAlert[]=[]; const isAr=lang==="ar"; const today=new Date().toISOString().slice(0,10);
    medicines.forEach(m=>{
      if(m.stock===0) list.push({id:m.id*10,type:"out_of_stock",medicine_id:m.id,medicine_name:m.name_ar,detail:isAr?`نفد مخزون ${m.name_ar}`:`${m.name_en} out of stock`,date:today,read:alertsRead.has(m.id*10)});
      else if(m.stock<m.min_stock) list.push({id:m.id*10+1,type:"low_stock",medicine_id:m.id,medicine_name:m.name_ar,detail:isAr?`المخزون ${m.stock} / الحد ${m.min_stock}`:`Stock ${m.stock} / Min ${m.min_stock}`,date:today,read:alertsRead.has(m.id*10+1)});
      if(isSoon(m.expiry_date)) list.push({id:m.id*10+2,type:"expiring",medicine_id:m.id,medicine_name:m.name_ar,detail:isAr?`ينتهي في ${m.expiry_date}`:`Expires ${m.expiry_date}`,date:today,read:alertsRead.has(m.id*10+2)});
    });
    return list;
  },[medicines,lang,alertsRead]);

  const markAll=()=>setAlertsRead(new Set(alerts.map(a=>a.id)));
  const markOne=(id:number)=>setAlertsRead(s=>{const n=new Set(s);n.add(id);return n;});
  const unread=alerts.filter(a=>!a.read).length;

  useEffect(()=>{setBarcodeMode(null);},[activeTab]);

  if(!currentUser) return <LoginScreen onLogin={handleLogin} lang={lang}/>;

  const isAr=lang==="ar";
  const allowedTabs=ROLE[currentUser.role].tabs;
  const pendingRx=prescriptions.filter(p=>!p.dispensed).length;

  const tabDef:[string,string,number|null][]=[
    ["inventory",    isAr?"🗄️ المخزون":"🗄️ Inventory",null],
    ["prescriptions",isAr?"📋 الوصفات":"📋 Prescriptions",pendingRx>0?pendingRx:null],
    ["sales",        isAr?"💰 المبيعات":"💰 Sales",null],
    ["suppliers",    isAr?"🏭 الموردون":"🏭 Suppliers",null],
    ["reports",      isAr?"📊 التقارير":"📊 Reports",null],
    ["alerts",       isAr?"🔔 التنبيهات":"🔔 Alerts",unread>0?unread:null],
  ].filter(([k])=>allowedTabs.includes(k as string)) as [string,string,number|null][];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes slideUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
        @keyframes barcodeIn{from{opacity:0;transform:translateX(-50%) translateY(-16px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .main-anim{animation:fadeUp .35s ease both}
        .inv-row:hover{background:#fafbff!important}
        .action-icon-btn{width:30px;height:30px;border-radius:7px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .filter-chip{padding:6px 12px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .tab-btn{padding:9px 13px;border-radius:11px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:12px;font-weight:600;transition:all .2s;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:5px;position:relative}
        .tab-btn.active{background:#0863ba;color:#fff;box-shadow:0 4px 13px rgba(8,99,186,.3)}
        .tab-btn:not(.active){background:#fff;color:#888;border:1.5px solid #eef0f3}
        .tab-btn:not(.active):hover{border-color:#a4c4e4;color:#0863ba}
        @media print{.no-print{display:none!important}}
        @media(max-width:768px){
          .main-content{margin-right:0!important;margin-left:0!important;padding:0 0 110px!important}
          .content-pad{padding:12px 13px 0!important}
          .topbar-inner{padding:11px 13px!important}
          .desktop-table{display:none!important}
          .mobile-cards{display:block!important}
        }
        @media(min-width:769px){
          .desktop-table{display:block!important}
          .mobile-cards{display:none!important}
          .main-content{margin-${isAr?"right":"left"}:240px}
        }
      `}</style>
      <div style={{fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc"}}>
        <BarcodeNotif n={notif}/>
        <BarcodeBar mode={barcodeMode} isAr={isAr} onClose={()=>setBarcodeMode(null)}/>

        {/* شريط التحميل */}
        {loading&&(
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,height:3,background:"linear-gradient(90deg,#0863ba,#1a8fe3)",animation:"pulse 1s ease infinite"}}/>
        )}

        <div className="no-print" style={{position:"sticky",top:0,zIndex:30,background:"rgba(247,249,252,.97)",backdropFilter:"blur(12px)",borderBottom:"1.5px solid #eef0f3"}}>
          <div className="topbar-inner" style={{padding:"11px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:11}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:35,height:35,borderRadius:11,background:"linear-gradient(135deg,#0863ba,#1a8fe3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,boxShadow:"0 4px 13px rgba(8,99,186,.3)",flexShrink:0}}>💊</div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:"#353535"}}>{isAr?"إدارة الصيدلية":"Pharmacy"}</div>
                <div style={{fontSize:10,color:"#aaa"}}>{isAr?"نظام نبض المتكامل":"NABD Integrated System"}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
              {barcodeMode&&<div style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:9,background:"rgba(142,68,173,.12)",color:"#8e44ad",animation:"pulse 1.2s ease infinite",display:"flex",alignItems:"center",gap:3}}>▐▌▌ {isAr?"نشط":"On"}</div>}
              {/* مؤشر حالة الاتصال */}
              {supabaseUserId&&(
                <div style={{fontSize:10,padding:"3px 8px",borderRadius:9,background:"rgba(39,174,96,.1)",color:"#27ae60",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#27ae60",display:"inline-block"}}/>
                  {isAr?"متصل":"Live"}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"4px 10px",background:`${ROLE[currentUser.role].color}10`,border:`1.5px solid ${ROLE[currentUser.role].color}30`,borderRadius:9}}>
                <span style={{fontSize:15}}>{currentUser.avatar}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#353535",lineHeight:1.1}}>{isAr?currentUser.name_ar:currentUser.name_en}</div>
                  <div style={{fontSize:9,color:ROLE[currentUser.role].color,fontWeight:600}}>{isAr?ROLE[currentUser.role].ar:ROLE[currentUser.role].en}</div>
                </div>
                <button onClick={async()=>{await supabase.auth.signOut();setCurrentUser(null);setSupabaseUserId(null);setDataLoaded(false);setMedicines([]);setSales([]);setSuppliers([]);setInvoices([]);setPrescriptions([]);setStockLog([]);}}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#bbb",paddingRight:3}}>{isAr?"خروج":"Out"}</button>
              </div>
              <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")} style={{padding:"6px 11px",border:"1.5px solid #d0e4f7",borderRadius:9,background:"#fff",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer"}}>{isAr?"EN":"AR"}</button>
            </div>
          </div>
          <div style={{padding:"0 22px 11px",overflowX:"auto",scrollbarWidth:"none"}}>
            <div style={{display:"flex",gap:6,minWidth:"max-content"}}>
              {tabDef.map(([k,v,badge])=>(
                <button key={k} onClick={()=>setActiveTab(k)} className={activeTab===k?"tab-btn active":"tab-btn"} style={{position:"relative"}}>
                  {v}
                  {badge&&<span style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:"50%",background:"#e74c3c",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 5px rgba(231,76,60,.4)"}}>{badge}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="main-anim main-content" style={{padding:"0 22px 44px",transition:"margin .3s"}}>
          <div className="content-pad" style={{padding:"16px 0 0"}}>
            {loading&&!dataLoaded?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:16}}>
                <div style={{width:40,height:40,borderRadius:"50%",border:"3px solid #eef0f3",borderTop:"3px solid #0863ba",animation:"spin 0.8s linear infinite"}}/>
                <div style={{fontSize:13,color:"#aaa"}}>{isAr?"جاري تحميل البيانات...":"Loading data..."}</div>
              </div>
            ):(
              <>
                {activeTab==="inventory"    &&<InventoryTab     lang={lang} medicines={medicines} setMedicines={(v)=>{setMedicines(v); if(supabaseUserId) loadData(supabaseUserId);}} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} showNotif={showNotif} addLog={addLog} currentUser={currentUser} userId={supabaseUserId}/>}
                {activeTab==="prescriptions"&&<PrescriptionsTab lang={lang} prescriptions={prescriptions} setPrescriptions={setPrescriptions} currentUser={currentUser} addLog={addLog} medicines={medicines} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="sales"        &&<SalesTab         lang={lang} medicines={medicines} sales={sales} setSales={setSales} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} showNotif={showNotif} currentUser={currentUser} addLog={addLog} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="suppliers"    &&<SuppliersTab     lang={lang} medicines={medicines} suppliers={suppliers} setSuppliers={setSuppliers} invoices={invoices} setInvoices={setInvoices} setMedicines={setMedicines} currentUser={currentUser} addLog={addLog} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="reports"      &&<ReportsTab       lang={lang} medicines={medicines} sales={sales}/>}
                {activeTab==="alerts"       &&<AlertsTab        lang={lang} medicines={medicines} alerts={alerts} markAll={markAll} markOne={markOne}/>}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}