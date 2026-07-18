// src/app/api/pharmacy/safety-check/route.ts
// ميزة 12 (تعارض الأدوية) + 13 (فحص الحساسية) — أدوات تنبيه مساعدة، ليست بديلاً عن مرجع طبي معتمد
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthUserId } from "../_pharmacyAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// تطبيع نص الدواء للمطابقة (حروف صغيرة، إزالة مسافات زائدة)
const norm = (s: string) => (s || "").toLowerCase().trim();
// هل يحتوي اسم الدواء على كلمة التعارض المسجّلة (مطابقة جزئية للتعامل مع الأسماء التجارية)
const contains = (medName: string, keyword: string) => {
  const m = norm(medName), k = norm(keyword);
  if (!m || !k) return false;
  return m.includes(k) || k.includes(m);
};

type Interaction = { drug_a: string; drug_b: string; severity: string; description: string };

export async function POST(req: Request) {
  try {
    const { user_id, medicines, patient_id, mrn } = await req.json();
    if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const authUid_user_id = await getAuthUserId(req);
    if (!authUid_user_id || authUid_user_id !== user_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json({ interactions: [], allergies: [] });
    }
    const names: string[] = medicines.map((m: string) => norm(m)).filter(Boolean);

    // 1) جلب قاعدة التعارضات (العامة المبذّرة + الخاصة بالمستخدم)
    const { data: interactions } = await supabaseAdmin
      .from("pharmacy_drug_interactions")
      .select("drug_a, drug_b, severity, description")
      .or(`user_id.is.null,user_id.eq.${user_id}`);

    // فحص كل زوج من أدوية الوصفة ضد قاعدة التعارضات
    const foundInteractions: (Interaction & { med_a: string; med_b: string })[] = [];
    for (let i = 0; i < medicines.length; i++) {
      for (let j = i + 1; j < medicines.length; j++) {
        const a = medicines[i], b = medicines[j];
        for (const it of (interactions || []) as Interaction[]) {
          const match =
            (contains(a, it.drug_a) && contains(b, it.drug_b)) ||
            (contains(a, it.drug_b) && contains(b, it.drug_a));
          if (match) {
            foundInteractions.push({ ...it, med_a: a, med_b: b });
            break; // تعارض واحد لكل زوج يكفي
          }
        }
      }
    }

    // 2) فحص الحساسية من ملف المريض
    const allergyHits: { medicine: string; allergen: string }[] = [];
    if (patient_id || mrn) {
      let profile = null;
      if (patient_id) {
        const { data } = await supabaseAdmin
          .from("patient_profiles").select("allergies, allergy_list")
          .eq("patient_id", patient_id).maybeSingle();
        profile = data;
      }
      if (!profile && mrn) {
        // ربط عبر MRN → patients → patient_profiles
        const { data: pat } = await supabaseAdmin
          .from("patients").select("id").eq("mrn", mrn).eq("user_id", user_id).maybeSingle();
        if (pat) {
          const { data } = await supabaseAdmin
            .from("patient_profiles").select("allergies, allergy_list")
            .eq("patient_id", pat.id).maybeSingle();
          profile = data;
        }
      }
      if (profile) {
        // اجمع الحساسيات من النص الحر + القائمة المنظمة
        const allergens: string[] = [];
        if (profile.allergies) {
          // نص حر: افصل بالفواصل/الأسطر
          profile.allergies.split(/[,،\n;]+/).forEach((a: string) => { if (a.trim()) allergens.push(a.trim()); });
        }
        if (Array.isArray(profile.allergy_list)) {
          profile.allergy_list.forEach((a: string) => { if (a && a.trim()) allergens.push(a.trim()); });
        }
        // طابق كل دواء ضد كل مسبب حساسية
        for (const med of medicines) {
          for (const allergen of allergens) {
            if (contains(med, allergen)) {
              allergyHits.push({ medicine: med, allergen });
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({
      interactions: foundInteractions,
      allergies: allergyHits,
      checked: names.length,
    });
  } catch (err) {
    console.error("pharmacy/safety-check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: إدارة قاعدة التعارضات الخاصة بالمستخدم (عرض/إضافة/حذف عبر POST بأفعال منفصلة)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const authUid_userId = await getAuthUserId(req);
    if (!authUid_userId || authUid_userId !== userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { data } = await supabaseAdmin
      .from("pharmacy_drug_interactions")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("severity", { ascending: false });
    return NextResponse.json({ interactions: data || [] });
  } catch (err) {
    console.error("pharmacy/safety-check GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
