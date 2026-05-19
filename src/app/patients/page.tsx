"use client";

import { useState, useEffect, useMemo, useRef, type ReactNode, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import type { Patient } from "@/lib/supabase";

// ============================================================
// NABD - نبض | Patients Page — نسخة متكاملة مع دعم نوع العيادة
// clinic_type يُقرأ من جدول clinics ويؤثر على:
//   1. نموذج إضافة المريض (أسئلة مخصصة)
//   2. ملف المريض الطبي (تبويبات + سجل طبي)
// ============================================================

type Lang = "ar" | "en";

// جميع أنواع العيادات الممكنة
type ClinicType =
  | "general" | "dental" | "dermatology" | "cosmetic" | "pediatrics"
  | "physical_therapy" | "mental_health" | "nutrition" | "ophthalmology"
  | "orthopedic" | "cardiology" | "gynecology" | "ent" | "urology" | "other";

// ── أيقونات وألوان أنواع العيادات ──────────────────────────
const CLINIC_TYPE_META: Record<ClinicType, { icon: string; color: string; ar: string; en: string }> = {
  general:          { icon:"🏥", color:"#16a085", ar:"طب عام",           en:"General Medicine"   },
  dental:           { icon:"🦷", color:"#0863ba", ar:"أسنان",            en:"Dental"             },
  dermatology:      { icon:"🧴", color:"#e67e22", ar:"جلدية",            en:"Dermatology"        },
  cosmetic:         { icon:"💆", color:"#8e44ad", ar:"تجميلية",          en:"Cosmetic"           },
  pediatrics:       { icon:"👶", color:"#27ae60", ar:"أطفال",            en:"Pediatrics"         },
  physical_therapy: { icon:"🏃", color:"#2e7d32", ar:"علاج فيزيائي",    en:"Physical Therapy"   },
  mental_health:    { icon:"🧠", color:"#6c3fc5", ar:"صحة نفسية",       en:"Mental Health"      },
  nutrition:        { icon:"🥗", color:"#27ae60", ar:"تغذية",            en:"Nutrition"          },
  ophthalmology:    { icon:"👁️", color:"#2980b9", ar:"عيون",            en:"Ophthalmology"      },
  orthopedic:       { icon:"🦴", color:"#c0392b", ar:"عظام ومفاصل",     en:"Orthopedics"        },
  cardiology:       { icon:"❤️", color:"#e74c3c", ar:"قلب وشرايين",     en:"Cardiology"         },
  gynecology:       { icon:"🌸", color:"#e91e63", ar:"نساء وتوليد",     en:"Gynecology"         },
  ent:              { icon:"👂", color:"#795548", ar:"أنف وأذن وحنجرة", en:"ENT"                },
  urology:          { icon:"💧", color:"#2196f3", ar:"مسالك بولية",     en:"Urology"            },
  other:            { icon:"🏨", color:"#607d8b", ar:"أخرى",            en:"Other"              },
};

// ── أسئلة إضافية حسب نوع العيادة في نموذج الإضافة ──────────
type ExtraQuestion = {
  key: string;
  type: "yesno" | "select" | "text";
  label_ar: string;
  label_en: string;
  options_ar?: string[];
  options_en?: string[];
};

const EXTRA_QUESTIONS: Partial<Record<ClinicType, ExtraQuestion[]>> = {
  dental: [
    { key:"last_dental_visit",  type:"select", label_ar:"آخر زيارة لطبيب الأسنان", label_en:"Last dental visit",   options_ar:["أقل من 6 أشهر","6-12 شهراً","أكثر من سنة","لا أتذكر"], options_en:["Less than 6 months","6-12 months","Over a year","Don't remember"] },
    { key:"teeth_sensitivity",  type:"yesno",  label_ar:"هل تعاني من حساسية الأسنان؟", label_en:"Do you have tooth sensitivity?" },
    { key:"bleeding_gums",      type:"yesno",  label_ar:"هل تنزف لثتك؟", label_en:"Do your gums bleed?" },
    { key:"bruxism",            type:"yesno",  label_ar:"هل تصرّ على أسنانك أثناء النوم؟", label_en:"Do you grind your teeth at night?" },
  ],
  dermatology: [
    { key:"skin_type",          type:"select", label_ar:"نوع البشرة", label_en:"Skin type", options_ar:["جافة","دهنية","مختلطة","عادية","حساسة"], options_en:["Dry","Oily","Combination","Normal","Sensitive"] },
    { key:"sun_sensitivity",    type:"yesno",  label_ar:"هل لديك حساسية من الشمس؟", label_en:"Are you sensitive to sun?" },
    { key:"previous_skin_cond", type:"yesno",  label_ar:"هل سبق أن عانيت من أمراض جلدية مزمنة؟", label_en:"Any history of chronic skin conditions?" },
  ],
  cosmetic: [
    { key:"previous_procedures",type:"yesno",  label_ar:"هل أجريت إجراءات تجميلية سابقة؟", label_en:"Have you had previous cosmetic procedures?" },
    { key:"keloid_tendency",    type:"yesno",  label_ar:"هل لديك ميل لتكوّن الجدرة (الندبات المرتفعة)؟", label_en:"Do you have a tendency to form keloids?" },
  ],
  pediatrics: [
    { key:"birth_type",         type:"select", label_ar:"نوع الولادة", label_en:"Birth type", options_ar:["طبيعية","قيصرية"], options_en:["Natural","Cesarean"] },
    { key:"premature_birth",    type:"yesno",  label_ar:"هل كان الطفل خديجاً؟", label_en:"Was the child premature?" },
    { key:"vaccinations",       type:"yesno",  label_ar:"هل التطعيمات مكتملة؟", label_en:"Are vaccinations up to date?" },
    { key:"breastfed",          type:"yesno",  label_ar:"هل الطفل رُضِع طبيعياً؟", label_en:"Was the child breastfed?" },
  ],
  physical_therapy: [
    { key:"injury_type",        type:"text",   label_ar:"نوع الإصابة أو السبب", label_en:"Type of injury or cause" },
    { key:"previous_therapy",   type:"yesno",  label_ar:"هل سبق لك تلقي علاج فيزيائي؟", label_en:"Have you had physical therapy before?" },
    { key:"pain_region",        type:"text",   label_ar:"منطقة الألم الرئيسية", label_en:"Main pain region" },
  ],
  mental_health: [
    { key:"previous_therapy",   type:"yesno",  label_ar:"هل سبق أن تلقيت علاجاً نفسياً؟", label_en:"Have you received mental health treatment before?" },
    { key:"takes_medication",   type:"yesno",  label_ar:"هل تتناول أدوية نفسية حالياً؟", label_en:"Are you currently taking psychiatric medication?" },
    { key:"sleep_issues",       type:"yesno",  label_ar:"هل تعاني من مشاكل في النوم؟", label_en:"Do you have sleep issues?" },
  ],
  nutrition: [
    { key:"diet_type",          type:"select", label_ar:"النظام الغذائي الحالي", label_en:"Current diet type", options_ar:["عادي","نباتي","نباتي صارم","كيتو","أخرى"], options_en:["Regular","Vegetarian","Vegan","Keto","Other"] },
    { key:"activity_level",     type:"select", label_ar:"مستوى النشاط البدني", label_en:"Physical activity level", options_ar:["مستقر","خفيف","متوسط","مرتفع"], options_en:["Sedentary","Light","Moderate","High"] },
  ],
  ophthalmology: [
    { key:"wears_glasses",      type:"yesno",  label_ar:"هل تضع نظارات أو عدسات؟", label_en:"Do you wear glasses or contact lenses?" },
    { key:"previous_surgery",   type:"yesno",  label_ar:"هل أجريت عملية عيون سابقاً؟", label_en:"Have you had eye surgery before?" },
    { key:"family_glaucoma",    type:"yesno",  label_ar:"هل يوجد تاريخ عائلي بالجلوكوما؟", label_en:"Family history of glaucoma?" },
  ],
  orthopedic: [
    { key:"fracture_history",   type:"yesno",  label_ar:"هل سبق أن عانيت من كسر عظام؟", label_en:"Have you had bone fractures before?" },
    { key:"joint_replacement",  type:"yesno",  label_ar:"هل أجريت عملية تركيب مفصل صناعي؟", label_en:"Have you had joint replacement surgery?" },
    { key:"sport_injury",       type:"yesno",  label_ar:"هل الإصابة متعلقة بممارسة الرياضة؟", label_en:"Is the injury sports-related?" },
  ],
  cardiology: [
    { key:"chest_pain",         type:"yesno",  label_ar:"هل تعاني من ألم صدري؟", label_en:"Do you experience chest pain?" },
    { key:"shortness_breath",   type:"yesno",  label_ar:"هل تعاني من ضيق في التنفس؟", label_en:"Do you experience shortness of breath?" },
    { key:"previous_heart_cond",type:"yesno",  label_ar:"هل سبق تشخيصك بأمراض قلبية؟", label_en:"Previously diagnosed with heart conditions?" },
    { key:"smoking",            type:"yesno",  label_ar:"هل أنت مدخّن؟", label_en:"Are you a smoker?" },
  ],
  gynecology: [
    { key:"pregnancy",          type:"yesno",  label_ar:"هل أنتِ حامل؟", label_en:"Are you pregnant?" },
    { key:"menstrual_issues",   type:"yesno",  label_ar:"هل تعانين من اضطرابات في الدورة الشهرية؟", label_en:"Do you have menstrual irregularities?" },
    { key:"c_section_history",  type:"yesno",  label_ar:"هل سبق إجراء عملية قيصرية؟", label_en:"Previous cesarean section?" },
  ],
  ent: [
    { key:"hearing_loss",       type:"yesno",  label_ar:"هل تعاني من ضعف سمع؟", label_en:"Do you have hearing loss?" },
    { key:"chronic_sinusitis",  type:"yesno",  label_ar:"هل تعاني من التهاب جيوب مزمن؟", label_en:"Do you have chronic sinusitis?" },
    { key:"snoring",            type:"yesno",  label_ar:"هل تعاني من الشخير؟", label_en:"Do you snore?" },
  ],
  urology: [
    { key:"urinary_issues",     type:"yesno",  label_ar:"هل تعاني من مشاكل في التبول؟", label_en:"Do you have urinary issues?" },
    { key:"kidney_stones",      type:"yesno",  label_ar:"هل سبق تشخيصك بحصى الكلى؟", label_en:"Previously diagnosed with kidney stones?" },
  ],
};

// ── السجل الطبي حسب نوع العيادة ─────────────────────────────
type MedicalField = {
  key: string;
  label_ar: string;
  label_en: string;
  type: "textarea" | "text" | "yesno";
  icon: string;
};

const MEDICAL_FIELDS_BY_TYPE: Record<ClinicType, MedicalField[]> = {
  general: [
    { key:"allergies",      label_ar:"الحساسية",          label_en:"Allergies",         type:"textarea", icon:"🤧" },
    { key:"medications",    label_ar:"الأدوية الحالية",   label_en:"Current Medications",type:"textarea", icon:"💊" },
    { key:"surgeries",      label_ar:"العمليات السابقة",  label_en:"Past Surgeries",    type:"textarea", icon:"🔪" },
    { key:"family_history", label_ar:"التاريخ العائلي",   label_en:"Family History",    type:"textarea", icon:"👨‍👩‍👧" },
    { key:"chronic_diseases",label_ar:"الأمراض المزمنة", label_en:"Chronic Diseases",  type:"textarea", icon:"🏥" },
    { key:"extended_notes", label_ar:"ملاحظات الطبيب",   label_en:"Doctor Notes",      type:"textarea", icon:"📝" },
  ],
  dental: [
    { key:"allergies",        label_ar:"حساسية الأدوية",      label_en:"Drug Allergies",       type:"textarea", icon:"💊" },
    { key:"medications",      label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💉" },
    { key:"dental_history",   label_ar:"التاريخ الطبي السني", label_en:"Dental Medical History",type:"textarea", icon:"🦷" },
    { key:"tmj_issues",       label_ar:"مشاكل مفصل الفك",    label_en:"TMJ Issues",           type:"textarea", icon:"🦴" },
    { key:"extended_notes",   label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  dermatology: [
    { key:"allergies",       label_ar:"الحساسية الجلدية",     label_en:"Skin Allergies",       type:"textarea", icon:"🤧" },
    { key:"medications",     label_ar:"الأدوية والكريمات",    label_en:"Medications & Creams", type:"textarea", icon:"💊" },
    { key:"skin_history",    label_ar:"التاريخ الجلدي",      label_en:"Dermatological History",type:"textarea", icon:"🧴" },
    { key:"sun_exposure",    label_ar:"التعرض للشمس",        label_en:"Sun Exposure",         type:"textarea", icon:"☀️" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  cosmetic: [
    { key:"allergies",       label_ar:"الحساسية",             label_en:"Allergies",            type:"textarea", icon:"🤧" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"prev_procedures", label_ar:"الإجراءات التجميلية السابقة", label_en:"Previous Cosmetic Procedures", type:"textarea", icon:"✨" },
    { key:"expectations",    label_ar:"التوقعات والأهداف",  label_en:"Goals & Expectations", type:"textarea", icon:"🎯" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  pediatrics: [
    { key:"allergies",       label_ar:"الحساسية",             label_en:"Allergies",            type:"textarea", icon:"🤧" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"birth_history",   label_ar:"تاريخ الولادة",       label_en:"Birth History",        type:"textarea", icon:"👶" },
    { key:"developmental",   label_ar:"مراحل النمو والتطور", label_en:"Developmental Milestones", type:"textarea", icon:"📈" },
    { key:"vaccinations",    label_ar:"جدول التطعيمات",      label_en:"Vaccination Schedule", type:"textarea", icon:"💉" },
    { key:"family_history",  label_ar:"التاريخ العائلي",     label_en:"Family History",       type:"textarea", icon:"👨‍👩‍👧" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  physical_therapy: [
    { key:"injury_details",  label_ar:"تفاصيل الإصابة",      label_en:"Injury Details",       type:"textarea", icon:"🦴" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"pain_scale",      label_ar:"وصف الألم",           label_en:"Pain Description",     type:"textarea", icon:"😣" },
    { key:"functional_goals",label_ar:"الأهداف الوظيفية",   label_en:"Functional Goals",     type:"textarea", icon:"🎯" },
    { key:"exercise_history",label_ar:"تاريخ التمارين",     label_en:"Exercise History",     type:"textarea", icon:"🏋️" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  mental_health: [
    { key:"chief_complaint", label_ar:"الشكوى الرئيسية",    label_en:"Chief Complaint",      type:"textarea", icon:"💭" },
    { key:"medications",     label_ar:"الأدوية النفسية الحالية", label_en:"Current Psychiatric Medications", type:"textarea", icon:"💊" },
    { key:"therapy_history", label_ar:"تاريخ العلاج النفسي",label_en:"Therapy History",      type:"textarea", icon:"🧠" },
    { key:"sleep_pattern",   label_ar:"نمط النوم",          label_en:"Sleep Pattern",        type:"textarea", icon:"🌙" },
    { key:"social_support",  label_ar:"الدعم الاجتماعي",   label_en:"Social Support",       type:"textarea", icon:"🤝" },
    { key:"extended_notes",  label_ar:"ملاحظات المعالج",   label_en:"Therapist Notes",      type:"textarea", icon:"📝" },
  ],
  nutrition: [
    { key:"dietary_restrictions",label_ar:"القيود الغذائية", label_en:"Dietary Restrictions", type:"textarea", icon:"🚫" },
    { key:"food_allergies",  label_ar:"حساسية الطعام",      label_en:"Food Allergies",       type:"textarea", icon:"🤧" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"weight_history",  label_ar:"تاريخ الوزن",         label_en:"Weight History",       type:"textarea", icon:"⚖️" },
    { key:"eating_habits",   label_ar:"العادات الغذائية",   label_en:"Eating Habits",        type:"textarea", icon:"🍽️" },
    { key:"extended_notes",  label_ar:"ملاحظات الأخصائي",  label_en:"Nutritionist Notes",   type:"textarea", icon:"📝" },
  ],
  ophthalmology: [
    { key:"eye_history",     label_ar:"التاريخ البصري",      label_en:"Eye History",          type:"textarea", icon:"👁️" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"glasses_history", label_ar:"تاريخ النظارات",     label_en:"Glasses/Lens History", type:"textarea", icon:"👓" },
    { key:"family_history",  label_ar:"التاريخ العائلي البصري", label_en:"Family Eye History", type:"textarea", icon:"👨‍👩‍👧" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  orthopedic: [
    { key:"injury_details",  label_ar:"تفاصيل الإصابة",      label_en:"Injury Details",       type:"textarea", icon:"🦴" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"fracture_history",label_ar:"تاريخ الكسور",       label_en:"Fracture History",     type:"textarea", icon:"🩺" },
    { key:"surgeries",       label_ar:"العمليات الجراحية",  label_en:"Surgical History",     type:"textarea", icon:"🔪" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  cardiology: [
    { key:"cardiac_history", label_ar:"التاريخ القلبي",     label_en:"Cardiac History",      type:"textarea", icon:"❤️" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"risk_factors",    label_ar:"عوامل الخطر",         label_en:"Risk Factors",         type:"textarea", icon:"⚠️" },
    { key:"family_history",  label_ar:"التاريخ العائلي",     label_en:"Family History",       type:"textarea", icon:"👨‍👩‍👧" },
    { key:"surgeries",       label_ar:"العمليات القلبية",   label_en:"Cardiac Surgeries",    type:"textarea", icon:"🔪" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  gynecology: [
    { key:"ob_history",      label_ar:"التاريخ التوليدي",   label_en:"Obstetric History",    type:"textarea", icon:"🌸" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"menstrual_history",label_ar:"تاريخ الدورة الشهرية", label_en:"Menstrual History", type:"textarea", icon:"📅" },
    { key:"surgeries",       label_ar:"العمليات الجراحية",  label_en:"Surgical History",     type:"textarea", icon:"🔪" },
    { key:"family_history",  label_ar:"التاريخ العائلي",     label_en:"Family History",       type:"textarea", icon:"👨‍👩‍👧" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيبة",   label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  ent: [
    { key:"ent_history",     label_ar:"التاريخ الطبي للأذن والأنف والحنجرة", label_en:"ENT Medical History", type:"textarea", icon:"👂" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"allergies",       label_ar:"الحساسية",             label_en:"Allergies",            type:"textarea", icon:"🤧" },
    { key:"surgeries",       label_ar:"العمليات الجراحية",  label_en:"Surgical History",     type:"textarea", icon:"🔪" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  urology: [
    { key:"urological_history",label_ar:"التاريخ المسالكي",  label_en:"Urological History",  type:"textarea", icon:"💧" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"surgeries",       label_ar:"العمليات الجراحية",  label_en:"Surgical History",     type:"textarea", icon:"🔪" },
    { key:"family_history",  label_ar:"التاريخ العائلي",     label_en:"Family History",       type:"textarea", icon:"👨‍👩‍👧" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
  other: [
    { key:"allergies",       label_ar:"الحساسية",             label_en:"Allergies",            type:"textarea", icon:"🤧" },
    { key:"medications",     label_ar:"الأدوية الحالية",     label_en:"Current Medications",  type:"textarea", icon:"💊" },
    { key:"surgeries",       label_ar:"العمليات السابقة",    label_en:"Past Surgeries",       type:"textarea", icon:"🔪" },
    { key:"family_history",  label_ar:"التاريخ العائلي",     label_en:"Family History",       type:"textarea", icon:"👨‍👩‍👧" },
    { key:"extended_notes",  label_ar:"ملاحظات الطبيب",     label_en:"Doctor Notes",         type:"textarea", icon:"📝" },
  ],
};

// ── Sidebar colors ─────────────────────────────────────────
const SB_BG          = "#0558a8";
const SB_BG_HEADER   = "#044d96";
const SB_BG_FOOTER   = "#044d96";
const SB_ACTIVE_BG   = "rgba(255,255,255,0.15)";
const SB_ACTIVE_TEXT = "#ffffff";
const SB_IDLE_TEXT   = "rgba(255,255,255,0.62)";
const SB_BORDER      = "rgba(255,255,255,0.1)";
const SB_INDICATOR   = "#7dd3fc";

const T = {
  ar: {
    appName:"نبض", appSub:"إدارة العيادة",
    nav:{ dashboard:"لوحة المعلومات", patients:"المرضى", appointments:"المواعيد", payments:"المدفوعات", prescriptions:"الوصفات الطبية", tracking:"متابعة المرضى" },
    page:{ title:"إدارة المرضى", sub:"سجلات وملفات المرضى المسجلين" },
    addPatient:"إضافة مريض",
    search:"ابحث بالاسم أو رقم الهاتف أو رقم السجل...",
    filters:{ all:"الكل", male:"ذكر", female:"أنثى", diabetic:"سكري", hypertension:"ضغط" },
    table:{ name:"الاسم", phone:"الهاتف", gender:"الجنس", dob:"تاريخ الميلاد", conditions:"الحالات", actions:"الإجراءات" },
    gender:{ male:"ذكر", female:"أنثى" },
    conditions:{ diabetes:"سكري", hypertension:"ضغط" },
    actions:{ edit:"تعديل", delete:"حذف", hide:"إخفاء", show:"إظهار", viewAppointments:"المواعيد", whatsapp:"واتساب", profile:"الملف الكامل" },
    noPatients:"لا يوجد مرضى مسجلون",
    noResults:"لا توجد نتائج مطابقة",
    hiddenBadge:"مخفي",
    showHidden:"المخفيون",
    hideHidden:"إخفاء",
    modal:{
      addTitle:"إضافة مريض جديد", editTitle:"تعديل بيانات المريض",
      name:"الاسم الكامل *", namePh:"أدخل الاسم الكامل",
      phone:"رقم الهاتف", phonePh:"مثال: 0501234567",
      gender:"الجنس *", selectGender:"اختر الجنس",
      male:"ذكر", female:"أنثى", dob:"تاريخ الميلاد",
      diabetes:"يعاني من السكري", hypertension:"يعاني من ضغط الدم",
      notes:"ملاحظات", notesPh:"أي ملاحظات إضافية...",
      save:"حفظ المريض", update:"تحديث البيانات",
      cancel:"إلغاء", required:"الاسم والجنس مطلوبان",
      clinicInfo:"معلومات خاصة بالعيادة",
      yes:"نعم", no:"لا",
    },
    deleteModal:{
      title:"تأكيد الحذف", msg:"هل أنت متأكد من حذف بيانات",
      warning:"لا يمكن التراجع عن هذا الإجراء.",
      confirm:"نعم، احذف", cancel:"إلغاء",
    },
    stats:{ total:"إجمالي", male:"ذكور", female:"إناث", newMonth:"مرضى جدد هذا الشهر" },
    signOut:"تسجيل الخروج", id:"رقم", years:"سنة",
    profile:{
      title:"ملف المريض الكامل",
      tabs:{ info:"المعلومات", medical:"السجل الطبي", xrays:"الأشعة", dental:"خريطة الأسنان" },
      personalInfo:"المعلومات الشخصية",
      name:"الاسم", phone:"الهاتف", gender:"الجنس", dob:"تاريخ الميلاد", age:"العمر", years:"سنة",
      conditions:"الحالات المزمنة",
      xrays:"صور الأشعة", uploadXray:"رفع أشعة", xrayDate:"التاريخ", xrayType:"النوع", xrayNote:"ملاحظة",
      xrayTypes:{ panoramic:"بانورامك", periapical:"بيريابيكال", bitewing:"بيت وينغ", chest:"صدر", hand:"يد", spine:"عمود فقري", other:"أخرى" },
      noXrays:"لا توجد صور أشعة", dropzone:"اسحب الصورة هنا أو انقر للرفع",
      dentalChart:"خريطة الأسنان", selectTooth:"انقر على سن للتعديل",
      toothStatus:"حالة السن", toothNotes:"ملاحظات",
      statuses:{ healthy:"سليم", filled:"حشوة", crown:"تاج", missing:"مفقود", extraction:"خلع", root_canal:"معالجة عصب", bridge:"جسر", implant:"زرعة", fractured:"مكسور", decayed:"تسوس" },
      upper:"الفك العلوي", lower:"الفك السفلي", right:"يمين", left:"يسار", adult:"دائم", baby:"لبني",
      close:"إغلاق", save:"حفظ", saving:"جاري الحفظ...",
      medicalRecord:"السجل الطبي",
      noClinicType:"نوع العيادة غير محدد",
    },
  },
  en: {
    appName:"NABD", appSub:"Clinic Manager",
    nav:{ dashboard:"Dashboard", patients:"Patients", appointments:"Appointments", payments:"Payments", prescriptions:"Prescriptions", tracking:"Patient Tracking" },
    page:{ title:"Patients", sub:"Records and files of registered patients" },
    addPatient:"Add Patient",
    search:"Search by name, phone or MRN...",
    filters:{ all:"All", male:"Male", female:"Female", diabetic:"Diabetic", hypertension:"BP" },
    table:{ name:"Name", phone:"Phone", gender:"Gender", dob:"Date of Birth", conditions:"Conditions", actions:"Actions" },
    gender:{ male:"Male", female:"Female" },
    conditions:{ diabetes:"Diabetes", hypertension:"Hypertension" },
    actions:{ edit:"Edit", delete:"Delete", hide:"Hide", show:"Show", viewAppointments:"Appointments", whatsapp:"WhatsApp", profile:"Full Profile" },
    noPatients:"No patients registered",
    noResults:"No matching results",
    hiddenBadge:"Hidden",
    showHidden:"Hidden",
    hideHidden:"Hide",
    modal:{
      addTitle:"Add New Patient", editTitle:"Edit Patient",
      name:"Full Name *", namePh:"Enter full name",
      phone:"Phone Number", phonePh:"e.g. 0501234567",
      gender:"Gender *", selectGender:"Select gender",
      male:"Male", female:"Female", dob:"Date of Birth",
      diabetes:"Has Diabetes", hypertension:"Has Hypertension",
      notes:"Notes", notesPh:"Any additional notes...",
      save:"Save Patient", update:"Update Patient",
      cancel:"Cancel", required:"Name and gender are required",
      clinicInfo:"Clinic-Specific Information",
      yes:"Yes", no:"No",
    },
    deleteModal:{
      title:"Confirm Delete", msg:"Are you sure you want to delete",
      warning:"This action cannot be undone.",
      confirm:"Yes, Delete", cancel:"Cancel",
    },
    stats:{ total:"Total", male:"Male", female:"Female", newMonth:"New This Month" },
    signOut:"Sign Out", id:"ID", years:"yrs",
    profile:{
      title:"Patient Full Profile",
      tabs:{ info:"Info", medical:"Medical", xrays:"X-Rays", dental:"Dental Chart" },
      personalInfo:"Personal Information",
      name:"Name", phone:"Phone", gender:"Gender", dob:"Date of Birth", age:"Age", years:"yrs",
      conditions:"Chronic Conditions",
      xrays:"X-Ray Images", uploadXray:"Upload X-Ray", xrayDate:"Date", xrayType:"Type", xrayNote:"Note",
      xrayTypes:{ panoramic:"Panoramic", periapical:"Periapical", bitewing:"Bitewing", chest:"Chest", hand:"Hand", spine:"Spine", other:"Other" },
      noXrays:"No X-rays uploaded", dropzone:"Drag image here or click to upload",
      dentalChart:"Dental Chart", selectTooth:"Click a tooth to edit",
      toothStatus:"Tooth Status", toothNotes:"Notes",
      statuses:{ healthy:"Healthy", filled:"Filled", crown:"Crown", missing:"Missing", extraction:"Extraction", root_canal:"Root Canal", bridge:"Bridge", implant:"Implant", fractured:"Fractured", decayed:"Decayed" },
      upper:"Upper Jaw", lower:"Lower Jaw", right:"Right", left:"Left", adult:"Adult", baby:"Baby",
      close:"Close", save:"Save", saving:"Saving...",
      medicalRecord:"Medical Record",
      noClinicType:"Clinic type not set",
    },
  },
} as const;

type PatientForm = {
  name:string; phone:string; gender:string;
  date_of_birth:string; has_diabetes:boolean; has_hypertension:boolean;
  notes:string;
  extra_fields: Record<string, string | boolean>;
};

type ToothStatus = "healthy"|"filled"|"crown"|"missing"|"extraction"|"root_canal"|"bridge"|"implant"|"fractured"|"decayed";
type ToothData   = { status:ToothStatus; notes:string };
type DentalChart = Record<number, ToothData>;
type XRayImage   = { id:string; url:string; type:string; date:string; note:string; name:string };
type PatientProfile = {
  medical_fields: Record<string,string>;
  dental_chart: DentalChart;
  xrays: XRayImage[];
  extra_form_fields: Record<string,string|boolean>;
};

// ─── MRN Helper — يتحقق من master_patients بالهاتف ──────────
async function getOrCreateMRN(phone: string, name: string): Promise<string> {
  const cleanPhone = phone.trim();
  // هل يوجد سجل مركزي بهذا الهاتف؟
  const { data: existing } = await supabase
    .from("master_patients")
    .select("mrn")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (existing?.mrn) return existing.mrn;

  // إنشاء سجل جديد
  const { data: inserted } = await supabase
    .from("master_patients")
    .insert({ phone: cleanPhone, name: name.trim() })
    .select("id, mrn")
    .single();

  if (inserted?.mrn) return inserted.mrn;

  // fallback: إذا فشل الإدراج (race condition)، نحاول جلبه مجدداً
  const { data: retry } = await supabase
    .from("master_patients")
    .select("mrn")
    .eq("phone", cleanPhone)
    .maybeSingle();

  return retry?.mrn ?? `MRN-T-${Date.now()}`;
}

const TOOTH_COLORS: Record<ToothStatus, { bg:string; border:string; text:string }> = {
  healthy:    { bg:"#e8f5e9", border:"#4caf50", text:"#2e7d32" },
  filled:     { bg:"#e3f2fd", border:"#2196f3", text:"#1565c0" },
  crown:      { bg:"#fff3e0", border:"#ff9800", text:"#e65100" },
  missing:    { bg:"#f5f5f5", border:"#9e9e9e", text:"#616161" },
  extraction: { bg:"#fce4ec", border:"#e91e63", text:"#880e4f" },
  root_canal: { bg:"#f3e5f5", border:"#9c27b0", text:"#4a148c" },
  bridge:     { bg:"#e0f2f1", border:"#009688", text:"#00695c" },
  implant:    { bg:"#e8eaf6", border:"#3f51b5", text:"#1a237e" },
  fractured:  { bg:"#fff8e1", border:"#ffc107", text:"#f57f17" },
  decayed:    { bg:"#fbe9e7", border:"#ff5722", text:"#bf360c" },
};

const UPPER_RIGHT = [18,17,16,15,14,13,12,11];
const UPPER_LEFT  = [21,22,23,24,25,26,27,28];
const LOWER_RIGHT = [48,47,46,45,44,43,42,41];
const LOWER_LEFT  = [31,32,33,34,35,36,37,38];
const UPPER_RIGHT_BABY = [55,54,53,52,51];
const UPPER_LEFT_BABY  = [61,62,63,64,65];
const LOWER_RIGHT_BABY = [85,84,83,82,81];
const LOWER_LEFT_BABY  = [71,72,73,74,75];

const AVATAR_COLORS = ["#0863ba","#2e7d32","#c0392b","#7b2d8b","#e67e22","#16a085","#2980b9","#8e44ad"];
const getColor    = (id:number) => AVATAR_COLORS[(id-1)%AVATAR_COLORS.length];
const getInitials = (name:string) => name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();

function openWhatsApp(phone:string) {
  let cleaned = phone.replace(/[^0-9+]/g,"");
  if (cleaned.startsWith("09")) cleaned = "963"+cleaned.slice(1);
  else if (cleaned.startsWith("9")&&cleaned.length<=9&&!cleaned.startsWith("963")) cleaned = "963"+cleaned;
  else if (cleaned.startsWith("0")) cleaned = "963"+cleaned.slice(1);
  else if (!cleaned.startsWith("+")&&!cleaned.startsWith("963")) cleaned = "963"+cleaned;
  cleaned = cleaned.replace(/^\+/,"");
  window.open("https://wa.me/"+cleaned,"nabd_whatsapp");
}

// ─── Supabase Profile Helpers ─────────────────────────────
async function loadProfileFromDB(patientId:number): Promise<PatientProfile|null> {
  try {
    const { data, error } = await supabase.from("patient_profiles").select("*").eq("patient_id",patientId).maybeSingle();
    if (error||!data) return null;
    return {
      medical_fields:    data.medical_fields    ?? {},
      dental_chart:      data.dental_chart      ?? {},
      xrays:             data.xrays             ?? [],
      extra_form_fields: data.extra_form_fields ?? {},
    };
  } catch { return null; }
}

async function saveProfileToDB(patientId:number, userId:string, profile:PatientProfile) {
  await supabase.from("patient_profiles").upsert({
    patient_id:        patientId,
    user_id:           userId,
    medical_fields:    profile.medical_fields,
    dental_chart:      profile.dental_chart,
    xrays:             profile.xrays,
    extra_form_fields: profile.extra_form_fields,
    updated_at:        new Date().toISOString(),
  },{ onConflict:"patient_id" });
}

// ─── Dental Chart ─────────────────────────────────────────
function DentalChartSection({ lang, chart, onChange }: { lang:Lang; chart:DentalChart; onChange:(c:DentalChart)=>void }) {
  const t    = T[lang].profile;
  const isAr = lang==="ar";
  const [selected,   setSelected]   = useState<number|null>(null);
  const [editStatus, setEditStatus] = useState<ToothStatus>("healthy");
  const [editNote,   setEditNote]   = useState("");
  const [showBaby,   setShowBaby]   = useState(false);

  const openTooth = (num:number) => {
    setSelected(num);
    const existing = chart[num];
    setEditStatus(existing?.status??"healthy");
    setEditNote(existing?.notes??"");
  };
  const saveTooth = () => {
    if (selected===null) return;
    onChange({...chart,[selected]:{status:editStatus,notes:editNote}});
    setSelected(null);
  };

  const ToothBtn = ({ num }:{ num:number }) => {
    const data   = chart[num];
    const colors = data ? TOOTH_COLORS[data.status] : { bg:"#fff", border:"#dde3ea", text:"#aaa" };
    const isSel  = selected===num;
    return (
      <button onClick={()=>openTooth(num)} title={`${num}${data?` — ${t.statuses[data.status]}`:""}`}
        style={{ width:34,height:38,borderRadius:8,border:`2px solid ${isSel?"#0863ba":colors.border}`,background:isSel?"rgba(8,99,186,.12)":colors.bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,transition:"all .15s",flexShrink:0,boxShadow:isSel?"0 0 0 3px rgba(8,99,186,.2)":"0 1px 3px rgba(0,0,0,.06)",position:"relative" }}>
        <span style={{ fontSize:7,color:"#aaa",fontWeight:700,lineHeight:1 }}>{num}</span>
        <svg viewBox="0 0 20 24" width="14" height="16"><path d="M10 1C7 1 4 3 4 7c0 2 .5 4 1 6 .5 2 1 5 1 7 0 1 .5 2 1 2s1-.5 1-2c0-1 .5-2 2-2s2 1 2 2c0 1.5.5 2 1 2s1-1 1-2c0-2 .5-5 1-7 .5-2 1-4 1-6 0-4-3-6-6-6z" fill={data?colors.border:"#dde3ea"} opacity={data?1:0.5}/></svg>
        {data?.status==="missing"&&<div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:16,color:"#9e9e9e",fontWeight:900 }}>×</span></div>}
      </button>
    );
  };

  const ToothRow = ({ nums,label }:{ nums:number[]; label:string }) => (
    <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
      <div style={{ fontSize:9,color:"#bbb",fontWeight:700,textAlign:"center",textTransform:"uppercase" }}>{label}</div>
      <div style={{ display:"flex",gap:3 }}>{nums.map(n=><ToothBtn key={n} num={n}/>)}</div>
    </div>
  );

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ display:"flex",gap:8 }}>
        {[false,true].map(baby=>(
          <button key={String(baby)} onClick={()=>setShowBaby(baby)} style={{ padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,background:showBaby===baby?"#0863ba":"#f0f4f8",color:showBaby===baby?"#fff":"#888" }}>
            {baby?(isAr?"لبني":"Baby"):(isAr?"دائم":"Adult")}
          </button>
        ))}
      </div>
      <div style={{ background:"#fafbfc",borderRadius:14,padding:16,border:"1.5px solid #eef0f3",overflowX:"auto" }}>
        {!showBaby?(
          <div style={{ display:"flex",flexDirection:"column",gap:12,minWidth:580 }}>
            <div style={{ textAlign:"center",fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:4 }}>🦷 {t.upper}</div>
            <div style={{ display:"flex",justifyContent:"center",gap:16 }}>
              <ToothRow nums={UPPER_RIGHT} label={isAr?t.left:t.right}/>
              <div style={{ width:2,background:"#e0e6ed",borderRadius:2,alignSelf:"stretch",margin:"16px 0 0" }}/>
              <ToothRow nums={UPPER_LEFT} label={isAr?t.right:t.left}/>
            </div>
            <div style={{ height:2,background:"#eef0f3",borderRadius:2,margin:"2px 0" }}/>
            <div style={{ display:"flex",justifyContent:"center",gap:16 }}>
              <ToothRow nums={LOWER_RIGHT} label={isAr?t.left:t.right}/>
              <div style={{ width:2,background:"#e0e6ed",borderRadius:2,alignSelf:"stretch",margin:"0 0 16px" }}/>
              <ToothRow nums={LOWER_LEFT} label={isAr?t.right:t.left}/>
            </div>
            <div style={{ textAlign:"center",fontSize:11,fontWeight:700,color:"#0863ba",marginTop:4 }}>🦷 {t.lower}</div>
          </div>
        ):(
          <div style={{ display:"flex",flexDirection:"column",gap:12,minWidth:380 }}>
            <div style={{ textAlign:"center",fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:4 }}>🦷 {t.upper}</div>
            <div style={{ display:"flex",justifyContent:"center",gap:16 }}>
              <ToothRow nums={UPPER_RIGHT_BABY} label={isAr?t.left:t.right}/>
              <div style={{ width:2,background:"#e0e6ed",borderRadius:2,alignSelf:"stretch",margin:"16px 0 0" }}/>
              <ToothRow nums={UPPER_LEFT_BABY} label={isAr?t.right:t.left}/>
            </div>
            <div style={{ height:2,background:"#eef0f3",borderRadius:2,margin:"2px 0" }}/>
            <div style={{ display:"flex",justifyContent:"center",gap:16 }}>
              <ToothRow nums={LOWER_RIGHT_BABY} label={isAr?t.left:t.right}/>
              <div style={{ width:2,background:"#e0e6ed",borderRadius:2,alignSelf:"stretch",margin:"0 0 16px" }}/>
              <ToothRow nums={LOWER_LEFT_BABY} label={isAr?t.right:t.left}/>
            </div>
            <div style={{ textAlign:"center",fontSize:11,fontWeight:700,color:"#0863ba",marginTop:4 }}>🦷 {t.lower}</div>
          </div>
        )}
      </div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
        {(Object.keys(TOOTH_COLORS) as ToothStatus[]).map(k=>{
          const c=TOOTH_COLORS[k];
          return <span key={k} style={{ fontSize:10,padding:"3px 9px",borderRadius:20,background:c.bg,border:`1.5px solid ${c.border}`,color:c.text,fontWeight:600 }}>{t.statuses[k]}</span>;
        })}
      </div>
      {selected!==null&&(
        <div style={{ background:"#fff",borderRadius:14,padding:16,border:"2px solid #0863ba",boxShadow:"0 4px 20px rgba(8,99,186,.12)" }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#0863ba",marginBottom:12 }}>🦷 {isAr?`السن رقم ${selected}`:`Tooth #${selected}`}</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:6 }}>{t.toothStatus}</label>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {(Object.keys(TOOTH_COLORS) as ToothStatus[]).map(s=>{
                const c=TOOTH_COLORS[s]; const active=editStatus===s;
                return <button key={s} onClick={()=>setEditStatus(s)} style={{ padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"Rubik,sans-serif",background:active?c.border:c.bg,border:`1.5px solid ${c.border}`,color:active?"#fff":c.text,transition:"all .15s" }}>{t.statuses[s]}</button>;
              })}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:6 }}>{t.toothNotes}</label>
            <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} rows={2} style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,resize:"none" as const,outline:"none",direction:isAr?"rtl":"ltr" }}/>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={saveTooth} style={{ flex:1,padding:"10px",background:"#0863ba",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>{t.save}</button>
            <button onClick={()=>setSelected(null)} style={{ padding:"10px 16px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>{t.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── X-Ray Section ────────────────────────────────────────
function XRaySection({ lang, xrays, onChange }: { lang:Lang; xrays:XRayImage[]; onChange:(imgs:XRayImage[])=>void }) {
  const t      = T[lang].profile;
  const isAr   = lang==="ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newType,   setNewType]   = useState("panoramic");
  const [newNote,   setNewNote]   = useState("");
  const [preview,   setPreview]   = useState<XRayImage|null>(null);

  const handleFile = (file:File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img:XRayImage = { id:Date.now().toString(), url:e.target?.result as string, type:newType, date:new Date().toISOString().slice(0,10), note:newNote, name:file.name };
      onChange([img,...xrays]);
      setNewNote("");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <div>
          <label style={{ fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5 }}>{t.xrayType}</label>
          <select value={newType} onChange={e=>setNewType(e.target.value)} style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",background:"#fafbfc" }}>
            {Object.entries(t.xrayTypes).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:11,fontWeight:700,color:"#888",display:"block",marginBottom:5 }}>{t.xrayNote}</label>
          <input value={newNote} onChange={e=>setNewNote(e.target.value)} style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,outline:"none",background:"#fafbfc",direction:isAr?"rtl":"ltr" }}/>
        </div>
      </div>
      <div onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{ border:`2px dashed ${dragging?"#0863ba":"#c8d4e0"}`,borderRadius:14,padding:"24px 16px",textAlign:"center",cursor:"pointer",background:dragging?"rgba(8,99,186,.05)":"#fafbfc",transition:"all .2s" }}>
        {uploading?<div style={{ fontSize:13,color:"#0863ba" }}>⏳ {isAr?"جاري الرفع...":"Uploading..."}</div>:<><div style={{ fontSize:32,marginBottom:8 }}>🩻</div><div style={{ fontSize:13,color:"#888",fontWeight:500 }}>{t.dropzone}</div><div style={{ fontSize:11,color:"#bbb",marginTop:4 }}>JPG, PNG, WEBP</div></>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
      {xrays.length===0?(<div style={{ textAlign:"center",padding:"32px 0",color:"#ccc" }}><div style={{ fontSize:36,marginBottom:8 }}>🩻</div><div style={{ fontSize:13 }}>{t.noXrays}</div></div>):(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))",gap:10 }}>
          {xrays.map(img=>(
            <div key={img.id} onClick={()=>setPreview(img)} style={{ borderRadius:12,overflow:"hidden",border:"1.5px solid #eef0f3",background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,.06)",cursor:"pointer" }}>
              <div style={{ position:"relative",aspectRatio:"4/3",overflow:"hidden",background:"#f0f2f5" }}>
                <img src={img.url} alt={img.name} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                <button onClick={e=>{e.stopPropagation();onChange(xrays.filter(x=>x.id!==img.id));}} style={{ position:"absolute",top:4,right:4,width:22,height:22,borderRadius:"50%",background:"rgba(0,0,0,.5)",border:"none",cursor:"pointer",color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
              </div>
              <div style={{ padding:"8px 10px" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba" }}>{(t.xrayTypes as Record<string,string>)[img.type]??img.type}</div>
                <div style={{ fontSize:10,color:"#aaa",marginTop:2 }}>{img.date}</div>
                {img.note&&<div style={{ fontSize:10,color:"#888",marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{img.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      {preview&&(
        <div style={{ position:"fixed",inset:0,zIndex:500,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setPreview(null)}>
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(8px)" }}/>
          <div style={{ position:"relative",zIndex:1,maxWidth:"90vw",maxHeight:"90vh",display:"flex",flexDirection:"column",gap:12 }} onClick={e=>e.stopPropagation()}>
            <img src={preview.url} alt={preview.name} style={{ maxWidth:"100%",maxHeight:"80vh",borderRadius:12,objectFit:"contain" }}/>
            <div style={{ background:"rgba(255,255,255,.1)",backdropFilter:"blur(10px)",borderRadius:10,padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div><div style={{ color:"#fff",fontSize:13,fontWeight:700 }}>{(t.xrayTypes as Record<string,string>)[preview.type]}</div><div style={{ color:"rgba(255,255,255,.6)",fontSize:11 }}>{preview.date}{preview.note&&` — ${preview.note}`}</div></div>
              <button onClick={()=>setPreview(null)} style={{ background:"rgba(255,255,255,.2)",border:"none",borderRadius:8,cursor:"pointer",color:"#fff",fontSize:16,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Patient Profile Modal ───────────────────────────────
function PatientProfileDrawer({ lang, patient, clinicType, onClose }: { lang:Lang; patient:Patient; clinicType:ClinicType; onClose:()=>void }) {
  const t    = T[lang].profile;
  const isAr = lang==="ar";
  const meta = CLINIC_TYPE_META[clinicType] ?? CLINIC_TYPE_META.general;
  const medFields = MEDICAL_FIELDS_BY_TYPE[clinicType] ?? MEDICAL_FIELDS_BY_TYPE.general;
  const isDental = clinicType==="dental";

  const [activeTab, setActiveTab] = useState<"info"|"medical"|"xrays"|"dental">("info");
  const [profile,   setProfile]   = useState<PatientProfile>({ medical_fields:{}, dental_chart:{}, xrays:[], extra_form_fields:{} });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [userId,         setUserId]         = useState<string>("");
  const [expandedField,  setExpandedField]  = useState<string|null>(null);
  const [draftValues,    setDraftValues]    = useState<Record<string,string>>({});

  useEffect(()=>{
    (async()=>{
      setLoadingProfile(true);
      const { data:{ user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
      const saved = await loadProfileFromDB(patient.id);
      if (saved) { setProfile(saved); setDraftValues(saved.medical_fields??{}); }
      setLoadingProfile(false);
    })();
  },[patient.id]);

  const saveProfile = async (updated:PatientProfile) => {
    setProfile(updated);
    if (!userId) return;
    setSaving(true);
    await saveProfileToDB(patient.id,userId,updated);
    setSaving(false);
  };

  const saveField = async (key:string) => {
    const updated = { ...profile, medical_fields:{ ...profile.medical_fields, [key]:draftValues[key]??"" } };
    await saveProfile(updated);
    setExpandedField(null);
  };

  const calcAge = (dob?:string|null) => {
    if (!dob) return "—";
    return Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));
  };

  const tabs = [
    { key:"info"    as const, label:t.tabs.info,    icon:"👤" },
    { key:"medical" as const, label:t.tabs.medical, icon:"🏥" },
    { key:"xrays"   as const, label:t.tabs.xrays,   icon:"🩻" },
    ...(isDental ? [{ key:"dental" as const, label:t.tabs.dental, icon:"🦷" }] : []),
  ];

  return (
    <>
      <style>{`
        @keyframes modalFadeIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .ptab:hover{background:rgba(8,99,186,.07)!important}
        .med-field-row:hover{background:#f0f5ff!important}
        .med-field-row{transition:background .15s;}
      `}</style>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }}/>
      {/* Modal */}
      <div style={{ position:"fixed",inset:0,zIndex:301,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",pointerEvents:"none" }}>
        <div onClick={e=>e.stopPropagation()} style={{ pointerEvents:"all",background:"#fff",borderRadius:20,width:"100%",maxWidth:640,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(8,99,186,.2), 0 4px 16px rgba(0,0,0,.08)",animation:"modalFadeIn .28s cubic-bezier(.4,0,.2,1)",direction:isAr?"rtl":"ltr",overflow:"hidden" }}>

          {/* Header */}
          <div style={{ padding:"18px 22px 14px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:getColor(patient.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0,boxShadow:`0 4px 12px ${getColor(patient.id)}55` }}>
              {getInitials(patient.name)}
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:16,fontWeight:800,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{patient.name}</div>
              <div style={{ fontSize:11,color:"#aaa",marginTop:2,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                {patient.gender&&<span>{isAr?(patient.gender==="male"?"ذكر":"أنثى"):(patient.gender==="male"?"Male":"Female")}</span>}
                {calcAge(patient.date_of_birth)!=="—"&&<span>• {calcAge(patient.date_of_birth)} {t.years}</span>}
                <span style={{ padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,background:`${meta.color}15`,color:meta.color }}>{meta.icon} {isAr?meta.ar:meta.en}</span>
                {saving&&<span style={{ fontSize:10,color:"#0863ba",fontWeight:600 }}>💾 {t.saving}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:14,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#888",fontWeight:700 }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex",borderBottom:"1.5px solid #eef0f3",padding:"0 8px",background:"#fafbfc",flexShrink:0 }}>
            {tabs.map(tab=>(
              <button key={tab.key} className="ptab" onClick={()=>setActiveTab(tab.key)} style={{ flex:1,padding:"11px 4px",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:600,background:"transparent",color:activeTab===tab.key?"#0863ba":"#aaa",borderBottom:activeTab===tab.key?"2.5px solid #0863ba":"2.5px solid transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .18s" }}>
                <span style={{ fontSize:15 }}>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex:1,overflowY:"auto",padding:"18px 22px" }}>
            {loadingProfile?(
              <div style={{ textAlign:"center",padding:"60px 0",color:"#ccc" }}>
                <div style={{ fontSize:32,animation:"spin 1s linear infinite",display:"inline-block" }}>⚙️</div>
                <div style={{ fontSize:13,marginTop:12 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
              </div>
            ):(
              <>
                {/* ── INFO ── */}
                {activeTab==="info"&&(
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:.5,marginBottom:12 }}>{t.personalInfo}</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                      {[
                        { label:t.name,   value:patient.name, icon:"👤" },
                        { label:t.phone,  value:patient.phone||"—", icon:"📞" },
                        { label:t.gender, value:patient.gender?(isAr?(patient.gender==="male"?"ذكر":"أنثى"):(patient.gender==="male"?"Male":"Female")):"—", icon:"⚧" },
                        { label:t.dob,    value:patient.date_of_birth?new Date(patient.date_of_birth).toLocaleDateString(isAr?"ar-SA":"en-US",{year:"numeric",month:"long",day:"numeric"}):"—", icon:"🎂" },
                        { label:t.age,    value:calcAge(patient.date_of_birth)!=="—"?`${calcAge(patient.date_of_birth)} ${t.years}`:"—", icon:"🎯" },
                        { label:isAr?"الرقم الطبي":"Medical ID", value:(patient as any).mrn||"—", icon:"🪪" },
                      ].map(f=>(
                        <div key={f.label} style={{ background:"#f7f9fc",borderRadius:10,padding:"10px 12px",border:"1.5px solid #eef0f3" }}>
                          <div style={{ fontSize:10,fontWeight:700,color:"#bbb",marginBottom:4 }}>{f.icon} {f.label}</div>
                          <div style={{ fontSize:13,fontWeight:600,color:"#353535" }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:8 }}>⚕️ {t.conditions}</div>
                      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                        {[
                          { key:"has_diabetes",     label:isAr?"السكري":"Diabetes",     icon:"🩸",color:"#c0392b",active:patient.has_diabetes },
                          { key:"has_hypertension", label:isAr?"ضغط الدم":"Hypertension",icon:"💊",color:"#e67e22",active:patient.has_hypertension },
                        ].map(c=>(
                          <span key={c.key} style={{ padding:"6px 14px",borderRadius:20,fontSize:12,fontWeight:600,background:c.active?`${c.color}15`:"#f5f5f5",color:c.active?c.color:"#bbb",border:`1.5px solid ${c.active?`${c.color}35`:"#eee"}` }}>
                            {c.icon} {c.label}: {c.active?(isAr?"نعم":"Yes"):(isAr?"لا":"No")}
                          </span>
                        ))}
                      </div>
                    </div>
                    {Object.keys(profile.extra_form_fields??{}).length>0&&(
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:8 }}>📋 {isAr?"معلومات إضافية":"Additional Info"}</div>
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                          {(EXTRA_QUESTIONS[clinicType]??[]).map(q=>{
                            const val = profile.extra_form_fields?.[q.key];
                            if (val===undefined||val==="") return null;
                            return (
                              <div key={q.key} style={{ background:"#f7f9fc",borderRadius:10,padding:"10px 12px",border:"1.5px solid #eef0f3" }}>
                                <div style={{ fontSize:10,fontWeight:700,color:"#bbb",marginBottom:4 }}>{isAr?q.label_ar:q.label_en}</div>
                                <div style={{ fontSize:13,fontWeight:600,color:meta.color }}>{typeof val==="boolean"?(val?(isAr?"نعم":"Yes"):(isAr?"لا":"No")):String(val)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {patient.notes&&(
                      <div style={{ background:"#fffbf0",borderRadius:10,padding:"12px 14px",border:"1.5px solid #ffe58f" }}>
                        <div style={{ fontSize:10,fontWeight:700,color:"#bbb",marginBottom:5 }}>📝 {isAr?"ملاحظات":"Notes"}</div>
                        <div style={{ fontSize:13,color:"#555",lineHeight:1.7 }}>{patient.notes}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── MEDICAL — حقول قابلة للتوسع ── */}
                {activeTab==="medical"&&(
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"9px 12px",background:`${meta.color}08`,borderRadius:10,border:`1px solid ${meta.color}20` }}>
                      <span style={{ fontSize:16 }}>{meta.icon}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:meta.color }}>{isAr?meta.ar:meta.en} — {t.medicalRecord}</span>
                    </div>
                    <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                      {medFields.map(field=>{
                        const isExpanded = expandedField===field.key;
                        const val = draftValues[field.key]??"";
                        const savedVal = profile.medical_fields?.[field.key]??"";
                        return (
                          <div key={field.key} style={{ borderRadius:12,border:`1.5px solid ${isExpanded?"#0863ba":"#eef0f3"}`,background:isExpanded?"#fff":"#f9fafb",overflow:"hidden",transition:"border-color .2s, box-shadow .2s",boxShadow:isExpanded?"0 0 0 3px rgba(8,99,186,.08)":"none" }}>
                            {/* رأس الحقل — قابل للنقر */}
                            <div className="med-field-row" onClick={()=>{ if(isExpanded){setExpandedField(null);}else{setDraftValues(p=>({...p,[field.key]:savedVal}));setExpandedField(field.key);} }} style={{ padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none" as const,background:isExpanded?"#f0f6ff":"transparent" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0 }}>
                                <span style={{ fontSize:16,flexShrink:0 }}>{field.icon}</span>
                                <div style={{ minWidth:0 }}>
                                  <div style={{ fontSize:12,fontWeight:700,color:isExpanded?"#0863ba":"#555" }}>{isAr?field.label_ar:field.label_en}</div>
                                  {!isExpanded&&savedVal&&<div style={{ fontSize:11,color:"#888",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:340 }}>{savedVal}</div>}
                                  {!isExpanded&&!savedVal&&<div style={{ fontSize:11,color:"#ccc",fontStyle:"italic",marginTop:1 }}>{isAr?"انقر للإضافة...":"Click to add..."}</div>}
                                </div>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0,marginRight:isAr?0:0,marginLeft:isAr?0:0 }}>
                                {savedVal&&!isExpanded&&<span style={{ fontSize:10,background:"rgba(8,99,186,.1)",color:"#0863ba",fontWeight:700,padding:"2px 7px",borderRadius:20 }}>{isAr?"مُعبَّأ":"Filled"}</span>}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isExpanded?"#0863ba":"#ccc"} strokeWidth="2.5" strokeLinecap="round"><polyline points={isExpanded?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
                              </div>
                            </div>
                            {/* منطقة التحرير — تظهر عند التوسع */}
                            {isExpanded&&(
                              <div style={{ padding:"0 14px 14px" }}>
                                <textarea
                                  autoFocus
                                  value={val}
                                  onChange={e=>setDraftValues(p=>({...p,[field.key]:e.target.value}))}
                                  rows={5}
                                  placeholder={isAr?"اكتب هنا...":"Write here..."}
                                  style={{ width:"100%",padding:"10px 12px",border:"1.5px solid #c8d9f0",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none",resize:"vertical",direction:isAr?"rtl":"ltr",lineHeight:1.7,boxSizing:"border-box",marginBottom:10 }}
                                />
                                <div style={{ display:"flex",gap:8 }}>
                                  <button onClick={()=>saveField(field.key)} style={{ flex:1,padding:"9px 0",background:"#0863ba",color:"#fff",border:"none",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                                    ✓ {isAr?"حفظ":"Save"}
                                  </button>
                                  <button onClick={()=>setExpandedField(null)} style={{ padding:"9px 16px",background:"#f0f0f0",color:"#777",border:"none",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
                                    {isAr?"إلغاء":"Cancel"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── X-RAYS ── */}
                {activeTab==="xrays"&&(
                  <XRaySection lang={lang} xrays={profile.xrays} onChange={imgs=>saveProfile({...profile,xrays:imgs})}/>
                )}

                {/* ── DENTAL ── */}
                {activeTab==="dental"&&isDental&&(
                  <DentalChartSection lang={lang} chart={profile.dental_chart} onChange={c=>saveProfile({...profile,dental_chart:c})}/>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Icons ─────────────────────────────────────────────────
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

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ lang, setLang, activePage="patients" }: { lang:Lang; setLang:(l:Lang)=>void; activePage?:string }) {
  const tr   = T[lang];
  const isAr = lang==="ar";
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(()=>typeof window!=="undefined"?window.innerWidth<=768:false);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<=768);
    check(); window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);
  useEffect(()=>{
    if (isMobile&&mobileOpen) document.body.style.overflow="hidden";
    else document.body.style.overflow="";
    return ()=>{ document.body.style.overflow=""; };
  },[isMobile,mobileOpen]);

  const NAV_ICONS: Record<string,ReactNode> = {
    dashboard:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    patients:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    appointments:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    payments:<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    prescriptions:<PillIcon/>,
    tracking:<TrackingIcon/>,
  };

  const navItems:{ key:keyof typeof tr.nav; href:string }[] = [
    { key:"dashboard",     href:"/dashboard"        },
    { key:"patients",      href:"/patients"         },
    { key:"appointments",  href:"/appointments"     },
    { key:"payments",      href:"/payments"         },
    { key:"prescriptions", href:"/prescriptions"    },
    { key:"tracking",      href:"/patient-tracking" },
  ];

  const sidebarTransform=isMobile?(mobileOpen?"translateX(0)":isAr?"translateX(100%)":"translateX(-100%)"):"translateX(0)";

  return (
    <>
      {isMobile&&mobileOpen&&<div onClick={()=>setMobileOpen(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:55,WebkitTapHighlightColor:"transparent" }}/>}
      {isMobile&&(
        <button onClick={()=>setMobileOpen(!mobileOpen)} style={{ position:"fixed",top:14,zIndex:70,right:isAr?16:undefined,left:isAr?undefined:16,width:40,height:40,borderRadius:10,background:SB_BG,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(5,88,168,.4)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            {mobileOpen?<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>:<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      )}
      <aside style={{ width:isMobile?260:collapsed?70:240,minHeight:"100vh",background:SB_BG,display:"flex",flexDirection:"column",transition:"transform .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1)",position:"fixed",top:0,right:isAr?0:undefined,left:isAr?undefined:0,zIndex:60,transform:sidebarTransform,boxShadow:isMobile&&mobileOpen?(isAr?"-8px 0 32px rgba(0,0,0,.15)":"8px 0 32px rgba(0,0,0,.15)"):(isAr?"-4px 0 32px rgba(5,88,168,.45)":"4px 0 32px rgba(5,88,168,.45)") }}>
        <div style={{ padding:collapsed?"18px 0":"18px 20px",background:SB_BG_HEADER,borderBottom:`1px solid ${SB_BORDER}`,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",minHeight:72 }}>
          {!collapsed&&(<div style={{ display:"flex",alignItems:"center",gap:10 }}><img src="/Logo_Nabd.svg" alt="NABD Logo" style={{ width:38,height:38,borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,.25)" }}/><div><div style={{ fontSize:18,fontWeight:800,color:"#ffffff",lineHeight:1.1 }}>{tr.appName}</div><div style={{ fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:400 }}>{tr.appSub}</div></div></div>)}
          {collapsed&&<img src="/Logo_Nabd.svg" alt="NABD Logo" style={{ width:38,height:38,borderRadius:10 }}/>}
          {!isMobile&&(<button onClick={()=>setCollapsed(!collapsed)} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.22)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)";}} style={{ width:28,height:28,background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.22)",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.9)",fontSize:14,lineHeight:1,transition:"background .15s",flexShrink:0,marginTop:collapsed?8:0 }}>{collapsed?(isAr?"‹":"›"):(isAr?"›":"‹")}</button>)}
        </div>
        <nav style={{ flex:1,padding:"12px 10px",overflowY:"auto" }}>
          {navItems.map(item=>{
            const isActive=item.key===activePage;
            return (
              <a key={item.key} href={item.href} onMouseEnter={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)";}} onMouseLeave={e=>{if(!isActive)(e.currentTarget as HTMLElement).style.background="transparent";}}
                style={{ display:"flex",alignItems:"center",gap:collapsed?0:12,justifyContent:collapsed?"center":"flex-start",padding:collapsed?"13px 0":"11px 14px",borderRadius:10,marginBottom:4,textDecoration:"none",background:isActive?SB_ACTIVE_BG:"transparent",color:isActive?SB_ACTIVE_TEXT:SB_IDLE_TEXT,fontWeight:isActive?600:400,fontSize:14,transition:"all .18s",position:"relative" }}>
                {isActive&&<div style={{ position:"absolute",right:isAr?-10:undefined,left:isAr?undefined:-10,top:"50%",transform:"translateY(-50%)",width:3,height:24,background:SB_INDICATOR,borderRadius:10 }}/>}
                <span style={{ display:"flex",alignItems:"center",flexShrink:0 }}>{NAV_ICONS[item.key]}</span>
                {!collapsed&&<span>{tr.nav[item.key]}</span>}
              </a>
            );
          })}
        </nav>
        <div style={{ padding:collapsed?"14px 10px":"14px 12px",background:SB_BG_FOOTER,borderTop:`1px solid ${SB_BORDER}` }}>
          {!collapsed&&<button onClick={()=>setLang(lang==="ar"?"en":"ar")} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";}} style={{ width:"100%",padding:"8px",marginBottom:10,background:"rgba(255,255,255,0.06)",border:`1px solid ${SB_BORDER}`,borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"Rubik,sans-serif",color:"rgba(255,255,255,0.8)",fontWeight:600,transition:"background .15s" }}>🌐 {lang==="ar"?"English":"العربية"}</button>}
          <button onClick={async()=>{ try { await supabase.auth.signOut(); window.location.href="/login"; } catch { window.location.href="/login"; } }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.3)";}} onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(192,57,43,.15)";}}
            style={{ width:"100%",padding:collapsed?"10px 0":"10px 14px",background:"rgba(192,57,43,.15)",border:"1.5px solid rgba(192,57,43,.3)",borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,color:"#ffb3a7",fontWeight:600,display:"flex",alignItems:"center",justifyContent:collapsed?"center":"flex-start",gap:8,transition:"all .2s" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {!collapsed&&<span style={{ fontFamily:"Rubik,sans-serif" }}>{tr.signOut}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Field wrapper ────────────────────────────────────────
function Field({ label, children }:{ label:string; children:ReactNode }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );
}

// ─── PatientModal مع أسئلة ديناميكية ─────────────────────
function PatientModal({ lang, patient, clinicType, onSave, onClose }: {
  lang:Lang; patient:Patient|null; clinicType:ClinicType;
  onSave:(form:PatientForm,id?:number)=>void; onClose:()=>void;
}) {
  const tr     = T[lang];
  const isAr   = lang==="ar";
  const isEdit = !!patient?.id;
  const meta   = CLINIC_TYPE_META[clinicType]??CLINIC_TYPE_META.general;
  const extraQs = EXTRA_QUESTIONS[clinicType]??[];

  // تحميل extra_form_fields من patient_profiles إذا كان تعديلاً
  const [extraFromDB, setExtraFromDB] = useState<Record<string,string|boolean>>({});
  useEffect(()=>{
    if (patient?.id) {
      loadProfileFromDB(patient.id).then(p=>{
        if (p) setExtraFromDB(p.extra_form_fields??{});
      });
    }
  },[patient?.id]);

  const [form, setForm] = useState<PatientForm>({
    name:patient?.name??"", phone:patient?.phone??"",
    gender:patient?.gender??"", date_of_birth:patient?.date_of_birth??"",
    has_diabetes:patient?.has_diabetes??false, has_hypertension:patient?.has_hypertension??false,
    notes:patient?.notes??"", extra_fields:{},
  });
  const [error, setError] = useState("");

  // مزامنة extra_fields مع البيانات المحمّلة
  useEffect(()=>{ if (Object.keys(extraFromDB).length) setForm(p=>({...p,extra_fields:extraFromDB})); },[extraFromDB]);

  const handleSave = () => {
    if (!form.name.trim()||!form.gender) { setError(tr.modal.required); return; }
    if (!form.phone.trim()) { setError(isAr ? "رقم الهاتف مطلوب" : "Phone number is required"); return; }
    onSave(form,patient?.id);
  };

  const inputSt = useMemo(():CSSProperties=>({
    width:"100%",padding:"11px 14px",border:"1.5px solid #e8eaed",borderRadius:10,
    fontFamily:"Rubik,sans-serif",fontSize:14,color:"#353535",background:"#fafbfc",
    outline:"none",transition:"border .2s",direction:isAr?"rtl":"ltr",
  }),[isAr]);

  const setExtra = (key:string, val:string|boolean) => setForm(p=>({...p,extra_fields:{...p.extra_fields,[key]:val}}));

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(8,99,186,.18)",animation:"slideUp .3s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ width:40,height:4,background:"#e0e0e0",borderRadius:4,margin:"12px auto 0",flexShrink:0 }}/>
        <div style={{ padding:"16px 24px 16px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{isEdit?tr.modal.editTitle:tr.modal.addTitle}</h2>
            <div style={{ fontSize:11,color:meta.color,marginTop:3,fontWeight:600 }}>{meta.icon} {isAr?meta.ar:meta.en}</div>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {error&&<div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:18,display:"flex",alignItems:"center",gap:8 }}>⚠️ {error}</div>}

          {/* ── أساسيات ── */}
          <Field label={tr.modal.name}>
            <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder={tr.modal.namePh} style={inputSt}/>
          </Field>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            <Field label={isAr ? "رقم الهاتف *" : "Phone Number *"}>
              <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder={tr.modal.phonePh} style={inputSt}/>
            </Field>
            <Field label={tr.modal.gender}>
              <select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={{ ...inputSt,cursor:"pointer" }}>
                <option value="">{tr.modal.selectGender}</option>
                <option value="male">{tr.modal.male}</option>
                <option value="female">{tr.modal.female}</option>
              </select>
            </Field>
          </div>
          <Field label={tr.modal.dob}>
            <input type="date" value={form.date_of_birth} onChange={e=>setForm(p=>({...p,date_of_birth:e.target.value}))} style={inputSt}/>
          </Field>

          {/* ── حالات مزمنة عامة ── */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18 }}>
            {([
              { key:"has_diabetes" as const,     label:tr.modal.diabetes,     icon:"🩸",color:"#c0392b" },
              { key:"has_hypertension" as const, label:tr.modal.hypertension, icon:"💊",color:"#e67e22" },
            ]).map(c=>{
              const checked=form[c.key];
              return (
                <label key={c.key} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,cursor:"pointer",border:checked?`1.5px solid ${c.color}40`:"1.5px solid #eef0f3",background:checked?`${c.color}08`:"#fafbfc",transition:"all .2s" }}>
                  <span style={{ fontSize:18 }}>{c.icon}</span>
                  <span style={{ fontSize:13,fontWeight:checked?700:400,color:checked?c.color:"#666",flex:1 }}>{c.label}</span>
                  <div style={{ width:18,height:18,borderRadius:5,background:checked?c.color:"transparent",border:`2px solid ${checked?c.color:"#ccc"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s" }}>
                    {checked&&<span style={{ color:"#fff",fontSize:10,fontWeight:900 }}>✓</span>}
                  </div>
                  <input type="checkbox" checked={checked} onChange={e=>setForm(p=>({...p,[c.key]:e.target.checked}))} style={{ display:"none" }}/>
                </label>
              );
            })}
          </div>

          {/* ── أسئلة مخصصة حسب نوع العيادة ── */}
          {extraQs.length>0&&(
            <div style={{ borderTop:"1.5px dashed #eef0f3",paddingTop:18,marginBottom:4 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14,padding:"10px 14px",background:`${meta.color}08`,borderRadius:10,border:`1px solid ${meta.color}20` }}>
                <span style={{ fontSize:18 }}>{meta.icon}</span>
                <span style={{ fontSize:13,fontWeight:700,color:meta.color }}>{tr.modal.clinicInfo} — {isAr?meta.ar:meta.en}</span>
              </div>
              {extraQs.map(q=>{
                const val = form.extra_fields[q.key];
                if (q.type==="yesno") return (
                  <div key={q.key} style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#555",marginBottom:8 }}>{isAr?q.label_ar:q.label_en}</label>
                    <div style={{ display:"flex",gap:10 }}>
                      {([true,false] as const).map(v=>(
                        <button key={String(v)} type="button" onClick={()=>setExtra(q.key,v)}
                          style={{ flex:1,padding:"10px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",border:val===v?`2px solid ${v?"#2e7d32":"#c0392b"}`:"1.5px solid #eef0f3",background:val===v?(v?"rgba(46,125,50,.08)":"rgba(192,57,43,.08)"):"#fafbfc",color:val===v?(v?"#2e7d32":"#c0392b"):"#888" }}>
                          {v?(isAr?"✓ نعم":"✓ Yes"):(isAr?"✗ لا":"✗ No")}
                        </button>
                      ))}
                    </div>
                  </div>
                );
                if (q.type==="select"&&q.options_ar) return (
                  <Field key={q.key} label={isAr?q.label_ar:q.label_en}>
                    <select value={(val as string)||""} onChange={e=>setExtra(q.key,e.target.value)} style={{ ...inputSt,cursor:"pointer" }}>
                      <option value="">{isAr?"-- اختر --":"-- Select --"}</option>
                      {(isAr?q.options_ar:q.options_en??q.options_ar).map((o,i)=><option key={i} value={o}>{o}</option>)}
                    </select>
                  </Field>
                );
                if (q.type==="text") return (
                  <Field key={q.key} label={isAr?q.label_ar:q.label_en}>
                    <input value={(val as string)||""} onChange={e=>setExtra(q.key,e.target.value)} style={inputSt}/>
                  </Field>
                );
                return null;
              })}
            </div>
          )}

          {/* ملاحظات */}
          <Field label={tr.modal.notes}>
            <textarea value={form.notes??""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder={tr.modal.notesPh} rows={3} style={{ ...inputSt,resize:"vertical" as const,lineHeight:1.6 }}/>
          </Field>
        </div>

        <div style={{ padding:"12px 24px 32px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} style={{ flex:1,padding:"14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)" }}>
            {isEdit?tr.modal.update:tr.modal.save}
          </button>
          <button onClick={onClose} style={{ padding:"14px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.modal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteModal ──────────────────────────────────────────
function DeleteModal({ lang, patient, onConfirm, onClose }: { lang:Lang; patient:Patient|null; onConfirm:()=>void; onClose:()=>void }) {
  const tr=T[lang];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(4px)" }}/>
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:420,padding:"0 0 32px",boxShadow:"0 -8px 40px rgba(0,0,0,.15)",animation:"slideUp .3s cubic-bezier(.4,0,.2,1)" }}>
        <div style={{ width:40,height:4,background:"#e0e0e0",borderRadius:4,margin:"12px auto 0" }}/>
        <div style={{ textAlign:"center",padding:"24px 32px 20px" }}>
          <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(192,57,43,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px" }}>🗑️</div>
          <h2 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteModal.title}</h2>
          <p style={{ fontSize:14,color:"#888",lineHeight:1.6 }}>{tr.deleteModal.msg} <strong style={{ color:"#353535" }}>{patient?.name}</strong>؟<br/><span style={{ color:"#c0392b",fontSize:12 }}>{tr.deleteModal.warning}</span></p>
        </div>
        <div style={{ display:"flex",gap:12,padding:"0 24px" }}>
          <button onClick={onConfirm} style={{ flex:1,padding:"14px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.deleteModal.confirm}</button>
          <button onClick={onClose}   style={{ flex:1,padding:"14px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.deleteModal.cancel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Patient Card (Mobile) ────────────────────────────────
function PatientCard({ p, lang, isAr, calcAge, clinicType, onEdit, onDelete, onToggleHide, onWhatsApp, onProfile }: {
  p:Patient; lang:Lang; isAr:boolean; clinicType:ClinicType;
  calcAge:(d?:string|null)=>string|number;
  onEdit:()=>void; onDelete:()=>void; onToggleHide:()=>void; onWhatsApp:()=>void; onProfile:()=>void;
}) {
  const tr   = T[lang];
  const meta = CLINIC_TYPE_META[clinicType]??CLINIC_TYPE_META.general;
  const [expanded, setExpanded] = useState(false);
  const age = calcAge(p.date_of_birth);

  return (
    <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",marginBottom:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(8,99,186,.05)",opacity:p.is_hidden?0.6:1 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer" }} onClick={()=>setExpanded(!expanded)}>
        <div style={{ width:44,height:44,borderRadius:12,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,flexShrink:0 }}>
          {getInitials(p.name)}
        </div>
        <div style={{ flex:1,overflow:"hidden" }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:15,fontWeight:700,color:"#353535" }}>{p.name}</span>
            {p.is_hidden&&<span style={{ fontSize:10,background:"#f0f0f0",color:"#999",padding:"2px 7px",borderRadius:10 }}>{tr.hiddenBadge}</span>}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4,flexWrap:"wrap" }}>
            {(p as any).mrn && <span style={{ fontSize:10,fontWeight:700,color:"#0863ba",background:"rgba(8,99,186,.08)",padding:"2px 7px",borderRadius:8,letterSpacing:.3 }}>{(p as any).mrn}</span>}
            {p.gender&&<span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:p.gender==="male"?"rgba(41,128,185,.1)":"rgba(142,68,173,.1)",color:p.gender==="male"?"#2980b9":"#8e44ad" }}>{tr.gender[p.gender as keyof typeof tr.gender]}</span>}
            {age!=="—"&&<span style={{ fontSize:11,color:"#aaa" }}>{age} {tr.years}</span>}
            <span style={{ fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,background:`${meta.color}15`,color:meta.color }}>{meta.icon}</span>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0,transform:expanded?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s" }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {expanded&&(
        <div style={{ borderTop:"1px solid #f0f2f5",padding:"12px 16px 0" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
            <div><div style={{ fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:4 }}>{tr.table.phone}</div><div style={{ fontSize:13,color:"#555",direction:"ltr",textAlign:isAr?"right":"left" }}>{p.phone||"—"}</div></div>
            <div><div style={{ fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",marginBottom:4 }}>{tr.table.dob}</div><div style={{ fontSize:13,color:"#555" }}>{p.date_of_birth?new Date(p.date_of_birth).toLocaleDateString(lang==="ar"?"ar-SA":"en-US",{year:"numeric",month:"short",day:"numeric"}):"—"}</div></div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:6,paddingBottom:14 }}>
            {[
              { icon:"📋",label:tr.actions.profile,  fn:onProfile,    bg:"rgba(8,99,186,.08)",   color:"#0863ba" },
              { icon:"✏️",label:tr.actions.edit,     fn:onEdit,       bg:"rgba(8,99,186,.06)",   color:"#0863ba" },
              { icon:p.is_hidden?"👁":"🙈",label:p.is_hidden?tr.actions.show:tr.actions.hide, fn:onToggleHide, bg:"#f7f9fc", color:"#888" },
              { icon:"🗑️",label:tr.actions.delete,   fn:onDelete,     bg:"rgba(192,57,43,.06)", color:"#c0392b" },
            ].map((btn,i)=>(
              <button key={i} onClick={btn.fn} style={{ padding:"10px 0",borderRadius:10,border:"none",cursor:"pointer",background:btn.bg,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                <span style={{ fontSize:16 }}>{btn.icon}</span>
                <span style={{ fontSize:9,color:btn.color,fontWeight:600 }}>{btn.label}</span>
              </button>
            ))}
            <button onClick={onWhatsApp} disabled={!p.phone} style={{ padding:"10px 0",borderRadius:10,border:"none",cursor:p.phone?"pointer":"not-allowed",background:p.phone?"rgba(37,211,102,.12)":"#f5f5f5",display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:p.phone?1:0.4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span style={{ fontSize:9,color:"#25d366",fontWeight:600 }}>{tr.actions.whatsapp}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function PatientsPage() {
  const [lang,       setLang]       = useState<Lang>("ar");
  const isAr = lang==="ar";
  const tr   = T[lang];
  const [isMobile,   setIsMobile]   = useState(()=>typeof window!=="undefined"?window.innerWidth<=768:false);

  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<=768);
    check(); window.addEventListener("resize",check);
    return ()=>window.removeEventListener("resize",check);
  },[]);

  // ── نوع العيادة — يُقرأ من جدول clinics ─────────────────
  const [clinicType, setClinicTypeState] = useState<ClinicType>("general");
  const [clinicMeta, setClinicMeta]      = useState(CLINIC_TYPE_META.general);

  const [patients,       setPatients]       = useState<Patient[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [filter,         setFilter]         = useState("all");
  const [showHidden,     setShowHidden]     = useState(false);
  const [openMenuId,     setOpenMenuId]     = useState<number|null>(null);
  const [addModal,       setAddModal]       = useState(false);
  const [editPatient,    setEditPatient]    = useState<Patient|null>(null);
  const [deletePatient,  setDeletePatient]  = useState<Patient|null>(null);
  const [profilePatient, setProfilePatient] = useState<Patient|null>(null);
  const [animIds,        setAnimIds]        = useState<number[]>([]);

  const loadClinicType = async () => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("clinics").select("clinic_type").eq("user_id",user.id).maybeSingle();
      if (data?.clinic_type) {
        const ct = data.clinic_type as ClinicType;
        setClinicTypeState(ct);
        setClinicMeta(CLINIC_TYPE_META[ct]??CLINIC_TYPE_META.general);
      }
    } catch {}
  };

  const loadPatients = async (retryCount=0) => {
    setLoading(true);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      let userId = session?.user?.id;
      if (!userId) {
        const { data:{ user } } = await supabase.auth.getUser();
        userId = user?.id;
      }
      if (!userId) {
        if (retryCount<3) { await new Promise(r=>setTimeout(r,800*(retryCount+1))); return loadPatients(retryCount+1); }
        setLoading(false); return;
      }
      const { data,error } = await supabase.from("patients").select("*").eq("user_id",userId).order("created_at",{ascending:false});
      if (error) throw error;
      setPatients((data??[]) as Patient[]);
    } catch (err) { console.error("Error loading patients:",err); }
    finally { setLoading(false); }
  };

  useEffect(()=>{
    loadClinicType();
    loadPatients();
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event)=>{ if (event==="SIGNED_IN"||event==="TOKEN_REFRESHED") { loadClinicType(); loadPatients(); } });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    const handler=()=>setOpenMenuId(null);
    window.addEventListener("click",handler);
    return ()=>window.removeEventListener("click",handler);
  },[]);

  const filtered = patients.filter(p=>{
    if (!showHidden&&p.is_hidden) return false;
    const q=search.toLowerCase();
    if (q&&!p.name.toLowerCase().includes(q)&&!(p.phone??"").includes(q)&&!((p as any).mrn??"").toLowerCase().includes(q)) return false;
    if (filter==="male"&&p.gender!=="male") return false;
    if (filter==="female"&&p.gender!=="female") return false;
    if (filter==="diabetic"&&!p.has_diabetes) return false;
    if (filter==="hypertension"&&!p.has_hypertension) return false;
    return true;
  });

  const visibleAll  = patients.filter(p=>!p.is_hidden);
  const _now        = new Date();
  const localYYYYMM = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}`;
  const stats = {
    total:visibleAll.length, male:visibleAll.filter(p=>p.gender==="male").length,
    female:visibleAll.filter(p=>p.gender==="female").length,
    newMonth:visibleAll.filter(p=>(p.created_at??"").slice(0,7)===localYYYYMM).length,
  };

  const handleSave = async (form:PatientForm,id?:number) => {
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      const userId = user?.id??"00000000-0000-0000-0000-000000000000";
      if (id) {
        // تحديث — إذا تغير الهاتف نتحقق من MRN
        let mrn: string | undefined;
        if (form.phone.trim()) {
          mrn = await getOrCreateMRN(form.phone.trim(), form.name);
        }
        await supabase.from("patients").update({
          name:form.name, phone:form.phone||null, gender:form.gender,
          date_of_birth:form.date_of_birth||null, has_diabetes:form.has_diabetes,
          has_hypertension:form.has_hypertension, notes:form.notes||null,
          ...(mrn ? { mrn } : {}),
        }).eq("id",id);
        // حفظ extra_fields في patient_profiles
        if (Object.keys(form.extra_fields).length) {
          const prof = await loadProfileFromDB(id);
          const updated = { ...(prof??{ medical_fields:{},dental_chart:{},xrays:[],extra_form_fields:{} }), extra_form_fields:form.extra_fields };
          await saveProfileToDB(id,userId,updated);
        }
      } else {
        // إضافة جديد — نحصل على MRN أولاً
        const mrn = await getOrCreateMRN(form.phone.trim(), form.name);
        const { data:newPatient,error } = await supabase.from("patients").insert({
          user_id:userId, name:form.name, phone:form.phone, gender:form.gender,
          date_of_birth:form.date_of_birth||null, has_diabetes:form.has_diabetes,
          has_hypertension:form.has_hypertension, notes:form.notes, is_hidden:false, mrn,
        }).select().single();
        if (error) throw error;
        if (newPatient) {
          const np = newPatient as Patient;
          // حفظ extra_fields
          if (Object.keys(form.extra_fields).length) {
            await saveProfileToDB(np.id,userId,{ medical_fields:{},dental_chart:{},xrays:[],extra_form_fields:form.extra_fields });
          }
          setAnimIds(prev=>[...prev,np.id]);
          setTimeout(()=>setAnimIds(prev=>prev.filter(x=>x!==np.id)),600);
        }
      }
      await loadPatients();
    } catch (err) { console.error("Error saving patient:",err); alert(isAr?"حدث خطأ أثناء الحفظ":"Error saving patient"); }
    finally { setAddModal(false); setEditPatient(null); }
  };

  const handleDelete = async () => {
    if (!deletePatient) return;
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("patients").delete().eq("id",deletePatient.id).eq("user_id",user.id);
      await loadPatients();
    } catch (err) { console.error("Error deleting:",err); alert(isAr?"حدث خطأ أثناء الحذف":"Error deleting patient"); }
    finally { setDeletePatient(null); }
  };

  const toggleHide = async (id:number) => {
    const patient = patients.find(p=>p.id===id);
    if (!patient) return;
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await supabase.from("patients").update({ is_hidden:!patient.is_hidden }).eq("id",id).eq("user_id",user.id);
      setPatients(prev=>prev.map(p=>p.id===id?{...p,is_hidden:!p.is_hidden}:p));
    } catch (err) { console.error("Error toggling hide:",err); }
  };

  const calcAge = (dob?:string|null):string|number => {
    if (!dob) return "—";
    return Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d8e4;border-radius:10px}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes rowIn{from{opacity:0;transform:translateX(${isAr?"-16px":"+16px"})}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .main-anim{animation:fadeUp .4s ease both}
        .patient-row{transition:background .15s;border-bottom:1px solid #f0f2f5}
        .patient-row:last-child{border-bottom:none}
        .patient-row:hover{background:#fafbff}
        .action-icon-btn{width:32px;height:32px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .action-icon-btn:hover{border-color:#a4c4e4;background:rgba(8,99,186,.06)}
        .filter-chip{padding:8px 14px;border-radius:20px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:13px;font-family:'Rubik',sans-serif;font-weight:500;color:#888;transition:all .2s;white-space:nowrap;flex-shrink:0}
        .filter-chip.active{background:#0863ba;color:#fff;border-color:#0863ba}
        .filter-chip:hover:not(.active){border-color:#a4c4e4;color:#0863ba}
        .dropdown-menu{position:absolute;top:calc(100% + 6px);${isAr?"left:0":"right:0"};background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);border:1.5px solid #eef0f3;min-width:160px;z-index:9999;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-item{padding:10px 16px;font-size:13px;color:#555;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-item:hover{background:#f7f9fc}
        .dropdown-item.danger:hover{background:rgba(192,57,43,.06);color:#c0392b}
        .stat-mini{background:#fff;border-radius:14px;padding:16px;border:1.5px solid #eef0f3;box-shadow:0 2px 10px rgba(8,99,186,.05)}
        @media(max-width:768px){
          .fab-add{display:flex!important}
          .desktop-add-btn{display:none!important}
          .refresh-btn-text{display:none!important}
          .filters-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
          .filters-scroll::-webkit-scrollbar{display:none}
          .stat-mini{padding:12px!important;border-radius:12px!important}
          .stat-icon{display:none!important}
          .stat-value{font-size:22px!important}
          .stat-label{font-size:10px!important}
          .stats-grid{grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:14px!important}
          .page-sub{display:none!important}
          .page-title{font-size:17px!important}
          .topbar-inner{padding-right:${isAr?"56px":"8px"}!important;padding-left:${isAr?"8px":"56px"}!important}
          .main-content{margin-right:0!important;margin-left:0!important;padding:0 0 100px!important}
          .content-padding{padding:16px 14px 0!important}
          .search-filter-box{padding:12px 14px!important}
          .topbar-pad{padding:14px 16px!important}
          .mobile-cards{display:block!important}
          .desktop-table{display:none!important}
        }
        @media(min-width:769px){
          .fab-add{display:none!important}
          .mobile-cards{display:none!important}
          .desktop-table{display:block!important}
          .main-content{margin-${isAr?"right":"left"}:240px}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc" }}>
        <Sidebar lang={lang} setLang={setLang} activePage="patients"/>

        <main className="main-anim main-content" style={{ minHeight:"100vh",padding:"0 32px 48px",transition:"margin .3s" }}>

          {/* TOP BAR */}
          <div className="topbar-pad" style={{ position:"sticky",top:0,zIndex:30,background:"rgba(247,249,252,.97)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div className="topbar-inner" style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <h1 className="page-title" style={{ fontSize:22,fontWeight:800,color:"#353535" }}>{tr.page.title}</h1>
                  <span style={{ fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${clinicMeta.color}15`,color:clinicMeta.color }}>{clinicMeta.icon} {isAr?clinicMeta.ar:clinicMeta.en}</span>
                </div>
                <p className="page-sub" style={{ fontSize:13,color:"#aaa",marginTop:2 }}>{tr.page.sub}</p>
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                <button onClick={()=>loadPatients(0)} title={isAr?"تحديث":"Refresh"} style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 16px",background:"#fff",color:"#0863ba",border:"1.5px solid #d0e4f7",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  <span className="refresh-btn-text">{isAr?"تحديث":"Refresh"}</span>
                </button>
                <button className="desktop-add-btn" onClick={()=>setAddModal(true)}
                  style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:clinicMeta.color,color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${clinicMeta.color}40` }}>
                  <span style={{ fontSize:18,lineHeight:1 }}>＋</span> {tr.addPatient}
                </button>
              </div>
            </div>
          </div>

          <div className="content-padding" style={{ padding:"28px 0 0" }}>
            {/* STATS */}
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:28 }}>
              {[
                { label:tr.stats.total,    value:stats.total,    icon:"👥", color:clinicMeta.color },
                { label:tr.stats.male,     value:stats.male,     icon:"👨", color:"#2980b9" },
                { label:tr.stats.female,   value:stats.female,   icon:"👩", color:"#8e44ad" },
                { label:tr.stats.newMonth, value:stats.newMonth, icon:"✨", color:"#0863ba" },
              ].map((s,i)=>(
                <div key={i} className="stat-mini" style={{ animationDelay:`${i*60}ms`,animation:"fadeUp .4s ease both" }}>
                  <div className="stat-icon" style={{ width:36,height:36,borderRadius:9,background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:10 }}>{s.icon}</div>
                  <div className="stat-value" style={{ fontSize:26,fontWeight:800,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div className="stat-label" style={{ fontSize:12,color:"#aaa",marginTop:4,fontWeight:500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* SEARCH + FILTERS */}
            <div className="search-filter-box" style={{ background:"#fff",borderRadius:14,padding:"18px 20px",border:"1.5px solid #eef0f3",boxShadow:"0 2px 10px rgba(8,99,186,.05)",marginBottom:16 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"10px 14px",marginBottom:10 }}>
                <span style={{ color:"#bbb",fontSize:15 }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr.search}
                  style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}/>
                {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:14 }}>✕</button>}
              </div>
              <div className="filters-scroll" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {(Object.entries(tr.filters) as [string,string][]).map(([k,v])=>(
                  <button key={k} className={`filter-chip${filter===k?" active":""}`} onClick={()=>setFilter(k)}>{v}</button>
                ))}
                <button onClick={()=>setShowHidden(!showHidden)} className="filter-chip" style={{ borderStyle:"dashed",background:showHidden?"rgba(8,99,186,.06)":"transparent",color:showHidden?"#0863ba":"#aaa",borderColor:showHidden?"#a4c4e4":"#d0d0d0" }}>
                  {showHidden?`🙈 ${tr.hideHidden}`:`👁 ${tr.showHidden}`}
                </button>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="mobile-cards" style={{ display:"none" }}>
              {loading?(
                <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                  <div style={{ fontSize:40,marginBottom:12,animation:"spin 1s linear infinite" }}>⚙️</div>
                  <div style={{ fontSize:15,fontWeight:600 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
                </div>
              ):filtered.length===0?(
                <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15,fontWeight:600 }}>{search?tr.noResults:tr.noPatients}</div>
                </div>
              ):filtered.map(p=>(
                <PatientCard key={p.id} p={p} lang={lang} isAr={isAr} calcAge={calcAge} clinicType={clinicType}
                  onEdit={()=>setEditPatient(p)} onDelete={()=>setDeletePatient(p)}
                  onToggleHide={()=>toggleHide(p.id)} onWhatsApp={()=>p.phone&&openWhatsApp(p.phone)}
                  onProfile={()=>setProfilePatient(p)}/>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="desktop-table">
              <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",boxShadow:"0 2px 16px rgba(8,99,186,.06)",overflow:"hidden" }}>
                <div style={{ display:"grid",gridTemplateColumns:"200px 130px 90px 140px 1fr",gap:0,padding:"12px 20px",background:"#f9fafb",borderRadius:"16px 16px 0 0",borderBottom:"1.5px solid #eef0f3" }}>
                  {([
                    { label: tr.table.name,                        align:"start",  pl:0  },
                    { label: isAr?"الرقم الطبي":"Medical ID",      align:"start",  pl:12 },
                    { label: tr.table.gender,                      align:"start",  pl:12 },
                    { label: tr.table.phone,                       align:"start",  pl:12 },
                    { label: tr.table.actions,                     align:"center", pl:0  },
                  ] as {label:string;align:string;pl:number}[]).map((h,i)=>(
                    <div key={i} style={{ fontSize:11,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.5,textAlign:h.align as any,paddingLeft:h.pl }}>{h.label}</div>
                  ))}
                </div>
                </div>

                {loading?(
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ fontSize:40,marginBottom:12,animation:"spin 1s linear infinite" }}>⚙️</div>
                    <div style={{ fontSize:15,fontWeight:600 }}>{isAr?"جاري التحميل...":"Loading..."}</div>
                  </div>
                ):filtered.length===0?(
                  <div style={{ textAlign:"center",padding:"60px 20px",color:"#ccc" }}>
                    <div style={{ fontSize:40,marginBottom:12 }}>🔍</div>
                    <div style={{ fontSize:15,fontWeight:600 }}>{search?tr.noResults:tr.noPatients}</div>
                  </div>
                ):filtered.map(p=>(
                  <div key={p.id} className="patient-row" style={{ display:"grid",gridTemplateColumns:"200px 130px 90px 140px 1fr",gap:0,padding:"13px 20px",alignItems:"center",opacity:p.is_hidden?0.5:1,animation:animIds.includes(p.id)?"rowIn .4s ease":undefined }}>
                    {/* الاسم */}
                    <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
                      <div style={{ width:36,height:36,borderRadius:10,background:getColor(p.id),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0 }}>{getInitials(p.name)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"flex",alignItems:"center",gap:5 }}>
                          {p.name}
                          {p.is_hidden&&<span style={{ fontSize:10,background:"#f0f0f0",color:"#999",padding:"1px 6px",borderRadius:8,flexShrink:0 }}>{tr.hiddenBadge}</span>}
                        </div>
                        <div style={{ fontSize:10,color:"#bbb",marginTop:1 }}>#{p.id}</div>
                      </div>
                    </div>
                    {/* الرقم الطبي */}
                    <div style={{ paddingLeft:12 }}>
                      {(p as any).mrn
                        ? <span style={{ fontSize:12,fontWeight:700,color:"#0863ba",background:"rgba(8,99,186,.07)",padding:"3px 9px",borderRadius:7,letterSpacing:.4 }}>{(p as any).mrn}</span>
                        : <span style={{ fontSize:12,color:"#ddd" }}>—</span>}
                    </div>
                    {/* الجنس */}
                    <div style={{ paddingLeft:12 }}>
                      <span style={{ fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:p.gender==="male"?"rgba(41,128,185,.1)":"rgba(142,68,173,.1)",color:p.gender==="male"?"#2980b9":"#8e44ad" }}>
                        {p.gender?tr.gender[p.gender as keyof typeof tr.gender]:"—"}
                      </span>
                    </div>
                    {/* الهاتف */}
                    <div style={{ fontSize:13,color:"#555",paddingLeft:12,whiteSpace:"nowrap" }}>{p.phone||"—"}</div>
                    {/* الإجراءات */}
                    <div style={{ display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end",paddingRight:4,flexWrap:"nowrap" }} onClick={e=>e.stopPropagation()}>
                      {/* زر السجل الطبي — أيقونة + نص */}
                      <button onClick={()=>setProfilePatient(p)} title={tr.actions.profile} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,border:"1.5px solid rgba(8,99,186,.25)",background:"rgba(8,99,186,.07)",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:700,color:"#0863ba",whiteSpace:"nowrap",transition:"all .15s" }}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(8,99,186,.14)"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(8,99,186,.07)"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0863ba" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        {isAr?"السجل الطبي":"Medical File"}
                      </button>
                      {/* زر واتساب — أيقونة + نص */}
                      {p.phone?(
                        <button onClick={()=>openWhatsApp(p.phone!)} title={tr.actions.whatsapp} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,border:"1.5px solid rgba(37,211,102,.35)",background:"rgba(37,211,102,.09)",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:700,color:"#128c5e",whiteSpace:"nowrap",transition:"all .15s" }}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(37,211,102,.18)"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(37,211,102,.09)"}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                      ):(
                        <button disabled title={tr.actions.whatsapp} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,border:"1.5px solid #eee",background:"#f9f9f9",cursor:"not-allowed",fontFamily:"Rubik,sans-serif",fontSize:11,fontWeight:700,color:"#ccc",opacity:.5,whiteSpace:"nowrap" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ccc"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </button>
                      )}
                      {/* أزرار أيقونات فقط: تعديل، إخفاء، حذف */}
                      <button className="action-icon-btn" title={tr.actions.edit} onClick={()=>setEditPatient(p)}>✏️</button>
                      <button className="action-icon-btn" title={p.is_hidden?tr.actions.show:tr.actions.hide} onClick={()=>toggleHide(p.id)}>
                        {p.is_hidden?<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0863ba" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
                      </button>
                      <button className="action-icon-btn" title={tr.actions.delete} onClick={()=>setDeletePatient(p)} style={{ color:"#e74c3c" }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign:"center",marginTop:14,fontSize:12,color:"#bbb" }}>
              {isAr?`عرض ${filtered.length} من ${patients.filter(p=>showHidden||!p.is_hidden).length} مريض`:`Showing ${filtered.length} of ${patients.filter(p=>showHidden||!p.is_hidden).length} patients`}
            </div>
          </div>
        </main>

        {/* FAB */}
        <button className="fab-add" onClick={()=>setAddModal(true)} style={{ display:"none",position:"fixed",bottom:24,right:isAr?20:undefined,left:isAr?undefined:20,width:58,height:58,borderRadius:"50%",background:clinicMeta.color,color:"#fff",border:"none",cursor:"pointer",fontSize:28,lineHeight:1,boxShadow:`0 6px 24px ${clinicMeta.color}60`,zIndex:30,alignItems:"center",justifyContent:"center" }}>＋</button>

        {(addModal||editPatient)&&(
          <PatientModal lang={lang} patient={editPatient} clinicType={clinicType} onSave={handleSave} onClose={()=>{ setAddModal(false);setEditPatient(null); }}/>
        )}
        {deletePatient&&<DeleteModal lang={lang} patient={deletePatient} onConfirm={handleDelete} onClose={()=>setDeletePatient(null)}/>}
        {profilePatient&&<PatientProfileDrawer lang={lang} patient={profilePatient} clinicType={clinicType} onClose={()=>setProfilePatient(null)}/>}
      </div>
    </>
  );
}