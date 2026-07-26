// ============================================================
// src/lib/fetchAll.ts
// جلب كل الصفوف متجاوزاً سقف PostgREST الصارم (1000 صف/طلب)
//
// السبب: Supabase/PostgREST يحدّ كل استجابة بـ 1000 صف ويتجاهل
// أي .limit() أكبر — دون إرجاع خطأ. النتيجة: بيانات مقطوعة صامتة.
// الحل: حلقة .range() حتى تعود صفحة ناقصة.
//
// الاستخدام:
//   const rows = await fetchAll<Appointment>((from, to) =>
//     supabase.from("appointments").select("*").eq("user_id", uid).range(from, to)
//   );
// ============================================================

export type PageResult<T> = { data: T[] | null; error: { message: string } | null };

const PAGE_SIZE = 1000;
const MAX_ROWS = 200_000; // سقف أمان يمنع حلقة لا نهائية

export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts?: { pageSize?: number; maxRows?: number }
): Promise<T[]> {
  const page = opts?.pageSize ?? PAGE_SIZE;
  const max = opts?.maxRows ?? MAX_ROWS;
  const all: T[] = [];
  for (let from = 0; from < max; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}
