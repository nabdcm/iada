"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { CameraScanner, usePharmacyChannel, type ScanEvent } from "./scanner";
import { DesktopSidebar, MobilePillNav, MoreSheet, TAB_META, Icons, type TabKey } from "./nav";
import { supabase } from "@/lib/supabase";

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
type MedCat = "antibiotics"|"analgesics"|"chronic"|"vitamins"|"topical"|"syrups"|"injections"|"dermatology"|"pediatric"|"digestive"|"respiratory"|"cardiac"|"diabetes"|"eye_ear"|"womens_health"|"cosmetics"|"supplies"|"other";
type BarcodeMode = "inventory"|"stock_in"|"stock_out"|"sale"|null;
type UserRole = "pharmacist"|"manager"|"doctor";

type User = { id:number; name_ar:string; name_en:string; role:UserRole; username:string; password:string; avatar:string };
type Supplier = { id:number; name:string; contact:string; phone:string; email:string; address:string; balance:number };
type PurchItem = { medicine_id:number; medicine_name:string; qty:number; unit_price:number; expiry_date?:string; batch_no?:string };
type PurchInvoice = { id:number; supplier_id:number; supplier_name:string; date:string; items:PurchItem[]; total:number; paid:number; status:"paid"|"partial"|"pending"; notes?:string; created_by:string };
type StockLog = { id:number; medicine_id:number; medicine_name:string; type:"in"|"out"|"sale"|"purchase"|"adjustment"; qty:number; date:string; user:string; ref?:string; notes?:string };
type Batch = { id:number; medicine_id:number; batch_no?:string|null; expiry_date?:string|null; qty:number; unit_cost:number; received_date?:string; invoice_id?:number|null };
type Medicine = { id:number; name_ar:string; name_en:string; category:MedCat; barcode:string; unit:string; purchase_price:number; sell_price:number; stock:number; min_stock:number; expiry_date?:string; manufacturer?:string; avg_cost?:number; batches?:Batch[]; nearest_expiry?:string|null };
type RxStatus = "waiting"|"preparing"|"ready"|"dispensed"|"cancelled";
type RxPriority = "low"|"normal"|"high"|"urgent";
type RxItem = { id?:number; medicine_name:string; dosage:string; duration:string; instructions:string; qty?:number; dispensed_qty?:number; medicine_id?:number };
type Prescription = { id:string; mrn:string; patient_name:string; doctor_name:string; doctor_id:number; created_at:string; items:RxItem[]; notes?:string; dispensed:boolean; dispensed_at?:string; dispensed_by?:string; status?:RxStatus; priority?:RxPriority; patient_id?:number; source?:string };
type Interaction = { id:number; drug_a:string; drug_b:string; severity:"mild"|"moderate"|"severe"; description:string; is_seed:boolean; med_a?:string; med_b?:string };
type AllergyHit = { medicine:string; allergen:string };
type SaleItem = { id?:number; medicine_id:number; medicine_name:string; qty:number; unit_price:number; returned_qty?:number; item_discount?:number };
type SaleReturn = { id:number; sale_id:number; date:string; reason?:string; total_refund:number; created_by:string };
type Sale = { id:number; date:string; items:SaleItem[]; total:number; payment_method:"cash"|"card"|"insurance"; prescription_id?:string; patient_name?:string; discount:number; cashier:string; returns?:SaleReturn[]; paid_cash?:number; paid_card?:number; paid_insurance?:number; coupon_code?:string; coupon_discount?:number };
type ScanNotif = { type:"success"|"error"|"info"|"warning"; message:string; sub?:string }|null;
type SysAlert = { id:number; type:"low_stock"|"expiring"|"out_of_stock"; medicine_id:number; medicine_name:string; detail:string; date:string; read:boolean };

// ── بيانات الصيدلية تُحمَّل من Supabase عبر loadData() ──

const CAT:{[k:string]:{ar:string;en:string;color:string}} = {
  antibiotics:  {ar:"مضادات حيوية",    en:"Antibiotics",   color:"#c0392b"},
  analgesics:   {ar:"مسكنات وخافضات",  en:"Analgesics",    color:"#d35400"},
  chronic:      {ar:"أمراض مزمنة",     en:"Chronic",       color:"#8e44ad"},
  cardiac:      {ar:"قلب وضغط",        en:"Cardiac",       color:"#a93226"},
  diabetes:     {ar:"سكري",            en:"Diabetes",      color:"#1f618d"},
  vitamins:     {ar:"فيتامينات ومكملات",en:"Vitamins",     color:"#1e8449"},
  syrups:       {ar:"شرابات",          en:"Syrups",        color:"#b7770d"},
  injections:   {ar:"حقن وأمصال",      en:"Injections",    color:"#5b2c6f"},
  topical:      {ar:"مراهم وموضعية",   en:"Topical",       color:"#2471a3"},
  dermatology:  {ar:"جلدية",           en:"Dermatology",   color:"#884ea0"},
  pediatric:    {ar:"أطفال ورضّع",     en:"Pediatric",     color:"#117a65"},
  digestive:    {ar:"جهاز هضمي",       en:"Digestive",     color:"#9c640c"},
  respiratory:  {ar:"تنفسية",          en:"Respiratory",   color:"#2e86c1"},
  eye_ear:      {ar:"عين وأذن",        en:"Eye & Ear",     color:"#148f77"},
  womens_health:{ar:"صحة المرأة",      en:"Women's Health",color:"#af3f74"},
  cosmetics:    {ar:"تجميل وعناية",    en:"Cosmetics",     color:"#6c5b7b"},
  supplies:     {ar:"مستلزمات طبية",   en:"Supplies",      color:"#566573"},
  other:        {ar:"أخرى",            en:"Other",         color:"#7f8c8d"},
};

const ROLE:{[k:string]:{ar:string;en:string;color:string;tabs:string[]}} = {
  pharmacist:{ar:"صيدلاني",en:"Pharmacist",color:"#0863ba",tabs:["inventory","prescriptions","sales","reorder","alerts"]},
  manager:   {ar:"مدير",   en:"Manager",   color:"#8e44ad",tabs:["inventory","prescriptions","sales","suppliers","reorder","reports","alerts"]},
  doctor:    {ar:"طبيب",   en:"Doctor",    color:"#27ae60",tabs:["prescriptions","alerts"]},
};

const isSoon = (d?:string|null) => { if(!d) return false; const x=new Date(); x.setDate(x.getDate()+30); return new Date(d)<=x; };
const isExp  = (d?:string|null) => { if(!d) return false; return new Date(d)<new Date(); };
// الصلاحية الفعلية: أقرب دفعة انتهاءً إن وُجدت، وإلا الحقل القديم (توافق رجعي)
const medExpiry = (m:Medicine):string|null => m.nearest_expiry ?? m.expiry_date ?? null;

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

// ══════════════════════════════════════════════════════════════
// 💳 بطاقة نتيجة المسح — تظهر على كل الأجهزة بعد قراءة الباركود
// ══════════════════════════════════════════════════════════════
function ScanResultCard({code,med,isAr,onClose,onAddNew,onSell,onReturn}:{code:string;med:Medicine|null;isAr:boolean;onClose:()=>void;onAddNew:(code:string)=>void;onSell:(med:Medicine)=>void;onReturn:(med:Medicine)=>void}) {
  useEffect(()=>{ const t=setTimeout(onClose, med?9000:20000); return()=>clearTimeout(t); },[onClose,med]);
  const cat = med?CAT[med.category]:null;
  const low = med? med.stock<med.min_stock : false;
  const expired = med?.expiry_date ? new Date(med.expiry_date) < new Date() : false;
  return (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{position:"absolute",inset:0,background:"rgba(10,20,35,.55)",backdropFilter:"blur(5px)"}} onClick={onClose}/>
      <div style={{position:"relative",width:"min(94vw,430px)",borderRadius:24,overflow:"hidden",boxShadow:"0 30px 90px rgba(0,0,0,.45)",animation:"modalIn .28s cubic-bezier(.34,1.4,.64,1) both",background:"#fff",fontFamily:"'Rubik',sans-serif"}}>
        {med ? (<>
          {/* رأس البطاقة */}
          <div style={{background:"linear-gradient(135deg,#0863ba,#0a4f96)",padding:"18px 20px 16px",color:"#fff",position:"relative"}}>
            <button type="button" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onClose();}} style={{position:"absolute",top:10,insetInlineEnd:10,width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:15,zIndex:5,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            <div style={{fontSize:11,opacity:.75,fontWeight:600,letterSpacing:.5,marginBottom:4}}>{isAr?"✓ تم مسح الباركود":"✓ Barcode scanned"}</div>
            <div style={{fontSize:19,fontWeight:800,lineHeight:1.3}}>{isAr?med.name_ar:(med.name_en||med.name_ar)}</div>
            {med.manufacturer&&<div style={{fontSize:11,opacity:.7,marginTop:2}}>{med.manufacturer}</div>}
          </div>
          {/* السعر — العنصر الأهم */}
          <div style={{textAlign:"center",padding:"22px 20px 14px",background:"linear-gradient(180deg,#f4f9ff,#fff)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#8aa2b8",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>{isAr?"سعر البيع":"Price"}</div>
            <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:7}}>
              <span style={{fontSize:52,fontWeight:900,color:"#0863ba",lineHeight:1,letterSpacing:-1}}>{med.sell_price}</span>
              <span style={{fontSize:16,fontWeight:700,color:"#7a93ab"}}>{isAr?"ل.س":"SYP"}</span>
            </div>
          </div>
          {/* المواصفات */}
          <div style={{padding:"4px 20px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            {[
              {l:isAr?"الفئة":"Category", v:cat?(isAr?cat.ar:cat.en):"—", c:"#555"},
              {l:isAr?"الوحدة":"Unit", v:med.unit||"—", c:"#555"},
              {l:isAr?"المخزون":"Stock", v:`${med.stock} ${med.unit||""}`, c:low?"#e67e22":"#27ae60"},
              {l:isAr?"الصلاحية":"Expiry", v:med.expiry_date||(isAr?"غير محدد":"N/A"), c:expired?"#e74c3c":"#555"},
            ].map((r,i)=>(
              <div key={i} style={{background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:12,padding:"9px 12px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#9aa8b6",marginBottom:2}}>{r.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:r.c}}>{r.v}</div>
              </div>
            ))}
          </div>
          {(low||expired)&&<div style={{margin:"0 20px 14px",background:expired?"rgba(231,76,60,.09)":"rgba(230,126,34,.09)",border:`1.5px solid ${expired?"#e74c3c55":"#e67e2255"}`,borderRadius:11,padding:"8px 12px",fontSize:12,fontWeight:700,color:expired?"#c0392b":"#a04000"}}>{expired?(isAr?"🚫 هذا الدواء منتهي الصلاحية":"🚫 Expired medicine"):(isAr?"⚠️ المخزون منخفض":"⚠️ Low stock")}</div>}
          <div style={{padding:"0 20px 12px",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{flex:1,background:"#f7f9fc",border:"1px solid #e8ecf0",borderRadius:9,padding:"6px 10px",fontFamily:"monospace",fontSize:12,letterSpacing:1.2,color:"#0863ba",fontWeight:700,direction:"ltr",textAlign:"center"}}>{code}</div>
            <BarcodeSVG code={code} w={96} h={34}/>
          </div>
          <div style={{padding:"0 20px 18px",display:"flex",gap:9}}>
            <button onClick={()=>onSell(med)} style={{flex:1.4,padding:"13px",background:"linear-gradient(135deg,#8e44ad,#7a35a0)",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:"0 5px 18px rgba(142,68,173,.35)"}}>🛒 {isAr?"بيع":"Sell"}</button>
            <button onClick={()=>onReturn(med)} style={{flex:1,padding:"13px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"2px solid rgba(230,126,34,.35)",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:800,cursor:"pointer"}}>↩️ {isAr?"إعادة":"Return"}</button>
          </div>
        </>) : (<>
          {/* باركود غير مسجّل */}
          <div style={{background:"linear-gradient(135deg,#e67e22,#cf6a12)",padding:"18px 20px 16px",color:"#fff",position:"relative"}}>
            <button type="button" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onClose();}} style={{position:"absolute",top:10,insetInlineEnd:10,width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.2)",color:"#fff",cursor:"pointer",fontSize:15,zIndex:5,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            <div style={{fontSize:26,marginBottom:5}}>📦</div>
            <div style={{fontSize:17,fontWeight:800}}>{isAr?"باركود غير مسجّل":"Unregistered barcode"}</div>
            <div style={{fontSize:12,opacity:.8,marginTop:3}}>{isAr?"هذا الكود غير موجود في المخزون":"This code is not in your inventory"}</div>
          </div>
          <div style={{padding:"18px 20px"}}>
            <div style={{background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:11,padding:"10px 12px",fontFamily:"monospace",fontSize:14,letterSpacing:1.5,color:"#0863ba",fontWeight:800,direction:"ltr",textAlign:"center",marginBottom:14}}>{code}</div>
            <button onClick={()=>onAddNew(code)} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#27ae60,#1e8f4d)",color:"#fff",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 6px 20px rgba(39,174,96,.35)"}}>＋ {isAr?"إضافة للمخزون":"Add to Inventory"}</button>
            <button onClick={onClose} style={{width:"100%",marginTop:9,padding:"11px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer"}}>{isAr?"إغلاق":"Close"}</button>
          </div>
        </>)}
      </div>
    </div>
  );
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
              <tr style={{background:"rgba(8,99,186,.07)"}}><td colSpan={3} style={{padding:"9px 10px",fontSize:14,fontWeight:800,color:"#1a2840"}}>{isAr?"الإجمالي":"Total"}</td><td style={{padding:"9px 10px",fontSize:16,fontWeight:900,textAlign:"center",color:"#0863ba"}}>{total} {isAr?"ل.س":"SYP"}</td></tr>
              {isPurch&&invoice&&invoice.status!=="paid"&&<tr style={{background:"rgba(231,76,60,.04)"}}><td colSpan={3} style={{padding:"7px 10px",fontSize:12,color:"#e74c3c"}}>{isAr?"المتبقي":"Outstanding"}</td><td style={{padding:"7px 10px",fontSize:12,textAlign:"center",color:"#e74c3c",fontWeight:700}}>{invoice.total-invoice.paid} {isAr?"ل.س":"SYP"}</td></tr>}
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
function MedModal({lang,medicine,initialBarcode,onSave,onClose}:{lang:Lang;medicine:Medicine|null;initialBarcode?:string;onSave:(m:Partial<Medicine>)=>void;onClose:()=>void}) {
  const isAr=lang==="ar"; const bRef=useRef<HTMLInputElement>(null);
  const [form,setForm]=useState<Partial<Medicine>>(medicine??{category:"other",unit:"قرص",stock:0,min_stock:20,purchase_price:0,sell_price:0,barcode:initialBarcode||""});
  const [flash,setFlash]=useState(false);
  const set=(k:string,v:any)=>setForm(f=>({...f,[k]:v}));
  const genBC=()=>{const c="628"+String(Date.now()).slice(-9);set("barcode",c);setFlash(true);setTimeout(()=>setFlash(false),500);};
  const inp:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"};
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"clamp(16px,4vw,26px)",width:"min(96vw,560px)",maxHeight:"92dvh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{fontSize:16,fontWeight:800,color:"#1a2840",display:"flex",alignItems:"center",gap:9}}><span style={{width:34,height:34,borderRadius:10,background:"rgba(8,99,186,.09)",color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.box size={17}/></span>{medicine?(isAr?"تعديل دواء":"Edit Medicine"):(isAr?"إضافة دواء":"Add Medicine")}</h2>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",color:"#8a94a0",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.close size={15}/></button>
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
        <div className="med-form-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"اسم الدواء *":"Name *"}</label><input value={form.name_ar||""} onChange={e=>set("name_ar",e.target.value)} style={{...inp,direction:"rtl"}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الفئة":"Category"}</label><select value={form.category||"other"} onChange={e=>set("category",e.target.value)} style={{...inp,background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>{Object.entries(CAT).map(([k,v])=><option key={k} value={k}>{isAr?v.ar:v.en}</option>)}</select></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الوحدة":"Unit"}</label><input value={form.unit||""} onChange={e=>set("unit",e.target.value)} style={{...inp,direction:"rtl"}}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"سعر الشراء":"Buy"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={form.purchase_price||""} onChange={e=>set("purchase_price",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"سعر البيع":"Sell"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={form.sell_price||""} onChange={e=>set("sell_price",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المخزون":"Stock"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={form.stock||""} onChange={e=>set("stock",Number(e.target.value))} style={inp}/></div>
          <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"الحد الأدنى":"Min"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={form.min_stock||""} onChange={e=>set("min_stock",Number(e.target.value))} style={inp}/></div>
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
  const isAr=lang==="ar"; const [qty,setQty]=useState(1); const isIn=mode==="in"; const c=isIn?"#27ae60":"#e67e22";
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(92vw,390px)",boxShadow:"0 24px 80px rgba(0,0,0,.2)",animation:"modalIn .2s ease"}}>
        <div style={{textAlign:"center",marginBottom:18}}><div style={{width:52,height:52,margin:"0 auto 9px",borderRadius:15,background:`${c}12`,color:c,display:"flex",alignItems:"center",justifyContent:"center"}}>{isIn?<Icons.stockIn size={26}/>:<Icons.stockOut size={26}/>}</div><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>{isIn?(isAr?"إضافة للمخزون":"Stock In"):(isAr?"خصم من المخزون":"Stock Out")}</h2><p style={{fontSize:12,color:"#888",marginTop:3}}>{isAr?medicine.name_ar:medicine.name_en}</p></div>
        <div style={{background:"#f7f9fc",borderRadius:11,padding:"11px 15px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:"#888",fontWeight:600}}>{isAr?"المخزون الحالي":"Current"}</span><span style={{fontSize:17,fontWeight:800,color:medicine.stock<medicine.min_stock?"#e67e22":"#353535"}}>{medicine.stock} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{medicine.unit}</span></span></div>
        <div style={{marginBottom:15}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:42,height:42,borderRadius:11,border:`2px solid ${c}40`,background:`${c}10`,cursor:"pointer",fontSize:20,fontWeight:700,color:c,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} value={qty||""} onChange={e=>setQty(Math.max(0,Number(e.target.value)))} style={{flex:1,padding:"10px",border:`2px solid ${c}40`,borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:20,fontWeight:800,color:c,textAlign:"center",outline:"none"}}/>
            <button onClick={()=>setQty(q=>q+1)} style={{width:42,height:42,borderRadius:11,border:`2px solid ${c}40`,background:`${c}10`,cursor:"pointer",fontSize:20,fontWeight:700,color:c,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
          <div style={{display:"flex",gap:5}}>{[5,10,20,50,100].map(n=>(<button key={n} onClick={()=>setQty(n)} style={{flex:1,padding:"5px",borderRadius:7,border:`1.5px solid ${c}30`,background:qty===n?`${c}15`:"transparent",color:qty===n?c:"#aaa",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{n}</button>))}</div>
        </div>
        <div style={{background:`${c}08`,borderRadius:11,padding:"9px 13px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1.5px solid ${c}25`}}><span style={{fontSize:12,color:"#888"}}>{isAr?"بعد التعديل":"After"}</span><span style={{fontSize:15,fontWeight:800,color:c}}>{isIn?medicine.stock+qty:Math.max(0,medicine.stock-qty)} <span style={{fontSize:10,fontWeight:400,color:"#aaa"}}>{medicine.unit}</span></span></div>
        <div style={{display:"flex",gap:9}}>
          <button onClick={()=>{if(qty>=1)onConfirm(qty);}} style={{flex:1,padding:"12px",background:c,color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 13px ${c}40`}}>{isAr?"تأكيد":"Confirm"}</button>
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
  const [stmtSup,setStmtSup]=useState<Supplier|null>(null);
  const [stmtData,setStmtData]=useState<{invoices:PurchInvoice[];payments:{id:number;amount:number;date:string;method:string;notes?:string;created_by:string}[];totalInvoiced:number;totalPaid:number;balance:number}|null>(null);
  const [payAmount,setPayAmount]=useState(""); const [payNotes,setPayNotes]=useState("");
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

  const openStatement=async(s:Supplier)=>{
    setStmtSup(s); setStmtData(null); setPayAmount(""); setPayNotes("");
    if(!userId) return;
    const res=await fetch(`/api/pharmacy/supplier-payments?user_id=${userId}&supplier_id=${s.id}`);
    const json=await res.json();
    setStmtData(json);
  };
  const addPayment=async()=>{
    if(!userId||!stmtSup||!payAmount||Number(payAmount)<=0) return;
    const created_by=isAr?currentUser.name_ar:currentUser.name_en;
    const res=await fetch("/api/pharmacy/supplier-payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,supplier_id:stmtSup.id,amount:Number(payAmount),notes:payNotes||null,created_by})});
    const json=await res.json();
    if(json.success){ setPayAmount(""); setPayNotes(""); openStatement(stmtSup); onRefresh(); }
  };

  const card:React.CSSProperties={background:"#fff",borderRadius:14,padding:"15px 17px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)"};
  const inp:React.CSSProperties={width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"};
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={()=>setView("s")} className={view==="s"?"tab-btn active":"tab-btn"}>🏭 {isAr?"الموردون":"Suppliers"}</button>
        <button onClick={()=>setView("i")} className={view==="i"?"tab-btn active":"tab-btn"}>🧾 {isAr?"فواتير الشراء":"Invoices"}</button>
        <button onClick={()=>view==="s"?(setShowSF(true),setEditSup(null)):(setShowIF(true))}
          className="btn-primary-lg" style={{marginRight:"auto",background:"#0863ba",boxShadow:"0 4px 16px rgba(8,99,186,.35)"}}>＋ {view==="s"?(isAr?"مورد جديد":"New Supplier"):(isAr?"فاتورة شراء":"New Invoice")}
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
                <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"الرصيد":"Balance"}</div><div style={{fontSize:15,fontWeight:800,color:s.balance>0?"#e74c3c":"#27ae60"}}>{s.balance} {isAr?"ل.س":"SYP"}</div></div>
                <button onClick={()=>openStatement(s)} className="action-icon-btn" title={isAr?"كشف حساب":"Statement"} style={{color:"#0863ba",borderColor:"rgba(8,99,186,.3)"}}>📋</button>
                <button onClick={()=>{setEditSup(s);setSF({name:s.name,contact:s.contact,phone:s.phone,email:s.email,address:s.address});setShowSF(true);}} className="action-icon-btn">✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view==="i"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
            {[{l:isAr?"الفواتير":"Invoices",v:invoices.length,ic:"🧾",c:"#0863ba"},{l:isAr?"إجمالي الشراء":"Purchases",v:invoices.reduce((s,i)=>s+i.total,0)+" "+(isAr?"ل.س":"SYP"),ic:"💰",c:"#27ae60"},{l:isAr?"مستحق":"Outstanding",v:invoices.filter(i=>i.status!=="paid").reduce((s,i)=>s+(i.total-i.paid),0)+" "+(isAr?"ل.س":"SYP"),ic:"⏳",c:"#e74c3c"}].map((x,i)=>(
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
                      <div style={{textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"الإجمالي":"Total"}</div><div style={{fontSize:15,fontWeight:800,color:"#0863ba"}}>{inv.total} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{isAr?"ل.س":"SYP"}</span></div></div>
                      <button onClick={()=>setPrintInv(inv)} style={{padding:"7px 13px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>🖨️ {isAr?"طباعة":"Print"}</button>
                    </div>
                  </div>
                  <div style={{padding:"11px 17px"}}>
                    {inv.items.map((it,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:i<inv.items.length-1?"1px solid #f7f9fc":"none"}}><span style={{fontSize:12,color:"#555",fontWeight:600}}>💊 {it.medicine_name}</span><span style={{fontSize:12,color:"#888"}}>{it.qty} × {it.unit_price} = <strong style={{color:"#0863ba"}}>{it.qty*it.unit_price}</strong></span></div>))}
                    {inv.status!=="paid"&&<div style={{marginTop:8,fontSize:11,color:"#e74c3c",fontWeight:600}}>💰 {isAr?"المتبقي":"Remaining"}: {inv.total-inv.paid} {isAr?"ل.س":"SYP"}</div>}
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

      {stmtSup&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setStmtSup(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"24px",width:"min(96vw,560px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>📋 {isAr?"كشف حساب":"Statement"} — {stmtSup.name}</h2><button onClick={()=>setStmtSup(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            {!stmtData?(
              <div style={{textAlign:"center",padding:20,color:"#aaa"}}>{isAr?"جارِ التحميل...":"Loading..."}</div>
            ):(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                  <div style={{...card,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"إجمالي الفواتير":"Invoiced"}</div><div style={{fontSize:14,fontWeight:800,color:"#0863ba"}}>{stmtData.totalInvoiced}</div></div>
                  <div style={{...card,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"إجمالي المدفوع":"Paid"}</div><div style={{fontSize:14,fontWeight:800,color:"#27ae60"}}>{stmtData.totalPaid}</div></div>
                  <div style={{...card,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:11,color:"#aaa"}}>{isAr?"الرصيد المتبقي":"Balance"}</div><div style={{fontSize:14,fontWeight:800,color:stmtData.balance>0?"#e74c3c":"#27ae60"}}>{stmtData.balance}</div></div>
                </div>

                <div style={{fontSize:12,fontWeight:700,color:"#888",marginBottom:6}}>{isAr?"الفواتير":"Invoices"}</div>
                <div style={{marginBottom:16,maxHeight:150,overflowY:"auto"}}>
                  {stmtData.invoices.length===0?<div style={{fontSize:12,color:"#ccc",padding:8}}>{isAr?"لا فواتير":"None"}</div>:stmtData.invoices.map(inv=>{
                    const ss=stSt[inv.status];
                    return (<div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 4px",borderBottom:"1px solid #f0f2f5",fontSize:12}}>
                      <span>INV-{inv.id} · {inv.date} <span style={{padding:"1px 7px",borderRadius:20,background:ss.bg,color:ss.c,fontWeight:700,fontSize:10,marginInlineStart:5}}>{isAr?ss.ar:ss.en}</span></span>
                      <span style={{fontWeight:700}}>{inv.total} <span style={{color:"#aaa",fontWeight:400}}>({isAr?"مدفوع":"paid"} {inv.paid})</span></span>
                    </div>);
                  })}
                </div>

                <div style={{fontSize:12,fontWeight:700,color:"#888",marginBottom:6}}>{isAr?"الدفعات":"Payments"}</div>
                <div style={{marginBottom:16,maxHeight:120,overflowY:"auto"}}>
                  {stmtData.payments.length===0?<div style={{fontSize:12,color:"#ccc",padding:8}}>{isAr?"لا دفعات":"None"}</div>:stmtData.payments.map(p=>(
                    <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 4px",borderBottom:"1px solid #f0f2f5",fontSize:12}}>
                      <span style={{color:"#666"}}>{p.date} · {p.created_by}{p.notes?` · ${p.notes}`:""}</span>
                      <span style={{fontWeight:700,color:"#27ae60"}}>+{p.amount}</span>
                    </div>
                  ))}
                </div>

                <div style={{background:"#f7f9fc",borderRadius:12,padding:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#888",marginBottom:8}}>{isAr?"تسجيل دفعة جديدة":"Record New Payment"}</div>
                  <div style={{display:"flex",gap:8}}>
                    <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder={isAr?"المبلغ":"Amount"} style={{flex:1,padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/>
                    <input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder={isAr?"ملاحظة":"Note"} style={{flex:1,padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/>
                    <button onClick={addPayment} style={{padding:"9px 16px",background:"#27ae60",color:"#fff",border:"none",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>＋ {isAr?"إضافة":"Add"}</button>
                  </div>
                </div>
              </div>
            )}
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
              {iMedRes.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.12)",border:"1.5px solid #eef0f3",overflow:"hidden",marginTop:4}}>{iMedRes.map(m=>(<div key={m.id} onClick={()=>addII(m)} style={{padding:"9px 13px",cursor:"pointer",fontSize:13,display:"flex",justifyContent:"space-between"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f7f9fc"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}><span style={{fontWeight:600}}>{isAr?m.name_ar:m.name_en}</span><span style={{color:"#888",fontSize:11}}>{m.purchase_price} {isAr?"ل.س":"SYP"}</span></div>))}</div>}
            </div>
            {iItems.length>0&&<div style={{background:"#f7f9fc",borderRadius:12,padding:"11px",marginBottom:12}}>{iItems.map((it,i)=>(<div key={i} style={{marginBottom:i<iItems.length-1?10:0,paddingBottom:i<iItems.length-1?10:0,borderBottom:i<iItems.length-1?"1px solid #eef0f3":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,fontSize:12,fontWeight:600,color:"#353535"}}>{it.medicine_name}</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <button onClick={()=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,qty:Math.max(1,x.qty-1)}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
                  <span style={{fontSize:13,fontWeight:700,minWidth:28,textAlign:"center"}}>{it.qty}</span>
                  <button onClick={()=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,qty:x.qty+1}:x))} style={{width:24,height:24,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={it.unit_price} onChange={e=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,unit_price:Number(e.target.value)}:x))} style={{width:65,padding:"4px 8px",border:"1.5px solid #e0e7ef",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",textAlign:"center"}}/>
                <span style={{fontSize:11,color:"#27ae60",fontWeight:700,minWidth:55,textAlign:"center"}}>{(it.qty*it.unit_price).toFixed(0)}</span>
                <button onClick={()=>setIItems(p=>p.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:15}}>✕</button>
              </div>
              <div style={{display:"flex",gap:8,marginTop:6,paddingRight:2}}>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
                  <label style={{fontSize:9,color:"#aaa",fontWeight:600}}>{isAr?"تاريخ الانتهاء":"Expiry"}</label>
                  <input type="date" value={it.expiry_date||""} onChange={e=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,expiry_date:e.target.value}:x))} style={{padding:"4px 6px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:11,outline:"none"}}/>
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}>
                  <label style={{fontSize:9,color:"#aaa",fontWeight:600}}>{isAr?"رقم الدفعة (اختياري)":"Batch no."}</label>
                  <input value={it.batch_no||""} onChange={e=>setIItems(p=>p.map((x,xi)=>xi===i?{...x,batch_no:e.target.value}:x))} placeholder={isAr?"مثال: L2024A":"e.g. L2024A"} style={{padding:"4px 6px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:11,outline:"none",direction:isAr?"rtl":"ltr"}}/>
                </div>
              </div>
            </div>))}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المدفوع":"Paid"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} max={iTotal} value={iPaid||""} onChange={e=>setIPaid(Number(e.target.value))} style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/></div>
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
// ══════════════ تبويب إعادة الطلب: توقع النفاد + أوامر شراء مقترحة + أفضل مورد ══════════════
type SupPrice = { supplier_id:number; supplier_name:string; unit_price:number; last_date:string };
type ReorderRow = {
  medicine_id:number; name_ar:string; name_en:string; unit:string;
  stock:number; min_stock:number; avg_cost:number;
  daily_rate:number; days_left:number|null; reorder_point:number;
  needs_reorder:boolean; suggested_qty:number;
  best_supplier:SupPrice|null; supplier_prices:SupPrice[]; est_cost:number|null;
};

function ReorderTab({lang,userId,suppliers,currentUser,onRefresh}:{lang:Lang;userId:string|null;suppliers:Supplier[];currentUser:User;onRefresh:()=>void}) {
  const isAr=lang==="ar";
  const [win,setWin]=useState(90);
  const [rows,setRows]=useState<ReorderRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [meta,setMeta]=useState<{lead_time_days:number;cover_days:number}|null>(null);
  const [onlyNeeds,setOnlyNeeds]=useState(true);
  const [expanded,setExpanded]=useState<number|null>(null);
  const [cart,setCart]=useState<Record<number,{qty:number;supplier_id:number}>>({});
  const [creating,setCreating]=useState(false);
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    if(!userId) return;
    setLoading(true);
    try{
      const res=await fetch(`/api/pharmacy/reorder?user_id=${userId}&window=${win}`);
      const json=await res.json();
      setRows(json.analysis||[]);
      setMeta({lead_time_days:json.lead_time_days,cover_days:json.cover_days});
    }catch{setRows([]);}
    setLoading(false);
  },[userId,win]);
  useEffect(()=>{load();},[load]);

  const shown=onlyNeeds?rows.filter(r=>r.needs_reorder):rows;
  const inCart=(id:number)=>cart[id]!==undefined;

  const toggleCart=(r:ReorderRow)=>{
    setCart(prev=>{
      const n={...prev};
      if(n[r.medicine_id]) delete n[r.medicine_id];
      else n[r.medicine_id]={qty:r.suggested_qty||1,supplier_id:r.best_supplier?.supplier_id||suppliers[0]?.id||0};
      return n;
    });
  };
  const setCartQty=(id:number,qty:number)=>setCart(p=>({...p,[id]:{...p[id],qty:Math.max(1,qty)}}));
  const setCartSup=(id:number,sid:number)=>setCart(p=>({...p,[id]:{...p[id],supplier_id:sid}}));

  // تجميع السلة حسب المورد → إنشاء فاتورة شراء لكل مورد
  const createOrders=async()=>{
    if(!userId||Object.keys(cart).length===0) return;
    setCreating(true); setMsg("");
    const bySupplier:Record<number,{medicine_id:number;medicine_name:string;qty:number;unit_price:number}[]>={};
    for(const [midStr,c] of Object.entries(cart)){
      const mid=Number(midStr); const r=rows.find(x=>x.medicine_id===mid); if(!r||!c.supplier_id) continue;
      const sp=r.supplier_prices.find(s=>s.supplier_id===c.supplier_id);
      (bySupplier[c.supplier_id] ||= []).push({
        medicine_id:mid, medicine_name:isAr?r.name_ar:r.name_en,
        qty:c.qty, unit_price:sp?.unit_price ?? r.avg_cost ?? 0,
      });
    }
    let created=0;
    for(const [sidStr,items] of Object.entries(bySupplier)){
      const sid=Number(sidStr); const sup=suppliers.find(s=>s.id===sid);
      const total=items.reduce((s,x)=>s+x.qty*x.unit_price,0);
      const res=await fetch("/api/pharmacy/invoices",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action:"add",user_id:userId,supplier_id:sid,supplier_name:sup?.name||"",
          date:new Date().toISOString().slice(0,10),items,total,paid:0,status:"pending",
          notes:isAr?"أمر شراء مقترح تلقائيًا":"Auto-suggested purchase order",
          created_by:isAr?currentUser.name_ar:currentUser.name_en})});
      const json=await res.json(); if(json.success) created++;
    }
    setCreating(false); setCart({});
    setMsg(isAr?`✅ تم إنشاء ${created} فاتورة شراء`:`✅ Created ${created} purchase invoice(s)`);
    onRefresh(); load();
    setTimeout(()=>setMsg(""),4000);
  };

  const cartCount=Object.keys(cart).length;
  const cartTotal=Object.entries(cart).reduce((s,[mid,c])=>{
    const r=rows.find(x=>x.medicine_id===Number(mid));
    const sp=r?.supplier_prices.find(x=>x.supplier_id===c.supplier_id);
    return s+(c.qty*(sp?.unit_price??r?.avg_cost??0));
  },0);

  const urgency=(r:ReorderRow)=>{
    if(r.days_left===null) return {c:"#7f8c8d",bg:"rgba(127,140,141,.1)",t:isAr?"لا بيانات":"No data"};
    if(r.days_left<=(meta?.lead_time_days||7)) return {c:"#e74c3c",bg:"rgba(231,76,60,.1)",t:isAr?"عاجل":"Urgent"};
    if(r.days_left<=14) return {c:"#e67e22",bg:"rgba(230,126,34,.1)",t:isAr?"قريبًا":"Soon"};
    return {c:"#27ae60",bg:"rgba(39,174,96,.1)",t:isAr?"جيد":"OK"};
  };

  return (
    <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 3px 16px rgba(8,99,186,.06)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontSize:16,fontWeight:800,color:"#353535"}}>🔄 {isAr?"التوقع وإعادة الطلب":"Forecast & Reorder"}</h2>
          <p style={{fontSize:11,color:"#aaa",marginTop:3}}>
            {isAr?`توقع النفاد بناءً على معدل الاستهلاك (آخر ${win} يوم) · مهلة توريد ${meta?.lead_time_days||7} يوم`:`Depletion forecast · last ${win} days · lead time ${meta?.lead_time_days||7}d`}
          </p>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <div style={{display:"flex",background:"#f2f5f9",borderRadius:9,padding:2}}>
            {[30,60,90].map(w=>(
              <button key={w} onClick={()=>setWin(w)} style={{padding:"6px 12px",border:"none",borderRadius:7,cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,background:win===w?"#0863ba":"transparent",color:win===w?"#fff":"#888"}}>{w}{isAr?"ي":"d"}</button>
            ))}
          </div>
        </div>
      </div>

      {msg&&<div style={{background:"rgba(39,174,96,.1)",border:"1px solid rgba(39,174,96,.3)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#27ae60",fontWeight:700}}>{msg}</div>}

      <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <button onClick={()=>setOnlyNeeds(!onlyNeeds)} style={{padding:"7px 13px",border:`1.5px solid ${onlyNeeds?"#0863ba":"#e0e7ef"}`,borderRadius:9,cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:600,background:onlyNeeds?"rgba(8,99,186,.07)":"#fff",color:onlyNeeds?"#0863ba":"#888"}}>
          {onlyNeeds?(isAr?"✓ يحتاج طلب فقط":"✓ Needs reorder only"):(isAr?"عرض الكل":"Show all")}
        </button>
        <span style={{fontSize:12,color:"#aaa"}}>{shown.length} {isAr?"صنف":"items"}</span>
      </div>

      {loading?(
        <div style={{textAlign:"center",padding:"40px",color:"#ccc"}}>{isAr?"⏳ جاري التحليل...":"⏳ Analyzing..."}</div>
      ):shown.length===0?(
        <div style={{textAlign:"center",padding:"40px",color:"#ccc"}}>
          <div style={{fontSize:30,marginBottom:8}}>✅</div>
          <div>{isAr?"لا توجد أصناف تحتاج إعادة طلب":"Nothing needs reordering"}</div>
          {onlyNeeds&&<div style={{fontSize:11,marginTop:6}}>{isAr?"أو لا يوجد سجل مبيعات كافٍ للتوقع بعد":"Or not enough sales history yet"}</div>}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {shown.map(r=>{
            const u=urgency(r); const open=expanded===r.medicine_id; const chosen=cart[r.medicine_id];
            return (
              <div key={r.medicine_id} style={{border:`1.5px solid ${inCart(r.medicine_id)?"#0863ba":"#eef0f3"}`,borderRadius:12,padding:"12px 14px",background:inCart(r.medicine_id)?"rgba(8,99,186,.03)":"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontSize:14,fontWeight:700,color:"#353535"}}>{isAr?r.name_ar:r.name_en}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:u.bg,color:u.c}}>{u.t}</span>
                    </div>
                    <div style={{display:"flex",gap:12,marginTop:6,flexWrap:"wrap",fontSize:11,color:"#888"}}>
                      <span>{isAr?"المخزون":"Stock"}: <strong style={{color:r.stock<=r.reorder_point?"#e67e22":"#353535"}}>{r.stock}</strong> {isAr?r.unit:""}</span>
                      <span>{isAr?"استهلاك يومي":"Daily"}: <strong style={{color:"#0863ba"}}>{r.daily_rate}</strong></span>
                      <span>{isAr?"يكفي لـ":"Days left"}: <strong style={{color:u.c}}>{r.days_left===null?(isAr?"—":"—"):`${r.days_left} ${isAr?"يوم":"d"}`}</strong></span>
                      <span>{isAr?"نقطة الطلب":"ROP"}: <strong>{r.reorder_point}</strong></span>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {r.needs_reorder&&<div style={{textAlign:"center"}}>
                      <div style={{fontSize:10,color:"#aaa"}}>{isAr?"مقترح":"Suggest"}</div>
                      <div style={{fontSize:16,fontWeight:800,color:"#0863ba"}}>{r.suggested_qty}</div>
                    </div>}
                    <button onClick={()=>toggleCart(r)} disabled={!r.needs_reorder&&r.suggested_qty===0} style={{padding:"8px 14px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,background:inCart(r.medicine_id)?"#e74c3c":"#0863ba",color:"#fff",whiteSpace:"nowrap"}}>
                      {inCart(r.medicine_id)?(isAr?"إزالة":"Remove"):(isAr?"＋ للطلب":"＋ Order")}
                    </button>
                  </div>
                </div>

                {/* أفضل مورد + توسيع المقارنة */}
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px dashed #eef0f3"}}>
                  {r.best_supplier?(
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:12,color:"#555"}}>
                        🏆 {isAr?"أفضل سعر":"Best price"}: <strong style={{color:"#27ae60"}}>{r.best_supplier.supplier_name}</strong> — {r.best_supplier.unit_price} {isAr?"ل.س":"SYP"}
                        {r.est_cost!==null&&inCart(r.medicine_id)&&<span style={{color:"#aaa"}}> · {isAr?"تكلفة الطلب":"Est"}: {(chosen.qty*(r.supplier_prices.find(s=>s.supplier_id===chosen.supplier_id)?.unit_price??r.best_supplier.unit_price)).toFixed(0)}</span>}
                      </div>
                      {r.supplier_prices.length>1&&<button onClick={()=>setExpanded(open?null:r.medicine_id)} style={{background:"none",border:"none",cursor:"pointer",color:"#0863ba",fontSize:11,fontWeight:700,fontFamily:"'Rubik',sans-serif"}}>{open?(isAr?"إخفاء المقارنة ▲":"Hide ▲"):(isAr?`قارن ${r.supplier_prices.length} موردين ▼`:`Compare ${r.supplier_prices.length} ▼`)}</button>}
                    </div>
                  ):(
                    <div style={{fontSize:11,color:"#bbb"}}>{isAr?"لا يوجد سعر مورد مسجّل — أضف فاتورة شراء لهذا الصنف أولاً":"No supplier price yet"}</div>
                  )}

                  {open&&r.supplier_prices.length>1&&(
                    <div style={{marginTop:8,background:"#fafbfd",borderRadius:9,padding:"8px 10px"}}>
                      {r.supplier_prices.map((sp,i)=>(
                        <div key={sp.supplier_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,padding:"4px 0",borderBottom:i<r.supplier_prices.length-1?"1px solid #eef0f3":"none"}}>
                          <span style={{color:i===0?"#27ae60":"#666",fontWeight:i===0?700:400}}>{i===0?"🏆 ":""}{sp.supplier_name}</span>
                          <span style={{color:"#999",fontSize:10}}>{sp.last_date}</span>
                          <span style={{fontWeight:700,color:i===0?"#27ae60":"#353535"}}>{sp.unit_price} {isAr?"ل.س":"SYP"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* تحكم بالكمية والمورد عند الإضافة للسلة */}
                  {inCart(r.medicine_id)&&(
                    <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:"rgba(8,99,186,.05)",borderRadius:9,padding:"8px 10px"}}>
                      <span style={{fontSize:11,color:"#888",fontWeight:600}}>{isAr?"الكمية":"Qty"}:</span>
                      <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} value={chosen.qty} onChange={e=>setCartQty(r.medicine_id,Number(e.target.value))} style={{width:70,padding:"5px 8px",border:"1.5px solid #d0e4f7",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:12,textAlign:"center",outline:"none"}}/>
                      <span style={{fontSize:11,color:"#888",fontWeight:600}}>{isAr?"المورد":"Supplier"}:</span>
                      <select value={chosen.supplier_id} onChange={e=>setCartSup(r.medicine_id,Number(e.target.value))} style={{padding:"5px 8px",border:"1.5px solid #d0e4f7",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",background:"#fff"}}>
                        {r.supplier_prices.length>0?r.supplier_prices.map(sp=>(
                          <option key={sp.supplier_id} value={sp.supplier_id}>{sp.supplier_name} ({sp.unit_price})</option>
                        )):suppliers.map(s=>(<option key={s.id} value={s.id}>{s.name}</option>))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* شريط السلة السفلي */}
      {cartCount>0&&(
        <div style={{position:"sticky",bottom:0,marginTop:16,background:"#0863ba",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,boxShadow:"0 -4px 16px rgba(8,99,186,.2)"}}>
          <div style={{color:"#fff"}}>
            <div style={{fontSize:13,fontWeight:700}}>{cartCount} {isAr?"صنف في أمر الشراء":"items in order"}</div>
            <div style={{fontSize:11,opacity:.85}}>{isAr?"إجمالي تقديري":"Est total"}: {cartTotal.toFixed(0)} {isAr?"ل.س":"SYP"}</div>
          </div>
          <button onClick={createOrders} disabled={creating} style={{padding:"10px 20px",border:"none",borderRadius:10,cursor:creating?"wait":"pointer",fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:800,background:"#fff",color:"#0863ba"}}>
            {creating?(isAr?"⏳ جاري الإنشاء...":"⏳ Creating..."):(isAr?"🧾 إنشاء فواتير الشراء":"🧾 Create Purchase Orders")}
          </button>
        </div>
      )}
    </div>
  );
}


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
function InventoryTab({lang,medicines,setMedicines,barcodeMode,setBarcodeMode,showNotif,addLog,currentUser,userId,stockLog,broadcastScan,remoteScan,openCamera,pendingAddBarcode,onPendingConsumed,pendingReturnBarcode,onPendingReturnConsumed}:{
  lang:Lang;medicines:Medicine[];setMedicines:React.Dispatch<React.SetStateAction<Medicine[]>>;
  barcodeMode:BarcodeMode;setBarcodeMode:(m:BarcodeMode)=>void;stockLog:StockLog[];
  showNotif:(n:ScanNotif,ms?:number)=>void;addLog:(l:Omit<StockLog,"id">)=>void;currentUser:User;
  userId:string|null;broadcastScan:(code:string,mode:string)=>void;remoteScan:ScanEvent|null;openCamera:()=>void;
  pendingAddBarcode?:string;onPendingConsumed?:()=>void;pendingReturnBarcode?:string;onPendingReturnConsumed?:()=>void;
}) {
  const isAr=lang==="ar";
  const [search,setSearch]=useState(""); const [catF,setCatF]=useState<"all"|MedCat>("all");
  const [statusF,setStatusF]=useState<"all"|"low"|"out"|"expiring">("all");
  const [showModal,setShowModal]=useState(false); const [editMed,setEditMed]=useState<Medicine|null>(null);
  const [delId,setDelId]=useState<number|null>(null); const [adj,setAdj]=useState<{med:Medicine;mode:"in"|"out"}|null>(null);
  const [litId,setLitId]=useState<number|null>(null); const [showLog,setShowLog]=useState(false);
  const [unknownBarcode,setUnknownBarcode]=useState<string>("");

  const handleScan=useCallback((code:string)=>{
    const med=medicines.find(m=>m.barcode===code);
    if(!med){ setUnknownBarcode(code); showNotif({type:"warning",message:isAr?"باركود غير مسجّل":"Unregistered barcode",sub:code},2500); return; }
    setUnknownBarcode("");
    setLitId(med.id); setTimeout(()=>setLitId(null),2000);
    if(barcodeMode==="stock_in") setAdj({med,mode:"in"});
    else if(barcodeMode==="stock_out") setAdj({med,mode:"out"});
    else{setSearch(isAr?med.name_ar:med.name_en);showNotif({type:"success",message:isAr?med.name_ar:med.name_en,sub:`${isAr?"مخزون":"Stock"}: ${med.stock} ${med.unit}`},2000);}
  },[medicines,barcodeMode,isAr,showNotif]);

  // ماسح سلكي محلي: يبثّ ثم يعالج حسب الوضع النشط
  const handleLocalScan=useCallback((code:string)=>{ broadcastScan(code,barcodeMode||"query"); handleScan(code); },[broadcastScan,barcodeMode,handleScan]);
  useBarcode(handleLocalScan,barcodeMode==="inventory"||barcodeMode==="stock_in"||barcodeMode==="stock_out");

  // استقبال مسح من جهاز آخر (أو كاميرا) عندما يكون تبويب المخزون نشطًا
  useEffect(()=>{
    if(!remoteScan)return;
    if(["query","inventory","stock_in","stock_out"].includes(remoteScan.mode)){ handleScan(remoteScan.code); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[remoteScan]);

  // باركود معلّق قادم من تبويب البيع → افتح نموذج إضافة دواء جديد تلقائيًا
  useEffect(()=>{
    if(pendingAddBarcode){ setUnknownBarcode(pendingAddBarcode); setEditMed(null); setShowModal(true); onPendingConsumed?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingAddBarcode]);

  // زر "إعادة" من بطاقة المسح → افتح نافذة إضافة مخزون (مرتجع) للدواء
  useEffect(()=>{
    if(!pendingReturnBarcode) return;
    const med=medicines.find(m=>m.barcode===pendingReturnBarcode);
    if(med) setAdj({med,mode:"in"});
    onPendingReturnConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingReturnBarcode]);

  const filtered=useMemo(()=>{
    let l=medicines;
    if(search.trim()) l=l.filter(m=>m.name_ar.includes(search)||(m.name_en||"").toLowerCase().includes(search.toLowerCase())||m.barcode.includes(search));
    if(catF!=="all") l=l.filter(m=>m.category===catF);
    if(statusF==="low") l=l.filter(m=>m.stock>0&&m.stock<m.min_stock);
    else if(statusF==="out") l=l.filter(m=>m.stock===0);
    else if(statusF==="expiring") l=l.filter(m=>isSoon(medExpiry(m))||isExp(medExpiry(m)));
    return l;
  },[medicines,search,catF,statusF]);

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
    setShowModal(false); setEditMed(null); setUnknownBarcode("");
  };

  const handleAdj=async(qty:number)=>{
    if(!adj) return;
    const{med,mode}=adj;
    if(userId){
      const res=await fetch("/api/pharmacy/medicines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"adjust_stock",user_id:userId,id:med.id,delta:mode==="in"?qty:-qty,medicine_name:med.name_ar,by:isAr?currentUser.name_ar:currentUser.name_en})});
      const json=await res.json();
      if(json.success){
        setMedicines(prev=>prev.map(m=>m.id===med.id?{...m,stock:json.newStock}:m));
      } else { showNotif({type:"error",message:json.error||"Error"},3000); return; }
    } else {
      setMedicines(prev=>prev.map(m=>m.id===med.id?{...m,stock:mode==="in"?m.stock+qty:Math.max(0,m.stock-qty)}:m));
    }
    addLog({medicine_id:med.id,medicine_name:med.name_ar,type:mode,qty,date:new Date().toISOString().slice(0,10),user:isAr?currentUser.name_ar:currentUser.name_en});
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

  const lowCount=medicines.filter(m=>m.stock>0&&m.stock<m.min_stock).length;
  const outCount=medicines.filter(m=>m.stock===0).length;
  const expCount=medicines.filter(m=>isSoon(medExpiry(m))||isExp(medExpiry(m))).length;

  const totalValue=medicines.reduce((t,m)=>t+m.stock*(m.avg_cost||m.purchase_price||0),0);
  const fmtNum=(n:number)=>n>=1000000?(n/1000000).toFixed(1)+"M":n>=1000?(n/1000).toFixed(1)+"K":String(Math.round(n));

  return (
    <div>
      {/* ═══ رأس الصفحة ═══ */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:14,flexWrap:"wrap",marginBottom:16}}>
        <div>
          <h1 style={{fontSize:"clamp(19px,3vw,24px)",fontWeight:800,color:"#1a2840",letterSpacing:"-.4px",marginBottom:3}}>{isAr?"إدارة المخزون":"Inventory"}</h1>
          <p style={{fontSize:12.5,color:"#8a94a3",fontWeight:500}}>{isAr?`${medicines.length} صنف مسجّل · متابعة الكميات والصلاحيات لحظياً`:`${medicines.length} items · live stock & expiry tracking`}</p>
        </div>
        <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>setShowLog(true)} className="inv-ghost-btn"><Icons.log size={16}/> <span className="hide-xs">{isAr?"سجل الحركة":"Log"}</span></button>
          <button onClick={()=>{if(!barcodeMode)setBarcodeMode("inventory");openCamera();}} className="inv-ghost-btn"><Icons.scan size={16}/> <span className="hide-xs">{isAr?"مسح باركود":"Scan"}</span></button>
          <button onClick={()=>{setEditMed(null);setShowModal(true);}} style={{display:"flex",alignItems:"center",gap:7,padding:"12px 22px",background:"linear-gradient(135deg,#0863ba,#0a4f96)",color:"#fff",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:13.5,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 22px rgba(8,99,186,.32)",transition:"all .18s"}}>
            <Icons.plus size={17}/> {isAr?"إضافة دواء":"Add Medicine"}
          </button>
        </div>
      </div>

      {/* ═══ بطاقات إحصائية ═══ */}
      <div className="inv-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {([
          {k:"all" as const,label:isAr?"إجمالي الأصناف":"Total Items",val:String(medicines.length),sub:isAr?"صنف في المخزون":"in inventory",c:"#0863ba",Ic:Icons.box},
          {k:null,label:isAr?"قيمة المخزون":"Stock Value",val:fmtNum(totalValue),sub:isAr?"ل.س بالتكلفة":"SAR at cost",c:"#1e8449",Ic:Icons.reports},
          {k:"low" as const,label:isAr?"مخزون منخفض":"Low Stock",val:String(lowCount),sub:isAr?"يحتاج إعادة طلب":"needs reorder",c:"#d35400",Ic:Icons.stockOut},
          {k:"expiring" as const,label:isAr?"قارب الانتهاء":"Expiring",val:String(expCount),sub:isAr?"خلال ٣٠ يوماً":"within 30 days",c:"#c0392b",Ic:Icons.alerts},
        ]).map((st,i)=>{
          const active=st.k!==null&&statusF===st.k&&st.k!=="all"||st.k==="all"&&statusF==="all"&&false;
          return (
            <button key={i} onClick={()=>{if(st.k)setStatusF(st.k==="all"?"all":st.k);}} className="inv-stat-card" style={{textAlign:"start",border:`1.5px solid ${active?st.c:"#edf1f6"}`,cursor:st.k?"pointer":"default",background:"#fff",borderRadius:16,padding:"16px 17px",position:"relative",overflow:"hidden",fontFamily:"'Rubik',sans-serif",boxShadow:active?`0 8px 24px ${st.c}22`:"0 2px 10px rgba(20,40,70,.05)",transition:"all .2s"}}>
              <span style={{position:"absolute",insetInlineStart:0,top:14,bottom:14,width:3.5,borderRadius:4,background:st.c,opacity:.85}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#8a94a3",marginBottom:7}}>{st.label}</div>
                  <div style={{fontSize:26,fontWeight:800,color:"#1a2840",lineHeight:1,letterSpacing:"-.5px"}}>{st.val}</div>
                  <div style={{fontSize:10.5,color:"#aab3bf",fontWeight:600,marginTop:5}}>{st.sub}</div>
                </div>
                <span style={{width:40,height:40,borderRadius:12,background:`${st.c}10`,color:st.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><st.Ic size={19}/></span>
              </div>
            </button>
          );
        })}
      </div>

      {/* تنبيه: باركود ممسوح غير مسجّل */}
      {unknownBarcode&&(
        <div style={{background:"#fff",borderInlineStart:"4px solid #e67e22",border:"1.5px solid #f5dcc2",borderRadius:14,padding:"13px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",animation:"slideUp .3s ease",boxShadow:"0 4px 16px rgba(230,126,34,.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <span style={{width:40,height:40,borderRadius:11,background:"rgba(230,126,34,.12)",color:"#d35400",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.scan size={20}/></span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#d35400"}}>{isAr?"باركود غير مسجّل في المخزون":"Barcode not in inventory"}</div>
              <div style={{fontSize:12,color:"#e67e22",fontFamily:"monospace",letterSpacing:.5,marginTop:2}}>{unknownBarcode}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setEditMed(null);setShowModal(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 18px",background:"#27ae60",color:"#fff",border:"none",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 13px rgba(39,174,96,.3)",whiteSpace:"nowrap"}}><Icons.plus size={15}/> {isAr?"إضافة كدواء جديد":"Add as new"}</button>
            <button onClick={()=>setUnknownBarcode("")} style={{padding:"10px 14px",background:"#fff",color:"#999",border:"1.5px solid #eee",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,cursor:"pointer"}}>{isAr?"تجاهل":"Dismiss"}</button>
          </div>
        </div>
      )}

      {/* ═══ شريط الأدوات: بحث + فلاتر + ماسح ═══ */}
      <div style={{background:"#fff",borderRadius:16,padding:"15px 17px",border:"1.5px solid #edf1f6",boxShadow:"0 2px 10px rgba(20,40,70,.05)",marginBottom:14}}>
        <div className="inv-toolbar" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{flex:"1 1 240px",display:"flex",alignItems:"center",gap:10,background:"#f6f8fb",border:"1.5px solid #e8edf3",borderRadius:12,padding:"12px 15px",transition:"border-color .15s"}}>
            <span style={{color:"#9aa8b6",display:"flex"}}><Icons.search size={17}/></span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?"ابحث بالاسم أو الباركود أو الشركة...":"Search name, barcode, manufacturer..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13.5,width:"100%",direction:isAr?"rtl":"ltr",color:"#1a2840"}}/>
            {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9aa8b6",display:"flex"}}><Icons.close size={14}/></button>}
          </div>
          <select value={catF} onChange={e=>setCatF(e.target.value as "all"|MedCat)} style={{padding:"12px 14px",border:"1.5px solid #e8edf3",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:12.5,fontWeight:600,color:catF==="all"?"#7a8794":"#0863ba",background:catF==="all"?"#f6f8fb":"rgba(8,99,186,.05)",outline:"none",cursor:"pointer",minWidth:160,direction:isAr?"rtl":"ltr"}}>
            <option value="all">{isAr?"كل الفئات":"All categories"}</option>
            {Object.entries(CAT).map(([k,v])=>(<option key={k} value={k}>{isAr?v.ar:v.en}</option>))}
          </select>
          <div style={{display:"flex",alignItems:"center",gap:2,background:"#f6f8fb",borderRadius:12,padding:3,border:"1.5px solid #e8edf3"}} title={isAr?"وضع الماسح":"Scanner mode"}>
            {([["inventory",isAr?"بحث":"Find",Icons.search,"#0863ba"],["stock_in",isAr?"إدخال":"In",Icons.stockIn,"#27ae60"],["stock_out",isAr?"إخراج":"Out",Icons.stockOut,"#e67e22"]] as [BarcodeMode,string,(p:{size?:number})=>React.JSX.Element,string][]).map(([m,label,Ic,color])=>(
              <button key={m!} onClick={()=>setBarcodeMode(barcodeMode===m?null:m)} title={label}
                style={{padding:"9px 12px",borderRadius:9,border:"none",background:barcodeMode===m?color:"transparent",color:barcodeMode===m?"#fff":"#7a8794",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"'Rubik',sans-serif",fontSize:11.5,fontWeight:700,transition:"all .15s",boxShadow:barcodeMode===m?`0 3px 10px ${color}45`:"none"}}>
                <Ic size={15}/><span className="hide-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",alignItems:"center",marginTop:12}}>
          <div style={{display:"flex",background:"#f2f5f9",borderRadius:11,padding:3,gap:2}}>
            {([["all",isAr?"الكل":"All",null],["low",isAr?"منخفض":"Low",lowCount],["out",isAr?"نافد":"Out",outCount],["expiring",isAr?"قارب الانتهاء":"Expiring",expCount]] as [string,string,number|null][]).map(([k,label,cnt])=>(
              <button key={k} onClick={()=>setStatusF(k as typeof statusF)} style={{padding:"8px 14px",border:"none",borderRadius:9,cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12.5,fontWeight:statusF===k?700:600,background:statusF===k?"#fff":"transparent",color:statusF===k?"#0863ba":"#7a8794",boxShadow:statusF===k?"0 2px 8px rgba(8,99,186,.12)":"none",transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                {label}{typeof cnt==="number"&&cnt>0&&<span style={{background:statusF===k?"#0863ba":"#c3ccd6",color:"#fff",borderRadius:10,padding:"0 6px",fontSize:10,fontWeight:800,minWidth:16,textAlign:"center"}}>{cnt}</span>}
              </button>
            ))}
          </div>
          {(catF!=="all"||statusF!=="all"||search)&&(
            <button onClick={()=>{setCatF("all");setStatusF("all");setSearch("");}} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 12px",border:"none",background:"none",cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,color:"#e74c3c"}}><Icons.close size={12}/>{isAr?"مسح الفلاتر":"Clear filters"}</button>
          )}
          <span style={{marginInlineStart:"auto",fontSize:11.5,color:"#9aa8b6",fontWeight:600}}>{isAr?`${filtered.length} نتيجة`:`${filtered.length} results`}</span>
        </div>
      </div>

      {/* ═══ جدول ديسكتوب ═══ */}
      <div className="desktop-table" style={{background:"#fff",borderRadius:18,border:"1.5px solid #edf1f6",boxShadow:"0 4px 22px rgba(20,40,70,.06)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2.2fr 1.2fr 1.1fr .9fr .9fr .8fr 196px",padding:"14px 22px",background:"#f8fafc",borderBottom:"1.5px solid #edf1f6"}}>
          {[isAr?"الدواء":"Medicine",isAr?"الباركود":"Barcode",isAr?"الفئة":"Category",isAr?"السعر":"Price",isAr?"المخزون":"Stock",isAr?"الحالة":"Status",isAr?"إجراءات":"Actions"].map((h,i)=>(<div key={i} style={{fontSize:10.5,fontWeight:800,color:"#9aa2ab",textTransform:"uppercase",letterSpacing:.7}}>{h}</div>))}
        </div>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"56px 20px",color:"#b8c0c9"}}>
            <div style={{width:60,height:60,margin:"0 auto 14px",borderRadius:18,background:"#f2f5f9",color:"#9aa8b6",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.box size={28}/></div>
            <div style={{fontSize:14,fontWeight:700,color:"#7a8794",marginBottom:4}}>{isAr?"لا توجد نتائج مطابقة":"No matching results"}</div>
            <div style={{fontSize:12,color:"#aab3bf"}}>{isAr?"جرّب تعديل البحث أو الفلاتر":"Try adjusting search or filters"}</div>
          </div>
        ):filtered.map(m=>{
          const cat=CAT[m.category]; const expired=isExp(medExpiry(m)); const soon=isSoon(medExpiry(m)); const lit=litId===m.id;
          return (
            <div key={m.id} className="inv-row" style={{display:"grid",gridTemplateColumns:"2.2fr 1.2fr 1.1fr .9fr .9fr .8fr 196px",padding:"15px 22px",alignItems:"center",borderBottom:"1px solid #f2f5f9",background:lit?"rgba(8,99,186,.07)":expired?"rgba(231,76,60,.025)":"",outline:lit?"2px solid #0863ba":"none",transition:"all .2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
                <span style={{width:38,height:38,borderRadius:11,background:`${cat.color}0e`,color:cat.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:800}}>{(isAr?m.name_ar:(m.name_en||m.name_ar)).slice(0,1)}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#1a2840",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isAr?m.name_ar:m.name_en||m.name_ar}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2,flexWrap:"wrap"}}>
                    {m.manufacturer&&<span style={{fontSize:10.5,color:"#aab3bf"}}>{m.manufacturer}</span>}
                    {medExpiry(m)&&<span style={{fontSize:10,fontWeight:expired||soon?700:500,color:expired?"#e74c3c":soon?"#e67e22":"#aab3bf"}}>{expired?(isAr?"منتهي · ":"Expired · "):soon?(isAr?"قريب · ":"Soon · "):""}{medExpiry(m)}</span>}
                  </div>
                </div>
              </div>
              <div><span style={{background:"#f6f8fb",borderRadius:7,padding:"3px 8px",border:"1px solid #e8edf3",fontSize:10,color:"#5a7189",fontFamily:"monospace",letterSpacing:.7,direction:"ltr",display:"inline-block"}}>{m.barcode}</span></div>
              <div><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:`${cat.color}0e`,color:cat.color}}><span style={{width:6,height:6,borderRadius:"50%",background:cat.color}}/>{isAr?cat.ar:cat.en}</span></div>
              <div style={{fontSize:13.5,fontWeight:800,color:"#1a2840"}}>{m.sell_price}<span style={{fontSize:10,color:"#aab3bf",fontWeight:500}}> {isAr?"ل.س":"SYP"}</span></div>
              <div style={{fontSize:13.5,fontWeight:800,color:m.stock===0?"#c0392b":m.stock<m.min_stock?"#d35400":"#1a2840"}}>{m.stock}<span style={{fontSize:10,color:"#aab3bf",fontWeight:500}}> {isAr?m.unit:"u"}</span></div>
              <div><SBadge s={m.stock} m={m.min_stock} lang={lang}/></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setAdj({med:m,mode:"in"})} className="action-icon-btn" title={isAr?"إضافة مخزون":"Stock in"} style={{color:"#27ae60",borderColor:"rgba(39,174,96,.3)"}}><Icons.stockIn size={16}/></button>
                <button onClick={()=>setAdj({med:m,mode:"out"})} className="action-icon-btn" title={isAr?"خصم مخزون":"Stock out"} style={{color:"#e67e22",borderColor:"rgba(230,126,34,.3)"}}><Icons.stockOut size={16}/></button>
                <button onClick={()=>{setEditMed(m);setShowModal(true);}} className="action-icon-btn" title={isAr?"تعديل":"Edit"} style={{color:"#0863ba",borderColor:"rgba(8,99,186,.25)"}}><Icons.edit size={15}/></button>
                <button onClick={()=>setDelId(m.id)} className="action-icon-btn" title={isAr?"حذف":"Delete"} style={{color:"#e74c3c",borderColor:"rgba(231,76,60,.25)"}}><Icons.trash size={15}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ كروت موبايل ═══ */}
      <div className="mobile-cards" style={{display:"none"}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"46px 20px",color:"#b8c0c9",background:"#fff",borderRadius:16,border:"1.5px solid #edf1f6"}}>
            <div style={{width:54,height:54,margin:"0 auto 12px",borderRadius:16,background:"#f2f5f9",color:"#9aa8b6",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.box size={25}/></div>
            <div style={{fontSize:13.5,fontWeight:700,color:"#7a8794"}}>{isAr?"لا توجد نتائج":"No results"}</div>
          </div>
        )}
        {filtered.map(m=>{const cat=CAT[m.category];const lit=litId===m.id;const expired=isExp(medExpiry(m));const soon=isSoon(medExpiry(m));return(
          <div key={m.id} style={{background:"#fff",borderRadius:16,padding:"15px",border:`1.5px solid ${lit?"#0863ba":expired?"rgba(231,76,60,.3)":"#edf1f6"}`,marginBottom:11,boxShadow:lit?"0 6px 20px rgba(8,99,186,.14)":"0 2px 10px rgba(20,40,70,.05)",transition:"all .2s"}}>
            <div style={{display:"flex",gap:11,alignItems:"flex-start",marginBottom:11}}>
              <span style={{width:42,height:42,borderRadius:12,background:`${cat.color}0e`,color:cat.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16,fontWeight:800}}>{(isAr?m.name_ar:(m.name_en||m.name_ar)).slice(0,1)}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{fontSize:14.5,fontWeight:800,color:"#1a2840",lineHeight:1.3}}>{isAr?m.name_ar:m.name_en||m.name_ar}</div>
                  <SBadge s={m.stock} m={m.min_stock} lang={lang}/>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4,flexWrap:"wrap"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,fontWeight:600,color:cat.color}}><span style={{width:5,height:5,borderRadius:"50%",background:cat.color}}/>{isAr?cat.ar:cat.en}</span>
                  {m.manufacturer&&<span style={{fontSize:10.5,color:"#aab3bf"}}>· {m.manufacturer}</span>}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:11}}>
              <div style={{background:"#f6f8fb",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:9.5,color:"#9aa8b6",fontWeight:700,marginBottom:3}}>{isAr?"سعر البيع":"Price"}</div><div style={{fontSize:15,fontWeight:800,color:"#1a2840"}}>{m.sell_price}</div></div>
              <div style={{background:"#f6f8fb",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:9.5,color:"#9aa8b6",fontWeight:700,marginBottom:3}}>{isAr?"المخزون":"Stock"}</div><div style={{fontSize:15,fontWeight:800,color:m.stock===0?"#c0392b":m.stock<m.min_stock?"#d35400":"#1a2840"}}>{m.stock}</div></div>
              <div style={{background:expired?"rgba(231,76,60,.07)":soon?"rgba(230,126,34,.07)":"#f6f8fb",borderRadius:11,padding:"9px 6px",textAlign:"center"}}><div style={{fontSize:9.5,color:"#9aa8b6",fontWeight:700,marginBottom:3}}>{isAr?"الصلاحية":"Expiry"}</div><div style={{fontSize:11,fontWeight:800,color:expired?"#c0392b":soon?"#d35400":"#5a7189",direction:"ltr"}}>{medExpiry(m)||"—"}</div></div>
            </div>
            {m.batches&&m.batches.length>1&&(
              <div style={{background:"#fafbfd",borderRadius:10,padding:"7px 10px",marginBottom:10,border:"1px solid #edf1f6",fontSize:10.5,color:"#7a8794",fontWeight:600}}>
                {isAr?`${m.batches.length} دفعات مخزنة · أقربها ${m.nearest_expiry||"—"}`:`${m.batches.length} batches · nearest ${m.nearest_expiry||"—"}`}
              </div>
            )}
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setAdj({med:m,mode:"in"})} style={{flex:1,padding:"10px",border:"1.5px solid rgba(39,174,96,.25)",borderRadius:11,background:"rgba(39,174,96,.06)",color:"#27ae60",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.stockIn size={17}/></button>
              <button onClick={()=>setAdj({med:m,mode:"out"})} style={{flex:1,padding:"10px",border:"1.5px solid rgba(230,126,34,.25)",borderRadius:11,background:"rgba(230,126,34,.06)",color:"#e67e22",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.stockOut size={17}/></button>
              <button onClick={()=>{setEditMed(m);setShowModal(true);}} style={{flex:1,padding:"10px",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:11,background:"rgba(8,99,186,.05)",color:"#0863ba",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.edit size={16}/></button>
              <button onClick={()=>setDelId(m.id)} style={{flex:1,padding:"10px",border:"1.5px solid rgba(231,76,60,.25)",borderRadius:11,background:"rgba(231,76,60,.05)",color:"#e74c3c",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.trash size={16}/></button>
            </div>
          </div>
        );})}
      </div>

      {(showModal||editMed)&&<MedModal lang={lang} medicine={editMed} initialBarcode={!editMed?unknownBarcode:undefined} onSave={handleSave} onClose={()=>{setShowModal(false);setEditMed(null);}}/>}
      {adj&&<AdjModal lang={lang} medicine={adj.med} mode={adj.mode} onConfirm={handleAdj} onClose={()=>setAdj(null)}/>}
      {delId!==null&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setDelId(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"26px",width:"min(90vw,380px)",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)"}}>
            <div style={{width:52,height:52,margin:"0 auto 12px",borderRadius:15,background:"rgba(231,76,60,.1)",color:"#e74c3c",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.trash size={24}/></div>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>{isAr?"سجل حركة المخزون":"Stock Movement Log"}</h2><button onClick={()=>setShowLog(false)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {stockLog.length===0&&<div style={{textAlign:"center",padding:"36px",color:"#b8c0c9",fontSize:13,fontWeight:600}}>{isAr?"لا توجد حركات بعد":"No movements yet"}</div>}
              {[...stockLog].sort((a,b)=>b.id-a.id).slice(0,200).map(l=>{
                const ts:{[k:string]:{c:string;ar:string;en:string}}={in:{c:"#27ae60",ar:"إدخال",en:"In"},out:{c:"#e67e22",ar:"إخراج",en:"Out"},sale:{c:"#8e44ad",ar:"بيع",en:"Sale"},purchase:{c:"#0863ba",ar:"شراء",en:"Purchase"},adjustment:{c:"#7f8c8d",ar:"تعديل",en:"Adj"}};
                const s=ts[l.type]||ts.adjustment;
                return (<div key={l.id} style={{display:"flex",gap:11,alignItems:"flex-start",padding:"9px 12px",background:"#f7f9fc",borderRadius:9,border:"1px solid #eef0f3"}}>
                  <span style={{width:34,height:34,borderRadius:10,flexShrink:0,background:`${s.c}12`,color:s.c,display:"flex",alignItems:"center",justifyContent:"center"}}>{l.type==="out"||l.type==="sale"?<Icons.stockOut size={16}/>:<Icons.stockIn size={16}/>}</span>
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
  const [mrnQ,setMrnQ]=useState(""); const [submitted,setSubmitted]=useState("");
  const [importing,setImporting]=useState(false);

  // جسر الوصفات: البحث بالـ MRN يستورد وصفات المريض من كل العيادات
  const searchMrn=async(q:string)=>{
    const mrn=q.trim(); setSubmitted(mrn);
    if(!mrn||!userId)return;
    setImporting(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const token=session?.access_token;
      if(token){
        const res=await fetch("/api/pharmacy/import-by-mrn",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({mrn})});
        const json=await res.json();
        if(json.imported>0)onRefresh();
      }
    }catch{/* ignore */}
    setImporting(false);
  };
  const [pF,setPF]=useState<"all"|"waiting"|"preparing"|"ready"|"dispensed">("all");
  const [showAdd,setShowAdd]=useState(false); const [rxForm,setRxForm]=useState({mrn:"",patient_name:"",notes:""});
  const [rxItems,setRxItems]=useState<RxItem[]>([{medicine_name:"",dosage:"",duration:"",instructions:"",qty:1}]);
  const [syncing,setSyncing]=useState(false); const [syncMsg,setSyncMsg]=useState("");
  const [safety,setSafety]=useState<{rx:Prescription;interactions:Interaction[];allergies:AllergyHit[];loading:boolean}|null>(null);
  const [partial,setPartial]=useState<{rx:Prescription;qtys:Record<number,number>}|null>(null);
  const [ackSafety,setAckSafety]=useState(false);

  const stFilter=(p:Prescription)=>{const s=p.status||(p.dispensed?"dispensed":"waiting");
    if(pF==="all")return true; if(pF==="dispensed")return s==="dispensed"; return s===pF;};
  const displayed=useMemo(()=>{let l=prescriptions.filter(stFilter);
    if(submitted.trim())l=l.filter(p=>p.mrn.toLowerCase()===submitted.trim().toLowerCase());
    // ترتيب: الأولوية العالية أولاً ثم الأقدم
    const prio:Record<string,number>={urgent:0,high:1,normal:2,low:3};
    return [...l].sort((a,b)=>(prio[a.priority||"normal"]-prio[b.priority||"normal"])||a.created_at.localeCompare(b.created_at));
  },[prescriptions,submitted,pF]);

  const statusMeta:Record<string,{ar:string;en:string;c:string;bg:string;ic:string}>={
    waiting:{ar:"بانتظار",en:"Waiting",c:"#e67e22",bg:"rgba(230,126,34,.12)",ic:"⏳"},
    preparing:{ar:"قيد التحضير",en:"Preparing",c:"#0863ba",bg:"rgba(8,99,186,.12)",ic:"🔧"},
    ready:{ar:"جاهزة",en:"Ready",c:"#8e44ad",bg:"rgba(142,68,173,.12)",ic:"📦"},
    dispensed:{ar:"صُرِّفت",en:"Dispensed",c:"#27ae60",bg:"rgba(39,174,96,.12)",ic:"✅"},
    cancelled:{ar:"ملغاة",en:"Cancelled",c:"#95a5a6",bg:"rgba(149,165,166,.12)",ic:"🚫"},
  };
  const prioMeta:Record<string,{ar:string;en:string;c:string}>={
    urgent:{ar:"عاجلة",en:"Urgent",c:"#e74c3c"},high:{ar:"عالية",en:"High",c:"#e67e22"},
    normal:{ar:"عادية",en:"Normal",c:"#95a5a6"},low:{ar:"منخفضة",en:"Low",c:"#bbb"},
  };

  // ميزة 14: مزامنة وصفات العيادة
  const syncClinic=async()=>{
    if(!userId)return; setSyncing(true); setSyncMsg("");
    try{
      const res=await fetch("/api/pharmacy/sync-prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,days:30})});
      const json=await res.json();
      setSyncMsg(json.synced>0?(isAr?`✅ تمت مزامنة ${json.synced} وصفة من العيادة`:`✅ Synced ${json.synced} from clinic`):(isAr?"لا وصفات جديدة للمزامنة":"No new prescriptions"));
      if(json.synced>0)onRefresh();
    }catch{setSyncMsg(isAr?"تعذّرت المزامنة":"Sync failed");}
    setSyncing(false); setTimeout(()=>setSyncMsg(""),4000);
  };

  // ميزة 12+13: فحص السلامة قبل الصرف
  const runSafetyCheck=async(rx:Prescription)=>{
    setAckSafety(false);
    setSafety({rx,interactions:[],allergies:[],loading:true});
    const medNames=rx.items.map(it=>it.medicine_name).filter(Boolean);
    try{
      const res=await fetch("/api/pharmacy/safety-check",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,medicines:medNames,patient_id:rx.patient_id,mrn:rx.mrn})});
      const json=await res.json();
      setSafety({rx,interactions:json.interactions||[],allergies:json.allergies||[],loading:false});
    }catch{setSafety({rx,interactions:[],allergies:[],loading:false});}
  };

  const updateStatus=async(id:string,status:RxStatus)=>{
    if(userId){await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update_status",user_id:userId,id,status,dispensed_by:isAr?currentUser.name_ar:currentUser.name_en})});onRefresh();}
    setPrescriptions(prev=>prev.map(p=>p.id===id?{...p,status,dispensed:status==="dispensed"}:p));
  };
  const setPriority=async(id:string,priority:RxPriority)=>{
    if(userId){await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update_status",user_id:userId,id,priority})});onRefresh();}
    setPrescriptions(prev=>prev.map(p=>p.id===id?{...p,priority}:p));
  };

  // الصرف الكامل (بعد تجاوز فحص السلامة)
  const doDispense=async(rx:Prescription)=>{
    const dispensed_by=isAr?currentUser.name_ar:currentUser.name_en;
    if(userId){
      const res=await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dispense",user_id:userId,id:rx.id,dispensed_by})});
      const json=await res.json(); if(!json.success)return; onRefresh();
    }
    setPrescriptions(prev=>prev.map(p=>p.id===rx.id?{...p,dispensed:true,status:"dispensed",dispensed_at:new Date().toISOString().slice(0,10),dispensed_by}:p));
    rx.items.forEach(it=>{const med=medicines.find(m=>it.medicine_id?m.id===it.medicine_id:(m.name_ar.trim().toLowerCase()===it.medicine_name.trim().toLowerCase()||m.name_en.trim().toLowerCase()===it.medicine_name.trim().toLowerCase()));if(med)addLog({medicine_id:med.id,medicine_name:med.name_ar,type:"out",qty:it.qty||1,date:new Date().toISOString().slice(0,10),user:dispensed_by,ref:rx.id,notes:"صرف وصفة"});});
    setSafety(null);
  };

  // ميزة 16: صرف جزئي
  const doPartial=async()=>{
    if(!partial)return; const {rx,qtys}=partial;
    const dispensed_by=isAr?currentUser.name_ar:currentUser.name_en;
    const items=rx.items.filter(it=>it.id).map(it=>({item_id:it.id!,dispensed_qty:qtys[it.id!]??(it.dispensed_qty||0)}));
    if(userId){await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"dispense_partial",user_id:userId,id:rx.id,items,dispensed_by})});onRefresh();}
    setPartial(null);
  };

  const startDispense=(rx:Prescription)=>{ runSafetyCheck(rx); };

  const saveRx=async()=>{
    if(!rxForm.mrn.trim()||!rxForm.patient_name.trim())return;
    const rxId=`RX-${new Date().getFullYear()}-${String(Math.max(0,...prescriptions.map(p=>parseInt(p.id.split("-")[2]||"0")))+1).padStart(3,"0")}`;
    const doctor_name=isAr?currentUser.name_ar:currentUser.name_en;
    const filteredItems=rxItems.filter(i=>i.medicine_name.trim()).map(i=>({...i,qty:i.qty||1,dispensed_qty:0}));
    if(userId){
      const res=await fetch("/api/pharmacy/prescriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",user_id:userId,rx_id:rxId,mrn:rxForm.mrn,patient_name:rxForm.patient_name,doctor_name,doctor_id:currentUser.id,notes:rxForm.notes||undefined,dispensed:false,status:"waiting",priority:"normal",source:"pharmacy",items:filteredItems})});
      const json=await res.json();
      if(json.success){setPrescriptions(prev=>[json.prescription,...prev]);}
    } else {
      setPrescriptions(prev=>[{id:rxId,mrn:rxForm.mrn,patient_name:rxForm.patient_name,doctor_name,doctor_id:currentUser.id,created_at:new Date().toISOString().slice(0,10),items:filteredItems,notes:rxForm.notes||undefined,dispensed:false,status:"waiting",priority:"normal"},...prev]);
    }
    setShowAdd(false); setRxForm({mrn:"",patient_name:"",notes:""}); setRxItems([{medicine_name:"",dosage:"",duration:"",instructions:"",qty:1}]);
  };

  const canAdd=currentUser.role==="doctor"||currentUser.role==="manager";
  const canDispense=currentUser.role==="pharmacist"||currentUser.role==="manager";
  const hasSafetyIssue=safety&&!safety.loading&&(safety.interactions.length>0||safety.allergies.length>0);

  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:15,flexWrap:"wrap"}}>
        {canAdd&&<button onClick={()=>setShowAdd(true)} className="btn-primary-lg" style={{background:"#27ae60",boxShadow:"0 4px 16px rgba(39,174,96,.35)"}}>＋ {isAr?"وصفة طبية جديدة":"New Prescription"}</button>}
        {canDispense&&<button onClick={syncClinic} disabled={syncing} className="btn-primary-lg" style={{background:"#0863ba",boxShadow:"0 4px 16px rgba(8,99,186,.3)"}}>{syncing?(isAr?"⏳ جاري...":"⏳..."):(isAr?"🔄 مزامنة وصفات العيادة":"🔄 Sync clinic Rx")}</button>}
      </div>
      {syncMsg&&<div style={{background:"rgba(8,99,186,.08)",border:"1px solid rgba(8,99,186,.2)",borderRadius:10,padding:"9px 13px",marginBottom:13,fontSize:12,color:"#0863ba",fontWeight:700}}>{syncMsg}</div>}

      <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.03))",borderRadius:15,padding:"17px",border:"1.5px solid rgba(8,99,186,.15)",marginBottom:13}}>
        <div style={{display:"flex",gap:4,marginBottom:5,alignItems:"center"}}><span style={{fontSize:17}}>🔍</span><span style={{fontSize:13,fontWeight:700,color:"#0863ba"}}>{isAr?"رقم السجل الطبي":"MRN"}</span></div>
        <div style={{display:"flex",gap:9}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:9,background:"#fff",border:"1.5px solid rgba(8,99,186,.25)",borderRadius:11,padding:"9px 13px",boxShadow:"0 2px 7px rgba(8,99,186,.1)"}}>
            <span>🪪</span>
            <input value={mrnQ} onChange={e=>setMrnQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchMrn(mrnQ);}} placeholder={isAr?"ابحث برقم السجل الطبي...":"Search by MRN..."} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13,width:"100%",letterSpacing:.5,direction:"ltr"}}/>
            {mrnQ&&<button onClick={()=>{setMrnQ("");setSubmitted("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}
          </div>
          <button onClick={()=>searchMrn(mrnQ)} style={{padding:"9px 19px",background:"#0863ba",color:"#fff",border:"none",borderRadius:11,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 13px rgba(8,99,186,.3)",whiteSpace:"nowrap"}}>{importing?(isAr?"جارٍ الجلب...":"Fetching..."):(isAr?"بحث":"Search")}</button>
        </div>
        {submitted&&<div style={{marginTop:8,display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:11,color:"#0863ba",fontWeight:600}}>MRN:</span><span style={{fontSize:13,fontWeight:800,color:"#0863ba",background:"rgba(8,99,186,.1)",padding:"3px 9px",borderRadius:7,letterSpacing:.5}}>{submitted}</span><span style={{fontSize:11,color:"#aaa"}}>— {displayed.length} {isAr?"وصفة":"rx"}</span></div>}
      </div>

      <div style={{display:"flex",gap:7,marginBottom:13,flexWrap:"wrap"}}>
        {([["all",isAr?"الكل":"All"],["waiting",isAr?"بانتظار":"Waiting"],["preparing",isAr?"قيد التحضير":"Preparing"],["ready",isAr?"جاهزة":"Ready"],["dispensed",isAr?"مصروفة":"Dispensed"]] as [string,string][]).map(([k,v])=>(<button key={k} onClick={()=>setPF(k as typeof pF)} className={pF===k?"filter-chip active":"filter-chip"}>{v}</button>))}
      </div>

      {displayed.length===0?(<div style={{textAlign:"center",padding:"55px 20px",color:"#ccc",background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3"}}><div style={{fontSize:38,marginBottom:10}}>📋</div><div style={{fontSize:13,fontWeight:600}}>{submitted?(isAr?"لم يُعثر على وصفات":"No prescriptions found"):(isAr?"لا وصفات في هذه القائمة":"No prescriptions")}</div></div>):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {displayed.map(rx=>{
            const st=rx.status||(rx.dispensed?"dispensed":"waiting"); const sm=statusMeta[st]; const pm=prioMeta[rx.priority||"normal"];
            const done=st==="dispensed";
            const partialDone=rx.items.some(it=>(it.dispensed_qty||0)>0)&&!rx.items.every(it=>(it.dispensed_qty||0)>=(it.qty||1));
            return (
            <div key={rx.id} style={{background:"#fff",borderRadius:15,border:`1.5px solid ${done?"rgba(39,174,96,.25)":(rx.priority==="urgent"?"rgba(231,76,60,.4)":"rgba(8,99,186,.2)")}`,boxShadow:"0 2px 12px rgba(8,99,186,.06)",overflow:"hidden"}}>
              <div style={{padding:"13px 17px",background:done?"rgba(39,174,96,.04)":"rgba(8,99,186,.04)",borderBottom:"1px solid #f0f4f8",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:9}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:800,color:"#0863ba",letterSpacing:.5}}>{rx.id}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sm.bg,color:sm.c}}>{sm.ic} {isAr?sm.ar:sm.en}</span>
                    {rx.priority&&rx.priority!=="normal"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${pm.c}18`,color:pm.c}}>{isAr?pm.ar:pm.en}</span>}
                    {rx.source==="clinic"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:"rgba(142,68,173,.12)",color:"#8e44ad"}}>🏥 {isAr?"من العيادة":"Clinic"}</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{rx.patient_name}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{rx.doctor_name} · {rx.created_at}</div>
                  {rx.dispensed_by&&<div style={{fontSize:10,color:"#27ae60",marginTop:1}}>✅ {isAr?"بواسطة":"By"}: {rx.dispensed_by}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0863ba",background:"rgba(8,99,186,.08)",padding:"3px 9px",borderRadius:7,letterSpacing:.4}}>{rx.mrn}</span>
                  {canDispense&&!done&&(
                    <select value={rx.priority||"normal"} onChange={e=>setPriority(rx.id,e.target.value as RxPriority)} style={{padding:"5px 7px",border:"1.5px solid #e0e7ef",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:11,outline:"none",background:"#fff",color:pm.c,fontWeight:700}}>
                      {(["urgent","high","normal","low"] as RxPriority[]).map(p=><option key={p} value={p}>{isAr?prioMeta[p].ar:prioMeta[p].en}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div style={{padding:"12px 17px"}}>
                {rx.notes&&<div style={{background:"rgba(231,76,60,.06)",border:"1px solid rgba(231,76,60,.2)",borderRadius:9,padding:"7px 11px",marginBottom:9,fontSize:12,color:"#c0392b",fontWeight:600}}>⚠️ {rx.notes}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {rx.items.map((it,i)=>{const dq=it.dispensed_qty||0;const q=it.qty||1;const full=dq>=q;
                    return(<div key={i} style={{background:"#f7f9fc",borderRadius:9,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:9,flexWrap:"wrap"}}>
                    <div><div style={{fontSize:13,fontWeight:700,color:"#353535"}}>💊 {it.medicine_name} {q>1&&<span style={{fontSize:11,color:"#888",fontWeight:400}}>×{q}</span>}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{it.instructions}</div></div>
                    <div style={{textAlign:isAr?"left":"right",flexShrink:0}}><div style={{fontSize:11,fontWeight:700,color:"#0863ba"}}>{it.dosage}</div><div style={{fontSize:10,color:"#aaa"}}>{it.duration}</div>{dq>0&&<div style={{fontSize:10,fontWeight:700,color:full?"#27ae60":"#e67e22",marginTop:2}}>{full?"✅":"⏳"} {isAr?"صُرف":"disp"} {dq}/{q}</div>}</div>
                  </div>);})}
                </div>
                {canDispense&&!done&&(
                  <div style={{display:"flex",gap:8,marginTop:11,flexWrap:"wrap"}}>
                    <button onClick={()=>startDispense(rx)} style={{flex:1,minWidth:130,padding:"9px 14px",background:"#27ae60",color:"#fff",border:"none",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 9px rgba(39,174,96,.3)"}}>💊 {isAr?"صرف كامل":"Dispense all"}</button>
                    <button onClick={()=>setPartial({rx,qtys:Object.fromEntries(rx.items.filter(it=>it.id).map(it=>[it.id!,it.dispensed_qty||0]))})} style={{padding:"9px 14px",background:"rgba(230,126,34,.1)",color:"#e67e22",border:"1.5px solid rgba(230,126,34,.3)",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>⏳ {isAr?"صرف جزئي":"Partial"}</button>
                    {st==="waiting"&&<button onClick={()=>updateStatus(rx.id,"preparing")} style={{padding:"9px 12px",background:"rgba(8,99,186,.08)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔧 {isAr?"تحضير":"Prep"}</button>}
                    {(st==="preparing"||partialDone)&&<button onClick={()=>updateStatus(rx.id,"ready")} style={{padding:"9px 12px",background:"rgba(142,68,173,.08)",color:"#8e44ad",border:"1.5px solid rgba(142,68,173,.2)",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>📦 {isAr?"جاهزة":"Ready"}</button>}
                  </div>
                )}
              </div>
            </div>
          );})}
        </div>
      )}

      {/* نافذة فحص السلامة قبل الصرف (12+13) */}
      {safety&&(
        <div style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}} onClick={()=>setSafety(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"24px",width:"min(96vw,520px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>🛡️ {isAr?"فحص السلامة الدوائية":"Safety Check"}</h2><button onClick={()=>setSafety(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{fontSize:12,color:"#888",marginBottom:14}}>{isAr?`المريض: ${safety.rx.patient_name} · ${safety.rx.items.length} دواء`:`${safety.rx.patient_name} · ${safety.rx.items.length} meds`}</div>
            {safety.loading?(
              <div style={{textAlign:"center",padding:"30px",color:"#aaa"}}>{isAr?"⏳ جاري الفحص...":"⏳ Checking..."}</div>
            ):(
              <>
                {!hasSafetyIssue&&<div style={{background:"rgba(39,174,96,.08)",border:"1.5px solid rgba(39,174,96,.3)",borderRadius:12,padding:"16px",textAlign:"center",marginBottom:16}}><div style={{fontSize:32,marginBottom:6}}>✅</div><div style={{fontSize:14,fontWeight:700,color:"#27ae60"}}>{isAr?"لا تعارضات أو حساسية معروفة":"No known issues"}</div></div>}
                {safety.allergies.length>0&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#c0392b",marginBottom:8}}>🚨 {isAr?"تحذير حساسية":"Allergy Alert"}</div>
                    {safety.allergies.map((a,i)=>(<div key={i} style={{background:"rgba(231,76,60,.07)",border:"1.5px solid rgba(231,76,60,.3)",borderRadius:10,padding:"11px 13px",marginBottom:7}}><div style={{fontSize:13,fontWeight:700,color:"#c0392b"}}>💊 {a.medicine}</div><div style={{fontSize:11,color:"#e74c3c",marginTop:3}}>{isAr?`المريض لديه حساسية مسجّلة تجاه: ${a.allergen}`:`Patient allergic to: ${a.allergen}`}</div></div>))}
                  </div>
                )}
                {safety.interactions.length>0&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#e67e22",marginBottom:8}}>⚠️ {isAr?"تعارضات دوائية":"Drug Interactions"}</div>
                    {safety.interactions.map((it,i)=>{const sc=it.severity==="severe"?"#e74c3c":it.severity==="moderate"?"#e67e22":"#f39c12";const sl=it.severity==="severe"?(isAr?"شديد":"Severe"):it.severity==="moderate"?(isAr?"متوسط":"Moderate"):(isAr?"خفيف":"Mild");
                      return(<div key={i} style={{background:`${sc}0e`,border:`1.5px solid ${sc}44`,borderRadius:10,padding:"11px 13px",marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:12,fontWeight:700,color:"#353535"}}>{it.med_a} + {it.med_b}</span><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sc,color:"#fff"}}>{sl}</span></div><div style={{fontSize:11,color:"#666"}}>{it.description}</div></div>);})}
                  </div>
                )}
                <div style={{fontSize:10,color:"#bbb",background:"#fafbfd",borderRadius:8,padding:"8px 11px",marginBottom:14,lineHeight:1.5}}>ℹ️ {isAr?"هذا الفحص أداة مساعدة للتنبيه فقط وليس بديلاً عن الحكم المهني أو مرجع دوائي معتمد.":"Advisory aid only; not a substitute for professional judgment or an approved drug reference."}</div>
                {hasSafetyIssue&&(
                  <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer",fontSize:12,color:"#c0392b",fontWeight:600}}>
                    <input type="checkbox" checked={ackSafety} onChange={e=>setAckSafety(e.target.checked)} style={{width:16,height:16,cursor:"pointer"}}/>
                    {isAr?"راجعت التحذيرات وأتحمّل مسؤولية المتابعة":"I reviewed the warnings and take responsibility to proceed"}
                  </label>
                )}
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>doDispense(safety.rx)} disabled={!!(hasSafetyIssue&&!ackSafety)} style={{flex:1,padding:"12px",background:hasSafetyIssue&&!ackSafety?"#ccc":hasSafetyIssue?"#e67e22":"#27ae60",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:hasSafetyIssue&&!ackSafety?"not-allowed":"pointer"}}>💊 {isAr?"متابعة الصرف":"Proceed"}</button>
                  <button onClick={()=>setSafety(null)} style={{padding:"12px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* نافذة الصرف الجزئي (16) */}
      {partial&&(
        <div style={{position:"fixed",inset:0,zIndex:250,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)"}} onClick={()=>setPartial(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"24px",width:"min(96vw,480px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>⏳ {isAr?"صرف جزئي":"Partial Dispense"}</h2><button onClick={()=>setPartial(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            <div style={{fontSize:12,color:"#888",marginBottom:14}}>{isAr?"حدّد الكمية المصروفة لكل دواء (يمكن إكمال الباقي لاحقًا)":"Set dispensed qty per item"}</div>
            {partial.rx.items.filter(it=>it.id).map(it=>{const q=it.qty||1;const cur=partial.qtys[it.id!]??0;
              return(<div key={it.id} style={{background:"#f7f9fc",borderRadius:10,padding:"11px 13px",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:"#353535",marginBottom:7}}>💊 {it.medicine_name}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"#888"}}>{isAr?"المصروف":"Dispensed"}:</span>
                  <button onClick={()=>setPartial(p=>p&&({...p,qtys:{...p.qtys,[it.id!]:Math.max(0,cur-1)}}))} style={{width:26,height:26,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba"}}>-</button>
                  <span style={{fontSize:14,fontWeight:700,minWidth:50,textAlign:"center"}}>{cur} / {q}</span>
                  <button onClick={()=>setPartial(p=>p&&({...p,qtys:{...p.qtys,[it.id!]:Math.min(q,cur+1)}}))} style={{width:26,height:26,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba"}}>+</button>
                  <button onClick={()=>setPartial(p=>p&&({...p,qtys:{...p.qtys,[it.id!]:q}}))} style={{marginInlineStart:"auto",fontSize:11,color:"#0863ba",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>{isAr?"الكل":"All"}</button>
                </div>
              </div>);})}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={doPartial} style={{flex:1,padding:"12px",background:"#e67e22",color:"#fff",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>✅ {isAr?"حفظ الصرف":"Save"}</button>
              <button onClick={()=>setPartial(null)} style={{padding:"12px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
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
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:7,marginBottom:7}}>
                  <div><label style={{fontSize:10,fontWeight:700,color:"#aaa",display:"block",marginBottom:3}}>{isAr?"اسم الدواء":"Name"}</label><input value={it.medicine_name} onChange={e=>setRxItems(p=>p.map((x,xi)=>xi===i?{...x,medicine_name:e.target.value}:x))} style={{width:"100%",padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
                  <div><label style={{fontSize:10,fontWeight:700,color:"#aaa",display:"block",marginBottom:3}}>{isAr?"الكمية":"Qty"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} value={it.qty||1} onChange={e=>setRxItems(p=>p.map((x,xi)=>xi===i?{...x,qty:Number(e.target.value)}:x))} style={{width:"100%",padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",textAlign:"center"}}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  {([["dosage",isAr?"الجرعة":"Dosage"],["duration",isAr?"المدة":"Duration"]] as [keyof RxItem,string][]).map(([k,label])=>(
                    <div key={k}><label style={{fontSize:10,fontWeight:700,color:"#aaa",display:"block",marginBottom:3}}>{label}</label><input value={(it[k] as string)||""} onChange={e=>setRxItems(p=>p.map((x,xi)=>xi===i?{...x,[k]:e.target.value}:x))} style={{width:"100%",padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
                  ))}
                  <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",display:"block",marginBottom:3}}>{isAr?"التعليمات":"Instructions"}</label><input value={it.instructions} onChange={e=>setRxItems(p=>p.map((x,xi)=>xi===i?{...x,instructions:e.target.value}:x))} style={{width:"100%",padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:7,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
                </div>
              </div>
            ))}
            <button onClick={()=>setRxItems(p=>[...p,{medicine_name:"",dosage:"",duration:"",instructions:"",qty:1}])} style={{width:"100%",padding:"8px",border:"1.5px dashed #d0e4f7",borderRadius:9,background:"rgba(8,99,186,.03)",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:12}}>＋ {isAr?"إضافة دواء آخر":"Add Medicine"}</button>
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
function SalesTab({lang,medicines,sales,setSales,barcodeMode,setBarcodeMode,showNotif,currentUser,addLog,userId,onRefresh,broadcastScan,remoteScan,openCamera,onAddNewMedicine,pendingSaleBarcode,onPendingSaleConsumed}:{lang:Lang;medicines:Medicine[];sales:Sale[];setSales:React.Dispatch<React.SetStateAction<Sale[]>>;barcodeMode:BarcodeMode;setBarcodeMode:(m:BarcodeMode)=>void;showNotif:(n:ScanNotif,ms?:number)=>void;currentUser:User;addLog:(l:Omit<StockLog,"id">)=>void;userId:string|null;onRefresh:()=>void;broadcastScan:(code:string,mode:string)=>void;remoteScan:ScanEvent|null;openCamera:()=>void;onAddNewMedicine?:(barcode:string)=>void;pendingSaleBarcode?:string;onPendingSaleConsumed?:()=>void}) {
  const isAr=lang==="ar";
  const [showForm,setShowForm]=useState(false); const [items,setItems]=useState<SaleItem[]>([]);
  const [mQ,setMQ]=useState(""); const [discount,setDiscount]=useState(0); const [payment,setPayment]=useState<"cash"|"card"|"insurance">("cash");
  const [pName,setPName]=useState(""); const [rxId,setRxId]=useState(""); const [flashId,setFlashId]=useState<number|null>(null); const [printSale,setPrintSale]=useState<Sale|null>(null);
  const [returnSale,setReturnSale]=useState<Sale|null>(null); const [retQty,setRetQty]=useState<{[id:number]:number}>({}); const [retReason,setRetReason]=useState("");
  const [showClose,setShowClose]=useState(false); const [closeData,setCloseData]=useState<{closed:boolean;closing?:{cash_sales:number;card_sales:number;insurance_sales:number;cash_returns:number;expected_cash:number;counted_cash:number;difference:number;closed_by:string};preview?:{cash_sales:number;card_sales:number;insurance_sales:number;cash_returns:number;expected_cash:number}}|null>(null);
  const [countedCash,setCountedCash]=useState(""); const [closeNotes,setCloseNotes]=useState("");
  // ميزة 18: دفع متعدد | ميزة 19: كوبون
  const [multiPay,setMultiPay]=useState(false); const [payCash,setPayCash]=useState(0); const [payCard,setPayCard]=useState(0);
  const [coupon,setCoupon]=useState(""); const [couponVal,setCouponVal]=useState(0);
  const searchRef=useRef<HTMLInputElement|null>(null);
  const [unknownBarcode,setUnknownBarcode]=useState<string>("");

  const mRes=mQ.trim()?medicines.filter(m=>(m.name_ar+m.name_en).toLowerCase().includes(mQ.toLowerCase())||m.barcode.includes(mQ)).slice(0,6):[];

  const addToSale=useCallback((m:Medicine)=>{
    setItems(prev=>{const ex=prev.findIndex(i=>i.medicine_id===m.id);if(ex>=0)return prev.map((i,xi)=>xi===ex?{...i,qty:i.qty+1}:i);return[...prev,{medicine_id:m.id,medicine_name:isAr?m.name_ar:m.name_en,qty:1,unit_price:m.sell_price}];});
    setFlashId(m.id); setTimeout(()=>setFlashId(null),900); setMQ(""); if(!showForm) setShowForm(true);
  },[isAr,showForm]);

  const handleScan=useCallback((code:string)=>{
    const med=medicines.find(m=>m.barcode===code);
    if(!med){ setUnknownBarcode(code); showNotif({type:"warning",message:isAr?"باركود غير مسجّل":"Unregistered barcode",sub:code},2500); return; }
    setUnknownBarcode("");
    addToSale(med); showNotif({type:"success",message:isAr?`✅ ${med.name_ar}`:`✅ ${med.name_en}`,sub:`${med.sell_price} ${isAr?"ل.س":"SYP"}`},1800);
  },[medicines,isAr,addToSale,showNotif]);

  // ماسح سلكي محلي: يبثّ للأجهزة الأخرى ثم يعالج
  const handleLocalScan=useCallback((code:string)=>{ broadcastScan(code,"sale"); handleScan(code); },[broadcastScan,handleScan]);
  useBarcode(handleLocalScan,barcodeMode==="sale");

  // استقبال مسح من جهاز آخر (أو كاميرا) عندما يكون تبويب البيع نشطًا
  useEffect(()=>{
    if(!remoteScan)return;
    if(remoteScan.mode==="sale"||remoteScan.mode==="query"){ handleScan(remoteScan.code); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[remoteScan]);

  // باركود قادم من بطاقة المسح (زر بيع) → أضفه للفاتورة مباشرة
  useEffect(()=>{
    if(!pendingSaleBarcode) return;
    const med=medicines.find(m=>m.barcode===pendingSaleBarcode);
    if(med) addToSale(med);
    onPendingSaleConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingSaleBarcode]);

  const itemsDiscount=items.reduce((s,i)=>s+(i.item_discount||0)*i.qty,0);
  const subtotal=items.reduce((s,i)=>s+i.qty*i.unit_price,0);
  const total=Math.max(0,subtotal-itemsDiscount-discount-couponVal);
  const payedTotal=payCash+payCard;

  // ميزة 17: اختصارات لوحة المفاتيح
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      // F2: بيع جديد | F4: الماسح | Esc: إغلاق النموذج | Ctrl+Enter أو F9: إتمام
      if(e.key==="F2"){e.preventDefault();setShowForm(true);setTimeout(()=>searchRef.current?.focus(),50);}
      else if(e.key==="F4"){e.preventDefault();setBarcodeMode(barcodeMode==="sale"?null:"sale");if(barcodeMode!=="sale")setShowForm(true);}
      else if(e.key==="Escape"&&showForm){setShowForm(false);setItems([]);setDiscount(0);setPName("");setRxId("");setBarcodeMode(null);setMultiPay(false);setPayCash(0);setPayCard(0);setCoupon("");setCouponVal(0);}
      else if((e.key==="F9"||(e.ctrlKey&&e.key==="Enter"))&&showForm&&items.length>0){e.preventDefault();complete();}
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[showForm,items,barcodeMode,total,payCash,payCard,multiPay,discount,couponVal]);

  const complete=async()=>{
    if(items.length===0) return;
    // ميزة 18: تحقق أن مجموع الدفع المتعدد يساوي الإجمالي
    if(multiPay&&Math.abs(payedTotal-total)>0.01){
      showNotif({type:"error",message:isAr?`مجموع الدفع (${payedTotal}) لا يساوي الإجمالي (${total})`:`Split (${payedTotal}) ≠ total (${total})`},3000); return;
    }
    const cashier=isAr?currentUser.name_ar:currentUser.name_en;
    const date=new Date().toISOString().slice(0,10);
    // طريقة الدفع الفعلية: mixed عند الدفع المتعدد بقيمتين، وإلا المفردة
    const effectiveMethod=multiPay?(payCash>0&&payCard>0?"cash":payCard>0?"card":"cash"):payment;
    const payload={user_id:userId,items,total,discount:discount+itemsDiscount,payment_method:effectiveMethod,
      patient_name:pName||null,prescription_id:rxId||null,cashier,date,
      paid_cash:multiPay?payCash:(payment==="cash"?total:0),
      paid_card:multiPay?payCard:(payment==="card"?total:0),
      paid_insurance:multiPay?0:(payment==="insurance"?total:0),
      coupon_code:coupon||"",coupon_discount:couponVal||0};
    if(userId){
      const res=await fetch("/api/pharmacy/sales",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const json=await res.json();
      if(json.success){
        setSales(prev=>[json.sale,...prev]);
        items.forEach(it=>addLog({medicine_id:it.medicine_id,medicine_name:it.medicine_name,type:"sale",qty:it.qty,date,user:cashier,ref:`SALE-${json.sale.id}`}));
        setPrintSale(json.sale);
        onRefresh();
      } else { showNotif({type:"error",message:json.error||"Error"},3000); return; }
    } else {
      const ns:Sale={id:Math.max(0,...sales.map(s=>s.id))+1,date,items,total,payment_method:effectiveMethod,discount:discount+itemsDiscount,patient_name:pName||undefined,prescription_id:rxId||undefined,cashier,coupon_code:coupon,coupon_discount:couponVal};
      setSales(prev=>[ns,...prev]);
      items.forEach(it=>addLog({medicine_id:it.medicine_id,medicine_name:it.medicine_name,type:"sale",qty:it.qty,date,user:cashier,ref:`SALE-${ns.id}`}));
      setPrintSale(ns);
    }
    setItems([]); setDiscount(0); setPayment("cash"); setPName(""); setRxId(""); setShowForm(false); setBarcodeMode(null);
    setMultiPay(false); setPayCash(0); setPayCard(0); setCoupon(""); setCouponVal(0);
  };

  const openReturn=(s:Sale)=>{
    setReturnSale(s);
    const q:{[id:number]:number}={};
    s.items.forEach(it=>{ if(it.id) q[it.id]=0; });
    setRetQty(q); setRetReason("");
  };

  const submitReturn=async()=>{
    if(!returnSale||!userId) return;
    const items=returnSale.items.filter(it=>it.id&&retQty[it.id]>0).map(it=>({sale_item_id:it.id,medicine_id:it.medicine_id,medicine_name:it.medicine_name,qty:retQty[it.id!],unit_price:it.unit_price}));
    if(items.length===0){ showNotif({type:"error",message:isAr?"اختر كمية للإرجاع":"Select a quantity"},2500); return; }
    const cashier=isAr?currentUser.name_ar:currentUser.name_en;
    const res=await fetch("/api/pharmacy/returns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add",user_id:userId,sale_id:returnSale.id,items,reason:retReason||null,created_by:cashier})});
    const json=await res.json();
    if(json.success){
      showNotif({type:"success",message:isAr?"تم تسجيل المرتجع":"Return recorded"},2500);
      setReturnSale(null); onRefresh();
    } else { showNotif({type:"error",message:json.error||"Error"},3500); }
  };

  const today=new Date().toISOString().slice(0,10); const todaySales=sales.filter(s=>s.date===today); const todayTotal=todaySales.reduce((s,x)=>s+x.total,0);

  const openClose=async()=>{
    if(!userId) return;
    setShowClose(true); setCloseData(null); setCountedCash(""); setCloseNotes("");
    const res=await fetch(`/api/pharmacy/cash-closing?user_id=${userId}&date=${today}`);
    const json=await res.json();
    setCloseData(json);
  };

  const submitClose=async()=>{
    if(!userId||!closeData?.preview) return;
    if(countedCash===""){ showNotif({type:"error",message:isAr?"أدخل المبلغ النقدي المعدود":"Enter counted cash"},2500); return; }
    const cashier=isAr?currentUser.name_ar:currentUser.name_en;
    const res=await fetch("/api/pharmacy/cash-closing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,date:today,counted_cash:Number(countedCash),notes:closeNotes||null,closed_by:cashier})});
    const json=await res.json();
    if(json.success){ showNotif({type:"success",message:isAr?"تم تقفيل الصندوق":"Cash drawer closed"},2500); setShowClose(false); }
    else showNotif({type:"error",message:json.error||"Error"},3500);
  };
  const pm={cash:isAr?"نقداً":"Cash",card:isAr?"بطاقة":"Card",insurance:isAr?"تأمين":"Insurance"};
  const PayIc:{[k:string]:(p:{size?:number})=>React.JSX.Element}={cash:Icons.cash,card:Icons.card,insurance:Icons.shield};
  const resetForm=()=>{setShowForm(false);setItems([]);setDiscount(0);setPName("");setRxId("");setBarcodeMode(null);setMultiPay(false);setPayCash(0);setPayCard(0);setCoupon("");setCouponVal(0);};
  const avgSale=sales.length>0?Math.round(sales.reduce((t,x)=>t+x.total,0)/sales.length):0;
  const fmtN=(n:number)=>n>=1000000?(n/1000000).toFixed(1)+"M":n>=1000?(n/1000).toFixed(1)+"K":String(Math.round(n));

  return (
    <div>
      {/* ═══ رأس الصفحة ═══ */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:14,flexWrap:"wrap",marginBottom:16}}>
        <div>
          <h1 style={{fontSize:"clamp(19px,3vw,24px)",fontWeight:800,color:"#1a2840",letterSpacing:"-.4px",marginBottom:3}}>{isAr?"نقطة البيع":"Point of Sale"}</h1>
          <p style={{fontSize:12.5,color:"#8a94a3",fontWeight:500}}>{isAr?"F2 بيع جديد · F4 الماسح · F9 إتمام · Esc إلغاء":"F2 new · F4 scanner · F9 complete · Esc cancel"}</p>
        </div>
        <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={openClose} className="inv-ghost-btn"><Icons.receipt size={16}/> <span className="hide-xs">{isAr?"تقفيل الصندوق":"Close Drawer"}</span></button>
          <button onClick={openCamera} className="inv-ghost-btn"><Icons.scan size={16}/> <span className="hide-xs">{isAr?"مسح باركود":"Scan"}</span></button>
          <button onClick={()=>{setBarcodeMode(barcodeMode==="sale"?null:"sale");if(barcodeMode!=="sale")setShowForm(true);}}
            style={{display:"flex",alignItems:"center",gap:7,padding:"11px 16px",borderRadius:12,fontFamily:"'Rubik',sans-serif",fontSize:12.5,fontWeight:700,cursor:"pointer",transition:"all .18s",
              border:`1.5px solid ${barcodeMode==="sale"?"#8e44ad":"#e4e9f0"}`,
              background:barcodeMode==="sale"?"#8e44ad":"#fff",color:barcodeMode==="sale"?"#fff":"#5a6472",
              boxShadow:barcodeMode==="sale"?"0 6px 18px rgba(142,68,173,.35)":"0 1px 4px rgba(20,40,70,.04)"}}>
            <Icons.scan size={16}/>{isAr?"وضع الماسح":"Scanner"}{barcodeMode==="sale"&&<span style={{width:7,height:7,borderRadius:"50%",background:"#fff",animation:"pulse 1.5s infinite"}}/>}
          </button>
          <button onClick={()=>{setShowForm(true);setTimeout(()=>searchRef.current?.focus(),60);}} style={{display:"flex",alignItems:"center",gap:7,padding:"12px 22px",background:"linear-gradient(135deg,#0863ba,#0a4f96)",color:"#fff",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:13.5,fontWeight:800,cursor:"pointer",boxShadow:"0 8px 22px rgba(8,99,186,.32)"}}>
            <Icons.plus size={17}/> {isAr?"بيع جديد":"New Sale"}
          </button>
        </div>
      </div>

      {/* ═══ بطاقات إحصائية ═══ */}
      <div className="pos-stats" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {([
          {label:isAr?"مبيعات اليوم":"Today's Sales",val:String(todaySales.length),sub:isAr?"عملية بيع":"transactions",c:"#0863ba",Ic:Icons.cart},
          {label:isAr?"إيرادات اليوم":"Today's Revenue",val:fmtN(todayTotal),sub:isAr?"ل.س":"SYP",c:"#1e8449",Ic:Icons.money},
          {label:isAr?"متوسط الفاتورة":"Avg. Sale",val:fmtN(avgSale),sub:isAr?"ل.س لكل عملية":"SYP per sale",c:"#8e44ad",Ic:Icons.reports},
        ]).map((st,i)=>(
          <div key={i} style={{background:"#fff",border:"1.5px solid #edf1f6",borderRadius:16,padding:"16px 17px",position:"relative",overflow:"hidden",boxShadow:"0 2px 10px rgba(20,40,70,.05)"}}>
            <span style={{position:"absolute",insetInlineStart:0,top:14,bottom:14,width:3.5,borderRadius:4,background:st.c,opacity:.85}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:11.5,fontWeight:700,color:"#8a94a3",marginBottom:7}}>{st.label}</div>
                <div style={{fontSize:26,fontWeight:800,color:"#1a2840",lineHeight:1,letterSpacing:"-.5px"}}>{st.val}</div>
                <div style={{fontSize:10.5,color:"#aab3bf",fontWeight:600,marginTop:5}}>{st.sub}</div>
              </div>
              <span style={{width:40,height:40,borderRadius:12,background:`${st.c}10`,color:st.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><st.Ic size={19}/></span>
            </div>
          </div>
        ))}
      </div>

      {/* تنبيه: باركود ممسوح غير مسجّل أثناء البيع */}
      {unknownBarcode&&(
        <div style={{background:"#fff",borderInlineStart:"4px solid #e67e22",border:"1.5px solid #f5dcc2",borderRadius:14,padding:"13px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",animation:"slideUp .3s ease",boxShadow:"0 4px 16px rgba(230,126,34,.1)"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <span style={{width:40,height:40,borderRadius:11,background:"rgba(230,126,34,.12)",color:"#d35400",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.scan size={20}/></span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#d35400"}}>{isAr?"باركود غير مسجّل في المخزون":"Barcode not in inventory"}</div>
              <div style={{fontSize:12,color:"#e67e22",fontFamily:"monospace",letterSpacing:.5,marginTop:2}}>{unknownBarcode}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {onAddNewMedicine&&<button onClick={()=>{onAddNewMedicine(unknownBarcode);setUnknownBarcode("");}} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 18px",background:"#27ae60",color:"#fff",border:"none",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 13px rgba(39,174,96,.3)",whiteSpace:"nowrap"}}><Icons.plus size={15}/> {isAr?"إضافة كدواء جديد":"Add as new"}</button>}
            <button onClick={()=>setUnknownBarcode("")} style={{padding:"10px 14px",background:"#fff",color:"#999",border:"1.5px solid #eee",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,cursor:"pointer"}}>{isAr?"تجاهل":"Dismiss"}</button>
          </div>
        </div>
      )}

      {/* ═══ نموذج البيع (POS) ═══ */}
      {showForm&&(
        <div style={{background:"#fff",borderRadius:18,border:`1.5px solid ${barcodeMode==="sale"?"rgba(142,68,173,.45)":"#edf1f6"}`,boxShadow:barcodeMode==="sale"?"0 8px 30px rgba(142,68,173,.14)":"0 4px 22px rgba(20,40,70,.07)",overflow:"hidden",marginBottom:16,animation:"slideUp .3s ease"}}>
          {/* رأس النموذج */}
          <div style={{padding:"14px 20px",borderBottom:"1.5px solid #f2f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",background:barcodeMode==="sale"?"rgba(142,68,173,.05)":"#fafbfd"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{width:36,height:36,borderRadius:11,background:barcodeMode==="sale"?"rgba(142,68,173,.12)":"rgba(8,99,186,.09)",color:barcodeMode==="sale"?"#8e44ad":"#0863ba",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.cart size={18}/></span>
              <div>
                <div style={{fontSize:14.5,fontWeight:800,color:"#1a2840"}}>{isAr?"بيع جديد":"New Sale"}</div>
                {barcodeMode==="sale"&&<div style={{fontSize:10.5,fontWeight:700,color:"#8e44ad",display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#8e44ad",animation:"pulse 1.5s infinite"}}/>{isAr?"الماسح نشط — امسح الباركود من أي جهاز":"Scanner active — scan from any device"}</div>}
              </div>
            </div>
            <button onClick={resetForm} style={{width:32,height:32,borderRadius:9,border:"1.5px solid #eef0f3",background:"#fff",cursor:"pointer",color:"#8a94a0",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.close size={15}/></button>
          </div>

          <div className="pos-grid" style={{display:"grid",gridTemplateColumns:"1fr 330px",gap:0}}>
            {/* ── العمود الأيمن: البحث والسلة ── */}
            <div style={{padding:"18px 20px",borderInlineEnd:"1.5px solid #f2f5f9"}}>
              <div style={{position:"relative",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:10,background:"#f6f8fb",border:"1.5px solid #e8edf3",borderRadius:12,padding:"13px 15px"}}>
                  <span style={{color:"#9aa8b6",display:"flex"}}><Icons.search size={17}/></span>
                  <input ref={searchRef} value={mQ} onChange={e=>setMQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&mRes.length>0){e.preventDefault();addToSale(mRes[0]);}}} placeholder={isAr?"ابحث بالاسم أو الباركود — Enter لإضافة الأول":"Search name or barcode — Enter adds first"} style={{border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:13.5,width:"100%",direction:isAr?"rtl":"ltr",color:"#1a2840"}}/>
                  {mQ&&<button onClick={()=>setMQ("")} style={{background:"none",border:"none",cursor:"pointer",color:"#9aa8b6",display:"flex"}}><Icons.close size={14}/></button>}
                </div>
                {mRes.length>0&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",borderRadius:12,boxShadow:"0 12px 36px rgba(0,0,0,.13)",border:"1.5px solid #edf1f6",overflow:"hidden",marginTop:4}}>
                  {mRes.map(m=>(<div key={m.id} onClick={()=>addToSale(m)} style={{padding:"11px 15px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,borderBottom:"1px solid #f6f8fb"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f6f8fb"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:"#1a2840"}}>{isAr?m.name_ar:m.name_en||m.name_ar}</div><div style={{fontSize:9.5,color:"#aab3bf",fontFamily:"monospace",letterSpacing:.5,direction:"ltr"}}>{m.barcode} · {isAr?"مخزون":"Stock"} {m.stock}</div></div>
                    <span style={{color:"#0863ba",fontWeight:800,fontSize:13,flexShrink:0}}>{m.sell_price} <span style={{fontSize:10,fontWeight:500,color:"#aab3bf"}}>{isAr?"ل.س":"SYP"}</span></span>
                  </div>))}
                </div>}
              </div>

              {/* السلة */}
              {items.length===0?(
                <div style={{textAlign:"center",padding:"42px 20px",color:"#b8c0c9",background:"#fafbfd",borderRadius:14,border:"1.5px dashed #e4e9f0"}}>
                  <div style={{width:52,height:52,margin:"0 auto 12px",borderRadius:15,background:"#f2f5f9",color:"#9aa8b6",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.cart size={25}/></div>
                  <div style={{fontSize:13.5,fontWeight:700,color:"#7a8794",marginBottom:3}}>{isAr?"السلة فارغة":"Cart is empty"}</div>
                  <div style={{fontSize:11.5,color:"#aab3bf"}}>{isAr?"ابحث عن دواء أو امسح باركوداً لإضافته":"Search or scan a barcode to add items"}</div>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {items.map((it,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:flashId===it.medicine_id?"rgba(8,99,186,.07)":"#f8fafc",border:`1.5px solid ${flashId===it.medicine_id?"rgba(8,99,186,.35)":"#edf1f6"}`,borderRadius:12,transition:"all .3s",flexWrap:"wrap"}}>
                      <div style={{flex:"1 1 130px",minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#1a2840",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.medicine_name}</div>
                        <div style={{fontSize:10.5,color:"#aab3bf",fontWeight:600}}>{it.unit_price} {isAr?"ل.س":"SYP"} × {it.qty}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4,background:"#fff",border:"1.5px solid #e4e9f0",borderRadius:10,padding:3}}>
                        <button onClick={()=>setItems(p=>p.map((x,xi)=>xi===i?{...x,qty:Math.max(1,x.qty-1)}:x))} style={{width:28,height:28,border:"none",borderRadius:8,background:"#f2f5f9",cursor:"pointer",fontWeight:800,color:"#0863ba",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                        <span style={{fontSize:13.5,fontWeight:800,minWidth:26,textAlign:"center",color:"#1a2840"}}>{it.qty}</span>
                        <button onClick={()=>setItems(p=>p.map((x,xi)=>xi===i?{...x,qty:x.qty+1}:x))} style={{width:28,height:28,border:"none",borderRadius:8,background:"#f2f5f9",cursor:"pointer",fontWeight:800,color:"#0863ba",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>＋</button>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:3,background:"#fff",border:"1.5px solid #f0e0d0",borderRadius:9,padding:"4px 8px"}} title={isAr?"خصم للوحدة":"Per-unit discount"}>
                        <span style={{fontSize:11,color:"#e67e22",fontWeight:800}}>−</span>
                        <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} max={it.unit_price} value={it.item_discount||""} placeholder="0" onChange={e=>setItems(p=>p.map((x,xi)=>xi===i?{...x,item_discount:Math.max(0,Math.min(x.unit_price,Number(e.target.value)))}:x))} style={{width:40,border:"none",outline:"none",background:"none",fontFamily:"'Rubik',sans-serif",fontSize:12,textAlign:"center",color:"#e67e22",fontWeight:700}}/>
                      </div>
                      <div style={{fontSize:13.5,fontWeight:800,color:"#1e8449",minWidth:58,textAlign:"center"}}>{(it.qty*(it.unit_price-(it.item_discount||0))).toFixed(0)}</div>
                      <button onClick={()=>setItems(p=>p.filter((_,xi)=>xi!==i))} style={{width:30,height:30,border:"1.5px solid rgba(231,76,60,.25)",borderRadius:9,background:"rgba(231,76,60,.05)",cursor:"pointer",color:"#e74c3c",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icons.trash size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── العمود الأيسر: الدفع والملخص ── */}
            <div style={{padding:"18px 20px",background:"#fafbfd",display:"flex",flexDirection:"column",gap:13}}>
              {/* طريقة الدفع */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <label style={{fontSize:11,fontWeight:800,color:"#7a8794",textTransform:"uppercase",letterSpacing:.5}}>{isAr?"طريقة الدفع":"Payment"}</label>
                  <button onClick={()=>{setMultiPay(!multiPay);if(!multiPay){setPayCash(total);setPayCard(0);}}} style={{fontSize:10.5,fontWeight:700,padding:"4px 11px",borderRadius:20,border:`1.5px solid ${multiPay?"#8e44ad":"#e4e9f0"}`,background:multiPay?"rgba(142,68,173,.08)":"#fff",color:multiPay?"#8e44ad":"#8a94a3",cursor:"pointer",fontFamily:"'Rubik',sans-serif"}}>{multiPay?(isAr?"✓ دفع مقسّم":"✓ Split"):(isAr?"دفع مقسّم":"Split")}</button>
                </div>
                {!multiPay?(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {(["cash","card","insurance"] as const).map(k=>{const Ic=PayIc[k];const on=payment===k;return(
                      <button key={k} onClick={()=>setPayment(k)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"11px 6px",borderRadius:12,cursor:"pointer",fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:on?800:600,border:`1.5px solid ${on?"#0863ba":"#e4e9f0"}`,background:on?"rgba(8,99,186,.06)":"#fff",color:on?"#0863ba":"#8a94a3",transition:"all .15s"}}>
                        <Ic size={19}/>{pm[k]}
                      </button>
                    );})}
                  </div>
                ):(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div><label style={{fontSize:10,color:"#8a94a3",fontWeight:700,display:"flex",alignItems:"center",gap:4,marginBottom:4}}><Icons.cash size={13}/>{isAr?"نقداً":"Cash"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={payCash||""} onChange={e=>setPayCash(Math.max(0,Number(e.target.value)))} style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",fontWeight:700}}/></div>
                      <div><label style={{fontSize:10,color:"#8a94a3",fontWeight:700,display:"flex",alignItems:"center",gap:4,marginBottom:4}}><Icons.card size={13}/>{isAr?"بطاقة":"Card"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={payCard||""} onChange={e=>setPayCard(Math.max(0,Number(e.target.value)))} style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",fontWeight:700}}/></div>
                    </div>
                    <button onClick={()=>{setPayCash(total-payCard>=0?total-payCard:0);}} style={{marginTop:6,fontSize:10.5,color:"#0863ba",background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"'Rubik',sans-serif"}}>{isAr?"املأ الباقي نقداً":"Fill rest with cash"}</button>
                    <div style={{marginTop:5,fontSize:11,fontWeight:700,textAlign:"center",color:Math.abs(payedTotal-total)<0.01?"#1e8449":"#e74c3c"}}>{isAr?"المدفوع":"Paid"}: {payedTotal} / {total} {Math.abs(payedTotal-total)<0.01?"✓":(payedTotal<total?`(${isAr?"ناقص":"short"} ${(total-payedTotal).toFixed(0)})`:`(${isAr?"زائد":"over"} ${(payedTotal-total).toFixed(0)})`)}</div>
                  </div>
                )}
              </div>

              {/* خصومات */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={{fontSize:10.5,fontWeight:700,color:"#8a94a3",display:"block",marginBottom:4}}>{isAr?"خصم إجمالي":"Discount"}</label><input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={discount||""} placeholder="0" onChange={e=>setDiscount(Number(e.target.value))} style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/></div>
                <div><label style={{fontSize:10.5,fontWeight:700,color:"#8a94a3",display:"block",marginBottom:4}}>{isAr?"كوبون":"Coupon"}</label>
                  <div style={{display:"flex",gap:4}}>
                    <input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder={isAr?"الرمز":"Code"} style={{flex:1,minWidth:0,padding:"9px 9px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",direction:"ltr"}}/>
                    <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} value={couponVal||""} placeholder="0" onChange={e=>setCouponVal(Math.max(0,Number(e.target.value)))} title={isAr?"قيمة الكوبون":"Value"} style={{width:54,padding:"9px 6px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:12,outline:"none",textAlign:"center",color:"#8e44ad",fontWeight:700}}/>
                  </div>
                </div>
              </div>

              {/* المريض والوصفة */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={{fontSize:10.5,fontWeight:700,color:"#8a94a3",display:"block",marginBottom:4}}>{isAr?"اسم المريض":"Patient"}</label><input value={pName} onChange={e=>setPName(e.target.value)} style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
                <div><label style={{fontSize:10.5,fontWeight:700,color:"#8a94a3",display:"block",marginBottom:4}}>{isAr?"رقم الوصفة":"Rx ID"}</label><input value={rxId} onChange={e=>setRxId(e.target.value)} style={{width:"100%",padding:"9px 11px",border:"1.5px solid #e4e9f0",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:"ltr"}}/></div>
              </div>

              {/* الملخص */}
              <div style={{background:"#fff",border:"1.5px solid #e4e9f0",borderRadius:13,padding:"13px 15px",marginTop:"auto"}}>
                {(itemsDiscount>0||discount>0||couponVal>0)&&<div style={{fontSize:11.5,color:"#7a8794",marginBottom:8,display:"flex",flexDirection:"column",gap:4}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span>{isAr?"المجموع الفرعي":"Subtotal"}</span><span style={{fontWeight:700}}>{subtotal.toFixed(0)}</span></div>
                  {itemsDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#e67e22"}}><span>{isAr?"خصم الأصناف":"Item disc."}</span><span>−{itemsDiscount.toFixed(0)}</span></div>}
                  {discount>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#e67e22"}}><span>{isAr?"خصم إجمالي":"Discount"}</span><span>−{discount.toFixed(0)}</span></div>}
                  {couponVal>0&&<div style={{display:"flex",justifyContent:"space-between",color:"#8e44ad"}}><span>{isAr?"كوبون":"Coupon"}{coupon&&` (${coupon})`}</span><span>−{couponVal.toFixed(0)}</span></div>}
                </div>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontSize:12.5,fontWeight:800,color:"#7a8794"}}>{isAr?"الإجمالي":"Total"}</span>
                  <span style={{fontSize:27,fontWeight:900,color:"#0863ba",letterSpacing:"-.5px"}}>{total}<span style={{fontSize:12,fontWeight:600,color:"#aab3bf"}}> {isAr?"ل.س":"SYP"}</span></span>
                </div>
              </div>

              <button onClick={complete} disabled={items.length===0} style={{width:"100%",padding:"15px",background:items.length===0?"#d3d9e0":"linear-gradient(135deg,#1e8449,#27ae60)",color:"#fff",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:800,cursor:items.length===0?"not-allowed":"pointer",boxShadow:items.length===0?"none":"0 8px 22px rgba(39,174,96,.35)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .18s"}}>
                <Icons.cart size={18}/>{isAr?`إتمام البيع${items.length>0?` (${items.length})`:""}`:`Complete Sale${items.length>0?` (${items.length})`:""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ سجل المبيعات ═══ */}
      <div style={{background:"#fff",borderRadius:18,border:"1.5px solid #edf1f6",boxShadow:"0 4px 22px rgba(20,40,70,.06)",overflow:"hidden"}}>
        <div style={{padding:"15px 20px",borderBottom:"1.5px solid #f2f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc"}}>
          <span style={{fontSize:13.5,fontWeight:800,color:"#1a2840",display:"flex",alignItems:"center",gap:8}}><Icons.log size={16}/>{isAr?"سجل المبيعات":"Sales History"}</span>
          <span style={{fontSize:11,color:"#9aa8b6",fontWeight:600}}>{sales.length} {isAr?"عملية":"transactions"}</span>
        </div>
        {sales.length===0?(
          <div style={{textAlign:"center",padding:"46px 20px",color:"#b8c0c9"}}>
            <div style={{width:54,height:54,margin:"0 auto 12px",borderRadius:16,background:"#f2f5f9",color:"#9aa8b6",display:"flex",alignItems:"center",justifyContent:"center"}}><Icons.cart size={25}/></div>
            <div style={{fontSize:13.5,fontWeight:700,color:"#7a8794"}}>{isAr?"لا توجد مبيعات بعد":"No sales yet"}</div>
          </div>
        ):sales.map(s=>{
          const returnedTotal=(s.returns||[]).reduce((sum,r)=>sum+r.total_refund,0);
          const fullyReturned=s.items.every(it=>(it.returned_qty||0)>=it.qty);
          const PIc=PayIc[s.payment_method]||Icons.cash;
          return (
            <div key={s.id} style={{padding:"13px 20px",borderBottom:"1px solid #f2f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:11,flex:1,minWidth:0}}>
                <span style={{width:38,height:38,borderRadius:11,background:"rgba(8,99,186,.07)",color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icons.cart size={17}/></span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a2840",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.patient_name||`${isAr?"بيع":"Sale"} #${s.id}`}</div>
                  <div style={{fontSize:10.5,color:"#aab3bf",fontWeight:600}}>{s.date} · {s.items.length} {isAr?"أصناف":"items"} · {s.cashier}{returnedTotal>0&&<span style={{color:"#e67e22",fontWeight:700}}> · {isAr?"مرتجع":"Returned"} {returnedTotal}</span>}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:10.5,padding:"4px 10px",borderRadius:20,background:"#f2f5f9",color:"#5a7189",fontWeight:700}}><PIc size={13}/>{pm[s.payment_method]}</span>
                <span style={{fontSize:14.5,fontWeight:800,color:"#1a2840"}}>{s.total}<span style={{fontSize:10,fontWeight:500,color:"#aab3bf"}}> {isAr?"ل.س":"SYP"}</span></span>
                {!fullyReturned&&<button onClick={()=>openReturn(s)} className="action-icon-btn" title={isAr?"إرجاع":"Return"} style={{color:"#e67e22",borderColor:"rgba(230,126,34,.3)"}}><Icons.undo size={15}/></button>}
                <button onClick={()=>setPrintSale(s)} className="action-icon-btn" title={isAr?"طباعة":"Print"} style={{color:"#5a6472"}}><Icons.print size={15}/></button>
              </div>
            </div>
          );
        })}
      </div>
      {returnSale&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setReturnSale(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"24px",width:"min(96vw,480px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>↩️ {isAr?"إرجاع من البيع":"Return from Sale"} #{returnSale.id}</h2><button onClick={()=>setReturnSale(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            {returnSale.items.map(it=>{
              const remaining=it.qty-(it.returned_qty||0);
              if(remaining<=0||!it.id) return null;
              return (
                <div key={it.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:10,padding:"9px 11px",background:"#f7f9fc",borderRadius:10}}>
                  <div style={{flex:1,fontSize:13,fontWeight:600,color:"#353535"}}>{it.medicine_name}<div style={{fontSize:10,color:"#aaa"}}>{isAr?"متاح للإرجاع":"Available"}: {remaining}</div></div>
                  <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={0} max={remaining} value={retQty[it.id]||""} onChange={e=>setRetQty(p=>({...p,[it.id!]:Math.max(0,Math.min(remaining,Number(e.target.value)))}))} style={{width:64,padding:"7px 9px",border:"1.5px solid #e0e7ef",borderRadius:8,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",textAlign:"center"}}/>
                </div>
              );
            })}
            <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"سبب الإرجاع (اختياري)":"Reason (optional)"}</label><input value={retReason} onChange={e=>setRetReason(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/></div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={submitReturn} className="btn-primary-lg" style={{flex:1,justifyContent:"center",background:"#e67e22",boxShadow:"0 4px 14px rgba(230,126,34,.35)"}}>✅ {isAr?"تأكيد الإرجاع":"Confirm Return"}</button>
              <button onClick={()=>setReturnSale(null)} style={{padding:"13px 22px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
            </div>
          </div>
        </div>
      )}
      {showClose&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setShowClose(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"24px",width:"min(96vw,440px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h2 style={{fontSize:15,fontWeight:800,color:"#353535"}}>🧾 {isAr?"تقفيل الصندوق":"Close Drawer"} — {today}</h2><button onClick={()=>setShowClose(false)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa"}}>✕</button></div>
            {!closeData?(
              <div style={{textAlign:"center",padding:20,color:"#aaa"}}>{isAr?"جارِ التحميل...":"Loading..."}</div>
            ):closeData.closed&&closeData.closing?(
              <div>
                <div style={{background:closeData.closing.difference===0?"rgba(39,174,96,.08)":"rgba(230,126,34,.08)",border:`1.5px solid ${closeData.closing.difference===0?"rgba(39,174,96,.3)":"rgba(230,126,34,.3)"}`,borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
                  <div style={{fontSize:12,color:"#888",marginBottom:4}}>{isAr?"تم تقفيل هذا اليوم مسبقًا بواسطة":"Already closed by"} {closeData.closing.closed_by}</div>
                  <div style={{fontSize:22,fontWeight:800,color:closeData.closing.difference===0?"#27ae60":"#e67e22"}}>{closeData.closing.difference>0?"+":""}{closeData.closing.difference} {isAr?"ل.س":"SYP"}</div>
                  <div style={{fontSize:11,color:"#999"}}>{isAr?"الفرق (معدود - متوقع)":"Difference (counted - expected)"}</div>
                </div>
                {[[isAr?"مبيعات نقدي":"Cash sales",closeData.closing.cash_sales],[isAr?"مبيعات بطاقة":"Card sales",closeData.closing.card_sales],[isAr?"مبيعات تأمين":"Insurance sales",closeData.closing.insurance_sales],[isAr?"مرتجعات نقدية":"Cash returns",-closeData.closing.cash_returns],[isAr?"المتوقع بالدرج":"Expected in drawer",closeData.closing.expected_cash],[isAr?"المعدود فعليًا":"Actually counted",closeData.closing.counted_cash]].map(([label,val],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:i<5?"1px solid #f0f2f5":"none",fontSize:13}}><span style={{color:"#888"}}>{label}</span><span style={{fontWeight:700,color:"#353535"}}>{val as number}</span></div>
                ))}
              </div>
            ):closeData.preview?(
              <div>
                {[[isAr?"مبيعات نقدي":"Cash sales",closeData.preview.cash_sales],[isAr?"مبيعات بطاقة":"Card sales",closeData.preview.card_sales],[isAr?"مبيعات تأمين":"Insurance sales",closeData.preview.insurance_sales],[isAr?"مرتجعات نقدية":"Cash returns",-closeData.preview.cash_returns]].map(([label,val],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span style={{color:"#888"}}>{label}</span><span style={{fontWeight:700,color:"#353535"}}>{val as number}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1.5px solid #eef0f3",marginTop:6,marginBottom:16}}><span style={{fontWeight:800,color:"#353535"}}>{isAr?"المتوقع بالدرج نقدًا":"Expected cash in drawer"}</span><span style={{fontWeight:800,color:"#0863ba",fontSize:16}}>{closeData.preview.expected_cash} {isAr?"ل.س":"SYP"}</span></div>
                <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"المبلغ النقدي المعدود فعليًا":"Actual cash counted"}</label>
                <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} value={countedCash} onChange={e=>setCountedCash(e.target.value)} placeholder="0" style={{width:"100%",padding:"11px 14px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:15,fontWeight:700,outline:"none",marginBottom:12}}/>
                {countedCash!==""&&<div style={{textAlign:"center",marginBottom:12,fontSize:13,fontWeight:700,color:Number(countedCash)-closeData.preview.expected_cash===0?"#27ae60":"#e67e22"}}>{isAr?"الفرق":"Difference"}: {Number(countedCash)-closeData.preview.expected_cash>0?"+":""}{(Number(countedCash)-closeData.preview.expected_cash).toFixed(2)}</div>}
                <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{isAr?"ملاحظات (اختياري)":"Notes (optional)"}</label>
                <input value={closeNotes} onChange={e=>setCloseNotes(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr",marginBottom:16}}/>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={submitClose} className="btn-primary-lg" style={{flex:1,justifyContent:"center",background:"#2c3e50",boxShadow:"0 4px 14px rgba(44,62,80,.35)"}}>🔒 {isAr?"تأكيد التقفيل":"Confirm Close"}</button>
                  <button onClick={()=>setShowClose(false)} style={{padding:"13px 22px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:13,fontFamily:"'Rubik',sans-serif",fontSize:14,cursor:"pointer"}}>{isAr?"إلغاء":"Cancel"}</button>
                </div>
              </div>
            ):null}
          </div>
        </div>
      )}
      {printSale&&<PrintModal sale={printSale} lang={lang} cashierName={isAr?currentUser.name_ar:currentUser.name_en} onClose={()=>setPrintSale(null)}/>}
    </div>
  );
}

function ReportsTab({lang,medicines,sales,userId,currentUser}:{lang:Lang;medicines:Medicine[];sales:Sale[];userId:string|null;currentUser:User}) {
  const isAr=lang==="ar";
  const [profit,setProfit]=useState<{byMedicine:{medicine_id:number;medicine_name:string;qty_sold:number;revenue:number;cost:number;profit:number;margin:number}[];totals:{revenue:number;cost:number;profit:number;margin:number}}|null>(null);
  const [lockedUntil,setLockedUntil]=useState<string|null>(null);
  const [lockDate,setLockDate]=useState(""); const [lockMsg,setLockMsg]=useState("");

  useEffect(()=>{
    if(!userId) return;
    fetch(`/api/pharmacy/profitability?user_id=${userId}`).then(r=>r.json()).then(setProfit);
    fetch(`/api/pharmacy/period-lock?user_id=${userId}`).then(r=>r.json()).then(j=>setLockedUntil(j.lock?.locked_until||"1900-01-01"));
  },[userId,sales.length]);

  const closePeriod=async()=>{
    if(!userId||!lockDate){ return; }
    const closed_by=isAr?currentUser.name_ar:currentUser.name_en;
    const res=await fetch("/api/pharmacy/period-lock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:userId,locked_until:lockDate,closed_by})});
    const json=await res.json();
    if(json.success){ setLockedUntil(json.locked_until); setLockMsg(isAr?"تم إقفال الفترة بنجاح":"Period closed successfully"); setLockDate(""); }
    else setLockMsg(json.error||"Error");
    setTimeout(()=>setLockMsg(""),4000);
  };

  const totalRev=sales.reduce((s,x)=>s+x.total,0);
  const totalProfit=profit?.totals.profit ?? null;
  const catS:{[k:string]:number}={}; Object.keys(CAT).forEach(k=>{catS[k]=0;});
  sales.forEach(sale=>sale.items.forEach(it=>{const m=medicines.find(x=>x.id===it.medicine_id);if(m)catS[m.category]=(catS[m.category]||0)+it.qty*it.unit_price;}));
  const topCat=Object.entries(catS).sort((a,b)=>b[1]-a[1]); const maxC=topCat[0]?.[1]||1;
  const medS:{[k:number]:number}={}; sales.forEach(s=>s.items.forEach(it=>{medS[it.medicine_id]=(medS[it.medicine_id]||0)+it.qty;}));
  const topMeds=Object.entries(medS).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=>({...medicines.find(m=>m.id===Number(id))!,soldQty:qty})).filter(Boolean);

  // ═══ ميزة 26: تحليل ABC — تصنيف الأصناف حسب مساهمتها في الإيراد ═══
  const abc=useMemo(()=>{
    const rev:Record<number,{name:string;revenue:number;qty:number}>={};
    sales.forEach(s=>s.items.forEach(it=>{
      const net=it.qty*(it.unit_price-(it.item_discount||0));
      if(!rev[it.medicine_id])rev[it.medicine_id]={name:it.medicine_name,revenue:0,qty:0};
      rev[it.medicine_id].revenue+=net; rev[it.medicine_id].qty+=it.qty;
    }));
    const rows=Object.entries(rev).map(([id,v])=>({medicine_id:Number(id),...v})).sort((a,b)=>b.revenue-a.revenue);
    const totalRevenue=rows.reduce((s,r)=>s+r.revenue,0)||1;
    let cum=0;
    return rows.map(r=>{cum+=r.revenue;const cumPct=(cum/totalRevenue)*100;
      const cls:"A"|"B"|"C"=cumPct<=80?"A":cumPct<=95?"B":"C";
      return {...r,pct:(r.revenue/totalRevenue)*100,cumPct,cls};});
  },[sales]);
  const abcSummary=useMemo(()=>{const g={A:{count:0,rev:0},B:{count:0,rev:0},C:{count:0,rev:0}};
    abc.forEach(r=>{g[r.cls].count++;g[r.cls].rev+=r.revenue;});return g;},[abc]);

  // ═══ ميزة 25: تصدير CSV (متوافق مع Excel، بترميز UTF-8 BOM للعربية) ═══
  const downloadCSV=(filename:string,rows:(string|number)[][])=>{
    const csv=rows.map(r=>r.map(c=>{const s=String(c??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");
    a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
  };
  const exportSalesReport=()=>{
    const rows:(string|number)[][]=[[isAr?"رقم":"ID",isAr?"التاريخ":"Date",isAr?"المريض":"Patient",isAr?"عدد الأصناف":"Items",isAr?"الخصم":"Discount",isAr?"الكوبون":"Coupon",isAr?"نقدي":"Cash",isAr?"بطاقة":"Card",isAr?"تأمين":"Insurance",isAr?"الإجمالي":"Total",isAr?"الكاشير":"Cashier"]];
    sales.forEach(s=>rows.push([s.id,s.date,s.patient_name||"",s.items.length,s.discount||0,s.coupon_discount||0,s.paid_cash??(s.payment_method==="cash"?s.total:0),s.paid_card??(s.payment_method==="card"?s.total:0),s.paid_insurance??(s.payment_method==="insurance"?s.total:0),s.total,s.cashier]));
    downloadCSV(`sales-report-${new Date().toISOString().slice(0,10)}.csv`,rows);
  };
  const exportProfitReport=()=>{
    if(!profit)return;
    const rows:(string|number)[][]=[[isAr?"الصنف":"Item",isAr?"الكمية":"Qty",isAr?"الإيراد":"Revenue",isAr?"التكلفة":"Cost",isAr?"الربح":"Profit",isAr?"الهامش%":"Margin%"]];
    profit.byMedicine.forEach(m=>rows.push([m.medicine_name,m.qty_sold,m.revenue.toFixed(2),m.cost.toFixed(2),m.profit.toFixed(2),m.margin.toFixed(1)]));
    rows.push([isAr?"الإجمالي":"Total","",profit.totals.revenue.toFixed(2),profit.totals.cost.toFixed(2),profit.totals.profit.toFixed(2),profit.totals.margin.toFixed(1)]);
    downloadCSV(`profit-report-${new Date().toISOString().slice(0,10)}.csv`,rows);
  };
  const exportABC=()=>{
    const rows:(string|number)[][]=[[isAr?"الصنف":"Item",isAr?"الكمية":"Qty",isAr?"الإيراد":"Revenue","%",isAr?"التراكمي%":"Cumulative%",isAr?"التصنيف":"Class"]];
    abc.forEach(r=>rows.push([r.name,r.qty,r.revenue.toFixed(2),r.pct.toFixed(1),r.cumPct.toFixed(1),r.cls]));
    downloadCSV(`abc-analysis-${new Date().toISOString().slice(0,10)}.csv`,rows);
  };
  // ═══ ميزة 30: تصدير محاسبي عام (قيد يومية مبسّط متوافق مع برامج المحاسبة) ═══
  const exportAccounting=()=>{
    const rows:(string|number)[][]=[["Date","Reference","Account","Description","Debit","Credit"]];
    sales.forEach(s=>{
      const ref=`SALE-${s.id}`;
      const cash=s.paid_cash??(s.payment_method==="cash"?s.total:0);
      const card=s.paid_card??(s.payment_method==="card"?s.total:0);
      const ins=s.paid_insurance??(s.payment_method==="insurance"?s.total:0);
      if(cash>0)rows.push([s.date,ref,"Cash","Pharmacy sale",cash.toFixed(2),"0.00"]);
      if(card>0)rows.push([s.date,ref,"Card/Bank","Pharmacy sale",card.toFixed(2),"0.00"]);
      if(ins>0)rows.push([s.date,ref,"Insurance Receivable","Pharmacy sale",ins.toFixed(2),"0.00"]);
      rows.push([s.date,ref,"Sales Revenue","Pharmacy sale","0.00",s.total.toFixed(2)]);
    });
    downloadCSV(`accounting-export-${new Date().toISOString().slice(0,10)}.csv`,rows);
  };

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:11,marginBottom:15}}>
        {[{l:isAr?"إجمالي المبيعات":"Total Sales",v:`${totalRev} ${isAr?"ل.س":"SYP"}`,ic:"💰",c:"#0863ba",bg:"rgba(8,99,186,.08)"},{l:isAr?"صافي الربح (WAC)":"Net Profit (WAC)",v:totalProfit===null?(isAr?"...":"..."):`${totalProfit.toFixed(0)} ${isAr?"ل.س":"SYP"}`,ic:"📈",c:"#27ae60",bg:"rgba(39,174,96,.08)"},{l:isAr?"مخزون منخفض":"Low Stock",v:medicines.filter(m=>m.stock<m.min_stock).length,ic:"⚠️",c:"#e67e22",bg:"rgba(230,126,34,.08)"},{l:isAr?"منتهية الصلاحية":"Expired",v:medicines.filter(m=>isExp(medExpiry(m))).length,ic:"🚫",c:"#e74c3c",bg:"rgba(231,76,60,.08)"}].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:13,padding:"15px",border:`1.5px solid ${s.c}25`}}><div style={{fontSize:22,marginBottom:5}}>{s.ic}</div><div style={{fontSize:20,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:11,color:s.c,opacity:.7,marginTop:3,fontWeight:600}}>{s.l}</div></div>
        ))}
      </div>

      {/* ميزة 25 + 30: تصدير التقارير للمحاسب */}
      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"14px 16px",marginBottom:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>📤 {isAr?"تصدير التقارير":"Export Reports"}</h3>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {l:isAr?"📊 تقرير المبيعات":"📊 Sales",fn:exportSalesReport,c:"#0863ba"},
            {l:isAr?"📈 تقرير الربحية":"📈 Profit",fn:exportProfitReport,c:"#27ae60"},
            {l:isAr?"🔤 تحليل ABC":"🔤 ABC",fn:exportABC,c:"#8e44ad"},
            {l:isAr?"🧮 تصدير محاسبي":"🧮 Accounting",fn:exportAccounting,c:"#2c3e50"},
          ].map((b,i)=>(
            <button key={i} onClick={b.fn} disabled={sales.length===0} style={{padding:"9px 14px",border:`1.5px solid ${b.c}33`,borderRadius:10,background:`${b.c}0d`,color:b.c,fontFamily:"'Rubik',sans-serif",fontSize:12,fontWeight:700,cursor:sales.length===0?"not-allowed":"pointer",opacity:sales.length===0?.5:1}}>{b.l}</button>
          ))}
        </div>
        <div style={{fontSize:10,color:"#bbb",marginTop:8}}>{isAr?"ملفات CSV متوافقة مع Excel وبرامج المحاسبة (ترميز UTF-8)":"Excel & accounting-software compatible CSV (UTF-8)"}</div>
      </div>

      {/* ميزة 26: تحليل ABC */}
      {abc.length>0&&(
        <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",marginBottom:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
          <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>🔤 {isAr?"تحليل ABC لحركة المخزون":"ABC Inventory Analysis"}</h3>
          <div style={{fontSize:10,color:"#bbb",marginBottom:12}}>{isAr?"تصنيف الأصناف حسب مساهمتها في الإيراد: A الأهم (حتى 80%)، B (حتى 95%)، C الباقي":"By revenue contribution: A (top 80%), B (to 95%), C (rest)"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>
            {([["A","#27ae60"],["B","#e67e22"],["C","#95a5a6"]] as [("A"|"B"|"C"),string][]).map(([cls,c])=>(
              <div key={cls} style={{background:`${c}0e`,border:`1.5px solid ${c}30`,borderRadius:11,padding:"11px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800,color:c}}>{isAr?"فئة ":"Class "}{cls}</div>
                <div style={{fontSize:12,color:"#666",marginTop:3}}>{abcSummary[cls].count} {isAr?"صنف":"items"}</div>
                <div style={{fontSize:11,color:c,fontWeight:700,marginTop:2}}>{abcSummary[cls].rev.toFixed(0)} {isAr?"ل.س":"SYP"}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr .8fr 1fr .8fr .6fr",padding:"6px 0",borderBottom:"1.5px solid #eef0f3",fontSize:10,fontWeight:800,color:"#9aa2ab",textTransform:"uppercase"}}>
            <div>{isAr?"الصنف":"Item"}</div><div>{isAr?"الكمية":"Qty"}</div><div>{isAr?"الإيراد":"Revenue"}</div><div>{isAr?"التراكمي":"Cumul."}</div><div>{isAr?"الفئة":"Class"}</div>
          </div>
          {abc.slice(0,20).map(r=>{const c=r.cls==="A"?"#27ae60":r.cls==="B"?"#e67e22":"#95a5a6";
            return(<div key={r.medicine_id} style={{display:"grid",gridTemplateColumns:"2fr .8fr 1fr .8fr .6fr",padding:"8px 0",borderBottom:"1px solid #f7f9fc",fontSize:12,alignItems:"center"}}>
              <div style={{fontWeight:600,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
              <div style={{color:"#888"}}>{r.qty}</div>
              <div style={{color:"#555"}}>{r.revenue.toFixed(0)}</div>
              <div style={{color:"#aaa",fontSize:11}}>{r.cumPct.toFixed(0)}%</div>
              <div><span style={{fontSize:11,fontWeight:800,padding:"2px 9px",borderRadius:20,background:c,color:"#fff"}}>{r.cls}</span></div>
            </div>);})}
        </div>
      )}

      {profit&&profit.byMedicine.length>0&&(
        <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",marginBottom:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
          <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"الربحية لكل صنف (متوسط تكلفة مرجّح)":"Profitability by Item (WAC)"}</h3>
          <div style={{fontSize:10,color:"#bbb",marginBottom:11}}>{isAr?"محسوبة من التكلفة الفعلية وقت كل عملية بيع، بعد خصم المرتجعات":"Based on actual cost at sale time, net of returns"}</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr .8fr .9fr .9fr .8fr .7fr",padding:"6px 0",borderBottom:"1.5px solid #eef0f3",fontSize:10,fontWeight:800,color:"#9aa2ab",textTransform:"uppercase"}}>
            <div>{isAr?"الصنف":"Item"}</div><div>{isAr?"الكمية":"Qty"}</div><div>{isAr?"الإيراد":"Revenue"}</div><div>{isAr?"التكلفة":"Cost"}</div><div>{isAr?"الربح":"Profit"}</div><div>{isAr?"الهامش":"Margin"}</div>
          </div>
          {profit.byMedicine.slice(0,15).map(m=>(
            <div key={m.medicine_id} style={{display:"grid",gridTemplateColumns:"2fr .8fr .9fr .9fr .8fr .7fr",padding:"8px 0",borderBottom:"1px solid #f7f9fc",fontSize:12,alignItems:"center"}}>
              <div style={{fontWeight:600,color:"#353535",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.medicine_name}</div>
              <div style={{color:"#888"}}>{m.qty_sold}</div>
              <div style={{color:"#555"}}>{m.revenue.toFixed(0)}</div>
              <div style={{color:"#888"}}>{m.cost.toFixed(0)}</div>
              <div style={{fontWeight:700,color:m.profit>=0?"#27ae60":"#e74c3c"}}>{m.profit.toFixed(0)}</div>
              <div style={{fontWeight:700,color:m.margin>=30?"#27ae60":m.margin>=10?"#e67e22":"#e74c3c"}}>{m.margin.toFixed(0)}%</div>
            </div>
          ))}
        </div>
      )}

      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",marginBottom:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:13,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"المبيعات حسب التصنيف":"By Category"}</h3>
        {topCat.map(([k,v])=>{const cat=CAT[k];const pct=maxC>0?(v/maxC)*100:0;return(<div key={k} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,fontWeight:600,color:"#555"}}>{isAr?cat.ar:cat.en}</span><span style={{fontSize:12,fontWeight:700,color:cat.color}}>{v} {isAr?"ل.س":"SYP"}</span></div><div style={{height:7,background:"#f0f2f5",borderRadius:10,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:cat.color,borderRadius:10,transition:"width .6s ease"}}/></div></div>);})}
      </div>
      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:13,textTransform:"uppercase",letterSpacing:.5}}>{isAr?"الأكثر مبيعاً":"Best Selling"}</h3>
        {topMeds.map((m,i)=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 0",borderBottom:i<topMeds.length-1?"1px solid #f0f2f5":"none"}}><div style={{width:26,height:26,borderRadius:7,background:"#0863ba",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div><div style={{fontSize:9,color:"#aaa",fontFamily:"monospace"}}>{m.barcode}</div></div><div style={{fontSize:12,fontWeight:700,color:"#0863ba"}}>{m.soldQty} {isAr?"وحدة":"units"}</div></div>))}
        {topMeds.length===0&&<div style={{textAlign:"center",padding:"18px",color:"#ccc",fontSize:12}}>{isAr?"لا بيانات":"No data"}</div>}
      </div>

      <div style={{background:"#fff",borderRadius:15,border:"1.5px solid #eef0f3",padding:"16px 18px",marginTop:13,boxShadow:"0 2px 9px rgba(8,99,186,.04)"}}>
        <h3 style={{fontSize:12,fontWeight:800,color:"#353535",marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>🔒 {isAr?"إقفال الفترة المحاسبية":"Period Closing"}</h3>
        <div style={{fontSize:10,color:"#bbb",marginBottom:12}}>{isAr?"يمنع أي تعديل أو إضافة بأثر رجعي للتواريخ المقفلة":"Prevents retroactive edits or additions for locked dates"}</div>
        <div style={{background:"#f7f9fc",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#888"}}>{isAr?"مقفل حتى تاريخ":"Locked through"}</span>
          <span style={{fontSize:14,fontWeight:800,color:"#0863ba"}}>{lockedUntil&&lockedUntil!=="1900-01-01"?lockedUntil:(isAr?"لا يوجد إقفال بعد":"No closing yet")}</span>
        </div>
        <div style={{display:"flex",gap:9}}>
          <input type="date" value={lockDate} onChange={e=>setLockDate(e.target.value)} style={{flex:1,padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,outline:"none"}}/>
          <button onClick={closePeriod} disabled={!lockDate} style={{padding:"9px 18px",background:lockDate?"#2c3e50":"#ccc",color:"#fff",border:"none",borderRadius:9,fontFamily:"'Rubik',sans-serif",fontSize:13,fontWeight:700,cursor:lockDate?"pointer":"not-allowed",whiteSpace:"nowrap"}}>🔒 {isAr?"إقفال حتى هذا التاريخ":"Close through date"}</button>
        </div>
        {lockMsg&&<div style={{marginTop:9,fontSize:12,fontWeight:600,color:lockMsg.includes("نجاح")||lockMsg.includes("success")?"#27ae60":"#e74c3c"}}>{lockMsg}</div>}
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
  // ── المزامنة اللحظية عبر الأجهزة + ماسح الكاميرا ──
  const [remoteScan,setRemoteScan]=useState<ScanEvent|null>(null);
  const [showCamera,setShowCamera]=useState(false);
  const [showMore,setShowMore]=useState(false);
  const [pendingAddBarcode,setPendingAddBarcode]=useState<string>("");
  const [pendingSaleBarcode,setPendingSaleBarcode]=useState<string>("");
  const [pendingReturnBarcode,setPendingReturnBarcode]=useState<string>("");
  const [scanCard,setScanCard]=useState<{code:string;med:Medicine|null}|null>(null);
  const onRemoteScan=useCallback((ev:ScanEvent)=>{ setRemoteScan(ev); },[]);
  const { online:rtOnline, peers:rtPeers, broadcastScan }=usePharmacyChannel(supabase,supabaseUserId,onRemoteScan);
  const [loading,setLoading]=useState(true); // true: نمنع redirect قبل اكتمال getSession
  const [dataLoaded,setDataLoaded]=useState(false);
  const notifT=useRef<ReturnType<typeof setTimeout>|null>(null);

  const showNotif=useCallback((n:ScanNotif,ms=2200)=>{setNotif(n);clearTimeout(notifT.current);notifT.current=setTimeout(()=>setNotif(null),ms);},[]);

  // عند أي حدث مسح (كاميرا محلية أو جهاز آخر) → أظهر بطاقة النتيجة على هذا الجهاز
  useEffect(()=>{
    if(!remoteScan) return;
    if(remoteScan.device==="cam-live") return; // كاميرا البيع المستمرة: تضاف مباشرة بدون بطاقة
    // أوضاع تفاعلية: إدخال/إخراج/بيع — تُعالج مباشرة في التبويب النشط بدون إظهار البطاقة
    if(["stock_in","stock_out","sale"].includes(remoteScan.mode)||barcodeMode==="stock_in"||barcodeMode==="stock_out"||(activeTab==="sales"&&barcodeMode==="sale")){
      const known=medicines.some(m=>m.barcode===remoteScan.code);
      if(known) return; // معروف → نافذة الكمية/السلة تتولى الأمر
    }
    const med=medicines.find(m=>m.barcode===remoteScan.code)||null;
    setScanCard({code:remoteScan.code,med});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[remoteScan]);

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
  // handleLogin غير مستخدمة بعد الآن — الدخول يتم عبر /pharmacy/login

  // ── تحقق من جلسة Supabase ونوع الحساب عند التحميل ────────
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){
        const uid=session.user.id;
        const meta=session.user.user_metadata;
        // ── فرض نوع الحساب: صيدلية فقط — العيادات تُعاد لداشبوردها ──
        let accountType:string|undefined=meta?.account_type as string|undefined;
        if(!accountType){
          const{data:clinicRow}=await supabase.from("clinics").select("account_type, plan").eq("user_id",uid).maybeSingle();
          accountType=clinicRow?.account_type??(clinicRow?.plan==="pharmacy"?"pharmacy":"clinic");
        }
        if(accountType!=="pharmacy"){
          window.location.href="/dashboard";
          return;
        }
        setSupabaseUserId(uid);
        // الدور من بيانات الحساب، والافتراضي "مدير" ليظهر كل الميزات (التقارير، الموردون، إلخ)
        const role:UserRole=(meta?.pharmacy_role as UserRole)||"manager";
        const u:User={id:1,name_ar:meta?.owner_name||meta?.clinic_name||"مستخدم",name_en:meta?.owner_name||meta?.clinic_name||"User",role,username:session.user.email||"",password:"",avatar:"💊"};
        setCurrentUser(u);
        setActiveTab(ROLE[role].tabs[0]);
        // loadData تضبط loading=false في finally
        loadData(uid);
      } else {
        // لا جلسة → اسمح للـ render بعرض redirect
        setLoading(false);
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
      if(isSoon(medExpiry(m))) list.push({id:m.id*10+2,type:"expiring",medicine_id:m.id,medicine_name:m.name_ar,detail:isAr?`ينتهي في ${medExpiry(m)}`:`Expires ${medExpiry(m)}`,date:today,read:alertsRead.has(m.id*10+2)});
    });
    return list;
  },[medicines,lang,alertsRead]);

  const markAll=()=>setAlertsRead(new Set(alerts.map(a=>a.id)));
  const markOne=(id:number)=>setAlertsRead(s=>{const n=new Set(s);n.add(id);return n;});
  const unread=alerts.filter(a=>!a.read).length;

  useEffect(()=>{setBarcodeMode(null);},[activeTab]);

  // إذا لم تكن هناك جلسة → أعد التوجيه لصفحة الـ login
  if(!currentUser && !loading) {
    if (typeof window !== 'undefined') {
      window.location.href = '/portal?type=pharmacy';
    }
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f9fc',fontFamily:"'Rubik',sans-serif"}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:32,height:32,border:'3px solid #e0e0e0',borderTopColor:'#0863ba',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 12px'}}/>
          <div style={{fontSize:13,color:'#aaa'}}>جاري التحقق من الهوية...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }
  if(!currentUser) return null;

  const isAr=lang==="ar";
  const allowedTabs=ROLE[currentUser.role].tabs as TabKey[];
  const pendingRx=prescriptions.filter(p=>!p.dispensed).length;
  const reorderCount=medicines.filter(m=>m.stock<=(m.min_stock||0)).length;

  const badges:Partial<Record<TabKey,number>>={
    ...(pendingRx>0?{prescriptions:pendingRx}:{}),
    ...(reorderCount>0?{reorder:reorderCount}:{}),
    ...(unread>0?{alerts:unread}:{}),
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f4f7fb;color:#1a2840}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes slideUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
        @keyframes barcodeIn{from{opacity:0;transform:translateX(-50%) translateY(-16px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .main-anim{animation:fadeUp .35s ease both}
        .inv-row:hover{background:#fafbff!important}
        .inv-ghost-btn{display:flex;align-items:center;gap:6px;padding:11px 15px;border:1.5px solid #e4e9f0;border-radius:12px;background:#fff;color:#5a6472;font-family:'Rubik',sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;transition:all .18s;box-shadow:0 1px 4px rgba(20,40,70,.04)}
        .inv-ghost-btn:hover{border-color:#a4c4e4;color:#0863ba;background:rgba(8,99,186,.04)}
        .inv-stat-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(20,40,70,.1)!important}
        @media(max-width:1080px){.inv-stats{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:480px){.hide-xs{display:none}.inv-stats{gap:9px!important}.pos-stats{grid-template-columns:1fr!important}}
        @media(max-width:920px){.pos-grid{grid-template-columns:1fr!important}.pos-grid>div{border-inline-end:none!important}}
        .action-icon-btn{width:40px;height:40px;border-radius:10px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06);transform:translateY(-1px)}
        .filter-chip{padding:8px 15px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:12.5px;font-family:'Rubik',sans-serif;font-weight:600;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .tab-btn{padding:12px 19px;border-radius:12px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13.5px;font-weight:700;transition:all .2s;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:6px;position:relative}
        .tab-btn.active{background:#0863ba;color:#fff;box-shadow:0 4px 13px rgba(8,99,186,.3)}
        .tab-btn:not(.active){background:#fff;color:#888;border:1.5px solid #eef0f3}
        .tab-btn:not(.active):hover{border-color:#a4c4e4;color:#0863ba}
        .btn-primary-lg{display:inline-flex;align-items:center;gap:7px;padding:13px 24px;border:none;border-radius:13px;font-family:'Rubik',sans-serif;font-size:14.5px;font-weight:800;cursor:pointer;color:#fff;white-space:nowrap;transition:transform .15s,box-shadow .15s}
        .btn-primary-lg:hover{transform:translateY(-1px)}
        .btn-primary-lg:active{transform:translateY(0)}
        @media print{.no-print{display:none!important}}
        @media(max-width:768px){
          .nabd-sidebar{display:none!important}
          .nabd-topbar-desktop{display:none!important}
          .desktop-table{display:none!important}
          .mobile-cards{display:block!important}
          .nabd-main{margin:0!important;padding:0 0 96px!important}
          .content-pad{padding:12px 13px 0!important}
          .med-form-grid{grid-template-columns:1fr!important}
          .med-form-grid>div{grid-column:1/-1!important}
        }
        @media(min-width:769px){
          .nabd-pillnav,.nabd-topbar-mobile,.nabd-fab-mobile{display:none!important}
          .desktop-table{display:block!important}
          .mobile-cards{display:none!important}
          .nabd-main{margin-${isAr ? "right" : "left"}:236px}
        }
      `}</style>
      <div style={{fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f4f7fb"}}>
        <BarcodeNotif n={notif}/>
        <BarcodeBar mode={barcodeMode} isAr={isAr} onClose={()=>setBarcodeMode(null)}/>

        {loading&&(
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,height:3,background:"linear-gradient(90deg,#0863ba,#1a8fe3)",animation:"pulse 1s ease infinite"}}/>
        )}

        {/* ===== Sidebar (سطح المكتب) ===== */}
        <DesktopSidebar tabs={allowedTabs} active={activeTab} onSelect={(t)=>setActiveTab(t)} badges={badges} isAr={isAr}/>

        {/* ===== Topbar سطح المكتب ===== */}
        <div className="nabd-topbar-desktop no-print" style={{position:"fixed",top:0,insetInlineStart:236,insetInlineEnd:0,zIndex:30,height:62,background:"rgba(255,255,255,.85)",backdropFilter:"blur(16px)",borderBottom:"1px solid #eaeef4",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"0 26px"}}>
          {/* المسار */}
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <span style={{fontSize:12,color:"#9aa8b6",fontWeight:600,whiteSpace:"nowrap"}}>{isAr?"صيدلية نبض":"NABD Rx"}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c3ccd6" strokeWidth="2" strokeLinecap="round" style={{transform:isAr?"scaleX(-1)":"none",flexShrink:0}}><path d="M9 6l6 6-6 6"/></svg>
            <span style={{fontSize:14.5,fontWeight:800,color:"#1a2840",letterSpacing:"-.3px",whiteSpace:"nowrap"}}>{isAr?TAB_META[activeTab as TabKey]?.ar:TAB_META[activeTab as TabKey]?.en}</span>
          </div>
          {/* الإجراءات */}
          <div style={{display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
            {rtPeers>1&&<div title={isAr?`${rtPeers} أجهزة متزامنة`:`${rtPeers} devices synced`} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:"rgba(39,174,96,.09)",border:"1px solid rgba(39,174,96,.2)",borderRadius:20,fontSize:11,fontWeight:700,color:"#1a7a45"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:rtOnline?"#27ae60":"#e74c3c",animation:rtOnline?"pulse 2s infinite":"none"}}/>{rtPeers} {isAr?"أجهزة":"devices"}
            </div>}
            <span style={{width:1,height:26,background:"#eaeef4"}}/>
            <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")} style={{height:36,padding:"0 13px",border:"1.5px solid #e4e9f0",borderRadius:10,background:"#fff",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:11,fontWeight:800,cursor:"pointer"}}>{isAr?"EN":"AR"}</button>
            <div style={{display:"flex",alignItems:"center",gap:9,height:44,padding:"0 13px 0 9px",background:"#fff",border:"1.5px solid #e4e9f0",borderRadius:12}}>
              <div style={{width:30,height:30,borderRadius:9,background:`${ROLE[currentUser.role].color}12`,color:ROLE[currentUser.role].color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>{(isAr?currentUser.name_ar:currentUser.name_en).slice(0,1)}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#1a2840",lineHeight:1.15,maxWidth:130,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isAr?currentUser.name_ar:currentUser.name_en}</div>
                <div style={{fontSize:9.5,color:ROLE[currentUser.role].color,fontWeight:600}}>{isAr?ROLE[currentUser.role].ar:ROLE[currentUser.role].en}</div>
              </div>
            </div>
            <button onClick={async()=>{await supabase.auth.signOut();setCurrentUser(null);setSupabaseUserId(null);setDataLoaded(false);setMedicines([]);setSales([]);setSuppliers([]);setInvoices([]);setPrescriptions([]);setStockLog([]);}} title={isAr?"تسجيل الخروج":"Logout"} style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #e4e9f0",borderRadius:10,background:"#fff",color:"#9aa2ab",cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#e74c3c";(e.currentTarget as HTMLElement).style.borderColor="rgba(231,76,60,.35)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="#9aa2ab";(e.currentTarget as HTMLElement).style.borderColor="#e4e9f0";}}><Icons.logout size={17}/></button>
          </div>
        </div>

        {/* ===== Topbar موبايل ===== */}
        <div className="nabd-topbar-mobile no-print" style={{position:"sticky",top:0,zIndex:30,background:"rgba(255,255,255,.9)",backdropFilter:"blur(16px)",borderBottom:"1px solid #eaeef4",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"10px 14px",paddingTop:"max(10px,env(safe-area-inset-top))"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,#0863ba,#1a8fe3)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(8,99,186,.28)",flexShrink:0}}><Icons.box size={18}/></div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:15,fontWeight:800,color:"#1a2840",letterSpacing:"-.3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isAr?TAB_META[activeTab as TabKey]?.ar:TAB_META[activeTab as TabKey]?.en}</div>
              <div style={{fontSize:9.5,color:"#9aa8b6",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isAr?"صيدلية نبض":"NABD Rx"} · {isAr?currentUser.name_ar:currentUser.name_en}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
            {rtPeers>1&&<span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#1a7a45",background:"rgba(39,174,96,.09)",border:"1px solid rgba(39,174,96,.2)",padding:"5px 9px",borderRadius:14}}><span style={{width:6,height:6,borderRadius:"50%",background:"#27ae60"}}/>{rtPeers}</span>}
            <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")} style={{height:34,padding:"0 11px",border:"1.5px solid #e4e9f0",borderRadius:9,background:"#fff",color:"#0863ba",fontFamily:"'Rubik',sans-serif",fontSize:10.5,fontWeight:800,cursor:"pointer"}}>{isAr?"EN":"AR"}</button>
            <button onClick={async()=>{await supabase.auth.signOut();setCurrentUser(null);setSupabaseUserId(null);}} style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #e4e9f0",borderRadius:9,background:"#fff",color:"#9aa2ab",cursor:"pointer"}}><Icons.logout size={16}/></button>
          </div>
        </div>

        {/* ===== المحتوى ===== */}
        <main className="main-anim nabd-main" style={{padding:"82px 26px 44px",transition:"margin .3s",minHeight:"100vh"}}>
          <div className="content-pad">
            {loading&&!dataLoaded?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:320,gap:16}}>
                <div style={{width:42,height:42,borderRadius:"50%",border:"3px solid #eef0f3",borderTop:"3px solid #0863ba",animation:"spin 0.8s linear infinite"}}/>
                <div style={{fontSize:13,color:"#9aa2ab"}}>{isAr?"جاري تحميل بيانات الصيدلية...":"Loading pharmacy data..."}</div>
              </div>
            ):(
              <>
                {activeTab==="inventory"    &&<InventoryTab     lang={lang} stockLog={stockLog} medicines={medicines} setMedicines={(v)=>{setMedicines(v); if(supabaseUserId) loadData(supabaseUserId);}} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} showNotif={showNotif} addLog={addLog} currentUser={currentUser} userId={supabaseUserId} broadcastScan={broadcastScan} remoteScan={remoteScan} openCamera={()=>setShowCamera(true)} pendingAddBarcode={pendingAddBarcode} onPendingConsumed={()=>setPendingAddBarcode("")} pendingReturnBarcode={pendingReturnBarcode} onPendingReturnConsumed={()=>setPendingReturnBarcode("")}/>}
                {activeTab==="prescriptions"&&<PrescriptionsTab lang={lang} prescriptions={prescriptions} setPrescriptions={setPrescriptions} currentUser={currentUser} addLog={addLog} medicines={medicines} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="sales"        &&<SalesTab         lang={lang} medicines={medicines} sales={sales} setSales={setSales} barcodeMode={barcodeMode} setBarcodeMode={setBarcodeMode} showNotif={showNotif} currentUser={currentUser} addLog={addLog} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)} broadcastScan={broadcastScan} remoteScan={remoteScan} openCamera={()=>setShowCamera(true)} onAddNewMedicine={(bc)=>{setPendingAddBarcode(bc);setActiveTab("inventory");}} pendingSaleBarcode={pendingSaleBarcode} onPendingSaleConsumed={()=>setPendingSaleBarcode("")}/>}
                {activeTab==="suppliers"    &&<SuppliersTab     lang={lang} medicines={medicines} suppliers={suppliers} setSuppliers={setSuppliers} invoices={invoices} setInvoices={setInvoices} setMedicines={setMedicines} currentUser={currentUser} addLog={addLog} userId={supabaseUserId} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="reorder"      &&<ReorderTab       lang={lang} userId={supabaseUserId} suppliers={suppliers} currentUser={currentUser} onRefresh={()=>supabaseUserId&&loadData(supabaseUserId)}/>}
                {activeTab==="reports"      &&<ReportsTab       lang={lang} medicines={medicines} sales={sales} userId={supabaseUserId} currentUser={currentUser}/>}
                {activeTab==="alerts"       &&<AlertsTab        lang={lang} medicines={medicines} alerts={alerts} markAll={markAll} markOne={markOne}/>}
              </>
            )}
          </div>
        </main>

        {/* ===== Pill Nav (موبايل) ===== */}
        {!loading&&<MobilePillNav tabs={allowedTabs} active={activeTab} onSelect={(t)=>setActiveTab(t)} badges={badges} isAr={isAr} onScan={()=>setShowCamera(true)} onMore={()=>setShowMore(true)}/>}
        {showMore&&<MoreSheet tabs={allowedTabs} active={activeTab} onSelect={(t)=>setActiveTab(t)} badges={badges} isAr={isAr} onClose={()=>setShowMore(false)}/>}

        {scanCard&&currentUser&&(
          <ScanResultCard code={scanCard.code} med={scanCard.med} isAr={isAr}
            onClose={()=>{setScanCard(null);setRemoteScan(null);}}
            onAddNew={(bc)=>{setScanCard(null);setPendingAddBarcode(bc);setActiveTab("inventory");}}
            onSell={(m)=>{setScanCard(null);setPendingSaleBarcode(m.barcode);setActiveTab("sales");}}
            onReturn={(m)=>{setScanCard(null);setPendingReturnBarcode(m.barcode);setActiveTab("inventory");}}/>
        )}
        {showCamera&&currentUser&&(
          <CameraScanner lang={lang} continuous={activeTab==="sales"} onClose={()=>setShowCamera(false)}
            onScan={(code)=>{
              const mode=activeTab==="sales"?"sale":activeTab==="inventory"?(barcodeMode||"query"):"query";
              broadcastScan(code,mode);
              setRemoteScan({code,mode,device:activeTab==="sales"?"cam-live":"local-camera",ts:Date.now()});
            }}/>
        )}
      </div>
    </>
  );
}