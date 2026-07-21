// src/lib/phone.ts
// تطبيع أرقام الهواتف حسب رمز البلد الدولي المحدد في إعدادات العيادة

export type Country = { code: string; ar: string; en: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: "963", ar: "سوريا",        en: "Syria",        flag: "🇸🇾" },
  { code: "966", ar: "السعودية",     en: "Saudi Arabia", flag: "🇸🇦" },
  { code: "971", ar: "الإمارات",     en: "UAE",          flag: "🇦🇪" },
  { code: "962", ar: "الأردن",       en: "Jordan",       flag: "🇯🇴" },
  { code: "961", ar: "لبنان",        en: "Lebanon",      flag: "🇱🇧" },
  { code: "964", ar: "العراق",       en: "Iraq",         flag: "🇮🇶" },
  { code: "20",  ar: "مصر",          en: "Egypt",        flag: "🇪🇬" },
  { code: "965", ar: "الكويت",       en: "Kuwait",       flag: "🇰🇼" },
  { code: "974", ar: "قطر",          en: "Qatar",        flag: "🇶🇦" },
  { code: "973", ar: "البحرين",      en: "Bahrain",      flag: "🇧🇭" },
  { code: "968", ar: "عُمان",        en: "Oman",         flag: "🇴🇲" },
  { code: "970", ar: "فلسطين",       en: "Palestine",    flag: "🇵🇸" },
  { code: "218", ar: "ليبيا",        en: "Libya",        flag: "🇱🇾" },
  { code: "216", ar: "تونس",         en: "Tunisia",      flag: "🇹🇳" },
  { code: "213", ar: "الجزائر",      en: "Algeria",      flag: "🇩🇿" },
  { code: "212", ar: "المغرب",       en: "Morocco",      flag: "🇲🇦" },
  { code: "249", ar: "السودان",      en: "Sudan",        flag: "🇸🇩" },
  { code: "967", ar: "اليمن",        en: "Yemen",        flag: "🇾🇪" },
  { code: "90",  ar: "تركيا",        en: "Turkey",       flag: "🇹🇷" },
  { code: "49",  ar: "ألمانيا",      en: "Germany",      flag: "🇩🇪" },
  { code: "44",  ar: "بريطانيا",     en: "UK",           flag: "🇬🇧" },
  { code: "33",  ar: "فرنسا",        en: "France",       flag: "🇫🇷" },
  { code: "46",  ar: "السويد",       en: "Sweden",       flag: "🇸🇪" },
  { code: "31",  ar: "هولندا",       en: "Netherlands",  flag: "🇳🇱" },
  { code: "1",   ar: "أمريكا/كندا",  en: "USA/Canada",   flag: "🇺🇸" },
];

export const DEFAULT_COUNTRY_CODE = "963";

/**
 * تحويل رقم الهاتف إلى صيغة دولية بدون + حسب رمز بلد العيادة
 * - الأرقام الدولية (+ أو 00) تبقى كما هي
 * - الأرقام المحلية (تبدأ بـ 0 أو قصيرة) يُضاف لها رمز البلد
 */
export function normalizePhone(phone: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  const cc = (countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, "");
  let cleaned = (phone || "").replace(/[^0-9+]/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("+")) return cleaned.slice(1);          // دولي صريح
  if (cleaned.startsWith("00")) return cleaned.slice(2);         // دولي بصيغة 00

  if (cleaned.startsWith("0")) return cc + cleaned.slice(1);     // محلي يبدأ بصفر
  if (cleaned.startsWith(cc) && cleaned.length > cc.length + 6) return cleaned; // يحوي الرمز مسبقاً
  if (cleaned.length <= 10) return cc + cleaned;                 // محلي قصير بدون رمز
  return cleaned;
}
