// ─── تنسيق عرض الوقت (12/24 ساعة) ─────────────────────────
// القيم المخزنة تبقى دائماً بصيغة 24 ساعة "HH:mm" — هذا للعرض فقط.

export type TimeFormat = "12" | "24";

export function fmtTime(t: string | null | undefined, fmt: TimeFormat, isAr: boolean = true): string {
  if (!t) return "";
  const base = t.slice(0, 5);
  if (fmt !== "12") return base;
  const [hS, mS] = base.split(":");
  const h = Number(hS);
  if (isNaN(h)) return base;
  const suffix = isAr ? (h < 12 ? "ص" : "م") : (h < 12 ? "AM" : "PM");
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${mS ?? "00"} ${suffix}`;
}
