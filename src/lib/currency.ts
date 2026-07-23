// ============================================================
// src/lib/currency.ts — كتالوج العملات (عربية + عالمية شهيرة)
// ============================================================

export type Currency = {
  code: string;      // ISO code
  ar: string;        // الاسم بالعربية
  en: string;        // الاسم بالإنجليزية
  symbolAr: string;  // الرمز المعروض بالعربية
  symbolEn: string;  // الرمز المعروض بالإنجليزية
  decimals: number;  // عدد الخانات العشرية
};

export const CURRENCIES: Currency[] = [
  // ── العملات العربية ──
  { code: "SYP", ar: "ليرة سورية",        en: "Syrian Pound",       symbolAr: "ل.س",  symbolEn: "SYP", decimals: 0 },
  { code: "SAR", ar: "ريال سعودي",        en: "Saudi Riyal",        symbolAr: "ر.س",  symbolEn: "SAR", decimals: 2 },
  { code: "AED", ar: "درهم إماراتي",      en: "UAE Dirham",         symbolAr: "د.إ",  symbolEn: "AED", decimals: 2 },
  { code: "EGP", ar: "جنيه مصري",         en: "Egyptian Pound",     symbolAr: "ج.م",  symbolEn: "EGP", decimals: 2 },
  { code: "JOD", ar: "دينار أردني",       en: "Jordanian Dinar",    symbolAr: "د.أ",  symbolEn: "JOD", decimals: 3 },
  { code: "IQD", ar: "دينار عراقي",       en: "Iraqi Dinar",        symbolAr: "د.ع",  symbolEn: "IQD", decimals: 0 },
  { code: "KWD", ar: "دينار كويتي",       en: "Kuwaiti Dinar",      symbolAr: "د.ك",  symbolEn: "KWD", decimals: 3 },
  { code: "QAR", ar: "ريال قطري",         en: "Qatari Riyal",       symbolAr: "ر.ق",  symbolEn: "QAR", decimals: 2 },
  { code: "BHD", ar: "دينار بحريني",      en: "Bahraini Dinar",     symbolAr: "د.ب",  symbolEn: "BHD", decimals: 3 },
  { code: "OMR", ar: "ريال عُماني",       en: "Omani Rial",         symbolAr: "ر.ع",  symbolEn: "OMR", decimals: 3 },
  { code: "LBP", ar: "ليرة لبنانية",      en: "Lebanese Pound",     symbolAr: "ل.ل",  symbolEn: "LBP", decimals: 0 },
  { code: "YER", ar: "ريال يمني",         en: "Yemeni Rial",        symbolAr: "ر.ي",  symbolEn: "YER", decimals: 0 },
  { code: "LYD", ar: "دينار ليبي",        en: "Libyan Dinar",       symbolAr: "د.ل",  symbolEn: "LYD", decimals: 3 },
  { code: "TND", ar: "دينار تونسي",       en: "Tunisian Dinar",     symbolAr: "د.ت",  symbolEn: "TND", decimals: 3 },
  { code: "DZD", ar: "دينار جزائري",      en: "Algerian Dinar",     symbolAr: "د.ج",  symbolEn: "DZD", decimals: 2 },
  { code: "MAD", ar: "درهم مغربي",        en: "Moroccan Dirham",    symbolAr: "د.م",  symbolEn: "MAD", decimals: 2 },
  { code: "SDG", ar: "جنيه سوداني",       en: "Sudanese Pound",     symbolAr: "ج.س",  symbolEn: "SDG", decimals: 2 },
  { code: "MRU", ar: "أوقية موريتانية",   en: "Mauritanian Ouguiya",symbolAr: "أ.م",  symbolEn: "MRU", decimals: 2 },
  { code: "SOS", ar: "شلن صومالي",        en: "Somali Shilling",    symbolAr: "ش.ص",  symbolEn: "SOS", decimals: 0 },
  { code: "DJF", ar: "فرنك جيبوتي",       en: "Djiboutian Franc",   symbolAr: "ف.ج",  symbolEn: "DJF", decimals: 0 },

  // ── عملات عالمية شهيرة ──
  { code: "USD", ar: "دولار أمريكي",      en: "US Dollar",          symbolAr: "$",    symbolEn: "$",   decimals: 2 },
  { code: "EUR", ar: "يورو",              en: "Euro",               symbolAr: "€",    symbolEn: "€",   decimals: 2 },
  { code: "GBP", ar: "جنيه إسترليني",     en: "British Pound",      symbolAr: "£",    symbolEn: "£",   decimals: 2 },
  { code: "TRY", ar: "ليرة تركية",        en: "Turkish Lira",       symbolAr: "₺",    symbolEn: "₺",   decimals: 2 },
  { code: "CHF", ar: "فرنك سويسري",       en: "Swiss Franc",        symbolAr: "CHF",  symbolEn: "CHF", decimals: 2 },
  { code: "CAD", ar: "دولار كندي",        en: "Canadian Dollar",    symbolAr: "C$",   symbolEn: "C$",  decimals: 2 },
  { code: "AUD", ar: "دولار أسترالي",     en: "Australian Dollar",  symbolAr: "A$",   symbolEn: "A$",  decimals: 2 },
  { code: "JPY", ar: "ين ياباني",         en: "Japanese Yen",       symbolAr: "¥",    symbolEn: "¥",   decimals: 0 },
  { code: "CNY", ar: "يوان صيني",         en: "Chinese Yuan",       symbolAr: "¥",    symbolEn: "CN¥", decimals: 2 },
  { code: "INR", ar: "روبية هندية",       en: "Indian Rupee",       symbolAr: "₹",    symbolEn: "₹",   decimals: 2 },
  { code: "PKR", ar: "روبية باكستانية",   en: "Pakistani Rupee",    symbolAr: "₨",    symbolEn: "₨",   decimals: 0 },
  { code: "RUB", ar: "روبل روسي",         en: "Russian Ruble",      symbolAr: "₽",    symbolEn: "₽",   decimals: 2 },
  { code: "SEK", ar: "كرونة سويدية",      en: "Swedish Krona",      symbolAr: "kr",   symbolEn: "kr",  decimals: 2 },
  { code: "NOK", ar: "كرونة نرويجية",     en: "Norwegian Krone",    symbolAr: "kr",   symbolEn: "kr",  decimals: 2 },
  { code: "IRR", ar: "ريال إيراني",       en: "Iranian Rial",       symbolAr: "ر.إ",  symbolEn: "IRR", decimals: 0 },
];

export const DEFAULT_CURRENCY = "SYP";

const BY_CODE: Record<string, Currency> = CURRENCIES.reduce((acc, c) => {
  acc[c.code] = c; return acc;
}, {} as Record<string, Currency>);

/** يعيد كائن العملة (أو الافتراضية إن كان الرمز غير معروف) */
export function getCurrency(code?: string | null): Currency {
  return BY_CODE[(code || "").toUpperCase()] ?? BY_CODE[DEFAULT_CURRENCY];
}

/** رمز العملة المعروض حسب اللغة — مثال: "ل.س" أو "SAR" */
export function currencySymbol(code?: string | null, isAr = true): string {
  const c = getCurrency(code);
  return isAr ? c.symbolAr : c.symbolEn;
}

/** اسم العملة الكامل حسب اللغة */
export function currencyName(code?: string | null, isAr = true): string {
  const c = getCurrency(code);
  return isAr ? c.ar : c.en;
}

/** تنسيق مبلغ مع رمز العملة — مثال: "12,500 ل.س" */
export function formatMoney(amount: number, code?: string | null, isAr = true): string {
  const c = getCurrency(code);
  const n = Number.isFinite(amount) ? amount : 0;
  const formatted = n.toLocaleString(isAr ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: c.decimals,
  });
  return `${formatted} ${isAr ? c.symbolAr : c.symbolEn}`;
}

/** قائمة مبسّطة للاستخدام في عناصر <select> */
export function currencyOptions(isAr = true): { value: string; label: string }[] {
  return CURRENCIES.map(c => ({
    value: c.code,
    label: `${isAr ? c.ar : c.en} (${isAr ? c.symbolAr : c.symbolEn})`,
  }));
}
