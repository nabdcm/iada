// ============================================================
// MRN v2 — 12 رقماً بلا فواصل، غير تسلسلي، بخانة تدقيق Luhn
// الأرقام القديمة (MRN-00001) تبقى مقبولة عند الدخول عبر mrn_legacy
// ============================================================

/** يُبقي الأرقام فقط — يتسامح مع المسافات والشرطات والأرقام العربية */
export function normalizeMRN(raw: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const latin = (raw ?? "")
    .split("")
    .map(ch => {
      const i = arabicDigits.indexOf(ch);
      return i >= 0 ? String(i) : ch;
    })
    .join("");
  return latin.replace(/[^0-9]/g, "");
}

/** خانة تدقيق Luhn — تكشف خطأ رقم واحد أو تبديل رقمين متجاورين */
export function luhnDigit(body: string): string {
  let sum = 0;
  for (let i = body.length - 1, pos = 0; i >= 0; i--, pos++) {
    let d = Number(body[i]);
    if (pos % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return String((10 - (sum % 10)) % 10);
}

/** هل الرقم بصيغة MRN v2 صحيحة؟ */
export function isValidMRN(raw: string): boolean {
  const c = normalizeMRN(raw);
  if (c.length !== 12) return false;
  return c[11] === luhnDigit(c.slice(0, 11));
}

/** عرض مقروء للبطاقة والطباعة: 1234 5678 9012 (التخزين يبقى بلا فواصل) */
export function formatMRN(raw: string): string {
  const c = normalizeMRN(raw);
  if (c.length !== 12) return raw;
  return `${c.slice(0, 4)} ${c.slice(4, 8)} ${c.slice(8, 12)}`;
}
