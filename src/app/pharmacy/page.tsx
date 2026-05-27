"use client";

import { useState, useEffect, useMemo, useRef } from "react";

// ============================================================
// NABD - نبض | Pharmacy Page — نظام إدارة الصيدلية المتكامل
// يشمل: المخزون، المبيعات، الوصفات الطبية (بحث برقم MRN)
// ============================================================

type Lang = "ar" | "en";

// ── أنواع البيانات ──────────────────────────────────────────
type MedicineCategory = "antibiotics" | "analgesics" | "chronic" | "vitamins" | "topical" | "other";

type Medicine = {
  id: number;
  name_ar: string;
  name_en: string;
  category: MedicineCategory;
  barcode?: string;
  unit: string;
  purchase_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  expiry_date?: string;
  manufacturer?: string;
  notes?: string;
};

type Prescription = {
  id: string;
  mrn: string;
  patient_name: string;
  doctor_name: string;
  created_at: string;
  items: PrescriptionItem[];
  notes?: string;
  dispensed: boolean;
  dispensed_at?: string;
};

type PrescriptionItem = {
  medicine_name: string;
  dosage: string;
  duration: string;
  instructions: string;
};

type SaleItem = {
  medicine_id: number;
  medicine_name: string;
  qty: number;
  unit_price: number;
};

type Sale = {
  id: number;
  date: string;
  items: SaleItem[];
  total: number;
  payment_method: "cash" | "card" | "insurance";
  prescription_id?: string;
  patient_name?: string;
  discount: number;
};

// ── البيانات التجريبية ──────────────────────────────────────
const SAMPLE_MEDICINES: Medicine[] = [
  { id:1,  name_ar:"أموكسيسيللين 500mg", name_en:"Amoxicillin 500mg", category:"antibiotics", unit:"كبسولة", purchase_price:8,  sell_price:15,  stock:240, min_stock:50,  expiry_date:"2026-08-01", manufacturer:"SPIMACO" },
  { id:2,  name_ar:"باراسيتامول 500mg",  name_en:"Paracetamol 500mg",  category:"analgesics",  unit:"قرص",    purchase_price:3,  sell_price:7,   stock:18,  min_stock:100, expiry_date:"2027-01-01", manufacturer:"Tabuk Pharma" },
  { id:3,  name_ar:"ميتفورمين 850mg",    name_en:"Metformin 850mg",    category:"chronic",     unit:"قرص",    purchase_price:12, sell_price:22,  stock:320, min_stock:80,  expiry_date:"2026-11-15", manufacturer:"Julphar" },
  { id:4,  name_ar:"أتورفاستاتين 20mg",  name_en:"Atorvastatin 20mg",  category:"chronic",     unit:"قرص",    purchase_price:25, sell_price:45,  stock:150, min_stock:40,  expiry_date:"2026-09-30" },
  { id:5,  name_ar:"فيتامين D3 1000IU",  name_en:"Vitamin D3 1000IU",  category:"vitamins",    unit:"كبسولة", purchase_price:18, sell_price:35,  stock:88,  min_stock:30,  expiry_date:"2027-03-01" },
  { id:6,  name_ar:"بيتاديرم كريم",      name_en:"Betaderm Cream",     category:"topical",     unit:"أنبوبة", purchase_price:22, sell_price:38,  stock:45,  min_stock:20,  expiry_date:"2026-12-01" },
  { id:7,  name_ar:"ليفوفلوكساسين 500mg",name_en:"Levofloxacin 500mg", category:"antibiotics", unit:"قرص",    purchase_price:20, sell_price:38,  stock:6,   min_stock:30,  expiry_date:"2026-07-01", manufacturer:"SPIMACO" },
  { id:8,  name_ar:"أملوديبين 5mg",      name_en:"Amlodipine 5mg",     category:"chronic",     unit:"قرص",    purchase_price:10, sell_price:20,  stock:200, min_stock:50,  expiry_date:"2027-02-01" },
  { id:9,  name_ar:"أوميبرازول 20mg",    name_en:"Omeprazole 20mg",    category:"other",       unit:"كبسولة", purchase_price:15, sell_price:28,  stock:175, min_stock:60,  expiry_date:"2026-10-01" },
  { id:10, name_ar:"فيتامين C 1000mg",   name_en:"Vitamin C 1000mg",   category:"vitamins",    unit:"قرص",    purchase_price:9,  sell_price:18,  stock:300, min_stock:50,  expiry_date:"2027-06-01" },
];

const SAMPLE_PRESCRIPTIONS: Prescription[] = [
  {
    id:"RX-2025-001", mrn:"MRN-10001", patient_name:"أحمد محمد السعيد", doctor_name:"د. سارة العمري",
    created_at:"2025-05-20", dispensed:false,
    items:[
      { medicine_name:"أموكسيسيللين 500mg", dosage:"500mg", duration:"7 أيام", instructions:"مرتين يومياً بعد الأكل" },
      { medicine_name:"باراسيتامول 500mg",  dosage:"500mg", duration:"3 أيام", instructions:"عند الحاجة" },
    ],
    notes:"المريض يعاني من حساسية للبنسيلين — تحقق من البديل"
  },
  {
    id:"RX-2025-002", mrn:"MRN-10002", patient_name:"فاطمة علي القحطاني", doctor_name:"د. خالد النعيمي",
    created_at:"2025-05-22", dispensed:true, dispensed_at:"2025-05-22",
    items:[
      { medicine_name:"ميتفورمين 850mg",   dosage:"850mg", duration:"مستمر",  instructions:"مرة صباحاً ومرة مساءً مع الطعام" },
      { medicine_name:"أتورفاستاتين 20mg", dosage:"20mg",  duration:"مستمر",  instructions:"مرة ليلاً قبل النوم" },
    ],
  },
  {
    id:"RX-2025-003", mrn:"MRN-10001", patient_name:"أحمد محمد السعيد", doctor_name:"د. محمد الزهراني",
    created_at:"2025-05-25", dispensed:false,
    items:[
      { medicine_name:"أملوديبين 5mg",    dosage:"5mg",  duration:"مستمر", instructions:"مرة يومياً صباحاً" },
      { medicine_name:"أوميبرازول 20mg",  dosage:"20mg", duration:"شهر",  instructions:"قبل الإفطار بـ 30 دقيقة" },
    ],
  },
];

const SAMPLE_SALES: Sale[] = [
  { id:1, date:"2025-05-27", items:[{medicine_id:1,medicine_name:"أموكسيسيللين",qty:2,unit_price:15},{medicine_id:2,medicine_name:"باراسيتامول",qty:1,unit_price:7}], total:37, payment_method:"cash", discount:0, patient_name:"أحمد السعيد" },
  { id:2, date:"2025-05-27", items:[{medicine_id:5,medicine_name:"فيتامين D3",qty:1,unit_price:35}], total:35, payment_method:"card", discount:0 },
  { id:3, date:"2025-05-26", items:[{medicine_id:3,medicine_name:"ميتفورمين",qty:3,unit_price:22},{medicine_id:4,medicine_name:"أتورفاستاتين",qty:1,unit_price:45}], total:111, payment_method:"insurance", discount:10, patient_name:"فاطمة القحطاني" },
  { id:4, date:"2025-05-26", items:[{medicine_id:9,medicine_name:"أوميبرازول",qty:2,unit_price:28}], total:56, payment_method:"cash", discount:0 },
  { id:5, date:"2025-05-25", items:[{medicine_id:6,medicine_name:"بيتاديرم",qty:1,unit_price:38}], total:38, payment_method:"cash", discount:5 },
];

const CATEGORY_META: Record<MedicineCategory, { ar:string; en:string; color:string; icon:string }> = {
  antibiotics: { ar:"مضادات حيوية", en:"Antibiotics",  color:"#e74c3c", icon:"🦠" },
  analgesics:  { ar:"مسكنات",       en:"Analgesics",   color:"#e67e22", icon:"💊" },
  chronic:     { ar:"أمراض مزمنة",  en:"Chronic",      color:"#8e44ad", icon:"❤️" },
  vitamins:    { ar:"فيتامينات",    en:"Vitamins",     color:"#27ae60", icon:"🌿" },
  topical:     { ar:"موضعية",       en:"Topical",      color:"#2980b9", icon:"🧴" },
  other:       { ar:"أخرى",         en:"Other",        color:"#7f8c8d", icon:"📦" },
};

// ── النصوص الثنائية ──────────────────────────────────────────
const T = {
  ar: {
    appName:"نبض", appSub:"Clinic Manager",
    nav:{ pharmacy:"الصيدلية", inventory:"المخزون", prescriptions:"الوصفات", sales:"المبيعات", reports:"التقارير" },
    page:{ title:"إدارة الصيدلية", sub:"مخزون الأدوية، الوصفات الطبية، والمبيعات" },
    tabs:{ inventory:"🗄️ المخزون", prescriptions:"📋 الوصفات", sales:"💰 المبيعات", reports:"📊 التقارير" },
    inventory:{
      addMedicine:"إضافة دواء", search:"بحث في الأدوية...", name:"اسم الدواء", category:"التصنيف",
      unit:"الوحدة", buyPrice:"سعر الشراء", sellPrice:"سعر البيع", stock:"المخزون", minStock:"الحد الأدنى",
      expiry:"تاريخ الانتهاء", manufacturer:"الشركة المصنعة", notes:"ملاحظات",
      allCategories:"كل التصنيفات", lowStock:"مخزون منخفض", expiringSoon:"قريب الانتهاء",
      save:"حفظ", cancel:"إلغاء", edit:"تعديل", delete:"حذف",
      stockStatus:{ ok:"متوفر", low:"منخفض", out:"نفد" },
      actions:"الإجراءات", noResults:"لا توجد نتائج",
      confirmDelete:"هل تريد حذف هذا الدواء؟",
      sar:"ر.س",
    },
    prescriptions:{
      search:"ابحث برقم السجل الطبي (MRN)...", searchBtn:"بحث",
      mrnLabel:"رقم السجل الطبي", patient:"المريض", doctor:"الطبيب", date:"التاريخ",
      status:{ dispensed:"صُرِّف", pending:"بانتظار الصرف" },
      items:"الأدوية الموصوفة", dosage:"الجرعة", duration:"المدة", instructions:"التعليمات",
      dispense:"صرف الوصفة", dispensedAt:"صُرِّف في", notes:"ملاحظات الطبيب",
      noResults:"لم يُعثر على وصفات لهذا الرقم الطبي",
      searchHint:"أدخل الرقم الطبي للمريض للبحث عن وصفاته",
      allPrescriptions:"كل الوصفات", pendingOnly:"بانتظار الصرف", dispensedOnly:"مصروفة",
    },
    sales:{
      newSale:"بيع جديد", addItem:"إضافة دواء", searchMedicine:"ابحث عن دواء...",
      qty:"الكمية", unitPrice:"سعر الوحدة", total:"الإجمالي", discount:"خصم",
      finalTotal:"المجموع النهائي", payment:"طريقة الدفع",
      paymentMethods:{ cash:"نقداً", card:"بطاقة", insurance:"تأمين" },
      complete:"إتمام البيع", cancel:"إلغاء",
      patientName:"اسم المريض (اختياري)", prescriptionId:"رقم الوصفة (اختياري)",
      todaySales:"مبيعات اليوم", totalRevenue:"إجمالي الإيرادات",
      date:"التاريخ", items:"الأدوية", amount:"المبلغ", method:"طريقة الدفع",
      noSales:"لا توجد مبيعات",
      sar:"ر.س",
    },
    reports:{
      title:"تقارير الصيدلية",
      totalSales:"إجمالي المبيعات", totalProfit:"الربح التقديري", lowStockCount:"أدوية منخفضة",
      expiringCount:"تنتهي خلال 30 يوماً", bestSelling:"الأكثر مبيعاً", salesByCategory:"المبيعات حسب التصنيف",
    },
    search:"بحث", sar:"ر.س", units:"وحدة",
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ pharmacy:"Pharmacy", inventory:"Inventory", prescriptions:"Prescriptions", sales:"Sales", reports:"Reports" },
    page:{ title:"Pharmacy Management", sub:"Medicine inventory, prescriptions, and sales" },
    tabs:{ inventory:"🗄️ Inventory", prescriptions:"📋 Prescriptions", sales:"💰 Sales", reports:"📊 Reports" },
    inventory:{
      addMedicine:"Add Medicine", search:"Search medicines...", name:"Medicine Name", category:"Category",
      unit:"Unit", buyPrice:"Buy Price", sellPrice:"Sell Price", stock:"Stock", minStock:"Min Stock",
      expiry:"Expiry Date", manufacturer:"Manufacturer", notes:"Notes",
      allCategories:"All Categories", lowStock:"Low Stock", expiringSoon:"Expiring Soon",
      save:"Save", cancel:"Cancel", edit:"Edit", delete:"Delete",
      stockStatus:{ ok:"In Stock", low:"Low", out:"Out of Stock" },
      actions:"Actions", noResults:"No results found",
      confirmDelete:"Delete this medicine?",
      sar:"SAR",
    },
    prescriptions:{
      search:"Search by Medical Record Number (MRN)...", searchBtn:"Search",
      mrnLabel:"Medical Record Number", patient:"Patient", doctor:"Doctor", date:"Date",
      status:{ dispensed:"Dispensed", pending:"Pending Dispensing" },
      items:"Prescribed Medicines", dosage:"Dosage", duration:"Duration", instructions:"Instructions",
      dispense:"Dispense Prescription", dispensedAt:"Dispensed on", notes:"Doctor Notes",
      noResults:"No prescriptions found for this MRN",
      searchHint:"Enter patient MRN to find their prescriptions",
      allPrescriptions:"All", pendingOnly:"Pending", dispensedOnly:"Dispensed",
    },
    sales:{
      newSale:"New Sale", addItem:"Add Medicine", searchMedicine:"Search medicine...",
      qty:"Qty", unitPrice:"Unit Price", total:"Total", discount:"Discount",
      finalTotal:"Final Total", payment:"Payment Method",
      paymentMethods:{ cash:"Cash", card:"Card", insurance:"Insurance" },
      complete:"Complete Sale", cancel:"Cancel",
      patientName:"Patient Name (optional)", prescriptionId:"Prescription ID (optional)",
      todaySales:"Today's Sales", totalRevenue:"Total Revenue",
      date:"Date", items:"Medicines", amount:"Amount", method:"Payment",
      noSales:"No sales yet",
      sar:"SAR",
    },
    reports:{
      title:"Pharmacy Reports",
      totalSales:"Total Sales", totalProfit:"Est. Profit", lowStockCount:"Low Stock Items",
      expiringCount:"Expiring in 30 days", bestSelling:"Best Selling", salesByCategory:"Sales by Category",
    },
    search:"Search", sar:"SAR", units:"units",
  },
} as const;

// ── المكونات الفرعية ─────────────────────────────────────────

function StockBadge({ stock, minStock, lang }: { stock:number; minStock:number; lang:Lang }) {
  const t = T[lang].inventory;
  if (stock === 0) return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(192,57,43,.12)",color:"#c0392b"}}>{t.stockStatus.out}</span>;
  if (stock < minStock) return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(230,126,34,.12)",color:"#e67e22"}}>{t.stockStatus.low}</span>;
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"rgba(39,174,96,.12)",color:"#27ae60"}}>{t.stockStatus.ok}</span>;
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const expiry = new Date(date);
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  return expiry <= in30;
}

// ── نموذج الدواء ─────────────────────────────────────────────
function MedicineModal({ lang, medicine, onSave, onClose }: { lang:Lang; medicine:Medicine|null; onSave:(m:Partial<Medicine>)=>void; onClose:()=>void }) {
  const t = T[lang].inventory;
  const isAr = lang === "ar";
  const [form, setForm] = useState<Partial<Medicine>>(medicine ?? { category:"other", unit:"قرص", stock:0, min_stock:20, purchase_price:0, sell_price:0 });
  const set = (k:string, v:any) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
      <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"28px 28px 24px",width:"min(96vw, 560px)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.18)",animation:"modalIn .25s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h2 style={{fontSize:17,fontWeight:800,color:"#353535"}}>{medicine ? t.edit : t.addMedicine} 💊</h2>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#aaa",lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {/* الاسم */}
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.name} *</label>
            <input value={form.name_ar||""} onChange={e=>set("name_ar",e.target.value)} placeholder={isAr?"أموكسيسيللين 500mg":"Amoxicillin 500mg"}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",direction:"rtl"}}/>
          </div>
          {/* التصنيف */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.category}</label>
            <select value={form.category||"other"} onChange={e=>set("category",e.target.value)}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>
              {Object.entries(CATEGORY_META).map(([k,v])=><option key={k} value={k}>{v.icon} {isAr?v.ar:v.en}</option>)}
            </select>
          </div>
          {/* الوحدة */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.unit}</label>
            <input value={form.unit||""} onChange={e=>set("unit",e.target.value)}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",direction:"rtl"}}/>
          </div>
          {/* سعر الشراء */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.buyPrice} ({t.sar})</label>
            <input type="number" min={0} value={form.purchase_price||0} onChange={e=>set("purchase_price",Number(e.target.value))}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
          </div>
          {/* سعر البيع */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.sellPrice} ({t.sar})</label>
            <input type="number" min={0} value={form.sell_price||0} onChange={e=>set("sell_price",Number(e.target.value))}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
          </div>
          {/* المخزون */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.stock}</label>
            <input type="number" min={0} value={form.stock||0} onChange={e=>set("stock",Number(e.target.value))}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
          </div>
          {/* الحد الأدنى */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.minStock}</label>
            <input type="number" min={0} value={form.min_stock||20} onChange={e=>set("min_stock",Number(e.target.value))}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
          </div>
          {/* تاريخ الانتهاء */}
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.expiry}</label>
            <input type="date" value={form.expiry_date||""} onChange={e=>set("expiry_date",e.target.value)}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
          </div>
          {/* الشركة */}
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5}}>{t.manufacturer}</label>
            <input value={form.manufacturer||""} onChange={e=>set("manufacturer",e.target.value)}
              style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button onClick={()=>onSave(form)} style={{flex:1,padding:"12px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)"}}>{t.save}</button>
          <button onClick={onClose} style={{padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer"}}>{t.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ── تبويب المخزون ─────────────────────────────────────────────
function InventoryTab({ lang, medicines, setMedicines }: { lang:Lang; medicines:Medicine[]; setMedicines:React.Dispatch<React.SetStateAction<Medicine[]>> }) {
  const t = T[lang].inventory;
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all"|"low"|MedicineCategory>("all");
  const [modal, setModal] = useState(false);
  const [editMed, setEditMed] = useState<Medicine|null>(null);
  const [deleteId, setDeleteId] = useState<number|null>(null);

  const filtered = useMemo(()=>{
    let list = medicines;
    if (search.trim()) list = list.filter(m => m.name_ar.includes(search) || (m.name_en||"").toLowerCase().includes(search.toLowerCase()));
    if (catFilter === "low") list = list.filter(m => m.stock < m.min_stock);
    else if (catFilter !== "all") list = list.filter(m => m.category === catFilter);
    return list;
  },[medicines, search, catFilter]);

  const handleSave = (data: Partial<Medicine>) => {
    if (!data.name_ar?.trim()) return;
    if (editMed) {
      setMedicines(prev => prev.map(m => m.id === editMed.id ? {...m,...data} as Medicine : m));
    } else {
      const newId = Math.max(0,...medicines.map(m=>m.id))+1;
      setMedicines(prev => [...prev, {id:newId,...data} as Medicine]);
    }
    setModal(false); setEditMed(null);
  };

  const lowCount = medicines.filter(m => m.stock < m.min_stock).length;

  return (
    <div>
      {/* شريط البحث والفلاتر */}
      <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)",marginBottom:16}}>
        <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px"}}>
            <span style={{color:"#bbb"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
              style={{border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,width:"100%",direction:isAr?"rtl":"ltr"}}/>
            {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}
          </div>
          <button onClick={()=>{setEditMed(null);setModal(true);}} className="nabd-btn-primary"
            style={{display:"flex",alignItems:"center",gap:6,padding:"10px 18px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 3px 12px rgba(8,99,186,.3)"}}>
            <span style={{fontSize:16}}>＋</span> {t.addMedicine}
          </button>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setCatFilter("all")} className={catFilter==="all"?"filter-chip active":"filter-chip"}>{t.allCategories}</button>
          <button onClick={()=>setCatFilter("low")} className={catFilter==="low"?"filter-chip active":"filter-chip"} style={catFilter!=="low"&&lowCount>0?{borderColor:"#e67e22",color:"#e67e22"}:{}}>
            ⚠️ {t.lowStock} {lowCount>0&&<span style={{background:"#e67e22",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,marginRight:4}}>{lowCount}</span>}
          </button>
          {Object.entries(CATEGORY_META).map(([k,v])=>(
            <button key={k} onClick={()=>setCatFilter(k as MedicineCategory)} className={catFilter===k?"filter-chip active":"filter-chip"}>{v.icon} {isAr?v.ar:v.en}</button>
          ))}
        </div>
      </div>

      {/* جدول ديسكتوب */}
      <div className="desktop-table" style={{background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 100px",padding:"11px 18px",background:"#f9fafb",borderBottom:"1.5px solid #eef0f3"}}>
          {[t.name,t.category,t.sellPrice,t.stock,"",t.expiry,t.actions].map((h,i)=>(
            <div key={i} style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.5}}>{h}</div>
          ))}
        </div>
        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:"40px",color:"#ccc"}}><div style={{fontSize:32,marginBottom:8}}>📦</div><div>{t.noResults}</div></div>
        ):filtered.map(m=>{
          const cat = CATEGORY_META[m.category];
          const expiring = isExpiringSoon(m.expiry_date);
          return (
            <div key={m.id} className="inv-row" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 100px",padding:"13px 18px",alignItems:"center",borderBottom:"1px solid #f0f2f5",transition:"background .15s"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div>
                {m.manufacturer&&<div style={{fontSize:10,color:"#aaa",marginTop:1}}>{m.manufacturer}</div>}
              </div>
              <div><span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:`${cat.color}15`,color:cat.color}}>{cat.icon} {isAr?cat.ar:cat.en}</span></div>
              <div style={{fontSize:13,fontWeight:700,color:"#2e7d32"}}>{m.sell_price} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{t.sar}</span></div>
              <div style={{fontSize:13,fontWeight:700,color:m.stock<m.min_stock?"#e67e22":"#353535"}}>{m.stock} <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>{isAr?m.unit:"units"}</span></div>
              <div><StockBadge stock={m.stock} minStock={m.min_stock} lang={lang}/></div>
              <div style={{fontSize:12,color:expiring?"#e74c3c":"#888",fontWeight:expiring?700:400}}>
                {expiring&&"⚠️ "}{m.expiry_date||"—"}
              </div>
              <div style={{display:"flex",gap:5}}>
                <button onClick={()=>{setEditMed(m);setModal(true);}} className="action-icon-btn" title={t.edit}>✏️</button>
                <button onClick={()=>setDeleteId(m.id)} className="action-icon-btn" style={{color:"#e74c3c"}} title={t.delete}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* كروت موبايل */}
      <div className="mobile-cards" style={{display:"none"}}>
        {filtered.map(m=>{
          const cat = CATEGORY_META[m.category];
          const expiring = isExpiringSoon(m.expiry_date);
          return (
            <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"16px",border:"1.5px solid #eef0f3",marginBottom:10,boxShadow:"0 2px 10px rgba(8,99,186,.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div>
                  <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:`${cat.color}15`,color:cat.color}}>{cat.icon} {isAr?cat.ar:cat.en}</span>
                </div>
                <StockBadge stock={m.stock} minStock={m.min_stock} lang={lang}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:"#f7f9fc",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{t.sellPrice}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#2e7d32"}}>{m.sell_price}</div>
                </div>
                <div style={{background:"#f7f9fc",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{t.stock}</div>
                  <div style={{fontSize:14,fontWeight:700,color:m.stock<m.min_stock?"#e67e22":"#353535"}}>{m.stock}</div>
                </div>
                <div style={{background:expiring?"rgba(231,76,60,.06)":"#f7f9fc",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:2}}>{t.expiry}</div>
                  <div style={{fontSize:11,fontWeight:700,color:expiring?"#e74c3c":"#353535"}}>{m.expiry_date||"—"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setEditMed(m);setModal(true);}} style={{flex:1,padding:"9px",border:"1.5px solid #d0e4f7",borderRadius:10,background:"rgba(8,99,186,.05)",color:"#0863ba",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.edit}</button>
                <button onClick={()=>setDeleteId(m.id)} style={{padding:"9px 14px",border:"1.5px solid rgba(231,76,60,.3)",borderRadius:10,background:"rgba(231,76,60,.06)",color:"#e74c3c",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.delete}</button>
              </div>
            </div>
          );
        })}
      </div>

      {(modal||editMed)&&<MedicineModal lang={lang} medicine={editMed} onSave={handleSave} onClose={()=>{setModal(false);setEditMed(null);}}/>}

      {deleteId!==null&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)"}} onClick={()=>setDeleteId(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:20,padding:"28px",width:"min(90vw,400px)",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.18)"}}>
            <div style={{fontSize:40,marginBottom:14}}>🗑️</div>
            <p style={{fontSize:15,fontWeight:700,color:"#353535",marginBottom:20}}>{t.confirmDelete}</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setMedicines(p=>p.filter(m=>m.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:"12px",background:"#e74c3c",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {isAr?"نعم، احذف":"Yes, Delete"}
              </button>
              <button onClick={()=>setDeleteId(null)} style={{padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer"}}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── تبويب الوصفات ─────────────────────────────────────────────
function PrescriptionsTab({ lang, prescriptions, setPrescriptions }: { lang:Lang; prescriptions:Prescription[]; setPrescriptions:React.Dispatch<React.SetStateAction<Prescription[]>> }) {
  const t = T[lang].prescriptions;
  const isAr = lang==="ar";
  const [mrnSearch, setMrnSearch] = useState("");
  const [submittedMrn, setSubmittedMrn] = useState("");
  const [pFilter, setPFilter] = useState<"all"|"pending"|"dispensed">("all");

  const displayed = useMemo(()=>{
    let list = prescriptions;
    if (submittedMrn.trim()) list = list.filter(p => p.mrn.toLowerCase() === submittedMrn.trim().toLowerCase());
    if (pFilter==="pending") list = list.filter(p=>!p.dispensed);
    if (pFilter==="dispensed") list = list.filter(p=>p.dispensed);
    return list;
  },[prescriptions, submittedMrn, pFilter]);

  const handleDispense = (id:string) => {
    setPrescriptions(prev => prev.map(p => p.id===id ? {...p, dispensed:true, dispensed_at:new Date().toISOString().slice(0,10)} : p));
  };

  return (
    <div>
      {/* بحث MRN */}
      <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.03))",borderRadius:16,padding:"20px",border:"1.5px solid rgba(8,99,186,.15)",marginBottom:16}}>
        <div style={{display:"flex",gap:4,marginBottom:6,alignItems:"center"}}>
          <span style={{fontSize:20}}>🔍</span>
          <span style={{fontSize:13,fontWeight:700,color:"#0863ba"}}>{t.mrnLabel}</span>
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1.5px solid rgba(8,99,186,.25)",borderRadius:12,padding:"10px 14px",boxShadow:"0 2px 8px rgba(8,99,186,.1)"}}>
            <span style={{fontSize:16}}>🪪</span>
            <input value={mrnSearch} onChange={e=>setMrnSearch(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter") setSubmittedMrn(mrnSearch); }}
              placeholder={t.search}
              style={{border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,width:"100%",letterSpacing:.5,direction:"ltr"}}/>
            {mrnSearch&&<button onClick={()=>{setMrnSearch("");setSubmittedMrn("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb"}}>✕</button>}
          </div>
          <button onClick={()=>setSubmittedMrn(mrnSearch)}
            style={{padding:"10px 20px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(8,99,186,.3)",whiteSpace:"nowrap"}}>
            {t.searchBtn}
          </button>
        </div>
        {!submittedMrn && <p style={{fontSize:11,color:"rgba(8,99,186,.5)",marginTop:8}}>{t.searchHint}</p>}
        {submittedMrn && (
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#0863ba",fontWeight:600}}>الرقم الطبي:</span>
            <span style={{fontSize:13,fontWeight:800,color:"#0863ba",background:"rgba(8,99,186,.1)",padding:"3px 10px",borderRadius:8,letterSpacing:.5}}>{submittedMrn}</span>
            <span style={{fontSize:11,color:"#aaa"}}>— {displayed.length} {isAr?"وصفة":"prescriptions"}</span>
          </div>
        )}
      </div>

      {/* فلاتر الحالة */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[["all",t.allPrescriptions],["pending",t.pendingOnly],["dispensed",t.dispensedOnly]].map(([k,v])=>(
          <button key={k} onClick={()=>setPFilter(k as any)} className={pFilter===k?"filter-chip active":"filter-chip"}>{v}</button>
        ))}
      </div>

      {/* قائمة الوصفات */}
      {displayed.length===0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",color:"#ccc",background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3"}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,fontWeight:600}}>{submittedMrn?t.noResults:t.searchHint}</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {displayed.map(rx=>(
            <div key={rx.id} style={{background:"#fff",borderRadius:16,border:`1.5px solid ${rx.dispensed?"rgba(39,174,96,.25)":"rgba(8,99,186,.2)"}`,boxShadow:"0 2px 14px rgba(8,99,186,.06)",overflow:"hidden"}}>
              {/* رأس الوصفة */}
              <div style={{padding:"16px 20px",background:rx.dispensed?"rgba(39,174,96,.04)":"rgba(8,99,186,.04)",borderBottom:"1px solid #f0f4f8",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:800,color:"#0863ba",letterSpacing:.5}}>{rx.id}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20,background:rx.dispensed?"rgba(39,174,96,.15)":"rgba(230,126,34,.12)",color:rx.dispensed?"#27ae60":"#e67e22"}}>
                      {rx.dispensed?"✅ "+t.status.dispensed:"⏳ "+t.status.pending}
                    </span>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>{rx.patient_name}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{rx.doctor_name} · {rx.created_at}</div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#0863ba",background:"rgba(8,99,186,.08)",padding:"4px 10px",borderRadius:8,letterSpacing:.4}}>{rx.mrn}</span>
                  {!rx.dispensed&&(
                    <button onClick={()=>handleDispense(rx.id)}
                      style={{padding:"8px 16px",background:"#27ae60",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 3px 10px rgba(39,174,96,.3)",whiteSpace:"nowrap"}}>
                      💊 {t.dispense}
                    </button>
                  )}
                </div>
              </div>
              {/* الأدوية */}
              <div style={{padding:"14px 20px"}}>
                {rx.notes&&<div style={{background:"rgba(231,76,60,.06)",border:"1px solid rgba(231,76,60,.2)",borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#c0392b",fontWeight:600}}>⚠️ {rx.notes}</div>}
                <div style={{fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>{t.items}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {rx.items.map((item,i)=>(
                    <div key={i} style={{background:"#f7f9fc",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#353535"}}>💊 {item.medicine_name}</div>
                        <div style={{fontSize:11,color:"#888",marginTop:3}}>{item.instructions}</div>
                      </div>
                      <div style={{textAlign:isAr?"left":"right",flexShrink:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#0863ba"}}>{item.dosage}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>{item.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {rx.dispensed&&rx.dispensed_at&&<div style={{fontSize:11,color:"#27ae60",marginTop:10,fontWeight:600}}>✅ {t.dispensedAt}: {rx.dispensed_at}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── تبويب المبيعات ─────────────────────────────────────────────
function SalesTab({ lang, medicines, sales, setSales }: { lang:Lang; medicines:Medicine[]; sales:Sale[]; setSales:React.Dispatch<React.SetStateAction<Sale[]>> }) {
  const t = T[lang].sales;
  const isAr = lang==="ar";
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [medSearch, setMedSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState<"cash"|"card"|"insurance">("cash");
  const [patientName, setPatientName] = useState("");
  const [rxId, setRxId] = useState("");

  const medResults = medSearch.trim() ? medicines.filter(m=>(m.name_ar+m.name_en).toLowerCase().includes(medSearch.toLowerCase())).slice(0,5) : [];

  const addItem = (m: Medicine) => {
    setItems(prev => {
      const existing = prev.findIndex(i=>i.medicine_id===m.id);
      if (existing>=0) return prev.map((i,idx)=>idx===existing?{...i,qty:i.qty+1}:i);
      return [...prev, {medicine_id:m.id, medicine_name:isAr?m.name_ar:m.name_en, qty:1, unit_price:m.sell_price}];
    });
    setMedSearch("");
  };

  const subtotal = items.reduce((s,i)=>s+i.qty*i.unit_price,0);
  const total = Math.max(0, subtotal - discount);

  const completeSale = () => {
    if (items.length===0) return;
    const newSale: Sale = {
      id: Math.max(0,...sales.map(s=>s.id))+1,
      date: new Date().toISOString().slice(0,10),
      items, total, payment_method:payment, discount,
      patient_name: patientName||undefined,
      prescription_id: rxId||undefined,
    };
    setSales(prev=>[newSale,...prev]);
    setItems([]); setDiscount(0); setPayment("cash"); setPatientName(""); setRxId(""); setShowForm(false);
  };

  const todaySales = sales.filter(s=>s.date===new Date().toISOString().slice(0,10));
  const todayTotal = todaySales.reduce((s,x)=>s+x.total,0);
  const payIcon: Record<string,string> = {cash:"💵",card:"💳",insurance:"🏥"};

  return (
    <div>
      {/* إحصائيات سريعة */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[
          {label:isAr?"مبيعات اليوم":"Today's Sales", value:todaySales.length, icon:"🛒", color:"#0863ba"},
          {label:isAr?"إيرادات اليوم":"Today Revenue", value:`${todayTotal} ${t.sar}`, icon:"💰", color:"#27ae60"},
          {label:isAr?"إجمالي المبيعات":"Total Sales", value:sales.length, icon:"📊", color:"#8e44ad"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:14,padding:"14px 16px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)"}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:isAr?18:16,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:"#aaa",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* زر بيع جديد */}
      <button onClick={()=>setShowForm(true)}
        style={{width:"100%",padding:"14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:14,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 18px rgba(8,99,186,.35)",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <span style={{fontSize:20}}>🛒</span> {t.newSale}
      </button>

      {/* نموذج البيع */}
      {showForm&&(
        <div style={{background:"#fff",borderRadius:16,border:"1.5px solid rgba(8,99,186,.2)",boxShadow:"0 4px 24px rgba(8,99,186,.1)",padding:"20px",marginBottom:16,animation:"slideUp .3s ease"}}>
          <h3 style={{fontSize:15,fontWeight:800,color:"#0863ba",marginBottom:16}}>🛒 {t.newSale}</h3>
          {/* البحث عن الدواء */}
          <div style={{position:"relative",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#f7f9fc",border:"1.5px solid #e0e7ef",borderRadius:10,padding:"9px 12px"}}>
              <span>💊</span>
              <input value={medSearch} onChange={e=>setMedSearch(e.target.value)} placeholder={t.searchMedicine}
                style={{border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,width:"100%",direction:isAr?"rtl":"ltr"}}/>
            </div>
            {medResults.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:50,background:"#fff",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.12)",border:"1.5px solid #eef0f3",overflow:"hidden",marginTop:4}}>
                {medResults.map(m=>(
                  <div key={m.id} onClick={()=>addItem(m)} style={{padding:"10px 14px",cursor:"pointer",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center",transition:"background .1s"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f7f9fc"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                    <span style={{fontWeight:600}}>{isAr?m.name_ar:m.name_en}</span>
                    <span style={{color:"#27ae60",fontWeight:700,fontSize:12}}>{m.sell_price} {t.sar}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* قائمة الأصناف */}
          {items.length>0&&(
            <div style={{background:"#f7f9fc",borderRadius:12,padding:"12px",marginBottom:14}}>
              {items.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<items.length-1?8:0}}>
                  <div style={{flex:1,fontSize:13,fontWeight:600,color:"#353535"}}>{item.medicine_name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <button onClick={()=>setItems(prev=>prev.map((x,xi)=>xi===i?{...x,qty:Math.max(1,x.qty-1)}:x))} style={{width:26,height:26,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>-</button>
                    <span style={{fontSize:13,fontWeight:700,minWidth:24,textAlign:"center"}}>{item.qty}</span>
                    <button onClick={()=>setItems(prev=>prev.map((x,xi)=>xi===i?{...x,qty:x.qty+1}:x))} style={{width:26,height:26,border:"1.5px solid #d0e4f7",borderRadius:6,background:"#fff",cursor:"pointer",fontWeight:700,color:"#0863ba",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>+</button>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:"#27ae60",minWidth:55,textAlign:"center"}}>{(item.qty*item.unit_price).toFixed(0)} {t.sar}</div>
                  <button onClick={()=>setItems(prev=>prev.filter((_,xi)=>xi!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#e74c3c",fontSize:16,lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}
          {/* خصم وطريقة الدفع */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{t.discount} ({t.sar})</label>
              <input type="number" min={0} value={discount} onChange={e=>setDiscount(Number(e.target.value))}
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{t.payment}</label>
              <select value={payment} onChange={e=>setPayment(e.target.value as any)}
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",background:"#fafbfc",direction:isAr?"rtl":"ltr"}}>
                {Object.entries(t.paymentMethods).map(([k,v])=><option key={k} value={k}>{payIcon[k]} {v}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{t.patientName}</label>
              <input value={patientName} onChange={e=>setPatientName(e.target.value)}
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",direction:isAr?"rtl":"ltr"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>{t.prescriptionId}</label>
              <input value={rxId} onChange={e=>setRxId(e.target.value)}
                style={{width:"100%",padding:"9px 12px",border:"1.5px solid #e0e7ef",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",direction:"ltr"}}/>
            </div>
          </div>
          {/* الإجمالي */}
          <div style={{background:"linear-gradient(135deg,rgba(8,99,186,.08),rgba(8,99,186,.03))",borderRadius:12,padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:"#353535"}}>{t.finalTotal}</span>
            <span style={{fontSize:22,fontWeight:800,color:"#0863ba"}}>{total} <span style={{fontSize:13,fontWeight:400,color:"#aaa"}}>{t.sar}</span></span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={completeSale} disabled={items.length===0}
              style={{flex:1,padding:"13px",background:items.length===0?"#ccc":"#27ae60",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:items.length===0?"not-allowed":"pointer",boxShadow:items.length===0?"none":"0 4px 14px rgba(39,174,96,.3)"}}>
              ✅ {t.complete}
            </button>
            <button onClick={()=>{setShowForm(false);setItems([]);setDiscount(0);setPatientName("");setRxId("");}}
              style={{padding:"13px 18px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer"}}>{t.cancel}</button>
          </div>
        </div>
      )}

      {/* سجل المبيعات */}
      <div style={{background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 14px rgba(8,99,186,.06)",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1.5px solid #f0f2f5",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:14,fontWeight:700,color:"#353535"}}>{isAr?"سجل المبيعات":"Sales History"}</span>
          <span style={{fontSize:12,color:"#aaa"}}>{sales.length} {isAr?"عملية":"transactions"}</span>
        </div>
        {sales.length===0?(
          <div style={{textAlign:"center",padding:"40px",color:"#ccc"}}><div style={{fontSize:32,marginBottom:8}}>🛒</div><div>{t.noSales}</div></div>
        ):(
          sales.map(s=>(
            <div key={s.id} style={{padding:"13px 18px",borderBottom:"1px solid #f0f2f5",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#353535",marginBottom:2}}>
                  {s.patient_name||`${isAr?"بيع":"Sale"} #${s.id}`}
                </div>
                <div style={{fontSize:11,color:"#aaa"}}>{s.date} · {s.items.length} {isAr?"أدوية":"items"}{s.prescription_id?` · ${s.prescription_id}`:""}</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <span style={{fontSize:11,padding:"3px 8px",borderRadius:20,background:"#f0f4f8",color:"#888",fontWeight:600}}>{payIcon[s.payment_method]} {t.paymentMethods[s.payment_method]}</span>
                <span style={{fontSize:14,fontWeight:800,color:"#0863ba"}}>{s.total} <span style={{fontSize:10,fontWeight:400,color:"#aaa"}}>{t.sar}</span></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── تبويب التقارير ────────────────────────────────────────────
function ReportsTab({ lang, medicines, sales }: { lang:Lang; medicines:Medicine[]; sales:Sale[] }) {
  const t = T[lang].reports;
  const isAr = lang==="ar";

  const totalRevenue = sales.reduce((s,x)=>s+x.total,0);
  const totalCost = sales.reduce((s,sale)=>s+sale.items.reduce((ss,item)=>{
    const m=medicines.find(x=>x.id===item.medicine_id);
    return ss+(m?m.purchase_price*item.qty:0);
  },0),0);
  const profit = totalRevenue - totalCost;
  const lowStockCount = medicines.filter(m=>m.stock<m.min_stock).length;
  const expiringCount = medicines.filter(m=>isExpiringSoon(m.expiry_date)).length;

  const catSales: Record<MedicineCategory, number> = {antibiotics:0,analgesics:0,chronic:0,vitamins:0,topical:0,other:0};
  sales.forEach(sale=>sale.items.forEach(item=>{
    const m=medicines.find(x=>x.id===item.medicine_id);
    if(m) catSales[m.category]+= item.qty*item.unit_price;
  }));
  const topCat = Object.entries(catSales).sort((a,b)=>b[1]-a[1]);
  const maxCatVal = topCat[0]?.[1] || 1;

  const medSales: Record<number,number> = {};
  sales.forEach(s=>s.items.forEach(item=>{ medSales[item.medicine_id]=(medSales[item.medicine_id]||0)+item.qty; }));
  const topMeds = Object.entries(medSales).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,qty])=>({...medicines.find(m=>m.id===Number(id))!,soldQty:qty})).filter(Boolean);

  return (
    <div>
      {/* بطاقات الإحصاء */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:t.totalSales, value:`${totalRevenue} ${T[lang].sar}`, icon:"💰", color:"#0863ba", bg:"rgba(8,99,186,.08)"},
          {label:t.totalProfit, value:`${profit} ${T[lang].sar}`, icon:"📈", color:"#27ae60", bg:"rgba(39,174,96,.08)"},
          {label:t.lowStockCount, value:lowStockCount, icon:"⚠️", color:"#e67e22", bg:"rgba(230,126,34,.08)"},
          {label:t.expiringCount, value:expiringCount, icon:"🗓️", color:"#e74c3c", bg:"rgba(231,76,60,.08)"},
        ].map((s,i)=>(
          <div key={i} style={{background:s.bg,borderRadius:14,padding:"16px",border:`1.5px solid ${s.color}25`}}>
            <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:11,color:s.color,opacity:.7,marginTop:4,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* مبيعات حسب التصنيف */}
      <div style={{background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",padding:"18px 20px",marginBottom:16,boxShadow:"0 2px 10px rgba(8,99,186,.05)"}}>
        <h3 style={{fontSize:13,fontWeight:800,color:"#353535",marginBottom:16,textTransform:"uppercase",letterSpacing:.5}}>{t.salesByCategory}</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {topCat.map(([k,v])=>{
            const cat=CATEGORY_META[k as MedicineCategory];
            const pct=maxCatVal>0?(v/maxCatVal)*100:0;
            return (
              <div key={k}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{cat.icon} {isAr?cat.ar:cat.en}</span>
                  <span style={{fontSize:12,fontWeight:700,color:cat.color}}>{v} {T[lang].sar}</span>
                </div>
                <div style={{height:8,background:"#f0f2f5",borderRadius:10,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:cat.color,borderRadius:10,transition:"width .6s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* الأكثر مبيعاً */}
      <div style={{background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",padding:"18px 20px",boxShadow:"0 2px 10px rgba(8,99,186,.05)"}}>
        <h3 style={{fontSize:13,fontWeight:800,color:"#353535",marginBottom:14,textTransform:"uppercase",letterSpacing:.5}}>{t.bestSelling}</h3>
        {topMeds.map((m,i)=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<topMeds.length-1?"1px solid #f0f2f5":"none"}}>
            <div style={{width:28,height:28,borderRadius:8,background:"#0863ba",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1,fontSize:13,fontWeight:600,color:"#353535"}}>{isAr?m.name_ar:m.name_en}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#0863ba"}}>{m.soldQty} {isAr?"وحدة":"units"}</div>
          </div>
        ))}
        {topMeds.length===0&&<div style={{textAlign:"center",padding:"20px",color:"#ccc",fontSize:12}}>{isAr?"لا توجد بيانات":"No data yet"}</div>}
      </div>
    </div>
  );
}

// ── المكوّن الرئيسي ──────────────────────────────────────────
export default function PharmacyPage() {
  const [lang, setLang] = useState<Lang>("ar");
  const [activeTab, setActiveTab] = useState<"inventory"|"prescriptions"|"sales"|"reports">("inventory");
  const [medicines, setMedicines] = useState<Medicine[]>(SAMPLE_MEDICINES);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(SAMPLE_PRESCRIPTIONS);
  const [sales, setSales] = useState<Sale[]>(SAMPLE_SALES);

  const t = T[lang];
  const isAr = lang === "ar";

  const lowCount = medicines.filter(m=>m.stock<m.min_stock).length;
  const pendingRx = prescriptions.filter(p=>!p.dispensed).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .main-anim{animation:fadeUp .4s ease both}
        .inv-row:hover{background:#fafbff!important}
        .action-icon-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .filter-chip{padding:7px 13px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .tab-btn{padding:10px 16px;border-radius:12px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:600;transition:all .2s;white-space:nowrap;flex-shrink:0;display:flex;align-items:center;gap:6px;position:relative}
        .tab-btn.active{background:#0863ba;color:#fff;box-shadow:0 4px 14px rgba(8,99,186,.3)}
        .tab-btn:not(.active){background:#fff;color:#888;border:1.5px solid #eef0f3}
        .tab-btn:not(.active):hover{border-color:#a4c4e4;color:#0863ba}
        .badge-dot{position:absolute;top:-4px;right:-4px;width:16px;height:16px;borderRadius:50%;background:#e74c3c;color:#fff;fontSize:9px;fontWeight:800;display:flex;align-items:center;justify-content:center}
        @media(max-width:768px){
          .main-content{margin-right:0!important;margin-left:0!important;padding:0 0 100px!important}
          .content-pad{padding:14px 14px 0!important}
          .topbar-inner{padding:14px 16px!important}
          .desktop-table{display:none!important}
          .mobile-cards{display:block!important}
          .tabs-row{gap:6px!important}
          .tab-btn{padding:9px 12px!important;font-size:12px!important}
        }
        @media(min-width:769px){
          .desktop-table{display:block!important}
          .mobile-cards{display:none!important}
          .main-content{margin-${isAr?"right":"left"}:240px}
        }
      `}</style>

      <div style={{fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc"}}>

        {/* شريط علوي */}
        <div style={{position:"sticky",top:0,zIndex:30,background:"rgba(247,249,252,.97)",backdropFilter:"blur(12px)",borderBottom:"1.5px solid #eef0f3"}}>
          <div className="topbar-inner" style={{padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:12,background:"linear-gradient(135deg,#0863ba,#1a8fe3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 14px rgba(8,99,186,.3)",flexShrink:0}}>💊</div>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:"#353535"}}>{t.page.title}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{t.page.sub}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {lowCount>0&&(
                <div style={{fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:10,background:"rgba(230,126,34,.12)",color:"#e67e22",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  ⚠️ {lowCount} {isAr?"منخفض":"low"}
                </div>
              )}
              <button onClick={()=>setLang(l=>l==="ar"?"en":"ar")}
                style={{padding:"7px 12px",border:"1.5px solid #d0e4f7",borderRadius:10,background:"#fff",color:"#0863ba",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {isAr?"EN":"AR"}
              </button>
            </div>
          </div>

          {/* التبويبات */}
          <div style={{padding:"0 28px 12px",overflowX:"auto",scrollbarWidth:"none"}}>
            <div className="tabs-row" style={{display:"flex",gap:8,minWidth:"max-content"}}>
              {([
                ["inventory",   t.tabs.inventory,   null],
                ["prescriptions",t.tabs.prescriptions, pendingRx>0?pendingRx:null],
                ["sales",       t.tabs.sales,       null],
                ["reports",     t.tabs.reports,     null],
              ] as [string,string,number|null][]).map(([k,v,badge])=>(
                <button key={k} onClick={()=>setActiveTab(k as any)} className={activeTab===k?"tab-btn active":"tab-btn"} style={{position:"relative"}}>
                  {v}
                  {badge&&<span style={{position:"absolute",top:-5,right:-5,width:17,height:17,borderRadius:"50%",background:"#e74c3c",color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 6px rgba(231,76,60,.4)"}}>{badge}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <main className="main-anim main-content" style={{padding:"0 28px 48px",transition:"margin .3s"}}>
          <div className="content-pad" style={{padding:"20px 0 0"}}>
            {activeTab==="inventory"    && <InventoryTab     lang={lang} medicines={medicines} setMedicines={setMedicines}/>}
            {activeTab==="prescriptions"&& <PrescriptionsTab lang={lang} prescriptions={prescriptions} setPrescriptions={setPrescriptions}/>}
            {activeTab==="sales"        && <SalesTab         lang={lang} medicines={medicines} sales={sales} setSales={setSales}/>}
            {activeTab==="reports"      && <ReportsTab       lang={lang} medicines={medicines} sales={sales}/>}
          </div>
        </main>
      </div>
    </>
  );
}
