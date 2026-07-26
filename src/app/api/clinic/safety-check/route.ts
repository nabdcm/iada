// src/app/api/clinic/safety-check/route.ts
// ميزة 6 — تنبيه حساسية المريض + تعارض الأدوية عند كتابة وصفة في العيادة.
// أداة مساعدة للتنبيه فقط، وليست بديلاً عن مرجع دوائي معتمد.
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUserId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

const norm = (s: string) => (s || "").toLowerCase().trim();

/** مطابقة جزئية تتعامل مع الأسماء التجارية ("بانادول 500" مقابل "باراسيتامول") */
const contains = (medName: string, keyword: string) => {
  const m = norm(medName), k = norm(keyword);
  if (!m || !k || k.length < 3) return false;
  return m.includes(k) || k.includes(m);
};

type Interaction = { drug_a: string; drug_b: string; severity: string; description: string };

export interface SafetyResult {
  allergies: { medicine: string; allergen: string }[];
  interactions: (Interaction & { med_a: string; med_b: string })[];
  chronic: { medicine: string; condition: string; note: string }[];
}

/** تنبيهات مبسّطة مرتبطة بالأمراض المزمنة المسجّلة في بطاقة المريض */
const CHRONIC_RULES: { keywords: string[]; condition: "diabetes" | "hypertension"; note: string }[] = [
  { keywords: ["prednisolone", "prednisone", "بريدنيزولون", "كورتيزون", "dexamethasone", "ديكساميثازون"], condition: "diabetes", note: "الستيرويدات ترفع سكر الدم — راقب القراءات عند مريض السكري" },
  { keywords: ["ibuprofen", "diclofenac", "naproxen", "ايبوبروفين", "إيبوبروفين", "ديكلوفيناك", "بروفين"], condition: "hypertension", note: "مضادات الالتهاب اللاستيرويدية قد ترفع الضغط وتضعف أثر خافضاته" },
  { keywords: ["pseudoephedrine", "سودوإيفيدرين", "سودوافدرين"], condition: "hypertension", note: "مزيلات الاحتقان ترفع الضغط الشرياني" },
];

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { medicines, patient_id } = await req.json();
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json({ allergies: [], interactions: [], chronic: [] } satisfies SafetyResult);
    }
    const meds: string[] = medicines.map((m: unknown) => String(m ?? "").trim()).filter(Boolean);

    // ── 1) التعارضات الدوائية ──
    const { data: interactions } = await supabaseAdmin
      .from("pharmacy_drug_interactions")
      .select("drug_a, drug_b, severity, description")
      .is("user_id", null);

    const foundInteractions: (Interaction & { med_a: string; med_b: string })[] = [];
    for (let i = 0; i < meds.length; i++) {
      for (let j = i + 1; j < meds.length; j++) {
        const a = meds[i], b = meds[j];
        for (const it of (interactions ?? []) as Interaction[]) {
          const match =
            (contains(a, it.drug_a) && contains(b, it.drug_b)) ||
            (contains(a, it.drug_b) && contains(b, it.drug_a));
          if (match) { foundInteractions.push({ ...it, med_a: a, med_b: b }); break; }
        }
      }
    }

    // ── 2) الحساسية + الأمراض المزمنة ──
    const allergyHits: SafetyResult["allergies"] = [];
    const chronicHits: SafetyResult["chronic"] = [];

    if (patient_id) {
      const pid = Number(patient_id);

      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("has_diabetes, has_hypertension")
        .eq("id", pid).eq("user_id", userId).maybeSingle();

      const { data: profile } = await supabaseAdmin
        .from("patient_profiles")
        .select("allergies, allergy_list, medical_fields")
        .eq("patient_id", pid).eq("user_id", userId).maybeSingle();

      const allergens: string[] = [];
      const pushFree = (txt: unknown) => {
        if (typeof txt !== "string") return;
        txt.split(/[,،\n;/|]+/).forEach(a => { const v = a.trim(); if (v.length >= 3) allergens.push(v); });
      };

      if (profile) {
        pushFree(profile.allergies);
        if (Array.isArray(profile.allergy_list)) {
          profile.allergy_list.forEach((a: unknown) => { if (typeof a === "string" && a.trim().length >= 3) allergens.push(a.trim()); });
        }
        // الحقول الطبية حسب التخصص تحتوي مفاتيح حساسية متعددة
        const mf = profile.medical_fields as Record<string, unknown> | null;
        if (mf && typeof mf === "object") {
          Object.keys(mf).forEach(k => { if (k.includes("allerg")) pushFree(mf[k]); });
        }
      }

      const seen = new Set<string>();
      for (const med of meds) {
        for (const allergen of allergens) {
          if (contains(med, allergen)) {
            const key = `${med}|${allergen}`;
            if (!seen.has(key)) { seen.add(key); allergyHits.push({ medicine: med, allergen }); }
            break;
          }
        }
      }

      if (patient) {
        for (const med of meds) {
          for (const rule of CHRONIC_RULES) {
            const active =
              (rule.condition === "diabetes" && patient.has_diabetes) ||
              (rule.condition === "hypertension" && patient.has_hypertension);
            if (!active) continue;
            if (rule.keywords.some(k => contains(med, k))) {
              chronicHits.push({
                medicine: med,
                condition: rule.condition === "diabetes" ? "السكري" : "ارتفاع الضغط",
                note: rule.note,
              });
              break;
            }
          }
        }
      }
    }

    return NextResponse.json({
      allergies: allergyHits,
      interactions: foundInteractions,
      chronic: chronicHits,
    } satisfies SafetyResult);
  } catch (err) {
    console.error("clinic/safety-check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
