"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ============================================================
// TypeScript Types
// ============================================================

type Lang = "ar" | "en";

type ClinicType =
  | "general"
  | "dental"
  | "dermatology"
  | "cosmetic"
  | "pediatrics"
  | "physical_therapy"
  | "mental_health"
  | "nutrition"
  | "ophthalmology"
  | "orthopedic"
  | "cardiology"
  | "gynecology"
  | "ent"
  | "urology"
  | "other";

// الخطط الفردية: basic, pro, enterprise
// الخطط المشتركة: shared_basic, shared_pro, shared_enterprise
type PlanType = "basic" | "pro" | "enterprise" | "shared_basic" | "shared_pro" | "shared_enterprise" | "pharmacy";

type AccountType = "clinic" | "pharmacy";

interface ClinicData {
  id?: number;
  name: string;
  owner: string;
  email: string;
  phone: string;
  plan: PlanType;
  expiry: string;
  status: "active" | "inactive" | "expired";
  user_id?: string;
  account_type?: AccountType;
  clinic_type?: ClinicType;
  // للخطط المشتركة فقط
  max_doctors?: number;       // الحد الأقصى من الأطباء (قابل للتعديل من الأدمن)
  doctors_count?: number;     // عدد الأطباء الفعلي المضاف
  // قفل صفحة المدفوعات بكلمة سر
  payments_lock_enabled?: boolean;
  payments_lock_password?: string;
  // دخول مقيّد للأطباء (الخطط المشتركة فقط)
  restricted_access_enabled?: boolean;
  restricted_access_pin?: string;
}

interface Doctor {
  id?: number;
  user_id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  color: string;
  is_active: boolean;
}

// ============================================================
// NABD - نبض | Admin Panel
// ============================================================

const T = {
  ar: {
    appName: "نبض", adminBadge: "لوحة المدير",
    nav: { clinics:"العيادات" },
    stats: {
      totalClinics:"إجمالي العيادات", activeClinics:"عيادات نشطة",
      totalUsers:"المستخدمون", monthRevenue:"إيرادات الشهر",
      activeNow:"نشطة الآن", expiringSoon:"تنتهي قريباً",
    },
    clinics: {
      title:"إدارة العيادات", addClinic:"إضافة عيادة",
      search:"ابحث باسم العيادة...",
      table:{ name:"العيادة", owner:"المالك", email:"البريد الإلكتروني", status:"الحالة", plan:"الخطة", expiry:"انتهاء الاشتراك", actions:"الإجراءات" },
      statuses:{ active:"نشط", inactive:"موقوف", expired:"منتهي" },
      plans:{
        basic:"الأساسية", pro:"الاحترافية", enterprise:"الشاملة",
        shared_basic:"مشتركة أساسية", shared_pro:"مشتركة احترافية", shared_enterprise:"مشتركة شاملة",
        pharmacy:"صيدلية",
      },
      actions:{ edit:"تعديل", suspend:"تعليق", activate:"تفعيل", resetPass:"إعادة كلمة المرور", delete:"حذف", viewDetails:"التفاصيل" },
    },
    modal: {
      addTitle:"إضافة عيادة جديدة",
      editTitle:"تعديل بيانات العيادة",
      clinicName:"اسم العيادة *", clinicNamePh:"مثال: عيادة الأمل",
      ownerName:"اسم الطبيب / المالك *", ownerPh:"الدكتور ...",
      email:"البريد الإلكتروني *", emailPh:"clinic@example.com",
      phone:"رقم الهاتف", phonePh:"05xxxxxxxx",
      plan:"خطة الاشتراك *",
      expiry:"تاريخ انتهاء الاشتراك *",
      clinicType:"نوع العيادة *",
      clinicTypes:{
        general:"طب عام", dental:"أسنان", dermatology:"جلدية",
        cosmetic:"تجميلية", pediatrics:"أطفال",
        physical_therapy:"علاج فيزيائي", mental_health:"صحة نفسية",
        nutrition:"تغذية", ophthalmology:"عيون",
        orthopedic:"عظام ومفاصل", cardiology:"قلب وشرايين",
        gynecology:"نساء وتوليد", ent:"أنف وأذن وحنجرة",
        urology:"مسالك بولية", other:"أخرى",
      },
      generateCredentials:"توليد بيانات الدخول",
      username:"البريد الإلكتروني", password:"كلمة المرور",
      copyBtn:"نسخ", copiedBtn:"✓ تم النسخ",
      save:"حفظ العيادة", update:"تحديث", cancel:"إلغاء",
      required:"الاسم والبريد والخطة مطلوبة",
      credNote:"احفظ بيانات الدخول قبل الإغلاق — لن تظهر مجدداً",
      password_label:"كلمة المرور",
      bookLink:"رابط الحجز",
      creating:"جاري الإنشاء...",
    },
    passModal: {
      title:"إعادة تعيين كلمة المرور",
      newPass:"كلمة المرور الجديدة",
      generate:"توليد تلقائي",
      save:"حفظ كلمة المرور",
      cancel:"إلغاء",
      saving:"جاري الحفظ...",
    },
    deleteModal: { title:"تأكيد الحذف", msg:"هل تريد حذف عيادة", warning:"سيتم حذف جميع بيانات هذه العيادة نهائياً.", confirm:"نعم، احذف", cancel:"إلغاء" },
    noResults:"لا توجد نتائج",
    signOut:"تسجيل خروج المدير",
    systemInfo:"معلومات النظام",
    version:"الإصدار",
    lastBackup:"آخر نسخة احتياطية",
    uptime:"وقت التشغيل",
    filterAll:"الكل", filterActive:"نشط", filterInactive:"موقوف",
    loading:"جاري التحميل...",
    comingSoon:"قريباً",
    dataTools: {
      title:"أدوات البيانات",
      exportBtn:"تصدير بيانات عيادة",
      importBtn:"استيراد بيانات",
      selectClinic:"اختر العيادة",
      exportJSON:"تصدير JSON",
      exportCSV:"تصدير CSV",
      importTitle:"استيراد البيانات",
      importDesc:"ارفع ملف JSON تم تصديره مسبقاً من نبض",
      importDropzone:"اسحب ملف JSON هنا أو انقر للاختيار",
      importPreview:"معاينة البيانات",
      importPatients:"مريض",
      importAppointments:"موعد",
      importPayments:"دفعة",
      importStart:"بدء الاستيراد",
      importing:"جاري الاستيراد...",
      importSuccess:"✓ تم الاستيراد بنجاح",
      importError:"حدث خطأ أثناء الاستيراد",
      importSkipped:"تم تخطيه (موجود مسبقاً)",
      importNew:"جديد",
      importUpdated:"محدّث",
      cancel:"إلغاء",
      close:"إغلاق",
      noClinicSelected:"اختر عيادة أولاً",
      exportSuccess:"✓ تم التصدير",
    },
    accountType: {
      label: "نوع الحساب",
      clinic: "عيادة",
      pharmacy: "صيدلية",
      clinicDesc: "نظام إدارة العيادات",
      pharmacyDesc: "نظام إدارة الصيدليات",
    },
    pharmacy: {
      plan: "اشتراك صيدلية",
      planDesc: "جميع ميزات نظام الصيدلية (المخزون، الوصفات، المبيعات، الموردين، التقارير)",
      price: "39$",
      period: "/شهر",
      addTitle: "إضافة صيدلية جديدة",
      editTitle: "تعديل بيانات الصيدلية",
      namePh: "مثال: صيدلية الشفاء",
      ownerPh: "اسم مدير الصيدلية",
      filterPharmacies: "صيدليات",
      filterClinics: "عيادات",
      successMsg: "تم إنشاء الصيدلية بنجاح!",
    },
    subModal: {
      title:"تعديل الاشتراك",
      tabInfo:"البيانات",
      tabSub:"الاشتراك",
      tabSecurity:"الأمان",
      username:"البريد الإلكتروني",
      usernamePh:"clinic@example.com",
      ownerName:"اسم المالك",
      ownerPh:"الدكتور ...",
      phone:"رقم الهاتف",
      phonePh:"05xxxxxxxx",
      plan:"الخطة",
      expiry:"تاريخ الانتهاء",
      status:"الحالة",
      newPassword:"كلمة المرور الجديدة",
      generatePass:"توليد تلقائي",
      copyPass:"نسخ",
      copiedPass:"✓ تم",
      freezeTitle:"تجميد الاشتراك",
      freezeDesc:"سيتم إيقاف وصول العيادة مؤقتاً مع الحفاظ على البيانات.",
      freeze:"تجميد",
      unfreeze:"رفع التجميد",
      cancelTitle:"إلغاء الاشتراك",
      cancelDesc:"سيتم إنهاء الاشتراك. يمكن إعادة تفعيله لاحقاً.",
      cancelSub:"إلغاء الاشتراك",
      deleteTitle:"حذف العيادة",
      deleteDesc:"سيتم حذف جميع البيانات نهائياً ولا يمكن التراجع.",
      delete:"حذف نهائي",
      save:"حفظ التغييرات",
      saving:"جاري الحفظ...",
      cancel:"إلغاء",
      changePlan:"تغيير الخطة إلى",
      sharedPlansTitle:"الخطط المشتركة للعيادات",
      sharedPlansDesc:"للعيادات التي تضم أكثر من طبيب واحد",
      individualPlansTitle:"الخطط الفردية",
      individualPlansDesc:"لعيادة طبيب واحد",
      maxDoctors:"الحد الأقصى للأطباء",
      maxDoctorsNote:"يمكن تعديل هذا الرقم بالاتفاق مع العميل",
      doctorsCount:"عدد الأطباء الحالي",
      planDesc:{ basic:"إدارة المرضى والمواعيد والسجلات • حتى 100 مريض", pro:"الأساسية + رابط الحجز + المدفوعات + واتساب • حتى 400 مريض", enterprise:"جميع الميزات + متابعة المرضى + بوابة المريض • غير محدود" },
      plans:{ basic:"الأساسية", pro:"الاحترافية", enterprise:"الشاملة", shared_basic:"مشتركة أساسية", shared_pro:"مشتركة احترافية", shared_enterprise:"مشتركة شاملة", pharmacy:"صيدلية" },
      deleteConfirmTitle:"تأكيد الحذف النهائي",
      deleteConfirmMsg:"هل أنت متأكد من حذف عيادة",
      deleteConfirmWarning:"سيتم حذف جميع البيانات نهائياً ولا يمكن التراجع.",
      deleteConfirm:"نعم، احذف نهائياً",
      deleteCancel:"لا، تراجع",
      tabDoctors:"الأطباء",
      doctors:{
        title:"إدارة الأطباء", addDoctor:"إضافة طبيب",
        name:"اسم الطبيب *", namePh:"د. محمد الأحمد",
        specialty:"التخصص", specialtyPh:"طب عام، أسنان...",
        phone:"رقم الهاتف", phonePh:"05xxxxxxxx",
        email:"البريد الإلكتروني", emailPh:"doctor@clinic.com",
        color:"اللون التعريفي", save:"حفظ الطبيب", saving:"جاري الحفظ...",
        cancel:"إلغاء", edit:"تعديل", remove:"حذف",
        active:"نشط", inactive:"موقوف", toggleActive:"تبديل الحالة",
        limitReached:"وصلت للحد الأقصى من الأطباء",
        noName:"يرجى إدخال اسم الطبيب",
        confirmRemove:"هل تريد حذف هذا الطبيب؟",
        capacity:"الطاقة الاستيعابية",
      },
      paymentsLock:{
        sectionTitle:"قفل صفحة المدفوعات",
        sectionDesc:"يمنع السكرتيرة من الوصول إلى صفحة المدفوعات دون كلمة سر خاصة بالطبيب",
        enable:"تفعيل القفل بكلمة سر",
        disable:"إلغاء تفعيل القفل",
        passwordLabel:"كلمة سر المدفوعات",
        passwordPh:"أدخل كلمة سر مخصصة...",
        notAvailable:"هذه الميزة غير متاحة في الخطة الأساسية",
        enabledBadge:"القفل مفعّل 🔒",
        disabledBadge:"القفل غير مفعّل 🔓",
        saveNote:"سيتم حفظ هذا الإعداد مع بيانات العيادة",
        required:"يجب إدخال كلمة سر للمدفوعات عند تفعيل القفل",
      },
      restrictedAccess:{
        sectionTitle:"دخول مقيّد للأطباء",
        sectionDesc:"يتيح لبقية الأطباء الدخول برابط خاص وPIN لعرض ملفات المرضى فقط — دون أي صلاحية أخرى",
        onlyShared:"هذه الميزة متاحة فقط للخطط المشتركة",
        enable:"تفعيل الدخول المقيّد",
        disable:"إلغاء الدخول المقيّد",
        enabledBadge:"مفعّل 🔓",
        disabledBadge:"غير مفعّل 🔒",
        pinLabel:"PIN الدخول (4-8 أرقام)",
        pinPh:"مثال: 1234",
        pinNote:"شاركه مع الأطباء فقط — لا يمنحهم صلاحية المدفوعات أو الإعدادات",
        linkLabel:"رابط الدخول المقيّد",
        copyLink:"نسخ الرابط",
        copiedLink:"✓ تم النسخ",
        generate:"توليد PIN",
        required:"يجب إدخال PIN لتفعيل الدخول المقيّد",
        pinInvalid:"يجب أن يكون PIN من 4 إلى 8 أرقام",
      },
    },
  },
  en: {
    appName: "NABD", adminBadge: "Admin Panel",
    nav: { clinics:"Clinics" },
    stats: {
      totalClinics:"Total Clinics", activeClinics:"Active Clinics",
      totalUsers:"Total Users", monthRevenue:"Monthly Revenue",
      activeNow:"Active Now", expiringSoon:"Expiring Soon",
    },
    clinics: {
      title:"Clinic Management", addClinic:"Add Clinic",
      search:"Search by clinic name...",
      table:{ name:"Clinic", owner:"Owner", email:"Email", status:"Status", plan:"Plan", expiry:"Expiry", actions:"Actions" },
      statuses:{ active:"Active", inactive:"Suspended", expired:"Expired" },
      plans:{
        basic:"Basic", pro:"Professional", enterprise:"Comprehensive",
        shared_basic:"Shared Basic", shared_pro:"Shared Professional", shared_enterprise:"Shared Comprehensive",
        pharmacy:"Pharmacy",
      },
      actions:{ edit:"Edit", suspend:"Suspend", activate:"Activate", resetPass:"Reset Password", delete:"Delete", viewDetails:"Details" },
    },
    modal: {
      addTitle:"Add New Clinic",
      editTitle:"Edit Clinic",
      clinicName:"Clinic Name *", clinicNamePh:"e.g. Al-Amal Clinic",
      ownerName:"Doctor / Owner Name *", ownerPh:"Dr. ...",
      email:"Email *", emailPh:"clinic@example.com",
      phone:"Phone", phonePh:"05xxxxxxxx",
      plan:"Subscription Plan *",
      expiry:"Subscription Expiry *",
      clinicType:"Clinic Type *",
      clinicTypes:{
        general:"General Medicine", dental:"Dental", dermatology:"Dermatology",
        cosmetic:"Cosmetic", pediatrics:"Pediatrics",
        physical_therapy:"Physical Therapy", mental_health:"Mental Health",
        nutrition:"Nutrition", ophthalmology:"Ophthalmology",
        orthopedic:"Orthopedics", cardiology:"Cardiology",
        gynecology:"Gynecology", ent:"ENT",
        urology:"Urology", other:"Other",
      },
      generateCredentials:"Generate Login Credentials",
      username:"Email", password:"Password",
      copyBtn:"Copy", copiedBtn:"✓ Copied",
      save:"Save Clinic", update:"Update", cancel:"Cancel",
      required:"Name, email and plan are required",
      credNote:"Save these credentials before closing — they won't be shown again",
      password_label:"Password",
      bookLink:"Booking Link",
      creating:"Creating...",
    },
    passModal: {
      title:"Reset Password",
      newPass:"New Password",
      generate:"Auto Generate",
      save:"Save Password",
      cancel:"Cancel",
      saving:"Saving...",
    },
    deleteModal: { title:"Confirm Delete", msg:"Delete clinic", warning:"All data for this clinic will be permanently deleted.", confirm:"Yes, Delete", cancel:"Cancel" },
    noResults:"No results found",
    signOut:"Admin Sign Out",
    systemInfo:"System Info",
    version:"Version",
    lastBackup:"Last Backup",
    uptime:"Uptime",
    filterAll:"All", filterActive:"Active", filterInactive:"Suspended",
    loading:"Loading...",
    comingSoon:"Coming Soon",
    dataTools: {
      title:"Data Tools",
      exportBtn:"Export Clinic Data",
      importBtn:"Import Data",
      selectClinic:"Select Clinic",
      exportJSON:"Export JSON",
      exportCSV:"Export CSV",
      importTitle:"Import Data",
      importDesc:"Upload a JSON file previously exported from NABD",
      importDropzone:"Drag JSON file here or click to select",
      importPreview:"Data Preview",
      importPatients:"patient",
      importAppointments:"appointment",
      importPayments:"payment",
      importStart:"Start Import",
      importing:"Importing...",
      importSuccess:"✓ Import successful",
      importError:"Error during import",
      importSkipped:"Skipped (already exists)",
      importNew:"New",
      importUpdated:"Updated",
      cancel:"Cancel",
      close:"Close",
      noClinicSelected:"Select a clinic first",
      exportSuccess:"✓ Exported",
    },
    accountType: {
      label: "Account Type",
      clinic: "Clinic",
      pharmacy: "Pharmacy",
      clinicDesc: "Clinic management system",
      pharmacyDesc: "Pharmacy management system",
    },
    pharmacy: {
      plan: "Pharmacy Subscription",
      planDesc: "Full pharmacy system (inventory, prescriptions, sales, suppliers, reports)",
      price: "$39",
      period: "/month",
      addTitle: "Add New Pharmacy",
      editTitle: "Edit Pharmacy",
      namePh: "e.g. Al-Shifa Pharmacy",
      ownerPh: "Pharmacy manager name",
      filterPharmacies: "Pharmacies",
      filterClinics: "Clinics",
      successMsg: "Pharmacy created successfully!",
    },
    subModal: {
      title:"Edit Subscription",
      tabInfo:"Info",
      tabSub:"Subscription",
      tabSecurity:"Security",
      username:"Email",
      usernamePh:"clinic@example.com",
      ownerName:"Owner Name",
      ownerPh:"Dr. ...",
      phone:"Phone",
      phonePh:"05xxxxxxxx",
      plan:"Plan",
      expiry:"Expiry Date",
      status:"Status",
      newPassword:"New Password",
      generatePass:"Auto Generate",
      copyPass:"Copy",
      copiedPass:"✓ Copied",
      freezeTitle:"Freeze Subscription",
      freezeDesc:"Temporarily suspend clinic access while keeping data intact.",
      freeze:"Freeze",
      unfreeze:"Unfreeze",
      cancelTitle:"Cancel Subscription",
      cancelDesc:"End the subscription. Can be reactivated later.",
      cancelSub:"Cancel Subscription",
      deleteTitle:"Delete Clinic",
      deleteDesc:"Permanently delete all data. This cannot be undone.",
      delete:"Permanent Delete",
      save:"Save Changes",
      saving:"Saving...",
      cancel:"Cancel",
      changePlan:"Change Plan To",
      sharedPlansTitle:"Shared Clinic Plans",
      sharedPlansDesc:"For clinics with more than one doctor",
      individualPlansTitle:"Individual Plans",
      individualPlansDesc:"For single-doctor clinic",
      maxDoctors:"Max Doctors",
      maxDoctorsNote:"This number can be adjusted by agreement with the client",
      doctorsCount:"Current Doctors Count",
      planDesc:{ basic:"Patients & appointments & records • Up to 100 patients", pro:"Basic + booking link + payments + WhatsApp • Up to 400 patients", enterprise:"All features + patient follow-up + portal • Unlimited" },
      plans:{ basic:"Basic", pro:"Professional", enterprise:"Comprehensive", shared_basic:"Shared Basic", shared_pro:"Shared Pro", shared_enterprise:"Shared Comprehensive", pharmacy:"Pharmacy" },
      deleteConfirmTitle:"Confirm Permanent Delete",
      deleteConfirmMsg:"Are you sure you want to delete clinic",
      deleteConfirmWarning:"All data will be permanently deleted and cannot be recovered.",
      deleteConfirm:"Yes, Delete Permanently",
      deleteCancel:"No, Cancel",
      tabDoctors:"Doctors",
      doctors:{
        title:"Manage Doctors", addDoctor:"Add Doctor",
        name:"Doctor Name *", namePh:"Dr. John Smith",
        specialty:"Specialty", specialtyPh:"General, Dental...",
        phone:"Phone", phonePh:"05xxxxxxxx",
        email:"Email", emailPh:"doctor@clinic.com",
        color:"Color", save:"Save Doctor", saving:"Saving...",
        cancel:"Cancel", edit:"Edit", remove:"Remove",
        active:"Active", inactive:"Suspended", toggleActive:"Toggle Status",
        limitReached:"Reached max doctors limit",
        noName:"Please enter doctor name",
        confirmRemove:"Remove this doctor?",
        capacity:"Capacity",
      },
      paymentsLock:{
        sectionTitle:"Payments Page Lock",
        sectionDesc:"Prevents the secretary from accessing the payments page without a doctor-specific password",
        enable:"Enable password lock",
        disable:"Disable lock",
        passwordLabel:"Payments Password",
        passwordPh:"Enter a custom password...",
        notAvailable:"This feature is not available in the Basic plan",
        enabledBadge:"Lock enabled 🔒",
        disabledBadge:"Lock disabled 🔓",
        saveNote:"This setting will be saved with clinic data",
        required:"A password is required when enabling the lock",
      },
      restrictedAccess:{
        sectionTitle:"Restricted Access for Doctors",
        sectionDesc:"Allows other doctors to log in via a private link and PIN to view patient files only — no other permissions",
        onlyShared:"This feature is only available for shared plans",
        enable:"Enable Restricted Access",
        disable:"Disable Restricted Access",
        enabledBadge:"Enabled 🔓",
        disabledBadge:"Disabled 🔒",
        pinLabel:"Access PIN (4-8 digits)",
        pinPh:"e.g. 1234",
        pinNote:"Share only with doctors — grants no access to payments or settings",
        linkLabel:"Restricted Access Link",
        copyLink:"Copy Link",
        copiedLink:"✓ Copied",
        generate:"Generate PIN",
        required:"A PIN is required to enable restricted access",
        pinInvalid:"PIN must be 4 to 8 digits",
      },
    },
  },
};

const PLAN_COLORS: Record<string, string> = {
  basic:"#0863ba", pro:"#7b2d8b", enterprise:"#e67e22",
  shared_basic:"#0e7c6a", shared_pro:"#b5451b", shared_enterprise:"#4a1480",
  pharmacy:"#27ae60",
};

// Plan pricing config
const PLAN_PRICING: Record<string, { monthly: number; yearly: number }> = {
  basic:             { monthly:5.99,  yearly:59  },
  pro:               { monthly:7.99,  yearly:79  },
  enterprise:        { monthly:14.99, yearly:149 },
  // الخطط المشتركة
  shared_basic:      { monthly:7.99,  yearly:79  },   // حتى 2 أطباء
  shared_pro:        { monthly:13.99, yearly:139 },   // حتى 3 أطباء
  shared_enterprise: { monthly:21.99, yearly:219 },   // حتى 5 أطباء (مخصص)
};

// Default max doctors per shared plan
const SHARED_PLAN_DEFAULT_DOCTORS: Record<string, number> = {
  shared_basic:      2,
  shared_pro:        3,
  shared_enterprise: 5,
};

// Patient limits per plan
const PLAN_PATIENT_LIMITS: Record<string, number> = {
  basic:             300,
  pro:               1000,
  enterprise:        Infinity,
  // الخطط المشتركة — نفس قوانين الخطط الفردية
  shared_basic:      300,
  shared_pro:        1000,
  shared_enterprise: Infinity,
};

// Features per plan
const PLAN_FEATURES: Record<string, { ar: string[]; en: string[] }> = {
  basic: {
    ar: ["إدارة المرضى","السجلات الطبية","إدارة المواعيد","حتى 100 مريض"],
    en: ["Patient management","Medical records","Appointments management","Up to 100 patients"],
  },
  pro: {
    ar: ["جميع ميزات الأساسية","رابط حجز المواعيد","إدارة المدفوعات","مراسلة المرضى عبر واتساب","تذكير المواعيد","حتى 400 مريض"],
    en: ["All Basic features","Clinic booking link","Payments management","WhatsApp patient messaging","Appointment reminders","Up to 400 patients"],
  },
  enterprise: {
    ar: ["جميع ميزات الاحترافية","متابعة المرضى برابط خاص","تقارير يومية للمريض","بوابة خاصة بالمريض","تسجيل الوصفات الطبية","عدد مرضى غير محدود","أولوية في الدعم الفني"],
    en: ["All Professional features","Patient follow-up link","Daily patient reports","Patient portal","Prescription records","Unlimited patients","Priority support"],
  },
  // ── الخطط المشتركة (نفس ميزات الفردية + إدارة متعددة الأطباء) ──
  shared_basic: {
    ar: ["إدارة المرضى","السجلات الطبية","إدارة المواعيد","حتى 100 مريض","حتى طبيبين","تخصيص المرضى لكل طبيب"],
    en: ["Patient management","Medical records","Appointments management","Up to 100 patients","Up to 2 doctors","Patients assigned per doctor"],
  },
  shared_pro: {
    ar: ["جميع ميزات الأساسية المشتركة","رابط حجز المواعيد","إدارة المدفوعات","مراسلة المرضى عبر واتساب","تذكير المواعيد","حتى 400 مريض","حتى 3 أطباء"],
    en: ["All Shared Basic features","Clinic booking link","Payments management","WhatsApp messaging","Appointment reminders","Up to 400 patients","Up to 3 doctors"],
  },
  shared_enterprise: {
    ar: ["جميع ميزات الاحترافية المشتركة","متابعة المرضى","تقارير يومية","بوابة المريض","وصفات طبية","عدد مرضى غير محدود","حتى 5 أطباء","أولوية في الدعم","عدد أطباء مخصص"],
    en: ["All Shared Pro features","Patient follow-up","Daily reports","Patient portal","Prescriptions","Unlimited patients","Up to 5 doctors","Priority support","Custom doctor count"],
  },
};

// Clinic type icons
const CLINIC_TYPE_ICONS: Record<string, string> = {
  general:          "🏥",
  dental:           "🦷",
  dermatology:      "🧴",
  cosmetic:         "💆",
  pediatrics:       "👶",
  physical_therapy: "🏃",
  mental_health:    "🧠",
  nutrition:        "🥗",
  ophthalmology:    "👁️",
  orthopedic:       "🦴",
  cardiology:       "❤️",
  gynecology:       "🌸",
  ent:              "👂",
  urology:          "💧",
  other:            "🏨",
};
const STATUS_COLORS = {
  active:   { bg:"rgba(46,125,50,.1)",   color:"#2e7d32" },
  inactive: { bg:"rgba(230,126,34,.1)",  color:"#e67e22" },
  expired:  { bg:"rgba(192,57,43,.1)",  color:"#c0392b" },
};

const genPass = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
  return Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
};

// ─── Field Wrapper — خارج كل المكونات لتجنب فقدان الـ focus ──
// ⚠️ تعريف هذا المكون هنا خارج ClinicModal هو المفتاح لحل مشكلة الـ focus
interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  half?: boolean;
}
const Field = ({ label, children, half }: FieldProps) => (
  <div style={{ marginBottom: 14, flex: half ? "1" : undefined }}>
    <label style={{
      display: "block", fontSize: 11, fontWeight: 700, color: "#555",
      marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.4
    }}>
      {label}
    </label>
    {children}
  </div>
);

// ─── Clinic Modal ──────────────────────────────────────────
interface ModalProps {
  lang: Lang;
  clinic?: ClinicData | null;
  onSave: () => void;  // نستدعي فقط reload بعد الحفظ
  onClose: () => void;
}

const ClinicModal = ({ lang, clinic, onSave, onClose }: ModalProps) => {
  const tr   = T[lang];
  const isAr = lang === "ar";
  const isEdit = !!clinic?.id;

  const [form, setForm] = useState({
    name:         clinic?.name        || "",
    owner:        clinic?.owner       || "",
    email:        clinic?.email       || "",
    phone:        clinic?.phone       || "",
    plan:         (clinic?.plan       || "basic") as PlanType,
    expiry:       clinic?.expiry      || "",
    status:       (clinic?.status     || "active") as "active" | "inactive" | "expired",
    clinic_type:  (clinic?.clinic_type || "general") as ClinicType,
    max_doctors:  clinic?.max_doctors ?? 2,
    account_type: (clinic?.account_type || "clinic") as AccountType,
  });

  const [creds,    setCreds]    = useState<{ password: string } | null>(null);
  const [copied,   setCopied]   = useState({ e: false, p: false });
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [planTab,  setPlanTab]  = useState<"individual"|"shared">(
    ["shared_basic","shared_pro","shared_enterprise"].includes(clinic?.plan||"") ? "shared" : "individual"
  );

  // inputSt ثابت ومعرّف خارج render
  const inputSt: React.CSSProperties = useMemo(() => ({
    width: "100%", padding: "10px 14px",
    border: "1.5px solid #e8eaed", borderRadius: 10,
    fontFamily: "Rubik, sans-serif", fontSize: 13,
    color: "#353535", background: "#fafbfc",
    outline: "none", transition: "border .2s",
    direction: isAr ? "rtl" : "ltr",
  }), [isAr]);



  const handleGenCreds = useCallback(() => {
    setCreds({ password: genPass() });
  }, []);

  const copy = useCallback(async (text: string, key: "e" | "p") => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.plan) {
      setError(tr.modal.required);
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (!isEdit) {
        // ─── إنشاء عيادة جديدة ───────────────────────────────
        if (!creds) {
          setError(isAr ? "يرجى توليد بيانات الدخول أولاً" : "Please generate credentials first");
          setSaving(false);
          return;
        }

        const res  = await adminFetch("/api/create-clinic", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            ...form,
            password:     creds.password,
            account_type: form.account_type, // صريح لضمان الحفظ في user_metadata
          }),
        });        const json = await res.json();

        if (!res.ok) {
          setError(json.error || (isAr ? "حدث خطأ" : "An error occurred"));
          setSaving(false);
          return;
        }

        setSavedUserId(json.userId);
        onSave(); // ← تحديث القائمة فوراً بعد الإنشاء
        // لا نغلق — نعرض الرابط والبيانات النهائية
      } else {
        // ─── تحديث عيادة موجودة ──────────────────────────────
        const res  = await adminFetch("/api/update-clinic", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ userId: clinic?.user_id, ...form }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || (isAr ? "حدث خطأ" : "An error occurred"));
          setSaving(false);
          return;
        }
        onSave();
        onClose();
      }
    } catch {
      setError(isAr ? "خطأ في الاتصال" : "Connection error");
    } finally {
      setSaving(false);
    }
  };

  const bookingUrl = savedUserId
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.nabd.clinic"}/book/${savedUserId}`
    : "";

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }} />
      <div style={{
        position:"relative", zIndex:1, background:"#fff", borderRadius:20,
        width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto",
        boxShadow:"0 32px 100px rgba(8,99,186,.2)",
        animation:"modalIn .25s cubic-bezier(.4,0,.2,1)"
      }}>
        {/* Header */}
        <div style={{ padding:"22px 26px 18px",borderBottom:"1.5px solid #eef0f3",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,rgba(8,99,186,.03),transparent)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:form.account_type==="pharmacy"?"rgba(39,174,96,.12)":"rgba(8,99,186,.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>
              {form.account_type === "pharmacy" ? "💊" : "🏥"}
            </div>
            <h2 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>
              {isEdit
                ? (form.account_type === "pharmacy" ? tr.pharmacy.editTitle : tr.modal.editTitle)
                : (form.account_type === "pharmacy" ? tr.pharmacy.addTitle  : tr.modal.addTitle)}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:"#f5f5f5",border:"none",cursor:"pointer",fontSize:15 }}>✕</button>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {error && (
            <div style={{ background:"rgba(255,181,181,.15)",border:"1.5px solid rgba(255,181,181,.5)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* ─── بعد الحفظ الناجح: عرض الرابط والبيانات ─── */}
          {savedUserId ? (
            <div>
              <div style={{ textAlign:"center",marginBottom:24 }}>
                <div style={{ fontSize:48,marginBottom:8 }}>🎉</div>
                <h3 style={{ fontSize:16,fontWeight:800,color:"#2e7d32" }}>
                  {form.account_type === "pharmacy"
                    ? (isAr ? tr.pharmacy.successMsg : tr.pharmacy.successMsg)
                    : (isAr ? "تم إنشاء العيادة بنجاح!" : "Clinic Created Successfully!")}
                </h3>
              </div>

              {/* بيانات الدخول */}
              <div style={{ background:"#f7f9fc",borderRadius:12,padding:"16px",marginBottom:16,border:"1.5px solid #eef0f3" }}>
                <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                  ⚠️ {tr.modal.credNote}
                </div>
                {[
                  { label: tr.modal.username,       value: form.email,          key: "e" as const },
                  { label: tr.modal.password_label, value: creds?.password || "", key: "p" as const },
                ].map(c => (
                  <div key={c.key} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:11,color:"#aaa",width:90,flexShrink:0 }}>{c.label}:</span>
                    <code style={{ flex:1,background:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,color:"#0863ba",fontFamily:"monospace",letterSpacing:.5,wordBreak:"break-all",border:"1.5px solid #eef0f3" }}>
                      {c.value}
                    </code>
                    <button onClick={() => copy(c.value, c.key)}
                      style={{ padding:"5px 12px",background:copied[c.key]?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied[c.key]?"#2e7d32":"#0863ba",border:`1.5px solid ${copied[c.key]?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .2s",whiteSpace:"nowrap" }}>
                      {copied[c.key] ? tr.modal.copiedBtn : tr.modal.copyBtn}
                    </button>
                  </div>
                ))}
              </div>

              {/* رابط الحجز — فقط للاحترافية والشاملة (فردية ومشتركة) */}
              {(form.plan === "pro" || form.plan === "enterprise" || form.plan === "shared_pro" || form.plan === "shared_enterprise") && (
              <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:12,padding:"14px 16px" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:8,textTransform:"uppercase",letterSpacing:.5 }}>
                  🔗 {tr.modal.bookLink}
                </div>
                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                  <span style={{ flex:1,fontSize:12,color:"#888",direction:"ltr",wordBreak:"break-all" }}>{bookingUrl}</span>
                  <button onClick={() => { navigator.clipboard.writeText(bookingUrl); }}
                    style={{ flexShrink:0,padding:"7px 14px",background:"#0863ba",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Rubik,sans-serif" }}>
                    {isAr ? "نسخ" : "Copy"}
                  </button>
                </div>
              </div>
              )}
            </div>
          ) : (
            /* ─── فورم الإضافة / التعديل ─── */
            <>
              {/* ── اختيار نوع الحساب (عيادة / صيدلية) — فقط عند الإضافة ── */}
              {!isEdit && (
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                    {tr.accountType.label}
                  </label>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                    {(["clinic","pharmacy"] as AccountType[]).map(type => {
                      const isSelected = form.account_type === type;
                      const isPharmacy = type === "pharmacy";
                      const color = isPharmacy ? "#27ae60" : "#0863ba";
                      return (
                        <button key={type} type="button"
                          onClick={() => setForm(prev => ({
                            ...prev,
                            account_type: type,
                            plan: isPharmacy ? "pharmacy" as PlanType : "basic",
                          }))}
                          style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"16px 12px",border:`2px solid ${isSelected?color:"#eef0f3"}`,borderRadius:14,background:isSelected?`${color}08`:"#fafbfc",cursor:"pointer",transition:"all .18s",fontFamily:"Rubik,sans-serif",boxShadow:isSelected?`0 4px 16px ${color}18`:"none" }}>
                          <span style={{ fontSize:28 }}>{isPharmacy?"💊":"🏥"}</span>
                          <span style={{ fontSize:13,fontWeight:isSelected?700:500,color:isSelected?color:"#666" }}>
                            {isPharmacy ? tr.accountType.pharmacy : tr.accountType.clinic}
                          </span>
                          <span style={{ fontSize:10,color:"#aaa",textAlign:"center",lineHeight:1.4 }}>
                            {isPharmacy ? tr.accountType.pharmacyDesc : tr.accountType.clinicDesc}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize:10,fontWeight:700,color:color,background:`${color}12`,padding:"2px 10px",borderRadius:20 }}>✓ {isAr?"محدد":"Selected"}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Field label={form.account_type === "pharmacy" ? (isAr?"اسم الصيدلية *":"Pharmacy Name *") : tr.modal.clinicName}>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={form.account_type === "pharmacy" ? tr.pharmacy.namePh : tr.modal.clinicNamePh}
                  style={inputSt}
                />
              </Field>

              <div style={{ display:"flex", gap:12 }}>
                <Field label={form.account_type === "pharmacy" ? (isAr?"اسم المدير / المالك *":"Owner / Manager *") : tr.modal.ownerName} half>
                  <input
                    value={form.owner}
                    onChange={e => setForm(prev => ({ ...prev, owner: e.target.value }))}
                    placeholder={form.account_type === "pharmacy" ? tr.pharmacy.ownerPh : tr.modal.ownerPh}
                    style={inputSt}
                  />
                </Field>
                <Field label={tr.modal.phone} half>
                  <input
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={tr.modal.phonePh}
                    style={inputSt}
                  />
                </Field>
              </div>

              <Field label={tr.modal.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={tr.modal.emailPh}
                  style={inputSt}
                />
              </Field>

              {/* نوع العيادة — فقط للعيادات */}
              {form.account_type !== "pharmacy" && (
              <Field label={tr.modal.clinicType}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {([
                    "general","dental","dermatology","cosmetic","pediatrics",
                    "physical_therapy","mental_health","nutrition","ophthalmology",
                    "orthopedic","cardiology","gynecology","ent","urology","other"
                  ] as ClinicType[]).map(ct => {
                    const isSelected = form.clinic_type === ct;
                    return (
                      <button key={ct} type="button"
                        onClick={() => setForm(prev => ({ ...prev, clinic_type: ct }))}
                        style={{
                          display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                          padding:"10px 6px",
                          border:`1.5px solid ${isSelected?"#0558a8":"#eef0f3"}`,
                          borderRadius:10,
                          background:isSelected?"rgba(5,88,168,.07)":"#fafbfc",
                          cursor:"pointer", transition:"all .15s",
                          fontFamily:"Rubik,sans-serif",
                          boxShadow:isSelected?"0 2px 8px rgba(5,88,168,.12)":"none",
                        }}>
                        <span style={{ fontSize:22 }}>{CLINIC_TYPE_ICONS[ct]}</span>
                        <span style={{ fontSize:10, fontWeight:isSelected?700:400, color:isSelected?"#0558a8":"#666", textAlign:"center", lineHeight:1.3 }}>
                          {tr.modal.clinicTypes[ct as keyof typeof tr.modal.clinicTypes]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              )}

              {/* الخطة — عيادة: خيارات متعددة | صيدلية: بطاقة ثابتة */}
              {form.account_type === "pharmacy" ? (
                <Field label={tr.pharmacy.plan}>
                  <div style={{ padding:"16px",background:"rgba(39,174,96,.06)",border:"2px solid rgba(39,174,96,.25)",borderRadius:14 }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <span style={{ fontSize:22 }}>💊</span>
                        <span style={{ fontSize:14,fontWeight:700,color:"#27ae60" }}>{tr.pharmacy.plan}</span>
                      </div>
                      <div style={{ display:"flex",alignItems:"baseline",gap:2 }}>
                        <span style={{ fontSize:22,fontWeight:900,color:"#27ae60" }}>{tr.pharmacy.price}</span>
                        <span style={{ fontSize:11,color:"#aaa" }}>{tr.pharmacy.period}</span>
                      </div>
                    </div>
                    <p style={{ fontSize:12,color:"#555",lineHeight:1.6,marginBottom:10 }}>{tr.pharmacy.planDesc}</p>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {(isAr
                        ? ["إدارة المخزون","الوصفات الطبية","نقطة البيع","إدارة الموردين","سجل الحركة","التقارير","تنبيهات المخزون","باركود"]
                        : ["Inventory","Prescriptions","Point of Sale","Suppliers","Stock Logs","Reports","Alerts","Barcode"]
                      ).map((f,i) => (
                        <span key={i} style={{ fontSize:11,color:"#27ae60",background:"rgba(39,174,96,.1)",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>✓ {f}</span>
                      ))}
                    </div>
                  </div>
                </Field>
              ) : (
              <Field label={tr.modal.plan}>
                {/* تبويب الخطط الفردية / المشتركة */}
                {(() => {
                  const isSharedSelected = ["shared_basic","shared_pro","shared_enterprise"].includes(form.plan);
                  const individualPlans: { key: PlanType; color: string; emoji: string }[] = [
                    { key:"basic",      color:"#0863ba", emoji:"🩺" },
                    { key:"pro",        color:"#7b2d8b", emoji:"🏥" },
                    { key:"enterprise", color:"#e67e22", emoji:"🚀" },
                  ];
                  const sharedPlans: { key: PlanType; color: string; emoji: string; defaultDoctors: number }[] = [
                    { key:"shared_basic",      color:"#0e7c6a", emoji:"👥", defaultDoctors:2 },
                    { key:"shared_pro",        color:"#b5451b", emoji:"🏨", defaultDoctors:3 },
                    { key:"shared_enterprise", color:"#4a1480", emoji:"🏗️", defaultDoctors:5 },
                  ];
                  return (
                    <div>
                      {/* تبويب */}
                      <div style={{ display:"flex",gap:4,background:"#f7f9fc",borderRadius:10,padding:4,marginBottom:12 }}>
                        <button type="button" onClick={() => { setPlanTab("individual"); if(isSharedSelected) setForm(prev=>({...prev,plan:"basic"})); }}
                          style={{ flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:planTab==="individual"?700:400,background:planTab==="individual"?"#fff":"transparent",color:planTab==="individual"?"#0863ba":"#888",boxShadow:planTab==="individual"?"0 2px 6px rgba(8,99,186,.1)":"none",transition:"all .15s" }}>
                          🩺 {isAr?"خطط فردية":"Individual"}
                        </button>
                        <button type="button" onClick={() => { setPlanTab("shared"); if(!isSharedSelected) setForm(prev=>({...prev,plan:"shared_basic",max_doctors:2})); }}
                          style={{ flex:1,padding:"7px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:planTab==="shared"?700:400,background:planTab==="shared"?"#fff":"transparent",color:planTab==="shared"?"#0e7c6a":"#888",boxShadow:planTab==="shared"?"0 2px 6px rgba(14,124,106,.1)":"none",transition:"all .15s" }}>
                          👥 {isAr?"خطط مشتركة":"Shared"}
                        </button>
                      </div>
                      {/* الخطط الفردية */}
                      {planTab === "individual" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          {individualPlans.map(p => {
                            const isSelected = form.plan === p.key;
                            const pricing = PLAN_PRICING[p.key];
                            const features = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                            return (
                              <button key={p.key} type="button"
                                onClick={() => setForm(prev => ({ ...prev, plan: p.key }))}
                                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:isAr?"right":"left",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                                <div style={{ width:12,height:12,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:3,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                                    <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>
                                      {p.emoji} {tr.clinics.plans[p.key]}
                                    </span>
                                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:`${p.color}15`,color:p.color,fontWeight:700 }}>${pricing.monthly}{isAr?"/شهر":"/mo"}</span>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(46,125,50,.08)",color:"#2e7d32",fontWeight:600 }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                                    {features.map((f,i) => (
                                      <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:3 }}>
                                        <span style={{ color:p.color }}>✓</span> {f}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* الخطط المشتركة */}
                      {planTab === "shared" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                          <div style={{ background:"rgba(14,124,106,.05)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#0e7c6a",marginBottom:4 }}>
                            👥 {isAr?"للعيادات التي تضم أكثر من طبيب واحد — يتم تخصيص المرضى لكل طبيب بشكل مستقل":"For clinics with multiple doctors — patients are assigned per doctor"}
                          </div>
                          {sharedPlans.map(p => {
                            const isSelected = form.plan === p.key;
                            const pricing = PLAN_PRICING[p.key];
                            const features = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                            return (
                              <button key={p.key} type="button"
                                onClick={() => setForm(prev => ({ ...prev, plan: p.key, max_doctors: SHARED_PLAN_DEFAULT_DOCTORS[p.key] ?? p.defaultDoctors }))}
                                style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:isAr?"right":"left",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                                <div style={{ width:12,height:12,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:3,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                                    <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>
                                      {p.emoji} {tr.clinics.plans[p.key]}
                                    </span>
                                    <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:`${p.color}15`,color:p.color,fontWeight:700 }}>${pricing.monthly}{isAr?"/شهر":"/mo"}</span>
                                      <span style={{ fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(46,125,50,.08)",color:"#2e7d32",fontWeight:600 }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                                    </div>
                                  </div>
                                  <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:6 }}>
                                    {features.map((f,i) => (
                                      <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:3 }}>
                                        <span style={{ color:p.color }}>✓</span> {f}
                                      </span>
                                    ))}
                                  </div>
                                  <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                                    👨‍⚕️ {isAr?"الأطباء:":"Doctors:"} {isAr?`حتى ${p.defaultDoctors}`:`Up to ${p.defaultDoctors}`}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          {/* تعديل عدد الأطباء للخطة المشتركة المختارة */}
                          {isSharedSelected && (
                            <div style={{ background:"#f7f9fc",borderRadius:10,padding:"12px 14px",border:"1.5px solid #eef0f3",marginTop:4 }}>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase" as const }}>
                                ✏️ {isAr?"الحد الأقصى للأطباء (قابل للتخصيص)":"Max Doctors (Customizable)"}
                              </label>
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} max={50} value={form.max_doctors}
                                  onChange={e => setForm(prev => ({ ...prev, max_doctors: parseInt(e.target.value)||1 }))}
                                  style={{ width:80,padding:"8px 12px",border:"1.5px solid #e8eaed",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,color:"#353535",textAlign:"center",outline:"none" }}
                                />
                                <span style={{ fontSize:12,color:"#888" }}>{isAr?"طبيب (الحد الافتراضي حسب الخطة)":"doctors (default by plan)"}</span>
                              </div>
                              <p style={{ fontSize:11,color:"#aaa",marginTop:6 }}>⚙️ {isAr?tr.subModal.maxDoctorsNote:tr.subModal.maxDoctorsNote}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Field>
              )} {/* end clinic plan conditional */}

              <Field label={tr.modal.expiry} half>
                  <input
                    type="date"
                    value={form.expiry}
                    onChange={e => setForm(prev => ({ ...prev, expiry: e.target.value }))}
                    style={inputSt}
                  />
              </Field>

              {/* توليد بيانات الدخول — فقط عند الإضافة */}
              {!isEdit && (
                <div style={{ borderTop:"1.5px dashed #eee", paddingTop:16, marginTop:4 }}>
                  <button
                    type="button"
                    onClick={handleGenCreds}
                    style={{ width:"100%",padding:"11px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px dashed rgba(8,99,186,.3)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
                  >
                    🔑 {tr.modal.generateCredentials}
                  </button>

                  {creds && (
                    <div style={{ marginTop:14,background:"#f7f9fc",borderRadius:12,padding:"16px",border:"1.5px solid #eef0f3",animation:"modalIn .2s ease" }}>
                      <div style={{ fontSize:11,color:"#aaa",marginBottom:12,textAlign:"center",letterSpacing:.5,textTransform:"uppercase" }}>
                        ⚠️ {tr.modal.credNote}
                      </div>
                      {[
                        { label: tr.modal.username,       value: form.email || (isAr ? "أدخل البريد أولاً" : "Enter email first"), key: "e" as const },
                        { label: tr.modal.password_label, value: creds.password, key: "p" as const },
                      ].map(c => (
                        <div key={c.key} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                          <span style={{ fontSize:11,color:"#aaa",width:90,flexShrink:0 }}>{c.label}:</span>
                          <code style={{ flex:1,background:"#fff",padding:"6px 10px",borderRadius:8,fontSize:12,color:"#0863ba",fontFamily:"monospace",letterSpacing:.5,wordBreak:"break-all",border:"1.5px solid #eef0f3" }}>
                            {c.value}
                          </code>
                          <button
                            type="button"
                            onClick={() => copy(c.value, c.key)}
                            style={{ padding:"5px 12px",background:copied[c.key]?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied[c.key]?"#2e7d32":"#0863ba",border:`1.5px solid ${copied[c.key]?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"Rubik,sans-serif",transition:"all .2s",whiteSpace:"nowrap" }}
                          >
                            {copied[c.key] ? tr.modal.copiedBtn : tr.modal.copyBtn}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding:"14px 26px 22px",display:"flex",gap:12,borderTop:"1.5px solid #eef0f3" }}>
          {savedUserId ? (
            <button
              onClick={() => { onSave(); onClose(); }}
              style={{ flex:1,padding:"12px",background:"#2e7d32",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}
            >
              ✓ {isAr ? "إغلاق" : "Close"}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}
              >
                {saving ? tr.modal.creating : (isEdit ? tr.modal.update : tr.modal.save)}
              </button>
              <button
                onClick={onClose}
                style={{ padding:"12px 20px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}
              >
                {tr.modal.cancel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Subscription Modal ────────────────────────────────────
interface SubModalProps {
  lang: Lang;
  clinic: ClinicData;
  onSave: () => void;
  onClose: () => void;
}

const SubscriptionModal = ({ lang, clinic, onSave, onClose }: SubModalProps) => {
  const tr   = T[lang];
  const sm   = tr.subModal;
  const isAr = lang === "ar";

  const [activeTab, setActiveTab] = useState<"info"|"sub"|"doctors"|"security">("info");
  const [form, setForm] = useState({
    email:  clinic.email  || "",
    owner:  clinic.owner  || "",
    phone:  clinic.phone  || "",
    plan:   clinic.plan   as PlanType,
    expiry: clinic.expiry || "",
    status: clinic.status as "active"|"inactive"|"expired",
    clinic_type: (clinic.clinic_type || "general") as ClinicType,
    max_doctors: clinic.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[clinic.plan] ?? 2,
    payments_lock_enabled:  clinic.payments_lock_enabled  ?? false,
    payments_lock_password: clinic.payments_lock_password ?? "",
    restricted_access_enabled: clinic.restricted_access_enabled ?? false,
    restricted_access_pin:     clinic.restricted_access_pin     ?? "",
  });
  const [newPass,       setNewPass]       = useState("");
  const [copied,        setCopied]        = useState(false);
  const [copiedLink,    setCopiedLink]    = useState(false);
  const [showPin,       setShowPin]       = useState(false);
  // savedRA tracks what's actually persisted in DB — used to gate the copy-link button
  const [savedRA, setSavedRA] = useState({
    enabled: clinic.restricted_access_enabled ?? false,
    pin:     clinic.restricted_access_pin     ?? "",
  });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [successMsg,    setSuccessMsg]    = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  // ── Doctors state ─────────────────────────────────────────
  const DOCTOR_COLORS = ["#0863ba","#7b2d8b","#0e7c6a","#b5451b","#e67e22","#4a1480","#c0392b","#2e7d32"];
  const isSharedPlan  = ["shared_basic","shared_pro","shared_enterprise"].includes(form.plan);
  const maxDoctors    = form.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[form.plan] ?? 2;

  const [doctors,        setDoctors]        = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorForm,     setDoctorForm]     = useState<Doctor | null>(null);
  const [doctorSaving,   setDoctorSaving]   = useState(false);
  const [doctorError,    setDoctorError]    = useState("");

  useEffect(() => {
    if (isSharedPlan && clinic.user_id) loadDoctors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.user_id]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const res = await adminFetch(`/api/doctors?user_id=${clinic.user_id}`, { cache:"no-store" });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data as Doctor[]);
      }
    } catch (err) {
      console.error("loadDoctors error:", err);
    }
    setDoctorsLoading(false);
  };

  const openAddDoctor = () => {
    setDoctorError("");
    setDoctorForm({
      user_id:   clinic.user_id!,
      name:      "",
      specialty: "",
      phone:     "",
      email:     "",
      color:     DOCTOR_COLORS[doctors.length % DOCTOR_COLORS.length],
      is_active: true,
    });
  };

  const openEditDoctor = (d: Doctor) => {
    setDoctorError("");
    setDoctorForm({ ...d });
  };

  const handleSaveDoctor = async () => {
    if (!doctorForm?.name.trim()) { setDoctorError(sm.doctors.noName); return; }
    setDoctorSaving(true); setDoctorError("");
    const action = doctorForm.id ? "update" : "add";
    const res = await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        action,
        id:        doctorForm.id,
        user_id:   clinic.user_id,
        name:      doctorForm.name,
        specialty: doctorForm.specialty,
        phone:     doctorForm.phone,
        email:     doctorForm.email,
        color:     doctorForm.color,
        is_active: doctorForm.is_active,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setDoctorError(json.error || (isAr ? "حدث خطأ" : "An error occurred")); setDoctorSaving(false); return; }
    setDoctorSaving(false);
    setDoctorForm(null);
    loadDoctors();
  };

  const handleToggleDoctor = async (d: Doctor) => {
    await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "toggle", id: d.id }),
    });
    loadDoctors();
  };

  const handleRemoveDoctor = async (d: Doctor) => {
    if (!window.confirm(sm.doctors.confirmRemove)) return;
    await adminFetch("/api/doctors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "delete", id: d.id }),
    });
    loadDoctors();
  };

  // ── helpers ──────────────────────────────────────────────
  const genAndSetPass = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#";
    setNewPass(Array.from({length:12}, ()=>chars[Math.floor(Math.random()*chars.length)]).join(""));
  }, []);

  const copyPass = async () => {
    await navigator.clipboard.writeText(newPass).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── بناء body مشترك للـ API ──────────────────────────────
  const buildBody = (overrides: Record<string,unknown> = {}): Record<string,unknown> => ({
    userId: clinic.user_id,
    name:   clinic.name,
    owner:  form.owner,
    email:  form.email,
    phone:  form.phone,
    plan:   form.plan,
    expiry: form.expiry,
    status: form.status,
    clinic_type: form.clinic_type,
    account_type: clinic.account_type || "clinic",
    max_doctors: form.max_doctors,
    payments_lock_enabled:  form.payments_lock_enabled,
    payments_lock_password: form.payments_lock_password,
    restricted_access_enabled: form.restricted_access_enabled,
    restricted_access_pin:     form.restricted_access_pin,
    ...overrides,
  });

  const callAPI = async (body: Record<string,unknown>): Promise<{ok:boolean; error?:string}> => {
    try {
      const res  = await adminFetch("/api/update-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok:false, error: json.error || (isAr?"حدث خطأ":"An error occurred") };
      return { ok:true };
    } catch {
      return { ok:false, error: isAr?"خطأ في الاتصال":"Connection error" };
    }
  };

  // ── حفظ التعديلات (بيانات + اشتراك + كلمة مرور) ─────────
  const handleSave = async () => {
    // التحقق من كلمة سر المدفوعات عند تفعيل القفل
    if (form.payments_lock_enabled && !form.payments_lock_password.trim()) {
      setError(sm.paymentsLock.required);
      return;
    }
    // التحقق من PIN الدخول المقيّد
    if (form.restricted_access_enabled) {
      const pin = form.restricted_access_pin.trim();
      if (!pin) { setError(sm.restrictedAccess.required); return; }
      if (!/^\d{4,8}$/.test(pin)) { setError(sm.restrictedAccess.pinInvalid); return; }
    }
    setSaving(true); setError(""); setSuccessMsg("");
    const body = buildBody();
    if (newPass.trim()) body.newPassword = newPass.trim();
    const result = await callAPI(body);
    setSaving(false);
    if (!result.ok) { setError(result.error!); return; }
    setSuccessMsg(isAr?"✓ تم الحفظ بنجاح":"✓ Saved successfully");
    setNewPass("");
    setSavedRA({ enabled: form.restricted_access_enabled, pin: form.restricted_access_pin });
    onSave(); // تحديث القائمة في الخلفية
    setTimeout(() => { setSuccessMsg(""); onClose(); }, 800);
  };

  // ── تجميد / رفع تجميد — عبر service_role ─────────────────
  const handleFreeze = async () => {
    setActionLoading("freeze"); setError("");
    const newStatus = form.status === "inactive" ? "active" : "inactive";
    try {
      const res  = await adminFetch("/api/freeze-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id, status: newStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || (isAr?"حدث خطأ":"An error occurred")); return; }
      setForm(p => ({ ...p, status: newStatus }));
      onSave();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
    } finally {
      setActionLoading("");
    }
  };

  // ── إلغاء الاشتراك — عبر service_role ──────────────────────
  const handleCancelSub = async () => {
    setActionLoading("cancel"); setError("");
    try {
      const res  = await adminFetch("/api/cancel-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || (isAr?"حدث خطأ":"An error occurred")); return; }
      const today = new Date().toISOString().split("T")[0];
      setForm(p => ({ ...p, status: "expired", expiry: today }));
      onSave();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
    } finally {
      setActionLoading("");
    }
  };

  // ── حذف نهائي — عبر service_role ───────────────────────────
  const handleDelete = async () => {
    setActionLoading("delete"); setError("");
    try {
      const res  = await adminFetch("/api/delete-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: clinic.user_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || (isAr?"حدث خطأ أثناء الحذف":"Error during deletion"));
        setConfirmDelete(false);
        return;
      }
      onSave();
      onClose();
    } catch {
      setError(isAr?"خطأ في الاتصال":"Connection error");
      setConfirmDelete(false);
    } finally {
      setActionLoading("");
    }
  };

  const inputSt: React.CSSProperties = {
    width:"100%", padding:"10px 14px", border:"1.5px solid #e8eaed", borderRadius:10,
    fontFamily:"Rubik,sans-serif", fontSize:13, color:"#353535", background:"#fafbfc",
    outline:"none", direction: isAr?"rtl":"ltr",
  };

  const PLAN_INFO: { key: PlanType; color: string; emoji: string; isShared?: boolean; defaultDoctors?: number }[] = [
    { key:"basic",             color:"#0863ba", emoji:"🩺" },
    { key:"pro",               color:"#7b2d8b", emoji:"🏥" },
    { key:"enterprise",        color:"#e67e22", emoji:"🚀" },
    { key:"shared_basic",      color:"#0e7c6a", emoji:"👥", isShared:true, defaultDoctors:2 },
    { key:"shared_pro",        color:"#b5451b", emoji:"🏨", isShared:true, defaultDoctors:3 },
    { key:"shared_enterprise", color:"#4a1480", emoji:"🏗️", isShared:true, defaultDoctors:5 },
  ];

  const tabStyle = (t: string): React.CSSProperties => ({
    padding:"9px 18px", border:"none", borderRadius:10, cursor:"pointer",
    fontFamily:"Rubik,sans-serif", fontSize:13, fontWeight: activeTab===t?700:400,
    background: activeTab===t?"#fff":"transparent",
    color: activeTab===t?"#0863ba":"#888",
    boxShadow: activeTab===t?"0 2px 8px rgba(8,99,186,.1)":"none",
    transition:"all .18s",
  });

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.45)",backdropFilter:"blur(6px)" }} />
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:24,width:"100%",maxWidth:520,maxHeight:"94vh",overflowY:"auto",boxShadow:"0 32px 100px rgba(8,99,186,.18)",animation:"modalIn .25s cubic-bezier(.4,0,.2,1)" }}>

        {/* Header */}
        <div style={{ padding:"22px 26px 0",background:"linear-gradient(135deg,rgba(8,99,186,.04),transparent)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:44,height:44,background:"rgba(8,99,186,.08)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>💳</div>
              <div>
                <h2 style={{ fontSize:17,fontWeight:800,color:"#353535",lineHeight:1.2 }}>{sm.title}</h2>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>{clinic.name}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,border:"1.5px solid #eef0f3",background:"#f7f9fc",cursor:"pointer",fontSize:16,color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex",gap:4,background:"#f7f9fc",borderRadius:12,padding:4 }}>
            <button style={tabStyle("info")}     onClick={() => setActiveTab("info")}>{sm.tabInfo}</button>
            <button style={tabStyle("sub")}      onClick={() => setActiveTab("sub")}>{sm.tabSub}</button>
            {isSharedPlan && (
              <button style={tabStyle("doctors")} onClick={() => setActiveTab("doctors")}>
                👨‍⚕️ {sm.tabDoctors}
              </button>
            )}
            <button style={tabStyle("security")} onClick={() => setActiveTab("security")}>{sm.tabSecurity}</button>
          </div>
          <div style={{ height:1,background:"#eef0f3",marginTop:16 }} />
        </div>

        <div style={{ padding:"20px 26px 0" }}>
          {error && <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c0392b",marginBottom:14 }}>⚠️ {error}</div>}
          {successMsg && <div style={{ background:"rgba(46,125,50,.06)",border:"1.5px solid rgba(46,125,50,.15)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#2e7d32",marginBottom:14 }}>{successMsg}</div>}

          {/* ── TAB: INFO ── */}
          {activeTab === "info" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.username}</label>
                <input value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder={sm.usernamePh} style={inputSt} />
              </div>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.ownerName}</label>
                <input value={form.owner} onChange={e => setForm(p=>({...p,owner:e.target.value}))} placeholder={sm.ownerPh} style={inputSt} />
              </div>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.phone}</label>
                <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder={sm.phonePh} style={inputSt} />
              </div>

              {/* نوع العيادة */}
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>
                  {tr.modal.clinicType}
                </label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
                  {([
                    "general","dental","dermatology","cosmetic","pediatrics",
                    "physical_therapy","mental_health","nutrition","ophthalmology",
                    "orthopedic","cardiology","gynecology","ent","urology","other"
                  ] as ClinicType[]).map(ct => {
                    const isSelected = form.clinic_type === ct;
                    return (
                      <button key={ct} type="button"
                        onClick={() => setForm(p => ({ ...p, clinic_type: ct }))}
                        style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 4px",border:`1.5px solid ${isSelected?"#0558a8":"#eef0f3"}`,borderRadius:9,background:isSelected?"rgba(5,88,168,.07)":"#fafbfc",cursor:"pointer",transition:"all .15s",fontFamily:"Rubik,sans-serif",boxShadow:isSelected?"0 2px 8px rgba(5,88,168,.12)":"none" }}>
                        <span style={{ fontSize:18 }}>{CLINIC_TYPE_ICONS[ct]}</span>
                        <span style={{ fontSize:9,fontWeight:isSelected?700:400,color:isSelected?"#0558a8":"#888",textAlign:"center",lineHeight:1.3 }}>
                          {tr.modal.clinicTypes[ct as keyof typeof tr.modal.clinicTypes]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: SUBSCRIPTION ── */}
          {activeTab === "sub" && (
            <div style={{ display:"flex",flexDirection:"column",gap:18 }}>

              {/* Plan selector — الصيدلية لا تملك خيارات خطة */}
              {clinic.account_type === "pharmacy" ? (
                <div style={{ padding:"16px",background:"rgba(39,174,96,.06)",border:"1.5px solid rgba(39,174,96,.2)",borderRadius:14 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                    <span style={{ fontSize:22 }}>💊</span>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700,color:"#27ae60" }}>{isAr?"اشتراك صيدلية":"Pharmacy Subscription"}</div>
                      <div style={{ fontSize:11,color:"#888",marginTop:2 }}>{isAr?"خطة الصيدلية ثابتة ولا يمكن تغييرها":"Pharmacy plan is fixed and cannot be changed"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                    {(isAr
                      ? ["إدارة المخزون","الوصفات الطبية","نقطة البيع","إدارة الموردين","التقارير","تنبيهات المخزون"]
                      : ["Inventory","Prescriptions","Point of Sale","Suppliers","Reports","Stock Alerts"]
                    ).map((f,i) => (
                      <span key={i} style={{ fontSize:11,color:"#27ae60",background:"rgba(39,174,96,.1)",padding:"3px 10px",borderRadius:20,fontWeight:600 }}>✓ {f}</span>
                    ))}
                  </div>
                </div>
              ) : (
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:10,textTransform:"uppercase",letterSpacing:.4 }}>{sm.changePlan}</label>
                {/* قسم الخطط الفردية */}
                <div style={{ fontSize:11,fontWeight:700,color:"#0863ba",marginBottom:8,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ background:"rgba(8,99,186,.08)",padding:"2px 10px",borderRadius:20 }}>🩺 {isAr?"خطط فردية":"Individual Plans"}</span>
                  <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{isAr?"لطبيب واحد":"Single doctor"}</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
                  {PLAN_INFO.filter(p => !p.isShared).map(p => {
                    const isSelected = form.plan === p.key;
                    const isCurrent  = clinic.plan === p.key;
                    const pricing    = PLAN_PRICING[p.key];
                    const limit      = PLAN_PATIENT_LIMITS[p.key];
                    const limitLabel = limit === Infinity ? (isAr?"غير محدود":"Unlimited") : `${limit}`;
                    const features   = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                    return (
                      <button key={p.key} onClick={() => setForm(prev=>({...prev,plan:p.key}))}
                        style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:"start",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:4,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>{p.emoji} {sm.plans[p.key]}</span>
                              {isCurrent && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${p.color}15`,color:p.color }}>{isAr?"الحالية":"Current"}</span>}
                            </div>
                            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                              <span style={{ fontSize:11,fontWeight:700,color:p.color }}>${pricing.monthly}<span style={{ fontSize:9,color:"#aaa",fontWeight:400 }}>{isAr?"/شهر":"/mo"}</span></span>
                              <span style={{ fontSize:10,color:"#2e7d32" }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:4 }}>
                            {features.map((f,i) => (
                              <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:2 }}>
                                <span style={{ color:p.color }}>✓</span> {f}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                            👥 {isAr?"المرضى:":"Patients:"} {limitLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* قسم الخطط المشتركة */}
                <div style={{ fontSize:11,fontWeight:700,color:"#0e7c6a",marginBottom:8,display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ background:"rgba(14,124,106,.08)",padding:"2px 10px",borderRadius:20 }}>👥 {isAr?"خطط مشتركة":"Shared Plans"}</span>
                  <span style={{ fontSize:10,color:"#aaa",fontWeight:400 }}>{isAr?"لأكثر من طبيب":"Multi-doctor"}</span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {PLAN_INFO.filter(p => p.isShared).map(p => {
                    const isSelected = form.plan === p.key;
                    const isCurrent  = clinic.plan === p.key;
                    const pricing    = PLAN_PRICING[p.key];
                    const limit      = PLAN_PATIENT_LIMITS[p.key];
                    const limitLabel = limit === Infinity ? (isAr?"غير محدود":"Unlimited") : `${limit}`;
                    const features   = PLAN_FEATURES[p.key][isAr ? "ar" : "en"];
                    return (
                      <button key={p.key} onClick={() => setForm(prev=>({...prev,plan:p.key,max_doctors:prev.plan===p.key?prev.max_doctors:(SHARED_PLAN_DEFAULT_DOCTORS[p.key]??p.defaultDoctors??2)}))}
                        style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`1.5px solid ${isSelected?p.color:"#eef0f3"}`,borderRadius:12,background:isSelected?`${p.color}08`:"#fafbfc",cursor:"pointer",textAlign:"start",transition:"all .18s",fontFamily:"Rubik,sans-serif",width:"100%" }}>
                        <div style={{ width:10,height:10,borderRadius:"50%",background:isSelected?p.color:"#ddd",border:`2px solid ${isSelected?p.color:"#ccc"}`,flexShrink:0,marginTop:4,boxShadow:isSelected?`0 0 0 3px ${p.color}20`:"none",transition:"all .15s" }} />
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:4 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <span style={{ fontSize:13,fontWeight:700,color:isSelected?p.color:"#353535" }}>{p.emoji} {sm.plans[p.key]}</span>
                              {isCurrent && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${p.color}15`,color:p.color }}>{isAr?"الحالية":"Current"}</span>}
                            </div>
                            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
                              <span style={{ fontSize:11,fontWeight:700,color:p.color }}>${pricing.monthly}<span style={{ fontSize:9,color:"#aaa",fontWeight:400 }}>{isAr?"/شهر":"/mo"}</span></span>
                              <span style={{ fontSize:10,color:"#2e7d32" }}>${pricing.yearly}{isAr?"/سنة":"/yr"}</span>
                            </div>
                          </div>
                          <div style={{ display:"flex",flexWrap:"wrap",gap:3,marginBottom:4 }}>
                            {features.map((f,i) => (
                              <span key={i} style={{ fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:2 }}>
                                <span style={{ color:p.color }}>✓</span> {f}
                              </span>
                            ))}
                          </div>
                          <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                            <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                              👥 {isAr?"المرضى:":"Patients:"} {limitLabel}
                            </div>
                            <div style={{ fontSize:10,fontWeight:700,color:p.color,background:`${p.color}10`,display:"inline-block",padding:"2px 8px",borderRadius:20 }}>
                              👨‍⚕️ {isAr?"افتراضي:":"Default:"} {p.defaultDoctors} {isAr?"أطباء":"doctors"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {/* حقل تعديل عدد الأطباء — يظهر فقط عند اختيار خطة مشتركة */}
                {["shared_basic","shared_pro","shared_enterprise"].includes(form.plan) && (
                  <div style={{ background:"rgba(14,124,106,.04)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:10,padding:"12px 14px",marginTop:12 }}>
                    <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#0e7c6a",marginBottom:8,textTransform:"uppercase" as const }}>
                      ✏️ {sm.maxDoctors} ({sm.maxDoctorsNote})
                    </label>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <input type="number" onWheel={e=>(e.target as HTMLInputElement).blur()} min={1} max={50} value={form.max_doctors}
                        onChange={e => setForm(prev=>({...prev,max_doctors:parseInt(e.target.value)||1}))}
                        style={{ width:80,padding:"8px 12px",border:"1.5px solid rgba(14,124,106,.3)",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:16,fontWeight:800,color:"#0e7c6a",textAlign:"center",outline:"none",background:"#fff" }}
                      />
                      <span style={{ fontSize:12,color:"#666" }}>{isAr?"طبيب كحد أقصى في الاشتراك":"doctors maximum in subscription"}</span>
                    </div>
                    <p style={{ fontSize:11,color:"#aaa",marginTop:6,lineHeight:1.5 }}>
                      ⚙️ {isAr?"هذا الرقم مخصص ويتم الاتفاق عليه مع العميل — يتحكم في الحد الأقصى للأطباء المضافين في العيادة":"This is a custom number agreed with the client — it controls the maximum doctors allowed in the clinic"}
                    </p>
                  </div>
                )}
              </div>
              )} {/* end clinic plan conditional */}

              {/* Expiry */}
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.expiry}</label>
                <input type="date" value={form.expiry} onChange={e => setForm(p=>({...p,expiry:e.target.value}))} style={inputSt} />
              </div>

              {/* Action cards */}
              <div style={{ display:"flex",flexDirection:"column",gap:10,borderTop:"1.5px solid #eef0f3",paddingTop:16,marginTop:4 }}>

                {/* Freeze */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#f7f9fc",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>
                      {form.status==="inactive"?"▶":"⏸"} {sm.freezeTitle}
                    </div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.freezeDesc}</div>
                  </div>
                  <button onClick={handleFreeze} disabled={actionLoading==="freeze"}
                    style={{ padding:"8px 16px",background:form.status==="inactive"?"rgba(46,125,50,.08)":"rgba(230,126,34,.08)",color:form.status==="inactive"?"#2e7d32":"#e67e22",border:`1.5px solid ${form.status==="inactive"?"rgba(46,125,50,.2)":"rgba(230,126,34,.2)"}`,borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {actionLoading==="freeze"?"...":(form.status==="inactive"?sm.unfreeze:sm.freeze)}
                  </button>
                </div>

                {/* Cancel */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"#f7f9fc",borderRadius:12,border:"1.5px solid #eef0f3" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:8 }}>🚫 {sm.cancelTitle}</div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.cancelDesc}</div>
                  </div>
                  <button onClick={handleCancelSub} disabled={actionLoading==="cancel"||form.status==="expired"}
                    style={{ padding:"8px 16px",background:"rgba(192,57,43,.06)",color:"#c0392b",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:form.status==="expired"?"not-allowed":"pointer",opacity:form.status==="expired"?.5:1,whiteSpace:"nowrap" }}>
                    {actionLoading==="cancel"?"...":sm.cancelSub}
                  </button>
                </div>

                {/* Delete */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"rgba(192,57,43,.03)",borderRadius:12,border:"1.5px solid rgba(192,57,43,.12)" }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>🗑️ {sm.deleteTitle}</div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:3 }}>{sm.deleteDesc}</div>
                  </div>
                  <button onClick={() => setConfirmDelete(true)}
                    style={{ padding:"8px 16px",background:"#c0392b",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {sm.delete}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: DOCTORS ── */}
          {activeTab === "doctors" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>

              {/* شريط الطاقة الاستيعابية + تعديل الحد الأقصى مباشرة */}
              <div style={{ background:"rgba(14,124,106,.05)",border:"1.5px solid rgba(14,124,106,.2)",borderRadius:12,padding:"12px 16px" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#0e7c6a" }}>👨‍⚕️ {sm.doctors.capacity}</div>
                    <div style={{ fontSize:11,color:"#888",marginTop:2 }}>
                      {doctors.filter(d=>d.is_active).length} {isAr?"نشط /":"active /"} {doctors.length} {isAr?"مضاف /":"added /"} {maxDoctors} {isAr?"حد أقصى":"max"}
                    </div>
                  </div>
                  <div style={{ width:80 }}>
                    <div style={{ height:6,background:"#e8eaed",borderRadius:20,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${Math.min((doctors.length/maxDoctors)*100,100)}%`,background:doctors.length>=maxDoctors?"#c0392b":"#0e7c6a",borderRadius:20,transition:"width .3s" }} />
                    </div>
                    <div style={{ fontSize:10,color:"#aaa",textAlign:"center",marginTop:3 }}>{doctors.length}/{maxDoctors}</div>
                  </div>
                </div>
                {/* تعديل الحد الأقصى مباشرة من تاب الأطباء */}
                <div style={{ borderTop:"1px solid rgba(14,124,106,.15)",paddingTop:10,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                  <span style={{ fontSize:11,fontWeight:700,color:"#0e7c6a",whiteSpace:"nowrap" }}>
                    ✏️ {sm.maxDoctors}:
                  </span>
                  <input
                    type="number" min={1} max={50}
                    value={form.max_doctors}
                    onChange={e => setForm(prev => ({ ...prev, max_doctors: parseInt(e.target.value) || 1 }))}
                    style={{ width:60,padding:"5px 8px",border:"1.5px solid rgba(14,124,106,.4)",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:800,color:"#0e7c6a",textAlign:"center" as const,outline:"none",background:"#fff" }}
                  />
                  <button
                    onClick={async () => {
                      setSaving(true); setError(""); setSuccessMsg("");
                      const result = await callAPI(buildBody());
                      setSaving(false);
                      if (!result.ok) { setError(result.error!); return; }
                      setSuccessMsg(isAr ? "✓ تم حفظ الحد الأقصى" : "✓ Max doctors saved");
                      onSave();
                      setTimeout(() => setSuccessMsg(""), 2500);
                    }}
                    disabled={saving}
                    style={{ padding:"5px 14px",background:"#0e7c6a",color:"#fff",border:"none",borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:saving?"not-allowed":"pointer",whiteSpace:"nowrap" as const }}>
                    {saving ? "..." : (isAr ? "💾 حفظ" : "💾 Save")}
                  </button>
                  <span style={{ fontSize:10,color:"#aaa" }}>{sm.maxDoctorsNote}</span>
                </div>
              </div>

              {/* زر إضافة */}
              {doctors.length < maxDoctors && !doctorForm && (
                <button onClick={openAddDoctor}
                  style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px",border:"1.5px dashed rgba(14,124,106,.4)",borderRadius:12,background:"rgba(14,124,106,.03)",color:"#0e7c6a",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer" }}>
                  ➕ {sm.doctors.addDoctor}
                </button>
              )}
              {doctors.length >= maxDoctors && !doctorForm && (
                <div style={{ textAlign:"center",fontSize:12,color:"#aaa",padding:"8px",background:"rgba(192,57,43,.04)",border:"1.5px solid rgba(192,57,43,.1)",borderRadius:10 }}>
                  🔒 {sm.doctors.limitReached} ({maxDoctors})
                </div>
              )}

              {/* فورم إضافة / تعديل */}
              {doctorForm && (
                <div style={{ background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:14,padding:"16px" }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"#353535",marginBottom:14 }}>
                    {doctorForm.id ? (isAr?"تعديل الطبيب":"Edit Doctor") : (isAr?"طبيب جديد":"New Doctor")}
                  </div>
                  {doctorError && (
                    <div style={{ background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#c0392b",marginBottom:10 }}>⚠️ {doctorError}</div>
                  )}
                  <div style={{ display:"flex",gap:10,marginBottom:10 }}>
                    <div style={{ flex:2 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.name}</label>
                      <input value={doctorForm.name} onChange={e=>setDoctorForm(p=>p?{...p,name:e.target.value}:p)}
                        placeholder={sm.doctors.namePh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.specialty}</label>
                      <input value={doctorForm.specialty} onChange={e=>setDoctorForm(p=>p?{...p,specialty:e.target.value}:p)}
                        placeholder={sm.doctors.specialtyPh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none" }} />
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:10,marginBottom:10 }}>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.phone}</label>
                      <input value={doctorForm.phone} onChange={e=>setDoctorForm(p=>p?{...p,phone:e.target.value}:p)}
                        placeholder={sm.doctors.phonePh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none",direction:"ltr" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:5,textTransform:"uppercase" as const }}>{sm.doctors.email}</label>
                      <input value={doctorForm.email} onChange={e=>setDoctorForm(p=>p?{...p,email:e.target.value}:p)}
                        placeholder={sm.doctors.emailPh}
                        style={{ width:"100%",padding:"9px 12px",border:"1.5px solid #e8eaed",borderRadius:9,fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",background:"#fff",outline:"none",direction:"ltr" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block",fontSize:10,fontWeight:700,color:"#666",marginBottom:7,textTransform:"uppercase" as const }}>{sm.doctors.color}</label>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      {DOCTOR_COLORS.map(c => (
                        <button key={c} type="button" onClick={()=>setDoctorForm(p=>p?{...p,color:c}:p)}
                          style={{ width:28,height:28,borderRadius:"50%",background:c,border:doctorForm.color===c?"3px solid #353535":"2px solid transparent",cursor:"pointer",boxShadow:doctorForm.color===c?"0 0 0 3px rgba(0,0,0,.15)":"none" }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={handleSaveDoctor} disabled={doctorSaving}
                      style={{ flex:1,padding:"10px",background:"#0e7c6a",color:"#fff",border:"none",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:doctorSaving?"not-allowed":"pointer",opacity:doctorSaving?.7:1 }}>
                      {doctorSaving ? sm.doctors.saving : sm.doctors.save}
                    </button>
                    <button onClick={()=>{setDoctorForm(null);setDoctorError("");}}
                      style={{ padding:"10px 18px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
                      {sm.doctors.cancel}
                    </button>
                  </div>
                </div>
              )}

              {/* قائمة الأطباء */}
              {doctorsLoading ? (
                <div style={{ textAlign:"center",padding:"24px",color:"#aaa",fontSize:13 }}>⏳ {isAr?"جاري التحميل...":"Loading..."}</div>
              ) : doctors.length === 0 && !doctorForm ? (
                <div style={{ textAlign:"center",padding:"32px 20px",color:"#bbb" }}>
                  <div style={{ fontSize:40,marginBottom:8 }}>👨‍⚕️</div>
                  <div style={{ fontSize:13 }}>{isAr?"لا يوجد أطباء مضافون بعد":"No doctors added yet"}</div>
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {doctors.map(d => (
                    <div key={d.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fafbfc",border:`1.5px solid ${d.is_active?"#eef0f3":"rgba(192,57,43,.1)"}`,borderRadius:12,opacity:d.is_active?1:.65 }}>
                      <div style={{ width:38,height:38,borderRadius:"50%",background:d.color,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:800 }}>
                        {d.name.trim().charAt(0)}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{d.name}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:2,display:"flex",gap:8,flexWrap:"wrap" }}>
                          {d.specialty && <span>🏥 {d.specialty}</span>}
                          {d.phone && <span>📞 {d.phone}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:d.is_active?"rgba(46,125,50,.1)":"rgba(192,57,43,.1)",color:d.is_active?"#2e7d32":"#c0392b",flexShrink:0 }}>
                        {d.is_active ? sm.doctors.active : sm.doctors.inactive}
                      </span>
                      <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                        <button onClick={()=>openEditDoctor(d)} title={sm.doctors.edit}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>✏️</button>
                        <button onClick={()=>handleToggleDoctor(d)} title={sm.doctors.toggleActive}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid #eef0f3",background:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {d.is_active?"⏸":"▶"}
                        </button>
                        <button onClick={()=>handleRemoveDoctor(d)} title={sm.doctors.remove}
                          style={{ width:30,height:30,borderRadius:8,border:"1.5px solid rgba(192,57,43,.2)",background:"rgba(192,57,43,.04)",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── TAB: SECURITY ── */}
          {activeTab === "security" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#666",marginBottom:6,textTransform:"uppercase",letterSpacing:.4 }}>{sm.newPassword}</label>
                <div style={{ display:"flex",gap:8 }}>
                  <input value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••••••" style={{ ...inputSt, flex:1, fontFamily:"monospace", letterSpacing: newPass ? 2 : 0 }} />
                  <button onClick={genAndSetPass}
                    style={{ padding:"0 14px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                    🎲 {sm.generatePass}
                  </button>
                </div>
              </div>
              {newPass && (
                <div style={{ display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",borderRadius:10,padding:"12px 14px",border:"1.5px solid #eef0f3" }}>
                  <code style={{ flex:1,fontSize:14,color:"#0863ba",fontFamily:"monospace",letterSpacing:1.5,wordBreak:"break-all" }}>{newPass}</code>
                  <button onClick={copyPass}
                    style={{ padding:"6px 14px",background:copied?"rgba(46,125,50,.08)":"rgba(8,99,186,.06)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.15)"}`,borderRadius:8,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                    {copied?sm.copiedPass:sm.copyPass}
                  </button>
                </div>
              )}
              <div style={{ background:"rgba(8,99,186,.04)",border:"1.5px solid rgba(8,99,186,.1)",borderRadius:10,padding:"12px 14px" }}>
                <p style={{ fontSize:12,color:"#666",lineHeight:1.7,margin:0 }}>
                  {isAr
                    ? "⚠️ ستُرسَل كلمة المرور الجديدة فوراً. تأكد من إبلاغ صاحب العيادة بها قبل الإغلاق."
                    : "⚠️ The new password will be applied immediately. Make sure to inform the clinic owner before closing."}
                </p>
              </div>

              {/* ── قفل صفحة المدفوعات ── */}
              {(() => {
                const plansWithPayments = ["pro","enterprise","shared_pro","shared_enterprise"];
                const planSupportsPayments = plansWithPayments.includes(form.plan);
                const pl = sm.paymentsLock;
                return (
                  <div style={{ marginTop:6,borderTop:"1.5px solid #eef0f3",paddingTop:16 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <span style={{ fontSize:18 }}>🔐</span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{pl.sectionTitle}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{pl.sectionDesc}</div>
                      </div>
                    </div>

                    {!planSupportsPayments ? (
                      <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.05)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontSize:12,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>
                        🔒 {pl.notAvailable}
                      </div>
                    ) : (
                      <div style={{ background:"rgba(8,99,186,.03)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
                        {/* Toggle */}
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                              background: form.payments_lock_enabled ? "rgba(46,125,50,.1)" : "rgba(192,57,43,.08)",
                              color: form.payments_lock_enabled ? "#2e7d32" : "#c0392b" }}>
                              {form.payments_lock_enabled ? pl.enabledBadge : pl.disabledBadge}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, payments_lock_enabled: !p.payments_lock_enabled }))}
                            style={{ padding:"7px 16px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",border:"1.5px solid",transition:"all .2s",
                              background: form.payments_lock_enabled ? "rgba(192,57,43,.06)" : "rgba(46,125,50,.08)",
                              color: form.payments_lock_enabled ? "#c0392b" : "#2e7d32",
                              borderColor: form.payments_lock_enabled ? "rgba(192,57,43,.2)" : "rgba(46,125,50,.2)" }}>
                            {form.payments_lock_enabled ? pl.disable : pl.enable}
                          </button>
                        </div>

                        {/* Password input — يظهر فقط عند تفعيل القفل */}
                        {form.payments_lock_enabled && (
                          <div>
                            <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                              {pl.passwordLabel}
                            </label>
                            <div style={{ display:"flex",gap:8 }}>
                              <input
                                value={form.payments_lock_password}
                                onChange={e => setForm(p => ({ ...p, payments_lock_password: e.target.value }))}
                                placeholder={pl.passwordPh}
                                style={{ ...inputSt, flex:1 }}
                                onFocus={e => e.target.style.borderColor="#0863ba"}
                                onBlur={e => e.target.style.borderColor="#e8eaed"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                                  const p = Array.from({length:10}, ()=>chars[Math.floor(Math.random()*chars.length)]).join("");
                                  setForm(prev => ({ ...prev, payments_lock_password: p }));
                                }}
                                style={{ padding:"0 12px",background:"rgba(8,99,186,.06)",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.15)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>
                                🎲 {isAr?"توليد":"Generate"}
                              </button>
                            </div>
                            <p style={{ fontSize:11,color:"#aaa",marginTop:5,lineHeight:1.5 }}>
                              💡 {pl.saveNote}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── دخول مقيّد للأطباء ── */}
              {(() => {
                const ra = sm.restrictedAccess;
                const restrictedLink = typeof window !== "undefined"
                  ? `${window.location.origin}/restricted-access/${clinic.user_id}`
                  : `/restricted-access/${clinic.user_id}`;
                const copyRestrictedLink = async () => {
                  await navigator.clipboard.writeText(restrictedLink).catch(()=>{});
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                };
                const genPin = () => {
                  const pin = String(Math.floor(1000 + Math.random() * 9000));
                  setForm(p => ({ ...p, restricted_access_pin: pin }));
                };
                // الرابط يظهر فقط إذا كان الحفظ الفعلي في DB يطابق الحالة الحالية
                const linkReady = savedRA.enabled === form.restricted_access_enabled &&
                  savedRA.pin === form.restricted_access_pin &&
                  savedRA.enabled;
                return (
                  <div style={{ marginTop:6,borderTop:"1.5px solid #eef0f3",paddingTop:16 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                      <span style={{ fontSize:18 }}>🔗</span>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>{ra.sectionTitle}</div>
                        <div style={{ fontSize:11,color:"#aaa",marginTop:1 }}>{ra.sectionDesc}</div>
                      </div>
                    </div>

                    {!isSharedPlan ? (
                      <div style={{ padding:"10px 14px",background:"rgba(192,57,43,.05)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:10,fontSize:12,color:"#c0392b",display:"flex",alignItems:"center",gap:8 }}>
                        🔒 {ra.onlyShared}
                      </div>
                    ) : (
                      <div style={{ background:"rgba(14,124,106,.03)",border:"1.5px solid rgba(14,124,106,.15)",borderRadius:12,padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>

                        {/* Toggle */}
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                            background: form.restricted_access_enabled ? "rgba(14,124,106,.1)" : "rgba(192,57,43,.08)",
                            color: form.restricted_access_enabled ? "#0e7c6a" : "#c0392b" }}>
                            {form.restricted_access_enabled ? ra.enabledBadge : ra.disabledBadge}
                          </span>
                          <button type="button"
                            onClick={() => setForm(p => ({ ...p, restricted_access_enabled: !p.restricted_access_enabled }))}
                            style={{ padding:"7px 16px",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",border:"1.5px solid",transition:"all .2s",
                              background: form.restricted_access_enabled ? "rgba(192,57,43,.06)" : "rgba(14,124,106,.08)",
                              color: form.restricted_access_enabled ? "#c0392b" : "#0e7c6a",
                              borderColor: form.restricted_access_enabled ? "rgba(192,57,43,.2)" : "rgba(14,124,106,.25)" }}>
                            {form.restricted_access_enabled ? ra.disable : ra.enable}
                          </button>
                        </div>

                        {form.restricted_access_enabled && (
                          <>
                            {/* PIN — يظهر كنجوم مع زر إظهار/إخفاء */}
                            <div>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                                {ra.pinLabel}
                              </label>
                              <div style={{ display:"flex",gap:8 }}>
                                <div style={{ flex:1,position:"relative" as const,display:"flex",alignItems:"center" }}>
                                  <input
                                    type={showPin ? "text" : "password"}
                                    value={form.restricted_access_pin}
                                    onChange={e => setForm(p => ({ ...p, restricted_access_pin: e.target.value.replace(/\D/g,"").slice(0,8) }))}
                                    placeholder={ra.pinPh}
                                    inputMode="numeric"
                                    autoComplete="new-password"
                                    name="restricted_access_pin"
                                    maxLength={8}
                                    style={{ ...inputSt, flex:1, fontFamily:"monospace", letterSpacing: showPin ? 6 : 4, fontSize:18, fontWeight:700, paddingLeft:40 }}
                                    onFocus={e => e.target.style.borderColor="#0e7c6a"}
                                    onBlur={e => e.target.style.borderColor="#e8eaed"}
                                  />
                                  {/* زر إظهار/إخفاء */}
                                  <button type="button" onClick={() => setShowPin(v => !v)}
                                    style={{ position:"absolute" as const,left:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,padding:0,color:"#aaa",lineHeight:1 }}
                                    title={showPin ? "إخفاء" : "إظهار"}>
                                    {showPin ? "🙈" : "👁️"}
                                  </button>
                                </div>
                                <button type="button" onClick={genPin}
                                  style={{ padding:"0 14px",background:"rgba(14,124,106,.06)",color:"#0e7c6a",border:"1.5px solid rgba(14,124,106,.2)",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" as const }}>
                                  🎲 {ra.generate}
                                </button>
                              </div>
                              <p style={{ fontSize:11,color:"#aaa",marginTop:5,lineHeight:1.5 }}>⚠️ {ra.pinNote}</p>
                            </div>

                            {/* رابط الدخول — يظهر فقط بعد الحفظ */}
                            <div>
                              <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:.4 }}>
                                {ra.linkLabel}
                              </label>
                              {linkReady ? (
                                <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                                  <code style={{ flex:1,background:"#f7f9fc",padding:"10px 12px",borderRadius:10,fontSize:11,color:"#0e7c6a",fontFamily:"monospace",wordBreak:"break-all" as const,border:"1.5px solid rgba(14,124,106,.2)",lineHeight:1.5 }}>
                                    {restrictedLink}
                                  </code>
                                  <button type="button" onClick={copyRestrictedLink}
                                    style={{ padding:"10px 14px",background:copiedLink?"rgba(46,125,50,.08)":"rgba(14,124,106,.06)",color:copiedLink?"#2e7d32":"#0e7c6a",border:`1.5px solid ${copiedLink?"rgba(46,125,50,.2)":"rgba(14,124,106,.2)"}`,borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" as const,transition:"all .2s" }}>
                                    {copiedLink ? ra.copiedLink : ra.copyLink}
                                  </button>
                                </div>
                              ) : (
                                <div style={{ padding:"10px 14px",background:"rgba(230,126,34,.06)",border:"1.5px solid rgba(230,126,34,.2)",borderRadius:10,fontSize:12,color:"#e67e22",display:"flex",alignItems:"center",gap:8 }}>
                                  💾 {isAr ? "احفظ الإعدادات أولاً لتتمكن من نسخ الرابط" : "Save settings first to copy the link"}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"20px 26px",display:"flex",gap:10,marginTop:8,borderTop:"1.5px solid #eef0f3" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.25)",transition:"all .2s" }}>
            {saving?sm.saving:sm.save}
          </button>
          <button onClick={onClose}
            style={{ padding:"12px 20px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
            {sm.cancel}
          </button>
        </div>

        {/* Delete confirmation overlay */}
        {confirmDelete && (
          <div style={{ position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,.9)",backdropFilter:"blur(4px)",borderRadius:24 }}>
            <div style={{ textAlign:"center",padding:"40px 32px",maxWidth:340 }}>
              <div style={{ fontSize:48,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:18,fontWeight:800,color:"#353535",marginBottom:10 }}>{sm.deleteConfirmTitle}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6,marginBottom:24 }}>
                {sm.deleteConfirmMsg} <strong style={{ color:"#353535" }}>{clinic.name}</strong>؟<br/>
                <span style={{ color:"#c0392b",fontSize:12 }}>{sm.deleteConfirmWarning}</span>
              </p>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={handleDelete} disabled={actionLoading==="delete"}
                  style={{ flex:1,padding:"12px",background:actionLoading==="delete"?"#e57373":"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:actionLoading==="delete"?"not-allowed":"pointer" }}>
                  {actionLoading==="delete"?(isAr?"جاري الحذف...":"Deleting..."):sm.deleteConfirm}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={actionLoading==="delete"}
                  style={{ flex:1,padding:"12px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
                  {sm.deleteCancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Reset Password Modal ──────────────────────────────────
interface ResetPassModalProps {
  lang: Lang;
  clinic: ClinicData | null;
  onClose: () => void;
}

const ResetPassModal = ({ lang, clinic, onClose }: ResetPassModalProps) => {
  const tr = T[lang];
  const isAr = lang === "ar";
  const [pass,   setPass]   = useState(genPass());
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const copy = async () => {
    await navigator.clipboard.writeText(pass).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!clinic?.user_id) return;
    setSaving(true);
    try {
      const res  = await adminFetch("/api/update-clinic", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userId:      clinic.user_id,
          name:        clinic.name,
          owner:       clinic.owner,
          email:       clinic.email,
          phone:       clinic.phone,
          plan:        clinic.plan,
          expiry:      clinic.expiry,
          status:      clinic.status,
          newPassword: pass,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Error"); setSaving(false); return; }
      onClose();
    } catch {
      setError(isAr ? "خطأ في الاتصال" : "Connection error");
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)" }} />
      <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"28px",boxShadow:"0 24px 80px rgba(0,0,0,.15)",animation:"modalIn .25s ease" }}>
        <div style={{ textAlign:"center",marginBottom:20 }}>
          <div style={{ fontSize:36,marginBottom:12 }}>🔑</div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#353535" }}>{tr.passModal.title}</h3>
          <p style={{ fontSize:13,color:"#888",marginTop:6 }}>{clinic?.name}</p>
        </div>
        {error && <div style={{ fontSize:13,color:"#c0392b",marginBottom:12,textAlign:"center" }}>⚠️ {error}</div>}
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#555",marginBottom:8,textTransform:"uppercase",letterSpacing:.4 }}>
            {tr.passModal.newPass}
          </label>
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ flex:1,background:"#f7f9fc",borderRadius:10,padding:"11px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",border:"1.5px solid #eef0f3" }}>
              <code style={{ fontSize:14,color:"#0863ba",fontFamily:"monospace",letterSpacing:1 }}>{pass}</code>
            </div>
            <button onClick={copy} style={{ padding:"0 16px",background:copied?"rgba(46,125,50,.1)":"rgba(8,99,186,.08)",color:copied?"#2e7d32":"#0863ba",border:`1.5px solid ${copied?"rgba(46,125,50,.2)":"rgba(8,99,186,.2)"}`,borderRadius:10,cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:12,fontWeight:600 }}>
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>
        <button onClick={() => setPass(genPass())} style={{ width:"100%",marginBottom:12,padding:"10px",background:"#f7f9fc",color:"#666",border:"1.5px dashed #ddd",borderRadius:10,fontFamily:"Rubik,sans-serif",fontSize:13,cursor:"pointer" }}>
          🔄 {tr.passModal.generate}
        </button>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"12px",background:saving?"#93b8dc":"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer" }}>
            {saving ? tr.passModal.saving : tr.passModal.save}
          </button>
          <button onClick={onClose} style={{ flex:1,padding:"12px",background:"#f5f5f5",color:"#666",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>
            {tr.passModal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ============================================================
// ─── Data Tools: Export / Import ────────────────────────────
// ============================================================

// ── Export helpers ────────────────────────────────────────────
async function exportClinicData(clinic: ClinicData): Promise<Record<string, unknown>> {
  const userId = clinic.user_id!;

  const [{ data: patients }, { data: appointments }, { data: payments }] = await Promise.all([
    supabase.from("patients").select("*").eq("user_id", userId),
    supabase.from("appointments").select("*").eq("user_id", userId),
    supabase.from("payments").select("*").eq("user_id", userId),
  ]);

  return {
    _meta: {
      exported_at: new Date().toISOString(),
      clinic_name: clinic.name,
      clinic_id: userId,
      version: "1.0",
      source: "NABD",
    },
    clinic,
    patients: patients ?? [],
    appointments: appointments ?? [],
    payments: payments ?? [],
  };
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(patients: Record<string, unknown>[], filename: string) {
  if (!patients.length) return;
  const headers = ["mrn","name","phone","gender","date_of_birth","has_diabetes","has_hypertension","notes","created_at"];
  const rows = patients.map(p =>
    headers.map(h => {
      const v = p[h];
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Import helpers ────────────────────────────────────────────
interface ImportResult {
  patients: { new: number; updated: number; skipped: number };
  appointments: { new: number; skipped: number };
  payments: { new: number; skipped: number };
  errors: string[];
}

async function importClinicData(
  targetUserId: string,
  data: Record<string, unknown>
): Promise<ImportResult> {
  const result: ImportResult = {
    patients:     { new: 0, updated: 0, skipped: 0 },
    appointments: { new: 0, skipped: 0 },
    payments:     { new: 0, skipped: 0 },
    errors: [],
  };

  const patients     = (data.patients     as Record<string, unknown>[]) ?? [];
  const appointments = (data.appointments as Record<string, unknown>[]) ?? [];
  const payments     = (data.payments     as Record<string, unknown>[]) ?? [];

  // خريطة: old patient_id → new patient_id
  const patientIdMap: Record<number, number> = {};

  // ── استيراد المرضى ──────────────────────────────────────────
  for (const p of patients) {
    try {
      const phone = (p.phone as string | undefined)?.trim();
      if (!phone) { result.patients.skipped++; continue; }

      // جلب/إنشاء MRN مركزي
      let mrn: string = (p.mrn as string) || "";
      const { data: masterEx } = await supabase
        .from("master_patients")
        .select("mrn")
        .eq("phone", phone)
        .maybeSingle();

      if (masterEx?.mrn) {
        mrn = masterEx.mrn;
      } else if (!mrn) {
        const { data: masterIns } = await supabase
          .from("master_patients")
          .insert({ phone, name: p.name as string })
          .select("mrn")
          .single();
        mrn = masterIns?.mrn ?? `MRN-T-${Date.now()}`;
      }

      // هل يوجد مريض بنفس الهاتف في العيادة المستهدفة؟
      const { data: existingP } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("phone", phone)
        .maybeSingle();

      if (existingP) {
        patientIdMap[p.id as number] = existingP.id;
        result.patients.updated++;
      } else {
        const { data: inserted, error } = await supabase
          .from("patients")
          .insert({
            user_id:          targetUserId,
            name:             p.name as string,
            phone,
            gender:           p.gender || null,
            date_of_birth:    p.date_of_birth || null,
            has_diabetes:     p.has_diabetes ?? false,
            has_hypertension: p.has_hypertension ?? false,
            notes:            p.notes || null,
            is_hidden:        false,
            mrn,
          })
          .select("id")
          .single();

        if (error) { result.errors.push(`Patient ${p.name}: ${error.message}`); continue; }
        patientIdMap[p.id as number] = inserted.id;
        result.patients.new++;
      }
    } catch (e: unknown) {
      result.errors.push(`Patient error: ${e}`);
    }
  }

  // ── استيراد المواعيد ────────────────────────────────────────
  for (const a of appointments) {
    try {
      const newPatientId = patientIdMap[a.patient_id as number];
      if (!newPatientId) { result.appointments.skipped++; continue; }

      // تحقق من التكرار: نفس المريض + التاريخ + الوقت
      const { data: existingA } = await supabase
        .from("appointments")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("patient_id", newPatientId)
        .eq("date", a.date as string)
        .eq("time", a.time as string)
        .maybeSingle();

      if (existingA) { result.appointments.skipped++; continue; }

      const { error } = await supabase.from("appointments").insert({
        user_id:    targetUserId,
        patient_id: newPatientId,
        date:       a.date,
        time:       a.time,
        duration:   a.duration ?? 30,
        type:       a.type || null,
        notes:      a.notes || null,
        status:     a.status ?? "scheduled",
      });

      if (error) { result.errors.push(`Appointment error: ${error.message}`); continue; }
      result.appointments.new++;
    } catch (e: unknown) {
      result.errors.push(`Appointment error: ${e}`);
    }
  }

  // ── استيراد المدفوعات ────────────────────────────────────────
  for (const pay of payments) {
    try {
      const newPatientId = patientIdMap[pay.patient_id as number];
      if (!newPatientId) { result.payments.skipped++; continue; }

      const { error } = await supabase.from("payments").insert({
        user_id:     targetUserId,
        patient_id:  newPatientId,
        amount:      pay.amount,
        description: pay.description,
        method:      pay.method ?? "cash",
        date:        pay.date,
        status:      pay.status ?? "paid",
        notes:       pay.notes || null,
      });

      if (error) { result.errors.push(`Payment error: ${error.message}`); continue; }
      result.payments.new++;
    } catch (e: unknown) {
      result.errors.push(`Payment error: ${e}`);
    }
  }

  return result;
}

// ── DataToolsModal ─────────────────────────────────────────────
interface DataToolsModalProps {
  lang: Lang;
  clinics: ClinicData[];
  onClose: () => void;
}

const DataToolsModal = ({ lang, clinics, onClose }: DataToolsModalProps) => {
  const tr = T[lang];
  const dt = tr.dataTools;
  const isAr = lang === "ar";

  const [activeMode, setActiveMode]     = useState<"export" | "import">("export");
  const [selectedId,  setSelectedId]    = useState<string>("");
  const [exporting,   setExporting]     = useState(false);
  const [exportDone,  setExportDone]    = useState<"json"|"csv"|null>(null);

  // Import state
  const [importData,    setImportData]    = useState<Record<string, unknown> | null>(null);
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState<ImportResult | null>(null);
  const [importError,   setImportError]   = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const selectedClinic = clinics.find(c => c.user_id === selectedId);

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedClinic?.user_id) return;
    setExporting(true);
    try {
      const data = await exportClinicData(selectedClinic);
      const safeName = selectedClinic.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_");
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadJSON(data, `NABD_${safeName}_${date}.json`);
      } else {
        downloadCSV(data.patients as Record<string, unknown>[], `NABD_${safeName}_patients_${date}.csv`);
      }
      setExportDone(format);
      setTimeout(() => setExportDone(null), 3000);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".json")) { setImportError(isAr ? "يجب أن يكون الملف بصيغة JSON" : "File must be JSON format"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        setImportData(parsed);
        setImportError("");
        setImportResult(null);
      } catch {
        setImportError(isAr ? "الملف غير صالح" : "Invalid file");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedClinic?.user_id || !importData) return;
    setImporting(true);
    setImportError("");
    try {
      const result = await importClinicData(selectedClinic.user_id, importData);
      setImportResult(result);
    } catch (e: unknown) {
      setImportError(String(e));
    }
    setImporting(false);
  };

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: "1.5px solid #e8eaed",
    borderRadius: 10, fontFamily: "Rubik, sans-serif", fontSize: 13,
    color: "#353535", background: "#fafbfc", outline: "none",
    direction: isAr ? "rtl" : "ltr",
  };

  const meta = importData
    ? {
        patients:     ((importData.patients     as unknown[]) ?? []).length,
        appointments: ((importData.appointments as unknown[]) ?? []).length,
        payments:     ((importData.payments     as unknown[]) ?? []).length,
        clinicName:   (importData._meta as Record<string, string> | undefined)?.clinic_name ?? "—",
        exportedAt:   (importData._meta as Record<string, string> | undefined)?.exported_at?.slice(0, 10) ?? "—",
      }
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)" }} />
      <div style={{
        position: "relative", zIndex: 1, background: "#fff", borderRadius: 20,
        width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 32px 100px rgba(8,99,186,.2)",
        animation: "modalIn .25s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1.5px solid #eef0f3", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg,rgba(8,99,186,.04),transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "rgba(8,99,186,.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🗄️</div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#353535" }}>{dt.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "#f5f5f5", border: "none", cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#f7f9fc", margin: "16px 24px 0", borderRadius: 12, padding: 4 }}>
          {(["export","import"] as const).map(mode => (
            <button key={mode} onClick={() => setActiveMode(mode)} style={{
              flex: 1, padding: "9px", border: "none", borderRadius: 9, cursor: "pointer",
              fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: activeMode === mode ? 700 : 400,
              background: activeMode === mode ? "#fff" : "transparent",
              color: activeMode === mode ? "#0863ba" : "#888",
              boxShadow: activeMode === mode ? "0 2px 8px rgba(8,99,186,.1)" : "none",
              transition: "all .18s",
            }}>
              {mode === "export" ? `📤 ${dt.exportBtn}` : `📥 ${dt.importBtn}`}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* Clinic Selector — مشترك */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6, textTransform: "uppercase", letterSpacing: .4 }}>{dt.selectClinic}</label>
            <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setImportData(null); setImportResult(null); setImportError(""); }} style={{ ...inputSt, cursor: "pointer" }}>
              <option value="">{dt.selectClinic}...</option>
              {clinics.filter(c => c.user_id).map(c => (
                <option key={c.user_id} value={c.user_id!}>{c.name} — {c.email}</option>
              ))}
            </select>
          </div>

          {/* ── EXPORT MODE ── */}
          {activeMode === "export" && (
            <div>
              {!selectedId ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
                  <div style={{ fontSize: 13 }}>{dt.noClinicSelected}</div>
                </div>
              ) : (
                <div>
                  <div style={{ background: "rgba(8,99,186,.04)", border: "1.5px solid rgba(8,99,186,.1)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#353535", marginBottom: 4 }}>{selectedClinic?.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{selectedClinic?.email}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {isAr ? "الخطة:" : "Plan:"} {selectedClinic?.plan} &nbsp;|&nbsp;
                      {isAr ? "الحالة:" : "Status:"} {selectedClinic?.status}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      onClick={() => handleExport("json")}
                      disabled={exporting}
                      style={{ padding: "14px", background: exportDone === "json" ? "rgba(46,125,50,.08)" : "rgba(8,99,186,.06)", color: exportDone === "json" ? "#2e7d32" : "#0863ba", border: `1.5px solid ${exportDone === "json" ? "rgba(46,125,50,.2)" : "rgba(8,99,186,.2)"}`, borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                      {exportDone === "json" ? "✓" : "📄"} {exportDone === "json" ? dt.exportSuccess : dt.exportJSON}
                    </button>
                    <button
                      onClick={() => handleExport("csv")}
                      disabled={exporting}
                      style={{ padding: "14px", background: exportDone === "csv" ? "rgba(46,125,50,.08)" : "rgba(46,125,50,.06)", color: exportDone === "csv" ? "#2e7d32" : "#2e7d32", border: `1.5px solid ${exportDone === "csv" ? "rgba(46,125,50,.3)" : "rgba(46,125,50,.2)"}`, borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                      {exportDone === "csv" ? "✓" : "📊"} {exportDone === "csv" ? dt.exportSuccess : dt.exportCSV}
                    </button>
                  </div>

                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#f7f9fc", borderRadius: 10, border: "1.5px solid #eef0f3", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
                    <strong style={{ color: "#353535" }}>JSON:</strong> {isAr ? "يشمل المرضى + المواعيد + المدفوعات كاملاً (للاستيراد لاحقاً)" : "Includes patients + appointments + payments (for re-import)"}<br />
                    <strong style={{ color: "#353535" }}>CSV:</strong> {isAr ? "قائمة المرضى فقط — مناسب لـ Excel" : "Patients list only — suitable for Excel"}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── IMPORT MODE ── */}
          {activeMode === "import" && (
            <div>
              {!selectedId ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏥</div>
                  <div style={{ fontSize: 13 }}>{dt.noClinicSelected}</div>
                </div>
              ) : importResult ? (
                // نتيجة الاستيراد
                <div>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#2e7d32" }}>{dt.importSuccess}</h3>
                  </div>
                  {[
                    { icon: "👥", label: isAr ? "المرضى" : "Patients",     r: importResult.patients,     hasUpdated: true },
                    { icon: "📅", label: isAr ? "المواعيد" : "Appointments", r: importResult.appointments, hasUpdated: false },
                    { icon: "💳", label: isAr ? "المدفوعات" : "Payments",    r: importResult.payments,     hasUpdated: false },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f7f9fc", borderRadius: 10, marginBottom: 8, border: "1.5px solid #eef0f3" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#353535" }}>{s.label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(46,125,50,.1)", color: "#2e7d32", fontWeight: 700 }}>+{s.r.new} {dt.importNew}</span>
                        {s.hasUpdated && (s.r as typeof importResult.patients).updated > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(8,99,186,.1)", color: "#0863ba", fontWeight: 700 }}>{(s.r as typeof importResult.patients).updated} {dt.importUpdated}</span>}
                        {(s.r.skipped) > 0 && <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "rgba(136,136,136,.1)", color: "#888", fontWeight: 700 }}>{s.r.skipped} {dt.importSkipped}</span>}
                      </div>
                    </div>
                  ))}
                  {importResult.errors.length > 0 && (
                    <div style={{ background: "rgba(192,57,43,.06)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#c0392b", marginBottom: 6 }}>⚠️ {importResult.errors.length} {isAr ? "خطأ" : "error(s)"}</div>
                      {importResult.errors.slice(0, 3).map((e, i) => <div key={i} style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>• {e}</div>)}
                    </div>
                  )}
                  <button onClick={() => { setImportResult(null); setImportData(null); }} style={{ width: "100%", marginTop: 16, padding: "11px", background: "#f7f9fc", border: "1.5px solid #eef0f3", borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 13, color: "#666", cursor: "pointer" }}>
                    {dt.close}
                  </button>
                </div>
              ) : (
                <div>
                  {/* Drop zone */}
                  {!importData ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                      onClick={() => fileRef.current?.click()}
                      style={{ border: `2px dashed ${dragOver ? "#0863ba" : "#c8d4e0"}`, borderRadius: 14, padding: "32px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(8,99,186,.04)" : "#fafbfc", transition: "all .2s", marginBottom: 16 }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
                      <div style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>{dt.importDropzone}</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>NABD JSON</div>
                    </div>
                  ) : (
                    // معاينة
                    <div style={{ background: "#f7f9fc", borderRadius: 12, padding: "16px", border: "1.5px solid #eef0f3", marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0863ba", marginBottom: 10, textTransform: "uppercase", letterSpacing: .4 }}>📋 {dt.importPreview}</div>
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                        {isAr ? "المصدر:" : "Source:"} <strong style={{ color: "#353535" }}>{meta?.clinicName}</strong>
                        &nbsp;|&nbsp; {isAr ? "تاريخ:" : "Date:"} <strong style={{ color: "#353535" }}>{meta?.exportedAt}</strong>
                      </div>
                      {[
                        { icon: "👥", count: meta?.patients, label: isAr ? `${dt.importPatients}` : dt.importPatients },
                        { icon: "📅", count: meta?.appointments, label: isAr ? `${dt.importAppointments}` : dt.importAppointments },
                        { icon: "💳", count: meta?.payments, label: isAr ? `${dt.importPayments}` : dt.importPayments },
                      ].map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span>{s.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0863ba" }}>{s.count}</span>
                          <span style={{ fontSize: 12, color: "#888" }}>{s.label}</span>
                        </div>
                      ))}
                      <button onClick={() => setImportData(null)} style={{ marginTop: 8, padding: "6px 12px", background: "#fff", border: "1.5px solid #eef0f3", borderRadius: 8, fontFamily: "Rubik,sans-serif", fontSize: 11, color: "#888", cursor: "pointer" }}>
                        ✕ {isAr ? "تغيير الملف" : "Change file"}
                      </button>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                  {importError && <div style={{ background: "rgba(192,57,43,.06)", border: "1.5px solid rgba(192,57,43,.15)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c0392b", marginBottom: 12 }}>⚠️ {importError}</div>}

                  {importData && (
                    <div style={{ background: "rgba(230,126,34,.06)", border: "1.5px solid rgba(230,126,34,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#666", marginBottom: 14, lineHeight: 1.7 }}>
                      ⚠️ {isAr
                        ? `سيتم استيراد البيانات إلى عيادة: ${selectedClinic?.name}. المرضى الموجودون بنفس الهاتف لن يُكرَّروا.`
                        : `Data will be imported into: ${selectedClinic?.name}. Existing patients with same phone will not be duplicated.`}
                    </div>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={!importData || importing}
                    style={{ width: "100%", padding: "13px", background: importData && !importing ? "#0863ba" : "#ccc", color: "#fff", border: "none", borderRadius: 12, fontFamily: "Rubik,sans-serif", fontSize: 14, fontWeight: 700, cursor: importData && !importing ? "pointer" : "not-allowed", boxShadow: importData ? "0 4px 16px rgba(8,99,186,.25)" : "none", transition: "all .2s" }}>
                    {importing ? `⏳ ${dt.importing}` : `📥 ${dt.importStart}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── بيانات دخول المدير — مستقلة تماماً عن Supabase ────────
// ============================================================
// ── Admin API helper ────────────────────────────────────────
// ── Admin API helper — يُرسل x-admin-secret من server env فقط ─
// الـ secret لم يعد NEXT_PUBLIC — يُرسَل عبر الـ cookie بدلاً منه
const adminFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include", // يُرسل الـ httpOnly cookie تلقائياً
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (res.status === 401) {
    // الجلسة انتهت — أعد تحميل الصفحة لإظهار شاشة تسجيل الدخول
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }
  return res;
};

// SESSION_KEY لا يزال مستخدماً لتتبع حالة الـ auth في client بعد التحقق
const SESSION_KEY = "__nabd_admin_auth__";

// ─── شاشة تسجيل دخول المدير ──────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ── فحص القفل المؤقت ──────────────────────────────────
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`محاولات كثيرة. انتظر ${remaining} ثانية.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin-login", {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        // حفظ flag بسيط في sessionStorage فقط للـ UI state (ليس للتحقق الأمني)
        sessionStorage.setItem(SESSION_KEY, "1");
        setAttempts(0);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          const lockDuration = Math.min(newAttempts * 30, 300) * 1000;
          setLockedUntil(Date.now() + lockDuration);
          setError(`تم قفل الدخول لمدة ${lockDuration / 1000} ثانية بسبب المحاولات المتعددة.`);
        } else {
          setError(`اسم المستخدم أو كلمة المرور غير صحيحة. (${5 - newAttempts} محاولات متبقية)`);
        }
        setPassword("");
      }
    } catch {
      setError("خطأ في الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f0f4ff}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
        .login-card{animation:fadeUp .5s cubic-bezier(.4,0,.2,1) both}
        .login-input{
          width:100%;padding:12px 16px;
          border:1.5px solid #e8eaed;border-radius:12px;
          font-family:'Rubik',sans-serif;font-size:14px;
          color:#353535;background:#fff;outline:none;
          transition:border .2s,box-shadow .2s;
        }
        .login-input:focus{border-color:#0863ba;box-shadow:0 0 0 3px rgba(8,99,186,.08)}
        .login-btn{
          width:100%;padding:13px;background:#0863ba;color:#fff;
          border:none;border-radius:12px;font-family:'Rubik',sans-serif;
          font-size:15px;font-weight:700;cursor:pointer;
          transition:all .2s;box-shadow:0 4px 16px rgba(8,99,186,.3);
        }
        .login-btn:hover:not(:disabled){background:#0752a0;box-shadow:0 6px 20px rgba(8,99,186,.4);transform:translateY(-1px)}
        .login-btn:active:not(:disabled){transform:translateY(0)}
        .login-btn:disabled{background:#93b8dc;cursor:not-allowed;box-shadow:none}
        .error-box{animation:shake .4s ease}
      `}</style>

      <div style={{
        minHeight:"100vh", background:"linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 50%,#f5f0ff 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Rubik',sans-serif", padding:"20px",
      }}>
        {/* خلفية زخرفية */}
        <div style={{ position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:"-10%",right:"-5%",width:400,height:400,borderRadius:"50%",background:"rgba(8,99,186,.06)",filter:"blur(60px)" }}/>
          <div style={{ position:"absolute",bottom:"-10%",left:"-5%",width:500,height:500,borderRadius:"50%",background:"rgba(123,45,139,.04)",filter:"blur(80px)" }}/>
        </div>

        <div className="login-card" style={{
          background:"#fff", borderRadius:24, width:"100%", maxWidth:400,
          padding:"40px 36px", boxShadow:"0 24px 80px rgba(8,99,186,.12)",
          border:"1.5px solid rgba(8,99,186,.08)", position:"relative",
        }}>
          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:32 }}>
            <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:72,height:72,background:"rgba(8,99,186,.06)",borderRadius:20,marginBottom:14,border:"1.5px solid rgba(8,99,186,.1)" }}>
              <svg viewBox="0 0 337.74 393.31" style={{ width:48,height:48 }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="lg-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse"><stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/></linearGradient>
                  <linearGradient id="lg-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/></linearGradient>
                </defs>
                <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
                <path fill="url(#lg-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
                <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
                <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
                <path fill="url(#lg-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
              </svg>
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:"#353535", marginBottom:4 }}>نبض</h1>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              background:"rgba(8,99,186,.06)", border:"1.5px solid rgba(8,99,186,.12)",
              borderRadius:20, padding:"4px 12px",
            }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#0863ba", letterSpacing:.5 }}>ADMIN ACCESS</span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* خطأ */}
            {error && (
              <div className="error-box" style={{
                background:"rgba(192,57,43,.06)", border:"1.5px solid rgba(192,57,43,.2)",
                borderRadius:10, padding:"10px 14px", fontSize:13, color:"#c0392b",
                textAlign:"center", fontWeight:500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* اسم المستخدم */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                اسم المستخدم
              </label>
              <input
                className="login-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                autoFocus
                required
                style={{ direction:"ltr" }}
              />
            </div>

            {/* كلمة المرور */}
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#666", marginBottom:7, textTransform:"uppercase", letterSpacing:.5 }}>
                كلمة المرور
              </label>
              <div style={{ position:"relative" }}>
                <input
                  className="login-input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                  style={{ direction:"ltr", paddingRight:44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16,
                    color:"#aaa", display:"flex", alignItems:"center",
                  }}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* زر الدخول */}
            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop:6 }}>
              {loading ? (
                <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 1s linear infinite" }}/>
                  جاري التحقق...
                </span>
              ) : "دخول لوحة المدير →"}
            </button>
          </form>

          <p style={{ textAlign:"center", fontSize:11, color:"#ccc", marginTop:24 }}>
            هذه الصفحة مخصصة للمدير فقط
          </p>
        </div>
      </div>
    </>
  );
}

// ─── الصفحة الرئيسية ──────────────────────────────────────
export default function AdminPage() {
  // ── التحقق من جلسة المدير — يجب أن يكون أول شيء ──────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // التحقق من الجلسة عبر الـ server (httpOnly cookie)
    fetch("/api/admin-check", { credentials: "include" })
      .then(r => setIsAuthenticated(r.ok))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin-logout", { method: "POST", credentials: "include" })
      .catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  // ── كل الـ state الخاص بصفحة الأدمن (دائماً في نفس الترتيب) ─
  const [lang, setLang] = useState<Lang>("ar");
  const isAr = lang === "ar";
  const tr   = T[lang];

  const [activeTab,    setActiveTab]    = useState("clinics");
  const [clinics,      setClinics]      = useState<ClinicData[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("all");
  const [addModal,     setAddModal]     = useState(false);
  const [editClinic,   setEditClinic]   = useState<ClinicData | null>(null);
  const [deleteClinic, setDeleteClinic] = useState<ClinicData | null>(null);
  const [resetClinic,  setResetClinic]  = useState<ClinicData | null>(null);
  const [subClinic,    setSubClinic]    = useState<ClinicData | null>(null);
  const [infoClinic,   setInfoClinic]   = useState<ClinicData | null>(null);
  const [openMenuId,   setOpenMenuId]   = useState<number | null>(null);
  const [msgClinic,        setMsgClinic]        = useState<ClinicData|null>(null);
  const [msgBody,          setMsgBody]          = useState("");
  const [msgTemplate,      setMsgTemplate]      = useState("custom");
  const [msgSending,       setMsgSending]       = useState(false);
  const [msgSuccess,       setMsgSuccess]       = useState(false);
  const [msgUnread,        setMsgUnread]        = useState<Record<string,number>>({});
  const [msgHistory,       setMsgHistory]       = useState<Array<{id:number;from_id:string;to_id:string;from_role:"admin"|"doctor";body:string;is_read:boolean;created_at:string;expires_at:string}>>([]);
  const [msgHistoryLoading,setMsgHistoryLoading]= useState(false);
  const [msgView,          setMsgView]          = useState<"compose"|"history">("history");
  const msgBottomRef = useRef<HTMLDivElement>(null);

  // ── إرسال رسالة للطبيب ─────────────────────────────────
  const getMsgTemplate = (t: string, clinicName: string) => {
    const temps: Record<string,string> = {
      welcome: `مرحباً ${clinicName}،\nنرحب بانضمامك لمنصة نبض. يسعدنا خدمتك وتوفير أفضل تجربة لإدارة عيادتك.\n\nفريق نبض 💙`,
      expiry:  `عزيزي ${clinicName}،\nاشتراكك في منصة نبض سينتهي قريباً. يرجى التواصل معنا للتجديد.\n\nفريق نبض 💙`,
      custom:  "",
    };
    return temps[t] ?? "";
  };

  // تحميل تاريخ المحادثة مع عيادة معينة — عبر API بصلاحية service_role
  // (الأدمن ليس مستخدم Supabase Auth، لذا لا يمكن الاعتماد على auth.uid()/RLS هنا)
  const loadMsgHistory = async (clinicUserId: string) => {
    setMsgHistoryLoading(true);
    try {
      const res = await adminFetch(`/api/admin-messages?clinicUserId=${clinicUserId}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setMsgHistory(data ?? []);
    } catch (e) { console.error("loadMsgHistory:", e); }
    setMsgHistoryLoading(false);
    setMsgUnread(prev => ({ ...prev, [clinicUserId]: 0 }));
    setTimeout(() => { msgBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, 150);
  };

  // تحميل عدّاد الرسائل غير المقروءة لكل العيادات (polling)
  const loadAllUnread = async () => {
    try {
      const res = await adminFetch("/api/admin-messages", { method: "PATCH", cache: "no-store" });
      if (res.ok) {
        const counts = await res.json();
        setMsgUnread(counts ?? {});
      }
    } catch (e) { console.error("loadAllUnread:", e); }
  };

  // Polling: تحديث العداد كل 15 ثانية + تحديث المحادثة المفتوحة إن وُجدت
  useEffect(() => {
    if (!isAuthenticated) return; // لا نستدعي الـ API قبل التأكد من الجلسة — لتفادي حلقة 401 → reload
    loadAllUnread();
    const interval = setInterval(() => {
      loadAllUnread();
      setMsgClinic(current => {
        if (current?.user_id) loadMsgHistory(current.user_id);
        return current;
      });
    }, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSendMessage = async () => {
    if (!msgClinic?.user_id || !msgBody.trim()) return;
    setMsgSending(true);
    try {
      const bodyText = msgBody.trim();
      const res = await adminFetch("/api/admin-messages", {
        method: "POST",
        body: JSON.stringify({ clinicUserId: msgClinic.user_id, body: bodyText }),
      });
      if (res.ok) {
        setMsgSuccess(true); setMsgBody(""); setMsgTemplate("custom");
        fetch("/api/push", { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ user_id: msgClinic.user_id, title:"💬 رسالة جديدة من نبض", body: bodyText.slice(0,80), url:"/messages" }) });
        await loadMsgHistory(msgClinic.user_id);
        setTimeout(() => setMsgSuccess(false), 3000);
      }
    } catch(e) { console.error(e); }
    setMsgSending(false);
  };

  const [dataToolsModal, setDataToolsModal] = useState(false);
  const [accountFilter, setAccountFilter] = useState<"all"|"clinic"|"pharmacy">("all");
  const [currentPage,   setCurrentPage]   = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => { if (isAuthenticated) loadClinics(); }, [isAuthenticated]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      // نستخدم API route بدلاً من Supabase مباشرة
      // لأن الأدمن ليس مسجلاً عبر Supabase Auth وRLS تمنع القراءة المباشرة
      const res = await adminFetch("/api/get-clinics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      const clinicsData: ClinicData[] = (data || []).map((row: Record<string, unknown>, index: number) => ({
        id:           (row.id as number) || index + 1,
        user_id:      row.user_id as string,
        name:         (row.name as string)   || `عيادة ${index + 1}`,
        owner:        (row.owner as string)  || "—",
        email:        (row.email as string)  || "",
        phone:        (row.phone as string)  || "",
        plan:         (row.plan as PlanType) || "basic",
        expiry:       (row.expiry as string) || "",
        status:       (row.status as "active"|"inactive"|"expired") || "active",
        clinic_type:  (row.clinic_type as ClinicType) || "general",
        account_type: (row.account_type as AccountType) || "clinic",
        max_doctors:  (row.max_doctors as number) || undefined,
        doctors_count:(row.doctors_count as number) || undefined,
        payments_lock_enabled:  (row.payments_lock_enabled as boolean) ?? false,
        payments_lock_password: (row.payments_lock_password as string) || "",
        restricted_access_enabled: (row.restricted_access_enabled as boolean) ?? false,
        restricted_access_pin:     (row.restricted_access_pin as string) || "",
      }));

      setClinics(clinicsData);
    } catch (err) {
      console.error("Error loading clinics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // ── مزامنة subClinic مع أحدث بيانات من القائمة ─────────────
  // عند تغيير status (تجميد/رفع تجميد) يُحدَّث subClinic تلقائياً
  useEffect(() => {
    if (!subClinic) return;
    const updated = clinics.find(c => c.user_id === subClinic.user_id);
    if (updated) setSubClinic(updated);
  }, [clinics]);

  const fmtDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(isAr ? "ar-SA-u-ca-gregory" : "en-US", { year:"numeric", month:"short", day:"numeric" });
  };
  const isExpiringSoon = (d: string) => {
    const diff = new Date(d).getTime() - new Date().getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (d: string) => d && new Date(d) < new Date();

  const fmtDateEn = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email).catch(() => {});
  };

  // نقطة الحالة: أصفر=نشط، أخضر=محمد(مدفوع ونشط أكثر من شهر)، أحمر=منتهي، رمادي=قارب
  const statusDot = (c: ClinicData) => {
    if (isExpired(c.expiry))           return { color:"#c0392b", title: isAr?"منتهية":"Expired" };
    if (isExpiringSoon(c.expiry))      return { color:"#aaa",    title: isAr?"قاربت على الانتهاء":"Expiring soon" };
    if (c.status === "inactive")       return { color:"#e67e22", title: isAr?"معلّق":"Suspended" };
    if (c.status === "active") {
      const diff = new Date(c.expiry).getTime() - new Date().getTime();
      if (diff > 30 * 24 * 60 * 60 * 1000) return { color:"#27ae60", title: isAr?"نشط":"Active" };
      return { color:"#f1c40f", title: isAr?"نشط":"Active" };
    }
    return { color:"#aaa", title: "" };
  };

  const filtered = useMemo(() => clinics.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.owner.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active"   && c.status !== "active")   return false;
    if (filter === "inactive" && c.status !== "inactive") return false;
    if (accountFilter === "clinic"   && c.account_type !== "clinic"   && c.account_type !== undefined) return false;
    if (accountFilter === "pharmacy" && c.account_type !== "pharmacy") return false;
    return true;
  }), [clinics, search, filter, accountFilter]);

  // ── إعادة الصفحة لـ 1 عند أي تغيير في البحث أو الفلاتر ────
  useEffect(() => { setCurrentPage(1); }, [search, filter, accountFilter]);

  const totalPages      = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedClinics = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total:      clinics.length,
    clinics:    clinics.filter(c => c.account_type !== "pharmacy").length,
    pharmacies: clinics.filter(c => c.account_type === "pharmacy").length,
    active:     clinics.filter(c => c.status === "active").length,
    frozen:     clinics.filter(c => c.status === "inactive").length,
    expired:    clinics.filter(c => isExpired(c.expiry)).length,
    expiringSoon: clinics.filter(c => {
      const d = new Date(c.expiry);
      const n = new Date();
      return (d.getTime() - n.getTime()) < 30 * 24 * 60 * 60 * 1000 && d > n;
    }).length,
  }), [clinics]);

  // ── العيادات التي ينتهي اشتراكها خلال أسبوع (لبطاقة التذكير) ──
  const expiringWithinWeek = useMemo(() => clinics.filter(c => {
    if (!c.expiry) return false;
    const diff = new Date(c.expiry).getTime() - new Date().getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime()), [clinics]);

  const [expiryCardIndex, setExpiryCardIndex] = useState(0);
  useEffect(() => {
    if (expiringWithinWeek.length < 2) return;
    const t = setInterval(() => {
      setExpiryCardIndex(i => (i + 1) % expiringWithinWeek.length);
    }, 4000);
    return () => clearInterval(t);
  }, [expiringWithinWeek.length]);
  useEffect(() => { setExpiryCardIndex(0); }, [expiringWithinWeek.length]);

  const toggleStatus = async (clinic: ClinicData) => {
    if (!clinic.user_id) return;
    const newStatus = clinic.status === "active" ? "inactive" : "active";
    await adminFetch("/api/update-clinic", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userId: clinic.user_id, ...clinic, status: newStatus }),
    });
    loadClinics();
  };

  const handleDelete = async () => {
    if (!deleteClinic?.user_id) return;
    try {
      const res = await adminFetch("/api/delete-clinic", {
        method:  "POST",
        headers: {"Content-Type":"application/json"},
        body:    JSON.stringify({ userId: deleteClinic.user_id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error("delete failed:", json.error);
        return;
      }
    } catch (err) {
      console.error("delete-clinic error:", err);
      return;
    }
    setDeleteClinic(null);
    loadClinics();
  };


  // ── بوابة المصادقة — بعد كل الـ hooks ─────────────────────
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f7f9fc" }}>
        <div style={{ width:36,height:36,border:"3px solid #eef0f3",borderTopColor:"#0863ba",borderRadius:"50%",animation:"spin 1s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@300..800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Rubik',sans-serif;background:#f7f9fc;color:#353535}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:10px}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .page-anim{animation:fadeUp .4s ease both}
        .admin-row{border-bottom:1px solid #eef0f3;transition:background .15s}
        .admin-row:last-child{border-bottom:none}
        .admin-row:hover{background:#f7f9fc}
        .tab-btn{padding:10px 20px;border-radius:10px;border:none;cursor:pointer;font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;transition:all .2s}
        .tab-btn.active{background:rgba(8,99,186,.08);color:#0863ba;font-weight:700}
        .tab-btn:not(.active){background:transparent;color:#888}
        .tab-btn:not(.active):hover{background:rgba(8,99,186,.04);color:#666}
        .icon-btn-dark{width:32px;height:32px;border-radius:8px;border:1.5px solid #eef0f3;background:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .15s;color:#aaa;flex-shrink:0}
        .icon-btn-dark:hover{border-color:#0863ba;background:rgba(8,99,186,.06);color:#0863ba}
        .icon-btn-dark.msg:hover{border-color:#8e44ad;background:rgba(142,68,173,.06);color:#8e44ad}
        .icon-btn-dark.edit:hover{border-color:#2980b9;background:rgba(41,128,185,.06);color:#2980b9}
        .icon-btn-dark.more:hover{border-color:#666;background:#f7f9fc;color:#666}
        .filter-chip-dark{padding:6px 14px;border-radius:20px;border:1.5px solid #eef0f3;background:transparent;cursor:pointer;font-size:12px;font-family:'Rubik',sans-serif;color:#888;transition:all .2s}
        .filter-chip-dark.active{background:rgba(8,99,186,.08);color:#0863ba;border-color:rgba(8,99,186,.2)}
        .filter-chip-dark:hover:not(.active){border-color:#ccc;color:#666}
        .stat-dark{background:#fff;border-radius:16px;padding:18px 20px;border:1.5px solid #eef0f3;position:relative;overflow:hidden;box-shadow:0 2px 12px rgba(8,99,186,.05)}
        .dropdown-dark{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(8,99,186,.12);border:1.5px solid #eef0f3;min-width:170px;z-index:100;overflow:hidden;animation:modalIn .18s ease}
        .dropdown-dark-item{padding:10px 16px;font-size:13px;color:#666;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background .12s;font-family:'Rubik',sans-serif}
        .dropdown-dark-item:hover{background:#f7f9fc;color:#353535}
        .dropdown-dark-item.danger:hover{background:rgba(192,57,43,.06);color:#c0392b}
        .email-copy{cursor:pointer;transition:color .15s}
        .email-copy:hover{color:#0863ba !important}
        /* ── Mobile ── */
        @media(max-width:768px){
          .admin-sidebar{display:none !important}
          .admin-main{margin-left:0 !important;margin-right:0 !important;padding:12px !important}
          .admin-topbar{padding:12px 16px !important}
          .stats-grid{grid-template-columns:repeat(2,1fr) !important;gap:10px !important}
          .admin-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .admin-row-grid{grid-template-columns:1fr auto !important}
          .admin-row-desktop{display:none !important}
          .admin-row-mobile{display:flex !important}
          .admin-header-row{display:none !important}
          .search-filter-wrap{flex-direction:column !important;gap:8px !important}
          .filter-chips-wrap{flex-wrap:wrap !important}
          .topbar-actions{gap:8px !important}
          .topbar-actions button{padding:8px 12px !important;font-size:12px !important}
        }
        @media(min-width:769px){
          .admin-row-mobile{display:none !important}
        }
      `}</style>

      <div style={{ fontFamily:"'Rubik',sans-serif",direction:isAr?"rtl":"ltr",minHeight:"100vh",background:"#f7f9fc",display:"flex" }}>

        {/* ── SIDEBAR ── */}
        <aside className="admin-sidebar" style={{ width:220,minHeight:"100vh",background:"#fff",borderRight:isAr?"none":"1.5px solid #eef0f3",borderLeft:isAr?"1.5px solid #eef0f3":"none",display:"flex",flexDirection:"column",position:"fixed",top:0,[isAr?"right":"left"]:0,zIndex:50,boxShadow:"4px 0 24px rgba(8,99,186,.06)" }}>
          <div style={{ padding:"24px 20px",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg viewBox="0 0 337.74 393.31" style={{ width:36,height:36 }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="adm-g1" x1="117.2" y1="92.34" x2="173.01" y2="298.39" gradientUnits="userSpaceOnUse"><stop offset=".3" stopColor="#0863ba"/><stop offset=".69" stopColor="#5694cf"/></linearGradient>
                    <linearGradient id="adm-g2" x1="63.56" y1="273.08" x2="60.16" y2="299.2" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#5694cf"/><stop offset=".68" stopColor="#a4c4e4"/></linearGradient>
                  </defs>
                  <path fill="#0863ba" d="m322.06,369.99c-6.96,5.15-15.03,7.61-23.01,7.61-12.82,0-25.43-6.35-32.83-18.11l-78.44-124.68-39.05-62.08-47.8-75.98-15.33-40.6c-7.85-20.79,2.07-44.07,22.51-52.81,5.3-2.26,10.83-3.34,16.29-3.34,14.45,0,28.35,7.56,35.97,20.77l172.2,298.76c9.82,17.05,5.3,38.75-10.5,50.46Z"/>
                  <path fill="url(#adm-g1)" d="m189.28,293.99l-33.2-51.2-55.14-146.04,47.8,75.98c-1.84-2.91-6.32-.67-5.08,2.56l45.63,118.7Z"/>
                  <path fill="#5694cf" d="m185.86,389.39c-5.59,2.65-11.5,3.92-17.34,3.92-13.78,0-27.13-7.06-34.68-19.55l-61.93-102.47-32.7-54.12h0s-7.83-28.09-7.83-28.09c-5-17.95,3.54-36.92,20.31-45.06,5.41-2.62,11.16-3.88,16.84-3.88,12.72,0,25.06,6.29,32.39,17.59l5.4,8.33,49.76,76.72,33.2,51.2,17.02,44.27c7.6,19.77-1.31,42.05-20.44,51.13Z"/>
                  <path fill="#a4c4e4" d="m80.71,366.11c-5.52,11.03-15.78,19.61-28.83,22.5-3.09.68-6.18,1.01-9.22,1.01-19.34,0-36.81-13.28-41.37-32.89-.87-3.75-1.29-7.49-1.29-11.19,0-22.04,14.91-42.06,37.18-47.68l22.9-5.79,20.63,74.04Z"/>
                  <path fill="url(#adm-g2)" d="m80.71,366.11l-20.63-74.04-20.88-74.9,32.7,54.12c-1.71-2.84-6.08-.97-5.2,2.23l17,62.43c2.86,10.52,1.52,21.16-2.99,30.16Z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize:16,fontWeight:800,color:"#0863ba",lineHeight:1.1 }}>{tr.appName}</div>
                <div style={{ fontSize:9,color:"#aaa",fontWeight:400,letterSpacing:.5,textTransform:"uppercase" }}>{tr.adminBadge}</div>
              </div>
            </div>
            <div style={{ background:"rgba(8,99,186,.06)",border:"1.5px solid rgba(8,99,186,.12)",borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#0863ba",animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>Admin Access</span>
            </div>
          </div>

          <nav style={{ flex:1,padding:"16px 12px" }}>
            {Object.entries(tr.nav).map(([k, v]) => {
              const icons = { clinics:"🏥" };
              const isActive = activeTab === k;
              return (
                <button key={k} onClick={() => setActiveTab(k)}
                  style={{ width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,marginBottom:4,border:"none",cursor:"pointer",background:isActive?"rgba(8,99,186,.08)":"transparent",color:isActive?"#0863ba":"#666",fontWeight:isActive?600:400,fontSize:13,fontFamily:"Rubik,sans-serif",transition:"all .18s",textAlign:isAr?"right":"left" }}>
                  <span style={{ fontSize:16 }}>{icons[k as keyof typeof icons]}</span>
                  <span style={{ flex:1 }}>{v}</span>
                  {k === "clinics" && <span style={{ fontSize:11,background:"rgba(8,99,186,.08)",color:"#0863ba",padding:"2px 8px",borderRadius:20 }}>{clinics.length}</span>}
                </button>
              );
            })}
          </nav>

          <div style={{ padding:"16px",borderTop:"1.5px solid #eef0f3" }}>
            <div style={{ fontSize:11,color:"#aaa",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:12 }}>{tr.systemInfo}</div>
            {[
              { l: tr.version,    v: "1.0.0" },
              { l: tr.lastBackup, v: isAr ? "منذ ساعة" : "1h ago" },
              { l: tr.uptime,     v: "99.9%" },
            ].map(s => (
              <div key={s.l} style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontSize:11,color:"#aaa" }}>{s.l}</span>
                <span style={{ fontSize:11,color:"#0863ba",fontWeight:600 }}>{s.v}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                style={{ width:"100%",padding:"7px",background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#666",transition:"all .2s",marginBottom:8 }}>
                🌐 {lang === "ar" ? "English" : "العربية"}
              </button>
              <button onClick={handleLogout}
                style={{ width:"100%",padding:"7px",background:"rgba(192,57,43,.06)",border:"1.5px solid rgba(192,57,43,.15)",borderRadius:8,cursor:"pointer",fontSize:11,fontFamily:"Rubik,sans-serif",color:"#c0392b" }}>
                → {tr.signOut}
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="page-anim admin-main" style={{ [isAr?"marginRight":"marginLeft"]:220,flex:1,padding:"0 32px 48px",minHeight:"100vh" }}>

          {/* TOP BAR */}
          <div className="admin-topbar" style={{ position:"sticky",top:0,zIndex:40,background:"rgba(247,249,252,.95)",backdropFilter:"blur(12px)",padding:"16px 0",borderBottom:"1.5px solid #eef0f3" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontSize:20,fontWeight:800,color:"#353535" }}>
                  {tr.clinics.title}
                </h1>
                <p style={{ fontSize:12,color:"#aaa",marginTop:2 }}>
                  {`${stats.active} ${isAr?"نشط من":"active of"} ${stats.total} · 🏥 ${stats.clinics} ${isAr?"عيادة":"clinics"} · 💊 ${stats.pharmacies} ${isAr?"صيدلية":"pharmacies"}`}
                </p>
              </div>
              {activeTab === "clinics" && (
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={() => setDataToolsModal(true)}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 18px",background:"#fff",color:"#0863ba",border:"1.5px solid rgba(8,99,186,.2)",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .2s" }}>
                    🗄️ {isAr ? "أدوات البيانات" : "Data Tools"}
                  </button>
                  <button onClick={() => setAddModal(true)}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:"#0863ba",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(8,99,186,.35)",transition:"all .2s" }}>
                    <span>＋</span> {isAr?"إضافة حساب":"Add Account"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ paddingTop:24 }}>

            {/* STATS */}
            <div className="stats-grid" style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:24 }}>
              {[
                { label:isAr?"إجمالي الحسابات":"Total Accounts",  value:stats.total,        icon:"📊", color:"#0863ba", accent:"#0863ba" },
                { label:isAr?"عيادات":"Clinics",                   value:stats.clinics,      icon:"🏥", color:"#0863ba", accent:"#0863ba" },
                { label:isAr?"صيدليات":"Pharmacies",               value:stats.pharmacies,   icon:"💊", color:"#27ae60", accent:"#27ae60" },
                { label:isAr?"نشطة":"Active",                      value:stats.active,       icon:"✅", color:"#2e7d32", accent:"#2e7d32" },
                { label:isAr?"تنتهي قريباً":"Expiring Soon",       value:stats.expiringSoon, icon:"⏳", color:"#e67e22", accent:"#e67e22" },
                { label:isAr?"منتهية":"Expired",                   value:stats.expired,      icon:"❌", color:"#c0392b", accent:"#c0392b" },
              ].map((s, i) => (
                <div key={i} className="stat-dark" style={{ animation:`fadeUp .4s ${i*50}ms ease both` }}>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:s.accent,borderRadius:"16px 16px 0 0" }} />
                  <div style={{ width:34,height:34,background:`${s.accent}15`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:10 }}>{s.icon}</div>
                  <div style={{ fontSize:26,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10,color:"#aaa",marginTop:5,fontWeight:500,lineHeight:1.3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* بطاقة تذكير بقرب انتهاء الاشتراك (خلال أسبوع) — تتقلّب بين العيادات إن كان أكثر من واحدة */}
            {expiringWithinWeek.length > 0 && (() => {
              const c = expiringWithinWeek[expiryCardIndex % expiringWithinWeek.length];
              const daysLeft = Math.max(1, Math.ceil((new Date(c.expiry).getTime() - Date.now()) / (24*60*60*1000)));
              return (
                <div key={c.user_id} style={{ background:"linear-gradient(90deg,rgba(230,126,34,.08),rgba(230,126,34,.02))",border:"1.5px solid rgba(230,126,34,.25)",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14,animation:"fadeUp .35s ease both" }}>
                  <div style={{ width:38,height:38,borderRadius:10,background:"rgba(230,126,34,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>⏳</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:700,color:"#353535" }}>
                      {isAr
                        ? `اشتراك «${c.name}» ينتهي خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"} (${fmtDate(c.expiry)})`
                        : `«${c.name}»'s subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${fmtDateEn(c.expiry)})`}
                    </div>
                    <div style={{ fontSize:11,color:"#aaa",marginTop:2 }}>
                      {c.owner} · {c.email}
                    </div>
                  </div>
                  {expiringWithinWeek.length > 1 && (
                    <div style={{ display:"flex",gap:4,flexShrink:0 }}>
                      {expiringWithinWeek.map((_, i) => (
                        <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:i===expiryCardIndex?"#e67e22":"rgba(230,126,34,.25)",transition:"background .2s" }} />
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSubClinic(c)}
                    style={{ padding:"7px 14px",background:"#e67e22",color:"#fff",border:"none",borderRadius:9,fontSize:12,fontWeight:700,fontFamily:"Rubik,sans-serif",cursor:"pointer",flexShrink:0 }}>
                    {isAr?"تجديد":"Renew"}
                  </button>
                </div>
              );
            })()}

            {/* CLINICS TAB */}
            {activeTab === "clinics" && (
              <>
                {/* SEARCH + FILTER */}
                <div className="search-filter-wrap" style={{ background:"#fff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #eef0f3",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ flex:1,minWidth:180,display:"flex",alignItems:"center",gap:10,background:"#f7f9fc",border:"1.5px solid #eef0f3",borderRadius:10,padding:"9px 14px" }}>
                    <span style={{ color:"#ccc",fontSize:14 }}>🔍</span>
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={tr.clinics.search}
                      style={{ border:"none",outline:"none",background:"none",fontFamily:"Rubik,sans-serif",fontSize:13,color:"#353535",width:"100%",direction:isAr?"rtl":"ltr" }}
                    />
                    {search && <button onClick={() => setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#aaa" }}>✕</button>}
                  </div>
                <div className="filter-chips-wrap" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {[["all",tr.filterAll],["active",tr.filterActive],["inactive",tr.filterInactive]].map(([k,v]) => (
                      <button key={k} className={`filter-chip-dark${filter===k?" active":""}`} onClick={() => setFilter(k)}>{v}</button>
                    ))}
                    <div style={{ width:1,background:"#eef0f3",margin:"0 4px" }}/>
                    {([["all", isAr?"الكل":"All"],["clinic","🏥 "+(isAr?tr.pharmacy.filterClinics:tr.pharmacy.filterClinics)],["pharmacy","💊 "+(isAr?tr.pharmacy.filterPharmacies:tr.pharmacy.filterPharmacies)]] as [string,string][]).map(([k,v]) => (
                      <button key={k} className={`filter-chip-dark${accountFilter===k?" active":""}`}
                        style={{ borderColor: accountFilter===k&&k==="pharmacy" ? "rgba(39,174,96,.3)" : undefined, background: accountFilter===k&&k==="pharmacy" ? "rgba(39,174,96,.08)" : undefined, color: accountFilter===k&&k==="pharmacy" ? "#27ae60" : undefined }}
                        onClick={() => setAccountFilter(k as "all"|"clinic"|"pharmacy")}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* TABLE */}
                {loading ? (
                  <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                    <div style={{ fontSize:36,marginBottom:10,display:"inline-block",animation:"spin 1s linear infinite" }}>⚙️</div>
                    <div style={{ fontSize:14 }}>{tr.loading}</div>
                  </div>
                ) : (
                  <div style={{ background:"#fff",borderRadius:16,border:"1.5px solid #eef0f3",overflow:"hidden",boxShadow:"0 2px 12px rgba(8,99,186,.05)" }}>
                    <div className="admin-header-row" style={{ display:"grid",gridTemplateColumns:"minmax(200px,1.6fr) 150px 150px 190px",gap:12,padding:"12px 20px",background:"#f7f9fc",borderBottom:"1.5px solid #eef0f3" }}>
                      {[
                        isAr?"العيادة / الصيدلية":"Clinic / Pharmacy",
                        isAr?"الخطة":"Plan",
                        isAr?"تاريخ الانتهاء":"Expiry",
                        isAr?"الإجراءات":"Actions",
                      ].map((h,i) => (
                        <div key={i} style={{ fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:.6,textAlign:i===3?"end":"start",paddingLeft:i>0&&i<3?8:0 }}>{h}</div>
                      ))}
                    </div>

                    {filtered.length === 0 ? (
                      <div style={{ textAlign:"center",padding:"50px",color:"#ccc" }}>
                        <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
                        <div style={{ fontSize:14 }}>{tr.noResults}</div>
                      </div>
                    ) : (
                      paginatedClinics.map(c => {
                        const dot     = statusDot(c);
                        const expSoon = isExpiringSoon(c.expiry);
                        const exp     = isExpired(c.expiry);
                        const planColor = PLAN_COLORS[c.plan] || "#0863ba";
                        return (
                          <div key={c.id} className="admin-row">
                            {/* ── Desktop row ── */}
                            <div className="admin-row-desktop" style={{ display:"grid",gridTemplateColumns:"minmax(200px,1.6fr) 150px 150px 190px",gap:12,padding:"16px 20px",alignItems:"center" }}>

                              {/* العيادة: نقطة + اسم + إيميل */}
                              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                <div title={dot.title} style={{ width:9,height:9,borderRadius:"50%",background:dot.color,flexShrink:0,boxShadow:`0 0 0 2px ${dot.color}22` }} />
                                <div style={{ minWidth:0 }}>
                                  <div style={{ fontSize:13,fontWeight:600,color:"#353535",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                                    <span style={{ fontSize:14 }}>{c.account_type==="pharmacy" ? "💊" : CLINIC_TYPE_ICONS[c.clinic_type||"general"]}</span>
                                    <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</span>
                                  </div>
                                  <div
                                    className="email-copy"
                                    title={isAr?"اضغط لنسخ":"Click to copy"}
                                    onClick={() => copyEmail(c.email)}
                                    style={{ fontSize:11,color:"#aaa",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:280 }}
                                  >{c.email}</div>
                                </div>
                              </div>

                              {/* الخطة */}
                              <div style={{ paddingLeft:8 }}>
                                {c.account_type === "pharmacy" ? (
                                  <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:"rgba(39,174,96,.12)",color:"#27ae60" }}>
                                    💊 {isAr?"صيدلية":"Pharmacy"}
                                  </span>
                                ) : (
                                  <span style={{ fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:`${planColor}18`,color:planColor }}>
                                    {tr.clinics.plans[c.plan as keyof typeof tr.clinics.plans] || c.plan}
                                  </span>
                                )}
                                {["shared_basic","shared_pro","shared_enterprise"].includes(c.plan) && (
                                  <div style={{ fontSize:9,color:planColor,fontWeight:600,marginTop:3 }}>
                                    👥 {c.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[c.plan] ?? 2} {isAr?"أطباء":"drs"}
                                  </div>
                                )}
                              </div>

                              {/* تاريخ الانتهاء — أرقام إنجليزية دائماً */}
                              <div style={{ paddingLeft:8 }}>
                                <div style={{ fontSize:12,fontWeight:exp||expSoon?700:400,color:exp?"#c0392b":expSoon?"#e67e22":"#666",fontVariantNumeric:"tabular-nums",direction:"ltr",textAlign:"start" }}>
                                  {fmtDateEn(c.expiry)}
                                </div>
                                {expSoon && !exp && <div style={{ fontSize:9,color:"#e67e22",fontWeight:600,marginTop:2 }}>⚠ {isAr?"قريباً":"Soon"}</div>}
                                {exp      && <div style={{ fontSize:9,color:"#c0392b",fontWeight:600,marginTop:2 }}>✗ {isAr?"منتهية":"Expired"}</div>}
                              </div>

                              {/* أزرار الإجراءات */}
                              <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,position:"relative" }} onClick={e => e.stopPropagation()}>
                                {/* معلومات العيادة */}
                                <button
                                  className="icon-btn-dark"
                                  title={isAr?"معلومات العيادة":"Clinic Info"}
                                  onClick={e => { e.stopPropagation(); setInfoClinic(c); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                >ℹ️</button>

                                {/* تعديل الاشتراك */}
                                <button
                                  className="icon-btn-dark"
                                  title={isAr?"تعديل الاشتراك":"Edit Subscription"}
                                  onClick={e => { e.stopPropagation(); setSubClinic(c); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                >💳</button>

                                {/* مراسلة */}
                                <button
                                  className="icon-btn-dark msg"
                                  title={isAr?"مراسلة":"Message"}
                                  onClick={e => { e.stopPropagation(); setMsgClinic(c); setMsgTemplate("custom"); setMsgBody(""); setMsgView("history"); setMsgHistory([]); if(c.user_id) loadMsgHistory(c.user_id); }}
                                  style={{ width:38,height:38,fontSize:16,position:"relative" }}
                                >
                                  💬
                                  {msgUnread[c.user_id ?? ""] ? (
                                    <span style={{ position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:"50%",background:"#c0392b",color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                      {msgUnread[c.user_id ?? ""]}
                                    </span>
                                  ) : null}
                                </button>

                                {/* المزيد */}
                                <button
                                  className="icon-btn-dark more"
                                  title={isAr?"المزيد":"More"}
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId===c.id?null:(c.id||null)); }}
                                  style={{ width:38,height:38,fontSize:16 }}
                                >⋯</button>

                                {openMenuId === c.id && (
                                  <div className="dropdown-dark">
                                    <div className="dropdown-dark-item" onClick={() => { setEditClinic(c); setOpenMenuId(null); }}>✏️ {tr.clinics.actions.edit}</div>
                                    <div className="dropdown-dark-item" onClick={() => { setResetClinic(c); setOpenMenuId(null); }}>🔑 {tr.clinics.actions.resetPass}</div>
                                    <div className="dropdown-dark-item" onClick={() => { toggleStatus(c); setOpenMenuId(null); }}>
                                      {c.status==="active" ? "⏸ "+tr.clinics.actions.suspend : "▶ "+tr.clinics.actions.activate}
                                    </div>
                                    <div style={{ height:1,background:"#eef0f3",margin:"4px 0" }} />
                                    <div className="dropdown-dark-item danger" onClick={() => { setDeleteClinic(c); setOpenMenuId(null); }}>🗑️ {tr.clinics.actions.delete}</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Mobile row ── */}
                            <div className="admin-row-mobile" style={{ padding:"14px 16px",flexDirection:"column",gap:10 }}>
                              {/* الصف الأول: نقطة + اسم + أزرار */}
                              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                <div title={dot.title} style={{ width:8,height:8,borderRadius:"50%",background:dot.color,flexShrink:0 }} />
                                <span style={{ fontSize:13,fontWeight:700,color:"#353535",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                                  {c.account_type==="pharmacy" ? "💊 " : CLINIC_TYPE_ICONS[c.clinic_type||"general"]+" "}{c.name}
                                </span>
                                <div style={{ display:"flex",gap:5,flexShrink:0 }} onClick={e => e.stopPropagation()}>
                                  <button className="icon-btn-dark" title={isAr?"معلومات":"Info"} onClick={e => { e.stopPropagation(); setInfoClinic(c); }} style={{ width:30,height:30 }}>ℹ️</button>
                                  <button className="icon-btn-dark" title={isAr?"تعديل الاشتراك":"Edit Sub"} onClick={e => { e.stopPropagation(); setSubClinic(c); }} style={{ width:30,height:30 }}>💳</button>
                                  <button className="icon-btn-dark msg" title={isAr?"مراسلة":"Msg"} onClick={e => { e.stopPropagation(); setMsgClinic(c); setMsgTemplate("custom"); setMsgBody(""); setMsgView("history"); setMsgHistory([]); if(c.user_id) loadMsgHistory(c.user_id); }} style={{ width:30,height:30,position:"relative" }}>
                                    💬
                                    {msgUnread[c.user_id ?? ""] ? <span style={{ position:"absolute",top:-3,right:-3,width:13,height:13,borderRadius:"50%",background:"#c0392b",color:"#fff",fontSize:7,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center" }}>{msgUnread[c.user_id ?? ""]}</span> : null}
                                  </button>
                                  <button className="icon-btn-dark more" onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId===c.id?null:(c.id||null)); }} style={{ width:30,height:30 }}>⋯</button>
                                  {openMenuId === c.id && (
                                    <div className="dropdown-dark" style={{ top:"calc(100% + 4px)",right:0 }}>
                                      <div className="dropdown-dark-item" onClick={() => { setEditClinic(c); setOpenMenuId(null); }}>✏️ {tr.clinics.actions.edit}</div>
                                      <div className="dropdown-dark-item" onClick={() => { setResetClinic(c); setOpenMenuId(null); }}>🔑 {tr.clinics.actions.resetPass}</div>
                                      <div className="dropdown-dark-item" onClick={() => { toggleStatus(c); setOpenMenuId(null); }}>
                                        {c.status==="active" ? "⏸ "+tr.clinics.actions.suspend : "▶ "+tr.clinics.actions.activate}
                                      </div>
                                      <div style={{ height:1,background:"#eef0f3",margin:"4px 0" }} />
                                      <div className="dropdown-dark-item danger" onClick={() => { setDeleteClinic(c); setOpenMenuId(null); }}>🗑️ {tr.clinics.actions.delete}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* الصف الثاني: إيميل + خطة + تاريخ */}
                              <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                                <span
                                  className="email-copy"
                                  onClick={() => copyEmail(c.email)}
                                  style={{ fontSize:11,color:"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}
                                >{c.email}</span>
                                <span style={{ width:1,height:12,background:"#eef0f3",flexShrink:0 }} />
                                <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${planColor}15`,color:planColor }}>
                                  {c.account_type==="pharmacy" ? (isAr?"صيدلية":"Pharmacy") : (tr.clinics.plans[c.plan as keyof typeof tr.clinics.plans]||c.plan)}
                                </span>
                                <span style={{ fontSize:11,color:exp?"#c0392b":expSoon?"#e67e22":"#aaa",fontVariantNumeric:"tabular-nums",direction:"ltr",display:"inline-block",fontWeight:exp||expSoon?700:400 }}>{fmtDateEn(c.expiry)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ── PAGINATION ── */}
                {!loading && filtered.length > PAGE_SIZE && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, padding:"12px 16px", background:"#fff", borderRadius:12, border:"1.5px solid #eef0f3" }}>
                    {/* عداد النتائج */}
                    <span style={{ fontSize:12, color:"#aaa", fontFamily:"Rubik,sans-serif" }}>
                      {isAr
                        ? `عرض ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} من ${filtered.length}`
                        : `Showing ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                    </span>

                    {/* أزرار التنقل */}
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {/* السابق */}
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                        disabled={currentPage === 1}
                        style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #eef0f3", background: currentPage===1 ? "#f7f9fc" : "#fff", cursor: currentPage===1 ? "not-allowed" : "pointer", fontSize:14, color: currentPage===1 ? "#ccc" : "#666", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                      >
                        {isAr ? "›" : "‹"}
                      </button>

                      {/* أرقام الصفحات */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx-1] as number) > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === "..." ? (
                            <span key={`dots-${idx}`} style={{ width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#aaa" }}>…</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setCurrentPage(item as number)}
                              style={{ width:34, height:34, borderRadius:8, border: currentPage===item ? "1.5px solid rgba(8,99,186,.3)" : "1.5px solid #eef0f3", background: currentPage===item ? "rgba(8,99,186,.08)" : "#fff", cursor:"pointer", fontSize:13, fontWeight: currentPage===item ? 700 : 400, color: currentPage===item ? "#0863ba" : "#666", fontFamily:"Rubik,sans-serif", transition:"all .15s" }}
                            >
                              {item}
                            </button>
                          )
                        )}

                      {/* التالي */}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                        disabled={currentPage === totalPages}
                        style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #eef0f3", background: currentPage===totalPages ? "#f7f9fc" : "#fff", cursor: currentPage===totalPages ? "not-allowed" : "pointer", fontSize:14, color: currentPage===totalPages ? "#ccc" : "#666", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}
                      >
                        {isAr ? "‹" : "›"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>

        {/* Modals */}
        {(addModal || editClinic) && (
          <ClinicModal
            lang={lang}
            clinic={editClinic}
            onSave={loadClinics}
            onClose={() => { setAddModal(false); setEditClinic(null); }}
          />
        )}
        {resetClinic && <ResetPassModal lang={lang} clinic={resetClinic} onClose={() => { setResetClinic(null); loadClinics(); }} />}

        {subClinic && (
          <SubscriptionModal
            lang={lang}
            clinic={subClinic}
            onSave={loadClinics}
            onClose={() => { setSubClinic(null); loadClinics(); }}
          />
        )}

        {dataToolsModal && (
          <DataToolsModal
            lang={lang}
            clinics={clinics}
            onClose={() => setDataToolsModal(false)}
          />
        )}

        {infoClinic && (
          <ClinicInfoModal clinic={infoClinic} isAr={isAr} onClose={() => setInfoClinic(null)} />
        )}

        {deleteClinic && (
          <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div onClick={() => setDeleteClinic(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.5)",backdropFilter:"blur(6px)" }} />
            <div style={{ position:"relative",zIndex:1,background:"#fff",borderRadius:20,maxWidth:380,width:"100%",padding:"32px",textAlign:"center",boxShadow:"0 24px 80px rgba(8,99,186,.15)",border:"1.5px solid #eef0f3",animation:"modalIn .25s ease" }}>
              <div style={{ fontSize:40,marginBottom:16 }}>🗑️</div>
              <h3 style={{ fontSize:17,fontWeight:800,color:"#353535",marginBottom:8 }}>{tr.deleteModal.title}</h3>
              <p style={{ fontSize:13,color:"#888",lineHeight:1.6 }}>
                {tr.deleteModal.msg} <strong style={{ color:"#353535" }}>{deleteClinic.name}</strong>؟<br/>
                <span style={{ color:"#c0392b",fontSize:12 }}>{tr.deleteModal.warning}</span>
              </p>
              <div style={{ display:"flex",gap:12,marginTop:24 }}>
                <button onClick={handleDelete} style={{ flex:1,padding:"12px",background:"#c0392b",color:"#fff",border:"none",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer" }}>{tr.deleteModal.confirm}</button>
                <button onClick={() => setDeleteClinic(null)} style={{ flex:1,padding:"12px",background:"#f7f9fc",color:"#666",border:"1.5px solid #eef0f3",borderRadius:12,fontFamily:"Rubik,sans-serif",fontSize:14,cursor:"pointer" }}>{tr.deleteModal.cancel}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ Modal المراسلة ══════════════════════════════════════ */}
      {msgClinic && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}
          onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}>
          <div style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:520,maxHeight:"85vh",direction:"rtl",fontFamily:"Rubik,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ background:"#0863ba",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
              <div style={{ width:36,height:36,background:"rgba(255,255,255,.15)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>💬</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15,fontWeight:800,color:"#fff" }}>{msgClinic.name}</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.7)" }}>الرسائل تُحذف تلقائياً بعد 48 ساعة</div>
              </div>
              <button onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}
                style={{ background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>
                ✕
              </button>
            </div>

            {/* تبديل العرض */}
            <div style={{ display:"flex",borderBottom:"1.5px solid #eef0f3",flexShrink:0 }}>
              {(["history","compose"] as const).map(v => (
                <button key={v}
                  onClick={() => {
                    setMsgView(v);
                    if (v === "history") setTimeout(() => { msgBottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, 100);
                  }}
                  style={{ flex:1,padding:"11px",border:"none",cursor:"pointer",fontFamily:"Rubik,sans-serif",fontSize:13,fontWeight:600,
                    background: msgView===v ? "#f0f6ff" : "#fff",
                    color:      msgView===v ? "#0863ba" : "#888",
                    borderBottom: msgView===v ? "2.5px solid #0863ba" : "2.5px solid transparent" }}>
                  {v === "history" ? "📜 سجل المحادثة" : "✏️ رسالة جديدة"}
                </button>
              ))}
            </div>

            {/* سجل المحادثة */}
            {msgView === "history" && (
              <div style={{ flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:8 }}>
                {msgHistoryLoading ? (
                  <div style={{ textAlign:"center",color:"#aaa",padding:40,fontSize:13 }}>جارٍ التحميل...</div>
                ) : msgHistory.length === 0 ? (
                  <div style={{ textAlign:"center",color:"#aaa",padding:40,fontSize:13 }}>
                    لا توجد رسائل سابقة مع هذه العيادة.<br/>
                    <span style={{ fontSize:11 }}>انتقل لـ &quot;رسالة جديدة&quot; لبدء المحادثة</span>
                  </div>
                ) : msgHistory.map(msg => {
                  const isAdminMsg = msg.from_role === "admin";
                  return (
                    <div key={msg.id} style={{ display:"flex",justifyContent: isAdminMsg ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth:"80%",padding:"9px 13px",
                        borderRadius: isAdminMsg ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isAdminMsg ? "#0863ba" : "#f0f6ff",
                        color: isAdminMsg ? "#fff" : "#1a2840",
                        fontSize:13, lineHeight:1.6, whiteSpace:"pre-wrap",
                        boxShadow:"0 1px 3px rgba(0,0,0,.08)",
                      }}>
                        {!isAdminMsg && <div style={{ fontSize:10,fontWeight:700,color:"#0863ba",marginBottom:3 }}>الطبيب 👨‍⚕️</div>}
                        {msg.body}
                        <div style={{ fontSize:10,opacity:.5,marginTop:3,textAlign:"left" }}>
                          {new Date(msg.created_at).toLocaleString("ar-SA-u-ca-gregory",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={msgBottomRef} />
              </div>
            )}

            {/* رسالة جديدة */}
            {msgView === "compose" && (
              <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12 }}>
                <div>
                  <div style={{ fontSize:12,color:"#888",marginBottom:8 }}>قوالب سريعة</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    {(["welcome","expiry","custom"] as const).map(t => (
                      <button key={t}
                        onClick={() => { setMsgTemplate(t); setMsgBody(getMsgTemplate(t, msgClinic?.name ?? "")); }}
                        style={{ padding:"7px 14px",borderRadius:20,border:"1.5px solid",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"Rubik,sans-serif",
                          borderColor: msgTemplate===t ? "#0863ba" : "#e0e0e0",
                          background:  msgTemplate===t ? "#0863ba" : "#f5f7fa",
                          color:       msgTemplate===t ? "#fff" : "#555" }}>
                        {t === "welcome" ? "ترحيبية" : t === "expiry" ? "انتهاء الاشتراك" : "مخصصة"}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="اكتب رسالتك هنا... (Enter للإرسال)"
                  rows={6}
                  style={{ width:"100%",padding:12,borderRadius:12,border:"1.5px solid #e0e0e0",fontFamily:"Rubik,sans-serif",fontSize:14,resize:"vertical",outline:"none",lineHeight:1.7 }}
                />
                <div style={{ fontSize:11,color:"#aaa",textAlign:"left" }}>{msgBody.length}/2000</div>
              </div>
            )}

            {/* أزرار الإجراء */}
            <div style={{ borderTop:"1.5px solid #eef0f3",padding:"12px 16px",display:"flex",gap:10,flexShrink:0 }}>
              {msgView === "compose" ? (
                <>
                  <button onClick={handleSendMessage}
                    disabled={msgSending || !msgBody.trim() || msgBody.length > 2000}
                    style={{ flex:1,padding:"12px 0",borderRadius:12,background:"linear-gradient(135deg,#0863ba,#0558a8)",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif",opacity:msgSending||!msgBody.trim()?0.6:1 }}>
                    {msgSuccess ? "✅ تم الإرسال" : msgSending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
                  </button>
                  <button onClick={() => setMsgView("history")}
                    style={{ padding:"12px 16px",borderRadius:12,background:"#f5f7fa",color:"#888",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:13,fontFamily:"Rubik,sans-serif" }}>
                    إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setMsgView("compose")}
                    style={{ flex:1,padding:"12px 0",borderRadius:12,background:"linear-gradient(135deg,#0863ba,#0558a8)",color:"#fff",border:"none",cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"Rubik,sans-serif" }}>
                    ✏️ رسالة جديدة
                  </button>
                  <button onClick={() => { setMsgClinic(null); setMsgHistory([]); setMsgView("history"); }}
                    style={{ padding:"12px 16px",borderRadius:12,background:"#f5f7fa",color:"#888",border:"1.5px solid #eef0f3",cursor:"pointer",fontSize:13,fontFamily:"Rubik,sans-serif" }}>
                    إغلاق
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── ClinicInfoModal — popup معلومات العيادة ─────────────────
function ClinicInfoModal({ clinic, onClose, isAr }: { clinic: ClinicData; onClose: () => void; isAr: boolean }) {
  const dot = (() => {
    const now = new Date();
    const exp = new Date(clinic.expiry);
    const diff = exp.getTime() - now.getTime();
    if (exp < now)          return { color:"#c0392b", label: isAr?"منتهية":"Expired" };
    if (diff < 30*24*3600*1000) return { color:"#aaa",    label: isAr?"قاربت على الانتهاء":"Expiring soon" };
    if (clinic.status === "inactive") return { color:"#e67e22", label: isAr?"معلّق":"Suspended" };
    if (diff > 30*24*3600*1000) return { color:"#27ae60", label: isAr?"نشط":"Active" };
    return { color:"#f1c40f", label: isAr?"نشط":"Active" };
  })();

  const planColor = PLAN_COLORS[clinic.plan] || "#0863ba";

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtEn = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const Row = ({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f0f2f5" }}>
      <span style={{ fontSize:12, color:"#aaa", fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:600, color: accent || "#353535", direction:"ltr", textAlign:"end" }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:440, fontFamily:"Rubik,sans-serif", direction: isAr?"rtl":"ltr", overflow:"hidden", boxShadow:"0 24px 60px rgba(8,99,186,.18)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0863ba,#0558a8)", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, background:"rgba(255,255,255,.15)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
              {clinic.account_type === "pharmacy" ? "💊" : CLINIC_TYPE_ICONS[clinic.clinic_type||"general"]}
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#fff" }}>{clinic.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", marginTop:2 }}>
                {clinic.account_type === "pharmacy" ? (isAr?"صيدلية":"Pharmacy") : (isAr?"عيادة":"Clinic")} · ID #{clinic.id}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", color:"#fff", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Status bar */}
        <div style={{ background:`${dot.color}12`, borderBottom:`2px solid ${dot.color}30`, padding:"8px 24px", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:dot.color, boxShadow:`0 0 0 2px ${dot.color}30` }} />
          <span style={{ fontSize:12, fontWeight:700, color:dot.color }}>{dot.label}</span>
        </div>

        {/* Body */}
        <div style={{ padding:"4px 24px 20px" }}>
          <Row label={isAr?"المالك":"Owner"}        value={clinic.owner} />
          <Row label={isAr?"البريد":"Email"}         value={
            <span
              onClick={() => navigator.clipboard.writeText(clinic.email).catch(()=>{})}
              title={isAr?"اضغط لنسخ":"Click to copy"}
              style={{ cursor:"pointer", color:"#0863ba", textDecoration:"underline dotted" }}
            >{clinic.email}</span>
          } />
          {clinic.phone && <Row label={isAr?"الهاتف":"Phone"} value={clinic.phone} />}
          <Row label={isAr?"الخطة":"Plan"} value={
            <span style={{ background:`${planColor}15`, color:planColor, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
              {clinic.plan}
            </span>
          } />
          {["shared_basic","shared_pro","shared_enterprise"].includes(clinic.plan) && (
            <Row label={isAr?"الأطباء":"Doctors"} value={
              `${clinic.doctors_count ?? 0} / ${clinic.max_doctors ?? SHARED_PLAN_DEFAULT_DOCTORS[clinic.plan] ?? 2}`
            } accent="#0863ba" />
          )}
          <Row label={isAr?"تاريخ الانتهاء":"Expiry"} value={fmtEn(clinic.expiry)} accent={new Date(clinic.expiry) < new Date() ? "#c0392b" : "#353535"} />
          {clinic.payments_lock_enabled && (
            <Row label={isAr?"قفل المدفوعات":"Payments Lock"} value={isAr?"مفعّل 🔒":"Enabled 🔒"} accent="#e67e22" />
          )}
          {clinic.restricted_access_enabled && (
            <Row label={isAr?"الوصول المقيّد":"Restricted Access"} value={isAr?"مفعّل 🔑":"Enabled 🔑"} accent="#8e44ad" />
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"0 24px 20px", display:"flex", gap:10 }}>
          <button
            onClick={onClose}
            style={{ flex:1, padding:"11px 0", borderRadius:12, background:"#f5f7fa", color:"#888", border:"1.5px solid #eef0f3", cursor:"pointer", fontSize:13, fontFamily:"Rubik,sans-serif", fontWeight:600 }}
          >{isAr?"إغلاق":"Close"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Exports for use in other pages ──────────────────────────
export { PLAN_PRICING, PLAN_PATIENT_LIMITS, PLAN_FEATURES, SHARED_PLAN_DEFAULT_DOCTORS };
export type { PlanType };