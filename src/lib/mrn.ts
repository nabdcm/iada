// ============================================================
// src/lib/mrn.ts — الدالة الموحدة لجلب/إنشاء رقم السجل الطبي
// تتحقق من master_patients بالهاتف، وتنشئ سجلاً جديداً عند الحاجة
// ترجع null عند الفشل بدل رقم مؤقت غير صالح
// ============================================================
import { supabase } from "./supabase";

export async function getOrCreateMRN(phone: string, name: string): Promise<string | null> {
  const cleanPhone = phone.trim();
  if (!cleanPhone) return null;

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

  // fallback: إذا فشل الإدراج (race condition) نحاول الجلب مجدداً
  const { data: retry } = await supabase
    .from("master_patients")
    .select("mrn")
    .eq("phone", cleanPhone)
    .maybeSingle();

  return retry?.mrn ?? null;
}
